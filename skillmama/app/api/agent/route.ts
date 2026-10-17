// Claude when ANTHROPIC_API_KEY is set, otherwise the local demo brain.
// Both return the same JSON. The page repeats the demo brain if this route fails.

import { readFileSync } from "node:fs";
import path from "node:path";
import { runAgent } from "../../../lib/agent";
import { normalizeActivities } from "../../../lib/demo-agent";
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

  const result = await runAgent(
    {
      ...body,
      baby: {
        name: body.baby?.name ?? "",
        parentName: body.baby?.parentName ?? "",
        dateOfBirth: body.baby?.dateOfBirth ?? "",
        ageMonths: body.baby?.ageMonths ?? 0,
        materials: body.baby?.materials ?? "",
        minutesAvailable: body.baby?.minutesAvailable ?? 20,
        completedActivityIds: Array.isArray(body.baby?.completedActivityIds) ? body.baby.completedActivityIds : [],
      },
    },
    {
      activities: normalizeActivities(parsed),
      exampleMarkdown: readText("data/emotional-development-example.md"),
      safetyMarkdown: readText("skills/_safety.md"),
      seedMarkdown: readText("skills/montessori-activity-finder.md"),
    },
  );

  return Response.json(result);
}
