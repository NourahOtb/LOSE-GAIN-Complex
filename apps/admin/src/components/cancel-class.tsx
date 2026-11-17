"use client";

import { useState, useTransition } from "react";

import { cancelClass } from "@/app/actions";

/** "Cancel class" with a confirm step: staff choose what parents get, then everyone affected is notified. */
export function CancelClass({ classId, dateIso, label, bookedCount }: { classId: string; dateIso: string; label: string; bookedCount: number }) {
  const [open, setOpen] = useState(false);
  const [comp, setComp] = useState<"makeup" | "extend" | "none">("makeup");
  const [reason, setReason] = useState("");
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ error?: string; ok?: string } | null>(null);

  if (msg?.ok) return <span className="text-sm font-semibold text-danger">{msg.ok}</span>;
  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="whitespace-nowrap rounded border-[1.5px] border-danger px-2.5 py-1 text-[13px] font-semibold text-danger hover:bg-danger-bg">
        Cancel class
      </button>
    );
  }
  return (
    <div className="mt-2 w-full rounded-md border-[1.5px] border-danger bg-surface p-3 text-sm">
      <p className="font-semibold">
        Cancel {label}? {bookedCount} {bookedCount === 1 ? "family" : "families"} will be notified in the app.
      </p>
      <fieldset className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5">
        <legend className="label mb-1.5">Parents get</legend>
        {(
          [
            ["makeup", "A make-up class"],
            ["extend", "End date +1 class"],
            ["none", "Nothing"],
          ] as const
        ).map(([v, l]) => (
          <label key={v} className="flex items-center gap-1.5">
            <input type="radio" name={`comp-${classId}`} checked={comp === v} onChange={() => setComp(v)} className="accent-[var(--ink)]" />
            {l}
          </label>
        ))}
      </fieldset>
      <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Reason (optional, staff only)" className="mt-3 h-10 w-full rounded border-[1.5px] border-line bg-surface px-2.5" />
      {msg?.error ? <p className="mt-2 font-semibold text-danger">{msg.error}</p> : null}
      <div className="mt-3 flex gap-2">
        <button onClick={() => setOpen(false)} className="rounded border-[1.5px] border-ink px-3 py-1.5 font-semibold">
          Keep class
        </button>
        <button
          disabled={pending}
          onClick={() => start(async () => setMsg(await cancelClass(classId, dateIso, comp, reason)))}
          className="rounded border-[1.5px] border-danger bg-danger px-3 py-1.5 font-semibold text-white disabled:opacity-50">
          {pending ? "Cancelling…" : "Yes, cancel and notify"}
        </button>
      </div>
    </div>
  );
}
