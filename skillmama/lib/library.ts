import { parseSkill, sanitizeSkillName } from "./parse-skill";
import type { SkillCard } from "./types";

export type { SkillCard } from "./types";

export function seedSkill(markdown: string): SkillCard {
  const parsed = parseSkill(markdown);
  return {
    name: sanitizeSkillName(parsed.name || "montessori-activity-finder"),
    description: parsed.description || "Finds a short activity for your baby’s age.",
    markdown,
    createdBy: "seed",
    createdAt: "2026-10-17",
  };
}

export function cardFromMarkdown(markdown: string): SkillCard {
  const parsed = parseSkill(markdown);
  return {
    name: sanitizeSkillName(parsed.name || "emotional-development"),
    description: parsed.description || "A skill you wrote for your baby.",
    markdown,
    createdBy: "mom",
    createdAt: new Date().toISOString().slice(0, 10),
  };
}

export function upsertMomSkill(skills: SkillCard[], card: SkillCard) {
  const rest = skills.filter((skill) => skill.name !== card.name);
  return [card, ...rest];
}

export function libraryCards(seed: SkillCard, momSkills: SkillCard[]) {
  return [seed, ...momSkills];
}
