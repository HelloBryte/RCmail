import { HistoryList } from "@/components/history-list";

export default function HistoryPage() {
  return (
    <div className="fade-up">
      <div className="mb-6">
        <h1 className="section-title text-2xl font-bold text-gray-900 sm:text-3xl">历史邮件记录</h1>
        <p className="mt-2 text-gray-500">查看并管理已生成的所有商务邮件。</p>
      </div>
      <HistoryList />
    </div>
  );
}
