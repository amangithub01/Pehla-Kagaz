import { createHash } from "node:crypto";

/**
 * Reduce a fetched HTML page to comparable text: drop script/style blocks and
 * tags, collapse whitespace, trim, and lowercase. Cosmetic markup changes then
 * do not count as a source change.
 */
export function normalizeText(html: string): string {
  return html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script\s*>/gi, " ")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style\s*>/gi, " ")
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

/** SHA-256 hex digest of the given text. */
export function hashText(text: string): string {
  return createHash("sha256").update(text, "utf8").digest("hex");
}
