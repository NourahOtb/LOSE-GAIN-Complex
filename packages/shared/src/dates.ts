const ARABIC_DIGITS = '٠١٢٣٤٥٦٧٨٩';

/** Parse "DD/MM/YYYY" (also accepts - or . and Arabic digits) into "YYYY-MM-DD", or null if not a real date. */
export function parseDob(input: string): string | null {
  const latin = input.trim().replace(/[٠-٩]/g, (d) => String(ARABIC_DIGITS.indexOf(d)));
  const m = /^(\d{1,2})[/.\-](\d{1,2})[/.\-](\d{4})$/.exec(latin);
  if (!m) return null;
  const [d, mo, y] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const date = new Date(Date.UTC(y, mo - 1, d));
  if (date.getUTCFullYear() !== y || date.getUTCMonth() !== mo - 1 || date.getUTCDate() !== d) return null;
  return `${y}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

/** Whole years between an ISO birth date and `on` (default today). */
export function ageOn(birthIso: string, on: Date = new Date()): number {
  const [y, m, d] = birthIso.split('-').map(Number);
  let age = on.getFullYear() - y;
  if (on.getMonth() + 1 < m || (on.getMonth() + 1 === m && on.getDate() < d)) age--;
  return age;
}
