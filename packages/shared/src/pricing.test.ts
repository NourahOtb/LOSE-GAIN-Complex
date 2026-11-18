import { describe, expect, it } from 'vitest';

import { DEFAULT_PRICING, familyDiscountPct, priceOpenPool, priceSubscription } from './pricing';

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
    // adult jiu-jitsu is offered since 2026-11-18 (men's prices when no gender is given)
    expect(priceSubscription({ member: 'adult', swimDays: [], bjjDays: ['sun', 'tue'], duration: '4w', familyKidCount: 1 })).toMatchObject({ ok: true, total: 75 });
    expect(priceSubscription({ member: 'adult', swimDays: ['sun', 'tue'], bjjDays: [], duration: '1w', familyKidCount: 1 })).toMatchObject({ ok: false, error: 'not_offered' });
  });
});

describe('adult members: no family or multi-month discounts (owner, 2026-11-18)', () => {
  const adult = (over: Partial<Parameters<typeof priceSubscription>[0]> = {}) =>
    priceSubscription({ member: 'adult', swimDays: ['sun', 'tue', 'thu'], bjjDays: [], duration: '4w', familyKidCount: 3, ...over });
  it('4 weeks has no family discount', () => {
    expect(adult()).toMatchObject({ ok: true, total: 90, familyPct: 0 });
  });
  it('3, 6 and 12 month packages are not offered to adults', () => {
    expect(adult({ duration: '3m' })).toMatchObject({ ok: false, error: 'not_offered' });
    expect(adult({ duration: '12m' })).toMatchObject({ ok: false, error: 'not_offered' });
  });
});

describe('adult jiu-jitsu (owner sheet 2026-11-18)', () => {
  const bjj = (gender: 'male' | 'female', days: string[], duration: '1w' | '2w' | '4w' = '4w') =>
    priceSubscription({ member: 'adult', gender, swimDays: [], bjjDays: days as never, duration, familyKidCount: 1 });
  it('men 4 weeks', () => {
    expect(bjj('male', ['sun', 'mon'])).toMatchObject({ ok: true, total: 75 });
    expect(bjj('male', ['sun', 'mon', 'tue'])).toMatchObject({ ok: true, total: 100 });
    expect(bjj('male', ['sun', 'mon', 'tue', 'wed'])).toMatchObject({ ok: true, total: 110 });
    expect(bjj('male', ['sun', 'mon', 'tue', 'wed', 'thu'])).toMatchObject({ ok: true, total: 125, sessions: 20 });
  });
  it('women 4 weeks', () => {
    expect(bjj('female', ['sun', 'tue'])).toMatchObject({ ok: true, total: 75 });
    expect(bjj('female', ['sun', 'tue', 'thu'])).toMatchObject({ ok: true, total: 90 });
    expect(bjj('female', ['sun', 'mon', 'tue', 'wed'])).toMatchObject({ ok: true, total: 105 });
    expect(bjj('female', ['sun', 'mon', 'tue', 'wed', 'thu'])).toMatchObject({ ok: true, total: 120 });
  });
  it('2 weeks and 1 week (men and women), 3 to 5 days', () => {
    expect(bjj('male', ['sun', 'mon', 'tue'], '2w')).toMatchObject({ ok: true, total: 70 });
    expect(bjj('female', ['sun', 'mon', 'tue', 'wed', 'thu'], '2w')).toMatchObject({ ok: true, total: 90 });
    expect(bjj('male', ['sun', 'mon', 'tue', 'wed'], '1w')).toMatchObject({ ok: true, total: 40 });
    expect(bjj('female', ['sun', 'mon'], '1w')).toMatchObject({ ok: false, error: 'not_offered' });
  });
  it('Saturday is the free open mat, not a paid day; no swimming + jiu-jitsu mix; no month packages', () => {
    expect(bjj('male', ['sat', 'sun'])).toMatchObject({ ok: false, error: 'not_offered' });
    expect(priceSubscription({ member: 'adult', gender: 'male', swimDays: ['sun', 'tue'], bjjDays: ['mon', 'wed'], duration: '4w', familyKidCount: 1 })).toMatchObject({ ok: false, error: 'separate_sports' });
    expect(priceSubscription({ member: 'adult', gender: 'male', swimDays: [], bjjDays: ['sun', 'mon'], duration: '3m', familyKidCount: 1 })).toMatchObject({ ok: false, error: 'not_offered' });
  });
  it('adult swimming is for men only', () => {
    expect(priceSubscription({ member: 'adult', gender: 'female', swimDays: ['sun', 'tue'], bjjDays: [], duration: '4w', familyKidCount: 1 })).toMatchObject({ ok: false, error: 'not_offered' });
  });
});

describe('Titans (11–15) jiu-jitsu: men prices, 4 weeks only', () => {
  const titan = (over: Partial<Parameters<typeof priceSubscription>[0]> = {}) =>
    priceSubscription({ member: 'titan', swimDays: [], bjjDays: ['sun', 'mon', 'tue'], duration: '4w', familyKidCount: 1, ...over });
  it('uses the men table', () => {
    expect(titan()).toMatchObject({ ok: true, total: 100 });
  });
  it('4 weeks only, Sunday to Thursday, jiu-jitsu only', () => {
    expect(titan({ duration: '2w' })).toMatchObject({ ok: false, error: 'not_offered' });
    expect(titan({ duration: '3m' })).toMatchObject({ ok: false, error: 'not_offered' });
    expect(titan({ bjjDays: ['sat', 'sun'] })).toMatchObject({ ok: false, error: 'not_offered' });
    expect(titan({ swimDays: ['sat'] })).toMatchObject({ ok: false, error: 'separate_sports' });
  });
  it('still a kid in the family: family discount applies', () => {
    expect(titan({ familyKidCount: 2 })).toMatchObject({ ok: true, familyPct: 7, total: 93 });
  });
});

describe('open pool membership', () => {
  it('40 KD for 4 weeks, adults only, no discounts', () => {
    expect(priceOpenPool('adult', '4w')).toMatchObject({ ok: true, total: 40, weeks: 4 });
    expect(priceOpenPool('kid', '4w')).toMatchObject({ ok: false, error: 'not_offered' });
    expect(priceOpenPool('adult', '3m')).toMatchObject({ ok: false, error: 'not_offered' });
  });
});
