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
    return <p className="text-sm text-gray-400">正在加载历史记录...</p>;
  }

  if (items.length === 0) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center text-gray-500">
        还没有历史记录，请先去新建邮件页生成内容。
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {items.map((item) => (
        <article key={item.id} className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="section-title text-lg font-bold text-gray-900">{item.subject}</h3>
            <button
              onClick={() => removeItem(item.id)}
              className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 transition hover:bg-red-50"
              type="button"
            >
              删除
            </button>
          </div>
          <p className="mt-1 text-xs text-gray-400">
            类型: {item.emailType} · 收件人: {item.recipient} · 语气: {item.tone}
          </p>
          <p className="mt-3 text-sm text-gray-500">中文输入: {item.chineseInput}</p>
          <pre className="mt-2 whitespace-pre-wrap rounded-lg border border-gray-100 bg-gray-50 p-4 text-sm leading-7 text-gray-700">
            {item.russianOutput}
          </pre>
        </article>
      ))}
    </div>
  );
}
