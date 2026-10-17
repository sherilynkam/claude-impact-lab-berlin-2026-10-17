# SkillMama UI prototype

13 phone screens (390×844) from the Claude Design canvas, in a light purple style
(Outfit for headings, DM Sans for body). Each `*.dc.html` file is one screen;
`canvas.json` holds the layout and flow.

## Flow A: use a skill
Main (welcome & baby profile) → Home (hold to talk) → Listening → Results
(3 age-fit activities) → Detail → Log (how did it go?)

## Flow B: build your own skill
Library → Learn (Skill school: 3-min video + 3 audio episodes) → Player
(audio lesson) → Templates (6 starter templates with filters) → CreateSkill
(build with Claude) → SkillPreview (review & save) → History (our journey)

Use these as the visual reference for the components in `skillmama/components/`.
