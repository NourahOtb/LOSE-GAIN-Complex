import Link from "next/link";
import { redirect } from "next/navigation";

import { requireStaff } from "@/lib/auth";
import { kuwaitToday } from "@/lib/checkin";
import { kd, shortDate } from "@/lib/data";
import { buildMoney, loadMoneyData, METHOD } from "@/lib/money";
import { monthRange } from "@/lib/reports";

const MONEY_ROLES = ["super_admin", "accountant", "manager"];

function Delta({ now, before, good = "up" }: { now: number; before: number; good?: "up" | "down" }) {
  const d = Math.round((now - before) * 1000) / 1000;
  if (d === 0) return <span className="text-xs text-ink-soft">same as last month</span>;
  const better = good === "up" ? d > 0 : d < 0;
  const pctTxt = before ? ` (${d > 0 ? "+" : ""}${Math.round((d / before) * 100)}%)` : "";
  return (
    <span className={`text-xs font-semibold ${better ? "text-swim" : "text-danger"}`}>
      {d > 0 ? "▲" : "▼"} {kd(Math.abs(d))} KD{pctTxt} vs last month
    </span>
  );
}

function Bars({ rows, total }: { rows: [string, number, number, string][]; total: number }) {
  return (
    <div className="rounded-md border border-line bg-surface p-4 text-sm">
      {rows.map(([l, n, b, c]) => (
        <div key={l} className="flex items-center gap-3 py-1">
          <span className="w-40">{l}</span>
          <span className="h-2 flex-1 rounded bg-line" aria-hidden>
            <span className="block h-full rounded" style={{ width: `${total ? (n / total) * 100 : 0}%`, background: c }} />
          </span>
          <span className="w-24 text-right font-semibold tabular-nums">{kd(n)}</span>
          <span className="w-20 text-right text-xs text-ink-soft tabular-nums">{b === n ? "same" : `${n - b > 0 ? "+" : "−"}${kd(Math.abs(n - b))}`}</span>
        </div>
      ))}
    </div>
  );
}

export default async function MoneyPage({ searchParams }: PageProps<"/money">) {
  const { supabase, profile } = await requireStaff();
  if (!MONEY_ROLES.includes(profile.role)) redirect("/");
  const sp = await searchParams;
  const today = kuwaitToday();
  const month = typeof sp.month === "string" && /^\d{4}-\d{2}$/.test(sp.month) ? sp.month : today.slice(0, 7);
  const { prev } = monthRange(month);
  const next = new Date(Date.UTC(Number(month.slice(0, 4)), Number(month.slice(5, 7)), 1)).toISOString().slice(0, 7);

  const data = await loadMoneyData(supabase);
  const m = buildMoney(data, month);
  const p = buildMoney(data, prev);
  const maxDay = Math.max(1, ...m.daily.map((x) => x.amount));

  const tiles = [
    { n: m.net, before: p.net, l: "net income (KD)", sub: `${kd(m.gross)} paid − ${kd(m.refunded)} refunded` },
    { n: m.gross, before: p.gross, l: "payments (KD)", sub: `${m.count} payment${m.count === 1 ? "" : "s"} · average ${kd(m.average)}` },
    { n: m.discounts, before: p.discounts, l: "discounts given (KD)", sub: "family + multi-month", good: "down" as const },
    { n: m.refunded, before: p.refunded, l: "refunds (KD)", sub: `${m.refundList.length} refund${m.refundList.length === 1 ? "" : "s"}`, good: "down" as const },
  ];

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[26px] font-semibold leading-tight">Money · {m.label}</h1>
          <p className="text-ink-soft">Counted on the day it was paid, compared with {monthRange(prev).label}.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <Link href={`/money?month=${prev}`} className="rounded border-[1.5px] border-ink px-3 py-1.5 font-semibold">
            ← {monthRange(prev).label}
          </Link>
          {month < today.slice(0, 7) ? (
            <Link href={`/money?month=${next}`} className="rounded border-[1.5px] border-ink px-3 py-1.5 font-semibold">
              {monthRange(next).label} →
            </Link>
          ) : null}
          <a href={`/money/export?month=${month}`} className="rounded border-[1.5px] border-ink bg-ink px-3 py-1.5 font-semibold text-surface">
            Download Excel
          </a>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-4 gap-6 border-b-2 border-ink pb-4 max-md:grid-cols-2">
        {tiles.map((t) => (
          <div key={t.l}>
            <div className="num text-[34px] leading-none tabular-nums">{kd(t.n)}</div>
            <div className="text-sm text-ink-soft">{t.l}</div>
            <div className="text-xs text-ink-soft">{t.sub}</div>
            <Delta now={t.n} before={t.before} good={t.good} />
          </div>
        ))}
      </div>
      <p className="mt-3 text-sm">
        <span className="font-semibold">{kd(m.waiting)} KD</span> <span className="text-ink-soft">waiting for payment right now ({m.waitingCount} registration{m.waitingCount === 1 ? "" : "s"})</span>
      </p>

      <section aria-labelledby="daily" className="mt-6">
        <h2 id="daily" className="label mb-2">
          Each day
        </h2>
        <div className="overflow-x-auto rounded-md border border-line bg-surface p-4">
          <div className="flex h-36 min-w-[620px] items-end gap-1" role="img" aria-label={`Payments each day of ${m.label}`}>
            {m.daily.map((x) => (
              <div key={x.day} className="flex h-full flex-1 flex-col items-center gap-1" title={`${shortDate(x.day)}: ${kd(x.amount)} KD (${x.count})${x.refunds ? `, refunds ${kd(x.refunds)}` : ""}`}>
                <div className="relative w-full flex-1">
                  <div className="absolute inset-x-0 bottom-0 rounded-t bg-ink" style={{ height: `${(x.amount / maxDay) * 100}%`, minHeight: x.amount ? 3 : 0 }} />
                </div>
                <span className="text-[10px] text-ink-soft tabular-nums">{Number(x.day.slice(8))}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="mt-6 grid grid-cols-2 gap-8 max-lg:grid-cols-1">
        <section>
          <h2 className="label mb-2">By sport (mixed registrations split by days)</h2>
          <Bars
            total={m.gross}
            rows={[
              ["Swimming", m.bySport.swimming, p.bySport.swimming, "var(--swim)"],
              ["Jiu-jitsu", m.bySport.jiujitsu, p.bySport.jiujitsu, "var(--bjj)"],
              ["Open pool", m.bySport.openPool, p.bySport.openPool, "var(--swim)"],
            ]}
          />
          <h2 className="label mb-2 mt-6">Online vs desk</h2>
          <Bars total={m.gross} rows={Object.keys(METHOD).map((k) => [METHOD[k], m.byMethod[k] ?? 0, p.byMethod[k] ?? 0, "var(--ink)"] as [string, number, number, string])} />
          <h2 className="label mb-2 mt-6">By member</h2>
          <Bars
            total={m.gross}
            rows={(["Kid", "Titan", "Adult"] as const).map((k) => [k === "Kid" ? "Kids" : `${k}s`, m.byType[k], p.byType[k], "var(--ink-soft)"] as [string, number, number, string])}
          />
        </section>

        <section>
          <h2 className="label mb-2">Payments · {m.count}</h2>
          {m.payments.length ? (
            <ul className="text-[14px]">
              {m.payments
                .slice()
                .reverse()
                .map((x, i) => (
                  <li key={i} className="flex flex-wrap items-baseline gap-x-2 border-b border-line py-2">
                    <span className="w-14 text-xs text-ink-soft">{shortDate(x.day)}</span>
                    <Link href={`/kids/${x.kidId}`} className="font-semibold underline-offset-2 hover:underline">
                      {x.member}
                    </Link>
                    <span className="min-w-0 flex-1 text-xs text-ink-soft">
                      {x.what} · {x.method}
                      {x.discount ? ` · −${kd(x.discount)} discount` : ""}
                    </span>
                    <span className="font-semibold tabular-nums">{kd(x.total)}</span>
                  </li>
                ))}
            </ul>
          ) : (
            <p className="text-ink-soft">No payments this month.</p>
          )}
          {m.refundList.length ? (
            <>
              <h2 className="label mb-2 mt-6">Refunds · {m.refundList.length}</h2>
              <ul className="text-[14px]">
                {m.refundList.map((x, i) => (
                  <li key={i} className="flex flex-wrap items-baseline gap-x-2 border-b border-line py-2">
                    <span className="w-14 text-xs text-ink-soft">{shortDate(x.day)}</span>
                    <span className="font-semibold">{x.member}</span>
                    <span className="min-w-0 flex-1 text-xs text-ink-soft">{x.what}</span>
                    <span className="font-semibold text-danger tabular-nums">−{kd(x.amount)}</span>
                  </li>
                ))}
              </ul>
            </>
          ) : null}
        </section>
      </div>
    </div>
  );
}
