const ARABIC_DIGITS = '٠١٢٣٤٥٦٧٨٩';

/**
 * Normalise a Kuwait mobile number to +965XXXXXXXX.
 * Accepts spaces, dashes, a +965 / 00965 prefix and Arabic-Indic digits.
 * Kuwait mobiles are 8 digits starting with 4, 5, 6 or 9. Returns null if invalid.
 */
export function normalizeKuwaitPhone(input: string): string | null {
  const latin = input.replace(/[٠-٩]/g, (d) => String(ARABIC_DIGITS.indexOf(d)));
  let digits = latin.replace(/[^\d+]/g, '');
  if (digits.startsWith('+965')) digits = digits.slice(4);
  else if (digits.startsWith('00965')) digits = digits.slice(5);
  else if (digits.startsWith('965') && digits.length === 11) digits = digits.slice(3);
  if (!/^[4569]\d{7}$/.test(digits)) return null;
  return `+965${digits}`;
}
