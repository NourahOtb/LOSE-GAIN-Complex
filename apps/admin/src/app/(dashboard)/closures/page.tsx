import { CloseDays, Reopen } from "@/components/closures";
import { requireStaff } from "@/lib/auth";
import { kuwaitToday } from "@/lib/checkin";

type Closure = { id: string; on_date: string; reason: string | null; created_by: string | null; closure_extensions: { count: number }[] };

const long = (iso: string) => new Date(iso + "T00:00:00").toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", year: "numeric" });

export default async function ClosuresPage() {
  const { supabase, profile } = await requireStaff();
  const todayIso = kuwaitToday();
  const canClose = ["super_admin", "manager", "receptionist"].includes(profile.role);
  const { data } = await supabase.from("closures").select("id, on_date, reason, created_by, closure_extensions(count)").order("on_date");
  const all = (data ?? []) as Closure[];
  const upcoming = all.filter((c) => c.on_date >= todayIso);
  const past = all.filter((c) => c.on_date < todayIso).reverse().slice(0, 20);

  return (
    <div className="max-w-4xl">
      <h1 className="text-[26px] font-semibold leading-tight">Closure days</h1>
      <p className="text-ink-soft">Holidays and other days the whole complex is closed (Fridays are always closed).</p>

      {canClose ? (
        <section aria-labelledby="close" className="mt-6">
          <h2 id="close" className="label mb-2">
            Close the complex
          </h2>
          <CloseDays todayIso={todayIso} />
        </section>
      ) : (
        <p className="mt-6 text-ink-soft">The owner, a manager or reception can close the complex.</p>
      )}

      <section aria-labelledby="upcoming" className="mt-8">
        <h2 id="upcoming" className="label mb-2">
          Coming up · {upcoming.length}
        </h2>
        {upcoming.length === 0 ? (
          <p className="text-ink-soft">No closures planned.</p>
        ) : (
          <ul className="text-[14px]">
            {upcoming.map((c) => (
              <li key={c.id} className="flex flex-wrap items-center gap-3 border-b border-line py-2.5">
                <span className="rounded bg-danger-bg px-1.5 text-xs font-semibold leading-6 text-danger">Closed</span>
                <span className="min-w-0 flex-1">
                  <span className="font-semibold">{long(c.on_date)}</span>
                  {c.reason ? <span className="text-ink-soft"> · {c.reason}</span> : null}
                  <span className="text-ink-soft"> · {c.closure_extensions[0]?.count ?? 0} registrations extended</span>
                </span>
                {canClose ? <Reopen date={c.on_date} /> : null}
              </li>
            ))}
          </ul>
        )}
      </section>

      {past.length ? (
        <section aria-labelledby="past" className="mt-8">
          <h2 id="past" className="label mb-2">
            Past closures
          </h2>
          <ul className="text-[14px] text-ink-soft">
            {past.map((c) => (
              <li key={c.id} className="border-b border-line py-2">
                {long(c.on_date)}
                {c.reason ? ` · ${c.reason}` : ""}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
