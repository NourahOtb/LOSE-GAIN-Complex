"use client";

import { useState, useTransition } from "react";

import { updateClass } from "@/app/actions";

const PLACES: Record<string, [string, string][]> = {
  swimming: [
    ["kids_pool", "Kids pool"],
    ["olympic_pool", "Olympic pool"],
  ],
  jiujitsu: [
    ["mat_1", "Mat 1"],
    ["mat_2", "Mat 2"],
  ],
};

/** Edit one class: time, length, coach, place, or switch it off. */
export function ClassEditor({
  cls,
  coaches,
}: {
  cls: { id: string; start: string; duration: number; coach: string; location: string; sport: "swimming" | "jiujitsu"; capacity: number };
  coaches: { id: string; full_name: string }[];
}) {
  const [open, setOpen] = useState(false);
  const [start, setStart] = useState(cls.start);
  const [duration, setDuration] = useState(cls.duration);
  const [coach, setCoach] = useState(cls.coach);
  const [location, setLocation] = useState(cls.location);
  const [capacity, setCapacity] = useState(cls.capacity);
  const [pending, run] = useTransition();
  const [msg, setMsg] = useState<{ error?: string; ok?: string } | null>(null);

  const save = (active: boolean) =>
    run(async () => {
      const r = await updateClass(cls.id, { start, duration, coach, location, active, capacity: capacity !== cls.capacity ? capacity : undefined });
      setMsg(r);
      if (r.ok) setOpen(false);
    });

  if (!open) {
    return (
      <span className="inline-flex items-center gap-2">
        {msg?.ok ? <span className="text-xs font-semibold text-ink-soft">{msg.ok}</span> : null}
        <button onClick={() => setOpen(true)} className="rounded border-[1.5px] border-ink px-2.5 py-1 text-[13px] font-semibold">
          Edit
        </button>
      </span>
    );
  }
  const field = "mt-1 block h-9 w-full rounded border-[1.5px] border-line bg-surface px-2";
  return (
    <div className="grid w-[300px] gap-2 rounded-md border-[1.5px] border-ink bg-surface p-3 text-left text-sm">
      <label>
        <span className="label">Start time</span>
        <input type="time" value={start} onChange={(e) => setStart(e.target.value)} className={field} />
      </label>
      <label>
        <span className="label">Length (minutes)</span>
        <input type="number" min={15} max={240} step={15} value={duration} onChange={(e) => setDuration(Number(e.target.value))} className={field} />
      </label>
      <label>
        <span className="label">Places (capacity)</span>
        <input type="number" min={1} max={200} value={capacity} onChange={(e) => setCapacity(Number(e.target.value))} className={field} />
      </label>
      <label>
        <span className="label">Coach</span>
        <select value={coach} onChange={(e) => setCoach(e.target.value)} className={field}>
          <option value="">Not set</option>
          {coaches.map((c) => (
            <option key={c.id} value={c.id}>
              {c.full_name}
            </option>
          ))}
        </select>
      </label>
      <label>
        <span className="label">Place</span>
        <select value={location} onChange={(e) => setLocation(e.target.value)} className={field}>
          {PLACES[cls.sport].map(([v, l]) => (
            <option key={v} value={v}>
              {l}
            </option>
          ))}
        </select>
      </label>
      {msg?.error ? <p className="font-semibold text-danger">{msg.error}</p> : null}
      <div className="mt-1 flex flex-wrap gap-2">
        <button disabled={pending} onClick={() => save(true)} className="rounded border-[1.5px] border-ink bg-ink px-3 py-1.5 font-semibold text-surface disabled:opacity-50">
          {pending ? "Saving…" : "Save"}
        </button>
        <button onClick={() => setOpen(false)} className="rounded border-[1.5px] border-ink px-3 py-1.5 font-semibold">
          Close
        </button>
        <button
          disabled={pending}
          onClick={() => {
            if (window.confirm("Switch this class off? It disappears from the timetable; members stay registered.")) save(false);
          }}
          className="ml-auto rounded px-2 py-1.5 font-semibold text-danger">
          Switch off
        </button>
      </div>
    </div>
  );
}
