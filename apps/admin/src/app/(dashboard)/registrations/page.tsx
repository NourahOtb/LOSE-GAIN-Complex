import { MarkPaid } from "@/components/mark-paid";
import { requireStaff } from "@/lib/auth";
import { kd, packageLabel, shortDate, type Sub } from "@/lib/data";

const STATUS: Record<string, { label: string; cls: string }> = {
  pending_payment: { label: "Waiting for payment", cls: "bg-warn-bg text-warn-ink" },
  active: { label: "Active", cls: "bg-tile text-swim" },
  expired: { label: "Expired", cls: "bg-line text-ink-soft" },
  cancel_requested: { label: "Cancel requested", cls: "bg-danger-bg text-danger" },
  cancelled: { label: "Cancelled", cls: "bg-line text-ink-soft" },
};

const METHOD: Record<string, string> = { knet_machine: "KNET", payment_link: "Link", online: "Online" };

export default async function RegistrationsPage() {
  const { supabase } = await requireStaff();
  const [subsRes, kidsRes, parentsRes] = await Promise.all([
    supabase.from("subscriptions").select("*").order("created_at", { ascending: false }).limit(200),
    supabase.from("kids").select("id, full_name, parent_id, member_no"),
    supabase.from("profiles").select("id, full_name, phone").eq("role", "parent"),
  ]);
  const subs = (subsRes.data ?? []) as Sub[];
  const kids = new Map((kidsRes.data ?? []).map((k: { id: string; full_name: string; parent_id: string; member_no: number }) => [k.id, k]));
  const parents = new Map((parentsRes.data ?? []).map((p: { id: string; full_name: string; phone: string | null }) => [p.id, p]));

  return (
    <div>
      <h1 className="text-[26px] font-semibold">Registrations</h1>
      <p className="text-ink-soft">Newest first. Mark desk payments here to activate a subscription.</p>
      <div className="mt-5 overflow-x-auto rounded-md border border-line bg-surface">
        <table className="w-full min-w-[820px] text-[14px]">
          <thead>
            <tr className="border-b border-ink text-left">
              {["Kid", "Parent", "Package", "Dates", "Classes", "KD", "Status", ""].map((h) => (
                <th key={h} className="label px-3 py-2.5 font-bold">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {subs.map((s) => {
              const kid = kids.get(s.kid_id);
              const parent = kid ? parents.get(kid.parent_id) : undefined;
              const st = STATUS[s.status] ?? STATUS.expired;
              return (
                <tr key={s.id} className="border-b border-line align-top last:border-0">
                  <td className="px-3 py-2.5">
                    <div className="font-semibold">{kid?.full_name}</div>
                    <div className="text-xs text-ink-soft">Member {kid?.member_no}</div>
                  </td>
                  <td className="px-3 py-2.5">
                    <div>{parent?.full_name}</div>
                    <div className="text-xs text-ink-soft">{parent?.phone}</div>
                  </td>
                  <td className="px-3 py-2.5">{packageLabel(s)}</td>
                  <td className="whitespace-nowrap px-3 py-2.5">
                    {shortDate(s.start_date)} → {shortDate(s.end_date)}
                  </td>
                  <td className="px-3 py-2.5">
                    {s.sessions_total - s.sessions_used} / {s.sessions_total}
                  </td>
                  <td className="px-3 py-2.5 font-semibold">
                    {kd(s.total)}
                    {Number(s.discount_pct) > 0 ? <div className="text-xs font-normal text-swim">−{Number(s.discount_pct)}%</div> : null}
                  </td>
                  <td className="px-3 py-2.5">
                    <span className={`whitespace-nowrap rounded px-2 py-0.5 text-xs font-semibold ${st.cls}`}>{st.label}</span>
                    {s.payment_method ? <div className="mt-1 text-xs text-ink-soft">{METHOD[s.payment_method]}</div> : null}
                  </td>
                  <td className="px-3 py-2.5 text-right">{s.status === "pending_payment" ? <MarkPaid id={s.id} /> : null}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
