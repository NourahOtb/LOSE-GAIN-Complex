import { ageOn } from "@lg/shared";

import { DoorBoard, type DoorClass, type DoorRow } from "@/components/door-board";
import { requireStaff } from "@/lib/auth";
import { kuwaitToday, loadDoor } from "@/lib/checkin";
import { classLabel, time12, weekdayOf } from "@/lib/data";

const HEALTH: Record<string, string> = { asthma: "Asthma", allergies: "Allergies", epilepsy: "Epilepsy", heart: "Heart", injury: "Injury", medication: "Medication", other: "Other" };

export default async function CheckInPage({ searchParams }: PageProps<"/check-in">) {
  const { supabase, profile } = await requireStaff();
  const sp = await searchParams;
  const today = kuwaitToday();
  const dateIso = typeof sp.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(sp.date) ? sp.date : today;
  const weekday = weekdayOf(new Date(dateIso + "T00:00:00"));
  const canCheckIn = ["super_admin", "manager", "receptionist"].includes(profile.role);

  const door = await loadDoor(supabase, dateIso, weekday);
  const classes: DoorClass[] = door.classes.map((c) => {
    const [h, m] = c.start_time.slice(0, 5).split(":").map(Number);
    return { id: c.id, label: classLabel(c), time: time12(c.start_time), startMin: h * 60 + m, durationMin: c.duration_min, sport: c.sport, capacity: c.capacity, free: c.is_free };
  });

  const toRow = (r: (typeof door.rosters)[string][number]): DoorRow => {
    const m = r.member;
    const g = door.guardian(m);
    const age = ageOn(m.birth_date);
    return {
      id: m.id,
      name: m.full_name,
      sub: `${age} yrs${m.gender ? ` · ${m.gender === "male" ? (age >= 16 || m.is_self ? "Male" : "Boy") : age >= 16 || m.is_self ? "Female" : "Girl"}` : ""}`,
      photo: m.photo_url ? (door.photos[m.photo_url] ?? null) : null,
      health: [...m.health_conditions.map((h) => HEALTH[h] ?? h), ...(m.health_other ? [m.health_other] : [])],
      status: r.status,
      sessionsLeft: r.sessionsLeft,
      endsOn: r.endsOn,
      startsOn: r.startsOn ?? null,
      guardian: g ? `${g.full_name}${g.phone ? ` · ${g.phone}` : ""}` : null,
    };
  };

  return (
    <DoorBoard
      dateIso={dateIso}
      todayIso={today}
      canCheckIn={canCheckIn}
      classes={classes}
      rosters={Object.fromEntries(Object.entries(door.rosters).map(([k, rows]) => [k, rows.map(toRow)]))}
      present={Object.fromEntries(door.attendance.map((a) => [`${a.kid_id}|${a.class_id}`, a.created_at]))}
      members={door.members.map((m) => ({ id: m.id, name: m.full_name, age: ageOn(m.birth_date) }))}
    />
  );
}
