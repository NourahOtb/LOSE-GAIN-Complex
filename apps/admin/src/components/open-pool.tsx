"use client";

import { useState, useTransition } from "react";

import { cancelOpenPool, decideFreeze } from "@/app/actions";

const SESSIONS = [
  ["morning", "Morning · 10:30 AM–3 PM"],
  ["evening", "Evening · 7:30–9 PM"],
  ["day", "Whole day"],
] as const;
const plus7 = (iso: string) => {
  const d = new Date(iso + "T00:00:00");
  d.setDate(d.getDate() + 7);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
const short = (iso: string) => new Date(iso + "T00:00:00").toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });

/** Open pool: members count, close a session (with notification + extra day), and freeze requests to approve. */
export function OpenPool({
  todayIso,
  members,
  freezes,
  closures,
}: {
  todayIso: string;
  members: number;
  freezes: { id: string; name: string; start: string; end: string }[];
  closures: { on_date: string; session: "morning" | "evening" | "day"; reason: string | null }[];
}) {
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState(todayIso);
  const [session, setSession] = useState<"morning" | "evening" | "day">("day");
  const [reason, setReason] = useState("");
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ error?: string; ok?: string } | null>(null);

  return (
    <section aria-labelledby="pool">
      <h2 id="pool" className="label mb-2">
        Open pool · {members} member{members === 1 ? "" : "s"}
      </h2>

      {closures.length ? (
        <ul className="mb-2 text-[14px]">
          {closures.map((c) => (
            <li key={c.on_date + c.session} className="flex gap-2 border-b border-line py-1.5">
              <span className="rounded bg-danger-bg px-1.5 text-xs font-semibold leading-6 text-danger">Closed</span>
              <span>
                {short(c.on_date)} · {SESSIONS.find((s) => s[0] === c.session)?.[1]}
                {c.reason ? <span className="text-ink-soft"> · {c.reason}</span> : null}
              </span>
            </li>
          ))}
        </ul>
      ) : null}

      {msg?.ok ? <p className="mb-2 text-sm font-semibold text-danger">{msg.ok}</p> : null}

      {!open ? (
        <button
          onClick={() => {
            setOpen(true);
            setMsg(null);
          }}
          className="rounded border-[1.5px] border-danger px-2.5 py-1 text-[13px] font-semibold text-danger hover:bg-danger-bg">
          Close the open pool…
        </button>
      ) : (
        <div className="rounded-md border-[1.5px] border-danger bg-surface p-3 text-sm">
          <p className="font-semibold">Members are told in the app and get one extra day on their membership.</p>
          <label className="mt-3 block">
            <span className="label">Date</span>
            <input type="date" value={date} min={todayIso} onChange={(e) => setDate(e.target.value)} className="mt-1 block h-10 rounded border-[1.5px] border-line bg-surface px-2.5" />
          </label>
          <fieldset className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5">
            <legend className="label mb-1.5">Which session</legend>
            {SESSIONS.map(([v, l]) => (
              <label key={v} className="flex items-center gap-1.5">
                <input type="radio" name="pool-session" checked={session === v} onChange={() => setSession(v)} className="accent-[var(--ink)]" />
                {l}
              </label>
            ))}
          </fieldset>
          <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Reason (optional, staff only)" className="mt-3 h-10 w-full rounded border-[1.5px] border-line bg-surface px-2.5" />
          {msg?.error ? <p className="mt-2 font-semibold text-danger">{msg.error}</p> : null}
          <div className="mt-3 flex gap-2">
            <button onClick={() => setOpen(false)} className="rounded border-[1.5px] border-ink px-3 py-1.5 font-semibold">
              Keep it open
            </button>
            <button
              disabled={pending}
              onClick={() =>
                start(async () => {
                  const r = await cancelOpenPool(date, session, reason);
                  setMsg(r);
                  if (r.ok) setOpen(false);
                })
              }
              className="rounded border-[1.5px] border-danger bg-danger px-3 py-1.5 font-semibold text-white disabled:opacity-50">
              {pending ? "Closing…" : "Close and notify"}
            </button>
          </div>
        </div>
      )}

      <h3 className="label mb-2 mt-5">Freeze requests · {freezes.length}</h3>
      {freezes.length === 0 ? (
        <p className="text-ink-soft">No freeze requests.</p>
      ) : (
        <ul className="text-[14px]">
          {freezes.map((f) => (
            <FreezeRow key={f.id} {...f} />
          ))}
        </ul>
      )}
    </section>
  );
}

function FreezeRow({ id, name, start: from, end }: { id: string; name: string; start: string; end: string }) {
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ error?: string; ok?: string } | null>(null);
  return (
    <li className="flex flex-wrap items-center gap-2 border-b border-line py-2">
      <span className="flex-1">
        <span className="font-semibold">{name}</span>
        <span className="block text-xs text-ink-soft">
          1 week from {short(from)} · ends {short(end)}, after approval {short(plus7(end))}
        </span>
      </span>
      {msg?.ok ? (
        <span className="text-sm font-semibold">{msg.ok}</span>
      ) : (
        <>
          <button disabled={pending} onClick={() => start(async () => setMsg(await decideFreeze(id, true)))} className="rounded border-[1.5px] border-ink bg-ink px-2.5 py-1 text-[13px] font-semibold text-surface disabled:opacity-50">
            Approve
          </button>
          <button disabled={pending} onClick={() => start(async () => setMsg(await decideFreeze(id, false)))} className="rounded border-[1.5px] border-ink px-2.5 py-1 text-[13px] font-semibold disabled:opacity-50">
            Reject
          </button>
        </>
      )}
      {msg?.error ? <span className="w-full text-sm font-semibold text-danger">{msg.error}</span> : null}
    </li>
  );
}
