import Link from "next/link";
import { daysUntil } from "@lg/shared";

import { CancelClass } from "@/components/cancel-class";
import { MarkPaid } from "@/components/mark-paid";
import { SendLink } from "@/components/send-link";
import { requireStaff } from "@/lib/auth";
import { Handoffs } from "@/components/handoffs";
import { OpenPool } from "@/components/open-pool";
import { booked, classLabel, expiringWithin, isoDate, kd, loadDashboard, packageLabel, shortDate, time12, weekdayOf } from "@/lib/data";

export default async function TodayPage() {
  const { supabase, profile } = await requireStaff();
  const d = await loadDashboard(supabase);
  const todayIso = isoDate(d.today);
  const wd = weekdayOf(d.today);

  const kidById = new Map(d.kids.map((k) => [k.id, k]));
  const parentById = new Map(d.parents.map((p) => [p.id, p]));
  const active = d.subs.filter((s) => s.status === "active");
  const pending = d.subs.filter((s) => s.status === "pending_payment");
  const expiring = expiringWithin(d, 7);
  const closedToday = d.closures.find((c) => c.on_date === todayIso);
  const nextClosure = d.closures.find((c) => c.on_date > todayIso);
  const todays = d.classes.filter((c) => c.weekday === wd);
  const slots = [...new Set(todays.map((c) => c.start_time))].sort();
  const inClassToday = new Set(todays.flatMap((c) => booked(d, c, todayIso).map((s) => s.kid_id))).size;

  const stats = [
    { n: new Set(active.map((s) => s.kid_id)).size, l: "active members" },
    { n: pending.length, l: "waiting for payment", warn: pending.length > 0 },
    { n: expiring.length, l: "expiring this week" },
    { n: inClassToday, l: "kids in class today" },
  ];

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[26px] font-semibold leading-tight">Today · {d.today.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "short" })}</h1>
          <p className="text-ink-soft">Hello, {profile.full_name}</p>
        </div>
      </div>

      {d.requestsWaiting > 0 ? (
        <Link href="/approvals" className="mt-4 flex items-center justify-between gap-3 rounded-md bg-ink px-4 py-3 text-surface">
          <span>
            <span className="num mr-2 text-[22px]">{d.requestsWaiting}</span>
            request{d.requestsWaiting === 1 ? "" : "s"} from guardians waiting for approval
          </span>
          <span className="font-semibold">Open Approvals →</span>
        </Link>
      ) : null}

      {nextClosure ? (
        <p className="mt-3 text-sm">
          <span className="rounded bg-danger-bg px-1.5 py-0.5 text-xs font-semibold text-danger">Closed</span>{" "}
          {shortDate(nextClosure.on_date)}
          {nextClosure.reason ? ` · ${nextClosure.reason}` : ""} ·{" "}
          <Link href="/closures" className="underline underline-offset-2">
            Closure days
          </Link>
        </p>
      ) : null}

      <div className="mt-5 grid grid-cols-4 gap-6 border-b-2 border-ink pb-4 max-sm:grid-cols-2">
        {stats.map((s) => (
          <div key={s.l}>
            <div className={`num text-[40px] leading-none ${s.warn ? "text-bjj" : ""}`}>{s.n}</div>
            <div className="text-sm text-ink-soft">{s.l}</div>
          </div>
        ))}
      </div>

      <div className="mt-6 grid grid-cols-[1.15fr_1fr] gap-8 max-lg:grid-cols-1">
        {/* today's classes */}
        <section aria-labelledby="classes">
          <h2 id="classes" className="label mb-2">
            Today&apos;s classes
          </h2>
          {wd === "fri" ? <p className="text-ink-soft">Friday: the complex is closed.</p> : null}
          {closedToday ? (
            <p className="mb-3 rounded-md bg-danger-bg px-4 py-3 font-semibold text-danger">
              The complex is closed today{closedToday.reason ? ` (${closedToday.reason})` : ""}. Missed classes were added to the end of each registration.
            </p>
          ) : null}
          {slots.map((slot) => (
            <div key={slot} className="mb-3 rounded-md border border-line bg-surface">
              <div className="flex items-center justify-between border-b border-line px-4 py-2.5">
                <span className="num text-[22px]">{time12(slot)}</span>
              </div>
              {todays
                .filter((c) => c.start_time === slot)
                .map((c) => {
                  const n = booked(d, c, todayIso).length;
                  const cancelled = d.cancels.some((x) => x.class_id === c.id && x.on_date === todayIso);
                  const color = c.sport === "swimming" ? "var(--swim)" : "var(--bjj)";
                  const label = `${classLabel(c)}${c.is_free ? " · free" : ""}`;
                  return (
                    <div key={c.id} className="flex flex-wrap items-center gap-3 border-b border-line/60 px-4 py-2.5 last:border-0">
                      <span className="w-48 text-[15px]">
                        <span className="mr-2 inline-block h-2 w-2 rounded-full" style={{ background: color }} />
                        {label}
                      </span>
                      <span className="h-[5px] min-w-16 flex-1 rounded bg-line" aria-hidden>
                        <span className="block h-full rounded" style={{ width: `${Math.min(100, (n / c.capacity) * 100)}%`, background: color }} />
                      </span>
                      <span className="w-14 text-right text-sm tabular-nums">
                        {n} / {c.capacity}
                      </span>
                      <span className="ml-auto">
                        {cancelled ? (
                          <span className="rounded bg-danger-bg px-2 py-1 text-[13px] font-semibold text-danger">Cancelled</span>
                        ) : (
                          <CancelClass classId={c.id} dateIso={todayIso} label={`${label} at ${time12(slot)} today`} bookedCount={n} />
                        )}
                      </span>
                    </div>
                  );
                })}
            </div>
          ))}
        </section>

        <div className="flex flex-col gap-7">
          <Handoffs
            items={d.handoffs.map((h) => ({
              id: h.id,
              parent: parentById.get(h.parent_id)?.full_name ?? "Guardian",
              phone: parentById.get(h.parent_id)?.phone ?? null,
              summary: h.summary,
              created_at: h.created_at,
            }))}
          />

          <OpenPool
            todayIso={todayIso}
            members={active.filter((s) => s.kind === "open_pool").length}
            freezes={d.subs
              .filter((s) => s.kind === "open_pool" && s.freeze_status === "requested")
              .map((s) => ({ id: s.id, name: kidById.get(s.kid_id)?.full_name ?? "", start: s.freeze_start ?? "", end: s.end_date }))}
            closures={d.poolClosures}
          />

          {/* waiting for payment */}
          <section aria-labelledby="pending">
            <h2 id="pending" className="label mb-2">
              Waiting for payment · {pending.length}
            </h2>
            {pending.length === 0 ? (
              <p className="text-ink-soft">Nothing waiting.</p>
            ) : (
              <table className="w-full text-[14px]">
                <thead>
                  <tr className="border-b border-ink text-left">
                    <th className="label py-2 font-bold">Kid</th>
                    <th className="label py-2 font-bold">Starts</th>
                    <th className="label py-2 text-right font-bold">KD</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {pending.map((s) => {
                    const kid = kidById.get(s.kid_id);
                    const parent = kid ? parentById.get(kid.parent_id) : undefined;
                    return (
                      <tr key={s.id} className="border-b border-line align-top">
                        <td className="py-2.5 pr-2">
                          <div className="font-semibold">{kid?.full_name}</div>
                          <div className="text-xs text-ink-soft">{packageLabel(s)}</div>
                          {parent ? <div className="text-xs text-ink-soft">{parent.full_name}{parent.phone ? ` · ${parent.phone}` : ""}</div> : null}
                        </td>
                        <td className="py-2.5 pr-2 whitespace-nowrap">{shortDate(s.start_date)}</td>
                        <td className="py-2.5 pr-3 text-right font-semibold">{kd(s.total)}</td>
                        <td className="py-2.5 text-right">
                          <div className="flex flex-col items-end gap-1.5">
                            <MarkPaid id={s.id} />
                            <SendLink id={s.id} kid={kid?.full_name ?? ""} amount={Number(s.total)} />
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </section>

          {/* expiring */}
          <section aria-labelledby="expiring">
            <h2 id="expiring" className="label mb-2">
              Expiring this week · {expiring.length}
            </h2>
            {expiring.length === 0 ? (
              <p className="text-ink-soft">No renewals due this week.</p>
            ) : (
              <table className="w-full text-[14px]">
                <thead>
                  <tr className="border-b border-ink text-left">
                    <th className="label py-2 font-bold">Kid</th>
                    <th className="label py-2 font-bold">Ends</th>
                    <th className="label py-2 text-right font-bold">Left</th>
                  </tr>
                </thead>
                <tbody>
                  {expiring.map((s) => {
                    const kid = kidById.get(s.kid_id);
                    const left = daysUntil(s.end_date, d.today);
                    return (
                      <tr key={s.id} className="border-b border-line">
                        <td className="py-2.5">
                          <span className="font-semibold">{kid?.full_name}</span>
                          <span className="text-ink-soft"> · {s.kind === "open_pool" ? "Open pool" : s.swim_days.length ? "Swim" : "BJJ"}</span>
                        </td>
                        <td className="py-2.5">
                          {shortDate(s.end_date)}
                          <span className={`ml-2 rounded px-1.5 py-0.5 text-xs font-semibold ${left <= 2 ? "bg-warn-bg text-warn-ink" : "text-ink-soft"}`}>
                            {left === 0 ? "today" : `in ${left} day${left === 1 ? "" : "s"}`}
                          </span>
                        </td>
                        <td className="py-2.5 text-right">{s.kind === "open_pool" ? "—" : `${s.sessions_total - s.sessions_used} classes`}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
