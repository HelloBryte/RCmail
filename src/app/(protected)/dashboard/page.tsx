import Link from "next/link";
import { Tent, Handshake, CalendarClock, Headphones, DollarSign } from "lucide-react";
import { PlanBanner } from "./plan-banner";
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

export default function DashboardPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="section-title text-2xl font-bold text-gray-900 sm:text-3xl">邮件模板库</h1>
        <p className="mt-2 text-gray-500">覆盖中俄商务沟通全场景，选择合适的模板开始撰写</p>
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

      <PlanBanner />
    </div>
  );
}

