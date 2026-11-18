"use client";

import { useState, useTransition } from "react";

import { changeDays } from "@/app/actions";

const DAYS = ["sat", "sun", "mon", "tue", "wed", "thu"] as const;
const DAY: Record<string, string> = { sat: "Sat", sun: "Sun", mon: "Mon", tue: "Tue", wed: "Wed", thu: "Thu" };

/** Reception changes the days of a registration (after approving a change request). Same number of days → same price. */
export function ChangeDays({ subId, swim, bjj, swimTime, kid }: { subId: string; swim: string[]; bjj: string[]; swimTime: string; kid: boolean }) {
  const [open, setOpen] = useState(false);
  const [s, setS] = useState<string[]>(swim);
  const [b, setB] = useState<string[]>(bjj);
  const [time, setTime] = useState(swimTime.slice(0, 5) === "17:00" ? "17:00" : "16:00");
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ error?: string; ok?: string } | null>(null);

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="text-sm font-semibold underline underline-offset-2">
        Change days
      </button>
    );
  }

  const row = (label: string, value: string[], set: (v: string[]) => void, need: number, color: string) => (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="w-24 text-xs font-semibold">
        {label} · {value.length}/{need}
      </span>
      {DAYS.map((d) => {
        const on = value.includes(d);
        return (
          <button
            key={d}
            type="button"
            aria-pressed={on}
            onClick={() => set(on ? value.filter((x) => x !== d) : [...value, d])}
            className="h-8 w-11 rounded border-[1.5px] text-xs font-semibold"
            style={on ? { background: color, borderColor: color, color: "white" } : { borderColor: "var(--line)" }}>
            {DAY[d]}
          </button>
        );
      })}
    </div>
  );
  const ok = s.length === swim.length && b.length === bjj.length;

  return (
    <div className="w-full rounded border border-line bg-tile/50 p-3">
      <div className="flex flex-col gap-2">
        {swim.length ? row("Swimming", s, setS, swim.length, "var(--swim)") : null}
        {swim.length && kid ? (
          <label className="flex items-center gap-2 text-xs font-semibold">
            Swim time
            <select value={time} onChange={(e) => setTime(e.target.value)} className="h-8 rounded border-[1.5px] border-line bg-surface px-1.5 font-normal">
              <option value="16:00">4:00 PM</option>
              <option value="17:00">5:00 PM</option>
            </select>
          </label>
        ) : null}
        {bjj.length ? row("Jiu-jitsu", b, setB, bjj.length, "var(--bjj)") : null}
        {bjj.length ? <p className="text-xs text-ink-soft">Jiu-jitsu times follow the timetable for the member&apos;s age group.</p> : null}
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button
          disabled={pending || !ok}
          onClick={() => start(async () => setMsg(await changeDays(subId, DAYS.filter((d) => s.includes(d)), DAYS.filter((d) => b.includes(d)), time)))}
          className="h-9 rounded border-[1.5px] border-ink bg-ink px-3 text-sm font-semibold text-surface disabled:opacity-50">
          {pending ? "Saving…" : "Save days"}
        </button>
        <button onClick={() => setOpen(false)} className="h-9 rounded border-[1.5px] border-ink px-3 text-sm font-semibold">
          Close
        </button>
        {msg?.ok ? <span className="text-sm font-semibold">{msg.ok}</span> : null}
        {msg?.error ? <span className="text-sm font-semibold text-danger">{msg.error}</span> : null}
      </div>
    </div>
  );
}
