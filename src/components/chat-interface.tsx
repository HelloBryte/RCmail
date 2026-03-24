"use client";

import { type ChangeEvent, type FormEvent, useEffect, useMemo, useState } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, isTextUIPart } from "ai";

type Props = {
  onAssistantTextChange: (text: string) => void;
  queuedPrompt: string;
  onQueuedPromptConsumed: () => void;
};

export function ChatInterface({ onAssistantTextChange, queuedPrompt, onQueuedPromptConsumed }: Props) {
  const { messages, sendMessage, status } = useChat({
    transport: new DefaultChatTransport({
      api: "/api/chat",
    }),
  });
  const [manualPrompt, setManualPrompt] = useState("");

  const latestAssistantText = useMemo(() => {
    const reversed = [...messages].reverse();
    const assistant = reversed.find((m) => m.role === "assistant");

    if (!assistant) return "";

    return assistant.parts
      .filter(isTextUIPart)
      .map((part) => part.text)
      .join("\n")
      .trim();
  }, [messages]);

  useEffect(() => {
    if (latestAssistantText) {
      onAssistantTextChange(latestAssistantText);
    }
  }, [latestAssistantText, onAssistantTextChange]);

  useEffect(() => {
    async function submitQueuedPrompt() {
      if (!queuedPrompt.trim()) return;
      await sendMessage({ text: queuedPrompt });
      onQueuedPromptConsumed();
    }

    void submitQueuedPrompt();
  }, [onQueuedPromptConsumed, queuedPrompt, sendMessage]);

  async function handleManualSend(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!manualPrompt.trim()) return;
    await sendMessage({ text: manualPrompt });
    setManualPrompt("");
  }

  return (
    <div className="card-surface rounded-2xl p-5 sm:p-6">
      <h3 className="section-title text-xl font-semibold">Agent 对话模式</h3>

      <div className="mt-3 max-h-80 space-y-3 overflow-y-auto rounded-2xl border border-[var(--line)] bg-white/70 p-3">
        {messages.length === 0 ? (
          <p className="text-sm text-[var(--muted)]">输入中文需求，例如：给 Ivan 写一封正式感谢信并保存草稿。</p>
        ) : (
          messages.map((message) => (
            <div
              key={message.id}
              className={`rounded-xl px-3 py-2 text-sm ${
                message.role === "user"
                  ? "ml-10 bg-[color-mix(in_oklab,var(--brand-2)_12%,white)]"
                  : "mr-10 bg-[color-mix(in_oklab,var(--brand)_10%,white)]"
              }`}
            >
              <p className="mb-1 text-xs uppercase tracking-wide text-[var(--muted)]">{message.role}</p>
              <p className="whitespace-pre-wrap text-[var(--ink)]">
                {message.parts
                  .filter(isTextUIPart)
                  .map((part) => part.text)
                  .join("\n")}
              </p>
            </div>
          ))
        )}
      </div>

      <form onSubmit={handleManualSend} className="mt-3 flex gap-2">
        <input
          value={manualPrompt}
          onChange={(e: ChangeEvent<HTMLInputElement>) => setManualPrompt(e.target.value)}
          className="flex-1 rounded-full border border-[var(--line)] bg-white/80 px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-[var(--brand-2)]"
          placeholder="输入中文指令..."
        />
        <button
          type="submit"
          disabled={status === "streaming"}
          className="rounded-full bg-[var(--brand-2)] px-4 py-2 text-sm font-semibold text-white transition hover:brightness-95 disabled:opacity-70"
        >
          发送
        </button>
      </form>
    </div>
  );
}
