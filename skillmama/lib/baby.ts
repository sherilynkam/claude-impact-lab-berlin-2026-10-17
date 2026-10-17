import type { Baby } from "./types";

export type { Baby } from "./types";

export const DEFAULT_BABY: Baby = {
  ageMonths: 5,
  materials: "a scarf, a wooden spoon",
  minutesAvailable: 20,
  completedActivityIds: [],
};

export function ageError(value: string) {
  if (!/^\d+$/.test(value.trim())) return "Enter the age in months, for example 5.";
  const age = Number(value);
  if (age < 0 || age > 24) return "Enter the age in months, for example 5.";
  return null;
}
