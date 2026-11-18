import { addDays, isoDate } from "@lg/shared";
import Link from "next/link";

import { RefundCard, RequestCard, type RequestItem } from "@/components/approvals";
import { requireStaff } from "@/lib/auth";
import { packageLabel, REQUEST_KIND as KIND, shortDate, type Sub } from "@/lib/data";

type Row = {
  id: string;
  kind: RequestItem["kind"];
  status: "pending" | "approved" | "rejected";
  parent_id: string;
  pause_start: string | null;
  pause_days: number | null;
  note: string | null;
  reply: string | null;
  decided_by: string | null;
  decided_at: string | null;
  refund_status: "due" | "refunded" | "none" | null;
  refund_amount: number | null;
  refund_method: string | null;
  created_at: string;
  subscriptions: (Sub & { kids: { id: string; full_name: string } | null }) | null;
};

const METHOD: Record<string, string> = { knet: "KNET", bank_transfer: "bank transfer", cash: "cash" };

export default async function ApprovalsPage() {
  const { supabase, profile } = await requireStaff();
  const canApprove = ["super_admin", "manager", "receptionist"].includes(profile.role);
  const canRefund = ["super_admin", "accountant"].includes(profile.role);

  const cols = "id, kind, status, parent_id, pause_start, pause_days, note, reply, decided_by, decided_at, refund_status, refund_amount, refund_method, created_at, subscriptions(*, kids(id, full_name))";
  const [waiting, refunds, recent] = await Promise.all([
    supabase.from("requests").select(cols).eq("status", "pending").order("created_at"),
    supabase.from("requests").select(cols).eq("refund_status", "due").order("decided_at"),
    supabase.from("requests").select(cols).neq("status", "pending").order("decided_at", { ascending: false }).limit(25),
  ]);
  const all = [...(waiting.data ?? []), ...(refunds.data ?? []), ...(recent.data ?? [])] as unknown as Row[];
  const ids = [...new Set(all.flatMap((r) => [r.parent_id, r.decided_by].filter((x): x is string => !!x)))];
  const { data: people } = ids.length ? await supabase.from("profiles").select("id, full_name, phone").in("id", ids) : { data: [] };
  const person = new Map(((people ?? []) as { id: string; full_name: string; phone: string | null }[]).map((p) => [p.id, p]));

  const item = (r: Row): RequestItem => {
    const s = r.subscriptions;
    const pauseEnd = r.pause_start && r.pause_days ? isoDate(addDays(new Date(r.pause_start + "T00:00:00"), r.pause_days - 1)) : null;
    return {
      id: r.id,
      kind: r.kind,
      member: s?.kids?.full_name ?? "Member",
      memberId: s?.kids?.id ?? "",
      guardian: person.get(r.parent_id)?.full_name ?? "",
      phone: person.get(r.parent_id)?.phone ?? null,
      registration: s ? packageLabel(s) : "",
      dates: s ? `${shortDate(s.start_date)} → ${shortDate(s.end_date)}` : "",
      paid: s?.paid_at ? Number(s.total) : null,
      note: r.note,
      pause: r.pause_start && r.pause_days ? `${r.pause_days} days · ${shortDate(r.pause_start)} → ${shortDate(pauseEnd!)}` : null,
      created_at: r.created_at,
    };
  };
  const waitingRows = (waiting.data ?? []) as unknown as Row[];
  const refundRows = (refunds.data ?? []) as unknown as Row[];
  const recentRows = (recent.data ?? []) as unknown as Row[];

  return (
    <div className="max-w-5xl">
      <h1 className="text-[26px] font-semibold leading-tight">Approvals</h1>
      <p className="text-ink-soft">Requests from guardians. They get your answer in the app inbox.</p>

      <div className="mt-6 grid grid-cols-[1.3fr_1fr] gap-8 max-lg:grid-cols-1">
        <section aria-labelledby="waiting">
          <h2 id="waiting" className="label mb-2">
            Waiting · {waitingRows.length}
          </h2>
          {waitingRows.length === 0 ? (
            <p className="text-ink-soft">Nothing waiting.</p>
          ) : (
            <ul className="flex flex-col gap-3 text-[14px]">
              {waitingRows.map((r) => (
                <RequestCard key={r.id} r={item(r)} canApprove={canApprove} />
              ))}
            </ul>
          )}
        </section>

        <div className="flex flex-col gap-8">
          <section aria-labelledby="refunds">
            <h2 id="refunds" className="label mb-2">
              Refunds to record · {refundRows.length}
            </h2>
            {refundRows.length === 0 ? (
              <p className="text-ink-soft">No refunds waiting.</p>
            ) : (
              <ul className="flex flex-col gap-3 text-[14px]">
                {refundRows.map((r) => (
                  <RefundCard key={r.id} r={item(r)} canRefund={canRefund} />
                ))}
              </ul>
            )}
          </section>

          <section aria-labelledby="recent">
            <h2 id="recent" className="label mb-2">
              Recently answered
            </h2>
            {recentRows.length === 0 ? (
              <p className="text-ink-soft">Nothing yet.</p>
            ) : (
              <ul className="text-[14px]">
                {recentRows.map((r) => {
                  const it = item(r);
                  const by = r.kind === "pause" ? "self-service" : r.decided_by ? person.get(r.decided_by)?.full_name : "";
                  return (
                    <li key={r.id} className="border-b border-line py-2.5">
                      <div className="flex flex-wrap justify-between gap-2">
                        <span>
                          <Link href={`/kids/${it.memberId}`} className="font-semibold underline underline-offset-2">
                            {it.member}
                          </Link>{" "}
                          · {KIND[r.kind]}
                        </span>
                        <span className={`text-xs font-semibold ${r.status === "approved" ? "text-swim" : "text-danger"}`}>{r.status === "approved" ? "Approved" : "Rejected"}</span>
                      </div>
                      <div className="text-xs text-ink-soft">
                        {it.pause ? `${it.pause} · ` : ""}
                        {by ? `${by} · ` : ""}
                        {r.decided_at ? shortDate(r.decided_at.slice(0, 10)) : ""}
                        {r.refund_status === "refunded" ? ` · refund ${Number(r.refund_amount).toFixed(3)} KD${r.refund_method ? ` by ${METHOD[r.refund_method]}` : ""}` : ""}
                        {r.refund_status === "none" ? " · not paid, no refund" : ""}
                      </div>
                      {r.kind === "switch" && r.status === "approved" && r.subscriptions && ["active", "pending_payment"].includes(r.subscriptions.status) ? (
                        <Link href={`/kids/${it.memberId}#regs`} className="text-xs font-semibold underline underline-offset-2">
                          Change the days on the member page →
                        </Link>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
