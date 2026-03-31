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

function splitSubjectAndBody(text: string): QwenResult {
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

export async function generateBusinessMailFromQwen(userPrompt: string): Promise<QwenResult> {
  const apiKey = process.env.DASHSCOPE_API_KEY;

  if (!apiKey) {
    throw new Error("DASHSCOPE_API_KEY is required");
  }

  const model = process.env.QWEN_MODEL ?? "qwen3.5-flash";

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
