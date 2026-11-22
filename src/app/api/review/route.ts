import { timingSafeEqual } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { createServiceClient } from "@/lib/db/supabase";

const actionSchema = z.object({
  id: z.number().int().positive(),
  action: z.enum(["approve", "dismiss"]),
});

type QueueRow = {
  id: number;
  scheme_id: string;
  source_url: string;
  new_hash: string;
  status: string;
};

function jsonNoStore(body: unknown, status: number) {
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

function tokensMatch(provided: string, expected: string): boolean {
  const a = Buffer.from(provided, "utf8");
  const b = Buffer.from(expected, "utf8");
  return a.length === b.length && timingSafeEqual(a, b);
}

/** Returns an error response when the caller is not an authorised admin, else null. */
function authorize(request: NextRequest): NextResponse | null {
  const expected = process.env.ADMIN_TOKEN;
  if (!expected) {
    return jsonNoStore({ error: "review disabled" }, 503);
  }
  const provided = request.headers.get("x-admin-token") ?? "";
  if (!provided || !tokensMatch(provided, expected)) {
    return jsonNoStore({ error: "unauthorized" }, 401);
  }
  return null;
}

export async function GET(request: NextRequest) {
  const denied = authorize(request);
  if (denied) return denied;

  try {
    const supabase = createServiceClient();
    const { data, error } = await supabase
      .from("review_queue")
      .select("id, scheme_id, source_url, old_hash, new_hash, created_at")
      .eq("status", "pending")
      .order("created_at", { ascending: true });
    if (error) throw error;
    return jsonNoStore({ items: data ?? [] }, 200);
  } catch {
    return jsonNoStore({ error: "review unavailable" }, 503);
  }
}

export async function POST(request: NextRequest) {
  const denied = authorize(request);
  if (denied) return denied;

  let parsed;
  try {
    parsed = actionSchema.safeParse(await request.json());
  } catch {
    return jsonNoStore({ error: "invalid request" }, 400);
  }
  if (!parsed.success) {
    return jsonNoStore({ error: "invalid request" }, 400);
  }
  const { id, action } = parsed.data;

  try {
    const supabase = createServiceClient();

    const { data: found, error: readError } = await supabase
      .from("review_queue")
      .select("id, scheme_id, source_url, new_hash, status")
      .eq("id", id)
      .maybeSingle();
    if (readError) throw readError;
    const row = found as QueueRow | null;
    if (!row) {
      return jsonNoStore({ error: "not found" }, 404);
    }
    // Only pending items can be resolved, so an old approval cannot overwrite a snapshot.
    if (row.status !== "pending") {
      return jsonNoStore({ error: "already resolved" }, 409);
    }

    const resolvedAt = new Date().toISOString();
    const status = action === "approve" ? "approved" : "dismissed";

    const { data: updated, error: updateError } = await supabase
      .from("review_queue")
      .update({ status, resolved_at: resolvedAt })
      .eq("id", id)
      .eq("status", "pending")
      .select("id")
      .maybeSingle();
    if (updateError) throw updateError;
    if (!updated) {
      return jsonNoStore({ error: "already resolved" }, 409);
    }

    // Approval records the new hash as the reviewed baseline. It never edits scheme rules.
    if (action === "approve") {
      const { error: snapshotError } = await supabase
        .from("source_snapshots")
        .upsert(
          {
            scheme_id: row.scheme_id,
            source_url: row.source_url,
            content_hash: row.new_hash,
            fetched_at: resolvedAt,
          },
          { onConflict: "scheme_id" },
        );
      if (snapshotError) throw snapshotError;
    }

    return jsonNoStore({ id, status }, 200);
  } catch {
    return jsonNoStore({ error: "review unavailable" }, 503);
  }
}
