import { auth } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { userPlans } from "@/lib/db/schema";

const PERSONAL_LIMIT = 3;

export async function GET() {
  const { userId } = await auth();

  if (!userId) {
    return new Response("Unauthorized", { status: 401 });
  }

  const db = getDb();
  const [plan] = await db.select().from(userPlans).where(eq(userPlans.userId, userId)).limit(1);

  if (!plan) {
    return Response.json({ type: "personal", variant: "personal", trialUsed: 0, trialRemaining: PERSONAL_LIMIT, daysRemaining: null, expiry: null });
  }

  // 检查月卡是否已过期，自动降级
  let { planType, planVariant, planExpiry } = plan;
  if (planType === "business" && planVariant === "monthly" && planExpiry && planExpiry < new Date()) {
    await db.update(userPlans).set({ planType: "personal", planVariant: "personal", planExpiry: null, updatedAt: new Date() }).where(eq(userPlans.userId, userId));
    planType = "personal";
    planVariant = "personal";
    planExpiry = null;
  }

  const daysRemaining = planType === "business" && planVariant === "monthly" && planExpiry
    ? Math.max(0, Math.ceil((planExpiry.getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : null;

  return Response.json({
    type: planType,
    variant: planVariant,
    trialUsed: plan.trialUsed,
    trialRemaining: planType === "personal" ? Math.max(0, PERSONAL_LIMIT - plan.trialUsed) : null,
    daysRemaining,
    expiry: planExpiry ?? null,
  });
}
