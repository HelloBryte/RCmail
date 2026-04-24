import Link from "next/link";
import { Mail } from "lucide-react";
import { UserButton } from "@clerk/nextjs";

export const dynamic = "force-dynamic";

export default function ProtectedLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="flex min-h-screen flex-col bg-[var(--bg)]">
      {/* Sticky navbar */}
      <nav className="sticky top-0 z-50 border-b border-[var(--line)] bg-white shadow-sm">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href="/dashboard" className="flex items-center gap-2">
            <Mail className="text-blue-800" size={26} />
            <span className="text-xl font-bold tracking-tight text-gray-900">
              RC<span className="text-blue-700">MailAI</span>
            </span>
          </Link>

          <nav className="flex items-center gap-1 text-sm font-medium">
            <Link
              href="/dashboard"
              className="rounded-full px-3 py-1.5 text-gray-600 transition hover:bg-gray-100 hover:text-blue-700"
            >
              新建邮件
            </Link>
            <Link
              href="/history"
              className="rounded-full px-3 py-1.5 text-gray-600 transition hover:bg-gray-100 hover:text-blue-700"
            >
              历史记录
            </Link>
            <Link
              href="/pricing"
              className="rounded-full px-3 py-1.5 text-gray-600 transition hover:bg-gray-100 hover:text-blue-700"
            >
              套餐
            </Link>
            <Link
              href="/admin"
              className="rounded-full px-3 py-1.5 text-gray-600 transition hover:bg-gray-100 hover:text-blue-700"
            >
              后台
            </Link>
            <span className="ml-2">
              <UserButton />
            </span>
          </nav>
        </div>
      </nav>

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6 lg:px-8">
        {children}
      </main>
    </div>
  );
}

