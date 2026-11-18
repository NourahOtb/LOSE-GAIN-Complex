"use client";

import Link from "next/link";
import { useState, useTransition } from "react";

import { decideRequest, recordRefund } from "@/app/actions";
import { REQUEST_KIND } from "@/lib/data";

export type RequestItem = {
  id: string;
  kind: "pause" | "injury_pause" | "switch" | "cancel";
  member: string;
  memberId: string;
  guardian: string;
  phone: string | null;
  registration: string;
  dates: string;
  paid: number | null;
  note: string | null;
  pause: string | null;
  created_at: string;
};

const KIND = REQUEST_KIND;

const when = (iso: string) => new Date(iso).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });

function Head({ r }: { r: RequestItem }) {
  return (
    <>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <span className="font-semibold">
          <Link href={`/kids/${r.memberId}`} className="underline underline-offset-2">
            {r.member}
          </Link>
          <span className="font-normal text-ink-soft">
            {" "}
            · {r.guardian}
            {r.phone ? ` · ${r.phone}` : ""}
          </span>
        </span>
        <span className="text-xs text-ink-soft">{when(r.created_at)}</span>
      </div>
      <div className="mt-0.5 text-xs text-ink-soft">
        {r.registration} · {r.dates}
      </div>
    </>
  );
}

/** A request waiting for reception: approve or reject, with an optional message to the guardian. */
export function RequestCard({ r, canApprove }: { r: RequestItem; canApprove: boolean }) {
  const [reply, setReply] = useState("");
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ error?: string; ok?: string } | null>(null);
  const decide = (approve: boolean) => start(async () => setMsg(await decideRequest(r.id, approve, reply)));
  return (
    <li className="rounded-md border border-line bg-surface p-4">
      <div className={`label mb-1 ${r.kind === "cancel" ? "text-danger" : r.kind === "injury_pause" ? "text-bjj" : ""}`}>{KIND[r.kind]}</div>
      <Head r={r} />
      {r.pause ? <p className="mt-2 font-semibold">{r.pause}</p> : null}
      {r.note ? <p className="mt-1.5 whitespace-pre-wrap rounded bg-tile px-3 py-2">{r.note}</p> : null}
      {r.kind === "cancel" ? (
        <p className="mt-1.5 text-xs text-ink-soft">{r.paid ? `Paid ${r.paid.toFixed(3)} KD. If you approve, the owner or accountant records the refund.` : "Not paid yet: no refund needed."}</p>
      ) : null}
      {r.kind === "switch" ? <p className="mt-1.5 text-xs text-ink-soft">After approving, change the days on the member page (same number of days, same price).</p> : null}

      {msg?.ok ? (
        <p className="mt-3 text-sm font-semibold">
          {msg.ok}
          {r.kind === "switch" && msg.ok.startsWith("Approved") ? (
            <>
              {" · "}
              <Link href={`/kids/${r.memberId}#regs`} className="underline underline-offset-2">
                Change the days now
              </Link>
            </>
          ) : null}
        </p>
      ) : canApprove ? (
        <div className="mt-3 flex flex-wrap gap-2">
          <input
            value={reply}
            onChange={(e) => setReply(e.target.value)}
            placeholder="Message to the guardian (optional)"
            aria-label="Message to the guardian"
            className="h-10 min-w-48 flex-1 rounded border-[1.5px] border-line bg-surface px-2.5"
          />
          <button disabled={pending} onClick={() => decide(true)} className="h-10 rounded border-[1.5px] border-ink bg-ink px-4 font-semibold text-surface disabled:opacity-50">
            Approve
          </button>
          <button disabled={pending} onClick={() => decide(false)} className="h-10 rounded border-[1.5px] border-ink px-4 font-semibold disabled:opacity-50">
            Reject
          </button>
        </div>
      ) : (
        <p className="mt-3 text-sm text-ink-soft">Reception, a manager or the owner approves this.</p>
      )}
      {msg?.error ? <p className="mt-1.5 text-sm font-semibold text-danger">{msg.error}</p> : null}
    </li>
  );
}

/** A cancelled, paid registration: the owner or accountant records what was refunded (0 = nothing). */
export function RefundCard({ r, canRefund }: { r: RequestItem; canRefund: boolean }) {
  const [amount, setAmount] = useState(r.paid ? r.paid.toFixed(3) : "0");
  const [method, setMethod] = useState<"knet" | "bank_transfer" | "cash">("knet");
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ error?: string; ok?: string } | null>(null);
  return (
    <li className="rounded-md border border-line bg-surface p-4">
      <Head r={r} />
      <p className="mt-1.5 text-sm">
        Paid <span className="font-semibold">{(r.paid ?? 0).toFixed(3)} KD</span>
        {r.note ? <span className="text-ink-soft"> · reason: {r.note}</span> : null}
      </p>
      {msg?.ok ? (
        <p className="mt-3 text-sm font-semibold">{msg.ok}</p>
      ) : canRefund ? (
        <div className="mt-3 flex flex-wrap items-end gap-2">
          <label className="flex flex-col gap-1 text-xs font-semibold">
            Refund (KD)
            <input type="number" min={0} max={r.paid ?? 0} step="0.001" value={amount} onChange={(e) => setAmount(e.target.value)} className="h-10 w-32 rounded border-[1.5px] border-line bg-surface px-2.5 text-[15px] font-normal tabular-nums" />
          </label>
          <label className="flex flex-col gap-1 text-xs font-semibold">
            Returned by
            <select value={method} onChange={(e) => setMethod(e.target.value as typeof method)} className="h-10 rounded border-[1.5px] border-line bg-surface px-2 text-[15px] font-normal">
              <option value="knet">KNET</option>
              <option value="bank_transfer">Bank transfer</option>
              <option value="cash">Cash</option>
            </select>
          </label>
          <button
            disabled={pending}
            onClick={() => start(async () => setMsg(await recordRefund(r.id, Number(amount), method)))}
            className="h-10 rounded border-[1.5px] border-ink bg-ink px-4 font-semibold text-surface disabled:opacity-50">
            {pending ? "Saving…" : "Record refund"}
          </button>
        </div>
      ) : (
        <p className="mt-3 text-sm text-ink-soft">Waiting for the owner or the accountant.</p>
      )}
      {msg?.error ? <p className="mt-1.5 text-sm font-semibold text-danger">{msg.error}</p> : null}
    </li>
  );
}
