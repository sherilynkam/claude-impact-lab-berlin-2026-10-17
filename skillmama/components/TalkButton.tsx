"use client";

// Person 2 — Whisper. See worksplit.md Role 2.
// Hold to talk → onTranscript(text). Two engines behind the same button:
// - "server": record with MediaRecorder and POST /api/transcribe (ElevenLabs or Whisper),
//   used when GET /api/transcribe reports a provider.
// - "browser": the browser's own speech recognition, used when the server has no key.
// The type field calls the same onTranscript. This component never calls /api/agent.

import { useEffect, useRef, useState, type KeyboardEvent } from "react";

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

type Engine = "server" | "browser";
type Phase = "idle" | "listening" | "writing";

const MIC_FAILED = "I couldn’t use the microphone. Type the sentence below.";
const NOT_CAUGHT = "I didn’t catch that. Hold the button and say it once more.";
const SERVICE_DOWN = "The voice service isn’t answering right now. You can type the sentence below.";

// Recordings shorter than this are almost always an accidental tap.
const MIN_RECORDING_MS = 400;

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

function canRecord() {
  return typeof navigator !== "undefined" && !!navigator.mediaDevices?.getUserMedia && typeof MediaRecorder !== "undefined";
}

function fileName(type: string) {
  if (type.includes("mp4")) return "recording.mp4";
  if (type.includes("ogg")) return "recording.ogg";
  return "recording.webm";
}

export function TalkButton({
  disabled,
  onTranscript,
}: {
  disabled?: boolean;
  onTranscript: (text: string) => void;
}) {
  const [engine, setEngine] = useState<Engine>("browser");
  const [phase, setPhase] = useState<Phase>("idle");
  const [draft, setDraft] = useState("");
  const [micHint, setMicHint] = useState("");

  const holdingRef = useRef(false);
  // Browser engine
  const heard = useRef("");
  const recRef = useRef<SpeechRec | null>(null);
  // Server engine
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startedAtRef = useRef(0);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/transcribe")
      .then((res) => res.json() as Promise<{ provider?: string | null }>)
      .then((data) => {
        if (!cancelled && data.provider && canRecord()) setEngine("server");
      })
      .catch(() => {
        /* stay on browser speech recognition */
      });
    return () => {
      cancelled = true;
      try {
        recRef.current?.stop();
      } catch {
        /* already stopped */
      }
      releaseMic();
    };
  }, []);

  function releaseMic() {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }

  function finish(text: string) {
    const clean = text.trim();
    setPhase("idle");
    if (clean) onTranscript(clean);
  }

  // ---- Browser engine: the browser's speech recognition ----

  function startBrowser() {
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
      setMicHint(MIC_FAILED);
      setPhase("idle");
    };
    rec.onend = () => finish(heard.current);
    try {
      rec.start();
      setPhase("listening");
      setMicHint("");
    } catch {
      setMicHint(MIC_FAILED);
      setPhase("idle");
    }
  }

  function stopBrowser() {
    setPhase("writing");
    try {
      recRef.current?.stop();
    } catch {
      finish(heard.current);
    }
  }

  // ---- Server engine: record, then ElevenLabs or Whisper via /api/transcribe ----

  async function startServer() {
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      holdingRef.current = false;
      setMicHint(MIC_FAILED);
      return;
    }

    // She let go while the browser was still asking for the microphone.
    if (!holdingRef.current) {
      stream.getTracks().forEach((track) => track.stop());
      return;
    }

    streamRef.current = stream;
    chunksRef.current = [];
    const recorder = new MediaRecorder(stream);
    recorderRef.current = recorder;

    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) chunksRef.current.push(event.data);
    };
    recorder.onstop = () => {
      releaseMic();
      const type = recorder.mimeType || chunksRef.current[0]?.type || "audio/webm";
      const audio = new Blob(chunksRef.current, { type });
      const tooShort = Date.now() - startedAtRef.current < MIN_RECORDING_MS;
      if (tooShort || audio.size === 0) {
        setPhase("idle");
        setMicHint("Keep holding the button while you speak.");
        return;
      }
      void sendRecording(audio);
    };

    startedAtRef.current = Date.now();
    recorder.start();
    setMicHint("");
    setPhase("listening");
  }

  function stopServer() {
    const recorder = recorderRef.current;
    recorderRef.current = null;
    if (recorder && recorder.state === "recording") {
      setPhase("writing");
      recorder.stop();
    }
  }

  async function sendRecording(audio: Blob) {
    setPhase("writing");
    const body = new FormData();
    body.append("audio", audio, fileName(audio.type));

    try {
      const res = await fetch("/api/transcribe", { method: "POST", body });
      const data = (await res.json()) as { text?: string; error?: string };
      if (res.ok && data.text) {
        finish(data.text);
        return;
      }
      // The server lost its key: use browser speech recognition from now on.
      if (res.status === 500) setEngine("browser");
      setMicHint(data.error ?? NOT_CAUGHT);
    } catch {
      setMicHint(SERVICE_DOWN);
    }
    setPhase("idle");
  }

  // ---- Shared press handling ----

  function startListening() {
    if (disabled || phase !== "idle" || holdingRef.current) return;
    holdingRef.current = true;
    if (engine === "server") void startServer();
    else startBrowser();
  }

  function stopListening() {
    if (!holdingRef.current) return;
    holdingRef.current = false;
    if (engine === "server") stopServer();
    else if (phase === "listening") stopBrowser();
  }

  function onKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    if ((event.key === " " || event.key === "Enter") && !event.repeat) {
      event.preventDefault();
      startListening();
    }
  }

  function onKeyUp(event: KeyboardEvent<HTMLButtonElement>) {
    if (event.key === " " || event.key === "Enter") {
      event.preventDefault();
      stopListening();
    }
  }

  const label = phase === "listening" ? "Listening" : phase === "writing" ? "Writing it down" : "Hold to talk";

  return (
    <div className="stack">
      <button
        type="button"
        className="talk"
        data-state={phase}
        data-engine={engine}
        disabled={disabled || phase === "writing"}
        aria-pressed={phase === "listening"}
        onPointerDown={startListening}
        onPointerUp={stopListening}
        onPointerLeave={stopListening}
        onPointerCancel={stopListening}
        onKeyDown={onKeyDown}
        onKeyUp={onKeyUp}
        onContextMenu={(event) => event.preventDefault()}
        style={{ touchAction: "none", userSelect: "none", WebkitUserSelect: "none" }}
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
