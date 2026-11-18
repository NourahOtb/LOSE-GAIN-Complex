"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";

import { checkIn, undoCheckIn } from "@/app/actions";

export type DoorClass = { id: string; label: string; time: string; startMin: number; durationMin: number; sport: "swimming" | "jiujitsu"; capacity: number; free: boolean };
export type DoorRow = {
  id: string;
  name: string;
  sub: string;
  photo: string | null;
  health: string[];
  status: "paid" | "unpaid" | "later" | "expired" | "none";
  sessionsLeft: number | null;
  endsOn: string | null;
  startsOn: string | null;
  guardian: string | null;
};

const short = (iso: string) => new Date(iso + "T00:00:00").toLocaleDateString("en-GB", { day: "numeric", month: "short" });
const clock = (iso: string) => new Date(iso).toLocaleTimeString("en-GB", { hour: "numeric", minute: "2-digit", hour12: true });
const addDays = (iso: string, n: number) => {
  const d = new Date(iso + "T00:00:00");
  d.setDate(d.getDate() + n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

/** Touch-first door check-in: pick the class, tap each member in. Red = check before letting in. */
export function DoorBoard({
  dateIso,
  todayIso,
  canCheckIn,
  classes,
  rosters,
  present: presentInit,
  members,
}: {
  dateIso: string;
  todayIso: string;
  canCheckIn: boolean;
  classes: DoorClass[];
  rosters: Record<string, DoorRow[]>;
  present: Record<string, string>;
  members: { id: string; name: string; age: number }[];
}) {
  const router = useRouter();
  // start on the class happening now (or next) that has people booked
  const [classId, setClassId] = useState(() => {
    const booked = classes.filter((c) => (rosters[c.id] ?? []).length);
    if (dateIso === todayIso) {
      const d = new Date();
      const now = d.getHours() * 60 + d.getMinutes();
      const current = booked.find((c) => c.startMin + c.durationMin > now - 15);
      if (current) return current.id;
    }
    return (booked[0] ?? classes[0])?.id ?? "";
  });
  const [present, setPresent] = useState(presentInit);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [, start] = useTransition();
  const cls = classes.find((c) => c.id === classId) ?? classes[0];
  const rows = cls ? (rosters[cls.id] ?? []) : [];
  const here = rows.filter((r) => present[`${r.id}|${cls?.id}`]).length;

  // keep local state in step with fresh server data
  const [seen, setSeen] = useState(presentInit);
  if (seen !== presentInit) {
    setSeen(presentInit);
    setPresent(presentInit);
  }

  const toggle = (memberId: string) => {
    if (!cls || !canCheckIn) return;
    const key = `${memberId}|${cls.id}`;
    const was = present[key];
    setError("");
    setPresent((p) => {
      const n = { ...p };
      if (was) delete n[key];
      else n[key] = new Date().toISOString();
      return n;
    });
    start(async () => {
      const r = was ? await undoCheckIn(memberId, cls.id, dateIso) : await checkIn(memberId, cls.id, dateIso);
      if (r.error) {
        setError(r.error);
        setPresent((p) => ({ ...p, ...(was ? { [key]: was } : {}) }));
        if (!was) setPresent((p) => Object.fromEntries(Object.entries(p).filter(([k]) => k !== key)));
      }
      router.refresh();
    });
  };

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (q.length < 2) return [];
    return members.filter((m) => m.name.toLowerCase().includes(q) && !rows.some((r) => r.id === m.id)).slice(0, 6);
  }, [query, members, rows]);

  const go = (iso: string) => router.push(`/check-in?date=${iso}`);

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[26px] font-semibold leading-tight">Check-in</h1>
          <p className="text-ink-soft">
            {new Date(dateIso + "T00:00:00").toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })}
            {dateIso === todayIso ? " · today" : ""}
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => go(addDays(dateIso, -1))} className="h-11 rounded border-[1.5px] border-ink px-4 font-semibold">
            ← Day before
          </button>
          {dateIso !== todayIso ? (
            <button onClick={() => go(todayIso)} className="h-11 rounded border-[1.5px] border-ink px-4 font-semibold">
              Today
            </button>
          ) : null}
          <button onClick={() => go(addDays(dateIso, 1))} className="h-11 rounded border-[1.5px] border-ink px-4 font-semibold">
            Day after →
          </button>
        </div>
      </div>

      {classes.length === 0 ? (
        <p className="mt-6 text-ink-soft">No classes on this day.</p>
      ) : (
        <>
          {/* class picker: big tabs for the tablet */}
          <div role="tablist" className="mt-5 flex gap-2 overflow-x-auto pb-1">
            {classes.map((c) => {
              const on = c.id === cls?.id;
              const n = (rosters[c.id] ?? []).length;
              return (
                <button
                  key={c.id}
                  role="tab"
                  aria-selected={on}
                  onClick={() => setClassId(c.id)}
                  className={`min-h-14 shrink-0 rounded-md border-[1.5px] px-4 py-2 text-left ${on ? "border-ink bg-ink text-surface" : "border-line bg-surface"}`}>
                  <div className="num text-[20px] leading-tight">{c.time}</div>
                  <div className="text-[13px] opacity-80">
                    {c.label} · {n} booked
                  </div>
                </button>
              );
            })}
          </div>

          {cls ? (
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-b-2 border-ink pb-2">
              <div className="text-[15px]">
                <span className="num text-[28px]">{here}</span>
                <span className="text-ink-soft"> / {rows.length} here</span>
                {cls.free ? <span className="ml-2 rounded bg-tile px-2 py-0.5 text-xs font-semibold text-swim">Free session</span> : null}
              </div>
              {!canCheckIn ? <span className="text-sm text-ink-soft">View only: reception checks members in.</span> : null}
            </div>
          ) : null}

          {error ? <p className="mt-3 rounded bg-danger-bg px-3 py-2 font-semibold text-danger">{error}</p> : null}

          <ul className="mt-1">
            {rows.map((r) => {
              const at = cls ? present[`${r.id}|${cls.id}`] : undefined;
              const warn = r.status !== "paid";
              return (
                <li key={r.id} className={`flex flex-wrap items-center gap-3 border-b border-line py-3 ${warn ? "bg-danger-bg/40" : ""}`}>
                  {r.photo ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={r.photo} alt="" className="h-14 w-14 shrink-0 rounded-full object-cover" />
                  ) : (
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-tile text-base font-semibold text-swim">
                      {r.name
                        .split(/\s+/)
                        .slice(0, 2)
                        .map((w) => w[0])
                        .join("")
                        .toUpperCase()}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="text-[18px] font-semibold">{r.name}</div>
                    <div className="text-sm text-ink-soft">
                      {r.sub}
                      {r.guardian ? ` · ${r.guardian}` : ""}
                    </div>
                    <div className="mt-1 flex flex-wrap gap-1.5">
                      {r.health.length ? <span className="rounded bg-danger-bg px-2 py-0.5 text-xs font-semibold text-danger">Health: {r.health.join(", ")}</span> : null}
                      {r.status === "paid" ? (
                        <span className="rounded bg-tile px-2 py-0.5 text-xs font-semibold">
                          {r.sessionsLeft} left · ends {r.endsOn ? short(r.endsOn) : ""}
                        </span>
                      ) : r.status === "unpaid" ? (
                        <span className="rounded bg-danger px-2 py-0.5 text-xs font-semibold text-white">Not paid yet</span>
                      ) : r.status === "later" ? (
                        <span className="rounded bg-danger px-2 py-0.5 text-xs font-semibold text-white">Not this day · starts {r.startsOn ? short(r.startsOn) : ""}</span>
                      ) : r.status === "expired" ? (
                        <span className="rounded bg-danger px-2 py-0.5 text-xs font-semibold text-white">Expired {r.endsOn ? short(r.endsOn) : ""}</span>
                      ) : (
                        <span className="rounded bg-danger px-2 py-0.5 text-xs font-semibold text-white">No registration</span>
                      )}
                    </div>
                  </div>
                  {at ? (
                    <button
                      onClick={() => toggle(r.id)}
                      disabled={!canCheckIn}
                      className="min-h-14 min-w-40 rounded-md border-[1.5px] border-swim bg-tile px-4 text-left font-semibold text-swim"
                      aria-label={`${r.name} is checked in. Tap to undo.`}>
                      ✓ Here · {clock(at)}
                      <span className="block text-xs font-normal text-ink-soft">Tap to undo</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => toggle(r.id)}
                      disabled={!canCheckIn}
                      className={`min-h-14 min-w-40 rounded-md px-4 text-[17px] font-semibold disabled:opacity-40 ${warn ? "border-[1.5px] border-danger bg-surface text-danger" : "bg-ink text-surface"}`}>
                      {warn ? "Let in anyway" : "Check in"}
                    </button>
                  )}
                </li>
              );
            })}
            {rows.length === 0 ? <li className="py-4 text-ink-soft">Nobody booked in this class.</li> : null}
          </ul>

          {/* walk-in: someone not on the list */}
          {canCheckIn && cls ? (
            <div className="mt-6 max-w-xl">
              <label className="label" htmlFor="walkin">
                Someone not on the list?
              </label>
              <input
                id="walkin"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Type a name"
                className="mt-1 h-12 w-full rounded border-[1.5px] border-ink bg-surface px-3 text-[16px]"
              />
              {matches.length ? (
                <ul className="mt-2 rounded-md border border-line bg-surface">
                  {matches.map((m) => (
                    <li key={m.id} className="flex items-center justify-between gap-2 border-b border-line px-3 py-2 last:border-0">
                      <span>
                        <span className="font-semibold">{m.name}</span> <span className="text-ink-soft">· {m.age} yrs</span>
                      </span>
                      <button
                        onClick={() => {
                          setQuery("");
                          toggle(m.id);
                        }}
                        className="min-h-11 rounded border-[1.5px] border-ink px-3 font-semibold">
                        Check in to {cls.time}
                      </button>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
