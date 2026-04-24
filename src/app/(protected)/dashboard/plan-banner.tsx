import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { userPlans } from "@/lib/db/schema";

const PERSONAL_LIMIT = 5;

export async function PlanBanner() {
  const { userId } = await auth();
  if (!userId) return null;

  const db = getDb();
  const [plan] = await db.select().from(userPlans).where(eq(userPlans.userId, userId)).limit(1);

  // 未找到记录 → personal 免费
  if (!plan || plan.planType === "personal") {
    const trialUsed = plan?.trialUsed ?? 0;
    const trialRemaining = Math.max(0, PERSONAL_LIMIT - trialUsed);
    return (
      <div className="rounded-xl border border-blue-100 bg-blue-50 px-5 py-4 text-sm text-blue-900">
        免费 Personal 套餐共 <span className="font-semibold">5</span> 次试用机会，剩余{" "}
        <span className="font-semibold">{trialRemaining}</span> 次，升级后无限使用。
        <Link href="/pricing" className="ml-2 font-semibold underline hover:text-blue-700">
          查看套餐 →
        </Link>
      </div>
    );
  }

  // business 兼容旧数据
  const planVariant =
    plan.planType === "business" && plan.planVariant === "personal" ? "yearly" : plan.planVariant;

  // 检查是否过期
  if (
    (planVariant === "monthly" || planVariant === "yearly") &&
    plan.planExpiry &&
    plan.planExpiry < new Date()
  ) {
    const trialRemaining = Math.max(0, PERSONAL_LIMIT - (plan.trialUsed ?? 0));
    return (
      <div className="rounded-xl border border-blue-100 bg-blue-50 px-5 py-4 text-sm text-blue-900">
        套餐已到期，剩余试用 <span className="font-semibold">{trialRemaining}</span> 次。
        <Link href="/pricing" className="ml-2 font-semibold underline hover:text-blue-700">
          续费 →
        </Link>
      </div>
    );
  }

  const daysRemaining =
    (planVariant === "monthly" || planVariant === "yearly") && plan.planExpiry
      ? Math.max(0, Math.ceil((plan.planExpiry.getTime() - Date.now()) / 86400000))
      : null;

  const detail =
    planVariant === "monthly" && daysRemaining !== null
      ? `月卡，还剩 ${daysRemaining} 天`
      : planVariant === "yearly" && daysRemaining !== null
      ? `年卡，还剩 ${daysRemaining} 天`
      : planVariant === "lifetime"
      ? "永久卡，无限使用"
      : "年卡";

  return (
    <div className="rounded-xl border border-green-200 bg-green-50 px-5 py-4 text-sm font-medium text-green-800">
      ✓ 当前为 Business 会员（{detail}），享受无限次生成。
    </div>
  );
}
