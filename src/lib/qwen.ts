import { BASE_SYSTEM_PROMPT } from "@/lib/prompts";

type Message = {
  role: "system" | "user";
  content: string;
};

type QwenResult = {
  subject: string;
  body: string;
};

function extractTextFromDashscope(payload: any): string {
  const content = payload?.output?.choices?.[0]?.message?.content;
  if (typeof content === "string") {
    // Strip Qwen3 thinking tokens <think>...</think>
    return content.replace(/<think>[\s\S]*?<\/think>/g, "").trim();
  }
  return "";
}

export function splitSubjectAndBody(text: string): QwenResult {
  const lines = text.split("\n").map((line) => line.trim()).filter(Boolean);
  const subjectLine = lines.find((line) => line.toLowerCase().startsWith("тема") || line.toLowerCase().startsWith("subject"));

  if (subjectLine) {
    const subject = subjectLine.replace(/^тема\s*[:：-]?\s*/i, "").replace(/^subject\s*[:：-]?\s*/i, "").trim();
    const body = lines.filter((line) => line !== subjectLine).join("\n").trim();
    return { subject: subject || "(без темы)", body };
  }

  return {
    subject: "(без темы)",
    body: text.trim(),
  };
}

export async function streamBusinessMailFromQwen(userPrompt: string): Promise<ReadableStream<string>> {
  const apiKey = process.env.DASHSCOPE_API_KEY;
  if (!apiKey) throw new Error("DASHSCOPE_API_KEY is required");

  const model = process.env.QWEN_MODEL ?? "qwen3-8b";
  const messages: Message[] = [
    { role: "system", content: BASE_SYSTEM_PROMPT },
    { role: "user", content: userPrompt },
  ];

  const response = await fetch("https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
      Accept: "text/event-stream",
      "X-DashScope-SSE": "enable",
    },
    body: JSON.stringify({
      model,
      input: { messages },
      parameters: { result_format: "message", enable_thinking: false, incremental_output: true },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Qwen request failed: ${errorText}`);
  }

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
            } catch { /* ignore malformed SSE events */ }
          }
        }
      } finally {
        controller.close();
        reader.releaseLock();
      }
    },
  });
}

export async function generateBusinessMailFromQwen(userPrompt: string): Promise<QwenResult> {
  const apiKey = process.env.DASHSCOPE_API_KEY;

  if (!apiKey) {
    throw new Error("DASHSCOPE_API_KEY is required");
  }

  const model = process.env.QWEN_MODEL ?? "qwen3-8b";

  const messages: Message[] = [
    { role: "system", content: BASE_SYSTEM_PROMPT },
    { role: "user", content: userPrompt },
  ];

  const response = await fetch("https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      input: { messages },
      parameters: { result_format: "message", enable_thinking: false },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Qwen request failed: ${errorText}`);
  }

  const payload = await response.json();
  const text = extractTextFromDashscope(payload);

  if (!text) {
    throw new Error("Qwen returned empty content");
  }

  return splitSubjectAndBody(text);
}
