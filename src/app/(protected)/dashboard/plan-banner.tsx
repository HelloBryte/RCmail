import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { getDb } from "@/lib/db";
import { buildPlanInfo, getActiveUserPlan, PERSONAL_LIMIT } from "@/lib/plans";

export async function PlanBanner() {
  const { userId } = await auth();
  if (!userId) return null;

  const db = getDb();
  // 复用与 API 相同的套餐逻辑（含过期降级、旧数据兼容），避免两处规则不一致
  const planInfo = buildPlanInfo(await getActiveUserPlan(db, userId));

  if (planInfo.type === "personal") {
    return (
      <div className="rounded-xl border border-blue-100 bg-blue-50 px-5 py-4 text-sm text-blue-900">
        免费 Personal 套餐共 <span className="font-semibold">{PERSONAL_LIMIT}</span> 次试用机会，剩余{" "}
        <span className="font-semibold">{planInfo.trialRemaining}</span> 次，升级后无限使用。
        <Link href="/pricing" className="ml-2 font-semibold underline hover:text-blue-700">
          查看套餐 →
        </Link>
      </div>
    );
  }

  const detail =
    planInfo.variant === "lifetime"
      ? "永久卡，无限使用"
      : planInfo.daysRemaining !== null
      ? `${planInfo.variant === "monthly" ? "月卡" : "年卡"}，还剩 ${planInfo.daysRemaining} 天`
      : "年卡";

  return (
    <div className="rounded-xl border border-green-200 bg-green-50 px-5 py-4 text-sm font-medium text-green-800">
      ✓ 当前为 Business 会员（{detail}），享受无限次生成。
    </div>
  );
}
