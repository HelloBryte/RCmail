"use client";

type Props = {
  content: string;
};

export function EmailPreview({ content }: Props) {
  async function copyContent() {
    if (!content) return;
    await navigator.clipboard.writeText(content);
  }

  return (
    <section className="card-surface rounded-2xl p-5 sm:p-6">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="section-title text-xl font-semibold">俄语邮件预览</h3>
        <button
          onClick={copyContent}
          className="rounded-full border border-[var(--line)] px-3 py-1 text-xs font-medium text-[var(--ink)] transition hover:bg-white"
          type="button"
        >
          复制全文
        </button>
      </div>

      <div className="min-h-72 rounded-2xl border border-[var(--line)] bg-white/75 p-4">
        {content ? (
          <p className="whitespace-pre-wrap text-sm leading-7 text-[var(--ink)]">{content}</p>
        ) : (
          <p className="text-sm text-[var(--muted)]">生成结果会显示在这里。</p>
        )}
      </div>
    </section>
  );
}
