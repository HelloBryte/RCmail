"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type PlanData = {
  type: "personal" | "business";
  variant: "personal" | "monthly" | "yearly" | "lifetime";
  trialRemaining: number | null;
  daysRemaining: number | null;
};

export function PlanBanner() {
  const [plan, setPlan] = useState<PlanData | null>(null);

  useEffect(() => {
    fetch("/api/account/plan")
      .then((r) => r.json())
      .then((d: PlanData) => setPlan(d))
      .catch(() => {});
  }, []);

  // 加载中不显示任何内容，避免闪烁
  if (!plan) return null;

  if (plan.type === "business") {
    const detail =
      plan.variant === "monthly" && plan.daysRemaining !== null
        ? `月卡，还剩 ${plan.daysRemaining} 天`
        : plan.variant === "yearly" && plan.daysRemaining !== null
        ? `年卡，还剩 ${plan.daysRemaining} 天`
        : plan.variant === "lifetime"
        ? "永久卡，无限使用"
        : "年卡";
    return (
      <div className="rounded-xl border border-green-200 bg-green-50 px-5 py-4 text-sm font-medium text-green-800">
        ✓ 当前为 Business 会员（{detail}），享受无限次生成。
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-blue-100 bg-blue-50 px-5 py-4 text-sm text-blue-900">
      免费 Personal 套餐共 <span className="font-semibold">5</span> 次试用机会，剩余{" "}
      <span className="font-semibold">{plan.trialRemaining ?? 5}</span> 次，升级后无限使用。
      <Link href="/pricing" className="ml-2 font-semibold underline hover:text-blue-700">
        查看套餐 →
      </Link>
    </div>
  );
}
