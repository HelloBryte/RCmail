export const maxDuration = 60;

import { auth } from "@clerk/nextjs/server";
import { and, eq, sql } from "drizzle-orm";
import { trackEvent } from "@/lib/analytics/track-event";
import { getDb } from "@/lib/db";
import { emails, userPlans } from "@/lib/db/schema";
import { isMailTypeSlug, type MailTypeSlug } from "@/lib/mail-types";
import { buildUserPrompt } from "@/lib/prompts";
import { splitSubjectAndBody, streamBusinessMailFromQwen } from "@/lib/qwen";

type Tone = "formal" | "friendly" | "firm";

type RequestBody = {
  mailType: string;
  recipient: string;
  purpose: string;
  details: string;
  tone: Tone;
};

const PERSONAL_LIMIT = 5;

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

  if (!body?.mailType || !body?.recipient || !body?.purpose || !body?.tone || !isMailTypeSlug(body.mailType)) {
    await trackEvent({ eventName: "generate_bad_request", route, userId, statusCode: 400, responseMs: Date.now() - startTime, userAgent });
    return new Response("Invalid request payload", { status: 400 });
  }

  const db = getDb();

  const [existingPlan] = await db.select().from(userPlans).where(eq(userPlans.userId, userId)).limit(1);

  const plan =
    existingPlan ??
    (
      await db
        .insert(userPlans)
        .values({ userId, planType: "personal", trialUsed: 0, updatedAt: new Date() })
        .returning()
        .then((rows) => rows[0])
    );

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
        message: "Personal 用户仅可试用 3 次，请升级 Business。",
      },
      { status: 402 }
    );
  }

  const prompt = buildUserPrompt(body.mailType as MailTypeSlug, {
    recipient: body.recipient,
    purpose: body.purpose,
    details: body.details,
    tone: body.tone,
  });

  const qwenStream = await streamBusinessMailFromQwen(prompt);

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

        const [savedEmail] = await db
          .insert(emails)
          .values({
            userId,
            emailType: body.mailType,
            subject: generated.subject,
            recipient: body.recipient,
            tone: body.tone,
            chineseInput: `purpose=${body.purpose}; details=${body.details}`,
            russianOutput: generated.body,
            updatedAt: new Date(),
          })
          .returning();

        let updatedPlan = plan;
        if (plan.planType === "personal") {
          const [updated] = await db
            .update(userPlans)
            .set({ trialUsed: sql`${userPlans.trialUsed} + 1`, updatedAt: new Date() })
            .where(and(eq(userPlans.userId, userId), eq(userPlans.planType, "personal")))
            .returning();

          if (updated) updatedPlan = updated;
        }

        await trackEvent({
          eventName: "generate_success",
          route,
          userId,
          statusCode: 200,
          responseMs: Date.now() - startTime,
          userAgent,
          details: `mailType=${body.mailType};plan=${updatedPlan.planType};trialUsed=${updatedPlan.trialUsed}`,
        });

        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({
              type: "done",
              email: savedEmail,
              plan: {
                type: updatedPlan.planType,
                trialUsed: updatedPlan.trialUsed,
                trialRemaining: updatedPlan.planType === "personal" ? Math.max(0, PERSONAL_LIMIT - updatedPlan.trialUsed) : null,
              },
            })}\n\n`
          )
        );
      } catch {
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
