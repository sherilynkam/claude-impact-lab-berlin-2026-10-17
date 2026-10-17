import { parseSkill, sanitizeSkillName } from "../parse-skill";
import { SKILL_EXPLANATION, type BuilderAnswers, type FollowUpAnswer, type SkillDraft } from "../types";
import { followUpLine } from "./followup";
import { SCRATCH_TEMPLATE, templateMarkdown, type SkillTemplate } from "./templates";

const FALLBACK_EXAMPLE = `---
name: emotional-development
description: Helps a mom sort an everyday feelings situation with her baby and find a next step she can actually do.
age_range_months: [0, 12]
created_by: mom
created_at: 2026-10-17
---

## When to use

Use this when a mom asks about her baby's feelings, crying, or a hard moment that is not a medical emergency.

## Instructions

Listen to the situation. Offer one sentence she can say and one thing she can do in the apartment.

## Safety rules

No diagnosis. Concerns about health go to the pediatrician.

## Output format

One sentence she can say, one thing she can do, and when to call the pediatrician instead.
`;

const SAFETY_MARKER = "<!-- shared safety rules -->";

function insertUnder(markdown: string, heading: string, block: string) {
  const needle = `## ${heading}\n`;
  if (markdown.includes(needle)) {
    return markdown.replace(needle, `${needle}\n${block}\n`);
  }
  return `${markdown.trim()}\n\n## ${heading}\n\n${block}\n`;
}

function oneLine(value: string) {
  return value.replace(/[\r\n|]+/g, " ").replace(/\s+/g, " ").trim();
}

/**
 * Rewrites the frontmatter fields the library and the run step rely on.
 * Values are kept on one line so the simple frontmatter parser can read them.
 */
export function setFrontmatter(markdown: string, fields: Record<string, string>) {
  const match = markdown.replace(/\r\n/g, "\n").match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  const lines = match ? match[1].split("\n") : [];
  const body = match ? match[2] : markdown;
  const keys = new Set(Object.keys(fields));
  const kept = lines.filter((line) => {
    const key = line.match(/^([A-Za-z0-9_]+):/)?.[1];
    return !key || !keys.has(key);
  });
  // Only flatten newlines here: say_it_like uses "|" to separate its sentences.
  const added = Object.entries(fields)
    .filter(([, value]) => value)
    .map(([key, value]) => `${key}: ${value.replace(/\s*[\r\n]+\s*/g, " ").trim()}`);
  return `---\n${[...added, ...kept].join("\n")}\n---\n\n${body.trim()}\n`;
}

/**
 * Makes sure the shared safety rules (skills/_safety.md) sit under "## Safety rules".
 * Runs on every draft, on save, and again on the server before a skill runs,
 * so editing the text cannot remove them.
 */
export function withSafety(markdown: string, safetyMarkdown: string) {
  const safety = safetyMarkdown.trim();
  if (!safety || markdown.includes(safety.slice(0, 60))) return markdown;
  const cleaned = markdown.replace(SAFETY_MARKER, "");
  return insertUnder(cleaned, "Safety rules", `${SAFETY_MARKER}\n${safety}`);
}

function starterMarkdown(template: SkillTemplate | null, exampleMarkdown: string) {
  if (template && template.id !== "feelings") return templateMarkdown(template);
  return exampleMarkdown.trim() || FALLBACK_EXAMPLE;
}

function draftTitle(template: SkillTemplate | null, answers: BuilderAnswers) {
  if (template && template.id !== SCRATCH_TEMPLATE.id) return template.name;
  const want = oneLine(answers.wantHelpWith);
  if (!want) return "My skill";
  const short = want.split(/\s+/).slice(0, 5).join(" ");
  return short.charAt(0).toUpperCase() + short.slice(1);
}

export type DraftInput = {
  exampleMarkdown: string;
  safetyMarkdown: string;
  answers: BuilderAnswers;
  template?: SkillTemplate | null;
  babyName?: string;
  /** Her answer to the Create screen follow-up, if she gave one. */
  followUp?: FollowUpAnswer | null;
};

/**
 * Local skill writer, used when Claude is not available.
 * Starts from the template's skill (or the emotional-development example)
 * and adds her three answers, so the draft still reflects her moment.
 */
export function buildSkillDraft(input: DraftInput): SkillDraft {
  const template = input.template ?? null;
  const answers = input.answers;
  const context = [
    "Start from what she told you.",
    answers.wantHelpWith ? `- She wants help with: ${oneLine(answers.wantHelpWith)}` : "",
    answers.recentMoment ? `- A recent moment: ${oneLine(answers.recentMoment)}` : "",
    answers.answerShouldLookLike ? `- The answer should look like: ${oneLine(answers.answerShouldLookLike)}` : "",
    followUpLine(input.followUp),
  ]
    .filter(Boolean)
    .join("\n");

  let markdown = insertUnder(starterMarkdown(template, input.exampleMarkdown), "Instructions", context);
  if (answers.answerShouldLookLike) {
    markdown = insertUnder(markdown, "Output format", `She asked for: ${oneLine(answers.answerShouldLookLike)}`);
  }
  const followUpAnswer = input.followUp?.answer?.trim();
  if (followUpAnswer) {
    markdown = insertUnder(markdown, "Output format", `She also said: ${oneLine(followUpAnswer)}`);
  }

  const title = draftTitle(template, answers);
  const summary = template && template.id !== SCRATCH_TEMPLATE.id
    ? template.summary
    : `Helps with: ${oneLine(answers.wantHelpWith) || "what you asked for"}.`;
  const examplePrompts = template && template.id !== SCRATCH_TEMPLATE.id
    ? template.examplePrompts
    : [oneLine(answers.wantHelpWith) || `Use my ${title.toLowerCase()} skill`];

  return finishDraft(
    {
      markdown,
      title,
      summary,
      examplePrompts,
      explanation: SKILL_EXPLANATION,
    },
    input.safetyMarkdown,
    template,
  );
}

/**
 * Last step for every draft, from Claude or local: stable frontmatter
 * (name, title, template, say_it_like) and the shared safety rules.
 */
export function finishDraft(draft: SkillDraft, safetyMarkdown: string, template: SkillTemplate | null): SkillDraft {
  const parsed = parseSkill(draft.markdown);
  // Template skills keep the template's name; from-scratch skills are named after their title,
  // so two scratch skills don't overwrite each other in the library.
  const fromTemplate = template && template.id !== SCRATCH_TEMPLATE.id;
  const name = sanitizeSkillName(fromTemplate ? template.skillName : draft.title || parsed.name);
  const examplePrompts = draft.examplePrompts.map(oneLine).filter(Boolean).slice(0, 3);
  let markdown = setFrontmatter(draft.markdown, {
    name,
    title: draft.title,
    description: draft.summary || parsed.description,
    template: template?.id ?? "",
    say_it_like: examplePrompts.join(" | "),
    created_by: "mom",
    created_at: new Date().toISOString().slice(0, 10),
  });
  markdown = withSafety(markdown, safetyMarkdown);
  return { ...draft, markdown, examplePrompts };
}
