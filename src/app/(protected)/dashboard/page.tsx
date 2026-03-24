"use client";

import { useState } from "react";
import { ChatInterface } from "@/components/chat-interface";
import { EmailInputForm } from "@/components/email-input-form";
import { EmailPreview } from "@/components/email-preview";

export default function DashboardPage() {
  const [previewText, setPreviewText] = useState("");
  const [queuedPrompt, setQueuedPrompt] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleStructuredGenerate(prompt: string) {
    setBusy(true);
    setQueuedPrompt(prompt);
  }

  function handleQueuedPromptConsumed() {
    setBusy(false);
    setQueuedPrompt("");
  }

  return (
    <main className="grid flex-1 gap-5 lg:grid-cols-[1.12fr_1fr]">
      <section className="space-y-5">
        <EmailInputForm onGenerate={handleStructuredGenerate} busy={busy} />
        <ChatInterface
          onAssistantTextChange={setPreviewText}
          queuedPrompt={queuedPrompt}
          onQueuedPromptConsumed={handleQueuedPromptConsumed}
        />
      </section>

      <section>
        <EmailPreview content={previewText} />
      </section>
    </main>
  );
}
