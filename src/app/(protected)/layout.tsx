import Link from "next/link";
import { UserButton } from "@clerk/nextjs";

export const dynamic = "force-dynamic";

export default function ProtectedLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-6 py-6 sm:px-10 lg:px-14">
      <header className="card-surface mb-6 flex items-center justify-between rounded-2xl px-4 py-3">
        <div className="flex items-center gap-2">
          <p className="section-title text-lg font-semibold">RCmail AI Console</p>
          <span className="rounded-full border border-[var(--line)] px-2 py-0.5 text-[10px] uppercase tracking-widest text-[var(--muted)]">
            agent-ready
          </span>
        </div>

        <nav className="flex items-center gap-3 text-sm">
          <Link href="/dashboard" className="rounded-full px-3 py-1 transition hover:bg-white/70">
            控制台
          </Link>
          <Link href="/history" className="rounded-full px-3 py-1 transition hover:bg-white/70">
            历史
          </Link>
          <UserButton />
        </nav>
      </header>

      {children}
    </div>
  );
}
