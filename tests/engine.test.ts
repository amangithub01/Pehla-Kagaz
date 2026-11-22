import { describe, it, expect } from "vitest";
import { evalScheme, evalAll } from "../src/lib/engine/evaluate";
import { planDocuments, requiredDocs } from "../src/lib/engine/docGraph";
import { compareNames } from "../src/lib/engine/preflight";
import { scrub } from "../src/lib/engine/scrub";
import type { DocumentDef, Rule, Scheme } from "../src/lib/engine/types";

const base = {
  department: "Test Dept",
  level: "central" as const,
  benefit: { en: "Benefit", te: "ప్రయోజనం" },
  fee_inr: 0,
  apply_steps: [],
  apply_url: "",
  source_url: "",
  last_verified: "2026-01-01",
};

function makeRule(id: string, field: Rule["field"], op: Rule["op"], value: unknown): Rule {
  return {
    id,
    field,
    op,
    value,
    explain: { en: `${id} rule`, te: `${id} నియమం` },
    source_clause: "test",
  };
}

function makeScheme(id: string, rules: Rule[], documents: string[] = []): Scheme {
  return {
    ...base,
    id,
    name: { en: `Scheme ${id}`, te: `పథకం ${id}` },
    rules,
    documents,
  };
}

function makeDoc(id: string, requires: string[] = []): DocumentDef {
  return {
    ...base,
    id,
    name: { en: id, te: id },
    issued_by: "Test Authority",
    where: "CSC",
    fee_inr: 0,
    typical_days: 10,
    requires,
    source_url: "",
    last_verified: "2026-01-01",
  };
}

describe("evaluate", () => {
  const scheme = makeScheme("S1", [
    makeRule("age", "age", "between", [18, 40]),
    makeRule("income", "monthly_income", "lte", 15000),
  ]);

  it("returns likely_eligible when all rules pass", () => {
    const r = evalScheme(scheme, { age: 30, monthly_income: 10000 });
    expect(r.verdict).toBe("likely_eligible");
    expect(r.missingFields).toEqual([]);
  });

  it("returns not_eligible when any rule fails", () => {
    const r = evalScheme(scheme, { age: 50, monthly_income: 10000 });
    expect(r.verdict).toBe("not_eligible");
  });

  it("returns need_info with missing monthly_income", () => {
    const r = evalScheme(scheme, { age: 30 });
    expect(r.verdict).toBe("need_info");
    expect(r.missingFields).toEqual(["monthly_income"]);
  });

  it("flips verdict when the income rule value is edited", () => {
    const profile = { age: 30, monthly_income: 14000 };
    expect(evalScheme(scheme, profile).verdict).toBe("likely_eligible");

    const edited = makeScheme("S1", [
      makeRule("age", "age", "between", [18, 40]),
      makeRule("income", "monthly_income", "lte", 12000),
    ]);
    expect(evalScheme(edited, profile).verdict).toBe("not_eligible");
  });

  it("evalAll sorts likely_eligible first", () => {
    const results = evalAll(
      [scheme, makeScheme("S2", [makeRule("age", "age", "gte", 60)])],
      { age: 30, monthly_income: 10000 },
    );
    expect(results[0].scheme.id).toBe("S1");
    expect(results[1].verdict).toBe("not_eligible");
  });
});

describe("docGraph", () => {
  const docs: Record<string, DocumentDef> = {
    ration_card: makeDoc("ration_card"),
    bank_passbook: makeDoc("bank_passbook"),
    income_certificate: makeDoc("income_certificate", ["ration_card"]),
  };
  const A = makeScheme("A", [], ["income_certificate"]);
  const B = makeScheme("B", [], ["income_certificate", "bank_passbook"]);
  const C = makeScheme("C", [], ["bank_passbook"]);

  it("requiredDocs includes transitive prerequisites", () => {
    expect(requiredDocs(A, docs).sort()).toEqual(
      ["income_certificate", "ration_card"].sort(),
    );
  });

  it("orders documents so the most-unlocking doc comes first", () => {
    const plan = planDocuments([A, B, C], docs, []);
    expect(plan.map((p) => p.docId)).toEqual([
      "bank_passbook",
      "ration_card",
      "income_certificate",
    ]);
    expect(plan[0].unlocksNow).toBe(1);
    expect(plan[0].neededBy).toBe(2);
  });

  it("skips documents the applicant already holds", () => {
    const plan = planDocuments([A, B, C], docs, ["ration_card"]);
    const ids = plan.map((p) => p.docId);
    expect(ids).not.toContain("ration_card");
    expect(ids).toContain("income_certificate");
    expect(ids).toContain("bank_passbook");
  });
});

describe("compareNames", () => {
  it("treats case and extra spaces as an exact match", () => {
    expect(compareNames("Ramesh Kumar", "ramesh  kumar")).toEqual({
      match: true,
      reason: "exact",
    });
  });

  it("does not match initial vs full given name (engine returns different)", () => {
    // Engine has no "format_differs" reason; abbreviations fail token matching.
    expect(compareNames("K. Ramesh", "Kandula Ramesh").match).toBe(false);
  });

  it("matches a one-letter spelling difference (engine returns close)", () => {
    expect(compareNames("Ramesh", "Ramesha")).toEqual({
      match: true,
      reason: "close",
    });
  });

  it("flags different names (Ramesh vs Lakshmi is a mismatch)", () => {
    expect(compareNames("Ramesh", "Lakshmi").match).toBe(false);
  });
});

describe("scrub", () => {
  it("removes an Aadhaar-style number", () => {
    const { clean, removed } = scrub("my number is 1234 5678 9012 and I am 35");
    expect(removed).toBeGreaterThan(0);
    expect(clean).not.toContain("1234");
    expect(clean).toContain("35");
  });
});
