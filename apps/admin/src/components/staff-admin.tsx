"use client";

import { useState, useTransition } from "react";

import { createStaff, resetPassword, updateStaff } from "@/app/actions";
import { TempPassword } from "@/components/temp-password";

export type StaffRow = {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  role: string;
  sport: string | null;
  is_active: boolean;
  must_change_password: boolean;
  last_sign_in_at: string | null;
};

export const ROLES: Record<string, string> = {
  super_admin: "Owner (super admin)",
  manager: "Manager",
  receptionist: "Receptionist",
  accountant: "Accountant",
  coach: "Coach",
};
const SPORT: Record<string, string> = { swimming: "Swimming", jiujitsu: "Jiu-jitsu" };
const field = "h-10 rounded border-[1.5px] border-line bg-surface px-2.5";

/** Roles the signed-in person may give: owner → all; manager → coach and receptionist. */
export const assignable = (myRole: string) => (myRole === "super_admin" ? Object.keys(ROLES) : ["coach", "receptionist"]);

export function AddStaff({ myRole }: { myRole: string }) {
  const roles = assignable(myRole);
  const [f, setF] = useState({ full_name: "", email: "", phone: "", role: roles.includes("receptionist") ? "receptionist" : roles[0], sport: "swimming" });
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ error?: string; tempPassword?: string; email?: string } | null>(null);
  const set = (k: keyof typeof f, v: string) => setF((x) => ({ ...x, [k]: v }));

  return (
    <div className="rounded-md border border-line bg-surface p-4 text-sm">
      <div className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1">
          <span className="label">Full name</span>
          <input value={f.full_name} onChange={(e) => set("full_name", e.target.value)} className={`${field} w-48`} />
        </label>
        <label className="flex flex-col gap-1">
          <span className="label">Email (to log in)</span>
          <input type="email" value={f.email} onChange={(e) => set("email", e.target.value)} className={`${field} w-56`} />
        </label>
        <label className="flex flex-col gap-1">
          <span className="label">Mobile (optional)</span>
          <input inputMode="tel" value={f.phone} onChange={(e) => set("phone", e.target.value)} placeholder="5xxxxxxx" className={`${field} w-32`} />
        </label>
        <label className="flex flex-col gap-1">
          <span className="label">Role</span>
          <select value={f.role} onChange={(e) => set("role", e.target.value)} className={field}>
            {roles.map((r) => (
              <option key={r} value={r}>
                {ROLES[r]}
              </option>
            ))}
          </select>
        </label>
        {f.role === "coach" ? (
          <label className="flex flex-col gap-1">
            <span className="label">Sport</span>
            <select value={f.sport} onChange={(e) => set("sport", e.target.value)} className={field}>
              <option value="swimming">Swimming</option>
              <option value="jiujitsu">Jiu-jitsu</option>
            </select>
          </label>
        ) : null}
        <button
          disabled={pending || !f.full_name.trim() || !f.email.trim()}
          onClick={() =>
            start(async () => {
              const r = await createStaff(f);
              if ("error" in r) return setMsg({ error: r.error });
              setMsg({ tempPassword: r.tempPassword, email: f.email.trim().toLowerCase() });
              setF((x) => ({ ...x, full_name: "", email: "", phone: "" }));
            })
          }
          className="h-10 rounded border-[1.5px] border-ink bg-ink px-4 font-semibold text-surface disabled:opacity-40">
          {pending ? "Creating…" : "Add staff member"}
        </button>
      </div>
      <p className="mt-2 text-ink-soft">
        {f.role === "coach" ? "Coaches use the app (they see the kids of their sport)." : "Owner, managers, reception and the accountant use this dashboard."}
      </p>
      {msg?.error ? <p className="mt-2 font-semibold text-danger">{msg.error}</p> : null}
      {msg?.tempPassword ? (
        <div className="mt-3">
          <TempPassword password={msg.tempPassword} email={msg.email ?? ""} />
        </div>
      ) : null}
    </div>
  );
}

export function StaffItem({ s, myRole, isMe }: { s: StaffRow; myRole: string; isMe: boolean }) {
  const roles = assignable(myRole);
  const canEdit = !isMe && roles.includes(s.role);
  const [edit, setEdit] = useState(false);
  const [role, setRole] = useState(s.role);
  const [sport, setSport] = useState(s.sport ?? "swimming");
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ error?: string; ok?: string; tempPassword?: string } | null>(null);
  const seen = s.last_sign_in_at ? new Date(s.last_sign_in_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "never";

  return (
    <li className={`border-b border-line py-3 ${s.is_active ? "" : "opacity-60"}`}>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <span className="min-w-0 flex-1">
          <span className="font-semibold">{s.full_name || "(no name)"}</span>
          {isMe ? <span className="text-ink-soft"> · you</span> : null}
          <span className="block text-xs text-ink-soft">
            {s.email}
            {s.phone ? ` · ${s.phone}` : ""} · last log-in {seen}
            {s.must_change_password ? " · still on a temporary password" : ""}
          </span>
        </span>
        <span className="text-sm">
          {ROLES[s.role] ?? s.role}
          {s.role === "coach" && s.sport ? ` · ${SPORT[s.sport]}` : ""}
        </span>
        {!s.is_active ? <span className="rounded bg-danger-bg px-1.5 text-xs font-semibold leading-6 text-danger">Switched off</span> : null}
        {canEdit ? (
          <button onClick={() => setEdit(!edit)} className="text-sm font-semibold underline underline-offset-2">
            {edit ? "Close" : "Manage"}
          </button>
        ) : null}
      </div>

      {edit ? (
        <div className="mt-3 flex flex-wrap items-end gap-2 rounded border border-line bg-tile/50 p-3 text-sm">
          <label className="flex flex-col gap-1">
            <span className="label">Role</span>
            <select value={role} onChange={(e) => setRole(e.target.value)} className={field}>
              {roles.map((r) => (
                <option key={r} value={r}>
                  {ROLES[r]}
                </option>
              ))}
            </select>
          </label>
          {role === "coach" ? (
            <label className="flex flex-col gap-1">
              <span className="label">Sport</span>
              <select value={sport} onChange={(e) => setSport(e.target.value)} className={field}>
                <option value="swimming">Swimming</option>
                <option value="jiujitsu">Jiu-jitsu</option>
              </select>
            </label>
          ) : null}
          <button
            disabled={pending || (role === s.role && (role !== "coach" || sport === s.sport))}
            onClick={() => start(async () => setMsg(await updateStaff(s.id, { role, sport: role === "coach" ? sport : null })))}
            className="h-10 rounded border-[1.5px] border-ink bg-ink px-3 font-semibold text-surface disabled:opacity-40">
            Save role
          </button>
          <button
            disabled={pending}
            onClick={() =>
              start(async () => {
                const r = await resetPassword(s.id);
                setMsg("error" in r ? r : { tempPassword: r.tempPassword });
              })
            }
            className="h-10 rounded border-[1.5px] border-ink px-3 font-semibold">
            New temporary password
          </button>
          <button
            disabled={pending}
            onClick={() => start(async () => setMsg(await updateStaff(s.id, { is_active: !s.is_active })))}
            className={`h-10 rounded border-[1.5px] px-3 font-semibold ${s.is_active ? "border-danger text-danger" : "border-ink"}`}>
            {s.is_active ? "Switch off" : "Switch back on"}
          </button>
          <p className="w-full text-xs text-ink-soft">Switching off stops them logging in. Their name stays on past check-ins, notes and payments.</p>
          {msg?.ok ? <p className="w-full font-semibold">{msg.ok}</p> : null}
          {msg?.error ? <p className="w-full font-semibold text-danger">{msg.error}</p> : null}
          {msg?.tempPassword ? (
            <div className="w-full">
              <TempPassword password={msg.tempPassword} email={s.email} />
            </div>
          ) : null}
        </div>
      ) : null}
    </li>
  );
}
