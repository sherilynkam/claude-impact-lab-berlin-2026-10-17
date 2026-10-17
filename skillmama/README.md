# SkillMama — Montessori Activities and a Claude Skill Library for New Moms

> Claude Impact Lab Berlin · 17 Oct 2026  
> A mom at home, baby in the room, no idea what to do next: she speaks, Claude runs a skill, she gets a concrete activity — and over time she builds her own skill library.

---

## 1. The Idea

### One-liner
**For new moms sitting at home, unsure what to do with their baby:** speak a need, and SkillMama either runs an existing Claude skill (start with Montessori activities) or helps her create the next skill in her own library.

### Problem
1. **Finding the activity.** The baby is awake, the day is unstructured, and “I have 20 minutes and no idea what to do with my baby” is a daily moment. Search results and social feeds are generic, age-mismatched, not grounded in a real framework like Montessori, and ask for scrolling she does not have time for. Nothing stays with *her* child over time.
2. **Using AI.** Most people use AI as a one-off answer machine. They never learn that they can teach Claude their needs once and reuse that knowledge.

### Solution
A **mobile app with voice**, built around a **Claude skill library**:

1. She already has skills she can **use** — first one: *what Montessori activity fits my baby right now?*
2. When a question has no skill yet, she **creates** one with Claude — for example emotional development — and it joins the library.
3. The library is about **time with this child**: activities, meals, and later development, matched to the baby’s age and to what they have already done together.

### Product concept
We help new moms find activities for their newborn through the **Montessori** framework, and we help them get better at AI by **building a Claude skill library** for their own family.

Two sentences she can say:

- *“Help me find the right Montessori activity for my kid.”*  
  The app runs existing skills and returns suggestions.
- *“Help me figure out emotional development for my kid.”*  
  No skill exists for that yet. The app asks her 3 short questions, drafts the skill, **explains each part in plain language**, and lets her edit, save, and run it right away.

### Audience
- New moms with a baby aged 0–12 months, often at home with the baby
- Hands full, phone nearby, a question in the moment
- Many are new to AI. They don't need a course. They need help with a real moment in their day, and a way to learn AI by using it on something they care about.

### How she learns AI (the point of the project)

Each learning moment is one thing on screen, so it fits the 2-hour build:

| Moment in the app | What she learns | What is on screen |
|---|---|---|
| Using a library skill | AI can follow saved instructions, not just chat | Skill badge: “Skill used: Montessori activity finder” |
| Answering the skill-builder's 3 questions | Good context makes AI answers better | A 3-question form before the draft appears |
| Reading the plain-language explanation of her new skill | What instructions, safety rules, and an output format are | One sentence under each section of the skill |
| Editing and saving her skill | She owns something reusable | A text box with her skill, plus a Save button |
| Confidence check before and after | She can see her own progress | “How confident are you using AI?” 1–5 taps at the start and at the end |

### What we are not
- Not a medical product, not a pediatric or developmental diagnosis
- Not a generic chatbot — **a skill library**, one clear job per skill
- Not a full Montessori school curriculum

### Working name
**SkillMama** — voice-first Claude skills for new moms.

---

## 2. What we are building

### Phase 1 — today

| Piece | What it is |
|---|---|
| **Montessori activity** | “What should I do with my baby?” A Claude skill returns a few age-fit activities: what to set up, how to do it, how long, what to watch for. |
| **Baby** | One onboarding screen the skills read: age in months, materials at home, minutes available. Plus what you already tried. Every suggestion is for *this* baby, not a generic newborn. |
| **Router** | Claude decides: run an existing library skill, or start the skill builder. |
| **Skill builder** | 3 questions → Claude drafts the skill → a plain-language line under each section → she edits, saves, and runs it. |
| **Safety guardrails** | Every skill, including ones moms create, gets the same safety rules added by the server. She can read them but cannot delete them. |
| **Confidence check** | 1–5 tap at the start and after her first saved skill. Both numbers are shown side by side. |
| **Meal planner** | A library skill for simple, age-fit meals and snacks that sit next to the day’s activities. |
| **Voice** | **Whisper** in the mobile app (hold to talk). If Whisper slips, use the browser **Web Speech API** as a 10-minute fallback (Chrome/Safari). **Alexa** is the same agent behind a second voice surface. |
| **Skills library** | Starter skills shipped with the app, plus skills the mom creates. Each skill is visible: name, what it is for, who made it (`seed` or `mom`), when she last used it. |
| **Activities over time** | Suggestions change as the baby grows. The app remembers what you did, so the next idea is the next step, not a repeat. |

Pitch depth: **go deep on Montessori activity (use a skill)** and **show skill creation once** (emotional development), including the explanation. That explanation is the AI-education moment. Meal planner and Alexa can be present as the library and the second voice, not as separate products.

### Phase 2 — later

**Baby development planner.** A longer view across domains (movement, language, practical life, emotional development) that uses the skill library to sketch what to focus on over the coming weeks as the baby’s age changes. Not in the day-one demo.

---

## 3. User flow

The app is **mobile**, and the same actions are available as **voice commands**.

```
[Hold to talk]  or  Alexa
    → Whisper transcript (or Alexa utterance)
    → Claude: use an existing skill, or start creating one
    → run skill  /  draft the new skill into the library
    → reply: activities or the new skill card
    → library updates (used, or newly saved)
```

**Use a skill**

> “Help me find the right Montessori activity for my kid.”  
> Baby profile: 5 months.  
> Agent → skill `montessori_activity`  
> Output: 2–3 activities (setup, how to offer it, a few minutes, what you might notice), plus a line on why this fits this age.

**Create a skill**

> “Help me figure out emotional development for my kid.”  
> No skill matches yet.  
> Agent → skill builder:  
> 1. **Interview:** 3 fixed questions. *What do you want help with? Describe a recent moment. What should the answer look like?*  
> 2. **Draft:** Claude writes the skill in 4 sections: *When to use · Instructions · Safety rules · Output format*.  
> 3. **Explain:** one plain-language sentence under each section, e.g. “Safety rules: things Claude must always do or never say, even if you ask.”  
> 4. **Edit & save:** she can change the text, then tap Save. The skill joins the library and runs once right away.

**Over time**

> A week later, same question. The baby is a week older, yesterday’s activity is marked done, and the suggestion moves on.

---

## 4. Technical implementation

### Architecture (hackathon-friendly)

```
Mobile web (Next.js)
  ├─ Voice UI (MediaRecorder) + text fallback
  ├─ POST /api/transcribe     → OpenAI Whisper
  ├─ POST /api/agent          → Claude + tool/skill calling
  │     ├─ skill: montessori_activity   (use)
  │     ├─ skill: meal_planner          (use)
  │     └─ skill: create_skill          (draft + explain a new skill)
  ├─ Skills library           → seed skills in the repo + mom's skills in localStorage
  ├─ Baby profile             → age, materials, minutes, activity history (localStorage)
  ├─ Confidence check         → before / after score (localStorage)
  └─ UI: transcript · skill badge · activity cards · skill builder · library
```

No database: the browser keeps the baby, the library, and the scores, and sends what the agent needs with each request. That keeps the deploy stateless and safe to ship in 2 hours.

Alexa (later the same day if time): a thin voice front-end that sends the utterance to `/api/agent`. The skills do not change.

### Stack

| Layer | Tech | Why |
|---|---|---|
| Frontend | Next.js App Router, mobile-first | One deploy, works in the hand |
| Voice in | `MediaRecorder` → Whisper; fallback: Web Speech API | No native app for the demo; fallback needs no key |
| Second voice | Alexa skill → same `/api/agent` | Same brain, hands-free in the room |
| Agent | **Claude API** + **tool use** | Skills = tools |
| Library | Seed skills as `.md` in `skills/`; created skills in `localStorage` | She can read a skill as plain text |
| Baby + history | `localStorage` | Age and activities over time, no accounts |
| Optional out | Browser `speechSynthesis` or TTS | Hear the activity while holding the baby |
| Secrets | `.env` (`ANTHROPIC_API_KEY`, `OPENAI_API_KEY`) | Never commit |

> **“Claude skill” today:** a short markdown file with frontmatter, the same shape as a real Claude skill, so what she learns carries over. The agent exposes the library as tools; when a skill runs, its markdown goes into Claude's prompt along with the baby profile.

### Skill format (seed and mom-made skills share it)

```markdown
---
name: montessori-activity-finder
description: Suggests age-appropriate Montessori activities using materials at home.
age_range_months: [0, 12]
created_by: seed        # or "mom"
created_at: 2026-10-17
---
## When to use
## Instructions
## Safety rules
## Output format
```

**Mandatory safety rules.** The server always adds the text of `skills/_safety.md` to `## Safety rules` before any skill runs, mom-made ones included:
- Age-appropriate activities only, always with a supervision note
- Flag choking hazards, tummy-time limits, and safe sleep where relevant
- No diagnosis. Concerns about milestones or health always point to the pediatrician

### API sketch

**`POST /api/transcribe`**
- Body: audio file (multipart)
- Whisper → `{ text: "..." }`

**`POST /api/agent`**
- Body: `{ message, baby, momSkills, builderAnswers? }`
- Claude with system prompt + tools
- On tool call: server runs the skill, or drafts and explains a new one, and returns the result to Claude
- Response: `{ reply, skillUsed, mode: "use" | "create" | "draft", results, learnPrompt }`. The full contract is in section 6.

### Skill: `montessori_activity`

```ts
{
  name: "montessori_activity",
  description: "Suggests a few Montessori activities for this baby's age and situation",
  input_schema: {
    type: "object",
    properties: {
      babyAgeMonths: { type: "number" },
      situation: { type: "string" },        // e.g. floor time, fussy, after a nap
      materialsOnHand: { type: "string" },  // optional, what is already in the room
      avoidRecent: { type: "array", items: { type: "string" } }
    },
    required: ["babyAgeMonths"]
  }
}
```

**Handler:** filter a curated list of Montessori-inspired activities (roughly 12–20, grouped by age band and domain: movement, language, practical life, sensorial) by age and by what she has already done. Claude writes the short “how to offer this” in a calm voice. Include 2–3 real pointers (a book, a short article, a known children’s-house idea) so the demo is grounded.

### Skill: `create_skill`

```ts
{
  name: "create_skill",
  description: "Turns a mom's unmet question into a new Claude skill and explains it in plain language",
  input_schema: {
    type: "object",
    properties: {
      topic: { type: "string" },            // e.g. emotional development
      babyAgeMonths: { type: "number" },
      answers: {                            // the 3 interview answers
        type: "object",
        properties: {
          wantHelpWith: { type: "string" },
          recentMoment: { type: "string" },
          answerShouldLookLike: { type: "string" }
        }
      }
    },
    required: ["topic"]
  }
}
```

**Two steps, one Claude call each:**
1. `/api/agent` sees no matching skill and returns `mode: "create"` with the 3 questions. These are fixed text, so this step needs no model work.
2. The UI posts the answers back. Claude returns the skill markdown **and** one plain-language sentence per section, in one JSON response. The UI shows both, she edits the markdown in a text box, and Save writes it to `localStorage`.

The demo topic is emotional development. The new skill needs no dataset. Claude answers from the instructions she approved. The point is that she *made* it, *understands* it, and can run it next.

### Skill: `meal_planner`

Age in months → a simple day of meals or snacks that match typical readiness at that age, plus one note on what to skip. Curated list, not a nutrition plan.

### System prompt (core)
- Calm coach for a new mom who is in the room with her baby
- Listen first; ask at most one clarifying question (usually age, if the profile is empty)
- If a library skill fits, run it
- If none fits, offer to create a skill and then save it
- Activities: 1–3 at a time, each with how to prepare, what to observe, and why it supports development. They should be doable on the floor with what she has, in the minutes she has.
- When explaining a skill, write for someone who has never written a prompt. One sentence per section, no jargon.
- No diagnoses; emergencies → 112 / 116 117
- End with one line she can reuse: how to ask next time, or how to add the next skill

---

## 5. MVP scope (what we build today)

### Must-have (before 15:00 demo recording)
1. Mobile layout, voice button → Whisper → visible transcript
2. Onboarding: baby age, materials at home, minutes available (one screen), plus the “before” confidence tap
3. Claude agent with a real **`montessori_activity`** skill and a small curated list
4. Results: 1–3 activities, how to prepare, what to observe, why it supports development
5. Skill badge (“Skill used: Montessori activity”) — visible for judges
6. **Skill builder** path: “emotional development” → 3 questions → drafted skill with a plain-language line per section → edit → Save → it runs once
7. Safety rules from `skills/_safety.md` appear in every skill, mom-made ones included
8. Skills library screen: seed skill + the one she just created, each tagged `seed` / `mom`
9. “After” confidence tap, shown next to the “before” score
10. One “already did this” so the next suggestion can move on
11. README stays the source of truth: audience, problem, how to run, disclaimer

### Nice-to-have
- `meal_planner` as a third library skill
- TTS read-aloud
- Alexa utterance hitting the same agent
- Free-form multi-turn interview in place of the 3 fixed questions
- Activity history and a simple development timeline across a few ages (“over time”)
- Baby interests in onboarding

### Phase 2 / cut for today (roadmap)
- Baby development planner
- Skills that update themselves as the baby grows
- Multilingual support for newcomer families
- Sharing skills between moms, reviewed by experts
- Accounts and sync
- Live content crawl
- Real Alexa certification (a mocked voice command is enough if the live path slips)

---

## 6. Team split (5 people)

The assignment each person follows is in [worksplit.md](./worksplit.md). This section is the short map.

One branch: `main`. Each person owns the files below and pushes there. Two tracks are fixed and non-negotiable: **Whisper** and **Claude**. One person owns **Montessori research** and does not get pulled into API work.

Agree the contracts in the first sitting, then work in parallel. Research quality must not block the Claude loop, and the mic must not block Claude: a typed message hits the same `/api/agent`.

### Contracts (freeze these first)

**`POST /api/transcribe`** — audio file → `{ text: string }`

**`POST /api/agent`**

```ts
// request
{
  message: string
  baby: { ageMonths: number, materials: string, minutesAvailable: number, completedActivityIds: string[] }
  momSkills: SkillCard[]       // from localStorage
  builderAnswers?: { wantHelpWith: string, recentMoment: string, answerShouldLookLike: string }
}

// response
{
  reply: string
  skillUsed: string          // "montessori_activity" | "create_skill" | a mom skill name
  mode: "use" | "create" | "draft"
  results: Activity[] | BuilderQuestions | SkillDraft
  learnPrompt: string
}
// "create" → results is BuilderQuestions: string[3]
// "draft"  → results is SkillDraft (builderAnswers were sent)
```

**Activity** (the research file and the skill handler use this shape)

```ts
{
  id: string
  title: string
  ageMinMonths: number
  ageMaxMonths: number
  domain: "movement" | "language" | "practical_life" | "sensorial"
  materials: string
  howToOffer: string
  whatToNotice: string
  minutes: number
}
```

**Skill draft** (what the builder returns) and **skill card** (what the library saves and renders)

```ts
// SkillDraft
{
  markdown: string                       // full skill file, frontmatter + 4 sections
  explanation: {                          // one plain sentence each
    whenToUse: string
    instructions: string
    safetyRules: string
    outputFormat: string
  }
}

// SkillCard
{ name: string, description: string, markdown: string, createdBy: "seed" | "mom", createdAt: string }
```

**Confidence** (UI only, `localStorage`): `{ before: 1-5, after: 1-5 | null }`

### Who does what

| Person | Owns | Done when |
|---|---|---|
| **1. Montessori research** | The content, nothing else. Age bands for the first year, 12–20 activities in the Activity shape, 2–3 real source links, the seed skill file, and the mandatory safety rules (supervision, choking, tummy time, safe sleep, no diagnosis). Also an example of a good emotional-development skill, so Claude's draft has something to aim for. Picks the two 5-month activities for the camera. | `data/activities.json`, `skills/montessori-activity-finder.md`, `skills/_safety.md` and `data/emotional-development-example.md` are in the repo, and a teammate can read them without asking. |
| **2. Whisper** (required) | Hold-to-talk, mic permission, `POST /api/transcribe`, transcript on screen, typed fallback that calls the same agent. Web Speech API fallback if Whisper is not working by checkpoint 2. | A phone turns “Help me find the right Montessori activity for my kid.” into text. |
| **3. Claude** (required) | `POST /api/agent`, system prompt, router, tool loop. Tools: `montessori_activity` and `create_skill`. Appends `_safety.md` to every skill. The draft call returns the markdown plus a plain-language explanation as JSON. Starts on 3 hardcoded activities, then swaps in `data/activities.json` without changing the API. | A text message returns a skill badge plus 1–3 activities. The emotional-development message returns `mode: "create"`, and sending the answers returns `mode: "draft"` with an explanation. |
| **4. Mobile UI** | Phone layout: onboarding, before/after confidence taps, talk button, transcript, skill badge, activity cards, disclaimer, learn-prompt line. Builds against fixture JSON until the APIs exist. Owns the demo script and who speaks. | The two demo beats and both confidence scores are visible on a phone-sized screen with fixture data. |
| **5. Skill library + builder** | Baby profile and library in `localStorage`, the 3-question form, the draft view (each section with its explanation underneath), the edit box, Save, “mark done”, and the wiring transcript → agent → cards. | “Emotional development” goes through questions → explained draft → edit → Save, shows up as a `mom` card, and runs once. Marking an activity done changes the next suggestion. |

### Files, so pushes do not collide

| Person | Files |
|---|---|
| Research | `data/activities.json`, `data/emotional-development-example.md`, `skills/montessori-activity-finder.md`, `skills/_safety.md` |
| Whisper | `app/api/transcribe/route.ts`, `components/TalkButton.tsx` |
| Claude | `app/api/agent/route.ts`, `lib/agent.ts`, `lib/skills/montessori.ts`, `lib/skills/create.ts` |
| Mobile UI | `app/page.tsx`, `components/Onboarding.tsx`, `components/ConfidenceCheck.tsx`, `components/ActivityCard.tsx`, `components/Disclaimer.tsx` |
| Skill library + builder | `lib/baby.ts`, `lib/library.ts`, `components/LibraryList.tsx`, `components/SkillBuilder.tsx` |

UI imports the baby and library helpers. Library does not restyle the page. Claude does not edit the research JSON. Research does not edit the agent.

### Nice-to-have, only after that person’s “done”

Meal planner sits with Claude, once both tools work. Alexa sits with Whisper, as a second caller of `/api/agent`. TTS sits with UI. The development planner is phase 2 and has no owner today.

---

## 7. How the day runs

Work in parallel after the contracts are frozen. Meet at three checkpoints, not on a shared document.

| Checkpoint | What must be true | Who speaks |
|---|---|---|
| **1. Loop is real** | Typed text → Claude → fixture activities on the phone. Whisper can still be in progress. Research file can still be in progress. | Claude + UI |
| **2. Voice and content** | Hold-to-talk fills the transcript and that text hits the agent. `data/activities.json` is loaded; a 5-month age returns the camera activities. | Whisper + Research + Claude |
| **3. Second beat** | “Help me figure out emotional development” → 3 questions → explained draft → Save → library card that runs once. Before/after confidence shows. One activity can be marked done. Disclaimer is on screen. Full demo once, on a phone. | Library + UI, everyone else watches |

Then record the 2-minute demo and submit. If checkpoint 3 slips, record checkpoint 2: voice → Montessori skill → activities. The library card is the second sentence of the pitch, not a reason to skip the recording. If only the edit box slips, ship the explained draft with Save and no edit box. The explanation is the part that teaches.

---

## 8. Demo script (2 minutes)

1. Set the scene: at home, baby awake, “I have 20 minutes and no idea what to do.” (5s)
2. Onboarding: 5 months, a scarf and a wooden spoon at home, 20 minutes. Confidence with AI: **2/5**.
3. Hold to talk: *“Help me find the right Montessori activity for my kid.”*
4. Skill badge appears. Show 2 activities: how to prepare, what to observe, why it helps.
5. Mark one done — the next idea would move on.
6. Second utterance: *“Help me figure out emotional development for my kid.”*
7. Answer the 3 questions fast. The draft appears with a plain-language line under each section. Point at **Safety rules**.
8. Edit one word, Save. The skill lands in the library as `mom` and runs once.  
   *“She isn’t only using AI. She understands it, and she’s adding the next skill herself.”*
9. Confidence after: **4/5**, shown next to the 2.
10. Optional: meal planner or an Alexa-shaped command as a one-liner, if it already works.

---

## 9. Judging fit

| Criterion | How we hit it |
|---|---|
| Impact (40) | A daily question for new moms, answered with something she can do on the floor in the next five minutes |
| Working demo (20) | Voice → Montessori skill → activity, then voice → a new skill in the library, in one take |
| Technical quality (20) | Whisper + Claude tool use + a real skill store, mobile-first |
| Creativity (20) | The product is a skill library she grows and understands, not another chat window. The before/after confidence score shows she learned something. |

### Challenge fit (official)

> Build a working prototype that helps real people **learn or use AI**.  
> Audience example: parents / newcomers / non-tech workers…

SkillMama does both. She **uses** a Montessori skill hands-free. She **learns** by creating the next Claude skill when her question does not have one yet, reading what each part of it does, and editing it herself. That covers context, instructions, safety rules, and output format, all learned on something she cares about.

---

## 10. Safety disclaimer (keep in product + README)

SkillMama is for inspiration and learning. It is **not** medical, nutritional, or developmental advice and does **not** replace pediatricians, midwives, or emergency services. Activity ideas are invitations to play, not an assessment of the child. Every skill, including ones moms create, carries the same safety rules (`skills/_safety.md`).  
If you think it might be an emergency: call **112** (EU) or **116 117** (Germany, non-emergency medical).

---

## Getting started (for the team)

```bash
git clone https://github.com/younaorg/SkillMama.git
cd SkillMama
npm install
npm run dev
```

Open the app, tap confidence **2**, then **Start**. The two lines under the talk button run the whole demo with no API keys: a Montessori activity, then building an emotional-development skill. Hold to talk uses the browser’s speech recognition when the browser has it. Whisper and Claude can replace `/api/transcribe` and `/api/agent` later. Until they do, the demo still finishes.

```bash
cp .env.example .env   # add ANTHROPIC_API_KEY + OPENAI_API_KEY when those routes are live
```

Never commit API keys.

### Suggested env

```bash
ANTHROPIC_API_KEY=
OPENAI_API_KEY=
```

---

Have fun. Build something she can use with the baby on the floor.
