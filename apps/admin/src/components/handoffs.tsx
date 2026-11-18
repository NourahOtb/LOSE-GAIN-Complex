"use client";

import { useState, useTransition } from "react";

import { answerHandoff } from "@/app/actions";

export type Handoff = { id: string; parent: string; phone: string | null; summary: string; created_at: string };

/** Requests the AI assistant passed to reception; reply goes to the guardian's app inbox. */
export function Handoffs({ items }: { items: Handoff[] }) {
  return (
    <section aria-labelledby="handoffs">
      <h2 id="handoffs" className="label mb-2">
        Assistant requests · {items.length}
      </h2>
      {items.length === 0 ? (
        <p className="text-ink-soft">Nothing waiting from the assistant.</p>
      ) : (
        <ul className="text-[14px]">
          {items.map((h) => (
            <Row key={h.id} {...h} />
          ))}
        </ul>
      )}
    </section>
  );
}

function Row({ id, parent, phone, summary, created_at }: Handoff) {
  const [reply, setReply] = useState("");
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ error?: string; ok?: string } | null>(null);
  return (
    <li className="border-b border-line py-2.5">
      <div className="flex flex-wrap justify-between gap-2">
        <span className="font-semibold">
          {parent}
          {phone ? <span className="font-normal text-ink-soft"> · {phone}</span> : null}
        </span>
        <span className="text-xs text-ink-soft">{new Date(created_at).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })}</span>
      </div>
      <p className="mt-1">{summary}</p>
      {msg?.ok ? (
        <p className="mt-1 text-sm font-semibold">{msg.ok}</p>
      ) : (
        <div className="mt-2 flex gap-2">
          <input value={reply} onChange={(e) => setReply(e.target.value)} placeholder="Reply to the guardian" className="h-9 min-w-0 flex-1 rounded border-[1.5px] border-line bg-surface px-2.5" />
          <button
            disabled={pending}
            onClick={() => start(async () => setMsg(await answerHandoff(id, reply)))}
            className="rounded border-[1.5px] border-ink bg-ink px-3 font-semibold text-surface disabled:opacity-50">
            {pending ? "Sending…" : "Reply"}
          </button>
        </div>
      )}
      {msg?.error ? <p className="mt-1 text-sm font-semibold text-danger">{msg.error}</p> : null}
    </li>
  );
}
