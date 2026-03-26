"use client";

import { useState } from "react";

export default function PricingPage() {
  const [upgrading, setUpgrading] = useState(false);
  const [message, setMessage] = useState("");

  async function activateBusiness() {
    setUpgrading(true);
    setMessage("");

    const res = await fetch("/api/billing/activate-business", { method: "POST" });
    if (res.ok) {
      setMessage("Business 已开通，可无限使用。请返回模板页继续写信。");
    } else {
      setMessage("开通失败，请稍后重试。");
    }

    setUpgrading(false);
  }

  return (
    <main className="grid flex-1 gap-5 lg:grid-cols-2">
      <section className="card-surface rounded-2xl p-6">
        <h2 className="section-title text-2xl font-semibold">Personal</h2>
        <p className="mt-3 text-sm text-[var(--muted)]">适合先体验：总共 3 次生成机会。</p>
      </section>

      <section className="card-surface rounded-2xl p-6">
        <h2 className="section-title text-2xl font-semibold">Business</h2>
        <p className="mt-3 text-sm text-[var(--muted)]">无限使用、适合高频商务往来。</p>

        <div className="mt-4 rounded-xl border border-dashed border-[var(--line)] bg-white/70 p-4">
          <p className="text-xs uppercase tracking-widest text-[var(--muted)]">支付二维码占位区</p>
          <div className="mt-2 flex h-44 items-center justify-center rounded-lg bg-[#f3efe6] text-sm text-[var(--muted)]">
            在这里放你的收款图片
          </div>
        </div>

        <button
          type="button"
          onClick={activateBusiness}
          disabled={upgrading}
          className="mt-4 rounded-full bg-[var(--brand)] px-5 py-2 text-sm font-semibold text-white disabled:opacity-70"
        >
          {upgrading ? "处理中..." : "我已付款，开通 Business"}
        </button>

        {message ? <p className="mt-3 text-sm text-[var(--ink)]">{message}</p> : null}
      </section>
    </main>
  );
}
