export const MAIL_TYPES = [
  {
    slug: "exhibition-invitation",
    title: "展会邀请",
    summary: "用于邀请客户参观展会与展位。",
  },
  {
    slug: "client-follow-up",
    title: "客户跟进",
    summary: "用于延续上一轮沟通并推进合作。",
  },
  {
    slug: "cooperation-negotiation",
    title: "合作洽谈",
    summary: "用于提出合作方案并约会议讨论。",
  },
  {
    slug: "after-sales",
    title: "售后管理",
    summary: "用于售后关怀、支持和问题跟进。",
  },
  {
    slug: "payment-reminder",
    title: "催款提醒",
    summary: "用于委婉且坚定地提醒付款进度。",
  },
] as const;

export type MailTypeSlug = (typeof MAIL_TYPES)[number]["slug"];

export function isMailTypeSlug(value: string): value is MailTypeSlug {
  return MAIL_TYPES.some((item) => item.slug === value);
}

export function getMailTypeBySlug(slug: MailTypeSlug) {
  return MAIL_TYPES.find((item) => item.slug === slug)!;
}
