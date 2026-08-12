import { and, eq, lt, sql } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { userPlans, type UserPlanRow } from "@/lib/db/schema";

export const PERSONAL_LIMIT = 5;

type Database = ReturnType<typeof getDb>;

type PlanVariant = "personal" | "monthly" | "yearly" | "lifetime";

type ActivePlan = UserPlanRow & {
  planVariant: PlanVariant;
};

export type PlanInfo = {
  type: "personal" | "business";
  variant: PlanVariant;
  trialUsed: number;
  trialRemaining: number | null;
  daysRemaining: number | null;
  expiry: Date | null;
};

export async function getActiveUserPlan(db: Database, userId: string): Promise<ActivePlan> {
  const [existingPlan] = await db.select().from(userPlans).where(eq(userPlans.userId, userId)).limit(1);

  let plan =
    existingPlan ??
    (
      await db
        .insert(userPlans)
        .values({ userId, planType: "personal", trialUsed: 0, updatedAt: new Date() })
        .returning()
        .then((rows) => rows[0])
    );

  let normalizedVariant: PlanVariant =
    plan.planType === "business" && plan.planVariant === "personal"
      ? "yearly"
      : ((plan.planVariant as PlanVariant | undefined) ?? "personal");

  if (
    plan.planType === "business" &&
    (normalizedVariant === "monthly" || normalizedVariant === "yearly") &&
    plan.planExpiry &&
    plan.planExpiry < new Date()
  ) {
    [plan] = await db
      .update(userPlans)
      .set({ planType: "personal", planVariant: "personal", planExpiry: null, updatedAt: new Date() })
      .where(eq(userPlans.userId, userId))
      .returning();

    normalizedVariant = "personal";
  }

  return {
    ...plan,
    planVariant: normalizedVariant,
  };
}

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * 续费时从「当前到期时间」和「现在」中较晚的一个开始累加，
 * 避免用户提前续费时丢失剩余天数。
 */
export function extendExpiry(currentExpiry: Date | null | undefined, variant: "monthly" | "yearly"): Date {
  const days = variant === "yearly" ? 365 : 30;
  const now = Date.now();
  const base = currentExpiry && currentExpiry.getTime() > now ? currentExpiry.getTime() : now;
  return new Date(base + days * DAY_MS);
}

/**
 * 原子性地预扣一次免费额度。返回 null 表示已超出限额。
 *
 * 必须在生成开始「之前」扣减：额度检查与扣减若分处流式响应的首尾，
 * 并发请求会各自读到过期的 trialUsed，从而突破免费额度。
 * 条件更新把「检查 + 扣减」合并为单条 SQL，由数据库保证互斥。
 */
export async function reserveGenerationQuota(
  db: Database,
  plan: ActivePlan,
  userId: string
): Promise<ActivePlan | null> {
  if (plan.planType !== "personal") {
    return plan;
  }

  const [updatedPlan] = await db
    .update(userPlans)
    .set({ trialUsed: sql`${userPlans.trialUsed} + 1`, updatedAt: new Date() })
    .where(and(eq(userPlans.userId, userId), lt(userPlans.trialUsed, PERSONAL_LIMIT)))
    .returning();

  if (!updatedPlan) {
    return null;
  }

  return {
    ...updatedPlan,
    planVariant: ((updatedPlan.planVariant as PlanVariant | undefined) ?? "personal"),
  } satisfies ActivePlan;
}

/** 生成失败时退回已预扣的额度，不让用户为失败的请求买单。 */
export async function refundGenerationQuota(db: Database, plan: ActivePlan, userId: string) {
  if (plan.planType !== "personal") return;

  try {
    await db
      .update(userPlans)
      .set({ trialUsed: sql`greatest(${userPlans.trialUsed} - 1, 0)`, updatedAt: new Date() })
      .where(eq(userPlans.userId, userId));
  } catch (error) {
    console.error("Failed to refund generation quota", error);
  }
}

export function buildPlanInfo(plan: ActivePlan): PlanInfo {
  const daysRemaining =
    plan.planType === "business" &&
    (plan.planVariant === "monthly" || plan.planVariant === "yearly") &&
    plan.planExpiry
      ? Math.max(0, Math.ceil((plan.planExpiry.getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
      : null;

  return {
    type: plan.planType as "personal" | "business",
    variant: plan.planVariant,
    trialUsed: plan.trialUsed,
    trialRemaining: plan.planType === "personal" ? Math.max(0, PERSONAL_LIMIT - plan.trialUsed) : null,
    daysRemaining,
    expiry: plan.planExpiry ?? null,
  };
}
