"use client";

import { useEffect, useRef, useState } from "react";
import { Check } from "lucide-react";

type PlanData = {
  type: "personal" | "business";
  variant: "personal" | "monthly" | "yearly" | "lifetime";
  trialRemaining: number | null;
  daysRemaining: number | null;
  expiry: string | null;
};

type OrderData = {
  urlQrcode: string;
  url: string;
  orderId: string;
  price: string;
};

const MONTHLY_FEATURES = [
  "不限字数 实时翻译",
  "极速翻译 响应毫秒级",
  "专属引擎 AI深度训练",
  "支持多种场合俄语邮件",
];

const YEARLY_FEATURES = [
  "不限字数 实时翻译",
  "极速翻译 专线加速",
  "专属引擎 定制化术语库",
  "多设备同时在线登录",
  "24/7 VIP 专属客服支持",
];

export default function PricingPage() {
  const [plan, setPlan] = useState<PlanData | null>(null);
  const [planLoading, setPlanLoading] = useState(true);
  const [prices, setPrices] = useState<{ monthly: string; yearly: string } | null>(null);
  const [order, setOrder] = useState<OrderData | null>(null);
  const [activePlan, setActivePlan] = useState<"monthly" | "yearly" | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  function fetchPlan() {
    return fetch("/api/account/plan")
      .then((r) => r.json())
      .then((d: PlanData) => { setPlan(d); setPlanLoading(false); return d; })
      .catch(() => { setPlanLoading(false); return null; });
  }

  useEffect(() => {
    fetchPlan();
    fetch("/api/billing/prices")
      .then((r) => r.json())
      .then((d: { monthly: string; yearly: string }) => setPrices(d))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (order && plan?.type !== "business") {
      pollRef.current = setInterval(async () => {
        const latest = await fetchPlan();
        if (latest?.type === "business") {
          clearInterval(pollRef.current!);
          setOrder(null);
          setActivePlan(null);
        }
      }, 1000);
    } else {
      if (pollRef.current) clearInterval(pollRef.current);
    }
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [order]);

  async function handleUpgrade(planType: "monthly" | "yearly") {
    setLoading(true);
    setError("");
    setOrder(null);
    setActivePlan(planType);

    try {
      const res = await fetch("/api/billing/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: planType }),
      });
      const data = await res.json();

      if (!res.ok || data.error) {
        setError(data.error ?? "下单失败，请稍后重试");
        setActivePlan(null);
        return;
      }

      setOrder(data);
    } catch {
      setError("网络错误，请稍后重试");
      setActivePlan(null);
    } finally {
      setLoading(false);
    }
  }

  const isBusiness = plan?.type === "business";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="section-title text-2xl font-bold text-gray-900 sm:text-3xl">选择套餐</h1>
        <p className="mt-2 text-gray-500">升级后立即生效，无限次生成商务俄语邮件。</p>
      </div>

      {planLoading ? (
        <div className="rounded-xl border border-gray-100 bg-gray-50 px-5 py-4 text-sm text-gray-400">套餐状态加载中…</div>
      ) : isBusiness ? (
        <div className="rounded-xl border border-green-200 bg-green-50 px-5 py-4 text-sm font-medium text-green-800">
          ✓ 您当前已是 Business 会员{plan?.variant === "monthly" && plan.daysRemaining !== null ? `（月卡，还剩 ${plan.daysRemaining} 天）` : plan?.variant === "yearly" && plan.daysRemaining !== null ? `（年卡，还剩 ${plan.daysRemaining} 天）` : plan?.variant === "lifetime" ? "（永久卡，无限使用）" : ""}，享受无限使用权限。
        </div>
      ) : plan?.type === "personal" ? (
        <div className="rounded-xl border border-blue-100 bg-blue-50 px-5 py-4 text-sm text-blue-900">
          当前为免费 Personal 套餐 · 剩余试用次数：<span className="font-semibold">{plan.trialRemaining ?? 0}</span> 次
        </div>
      ) : null}

      <div className="grid gap-6 md:grid-cols-2">
        {/* 标准月卡 */}
        <div className="rounded-2xl border-2 border-gray-200 bg-white p-6 shadow-sm">
          <div className="mb-5 flex items-center gap-3 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3">
            <svg className="h-6 w-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <div>
              <p className="font-semibold text-gray-900">标准月卡</p>
              <p className="text-xs text-gray-500">适合短期高频需求</p>
            </div>
          </div>

          <div className="mb-5">
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-extrabold text-gray-900">¥{prices?.monthly ?? "--"}</span>
              <span className="text-gray-500">/月</span>
            </div>
            <p className="mt-1 text-sm text-gray-400 line-through">不要 29.9 元</p>
          </div>

          <ul className="mb-6 space-y-3">
            {MONTHLY_FEATURES.map((f) => (
              <li key={f} className="flex items-center gap-2 text-sm text-gray-700">
                <Check className="h-4 w-4 flex-shrink-0 text-green-500" />
                {f}
              </li>
            ))}
          </ul>

          {isBusiness ? (
            <div className="rounded-lg border border-gray-200 py-3 text-center text-sm text-gray-400">
              已开通高级套餐
            </div>
          ) : (
            <>
              {order && activePlan === "monthly" ? (
                <div className="space-y-3">
                  <p className="text-sm text-gray-500">
                    使用微信扫码支付 <span className="font-semibold text-gray-900">¥{order.price}</span>，支付后自动开通。
                  </p>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={order.urlQrcode} alt="微信收款码" width={180} height={180} className="rounded-xl border border-gray-200" />
                  <p className="text-xs text-gray-400">二维码有效期 5 分钟，过期请重新生成。</p>
                  <button type="button" onClick={() => { setOrder(null); setActivePlan(null); setError(""); }} className="text-xs text-gray-400 underline">
                    重新生成
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => handleUpgrade("monthly")}
                  disabled={loading}
                  className="w-full rounded-lg border border-blue-600 py-3 text-sm font-semibold text-blue-700 transition hover:bg-blue-50 disabled:opacity-70"
                >
                  {loading && activePlan === "monthly" ? "生成支付码..." : "立即抢购"}
                </button>
              )}
            </>
          )}
        </div>

        {/* 尊享年卡 */}
        <div className="relative overflow-hidden rounded-2xl border-2 border-blue-500 bg-white p-6 shadow-md">
          {/* 最受欢迎横幅 */}
          <div className="absolute left-0 right-0 top-0 bg-blue-600 py-1.5 text-center text-xs font-semibold tracking-wide text-white">
            最受欢迎 · 极力推荐
          </div>
          {/* 限时特惠角标 */}
          <div className="absolute right-0 top-8 overflow-hidden">
            <div className="translate-x-2 translate-y-1 rotate-45 bg-red-500 px-6 py-0.5 text-[10px] font-bold text-white shadow">
              限时特惠
            </div>
          </div>

          <div className="mb-5 mt-7 flex items-center gap-3 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600">
              <svg className="h-5 w-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
            </div>
            <div>
              <p className="font-semibold text-gray-900">尊享年卡</p>
              <p className="text-xs text-gray-500">每天不到 0.3 元</p>
            </div>
          </div>

          <div className="mb-5">
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-extrabold text-gray-900">¥{prices?.yearly ?? "--"}</span>
              <span className="text-gray-500">/年</span>
            </div>
            <p className="mt-1 text-sm text-gray-400 line-through">不要 199 元</p>
          </div>

          <ul className="mb-6 space-y-3">
            {YEARLY_FEATURES.map((f) => (
              <li key={f} className="flex items-center gap-2 text-sm text-gray-700">
                <Check className="h-4 w-4 flex-shrink-0 text-green-500" />
                {f}
              </li>
            ))}
          </ul>

          {isBusiness ? (
            <div className="rounded-lg border border-gray-200 py-3 text-center text-sm text-gray-400">
              已开通高级套餐
            </div>
          ) : (
            <>
              {order && activePlan === "yearly" ? (
                <div className="space-y-3">
                  <p className="text-sm text-gray-500">
                    使用微信扫码支付 <span className="font-semibold text-gray-900">¥{order.price}</span>，支付后自动开通。
                  </p>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={order.urlQrcode} alt="微信收款码" width={180} height={180} className="rounded-xl border border-gray-200" />
                  <p className="text-xs text-gray-400">二维码有效期 5 分钟，过期请重新生成。</p>
                  <button type="button" onClick={() => { setOrder(null); setActivePlan(null); setError(""); }} className="text-xs text-gray-400 underline">
                    重新生成
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => handleUpgrade("yearly")}
                  disabled={loading}
                  className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-70"
                >
                  {loading && activePlan === "yearly" ? "生成支付码..." : (
                    <>立即省 ¥100 开通 →</>
                  )}
                </button>
              )}
              <p className="mt-2 text-center text-xs text-gray-400">* 支付完成立即生效，赠送30天免费时长</p>
            </>
          )}
        </div>
      </div>

      {error && (
        <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">{error}</p>
      )}
    </div>
  );
}

