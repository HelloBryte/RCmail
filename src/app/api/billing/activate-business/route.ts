import { auth } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";
import { trackEvent } from "@/lib/analytics/track-event";
import { getDb } from "@/lib/db";
import { userPlans } from "@/lib/db/schema";

export async function POST(req: Request) {
  const startTime = Date.now();
  const route = "/api/billing/activate-business";
  const { userId } = await auth();

  if (!userId) {
    await trackEvent({ eventName: "billing_activate_unauthorized", route, statusCode: 401, responseMs: Date.now() - startTime });
    return new Response("Unauthorized", { status: 401 });
  }

  // 需要管理员密钥才能手动激活
  const adminSecret = process.env.ADMIN_SECRET;
  const body = await req.json().catch(() => ({})) as { secret?: string; targetUserId?: string };
  if (!adminSecret || body.secret !== adminSecret) {
    return new Response("Forbidden", { status: 403 });
  }

  const targetId = body.targetUserId ?? userId;

  const db = getDb();
  const [existing] = await db.select().from(userPlans).where(eq(userPlans.userId, targetId)).limit(1);

  if (!existing) {
    await db.insert(userPlans).values({
      userId: targetId,
      planType: "business",
      planVariant: "yearly",
      planExpiry: null,
      trialUsed: 0,
      updatedAt: new Date(),
    });
  } else {
    await db.update(userPlans).set({ planType: "business", planVariant: "yearly", planExpiry: null, updatedAt: new Date() }).where(eq(userPlans.userId, targetId));
  }

  await trackEvent({
    eventName: "billing_activate_business_success",
    route,
    userId,
    statusCode: 200,
    responseMs: Date.now() - startTime,
  });

  return Response.json({ ok: true, planType: "business", targetUserId: targetId });
}
