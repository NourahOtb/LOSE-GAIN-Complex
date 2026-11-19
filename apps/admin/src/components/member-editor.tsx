"use client";

import { useState, useTransition } from "react";

import { updateMember } from "@/app/actions";

const HEALTH: [string, string][] = [
  ["asthma", "Asthma"],
  ["allergies", "Allergies"],
  ["epilepsy", "Epilepsy"],
  ["heart", "Heart condition"],
  ["injury", "Recent injury or surgery"],
  ["medication", "Takes medication"],
  ["other", "Other"],
];
const field = "mt-1 block h-10 w-full rounded border-[1.5px] border-line bg-surface px-2.5";

/** Staff edit a member's details. */
export function MemberEditor({
  kid,
  adult,
}: {
  kid: { id: string; first_name: string; last_name: string; relationship: string; birth_date: string; gender: string; emergency_phone: string; health: string[]; health_other: string };
  adult: boolean;
}) {
  const [f, setF] = useState(kid);
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ error?: string; ok?: string } | null>(null);
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => {
    setMsg(null);
    setF((cur) => ({ ...cur, [k]: v }));
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => setMsg(await updateMember(kid.id, f)));
      }}
      className="grid gap-3 rounded-md border border-line bg-surface p-4 text-[14px]">
      <div className="grid grid-cols-2 gap-3">
        <label>
          <span className="label">First name</span>
          <input value={f.first_name} onChange={(e) => set("first_name", e.target.value)} className={field} />
        </label>
        <label>
          <span className="label">Last name</span>
          <input value={f.last_name} onChange={(e) => set("last_name", e.target.value)} className={field} />
        </label>
      </div>
      {!adult || f.relationship ? (
        <label>
          <span className="label">Guardian is their…</span>
          <select value={f.relationship} onChange={(e) => set("relationship", e.target.value)} className={field}>
            <option value="">Not set</option>
            {[
              ["mother", "Mother"],
              ["father", "Father"],
              ["grandmother", "Grandmother"],
              ["grandfather", "Grandfather"],
              ["aunt", "Aunt"],
              ["uncle", "Uncle"],
              ["sister", "Sister"],
              ["brother", "Brother"],
              ["cousin", "Cousin"],
              ["guardian", "Legal guardian"],
            ].map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
        </label>
      ) : null}
      <div className="grid grid-cols-2 gap-3">
        <label>
          <span className="label">Date of birth</span>
          <input type="date" value={f.birth_date} onChange={(e) => set("birth_date", e.target.value)} className={field} />
        </label>
        <fieldset>
          <legend className="label">{adult ? "Male / female" : "Boy / girl"}</legend>
          <div className="mt-1 flex h-10 overflow-hidden rounded border-[1.5px] border-ink">
            {(["male", "female"] as const).map((g) => (
              <button
                key={g}
                type="button"
                onClick={() => set("gender", g)}
                aria-pressed={f.gender === g}
                className={`flex-1 font-semibold ${f.gender === g ? "bg-ink text-surface" : ""}`}>
                {g === "male" ? (adult ? "Male" : "Boy") : adult ? "Female" : "Girl"}
              </button>
            ))}
          </div>
        </fieldset>
      </div>
      <label>
        <span className="label">Emergency phone</span>
        <input value={f.emergency_phone} onChange={(e) => set("emergency_phone", e.target.value)} inputMode="tel" placeholder="9XXX XXXX" className={field} />
      </label>
      <fieldset>
        <legend className="label">Health</legend>
        <div className="mt-1 flex flex-wrap gap-2">
          {HEALTH.map(([k, l]) => {
            const on = f.health.includes(k);
            return (
              <button
                key={k}
                type="button"
                aria-pressed={on}
                onClick={() => set("health", on ? f.health.filter((x) => x !== k) : [...f.health, k])}
                className={`min-h-9 rounded border-[1.5px] px-3 font-semibold ${on ? "border-danger bg-danger text-white" : "border-line"}`}>
                {l}
              </button>
            );
          })}
        </div>
        <input value={f.health_other} onChange={(e) => set("health_other", e.target.value)} placeholder="Other details (optional)" className={`${field} mt-2`} />
      </fieldset>
      {msg?.error ? <p className="font-semibold text-danger">{msg.error}</p> : null}
      <div className="flex items-center gap-3">
        <button disabled={pending} className="h-10 rounded border-[1.5px] border-ink bg-ink px-5 font-semibold text-surface disabled:opacity-50">
          {pending ? "Saving…" : "Save"}
        </button>
        {msg?.ok ? <span className="text-sm font-semibold">{msg.ok}</span> : null}
      </div>
    </form>
  );
}
