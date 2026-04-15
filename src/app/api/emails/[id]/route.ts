import { auth } from "@clerk/nextjs/server";
import { and, asc, eq } from "drizzle-orm";
import { trackEvent } from "@/lib/analytics/track-event";
import { getDb } from "@/lib/db";
import { emailMessages, emails } from "@/lib/db/schema";
import { normalizeThreadMessages } from "@/lib/email-thread";

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
