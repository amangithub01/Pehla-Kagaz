import type { Profile, Rule, Scheme } from "./types";

export type Status = "pass" | "fail" | "unknown";
export type Verdict = "likely_eligible" | "need_info" | "not_eligible";

export type CheckResult = {
  rule: Rule;
  status: Status;
  actual: unknown;
};

export type SchemeResult = {
  scheme: Scheme;
  verdict: Verdict;
  checks: CheckResult[];
  missingFields: (keyof Profile)[];
};

const VERDICT_ORDER: Record<Verdict, number> = {
  likely_eligible: 0,
  need_info: 1,
  not_eligible: 2,
};

export const verdictLabel: Record<Verdict, { en: string; te: string }> = {
  likely_eligible: { en: "Likely eligible", te: "అవకాశం ఉంది" },
  need_info: {
    en: "Possibly eligible, need more information",
    te: "మరింత సమాచారం అవసరం",
  },
  not_eligible: { en: "Likely not eligible", te: "అవకాశం లేదు" },
};

export function evalRule(rule: Rule, profile: Profile): Status {
  const actual = profile[rule.field] as unknown;
  if (actual === undefined || actual === null) return "unknown";
  const v = rule.value;
  switch (rule.op) {
    case "eq":
      return actual === v ? "pass" : "fail";
    case "gte":
      return (actual as number) >= (v as number) ? "pass" : "fail";
    case "lte":
      return (actual as number) <= (v as number) ? "pass" : "fail";
    case "between": {
      const [lo, hi] = v as [number, number];
      return (actual as number) >= lo && (actual as number) <= hi
        ? "pass"
        : "fail";
    }
    case "in":
      return (v as unknown[]).includes(actual) ? "pass" : "fail";
    case "not_in":
      return (v as unknown[]).includes(actual) ? "fail" : "pass";
    default:
      return "unknown";
  }
}

export function evalScheme(scheme: Scheme, profile: Profile): SchemeResult {
  const checks: CheckResult[] = scheme.rules.map((rule) => ({
    rule,
    status: evalRule(rule, profile),
    actual: profile[rule.field],
  }));

  const anyFail = checks.some((c) => c.status === "fail");
  const anyUnknown = checks.some((c) => c.status === "unknown");

  const verdict: Verdict = anyFail
    ? "not_eligible"
    : anyUnknown
      ? "need_info"
      : "likely_eligible";

  const missingFields = [
    ...new Set(
      checks.filter((c) => c.status === "unknown").map((c) => c.rule.field),
    ),
  ];

  return { scheme, verdict, checks, missingFields };
}

export function evalAll(schemes: Scheme[], profile: Profile): SchemeResult[] {
  return schemes
    .map((s) => evalScheme(s, profile))
    .sort((a, b) => VERDICT_ORDER[a.verdict] - VERDICT_ORDER[b.verdict]);
}

export function fillExplain(
  text: string,
  rule: Rule,
  actual?: unknown,
): string {
  const v = rule.value;
  let low = "";
  let high = "";
  if (Array.isArray(v)) {
    low = String(v[0] ?? "");
    high = String(v[1] ?? "");
  } else {
    low = String(v ?? "");
    high = low;
  }
  return text
    .replace(/\{low\}/g, low)
    .replace(/\{high\}/g, high)
    .replace(/\{value\}/g, actual === undefined ? "" : String(actual));
}

export function reasonLine(check: CheckResult, lang: "en" | "te"): string {
  const base = fillExplain(check.rule.explain[lang], check.rule, check.actual);
  if (check.status === "unknown") {
    return lang === "te"
      ? `${base} (ఇంకా తెలియదు)`
      : `${base} (not known yet)`;
  }
  return lang === "te"
    ? `${base} (మీరు చెప్పింది: ${String(check.actual)})`
    : `${base} (you said: ${String(check.actual)})`;
}
