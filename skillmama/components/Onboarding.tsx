"use client";

import { useState } from "react";
import { ageError, type Baby } from "../lib/baby";
import { Disclaimer } from "./Disclaimer";

const MINUTES = [5, 10, 20];

export function Onboarding({
  initialBaby,
  initialConfidence,
  onStart,
}: {
  initialBaby: Baby;
  initialConfidence: number | null;
  onStart: (baby: Baby, confidence: number) => void;
}) {
  const [age, setAge] = useState(String(initialBaby.ageMonths));
  const [materials, setMaterials] = useState(initialBaby.materials);
  const [minutes, setMinutes] = useState(initialBaby.minutesAvailable);
  const [confidence, setConfidence] = useState<number | null>(initialConfidence);
  const [error, setError] = useState("");

  function start() {
    const problem = ageError(age);
    if (problem) {
      setError(problem);
      return;
    }
    if (confidence === null) return;
    onStart(
      {
        ageMonths: Number(age),
        materials: materials.trim(),
        minutesAvailable: minutes,
        completedActivityIds: initialBaby.completedActivityIds,
      },
      confidence,
    );
  }

  return (
    <div className="screen">
      <h1 className="brand">SkillMama</h1>
      <p className="tagline">What should I do with my baby?</p>
      <p className="hint">A minute of setup. Then you can ask out loud.</p>

      <label className="field">
        Age in months
        <input inputMode="numeric" value={age} onChange={(event) => setAge(event.target.value)} />
      </label>
      {error ? <p className="error">{error}</p> : null}

      <label className="field">
        What do you have at home?
        <input
          value={materials}
          onChange={(event) => setMaterials(event.target.value)}
          placeholder="a scarf, a wooden spoon"
        />
      </label>

      <div className="field">
        How many minutes do you have?
        <div className="chips">
          {MINUTES.map((value) => (
            <button
              key={value}
              type="button"
              className="choice"
              aria-pressed={minutes === value}
              onClick={() => setMinutes(value)}
            >
              {value}
            </button>
          ))}
        </div>
      </div>

      <div className="field">
        How confident are you using AI?
        <div className="confidence-row" role="group" aria-label="Confidence from 1 to 5">
          {[1, 2, 3, 4, 5].map((value) => (
            <button
              key={value}
              type="button"
              aria-pressed={confidence === value}
              aria-label={`Confidence ${value} out of 5`}
              onClick={() => setConfidence(value)}
            >
              {value}
            </button>
          ))}
        </div>
      </div>

      <button type="button" className="primary" disabled={confidence === null} onClick={start}>
        Start
      </button>
      <Disclaimer />
    </div>
  );
}
