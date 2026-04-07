"use client";

import Link from "next/link";
import { type FormEvent, use, useMemo, useState } from "react";
import { getMailTypeBySlug, isMailTypeSlug, type MailTypeSlug } from "@/lib/mail-types";

type PlanInfo = {
  type: "personal" | "business";
  trialUsed: number;
  trialRemaining: number | null;
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

  const type = useMemo(() => (isMailTypeSlug(mailType) ? (mailType as MailTypeSlug) : null), [mailType]);

  if (!type) {
    return (
      <main className="card-surface rounded-2xl p-6">
        <p className="text-sm text-[var(--muted)]">无效的邮件类型。</p>
        <Link href="/dashboard" className="mt-3 inline-flex rounded-full border border-[var(--line)] px-4 py-2 text-sm">
          返回模板列表
        </Link>
      </main>
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
    <main className="grid flex-1 gap-5 lg:grid-cols-[1.1fr_1fr]">
      <section className="card-surface rounded-2xl p-6">
        <p className="text-xs uppercase tracking-widest text-[var(--muted)]">模板写作</p>
        <h2 className="section-title mt-2 text-2xl font-semibold">{typeInfo.title}</h2>
        <p className="mt-2 text-sm text-[var(--muted)]">{typeInfo.summary}</p>

        <form onSubmit={handleSubmit} className="mt-5 space-y-3">
          <input
            value={recipient}
            onChange={(e) => setRecipient(e.target.value)}
            placeholder="收件人 / 公司"
            className="w-full rounded-xl border border-[var(--line)] bg-white/80 px-3 py-2"
            required
          />
          <input
            value={purpose}
            onChange={(e) => setPurpose(e.target.value)}
            placeholder="沟通目的"
            className="w-full rounded-xl border border-[var(--line)] bg-white/80 px-3 py-2"
            required
          />
          <textarea
            value={details}
            onChange={(e) => setDetails(e.target.value)}
            placeholder="补充要点（金额、截止日期、发票号、展位号等）"
            className="min-h-28 w-full rounded-xl border border-[var(--line)] bg-white/80 px-3 py-2"
          />
          <select
            value={tone}
            onChange={(e) => setTone(e.target.value as "formal" | "friendly" | "firm")}
            className="w-full rounded-xl border border-[var(--line)] bg-white/80 px-3 py-2"
          >
            <option value="formal">正式</option>
            <option value="friendly">友好</option>
            <option value="firm">礼貌坚定</option>
          </select>

          <button
            type="submit"
            disabled={busy}
            className="rounded-full bg-[var(--brand)] px-5 py-2 text-sm font-semibold text-white disabled:opacity-70"
          >
            {busy ? "生成中..." : "生成俄语商务邮件"}
          </button>
        </form>

        {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}

        <div className="mt-4 rounded-xl border border-[var(--line)] bg-white/70 p-3 text-xs text-[var(--muted)]">
          {plan?.type === "business" ? "当前为 Business，无限使用。" : `当前为 Personal，剩余试用：${plan?.trialRemaining ?? 3}`}
          <Link href="/pricing" className="ml-2 underline">
            前往升级
          </Link>
        </div>
      </section>

      <section className="card-surface rounded-2xl p-6">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="section-title text-xl font-semibold">俄语邮件结果</h3>
          <button
            type="button"
            onClick={() => navigator.clipboard.writeText(`Тема: ${mailSubject}\n\n${mailBody}`)}
            className="rounded-full border border-[var(--line)] px-3 py-1 text-xs"
          >
            复制
          </button>
        </div>

        <div className="rounded-xl border border-[var(--line)] bg-white/80 p-4">
          {busy && !mailBody ? (
            <p className="text-sm text-[var(--muted)] animate-pulse">正在生成，请稍候…</p>
          ) : (
            <>
              <p className="text-sm font-semibold text-[var(--ink)]">Тема: {mailSubject || "(等待生成)"}</p>
              <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-[var(--ink)]">{mailBody || "生成结果会显示在这里。"}</p>
            </>
          )}
        </div>
      </section>
    </main>
  );
}
