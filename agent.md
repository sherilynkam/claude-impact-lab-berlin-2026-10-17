# Agent rules: SkillMama, Whisper role

I own the **Whisper** (voice) role in SkillMama (Claude Impact Lab Berlin, 17 Oct 2026). The app lives in `skillmama/`. The plan is in `skillmama/README.md`, and my role is "Role 2 — Whisper" in `skillmama/worksplit.md`.

All paths below are relative to the repo root, `claude-impact-lab-berlin-2026-10-17/`.

## 1. Pull before anything else

At the start of every session, and before any edit, commit, or push:

```bash
git fetch upstream
git pull --rebase upstream main
```

This picks up whatever the team pushed to the team repo. If the pull reports a conflict, stop and show it to me. Do not resolve it by guessing.

## 2. Work in my fork, never directly on the team repo

- Team repo: `younaorg/claude-impact-lab-berlin-2026-10-17`, remote name **`upstream`**. Read from it only. Never push to it. Its push URL is set to `DISABLED-push-to-fork-instead` on purpose, so an accidental push fails.
- My fork: `sherilynkam/claude-impact-lab-berlin-2026-10-17`, remote name **`origin`**. All my pushes go here.
- Both are forks of `Claude-Community-Berlin/claude-impact-lab-berlin-2026-10-17` (the event repo). I never push there either.
- Develop on the `whisper` branch, not on `main`.

If a fresh clone is missing these remotes, set them up again with the same names and the disabled push URL on `upstream`.

Daily loop:

1. Pull from `upstream` (rule 1).
2. `git switch whisper`
3. Rebase the branch on the fresh main: `git rebase upstream/main`.
4. Build, commit, then `git push origin whisper`.
5. When a piece works, open a PR from `sherilynkam:whisper` into `younaorg:main`, and only after I say so.

## 3. Stay inside my files

Only these files are mine:

- `skillmama/app/api/transcribe/route.ts`
- `skillmama/components/TalkButton.tsx`

Do not edit other roles' files (for example `skillmama/.env.example`, `skillmama/package.json`, `skillmama/components/DemoApp.tsx`). If my work needs a change there, tell me which file and what, so I can ask its owner.

`DemoApp.tsx` renders `<TalkButton disabled={...} onTranscript={...} />`. Keep that interface and the CSS classes `stack`, `talk`, `hint`, `mic-hint`, `composer`.

## 4. How voice works

- `GET /api/transcribe` returns `{ provider: "elevenlabs" | "whisper" | null }`.
- `POST /api/transcribe` (multipart, field `audio`) returns `{ text }`. It uses ElevenLabs Scribe (`scribe_v2`) when `ELEVENLABS_API_KEY` is set, otherwise OpenAI Whisper with `OPENAI_API_KEY`.
- `TalkButton` records and posts to the route when a provider exists. With no key it falls back to the browser's speech recognition, so the demo works without keys.
- `TalkButton` only calls `onTranscript(text)`. It never calls `/api/agent`.

## 5. What "done" means for me

From `worksplit.md`, Role 2:

- Hold the button, say “Help me find the right Montessori activity for my kid.”, and the sentence reaches the transcript.
- With the mic blocked, the hint and the type field show, and the sentence can be sent.
- With no key, the user sees a readable message and the page stays up.

Phones need `https` for the microphone: run `npm run dev -- --experimental-https` inside `skillmama/` and open the https address on the phone.

## 6. Keys

`ELEVENLABS_API_KEY` and `OPENAI_API_KEY` live only in `skillmama/.env.local` (git-ignored). Never commit them, print them, or paste them into chat.
