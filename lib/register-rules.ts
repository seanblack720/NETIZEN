// lib/register-rules.ts
// Rules shared by the register page and the register API so both always agree.

export const MIN_AGE = 13;
export const MAX_AGE = 120;
export const MIN_PASSWORD_LENGTH = 8;
export const MAX_PASSWORD_LENGTH = 72; // bcrypt only uses the first 72 bytes

export const GENDERS: string[] = ["Male", "Female", "Prefer not to say"];

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Whole years since a "YYYY-MM-DD" date, or null if the value is not a real date. */
export function ageFromBirthDate(value: string): number | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]) - 1;
  const day = Number(match[3]);

  const dob = new Date(year, month, day);
  if (dob.getFullYear() !== year || dob.getMonth() !== month || dob.getDate() !== day) return null;

  const now = new Date();
  let age = now.getFullYear() - year;
  if (now.getMonth() < month || (now.getMonth() === month && now.getDate() < day)) age -= 1;
  return age;
}
