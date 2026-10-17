// Demo brain for the pitch. No API key required.
// The page uses this route, and repeats the same logic in the browser if the route fails.
// Swap in Claude later; keep runDemoAgent as the fallback so the recording still works.

import { readFileSync } from "node:fs";
import path from "node:path";
import { normalizeActivities, runDemoAgent } from "../../../lib/demo-agent";
import type { AgentRequest } from "../../../lib/types";

function readText(relativePath: string) {
  try {
    return readFileSync(path.join(process.cwd(), relativePath), "utf8");
  } catch {
    return "";
  }
}

export async function POST(request: Request) {
  let body: AgentRequest;
  try {
    body = (await request.json()) as AgentRequest;
  } catch {
    return Response.json({ error: "Send a sentence to start." }, { status: 400 });
  }

  if (!body || typeof body.message !== "string") {
    return Response.json({ error: "Send a sentence to start." }, { status: 400 });
  }

  let parsed: unknown = [];
  try {
    parsed = JSON.parse(readText("data/activities.json") || "[]");
  } catch {
    parsed = [];
  }

  const result = runDemoAgent(body, {
    activities: normalizeActivities(parsed),
    exampleMarkdown: readText("data/emotional-development-example.md"),
    safetyMarkdown: readText("skills/_safety.md"),
    seedMarkdown: readText("skills/montessori-activity-finder.md"),
  });

  return Response.json(result);
}
