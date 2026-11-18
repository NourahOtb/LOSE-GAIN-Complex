import { describe, expect, it } from 'vitest';

import { daysUntil, nextClass, startOptions, weekMarks, weekStart, type SubLike, timeOf } from './schedule';

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

describe('startOptions', () => {
  it('only the chosen class days, next 2 weeks', () => {
    // Monday 16 Nov, 3 pm; Tue + Thu
    expect(startOptions(['tue', 'thu'], '16:00', monday3pm)).toEqual(['2026-11-17', '2026-11-19', '2026-11-24', '2026-11-26']);
  });
  it('today counts only if the class has not started', () => {
    expect(startOptions(['mon'], '17:00', monday3pm)[0]).toBe('2026-11-16');
    expect(startOptions(['mon'], '14:00', monday3pm)[0]).toBe('2026-11-23');
  });
  it('mixed sports use the days of both', () => {
    expect(startOptions(['sun', 'sat'], '16:00', monday3pm)).toEqual(['2026-11-21', '2026-11-22', '2026-11-28', '2026-11-29']);
  });
});

describe('jiu-jitsu time per day (Warriors: 4 PM some days, 5 PM others)', () => {
  const sub = {
    id: 'w', kid_id: 'k', swim_days: [], bjj_days: ['sat', 'sun'], start_time: '16:00',
    bjj_times: { sat: '16:00', sun: '17:00' }, start_date: '2026-11-01', end_date: '2026-12-31', status: 'active',
  };
  it('timeOf uses the day time, falling back to start_time', () => {
    expect(timeOf(sub, 'jiujitsu', 'sun')).toBe('17:00');
    expect(timeOf(sub, 'jiujitsu', 'mon')).toBe('16:00');
    expect(timeOf(sub, 'swimming', 'sun')).toBe('16:00');
  });
  it('next class on Sunday is at 5 PM', () => {
    // Sunday 22 Nov 2026, 4:30 PM: the Sunday class (5 PM) is still ahead
    const n = nextClass([sub], [], new Date(2026, 10, 22, 16, 30));
    expect(n?.at.getHours()).toBe(17);
  });
  it('a 5 PM cancellation on Sunday marks that day', () => {
    const marks = weekMarks(sub, 'jiujitsu', [{ on_date: '2026-11-22', sport: 'jiujitsu', start_time: '17:00:00' }], new Date(2026, 10, 21, 9));
    expect(marks.find((m) => m.day === 'sun')?.mark).toBe('cancelled');
  });
});

describe('paused days', () => {
  const paused = { ...yousef, pause_start: '2026-11-16', pause_end: '2026-11-18' };
  it('marks paused days in the week', () => {
    expect(weekMarks(paused, 'jiujitsu', [], monday3pm).map((m) => m.mark)).toEqual(['done', 'none', 'paused', 'none', 'paused', 'none']);
  });
  it('the next class skips the pause', () => {
    const n = nextClass([paused], [], monday3pm);
    expect(n).toBeNull(); // Yousef ends 19 Nov (a Thursday, no class) — nothing left after the pause
    expect(nextClass([paused, sara], [], monday3pm)?.sub.kid_id).toBe('sara');
  });
});
