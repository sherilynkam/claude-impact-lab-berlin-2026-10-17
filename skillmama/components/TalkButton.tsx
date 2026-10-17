"use client";

import { useEffect, useRef, useState } from "react";

type SpeechRec = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
};

function recognition(): SpeechRec | null {
  if (typeof window === "undefined") return null;
  const ctor = (
    window as Window & { webkitSpeechRecognition?: new () => SpeechRec; SpeechRecognition?: new () => SpeechRec }
  ).SpeechRecognition ?? (window as Window & { webkitSpeechRecognition?: new () => SpeechRec }).webkitSpeechRecognition;
  if (!ctor) return null;
  const rec = new ctor();
  rec.continuous = false;
  rec.interimResults = true;
  rec.lang = navigator.language || "en-US";
  return rec;
}

export function TalkButton({
  disabled,
  onTranscript,
}: {
  disabled?: boolean;
  onTranscript: (text: string) => void;
}) {
  const [phase, setPhase] = useState<"idle" | "listening" | "writing">("idle");
  const [draft, setDraft] = useState("");
  const [micHint, setMicHint] = useState("");
  const heard = useRef("");
  const recRef = useRef<SpeechRec | null>(null);

  useEffect(() => {
    return () => {
      try {
        recRef.current?.stop();
      } catch {
        /* already stopped */
      }
    };
  }, []);

  function finish(text: string) {
    const clean = text.trim();
    setPhase("idle");
    if (clean) onTranscript(clean);
  }

  function startListening() {
    if (disabled) return;
    const rec = recognition();
    if (!rec) {
      setMicHint("This browser has no speech recognition. Type the sentence, or tap a line below.");
      return;
    }
    heard.current = "";
    recRef.current = rec;
    rec.onresult = (event) => {
      heard.current = Array.from(event.results)
        .map((result) => result[0]?.transcript ?? "")
        .join(" ")
        .trim();
    };
    rec.onerror = () => {
      setMicHint("I couldn’t use the microphone. Type the sentence below.");
      setPhase("idle");
    };
    rec.onend = () => finish(heard.current);
    try {
      rec.start();
      setPhase("listening");
      setMicHint("");
    } catch {
      setMicHint("I couldn’t use the microphone. Type the sentence below.");
      setPhase("idle");
    }
  }

  function stopListening() {
    if (phase !== "listening") return;
    setPhase("writing");
    try {
      recRef.current?.stop();
    } catch {
      finish(heard.current);
    }
  }

  const label = phase === "listening" ? "Listening" : phase === "writing" ? "Writing it down" : "Hold to talk";

  return (
    <div className="stack">
      <button
        type="button"
        className="talk"
        data-state={phase}
        disabled={disabled}
        aria-pressed={phase === "listening"}
        onPointerDown={startListening}
        onPointerUp={stopListening}
        onPointerLeave={stopListening}
        onContextMenu={(event) => event.preventDefault()}
      >
        {label}
      </button>
      <p className="hint">Hold to talk, type, or tap a demo line.</p>
      {micHint ? <p className="mic-hint">{micHint}</p> : null}
      <form
        className="composer"
        onSubmit={(event) => {
          event.preventDefault();
          const text = draft.trim();
          if (!text || disabled) return;
          setDraft("");
          onTranscript(text);
        }}
      >
        <input
          aria-label="Type a sentence"
          value={draft}
          disabled={disabled}
          onChange={(event) => setDraft(event.target.value)}
          placeholder="Help me find an activity"
        />
        <button type="submit" disabled={disabled || !draft.trim()}>
          Send
        </button>
      </form>
    </div>
  );
}
