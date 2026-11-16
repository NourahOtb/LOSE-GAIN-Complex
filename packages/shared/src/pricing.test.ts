import { describe, expect, it } from 'vitest';

import { DEFAULT_PRICING, familyDiscountPct, priceSubscription } from './pricing';

const kid = (over: Partial<Parameters<typeof priceSubscription>[0]> = {}) =>
  priceSubscription({ member: 'kid', swimDays: [], bjjDays: [], duration: '4w', familyKidCount: 1, ...over });

describe('kids price table (4 weeks)', () => {
  it.each([
    [['sun', 'tue'], 65],
    [['sun', 'tue', 'thu'], 90],
    [['sat', 'sun', 'tue', 'thu'], 105],
  ] as const)('swimming %j = %d KD', (days, price) => {
    const r = kid({ swimDays: [...days] });
    expect(r.ok && r.total).toBe(price);
    expect(r.ok && r.sessions).toBe(days.length * 4);
  });

  it('5 and 6 days are jiu-jitsu only', () => {
    expect(kid({ bjjDays: ['sat', 'sun', 'mon', 'tue', 'wed'] })).toMatchObject({ ok: true, total: 120 });
    expect(kid({ bjjDays: ['sat', 'sun', 'mon', 'tue', 'wed', 'thu'] })).toMatchObject({ ok: true, total: 130 });
    expect(kid({ swimDays: ['sat', 'sun', 'mon', 'tue', 'wed'] })).toMatchObject({ ok: false, error: 'five_plus_bjj_only' });
    expect(kid({ swimDays: ['sat', 'sun'], bjjDays: ['mon', 'tue', 'wed'] })).toMatchObject({ ok: false, error: 'five_plus_bjj_only' });
  });
});

describe('short packages', () => {
  it('1 week and 2 weeks by days', () => {
    expect(kid({ duration: '1w', swimDays: ['sun', 'tue', 'thu'] })).toMatchObject({ ok: true, total: 30, sessions: 3 });
    expect(kid({ duration: '1w', bjjDays: ['sat', 'mon', 'wed', 'thu'] })).toMatchObject({ ok: true, total: 35 });
    expect(kid({ duration: '2w', swimDays: ['sat', 'sun', 'mon', 'tue', 'wed'] })).toMatchObject({ ok: true, total: 80, sessions: 10 });
  });
  it('need at least 3 days', () => {
    expect(kid({ duration: '1w', swimDays: ['sun', 'tue'] })).toMatchObject({ ok: false, error: 'not_offered' });
    expect(kid({ duration: '2w', swimDays: ['sun', 'tue'] })).toMatchObject({ ok: false, error: 'not_offered' });
  });
});

describe('mixed sports = total class days', () => {
  it('2 swimming + 2 jiu-jitsu = 4 days = 105 KD', () => {
    expect(kid({ swimDays: ['sun', 'tue'], bjjDays: ['sat', 'mon'] })).toMatchObject({ ok: true, total: 105, sessions: 16 });
  });
  it('swimming and jiu-jitsu on the same day count as 2 days', () => {
    expect(kid({ swimDays: ['sun', 'tue'], bjjDays: ['sun'] })).toMatchObject({ ok: true, total: 90 });
  });
  it('a day can only be picked once per sport', () => {
    expect(kid({ swimDays: ['sun', 'sun'] })).toMatchObject({ ok: false, error: 'duplicate_day' });
  });
  it('Friday is closed', () => {
    expect(kid({ swimDays: ['sun', 'fri' as never] })).toMatchObject({ ok: false, error: 'invalid_day' });
  });
  it('at least 2 days', () => {
    expect(kid({ swimDays: ['sun'] })).toMatchObject({ ok: false, error: 'too_few_days' });
  });
});

describe('discounts', () => {
  it('family discount by number of kids', () => {
    expect([1, 2, 3, 4, 5, 6].map((n) => familyDiscountPct(n))).toEqual([0, 7, 10, 12, 15, 15]);
  });
  it('3rd kid, swimming 2 days, 4 weeks: 65 − 10% = 58.500 KD', () => {
    expect(kid({ swimDays: ['sun', 'tue'], familyKidCount: 3 })).toMatchObject({
      ok: true,
      base: 65,
      familyPct: 10,
      monthsPct: 0,
      discount: 6.5,
      total: 58.5,
    });
  });
  it('3 months, 3 days: 270 − 15% = 229.500 KD', () => {
    expect(kid({ duration: '3m', swimDays: ['sun', 'tue', 'thu'] })).toMatchObject({ ok: true, base: 270, total: 229.5, sessions: 36 });
  });
  it('family + months add up: 2 kids, 3 months, 3 days = 270 − 22% = 210.600 KD', () => {
    expect(kid({ duration: '3m', swimDays: ['sun', 'tue', 'thu'], familyKidCount: 2 })).toMatchObject({ ok: true, totalPct: 22, total: 210.6 });
  });
  it('12 months gets 30%', () => {
    expect(kid({ duration: '12m', bjjDays: ['sat', 'mon', 'wed'] })).toMatchObject({ ok: true, base: 1080, monthsPct: 30, total: 756 });
  });
  it('rule can switch to "bigger discount only"', () => {
    const r = priceSubscription(
      { member: 'kid', swimDays: ['sun', 'tue', 'thu'], bjjDays: [], duration: '3m', familyKidCount: 2 },
      { ...DEFAULT_PRICING, combineDiscounts: 'max' },
    );
    expect(r).toMatchObject({ ok: true, totalPct: 15, total: 229.5 });
  });
  it('rounds to fils (3 decimals)', () => {
    const r = kid({ swimDays: ['sun', 'tue', 'thu'], familyKidCount: 2 }); // 90 − 7% = 83.7
    expect(r).toMatchObject({ ok: true, total: 83.7 });
  });
});

describe('adult men swimming', () => {
  it('1 month: 2 days 75, 3 days 90; swimming only; no family discount', () => {
    expect(priceSubscription({ member: 'adult', swimDays: ['sun', 'tue'], bjjDays: [], duration: '4w', familyKidCount: 3 })).toMatchObject({ ok: true, total: 75, familyPct: 0 });
    expect(priceSubscription({ member: 'adult', swimDays: ['sun', 'tue', 'thu'], bjjDays: [], duration: '4w', familyKidCount: 1 })).toMatchObject({ ok: true, total: 90 });
    expect(priceSubscription({ member: 'adult', swimDays: [], bjjDays: ['sun', 'tue'], duration: '4w', familyKidCount: 1 })).toMatchObject({ ok: false, error: 'not_offered' });
    expect(priceSubscription({ member: 'adult', swimDays: ['sun', 'tue'], bjjDays: [], duration: '1w', familyKidCount: 1 })).toMatchObject({ ok: false, error: 'not_offered' });
  });
});
