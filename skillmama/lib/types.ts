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
  ageMonths: number;
  materials: string;
  minutesAvailable: number;
  completedActivityIds: string[];
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
  explanation: {
    whenToUse: string;
    instructions: string;
    safetyRules: string;
    outputFormat: string;
  };
};

export type AgentMode = "use" | "create" | "draft";

export type AgentResponse = {
  reply: string;
  skillUsed: string;
  mode: AgentMode;
  results: Activity[] | string[] | SkillDraft;
  learnPrompt: string;
};

export type AgentRequest = {
  message: string;
  baby: Baby;
  momSkills?: SkillCard[];
  builderAnswers?: BuilderAnswers | null;
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
