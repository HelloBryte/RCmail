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

type UserPlan = {
  userId: string;
  email: string;
  planType: string;
  planVariant: string;
  planExpiry: string | null;
  trialUsed: number;
  updatedAt: string;
};

function PlanBadge({ plan }: { plan: UserPlan }) {
  if (plan.planType === "business" && plan.planVariant === "yearly") {
    return <span className="rounded-full bg-purple-100 px-2 py-0.5 text-xs font-semibold text-purple-700">年卡</span>;
  }
  if (plan.planType === "business" && plan.planVariant === "monthly") {
    const expiry = plan.planExpiry ? new Date(plan.planExpiry) : null;
    const days = expiry ? Math.max(0, Math.ceil((expiry.getTime() - Date.now()) / 86400000)) : 0;
    return <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-semibold text-blue-700">月卡 剩{days}天</span>;
  }
  return <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-semibold text-gray-500">免费</span>;
}

export default function AdminPage() {
  const [data, setData] = useState<MetricsData | null>(null);
  const [users, setUsers] = useState<UserPlan[]>([]);
  const [error, setError] = useState("");
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    async function load() {
      const [metricsRes, usersRes] = await Promise.all([
        fetch("/api/admin/metrics"),
        fetch("/api/admin/users"),
      ]);
      if (!metricsRes.ok) {
        setError("你没有管理员权限，或 ADMIN_EMAILS 尚未配置。");
        return;
      }
      setData(await metricsRes.json());
      if (usersRes.ok) setUsers(await usersRes.json());
    }
    void load();
  }, []);

  async function handleAction(userId: string, action: "grant_monthly" | "grant_yearly" | "revoke") {
    setActionLoading(userId + action);
    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetUserId: userId, action }),
      });
      if (res.ok) {
        const updated = await res.json() as UserPlan;
        setUsers((prev) => prev.map((u) => u.userId === userId ? updated : u));
      } else {
        alert(`操作失败 (${res.status})`);
      }
    } catch {
      alert("网络错误，请重试");
    } finally {
      setActionLoading(null);
    }
  }

  if (error) {
    return <main className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-600">{error}</main>;
  }

  if (!data) {
    return <main className="rounded-2xl border border-gray-200 bg-white p-6 text-sm text-gray-400">加载监控数据中...</main>;
  }

  const cards = [
    ["总事件数", data.cards.eventsTotal],
    ["24h事件", data.cards.events24h],
    ["用户总数", data.cards.usersTotal],
    ["Business用户", data.cards.businessUsers],
    ["已生成邮件", data.cards.generatedMails],
    ["平均耗时(ms)", data.cards.avgLatencyMs],
  ] as const;

  const filteredUsers = users.filter((u) =>
    u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.userId.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <main className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">后台监控</h2>

      {/* 数据概览 */}
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map(([label, value]) => (
          <article key={label} className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
            <p className="text-xs text-gray-400">{label}</p>
            <p className="mt-2 text-2xl font-bold text-gray-900">{value}</p>
          </article>
        ))}
      </section>

      {/* 用户管理 */}
      <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center justify-between gap-4">
          <h3 className="text-lg font-bold text-gray-900">用户管理 ({users.length})</h3>
          <input
            type="text"
            placeholder="搜索邮箱或 User ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-64 rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-left text-xs text-gray-400">
                <th className="pb-2 pr-4 font-medium">邮箱</th>
                <th className="pb-2 pr-4 font-medium">User ID</th>
                <th className="pb-2 pr-4 font-medium">套餐状态</th>
                <th className="pb-2 pr-4 font-medium">试用次数</th>
                <th className="pb-2 pr-4 font-medium">到期时间</th>
                <th className="pb-2 font-medium">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredUsers.map((u) => (
                <tr key={u.userId} className="hover:bg-gray-50">
                  <td className="py-2.5 pr-4 text-sm text-gray-800">{u.email || <span className="text-gray-400">—</span>}</td>
                  <td className="py-2.5 pr-4 font-mono text-xs text-gray-400">{u.userId.slice(0, 16)}…</td>
                  <td className="py-2.5 pr-4"><PlanBadge plan={u} /></td>
                  <td className="py-2.5 pr-4 text-gray-600">{u.trialUsed}</td>
                  <td className="py-2.5 pr-4 text-xs text-gray-400">
                    {u.planExpiry ? new Date(u.planExpiry).toLocaleDateString("zh-CN") : "—"}
                  </td>
                  <td className="py-2.5">
                    <div className="flex flex-wrap gap-1.5">
                      <button
                        onClick={() => handleAction(u.userId, "grant_monthly")}
                        disabled={actionLoading === u.userId + "grant_monthly"}
                        className="rounded-md border border-blue-200 bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700 hover:bg-blue-100 disabled:opacity-50"
                      >
                        赋予月卡
                      </button>
                      <button
                        onClick={() => handleAction(u.userId, "grant_yearly")}
                        disabled={actionLoading === u.userId + "grant_yearly"}
                        className="rounded-md border border-purple-200 bg-purple-50 px-2.5 py-1 text-xs font-medium text-purple-700 hover:bg-purple-100 disabled:opacity-50"
                      >
                        赋予年卡
                      </button>
                      {u.planType === "business" && (
                        <button
                          onClick={() => handleAction(u.userId, "revoke")}
                          disabled={actionLoading === u.userId + "revoke"}
                          className="rounded-md border border-red-200 bg-red-50 px-2.5 py-1 text-xs font-medium text-red-600 hover:bg-red-100 disabled:opacity-50"
                        >
                          吊销
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {filteredUsers.length === 0 && (
                <tr><td colSpan={5} className="py-6 text-center text-xs text-gray-400">暂无用户数据</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Top 事件 */}
      <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <h3 className="mb-3 text-lg font-bold text-gray-900">Top 事件</h3>
        <div className="space-y-2">
          {data.topEvents.map((item) => (
            <div key={item.event_name} className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2 text-sm">
              <span className="text-gray-700">{item.event_name}</span>
              <span className="font-semibold text-gray-900">{item.count}</span>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
