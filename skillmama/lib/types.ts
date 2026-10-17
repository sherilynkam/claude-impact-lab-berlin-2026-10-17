export type Domain = "movement" | "language" | "practical_life" | "sensorial";

export type Activity = {
  id: string;
  title: string;
  ageMinMonths: number;
  ageMaxMonths: number;
  domain: Domain;
  materials: string;
  howToOffer: string;
  whatToNotice: string;
  minutes: number;
  source?: string;
  whyItHelps?: string;
  nearbyAge?: boolean;
};

export type Baby = {
  name: string;
  parentName: string;
  dateOfBirth: string;
  ageMonths: number;
  materials: string;
  minutesAvailable: number;
  completedActivityIds: string[];
};

export type Reaction = "loved" | "okay" | "notyet";

export type JourneyEntry = {
  id: string;
  activityId: string;
  title: string;
  reaction: Reaction;
  note: string;
  at: string;
};

export type SkillCard = {
  name: string;
  description: string;
  markdown: string;
  createdBy: "seed" | "mom";
  createdAt: string;
};

export type BuilderAnswers = {
  wantHelpWith: string;
  recentMoment: string;
  answerShouldLookLike: string;
};

export type SkillDraft = {
  markdown: string;
  /** Card title, e.g. "Feelings & bonding". */
  title: string;
  /** "What it does": one plain sentence. */
  summary: string;
  /** "Say it like": 2–3 sentences she can say to run the skill. */
  examplePrompts: string[];
  explanation: {
    whenToUse: string;
    instructions: string;
    safetyRules: string;
    outputFormat: string;
  };
};

/** "ask": Claude asks one follow-up before writing the skill (Create screen chat). */
export type AgentMode = "use" | "create" | "ask" | "draft";

/** The one follow-up question, with short answers she can tap. */
export type FollowUpQuestion = {
  question: string;
  suggestions: string[];
};

/** Her answer to the follow-up. An empty answer means she skipped it. */
export type FollowUpAnswer = {
  question: string;
  answer: string;
};

export type AgentResponse = {
  reply: string;
  skillUsed: string;
  mode: AgentMode;
  results: Activity[] | string[] | FollowUpQuestion | SkillDraft;
  learnPrompt: string;
};

export type AgentRequest = {
  message: string;
  baby: Baby;
  momSkills?: SkillCard[];
  builderAnswers?: BuilderAnswers | null;
  /** Template picked on the Templates screen, e.g. "sleep-routine". Shapes the draft. */
  templateId?: string | null;
  /** Run this saved skill directly (Library tap, or right after saving). */
  skillName?: string | null;
  /** With builderAnswers: return one follow-up question (mode "ask") instead of the draft. */
  askFollowUp?: boolean;
  /** With builderAnswers: her answer to the follow-up, used in the draft. */
  followUp?: FollowUpAnswer | null;
};

export type Corpus = {
  activities: Activity[];
  exampleMarkdown: string;
  safetyMarkdown: string;
  seedMarkdown: string;
};

export const DOMAIN_LABEL: Record<Domain, string> = {
  movement: "Movement",
  language: "Language",
  practical_life: "Practical life",
  sensorial: "Senses",
};

export const BUILDER_QUESTIONS = [
  "What do you want help with?",
  "Describe a recent moment.",
  "What should the answer look like?",
];

export const SKILL_EXPLANATION = {
  whenToUse: "This tells Claude which of your questions this skill is for.",
  instructions: "This is what Claude should do, step by step, like a note to a babysitter.",
  safetyRules: "Things Claude must always do or never say, even if you ask.",
  outputFormat: "What the answer should look like on your screen.",
};
