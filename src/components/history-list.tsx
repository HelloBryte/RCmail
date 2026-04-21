"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { parseChineseInput } from "@/lib/email-thread";
import { getMailTypeBySlug, isMailTypeSlug } from "@/lib/mail-types";

type HistoryItem = {
  id: string;
  emailType: string;
  subject: string;
  recipient: string;
  tone: string;
  chineseInput: string;
  russianOutput: string;
  createdAt: string;
  updatedAt: string;
};

function formatDateTime(value: string) {
  return new Date(value).toLocaleString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function HistoryList() {
  const [items, setItems] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  async function removeItem(id: string) {
    const response = await fetch("/api/emails", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });

    if (response.ok) {
      setItems((current) => current.filter((item) => item.id !== id));
    }
  }

  useEffect(() => {
    let cancelled = false;

    fetch("/api/emails")
      .then(async (response) => {
        if (!response.ok || cancelled) {
          return;
        }

        const data = (await response.json()) as HistoryItem[];
        if (!cancelled) {
          setItems(data);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
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
      {items.map((item) => {
        const title = isMailTypeSlug(item.emailType) ? getMailTypeBySlug(item.emailType).title : item.emailType;
        const parsedInput = parseChineseInput(item.chineseInput);
        return (
          <article key={item.id} className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="section-title text-lg font-bold text-gray-900">{item.subject}</h3>
                <p className="mt-1 text-xs text-gray-400">
                  模板: {title} · 收件人: {item.recipient} · 语气: {item.tone}
                </p>
                <p className="mt-1 text-xs text-gray-400">最近更新: {formatDateTime(item.updatedAt || item.createdAt)}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Link
                  href={`/compose/${item.emailType}?emailId=${item.id}`}
                  className="rounded-lg border border-blue-200 px-3 py-1.5 text-xs font-medium text-blue-700 transition hover:bg-blue-50"
                >
                  继续迭代
                </Link>
                <button
                  onClick={() => removeItem(item.id)}
                  className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 transition hover:bg-red-50"
                  type="button"
                >
                  删除
                </button>
              </div>
            </div>
            <div className="mt-3 space-y-2 text-sm text-gray-500">
              <p>沟通目的: {parsedInput.purpose || "未记录"}</p>
              <p>补充要点: {parsedInput.details || "无"}</p>
            </div>
            <div className="mt-3 grid gap-3 xl:grid-cols-2">
              <pre className="whitespace-pre-wrap rounded-lg border border-gray-100 bg-gray-50 p-4 text-sm leading-7 text-gray-700">
                {item.russianOutput}
              </pre>
              <pre className="whitespace-pre-wrap rounded-lg border border-emerald-100 bg-emerald-50/60 p-4 text-sm leading-7 text-gray-700">
                {parsedInput.translation
                  ? `主题: ${parsedInput.translation.subject || "（无主题）"}\n\n${parsedInput.translation.body || "（正文为空）"}`
                  : "暂无中文版。重新生成或继续优化并采纳后，这里会显示中文翻译。"}
              </pre>
            </div>
          </article>
        );
      })}
    </div>
  );
}
