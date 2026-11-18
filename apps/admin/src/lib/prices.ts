import type { PricingConfig } from "@lg/shared";

/** Every editable number with a plain-English label (used for the change history). */
export function priceLines(c: PricingConfig): { key: string; label: string; value: number }[] {
  const out: { key: string; label: string; value: number }[] = [];
  const wk = (w: string) => (w === "1" ? "1 week" : `${w} weeks`);
  for (const [w, row] of Object.entries(c.kids)) for (const [d, v] of Object.entries(row ?? {})) out.push({ key: `kids.${w}.${d}`, label: `Kids · ${wk(w)} · ${d} days`, value: Number(v) });
  for (const [d, v] of Object.entries(c.adults)) out.push({ key: `adults.${d}`, label: `Men's swimming · ${d} days`, value: Number(v) });
  for (const g of ["male", "female"] as const)
    for (const [w, row] of Object.entries(c.adultBjj[g])) for (const [d, v] of Object.entries(row ?? {})) out.push({ key: `adultBjj.${g}.${w}.${d}`, label: `${g === "male" ? "Men's" : "Women's"} jiu-jitsu · ${wk(w)} · ${d} days`, value: Number(v) });
  out.push({ key: "openPool", label: "Open pool · 4 weeks", value: c.openPool });
  for (const [n, v] of Object.entries(c.family)) out.push({ key: `family.${n}`, label: `Family discount · ${n === "5" ? "5+" : n} kids (%)`, value: Number(v) });
  for (const [m, v] of Object.entries(c.months)) out.push({ key: `months.${m}`, label: `${m}-month discount (%)`, value: Number(v) });
  return out;
}

export function priceChanges(before: PricingConfig, after: PricingConfig) {
  const old = new Map(priceLines(before).map((l) => [l.key, l.value]));
  return priceLines(after)
    .filter((l) => old.get(l.key) !== l.value)
    .map((l) => ({ label: l.label, from: old.get(l.key) ?? 0, to: l.value }));
}
