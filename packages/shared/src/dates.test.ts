import { describe, expect, it } from 'vitest';

import { ageOn, parseDob } from './dates';

describe('parseDob', () => {
  it('parses DD/MM/YYYY and variants', () => {
    expect(parseDob('10/03/2019')).toBe('2019-03-10');
    expect(parseDob('1-2-2018')).toBe('2018-02-01');
    expect(parseDob('١٠/٠٣/٢٠١٩')).toBe('2019-03-10');
  });
  it('rejects impossible dates and other formats', () => {
    expect(parseDob('31/02/2019')).toBeNull();
    expect(parseDob('2019-03-10')).toBeNull();
    expect(parseDob('')).toBeNull();
  });
});

describe('ageOn', () => {
  it('counts whole years, before and after the birthday', () => {
    expect(ageOn('2019-03-10', new Date(2026, 10, 18))).toBe(7);
    expect(ageOn('2017-12-01', new Date(2026, 10, 18))).toBe(8);
    expect(ageOn('2017-11-18', new Date(2026, 10, 18))).toBe(9);
  });
});
