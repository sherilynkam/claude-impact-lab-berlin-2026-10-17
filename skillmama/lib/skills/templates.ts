// Starter templates for "Build your own skill" (Templates screen, design/prototype/Templates.dc.html).
// Shared by the page and the server, so the template a mom picks shapes the skill she gets.
// Each template is a starting skill: Claude (or the local fallback) fills it in with her answers.

export type TemplateCategory = "dev" | "care" | "me";

type BabyLike = { name?: string; ageMonths: number };

export type SkillTemplate = {
  id: string;
  cat: TemplateCategory;
  /** Card title on the Templates screen and on the saved skill. */
  name: string;
  /** One line under the title on the Templates screen. */
  desc: string;
  /** Prefills "What do you want help with?". */
  want: string;
  /** Goal chips on the Create screen. */
  goals: string[];
  /** The sentence shown as her first chat bubble. */
  line: string;
  /** Skill name in the frontmatter, lowercase with hyphens. */
  skillName: string;
  /** "What it does" on the Review screen. */
  summary: string;
  whenToUse: string;
  instructions: string;
  outputFormat: string;
  /** Prefills "What should the answer look like?". */
  answerShouldLookLike: string;
  /** "Say it like": sentences that run the saved skill. */
  examplePrompts: string[];
  /** Answer the saved skill gives when there is no Claude key. */
  demoAnswer: (baby: BabyLike) => string;
};

function who(baby: BabyLike) {
  return baby.name?.trim() || "your baby";
}

export const TEMPLATES: SkillTemplate[] = [
  {
    id: "feelings",
    cat: "dev",
    name: "Feelings & bonding",
    desc: "Small ways to support her emotions",
    want: "Ideas to support her feelings",
    goals: ["What's normal at her age", "Ideas to support her feelings", "Help me read her cues"],
    line: "Help me figure out emotional development for my kid.",
    skillName: "feelings-and-bonding",
    summary: "Suggests 2–3 small ways to support your baby's feelings at this age, and what to notice.",
    whenToUse:
      "Use this when a mom asks about her baby's feelings, crying, being unsettled, bonding, or a hard moment that is not a medical emergency.",
    instructions:
      "Listen to the moment she describes. Answer with one sentence she can say out loud and one small thing she can do inside the apartment, matched to the baby's age. When it fits, add what she might notice next.",
    outputFormat: "- One sentence she can say out loud.\n- One thing she can do next, inside the apartment.\n- When to call the pediatrician instead.",
    answerShouldLookLike: "One thing I can say and one thing I can do.",
    examplePrompts: ["My baby is fussy, how can I help?", "Bonding ideas for today"],
    demoAnswer: (baby) =>
      `You can say: “I’m here, I’m going to see what you need.” Then change one thing for ${who(baby)}: hunger, a wet diaper, tiredness, or too much going on, and wait a minute. Notice whether the breathing slows. If you are worried about health, call the pediatrician.`,
  },
  {
    id: "first-words",
    cat: "dev",
    name: "First words",
    desc: "Talk, sing and read at her level",
    want: "Ways to talk with her at this age",
    goals: ["Talk during daily care", "Songs and rhymes", "Reading together"],
    line: "Help me make a skill. Template: First words.",
    skillName: "first-words",
    summary: "Gives 2–3 short ways to talk, sing or read with your baby at this age.",
    whenToUse: "Use this when a mom wants ideas for talking, singing, naming things or reading with her baby.",
    instructions:
      "Suggest talk she can fit into what she is already doing: changing, feeding, a walk. Use the baby's age: face-to-face voice play and pauses for young babies, naming objects and simple books later. Leave room for the baby to answer with sounds.",
    outputFormat: "- 2–3 ideas, one line each.\n- One sentence she can say word for word.\n- What to listen for.",
    answerShouldLookLike: "Two short ideas and one sentence I can say.",
    examplePrompts: ["How can I talk with my baby today?", "A song idea for the changing table"],
    demoAnswer: (baby) =>
      `Name what you do while you do it: “Now the sock goes on your foot.” Then pause and wait: ${who(baby)} may answer with a sound or a look. One short song a day, the same one, helps them know what comes next.`,
  },
  {
    id: "movement",
    cat: "dev",
    name: "Movement & tummy time",
    desc: "Age-fit ways to move and explore",
    want: "A short way for her to move",
    goals: ["Tummy time she enjoys", "Reaching and grasping", "Rolling and crawling"],
    line: "Help me make a skill. Template: Movement.",
    skillName: "movement-and-tummy-time",
    summary: "Suggests one short, age-fit way to move and explore, on the floor, with you close.",
    whenToUse: "Use this when a mom wants movement, tummy time or floor play ideas for her baby.",
    instructions:
      "Offer floor play that lets the baby move by themselves: tummy time on a firm blanket for young babies, a toy just out of reach for older ones. Keep it short and stop when the baby is done. Tummy time only while awake and watched.",
    outputFormat: "- One activity, with how to set it up.\n- How long to try it.\n- What she might notice.",
    answerShouldLookLike: "One activity and how long to do it.",
    examplePrompts: ["A tummy time idea for today", "Help my baby move more"],
    demoAnswer: (baby) =>
      `Lie on the floor face to face with ${who(baby)} on a firm blanket for tummy time, a minute or two while awake and you are watching. Put a bright cloth just within reach. Stop at the first fuss: short and often works better than long.`,
  },
  {
    id: "sleep-routine",
    cat: "care",
    name: "Sleep routine",
    desc: "A calm, simple bedtime rhythm",
    want: "A simple bedtime rhythm",
    goals: ["A bedtime routine", "Calmer naps", "Winding down"],
    line: "Help me make a skill. Template: Sleep routine.",
    skillName: "sleep-routine",
    summary: "Builds a short, calm bedtime rhythm you can repeat each night.",
    whenToUse: "Use this when a mom asks about bedtime, naps, or winding down.",
    instructions:
      "Suggest 3 or 4 calm steps in the same order every night, for example dim light, a short wash, a feed, one song. Always follow safe sleep: on the back, on a firm flat surface, with nothing else in the cot. No sleep training programs and no promises.",
    outputFormat: "- 3–4 steps in order.\n- One sentence she can say at the end.\n- A safe sleep reminder.",
    answerShouldLookLike: "A short list of steps in order.",
    examplePrompts: ["Help me with tonight's bedtime", "How do I wind down before sleep?"],
    demoAnswer: (baby) =>
      `Try the same four steps tonight: dim the lights, a warm wash, a feed, then one quiet song. End with the same sentence: “Now it’s time to sleep.” Lay ${who(baby)} on their back, on a firm flat surface, with nothing else in the cot.`,
  },
  {
    id: "bath-care",
    cat: "care",
    name: "Bath & care time",
    desc: "Turn daily care into connection",
    want: "Make care time feel calm",
    goals: ["Calmer baths", "Nappy changes together", "Dressing without tears"],
    line: "Help me make a skill. Template: Bath and care.",
    skillName: "bath-and-care-time",
    summary: "Turns a bath, nappy change or dressing into a calm moment together.",
    whenToUse: "Use this when a mom wants care moments like baths, changing or dressing to feel calmer.",
    instructions:
      "Slow the moment down: say what will happen before it happens, give the baby a small part to do when they can, and keep hands warm and movements slow. In the bath, keep one hand on the baby at all times.",
    outputFormat: "- One way to slow the moment down.\n- One sentence she can say before each step.\n- A safety note when water is involved.",
    answerShouldLookLike: "One idea and what I can say.",
    examplePrompts: ["Make bath time calmer", "Nappy changes are a struggle"],
    demoAnswer: (baby) =>
      `Before each step, tell ${who(baby)} what comes next: “Now I lift your legs.” Then wait a second before you do it. Warm your hands first. In the bath, keep one hand on them the whole time.`,
  },
  {
    id: "me-time",
    cat: "me",
    name: "A moment for me",
    desc: "5-minute resets for tired days",
    want: "A 5-minute reset when I am tired",
    goals: ["A 5-minute reset", "When I feel overwhelmed", "Rest while she plays"],
    line: "Help me make a skill. Template: A moment for me.",
    skillName: "a-moment-for-me",
    summary: "Gives you one 5-minute reset you can do with the baby safe nearby.",
    whenToUse: "Use this when a mom says she is tired, overwhelmed, or needs a moment for herself.",
    instructions:
      "Offer one reset of about 5 minutes she can do with the baby safe on the floor nearby: breathing, water and a snack, a window, a stretch. Be warm and never judge. If she says she has felt low for a long time, gently point her to her midwife or doctor.",
    outputFormat: "- One reset, in 2–3 steps.\n- One kind sentence for her.\n- Where to get help if it has been hard for a while.",
    answerShouldLookLike: "One short reset and something kind.",
    examplePrompts: ["I need a 5-minute reset", "I'm so tired today"],
    demoAnswer: (baby) =>
      `Lay ${who(baby)} on their back on the floor where you can see them. Drink a glass of water, open a window, and take five slow breaths, longer out than in. You are doing a hard job. If you have felt low for weeks, talk to your midwife or doctor.`,
  },
  {
    id: "meal-planner",
    cat: "care",
    name: "Meal planner",
    desc: "Simple, age-fit meals and snacks",
    want: "Simple, age-fit meals and snacks",
    goals: ["First foods", "Simple snacks", "A day of meals"],
    line: "Help me make a skill. Template: Meal planner.",
    skillName: "meal-planner",
    summary: "Suggests simple meals and snacks that fit your baby's age.",
    whenToUse: "Use this when a mom asks what her baby can eat, about first foods, or about simple meal ideas.",
    instructions:
      "Match food to the baby's age: milk only before about 6 months, then soft single foods, then soft finger foods. Name one thing to skip at this age, such as honey before 12 months or whole nuts and whole grapes. Not a nutrition plan.",
    outputFormat: "- 2–3 meal or snack ideas.\n- One thing to skip at this age.\n- When to ask the pediatrician.",
    answerShouldLookLike: "A few ideas and one thing to avoid.",
    examplePrompts: ["What can my baby eat today?", "A simple snack idea"],
    demoAnswer: (baby) =>
      baby.ageMonths < 6
        ? `At ${baby.ageMonths} months, milk is all ${who(baby)} needs. Ask your pediatrician around 6 months about first foods. Skip honey until after the first birthday.`
        : `Try soft, single foods ${who(baby)} can hold: steamed carrot sticks, ripe banana, soft-cooked pasta. Skip honey before 12 months and cut grapes lengthwise. Stay close while they eat.`,
  },
];

/** "None fit? Start from scratch." */
export const SCRATCH_TEMPLATE: SkillTemplate = {
  id: "scratch",
  cat: "me",
  name: "My skill",
  desc: "Start from scratch",
  want: "",
  goals: ["Ideas for today", "Help me understand", "A routine"],
  line: "Help me make a skill. Template: start from scratch.",
  skillName: "my-skill",
  summary: "A skill you wrote for your baby.",
  whenToUse: "Use this when the mom's question matches what she asked this skill to help with.",
  instructions: "Answer from what she told you when she made this skill. Keep it short, calm and concrete.",
  outputFormat: "- One or two short ideas.\n- One sentence she can say or do.",
  answerShouldLookLike: "One thing I can say and one thing I can do.",
  examplePrompts: ["Use my skill"],
  demoAnswer: (baby) =>
    `Here is one small thing to try with ${who(baby)} today. Keep it short, stay close, and watch what happens.`,
};

/** Templates shown on the Templates screen (the meal planner sits in the library instead). */
export const PICKER_TEMPLATES = TEMPLATES.filter((template) => template.id !== "meal-planner");

export function findTemplate(id: string | null | undefined): SkillTemplate | null {
  if (!id) return null;
  if (id === SCRATCH_TEMPLATE.id) return SCRATCH_TEMPLATE;
  return TEMPLATES.find((template) => template.id === id) ?? null;
}

/** Fallback when only the chat line came through, e.g. "Help me make a skill. Template: Sleep routine." */
export function templateFromText(text: string): SkillTemplate | null {
  const lower = text.toLowerCase();
  if (/start from scratch/.test(lower)) return SCRATCH_TEMPLATE;
  const named = TEMPLATES.find((template) => lower.includes(template.line.toLowerCase()));
  if (named) return named;
  if (/emotion|feeling|bonding/.test(lower)) return TEMPLATES[0];
  return null;
}

/** The starting skill file for a template, before her answers are added. */
export function templateMarkdown(template: SkillTemplate) {
  return `---
name: ${template.skillName}
description: ${template.summary}
age_range_months: [0, 12]
created_by: mom
created_at: 2026-10-17
---

## When to use

${template.whenToUse}

## Instructions

${template.instructions}

## Safety rules

No diagnosis and no verdict on the mom. Concerns about health or milestones go to the pediatrician.

## Output format

${template.outputFormat}
`;
}
