import { describe, expect, it } from 'vitest';

import { daysUntil, nextClass, weekMarks, weekStart, type SubLike } from './schedule';

const sara: SubLike = { id: 's', kid_id: 'sara', swim_days: ['sun', 'tue', 'thu'], bjj_days: [], start_time: '16:00:00', start_date: '2026-11-05', end_date: '2026-12-03', status: 'active' };
const yousef: SubLike = { id: 'y', kid_id: 'yousef', swim_days: [], bjj_days: ['sat', 'mon', 'wed'], start_time: '17:00:00', start_date: '2026-10-22', end_date: '2026-11-19', status: 'active' };

// Monday 16 Nov 2026, 3 pm
const monday3pm = new Date(2026, 10, 16, 15, 0);

describe('weekStart', () => {
  it('Kuwait week starts Saturday', () => {
    expect(weekStart(monday3pm).getDate()).toBe(14);
    expect(weekStart(new Date(2026, 10, 14)).getDate()).toBe(14);
    expect(weekStart(new Date(2026, 10, 20)).getDate()).toBe(14); // Friday
  });
});

describe('nextClass', () => {
  it('finds Yousef today at 5 pm', () => {
    const n = nextClass([sara, yousef], [], monday3pm);
    expect(n?.sub.kid_id).toBe('yousef');
    expect(n?.at.getHours()).toBe(17);
  });
  it('skips a cancelled class', () => {
    const n = nextClass([sara, yousef], [{ on_date: '2026-11-16', sport: 'jiujitsu', start_time: '17:00' }], monday3pm);
    expect(n?.sub.kid_id).toBe('sara'); // Tue 4 pm
    expect(n?.at.getDate()).toBe(17);
  });
  it('ignores unpaid subscriptions', () => {
    expect(nextClass([{ ...yousef, status: 'pending_payment' }], [], monday3pm)).toBeNull();
  });
});

describe('weekMarks', () => {
  it('marks done, next, cancelled for the week', () => {
    const marks = weekMarks(yousef, 'jiujitsu', [{ on_date: '2026-11-18', sport: 'jiujitsu', start_time: '17:00:00' }], monday3pm);
    expect(marks.map((m) => m.mark)).toEqual(['done', 'none', 'next', 'none', 'cancelled', 'none']);
  });
});

describe('daysUntil', () => {
  it('counts calendar days', () => {
    expect(daysUntil('2026-11-19', monday3pm)).toBe(3);
    expect(daysUntil('2026-11-16', monday3pm)).toBe(0);
  });
});
