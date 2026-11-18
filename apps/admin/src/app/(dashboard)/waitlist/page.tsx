import { ageOn } from "@lg/shared";
import Link from "next/link";

import { WaitlistActions } from "@/components/waitlist-actions";
import { requireStaff } from "@/lib/auth";
import { kuwaitToday } from "@/lib/checkin";
import { CLASS_COLS, classLabel, DAY, time12, type ClassRow } from "@/lib/data";

type Row = { id: string; kid_id: string; class_id: string; parent_id: string; status: "waiting" | "offered"; offered_at: string | null; offer_expires: string | null; created_at: string };

const when = (ts: string) => new Date(ts).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit", timeZone: "Asia/Kuwait" });
const addDays = (iso: string, n: number) => {
  const d = new Date(iso + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};

export default async function WaitlistPage() {
  const { supabase, profile } = await requireStaff();
  const canOffer = ["super_admin", "manager", "receptionist"].includes(profile.role);
  const today = kuwaitToday();
  const [{ data: rows }, { data: classes }, { data: spaces }] = await Promise.all([
    supabase.from("waitlist").select("id, kid_id, class_id, parent_id, status, offered_at, offer_expires, created_at").in("status", ["waiting", "offered"]).order("created_at"),
    supabase.from("classes").select(CLASS_COLS).eq("is_active", true),
    // places taken over the next 4 weeks (a new 4-week registration would need a place for all of them)
    supabase.rpc("class_spaces", { p_from: today, p_to: addDays(today, 28) }),
  ]);
  const list = (rows ?? []) as Row[];
  const kidIds = [...new Set(list.map((r) => r.kid_id))];
  const parentIds = [...new Set(list.map((r) => r.parent_id))];
  const [{ data: kids }, { data: parents }] = await Promise.all([
    kidIds.length ? supabase.from("kids").select("id, full_name, birth_date, is_self").in("id", kidIds) : Promise.resolve({ data: [] }),
    parentIds.length ? supabase.from("profiles").select("id, full_name, phone").in("id", parentIds) : Promise.resolve({ data: [] }),
  ]);
  const kidById = new Map(((kids ?? []) as { id: string; full_name: string; birth_date: string; is_self: boolean }[]).map((k) => [k.id, k]));
  const parentById = new Map(((parents ?? []) as { id: string; full_name: string; phone: string | null }[]).map((p) => [p.id, p]));
  const clsById = new Map(((classes ?? []) as ClassRow[]).map((c) => [c.id, c]));
  const space = new Map(((spaces ?? []) as { class_id: string; booked: number; capacity: number }[]).map((s) => [s.class_id, s]));
  const now = new Date().toISOString();

  const DAY_ORDER = ["sat", "sun", "mon", "tue", "wed", "thu"];
  const groups = [...new Set(list.map((r) => r.class_id))]
    .map((id) => ({ cls: clsById.get(id), rows: list.filter((r) => r.class_id === id) }))
    .filter((g): g is { cls: ClassRow; rows: Row[] } => !!g.cls)
    .sort((a, b) => DAY_ORDER.indexOf(a.cls.weekday) - DAY_ORDER.indexOf(b.cls.weekday) || a.cls.start_time.localeCompare(b.cls.start_time));
  const full = ((classes ?? []) as ClassRow[]).filter((c) => {
    const s = space.get(c.id);
    return s && s.booked >= s.capacity;
  });

  return (
    <div className="max-w-4xl">
      <h1 className="text-[26px] font-semibold leading-tight">Waitlist</h1>
      <p className="text-ink-soft">First come, first served. When a place opens, offer it to the first family: they get a message and have 48 hours to register.</p>

      {full.length ? (
        <p className="mt-4 rounded-md bg-warn-bg px-4 py-3 text-sm text-warn-ink">
          <span className="font-semibold">Full now: </span>
          {full.map((c) => `${DAY[c.weekday]} ${time12(c.start_time)} ${classLabel(c).split(" · ")[0]}`).join(" · ")}
        </p>
      ) : null}

      {groups.length === 0 ? (
        <p className="mt-6 text-ink-soft">Nobody is waiting.</p>
      ) : (
        groups.map(({ cls, rows: q }) => {
          const s = space.get(cls.id);
          const open = s ? Math.max(0, s.capacity - s.booked) : 0;
          const offeredLive = q.filter((r) => r.status === "offered" && (r.offer_expires ?? "") > now).length;
          const free = Math.max(0, open - offeredLive);
          const firstWaiting = q.find((r) => r.status === "waiting");
          return (
            <section key={cls.id} className="mt-6 rounded-md border border-line bg-surface">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-4 py-3">
                <span className="font-semibold">
                  {DAY[cls.weekday]} {time12(cls.start_time)} · {classLabel(cls)}
                </span>
                <span className={`text-sm font-semibold ${free ? "text-swim" : "text-ink-soft"}`}>
                  {s ? `${s.booked} / ${s.capacity} booked` : ""} · {free ? `${free} place${free === 1 ? "" : "s"} open` : "no place open"}
                </span>
              </div>
              <ol className="text-[14px]">
                {q.map((r, i) => {
                  const k = kidById.get(r.kid_id);
                  const p = parentById.get(r.parent_id);
                  const expired = r.status === "offered" && (r.offer_expires ?? "") <= now;
                  return (
                    <li key={r.id} className="flex flex-wrap items-center gap-2 border-b border-line px-4 py-2.5 last:border-0">
                      <span className="w-6 font-semibold text-ink-soft">{i + 1}</span>
                      <span className="min-w-0 flex-1">
                        <Link href={`/kids/${r.kid_id}`} className="font-semibold underline underline-offset-2">
                          {k?.full_name ?? "Member"}
                        </Link>
                        <span className="text-ink-soft">
                          {k ? ` · ${ageOn(k.birth_date)} yrs` : ""}
                          {p && !k?.is_self ? ` · ${p.full_name}` : ""}
                          {p?.phone ? ` · ${p.phone}` : ""} · joined {when(r.created_at)}
                        </span>
                        {r.status === "offered" ? (
                          <span className={`block text-xs font-semibold ${expired ? "text-danger" : "text-swim"}`}>
                            {expired ? `Offer ran out ${when(r.offer_expires!)}` : `Offered · can register until ${when(r.offer_expires!)}`}
                          </span>
                        ) : null}
                      </span>
                      {canOffer ? <WaitlistActions id={r.id} canOffer={r.status === "waiting" && r.id === firstWaiting?.id} highlight={free > 0} /> : null}
                    </li>
                  );
                })}
              </ol>
            </section>
          );
        })
      )}
    </div>
  );
}
