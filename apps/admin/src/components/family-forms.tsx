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
  ["aunt", "Aunt"],
  ["uncle", "Uncle"],
  ["sister", "Sister"],
  ["brother", "Brother"],
  ["cousin", "Cousin"],
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

// ---------- one member's details (kid, or the account holder) ----------

export type MemberDraft = {
  first_name: string;
  last_name: string;
  birth_date: string;
  gender: string;
  emergency_phone: string;
  health: string[];
  health_other: string;
  confirmed: boolean;
  /** the guardian's relationship to this kid */
  relationship: string;
};
export const emptyMember = (): MemberDraft => ({ first_name: "", last_name: "", birth_date: "", gender: "", emergency_phone: "", health: [], health_other: "", confirmed: false, relationship: "" });
/** a kid needs both names and the guardian's relationship; the account holder's name comes from the account */
const memberReady = (m: MemberDraft, isKid: boolean) => (!isKid || (m.first_name.trim() && m.last_name.trim() && m.relationship)) && !!m.birth_date && !!m.gender && m.confirmed;

function MemberFields({ m, onChange, adult, withName, idKey }: { m: MemberDraft; onChange: (m: MemberDraft) => void; adult: boolean; withName: boolean; idKey: string }) {
  const set = <K extends keyof MemberDraft>(k: K, v: MemberDraft[K]) => onChange({ ...m, [k]: v });
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-3">
        {withName ? (
          <>
            <label className="flex flex-col gap-1">
              <span className="label">First name</span>
              <input value={m.first_name} onChange={(e) => set("first_name", e.target.value)} className={`${field} w-40`} />
            </label>
            <label className="flex flex-col gap-1">
              <span className="label">Last name</span>
              <input value={m.last_name} onChange={(e) => set("last_name", e.target.value)} className={`${field} w-40`} />
            </label>
            <label className="flex flex-col gap-1">
              <span className="label">Guardian is their…</span>
              <select value={m.relationship} onChange={(e) => set("relationship", e.target.value)} className={field}>
                <option value="">Choose</option>
                {REL.map(([v, l]) => (
                  <option key={v} value={v}>
                    {l}
                  </option>
                ))}
              </select>
            </label>
          </>
        ) : null}
        <label className="flex flex-col gap-1">
          <span className="label">Date of birth</span>
          <input type="date" value={m.birth_date} onChange={(e) => set("birth_date", e.target.value)} className={field} />
        </label>
        <fieldset className="flex flex-col gap-1">
          <legend className="label mb-1">{adult ? "Male / female" : "Boy / girl"}</legend>
          <div className="flex h-10 items-center gap-4">
            {(
              [
                ["male", adult ? "Male" : "Boy"],
                ["female", adult ? "Female" : "Girl"],
              ] as const
            ).map(([v, l]) => (
              <label key={v} className="flex items-center gap-1.5">
                <input type="radio" name={`g-${idKey}`} checked={m.gender === v} onChange={() => set("gender", v)} className="accent-[var(--ink)]" />
                {l}
              </label>
            ))}
          </div>
        </fieldset>
        <label className="flex flex-col gap-1">
          <span className="label">Emergency mobile (optional)</span>
          <input inputMode="tel" value={m.emergency_phone} onChange={(e) => set("emergency_phone", e.target.value)} className={`${field} w-36`} />
        </label>
      </div>
      <fieldset>
        <legend className="label mb-1.5">Health (ask the guardian)</legend>
        <div className="flex flex-wrap gap-1.5">
          {HEALTH.map(([k, l]) => {
            const on = m.health.includes(k);
            return (
              <button
                key={k}
                type="button"
                aria-pressed={on}
                onClick={() => set("health", on ? m.health.filter((x) => x !== k) : [...m.health, k])}
                className={`h-8 rounded border-[1.5px] px-2.5 text-xs font-semibold ${on ? "border-danger bg-danger text-white" : "border-line"}`}>
                {l}
              </button>
            );
          })}
        </div>
        <input value={m.health_other} onChange={(e) => set("health_other", e.target.value)} placeholder="Other details (optional)" className={`${field} mt-2 w-full`} />
        <label className="mt-2 flex items-center gap-2">
          <input type="checkbox" checked={m.confirmed} onChange={(e) => set("confirmed", e.target.checked)} className="accent-[var(--ink)]" />
          The health answers are confirmed {m.health.length ? "" : "(no conditions)"}
        </label>
      </fieldset>
    </div>
  );
}

// ---------- new family (or "just me" member) at the desk, with its members in one go ----------

export function NewFamily() {
  const [f, setF] = useState({ full_name: "", email: "", phone: "", account_type: "family" as "family" | "single", lang: "ar" as "ar" | "en" });
  const [kids, setKids] = useState<MemberDraft[]>([emptyMember()]);
  const [guardianTrains, setGuardianTrains] = useState(false);
  const [self, setSelf] = useState<MemberDraft>(emptyMember());
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ error?: string; userId?: string; tempPassword?: string; added?: { id: string; name: string }[]; failed?: string[] } | null>(null);
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((x) => ({ ...x, [k]: v }));
  const single = f.account_type === "single";

  // kids with anything typed in count; empty rows are ignored
  const typedKids = single ? [] : kids.filter((k) => k.first_name.trim() || k.last_name.trim() || k.birth_date || k.gender);
  const withSelf = single || guardianTrains;
  const notReady = [
    ...(withSelf && !memberReady(self, false) ? [single ? "the member's details" : "the guardian's details"] : []),
    ...typedKids.map((k, i) => (memberReady(k, true) ? "" : `kid ${i + 1}`)).filter(Boolean),
  ];

  if (msg?.tempPassword && msg.userId) {
    const mail = f.email.trim().toLowerCase();
    return (
      <div className="flex flex-col gap-4">
        <p className="font-semibold">Account created for {f.full_name.trim()}.</p>
        <TempPassword password={msg.tempPassword} email={mail} whatsapp={{ phone: `965${f.phone.replace(/[^\d]/g, "").slice(-8)}`, text: welcomeText(f.lang, f.full_name.trim(), mail, msg.tempPassword) }} />
        {msg.added?.length ? (
          <div className="rounded-md border border-line bg-surface p-4 text-sm">
            <p className="label mb-2">Members added · register each one</p>
            <ul>
              {msg.added.map((a) => (
                <li key={a.id} className="flex items-center justify-between gap-3 border-b border-line py-2 last:border-0">
                  <span className="font-semibold">{a.name}</span>
                  <Link href={`/kids/${a.id}#desk`} className="font-semibold underline underline-offset-2">
                    Register →
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
        {msg.failed?.length ? <p className="font-semibold text-danger">Couldn&apos;t add: {msg.failed.join(", ")}. Add them on the family page.</p> : null}
        <Link href={`/families/${msg.userId}`} className="self-start rounded border-[1.5px] border-ink px-4 py-2.5 font-semibold">
          Open the family page →
        </Link>
      </div>
    );
  }

  return (
    <div className="flex max-w-3xl flex-col gap-5 text-sm">
      <div className="flex flex-col gap-4 rounded-md border border-line bg-surface p-4">
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
            <span className="label">{single ? "Member's full name" : "Guardian's full name"}</span>
            <input value={f.full_name} onChange={(e) => set("full_name", e.target.value)} className={`${field} w-56`} />
          </label>
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
      </div>

      {single ? (
        <section className="rounded-md border border-line bg-surface p-4">
          <h2 className="label mb-3">The member</h2>
          <MemberFields m={self} onChange={setSelf} adult withName={false} idKey="self" />
        </section>
      ) : (
        <>
          <section className="rounded-md border border-line bg-surface p-4">
            <label className="flex items-center gap-2 font-semibold">
              <input type="checkbox" checked={guardianTrains} onChange={(e) => setGuardianTrains(e.target.checked)} className="accent-[var(--ink)]" />
              The guardian also trains here (adult swimming, jiu-jitsu or open pool)
            </label>
            {guardianTrains ? (
              <div className="mt-3">
                <MemberFields m={self} onChange={setSelf} adult withName={false} idKey="guardian" />
              </div>
            ) : null}
          </section>
          {kids.map((k, i) => (
            <section key={i} className="rounded-md border border-line bg-surface p-4">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="label">Kid {i + 1}</h2>
                {kids.length > 1 ? (
                  <button type="button" onClick={() => setKids((all) => all.filter((_, j) => j !== i))} className="text-xs font-semibold underline underline-offset-2">
                    Remove
                  </button>
                ) : null}
              </div>
              <MemberFields m={k} onChange={(m) => setKids((all) => all.map((x, j) => (j === i ? m : x)))} adult={false} withName idKey={`kid-${i}`} />
            </section>
          ))}
          <button type="button" onClick={() => setKids((all) => [...all, emptyMember()])} className="self-start rounded border-[1.5px] border-ink px-3 py-2 font-semibold">
            + Add another kid
          </button>
        </>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <button
          disabled={pending || !f.full_name.trim() || !f.email.trim() || !f.phone.trim() || notReady.length > 0}
          onClick={() =>
            start(async () => {
              const r = await createFamily(f);
              if ("error" in r) return setMsg({ error: r.error });
              const added: { id: string; name: string }[] = [];
              const failed: string[] = [];
              const todo = [...(withSelf ? [{ ...self, is_self: true }] : []), ...typedKids.map((k) => ({ ...k, is_self: false }))];
              for (const m of todo) {
                const a = await addMember(r.userId, m);
                const label = m.is_self ? f.full_name.trim() : `${m.first_name.trim()} ${m.last_name.trim()}`;
                if (a.ok && a.id) added.push({ id: a.id, name: label });
                else failed.push(label);
              }
              setMsg({ userId: r.userId, tempPassword: r.tempPassword, added, failed });
            })
          }
          className="h-10 rounded border-[1.5px] border-ink bg-ink px-4 font-semibold text-surface disabled:opacity-40">
          {pending ? "Creating…" : single ? "Create account" : `Create account${typedKids.length + (guardianTrains ? 1 : 0) ? ` + ${typedKids.length + (guardianTrains ? 1 : 0)} member${typedKids.length + (guardianTrains ? 1 : 0) === 1 ? "" : "s"}` : ""}`}
        </button>
        {notReady.length ? <span className="text-ink-soft">To finish: {notReady.join(", ")} (names, relationship, birth date, boy/girl, health confirmed).</span> : null}
        {msg?.error ? <span className="font-semibold text-danger">{msg.error}</span> : null}
      </div>
    </div>
  );
}

// ---------- add one more member to an existing family ----------

export function AddMemberForm({ parentId, single, selfName, canAddSelf }: { parentId: string; single: boolean; selfName: string; canAddSelf: boolean }) {
  const [m, setM] = useState<MemberDraft>(emptyMember());
  const [asSelf, setAsSelf] = useState(false);
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ error?: string; ok?: string; id?: string } | null>(null);
  const isSelf = single || asSelf;

  return (
    <div className="flex flex-col gap-3 rounded-md border border-line bg-surface p-4 text-sm">
      {single ? (
        <p>
          Member: <span className="font-semibold">{selfName}</span>
        </p>
      ) : canAddSelf ? (
        <label className="flex items-center gap-2 font-semibold">
          <input type="checkbox" checked={asSelf} onChange={(e) => setAsSelf(e.target.checked)} className="accent-[var(--ink)]" />
          This is the guardian ({selfName}), who also trains here
        </label>
      ) : null}
      <MemberFields m={m} onChange={setM} adult={isSelf} withName={!isSelf} idKey={`add-${parentId}`} />
      <div className="flex flex-wrap items-center gap-3">
        <button
          disabled={pending || !memberReady(m, !isSelf)}
          onClick={() =>
            start(async () => {
              const r = await addMember(parentId, { ...m, is_self: isSelf });
              setMsg(r);
              if (r.ok) {
                setM(emptyMember());
                setAsSelf(false);
              }
            })
          }
          className="h-10 rounded border-[1.5px] border-ink bg-ink px-4 font-semibold text-surface disabled:opacity-40">
          {pending ? "Adding…" : isSelf ? "Save member" : "Add kid"}
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
