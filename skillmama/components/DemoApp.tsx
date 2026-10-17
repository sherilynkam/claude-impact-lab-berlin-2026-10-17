"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { ageLabel, DEFAULT_BABY, monthsFromDob, withAge } from "../lib/baby";
import { activityPool, runDemoAgent } from "../lib/demo-agent";
import { cardFromMarkdown, libraryCards, seedSkill, upsertMomSkill } from "../lib/library";
import { titleFromName } from "../lib/parse-skill";
import { selectActivities } from "../lib/skills/montessori";
import {
  clearDemo,
  loadBaby,
  loadConfidence,
  loadJourney,
  loadSkills,
  saveBaby,
  saveConfidence,
  saveJourney,
  saveSkills,
  type Confidence,
} from "../lib/storage";
import {
  BUILDER_QUESTIONS,
  DOMAIN_LABEL,
  SKILL_EXPLANATION,
  type Activity,
  type AgentRequest,
  type AgentResponse,
  type Baby,
  type BuilderAnswers,
  type Corpus,
  type JourneyEntry,
  type Reaction,
  type SkillCard,
  type SkillDraft,
} from "../lib/types";
import { ConfidenceCheck, ConfidenceShift } from "./ConfidenceCheck";
import { Disclaimer } from "./Disclaimer";
import { TalkButton, type TalkHandle } from "./TalkButton";

const DEMO_LINES = [
  "Help me find the right Montessori activity for my kid.",
  "Help me figure out emotional development for my kid.",
];

const TEMPLATES = [
  { cat: "dev", name: "Feelings & bonding", desc: "Small ways to support her emotions", want: "Ideas to support her feelings", line: "Help me figure out emotional development for my kid." },
  { cat: "dev", name: "First words", desc: "Talk, sing and read at her level", want: "Ways to talk with her at this age", line: "Help me make a skill. Template: First words." },
  { cat: "dev", name: "Movement & tummy time", desc: "Age-fit ways to move and explore", want: "A short way for her to move", line: "Help me make a skill. Template: Movement." },
  { cat: "care", name: "Sleep routine", desc: "A calm, simple bedtime rhythm", want: "A simple bedtime rhythm", line: "Help me make a skill. Template: Sleep routine." },
  { cat: "care", name: "Bath & care time", desc: "Turn daily care into connection", want: "Make care time feel calm", line: "Help me make a skill. Template: Bath and care." },
  { cat: "me", name: "A moment for me", desc: "5-minute resets for tired days", want: "A 5-minute reset when I am tired", line: "Help me make a skill. Template: A moment for me." },
] as const;

const GOALS = ["What's normal at her age", "Ideas to support her feelings", "Help me read her cues"];

const REACTIONS: { id: Reaction; label: string; hint: string }[] = [
  { id: "loved", label: "Loved it", hint: "Suggest more like this" },
  { id: "okay", label: "It was okay", hint: "Try again in a few days" },
  { id: "notyet", label: "Not interested yet", hint: "Come back to it later" },
];

const FILTERS = [
  { id: "all", label: "All" },
  { id: "dev", label: "Development" },
  { id: "care", label: "Daily care" },
  { id: "me", label: "For me" },
] as const;

type Tab = "today" | "skills" | "journey" | "baby";
type Overlay = "results" | "detail" | "log" | "templates" | "create" | "preview" | "school" | null;
type TalkPhase = "idle" | "listening" | "writing";

function isDraft(results: AgentResponse["results"]): results is SkillDraft {
  return Boolean(results) && !Array.isArray(results) && "markdown" in results;
}

function isActivityList(results: AgentResponse["results"]): results is Activity[] {
  return Array.isArray(results) && (results.length === 0 || (typeof results[0] === "object" && results[0] !== null && "howToOffer" in results[0]));
}

function greeting(date = new Date()) {
  const hour = date.getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

function stepsFor(activity: Activity) {
  const parts = activity.howToOffer
    .split(/\n+|(?<=\.)\s+/)
    .map((part) => part.trim())
    .filter(Boolean);
  if (parts.length >= 2) return parts.slice(0, 3);
  return [activity.materials ? `Use ${activity.materials}.` : "Set it where she can reach it.", activity.howToOffer].filter(Boolean).slice(0, 3);
}

function ageSpan(activity: Activity) {
  if (activity.nearbyAge) return "Close to this age";
  if (activity.ageMinMonths === activity.ageMaxMonths) return `${activity.ageMinMonths} mo+`;
  return `${activity.ageMinMonths}–${activity.ageMaxMonths} mo`;
}

function whenLabel(iso: string) {
  const then = new Date(iso);
  const now = new Date();
  const day = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const that = new Date(then.getFullYear(), then.getMonth(), then.getDate()).getTime();
  const diff = Math.round((day - that) / 86400000);
  if (diff <= 0) return "Today";
  if (diff === 1) return "Yesterday";
  return then.toLocaleDateString("en", { weekday: "long" });
}

async function callAgent(request: AgentRequest, corpus: Corpus): Promise<AgentResponse> {
  try {
    const response = await fetch("/api/agent", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
    });
    if (response.ok) {
      const data = (await response.json()) as AgentResponse;
      if (data && (data.mode === "use" || data.mode === "create" || data.mode === "draft")) return data;
    }
  } catch {
    /* The page still runs the same demo brain in the browser. */
  }
  return runDemoAgent(request, corpus);
}

function Back({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button type="button" className="icon-btn" aria-label={label} onClick={onClick}>
      <svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M15 6l-6 6 6 6" />
      </svg>
    </button>
  );
}

function TabBar({ tab, onChange }: { tab: Tab; onChange: (tab: Tab) => void }) {
  const items: { id: Tab; label: string; icon: string }[] = [
    { id: "today", label: "Today", icon: "M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z" },
    { id: "skills", label: "Skills", icon: "" },
    { id: "journey", label: "Journey", icon: "" },
    { id: "baby", label: "Baby", icon: "" },
  ];
  return (
    <nav className="tabs">
      {items.map((item) => (
        <button key={item.id} type="button" aria-current={tab === item.id ? "page" : undefined} onClick={() => onChange(item.id)}>
          {item.id === "today" ? (
            <svg aria-hidden="true" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z" />
            </svg>
          ) : null}
          {item.id === "skills" ? (
            <svg aria-hidden="true" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="7" height="7" rx="2" />
              <rect x="14" y="3" width="7" height="7" rx="2" />
              <rect x="3" y="14" width="7" height="7" rx="2" />
              <path d="M17.5 14v7M14 17.5h7" />
            </svg>
          ) : null}
          {item.id === "journey" ? (
            <svg aria-hidden="true" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="9" />
              <path d="M12 7v5l3 2" />
            </svg>
          ) : null}
          {item.id === "baby" ? (
            <svg aria-hidden="true" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="8" r="4" />
              <path d="M4 21a8 8 0 0 1 16 0" />
            </svg>
          ) : null}
          {item.label}
        </button>
      ))}
    </nav>
  );
}

function Wave() {
  const heights = [18, 34, 52, 28, 60, 40, 22, 46, 30, 14];
  return (
    <div className="wave" aria-hidden="true">
      {heights.map((height, index) => (
        <span key={index} style={{ height }} />
      ))}
    </div>
  );
}

export function DemoApp({ corpus }: { corpus: Corpus }) {
  const [booted, setBooted] = useState(false);
  const [baby, setBaby] = useState<Baby | null>(null);
  const [momSkills, setMomSkills] = useState<SkillCard[]>([]);
  const [confidence, setConfidence] = useState<Confidence>({ before: null, after: null });
  const [journey, setJourney] = useState<JourneyEntry[]>([]);
  const [tab, setTab] = useState<Tab>("today");
  const [overlay, setOverlay] = useState<Overlay>(null);
  const [thinking, setThinking] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [partial, setPartial] = useState("");
  const [talkPhase, setTalkPhase] = useState<TalkPhase>("idle");
  const [response, setResponse] = useState<AgentResponse | null>(null);
  const [selected, setSelected] = useState<Activity | null>(null);
  const [reaction, setReaction] = useState<Reaction>("loved");
  const [note, setNote] = useState("");
  const [answers, setAnswers] = useState<BuilderAnswers | null>(null);
  const [filter, setFilter] = useState<(typeof FILTERS)[number]["id"]>("all");
  const [error, setError] = useState("");
  const [babyName, setBabyName] = useState(DEFAULT_BABY.name);
  const [parentName, setParentName] = useState(DEFAULT_BABY.parentName);
  const [dob, setDob] = useState(DEFAULT_BABY.dateOfBirth);
  const [before, setBefore] = useState<number | null>(null);
  const [markdown, setMarkdown] = useState("");
  const alive = useRef(true);
  const talkRef = useRef<TalkHandle>(null);

  useEffect(() => {
    const stored = loadBaby();
    setBaby(stored);
    setMomSkills(loadSkills());
    setConfidence(loadConfidence());
    setJourney(loadJourney());
    if (stored) {
      setBabyName(stored.name);
      setParentName(stored.parentName);
      setDob(stored.dateOfBirth || DEFAULT_BABY.dateOfBirth);
    }
    setBooted(true);
    return () => {
      alive.current = false;
    };
  }, []);

  const featured = useMemo(() => {
    if (!baby) return null;
    return selectActivities(activityPool(corpus.activities, baby.ageMonths, baby.completedActivityIds), baby)[0] ?? null;
  }, [baby, corpus.activities]);

  const activities = response && response.mode === "use" && isActivityList(response.results) ? response.results : [];
  const draft = response && response.mode === "draft" && isDraft(response.results) ? response.results : null;
  const cards = libraryCards(seedSkill(corpus.seedMarkdown), momSkills);
  const shownTemplates = TEMPLATES.filter((item) => filter === "all" || item.cat === filter);
  const months = monthsFromDob(dob) ?? DEFAULT_BABY.ageMonths;

  async function ask(
    message: string,
    opts?: { baby?: Baby; momSkills?: SkillCard[]; builderAnswers?: BuilderAnswers | null },
  ) {
    const currentBaby = opts?.baby ?? baby;
    if (!currentBaby) return;
    setTranscript(message);
    setPartial("");
    setThinking(true);
    setError("");
    setOverlay(opts?.builderAnswers ? "preview" : "results");
    const request: AgentRequest = {
      message,
      baby: currentBaby,
      momSkills: opts?.momSkills ?? momSkills,
      builderAnswers: opts && "builderAnswers" in opts ? opts.builderAnswers : null,
    };
    const [data] = await Promise.all([
      callAgent(request, corpus),
      new Promise((resolve) => setTimeout(resolve, 500)),
    ]);
    if (!alive.current) return;
    setResponse(data);
    setThinking(false);
    if (data.mode === "create") {
      setAnswers(null);
      setOverlay("create");
    } else if (data.mode === "draft" && isDraft(data.results)) {
      setMarkdown(data.results.markdown);
      setOverlay("preview");
    } else {
      setOverlay("results");
    }
  }

  function begin(nextBefore: number | null) {
    const next = withAge({
      ...DEFAULT_BABY,
      name: babyName,
      parentName,
      dateOfBirth: dob,
      completedActivityIds: baby?.completedActivityIds ?? [],
    });
    const nextConfidence = { before: nextBefore ?? confidence.before ?? 2, after: confidence.after };
    setBaby(next);
    setConfidence(nextConfidence);
    saveBaby(next);
    saveConfidence(nextConfidence);
    setTab("today");
    setOverlay(null);
  }

  function reset() {
    clearDemo();
    talkRef.current?.cancel();
    setBaby(null);
    setMomSkills([]);
    setConfidence({ before: null, after: null });
    setJourney([]);
    setOverlay(null);
    setTab("today");
    setResponse(null);
    setTranscript("");
    setAnswers(null);
    setError("");
    setBabyName(DEFAULT_BABY.name);
    setParentName(DEFAULT_BABY.parentName);
    setDob(DEFAULT_BABY.dateOfBirth);
    setBefore(null);
  }

  function saveProfile() {
    if (!baby) return;
    const next = withAge({ ...baby, name: babyName, parentName, dateOfBirth: dob });
    setBaby(next);
    saveBaby(next);
    setTab("today");
  }

  function openTemplate(template?: { want: string; line: string }) {
    const line = template?.line ?? "Help me make a skill. Template: start from scratch.";
    setTranscript(line);
    setAnswers({
      wantHelpWith: template?.want ?? "",
      recentMoment: "",
      answerShouldLookLike: "One thing I can say and one thing I can do.",
    });
    setResponse({
      reply: "You don't have a skill for that yet. Let's make one together. What should it help you with most?",
      skillUsed: "create_skill",
      mode: "create",
      results: BUILDER_QUESTIONS,
      learnPrompt: "",
    });
    setOverlay("create");
  }

  function saveLog() {
    if (!baby || !selected) return;
    const entry: JourneyEntry = {
      id: `${selected.id}-${Date.now()}`,
      activityId: selected.id,
      title: selected.title,
      reaction,
      note: note.trim(),
      at: new Date().toISOString(),
    };
    const nextJourney = [entry, ...journey.filter((item) => item.activityId !== selected.id)];
    const nextBaby = baby.completedActivityIds.includes(selected.id)
      ? baby
      : { ...baby, completedActivityIds: [...baby.completedActivityIds, selected.id] };
    setJourney(nextJourney);
    setBaby(nextBaby);
    saveJourney(nextJourney);
    saveBaby(nextBaby);
    setNote("");
    setOverlay(null);
    setTab("journey");
  }

  function saveSkill() {
    if (!markdown.trim()) return;
    const card = cardFromMarkdown(markdown);
    const nextSkills = upsertMomSkill(momSkills, card);
    setMomSkills(nextSkills);
    saveSkills(nextSkills);
    setOverlay(null);
    setTab("skills");
    void ask(transcript || "Help me figure out emotional development for my kid.", {
      momSkills: nextSkills,
      builderAnswers: null,
    });
  }

  function speak(activity: Activity) {
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(
      `${activity.title}. ${stepsFor(activity).join(" ")} Watch for ${activity.whatToNotice}`,
    );
    utterance.lang = "en-US";
    window.speechSynthesis.speak(utterance);
  }

  if (!booted) {
    return (
      <div className="stage">
        <div className="phone">
          <div className="screen">
            <div className="wordmark">SkillMama</div>
            <p className="muted">Opening…</p>
          </div>
        </div>
      </div>
    );
  }

  if (!baby) {
    return (
      <div className="stage">
        <div className="phone">
          <div className="screen">
            <div className="brand-row">
              <div className="mark" aria-hidden="true">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 3l1.8 4.6L18.5 9l-4.7 1.4L12 15l-1.8-4.6L5.5 9l4.7-1.4z" />
                </svg>
              </div>
              <div className="wordmark">SkillMama</div>
            </div>
            <div>
              <h1>Just say it.<br />We&apos;ll find what to do.</h1>
              <p className="lede">Playful ideas for you and your baby, matched to their age and what you&apos;ve already tried together.</p>
            </div>
            <div className="panel">
              <h2>Meet your baby</h2>
              <div className="field">
                <label htmlFor="baby-name">Baby&apos;s name</label>
                <input id="baby-name" value={babyName} onChange={(event) => setBabyName(event.target.value)} />
              </div>
              <div className="field">
                <label htmlFor="dob">Date of birth</label>
                <input id="dob" type="date" value={dob} onChange={(event) => setDob(event.target.value)} />
              </div>
              <div className="age-note">
                {babyName || "Your baby"} is {months} months old. Ideas grow with {months === 1 ? "him" : "her"}.
              </div>
              <ConfidenceCheck value={before} onChange={setBefore} label="How confident are you using AI?" />
            </div>
            <div className="grow" />
            <button type="button" className="primary" disabled={before === null} onClick={() => begin(before)}>
              Let&apos;s go
            </button>
            <p className="fine">Not medical advice. For health or development concerns, talk to your pediatrician. In an emergency call 112.</p>
          </div>
        </div>
      </div>
    );
  }

  const skillName =
    response?.skillUsed === "create_skill"
      ? "Building a new skill"
      : response?.skillUsed === "montessori_activity" || response?.skillUsed === "montessori-activity-finder"
        ? "Montessori activity"
        : response?.skillUsed
          ? titleFromName(response.skillUsed)
          : "Finding a skill";

  const listening = talkPhase !== "idle" && !overlay;
  const showOrb = tab === "today" && !overlay && talkPhase === "idle";
  const showBar = listening;

  let body: ReactNode = null;

  if (listening) {
    body = (
      <>
        <div className="back-row">
          <button
            type="button"
            className="icon-btn"
            aria-label="Close"
            onClick={() => {
              talkRef.current?.cancel();
              setPartial("");
            }}
          >
            <svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
          <div className="listen-pill">{talkPhase === "writing" ? "Writing it down" : "Listening…"}</div>
          <div style={{ width: 44 }} />
        </div>
        <div className="grow" style={{ display: "flex", flexDirection: "column", justifyContent: "center", gap: 16 }}>
          <div className="muted">You said</div>
          <p className="quote">&ldquo;{partial || "…"}&rdquo;</p>
          <div className="muted">for {baby.name}, {ageLabel(baby.ageMonths)}</div>
        </div>
        <Wave />
      </>
    );
  } else if (overlay === "results") {
    body = (
      <>
        <div className="back-row">
          <Back label="Back" onClick={() => setOverlay(null)} />
          <div className="skill-pill">{thinking ? "Thinking" : skillName}</div>
        </div>
        <div>
          <h1 style={{ fontSize: 28 }}>{activities.length ? `${activities.length} ideas for ${baby.name} right now` : "Here is what I found"}</h1>
          <p className="muted">
            {baby.ageMonths} months
            {baby.completedActivityIds.length
              ? ` · skips the ${baby.completedActivityIds.length} you've already done`
              : " · nothing logged yet"}
          </p>
        </div>
        {transcript ? <p className="muted">&ldquo;{transcript}&rdquo;</p> : null}
        {error ? <p className="error">{error}</p> : null}
        {thinking ? (
          <div className="stack-gap" aria-hidden="true">
            <p className="muted">Looking for an activity.</p>
            <div className="skeleton" />
            <div className="skeleton" />
            <div className="skeleton" />
          </div>
        ) : null}
        {!thinking && activities.map((activity, index) => (
          <button
            key={activity.id}
            type="button"
            className="idea"
            onClick={() => {
              setSelected(activity);
              setOverlay("detail");
            }}
          >
            <div className="swatch" style={{ background: index === 0 ? "linear-gradient(135deg,#7357DF,#8A4FD8)" : index === 1 ? "linear-gradient(135deg,#9A84EE,#A06CE6)" : "linear-gradient(135deg,#B6A6F3,#C3A2F2)" }}>
              {activity.title.slice(0, 1)}
            </div>
            <div className="copy">
              <div className="card-title">{activity.title}</div>
              <div className="muted">{activity.whyItHelps || activity.whatToNotice}</div>
              <div className="tags">
                <span className="tag">{DOMAIN_LABEL[activity.domain]}</span>
                <span className={activity.nearbyAge ? "tag warn" : "tag alt"}>{ageSpan(activity)}</span>
              </div>
            </div>
          </button>
        ))}
        {!thinking && activities.length === 0 && response?.reply ? <div className="block"><p style={{ margin: 0 }}>{response.reply}</p></div> : null}
        {!thinking && response?.learnPrompt ? <p className="fine">{response.learnPrompt}</p> : null}
        <div className="grow" />
        <button type="button" className="ghost" onClick={() => setOverlay(null)}>
          Ask for something else
        </button>
      </>
    );
  } else if (overlay === "detail" && selected) {
    body = (
      <div className="screen-detail" style={{ display: "flex", flexDirection: "column", minHeight: "100%" }}>
        <div className="detail-hero">
          <div className="back-row">
            <Back label="Back" onClick={() => setOverlay("results")} />
            <button type="button" className="icon-btn speak" aria-label="Read aloud" onClick={() => speak(selected)}>
              <svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 10v4h4l5 4V6L8 10z" />
                <path d="M16.5 8.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12" />
              </svg>
            </button>
          </div>
          <div className="tags">
            <span className="tag">{DOMAIN_LABEL[selected.domain]}</span>
            <span className="tag alt">{ageSpan(selected)}</span>
          </div>
          <h1>{selected.title}</h1>
          <p className="muted">{selected.whyItHelps || selected.whatToNotice}</p>
        </div>
        <div className="detail-body">
          <div className="block">
            <h2>Set up</h2>
            {stepsFor(selected).map((step, index) => (
              <div className="step" key={step}>
                <span className="num">{index + 1}</span>
                <span>{step}</span>
              </div>
            ))}
          </div>
          <div className="block">
            <h2>Watch for</h2>
            <p className="muted">{selected.whatToNotice}</p>
          </div>
          {selected.nearbyAge ? <p className="fine">Close to this age, because the matching ones are already done.</p> : null}
          <div className="safety">Stay close. Check toys for small parts and sharp edges. This is not a medical check.</div>
          <div className="grow" />
          <button type="button" className="primary" onClick={() => setOverlay("log")}>
            We did it
          </button>
        </div>
      </div>
    );
  } else if (overlay === "log" && selected) {
    body = (
      <>
        <Back label="Back" onClick={() => setOverlay("detail")} />
        <div>
          <h1 style={{ fontSize: 28 }}>How did {baby.name} like it?</h1>
          <p className="muted">{selected.title} · today</p>
        </div>
        <div className="reactions">
          {REACTIONS.map((item) => (
            <button key={item.id} type="button" className="reaction" aria-pressed={reaction === item.id} onClick={() => setReaction(item.id)}>
              <strong>{item.label}</strong>
              <span className="muted">{item.hint}</span>
            </button>
          ))}
        </div>
        <label className="field">
          Add a note
          <input value={note} onChange={(event) => setNote(event.target.value)} placeholder="She always grabbed the blue rattle first." />
        </label>
        <div className="grow" />
        <button type="button" className="primary" onClick={saveLog}>
          Save to our journey
        </button>
      </>
    );
  } else if (overlay === "templates") {
    body = (
      <>
        <div className="back-row">
          <Back label="Back" onClick={() => setOverlay(null)} />
          <span className="muted">Step 1 of 3</span>
        </div>
        <div>
          <h1 style={{ fontSize: 28 }}>Pick a starting point</h1>
          <p className="muted">Choose a template, then make it yours.</p>
        </div>
        <div className="filters">
          {FILTERS.map((item) => (
            <button key={item.id} type="button" className="filter" aria-pressed={filter === item.id} onClick={() => setFilter(item.id)}>
              {item.label}
            </button>
          ))}
        </div>
        <div className="grid">
          {shownTemplates.map((item, index) => (
            <button key={item.name} type="button" className="template" onClick={() => openTemplate(item)}>
              <div className="swatch sm" style={{ background: ["#7357DF", "#8A4FD8", "#A06CE6"][index % 3] }}>{item.name.slice(0, 1)}</div>
              <div className="card-title" style={{ fontSize: 16 }}>{item.name}</div>
              <div className="muted">{item.desc}</div>
            </button>
          ))}
        </div>
        <div className="grow" />
        <button type="button" className="ghost" onClick={() => openTemplate()}>
          None fit? Start from scratch
        </button>
      </>
    );
  } else if (overlay === "create") {
    const form = answers ?? {
      wantHelpWith: "",
      recentMoment: "",
      answerShouldLookLike: "One thing I can say and one thing I can do.",
    };
    body = (
      <>
        <div className="back-row">
          <Back label="Back" onClick={() => setOverlay("templates")} />
          <div>
            <div className="card-title" style={{ fontSize: 18 }}>New skill</div>
            <div className="muted">Step 2 of 3</div>
          </div>
        </div>
        <div className="progress" aria-hidden="true"><span style={{ width: "66%" }} /></div>
        {transcript ? <div className="bubble mine">{transcript}</div> : null}
        <div className="bubble">{response?.reply || "Three short questions, then you can read the skill before saving it."}</div>
        <div className="goals">
          {GOALS.map((goal) => (
            <button key={goal} type="button" className="goal" aria-pressed={form.wantHelpWith === goal} onClick={() => setAnswers({ ...form, wantHelpWith: goal })}>
              {goal}
            </button>
          ))}
        </div>
        <label className="field">
          {BUILDER_QUESTIONS[0]}
          <input value={form.wantHelpWith} onChange={(event) => setAnswers({ ...form, wantHelpWith: event.target.value })} />
        </label>
        <label className="field">
          {BUILDER_QUESTIONS[1]}
          <textarea value={form.recentMoment} onChange={(event) => setAnswers({ ...form, recentMoment: event.target.value })} />
        </label>
        <label className="field">
          {BUILDER_QUESTIONS[2]}
          <input value={form.answerShouldLookLike} onChange={(event) => setAnswers({ ...form, answerShouldLookLike: event.target.value })} />
        </label>
        <button
          type="button"
          className="primary"
          disabled={thinking || !form.wantHelpWith.trim()}
          onClick={() => {
            setAnswers(form);
            void ask(transcript || form.wantHelpWith, { builderAnswers: form });
          }}
        >
          Review skill
        </button>
      </>
    );
  } else if (overlay === "preview" && !draft) {
    body = (
      <>
        <p className="muted">Writing your skill.</p>
        <div className="skeleton" />
        <div className="skeleton" />
      </>
    );
  } else if (overlay === "preview" && draft) {
    body = (
      <>
        <div className="back-row">
          <Back label="Back" onClick={() => setOverlay("create")} />
          <span className="muted">Step 3 of 3</span>
        </div>
        <h1 style={{ fontSize: 28 }}>Your new skill is ready</h1>
        <div className="preview">
          <div className="preview-head">
            <div className="swatch sm" style={{ background: "rgba(255,255,255,0.22)" }}>♥</div>
            <div>
              <div className="card-title" style={{ color: "white" }}>{titleFromName(cardFromMarkdown(markdown || draft.markdown).name)}</div>
              <div>For {baby.name}</div>
            </div>
          </div>
          <div className="preview-body">
            <div>
              <div className="section-label">What it does</div>
              <p className="muted">{draft.explanation.whenToUse}</p>
            </div>
            <div>
              <div className="section-label">How it answers</div>
              <p className="muted">{draft.explanation.outputFormat}</p>
            </div>
            <div>
              <div className="section-label">Safety</div>
              <p className="muted">{draft.explanation.safetyRules}</p>
            </div>
            <div>
              <div className="section-label">What Claude should do</div>
              <p className="muted">{draft.explanation.instructions}</p>
            </div>
          </div>
        </div>
        <label className="field">
          Change the skill text
          <textarea value={markdown} onChange={(event) => setMarkdown(event.target.value)} rows={8} />
        </label>
        <p className="fine">You just wrote a skill. You can edit the text, then add it to your library.</p>
        <button type="button" className="primary" onClick={saveSkill}>Add to my library</button>
      </>
    );
  } else if (overlay === "school") {
    const lessons = [
      ["When to use", SKILL_EXPLANATION.whenToUse],
      ["Instructions", SKILL_EXPLANATION.instructions],
      ["Safety rules", SKILL_EXPLANATION.safetyRules],
      ["Output format", SKILL_EXPLANATION.outputFormat],
    ];
    body = (
      <>
        <Back label="Back" onClick={() => setOverlay(null)} />
        <h1 style={{ fontSize: 28 }}>Skill school</h1>
        <p className="muted">A short read, so you can build a skill today. A video can come later.</p>
        {lessons.map(([title, text]) => (
          <div className="block" key={title}>
            <h2>{title}</h2>
            <p className="muted">{text}</p>
          </div>
        ))}
        <button type="button" className="primary" onClick={() => setOverlay("templates")}>Pick a template</button>
      </>
    );
  } else if (tab === "skills") {
    body = (
      <>
        <div>
          <h1 style={{ fontSize: 30 }}>Your skills</h1>
          <p className="muted">Each skill does one job, made for {baby.name}.</p>
        </div>
        <div className="section-label">Starter skills</div>
        {cards.filter((card) => card.createdBy === "seed").map((card) => (
          <button key={card.name} type="button" className="skill-row" onClick={() => void ask(DEMO_LINES[0])}>
            <div className="swatch sm" style={{ background: "linear-gradient(135deg,#7357DF,#8A4FD8)" }}>✦</div>
            <div className="copy">
              <div className="card-title">{titleFromName(card.name)}</div>
              <div className="muted">{card.description}</div>
            </div>
            <div className="muted" style={{ textAlign: "right" }}>{baby.completedActivityIds.length ? "Used" : "Ready"}</div>
          </button>
        ))}
        <button
          type="button"
          className="skill-row"
          onClick={() =>
            openTemplate({
              want: "Simple, age-fit meals and snacks",
              line: "Help me make a skill. Template: Meal planner.",
            })
          }
        >
          <div className="swatch sm" style={{ background: "linear-gradient(135deg,#A06CE6,#C3A2F2)" }}>M</div>
          <div className="copy">
            <div className="card-title">Meal planner</div>
            <div className="muted">Simple, age-fit meals and snacks</div>
          </div>
          <div className="muted" style={{ textAlign: "right" }}>Not used<br />yet</div>
        </button>
        <div className="section-label">Made by you</div>
        {cards.filter((card) => card.createdBy === "mom").map((card) => (
          <button key={card.name} type="button" className="skill-row" onClick={() => void ask("Help me figure out emotional development for my kid.")}>
            <div className="swatch sm" style={{ background: "linear-gradient(135deg,#7357DF,#8A4FD8)" }}>{card.name.slice(0, 1).toUpperCase()}</div>
            <div className="copy">
              <div className="card-title">{titleFromName(card.name)}</div>
              <div className="muted">{card.description}</div>
              <span className="tag">added by you</span>
            </div>
          </button>
        ))}
        {momSkills.length === 0 ? (
          <button type="button" className="skill-row dashed" onClick={() => setOverlay("templates")}>
            <div className="play">+</div>
            <div className="copy">
              <div className="card-title">Create your first skill</div>
              <div className="muted">Start from a template: sleep, feelings, first words and more.</div>
            </div>
          </button>
        ) : (
          <button type="button" className="ghost" onClick={() => setOverlay("templates")}>Create another skill</button>
        )}
        <button type="button" className="skill-row school" onClick={() => setOverlay("school")}>
          <div className="play">▶</div>
          <div className="copy">
            <div className="card-title">Skill school</div>
            <div className="muted">How to build a skill · a short read</div>
          </div>
        </button>
        {momSkills.length > 0 && confidence.before !== null && confidence.after === null ? (
          <ConfidenceCheck
            value={null}
            onChange={(after) => {
              const next = { before: confidence.before, after };
              setConfidence(next);
              saveConfidence(next);
            }}
          />
        ) : null}
        {confidence.before !== null && confidence.after !== null ? (
          <ConfidenceShift before={confidence.before} after={confidence.after} />
        ) : null}
      </>
    );
  } else if (tab === "journey") {
    body = (
      <>
        <div>
          <h1 style={{ fontSize: 30 }}>Our journey</h1>
          <p className="muted">Everything you and {baby.name} tried together</p>
        </div>
        <div className="week">
          <div>
            <div>Logged</div>
            <strong>{journey.length} {journey.length === 1 ? "activity" : "activities"}</strong>
          </div>
          <div style={{ textAlign: "right" }}>{journey[0] ? REACTIONS.find((item) => item.id === journey[0].reaction)?.label : "Nothing yet"}</div>
        </div>
        {journey.length === 0 ? <p className="muted">Try an activity, then tap We did it. It will show up here.</p> : null}
        {journey.map((entry) => (
          <div className="journey-row" key={entry.id}>
            <div className="dot" />
            <div className="copy">
              <div className="card-title" style={{ fontFamily: "inherit", fontSize: 16 }}>{entry.title}</div>
              <div className="muted">{whenLabel(entry.at)}{entry.note ? ` · ${entry.note}` : ""}</div>
            </div>
            <span className={entry.reaction === "notyet" ? "tag warn" : entry.reaction === "okay" ? "tag" : "tag alt"}>
              {REACTIONS.find((item) => item.id === entry.reaction)?.label}
            </span>
          </div>
        ))}
      </>
    );
  } else if (tab === "baby") {
    body = (
      <>
        <div>
          <h1 style={{ fontSize: 30 }}>{baby.name}</h1>
          <p className="muted">{ageLabel(baby.ageMonths)} · ideas follow this profile</p>
        </div>
        <div className="panel">
          <div className="field">
            <label htmlFor="your-name">Your name</label>
            <input id="your-name" value={parentName} onChange={(event) => setParentName(event.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="edit-baby">Baby&apos;s name</label>
            <input id="edit-baby" value={babyName} onChange={(event) => setBabyName(event.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="edit-dob">Date of birth</label>
            <input id="edit-dob" type="date" value={dob} onChange={(event) => setDob(event.target.value)} />
          </div>
          <div className="age-note">{babyName || "Your baby"} is {monthsFromDob(dob) ?? baby.ageMonths} months old.</div>
          <div className="field">
            <label htmlFor="materials">What do you have at home?</label>
            <input
              id="materials"
              value={baby.materials}
              onChange={(event) => setBaby({ ...baby, materials: event.target.value })}
            />
          </div>
          <div className="field">
            How many minutes do you have?
            <div className="minutes">
              {[5, 10, 20].map((minutes) => (
                <button
                  key={minutes}
                  type="button"
                  className="choice"
                  aria-pressed={baby.minutesAvailable === minutes}
                  onClick={() => setBaby({ ...baby, minutesAvailable: minutes })}
                >
                  {minutes}
                </button>
              ))}
            </div>
          </div>
          <button type="button" className="primary" onClick={saveProfile}>Save profile</button>
        </div>
        <Disclaimer />
        <button type="button" className="ghost" onClick={reset}>Start over</button>
      </>
    );
  } else {
    body = (
      <>
        <div className="top-row">
          <div>
            <div className="hello">{greeting()}</div>
            <div className="hi">Hi, {baby.parentName}</div>
          </div>
          <div className="pill">{baby.name} · {ageLabel(baby.ageMonths)}</div>
        </div>
        {featured ? (
          <button
            type="button"
            className="feature"
            onClick={() => {
              setSelected(featured);
              setResponse({
                reply: "",
                skillUsed: "montessori_activity",
                mode: "use",
                results: [featured],
                learnPrompt: "",
              });
              setOverlay("detail");
            }}
          >
            <div className="eyebrow">Next step for {baby.name}</div>
            <h2>{featured.title}</h2>
            <p>{featured.whyItHelps || featured.whatToNotice}</p>
            <span className="see">See how</span>
          </button>
        ) : (
          <div className="feature">
            <div className="eyebrow">Next step</div>
            <h2>You&apos;ve tried today&apos;s ideas</h2>
            <p>Ask for something else and we&apos;ll look again.</p>
          </div>
        )}
        <div className="hero-space" />
      </>
    );
  }

  return (
    <div className="stage">
      <div className="phone">
        <div className={`screen${overlay === "detail" ? " screen-flat" : ""}`}>{body}</div>
        <TalkButton
          ref={talkRef}
          variant={showBar ? "bar" : showOrb ? "orb" : "hidden"}
          disabled={thinking}
          onPhase={setTalkPhase}
          onPartial={setPartial}
          onTranscript={(text) => void ask(text)}
        >
          {showOrb ? (
            <div className="chips">
              {DEMO_LINES.map((line) => (
                <button key={line} type="button" disabled={thinking} onClick={() => void ask(line)}>
                  &ldquo;{line}&rdquo;
                </button>
              ))}
            </div>
          ) : null}
        </TalkButton>
        {!overlay && talkPhase === "idle" && tab === "today" ? (
          <p className="fine dock-note">Not medical advice. Emergency: 112. In Germany: 116 117.</p>
        ) : null}
        {!overlay && talkPhase === "idle" ? <TabBar tab={tab} onChange={setTab} /> : null}
      </div>
    </div>
  );
}
