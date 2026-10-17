export type SkillSections = {
  whenToUse: string;
  instructions: string;
  safetyRules: string;
  outputFormat: string;
};

export type ParsedSkill = {
  name: string;
  description: string;
  /** Display title, e.g. "Feelings & bonding". Empty for older skills. */
  title: string;
  /** Template id the skill started from, e.g. "sleep-routine". */
  template: string;
  /** "Say it like" sentences, stored as `say_it_like: a | b`. */
  examplePrompts: string[];
  sections: SkillSections;
};

const SECTION_KEYS: Record<string, keyof SkillSections> = {
  "when to use": "whenToUse",
  instructions: "instructions",
  "safety rules": "safetyRules",
  "output format": "outputFormat",
};

export function parseSkill(markdown: string): ParsedSkill {
  const match = markdown.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  const frontmatter = match?.[1] ?? "";
  const body = match?.[2] ?? markdown;
  const fields: Record<string, string> = {};

  for (const line of frontmatter.split("\n")) {
    const split = line.match(/^([A-Za-z0-9_]+):\s*(.*)$/);
    if (split) fields[split[1]] = split[2].trim();
  }

  const sections: SkillSections = {
    whenToUse: "",
    instructions: "",
    safetyRules: "",
    outputFormat: "",
  };
  const parts = body.split(/^## /m).slice(1);
  for (const part of parts) {
    const newline = part.indexOf("\n");
    const heading = (newline === -1 ? part : part.slice(0, newline)).trim().toLowerCase();
    const content = newline === -1 ? "" : part.slice(newline + 1).trim();
    const key = SECTION_KEYS[heading];
    if (key) sections[key] = content;
  }

  return {
    name: fields.name ?? "",
    description: fields.description ?? "",
    title: fields.title ?? "",
    template: fields.template ?? "",
    examplePrompts: (fields.say_it_like ?? "")
      .split("|")
      .map((prompt) => prompt.trim())
      .filter(Boolean),
    sections,
  };
}

/** Title for a skill card: the frontmatter title when there is one, else the name. */
export function skillTitle(markdown: string, name: string) {
  return parseSkill(markdown).title || titleFromName(name);
}

export function sanitizeSkillName(name: string) {
  const clean = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return clean || "my-skill";
}

export function titleFromName(name: string) {
  if (name === "montessori-activity-finder" || name === "montessori_activity") {
    return "Montessori activity";
  }
  const spaced = name.replace(/[-_]/g, " ").trim();
  if (!spaced) return "New skill";
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}
