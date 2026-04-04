"use client";

import { useEffect, useRef, useState } from "react";

type PlanData = {
  type: "personal" | "business";
  trialRemaining: number | null;
};

type OrderData = {
  urlQrcode: string;
  url: string;
  orderId: string;
  price: string;
};

export default function PricingPage() {
  const [plan, setPlan] = useState<PlanData | null>(null);
  const [order, setOrder] = useState<OrderData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  function fetchPlan() {
    return fetch("/api/account/plan")
      .then((r) => r.json())
      .then((d: PlanData) => { setPlan(d); return d; })
      .catch(() => null);
  }

  useEffect(() => {
    fetchPlan();
  }, []);

  // Start polling when QR code is shown; stop when Business detected
  useEffect(() => {
    if (order && plan?.type !== "business") {
      pollRef.current = setInterval(async () => {
        const latest = await fetchPlan();
        if (latest?.type === "business") {
          clearInterval(pollRef.current!);
          setOrder(null);
        }
      }, 1000);
    } else {
      if (pollRef.current) clearInterval(pollRef.current);
    }
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [order]);

  async function handleUpgrade() {
    setLoading(true);
    setError("");
    setOrder(null);

    try {
      const res = await fetch("/api/billing/create-order", { method: "POST" });
      const data = await res.json();

      if (!res.ok || data.error) {
        setError(data.error ?? "下单失败，请稍后重试");
        return;
      }

      setOrder(data);
    } catch {
      setError("网络错误，请稍后重试");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="grid flex-1 gap-5 lg:grid-cols-2">
      <section className="card-surface rounded-2xl p-6">
        <h2 className="section-title text-2xl font-semibold">Personal</h2>
        <p className="mt-2 text-sm text-[var(--muted)]">免费体验，总共 3 次生成机会。</p>
        {plan?.type === "personal" && (
          <p className="mt-3 text-sm font-medium text-[var(--brand)]">
            当前套餐 · 剩余 {plan.trialRemaining ?? 0} 次
          </p>
        )}
      </section>

      <section className="card-surface rounded-2xl p-6">
        <h2 className="section-title text-2xl font-semibold">Business</h2>
        <p className="mt-2 text-sm text-[var(--muted)]">无限次生成，适合高频商务往来。</p>

        {plan?.type === "business" ? (
          <p className="mt-3 text-sm font-medium text-[var(--brand)]">当前套餐 · 无限使用</p>
        ) : (
          <>
            {!order && (
              <button
                type="button"
                onClick={handleUpgrade}
                disabled={loading}
                className="mt-4 rounded-full bg-[var(--brand)] px-5 py-2 text-sm font-semibold text-white disabled:opacity-70"
              >
                {loading ? "生成支付码..." : "升级 Business"}
              </button>
            )}

            {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

            {order && (
              <div className="mt-4 space-y-3">
                <p className="text-sm text-[var(--muted)]">
                  使用微信扫码支付 <span className="font-semibold text-[var(--ink)]">¥{order.price}</span>，支付后自动开通 Business。
                </p>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={order.urlQrcode}
                  alt="微信收款码"
                  width={180}
                  height={180}
                  className="rounded-xl border border-[var(--line)]"
                />
                <p className="text-xs text-[var(--muted)]">二维码有效期 5 分钟，过期请刷新页面重新生成。</p>
                <button
                  type="button"
                  onClick={() => { setOrder(null); setError(""); }}
                  className="text-xs text-[var(--muted)] underline"
                >
                  重新生成
                </button>
              </div>
            )}
          </>
        )}
      </section>
    </main>
  );
}
