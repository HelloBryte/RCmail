"use client";

import { diffText, type DiffSegment } from "@/lib/text-diff";

type EmailDraft = {
  subject: string;
  body: string;
};

function renderSegments(segments: DiffSegment[], variant: "before" | "after") {
  return segments.map((segment, index) => {
    const highlighted =
      variant === "before"
        ? segment.status === "removed"
        : segment.status === "added";

    const className = highlighted
      ? variant === "before"
        ? "rounded bg-rose-100 text-rose-800"
        : "rounded bg-emerald-100 text-emerald-800"
      : "";

    return (
      <span key={`${variant}-${index}`} className={className}>
        {segment.value}
      </span>
    );
  });
}

function DiffPanel({
  label,
  tone,
  subjectSegments,
  bodySegments,
}: {
  label: string;
  tone: "before" | "after";
  subjectSegments: DiffSegment[];
  bodySegments: DiffSegment[];
}) {
  const panelTone =
    tone === "before"
      ? {
          badge: "border-rose-200 bg-rose-50 text-rose-700",
          box: "border-rose-100 bg-white",
        }
      : {
          badge: "border-emerald-200 bg-emerald-50 text-emerald-700",
          box: "border-emerald-100 bg-white",
        };

  return (
    <section className={`rounded-2xl border p-5 shadow-sm ${panelTone.box}`}>
      <div className="flex items-center justify-between gap-3">
        <h4 className="text-sm font-semibold text-gray-900">{label}</h4>
        <span className={`rounded-full border px-3 py-1 text-[11px] font-semibold ${panelTone.badge}`}>
          {tone === "before" ? "删除高亮" : "新增高亮"}
        </span>
      </div>
      <div className="mt-4 rounded-xl border border-gray-100 bg-gray-50 p-4">
        <p className="whitespace-pre-wrap text-sm font-semibold text-gray-900">
          {renderSegments(subjectSegments, tone)}
        </p>
        <div className="mt-3 whitespace-pre-wrap text-sm leading-7 text-gray-700">
          {renderSegments(bodySegments, tone)}
        </div>
      </div>
    </section>
  );
}

export function EmailDiffView({ before, after }: { before: EmailDraft; after: EmailDraft }) {
  const subjectDiff = diffText(`Тема: ${before.subject || "(без темы)"}`, `Тема: ${after.subject || "(без темы)"}`);
  const bodyDiff = diffText(before.body, after.body);

  return (
    <div className="grid gap-4 xl:grid-cols-2">
      <DiffPanel
        label="原稿"
        tone="before"
        subjectSegments={subjectDiff.before}
        bodySegments={bodyDiff.before}
      />
      <DiffPanel
        label="优化稿"
        tone="after"
        subjectSegments={subjectDiff.after}
        bodySegments={bodyDiff.after}
      />
    </div>
  );
}
