import { ageOn } from "@lg/shared";
import type { SupabaseClient } from "@supabase/supabase-js";

import { monthRange } from "./reports";

// Task 14i: money for one month, compared with the month before (owner, accountant, manager).
//  * Money counts on the day it was paid (Kuwait time).
//  * A registration with swimming and jiu-jitsu is split by number of days.
//  * Refunds count on the day the owner / accountant recorded them.

type Sub = {
  id: string;
  kid_id: string;
  kind: "classes" | "open_pool";
  swim_days: string[];
  bjj_days: string[];
  weeks: number;
  base_price: number;
  total: number;
  status: string;
  payment_method: string | null;
  paid_at: string | null;
};
type Member = { id: string; full_name: string; birth_date: string; is_self: boolean };

export const METHOD: Record<string, string> = { online: "Online (app)", knet_machine: "KNET machine (desk)", payment_link: "Payment link" };
const fils = (n: number) => Math.round(n * 1000) / 1000;
/** Kuwait date (UTC+3) of a timestamp */
const kwDay = (ts: string) => new Date(new Date(ts).getTime() + 3 * 3600_000).toISOString().slice(0, 10);

export async function loadMoneyData(supabase: SupabaseClient) {
  const [subs, members, refunds] = await Promise.all([
    supabase.from("subscriptions").select("id, kid_id, kind, swim_days, bjj_days, weeks, base_price, total, status, payment_method, paid_at"),
    supabase.from("kids").select("id, full_name, birth_date, is_self"),
    supabase.from("requests").select("id, subscription_id, refund_amount, refund_method, refunded_at").eq("refund_status", "refunded"),
  ]);
  return {
    subs: ((subs.data ?? []) as Sub[]).map((s) => ({ ...s, total: Number(s.total), base_price: Number(s.base_price) })),
    members: (members.data ?? []) as Member[],
    refunds: ((refunds.data ?? []) as { id: string; subscription_id: string; refund_amount: number; refund_method: string | null; refunded_at: string }[]).map((r) => ({ ...r, refund_amount: Number(r.refund_amount) })),
  };
}
export type MoneyData = Awaited<ReturnType<typeof loadMoneyData>>;

export function buildMoney(d: MoneyData, month: string) {
  const { start, end, label } = monthRange(month);
  const byId = new Map(d.members.map((m) => [m.id, m]));
  const subById = new Map(d.subs.map((s) => [s.id, s]));
  const inMonth = (ts: string | null) => !!ts && kwDay(ts) >= start && kwDay(ts) <= end;

  const paid = d.subs.filter((s) => inMonth(s.paid_at)).sort((a, b) => a.paid_at!.localeCompare(b.paid_at!));
  const refunds = d.refunds.filter((r) => inMonth(r.refunded_at));

  const gross = fils(paid.reduce((n, s) => n + s.total, 0));
  const refunded = fils(refunds.reduce((n, r) => n + r.refund_amount, 0));
  const discounts = fils(paid.reduce((n, s) => n + Math.max(0, s.base_price - s.total), 0));

  const sport = { swimming: 0, jiujitsu: 0, openPool: 0 };
  for (const s of paid) {
    if (s.kind === "open_pool") sport.openPool += s.total;
    else {
      const days = s.swim_days.length + s.bjj_days.length || 1;
      sport.swimming += (s.total * s.swim_days.length) / days;
      sport.jiujitsu += (s.total * s.bjj_days.length) / days;
    }
  }
  const method: Record<string, number> = { online: 0, knet_machine: 0, payment_link: 0 };
  for (const s of paid) method[s.payment_method ?? "knet_machine"] = (method[s.payment_method ?? "knet_machine"] ?? 0) + s.total;

  const type = { Kid: 0, Titan: 0, Adult: 0 } as Record<string, number>;
  const typeOf = (kidId: string, ts: string) => {
    const m = byId.get(kidId);
    if (!m) return "Kid";
    const age = ageOn(m.birth_date, new Date(ts));
    return m.is_self || age >= 16 ? "Adult" : age >= 11 ? "Titan" : "Kid";
  };
  for (const s of paid) type[typeOf(s.kid_id, s.paid_at!)] += s.total;

  const daysInMonth = Number(end.slice(8, 10));
  const daily = Array.from({ length: daysInMonth }, (_, i) => {
    const day = `${month}-${String(i + 1).padStart(2, "0")}`;
    const amount = paid.filter((s) => kwDay(s.paid_at!) === day).reduce((n, s) => n + s.total, 0);
    const back = refunds.filter((r) => kwDay(r.refunded_at) === day).reduce((n, r) => n + r.refund_amount, 0);
    return { day, amount: fils(amount), refunds: fils(back), count: paid.filter((s) => kwDay(s.paid_at!) === day).length };
  });

  const name = (kidId: string) => byId.get(kidId)?.full_name ?? "—";
  const what = (s: Sub) =>
    s.kind === "open_pool"
      ? "Open pool"
      : [s.swim_days.length ? `Swim ${s.swim_days.length}d` : "", s.bjj_days.length ? `BJJ ${s.bjj_days.length}d` : ""].filter(Boolean).join(" + ") + ` · ${s.weeks >= 12 ? `${s.weeks / 4} mo` : `${s.weeks} wk`}`;

  return {
    month,
    label,
    gross,
    refunded,
    net: fils(gross - refunded),
    discounts,
    count: paid.length,
    average: paid.length ? fils(gross / paid.length) : 0,
    bySport: { swimming: fils(sport.swimming), jiujitsu: fils(sport.jiujitsu), openPool: fils(sport.openPool) },
    byMethod: Object.fromEntries(Object.entries(method).map(([k, v]) => [k, fils(v)])) as Record<string, number>,
    byType: Object.fromEntries(Object.entries(type).map(([k, v]) => [k, fils(v)])) as Record<string, number>,
    daily,
    payments: paid.map((s) => ({
      day: kwDay(s.paid_at!),
      member: name(s.kid_id),
      kidId: s.kid_id,
      what: what(s),
      method: METHOD[s.payment_method ?? ""] ?? "Desk",
      base: s.base_price,
      discount: fils(Math.max(0, s.base_price - s.total)),
      total: s.total,
    })),
    refundList: refunds.map((r) => {
      const s = subById.get(r.subscription_id);
      return { day: kwDay(r.refunded_at), member: s ? name(s.kid_id) : "—", kidId: s?.kid_id ?? "", what: s ? what(s) : "", method: r.refund_method ?? "", amount: r.refund_amount };
    }),
    /** waiting for payment right now (not tied to the month) */
    waiting: fils(d.subs.filter((s) => s.status === "pending_payment").reduce((n, s) => n + s.total, 0)),
    waitingCount: d.subs.filter((s) => s.status === "pending_payment").length,
  };
}
export type Money = ReturnType<typeof buildMoney>;
