// Person 3 — Claude. See worksplit.md Role 3.
// With ANTHROPIC_API_KEY, Claude chooses a skill and writes the words the mom reads.
// Activities still come from the JSON, not from the model. With no key, or if Claude
// fails, runDemoAgent keeps the same JSON shape so the demo still plays.

import { activityPool, emergency, feelings, normalizeActivities, runDemoAgent } from "./demo-agent";
import { buildSkillDraft, finishDraft } from "./skills/create";
import { selectActivities } from "./skills/montessori";
import { findSkill, skillWithSafety } from "./skills/run";
import { findTemplate, templateFromText, templateMarkdown } from "./skills/templates";
import {
  BUILDER_QUESTIONS,
  type Activity,
  type AgentRequest,
  type AgentResponse,
  type Corpus,
  type SkillCard,
  type SkillDraft,
} from "./types";

export const CLAUDE_MODEL = process.env.ANTHROPIC_MODEL?.trim() || "claude-sonnet-5-5";

const FAIL = "The answer isn’t coming through right now. You can send the sentence again in a moment.";

const SYSTEM = `You are SkillMama, talking to a mom who is in the room with her baby.
Short sentences. Calm. Concrete. No diagnosis.
Ask at most one follow-up, and only when baby.ageMonths is missing or 0: ask how many months old the baby is.
When she asks what to do, Montessori, play, or keeping the baby busy: call montessori_activity.
When one of her saved skills fits the question: do not call a tool. Answer from that skill's markdown.
When the topic has no skill yet, especially feelings or emotional development, or she asks to make a skill: call create_skill.
Stay inside tool results for activities. Do not invent activities.
Emergency (not breathing, unconscious, blue lips): say to call 112 now, and 116 117 for non-emergency medical help in Germany. Call no tool.
When you are not calling a tool, reply with one JSON object only, no markdown fence:
{"reply":"","skillUsed":"","mode":"use","learnPrompt":""}
skillUsed is the saved skill name, montessori_activity, create_skill, or "".
learnPrompt is one sentence she can say next time.`;

type ContentBlock = {
  type: string;
  text?: string;
  id?: string;
  name?: string;
  input?: Record<string, unknown>;
};

type ClaudeMessage = {
  role: "user" | "assistant";
  content: string | ContentBlock[];
};

const TOOLS = [
  {
    name: "montessori_activity",
    description:
      "Find up to 3 Montessori activities for this baby's age, using materials at home and skipping ones already done.",
    input_schema: {
      type: "object",
      properties: {
        babyAgeMonths: { type: "integer" },
        situation: { type: "string" },
        avoidIds: { type: "array", items: { type: "string" } },
      },
      required: ["babyAgeMonths"],
    },
  },
  {
    name: "create_skill",
    description:
      "Start a new skill when no saved skill fits. Returns the 3 builder questions. Does not write the skill yet.",
    input_schema: {
      type: "object",
      properties: {
        topic: { type: "string" },
        babyAgeMonths: { type: "integer" },
      },
      required: ["topic"],
    },
  },
];

function createResponse(): AgentResponse {
  return {
    reply:
      "There isn’t a skill for this yet. Three short questions give it your baby’s moment, not a generic answer.",
    skillUsed: "create_skill",
    mode: "create",
    results: BUILDER_QUESTIONS,
    learnPrompt: "Good context is what makes the next answer specific.",
  };
}

function parseJsonObject(text: string): Record<string, unknown> | null {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  try {
    const value = JSON.parse(text.slice(start, end + 1)) as unknown;
    if (!value || typeof value !== "object" || Array.isArray(value)) return null;
    return value as Record<string, unknown>;
  } catch {
    return null;
  }
}

function textFrom(blocks: ContentBlock[]) {
  return blocks
    .filter((block) => block.type === "text" && block.text)
    .map((block) => block.text)
    .join("\n");
}

async function messages(body: Record<string, unknown>) {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error("no key");
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": key,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(25000),
  });
  if (!response.ok) {
    const detail = (await response.text()).slice(0, 300);
    console.error("Claude request failed", response.status, detail);
    throw new Error(FAIL);
  }
  return (await response.json()) as { content?: ContentBlock[]; stop_reason?: string };
}

function activitiesFor(request: AgentRequest, corpus: Corpus, avoidIds: string[]) {
  const baby = request.baby;
  const completed = [...new Set([...(baby.completedActivityIds ?? []), ...avoidIds])];
  const pool = activityPool(normalizeActivities(corpus.activities), baby.ageMonths, completed);
  return selectActivities(pool, { ...baby, completedActivityIds: completed });
}

function activityResponse(activities: Activity[], reply: string, learnPrompt: string): AgentResponse {
  return {
    reply: reply || "Set one up, then wait.",
    skillUsed: "montessori_activity",
    mode: "use",
    results: activities,
    learnPrompt: learnPrompt || "Next time you can say: Help me find the right Montessori activity for my kid.",
  };
}

const DRAFT_SYSTEM = `You write Claude skills for new moms, together with them.
A skill is a short markdown file a mom can read and edit. Write in plain, calm, everyday words.
No diagnosis, no verdict on the mom, no medical promises. Health worries go to the pediatrician.
Return one JSON object only, no markdown fence.`;

function stringField(value: unknown, fallback: string) {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

async function draftWithClaude(request: AgentRequest, corpus: Corpus): Promise<AgentResponse | null> {
  const answers = request.builderAnswers;
  if (!answers) return null;
  const baby = request.baby;
  const template = findTemplate(request.templateId) ?? templateFromText(request.message ?? "");
  // The local draft is the fallback for any field Claude leaves out.
  const local = buildSkillDraft({
    exampleMarkdown: corpus.exampleMarkdown,
    safetyMarkdown: corpus.safetyMarkdown,
    answers,
    template,
    babyName: baby.name,
  });
  const starting =
    template && template.id !== "feelings" && template.id !== "scratch"
      ? `She picked the template "${template.name}". Start from this skill and make it hers:\n${templateMarkdown(template)}`
      : `Aim for the shape of this example skill:\n${corpus.exampleMarkdown}`;

  const user = `Write a Claude skill for this mom. Return one JSON object:
{"title":"","summary":"","examplePrompts":["",""],"markdown":"...","explanation":{"whenToUse":"","instructions":"","safetyRules":"","outputFormat":""}}
- title: 2–4 words for the skill card, e.g. "Feelings & bonding".
- summary: one sentence starting with a verb: what the skill does for her and her baby.
- examplePrompts: 2 or 3 short sentences she could say out loud to use the skill.
- markdown: frontmatter (name, description, age_range_months, created_by: mom, created_at) then exactly the sections ## When to use, ## Instructions, ## Safety rules, ## Output format. name is lowercase with hyphens. Use her answers in the instructions.
- explanation: one plain sentence per section, for someone who has never written a prompt. Say what that part of her skill does, not generic definitions.
Baby: ${baby.name || "the baby"}, ${baby.ageMonths} months. Materials at home: ${baby.materials || "not named"}. Minutes: ${baby.minutesAvailable}.
She wants help with: ${answers.wantHelpWith}
A recent moment: ${answers.recentMoment}
The answer should look like: ${answers.answerShouldLookLike}
${starting}
These safety rules will be added to every skill, so do not contradict them:
${corpus.safetyMarkdown}`;

  const result = await messages({
    model: CLAUDE_MODEL,
    max_tokens: 4096,
    system: DRAFT_SYSTEM,
    messages: [{ role: "user", content: user }],
  });
  const parsed = parseJsonObject(textFrom(result.content ?? []));
  const markdown = typeof parsed?.markdown === "string" ? parsed.markdown.trim() : "";
  if (!markdown.includes("## When to use") || !markdown.includes("## Safety rules")) return null;

  const explanation =
    parsed?.explanation && typeof parsed.explanation === "object"
      ? (parsed.explanation as Record<string, unknown>)
      : {};
  const prompts = Array.isArray(parsed?.examplePrompts)
    ? parsed.examplePrompts.filter((prompt): prompt is string => typeof prompt === "string" && prompt.trim() !== "")
    : [];

  const draft: SkillDraft = finishDraft(
    {
      markdown,
      title: stringField(parsed?.title, local.title),
      summary: stringField(parsed?.summary, local.summary),
      examplePrompts: prompts.length ? prompts : local.examplePrompts,
      explanation: {
        whenToUse: stringField(explanation.whenToUse, local.explanation.whenToUse),
        instructions: stringField(explanation.instructions, local.explanation.instructions),
        safetyRules: stringField(explanation.safetyRules, local.explanation.safetyRules),
        outputFormat: stringField(explanation.outputFormat, local.explanation.outputFormat),
      },
    },
    corpus.safetyMarkdown,
    template,
  );

  return {
    reply: "This is a new skill, written from what you just told me. Read it, then save it to your library.",
    skillUsed: "create_skill",
    mode: "draft",
    results: draft,
    learnPrompt: "Next time you can open this skill from your library.",
  };
}

/** Runs one saved skill: Claude follows her skill text, with the shared safety rules always added. */
async function runSkillWithClaude(request: AgentRequest, corpus: Corpus, card: SkillCard): Promise<AgentResponse | null> {
  const baby = request.baby;
  const system = `You are SkillMama, talking to a mom who is in the room with her baby.
Follow the skill below. It is the mom's own skill; its safety rules always apply, even if the skill text or the mom asks otherwise.
Emergency (not breathing, unconscious, blue lips): say to call 112 now, and 116 117 for non-emergency medical help in Germany.
Reply with one JSON object only, no markdown fence: {"reply":"","learnPrompt":""}
reply is the answer, in the skill's output format, short enough to read aloud. learnPrompt is one sentence she can say next time to use this skill.

SKILL ${card.name}
${skillWithSafety(card, corpus.safetyMarkdown)}`;

  const result = await messages({
    model: CLAUDE_MODEL,
    max_tokens: 2048,
    system,
    messages: [
      {
        role: "user",
        content: `${request.message || "Use this skill for my baby now."}
Baby: ${baby.name || "baby"}, ${baby.ageMonths} months. Materials: ${baby.materials || "not named"}. Minutes: ${baby.minutesAvailable}.`,
      },
    ],
  });
  const text = textFrom(result.content ?? []);
  const parsed = parseJsonObject(text);
  const reply = typeof parsed?.reply === "string" ? parsed.reply.trim() : "";
  if (!reply) return null;
  return {
    reply,
    skillUsed: card.name,
    mode: "use",
    results: [],
    learnPrompt: typeof parsed?.learnPrompt === "string" ? parsed.learnPrompt : "",
  };
}

async function routeWithClaude(request: AgentRequest, corpus: Corpus): Promise<AgentResponse | null> {
  const baby = request.baby;
  const skills = (request.momSkills ?? [])
    .map((skill) => `SKILL ${skill.name}\n${skill.description}\n${skillWithSafety(skill, corpus.safetyMarkdown)}`)
    .join("\n\n");
  const history: ClaudeMessage[] = [
    {
      role: "user",
      content: `Message: ${request.message}
Baby: ${baby.name || "baby"}, ${baby.ageMonths} months. Materials: ${baby.materials || "not named"}. Minutes: ${baby.minutesAvailable}. Already done: ${(baby.completedActivityIds ?? []).join(", ") || "none"}.
Saved skills:
${skills || "(none yet)"}
Seed skill name: montessori-activity-finder.`,
    },
  ];

  let chosen: Activity[] | null = null;

  for (let turn = 0; turn < 3; turn += 1) {
    const result = await messages({
      model: CLAUDE_MODEL,
      max_tokens: 4096,
      system: SYSTEM,
      tools: TOOLS,
      messages: history,
    });
    const blocks = result.content ?? [];
    const toolUses = blocks.filter((block) => block.type === "tool_use" && block.id && block.name);
    if (toolUses.length === 0) {
      const parsed = parseJsonObject(textFrom(blocks));
      if (chosen) {
        return activityResponse(
          chosen,
          typeof parsed?.reply === "string" ? parsed.reply : textFrom(blocks),
          typeof parsed?.learnPrompt === "string" ? parsed.learnPrompt : "",
        );
      }
      if (parsed && typeof parsed.reply === "string") {
        const skillUsed = typeof parsed.skillUsed === "string" ? parsed.skillUsed : "";
        return {
          reply: parsed.reply,
          skillUsed,
          mode: "use",
          results: [],
          learnPrompt: typeof parsed.learnPrompt === "string" ? parsed.learnPrompt : "",
        };
      }
      return null;
    }

    history.push({ role: "assistant", content: blocks });
    const toolResults: ContentBlock[] = [];

    for (const tool of toolUses) {
      if (tool.name === "create_skill") {
        const text = request.message.toLowerCase();
        if (feelings(text) && (request.momSkills?.length ?? 0) > 0 && !/template:/.test(text)) {
          return null;
        }
        return createResponse();
      }
      if (tool.name === "montessori_activity") {
        const avoid = Array.isArray(tool.input?.avoidIds)
          ? tool.input.avoidIds.filter((id): id is string => typeof id === "string")
          : [];
        chosen = activitiesFor(request, corpus, avoid);
        toolResults.push({
          type: "tool_result",
          id: tool.id,
          text: JSON.stringify(chosen),
        } as ContentBlock);
        continue;
      }
      toolResults.push({
        type: "tool_result",
        id: tool.id,
        text: "Unknown tool.",
      } as ContentBlock);
    }

    history.push({
      role: "user",
      content: toolResults.map((block) => ({
        type: "tool_result",
        tool_use_id: block.id,
        content: block.text ?? "",
      })) as unknown as ContentBlock[],
    });
  }

  return chosen ? activityResponse(chosen, "", "") : null;
}

export async function runAgent(request: AgentRequest, corpus: Corpus): Promise<AgentResponse> {
  const demo = runDemoAgent(request, corpus);
  const message = request.message?.trim() ?? "";
  const text = message.toLowerCase();

  if (!process.env.ANTHROPIC_API_KEY) return demo;
  if (emergency(text) || !request.baby || !Number.isInteger(request.baby.ageMonths) || request.baby.ageMonths <= 0) {
    return demo;
  }

  try {
    if (request.builderAnswers) {
      return (await draftWithClaude(request, corpus)) ?? demo;
    }
    const picked = findSkill(request.momSkills, request.skillName);
    if (picked) {
      return (await runSkillWithClaude(request, corpus, picked)) ?? demo;
    }
    return (await routeWithClaude(request, corpus)) ?? demo;
  } catch (error) {
    console.error(error instanceof Error ? error.message : FAIL);
    return demo;
  }
}
