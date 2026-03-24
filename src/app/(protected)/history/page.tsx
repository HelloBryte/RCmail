import { HistoryList } from "@/components/history-list";

export default function HistoryPage() {
  return (
    <main className="fade-up flex-1">
      <h2 className="section-title mb-4 text-2xl font-semibold">历史邮件记录</h2>
      <HistoryList />
    </main>
  );
}
