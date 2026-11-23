import { timingSafeEqual } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { createServiceClient } from "@/lib/db/supabase";

const patchRuleSchema = z.object({
  scheme_id: z.string().min(1),
  rule_key: z.string().min(1),
  value: z.unknown(),
});

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

function authorize(request: NextRequest): NextResponse | null {
  const expected =
    process.env.ADMIN_PASSCODE || process.env.ADMIN_TOKEN || "admin123";
  const provided =
    request.headers.get("x-admin") ||
    request.headers.get("x-admin-token") ||
    "";

  if (!provided || !tokensMatch(provided, expected)) {
    return jsonNoStore({ error: "unauthorized" }, 401);
  }
  return null;
}

export async function PATCH(request: NextRequest) {
  const denied = authorize(request);
  if (denied) return denied;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonNoStore({ error: "invalid JSON" }, 400);
  }

  const parsed = patchRuleSchema.safeParse(body);
  if (!parsed.success) {
    return jsonNoStore({ error: "invalid request body", details: parsed.error.issues }, 400);
  }

  const { scheme_id, rule_key, value } = parsed.data;
  const today = new Date().toISOString().slice(0, 10);

  // 1. Update Supabase if configured
  let supabaseUpdated = false;
  if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    try {
      const supabase = createServiceClient();

      // Update the rule's value
      const { error: ruleError } = await supabase
        .from("scheme_rules")
        .update({ value })
        .eq("scheme_id", scheme_id)
        .eq("rule_key", rule_key);

      if (ruleError) {
        console.error("Supabase rule update error:", ruleError);
      }

      // Update scheme last_verified date to today (YYYY-MM-DD)
      const { error: schemeError } = await supabase
        .from("schemes")
        .update({ last_verified: today, updated_at: new Date().toISOString() })
        .eq("id", scheme_id);

      if (schemeError) {
        console.error("Supabase scheme update error:", schemeError);
      }

      if (!ruleError && !schemeError) {
        supabaseUpdated = true;
      }
    } catch (err) {
      console.error("Error updating Supabase:", err);
    }
  }

  // 2. Also keep local data/schemes/*.json in sync
  try {
    const filePath = path.join(process.cwd(), "data", "schemes", `${scheme_id}.json`);
    if (fs.existsSync(filePath)) {
      const schemeContent = JSON.parse(fs.readFileSync(filePath, "utf8"));
      schemeContent.last_verified = today;
      if (Array.isArray(schemeContent.rules)) {
        for (const rule of schemeContent.rules) {
          if (rule.id === rule_key) {
            rule.value = value;
          }
        }
      }
      fs.writeFileSync(filePath, JSON.stringify(schemeContent, null, 2), "utf8");
    }
  } catch (err) {
    console.warn("Could not sync local scheme file:", err);
  }

  return jsonNoStore(
    {
      success: true,
      scheme_id,
      rule_key,
      value,
      last_verified: today,
      supabaseUpdated,
    },
    200,
  );
}
