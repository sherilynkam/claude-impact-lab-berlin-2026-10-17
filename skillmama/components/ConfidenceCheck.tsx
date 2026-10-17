"use client";

export function ConfidenceCheck({
  value,
  onChange,
  label = "How confident are you using AI now?",
}: {
  value: number | null;
  onChange: (value: number) => void;
  label?: string;
}) {
  return (
    <div className="field">
      {label}
      <div className="confidence-row" role="group" aria-label="Confidence now, from 1 to 5">
        {[1, 2, 3, 4, 5].map((score) => (
          <button
            key={score}
            type="button"
            aria-pressed={value === score}
            aria-label={`Confidence ${score} out of 5`}
            onClick={() => onChange(score)}
          >
            {score}
          </button>
        ))}
      </div>
    </div>
  );
}

export function ConfidenceShift({ before, after }: { before: number; after: number }) {
  return (
    <div className="confidence-result" aria-label={`Before ${before}, now ${after}`}>
      <div>
        <span>Before</span>
        <strong>{before}</strong>
      </div>
      <div aria-hidden="true">→</div>
      <div>
        <span>Now</span>
        <strong>{after}</strong>
      </div>
    </div>
  );
}
