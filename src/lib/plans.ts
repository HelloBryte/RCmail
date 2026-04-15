import { eq, sql } from "drizzle-orm";
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

export async function incrementPlanUsageIfNeeded(db: Database, plan: ActivePlan, userId: string) {
  if (plan.planType !== "personal") {
    return plan;
  }

  const [updatedPlan] = await db
    .update(userPlans)
    .set({ trialUsed: sql`${userPlans.trialUsed} + 1`, updatedAt: new Date() })
    .where(eq(userPlans.userId, userId))
    .returning();

  return {
    ...updatedPlan,
    planVariant: ((updatedPlan.planVariant as PlanVariant | undefined) ?? "personal"),
  } satisfies ActivePlan;
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
