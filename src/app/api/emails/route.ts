import { auth } from "@clerk/nextjs/server";
import { and, desc, eq } from "drizzle-orm";
import { trackEvent } from "@/lib/analytics/track-event";
import { getDb } from "@/lib/db";
import { emails } from "@/lib/db/schema";

export async function GET() {
  const startTime = Date.now();
  const { userId } = await auth();
  const route = "/api/emails";

  if (!userId) {
    await trackEvent({
      eventName: "emails_list_unauthorized",
      route,
      statusCode: 401,
      responseMs: Date.now() - startTime,
      details: "Missing authenticated user",
    });
    return new Response("Unauthorized", { status: 401 });
  }

  const db = getDb();

  const rows = await db
    .select()
    .from(emails)
    .where(eq(emails.userId, userId))
    .orderBy(desc(emails.createdAt))
    .limit(100);

  await trackEvent({
    eventName: "emails_list_success",
    route,
    userId,
    statusCode: 200,
    responseMs: Date.now() - startTime,
    details: `rows=${rows.length}`,
  });

  return Response.json(rows);
}

export async function DELETE(req: Request) {
  const startTime = Date.now();
  const { userId } = await auth();
  const route = "/api/emails";

  if (!userId) {
    await trackEvent({
      eventName: "emails_delete_unauthorized",
      route,
      statusCode: 401,
      responseMs: Date.now() - startTime,
      details: "Missing authenticated user",
    });
    return new Response("Unauthorized", { status: 401 });
  }

  const body = (await req.json()) as { id?: string };

  if (!body.id) {
    await trackEvent({
      eventName: "emails_delete_bad_request",
      route,
      userId,
      statusCode: 400,
      responseMs: Date.now() - startTime,
      details: "Missing id in request body",
    });
    return new Response("Missing id", { status: 400 });
  }

  const db = getDb();

  const [deleted] = await db
    .delete(emails)
    .where(and(eq(emails.id, body.id), eq(emails.userId, userId)))
    .returning();

  if (!deleted) {
    await trackEvent({
      eventName: "emails_delete_not_found",
      route,
      userId,
      statusCode: 404,
      responseMs: Date.now() - startTime,
      details: `id=${body.id}`,
    });
    return new Response("Not found", { status: 404 });
  }

  await trackEvent({
    eventName: "emails_delete_success",
    route,
    userId,
    statusCode: 200,
    responseMs: Date.now() - startTime,
    details: `id=${body.id}`,
  });

  return Response.json({ ok: true, id: body.id });
}
