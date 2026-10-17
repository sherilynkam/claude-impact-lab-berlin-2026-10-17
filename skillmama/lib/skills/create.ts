import { SKILL_EXPLANATION, type BuilderAnswers, type SkillDraft } from "../types";

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

function insertUnder(markdown: string, heading: string, block: string) {
  const needle = `## ${heading}\n`;
  if (markdown.includes(needle)) {
    return markdown.replace(needle, `${needle}\n${block}\n`);
  }
  return `${markdown.trim()}\n\n## ${heading}\n\n${block}\n`;
}

export function buildSkillDraft(
  exampleMarkdown: string,
  safetyMarkdown: string,
  answers: BuilderAnswers,
): SkillDraft {
  const base = exampleMarkdown.trim() || FALLBACK_EXAMPLE;
  const context = [
    "Start from what she told you.",
    answers.wantHelpWith ? `- She wants help with: ${answers.wantHelpWith}` : "",
    answers.recentMoment ? `- A recent moment: ${answers.recentMoment}` : "",
    answers.answerShouldLookLike
      ? `- The answer should look like: ${answers.answerShouldLookLike}`
      : "",
  ]
    .filter(Boolean)
    .join("\n");

  let markdown = insertUnder(base, "Instructions", context);
  const safety = safetyMarkdown.trim();
  if (safety && !markdown.includes(safety.slice(0, 48))) {
    markdown = insertUnder(markdown, "Safety rules", safety);
  }
  if (answers.answerShouldLookLike) {
    markdown = insertUnder(
      markdown,
      "Output format",
      `She asked for: ${answers.answerShouldLookLike}`,
    );
  }

  return { markdown, explanation: SKILL_EXPLANATION };
}
