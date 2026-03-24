import { auth } from "@clerk/nextjs/server";
import { and, desc, eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { emails } from "@/lib/db/schema";

export async function GET() {
  const { userId } = await auth();

  if (!userId) {
    return new Response("Unauthorized", { status: 401 });
  }

  const db = getDb();

  const rows = await db
    .select()
    .from(emails)
    .where(eq(emails.userId, userId))
    .orderBy(desc(emails.createdAt))
    .limit(100);

  return Response.json(rows);
}

export async function DELETE(req: Request) {
  const { userId } = await auth();

  if (!userId) {
    return new Response("Unauthorized", { status: 401 });
  }

  const body = (await req.json()) as { id?: string };

  if (!body.id) {
    return new Response("Missing id", { status: 400 });
  }

  const db = getDb();

  const [deleted] = await db
    .delete(emails)
    .where(and(eq(emails.id, body.id), eq(emails.userId, userId)))
    .returning();

  if (!deleted) {
    return new Response("Not found", { status: 404 });
  }

  return Response.json({ ok: true, id: body.id });
}
