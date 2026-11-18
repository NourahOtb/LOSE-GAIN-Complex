import { cookies } from "next/headers";

import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";

import { LoginForm } from "./login-form";

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const { denied } = await searchParams;
  const theme = (await cookies()).get("lg-theme")?.value === "dark" ? "dark" : "light";
  return (
    <main className="relative min-h-screen grid place-items-center px-4">
      <ThemeToggle initial={theme} className="absolute right-4 top-4 text-ink" />
      <div className="w-full max-w-sm">
        <Logo size={26} />
        <h1 className="mt-10 text-2xl font-semibold">Staff dashboard</h1>
        <p className="text-ink-soft mt-1">Log in with your staff account.</p>
        <div className="mt-5 flex items-center" aria-hidden>
          <div className="h-[5px] flex-1 bg-ink" />
          <div className="ml-1 h-6 w-[5px] bg-ink" />
        </div>
        {denied ? (
          <p className="mt-5 rounded bg-danger-bg p-3 text-sm font-semibold text-danger">This account doesn&apos;t have access to the admin dashboard.</p>
        ) : null}
        <LoginForm />
      </div>
    </main>
  );
}
