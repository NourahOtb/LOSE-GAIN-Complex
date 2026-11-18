"use client";

import type { PricingConfig } from "@lg/shared";
import { useState, useTransition } from "react";

import { savePricing } from "@/app/actions";

type Path = (string | number)[];

const getAt = (o: unknown, p: Path): number => p.reduce<unknown>((x, k) => (x as Record<string, unknown>)?.[String(k)], o) as number;
const setAt = (o: PricingConfig, p: Path, v: number): PricingConfig => {
  const copy = structuredClone(o) as unknown as Record<string, unknown>;
  let x = copy;
  for (const k of p.slice(0, -1)) x = x[String(k)] as Record<string, unknown>;
  x[String(p[p.length - 1])] = v;
  return copy as unknown as PricingConfig;
};

const WEEKS = [
  ["1", "1 week"],
  ["2", "2 weeks"],
  ["4", "4 weeks"],
] as const;

/** Owner edits every price and discount. Others see the same tables read-only. */
export function PriceEditor({ initial, canEdit }: { initial: PricingConfig; canEdit: boolean }) {
  const [cfg, setCfg] = useState(initial);
  const [saved, setSaved] = useState(initial);
  const [text, setText] = useState<Record<string, string>>({});
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ error?: string; ok?: string } | null>(null);
  const dirty = JSON.stringify(cfg) !== JSON.stringify(saved);
  const badKeys = Object.entries(text).filter(([, v]) => v.trim() === "" || !Number.isFinite(Number(v)) || Number(v) < 0).map(([k]) => k);

  const cell = (p: Path, opts: { pct?: boolean } = {}) => {
    const key = p.join(".");
    const value = getAt(cfg, p);
    if (value === undefined) return <span className="text-ink-soft">—</span>;
    const shown = text[key] ?? String(value);
    const changed = getAt(saved, p) !== value;
    const bad = badKeys.includes(key) || (opts.pct && Number(shown) > 100);
    if (!canEdit) return <span className="tabular-nums">{opts.pct ? `${value}%` : Number(value).toFixed(3)}</span>;
    return (
      <span className="inline-flex items-center gap-1">
        <input
          inputMode="decimal"
          aria-label={key}
          value={shown}
          onChange={(e) => {
            const v = e.target.value;
            setText((t) => ({ ...t, [key]: v }));
            const n = Number(v);
            if (v.trim() !== "" && Number.isFinite(n) && n >= 0) setCfg((c) => setAt(c, p, Math.round(n * 1000) / 1000));
            setMsg(null);
          }}
          className={`h-9 w-20 rounded border-[1.5px] bg-surface px-2 text-right tabular-nums ${bad ? "border-danger" : changed ? "border-ink font-semibold" : "border-line"}`}
        />
        {opts.pct ? <span className="text-ink-soft">%</span> : null}
      </span>
    );
  };

  const table = (title: string, base: Path, days: string[], note?: string) => (
    <section className="rounded-md border border-line bg-surface p-4">
      <h3 className="font-semibold">{title}</h3>
      {note ? <p className="text-xs text-ink-soft">{note}</p> : null}
      <div className="mt-2 overflow-x-auto">
        <table className="text-sm">
          <thead>
            <tr className="text-left text-xs text-ink-soft">
              <th className="py-1 pr-4 font-semibold">KD</th>
              {days.map((d) => (
                <th key={d} className="px-1 py-1 font-semibold">
                  {d} days
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {WEEKS.filter(([w]) => getAt(cfg, [...base, w]) !== undefined).map(([w, label]) => (
              <tr key={w}>
                <td className="py-1 pr-4 font-semibold whitespace-nowrap">{label}</td>
                {days.map((d) => (
                  <td key={d} className="px-1 py-1">
                    {cell([...base, w, d])}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );

  const days = (o: object) => [...new Set(Object.values(o).flatMap((row) => Object.keys(row ?? {})))].sort();

  return (
    <div className="flex flex-col gap-4">
      {table("Kids (swimming and Warriors jiu-jitsu)", ["kids"], days(cfg.kids), "3, 6 and 12 months = the 4-week price × months, minus the multi-month discount. 5–6 days a week are jiu-jitsu only.")}

      <div className="grid grid-cols-2 gap-4 max-md:grid-cols-1">
        <section className="rounded-md border border-line bg-surface p-4">
          <h3 className="font-semibold">Discounts (kids only)</h3>
          <p className="text-xs text-ink-soft">Family and multi-month discounts are added together.</p>
          <div className="mt-2 grid grid-cols-[auto_auto] items-center gap-x-4 gap-y-1.5 text-sm">
            {Object.keys(cfg.family).map((n) => (
              <FragmentRow key={`f${n}`} label={`Family · ${n === "5" ? "5 or more" : n} kids`}>
                {cell(["family", n], { pct: true })}
              </FragmentRow>
            ))}
            {Object.keys(cfg.months).map((m) => (
              <FragmentRow key={`m${m}`} label={`${m} months`}>
                {cell(["months", m], { pct: true })}
              </FragmentRow>
            ))}
          </div>
        </section>

        <section className="rounded-md border border-line bg-surface p-4">
          <h3 className="font-semibold">Adults</h3>
          <div className="mt-2 grid grid-cols-[auto_auto] items-center gap-x-4 gap-y-1.5 text-sm">
            {Object.keys(cfg.adults).map((d) => (
              <FragmentRow key={`a${d}`} label={`Men's swimming · 4 weeks · ${d} days`}>
                {cell(["adults", d])}
              </FragmentRow>
            ))}
            <FragmentRow label="Open pool · 4 weeks">{cell(["openPool"])}</FragmentRow>
          </div>
        </section>
      </div>

      {table("Men's jiu-jitsu (Titans 11–15 pay the 4-week prices)", ["adultBjj", "male"], days(cfg.adultBjj.male))}
      {table("Women's jiu-jitsu", ["adultBjj", "female"], days(cfg.adultBjj.female))}

      {canEdit ? (
        <div className="sticky bottom-0 -mx-1 flex flex-wrap items-center gap-3 border-t-2 border-ink bg-bg px-1 py-3">
          <button
            disabled={pending || !dirty || badKeys.length > 0}
            onClick={() =>
              start(async () => {
                const r = await savePricing(cfg);
                setMsg(r);
                if (r.ok) {
                  setSaved(cfg);
                  setText({});
                }
              })
            }
            className="h-10 rounded border-[1.5px] border-ink bg-ink px-4 font-semibold text-surface disabled:opacity-40">
            {pending ? "Saving…" : "Save prices"}
          </button>
          {dirty ? (
            <button
              onClick={() => {
                setCfg(saved);
                setText({});
                setMsg(null);
              }}
              className="h-10 rounded border-[1.5px] border-ink px-4 font-semibold">
              Undo changes
            </button>
          ) : null}
          <span className="text-sm text-ink-soft">{badKeys.length ? "Fix the boxes in red." : dirty ? "Changed boxes are bold. Existing registrations keep their price." : "No changes."}</span>
          {msg?.ok ? <span className="text-sm font-semibold">{msg.ok}</span> : null}
          {msg?.error ? <span className="text-sm font-semibold text-danger">{msg.error}</span> : null}
        </div>
      ) : (
        <p className="text-sm text-ink-soft">Only the owner can change prices.</p>
      )}
    </div>
  );
}

function FragmentRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <>
      <span>{label}</span>
      <span>{children}</span>
    </>
  );
}
