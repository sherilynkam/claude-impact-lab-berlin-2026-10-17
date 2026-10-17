// Person 3 — Claude. See worksplit.md Role 3.

/** Person 3: set this to the current Claude Sonnet model id from today's Anthropic docs. */
export const CLAUDE_MODEL = "REPLACE_WITH_CURRENT_CLAUDE_SONNET";

export type AgentRequest = {
  message: string;
  baby: { ageMonths: number; completedActivityIds: string[] };
};
