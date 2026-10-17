// Run one of the mom's saved skills directly (Library tap, or right after saving).
// Claude answers from the skill text in lib/agent.ts; this file holds what both paths share
// and the local answer used when there is no Claude key.

import { parseSkill, skillTitle } from "../parse-skill";
import type { AgentRequest, AgentResponse, SkillCard } from "../types";
import { withSafety } from "./create";
import { SCRATCH_TEMPLATE, findTemplate, templateFromText } from "./templates";

export function findSkill(skills: SkillCard[] | undefined, name: string | null | undefined) {
  if (!name) return null;
  return (skills ?? []).find((skill) => skill.name === name) ?? null;
}

/** The skill text Claude follows: her edited markdown plus the shared safety rules, always. */
export function skillWithSafety(card: SkillCard, safetyMarkdown: string) {
  return withSafety(card.markdown, safetyMarkdown);
}

export function runSkillLocally(card: SkillCard, request: AgentRequest): AgentResponse {
  const parsed = parseSkill(card.markdown);
  const title = skillTitle(card.markdown, card.name);
  const template =
    findTemplate(parsed.template) ?? templateFromText(`${card.name} ${parsed.description}`) ?? SCRATCH_TEMPLATE;
  const prompt = parsed.examplePrompts[0] ?? template.examplePrompts[0];

  return {
    reply: `Using your skill “${title}”. ${template.demoAnswer(request.baby)}`,
    skillUsed: card.name,
    mode: "use",
    results: [],
    learnPrompt: prompt ? `Next time you can say: “${prompt}”` : `Next time you can open ${title} from your library.`,
  };
}
