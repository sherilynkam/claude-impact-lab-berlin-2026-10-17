// One follow-up question between her three answers and the draft
// (Create screen chat, design/prototype/CreateSkill.dc.html).
// Claude writes the question in lib/agent.ts; this is the shared shape and the local fallback,
// which asks the prototype's question so the demo works without a key.

import type { AgentResponse, Baby, BuilderAnswers, FollowUpAnswer, FollowUpQuestion } from "../types";

export const DEFAULT_FOLLOW_UP: FollowUpQuestion = {
  question: "Should I keep it short enough to read aloud?",
  suggestions: ["Yes, short enough to read aloud", "A bit more detail is fine"],
};

function lowerFirst(text: string) {
  return text ? text.charAt(0).toLowerCase() + text.slice(1) : text;
}

/** "Got it. I'll give you … for Mila, at 5 months." */
export function followUpIntro(answers: BuilderAnswers, baby: Baby) {
  const shape = answers.answerShouldLookLike.trim().replace(/\.$/, "");
  const who = baby.name?.trim() || "your baby";
  return shape
    ? `Got it. I'll give you ${lowerFirst(shape)}, made for ${who} at ${baby.ageMonths} months.`
    : `Got it. I'll keep it small and doable for ${who} at ${baby.ageMonths} months.`;
}

export function followUpResponse(reply: string, followUp: FollowUpQuestion): AgentResponse {
  return {
    reply,
    skillUsed: "create_skill",
    mode: "ask",
    results: followUp,
    learnPrompt: "One more detail makes the skill fit you better.",
  };
}

export function localFollowUp(answers: BuilderAnswers, baby: Baby): AgentResponse {
  return followUpResponse(followUpIntro(answers, baby), DEFAULT_FOLLOW_UP);
}

/** The follow-up as a line for the skill, or "" when she skipped it. */
export function followUpLine(followUp: FollowUpAnswer | null | undefined) {
  const answer = followUp?.answer?.trim();
  if (!answer) return "";
  return `- Asked "${followUp?.question.trim()}" she said: ${answer.replace(/\s+/g, " ")}`;
}
