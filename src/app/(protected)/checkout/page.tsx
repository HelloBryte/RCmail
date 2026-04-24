"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

const PLAN_META = {
  monthly: { label: "标准月卡", period: "/ 月", original: "29.9", badge: "限时特惠" },
  yearly:  { label: "尊享年卡", period: "/ 年", original: "199",  badge: "最受欢迎" },
};

export default function CheckoutPage() {
  const params = useSearchParams();
  const router = useRouter();

  const plan    = params.get("plan") as "monthly" | "yearly" | null;
  const price   = params.get("price");
  const qrcode  = params.get("qrcode");
  const orderId = params.get("orderId");

  const [status, setStatus]   = useState<"pending" | "success" | "expired">("pending");
  const [seconds, setSeconds] = useState(300);
  const pollRef  = useRef<ReturnType<typeof setInterval> | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const meta = plan ? PLAN_META[plan] : null;
  const saved = meta && price
    ? (parseFloat(meta.original) - parseFloat(price)).toFixed(1).replace(/\.0$/, "")
    : null;

  useEffect(() => {
    if (!qrcode || !price || !plan) return;

    pollRef.current = setInterval(async () => {
      try {
        const res  = await fetch("/api/account/plan");
        const data = await res.json() as { type: string };
        if (data.type === "business") {
          clearInterval(pollRef.current!);
          clearInterval(timerRef.current!);
          setStatus("success");
          setTimeout(() => router.push("/dashboard"), 2000);
        }
      } catch { /* ignore */ }
    }, 2000);

    timerRef.current = setInterval(() => {
      setSeconds((s) => {
        if (s <= 1) {
          clearInterval(timerRef.current!);
          clearInterval(pollRef.current!);
          setStatus("expired");
          return 0;
        }
        return s - 1;
      });
    }, 1000);

    return () => {
      clearInterval(pollRef.current!);
      clearInterval(timerRef.current!);
    };
  }, [qrcode, price, plan, router]);

  if (!qrcode || !price || !plan || !meta) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="text-center">
          <p className="text-gray-500">无效的支付信息。</p>
          <Link href="/pricing" className="mt-4 inline-block text-sm text-blue-600 underline">返回套餐页</Link>
        </div>
      </div>
    );
  }

  if (status === "success") {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="rounded-2xl border border-green-200 bg-green-50 p-12 text-center shadow-sm">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-500 text-3xl text-white">✓</div>
          <h2 className="text-xl font-bold text-green-800">支付成功！</h2>
          <p className="mt-2 text-sm text-green-700">{meta.label} 已开通，正在跳转…</p>
        </div>
      </div>
    );
  }

  if (status === "expired") {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="rounded-2xl border border-gray-200 bg-white p-12 text-center shadow-sm">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-gray-100 text-2xl">⏱</div>
          <p className="font-semibold text-gray-700">二维码已过期</p>
          <p className="mt-1 text-sm text-gray-400">请重新下单生成新的支付码</p>
          <Link href="/pricing" className="mt-5 inline-block rounded-lg bg-blue-600 px-8 py-2.5 text-sm font-semibold text-white hover:bg-blue-700">
            重新下单
          </Link>
        </div>
      </div>
    );
  }

  const mins = String(Math.floor(seconds / 60)).padStart(2, "0");
  const secs = String(seconds % 60).padStart(2, "0");

  return (
    <div className="flex min-h-[70vh] items-center justify-center px-4 py-10">
      <div className="w-full max-w-xs overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-xl">

        {/* 顶部套餐标签 */}
        <div className="bg-blue-600 px-6 py-3 text-center">
          <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-white">
            <span className="rounded-full bg-white/20 px-2 py-0.5 text-xs">{meta.badge}</span>
            {meta.label}
          </span>
        </div>

        <div className="p-6">
          {/* 价格区 */}
          <div className="mb-1 flex items-baseline justify-center gap-1">
            <span className="text-sm font-medium text-gray-400">¥</span>
            <span className="text-5xl font-extrabold text-gray-900">{price}</span>
            <span className="text-sm text-gray-400">{meta.period}</span>
          </div>
          <div className="mb-5 flex items-center justify-center gap-2 text-xs text-gray-400">
            <span className="line-through">原价 ¥{meta.original}</span>
            {saved && <span className="rounded-full bg-red-50 px-2 py-0.5 font-semibold text-red-500">已减 ¥{saved}</span>}
          </div>

          {/* 分割线 */}
          <div className="mb-5 border-t border-gray-100" />

          {/* 二维码 */}
          <div className="flex flex-col items-center gap-3">
            <p className="text-xs text-gray-500">请使用微信扫描下方二维码完成支付</p>
            <div className="rounded-xl border-2 border-gray-100 p-2 shadow-sm">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={qrcode} alt="微信支付二维码" width={180} height={180} className="rounded-lg" />
            </div>

            {/* 倒计时 */}
            <div className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-mono font-semibold ${
              seconds <= 60 ? "bg-red-50 text-red-500" : "bg-gray-50 text-gray-400"
            }`}>
              <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              二维码有效期 {mins}:{secs}
            </div>

            <p className="text-xs text-gray-400">支付完成后自动开通，无需手动刷新</p>
          </div>

          {/* 分割线 */}
          <div className="my-5 border-t border-gray-100" />

          {/* 底部 */}
          <div className="flex items-center justify-between text-[11px] text-gray-300">
            <Link href="/pricing" className="transition hover:text-gray-500">← 返回套餐页</Link>
            {orderId && <span>订单号 {orderId.slice(-8)}</span>}
          </div>
        </div>
      </div>
    </div>
  );
}


  useEffect(() => {
    if (!qrcode || !price || !plan) return;

    // 轮询付款状态
    pollRef.current = setInterval(async () => {
      try {
        const res = await fetch("/api/account/plan");
        const data = await res.json() as { type: string };
        if (data.type === "business") {
          clearInterval(pollRef.current!);
          clearInterval(timerRef.current!);
          setStatus("success");
          setTimeout(() => router.push("/dashboard"), 2000);
        }
      } catch { /* ignore */ }
    }, 2000);

    // 倒计时
    timerRef.current = setInterval(() => {
      setSeconds((s) => {
        if (s <= 1) {
          clearInterval(timerRef.current!);
          clearInterval(pollRef.current!);
          setStatus("expired");
          return 0;
        }
        return s - 1;
      });
    }, 1000);

    return () => {
      clearInterval(pollRef.current!);
      clearInterval(timerRef.current!);
    };
  }, [qrcode, price, plan, router]);

  if (!qrcode || !price || !plan) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="text-center">
          <p className="text-gray-500">无效的支付信息。</p>
          <Link href="/pricing" className="mt-4 inline-block text-sm text-blue-600 underline">返回套餐页</Link>
        </div>
      </div>
    );
  }

  const mins = String(Math.floor(seconds / 60)).padStart(2, "0");
  const secs = String(seconds % 60).padStart(2, "0");

  if (status === "success") {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="rounded-2xl border border-green-200 bg-green-50 p-10 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100 text-3xl">✓</div>
          <h2 className="text-xl font-bold text-green-800">支付成功！</h2>
          <p className="mt-2 text-sm text-green-700">{planLabel} 已开通，正在跳转…</p>
        </div>
      </div>
    );
  }

  if (status === "expired") {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="rounded-2xl border border-gray-200 bg-white p-10 text-center shadow-sm">
          <p className="text-gray-500">二维码已过期。</p>
          <Link href="/pricing" className="mt-4 inline-block rounded-lg bg-blue-600 px-6 py-2 text-sm font-semibold text-white hover:bg-blue-700">
            重新下单
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="w-full max-w-sm rounded-2xl border border-gray-200 bg-white p-8 shadow-md">
        {/* 返回 */}
        <Link href="/pricing" className="mb-6 flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600">
          <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          返回套餐选择
        </Link>

        {/* 标题 */}
        <h2 className="text-xl font-bold text-gray-900">微信支付</h2>
        <p className="mt-1 text-sm text-gray-500">
          {planLabel} · <span className="font-semibold text-gray-900">¥{price}</span>
        </p>

        {/* 二维码 */}
        <div className="my-6 flex justify-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={qrcode}
            alt="微信支付二维码"
            width={200}
            height={200}
            className="rounded-xl border border-gray-200 shadow-sm"
          />
        </div>

        {/* 说明 */}
        <div className="space-y-2 text-center">
          <p className="text-sm text-gray-600">用微信扫码完成支付，支付后自动开通</p>
          <p className={`text-xs font-mono ${seconds <= 60 ? "text-red-500" : "text-gray-400"}`}>
            二维码有效期 {mins}:{secs}
          </p>
        </div>

        {/* 订单号 */}
        {orderId && (
          <p className="mt-4 text-center text-[10px] text-gray-300">订单号：{orderId}</p>
        )}
      </div>
    </div>
  );
}
