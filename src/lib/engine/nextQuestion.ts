import type { SchemeResult } from "./evaluate";
import type { Profile } from "./types";

export function pickNextField(
  results: SchemeResult[],
  asked: (keyof Profile)[],
): keyof Profile | null {
  const askedSet = new Set<keyof Profile>(asked);
  const weights = new Map<keyof Profile, number>();

  for (const r of results) {
    if (r.verdict === "not_eligible") continue;
    const weight = r.missingFields.length === 1 ? 2 : 1;
    for (const f of r.missingFields) {
      if (askedSet.has(f)) continue;
      weights.set(f, (weights.get(f) ?? 0) + weight);
    }
  }

  let best: keyof Profile | null = null;
  let bestWeight = 0;
  for (const [field, w] of weights) {
    if (w > bestWeight) {
      best = field;
      bestWeight = w;
    }
  }
  return best;
}
