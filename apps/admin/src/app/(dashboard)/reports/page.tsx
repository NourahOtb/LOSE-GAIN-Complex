import Link from "next/link";
import { redirect } from "next/navigation";

import { CheckOn } from "@/components/check-on";
import { requireStaff } from "@/lib/auth";
import { kuwaitToday } from "@/lib/checkin";
import { shortDate } from "@/lib/data";
import { buildReport, loadReportData, MISSED_FLAG, monthRange, NOT_RENEWED_DAYS } from "@/lib/reports";

const DAY: Record<string, string> = { sat: "Sat", sun: "Sun", mon: "Mon", tue: "Tue", wed: "Wed", thu: "Thu" };
const pct = (n: number) => `${Math.round(n * 100)}%`;

function Delta({ now, before, good = "up" }: { now: number; before: number; good?: "up" | "down" }) {
  const d = now - before;
  if (d === 0) return <span className="text-xs text-ink-soft">same as last month</span>;
  const better = good === "up" ? d > 0 : d < 0;
  return (
    <span className={`text-xs font-semibold ${better ? "text-swim" : "text-danger"}`}>
      {d > 0 ? "▲" : "▼"} {Math.abs(d)} vs last month ({before})
    </span>
  );
}

export default async function ReportsPage({ searchParams }: PageProps<"/reports">) {
  const { supabase, profile } = await requireStaff();
  if (!["super_admin", "manager"].includes(profile.role)) redirect("/");
  const sp = await searchParams;
  const today = kuwaitToday();
  const month = typeof sp.month === "string" && /^\d{4}-\d{2}$/.test(sp.month) ? sp.month : today.slice(0, 7);
  const { prev } = monthRange(month);
  const next = new Date(Date.UTC(Number(month.slice(0, 4)), Number(month.slice(5, 7)), 1)).toISOString().slice(0, 7);

  const data = await loadReportData(supabase);
  const r = buildReport(data, month, today);
  const p = buildReport(data, prev, today);

  const tiles = [
    { n: r.members.active, before: p.members.active, l: "active members" },
    { n: r.members.new, before: p.members.new, l: "new members" },
    { n: r.members.notRenewed, before: p.members.notRenewed, l: `not renewed (${NOT_RENEWED_DAYS} days)`, good: "down" as const },
    { n: r.attendance.checkIns, before: p.attendance.checkIns, l: "check-ins" },
  ];

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[26px] font-semibold leading-tight">Reports · {r.label}</h1>
          <p className="text-ink-soft">Members and attendance, compared with {monthRange(prev).label}.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <Link href={`/reports?month=${prev}`} className="rounded border-[1.5px] border-ink px-3 py-1.5 font-semibold">
            ← {monthRange(prev).label}
          </Link>
          {month < today.slice(0, 7) ? (
            <Link href={`/reports?month=${next}`} className="rounded border-[1.5px] border-ink px-3 py-1.5 font-semibold">
              {monthRange(next).label} →
            </Link>
          ) : null}
          <a href={`/reports/export?month=${month}`} className="rounded border-[1.5px] border-ink bg-ink px-3 py-1.5 font-semibold text-surface">
            Download Excel
          </a>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-4 gap-6 border-b-2 border-ink pb-4 max-md:grid-cols-2">
        {tiles.map((t) => (
          <div key={t.l}>
            <div className="num text-[40px] leading-none">{t.n}</div>
            <div className="text-sm text-ink-soft">{t.l}</div>
            <Delta now={t.n} before={t.before} good={t.good} />
          </div>
        ))}
      </div>

      <div className="mt-6 grid grid-cols-2 gap-8 max-lg:grid-cols-1">
        <section aria-labelledby="who">
          <h2 id="who" className="label mb-2">
            Active members by sport and age
          </h2>
          <div className="rounded-md border border-line bg-surface p-4 text-sm">
            {[
              ["Swimming", r.members.bySport.swimming, p.members.bySport.swimming, "var(--swim)"],
              ["Jiu-jitsu", r.members.bySport.jiujitsu, p.members.bySport.jiujitsu, "var(--bjj)"],
              ["Open pool", r.members.bySport.openPool, p.members.bySport.openPool, "var(--swim)"],
            ].map(([l, n, b, c]) => (
              <div key={String(l)} className="flex items-center gap-3 py-1">
                <span className="w-24">{l}</span>
                <span className="h-2 flex-1 rounded bg-line" aria-hidden>
                  <span className="block h-full rounded" style={{ width: `${r.members.active ? (Number(n) / r.members.active) * 100 : 0}%`, background: String(c) }} />
                </span>
                <span className="w-10 text-right font-semibold tabular-nums">{n}</span>
                <span className="w-24 text-xs text-ink-soft">{Number(n) - Number(b) === 0 ? "same" : `${Number(n) - Number(b) > 0 ? "+" : ""}${Number(n) - Number(b)} vs last`}</span>
              </div>
            ))}
            <p className="mt-2 text-ink-soft">
              Kids {r.members.byType.Kid} · Titans {r.members.byType.Titan} · Adults {r.members.byType.Adult}
            </p>
          </div>

          <h2 className="label mb-2 mt-6">Registrations that ended in {r.label} · {r.members.ended}</h2>
          <p className="mb-2 text-sm text-ink-soft">
            {r.members.renewed} renewed · {r.members.notRenewed} not renewed · {r.members.waiting} still within {NOT_RENEWED_DAYS} days
          </p>
          {r.members.notRenewedList.length ? (
            <ul className="text-[14px]">
              {r.members.notRenewedList.map((m) => (
                <li key={m.id} className="flex flex-wrap items-center gap-2 border-b border-line py-2">
                  <Link href={`/kids/${m.id}`} className="font-semibold underline underline-offset-2">
                    {m.name}
                  </Link>
                  <span className="text-ink-soft">
                    {m.type}
                    {m.guardian ? ` · ${m.guardian}` : ""}
                    {m.phone ? ` · ${m.phone}` : ""} · ended {shortDate(m.ended)}
                  </span>
                  <span className={`ml-auto rounded px-1.5 text-xs font-semibold leading-6 ${m.waiting ? "bg-warn-bg text-warn-ink" : "bg-danger-bg text-danger"}`}>{m.waiting ? "Not renewed yet" : "Not renewed"}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-ink-soft">{r.members.ended ? "Everyone renewed." : "No registrations ended yet this month."}</p>
          )}

          <h2 className="label mb-2 mt-6">New members · {r.members.new}</h2>
          {r.members.newList.length ? (
            <ul className="text-[14px]">
              {r.members.newList.map((m) => (
                <li key={m.id} className="border-b border-line py-2">
                  <Link href={`/kids/${m.id}`} className="font-semibold underline underline-offset-2">
                    {m.name}
                  </Link>{" "}
                  <span className="text-ink-soft">
                    {m.type} · started {shortDate(m.started)}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-ink-soft">No new members this month.</p>
          )}
        </section>

        <section aria-labelledby="att">
          <h2 id="att" className="label mb-2">
            Attendance by class
          </h2>
          <p className="mb-2 text-sm text-ink-soft">
            {r.attendance.came} of {r.attendance.booked} booked classes attended
            {r.attendance.booked ? ` (${pct(r.attendance.came / r.attendance.booked)})` : ""} · {r.attendance.walkIns} walk-ins
            {r.trackingFrom ? ` · door check-in counted from ${shortDate(r.trackingFrom)} to ${shortDate(r.countedUntil)}` : " · no check-ins recorded yet"}
          </p>
          {r.attendance.perClass.length ? (
            <div className="rounded-md border border-line bg-surface p-3 text-sm">
              {r.attendance.perClass.map((c) => (
                <div key={c.id} className="flex items-center gap-3 py-1">
                  <span className="w-40 truncate">
                    {DAY[c.day]} {c.time} · {c.label.split(" · ")[0]}
                  </span>
                  <span className="h-2 flex-1 rounded bg-line" aria-hidden>
                    <span className="block h-full rounded" style={{ width: pct(c.rate), background: c.sport === "swimming" ? "var(--swim)" : "var(--bjj)" }} />
                  </span>
                  <span className="w-20 text-right tabular-nums">
                    {c.came}/{c.booked}
                  </span>
                  <span className="w-10 text-right font-semibold tabular-nums">{pct(c.rate)}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-ink-soft">No booked classes counted yet this month.</p>
          )}

          <h2 className="label mb-2 mt-6">Missed {MISSED_FLAG}+ classes · {r.attendance.flagged.length}</h2>
          {r.attendance.flagged.length ? (
            <ul className="text-[14px]">
              {r.attendance.flagged.map((m) => (
                <li key={m.id} className="flex flex-wrap items-center gap-2 border-b border-line py-2">
                  <span className="min-w-0 flex-1">
                    <Link href={`/kids/${m.id}`} className="font-semibold underline underline-offset-2">
                      {m.name}
                    </Link>{" "}
                    <span className="text-ink-soft">
                      missed {m.missed} of {m.booked} ({m.missedDates.slice(-3).map(shortDate).join(", ")})
                    </span>
                  </span>
                  <CheckOn kidId={m.id} name={m.name} missed={m.missed} phone={m.phone} lang={m.lang} />
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-ink-soft">Nobody missed {MISSED_FLAG} or more classes.</p>
          )}
        </section>
      </div>
    </div>
  );
}
