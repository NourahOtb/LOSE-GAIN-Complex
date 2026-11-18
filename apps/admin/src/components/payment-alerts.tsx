"use client";

import { useState, useTransition } from "react";

import { resolvePaymentAlert } from "@/app/actions";

export type PaymentAlert = { id: string; member: string; kidId: string; amount: number; reason: "paid_twice" | "paid_after_cancel"; when: string };

/** Money that came in twice (or after a cancellation): refund it outside the app, then mark it handled. */
export function PaymentAlerts({ items }: { items: PaymentAlert[] }) {
  if (!items.length) return null;
  return (
    <section aria-labelledby="pay-alerts" className="mt-4 rounded-md border-[1.5px] border-danger bg-danger-bg p-4 text-sm">
      <h2 id="pay-alerts" className="font-semibold text-danger">
        Refund needed · {items.length} extra payment{items.length === 1 ? "" : "s"}
      </h2>
      <ul className="mt-2">
        {items.map((a) => (
          <Row key={a.id} a={a} />
        ))}
      </ul>
    </section>
  );
}

function Row({ a }: { a: PaymentAlert }) {
  const [pending, start] = useTransition();
  const [done, setDone] = useState(false);
  return (
    <li className="flex flex-wrap items-center gap-2 border-t border-danger/30 py-2">
      <span className="min-w-0 flex-1">
        <a href={`/kids/${a.kidId}`} className="font-semibold underline underline-offset-2">
          {a.member}
        </a>{" "}
        paid {a.amount.toFixed(3)} KD {a.reason === "paid_twice" ? "a second time (already paid)" : "after the registration was cancelled"} · {a.when}
      </span>
      {done ? (
        <span className="text-xs font-semibold">Handled</span>
      ) : (
        <button
          disabled={pending}
          onClick={() =>
            start(async () => {
              const r = await resolvePaymentAlert(a.id);
              if (r.ok) setDone(true);
            })
          }
          className="h-8 rounded border-[1.5px] border-ink bg-surface px-2.5 text-xs font-semibold disabled:opacity-50">
          Refunded · mark handled
        </button>
      )}
    </li>
  );
}
