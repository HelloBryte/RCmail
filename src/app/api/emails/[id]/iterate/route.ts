export const maxDuration = 60;

import { auth } from "@clerk/nextjs/server";
import { and, asc, eq } from "drizzle-orm";
import { trackEvent } from "@/lib/analytics/track-event";
import { getDb } from "@/lib/db";
import { emailMessages, emails } from "@/lib/db/schema";
import { buildThreadForModel, formatDraftContent } from "@/lib/email-thread";
import { buildPlanInfo, getActiveUserPlan, incrementPlanUsageIfNeeded, PERSONAL_LIMIT } from "@/lib/plans";
import { buildRevisionPrompt } from "@/lib/prompts";
import { splitSubjectAndBody, streamChatCompletionFromQwen } from "@/lib/qwen";

type RequestBody = {
  instruction?: string;
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

  if (!instruction) {
    await trackEvent({ eventName: "iterate_bad_request", route, userId, statusCode: 400, responseMs: Date.now() - startTime, userAgent, details: "Missing instruction" });
    return new Response("Missing instruction", { status: 400 });
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

  if (plan.planType === "personal" && plan.trialUsed >= PERSONAL_LIMIT) {
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

  const storedMessages = await db
    .select()
    .from(emailMessages)
    .where(and(eq(emailMessages.emailId, id), eq(emailMessages.userId, userId)))
    .orderBy(asc(emailMessages.createdAt));

  const conversation = [...buildThreadForModel(email, storedMessages), { role: "user", content: buildRevisionPrompt(instruction) } as const];
  const qwenStream = await streamChatCompletionFromQwen(conversation);

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
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "error", message: "优化失败" })}\n\n`));
        controller.close();
        return;
      } finally {
        reader.releaseLock();
      }

      try {
        const generated = splitSubjectAndBody(fullText);

        const [savedUserMessage] = await db
          .insert(emailMessages)
          .values({
            emailId: email.id,
            userId,
            role: "user",
            messageType: "revision_request",
            content: instruction,
          })
          .returning();

        const [savedAssistantMessage] = await db
          .insert(emailMessages)
          .values({
            emailId: email.id,
            userId,
            role: "assistant",
            messageType: "draft",
            content: formatDraftContent(generated.subject, generated.body),
            subject: generated.subject,
            body: generated.body,
          })
          .returning();

        const [updatedEmail] = await db
          .update(emails)
          .set({ subject: generated.subject, russianOutput: generated.body, updatedAt: new Date() })
          .where(eq(emails.id, email.id))
          .returning();

        const updatedPlan = await incrementPlanUsageIfNeeded(db, plan, userId);
        const planInfo = buildPlanInfo(updatedPlan);

        await trackEvent({
          eventName: "iterate_success",
          route,
          userId,
          statusCode: 200,
          responseMs: Date.now() - startTime,
          userAgent,
          details: `id=${id};plan=${updatedPlan.planType};trialUsed=${updatedPlan.trialUsed}`,
        });

        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({
              type: "done",
              email: updatedEmail,
              messages: [savedUserMessage, savedAssistantMessage],
              plan: planInfo,
            })}\n\n`
          )
        );
      } catch {
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
