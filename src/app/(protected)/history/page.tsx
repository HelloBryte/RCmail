import { HistoryList } from "@/components/history-list";

export default function HistoryPage() {
  return (
    <div className="fade-up">
      <div className="mb-6">
        <h1 className="section-title text-2xl font-bold text-gray-900 sm:text-3xl">历史邮件记录</h1>
        <p className="mt-2 text-gray-500">查看已生成邮件，并从任意一封历史草稿继续发起多轮 AI 优化。</p>
      </div>
      <HistoryList />
    </div>
  );
}
