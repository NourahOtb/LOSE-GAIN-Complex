"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { changeMyPassword } from "@/app/actions";

export function ChangePassword({ first }: { first: boolean }) {
  const router = useRouter();
  const [a, setA] = useState("");
  const [b, setB] = useState("");
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ error?: string; ok?: string } | null>(null);
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const r = await changeMyPassword(a, b);
          setMsg(r);
          if (r.ok) {
            setA("");
            setB("");
            if (first) router.replace("/");
          }
        });
      }}
      className="flex max-w-sm flex-col gap-3 rounded-md border border-line bg-surface p-4 text-sm">
      <label className="flex flex-col gap-1">
        <span className="label">New password</span>
        <input type="password" autoComplete="new-password" value={a} onChange={(e) => setA(e.target.value)} className="h-11 rounded border-[1.5px] border-ink bg-surface px-3" />
      </label>
      <label className="flex flex-col gap-1">
        <span className="label">Type it again</span>
        <input type="password" autoComplete="new-password" value={b} onChange={(e) => setB(e.target.value)} className="h-11 rounded border-[1.5px] border-ink bg-surface px-3" />
      </label>
      <p className="text-ink-soft">At least 8 characters.</p>
      <button disabled={pending || !a || !b} className="h-11 rounded border-[1.5px] border-ink bg-ink font-semibold text-surface disabled:opacity-40">
        {pending ? "Saving…" : "Save password"}
      </button>
      {msg?.ok ? <p className="font-semibold">{msg.ok}</p> : null}
      {msg?.error ? <p className="font-semibold text-danger">{msg.error}</p> : null}
    </form>
  );
}
