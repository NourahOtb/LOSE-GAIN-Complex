"use client";

import { useActionState } from "react";

import { signIn } from "../actions";

export function LoginForm() {
  const [state, action, pending] = useActionState(signIn, undefined);
  return (
    <form action={action} className="mt-6 flex flex-col gap-4">
      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-semibold">Email</span>
        <input name="email" type="email" autoComplete="email" required className="h-12 rounded-md border-[1.5px] border-ink bg-surface px-3.5 text-base" />
      </label>
      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-semibold">Password</span>
        <input name="password" type="password" autoComplete="current-password" required className="h-12 rounded-md border-[1.5px] border-ink bg-surface px-3.5 text-base" />
      </label>
      {state?.error ? (
        <p role="alert" className="rounded bg-danger-bg p-3 text-sm font-semibold text-danger">
          {state.error}
        </p>
      ) : null}
      <button disabled={pending} className="h-12 rounded-md bg-ink font-semibold text-bg transition-opacity hover:opacity-90 disabled:opacity-50">
        {pending ? "Logging in…" : "Log in"}
      </button>
    </form>
  );
}
