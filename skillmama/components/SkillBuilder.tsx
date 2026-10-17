"use client";

import { useEffect, useState } from "react";
import { parseSkill } from "../lib/parse-skill";
import { SKILL_EXPLANATION, type BuilderAnswers, type SkillDraft } from "../lib/types";

const STARTER: BuilderAnswers = {
  wantHelpWith: "Understanding why she cries when I leave the room",
  recentMoment: "This morning I went to the kitchen and she cried right away.",
  answerShouldLookLike: "One thing I can say and one thing I can do.",
};

const ORDER = [
  ["whenToUse", "When to use"],
  ["instructions", "Instructions"],
  ["safetyRules", "Safety rules"],
  ["outputFormat", "Output format"],
] as const;

export function SkillBuilder({
  mode,
  questions,
  draft,
  answers,
  busy,
  onDraft,
  onSave,
}: {
  mode: "create" | "draft";
  questions: string[];
  draft: SkillDraft | null;
  answers: BuilderAnswers | null;
  busy?: boolean;
  onDraft: (answers: BuilderAnswers) => void;
  onSave: (markdown: string) => void;
}) {
  const [form, setForm] = useState<BuilderAnswers>(answers ?? STARTER);
  const [markdown, setMarkdown] = useState(draft?.markdown ?? "");

  useEffect(() => {
    if (draft?.markdown) setMarkdown(draft.markdown);
  }, [draft?.markdown]);

  if (mode === "create") {
    const fields: Array<[keyof BuilderAnswers, string]> = [
      ["wantHelpWith", questions[0] ?? "What do you want help with?"],
      ["recentMoment", questions[1] ?? "Describe a recent moment."],
      ["answerShouldLookLike", questions[2] ?? "What should the answer look like?"],
    ];
    return (
      <section className="stack">
        <h2 className="section-title">Three questions</h2>
        <p className="hint">The answers become the context for your skill. Change any line.</p>
        {fields.map(([key, label]) => (
          <label key={key} className="field">
            {label}
            <textarea rows={3} value={form[key]} onChange={(event) => setForm({ ...form, [key]: event.target.value })} />
          </label>
        ))}
        <button type="button" className="primary" disabled={busy} onClick={() => onDraft(form)}>
          Draft my skill
        </button>
      </section>
    );
  }

  const parsed = parseSkill(markdown);
  const explanation = draft?.explanation ?? SKILL_EXPLANATION;

  return (
    <section className="stack">
      <h2 className="section-title">Your skill, in parts</h2>
      {answers ? (
        <div className="context">
          <p className="kicker">Context you gave</p>
          <p>{answers.wantHelpWith}</p>
          <p>{answers.recentMoment}</p>
          <p>{answers.answerShouldLookLike}</p>
        </div>
      ) : null}
      {ORDER.map(([key, label]) => (
        <article key={key}>
          <h3 className="section-title">{label}</h3>
          <div className="explain">
            <p className="kicker">What this part means</p>
            <p>{explanation[key]}</p>
            {key === "safetyRules" ? <p>SkillMama keeps these rules on every skill.</p> : null}
          </div>
          {key === "safetyRules" && parsed.sections.safetyRules ? (
            <pre className="open-rules">{parsed.sections.safetyRules}</pre>
          ) : null}
        </article>
      ))}
      <label className="field">
        Edit the skill
        <textarea className="draft-box" value={markdown} onChange={(event) => setMarkdown(event.target.value)} />
      </label>
      <button type="button" className="primary" disabled={busy || !markdown.trim()} onClick={() => onSave(markdown)}>
        Save
      </button>
    </section>
  );
}
