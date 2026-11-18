import { ClassEditor } from "@/components/class-editor";
import { requireStaff } from "@/lib/auth";
import { CLASS_COLS, DAY, PLACE, time12, type ClassRow } from "@/lib/data";

const DAY_ORDER = ["sat", "sun", "mon", "tue", "wed", "thu"];

export default async function ClassesPage() {
  const { supabase, profile } = await requireStaff();
  const canEdit = profile.role === "super_admin" || profile.role === "manager";
  const [classesRes, coachesRes] = await Promise.all([
    supabase.from("classes").select(CLASS_COLS).eq("is_active", true).order("start_time"),
    supabase.from("profiles").select("id, full_name, sport").eq("role", "coach").order("full_name"),
  ]);
  const classes = (classesRes.data ?? []) as ClassRow[];
  const coaches = (coachesRes.data ?? []) as { id: string; full_name: string; sport: string | null }[];
  const coachName = new Map(coaches.map((c) => [c.id, c.full_name]));
  const sorted = [...classes].sort(
    (a, b) => a.sport.localeCompare(b.sport) || DAY_ORDER.indexOf(a.weekday) - DAY_ORDER.indexOf(b.weekday) || a.start_time.localeCompare(b.start_time),
  );

  return (
    <div>
      <h1 className="text-[26px] font-semibold">Classes</h1>
      <p className="text-ink-soft">
        The weekly timetable. {canEdit ? "Change a time, length, coach or place with Edit. Jiu-jitsu members move with their class." : "Only the owner or a manager can change classes."}
      </p>

      {(["jiujitsu", "swimming"] as const).map((sport) => (
        <section key={sport} className="mt-6">
          <h2 className="label mb-2" style={{ color: sport === "swimming" ? "var(--swim)" : "var(--bjj)" }}>
            {sport === "swimming" ? "Swimming" : "Jiu-jitsu"}
          </h2>
          <div className="overflow-x-auto rounded-md border border-line bg-surface">
            <table className="w-full min-w-[720px] text-[14px]">
              <thead>
                <tr className="border-b border-ink text-left">
                  {["Day", "Time", "Class", "Place", "Coach", "Size", ""].map((h) => (
                    <th key={h} className="label px-3 py-2.5 font-bold">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sorted
                  .filter((c) => c.sport === sport)
                  .map((c) => (
                    <tr key={c.id} className="border-b border-line align-top last:border-0">
                      <td className="px-3 py-2.5 font-semibold">{DAY[c.weekday]}</td>
                      <td className="px-3 py-2.5 whitespace-nowrap">
                        {time12(c.start_time)} <span className="text-ink-soft">· {c.duration_min} min</span>
                      </td>
                      <td className="px-3 py-2.5">
                        {c.label ?? "—"}
                        {c.is_free ? <span className="ml-1.5 rounded bg-tile px-1.5 text-xs font-semibold text-swim">free</span> : null}
                        {c.audience === "women" ? <span className="ml-1.5 rounded bg-tile px-1.5 text-xs font-semibold">women</span> : null}
                      </td>
                      <td className="px-3 py-2.5">{PLACE[c.location] ?? c.location}</td>
                      <td className="px-3 py-2.5">{c.coach_id ? coachName.get(c.coach_id) : <span className="text-ink-soft">Not set</span>}</td>
                      <td className="px-3 py-2.5">{c.capacity}</td>
                      <td className="px-3 py-2.5 text-right">
                        {canEdit ? (
                          <ClassEditor
                            cls={{ id: c.id, start: c.start_time.slice(0, 5), duration: c.duration_min, coach: c.coach_id ?? "", location: c.location, sport: c.sport, capacity: c.capacity }}
                            coaches={coaches.filter((x) => !x.sport || x.sport === sport)}
                          />
                        ) : null}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </section>
      ))}
    </div>
  );
}
