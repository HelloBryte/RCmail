import Link from "next/link";
import { Mail, Tent, Handshake, CalendarClock, Headphones, DollarSign } from "lucide-react";
import { MAIL_TYPES } from "@/lib/mail-types";

const templateMeta: Record<string, { icon: React.ReactNode; colorBg: string; colorText: string; colorHover: string; count: string }> = {
  "exhibition-invitation": {
    icon: <Tent size={24} />,
    colorBg: "bg-blue-50 text-blue-700",
    colorText: "text-blue-600",
    colorHover: "group-hover:bg-blue-600 group-hover:text-white",
    count: "12 个细分模板",
  },
  "cooperation-negotiation": {
    icon: <Handshake size={24} />,
    colorBg: "bg-teal-50 text-teal-700",
    colorText: "text-teal-600",
    colorHover: "group-hover:bg-teal-600 group-hover:text-white",
    count: "24 个细分模板",
  },
  "client-follow-up": {
    icon: <CalendarClock size={24} />,
    colorBg: "bg-orange-50 text-orange-700",
    colorText: "text-orange-600",
    colorHover: "group-hover:bg-orange-600 group-hover:text-white",
    count: "18 个细分模板",
  },
  "after-sales": {
    icon: <Headphones size={24} />,
    colorBg: "bg-purple-50 text-purple-700",
    colorText: "text-purple-600",
    colorHover: "group-hover:bg-purple-600 group-hover:text-white",
    count: "15 个细分模板",
  },
  "payment-reminder": {
    icon: <DollarSign size={24} />,
    colorBg: "bg-red-50 text-red-700",
    colorText: "text-red-600",
    colorHover: "group-hover:bg-red-600 group-hover:text-white",
    count: "8 个细分模板",
  },
};

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col">
      {/* Navbar */}
      <nav className="sticky top-0 z-50 border-b border-[var(--line)] bg-white shadow-sm">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2">
            <Mail className="text-blue-800" size={28} />
            <span className="text-xl font-bold tracking-tight text-gray-900">
              RC<span className="text-blue-700">MailAI</span>
            </span>
          </div>

          <div className="hidden items-center gap-8 text-sm font-medium md:flex">
            <span className="border-b-2 border-blue-700 pb-1 text-blue-700">首页</span>
            <Link href="/dashboard" className="text-gray-500 transition hover:text-blue-700">
              新建邮件
            </Link>
            <Link href="/history" className="text-gray-500 transition hover:text-blue-700">
              历史记录
            </Link>
            <Link href="/pricing" className="text-gray-500 transition hover:text-blue-700">
              套餐
            </Link>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/sign-in"
              className="hidden rounded-full border border-[var(--line)] px-4 py-1.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50 md:inline-flex"
            >
              登录
            </Link>
            <Link
              href="/sign-up"
              className="rounded-full bg-blue-700 px-4 py-1.5 text-sm font-semibold text-white transition hover:bg-blue-800"
            >
              免费开始
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <header className="gradient-hero py-16 text-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl">
            <h1 className="text-4xl font-extrabold leading-tight md:text-5xl">
              跨越语言障碍，<br />开启中俄贸易新篇章
            </h1>
            <p className="mt-6 text-lg leading-relaxed text-blue-100 opacity-90">
              基于最新的 AI 语言模型，专为中俄外贸从业者打造。一键生成地道、专业的商务俄语邮件，符合俄罗斯商务礼仪。
            </p>
            <div className="mt-8 flex flex-wrap gap-4">
              <Link
                href="/dashboard"
                className="rounded-lg bg-white px-8 py-3 font-bold text-blue-800 shadow-lg transition hover:bg-blue-50"
              >
                开始编写
              </Link>
              <Link
                href="#templates"
                className="rounded-lg border border-white/40 bg-white/10 px-8 py-3 font-bold backdrop-blur-sm transition hover:bg-white/20"
              >
                浏览模板
              </Link>
            </div>
            <div className="mt-8 flex flex-wrap items-center gap-4 text-sm text-blue-100/80">
              <div className="flex items-center gap-1.5">
                <svg className="h-4 w-4 text-green-400" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                专业商务术语
              </div>
              <div className="flex items-center gap-1.5">
                <svg className="h-4 w-4 text-green-400" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                实时双语对照
              </div>
              <div className="flex items-center gap-1.5">
                <svg className="h-4 w-4 text-green-400" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                符合俄区习惯
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Template Cards */}
      <section className="mx-auto w-full max-w-7xl px-4 py-16 sm:px-6 lg:px-8" id="templates">
        <div className="mb-10 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h2 className="section-title text-3xl font-bold text-gray-900">邮件模板库</h2>
            <p className="mt-2 text-gray-500">覆盖中俄商务沟通全场景，选择合适的模板开始撰写</p>
          </div>
          <Link href="/dashboard" className="flex items-center gap-1 font-semibold text-blue-700 hover:underline">
            进入完整模板页
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
          </Link>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {MAIL_TYPES.map((item) => {
            const meta = templateMeta[item.slug];
            return (
              <Link
                key={item.slug}
                href={`/compose/${item.slug}`}
                className="template-card group rounded-xl border border-gray-100 bg-white p-6 shadow-sm hover:border-blue-300 hover:shadow-md"
              >
                <div className={`mb-4 flex h-12 w-12 items-center justify-center rounded-lg transition-colors ${meta.colorBg} ${meta.colorHover}`}>
                  {meta.icon}
                </div>
                <h3 className="mb-2 text-lg font-bold text-gray-800">{item.title}</h3>
                <p className="mb-4 text-sm leading-relaxed text-gray-500">{item.summary}</p>
                <div className={`flex items-center gap-1 text-xs font-medium ${meta.colorText}`}>
                  {meta.count}
                  <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto bg-gray-900 pb-8 pt-16 text-gray-400">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-12 grid grid-cols-2 gap-12 md:grid-cols-4">
            <div className="col-span-2">
              <div className="mb-6 flex items-center gap-2 text-white">
                <Mail size={28} />
                <span className="text-xl font-bold tracking-tight">
                  RC<span className="text-blue-500">MailAI</span>
                </span>
              </div>
              <p className="mb-6 max-w-xs text-sm">
                领先的中俄商务通讯协作平台，致力于消弭语言鸿沟，助力中国品牌走向世界。
              </p>
              <p className="text-sm text-gray-500">商务合作：support@rcmailai.com</p>
            </div>
            <div>
              <h4 className="mb-6 font-bold text-white">产品中心</h4>
              <ul className="space-y-4 text-sm">
                <li><Link href="/dashboard" className="hover:text-white">新建邮件</Link></li>
                <li><Link href="#templates" className="hover:text-white">模板库</Link></li>
                <li><Link href="/pricing" className="hover:text-white">套餐价格</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="mb-6 font-bold text-white">服务支持</h4>
              <ul className="space-y-4 text-sm">
                <li><Link href="/history" className="hover:text-white">历史记录</Link></li>
                <li><a href="mailto:support@rcmailai.com" className="hover:text-white">联系我们</a></li>
              </ul>
            </div>
          </div>
          <div className="flex flex-col items-center justify-between border-t border-gray-800 pt-8 text-xs md:flex-row">
            <p>© 2026 RCMailAI Inc. 保留所有权利。</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

