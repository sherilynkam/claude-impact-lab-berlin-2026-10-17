"use client";

// Person 2 — Whisper. See worksplit.md Role 2.
// Hold to talk → onTranscript(text). Two engines behind the same button:
// - "server": record with MediaRecorder and POST /api/transcribe (ElevenLabs or Whisper),
//   used when GET /api/transcribe reports a provider.
// - "browser": the browser's own speech recognition, used when the server has no key.
// The type field calls the same onTranscript. This component never calls /api/agent.

import { forwardRef, useEffect, useImperativeHandle, useRef, useState, type KeyboardEvent, type PointerEvent, type ReactNode } from "react";

type SpeechRec = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  abort?: () => void;
  onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
};

type Engine = "server" | "browser";
type Phase = "idle" | "listening" | "writing";

const MIC_FAILED = "I couldn’t use the microphone. Type the sentence below.";
const NOT_CAUGHT = "I didn’t catch that. Hold the button and say it once more.";
const SERVICE_DOWN = "The voice service isn’t answering right now. You can type the sentence below.";
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

export type TalkHandle = { cancel: () => void };

export const TalkButton = forwardRef<TalkHandle, {
  disabled?: boolean;
  variant?: "orb" | "bar" | "hidden";
  onTranscript: (text: string) => void;
  onPhase?: (phase: Phase) => void;
  onPartial?: (text: string) => void;
  children?: ReactNode;
}>(function TalkButton({ disabled, variant = "orb", onTranscript, onPhase, onPartial, children }, ref) {
  const [engine, setEngine] = useState<Engine>("browser");
  const [phase, setPhase] = useState<Phase>("idle");
  const [draft, setDraft] = useState("");
  const [micHint, setMicHint] = useState("");
  const [typing, setTyping] = useState(false);

  const holdingRef = useRef(false);
  const discardRef = useRef(false);
  const heard = useRef("");
  const recRef = useRef<SpeechRec | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startedAtRef = useRef(0);
  const onPhaseRef = useRef(onPhase);
  const onPartialRef = useRef(onPartial);
  const onTranscriptRef = useRef(onTranscript);
  onPhaseRef.current = onPhase;
  onPartialRef.current = onPartial;
  onTranscriptRef.current = onTranscript;

  function setTalkPhase(next: Phase) {
    setPhase(next);
    onPhaseRef.current?.(next);
  }

  function releaseMic() {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }

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
        recRef.current?.abort?.() ?? recRef.current?.stop();
      } catch {
        /* already stopped */
      }
      releaseMic();
    };
  }, []);

  useImperativeHandle(ref, () => ({
    cancel() {
      discardRef.current = true;
      holdingRef.current = false;
      try {
        recRef.current?.abort?.() ?? recRef.current?.stop();
      } catch {
        /* already stopped */
      }
      const recorder = recorderRef.current;
      recorderRef.current = null;
      if (recorder && recorder.state === "recording") recorder.stop();
      releaseMic();
      heard.current = "";
      onPartialRef.current?.("");
      setTalkPhase("idle");
    },
  }));

  function finish(text: string) {
    setTalkPhase("idle");
    if (discardRef.current) {
      discardRef.current = false;
      return;
    }
    const clean = text.trim();
    if (clean) onTranscriptRef.current(clean);
  }

  function startBrowser() {
    const rec = recognition();
    if (!rec) {
      setMicHint("This browser has no speech recognition. Type the sentence, or tap a line below.");
      setTyping(true);
      return;
    }
    heard.current = "";
    recRef.current = rec;
    rec.onresult = (event) => {
      heard.current = Array.from(event.results)
        .map((result) => result[0]?.transcript ?? "")
        .join(" ")
        .trim();
      onPartialRef.current?.(heard.current);
    };
    rec.onerror = () => {
      setMicHint(MIC_FAILED);
      setTyping(true);
      setTalkPhase("idle");
    };
    rec.onend = () => finish(heard.current);
    try {
      rec.start();
      setMicHint("");
      setTalkPhase("listening");
    } catch {
      setMicHint(MIC_FAILED);
      setTyping(true);
      setTalkPhase("idle");
    }
  }

  function stopBrowser() {
    setTalkPhase("writing");
    try {
      recRef.current?.stop();
    } catch {
      finish(heard.current);
    }
  }

  async function startServer() {
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      holdingRef.current = false;
      setMicHint(MIC_FAILED);
      setTyping(true);
      return;
    }

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
      const discard = discardRef.current;
      discardRef.current = false;
      if (discard) {
        setTalkPhase("idle");
        return;
      }
      const tooShort = Date.now() - startedAtRef.current < MIN_RECORDING_MS;
      if (tooShort || audio.size === 0) {
        setTalkPhase("idle");
        setMicHint("Keep holding the button while you speak.");
        return;
      }
      void sendRecording(audio);
    };

    startedAtRef.current = Date.now();
    recorder.start();
    setMicHint("");
    onPartialRef.current?.("");
    setTalkPhase("listening");
  }

  function stopServer() {
    const recorder = recorderRef.current;
    recorderRef.current = null;
    if (recorder && recorder.state === "recording") {
      setTalkPhase("writing");
      recorder.stop();
    }
  }

  async function sendRecording(audio: Blob) {
    setTalkPhase("writing");
    const body = new FormData();
    body.append("audio", audio, fileName(audio.type));

    try {
      const res = await fetch("/api/transcribe", { method: "POST", body });
      const data = (await res.json()) as { text?: string; error?: string };
      if (res.ok && data.text) {
        finish(data.text);
        return;
      }
      if (res.status === 500) setEngine("browser");
      setMicHint(data.error ?? NOT_CAUGHT);
      setTyping(true);
    } catch {
      setMicHint(SERVICE_DOWN);
      setTyping(true);
    }
    setTalkPhase("idle");
  }

  function startListening(event: PointerEvent<HTMLButtonElement>) {
    if (disabled || phase !== "idle" || holdingRef.current) return;
    holdingRef.current = true;
    discardRef.current = false;
    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      /* capture is a bonus; the button still stops on pointerup */
    }
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
      if (disabled || phase !== "idle" || holdingRef.current) return;
      holdingRef.current = true;
      discardRef.current = false;
      if (engine === "server") void startServer();
      else startBrowser();
    }
  }

  function onKeyUp(event: KeyboardEvent<HTMLButtonElement>) {
    if (event.key === " " || event.key === "Enter") {
      event.preventDefault();
      stopListening();
    }
  }

  const label = phase === "listening" ? "Listening…" : phase === "writing" ? "Writing it down" : "Hold to talk";
  const look = variant === "bar" ? "bar" : "orb";
  const place = variant === "hidden" ? "voice-hidden" : variant === "bar" ? "voice-bar" : "voice-orb";

  return (
    <div className={`voice ${place}`} data-engine={engine}>
      <button
        type="button"
        className={look === "bar" ? "release" : "orb"}
        data-state={phase}
        disabled={disabled || phase === "writing"}
        aria-pressed={phase === "listening"}
        aria-label={look === "bar" ? "Release to send" : "Hold to talk"}
        onPointerDown={startListening}
        onPointerUp={stopListening}
        onPointerCancel={stopListening}
        onKeyDown={onKeyDown}
        onKeyUp={onKeyUp}
        onContextMenu={(event) => event.preventDefault()}
      >
        {look === "bar" ? (
          phase === "writing" ? "Writing it down" : "Release to send"
        ) : (
          <svg aria-hidden="true" width="46" height="46" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="9" y="3" width="6" height="11" rx="3" />
            <path d="M5 11a7 7 0 0 0 14 0" />
            <path d="M12 18v3" />
          </svg>
        )}
      </button>
      {look === "orb" && variant !== "hidden" ? <div className="voice-label">{label}</div> : null}
      {micHint ? <p className="mic-hint">{micHint}</p> : null}
      {children}
      {look === "orb" && variant !== "hidden" ? (
        typing || micHint ? (
          <form
            className="composer"
            onSubmit={(event) => {
              event.preventDefault();
              const text = draft.trim();
              if (!text || disabled) return;
              setDraft("");
              onTranscriptRef.current(text);
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
        ) : (
          <button type="button" className="text-button" onClick={() => setTyping(true)}>
            Type instead
          </button>
        )
      ) : null}
    </div>
  );
});
