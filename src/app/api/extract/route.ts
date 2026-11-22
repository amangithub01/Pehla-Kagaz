import { NextResponse } from "next/server";
import { scrub } from "@/lib/engine/scrub";
import { extractProfile } from "@/lib/llm/extract";

const headers = { "Cache-Control": "no-store" };
const MAX_CHARS = 1500;

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as {
    text?: unknown;
    lang?: unknown;
  } | null;

  if (!body || typeof body.text !== "string" || body.text.trim() === "") {
    return NextResponse.json(
      { error: "text must be a non-empty string" },
      { status: 400, headers },
    );
  }

  // Scrub on the server before any text is extracted or sent to Gemini.
  const { clean, removed } = scrub(body.text.slice(0, MAX_CHARS));

  try {
    const result = await extractProfile(clean);
    return NextResponse.json(
      {
        profile: result.profile,
        state: result.state,
        occupation_note: result.occupation_note,
        source: result.source,
        removed,
      },
      { headers },
    );
  } catch {
    // Never 500: the client keeps the typed form path.
    return NextResponse.json(
      { profile: {}, source: "fallback", removed },
      { headers },
    );
  }
}
