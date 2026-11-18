"use client";

import { useState, useTransition } from "react";

import { closeDays, reopenDay } from "@/app/actions";

/** Form to close the complex for one day or several days in a row. */
export function CloseDays({ todayIso }: { todayIso: string }) {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [reason, setReason] = useState("");
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ error?: string; ok?: string } | null>(null);

  return (
    <div className="rounded-md border border-line bg-surface p-4 text-sm">
      <div className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1">
          <span className="label">From</span>
          <input
            type="date"
            value={from}
            min={todayIso}
            onChange={(e) => {
              setFrom(e.target.value);
              if (!to || to < e.target.value) setTo(e.target.value);
            }}
            className="h-10 rounded border-[1.5px] border-line bg-surface px-2.5"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="label">To (same day for one day)</span>
          <input type="date" value={to} min={from || todayIso} onChange={(e) => setTo(e.target.value)} className="h-10 rounded border-[1.5px] border-line bg-surface px-2.5" />
        </label>
        <label className="flex min-w-56 flex-1 flex-col gap-1">
          <span className="label">Reason (families see it)</span>
          <input value={reason} maxLength={200} onChange={(e) => setReason(e.target.value)} placeholder="e.g. National Day" className="h-10 rounded border-[1.5px] border-line bg-surface px-2.5" />
        </label>
      </div>
      <p className="mt-3 text-ink-soft">Every class a member misses is added to the end of their registration. Open pool members get 1 extra day per closed day. Families get a message in the app. Fridays are skipped.</p>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <button
          disabled={pending || !from}
          onClick={() =>
            start(async () => {
              const r = await closeDays(from, to, reason);
              setMsg(r);
              if (r.ok) {
                setFrom("");
                setTo("");
                setReason("");
              }
            })
          }
          className="h-10 rounded border-[1.5px] border-danger bg-danger px-4 font-semibold text-white disabled:opacity-50">
          {pending ? "Closing…" : "Close the complex"}
        </button>
        {msg?.ok ? <span className="font-semibold">{msg.ok}</span> : null}
        {msg?.error ? <span className="font-semibold text-danger">{msg.error}</span> : null}
      </div>
    </div>
  );
}

/** Undo one upcoming closure. */
export function Reopen({ date }: { date: string }) {
  const [pending, start] = useTransition();
  const [sure, setSure] = useState(false);
  const [msg, setMsg] = useState<{ error?: string; ok?: string } | null>(null);
  if (msg?.ok) return <span className="text-xs font-semibold">{msg.ok}</span>;
  return (
    <span className="flex items-center gap-2">
      {msg?.error ? <span className="text-xs font-semibold text-danger">{msg.error}</span> : null}
      {sure ? (
        <>
          <button disabled={pending} onClick={() => start(async () => setMsg(await reopenDay(date)))} className="rounded border-[1.5px] border-ink bg-ink px-2.5 py-1 text-xs font-semibold text-surface disabled:opacity-50">
            {pending ? "Opening…" : "Yes, open this day"}
          </button>
          <button onClick={() => setSure(false)} className="text-xs underline underline-offset-2">
            Keep closed
          </button>
        </>
      ) : (
        <button onClick={() => setSure(true)} className="rounded border-[1.5px] border-ink px-2.5 py-1 text-xs font-semibold">
          Open after all
        </button>
      )}
    </span>
  );
}
