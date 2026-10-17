# data — start here if you are doing Montessori research

You edit four files. The app and Claude read them as they are. Field names stay as they are. The sentences the mom reads are in everyday English.

```
data/
  README.md                              ← you are here
  activities.json                        ← you fill this (12–20 activities)
  emotional-development-example.md       ← you edit this (the example skill)

skills/
  montessori-activity-finder.md          ← you edit this (the skill shipped with the app)
  _safety.md                             ← you edit this (rules added to every skill)
```

Everything else in the repo belongs to someone else. The screen, Whisper, and Claude are already stubbed so you can see the shape. You do not need to open those files.

Full instructions are in `worksplit.md` under Role 1. This page is the map of the files.

## activities.json

A list. Each object is one activity. Copy the first object, paste it below, change it, and keep the comma rules: a comma between objects, no comma after the last one.

| Field | What you write |
|---|---|
| `id` | Lowercase, hyphens, unique. Example: `grasp-the-ring-5m` |
| `title` | Short name for the card |
| `ageMinMonths` / `ageMaxMonths` | Whole numbers. A 5-month baby needs `ageMinMonths` ≤ 5 and `ageMaxMonths` ≥ 5 |
| `domain` | One of `movement`, `language`, `practical_life`, `sensorial` |
| `materials` | What is already at home |
| `howToOffer` | What the mom does, in two to four sentences |
| `whatToNotice` | What she can see or hear, including why this age fits |
| `minutes` | A number, no quotes |
| `source` | A page or book you actually opened. Replace the sample source before the demo |

Counts: at least three activities in each band (0–3, 4–6, 6–9, 9–12 months). At least two of them include 5 months, with nothing special to buy. Tell Person 3 those two `id`s. They go on camera.

Check the file at [jsonlint.com](https://jsonlint.com) before you push.

## The skill files

A skill is a short markdown note with a header between two `---` lines, then four sections:

- **When to use** — which question from the mom this skill is for
- **Instructions** — what Claude should do, step by step
- **Safety rules** — what Claude must always do or never say
- **Output format** — what the answer on the screen should look like

`skills/montessori-activity-finder.md` is the skill the app ships with. Fill the four sections for finding an activity.

`skills/_safety.md` is a list, one rule per line. It is not a full skill. The server sticks this list onto every skill, including ones a mom writes, so keep it short and firm. It needs supervision, choking, tummy time, safe sleep, no diagnosis, and the numbers 112 and 116 117.

`data/emotional-development-example.md` is the model for demo sentence 2. It uses the same shape, with `created_by: mom`. Put three everyday situations in **Instructions**. Each one has a title, a sentence she can say out loud, and a next step that works in the apartment. The output format is one sentence she can say, one thing she can do, and when to call the pediatrician instead.
