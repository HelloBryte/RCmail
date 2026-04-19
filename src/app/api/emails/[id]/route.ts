import { auth } from "@clerk/nextjs/server";
import { and, asc, eq } from "drizzle-orm";
import { trackEvent } from "@/lib/analytics/track-event";
import { getDb } from "@/lib/db";
import { emailMessages, emails } from "@/lib/db/schema";
import { formatDraftContent, normalizeThreadMessages } from "@/lib/email-thread";

type PersistMessageInput = {
  role?: string;
  messageType?: string;
  content?: string;
  subject?: string | null;
  body?: string | null;
  createdAt?: string;
};

type PatchBody = {
  subject?: string;
  body?: string;
  messages?: PersistMessageInput[];
};

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const startTime = Date.now();
  const route = "/api/emails/[id]";
  const { userId } = await auth();

  if (!userId) {
    await trackEvent({
      eventName: "email_thread_unauthorized",
      route,
      statusCode: 401,
      responseMs: Date.now() - startTime,
      details: "Missing authenticated user",
    });
    return new Response("Unauthorized", { status: 401 });
  }

  const { id } = await params;
  const db = getDb();

  const [email] = await db
    .select()
    .from(emails)
    .where(and(eq(emails.id, id), eq(emails.userId, userId)))
    .limit(1);

  if (!email) {
    await trackEvent({
      eventName: "email_thread_not_found",
      route,
      userId,
      statusCode: 404,
      responseMs: Date.now() - startTime,
      details: `id=${id}`,
    });
    return new Response("Not found", { status: 404 });
  }

  const storedMessages = await db
    .select()
    .from(emailMessages)
    .where(and(eq(emailMessages.emailId, id), eq(emailMessages.userId, userId)))
    .orderBy(asc(emailMessages.createdAt));

  const messages = normalizeThreadMessages(email, storedMessages);

  await trackEvent({
    eventName: "email_thread_success",
    route,
    userId,
    statusCode: 200,
    responseMs: Date.now() - startTime,
    details: `id=${id};messages=${messages.length}`,
  });

  return Response.json({ email, messages });
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const startTime = Date.now();
  const route = "/api/emails/[id]";
  const { userId } = await auth();

  if (!userId) {
    await trackEvent({
      eventName: "email_patch_unauthorized",
      route,
      statusCode: 401,
      responseMs: Date.now() - startTime,
      details: "Missing authenticated user",
    });
    return new Response("Unauthorized", { status: 401 });
  }

  const { id } = await params;
  const body = (await req.json()) as PatchBody;
  const subject = body.subject?.trim() ?? "";
  const draftBody = body.body?.trim() ?? "";
  const pendingMessages = Array.isArray(body.messages) ? body.messages : [];

  if (!draftBody) {
    await trackEvent({
      eventName: "email_patch_bad_request",
      route,
      userId,
      statusCode: 400,
      responseMs: Date.now() - startTime,
      details: `id=${id};reason=missing_body`,
    });
    return new Response("Missing body", { status: 400 });
  }

  const invalidMessage = pendingMessages.find((message) => {
    const roleValid = message.role === "user" || message.role === "assistant";
    const typeValid = message.messageType === "revision_request" || message.messageType === "draft";
    const contentValid = typeof message.content === "string" && message.content.trim().length > 0;
    return !roleValid || !typeValid || !contentValid;
  });

  if (invalidMessage) {
    await trackEvent({
      eventName: "email_patch_bad_request",
      route,
      userId,
      statusCode: 400,
      responseMs: Date.now() - startTime,
      details: `id=${id};reason=invalid_message`,
    });
    return new Response("Invalid pending messages", { status: 400 });
  }

  const db = getDb();
  const [email] = await db
    .select()
    .from(emails)
    .where(and(eq(emails.id, id), eq(emails.userId, userId)))
    .limit(1);

  if (!email) {
    await trackEvent({
      eventName: "email_patch_not_found",
      route,
      userId,
      statusCode: 404,
      responseMs: Date.now() - startTime,
      details: `id=${id}`,
    });
    return new Response("Not found", { status: 404 });
  }

  const preparedMessages = pendingMessages.map((message) => {
    const parsedCreatedAt = message.createdAt ? new Date(message.createdAt) : new Date();
    const createdAt = Number.isNaN(parsedCreatedAt.getTime()) ? new Date() : parsedCreatedAt;

    return {
      emailId: email.id,
      userId,
      role: message.role as "user" | "assistant",
      messageType: message.messageType as "revision_request" | "draft",
      content:
        message.role === "assistant"
          ? formatDraftContent(message.subject?.trim() || subject || "(без темы)", message.body?.trim() || draftBody)
          : message.content!.trim(),
      subject: message.role === "assistant" ? message.subject?.trim() || subject || "(без темы)" : null,
      body: message.role === "assistant" ? message.body?.trim() || draftBody : null,
      createdAt,
    };
  });

  const insertedMessages =
    preparedMessages.length > 0 ? await db.insert(emailMessages).values(preparedMessages).returning() : [];

  const [updatedEmail] = await db
    .update(emails)
    .set({
      subject: subject || "(без темы)",
      russianOutput: draftBody,
      updatedAt: new Date(),
    })
    .where(and(eq(emails.id, id), eq(emails.userId, userId)))
    .returning();

  await trackEvent({
    eventName: "email_patch_success",
    route,
    userId,
    statusCode: 200,
    responseMs: Date.now() - startTime,
    details: `id=${id};messages=${insertedMessages.length}`,
  });

  return Response.json({ email: updatedEmail, messages: insertedMessages });
}
