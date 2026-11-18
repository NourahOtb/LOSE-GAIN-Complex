"use client";

import { useState, useTransition } from "react";

import { sendPaymentLink } from "@/app/actions";

/** Create a UPayments link for a family, then copy it or send it on WhatsApp. It also appears in their app inbox. */
export function SendLink({ id, kid, amount }: { id: string; kid: string; amount: number }) {
  const [pending, start] = useTransition();
  const [res, setRes] = useState<{ error?: string; link?: string; phone?: string | null; lang?: string } | null>(null);
  const [copied, setCopied] = useState(false);

  if (res?.link) {
    const kd = amount.toFixed(3);
    const text =
      res.lang === "ar"
        ? `LOSE | GAIN Complex: رابط الدفع لـ ${kid} (${kd} د.ك). صالح لمدة ٢٤ ساعة:\n${res.link}`
        : `LOSE | GAIN Complex: payment link for ${kid} (${kd} KD). Valid for 24 hours:\n${res.link}`;
    const digits = (res.phone ?? "").replace(/\D/g, "");
    return (
      <div className="flex flex-wrap items-center gap-1.5 text-[13px]">
        <button
          onClick={async () => {
            await navigator.clipboard.writeText(res.link!);
            setCopied(true);
          }}
          className="rounded border-[1.5px] border-ink px-2.5 py-1.5 font-semibold">
          {copied ? "Copied" : "Copy link"}
        </button>
        <a
          href={`https://wa.me/${digits}?text=${encodeURIComponent(text)}`}
          target="_blank"
          rel="noreferrer"
          className="rounded border-[1.5px] border-[#1f8f4e] bg-[#1f8f4e] px-2.5 py-1.5 font-semibold text-white">
          WhatsApp{digits ? "" : " (no phone)"}
        </a>
        <span className="text-ink-soft">Also in their app inbox</span>
      </div>
    );
  }
  return (
    <span className="flex flex-col items-end gap-1">
      <button
        onClick={() => start(async () => setRes(await sendPaymentLink(id)))}
        disabled={pending}
        className="whitespace-nowrap rounded border-[1.5px] border-ink px-2.5 py-1.5 text-[13px] font-semibold disabled:opacity-50">
        {pending ? "Creating…" : "Send payment link"}
      </button>
      {res?.error ? <span className="text-xs font-semibold text-danger">{res.error}</span> : null}
    </span>
  );
}
