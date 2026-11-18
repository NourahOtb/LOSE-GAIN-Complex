"use client";

import { useState, useTransition } from "react";

import { markPaid } from "@/app/actions";

/** Two quick buttons: paid on the KNET machine, or paid through a payment link. */
export function MarkPaid({ id }: { id: string }) {
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ error?: string; ok?: string } | null>(null);
  if (msg?.ok) return <span className="text-sm font-semibold text-swim">✓ Paid</span>;
  const go = (method: "knet_machine" | "payment_link") => start(async () => setMsg(await markPaid(id, method)));
  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex gap-1.5">
        <button
          onClick={() => go("knet_machine")}
          disabled={pending}
          className="whitespace-nowrap rounded border-[1.5px] border-ink bg-ink px-2.5 py-1.5 text-[13px] font-semibold text-bg hover:opacity-90 disabled:opacity-50">
          {pending ? "Saving…" : "Paid · KNET"}
        </button>
        <button
          onClick={() => go("payment_link")}
          disabled={pending}
          title="Paid through a UPayments link"
          className="whitespace-nowrap rounded border-[1.5px] border-ink px-2.5 py-1.5 text-[13px] font-semibold hover:bg-tile disabled:opacity-50">
          Paid · link
        </button>
      </div>
      {msg?.error ? <span className="text-xs font-semibold text-danger">{msg.error}</span> : null}
    </div>
  );
}
