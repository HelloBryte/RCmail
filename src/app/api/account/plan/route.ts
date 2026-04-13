import { auth } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { userPlans } from "@/lib/db/schema";

const PERSONAL_LIMIT = 5;

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

  // 兼容旧数据：business 用户若 planVariant 为 personal（旧版无该字段），视为年卡
  let { planType, planExpiry } = plan;
  let planVariant = (plan.planType === "business" && plan.planVariant === "personal") ? "yearly" : plan.planVariant;

  // 检查月卡是否已过期，自动降级
  if (planType === "business" && planVariant === "monthly" && planExpiry && planExpiry < new Date()) {
    await db.update(userPlans).set({ planType: "personal", planVariant: "personal", planExpiry: null, updatedAt: new Date() }).where(eq(userPlans.userId, userId));
    planType = "personal";
    planVariant = "personal";
    planExpiry = null;
  }

  // 月卡和年卡都计算剩余天数，永久卡和 personal 为 null
  const daysRemaining =
    planType === "business" &&
    (planVariant === "monthly" || planVariant === "yearly") &&
    planExpiry
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
