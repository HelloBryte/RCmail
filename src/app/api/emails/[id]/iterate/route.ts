export const maxDuration = 60;

import { auth } from "@clerk/nextjs/server";
import { and, eq } from "drizzle-orm";
import { trackEvent } from "@/lib/analytics/track-event";
import { getDb } from "@/lib/db";
import { emails } from "@/lib/db/schema";
import { buildPlanInfo, getActiveUserPlan, PERSONAL_LIMIT, refundGenerationQuota, reserveGenerationQuota } from "@/lib/plans";
import { buildRevisionPrompt } from "@/lib/prompts";
import { splitSubjectAndBody, streamChatCompletionFromQwen, translateBusinessMailToChinese } from "@/lib/qwen";

type RequestBody = {
  instruction?: string;
  currentSubject?: string;
  currentBody?: string;
};

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const startTime = Date.now();
  const userAgent = req.headers.get("user-agent") ?? undefined;
  const route = "/api/emails/[id]/iterate";
  const { userId } = await auth();

  if (!userId) {
    await trackEvent({ eventName: "iterate_unauthorized", route, statusCode: 401, responseMs: Date.now() - startTime, userAgent });
    return new Response("Unauthorized", { status: 401 });
  }

  const { id } = await params;
  const body = (await req.json()) as RequestBody;
  const instruction = body.instruction?.trim() ?? "";
  const currentSubject = body.currentSubject?.trim() ?? "";
  const currentBody = body.currentBody?.trim() ?? "";

  if (!instruction || !currentBody) {
    await trackEvent({
      eventName: "iterate_bad_request",
      route,
      userId,
      statusCode: 400,
      responseMs: Date.now() - startTime,
      userAgent,
      details: !instruction ? "Missing instruction" : "Missing current body",
    });
    return new Response("Missing instruction or current draft", { status: 400 });
  }

  const db = getDb();
  const [email] = await db
    .select()
    .from(emails)
    .where(and(eq(emails.id, id), eq(emails.userId, userId)))
    .limit(1);

  if (!email) {
    await trackEvent({ eventName: "iterate_not_found", route, userId, statusCode: 404, responseMs: Date.now() - startTime, userAgent, details: `id=${id}` });
    return new Response("Not found", { status: 404 });
  }

  const plan = await getActiveUserPlan(db, userId);

  // 先原子性扣减额度再生成，避免并发请求绕过免费额度限制
  const reservedPlan = await reserveGenerationQuota(db, plan, userId);

  if (!reservedPlan) {
    await trackEvent({
      eventName: "iterate_blocked_trial_limit",
      route,
      userId,
      statusCode: 402,
      responseMs: Date.now() - startTime,
      userAgent,
      details: `id=${id};trialUsed=${plan.trialUsed}`,
    });

    return Response.json(
      {
        error: "TRIAL_LIMIT_REACHED",
        message: `Personal 用户仅可试用 ${PERSONAL_LIMIT} 次，请升级 Business。`,
      },
      { status: 402 }
    );
  }

  let qwenStream;
  try {
    qwenStream = await streamChatCompletionFromQwen([
      {
        role: "user",
        content: buildRevisionPrompt(instruction, {
          subject: currentSubject || email.subject,
          body: currentBody,
        }),
      },
    ]);
  } catch (error) {
    console.error("Failed to start Qwen stream", error);
    await refundGenerationQuota(db, reservedPlan, userId);
    await trackEvent({
      eventName: "iterate_upstream_error",
      route,
      userId,
      statusCode: 502,
      responseMs: Date.now() - startTime,
      userAgent,
      details: `id=${id}`,
    });
    return Response.json({ error: "UPSTREAM_ERROR", message: "优化失败，请稍后重试。" }, { status: 502 });
  }

  const encoder = new TextEncoder();
  let fullText = "";

  const sseStream = new ReadableStream({
    async start(controller) {
      const reader = qwenStream.getReader();
      try {
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          fullText += value;
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "chunk", delta: value })}\n\n`));
        }
      } catch {
        await refundGenerationQuota(db, reservedPlan, userId);
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "error", message: "优化失败" })}\n\n`));
        controller.close();
        return;
      } finally {
        reader.releaseLock();
      }

      try {
        const generated = splitSubjectAndBody(fullText);
        const translated = await translateBusinessMailToChinese(generated);

        const effectivePlan = reservedPlan;
        const planInfo = buildPlanInfo(effectivePlan);

        await trackEvent({
          eventName: "iterate_success",
          route,
          userId,
          statusCode: 200,
          responseMs: Date.now() - startTime,
          userAgent,
          details: `id=${id};plan=${effectivePlan.planType};trialUsed=${effectivePlan.trialUsed};draftOnly=true`,
        });

        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({
              type: "done",
              draft: {
                subject: generated.subject,
                body: generated.body,
                translatedSubject: translated.subject,
                translatedBody: translated.body,
              },
              plan: planInfo,
            })}\n\n`
          )
        );
      } catch (error) {
        console.error("Failed to finalize iterated draft", error);
        // 优化结果没有交付给用户，退回额度
        await refundGenerationQuota(db, reservedPlan, userId);
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "error", message: "保存优化结果失败" })}\n\n`));
      }

      controller.close();
    },
  });

  return new Response(sseStream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
