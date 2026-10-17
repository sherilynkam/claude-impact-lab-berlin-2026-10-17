import { readFileSync } from "node:fs";
import path from "node:path";
import { DemoApp } from "../components/DemoApp";
import { normalizeActivities } from "../lib/demo-agent";
import type { Corpus } from "../lib/types";

export const dynamic = "force-dynamic";

function readText(relativePath: string) {
  try {
    return readFileSync(path.join(process.cwd(), relativePath), "utf8");
  } catch {
    return "";
  }
}

export default function Page() {
  let parsed: unknown = [];
  try {
    parsed = JSON.parse(readText("data/activities.json") || "[]");
  } catch {
    parsed = [];
  }

  const corpus: Corpus = {
    activities: normalizeActivities(parsed),
    exampleMarkdown: readText("data/emotional-development-example.md"),
    safetyMarkdown: readText("skills/_safety.md"),
    seedMarkdown: readText("skills/montessori-activity-finder.md"),
  };

  return <DemoApp corpus={corpus} />;
}
