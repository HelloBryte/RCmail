"use client";

import Link from "next/link";
import { type FormEvent, use, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { getComposeInputFromEmail, normalizeTone } from "@/lib/email-thread";
import { getMailTypeBySlug, isMailTypeSlug, type MailTypeSlug } from "@/lib/mail-types";
import type { Tone } from "@/lib/prompts";

type PlanInfo = {
  type: "personal" | "business";
  variant: "personal" | "monthly" | "yearly" | "lifetime";
  trialUsed: number;
  trialRemaining: number | null;
  daysRemaining: number | null;
  expiry?: string | null;
};

type SavedEmail = {
  id: string;
  userId: string;
  emailType: string;
  subject: string;
  recipient: string;
  tone: string;
  chineseInput: string;
  russianOutput: string;
  createdAt: string;
  updatedAt: string;
};

type ConversationMessage = {
  id: string;
  emailId: string;
  userId: string;
  role: "user" | "assistant";
  messageType: "initial_request" | "revision_request" | "draft";
  content: string;
  subject: string | null;
  body: string | null;
  createdAt: string;
};

type ThreadResponse = {
  email: SavedEmail;
  messages: ConversationMessage[];
};

type StreamDoneEvent = {
  type: "done";
  email: SavedEmail;
  messages: ConversationMessage[];
  plan?: PlanInfo | null;
};

type BusyMode = "load" | "generate" | "iterate" | null;

async function readSseStream(
  response: Response,
  handlers: {
    onChunk?: (delta: string) => void;
    onDone?: (event: StreamDoneEvent) => void;
    onError?: (message: string) => void;
  }
) {
  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error("未收到模型输出流");
  }

  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";

    for (const line of lines) {
      if (!line.startsWith("data:")) continue;
      const jsonStr = line.slice(5).trim();
      if (!jsonStr) continue;

      const event = JSON.parse(jsonStr) as
        | { type: "chunk"; delta: string }
        | { type: "done"; email: SavedEmail; messages: ConversationMessage[]; plan?: PlanInfo | null }
        | { type: "error"; message?: string };

      if (event.type === "chunk") {
        handlers.onChunk?.(event.delta);
        continue;
      }

      if (event.type === "done") {
        handlers.onDone?.(event);
        continue;
      }

      const message = event.message ?? "请求失败";
      handlers.onError?.(message);
      throw new Error(message);
    }
  }
}

function formatMessageTime(value: string) {
  return new Date(value).toLocaleString("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function ComposePage({ params }: { params: Promise<{ mailType: string }> }) {
  const { mailType } = use(params);
  const router = useRouter();
  const searchParams = useSearchParams();
  const existingEmailId = searchParams.get("emailId");

  const [recipient, setRecipient] = useState("");
  const [purpose, setPurpose] = useState("");
  const [details, setDetails] = useState("");
  const [tone, setTone] = useState<Tone>("formal");
  const [busyMode, setBusyMode] = useState<BusyMode>(null);
  const [error, setError] = useState("");
  const [mailSubject, setMailSubject] = useState("");
  const [mailBody, setMailBody] = useState("");
  const [streamingBody, setStreamingBody] = useState("");
  const [emailId, setEmailId] = useState<string | null>(existingEmailId);
  const [loadedThreadId, setLoadedThreadId] = useState<string | null>(null);
  const [conversation, setConversation] = useState<ConversationMessage[]>([]);
  const [iterationInstruction, setIterationInstruction] = useState("");
  const [plan, setPlan] = useState<PlanInfo | null>(null);
  const [planLoading, setPlanLoading] = useState(true);

  const type = useMemo(() => (isMailTypeSlug(mailType) ? (mailType as MailTypeSlug) : null), [mailType]);
  const typeInfo = type ? getMailTypeBySlug(type) : null;
  const displayBody = streamingBody || mailBody;
  const isLoadingThread = busyMode === "load";
  const isGenerating = busyMode === "generate";
  const isIterating = busyMode === "iterate";

  useEffect(() => {
    fetch("/api/account/plan")
      .then((response) => response.json())
      .then((data: PlanInfo) => setPlan(data))
      .catch(() => {})
      .finally(() => setPlanLoading(false));
  }, []);

  useEffect(() => {
    if (!existingEmailId || !type || loadedThreadId === existingEmailId) {
      return;
    }

    let cancelled = false;
    setBusyMode("load");
    setError("");

    fetch(`/api/emails/${existingEmailId}`)
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(response.status === 404 ? "未找到对应历史邮件" : "加载历史邮件失败");
        }

        const data = (await response.json()) as ThreadResponse;
        if (cancelled) return;

        if (data.email.emailType !== type) {
          throw new Error("当前历史邮件与所选模板类型不匹配");
        }

        const input = getComposeInputFromEmail({
          recipient: data.email.recipient,
          tone: data.email.tone,
          chineseInput: data.email.chineseInput,
        });

        setRecipient(input.recipient);
        setPurpose(input.purpose);
        setDetails(input.details);
        setTone(normalizeTone(data.email.tone));
        setMailSubject(data.email.subject);
        setMailBody(data.email.russianOutput);
        setStreamingBody("");
        setEmailId(data.email.id);
        setConversation(data.messages);
        setIterationInstruction("");
        setLoadedThreadId(data.email.id);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "加载历史邮件失败");
        }
      })
      .finally(() => {
        if (!cancelled) {
          setBusyMode((current) => (current === "load" ? null : current));
        }
      });

    return () => {
      cancelled = true;
    };
  }, [existingEmailId, loadedThreadId, type]);

  if (!type || !typeInfo) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <p className="text-sm text-gray-500">无效的邮件类型。</p>
        <Link href="/dashboard" className="mt-3 inline-flex rounded-lg border border-gray-300 px-4 py-2 text-sm hover:bg-gray-50">
          返回模板列表
        </Link>
      </div>
    );
  }

  async function handleGenerate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusyMode("generate");
    setError("");
    setMailSubject("");
    setMailBody("");
    setStreamingBody("");
    setConversation([]);
    setIterationInstruction("");

    try {
      const response = await fetch("/api/generate-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mailType: type,
          recipient,
          purpose,
          details,
          tone,
        }),
      });

      if (response.status === 402) {
        const data = (await response.json()) as { message?: string };
        setError(data.message ?? "试用次数已用完，请升级 Business。");
        return;
      }

      if (response.status === 401) {
        throw new Error("登录已过期，请刷新页面后重新登录");
      }

      if (!response.ok) {
        const message = await response.text().catch(() => "");
        throw new Error(`生成失败 (${response.status})${message ? `：${message.slice(0, 120)}` : ""}`);
      }

      await readSseStream(response, {
        onChunk: (delta) => setStreamingBody((current) => current + delta),
        onDone: (event) => {
          setMailSubject(event.email.subject);
          setMailBody(event.email.russianOutput);
          setStreamingBody("");
          setConversation(event.messages ?? []);
          setEmailId(event.email.id);
          setLoadedThreadId(event.email.id);
          setPlan(event.plan ?? null);
          router.replace(`/compose/${type}?emailId=${event.email.id}`, { scroll: false });
        },
        onError: (message) => setError(message),
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "请求失败");
    } finally {
      setStreamingBody("");
      setBusyMode(null);
    }
  }

  async function handleIterate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const instruction = iterationInstruction.trim();
    if (!instruction || !emailId) {
      return;
    }

    const optimisticId = `pending-${Date.now()}`;
    const optimisticMessage: ConversationMessage = {
      id: optimisticId,
      emailId,
      userId: "current-user",
      role: "user",
      messageType: "revision_request",
      content: instruction,
      subject: null,
      body: null,
      createdAt: new Date().toISOString(),
    };

    setBusyMode("iterate");
    setError("");
    setStreamingBody("");
    setConversation((current) => [...current, optimisticMessage]);

    try {
      const response = await fetch(`/api/emails/${emailId}/iterate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ instruction }),
      });

      if (response.status === 402) {
        const data = (await response.json()) as { message?: string };
        setError(data.message ?? "试用次数已用完，请升级 Business。");
        setConversation((current) => current.filter((message) => message.id !== optimisticId));
        return;
      }

      if (response.status === 401) {
        throw new Error("登录已过期，请刷新页面后重新登录");
      }

      if (!response.ok) {
        const message = await response.text().catch(() => "");
        throw new Error(`优化失败 (${response.status})${message ? `：${message.slice(0, 120)}` : ""}`);
      }

      await readSseStream(response, {
        onChunk: (delta) => setStreamingBody((current) => current + delta),
        onDone: (event) => {
          setMailSubject(event.email.subject);
          setMailBody(event.email.russianOutput);
          setStreamingBody("");
          setConversation((current) => [
            ...current.filter((message) => message.id !== optimisticId),
            ...(event.messages ?? []),
          ]);
          setIterationInstruction("");
          setPlan(event.plan ?? null);
          setLoadedThreadId(event.email.id);
        },
        onError: (message) => setError(message),
      });
    } catch (err) {
      setConversation((current) => current.filter((message) => message.id !== optimisticId));
      setError(err instanceof Error ? err.message : "请求失败");
    } finally {
      setStreamingBody("");
      setBusyMode(null);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1.05fr_1fr]">
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-widest text-gray-400">模板写作</p>
            <h2 className="section-title mt-2 text-2xl font-bold text-gray-900">{typeInfo.title}</h2>
            <p className="mt-2 text-sm text-gray-500">{typeInfo.summary}</p>
          </div>
          {emailId && (
            <div className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700">
              已进入多轮优化线程
            </div>
          )}
        </div>

        {existingEmailId && !error && (
          <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            已载入历史邮件，你可以直接继续让 AI 基于当前版本迭代优化。
          </div>
        )}

        <form onSubmit={handleGenerate} className="mt-6 space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-gray-700">收件人 / 公司</label>
            <input
              value={recipient}
              onChange={(event) => setRecipient(event.target.value)}
              placeholder="例如：ООО ТехПром"
              className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              required
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-gray-700">沟通目的</label>
            <input
              value={purpose}
              onChange={(event) => setPurpose(event.target.value)}
              placeholder="例如：邀请客户参加 5 月莫斯科展会"
              className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              required
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-gray-700">补充要点（可选）</label>
            <textarea
              value={details}
              onChange={(event) => setDetails(event.target.value)}
              placeholder="例如：报价有效期 10 天、附件含产品目录、希望 3 月底前确认。"
              className="min-h-28 w-full rounded-lg border border-gray-300 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-gray-700">语气风格</label>
            <select
              value={tone}
              onChange={(event) => setTone(event.target.value as Tone)}
              className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            >
              <option value="formal">专业正式</option>
              <option value="friendly">友好合作</option>
              <option value="firm">礼貌坚定</option>
            </select>
          </div>

          <button
            type="submit"
            disabled={isGenerating || isIterating || isLoadingThread}
            className="rounded-lg bg-blue-700 px-6 py-3 text-sm font-semibold text-white transition hover:bg-blue-800 disabled:opacity-70"
          >
            {isGenerating ? "生成中..." : emailId ? "根据当前表单重新生成新版本" : "生成俄语商务邮件"}
          </button>
        </form>

        {error && (
          <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
            {error}
            {error.includes("试用") && (
              <Link href="/pricing" className="ml-2 font-semibold underline">
                去升级套餐
              </Link>
            )}
          </div>
        )}

        <div className="mt-4 rounded-lg border border-blue-100 bg-blue-50 px-4 py-3 text-xs text-blue-900">
          {planLoading ? (
            <span className="text-gray-400">套餐加载中…</span>
          ) : plan?.type === "business" ? (
            plan.variant === "monthly" && plan.daysRemaining !== null
              ? `当前为 Business 月卡，还剩 ${plan.daysRemaining} 天。`
              : plan.variant === "yearly" && plan.daysRemaining !== null
                ? `当前为 Business 年卡，还剩 ${plan.daysRemaining} 天。`
                : plan.variant === "lifetime"
                  ? "当前为 Business 永久卡，无限使用。"
                  : "当前为 Business 会员，无限使用。"
          ) : (
            `当前为 Personal 套餐，剩余试用：${plan?.trialRemaining ?? 5} 次`
          )}
          <Link href="/pricing" className="ml-2 font-semibold underline">
            查看套餐
          </Link>
        </div>
      </div>

      <div className="space-y-6">
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="section-title text-xl font-bold text-gray-900">俄语邮件结果</h3>
              <p className="mt-1 text-sm text-gray-500">生成后可直接在下方继续用自然语言让 AI 修改当前版本。</p>
            </div>
            <button
              type="button"
              disabled={!mailBody && !streamingBody}
              onClick={() => navigator.clipboard.writeText(`Тема: ${mailSubject}\n\n${displayBody}`)}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              复制俄语邮件
            </button>
          </div>

          <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
            {isLoadingThread ? (
              <p className="animate-pulse text-sm text-gray-400">正在加载历史线程…</p>
            ) : isGenerating && !displayBody ? (
              <p className="animate-pulse text-sm text-gray-400">正在生成，请稍候…</p>
            ) : (
              <>
                {isIterating && (
                  <div className="mb-3 inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">
                    AI 正在基于当前版本继续优化
                  </div>
                )}
                <p className="text-sm font-semibold text-gray-800">Тема: {mailSubject || "(等待生成)"}</p>
                <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-gray-700">{displayBody || "生成结果会显示在这里。"}</p>
              </>
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="section-title text-xl font-bold text-gray-900">AI 迭代记录</h3>
              <p className="mt-1 text-sm text-gray-500">系统会保留本次邮件的上下文，你的下一轮指令会基于当前最新稿继续处理。</p>
            </div>
            <div className="rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-xs text-gray-500">
              {conversation.length > 0 ? `已记录 ${conversation.length} 条消息` : "尚未开始会话"}
            </div>
          </div>

          {conversation.length === 0 ? (
            <div className="mt-5 rounded-xl border border-dashed border-gray-300 px-4 py-8 text-center text-sm text-gray-500">
              先生成一封邮件，随后即可围绕当前内容进行多轮 AI 对话式优化。
            </div>
          ) : (
            <div className="mt-5 space-y-3">
              {conversation.map((message) => (
                <article
                  key={message.id}
                  className={message.role === "assistant" ? "rounded-2xl border border-blue-100 bg-blue-50/60 p-4" : "rounded-2xl border border-gray-200 bg-white p-4"}
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className={`text-xs font-semibold uppercase tracking-[0.16em] ${message.role === "assistant" ? "text-blue-700" : "text-gray-500"}`}>
                      {message.role === "assistant" ? "AI 草稿" : message.messageType === "initial_request" ? "初始需求" : "优化指令"}
                    </span>
                    <span className="text-xs text-gray-400">{formatMessageTime(message.createdAt)}</span>
                  </div>
                  {message.role === "assistant" ? (
                    <div className="mt-3 rounded-xl border border-white/70 bg-white p-4 text-sm leading-7 text-gray-700">
                      <p className="font-semibold text-gray-800">Тема: {message.subject || "(без темы)"}</p>
                      <p className="mt-3 whitespace-pre-wrap">{message.body || message.content}</p>
                    </div>
                  ) : (
                    <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-gray-700">{message.content}</p>
                  )}
                </article>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-emerald-200 bg-[linear-gradient(180deg,rgba(236,253,245,0.95),rgba(255,255,255,0.96))] p-6 shadow-sm sm:p-8">
          <div>
            <p className="text-xs uppercase tracking-[0.16em] text-emerald-600">继续优化</p>
            <h3 className="section-title mt-2 text-xl font-bold text-gray-900">让 AI 基于当前邮件继续迭代</h3>
            <p className="mt-2 text-sm text-gray-600">例如：语气更坚定一些、补充付款截止日期、精简到 3 段、加一句邀请对方本周回复。</p>
          </div>

          <form onSubmit={handleIterate} className="mt-5 space-y-4">
            <textarea
              value={iterationInstruction}
              onChange={(event) => setIterationInstruction(event.target.value)}
              placeholder={emailId ? "输入你希望 AI 如何调整当前邮件内容" : "先生成或打开一封历史邮件后，才能继续多轮优化"}
              disabled={!emailId || isGenerating || isLoadingThread}
              className="min-h-32 w-full rounded-xl border border-emerald-200 bg-white px-4 py-3 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-emerald-400 disabled:cursor-not-allowed disabled:bg-gray-50"
            />
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-xs text-emerald-700">
                {emailId ? "每一轮优化都会基于当前线程上下文继续生成完整邮件。" : "生成首版邮件后，这里会自动开启上下文多轮优化。"}
              </p>
              <button
                type="submit"
                disabled={!emailId || !iterationInstruction.trim() || isGenerating || isIterating || isLoadingThread}
                className="rounded-lg bg-emerald-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isIterating ? "优化中..." : "继续用 AI 优化当前邮件"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
