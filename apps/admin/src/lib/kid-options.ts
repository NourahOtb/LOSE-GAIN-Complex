// Choices for a member's health and emergency contact. Plain constants: used by client forms and server actions.

export const HEALTH_OPTIONS: [string, string][] = [
  ["asthma", "Asthma"],
  ["allergies", "Allergies"],
  ["epilepsy", "Epilepsy"],
  ["heart", "Heart condition"],
  ["eyes", "Eye condition"],
  ["glasses", "Wears glasses"],
  ["injury", "Recent injury or surgery"],
  ["medication", "Takes medication"],
  ["other", "Other"],
];
export const HEALTH_KEYS = HEALTH_OPTIONS.map(([k]) => k);

/** whose emergency number it is (their relation to the kid) */
export const EMERGENCY_RELATIONS: [string, string][] = [
  ["mother", "Mother"],
  ["father", "Father"],
  ["grandmother", "Grandmother"],
  ["grandfather", "Grandfather"],
  ["aunt", "Aunt"],
  ["uncle", "Uncle"],
  ["sister", "Sister"],
  ["brother", "Brother"],
  ["cousin", "Cousin"],
  ["friend", "Family friend"],
  ["other", "Other"],
];
export const EMERGENCY_KEYS = EMERGENCY_RELATIONS.map(([k]) => k);
export const emergencyLabel = (k: string | null | undefined) => EMERGENCY_RELATIONS.find(([v]) => v === k)?.[1] ?? "";
