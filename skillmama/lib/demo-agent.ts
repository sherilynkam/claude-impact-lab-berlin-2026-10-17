import { DEMO_ACTIVITIES } from "./demo-activities";
import { buildSkillDraft } from "./skills/create";
import { selectActivities } from "./skills/montessori";
import { titleFromName } from "./parse-skill";
import {
  BUILDER_QUESTIONS,
  type Activity,
  type AgentRequest,
  type AgentResponse,
  type Corpus,
  type SkillCard,
} from "./types";

function isActivity(value: unknown): value is Activity {
  if (!value || typeof value !== "object") return false;
  const activity = value as Activity;
  return (
    typeof activity.id === "string" &&
    typeof activity.title === "string" &&
    typeof activity.howToOffer === "string" &&
    typeof activity.ageMinMonths === "number" &&
    typeof activity.ageMaxMonths === "number" &&
    (activity.domain === "movement" ||
      activity.domain === "language" ||
      activity.domain === "practical_life" ||
      activity.domain === "sensorial")
  );
}

export function normalizeActivities(value: unknown): Activity[] {
  const list = Array.isArray(value) ? value : [];
  return list.filter(isActivity);
}

function poolFor(fileActivities: Activity[], ageMonths: number, completed: string[]) {
  const blocked = new Set(completed);
  const exactFromFile = fileActivities.filter(
    (activity) =>
      !blocked.has(activity.id) &&
      activity.ageMinMonths <= ageMonths &&
      ageMonths <= activity.ageMaxMonths,
  );
  if (exactFromFile.length >= 3) return fileActivities;
  const ids = new Set(fileActivities.map((activity) => activity.id));
  return [...fileActivities, ...DEMO_ACTIVITIES.filter((activity) => !ids.has(activity.id))];
}

export function feelings(text: string) {
  return /emotion|feeling|cry|crying|cries|weinen|weint|unruhig|gefühl|gefuhl|overwhelmed|upset|comfort|bonding|fussy/.test(
    text,
  );
}

export function emergency(text: string) {
  return /not breathing|isn't breathing|isnt breathing|cannot breathe|can't breathe|unconscious|turned blue|blue lips|notfall|atmet nicht|keine luft/.test(
    text,
  );
}

export function wantsNewSkill(text: string) {
  return feelings(text) || /new skill|make (me )?a skill|build a skill|start from scratch|template:/.test(text);
}

export function activityPool(fileActivities: Activity[], ageMonths: number, completed: string[]) {
  return poolFor(fileActivities, ageMonths, completed);
}

function activityReply(baby: AgentRequest["baby"]) {
  const bits = [
    baby.minutesAvailable ? `You have about ${baby.minutesAvailable} minutes.` : "",
    baby.materials.trim() ? "These use what you already have around." : "",
    "Set one up, then wait.",
  ];
  return bits.filter(Boolean).join(" ");
}

function momReply(card: SkillCard) {
  const title = titleFromName(card.name);
  return `Using your skill “${title}”. You can say: “I’m here, I’m going to see what you need.” Then change one thing — hunger, a wet diaper, tiredness, or too much going on — and wait a minute. Call the pediatrician if you are worried about health. This is not a diagnosis.`;
}

export function runDemoAgent(request: AgentRequest, corpus: Corpus): AgentResponse {
  const message = request.message?.trim() ?? "";
  const text = message.toLowerCase();
  const baby = request.baby;
  const momSkills = request.momSkills ?? [];

  if (emergency(text)) {
    return {
      reply:
        "This might be an emergency. Call 112 now. For non-emergency medical help in Germany, call 116 117.",
      skillUsed: "",
      mode: "use",
      results: [],
      learnPrompt: "",
    };
  }

  if (!baby || !Number.isInteger(baby.ageMonths) || baby.ageMonths <= 0) {
    return {
      reply: "How many months old is your baby?",
      skillUsed: "",
      mode: "use",
      results: [],
      learnPrompt: "Next time you can say the age in the same sentence.",
    };
  }

  if (request.builderAnswers) {
    return {
      reply:
        "This is a new skill, written from what you just told me. Read what each part means, change anything you want, then save it.",
      skillUsed: "create_skill",
      mode: "draft",
      results: buildSkillDraft(
        corpus.exampleMarkdown,
        corpus.safetyMarkdown,
        request.builderAnswers,
      ),
      learnPrompt: "Next time you can open this skill from your library.",
    };
  }

  if (!message) {
    return {
      reply: "Say a sentence, or tap one of the lines below.",
      skillUsed: "",
      mode: "use",
      results: [],
      learnPrompt: "",
    };
  }

  if (feelings(text) && momSkills.length > 0 && !/template:/.test(text)) {
    const card =
      momSkills.find((skill) => skill.name.includes("emotion")) ?? momSkills[momSkills.length - 1];
    return {
      reply: momReply(card),
      skillUsed: card.name,
      mode: "use",
      results: [],
      learnPrompt: `Next time you can open ${titleFromName(card.name)} from your library.`,
    };
  }

  if (wantsNewSkill(text)) {
    return {
      reply:
        "There isn’t a skill for this yet. Three short questions give it your baby’s moment, not a generic answer.",
      skillUsed: "create_skill",
      mode: "create",
      results: BUILDER_QUESTIONS,
      learnPrompt: "Good context is what makes the next answer specific.",
    };
  }

  const activities = selectActivities(
    activityPool(normalizeActivities(corpus.activities), baby.ageMonths, baby.completedActivityIds),
    baby,
  );

  return {
    reply: activityReply(baby),
    skillUsed: "montessori-activity-finder",
    mode: "use",
    results: activities,
    learnPrompt: "Next time you can say: Help me find the right Montessori activity for my kid.",
  };
}
