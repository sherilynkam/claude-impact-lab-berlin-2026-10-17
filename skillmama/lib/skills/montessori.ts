import type { Activity, Baby } from "../types";

export const CAMERA_IDS = ["grasp-the-ring-5m", "conversation-with-pauses-5m"];

function isExact(activity: Activity, age: number) {
  return activity.ageMinMonths <= age && age <= activity.ageMaxMonths;
}

function distance(activity: Activity, age: number) {
  if (age < activity.ageMinMonths) return activity.ageMinMonths - age;
  if (age > activity.ageMaxMonths) return age - activity.ageMaxMonths;
  return 0;
}

function materialHit(activity: Activity, materials: string) {
  const hay = `${activity.materials} ${activity.title} ${activity.howToOffer}`.toLowerCase();
  const words = materials
    .toLowerCase()
    .split(/[^a-z]+/)
    .filter((word) => word.length > 3);
  return words.some((word) => hay.includes(word));
}

function score(activity: Activity, baby: Baby) {
  let value = 0;
  if (baby.ageMonths === 5 && CAMERA_IDS.includes(activity.id)) value += 100;
  if (isExact(activity, baby.ageMonths)) value += 40;
  if (materialHit(activity, baby.materials)) value += 25;
  if (activity.minutes <= baby.minutesAvailable) value += 8;
  if (activity.domain === "movement" || activity.domain === "language") value += 3;
  return value;
}

export function selectActivities(activities: Activity[], baby: Baby): Activity[] {
  const blocked = new Set(baby.completedActivityIds);
  const available = activities.filter((activity) => activity.id && !blocked.has(activity.id));
  const exact = available.filter((activity) => isExact(activity, baby.ageMonths));
  let pool = exact.map((activity) => ({ ...activity, nearbyAge: false }));

  if (pool.length < 2) {
    const nearest = available
      .filter((activity) => !exact.some((item) => item.id === activity.id))
      .sort((a, b) => distance(a, baby.ageMonths) - distance(b, baby.ageMonths) || a.id.localeCompare(b.id));
    const needed = nearest.slice(0, Math.max(0, 2 - pool.length));
    pool = [...pool, ...needed.map((activity) => ({ ...activity, nearbyAge: true }))];
  }

  return [...pool]
    .sort((a, b) => score(b, baby) - score(a, baby) || a.id.localeCompare(b.id))
    .slice(0, 3)
    .map((activity) =>
      activity.id === "grasp-the-ring-5m" && !activity.whyItHelps
        ? {
            ...activity,
            whyItHelps:
              "Around 5 months the hands start to reach on purpose. One ring, at hand height, gives that reach something real.",
          }
        : activity,
    );
}
