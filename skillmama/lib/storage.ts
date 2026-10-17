import type { Baby, SkillCard } from "./types";

const BABY_KEY = "skillmama-baby";
const SKILLS_KEY = "skillmama-skills";
const CONFIDENCE_KEY = "skillmama-confidence";

const memory = new Map<string, string>();

export type Confidence = { before: number | null; after: number | null };

function bucket(): Storage | null {
  try {
    if (typeof window === "undefined") return null;
    const probe = "__skillmama_probe__";
    window.localStorage.setItem(probe, "1");
    window.localStorage.removeItem(probe);
    return window.localStorage;
  } catch {
    return null;
  }
}

function read(key: string): string | null {
  const store = bucket();
  if (!store) return memory.get(key) ?? null;
  try {
    return store.getItem(key);
  } catch {
    return memory.get(key) ?? null;
  }
}

function write(key: string, value: string) {
  memory.set(key, value);
  const store = bucket();
  if (!store) return;
  try {
    store.setItem(key, value);
  } catch {
    /* private mode: memory map still holds the demo */
  }
}

function remove(key: string) {
  memory.delete(key);
  const store = bucket();
  if (!store) return;
  try {
    store.removeItem(key);
  } catch {
    /* ignore */
  }
}

function readJson<T>(key: string): T | null {
  const raw = read(key);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export function loadBaby(): Baby | null {
  const baby = readJson<Baby>(BABY_KEY);
  if (!baby || typeof baby.ageMonths !== "number") return null;
  return {
    ageMonths: baby.ageMonths,
    materials: baby.materials ?? "",
    minutesAvailable: baby.minutesAvailable ?? 20,
    completedActivityIds: Array.isArray(baby.completedActivityIds) ? baby.completedActivityIds : [],
  };
}

export function saveBaby(baby: Baby) {
  write(BABY_KEY, JSON.stringify(baby));
}

export function loadSkills(): SkillCard[] {
  const skills = readJson<SkillCard[]>(SKILLS_KEY);
  if (!Array.isArray(skills)) return [];
  return skills.filter((skill) => skill && typeof skill.name === "string" && skill.createdBy === "mom");
}

export function saveSkills(skills: SkillCard[]) {
  write(SKILLS_KEY, JSON.stringify(skills));
}

export function loadConfidence(): Confidence {
  const value = readJson<Confidence>(CONFIDENCE_KEY);
  return {
    before: typeof value?.before === "number" ? value.before : null,
    after: typeof value?.after === "number" ? value.after : null,
  };
}

export function saveConfidence(confidence: Confidence) {
  write(CONFIDENCE_KEY, JSON.stringify(confidence));
}

export function clearDemo() {
  remove(BABY_KEY);
  remove(SKILLS_KEY);
  remove(CONFIDENCE_KEY);
}
