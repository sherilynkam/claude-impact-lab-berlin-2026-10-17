"use client";

import { useEffect, useRef, useState } from "react";
import { DEFAULT_BABY } from "../lib/baby";
import { runDemoAgent } from "../lib/demo-agent";
import { cardFromMarkdown, libraryCards, seedSkill, upsertMomSkill } from "../lib/library";
import { titleFromName } from "../lib/parse-skill";
import {
  clearDemo,
  loadBaby,
  loadConfidence,
  loadSkills,
  saveBaby,
  saveConfidence,
  saveSkills,
  type Confidence,
} from "../lib/storage";
import type { Activity, AgentRequest, AgentResponse, Baby, BuilderAnswers, Corpus, SkillCard, SkillDraft } from "../lib/types";
import { ActivityCard } from "./ActivityCard";
import { ConfidenceCheck, ConfidenceShift } from "./ConfidenceCheck";
import { Disclaimer } from "./Disclaimer";
import { LibraryList } from "./LibraryList";
import { Onboarding } from "./Onboarding";
import { SkillBuilder } from "./SkillBuilder";
import { TalkButton } from "./TalkButton";

const DEMO_LINES = [
  "Help me find the right Montessori activity for my kid.",
  "Help me figure out emotional development for my kid.",
];

function isDraft(results: AgentResponse["results"]): results is SkillDraft {
  return Boolean(results) && !Array.isArray(results) && "markdown" in results;
}

function isActivityList(results: AgentResponse["results"]): results is Activity[] {
  return Array.isArray(results) && results.length > 0 && typeof results[0] === "object" && "howToOffer" in results[0];
}

function isQuestionList(results: AgentResponse["results"]): results is string[] {
  return Array.isArray(results) && (results.length === 0 || typeof results[0] === "string");
}

function badge(response: AgentResponse | null, thinking: boolean) {
  if (thinking) return { text: "Thinking", kind: "think" };
  if (!response || !response.skillUsed) return null;
  if (response.mode === "create" || response.mode === "draft" || response.skillUsed === "create_skill") {
    return { text: "Building a new skill", kind: "create" };
  }
  if (response.skillUsed === "montessori-activity-finder" || response.skillUsed === "montessori_activity") {
    return { text: "Skill: Montessori activity", kind: "use" };
  }
  return { text: `Your skill: ${titleFromName(response.skillUsed)}`, kind: "use" };
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

export function DemoApp({ corpus }: { corpus: Corpus }) {
  const [booted, setBooted] = useState(false);
  const [baby, setBaby] = useState<Baby | null>(null);
  const [editing, setEditing] = useState(false);
  const [momSkills, setMomSkills] = useState<SkillCard[]>([]);
  const [confidence, setConfidence] = useState<Confidence>({ before: null, after: null });
  const [thinking, setThinking] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [response, setResponse] = useState<AgentResponse | null>(null);
  const [doneCards, setDoneCards] = useState<Activity[]>([]);
  const [answers, setAnswers] = useState<BuilderAnswers | null>(null);
  const [error, setError] = useState("");
  const alive = useRef(true);
  const resultRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setBaby(loadBaby());
    setMomSkills(loadSkills());
    setConfidence(loadConfidence());
    setBooted(true);
    return () => {
      alive.current = false;
    };
  }, []);

  useEffect(() => {
    if (!thinking && response) {
      resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [thinking, response]);

  async function ask(
    message: string,
    opts?: { baby?: Baby; momSkills?: SkillCard[]; builderAnswers?: BuilderAnswers | null },
  ) {
    const currentBaby = opts?.baby ?? baby;
    if (!currentBaby) return;
    setTranscript(message);
    setThinking(true);
    setError("");
    const request: AgentRequest = {
      message,
      baby: currentBaby,
      momSkills: opts?.momSkills ?? momSkills,
      builderAnswers: opts && "builderAnswers" in opts ? opts.builderAnswers : null,
    };
    const [data] = await Promise.all([
      callAgent(request, corpus),
      new Promise((resolve) => setTimeout(resolve, 600)),
    ]);
    if (!alive.current) return;
    setResponse(data);
    setThinking(false);
  }

  function start(nextBaby: Baby, before: number) {
    const nextConfidence = { before, after: confidence.after };
    setBaby(nextBaby);
    setConfidence(nextConfidence);
    saveBaby(nextBaby);
    saveConfidence(nextConfidence);
    setEditing(false);
    setResponse(null);
    setTranscript("");
  }

  function reset() {
    clearDemo();
    setBaby(null);
    setMomSkills([]);
    setConfidence({ before: null, after: null });
    setEditing(false);
    setResponse(null);
    setTranscript("");
    setDoneCards([]);
    setAnswers(null);
    setError("");
  }

  if (!booted) {
    return (
      <div className="stage">
        <div className="phone">
          <div className="screen">
            <h1 className="brand">SkillMama</h1>
            <p className="hint">Opening…</p>
          </div>
        </div>
      </div>
    );
  }

  if (!baby || editing) {
    return (
      <div className="stage">
        <div className="phone">
          <Onboarding
            initialBaby={baby ?? DEFAULT_BABY}
            initialConfidence={confidence.before}
            onStart={start}
          />
        </div>
      </div>
    );
  }

  const mark = badge(response, thinking);
  const activities = response && response.mode === "use" && isActivityList(response.results) ? response.results : [];
  const questions = response && response.mode === "create" && isQuestionList(response.results) ? response.results : [];
  const draft = response && response.mode === "draft" && isDraft(response.results) ? response.results : null;
  const showReply = response && !thinking && activities.length === 0 && response.mode === "use" && response.reply;
  const cards = libraryCards(seedSkill(corpus.seedMarkdown), momSkills);

  return (
    <div className="stage">
      <div className="phone">
        <div className="screen">
          <h1 className="brand">SkillMama</h1>
          <p className="tagline">What should I do with my baby?</p>
          <p className="profile">
            <span>{baby.ageMonths} months</span>
            <span>{baby.minutesAvailable} minutes</span>
            {baby.materials ? <span>{baby.materials}</span> : null}
            <button type="button" className="text-button" onClick={() => setEditing(true)}>
              Change details
            </button>
          </p>

          <TalkButton disabled={thinking} onTranscript={(text) => void ask(text)} />
          <div className="demo-lines">
            {DEMO_LINES.map((line) => (
              <button key={line} type="button" disabled={thinking} onClick={() => void ask(line)}>
                {line}
              </button>
            ))}
          </div>

          {transcript ? <blockquote className="transcript">{transcript}</blockquote> : null}
          {error ? <p className="error">{error}</p> : null}

          <div ref={resultRef}>
            {mark ? (
              <p className="badge" data-kind={mark.kind} role="status">
                {mark.text}
              </p>
            ) : null}
          </div>

          {thinking ? (
            <div className="stack" aria-hidden="true">
              <p className="hint">Looking for an activity.</p>
              <div className="skeleton" />
              <div className="skeleton" />
              <div className="skeleton" />
            </div>
          ) : null}

          {activities.length > 0 && !thinking ? (
            <section className="stack">
              <h2 className="section-title">For the next few minutes</h2>
              {response?.reply ? <p className="reply">{response.reply}</p> : null}
              {activities.map((activity) => (
                <ActivityCard
                  key={activity.id}
                  activity={activity}
                  onDone={(item) => {
                    if (baby.completedActivityIds.includes(item.id)) return;
                    const nextBaby = {
                      ...baby,
                      completedActivityIds: [...baby.completedActivityIds, item.id],
                    };
                    setBaby(nextBaby);
                    saveBaby(nextBaby);
                    setDoneCards((current) => [item, ...current.filter((card) => card.id !== item.id)]);
                    void ask(transcript, { baby: nextBaby });
                  }}
                />
              ))}
              {doneCards.length > 0 ? (
                <>
                  <h2 className="section-title">Already done</h2>
                  {doneCards.map((activity) => (
                    <ActivityCard key={activity.id} activity={activity} done />
                  ))}
                </>
              ) : null}
            </section>
          ) : null}

          {showReply ? (
            <article className="reply">
              <h3>{response?.skillUsed ? titleFromName(response.skillUsed) : "SkillMama"}</h3>
              <p>{response?.reply}</p>
            </article>
          ) : null}

          {!thinking && response && response.mode !== "use" && response.reply ? (
            <p className="hint">{response.reply}</p>
          ) : null}

          {!thinking && response?.learnPrompt ? <p className="learn">{response.learnPrompt}</p> : null}

          {!thinking && response?.mode === "create" ? (
            <SkillBuilder
              mode="create"
              questions={questions}
              draft={null}
              answers={answers}
              busy={thinking}
              onDraft={(next) => {
                setAnswers(next);
                void ask(transcript, { builderAnswers: next });
              }}
              onSave={() => undefined}
            />
          ) : null}

          {!thinking && response?.mode === "draft" && draft ? (
            <SkillBuilder
              mode="draft"
              questions={[]}
              draft={draft}
              answers={answers}
              busy={thinking}
              onDraft={() => undefined}
              onSave={(markdown) => {
                const card = cardFromMarkdown(markdown);
                const nextSkills = upsertMomSkill(momSkills, card);
                setMomSkills(nextSkills);
                saveSkills(nextSkills);
                void ask("Help me figure out emotional development for my kid.", {
                  momSkills: nextSkills,
                  builderAnswers: null,
                });
              }}
            />
          ) : null}

          <LibraryList skills={cards} highlightName={momSkills[0]?.name} />

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

          <Disclaimer />
          <button type="button" className="start-over" onClick={reset}>
            Start over
          </button>
        </div>
      </div>
    </div>
  );
}
