"use client";

import { type ChangeEvent, type FormEvent, useState } from "react";

type Tone = "formal" | "informal" | "business";

type Props = {
  onGenerate: (prompt: string) => Promise<void> | void;
  busy: boolean;
};

export function EmailInputForm({ onGenerate, busy }: Props) {
  const [recipient, setRecipient] = useState("");
  const [subjectHint, setSubjectHint] = useState("");
  const [tone, setTone] = useState<Tone>("business");
  const [chineseInput, setChineseInput] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const prompt = [
      "请根据以下中文信息生成一封完整的俄语邮件。",
      `收件人: ${recipient || "未提供"}`,
      `主题方向: ${subjectHint || "由你根据内容拟定"}`,
      `语气: ${tone}`,
      `中文背景: ${chineseInput}`,
      "要求: 1) 先给俄语主题 2) 再给俄语正文 3) 保持商务礼貌。",
      "生成后调用 saveEmailDraft 工具保存草稿。",
    ].join("\n");

    await onGenerate(prompt);
  }

  return (
    <form onSubmit={handleSubmit} className="card-surface rounded-2xl p-5 sm:p-6">
      <h3 className="section-title text-xl font-semibold">结构化输入</h3>

      <div className="mt-4 space-y-3">
        <label className="block">
          <span className="mb-1 block text-sm text-[var(--muted)]">收件人</span>
          <input
            value={recipient}
            onChange={(e: ChangeEvent<HTMLInputElement>) => setRecipient(e.target.value)}
            className="w-full rounded-xl border border-[var(--line)] bg-white/70 px-3 py-2 outline-none focus:ring-2 focus:ring-[var(--brand-2)]"
            placeholder="例如: Иван Петров"
          />
        </label>

        <label className="block">
          <span className="mb-1 block text-sm text-[var(--muted)]">主题提示</span>
          <input
            value={subjectHint}
            onChange={(e: ChangeEvent<HTMLInputElement>) => setSubjectHint(e.target.value)}
            className="w-full rounded-xl border border-[var(--line)] bg-white/70 px-3 py-2 outline-none focus:ring-2 focus:ring-[var(--brand-2)]"
            placeholder="例如: 合作确认与下周会议"
          />
        </label>

        <label className="block">
          <span className="mb-1 block text-sm text-[var(--muted)]">语气</span>
          <select
            value={tone}
            onChange={(e: ChangeEvent<HTMLSelectElement>) => setTone(e.target.value as Tone)}
            className="w-full rounded-xl border border-[var(--line)] bg-white/70 px-3 py-2 outline-none focus:ring-2 focus:ring-[var(--brand-2)]"
          >
            <option value="business">商务</option>
            <option value="formal">正式</option>
            <option value="informal">轻松</option>
          </select>
        </label>

        <label className="block">
          <span className="mb-1 block text-sm text-[var(--muted)]">中文信息</span>
          <textarea
            value={chineseInput}
            onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setChineseInput(e.target.value)}
            className="min-h-36 w-full rounded-xl border border-[var(--line)] bg-white/70 px-3 py-2 outline-none focus:ring-2 focus:ring-[var(--brand-2)]"
            placeholder="输入中文场景和诉求"
            required
          />
        </label>
      </div>

      <button
        type="submit"
        disabled={busy}
        className="mt-4 rounded-full bg-[var(--brand)] px-4 py-2 text-sm font-semibold text-white transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-70"
      >
        {busy ? "生成中..." : "生成俄语邮件"}
      </button>
    </form>
  );
}
