import Link from "next/link";
import { MAIL_TYPES } from "@/lib/mail-types";

export default function DashboardPage() {
  return (
    <main className="space-y-5">
      <section className="card-surface rounded-2xl p-6">
        <h2 className="section-title text-2xl font-semibold">选择邮件类型</h2>
        <p className="mt-2 text-sm text-[var(--muted)]">点击任意类型即可进入对应模板写作页面。</p>
      </section>

      <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {MAIL_TYPES.map((item) => (
          <article key={item.slug} className="card-surface rounded-2xl p-5">
            <h3 className="section-title text-lg font-semibold">{item.title}</h3>
            <p className="mt-2 text-sm text-[var(--muted)]">{item.summary}</p>
            <Link
              href={`/compose/${item.slug}`}
              className="mt-4 inline-flex rounded-full bg-[var(--brand-2)] px-4 py-2 text-sm font-semibold text-white"
            >
              去写这类邮件
            </Link>
          </article>
        ))}
      </section>

      <section className="card-surface rounded-2xl p-5">
        <p className="text-sm text-[var(--muted)]">Personal 仅 3 次试用，Business 无限使用。</p>
        <Link href="/pricing" className="mt-3 inline-flex rounded-full border border-[var(--line)] px-4 py-2 text-sm">
          去升级 Business
        </Link>
      </section>
    </main>
  );
}
