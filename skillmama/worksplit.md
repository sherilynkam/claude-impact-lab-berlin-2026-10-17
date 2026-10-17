# Worksplit — SkillMama

Five people, one branch (`main`), one demo goal.

A mom is at home and does not know what to do with her baby. She speaks. The app answers with a concrete Montessori activity. When her question has no skill yet, the app asks her 3 questions, drafts a new Claude skill, explains each part of it in plain language, and lets her edit and save it to her library.

The point is that she **learns AI** while using it: saved instructions, good context, safety rules, output format. A 1–5 confidence tap at the start and at the end shows that progress.

Two things have to actually work today: **Whisper** (speech becomes text) and **Claude** (Claude picks a skill and runs it). One person does **Montessori research** only.

---

## The two sentences that have to work at the end

Sentence 1, use a skill:

> “Help me find the right Montessori activity for my kid.”

The app shows a badge **Skill: Montessori activity** and 2–3 activities for the baby’s age. On camera the baby is **5 months**.

Sentence 2, create a skill:

> “Help me figure out emotional development for my kid.”

The app asks 3 short questions. After she answers, it shows the drafted skill with one plain-language sentence under each section. She can change the text and tap **Save**. A card labeled **added by you** appears in the library and the skill runs once.

The same requests in German have to hit the same skills, so a German sentence still works on the day:

- “Hilf mir, die richtige Montessori-Aktivität für mein Kind zu finden.”
- “Hilf mir, die emotionale Entwicklung meines Kindes zu verstehen.”

---

## Before you start (once, together, short)

1. Everyone works on `main`. Run `git pull` before your first own commit.
2. Person 3 (Claude) creates the empty Next.js project and pushes it before anyone else adds files: App Router, TypeScript, folders `app/api`, `components`, `lib/skills`, `data`, `skills`. File `.env.example` with empty lines `ANTHROPIC_API_KEY=` and `OPENAI_API_KEY=`. `.env` is in `.gitignore`. Keys are never committed.
3. Person 3 writes in the chat: “Scaffold is up.” Everyone else pulls, then each person adds only their own files.
4. The contracts below keep these names. UI, Whisper, and Claude share them as written.

### Contract: transcript

`POST /api/transcribe` receives an audio file and answers:

```json
{ "text": "Help me find the right Montessori activity for my kid." }
```

### Contract: agent

`POST /api/agent` receives:

```json
{
  "message": "Help me find the right Montessori activity for my kid.",
  "baby": {
    "ageMonths": 5,
    "materials": "a scarf, a wooden spoon",
    "minutesAvailable": 20,
    "completedActivityIds": []
  },
  "momSkills": [],
  "builderAnswers": null
}
```

`momSkills` is the list of skills she saved, read from `localStorage` (see the skill card below). `builderAnswers` is only filled when she has just answered the 3 builder questions:

```json
{
  "wantHelpWith": "Understanding why she cries when I leave",
  "recentMoment": "This morning I went to the kitchen and she cried right away.",
  "answerShouldLookLike": "One thing I can say and one thing I can do."
}
```

and answers:

```json
{
  "reply": "One short sentence in a calm voice.",
  "skillUsed": "montessori_activity",
  "mode": "use",
  "results": [],
  "learnPrompt": "Next time you can say: …"
}
```

`mode` is one of three values:

| `mode` | When | `results` is |
|---|---|---|
| `"use"` | An existing skill ran (seed or mom-made) | A list of activities, or for a mom-made skill `[]` with the answer in `reply` |
| `"create"` | No skill fits; the builder starts | The 3 builder questions, as a list of 3 strings |
| `"draft"` | `builderAnswers` was sent | One skill draft (below) |

The server saves nothing. The browser saves the skill when she taps **Save**.

### Contract: skill draft

```json
{
  "markdown": "---\nname: emotional-development\ndescription: …\nage_range_months: [0, 12]\ncreated_by: mom\ncreated_at: 2026-10-17\n---\n## When to use\n…\n## Instructions\n…\n## Safety rules\n…\n## Output format\n…",
  "explanation": {
    "whenToUse": "This tells Claude which of your questions this skill is for.",
    "instructions": "This is what Claude should do, step by step, like a note to a babysitter.",
    "safetyRules": "Things Claude must always do or never say, even if you ask.",
    "outputFormat": "What the answer should look like on your screen."
  }
}
```

### Contract: one activity

This is one entry. Research and Claude use these fields exactly.

```json
{
  "id": "grasp-the-ring-5m",
  "title": "Grasp the ring",
  "ageMinMonths": 4,
  "ageMaxMonths": 6,
  "domain": "movement",
  "materials": "A light wooden ring or a clean napkin ring, and a blanket on the floor.",
  "howToOffer": "Lay your baby on their back on the blanket. Hold the ring within reach, slowly, at hand height. Wait. When the hand touches it, let your baby hold it.",
  "whatToNotice": "The gaze stays on the ring. The hand opens and closes. Sometimes nothing happens for a while. The waiting is part of it.",
  "minutes": 5,
  "source": "https://example.com — a real URL you opened yourself"
}
```

`domain` is exactly one of: `movement`, `language`, `practical_life`, `sensorial`.

### Contract: one skill card

This is what the library keeps and shows. `markdown` is the full skill file, the same shape as the draft.

```json
{
  "name": "emotional-development",
  "description": "Helps a mom sort out a feelings situation with her baby and find a next step in the day.",
  "markdown": "---\nname: emotional-development\n…",
  "createdBy": "mom",
  "createdAt": "2026-10-17"
}
```

`createdBy` is `"seed"` for skills shipped in the repo and `"mom"` for skills she saved.

### Contract: confidence

UI only, in `localStorage`, nothing goes to the server:

```json
{ "before": 2, "after": 4 }
```

`after` is `null` until she answers the second time.

### Who touches which files

| Person | Files |
|---|---|
| 1 Research | `data/activities.json`, `skills/montessori-activity-finder.md`, `skills/_safety.md`, `data/emotional-development-example.md` |
| 2 Whisper | `app/api/transcribe/route.ts`, `components/TalkButton.tsx` |
| 3 Claude | `app/api/agent/route.ts`, `lib/agent.ts`, `lib/skills/montessori.ts`, `lib/skills/create.ts` |
| 4 Mobile UI | `app/page.tsx`, `components/Onboarding.tsx`, `components/ConfidenceCheck.tsx`, `components/ActivityCard.tsx`, `components/Disclaimer.tsx` |
| 5 Library + builder | `lib/baby.ts`, `lib/library.ts`, `components/LibraryList.tsx`, `components/SkillBuilder.tsx` |

The UI imports baby and library and places the builder. The library leaves the look of the page alone. Claude leaves the research files alone. Research leaves the agent alone.

---

## Role 1 — Montessori research

This is a content role. You write what the mom later reads on the screen. You build no API and no layout.

### What you hand over

The four files are already in the repo. Open `data/README.md`, then edit them in place:

1. `data/activities.json` — 12 to 20 activities for the first year of life. One sample activity is in the file. Duplicate that block for each new activity, then replace the sample with a sourced one.
2. `skills/montessori-activity-finder.md` — the seed skill, in the skill format below.
3. `skills/_safety.md` — the safety rules the server adds to **every** skill, including the ones moms create.
4. `data/emotional-development-example.md` — a good example of the skill a mom might build. Claude uses it as a model when drafting hers.

Leave every other file alone.

You also tell Person 3 which two activities should be on camera at **5 months**.

### How Montessori works in this app

Here, Montessori means a way of offering something to the baby: prepared, short, with things from the home, in quiet, with room for the baby to respond. The mom sets up a small situation and watches what the baby does with it.

Write invitations to do something. Leave out developmental tests and judgments about the mom.

Four areas, in everyday language:

| `domain` | What that means for the mom |
|---|---|
| `movement` | Moving, grasping, rolling, lying, later pulling up. The body does the work, a battery toy stays in the cupboard. |
| `language` | Voice, pause, names of things, listening. Talking counts even when the baby does not answer yet. |
| `practical_life` | Something real from the day: touching a cloth, holding a cup, later carrying or wiping. |
| `sensorial` | Seeing, hearing, touching. One object, one contrast, one sound. One thing at a time. |

Age bands, so the list is specific:

| Band | Months | What the offers are roughly for |
|---|---|---|
| 1 | 0–3 | A face, a voice, a short look at something calm, lying on a person |
| 2 | 4–6 | Grasping, following something, an object in the hand, a conversation with pauses |
| 3 | 6–9 | Sitting with support, passing a thing from one hand to the other, a basket of real objects, babbling |
| 4 | 9–12 | Pulling up on sturdy furniture, putting things in a container and taking them out, pointing and naming |

At least three activities per band. At least two activities whose range includes **5 months** (`ageMinMonths` ≤ 5 and `ageMaxMonths` ≥ 5). Those two are for the camera: they work in an ordinary room, with nothing special to buy.

### How you write one activity

Each activity answers five questions, in this order:

1. **What is it called?** Short enough to read on a card.
2. **For which age?** A range in months, specific enough to place in a band.
3. **Which area?** One of the four values above.
4. **What is already at home?** A blanket, a cloth, a cup, a spoon, a voice. Expensive material is never a requirement.
5. **What does the mom do, in two to four sentences?** Then: what she can notice. Then: how many minutes. Then: the source.

Tone: calm, concrete, second person (“Lay …”, “Wait …”). One sentence says why this fits this age, and it lives in `whatToNotice` or at the end of `howToOffer`.

### What belongs in the text

Every text includes: a place (floor, arms, lap), an object or the voice, something the mom does, a moment of waiting, and something she can see or hear.

Leave these out, even when a source uses them:

- “Your baby should already …”
- Diagnoses, attachment labels, percentages, “developmental delay”
- Medical claims, sleep programs, promises (“this will calm your baby”)
- A verdict on the mom (“if you don’t do this”)

When a source talks like that, keep the gesture (offering the ring) and leave the verdict out.

### Sources

Every activity has a `source` field with an address you opened yourself, plus the name of the page or book. Places you can check: pages of the Association Montessori Internationale, a chapter of *The Montessori Baby* (Davies / Uzodike), or *Montessori from the Start* (Lillard). A Berlin family-center page is just as good when it describes a concrete activity.

When a page has no clear activity, leave it out. Twelve sourced entries are the goal when twenty would mean guessing.

### The file `activities.json`

The file is a list. Commas between entries, none after the last. Quotes around every text. `minutes` and the age numbers have no quotes.

```json
[
  {
    "id": "grasp-the-ring-5m",
    "title": "Grasp the ring",
    "ageMinMonths": 4,
    "ageMaxMonths": 6,
    "domain": "movement",
    "materials": "A light wooden ring or a clean napkin ring, and a blanket on the floor.",
    "howToOffer": "Lay your baby on their back on the blanket. Hold the ring within reach, slowly, at hand height. Wait. When the hand touches it, let your baby hold it. This fits around 5 months, when the hands start to reach on purpose.",
    "whatToNotice": "The gaze stays on the ring. The hand opens and closes. A pause is part of the activity.",
    "minutes": 5,
    "source": "REPLACE: full URL of the page, or book plus chapter, that you opened"
  }
]
```

The `id` is lowercase, with hyphens, no spaces, and unique in the file. Example: `conversation-with-pauses-5m`.

If JSON is unfamiliar: write the activities first as a table with the columns `id`, `title`, `ageMinMonths`, `ageMaxMonths`, `domain`, `materials`, `howToOffer`, `whatToNotice`, `minutes`, `source`. Person 3 turns the table into the file if the commas get in the way. The wording stays yours. You can check a JSON file at [jsonlint.com](https://jsonlint.com).

### The skill format

Every skill is a short markdown file: a header between `---` lines, then four sections. Moms read these files in the app, so write them in everyday words.

```markdown
---
name: montessori-activity-finder
description: Suggests age-appropriate Montessori activities using materials at home.
age_range_months: [0, 12]
created_by: seed
created_at: 2026-10-17
---
## When to use
## Instructions
## Safety rules
## Output format
```

`skills/montessori-activity-finder.md` fills those four sections for the activity skill. The output format is 1–3 activities, each with how to prepare, what to observe, and why it supports development.

### The file `_safety.md`

A short list, one rule per line. The server appends it under `## Safety rules` in every skill, so a mom cannot delete it by editing her skill. At least:

- Age-appropriate activities only, always with a supervision note.
- Flag choking hazards, tummy-time limits, and safe sleep where they apply.
- No diagnosis. Concerns about milestones or health always point to the pediatrician.
- Never: “Your baby is insecurely attached.”, “This is the mom’s fault.”, “This is a disorder.”, “This replaces a midwife or a doctor.”
- Emergency: 112. Non-emergency medical help in Germany: 116 117.

### The file `emotional-development-example.md`

This is not shown as-is. It is the example Claude's draft aims for in demo sentence 2. Use the skill format with `created_by: mom`. Put three everyday situations into **Instructions**. Each one has a title, a sentence the mom can say out loud, and a next step that works inside the apartment:

| Situation | She can say | Next step |
|---|---|---|
| Unsettled when you step out of the room | “I’m in the kitchen, I’m coming back.” | Keep talking from the next room for a short moment, then come back where the baby can see you. |
| Overwhelmed after a lot of visitors | “We’re going to make it quieter now.” | Go into a quiet room, lower the light, and hold your baby with no extra toy until the breathing slows. |
| Crying, and you don’t know why | “I’m here, I’m going to see what you need.” | Check one thing at a time: hunger, a wet diaper, tiredness, too much going on around you. Change one thing, then wait a minute. |

Output format: one sentence she can say, one thing she can do, and when to call the pediatrician instead.

### Done means

- All four files are on `main`.
- `_safety.md` covers supervision, choking, tummy time, safe sleep, no diagnosis, and the emergency numbers.
- 12–20 activities, at least three in every band, two of them fit 5 months and need nothing special to buy.
- Every activity has a source you opened.
- You have told Person 3 the two camera `id`s.
- You have read the texts out loud once: a mom with a baby in her arms understands every sentence. The word Montessori can stay in the app’s name. The activity text stays in everyday words.

---

## Role 2 — Whisper

You turn speech into text. The voice demo depends on you. The agent’s answer is someone else’s job.

### What you hand over

- `app/api/transcribe/route.ts` — receives the recording and sends it to OpenAI Whisper.
- `components/TalkButton.tsx` — the button on the phone: hold, speak, let go.
- After that, the recognized sentence is on screen, before Claude answers.

### The path, in plain language

The mom holds the button, speaks, lets go. The phone has an audio file. Your server sends that file to Whisper. Whisper sends a sentence back. That sentence appears in the transcript and is passed on to the agent.

Until the microphone works, the mom types the same sentence into a field. That field sends the text to the same agent as the voice. The field is part of your task, so Person 3 and Person 4 can work before the mic is ready.

### How you build it

1. Key only in `.env`: `OPENAI_API_KEY`. `.env.example` has the name and an empty value.
2. Route `POST`. The request is `multipart/form-data` with a field `audio`.
3. The server checks: a file is there, the file has content, the file is at most 10 MB. Otherwise status `400` with `{ "error": "No recording came through." }`.
4. Call the OpenAI audio API, model `whisper-1`. Leave the language unset, so English and German both arrive. Response format: text.
5. Empty text from Whisper becomes status `502` with `{ "error": "I didn’t catch that. Hold the button and say it once more." }`.
6. Success: status `200` and `{ "text": "..." }`. The body has the text and nothing else: no skill, no activity.

### The button

- A large button, at least 72 pixels tall. Resting label: **Hold to talk**.
- `pointerdown` starts `MediaRecorder`. `pointerup` and `pointerleave` stop it. The button then works with a finger and with a mouse.
- While recording, the label is **Listening**.
- After that, until the transcript is back: **Writing it down**.
- The browser asks for the microphone. If the person says no, this line sits under the button: **You can type the sentence below.** The type field stays visible.
- Recording format: whatever the browser offers (`audio/webm` or, on some iPhones, `audio/mp4`). Put that MIME type on the file you send to the route. Whisper needs a matching extension (`.webm` or `.mp4`).
- After the transcript, call the function you receive as a prop: `onTranscript(text: string)`. Person 5 connects that text to the rest. Your component calls `/api/agent` zero times.

Type field: one input plus a button **Send sentence**. Same `onTranscript`.

### Fallback if Whisper is not working by checkpoint 2

Switch `TalkButton` to the browser’s Web Speech API (`webkitSpeechRecognition`). It needs no key or server route and works in Chrome and Safari. It still calls the same `onTranscript(text)`, so nothing else changes. That takes about 10 minutes, and the demo keeps its voice.

### Done means

On a phone on the same Wi-Fi:

1. Hold the button, say English sentence 1, let go.
2. The sentence is readable in the transcript, small Whisper slips included.
3. With the microphone blocked: the hint and the type field are there, and English sentence 1 can be sent.
4. Server without a key: a readable error, and the page stays up.

---

## Role 3 — Claude

You are the required integration. A sentence comes in. Claude decides which skill fits, the server runs the skill, Claude writes the answer the mom reads.

### What you hand over

- `lib/agent.ts` — the tool loop and the system prompt.
- `lib/skills/montessori.ts` — finds activities in `data/activities.json`.
- `lib/skills/create.ts` — the 3 builder questions and the draft-and-explain call.
- `app/api/agent/route.ts` — the HTTP route, thin, it only calls `runAgent`.

The server is stateless. It never stores a skill. The browser sends her saved skills in `momSkills`, and Person 5 saves new ones in `localStorage`.

### The loop, in plain language

Claude receives the mom’s sentence, the baby profile, and the list of skills: the seed skill from `skills/` plus her `momSkills`. Claude may call a skill the way you would ask a teammate to look something up. The server does the real work (filter the list, or start the builder) and hands the result back to Claude. Before any skill’s markdown goes to Claude, the server appends `skills/_safety.md` under `## Safety rules`. Claude writes the sentences the mom reads from that result. The activities themselves come from the list. A new activity that is missing from the file stays out of the answer.

### Model and key

`ANTHROPIC_API_KEY` from `.env`. The model name is one constant `CLAUDE_MODEL` at the top of `lib/agent.ts`, so it can be swapped in one place. Use the current Claude Sonnet model from today’s Anthropic docs.

### System prompt, contents

The prompt is one template in `lib/agent.ts` and tells Claude:

- You are talking to a mom who is in the room with her baby. Short sentences, calm, concrete.
- Ask at most one follow-up. The only follow-up you need is the age, and only when `baby.ageMonths` is missing or 0.
- When the question is about what to do with the baby, Montessori, play, or keeping the baby busy: call `montessori_activity`.
- When one of her saved skills (`momSkills`) fits, run it: follow its markdown and answer in `reply`, with `skillUsed` equal to its `name`.
- When the question is a topic that has no skill yet, especially feelings and emotional development: call `create_skill`.
- Activities: use what she has at home (`baby.materials`) and fit `baby.minutesAvailable`. Each one says how to prepare, what to observe, and why it supports development.
- When explaining a skill, write for someone who has never written a prompt. One sentence per section, no jargon.
- Stay inside the tool result for activities. Offer a diagnosis zero times.
- Close with one sentence she can say next time. That sentence is the field `learnPrompt`.
- Emergency: if the message describes a medical emergency, point to 112 and 116 117 and call no skill.

### Tool `montessori_activity`

Parameters Claude sends:

```ts
{
  babyAgeMonths: number
  situation?: string
  avoidIds?: string[]
}
```

Your function `findActivities` in `lib/skills/montessori.ts`:

1. Reads `data/activities.json`. When the file is missing or empty, use three hardcoded sample activities for 4–6 months, so the loop runs before research lands. As soon as the file has at least one activity, the samples stay unused.
2. Keeps entries where `ageMinMonths` ≤ age and `ageMaxMonths` ≥ age.
3. Drops entries whose `id` is in `baby.completedActivityIds` or in `avoidIds`.
4. Returns at most 3. When fewer than 2 remain, add the nearest entries from the closest age band, and set `"nearbyAge": true` on those entries so the UI can show a hint.
5. Order: exact age first, then `movement` and `language` before the others, so the camera at 5 months can show the research favorites. Person 1 gives you two `id`s. Those two live in a short list `CAMERA_IDS` at the top of the file and come first at age 5 when they pass the filters.

What you return to Claude is this list, ready for the reply.

### Tool `create_skill`

Parameters:

```ts
{
  topic: string
  babyAgeMonths?: number
}
```

Two steps, one request each. Both live in `lib/skills/create.ts`.

**Step 1: questions.** The tool returns `mode: "create"`, `skillUsed: "create_skill"`, and `results` set to these 3 fixed strings. No extra model call.

1. “What do you want help with?”
2. “Describe a recent moment when you needed it.”
3. “What should a good answer look like?”

**Step 2: draft.** When the request has `builderAnswers`, skip the router and call Claude once with: the topic, the baby profile, the 3 answers, the skill format, `data/emotional-development-example.md` as the example to aim for, and `skills/_safety.md`. Ask for JSON in the skill draft shape: `markdown` plus one plain-language `explanation` sentence per section. `name` in the frontmatter is the topic, lowercase, with hyphens. `created_by` is `mom`. Response: `mode: "draft"`, `skillUsed: "create_skill"`, `results` is the draft object.

If the JSON does not parse, try once more. If it fails again, return 502 with `{ "error": "The skill didn’t come out right. Tap Draft again." }`.

The route saves nothing. Person 5 saves on **Save**.

### What the route returns

Always this JSON, status 200, including when Claude only asks a follow-up. Then `results` is an empty array, `skillUsed` is an empty string, `mode` is `"use"`, and `reply` contains the one question about age.

Failure (no key, Claude unreachable): status 502 and `{ "error": "The answer isn’t coming through right now. You can send the sentence again in a moment." }`.

The route writes no HTML. The page is Person 4’s file.

### Done means

With `curl` or a small REST client, no microphone:

1. Sentence 1 with `ageMonths: 5` returns `skillUsed: "montessori_activity"`, `mode: "use"`, and 2 or 3 activities whose range includes 5.
2. The same request with one of those `id`s in `completedActivityIds` leaves that activity out.
3. Sentence 2 returns `mode: "create"` and the 3 questions.
4. Sentence 2 sent again with `builderAnswers` returns `mode: "draft"`. The `markdown` has all four sections, the safety rules from `_safety.md` are in it, and `explanation` has four plain sentences.
5. A request whose `momSkills` holds that saved skill, with a feelings question, returns `skillUsed: "emotional-development"` and `mode: "use"`.
6. `ageMonths: 0` and an unclear sentence return one follow-up and an empty `results`.
7. A sentence like “My baby is not breathing” returns the pointer to 112 and runs no tool.

---

## Role 4 — Mobile UI

You build what the mom sees on the phone. First with hardcoded sample data, so you can work before Whisper and Claude are ready. Person 5 connects the real answers afterward.

### What you hand over

One page that works top to bottom on a narrow phone (375 pixels wide):

1. **Onboarding**, shown once before the main page: **Age in months** (prefilled 5), **What do you have at home?** (one text line), **How many minutes do you have?** (chips 5 / 10 / 20), and **How confident are you using AI?** (five large taps, 1–5). Button **Start**.
2. At the top, the name **SkillMama** and the line **What should I do with my baby?**
3. Person 2’s talk button, and the transcript under it.
4. A badge, for example **Skill: Montessori activity**.
5. One to three activity cards, or Person 5’s `SkillBuilder` when `mode` is `"create"` or `"draft"`.
6. Under the answer, a line **Next time you can say.**
7. Person 5’s `LibraryList`: **Your skills**.
8. After her first saved skill: the confidence question again, then **Before 2 → Now 4** side by side.
9. At the bottom, the disclaimer, visible the whole time, including during a recording.

Files: `app/page.tsx`, `components/Onboarding.tsx`, `components/ConfidenceCheck.tsx`, `components/ActivityCard.tsx`, `components/Disclaimer.tsx`. The talk button is Person 2’s file. The library list and the skill builder are Person 5’s. You place all three on the page.

### The page, in words

One column, light background, large type, plenty of space. The mom holds the phone in one hand. The talk button is the largest button on the page. Cards show the title, the duration, the area in one English word, then materials (“How to prepare”), then “How to offer it”, then “What you might notice”, then one line “Why it helps”. A text button on the card says **We did this**.

English words for the areas: Movement, Language, Practical life, Senses.

When an activity has `nearbyAge`, the card says in small type: **Close to this age, because the matching ones are already done.**

The badge:

| `skillUsed` | Badge text |
|---|---|
| `montessori_activity` | Skill: Montessori activity |
| `create_skill` | Building a new skill |
| a mom-made skill name | Your skill: plus its name |
| empty, while Claude is working | Thinking |
| empty, at the start | no badge yet |

The badge is the first AI lesson: it shows that Claude followed saved instructions. Keep it large.

The library starts with one card: **Montessori activity**, subtitle **Activities for this age**, label **here from the start**. After sentence 2 a new card appears, labeled **added by you**.

### States you build, all of them

| State | What the mom sees |
|---|---|
| First open | Onboarding with the before-confidence taps. |
| Start | Button, one skill card in the list, disclaimer. The activity area is empty. |
| She is holding the button | The `TalkButton` label, the rest stays. |
| Transcript is in, answer is still out | The spoken sentence is visible. Under the card placeholders: **Looking for an activity.** Three gray blocks the size of a card. |
| Answer `use` | Badge, 2–3 cards, learn line. |
| Answer `create` / `draft` | Badge “Building a new skill”, and `SkillBuilder` fills the activity area. |
| Skill saved | The new card at the top of the library, then the after-confidence question, then before → now. |
| Error | The API’s `error` sentence, on the page, as part of the layout. The button works again. |
| Nothing matched | The `reply` text, with the activity area left clearly empty. |

Put sample data in `app/page.tsx` as a constant `FIXTURE`: one activity, one library card, and one skill draft, so the “answer use”, “draft”, and “library” states are visible without a server. Once Person 5 feeds in real data, `FIXTURE` stays unused. Person 5 may delete it. The page stays your file. Agree before you both push that file in the same minute.

### Disclaimer, this wording, always at the bottom

> SkillMama is for inspiration and learning. It does not replace a midwife, a doctor, or emergency services. Activities are invitations to play, and they are not an assessment of your baby. In an emergency: 112. Non-emergency medical help in Germany: 116 117.

### Look, briefly

The system font is enough. One calm background. The activity card is a bordered block, the talk button is full width. Padding at the bottom keeps the disclaimer clear of the browser bar: at least 32 pixels.

### Done means

At 375 pixels wide, with `FIXTURE`, no API:

- Onboarding fills the baby profile and the before score in under 20 seconds.
- Sentence 1 can sit in the transcript with two readable activities under it.
- Before → now confidence is readable in one glance.
- **We did this** can be pressed (Person 5 connects the effect; for you the button calls `onDone(id)`).
- The library shows the starter card and, in a second state you can demo, a card “Emotional development”.
- On a tall phone the disclaimer is on screen with the content, or it sits directly under the content. It is part of the page, always reachable by scrolling the page itself.

---

## Role 5 — Skill library, skill builder, and wiring

You turn the pieces into one flow. The mom has a baby profile, a list of skills, and a memory of what you already did together. Sentence 2 walks her through building a skill she understands, and the card is still there the next time she looks.

The builder is where she learns the most: good context makes answers better, a skill has instructions, safety rules, and an output format, and she owns what she saved.

### What you hand over

- `lib/baby.ts` — baby profile and finished activities.
- `lib/library.ts` — read skills and save a new skill.
- `components/SkillBuilder.tsx` — the 3 questions, the explained draft, the edit box, **Save**.
- `components/LibraryList.tsx` — **Your skills**, with a tap to read a skill’s text.
- The wiring in `app/page.tsx`, agreed with Person 4: the transcript goes to the agent, the answer fills cards, badge, builder, and library.

There is one demo baby and no login. Everything lives in the browser’s `localStorage`: baby, saved skills, confidence. The server stays stateless, so restarts and a deploy lose nothing. Wrap every `localStorage` read and write in `try/catch` and fall back to memory, so a private window still runs the demo.

### Baby

```ts
type Baby = {
  ageMonths: number
  materials: string
  minutesAvailable: number
  completedActivityIds: string[]
}
```

- Start value: `{ ageMonths: 5, materials: "", minutesAvailable: 20, completedActivityIds: [] }`. Onboarding fills it.
- `setAge(months)` sets a whole number from 0 to 24. Any other value is refused, and the UI shows: **Enter the age in months, for example 5.**
- `markDone(id)` appends the `id`. A second copy of the same `id` is skipped.
- `getBaby()` is the object sent to `/api/agent`.

The age on the page and this object are the same. When the mom changes the number, the next request goes out with the new number.

### Library

Starter list, fixed in code, even while the research files are still empty:

```ts
{
  name: "montessori-activity-finder",
  description: "Finds a short activity for your baby’s age.",
  markdown: "",              // filled from skills/montessori-activity-finder.md once it lands
  createdBy: "seed",
  createdAt: "2026-10-17"
}
```

`saveSkill(card)` appends a card to `localStorage`. A second card with the same `name` replaces the first, so saying sentence 2 twice leaves one card. `listSkills()` returns the seed card first, then hers. `momSkills()` returns only hers. That list goes to the agent.

### The skill builder

`SkillBuilder` shows one of two steps, depending on `mode`:

1. **`create`:** the 3 questions from `results`, each with a text box, and a button **Draft my skill**. That sends the same sentence again with `builderAnswers`.
2. **`draft`:** the four sections of `results.markdown`. Under each section heading goes its `explanation` sentence in a calm tint, e.g. *Safety rules — things Claude must always do or never say, even if you ask.* Below that, the full markdown in an editable text box, then **Save**.

**Save** builds a skill card from the edited markdown (`name` and `description` from the frontmatter, `createdBy: "mom"`, today’s date), calls `saveSkill`, then sends one sample question to the agent so the new skill runs once on screen. If she deleted the safety section while editing, that is fine: the server appends `_safety.md` anyway.

### Wiring on the page

When `TalkButton` delivers text, or the type field is submitted:

1. Show the transcript.
2. Switch to the “looking” state.
3. `POST /api/agent` with `{ message: text, baby: getBaby(), momSkills: momSkills() }`.
4. On `mode: "use"`, show `results` as activity cards (or `reply` for a mom-made skill), set the badge, put `learnPrompt` under the cards.
5. On `mode: "create"` or `"draft"`, show `SkillBuilder`. After **Save**, reload `listSkills()` and tell Person 4’s page to show the after-confidence question.
6. On `error`, show the error text and enable the button again.
7. **We did this** calls `markDone(id)` and sends the same sentence to the agent again, so the next activity can appear. The finished card stays briefly with the label **Done**, then sits under the new ones.

### Done means

One run on the phone, server up, keys set:

1. Age 5, sentence 1 spoken or typed, two activities from the research file, badge visible.
2. **We did this** on the first card, and the next answer leaves that `id` out.
3. Sentence 2 → 3 questions → draft with an explanation under each section → change one word → **Save**.
4. The library shows **emotional-development** with **added by you**, the Montessori card is still there, and the new skill has run once.
5. Reload the page, or restart the server: the new card is still there.

---

## Three checkpoints

Between them, each person works in their own files. At each checkpoint you look at the running app, on a phone or in a narrow browser window.

| Checkpoint | What has to be true | Who shows it |
|---|---|---|
| 1. The loop | A typed sentence 1 reaches Claude and the page shows activities, using the three samples if needed. | Person 3 and Person 4 |
| 2. Voice and content | Holding the button produces a transcript, and that transcript produces the 5-month activities from `activities.json`. | Person 2, Person 1, Person 3 |
| 3. The second sentence | Sentence 2 → 3 questions → explained draft → **Save** → library card that runs once. Before → now confidence shows. One activity can be marked done. The disclaimer is readable. Run it once, then record. | Person 5 and Person 4, everyone else watches |

If checkpoint 3 slips, record checkpoint 2: voice, Montessori skill, activities. The library card is the second sentence of the pitch. The recording still happens. If only the edit box slips, ship the explained draft with **Save** and no edit box. The explanation is the part that teaches.

Meal planner, Alexa, and read-aloud get an owner after that person’s own “Done means” is true. The week-by-week development planner has no owner today.

---

## Record when this list is true

- [ ] Onboarding: 5 months, materials, 20 minutes, confidence **2**
- [ ] Phone, sentence 1, transcript visible
- [ ] Badge **Skill: Montessori activity**
- [ ] Two activities, age 5 months, copy from Person 1
- [ ] One of them marked done, and the suggestion changes
- [ ] Sentence 2, 3 questions answered, explained draft on screen with **Safety rules** visible
- [ ] Save, new card **added by you** in the library, and it runs once
- [ ] Confidence after, **Before 2 → Now 4** in frame
- [ ] Disclaimer in frame
- [ ] No API key on screen and none in the git log
