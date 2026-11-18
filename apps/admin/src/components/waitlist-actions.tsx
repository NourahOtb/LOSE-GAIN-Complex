"use client";

import { useState, useTransition } from "react";

import { offerWaitlist, removeWaitlist } from "@/app/actions";

export function WaitlistActions({ id, canOffer, highlight }: { id: string; canOffer: boolean; highlight: boolean }) {
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ error?: string; ok?: string } | null>(null);
  if (msg?.ok) return <span className="text-xs font-semibold">{msg.ok}</span>;
  return (
    <span className="flex flex-wrap items-center gap-1.5">
      {canOffer ? (
        <button
          disabled={pending}
          onClick={() => start(async () => setMsg(await offerWaitlist(id)))}
          className={`h-8 rounded border-[1.5px] border-ink px-2.5 text-xs font-semibold disabled:opacity-50 ${highlight ? "bg-ink text-surface" : ""}`}>
          Offer the place
        </button>
      ) : null}
      <button
        disabled={pending}
        onClick={() => {
          if (window.confirm("Take them off the waitlist?")) start(async () => setMsg(await removeWaitlist(id)));
        }}
        className="h-8 rounded border-[1.5px] border-line px-2.5 text-xs font-semibold disabled:opacity-50">
        Remove
      </button>
      {msg?.error ? <span className="text-xs font-semibold text-danger">{msg.error}</span> : null}
    </span>
  );
}
