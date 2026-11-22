export type NameMatch = {
  match: boolean;
  reason: string;
};

export type Warning = {
  code: string;
  message: string;
};

function norm(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function tokensCompatible(a: string, b: string): boolean {
  const ta = a.split(" ").filter(Boolean);
  const tb = b.split(" ").filter(Boolean);
  if (ta.length === 0 || tb.length === 0) return false;
  // Every token of the shorter name must appear (or be close) in the longer one.
  const [short, long] = ta.length <= tb.length ? [ta, tb] : [tb, ta];
  return short.every((t) => long.some((u) => lev(t, u) <= 2));
}

function lev(a: string, b: string): number {
  const dp: number[] = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    let prev = dp[0];
    dp[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const tmp = dp[j];
      dp[j] =
        a[i - 1] === b[j - 1]
          ? prev
          : 1 + Math.min(prev, dp[j], dp[j - 1]);
      prev = tmp;
    }
  }
  return dp[b.length];
}

export function compareNames(a: string, b: string): NameMatch {
  const na = norm(a);
  const nb = norm(b);
  if (na === nb) return { match: true, reason: "exact" };
  if (tokensCompatible(na, nb) || lev(na, nb) <= 2) {
    return { match: true, reason: "close" };
  }
  return { match: false, reason: "different" };
}

export function certificateExpired(
  issuedYYYYMM: string,
  validityMonths: number,
  today: Date = new Date(),
): boolean {
  const year = Number(issuedYYYYMM.slice(0, 4));
  const month = Number(issuedYYYYMM.slice(4, 6)) - 1;
  const expiry = new Date(year, month + validityMonths, 1);
  return today >= expiry;
}

export type PreflightInput = {
  nameOnDocs: string[];
  nameOnApplicant: string;
  certIssuedYYYYMM?: string;
};

export type PreflightValidity = {
  validityMonths?: number;
};

export function runPreflight(
  input: PreflightInput,
  validity: PreflightValidity = {},
  today: Date = new Date(),
): Warning[] {
  const warnings: Warning[] = [];
  for (const n of input.nameOnDocs) {
    const m = compareNames(n, input.nameOnApplicant);
    if (!m.match) {
      warnings.push({
        code: "name_mismatch",
        message: `Name "${n}" does not match applicant name "${input.nameOnApplicant}".`,
      });
    }
  }
  if (
    input.certIssuedYYYYMM &&
    validity.validityMonths !== undefined &&
    certificateExpired(input.certIssuedYYYYMM, validity.validityMonths, today)
  ) {
    warnings.push({
      code: "certificate_expired",
      message: "The certificate has expired; get a fresh one before applying.",
    });
  }
  return warnings;
}
