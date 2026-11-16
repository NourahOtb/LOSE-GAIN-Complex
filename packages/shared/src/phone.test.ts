import { describe, expect, it } from 'vitest';

import { normalizeKuwaitPhone } from './phone';

describe('normalizeKuwaitPhone', () => {
  it.each([
    ['99887766', '+96599887766'],
    ['5000 1234', '+96550001234'],
    ['+965 6555-4321', '+96565554321'],
    ['00965 41234567', '+96541234567'],
    ['٩٩٨٨٧٧٦٦', '+96599887766'],
  ])('accepts %s', (input, expected) => {
    expect(normalizeKuwaitPhone(input)).toBe(expected);
  });

  it.each(['1234567', '123456789', '29887766', 'abc', '', '+971 50 123 4567'])('rejects %s', (input) => {
    expect(normalizeKuwaitPhone(input)).toBeNull();
  });
});
