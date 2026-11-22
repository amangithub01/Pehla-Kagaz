import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { NextResponse, type NextRequest } from "next/server";
import { createServiceClient } from "@/lib/db/supabase";
import { hashText, normalizeText } from "@/lib/monitor/hash";

const FETCH_TIMEOUT_MS = 8000;
const USER_AGENT = "ClaimWhatsYoursSourceMonitor/1.0";

type SchemeSource = { id: string; url: string };

function jsonNoStore(body: unknown, status: number) {
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

/** Read data/schemes/*.json; schemes without a non-empty source_url are skipped. */
function loadSchemeSources(): { sources: SchemeSource[]; skipped: number } {
  const dir = path.join(process.cwd(), "data", "schemes");
  const files = readdirSync(dir).filter((f) => f.endsWith(".json"));
  const sources: SchemeSource[] = [];
  let skipped = 0;
  for (const file of files) {
    const raw = JSON.parse(readFileSync(path.join(dir, file), "utf8")) as {
      id?: unknown;
      source_url?: unknown;
    };
    const id = typeof raw.id === "string" ? raw.id : "";
    const url = typeof raw.source_url === "string" ? raw.source_url.trim() : "";
    if (!id || !url) {
      skipped++;
      continue;
    }
    sources.push({ id, url });
  }
  return { sources, skipped };
}

/** Returns the page body, or null when the source is offline (network error or non-OK). */
async function fetchSourceBody(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      headers: { "User-Agent": USER_AGENT },
      cache: "no-store",
    });
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  }
}

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret && request.headers.get("authorization") !== `Bearer ${secret}`) {
    return jsonNoStore({ error: "unauthorized" }, 401);
  }

  try {
    const supabase = createServiceClient();
    const { sources, skipped } = loadSchemeSources();
    let offline = 0;
    let baselined = 0;
    let changed = 0;

    for (const source of sources) {
      const body = await fetchSourceBody(source.url);
      if (body === null) {
        offline++;
        continue;
      }
      const newHash = hashText(normalizeText(body));

      const { data: snapshot, error: snapshotError } = await supabase
        .from("source_snapshots")
        .select("content_hash")
        .eq("scheme_id", source.id)
        .maybeSingle();
      if (snapshotError) throw snapshotError;

      if (!snapshot) {
        const { error } = await supabase.from("source_snapshots").insert({
          scheme_id: source.id,
          source_url: source.url,
          content_hash: newHash,
          fetched_at: new Date().toISOString(),
        });
        if (error) throw error;
        baselined++;
        continue;
      }

      const oldHash = snapshot.content_hash as string;
      if (oldHash === newHash) continue;

      // Do not queue the same pending change twice.
      const { data: pending, error: pendingError } = await supabase
        .from("review_queue")
        .select("id")
        .eq("scheme_id", source.id)
        .eq("new_hash", newHash)
        .eq("status", "pending")
        .limit(1);
      if (pendingError) throw pendingError;
      if (pending && pending.length > 0) continue;

      // The snapshot is intentionally NOT updated here; approval does that.
      const { error: insertError } = await supabase.from("review_queue").insert({
        scheme_id: source.id,
        source_url: source.url,
        old_hash: oldHash,
        new_hash: newHash,
        status: "pending",
      });
      if (insertError) throw insertError;
      changed++;
    }

    return jsonNoStore(
      { checked: sources.length, skipped, offline, baselined, changed },
      200,
    );
  } catch {
    return jsonNoStore({ error: "monitoring unavailable" }, 503);
  }
}
