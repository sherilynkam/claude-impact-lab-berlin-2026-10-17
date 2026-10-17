"use client";

import { useState } from "react";
import { titleFromName } from "../lib/parse-skill";
import type { SkillCard } from "../lib/types";

export function LibraryList({ skills, highlightName }: { skills: SkillCard[]; highlightName?: string }) {
  const [openName, setOpenName] = useState<string | null>(highlightName ?? null);

  return (
    <section className="stack" aria-label="Your skills">
      <h2 className="section-title">Your skills</h2>
      {skills.map((skill) => {
        const open = openName === skill.name;
        const yours = skill.createdBy === "mom";
        return (
          <article key={skill.name} className="skill-card" data-highlight={skill.name === highlightName}>
            <button
              type="button"
              aria-expanded={open}
              onClick={() => setOpenName(open ? null : skill.name)}
            >
              <header>
                <h3>{titleFromName(skill.name)}</h3>
                <p className="meta">{skill.description}</p>
                <span className="pill" data-yours={yours ? "true" : "false"}>
                  {yours ? "added by you" : "here from the start"}
                </span>
              </header>
            </button>
            {open ? <pre className="skill-text">{skill.markdown}</pre> : null}
          </article>
        );
      })}
    </section>
  );
}
