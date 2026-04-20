export const maxDuration = 60;

import { auth } from "@clerk/nextjs/server";
import { trackEvent } from "@/lib/analytics/track-event";
import { getDb } from "@/lib/db";
import { isMissingDbObjectError } from "@/lib/db/error";
import { emailMessages, emails } from "@/lib/db/schema";
import { buildInitialRequestSummary, formatDraftContent, normalizeThreadMessages, serializeChineseInput } from "@/lib/email-thread";
import { isMailTypeSlug, type MailTypeSlug } from "@/lib/mail-types";
import { buildUserPrompt, isTone, type Tone } from "@/lib/prompts";
import { buildPlanInfo, getActiveUserPlan, incrementPlanUsageIfNeeded, PERSONAL_LIMIT } from "@/lib/plans";
import { splitSubjectAndBody, streamChatCompletionFromQwen } from "@/lib/qwen";

type RequestBody = {
  mailType: string;
  recipient: string;
  purpose: string;
  details?: string;
  tone: string;
};

export async function POST(req: Request) {
  const startTime = Date.now();
  const userAgent = req.headers.get("user-agent") ?? undefined;
  const route = "/api/generate-email";
  const { userId } = await auth();

  if (!userId) {
    await trackEvent({ eventName: "generate_unauthorized", route, statusCode: 401, responseMs: Date.now() - startTime, userAgent });
    return new Response("Unauthorized", { status: 401 });
  }

  const body = (await req.json()) as RequestBody;
  const details = body.details?.trim() ?? "";

  if (!body?.mailType || !body?.recipient?.trim() || !body?.purpose?.trim() || !isTone(body?.tone) || !isMailTypeSlug(body.mailType)) {
    await trackEvent({ eventName: "generate_bad_request", route, userId, statusCode: 400, responseMs: Date.now() - startTime, userAgent });
    return new Response("Invalid request payload", { status: 400 });
  }

  const db = getDb();
  const plan = await getActiveUserPlan(db, userId);

  if (plan.planType === "personal" && plan.trialUsed >= PERSONAL_LIMIT) {
    await trackEvent({
      eventName: "generate_blocked_trial_limit",
      route,
      userId,
      statusCode: 402,
      responseMs: Date.now() - startTime,
      userAgent,
      details: `trialUsed=${plan.trialUsed}`,
    });

    return Response.json(
      {
        error: "TRIAL_LIMIT_REACHED",
        message: `Personal 用户仅可试用 ${PERSONAL_LIMIT} 次，请升级 Business。`,
      },
      { status: 402 }
    );
  }

  const input = {
    recipient: body.recipient.trim(),
    purpose: body.purpose.trim(),
    details,
    tone: body.tone as Tone,
  };

  const prompt = buildUserPrompt(body.mailType as MailTypeSlug, input);
  const qwenStream = await streamChatCompletionFromQwen([{ role: "user", content: prompt }]);

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
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "error", message: "生成失败" })}\n\n`));
        controller.close();
        return;
      } finally {
        reader.releaseLock();
      }

      try {
        const generated = splitSubjectAndBody(fullText);
        let savedEmail;
        try {
          [savedEmail] = await db
            .insert(emails)
            .values({
              userId,
              emailType: body.mailType,
              subject: generated.subject,
              recipient: input.recipient,
              tone: input.tone,
              chineseInput: serializeChineseInput(input),
              russianOutput: generated.body,
              updatedAt: new Date(),
            })
            .returning();
        } catch (error) {
          console.error("Failed to save generated email", error);
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "error", message: "保存失败" })}\n\n`));
          controller.close();
          return;
        }

        let responseMessages = normalizeThreadMessages(savedEmail, []);
        try {
          const [savedUserMessage] = await db
            .insert(emailMessages)
            .values({
              emailId: savedEmail.id,
              userId,
              role: "user",
              messageType: "initial_request",
              content: buildInitialRequestSummary(input),
            })
            .returning();

          const [savedAssistantMessage] = await db
            .insert(emailMessages)
            .values({
              emailId: savedEmail.id,
              userId,
              role: "assistant",
              messageType: "draft",
              content: formatDraftContent(generated.subject, generated.body),
              subject: generated.subject,
              body: generated.body,
            })
            .returning();

          responseMessages = normalizeThreadMessages(savedEmail, [savedUserMessage, savedAssistantMessage]);
        } catch (error) {
          if (isMissingDbObjectError(error, ["email_messages"])) {
            console.warn("email_messages is unavailable, falling back to synthetic thread messages");
          } else {
            console.error("Failed to persist generated thread messages", error);
          }
        }

        let effectivePlan = plan;
        try {
          effectivePlan = await incrementPlanUsageIfNeeded(db, plan, userId);
        } catch (error) {
          console.error("Failed to update plan usage after generation", error);
        }

        const planInfo = buildPlanInfo(effectivePlan);

        await trackEvent({
          eventName: "generate_success",
          route,
          userId,
          statusCode: 200,
          responseMs: Date.now() - startTime,
          userAgent,
          details: `mailType=${body.mailType};plan=${effectivePlan.planType};trialUsed=${effectivePlan.trialUsed};emailId=${savedEmail.id}`,
        });

        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({
              type: "done",
              email: savedEmail,
              messages: responseMessages,
              plan: planInfo,
            })}\n\n`
          )
        );
      } catch (error) {
        console.error("Failed to finalize generated email", error);
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "error", message: "保存失败" })}\n\n`));
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
