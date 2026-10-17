// Person 2 — Whisper. See worksplit.md Role 2.
// POST multipart/form-data, field name "audio" → { text: string }

export async function POST() {
  return Response.json(
    { error: "Not implemented yet. Person 2 builds this route." },
    { status: 501 },
  );
}
