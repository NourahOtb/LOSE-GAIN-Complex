import { ageOn } from '@lg/shared';

export type Belt =
  | 'white' | 'grey_white' | 'grey' | 'grey_black'
  | 'yellow_white' | 'yellow' | 'yellow_black'
  | 'orange_white' | 'orange' | 'orange_black'
  | 'green_white' | 'green' | 'green_black';

export type Kid = {
  id: string;
  parent_id: string;
  member_no: number;
  full_name: string;
  birth_date: string;
  photo_url: string | null;
  health_conditions: string[];
  health_other: string | null;
  health_confirmed: boolean;
  emergency_phone: string | null;
  swim_level: number | null;
  swim_level_since: string | null;
  belt: Belt | null;
  belt_since: string | null;
  is_self: boolean;
};

/** Which timetable group a member trains in: adults (16+ or the account holder), Titans (jiu-jitsu 11–15), or kids. */
export function ageGroupOf(sport: 'swimming' | 'jiujitsu', kid: Pick<Kid, 'birth_date' | 'is_self'>): 'kids' | 'titans' | 'adults' {
  const age = ageOn(kid.birth_date);
  if (kid.is_self || age >= 16) return 'adults';
  if (sport === 'jiujitsu' && age >= 11) return 'titans';
  return 'kids';
}

export type Stripe = { id: string; kid_id: string; belt: string; awarded_on: string; coach_id: string | null };

export const HEALTH_KEYS = ['asthma', 'allergies', 'epilepsy', 'heart', 'injury', 'medication', 'other'] as const;
export type HealthKey = (typeof HEALTH_KEYS)[number];

/** Real kids' BJJ belt colours: main colour + the white/black centre stripe some belts carry. */
export function beltColors(belt: Belt): { main: string; centre: string } {
  const [base, mod] = belt.split('_') as [string, string | undefined];
  const main = { white: '#F4F4F2', grey: '#9E9E9E', yellow: '#E8C547', orange: '#E08A2E', green: '#3E8E4E' }[base] ?? '#9E9E9E';
  const centre = mod === 'white' ? '#FFFFFF' : mod === 'black' ? '#111111' : main;
  return { main, centre };
}

export const beltName = (belt: Belt, lang: 'ar' | 'en') => {
  const en: Record<string, string> = { white: 'White', grey: 'Grey', yellow: 'Yellow', orange: 'Orange', green: 'Green' };
  const ar: Record<string, string> = { white: 'أبيض', grey: 'رمادي', yellow: 'أصفر', orange: 'برتقالي', green: 'أخضر' };
  const [base, mod] = belt.split('_');
  if (lang === 'ar') return `الحزام ال${ar[base]}${mod ? (mod === 'white' ? ' والأبيض' : ' والأسود') : ''}`;
  return `${en[base]}${mod ? `-${mod}` : ''} belt`;
};
