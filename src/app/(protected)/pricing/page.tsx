"use client";

import { useEffect, useState } from "react";

type PlanData = {
  type: "personal" | "business";
  trialRemaining: number | null;
  expireAt: string | null;
  paywallUrl: string;
};

export default function PricingPage() {
  const [plan, setPlan] = useState<PlanData | null>(null);

  useEffect(() => {
    fetch("/api/account/plan")
      .then((r) => r.json())
      .then((d) => setPlan(d))
      .catch(() => {});
  }, []);

  return (
    <main className="grid flex-1 gap-5 lg:grid-cols-2">
      <section className="card-surface rounded-2xl p-6">
        <h2 className="section-title text-2xl font-semibold">Personal</h2>
        <p className="mt-3 text-sm text-[var(--muted)]">适合先体验：总共 3 次生成机会。</p>
        {plan?.type === "personal" && (
          <p className="mt-2 text-sm font-medium text-[var(--brand)]">
            当前套餐 · 剩余 {plan.trialRemaining ?? 0} 次
          </p>
        )}
      </section>

      <section className="card-surface rounded-2xl p-6">
        <h2 className="section-title text-2xl font-semibold">Business</h2>
        <p className="mt-3 text-sm text-[var(--muted)]">无限使用、适合高频商务往来。</p>
        {plan?.type === "business" && (
          <p className="mt-2 text-sm font-medium text-[var(--brand)]">
            当前套餐 · {plan.expireAt ? `到期：${plan.expireAt}` : "有效"}
          </p>
        )}

        {plan?.paywallUrl ? (
          <a
            href={plan.paywallUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 inline-flex rounded-full bg-[var(--brand)] px-5 py-2 text-sm font-semibold text-white"
          >
            {plan.type === "business" ? "管理订阅" : "升级 Business"}
          </a>
        ) : (
          <div className="mt-4 rounded-xl border border-dashed border-[var(--line)] bg-white/70 p-4">
            <p className="text-xs text-[var(--muted)]">加载支付链接中...</p>
          </div>
        )}
      </section>
    </main>
  );
}
