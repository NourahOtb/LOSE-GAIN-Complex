"use client";

import Link from "next/link";
import { useState, useTransition } from "react";

import { addMember, createFamily, resetPassword } from "@/app/actions";
import { TempPassword } from "@/components/temp-password";

const APP_URL = "https://lg-complex-app.vercel.app";
const field = "h-10 rounded border-[1.5px] border-line bg-surface px-2.5";
const REL: [string, string][] = [
  ["mother", "Mother"],
  ["father", "Father"],
  ["grandmother", "Grandmother"],
  ["grandfather", "Grandfather"],
  ["sister", "Sister"],
  ["brother", "Brother"],
  ["aunt", "Aunt"],
  ["uncle", "Uncle"],
  ["guardian", "Legal guardian"],
];
const HEALTH: [string, string][] = [
  ["asthma", "Asthma"],
  ["allergies", "Allergies"],
  ["epilepsy", "Epilepsy"],
  ["heart", "Heart"],
  ["injury", "Injury"],
  ["medication", "Medication"],
  ["other", "Other"],
];

/** WhatsApp text with the app link and the login, in the family's language. */
export function welcomeText(lang: string, name: string, email: string, password: string) {
  return lang === "ar"
    ? `مرحباً ${name}، أهلاً بكم في مجمع LOSE | GAIN.\nافتح التطبيق: ${APP_URL}\nالبريد: ${email}\nكلمة المرور المؤقتة: ${password}\nسيُطلب منك اختيار كلمة مرور جديدة عند أول دخول.`
    : `Hi ${name}, welcome to LOSE | GAIN Complex.\nOpen the app: ${APP_URL}\nEmail: ${email}\nTemporary password: ${password}\nYou'll be asked to choose your own password when you first log in.`;
}

export function NewFamily() {
  const [f, setF] = useState({ full_name: "", email: "", phone: "", account_type: "family" as "family" | "single", relationship: "mother", lang: "ar" as "ar" | "en" });
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ error?: string; userId?: string; tempPassword?: string } | null>(null);
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((x) => ({ ...x, [k]: v }));

  if (msg?.tempPassword && msg.userId) {
    const mail = f.email.trim().toLowerCase();
    return (
      <div className="flex flex-col gap-4">
        <p className="font-semibold">Account created for {f.full_name.trim()}.</p>
        <TempPassword password={msg.tempPassword} email={mail} whatsapp={{ phone: `965${f.phone.replace(/[^\d]/g, "").slice(-8)}`, text: welcomeText(f.lang, f.full_name.trim(), mail, msg.tempPassword) }} />
        <Link href={`/families/${msg.userId}`} className="self-start rounded border-[1.5px] border-ink bg-ink px-4 py-2.5 font-semibold text-surface">
          Next: add {f.account_type === "single" ? "the member's details" : "the kids"} →
        </Link>
      </div>
    );
  }

  return (
    <div className="flex max-w-2xl flex-col gap-4 rounded-md border border-line bg-surface p-4 text-sm">
      <fieldset className="flex flex-wrap gap-4">
        <legend className="label mb-1.5">Who is this account for?</legend>
        {(
          [
            ["family", "A family (guardian with kids)"],
            ["single", "Just the member (adult)"],
          ] as const
        ).map(([v, l]) => (
          <label key={v} className="flex items-center gap-1.5">
            <input type="radio" name="type" checked={f.account_type === v} onChange={() => set("account_type", v)} className="accent-[var(--ink)]" />
            {l}
          </label>
        ))}
      </fieldset>
      <div className="flex flex-wrap gap-3">
        <label className="flex flex-col gap-1">
          <span className="label">{f.account_type === "single" ? "Member's full name" : "Guardian's full name"}</span>
          <input value={f.full_name} onChange={(e) => set("full_name", e.target.value)} className={`${field} w-56`} />
        </label>
        {f.account_type === "family" ? (
          <label className="flex flex-col gap-1">
            <span className="label">Relationship to the kids</span>
            <select value={f.relationship} onChange={(e) => set("relationship", e.target.value)} className={field}>
              {REL.map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </select>
          </label>
        ) : null}
      </div>
      <div className="flex flex-wrap gap-3">
        <label className="flex flex-col gap-1">
          <span className="label">Mobile (WhatsApp)</span>
          <input inputMode="tel" value={f.phone} onChange={(e) => set("phone", e.target.value)} placeholder="5xxxxxxx" className={`${field} w-36`} />
        </label>
        <label className="flex flex-col gap-1">
          <span className="label">Email (to log in to the app)</span>
          <input type="email" value={f.email} onChange={(e) => set("email", e.target.value)} className={`${field} w-64`} />
        </label>
        <label className="flex flex-col gap-1">
          <span className="label">App language</span>
          <select value={f.lang} onChange={(e) => set("lang", e.target.value as "ar" | "en")} className={field}>
            <option value="ar">Arabic</option>
            <option value="en">English</option>
          </select>
        </label>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <button
          disabled={pending || !f.full_name.trim() || !f.email.trim() || !f.phone.trim()}
          onClick={() =>
            start(async () => {
              const r = await createFamily(f);
              setMsg("error" in r ? { error: r.error } : { userId: r.userId, tempPassword: r.tempPassword });
            })
          }
          className="h-10 rounded border-[1.5px] border-ink bg-ink px-4 font-semibold text-surface disabled:opacity-40">
          {pending ? "Creating…" : "Create account"}
        </button>
        {msg?.error ? <span className="font-semibold text-danger">{msg.error}</span> : null}
      </div>
    </div>
  );
}

export function AddMemberForm({ parentId, single, selfName }: { parentId: string; single: boolean; selfName: string }) {
  const empty = { full_name: "", birth_date: "", gender: "", emergency_phone: "", health: [] as string[], health_other: "" };
  const [f, setF] = useState(empty);
  const [confirmed, setConfirmed] = useState(false);
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ error?: string; ok?: string; id?: string } | null>(null);
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((x) => ({ ...x, [k]: v }));

  return (
    <div className="flex flex-col gap-3 rounded-md border border-line bg-surface p-4 text-sm">
      <div className="flex flex-wrap gap-3">
        {single ? (
          <p className="w-full">
            Member: <span className="font-semibold">{selfName}</span>
          </p>
        ) : (
          <label className="flex flex-col gap-1">
            <span className="label">Kid&apos;s full name</span>
            <input value={f.full_name} onChange={(e) => set("full_name", e.target.value)} className={`${field} w-56`} />
          </label>
        )}
        <label className="flex flex-col gap-1">
          <span className="label">Date of birth</span>
          <input type="date" value={f.birth_date} onChange={(e) => set("birth_date", e.target.value)} className={field} />
        </label>
        <fieldset className="flex flex-col gap-1">
          <legend className="label mb-1">{single ? "Male / female" : "Boy / girl"}</legend>
          <div className="flex h-10 items-center gap-4">
            {(
              [
                ["male", single ? "Male" : "Boy"],
                ["female", single ? "Female" : "Girl"],
              ] as const
            ).map(([v, l]) => (
              <label key={v} className="flex items-center gap-1.5">
                <input type="radio" name={`g-${parentId}`} checked={f.gender === v} onChange={() => set("gender", v)} className="accent-[var(--ink)]" />
                {l}
              </label>
            ))}
          </div>
        </fieldset>
        <label className="flex flex-col gap-1">
          <span className="label">Emergency mobile (optional)</span>
          <input inputMode="tel" value={f.emergency_phone} onChange={(e) => set("emergency_phone", e.target.value)} className={`${field} w-36`} />
        </label>
      </div>
      <fieldset>
        <legend className="label mb-1.5">Health (ask the guardian)</legend>
        <div className="flex flex-wrap gap-1.5">
          {HEALTH.map(([k, l]) => {
            const on = f.health.includes(k);
            return (
              <button
                key={k}
                type="button"
                aria-pressed={on}
                onClick={() => set("health", on ? f.health.filter((x) => x !== k) : [...f.health, k])}
                className={`h-8 rounded border-[1.5px] px-2.5 text-xs font-semibold ${on ? "border-danger bg-danger text-white" : "border-line"}`}>
                {l}
              </button>
            );
          })}
        </div>
        <input value={f.health_other} onChange={(e) => set("health_other", e.target.value)} placeholder="Other details (optional)" className={`${field} mt-2 w-full`} />
        <label className="mt-2 flex items-center gap-2">
          <input type="checkbox" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} className="accent-[var(--ink)]" />
          The guardian confirmed the health answers {f.health.length ? "" : "(no conditions)"}
        </label>
      </fieldset>
      <div className="flex flex-wrap items-center gap-3">
        <button
          disabled={pending || !confirmed || !f.birth_date || !f.gender || (!single && !f.full_name.trim())}
          onClick={() =>
            start(async () => {
              const r = await addMember(parentId, f);
              setMsg(r);
              if (r.ok) {
                setF(empty);
                setConfirmed(false);
              }
            })
          }
          className="h-10 rounded border-[1.5px] border-ink bg-ink px-4 font-semibold text-surface disabled:opacity-40">
          {pending ? "Adding…" : single ? "Save member" : "Add kid"}
        </button>
        {msg?.ok && msg.id ? (
          <span className="font-semibold">
            {msg.ok} ·{" "}
            <Link href={`/kids/${msg.id}`} className="underline underline-offset-2">
              Register them →
            </Link>
          </span>
        ) : null}
        {msg?.error ? <span className="font-semibold text-danger">{msg.error}</span> : null}
      </div>
    </div>
  );
}

/** A family forgot their password, or never got the first one: make a new temporary one. */
export function FamilyNewPassword({ parentId, name, email, phone, lang }: { parentId: string; name: string; email: string; phone: string | null; lang: string }) {
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ error?: string; tempPassword?: string } | null>(null);
  if (msg?.tempPassword) return <TempPassword password={msg.tempPassword} email={email} whatsapp={{ phone, text: welcomeText(lang, name, email, msg.tempPassword) }} />;
  return (
    <span className="flex flex-wrap items-center gap-2">
      <button
        disabled={pending}
        onClick={() =>
          start(async () => {
            const r = await resetPassword(parentId);
            setMsg("error" in r ? { error: r.error } : { tempPassword: r.tempPassword });
          })
        }
        className="h-9 rounded border-[1.5px] border-ink px-3 text-sm font-semibold">
        {pending ? "Making…" : "New temporary password"}
      </button>
      {msg?.error ? <span className="text-sm font-semibold text-danger">{msg.error}</span> : null}
    </span>
  );
}
