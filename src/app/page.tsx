import Link from "next/link";
import { Mail, Tent, Handshake, CalendarClock, Headphones, DollarSign } from "lucide-react";
import { MAIL_TYPES } from "@/lib/mail-types";
import { PromoCountdown } from "@/components/promo-countdown";

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
            {/* 限时促销胶囊 */}
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/30 bg-white/15 px-4 py-1.5 text-sm font-semibold backdrop-blur-sm">
              <span>🔥</span>
              <span>2026春季限时大促：最后三天！</span>
            </div>
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

      {/* 倒计时 */}
      <PromoCountdown />

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

      {/* 为什么选择我们 */}
      <section className="bg-gray-50 py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-12 text-center">
            <h2 className="text-3xl font-bold text-gray-900">为什么选择我们？</h2>
            <div className="mx-auto mt-3 h-1 w-12 rounded-full bg-blue-600" />
          </div>
          <div className="grid gap-10 md:grid-cols-3">
            {[
              {
                icon: (
                  <svg className="h-10 w-10 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M18.364 5.636a9 9 0 010 12.728M15.536 8.464a5 5 0 010 7.072M6.343 6.343a9 9 0 000 12.728M9.172 9.172a5 5 0 000 5.656M12 12h.01" />
                  </svg>
                ),
                title: "不限字数",
                desc: "打破传统按次收费模式，无论是简短询价还是长篇合同，一键生成完整商务俄语邮件，完全无压力。",
              },
              {
                icon: (
                  <svg className="h-10 w-10 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" />
                  </svg>
                ),
                title: "极速生成",
                desc: "基于顶尖大模型专线加速，响应毫秒级完成，沟通近乎同步，再也不用等待漫长的加载。",
              },
              {
                icon: (
                  <svg className="h-10 w-10 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                ),
                title: "专属引擎",
                desc: "针对中俄商务场景深度训练，精准还原行业术语与礼仪规范，杜绝机械式生硬翻译。",
              },
            ].map(({ icon, title, desc }) => (
              <div key={title} className="flex flex-col items-center text-center">
                <div className="mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-blue-50">
                  {icon}
                </div>
                <h3 className="mb-3 text-xl font-bold text-gray-900">{title}</h3>
                <p className="text-sm leading-relaxed text-gray-500">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 用户评价 */}
      <section className="py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="mb-10 text-center text-3xl font-bold text-gray-900">已有 10,000+ 外贸人选择了我们</h2>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {[
              { name: "陈总", role: "外贸出口企业主", text: "\"2026年最好用的商务俄语工具，没有之一。年卡价格真的良心，帮我完成了好几份大额合同往来邮件。\"" },
              { name: "Lisa Wang", role: "外企采购经理", text: "\"之前请翻译按字数收费，翻译几份合同好几百块。现在年卡不到100元随便用，真爽！\"" },
              { name: "张明", role: "独立外贸顾问", text: "\"生成速度极快，专属引擎对俄罗斯商务词汇的理解非常到位，不用我再手动修改了。\"" },
              { name: "海蓝蓝", role: "跨境电商运营", text: "\"刚好赶上春季大促，99元买了一年，太超值了。推荐给了所有做俄区业务的朋友。\"" },
            ].map(({ name, role, text }) => (
              <div key={name} className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
                <div className="mb-3 flex gap-0.5 text-orange-400">
                  {[...Array(5)].map((_, i) => (
                    <svg key={i} className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  ))}
                </div>
                <p className="mb-4 text-sm leading-relaxed text-gray-600">{text}</p>
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-100 text-sm font-bold text-blue-700">
                    {name[0]}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-800">{name}</p>
                    <p className="text-xs text-gray-400">{role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 服务保障横幅 */}
      <section className="bg-blue-600 py-10 text-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="mb-6 text-center text-2xl font-bold">全方位的服务保障，购后无忧</h2>
          <div className="flex flex-col items-center justify-center gap-8 md:flex-row md:gap-16">
            {[
              { icon: "🛡️", text: "正品保障，稳定续期" },
              { icon: "↩️", text: "7天无理由，极速退款" },
              { icon: "🎧", text: "专业客服，1对1指导" },
            ].map(({ icon, text }) => (
              <div key={text} className="flex items-center gap-3 text-sm font-medium">
                <span className="text-xl">{icon}</span>
                <span>{text}</span>
              </div>
            ))}
          </div>
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

