"use client";

import { useEffect, useState } from "react";

type HistoryItem = {
  id: string;
  emailType: string;
  subject: string;
  recipient: string;
  tone: string;
  chineseInput: string;
  russianOutput: string;
  createdAt: string;
};

export function HistoryList() {
  const [items, setItems] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  async function fetchHistory() {
    setLoading(true);
    const res = await fetch("/api/emails");
    if (res.ok) {
      const data = (await res.json()) as HistoryItem[];
      setItems(data);
    }
    setLoading(false);
  }

  async function removeItem(id: string) {
    const res = await fetch("/api/emails", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });

    if (res.ok) {
      setItems((prev) => prev.filter((item) => item.id !== id));
    }
  }

  useEffect(() => {
    void fetchHistory();
  }, []);

  if (loading) {
    return <p className="text-sm text-[var(--muted)]">正在加载历史记录...</p>;
  }

  if (items.length === 0) {
    return <p className="text-sm text-[var(--muted)]">暂无历史记录。</p>;
  }

  return (
    <div className="space-y-3">
      {items.map((item) => (
        <article key={item.id} className="card-surface rounded-2xl p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="section-title text-lg font-semibold">{item.subject}</h3>
            <button
              onClick={() => removeItem(item.id)}
              className="rounded-full border border-[var(--line)] px-3 py-1 text-xs font-medium text-[var(--ink)] transition hover:bg-white"
              type="button"
            >
              删除
            </button>
          </div>
          <p className="mt-1 text-xs text-[var(--muted)]">
            类型: {item.emailType} · 收件人: {item.recipient} · 语气: {item.tone}
          </p>
          <p className="mt-3 text-sm text-[var(--muted)]">中文输入: {item.chineseInput}</p>
          <p className="mt-2 whitespace-pre-wrap rounded-xl bg-white/70 p-3 text-sm text-[var(--ink)]">
            {item.russianOutput}
          </p>
        </article>
      ))}
    </div>
  );
}
