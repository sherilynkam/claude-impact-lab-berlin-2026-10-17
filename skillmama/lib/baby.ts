import type { Baby } from "./types";

export type { Baby } from "./types";

export const DEFAULT_BABY: Baby = {
  name: "Mila",
  parentName: "Anna",
  dateOfBirth: "2026-05-12",
  ageMonths: 5,
  materials: "a scarf, a wooden spoon",
  minutesAvailable: 20,
  completedActivityIds: [],
};

export function monthsFromDob(dob: string, now = new Date()) {
  const born = new Date(`${dob}T12:00:00`);
  if (Number.isNaN(born.getTime())) return null;
  let months = (now.getFullYear() - born.getFullYear()) * 12 + (now.getMonth() - born.getMonth());
  if (now.getDate() < born.getDate()) months -= 1;
  if (months < 0 || months > 36) return null;
  return months;
}

export function withAge(baby: Baby, now = new Date()): Baby {
  const fromDob = baby.dateOfBirth ? monthsFromDob(baby.dateOfBirth, now) : null;
  const ageMonths = fromDob === null ? baby.ageMonths : fromDob;
  return {
    ...DEFAULT_BABY,
    ...baby,
    name: baby.name?.trim() || DEFAULT_BABY.name,
    parentName: baby.parentName?.trim() || DEFAULT_BABY.parentName,
    ageMonths: ageMonths > 0 ? ageMonths : baby.ageMonths > 0 ? baby.ageMonths : DEFAULT_BABY.ageMonths,
    materials: baby.materials ?? DEFAULT_BABY.materials,
    minutesAvailable: baby.minutesAvailable || DEFAULT_BABY.minutesAvailable,
    completedActivityIds: Array.isArray(baby.completedActivityIds) ? baby.completedActivityIds : [],
  };
}

export function ageLabel(months: number) {
  if (months === 1) return "1 mo";
  return `${months} mo`;
}
