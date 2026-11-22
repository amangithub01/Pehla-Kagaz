// Seeds the Supabase catalogue from data/documents.json and data/schemes/*.json.
// Run via: npm run seed  (tsx --env-file=.env scripts/seed.ts)
// Validation runs BEFORE any database call; a failing graph exits with code 1.

import fs from "node:fs";
import path from "node:path";
import { createServiceClient } from "../src/lib/db/supabase";
import { validateGraph } from "../src/lib/engine/docGraph";
import type { DocumentDef, Scheme } from "../src/lib/engine/types";

const ROOT = process.cwd();
const DOCS_FILE = path.resolve(ROOT, "data", "documents.json");
const SCHEMES_DIR = path.resolve(ROOT, "data", "schemes");

function readJson<T>(file: string): T {
  return JSON.parse(fs.readFileSync(file, "utf8")) as T;
}

function loadCatalogue(): { docs: DocumentDef[]; schemes: Scheme[] } {
  const docs = readJson<DocumentDef[]>(DOCS_FILE);
  const schemeFiles = fs
    .readdirSync(SCHEMES_DIR)
    .filter((f) => f.endsWith(".json"))
    .sort();
  const schemes = schemeFiles.map((f) =>
    readJson<Scheme>(path.join(SCHEMES_DIR, f)),
  );
  return { docs, schemes };
}

function checkCatalogue(docs: DocumentDef[], schemes: Scheme[]): string[] {
  const errors: string[] = [];

  const docMap: Record<string, DocumentDef> = {};
  for (const d of docs) {
    if (docMap[d.id]) errors.push(`duplicate document id "${d.id}"`);
    docMap[d.id] = d;
  }
  errors.push(...validateGraph(docMap));

  const seenSchemes = new Set<string>();
  for (const s of schemes) {
    if (seenSchemes.has(s.id)) errors.push(`duplicate scheme id "${s.id}"`);
    seenSchemes.add(s.id);
    for (const d of s.documents) {
      if (!docMap[d]) {
        errors.push(`scheme ${s.id} references unknown document "${d}"`);
      }
    }
  }
  return errors;
}

function check<T extends { error: { message: string } | null }>(
  label: string,
  result: T,
): void {
  if (result.error) {
    throw new Error(`${label} failed: ${result.error.message}`);
  }
}

async function main(): Promise<void> {
  const { docs, schemes } = loadCatalogue();

  const errors = checkCatalogue(docs, schemes);
  if (errors.length > 0) {
    console.error("Catalogue validation failed:");
    for (const e of errors) console.error(`  - ${e}`);
    process.exit(1);
  }

  // Fail clearly on missing config, without ever printing the values.
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error(
      "SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must both be set (check .env).",
    );
  }
  const supabase = createServiceClient();
  const now = new Date().toISOString();

  // 1. documents (parent of scheme_documents and document_requirements)
  const documentRows = docs.map((d) => ({
    id: d.id,
    name: d.name,
    issued_by: d.issued_by,
    obtained_at: d.where, // JSON "where" -> column obtained_at
    fee_inr: d.fee_inr,
    typical_days: d.typical_days,
    validity_months: d.validity_months ?? null,
    source_url: d.source_url,
    last_verified: d.last_verified,
  }));
  check(
    "upsert documents",
    await supabase.from("documents").upsert(documentRows, { onConflict: "id" }),
  );

  // 2. schemes
  const schemeRows = schemes.map((s) => ({
    id: s.id,
    name: s.name,
    level: s.level,
    department: s.department,
    benefit: s.benefit,
    fee_inr: s.fee_inr,
    apply_steps: s.apply_steps,
    apply_url: s.apply_url,
    source_url: s.source_url,
    last_verified: s.last_verified,
    deadline: s.deadline ?? null,
    followup_days: s.followup_days ?? 30,
    updated_at: now,
  }));
  check(
    "upsert schemes",
    await supabase.from("schemes").upsert(schemeRows, { onConflict: "id" }),
  );

  // 3. scheme_rules: no natural unique key, so delete-then-insert per scheme.
  for (const s of schemes) {
    check(
      `clear scheme_rules for ${s.id}`,
      await supabase.from("scheme_rules").delete().eq("scheme_id", s.id),
    );
    if (s.rules.length > 0) {
      const ruleRows = s.rules.map((r) => ({
        scheme_id: s.id,
        rule_key: r.id, // JSON "id" -> rule_key
        field: r.field,
        op: r.op,
        value: r.value,
        explain: r.explain,
        source_clause: r.source_clause,
      }));
      check(
        `insert scheme_rules for ${s.id}`,
        await supabase.from("scheme_rules").insert(ruleRows),
      );
    }
  }

  // 4. scheme_documents: delete-then-insert per scheme.
  for (const s of schemes) {
    check(
      `clear scheme_documents for ${s.id}`,
      await supabase.from("scheme_documents").delete().eq("scheme_id", s.id),
    );
    if (s.documents.length > 0) {
      const linkRows = s.documents.map((d) => ({
        scheme_id: s.id,
        document_id: d,
      }));
      check(
        `insert scheme_documents for ${s.id}`,
        await supabase.from("scheme_documents").insert(linkRows),
      );
    }
  }

  // 5. document_requirements: delete-then-insert per document (doc.requires[]).
  for (const d of docs) {
    check(
      `clear document_requirements for ${d.id}`,
      await supabase
        .from("document_requirements")
        .delete()
        .eq("document_id", d.id),
    );
  }
  const reqRows = docs.flatMap((d) =>
    d.requires.map((r) => ({ document_id: d.id, requires_id: r })),
  );
  if (reqRows.length > 0) {
    check(
      "insert document_requirements",
      await supabase.from("document_requirements").insert(reqRows),
    );
  }

  console.log(`Upserted ${documentRows.length} documents.`);
  console.log(`Upserted ${schemeRows.length} schemes.`);
}

main().catch((err: unknown) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
