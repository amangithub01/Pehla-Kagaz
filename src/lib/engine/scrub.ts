const PATTERNS: RegExp[] = [
  /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g, // 12-digit Aadhaar-style ID
  /\b[A-Z]{5}\d{4}[A-Z]\b/g, // PAN
  /\b\d{9,}\b/g, // long digit runs (account / ration numbers)
];

export function scrub(text: string): { clean: string; removed: number } {
  let clean = text;
  let removed = 0;
  for (const re of PATTERNS) {
    clean = clean.replace(re, () => {
      removed++;
      return "[removed]";
    });
  }
  return { clean, removed };
}
