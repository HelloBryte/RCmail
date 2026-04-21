"use client";

import Link from "next/link";
import { type FormEvent, use, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { EmailDiffView } from "@/components/email-diff-view";
import { formatChineseDraftContent, formatDraftContent, getComposeInputFromEmail, normalizeTone, parseChineseInput } from "@/lib/email-thread";
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
  translatedSubject?: string | null;
  translatedBody?: string | null;
  createdAt: string;
};

type ThreadResponse = {
  email: SavedEmail;
  messages: ConversationMessage[];
};

type EmailDraft = {
  subject: string;
  body: string;
  translatedSubject?: string | null;
  translatedBody?: string | null;
};

type PendingRound = {
  id: string;
  before: EmailDraft;
  after: EmailDraft;
  userMessage: ConversationMessage;
  assistantMessage: ConversationMessage;
};

type LocalComposeSnapshot = {
  version: 1;
  mailType: string;
  emailId: string | null;
  recipient: string;
  purpose: string;
  details: string;
  tone: Tone;
  acceptedDraft: EmailDraft;
  conversation: ConversationMessage[];
  pendingRounds: PendingRound[];
  iterationInstruction: string;
  savedAt: string;
};

type GenerateDoneEvent = {
  type: "done";
  email: SavedEmail;
  messages: ConversationMessage[];
  plan?: PlanInfo | null;
};

type IterateDoneEvent = {
  type: "done";
  draft: EmailDraft;
  plan?: PlanInfo | null;
};

type StreamDoneEvent = GenerateDoneEvent | IterateDoneEvent;

type BusyMode = "load" | "generate" | "iterate" | "accept" | null;

type LoadingIteration = {
  instruction: string;
  before: EmailDraft;
  startedAt: string;
};

type TimelineItem = {
  message: ConversationMessage;
  pending: boolean;
};

function buildDraftStorageKey(mailType: string) {
  return `rcmail-compose:${mailType}:draft`;
}

function buildThreadStorageKey(mailType: string, emailId: string) {
  return `rcmail-compose:${mailType}:${emailId}`;
}

function createEmptyDraft(): EmailDraft {
  return { subject: "", body: "", translatedSubject: null, translatedBody: null };
}

function getDraftFromEmail(email: Pick<SavedEmail, "subject" | "russianOutput" | "chineseInput">): EmailDraft {
  const translation = parseChineseInput(email.chineseInput).translation;

  return {
    subject: email.subject,
    body: email.russianOutput,
    translatedSubject: translation?.subject ?? null,
    translatedBody: translation?.body ?? null,
  };
}

function hasChineseTranslation(draft: EmailDraft) {
  return Boolean(draft.translatedSubject?.trim() || draft.translatedBody?.trim());
}

function createLocalMessage(params: {
  emailId: string;
  role: ConversationMessage["role"];
  messageType: ConversationMessage["messageType"];
  content: string;
  subject?: string | null;
  body?: string | null;
  translatedSubject?: string | null;
  translatedBody?: string | null;
  createdAt: string;
}) {
  return {
    id: `local-${params.role}-${crypto.randomUUID()}`,
    emailId: params.emailId,
    userId: "current-user",
    role: params.role,
    messageType: params.messageType,
    content: params.content,
    subject: params.subject ?? null,
    body: params.body ?? null,
    translatedSubject: params.translatedSubject ?? null,
    translatedBody: params.translatedBody ?? null,
    createdAt: params.createdAt,
  } satisfies ConversationMessage;
}

function getActiveDraft(acceptedDraft: EmailDraft, pendingRounds: PendingRound[]) {
  return pendingRounds.at(-1)?.after ?? acceptedDraft;
}

function buildTimelineItems(messages: ConversationMessage[], pendingRounds: PendingRound[]) {
  return [
    ...messages.map((message) => ({ message, pending: false } satisfies TimelineItem)),
    ...pendingRounds.flatMap((round) => [
      { message: round.userMessage, pending: true } satisfies TimelineItem,
      { message: round.assistantMessage, pending: true } satisfies TimelineItem,
    ]),
  ];
}

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
        | GenerateDoneEvent
        | IterateDoneEvent
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
  const iterationInputRef = useRef<HTMLTextAreaElement | null>(null);
  const latestEmailIdRef = useRef<string | null>(existingEmailId);
  const [recipient, setRecipient] = useState("");
  const [purpose, setPurpose] = useState("");
  const [details, setDetails] = useState("");
  const [tone, setTone] = useState<Tone>("formal");
  const [busyMode, setBusyMode] = useState<BusyMode>(null);
  const [error, setError] = useState("");
  const [acceptedDraft, setAcceptedDraft] = useState<EmailDraft>(createEmptyDraft);
  const [streamingBody, setStreamingBody] = useState("");
  const [emailId, setEmailId] = useState<string | null>(existingEmailId);
  const [loadedThreadId, setLoadedThreadId] = useState<string | null>(null);
  const [conversation, setConversation] = useState<ConversationMessage[]>([]);
  const [pendingRounds, setPendingRounds] = useState<PendingRound[]>([]);
  const [iterationInstruction, setIterationInstruction] = useState("");
  const [plan, setPlan] = useState<PlanInfo | null>(null);
  const [planLoading, setPlanLoading] = useState(true);
  const [loadingIteration, setLoadingIteration] = useState<LoadingIteration | null>(null);
  const [localNotice, setLocalNotice] = useState("");
  const [restoreChecked, setRestoreChecked] = useState(false);

  const type = useMemo(() => (isMailTypeSlug(mailType) ? (mailType as MailTypeSlug) : null), [mailType]);
  const typeInfo = type ? getMailTypeBySlug(type) : null;
  const isLoadingThread = busyMode === "load";
  const isGenerating = busyMode === "generate";
  const isIterating = busyMode === "iterate";
  const isAccepting = busyMode === "accept";
  const activeDraft = useMemo(() => getActiveDraft(acceptedDraft, pendingRounds), [acceptedDraft, pendingRounds]);
  const timelineItems = useMemo(() => buildTimelineItems(conversation, pendingRounds), [conversation, pendingRounds]);
  const latestPendingRound = pendingRounds.at(-1) ?? null;
  const displayBody = streamingBody || activeDraft.body;
  const displaySubject = isGenerating && streamingBody ? "(生成中...)" : activeDraft.subject;
  const displayTranslatedSubject = isGenerating ? "" : activeDraft.translatedSubject ?? "";
  const displayTranslatedBody = isGenerating ? "" : activeDraft.translatedBody ?? "";
  const canCopyChineseDraft = !isGenerating && hasChineseTranslation(activeDraft);
  const canIterate = Boolean(emailId && activeDraft.body.trim());

  useEffect(() => {
    latestEmailIdRef.current = emailId;
  }, [emailId]);

  useEffect(() => {
    fetch("/api/account/plan")
      .then((response) => response.json())
      .then((data: PlanInfo) => setPlan(data))
      .catch(() => {})
      .finally(() => setPlanLoading(false));
  }, []);

  useEffect(() => {
    if (!type || restoreChecked) {
      return;
    }

    try {
      const preferredKey = existingEmailId ? buildThreadStorageKey(type, existingEmailId) : buildDraftStorageKey(type);
      const raw = window.localStorage.getItem(preferredKey);

      if (!raw) {
        setRestoreChecked(true);
        return;
      }

      const snapshot = JSON.parse(raw) as Partial<LocalComposeSnapshot>;
      if (snapshot.version !== 1 || snapshot.mailType !== type) {
        setRestoreChecked(true);
        return;
      }

      setRecipient(typeof snapshot.recipient === "string" ? snapshot.recipient : "");
      setPurpose(typeof snapshot.purpose === "string" ? snapshot.purpose : "");
      setDetails(typeof snapshot.details === "string" ? snapshot.details : "");
      setTone(snapshot.tone === "friendly" || snapshot.tone === "firm" ? snapshot.tone : "formal");
      setAcceptedDraft(snapshot.acceptedDraft ?? createEmptyDraft());
      setConversation(Array.isArray(snapshot.conversation) ? snapshot.conversation : []);
      setPendingRounds(Array.isArray(snapshot.pendingRounds) ? snapshot.pendingRounds : []);
      setIterationInstruction(typeof snapshot.iterationInstruction === "string" ? snapshot.iterationInstruction : "");
      setEmailId(typeof snapshot.emailId === "string" ? snapshot.emailId : existingEmailId);
      setLocalNotice(
        Array.isArray(snapshot.pendingRounds) && snapshot.pendingRounds.length > 0
          ? "已恢复本地暂存的优化对话，你可以继续采纳、放弃或追问。"
          : "已恢复上次编辑的邮件内容。"
      );
    } catch {
      // Ignore malformed local snapshots.
    } finally {
      setRestoreChecked(true);
    }
  }, [existingEmailId, restoreChecked, type]);

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

        const shouldPreservePending = latestEmailIdRef.current === data.email.id;

        setRecipient(input.recipient);
        setPurpose(input.purpose);
        setDetails(input.details);
        setTone(normalizeTone(data.email.tone));
        setAcceptedDraft(getDraftFromEmail(data.email));
        setStreamingBody("");
        setEmailId(data.email.id);
        setConversation(data.messages);
        setPendingRounds((current) => (shouldPreservePending ? current : []));
        setIterationInstruction((current) => (shouldPreservePending ? current : ""));
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

  useEffect(() => {
    if (!type || !restoreChecked) {
      return;
    }

    const snapshot: LocalComposeSnapshot = {
      version: 1,
      mailType: type,
      emailId,
      recipient,
      purpose,
      details,
      tone,
      acceptedDraft,
      conversation,
      pendingRounds,
      iterationInstruction,
      savedAt: new Date().toISOString(),
    };

    const hasContent = Boolean(
      emailId ||
        recipient.trim() ||
        purpose.trim() ||
        details.trim() ||
        acceptedDraft.body.trim() ||
        conversation.length ||
        pendingRounds.length ||
        iterationInstruction.trim()
    );

    const draftKey = buildDraftStorageKey(type);
    const threadKey = emailId ? buildThreadStorageKey(type, emailId) : null;

    if (!hasContent) {
      window.localStorage.removeItem(draftKey);
      if (threadKey) {
        window.localStorage.removeItem(threadKey);
      }
      return;
    }

    const targetKey = threadKey ?? draftKey;
    window.localStorage.setItem(targetKey, JSON.stringify(snapshot));

    if (threadKey) {
      window.localStorage.removeItem(draftKey);
    }
  }, [acceptedDraft, conversation, details, emailId, iterationInstruction, pendingRounds, purpose, recipient, restoreChecked, tone, type]);

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
    const currentType = type as MailTypeSlug;
    setBusyMode("generate");
    setError("");
    setLocalNotice("");
    setStreamingBody("");

    try {
      const response = await fetch("/api/generate-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mailType: currentType,
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
        onDone: (streamEvent) => {
          if (!("email" in streamEvent)) {
            return;
          }

          setAcceptedDraft(getDraftFromEmail(streamEvent.email));
          setStreamingBody("");
          setConversation(streamEvent.messages ?? []);
          setPendingRounds([]);
          setIterationInstruction("");
          setEmailId(streamEvent.email.id);
          setLoadedThreadId(streamEvent.email.id);
          setPlan(streamEvent.plan ?? null);
          window.localStorage.removeItem(buildDraftStorageKey(currentType));
          router.replace(`/compose/${currentType}?emailId=${streamEvent.email.id}`, { scroll: false });
        },
        onError: (message) => setError(message),
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "请求失败");
      setLocalNotice("若网络异常中断，当前表单与会话已自动暂存，可刷新后继续。");
    } finally {
      setStreamingBody("");
      setBusyMode((current) => (current === "generate" ? null : current));
    }
  }

  async function handleIterate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const instruction = iterationInstruction.trim();
    const baseDraft = activeDraft;
    if (!instruction || !emailId || !baseDraft.body.trim()) {
      return;
    }

    const startedAt = new Date().toISOString();
    setBusyMode("iterate");
    setError("");
    setLocalNotice("");
    setLoadingIteration({ instruction, before: baseDraft, startedAt });

    try {
      const response = await fetch(`/api/emails/${emailId}/iterate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          instruction,
          currentSubject: baseDraft.subject,
          currentBody: baseDraft.body,
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
        throw new Error(`优化失败 (${response.status})${message ? `：${message.slice(0, 120)}` : ""}`);
      }

      await readSseStream(response, {
        onDone: (streamEvent) => {
          if (!("draft" in streamEvent)) {
            return;
          }

          const userMessage = createLocalMessage({
            emailId,
            role: "user",
            messageType: "revision_request",
            content: instruction,
            createdAt: startedAt,
          });
          const assistantMessage = createLocalMessage({
            emailId,
            role: "assistant",
            messageType: "draft",
            content: formatDraftContent(streamEvent.draft.subject, streamEvent.draft.body),
            subject: streamEvent.draft.subject,
            body: streamEvent.draft.body,
            translatedSubject: streamEvent.draft.translatedSubject,
            translatedBody: streamEvent.draft.translatedBody,
            createdAt: new Date().toISOString(),
          });

          setPendingRounds((current) => [
            ...current,
            {
              id: `round-${crypto.randomUUID()}`,
              before: baseDraft,
              after: streamEvent.draft,
              userMessage,
              assistantMessage,
            },
          ]);
          setIterationInstruction("");
          setPlan(streamEvent.plan ?? null);
        },
        onError: (message) => setError(message),
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "请求失败");
      setLocalNotice("网络异常时已自动暂存当前邮件与对话记录，可刷新后继续。");
    } finally {
      setBusyMode((current) => (current === "iterate" ? null : current));
      setLoadingIteration(null);
    }
  }

  async function handleAcceptPending() {
    if (!emailId || pendingRounds.length === 0) {
      return;
    }

    const finalDraft = pendingRounds[pendingRounds.length - 1].after;
    const persistedMessages = pendingRounds.flatMap((round) => [
      {
        role: round.userMessage.role,
        messageType: round.userMessage.messageType,
        content: round.userMessage.content,
        createdAt: round.userMessage.createdAt,
      },
      {
        role: round.assistantMessage.role,
        messageType: round.assistantMessage.messageType,
        content: round.assistantMessage.content,
        subject: round.assistantMessage.subject,
        body: round.assistantMessage.body,
        translatedSubject: round.assistantMessage.translatedSubject,
        translatedBody: round.assistantMessage.translatedBody,
        createdAt: round.assistantMessage.createdAt,
      },
    ]);

    setBusyMode("accept");
    setError("");
    setLocalNotice("");

    try {
      const response = await fetch(`/api/emails/${emailId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject: finalDraft.subject,
          body: finalDraft.body,
          translatedSubject: finalDraft.translatedSubject,
          translatedBody: finalDraft.translatedBody,
          messages: persistedMessages,
        }),
      });

      if (response.status === 401) {
        throw new Error("登录已过期，请刷新页面后重新登录");
      }

      if (!response.ok) {
        const message = await response.text().catch(() => "");
        throw new Error(`采纳失败 (${response.status})${message ? `：${message.slice(0, 120)}` : ""}`);
      }

      const data = (await response.json()) as { email: SavedEmail; messages: ConversationMessage[] };
      setAcceptedDraft(getDraftFromEmail(data.email));
      setConversation((current) => [...current, ...(data.messages ?? [])]);
      setPendingRounds([]);
      setIterationInstruction("");
      setEmailId(data.email.id);
      setLoadedThreadId(data.email.id);
      setLocalNotice("已采纳优化稿，后续对话会继续基于当前版本。");
    } catch (err) {
      setError(err instanceof Error ? err.message : "请求失败");
      setLocalNotice("网络异常时已自动暂存当前邮件与对话记录，可刷新后继续。");
    } finally {
      setBusyMode((current) => (current === "accept" ? null : current));
    }
  }

  function handleDiscardPending() {
    if (pendingRounds.length === 0) {
      return;
    }

    setPendingRounds((current) => current.slice(0, -1));
    setError("");
    setLocalNotice("已放弃最近一轮优化稿，当前内容已回到上一版。");
  }

  function focusIterationInput() {
    iterationInputRef.current?.focus();
    iterationInputRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
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
              已开启多轮优化上下文
            </div>
          )}
        </div>

        {existingEmailId && !error && (
          <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            已载入历史邮件，你可以直接继续让 AI 基于当前版本迭代优化。
          </div>
        )}

        {localNotice && (
          <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
            {localNotice}
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
            disabled={isGenerating || isIterating || isLoadingThread || isAccepting}
            className="rounded-lg bg-blue-700 px-6 py-3 text-sm font-semibold text-white transition hover:bg-blue-800 disabled:opacity-70"
          >
            {isGenerating ? "生成中..." : emailId ? "重新生成一封新邮件" : "生成俄语商务邮件"}
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
              <h3 className="section-title text-xl font-bold text-gray-900">当前邮件结果</h3>
              <p className="mt-1 text-sm text-gray-500">
                {latestPendingRound
                  ? "右侧当前预览为未采纳的优化稿，你可以先对比差异，再决定采纳或继续追问。"
                  : "生成后可直接在下方继续用自然语言让 AI 修改当前版本。"}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={!displayBody}
                onClick={() => navigator.clipboard.writeText(`Тема: ${displaySubject || "(без темы)"}\n\n${displayBody}`)}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                复制俄语版
              </button>
              <button
                type="button"
                disabled={!canCopyChineseDraft}
                onClick={() => navigator.clipboard.writeText(formatChineseDraftContent(displayTranslatedSubject, displayTranslatedBody))}
                className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-60"
              >
                复制中文版
              </button>
            </div>
          </div>

          <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
            {isLoadingThread ? (
              <p className="animate-pulse text-sm text-gray-400">正在加载历史线程…</p>
            ) : isGenerating && !streamingBody && !displayBody ? (
              <p className="animate-pulse text-sm text-gray-400">正在生成，请稍候…</p>
            ) : (
              <>
                <div className="mb-3 flex flex-wrap items-center gap-2">
                  {latestPendingRound ? (
                    <span className="inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">
                      当前预览：未采纳优化稿
                    </span>
                  ) : emailId ? (
                    <span className="inline-flex rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700">
                      当前预览：已采纳版本
                    </span>
                  ) : null}
                  {isIterating && (
                    <span className="inline-flex rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700">
                      AI 正在基于当前版本继续优化
                    </span>
                  )}
                </div>
                <div className="grid gap-4 xl:grid-cols-2">
                  <div className="rounded-xl border border-blue-100 bg-white p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-700">俄语原稿</p>
                    <p className="mt-3 text-sm font-semibold text-gray-800">Тема: {displaySubject || "(等待生成)"}</p>
                    <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-gray-700">{displayBody || "生成结果会显示在这里。"}</p>
                  </div>
                  <div className="rounded-xl border border-emerald-100 bg-white p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-700">中文翻译</p>
                    {displayTranslatedSubject || displayTranslatedBody ? (
                      <>
                        <p className="mt-3 text-sm font-semibold text-gray-800">主题: {displayTranslatedSubject || "（无主题）"}</p>
                        <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-gray-700">{displayTranslatedBody || "（正文为空）"}</p>
                      </>
                    ) : (
                      <p className="mt-3 text-sm text-gray-400">中文版会在俄语邮件生成完成后显示在这里。</p>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="section-title text-xl font-bold text-gray-900">版本对比</h3>
              <p className="mt-1 text-sm text-gray-500">左侧查看修改前，右侧查看优化后，改动内容会高亮标记。</p>
            </div>
            <div className="rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-xs text-gray-500">
              {latestPendingRound ? "等待你的采纳决策" : "当前没有待确认优化稿"}
            </div>
          </div>

          {loadingIteration ? (
            <div className="mt-5 rounded-2xl border border-dashed border-amber-300 bg-amber-50/60 p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.16em] text-amber-600">本轮优化中</p>
                  <p className="mt-2 text-sm text-gray-700">指令：{loadingIteration.instruction}</p>
                </div>
                <span className="rounded-full border border-amber-200 bg-white px-3 py-1 text-xs font-medium text-amber-700">
                  基于当前稿生成新版本
                </span>
              </div>
              <div className="mt-4 rounded-xl border border-white/80 bg-white p-4 text-sm text-gray-500">
                AI 正在执行增量优化，请稍候查看左右对比稿。
              </div>
            </div>
          ) : latestPendingRound ? (
            <div className="mt-5 space-y-5">
              <EmailDiffView before={latestPendingRound.before} after={latestPendingRound.after} />
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-emerald-100 bg-emerald-50/60 px-4 py-4">
                <p className="text-sm text-emerald-900">
                  {pendingRounds.length > 1
                    ? `当前共有 ${pendingRounds.length} 轮待采纳优化，继续追问时会基于右侧优化稿继续。`
                    : "采纳后将把右侧优化稿写回当前邮件；也可以放弃本轮，回到上一版。"}
                </p>
                <div className="flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={handleAcceptPending}
                    disabled={isGenerating || isIterating || isLoadingThread || isAccepting}
                    className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isAccepting ? "采纳中..." : "采纳修改"}
                  </button>
                  <button
                    type="button"
                    onClick={handleDiscardPending}
                    disabled={isGenerating || isIterating || isLoadingThread || isAccepting}
                    className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    放弃本轮
                  </button>
                  <button
                    type="button"
                    onClick={focusIterationInput}
                    disabled={isGenerating || isIterating || isLoadingThread || isAccepting}
                    className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-700 transition hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    继续对话优化
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="mt-5 rounded-2xl border border-dashed border-gray-300 px-4 py-10 text-center text-sm text-gray-500">
              先生成邮件并发出一轮优化指令，系统就会在这里展示左右分栏对比稿。
            </div>
          )}
        </div>

        <div className="scroll-mt-24 rounded-2xl border border-emerald-200 bg-[linear-gradient(180deg,rgba(236,253,245,0.95),rgba(255,255,255,0.98))] p-6 shadow-sm sm:p-8">
          <div>
            <p className="text-xs uppercase tracking-[0.16em] text-emerald-600">继续优化这封邮件</p>
            <h3 className="section-title mt-2 text-xl font-bold text-gray-900">让 AI 基于当前邮件继续多轮对话优化</h3>
            <p className="mt-2 text-sm text-gray-600">
              例如：语气更正式、精简第一段、补充联系方式与时间、改成英文版本、先说明目的再讲背景。
            </p>
          </div>

          <form onSubmit={handleIterate} className="mt-5 space-y-4">
            <textarea
              ref={iterationInputRef}
              value={iterationInstruction}
              onChange={(event) => setIterationInstruction(event.target.value)}
              placeholder={canIterate ? "输入你希望 AI 如何调整当前邮件内容" : "先生成或打开一封历史邮件后，才能继续多轮优化"}
              disabled={!canIterate || isGenerating || isLoadingThread || isAccepting}
              className="min-h-32 w-full rounded-xl border border-emerald-200 bg-white px-4 py-3 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-emerald-400 disabled:cursor-not-allowed disabled:bg-gray-50"
            />
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-xs text-emerald-700">
                {canIterate
                  ? latestPendingRound
                    ? "下一轮会基于右侧优化稿继续对话；你也可以先采纳或放弃当前这轮。"
                    : "每轮优化都会保留当前邮件上下文，并优先做局部增量修改。"
                  : "未生成邮件时，优化输入框会保持置灰。"}
              </p>
              <button
                type="submit"
                disabled={!canIterate || !iterationInstruction.trim() || isGenerating || isIterating || isLoadingThread || isAccepting}
                className="rounded-lg bg-emerald-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isIterating ? "优化中..." : "继续用 AI 优化当前邮件"}
              </button>
            </div>
          </form>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="section-title text-xl font-bold text-gray-900">AI 迭代记录</h3>
              <p className="mt-1 text-sm text-gray-500">系统会保留本次邮件的上下文；未采纳的优化稿也会在这里显示为待确认状态。</p>
            </div>
            <div className="rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-xs text-gray-500">
              {timelineItems.length > 0 ? `已记录 ${timelineItems.length} 条消息` : "尚未开始会话"}
            </div>
          </div>

          {timelineItems.length === 0 ? (
            <div className="mt-5 rounded-xl border border-dashed border-gray-300 px-4 py-8 text-center text-sm text-gray-500">
              先生成一封邮件，随后即可围绕当前内容进行多轮 AI 对话式优化。
            </div>
          ) : (
            <div className="mt-5 space-y-3">
              {timelineItems.map(({ message, pending }) => (
                <article
                  key={message.id}
                  className={message.role === "assistant" ? "rounded-2xl border border-blue-100 bg-blue-50/60 p-4" : "rounded-2xl border border-gray-200 bg-white p-4"}
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`text-xs font-semibold uppercase tracking-[0.16em] ${message.role === "assistant" ? "text-blue-700" : "text-gray-500"}`}>
                        {message.role === "assistant" ? "AI 草稿" : message.messageType === "initial_request" ? "初始需求" : "优化指令"}
                      </span>
                      {pending && (
                        <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-[11px] font-medium text-amber-700">
                          待采纳
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-gray-400">{formatMessageTime(message.createdAt)}</span>
                  </div>
                  {message.role === "assistant" ? (
                    <div className="mt-3 rounded-xl border border-white/70 bg-white p-4 text-sm leading-7 text-gray-700">
                      <p className="font-semibold text-gray-800">Тема: {message.subject || "(без темы)"}</p>
                      <p className="mt-3 whitespace-pre-wrap">{message.body || message.content}</p>
                      {(message.translatedSubject?.trim() || message.translatedBody?.trim()) && (
                        <div className="mt-4 rounded-xl border border-emerald-100 bg-emerald-50/70 p-4">
                          <p className="font-semibold text-emerald-800">主题: {message.translatedSubject || "（无主题）"}</p>
                          <p className="mt-3 whitespace-pre-wrap text-gray-700">{message.translatedBody || "（正文为空）"}</p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-gray-700">{message.content}</p>
                  )}
                </article>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
