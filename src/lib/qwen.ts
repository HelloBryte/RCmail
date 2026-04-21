import { BASE_SYSTEM_PROMPT, buildChineseTranslationPrompt, CHINESE_TRANSLATION_SYSTEM_PROMPT, type DraftContext } from "@/lib/prompts";

export type QwenMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

type QwenResult = {
  subject: string;
  body: string;
};

function withSystemPrompt(messages: QwenMessage[], systemPrompt: string) {
  if (messages[0]?.role === "system") {
    return messages;
  }

  return [{ role: "system", content: systemPrompt } satisfies QwenMessage, ...messages];
}

async function requestQwen(messages: QwenMessage[], incrementalOutput: boolean, systemPrompt = BASE_SYSTEM_PROMPT) {
  const apiKey = process.env.DASHSCOPE_API_KEY;
  if (!apiKey) throw new Error("DASHSCOPE_API_KEY is required");

  const model = process.env.QWEN_MODEL ?? "qwen3-8b";

  const response = await fetch("https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
      ...(incrementalOutput ? { Accept: "text/event-stream", "X-DashScope-SSE": "enable" } : {}),
    },
    body: JSON.stringify({
      model,
      input: { messages: withSystemPrompt(messages, systemPrompt) },
      parameters: { result_format: "message", enable_thinking: false, incremental_output: incrementalOutput },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Qwen request failed: ${errorText}`);
  }

  return response;
}

export function splitSubjectAndBody(text: string): QwenResult {
  const lines = text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  const subjectLine = lines.find((line) => {
    const normalized = line.toLowerCase();
    return normalized.startsWith("тема") || normalized.startsWith("subject") || line.startsWith("主题");
  });

  if (subjectLine) {
    const subject = subjectLine
      .replace(/^тема\s*[:：-]?\s*/i, "")
      .replace(/^subject\s*[:：-]?\s*/i, "")
      .replace(/^主题\s*[:：-]?\s*/i, "")
      .trim();
    const body = lines.filter((line) => line !== subjectLine).join("\n").trim();
    return { subject: subject || "(без темы)", body };
  }

  return {
    subject: "(без темы)",
    body: text.trim(),
  };
}

export async function streamChatCompletionFromQwen(messages: QwenMessage[], systemPrompt = BASE_SYSTEM_PROMPT): Promise<ReadableStream<string>> {
  const response = await requestQwen(messages, true, systemPrompt);
  const decoder = new TextDecoder();
  let sseBuffer = "";

  return new ReadableStream<string>({
    async start(controller) {
      const reader = response.body!.getReader();
      try {
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          sseBuffer += decoder.decode(value, { stream: true });
          const lines = sseBuffer.split("\n");
          sseBuffer = lines.pop() ?? "";
          for (const line of lines) {
            if (!line.startsWith("data:")) continue;
            const json = line.slice(5).trim();
            if (!json || json === "[DONE]") continue;
            try {
              const payload = JSON.parse(json);
              const delta: string = payload?.output?.choices?.[0]?.message?.content ?? "";
              if (delta) {
                const clean = delta.replace(/<think>[\s\S]*?<\/think>/g, "");
                if (clean) controller.enqueue(clean);
              }
            } catch {
              // Ignore malformed SSE payloads from the upstream model.
            }
          }
        }
      } finally {
        controller.close();
        reader.releaseLock();
      }
    },
  });
}

export async function generateChatCompletionFromQwen(messages: QwenMessage[], systemPrompt = BASE_SYSTEM_PROMPT): Promise<QwenResult> {
  const response = await requestQwen(messages, false, systemPrompt);
  const payload = await response.json();
  const raw: string = payload?.output?.choices?.[0]?.message?.content ?? "";
  const text = raw.replace(/<think>[\s\S]*?<\/think>/g, "").trim();

  if (!text) {
    throw new Error("Qwen returned empty content");
  }

  return splitSubjectAndBody(text);
}

export async function streamBusinessMailFromQwen(userPrompt: string): Promise<ReadableStream<string>> {
  return streamChatCompletionFromQwen([{ role: "user", content: userPrompt }]);
}

export async function generateBusinessMailFromQwen(userPrompt: string): Promise<QwenResult> {
  return generateChatCompletionFromQwen([{ role: "user", content: userPrompt }]);
}

export async function translateBusinessMailToChinese(draft: DraftContext): Promise<QwenResult> {
  return generateChatCompletionFromQwen(
    [{ role: "user", content: buildChineseTranslationPrompt(draft) }],
    CHINESE_TRANSLATION_SYSTEM_PROMPT
  );
}
