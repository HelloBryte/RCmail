import Link from "next/link";

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-6 py-10 sm:px-10 lg:px-14">
      <header className="fade-up mb-12 flex items-center justify-between">
        <div>
          <p className="section-title text-sm uppercase tracking-[0.22em] text-[var(--muted)]">RCmail AI</p>
          <h1 className="section-title mt-1 text-2xl font-semibold sm:text-3xl">中文信息生成俄语商务邮件</h1>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/sign-in"
            className="rounded-full border border-[var(--line)] px-4 py-2 text-sm font-medium text-[var(--ink)] transition hover:bg-white/70"
          >
            登录
          </Link>
          <Link
            href="/sign-up"
            className="rounded-full bg-[var(--brand)] px-4 py-2 text-sm font-semibold text-white transition hover:brightness-95"
          >
            免费开始
          </Link>
        </div>
      </header>

      <section className="fade-up card-surface rounded-3xl p-7 sm:p-10">
        <div className="grid gap-9 lg:grid-cols-[1.35fr_1fr] lg:items-center">
          <div>
            <p className="mb-4 inline-flex rounded-full border border-[var(--line)] bg-white/70 px-3 py-1 text-xs font-medium text-[var(--muted)]">
              中俄沟通自动化
            </p>
            <h2 className="section-title max-w-2xl text-3xl font-semibold leading-tight sm:text-5xl">
              从中文描述到俄语可发送邮件，
              <span className="text-[var(--brand)]">一个 Agent 全流程完成。</span>
            </h2>
            <p className="mt-5 max-w-2xl text-base leading-8 text-[var(--muted)] sm:text-lg">
              输入中文背景，系统自动生成俄语主题、正文、结尾，并可由内置 Agent 调用网站能力保存草稿、维护历史、管理偏好。
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/dashboard"
                className="rounded-full bg-[var(--brand-2)] px-5 py-3 text-sm font-semibold text-white transition hover:brightness-95"
              >
                进入控制台
              </Link>
              <Link
                href="/history"
                className="rounded-full border border-[var(--line)] px-5 py-3 text-sm font-medium text-[var(--ink)] transition hover:bg-white/80"
              >
                查看历史
              </Link>
            </div>
          </div>

          <div className="rounded-2xl border border-[var(--line)] bg-gradient-to-br from-white/95 to-[#f1ece1] p-5">
            <p className="section-title text-sm font-medium text-[var(--muted)]">示例预览</p>
            <div className="mt-3 space-y-3 text-sm">
              <p className="rounded-xl bg-white px-3 py-2 text-[var(--ink)]">
                中文输入：给伊万写一封正式合作确认邮件，表达感谢并约下周二会议。
              </p>
              <p className="rounded-xl bg-[color-mix(in_oklab,var(--brand-2)_10%,white)] px-3 py-2 text-[var(--ink)]">
                Русское письмо: Уважаемый Иван, благодарю вас за сотрудничество...
              </p>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
