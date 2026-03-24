import { auth } from "@clerk/nextjs/server";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import {
  convertToModelMessages,
  stepCountIs,
  streamText,
  type UIMessage,
} from "ai";
import { buildAgentTools } from "@/lib/agent/tools";

const openrouter = createOpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY,
});

const openRouterModel = process.env.OPENROUTER_MODEL ?? "stepfun/step-3.5-flash:free";

export const maxDuration = 60;

export async function POST(req: Request) {
  const { userId } = await auth();

  if (!userId) {
    return new Response("Unauthorized", { status: 401 });
  }

  const body = (await req.json()) as { messages?: UIMessage[] };

  if (!body.messages || !Array.isArray(body.messages)) {
    return new Response("Invalid request body", { status: 400 });
  }

  const result = streamText({
    model: openrouter(openRouterModel),
    system:
      "你是中俄商务邮件专家。用户通常输入中文，请输出可直接发送的俄语邮件。必要时调用工具保存草稿、读取历史和用户偏好，输出前先保证语气准确、礼貌且符合商务语境。",
    messages: convertToModelMessages(body.messages),
    tools: buildAgentTools(userId),
    stopWhen: stepCountIs(5),
  });

  return result.toUIMessageStreamResponse();
}
