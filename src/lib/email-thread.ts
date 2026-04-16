import { isMailTypeSlug, type MailTypeSlug } from "@/lib/mail-types";
import { buildRevisionPrompt, buildUserPrompt, isTone, type Tone } from "@/lib/prompts";
import type { EmailMessageRow, EmailRow } from "@/lib/db/schema";
import type { QwenMessage } from "@/lib/qwen";

export type ThreadMessageRole = "user" | "assistant";
export type ThreadMessageType = "initial_request" | "revision_request" | "draft";

export type ComposeInput = {
  recipient: string;
  purpose: string;
  details: string;
  tone: Tone;
};

export type ThreadMessage = {
  id: string;
  emailId: string;
  userId: string;
  role: ThreadMessageRole;
  messageType: ThreadMessageType;
  content: string;
  subject: string | null;
  body: string | null;
  createdAt: Date;
};

const TONE_LABELS: Record<Tone, string> = {
  formal: "专业正式",
  friendly: "友好合作",
  firm: "礼貌坚定",
};

export function normalizeTone(value: string): Tone {
  return isTone(value) ? value : "formal";
}

export function serializeChineseInput(input: Pick<ComposeInput, "purpose" | "details">) {
  return `purpose=${input.purpose}; details=${input.details || "无"}`;
}

export function parseChineseInput(chineseInput: string) {
  const trimmed = chineseInput.trim();

  if (!trimmed) {
    return { purpose: "", details: "" };
  }

  if (trimmed.startsWith("{")) {
    try {
      const parsed = JSON.parse(trimmed) as { purpose?: unknown; details?: unknown };
      return {
        purpose: String(parsed.purpose ?? "").trim(),
        details: String(parsed.details ?? "").trim(),
      };
    } catch {
      // Fall through to the legacy parser.
    }
  }

  const purposeMarker = "purpose=";
  const detailsMarker = "; details=";
  const purposeStart = trimmed.indexOf(purposeMarker);
  const detailsStart = trimmed.indexOf(detailsMarker);

  if (purposeStart >= 0 && detailsStart > purposeStart) {
    const purpose = trimmed.slice(purposeStart + purposeMarker.length, detailsStart).trim();
    const details = trimmed.slice(detailsStart + detailsMarker.length).trim();
    return {
      purpose,
      details: details === "无" ? "" : details,
    };
  }

  return { purpose: trimmed, details: "" };
}

export function buildInitialRequestSummary(input: ComposeInput) {
  return [
    `收件人 / 公司：${input.recipient}`,
    `沟通目的：${input.purpose}`,
    `补充要点：${input.details || "无"}`,
    `语气风格：${TONE_LABELS[input.tone]}`,
  ].join("\n");
}

export function formatDraftContent(subject: string, body: string) {
  return `Тема: ${subject || "(без темы)"}\n\n${body}`.trim();
}

export function getComposeInputFromEmail(email: Pick<EmailRow, "recipient" | "tone" | "chineseInput">): ComposeInput {
  const { purpose, details } = parseChineseInput(email.chineseInput);

  return {
    recipient: email.recipient,
    purpose,
    details,
    tone: normalizeTone(email.tone),
  };
}

function createSyntheticInitialRequest(email: EmailRow): ThreadMessage {
  return {
    id: `legacy-initial-${email.id}`,
    emailId: email.id,
    userId: email.userId,
    role: "user",
    messageType: "initial_request",
    content: buildInitialRequestSummary(getComposeInputFromEmail(email)),
    subject: null,
    body: null,
    createdAt: email.createdAt,
  };
}

function createSyntheticDraft(email: EmailRow): ThreadMessage {
  return {
    id: `legacy-draft-${email.id}`,
    emailId: email.id,
    userId: email.userId,
    role: "assistant",
    messageType: "draft",
    content: formatDraftContent(email.subject, email.russianOutput),
    subject: email.subject,
    body: email.russianOutput,
    createdAt: email.updatedAt,
  };
}

export function normalizeThreadMessages(email: EmailRow, storedMessages: EmailMessageRow[]): ThreadMessage[] {
  const sortedMessages: ThreadMessage[] = storedMessages
    .map((message) => ({
      ...message,
      role: message.role as ThreadMessageRole,
      messageType: message.messageType as ThreadMessageType,
      subject: message.subject ?? null,
      body: message.body ?? null,
    }))
    .sort((left, right) => left.createdAt.getTime() - right.createdAt.getTime());

  if (sortedMessages.length === 0) {
    return [createSyntheticInitialRequest(email), createSyntheticDraft(email)];
  }

  const hasInitialRequest = sortedMessages.some((message) => message.messageType === "initial_request");
  const hasAssistantDraft = sortedMessages.some((message) => message.role === "assistant");

  let normalized = sortedMessages;

  if (!hasInitialRequest) {
    normalized = [createSyntheticInitialRequest(email), ...normalized];
  }

  if (!hasAssistantDraft) {
    normalized = [...normalized, createSyntheticDraft(email)];
  }

  return normalized;
}

export function buildThreadForModel(email: EmailRow, storedMessages: EmailMessageRow[]): QwenMessage[] {
  const composeInput = getComposeInputFromEmail(email);
  const mailType: MailTypeSlug = isMailTypeSlug(email.emailType) ? email.emailType : "client-follow-up";

  return normalizeThreadMessages(email, storedMessages).map((message) => {
    if (message.role === "assistant") {
      return {
        role: "assistant",
        content: message.content || formatDraftContent(message.subject ?? email.subject, message.body ?? email.russianOutput),
      } satisfies QwenMessage;
    }

    if (message.messageType === "initial_request") {
      return {
        role: "user",
        content: buildUserPrompt(mailType, composeInput),
      } satisfies QwenMessage;
    }

    return {
      role: "user",
      content: buildRevisionPrompt(message.content),
    } satisfies QwenMessage;
  });
}
