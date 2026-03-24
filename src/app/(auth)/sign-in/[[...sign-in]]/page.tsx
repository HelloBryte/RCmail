import { SignIn } from "@clerk/nextjs";

export const dynamic = "force-dynamic";

export default function SignInPage() {
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 items-center justify-center px-6 py-10 sm:px-10 lg:px-14">
      <div className="card-surface rounded-3xl p-4 sm:p-6">
        <SignIn />
      </div>
    </main>
  );
}
