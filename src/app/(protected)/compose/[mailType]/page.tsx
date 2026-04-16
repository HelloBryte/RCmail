"use client";

import Link from "next/link";
import { type FormEvent, use, useEffect, useMemo, useState } from "react";
import { getMailTypeBySlug, isMailTypeSlug, type MailTypeSlug } from "@/lib/mail-types";

type PlanInfo = {
  type: "personal" | "business";
  variant: "personal" | "monthly" | "yearly" | "lifetime";
  trialUsed: number;
  trialRemaining: number | null;
  daysRemaining: number | null;
};

export default function ComposePage({ params }: { params: Promise<{ mailType: string }> }) {
  const { mailType } = use(params);
  const [recipient, setRecipient] = useState("");
  const [purpose, setPurpose] = useState("");
  const [details, setDetails] = useState("");
  const [tone, setTone] = useState<"formal" | "friendly" | "firm">("formal");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [mailSubject, setMailSubject] = useState("");
  const [mailBody, setMailBody] = useState("");
  const [plan, setPlan] = useState<PlanInfo | null>(null);
  const [planLoading, setPlanLoading] = useState(true);

  useEffect(() => {
    fetch("/api/account/plan")
      .then((r) => r.json())
      .then((d: PlanInfo) => setPlan(d))
      .catch(() => {})
      .finally(() => setPlanLoading(false));
  }, []);

  const type = useMemo(() => (isMailTypeSlug(mailType) ? (mailType as MailTypeSlug) : null), [mailType]);

  if (!type) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <p className="text-sm text-gray-500">无效的邮件类型。</p>
        <Link href="/dashboard" className="mt-3 inline-flex rounded-lg border border-gray-300 px-4 py-2 text-sm hover:bg-gray-50">
          返回模板列表
        </Link>
      </div>
    );
  }

  const typeInfo = getMailTypeBySlug(type);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setMailSubject("");
    setMailBody("");

    try {
      const res = await fetch("/api/generate-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mailType: type,
          recipient,
          purpose,
          details,
          tone,
        }),
      });

      if (res.status === 402) {
        const data = await res.json();
        setError(data.message ?? "试用次数已用完，请升级 Business。");
        setBusy(false);
        return;
      }

      if (res.status === 401) {
        throw new Error("登录已过期，请刷新页面后重新登录");
      }

      if (!res.ok) {
        const msg = await res.text().catch(() => "");
        throw new Error(`生成失败 (${res.status})${msg ? "：" + msg.slice(0, 120) : ""}`);
      }

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.startsWith("data:")) continue;
          const jsonStr = line.slice(5).trim();
          if (!jsonStr) continue;
          try {
            const ev = JSON.parse(jsonStr);
            if (ev.type === "chunk") {
              setMailBody((prev) => prev + ev.delta);
            } else if (ev.type === "done") {
              setMailSubject(ev.email?.subject ?? "");
              setMailBody(ev.email?.russianOutput ?? "");
              setPlan(ev.plan ?? null);
            } else if (ev.type === "error") {
              setError(ev.message ?? "生成失败");
            }
          } catch { /* ignore malformed events */ }
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "请求失败");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1.1fr_1fr]">
      {/* Left: Form */}
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
        <p className="text-xs uppercase tracking-widest text-gray-400">模板写作</p>
        <h2 className="section-title mt-2 text-2xl font-bold text-gray-900">{typeInfo.title}</h2>
        <p className="mt-2 text-sm text-gray-500">{typeInfo.summary}</p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-gray-700">收件人 / 公司</label>
            <input
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
              placeholder="例如：ООО ТехПром"
              className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              required
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-gray-700">沟通目的</label>
            <input
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
              placeholder="例如：邀请客户参加5月莫斯科展会"
              className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              required
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-gray-700">补充要点（可选）</label>
            <textarea
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              placeholder="例如：报价有效期10天、附件含产品目录、希望3月底前确认。"
              className="min-h-28 w-full rounded-lg border border-gray-300 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-gray-700">语气风格</label>
            <select
              value={tone}
              onChange={(e) => setTone(e.target.value as "formal" | "friendly" | "firm")}
              className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            >
              <option value="formal">专业正式</option>
              <option value="friendly">友好合作</option>
              <option value="firm">礼貌坚定</option>
            </select>
          </div>

          <button
            type="submit"
            disabled={busy}
            className="rounded-lg bg-blue-700 px-6 py-3 text-sm font-semibold text-white transition hover:bg-blue-800 disabled:opacity-70"
          >
            {busy ? "生成中..." : "生成俄语商务邮件"}
          </button>
        </form>

        {error && (
          <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
            {error}
            {error.includes("试用") && (
              <Link href="/pricing" className="ml-2 font-semibold underline">
                去升级套餐
              </Link>
            )}
          </div>
        )}

        <div className="mt-4 rounded-lg border border-blue-100 bg-blue-50 px-4 py-3 text-xs text-blue-900">
          {planLoading ? (
            <span className="text-gray-400">套餐加载中…</span>
          ) : plan?.type === "business" ? (
            plan.variant === "monthly" && plan.daysRemaining !== null
              ? `当前为 Business 月卡，还剩 ${plan.daysRemaining} 天。`
              : plan.variant === "yearly" && plan.daysRemaining !== null
              ? `当前为 Business 年卡，还剩 ${plan.daysRemaining} 天。`
              : plan.variant === "lifetime"
              ? "当前为 Business 永久卡，无限使用。"
              : "当前为 Business 会员，无限使用。"
          ) : (
            `当前为 Personal 套餐，剩余试用：${plan?.trialRemaining ?? 5} 次`
          )}
          <Link href="/pricing" className="ml-2 font-semibold underline">
            查看套餐
          </Link>
        </div>
      </div>

      {/* Right: Result */}
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="section-title text-xl font-bold text-gray-900">俄语邮件结果</h3>
          <button
            type="button"
            onClick={() => navigator.clipboard.writeText(`Тема: ${mailSubject}\n\n${mailBody}`)}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
          >
            复制俄语邮件
          </button>
        </div>

        <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
          {busy && !mailBody ? (
            <p className="animate-pulse text-sm text-gray-400">正在生成，请稍候…</p>
          ) : (
            <>
              <p className="text-sm font-semibold text-gray-800">Тема: {mailSubject || "(等待生成)"}</p>
              <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-gray-700">{mailBody || "生成结果会显示在这里。"}</p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
