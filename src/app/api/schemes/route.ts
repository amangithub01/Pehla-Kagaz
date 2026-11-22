import { NextResponse } from "next/server";
import fs from "node:fs";
import path from "node:path";
import { createServiceClient } from "../../../lib/db/supabase";
import type { DocumentDef, Rule, Scheme } from "../../../lib/engine/types";

type Catalogue = { schemes: Scheme[]; documents: DocumentDef[] };

type SchemeRow = {
  id: string;
  name: Scheme["name"];
  level: Scheme["level"];
  department: string;
  benefit: Scheme["benefit"];
  fee_inr: number;
  apply_steps: Scheme["apply_steps"];
  apply_url: string;
  source_url: string;
  last_verified: string;
  deadline: string | null;
  followup_days: number;
};

type RuleRow = {
  scheme_id: string;
  rule_key: string;
  field: Rule["field"];
  op: Rule["op"];
  value: unknown;
  explain: Rule["explain"];
  source_clause: string;
};

type SchemeDocRow = { scheme_id: string; document_id: string };

type DocumentRow = {
  id: string;
  name: DocumentDef["name"];
  issued_by: string;
  obtained_at: string;
  fee_inr: number;
  typical_days: number;
  validity_months: number | null;
  source_url: string;
  last_verified: string;
};

type DocReqRow = { document_id: string; requires_id: string };

// Reads the catalogue from Supabase. Returns null on any failure, missing
// config, or empty result, so the caller can fall back to data/.
async function loadFromSupabase(): Promise<Catalogue | null> {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return null;
  }
  try {
    const supabase = createServiceClient();
    const [schemesRes, rulesRes, schemeDocsRes, docsRes, reqsRes] =
      await Promise.all([
        supabase.from("schemes").select("*").order("id"),
        supabase.from("scheme_rules").select("*").order("id"),
        supabase.from("scheme_documents").select("*"),
        supabase.from("documents").select("*").order("id"),
        supabase.from("document_requirements").select("*"),
      ]);

    for (const res of [schemesRes, rulesRes, schemeDocsRes, docsRes, reqsRes]) {
      if (res.error) return null;
    }

    const schemeRows = (schemesRes.data ?? []) as SchemeRow[];
    const ruleRows = (rulesRes.data ?? []) as RuleRow[];
    const schemeDocRows = (schemeDocsRes.data ?? []) as SchemeDocRow[];
    const documentRows = (docsRes.data ?? []) as DocumentRow[];
    const reqRows = (reqsRes.data ?? []) as DocReqRow[];

    if (schemeRows.length === 0 || documentRows.length === 0) return null;

    const schemes: Scheme[] = schemeRows.map((s) => ({
      id: s.id,
      name: s.name,
      level: s.level,
      department: s.department,
      benefit: s.benefit,
      fee_inr: s.fee_inr,
      rules: ruleRows
        .filter((r) => r.scheme_id === s.id)
        .map((r) => ({
          id: r.rule_key,
          field: r.field,
          op: r.op,
          value: r.value,
          explain: r.explain,
          source_clause: r.source_clause,
        })),
      documents: schemeDocRows
        .filter((d) => d.scheme_id === s.id)
        .map((d) => d.document_id),
      apply_steps: s.apply_steps,
      apply_url: s.apply_url,
      source_url: s.source_url,
      last_verified: s.last_verified,
      deadline: s.deadline,
      followup_days: s.followup_days,
    }));

    const documents: DocumentDef[] = documentRows.map((d) => {
      const doc: DocumentDef = {
        id: d.id,
        name: d.name,
        issued_by: d.issued_by,
        where: d.obtained_at,
        fee_inr: d.fee_inr,
        typical_days: d.typical_days,
        requires: reqRows
          .filter((r) => r.document_id === d.id)
          .map((r) => r.requires_id),
        source_url: d.source_url,
        last_verified: d.last_verified,
      };
      if (d.validity_months !== null) doc.validity_months = d.validity_months;
      return doc;
    });

    return { schemes, documents };
  } catch {
    return null;
  }
}

// Fallback: the original JSON reads from data/.
function loadFromDisk(): Catalogue {
  const dataDir = path.join(process.cwd(), "data");
  const schemesDir = path.join(dataDir, "schemes");

  const schemes = fs
    .readdirSync(schemesDir)
    .filter((f) => f.endsWith(".json"))
    .map((f) => JSON.parse(fs.readFileSync(path.join(schemesDir, f), "utf8")));
  const documents = JSON.parse(
    fs.readFileSync(path.join(dataDir, "documents.json"), "utf8"),
  );

  return { schemes, documents };
}

export async function GET() {
  const headers = { "Cache-Control": "no-store" };

  const fromDb = await loadFromSupabase();
  if (fromDb) {
    return NextResponse.json(fromDb, { headers });
  }

  try {
    const { schemes, documents } = loadFromDisk();
    return NextResponse.json({ schemes, documents }, { headers });
  } catch {
    return NextResponse.json(
      { error: "Could not load schemes." },
      { status: 500, headers },
    );
  }
}
