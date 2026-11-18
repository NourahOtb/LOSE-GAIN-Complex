"use client";

import { useMemo, useState, useTransition } from "react";

import { deskRegister } from "@/app/actions";
import { MarkPaid } from "@/components/mark-paid";

const DAYS: [string, string][] = [
  ["sat", "Sat"],
  ["sun", "Sun"],
  ["mon", "Mon"],
  ["tue", "Tue"],
  ["wed", "Wed"],
  ["thu", "Thu"],
];
const JS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const label = (s: string) => new Date(s + "T00:00:00").toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });

type Sport = "swimming" | "jiujitsu" | "both" | "pool";

/** Register a member at the desk. The server checks everything and sets the price (same as the app). */
export function DeskRegister({ kidId, adult, female }: { kidId: string; adult: boolean; female: boolean }) {
  const sports: [Sport, string][] = adult
    ? female
      ? [["jiujitsu", "Jiu-jitsu"], ["pool", "Open pool"]]
      : [["swimming", "Men's swimming"], ["jiujitsu", "Jiu-jitsu"], ["pool", "Open pool"]]
    : [["swimming", "Swimming"], ["jiujitsu", "Jiu-jitsu"], ["both", "Both"]];
  const [sport, setSport] = useState<Sport>(sports[0][0]);
  const [swim, setSwim] = useState<string[]>([]);
  const [bjj, setBjj] = useState<string[]>([]);
  const [swimTime, setSwimTime] = useState("16:00");
  const [adultTime, setAdultTime] = useState("18:00");
  const [duration, setDuration] = useState("4w");
  const [start, setStart] = useState("");
  const [pending, run] = useTransition();
  const [quote, setQuote] = useState<{ total?: number; end_date?: string; family_pct?: number } | null>(null);
  const [created, setCreated] = useState<{ id: string; total: number } | null>(null);
  const [error, setError] = useState("");

  const useSwim = sport === "swimming" || sport === "both";
  const useBjj = sport === "jiujitsu" || sport === "both";
  const chosen = [...(useSwim ? swim : []), ...(useBjj ? bjj : [])];
  const key = chosen.join(",");
  const dates = useMemo(() => {
    const days = key ? key.split(",") : [];
    const out: string[] = [];
    const now = new Date();
    for (let i = 0; i < 15; i++) {
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i);
      const wd = JS[d.getDay()];
      if (sport === "pool" ? wd !== "fri" : days.includes(wd)) out.push(iso(d));
    }
    return out;
  }, [sport, key]);
  const startDate = dates.includes(start) ? start : (dates[0] ?? "");

  const params = () => ({
    kid_id: kidId,
    kind: sport === "pool" ? "open_pool" : "classes",
    swim_days: useSwim ? swim : [],
    bjj_days: useBjj ? bjj : [],
    swim_time: swimTime,
    adult_time: adultTime,
    duration: sport === "pool" ? "4w" : duration,
    start_date: startDate,
  });
  const reset = () => {
    setQuote(null);
    setError("");
  };
  const toggle = (list: string[], set: (v: string[]) => void, d: string) => {
    reset();
    set(list.includes(d) ? list.filter((x) => x !== d) : [...list, d]);
  };
  const days = (title: string, list: string[], set: (v: string[]) => void) => (
    <fieldset>
      <legend className="label">{title}</legend>
      <div className="mt-1 flex flex-wrap gap-1.5">
        {DAYS.map(([v, l]) => (
          <button key={v} type="button" aria-pressed={list.includes(v)} onClick={() => toggle(list, set, v)} className={`h-10 min-w-14 rounded border-[1.5px] px-2 font-semibold ${list.includes(v) ? "border-ink bg-ink text-surface" : "border-line"}`}>
            {l}
          </button>
        ))}
      </div>
    </fieldset>
  );
  const select = "mt-1 block h-10 w-full rounded border-[1.5px] border-line bg-surface px-2";

  if (created) {
    return (
      <div className="rounded-md border-[1.5px] border-ink bg-surface p-4 text-[14px]">
        <p className="font-semibold">Registered · {created.total.toFixed(3)} KD · waiting for payment</p>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <MarkPaid id={created.id} />
          <button onClick={() => { setCreated(null); reset(); setSwim([]); setBjj([]); }} className="underline underline-offset-2">
            Register another
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-3 rounded-md border border-line bg-surface p-4 text-[14px]">
      <fieldset>
        <legend className="label">Sport</legend>
        <div className="mt-1 flex overflow-hidden rounded border-[1.5px] border-ink">
          {sports.map(([v, l]) => (
            <button key={v} type="button" aria-pressed={sport === v} onClick={() => { reset(); setSport(v); }} className={`h-10 flex-1 font-semibold ${sport === v ? "bg-ink text-surface" : ""}`}>
              {l}
            </button>
          ))}
        </div>
      </fieldset>
      {useSwim ? days("Swimming days", swim, setSwim) : null}
      {useSwim && !adult ? (
        <label>
          <span className="label">Swimming time</span>
          <select value={swimTime} onChange={(e) => { reset(); setSwimTime(e.target.value); }} className={select}>
            <option value="16:00">4:00 PM</option>
            <option value="17:00">5:00 PM</option>
          </select>
        </label>
      ) : null}
      {useBjj ? days("Jiu-jitsu days", bjj, setBjj) : null}
      {useBjj && adult && female ? (
        <label>
          <span className="label">Which class</span>
          <select value={adultTime} onChange={(e) => { reset(); setAdultTime(e.target.value); }} className={select}>
            <option value="18:00">6 PM · adult class</option>
            <option value="19:30">7:30 PM · women (Sun, Tue, Thu)</option>
          </select>
        </label>
      ) : null}
      <div className="grid grid-cols-2 gap-3">
        {sport !== "pool" ? (
          <label>
            <span className="label">Length</span>
            <select value={duration} onChange={(e) => { reset(); setDuration(e.target.value); }} className={select}>
              {[["1w", "1 week"], ["2w", "2 weeks"], ["4w", "4 weeks"], ["3m", "3 months"], ["6m", "6 months"], ["12m", "12 months"]].map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </select>
          </label>
        ) : null}
        <label>
          <span className="label">First day</span>
          <select value={startDate} onChange={(e) => { reset(); setStart(e.target.value); }} className={select} disabled={!dates.length}>
            {dates.length ? dates.map((d) => <option key={d} value={d}>{label(d)}</option>) : <option>Pick days first</option>}
          </select>
        </label>
      </div>

      {error ? <p className="font-semibold text-danger">{error}</p> : null}
      {quote?.total !== undefined ? (
        <p className="text-[16px]">
          <span className="num text-[28px]">{quote.total.toFixed(3)} KD</span>
          {quote.family_pct ? <span className="text-ink-soft"> · family discount {quote.family_pct}%</span> : null}
          {quote.end_date ? <span className="text-ink-soft"> · ends {label(quote.end_date)}</span> : null}
        </p>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={pending || !startDate}
          onClick={() =>
            run(async () => {
              setError("");
              const r = await deskRegister(params(), true);
              if (r.error) setError(r.error);
              else setQuote(r.data ?? null);
            })
          }
          className="h-10 rounded border-[1.5px] border-ink px-4 font-semibold disabled:opacity-40">
          Check price
        </button>
        <button
          type="button"
          disabled={pending || !quote}
          onClick={() =>
            run(async () => {
              const r = await deskRegister(params(), false);
              if (r.error) setError(r.error);
              else if (r.data?.id) setCreated({ id: r.data.id, total: Number(r.data.total ?? quote?.total ?? 0) });
            })
          }
          className="h-10 rounded border-[1.5px] border-ink bg-ink px-4 font-semibold text-surface disabled:opacity-40">
          {pending ? "Working…" : "Register"}
        </button>
      </div>
    </div>
  );
}
