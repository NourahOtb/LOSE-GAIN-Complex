"use client";

import { useState, useTransition } from "react";

import { sendCheckOn } from "@/app/actions";

/** "Check on them": an app inbox message, or a ready WhatsApp message to the guardian. */
export function CheckOn({ kidId, name, missed, phone, lang }: { kidId: string; name: string; missed: number; phone: string | null; lang: string }) {
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ error?: string; ok?: string } | null>(null);
  const text =
    lang === "ar"
      ? `مرحباً، معكم مجمع LOSE | GAIN. لاحظنا غياب ${name} عن ${missed} حصص مؤخراً، هل كل شيء على ما يرام؟ يسعدنا مساعدتكم إذا احتجتم تغيير المواعيد أو إيقاف الاشتراك.`
      : `Hi, this is LOSE | GAIN Complex. We noticed ${name} missed ${missed} classes recently. Is everything okay? We're happy to help if you need to change days or pause the registration.`;
  const wa = phone ? `https://wa.me/${phone.replace(/[^\d]/g, "")}?text=${encodeURIComponent(text)}` : null;
  if (msg?.ok) return <span className="text-xs font-semibold">{msg.ok}</span>;
  return (
    <span className="flex flex-wrap items-center gap-1.5">
      <button
        disabled={pending}
        onClick={() => start(async () => setMsg(await sendCheckOn(kidId, missed)))}
        className="h-8 rounded border-[1.5px] border-ink px-2.5 text-xs font-semibold disabled:opacity-50">
        {pending ? "Sending…" : "Check on them"}
      </button>
      {wa ? (
        <a href={wa} target="_blank" rel="noreferrer" className="flex h-8 items-center rounded border-[1.5px] border-ink px-2.5 text-xs font-semibold">
          WhatsApp
        </a>
      ) : null}
      {msg?.error ? <span className="text-xs font-semibold text-danger">{msg.error}</span> : null}
    </span>
  );
}
