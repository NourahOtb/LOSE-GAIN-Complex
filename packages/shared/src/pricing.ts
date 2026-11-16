/**
 * LOSE | GAIN Complex price calculator.
 * Source: the owner's price sheets (docs/pricing/), PRD section 6.2–6.3.
 * Every number lives in PricingConfig so the super admin can change it later.
 */

export type Weekday = 'sat' | 'sun' | 'mon' | 'tue' | 'wed' | 'thu';
export const WEEKDAYS: readonly Weekday[] = ['sat', 'sun', 'mon', 'tue', 'wed', 'thu'];

export type Duration = '1w' | '2w' | '4w' | '3m' | '6m' | '12m';
export const DURATION_WEEKS: Record<Duration, number> = { '1w': 1, '2w': 2, '4w': 4, '3m': 12, '6m': 24, '12m': 48 };

export type PricingConfig = {
  /** kids 5–15: price by package length (weeks) → days per week → KD */
  kids: Record<1 | 2 | 4, Partial<Record<number, number>>>;
  /** days per week that are jiu-jitsu only in the 4-week package */
  bjjOnlyDays: number[];
  /** adult men's swimming, 4 weeks, by days per week, and which days it runs */
  adults: Partial<Record<number, number>>;
  adultDays: Weekday[];
  /** family discount % by number of kids in the family (5 = "5 or more") */
  family: Record<number, number>;
  /** multi-month discount % by months */
  months: Record<3 | 6 | 12, number>;
  /** how family and multi-month discounts combine */
  combineDiscounts: 'add' | 'max';
};

export const DEFAULT_PRICING: PricingConfig = {
  kids: {
    1: { 3: 30, 4: 35, 5: 40 },
    2: { 3: 60, 4: 70, 5: 80 },
    4: { 2: 65, 3: 90, 4: 105, 5: 120, 6: 130 },
  },
  bjjOnlyDays: [5, 6],
  adults: { 2: 75, 3: 90 },
  adultDays: ['sun', 'tue', 'thu'],
  family: { 2: 7, 3: 10, 4: 12, 5: 15 },
  months: { 3: 15, 6: 25, 12: 30 },
  combineDiscounts: 'add',
};

export type PriceInput = {
  member: 'kid' | 'adult';
  swimDays: Weekday[];
  bjjDays: Weekday[];
  duration: Duration;
  /** how many kids this family has registered, counting this one */
  familyKidCount: number;
};

export type PriceError = 'invalid_day' | 'duplicate_day' | 'too_few_days' | 'too_many_days' | 'five_plus_bjj_only' | 'not_offered';

export type PriceResult =
  | {
      ok: true;
      daysPerWeek: number;
      weeks: number;
      sessions: number;
      base: number;
      familyPct: number;
      monthsPct: number;
      totalPct: number;
      discount: number;
      total: number;
    }
  | { ok: false; error: PriceError };

/** KD has 1000 fils: round to 3 decimals. */
const fils = (n: number) => Math.round(n * 1000) / 1000;

export function familyDiscountPct(kidCount: number, cfg: PricingConfig = DEFAULT_PRICING): number {
  const steps = Object.keys(cfg.family).map(Number).sort((a, b) => a - b);
  let pct = 0;
  for (const s of steps) if (kidCount >= s) pct = cfg.family[s];
  return pct;
}

export function priceSubscription(input: PriceInput, cfg: PricingConfig = DEFAULT_PRICING): PriceResult {
  const { swimDays, bjjDays, duration, member } = input;
  const all = [...swimDays, ...bjjDays];
  if (all.some((d) => !WEEKDAYS.includes(d))) return { ok: false, error: 'invalid_day' };
  if (new Set(swimDays).size !== swimDays.length || new Set(bjjDays).size !== bjjDays.length) {
    return { ok: false, error: 'duplicate_day' };
  }

  // each class counts: swimming + jiu-jitsu on the same day = 2 days
  const daysPerWeek = all.length;
  if (daysPerWeek < 2) return { ok: false, error: 'too_few_days' };
  if (daysPerWeek > 6) return { ok: false, error: 'too_many_days' };

  const weeks = DURATION_WEEKS[duration];
  const months = duration === '3m' ? 3 : duration === '6m' ? 6 : duration === '12m' ? 12 : 0;

  // price for one block (1, 2 or 4 weeks)
  let blockPrice: number | undefined;
  if (member === 'adult') {
    if (bjjDays.length > 0 || swimDays.some((d) => !cfg.adultDays.includes(d))) return { ok: false, error: 'not_offered' };
    if (duration === '1w' || duration === '2w') return { ok: false, error: 'not_offered' };
    blockPrice = cfg.adults[daysPerWeek];
  } else {
    const block = (weeks >= 4 ? 4 : weeks) as 1 | 2 | 4;
    if (block === 4 && cfg.bjjOnlyDays.includes(daysPerWeek) && swimDays.length > 0) {
      return { ok: false, error: 'five_plus_bjj_only' };
    }
    blockPrice = cfg.kids[block][daysPerWeek];
  }
  if (blockPrice === undefined) return { ok: false, error: 'not_offered' };

  const base = fils(blockPrice * (months || 1));
  const familyPct = member === 'kid' ? familyDiscountPct(input.familyKidCount, cfg) : 0;
  const monthsPct = months ? cfg.months[months as 3 | 6 | 12] : 0;
  const totalPct = cfg.combineDiscounts === 'add' ? familyPct + monthsPct : Math.max(familyPct, monthsPct);
  const discount = fils((base * totalPct) / 100);

  return {
    ok: true,
    daysPerWeek,
    weeks,
    sessions: daysPerWeek * weeks,
    base,
    familyPct,
    monthsPct,
    totalPct,
    discount,
    total: fils(base - discount),
  };
}

/** "58.500 KD" / "٥٨٫٥٠٠ د.ك" style display. */
export function formatKD(n: number, lang: 'ar' | 'en' = 'en'): string {
  const s = n.toFixed(3);
  return lang === 'ar' ? `${s} د.ك` : `${s} KD`;
}
