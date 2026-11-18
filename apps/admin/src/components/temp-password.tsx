"use client";

import { useState } from "react";

/** Shows a temporary password once, with Copy and an optional WhatsApp message. */
export function TempPassword({ password, email, whatsapp }: { password: string; email: string; whatsapp?: { phone: string | null; text: string } }) {
  const [copied, setCopied] = useState(false);
  const wa = whatsapp ? `https://wa.me/${(whatsapp.phone ?? "").replace(/[^\d]/g, "")}?text=${encodeURIComponent(whatsapp.text)}` : null;
  return (
    <div className="rounded-md border-[1.5px] border-ink bg-tile p-4 text-sm">
      <p className="font-semibold">Temporary password (shown only now)</p>
      <p className="mt-1 text-ink-soft">Log in with {email}. They&apos;ll be asked to choose their own password straight away.</p>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <code className="rounded bg-surface px-3 py-1.5 text-[17px] font-semibold tracking-wide">{password}</code>
        <button
          onClick={() => {
            navigator.clipboard.writeText(password).then(() => setCopied(true), () => setCopied(false));
          }}
          className="h-9 rounded border-[1.5px] border-ink px-3 font-semibold">
          {copied ? "Copied" : "Copy"}
        </button>
        {wa ? (
          <a href={wa} target="_blank" rel="noreferrer" className="flex h-9 items-center rounded border-[1.5px] border-ink bg-ink px-3 font-semibold text-surface">
            WhatsApp
          </a>
        ) : null}
      </div>
    </div>
  );
}
