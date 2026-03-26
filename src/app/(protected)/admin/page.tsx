"use client";

import { useEffect, useState } from "react";

type MetricsData = {
  cards: {
    eventsTotal: number;
    events24h: number;
    usersTotal: number;
    businessUsers: number;
    generatedMails: number;
    avgLatencyMs: number;
  };
  topEvents: Array<{ event_name: string; count: number }>;
};

export default function AdminPage() {
  const [data, setData] = useState<MetricsData | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      const res = await fetch("/api/admin/metrics");
      if (!res.ok) {
        setError("你没有管理员权限，或 ADMIN_EMAILS 尚未配置。");
        return;
      }

      const json = (await res.json()) as MetricsData;
      setData(json);
    }

    void load();
  }, []);

  if (error) {
    return <main className="card-surface rounded-2xl p-6 text-sm text-red-600">{error}</main>;
  }

  if (!data) {
    return <main className="card-surface rounded-2xl p-6 text-sm text-[var(--muted)]">加载监控数据中...</main>;
  }

  const cards = [
    ["总事件数", data.cards.eventsTotal],
    ["24h事件", data.cards.events24h],
    ["用户总数", data.cards.usersTotal],
    ["Business用户", data.cards.businessUsers],
    ["已生成邮件", data.cards.generatedMails],
    ["平均耗时(ms)", data.cards.avgLatencyMs],
  ] as const;

  return (
    <main className="space-y-5">
      <h2 className="section-title text-2xl font-semibold">后台监控</h2>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map(([label, value]) => (
          <article key={label} className="card-surface rounded-2xl p-4">
            <p className="text-xs text-[var(--muted)]">{label}</p>
            <p className="section-title mt-2 text-2xl font-semibold">{value}</p>
          </article>
        ))}
      </section>

      <section className="card-surface rounded-2xl p-4">
        <h3 className="section-title text-lg font-semibold">Top 事件</h3>
        <div className="mt-3 space-y-2">
          {data.topEvents.map((item) => (
            <div key={item.event_name} className="flex items-center justify-between rounded-lg bg-white/70 px-3 py-2 text-sm">
              <span>{item.event_name}</span>
              <span className="font-semibold">{item.count}</span>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
