import type { DocumentDef, Scheme } from "./types";

export function requiredDocs(
  scheme: Scheme,
  docsMap: Record<string, DocumentDef>,
): string[] {
  const out = new Set<string>();
  const visit = (id: string) => {
    if (out.has(id)) return;
    const doc = docsMap[id];
    if (!doc) return;
    out.add(id);
    doc.requires.forEach(visit);
  };
  scheme.documents.forEach(visit);
  return [...out];
}

export type PlanItem = {
  docId: string;
  unlocksNow: number;
  neededBy: number;
  score: number;
};

export function planDocuments(
  candidates: Scheme[],
  allDocs: Record<string, DocumentDef>,
  have: string[],
): PlanItem[] {
  const held = new Set(have);
  const needed = new Map<string, Set<string>>();
  for (const s of candidates) {
    for (const d of requiredDocs(s, allDocs)) {
      if (held.has(d)) continue;
      if (!needed.has(d)) needed.set(d, new Set());
      needed.get(d)!.add(s.id);
    }
  }

  const plan: PlanItem[] = [];
  const done = new Set<string>();

  while (true) {
    const items: PlanItem[] = [];
    for (const [docId, schemeIds] of needed) {
      if (done.has(docId)) continue;
      const doc = allDocs[docId];
      // A doc is "available now" when all its prerequisites are held or planned.
      const ready = doc.requires.every((r) => held.has(r) || done.has(r));
      if (!ready) continue;
      const neededBy = schemeIds.size;
      const unlocksNow = candidates.filter((s) => {
        const reqs = requiredDocs(s, allDocs);
        return (
          reqs.includes(docId) &&
          reqs.every((r) => held.has(r) || done.has(r) || r === docId)
        );
      }).length;
      items.push({
        docId,
        unlocksNow,
        neededBy,
        score: unlocksNow * 100 + neededBy * 10 - doc.typical_days / 10,
      });
    }
    if (items.length === 0) break;
    items.sort((a, b) => b.score - a.score);
    plan.push(items[0]);
    done.add(items[0].docId);
  }

  return plan;
}

export function validateGraph(allDocs: Record<string, DocumentDef>): string[] {
  const errors: string[] = [];
  for (const doc of Object.values(allDocs)) {
    for (const r of doc.requires) {
      if (!allDocs[r]) {
        errors.push(`${doc.id} requires unknown document "${r}"`);
      }
    }
  }

  const state = new Map<string, "visiting" | "done">();
  const stack: string[] = [];
  const dfs = (id: string) => {
    const st = state.get(id);
    if (st === "done") return;
    if (st === "visiting") {
      const cycle = [...stack.slice(stack.indexOf(id)), id].join(" -> ");
      errors.push(`loop in document requirements: ${cycle}`);
      return;
    }
    const doc = allDocs[id];
    if (!doc) return;
    state.set(id, "visiting");
    stack.push(id);
    doc.requires.forEach(dfs);
    stack.pop();
    state.set(id, "done");
  };
  Object.keys(allDocs).forEach(dfs);

  return errors;
}
