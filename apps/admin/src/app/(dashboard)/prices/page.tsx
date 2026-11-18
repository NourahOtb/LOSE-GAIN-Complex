import { pricingFrom } from "@lg/shared";

import { PriceEditor } from "@/components/price-editor";
import { requireStaff } from "@/lib/auth";
import { priceChanges } from "@/lib/prices";

const when = (iso: string) => new Date(iso).toLocaleString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" });
const num = (label: string, n: number) => (label.endsWith("(%)") ? `${n}%` : `${n.toFixed(3)} KD`);

export default async function PricesPage() {
  const { supabase, profile } = await requireStaff();
  const [{ data: current }, { data: history }] = await Promise.all([
    supabase.from("pricing").select("config, updated_at, updated_by").eq("id", 1).maybeSingle(),
    supabase.from("pricing_history").select("id, previous, config, changed_by, changed_at").order("changed_at", { ascending: false }).limit(15),
  ]);
  const ids = [...new Set((history ?? []).map((h) => h.changed_by).filter((x): x is string => !!x))];
  const { data: people } = ids.length ? await supabase.from("profiles").select("id, full_name").in("id", ids) : { data: [] };
  const name = new Map(((people ?? []) as { id: string; full_name: string }[]).map((p) => [p.id, p.full_name]));
  const cfg = pricingFrom(current?.config);

  return (
    <div className="max-w-4xl">
      <h1 className="text-[26px] font-semibold leading-tight">Prices &amp; discounts</h1>
      <p className="text-ink-soft">
        Saving changes the prices at once for new registrations and renewals (app, desk and the assistant). Registrations already made keep their price.
      </p>

      <div className="mt-6">
        <PriceEditor initial={cfg} canEdit={profile.role === "super_admin"} />
      </div>

      <section aria-labelledby="history" className="mt-10">
        <h2 id="history" className="label mb-2">
          Change history
        </h2>
        {(history ?? []).length === 0 ? (
          <p className="text-ink-soft">No changes yet. These are the prices from the owner&apos;s price sheets.</p>
        ) : (
          <ul className="text-[14px]">
            {(history ?? []).map((h) => {
              const changes = priceChanges(pricingFrom(h.previous), pricingFrom(h.config));
              return (
                <li key={h.id} className="border-b border-line py-2.5">
                  <div className="text-xs text-ink-soft">
                    {when(h.changed_at)} · {h.changed_by ? (name.get(h.changed_by) ?? "Owner") : "Owner"}
                  </div>
                  <ul className="mt-1">
                    {changes.map((c) => (
                      <li key={c.label}>
                        {c.label}: <span className="text-ink-soft line-through">{num(c.label, c.from)}</span> → <span className="font-semibold">{num(c.label, c.to)}</span>
                      </li>
                    ))}
                  </ul>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
