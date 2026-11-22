"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { planDocuments, requiredDocs } from "@/lib/engine/docGraph";
import { evalAll } from "@/lib/engine/evaluate";
import type { DocumentDef, Profile, Scheme } from "@/lib/engine/types";
import { useLocal } from "@/lib/useLocal";

type Lang = "en" | "te";

type Loaded = {
  candidates: Scheme[];
  documents: Record<string, DocumentDef>;
};

type Strings = {
  title: string;
  loading: string;
  empty: string;
  disclaimerHead: string;
  disclaimer: string;
  where: string;
  typicalTime: string;
  fee: string;
  needsFirst: string;
  needsNothing: string;
  unlocks: (n: number) => string;
  iHaveThis: string;
  haveSection: string;
  tip: string;
  feeTotal: string;
  longest: string;
  sumDays: string;
  estimate: string;
  days: string;
  schemesHeading: string;
  docsHeading: string;
  print: string;
  copy: string;
  copied: string;
  copyFailed: string;
  back: string;
  langLabel: string;
  summaryTitle: string;
};

const L: Record<Lang, Strings> = {
  en: {
    title: "Documents to collect, in order",
    loading: "Loading...",
    empty:
      "No documents are needed for your likely schemes, or you already have them.",
    disclaimerHead: "Likely eligible, never guaranteed.",
    disclaimer:
      "These are likely matches based on your answers. Confirm with the official office before you apply.",
    where: "Where",
    typicalTime: "Typical time",
    fee: "Fee",
    needsFirst: "Needs first",
    needsNothing: "Needs nothing first",
    unlocks: (n) => `Unlocks ${n} scheme(s) now`,
    iHaveThis: "I already have this",
    haveSection: "Documents you already have",
    tip: "Office tip",
    feeTotal: "Total fee for documents you still need",
    longest: "Longest single document time (estimate)",
    sumDays: "All documents, one after another (estimate)",
    estimate: "Estimates only; offices may take longer.",
    days: "days",
    schemesHeading: "Likely schemes",
    docsHeading: "Documents, in order",
    print: "Print",
    copy: "Copy summary",
    copied: "Summary copied",
    copyFailed: "Could not copy. Please select the text and copy it manually.",
    back: "Back to schemes",
    langLabel: "Language",
    summaryTitle: "Your document plan",
  },
  te: {
    title: "సేకరించాల్సిన పత్రాలు, క్రమంలో",
    loading: "లోడ్ అవుతోంది...",
    empty:
      "మీ అవకాశం ఉన్న పథకాలకు ఏ పత్రాలూ అవసరం లేవు, లేదా మీ దగ్గర ఇప్పటికే ఉన్నాయి.",
    disclaimerHead: "అవకాశం ఉంది, హామీ కాదు.",
    disclaimer:
      "మీ జవాబుల ఆధారంగా ఇవి అవకాశం ఉన్న సరిపోలికలు మాత్రమే. దరఖాస్తు చేసే ముందు అధికారిక కార్యాలయంలో నిర్ధారించుకోండి.",
    where: "ఎక్కడ",
    typicalTime: "సాధారణ సమయం",
    fee: "రుసుము",
    needsFirst: "ముందుగా అవసరం",
    needsNothing: "ముందుగా ఏదీ అవసరం లేదు",
    unlocks: (n) => `ఇప్పుడు ${n} పథకం(ల)ను అన్‌లాక్ చేస్తుంది`,
    iHaveThis: "ఇది ఇప్పటికే నా దగ్గర ఉంది",
    haveSection: "మీ దగ్గర ఇప్పటికే ఉన్న పత్రాలు",
    tip: "కార్యాలయ చిట్కా",
    feeTotal: "ఇంకా అవసరమైన పత్రాల మొత్తం రుసుము",
    longest: "అత్యధిక సమయం పట్టే ఒక పత్రం (అంచనా)",
    sumDays: "అన్ని పత్రాలు ఒకదాని తర్వాత ఒకటి (అంచనా)",
    estimate: "ఇవి అంచనాలు మాత్రమే; కార్యాలయాలకు ఎక్కువ సమయం పట్టవచ్చు.",
    days: "రోజులు",
    schemesHeading: "అవకాశం ఉన్న పథకాలు",
    docsHeading: "పత్రాలు, క్రమంలో",
    print: "ముద్రించండి",
    copy: "సారాంశాన్ని కాపీ చేయండి",
    copied: "సారాంశం కాపీ అయింది",
    copyFailed: "కాపీ చేయడం సాధ్యం కాలేదు. దయచేసి పాఠ్యాన్ని ఎంచుకుని మానవీయంగా కాపీ చేయండి.",
    back: "పథకాలకు తిరిగి వెళ్ళండి",
    langLabel: "భాష",
    summaryTitle: "మీ పత్రాల ప్రణాళిక",
  },
};

// Practical office advice only. No eligibility claims.
const TIPS: Record<string, Record<Lang, string>> = {
  ration_card: {
    en: "Carry original ration card and Aadhaar copies to the Mee Seva centre. Ask for a receipt with a reference number.",
    te: "అసలు రేషన్ కార్డు, ఆధార్ కాపీలను మీ సేవ కేంద్రానికి తీసుకెళ్లండి. రిఫరెన్స్ నంబరుతో రసీదు అడగండి.",
  },
  bank_passbook: {
    en: "Take the passbook and a photocopy of its first page. If the passbook is old, ask the branch to update it.",
    te: "పాస్‌బుక్ మరియు దాని మొదటి పేజీ ఫోటోకాపీ తీసుకెళ్లండి. పాత పాస్‌బుక్ అయితే, బ్రాంచ్‌లో అప్‌డేట్ చేయమని అడగండి.",
  },
  income_certificate: {
    en: "Ask the Mee Seva or revenue office which self-declaration form they use. Bring your ration card details with you.",
    te: "మీ సేవ లేదా రెవెన్యూ కార్యాలయంలో ఏ స్వీయ-ప్రకటన ఫారం వాడతారో అడగండి. మీ రేషన్ కార్డు వివరాలు వెంట తీసుకెళ్లండి.",
  },
};

const GENERIC_TIP: Record<Lang, string> = {
  en: "Bring original documents and photocopies. Ask the office for the exact form and any fee receipt.",
  te: "అసలు పత్రాలు మరియు ఫోటోకాపీలు తీసుకెళ్లండి. ఖచ్చితమైన ఫారం మరియు రుసుము రసీదు గురించి కార్యాలయాన్ని అడగండి.",
};

function readStoredProfile(): Profile {
  try {
    return JSON.parse(localStorage.getItem("profile") ?? "{}") as Profile;
  } catch {
    return {};
  }
}

export default function PlanPage() {
  const [lang, setLang] = useLocal<Lang>("lang", "en");
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [haveDocs, setHaveDocs] = useLocal<string[]>("haveDocs", []);
  const [copyState, setCopyState] = useState<"idle" | "ok" | "fail">("idle");

  useEffect(() => {
    fetch("/api/schemes")
      .then((r) => r.json())
      .then(
        (d: {
          schemes: Scheme[];
          documents: DocumentDef[];
        }) => {
          const profile = readStoredProfile();
          const candidates = evalAll(d.schemes, profile)
            .filter(
              (r) =>
                r.verdict === "likely_eligible" || r.verdict === "need_info",
            )
            .map((r) => r.scheme);
          const documents = Object.fromEntries(
            d.documents.map((doc) => [doc.id, doc]),
          );
          setLoaded({ candidates, documents });
        },
      )
      .catch(() => setLoaded({ candidates: [], documents: {} }));
  }, []);

  const steps = useMemo(
    () =>
      loaded ? planDocuments(loaded.candidates, loaded.documents, haveDocs) : [],
    [loaded, haveDocs],
  );

  const candidateDocIds = useMemo(
    () =>
      loaded
        ? [
            ...new Set(
              loaded.candidates.flatMap((s) =>
                requiredDocs(s, loaded.documents),
              ),
            ),
          ]
        : [],
    [loaded],
  );

  const heldDocIds = useMemo(
    () => candidateDocIds.filter((id) => haveDocs.includes(id)),
    [candidateDocIds, haveDocs],
  );

  // Totals cover only the documents still to collect (plan steps exclude held docs).
  const stepDocs = useMemo(
    () =>
      loaded
        ? steps
            .map((s) => loaded.documents[s.docId])
            .filter((d): d is DocumentDef => Boolean(d))
        : [],
    [loaded, steps],
  );
  const feeTotal = stepDocs.reduce((sum, d) => sum + d.fee_inr, 0);
  const longestDays = stepDocs.reduce((max, d) => Math.max(max, d.typical_days), 0);
  const sumDays = stepDocs.reduce((sum, d) => sum + d.typical_days, 0);

  function setHave(docId: string, have: boolean) {
    const updated = have
      ? [...new Set([...haveDocs, docId])]
      : haveDocs.filter((id) => id !== docId);
    setHaveDocs(updated);
  }

  if (loaded === null) {
    return (
      <main className="mx-auto w-full max-w-2xl p-4 sm:p-6 text-lg">
        <p>{L[lang].loading}</p>
      </main>
    );
  }

  const t = L[lang];

  function buildSummary(): string {
    const docsMap = loaded!.documents;
    const lines: string[] = [];
    lines.push(t.summaryTitle);
    lines.push("");
    lines.push(`${t.schemesHeading}:`);
    if (loaded!.candidates.length === 0) {
      lines.push("- -");
    } else {
      for (const s of loaded!.candidates) lines.push(`- ${s.name[lang]}`);
    }
    lines.push("");
    lines.push(`${t.docsHeading}:`);
    if (steps.length === 0) {
      lines.push(`- ${t.empty}`);
    } else {
      steps.forEach((step, i) => {
        const d = docsMap[step.docId];
        if (!d) return;
        lines.push(
          `${i + 1}. ${d.name[lang]} (${t.where}: ${d.where}; ${t.typicalTime}: ${d.typical_days} ${t.days}; ${t.fee}: ₹${d.fee_inr})`,
        );
      });
    }
    lines.push("");
    lines.push(`${t.feeTotal}: ₹${feeTotal}`);
    lines.push(`${t.longest}: ${longestDays} ${t.days}`);
    lines.push(`${t.sumDays}: ${sumDays} ${t.days}`);
    lines.push("");
    lines.push(`${t.disclaimerHead} ${t.disclaimer}`);
    return lines.join("\n");
  }

  async function copySummary() {
    try {
      await navigator.clipboard.writeText(buildSummary());
      setCopyState("ok");
    } catch {
      setCopyState("fail");
    }
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-2xl flex-col gap-6 p-4 sm:p-6 text-lg print:max-w-none print:gap-4 print:p-0">
      <div
        className="flex gap-2 print:hidden"
        role="group"
        aria-label={t.langLabel}
      >
        {(["en", "te"] as const).map((l) => (
          <button
            key={l}
            type="button"
            aria-pressed={lang === l}
            onClick={() => setLang(l)}
            className={`min-h-11 rounded-lg border-2 border-black px-4 py-2 text-lg ${
              lang === l ? "bg-black text-white" : ""
            }`}
          >
            {l === "en" ? "English" : "తెలుగు"}
          </button>
        ))}
      </div>

      <section className="flex flex-col gap-6" aria-label={t.summaryTitle}>
        <h1 className="text-3xl font-bold">{t.title}</h1>

        <div
          role="note"
          className="flex flex-col gap-1 rounded-lg border-2 border-amber-300 bg-amber-50 p-4 text-amber-950"
        >
          <p className="font-semibold text-amber-950">{t.disclaimerHead}</p>
          <p className="text-base text-amber-950">{t.disclaimer}</p>
        </div>

        {steps.length === 0 && <p>{t.empty}</p>}

        <ol className="flex flex-col gap-4">
          {steps.map((step, i) => {
            const doc = loaded.documents[step.docId];
            if (!doc) return null;
            const tip = TIPS[step.docId]?.[lang] ?? GENERIC_TIP[lang];
            return (
              <li
                key={step.docId}
                className="flex flex-col gap-2 rounded-lg border-2 border-zinc-300 p-4 print:break-inside-avoid"
              >
                <h2 className="text-2xl font-semibold">
                  {i + 1}. {doc.name[lang]}
                </h2>
                <p>
                  {t.where}: {doc.where}
                </p>
                <p>
                  {t.typicalTime}: {doc.typical_days} {t.days}
                </p>
                <p>
                  {t.fee}: ₹{doc.fee_inr}
                </p>
                <p className="text-base">
                  {t.needsFirst}:{" "}
                  {doc.requires.length === 0
                    ? t.needsNothing
                    : doc.requires
                        .map((r) => loaded.documents[r]?.name[lang] ?? r)
                        .join(", ")}
                </p>
                <p className="text-base">{t.unlocks(step.unlocksNow)}</p>
                <p className="text-base">
                  <span className="font-semibold">{t.tip}:</span> {tip}
                </p>
                <label className="flex min-h-11 items-center gap-3 text-xl print:hidden">
                  <input
                    type="checkbox"
                    checked={haveDocs.includes(step.docId)}
                    onChange={(e) => setHave(step.docId, e.target.checked)}
                    className="h-6 w-6"
                  />
                  {t.iHaveThis}
                </label>
              </li>
            );
          })}
        </ol>

        {steps.length > 0 && (
          <div className="flex flex-col gap-1 rounded-lg border-2 border-zinc-300 p-4">
            <p>
              {t.feeTotal}: ₹{feeTotal}
            </p>
            <p>
              {t.longest}: {longestDays} {t.days}
            </p>
            <p>
              {t.sumDays}: {sumDays} {t.days}
            </p>
            <p className="text-sm text-zinc-600">{t.estimate}</p>
          </div>
        )}

        {heldDocIds.length > 0 && (
          <section className="flex flex-col gap-3">
            <h2 className="text-2xl font-semibold">{t.haveSection}</h2>
            <ul className="flex flex-col gap-3">
              {heldDocIds.map((docId) => (
                <li
                  key={docId}
                  className="flex flex-col gap-2 rounded-lg border-2 border-zinc-300 p-4"
                >
                  <label className="flex min-h-11 items-center gap-3 text-xl">
                    <input
                      type="checkbox"
                      checked={haveDocs.includes(docId)}
                      onChange={(e) => setHave(docId, e.target.checked)}
                      className="h-6 w-6 print:hidden"
                    />
                    {loaded.documents[docId].name[lang]}
                  </label>
                </li>
              ))}
            </ul>
          </section>
        )}
      </section>

      <div className="flex flex-wrap gap-3 print:hidden">
        <button
          type="button"
          onClick={() => window.print()}
          className="min-h-11 rounded-lg border-2 border-black px-4 py-2 text-lg"
        >
          {t.print}
        </button>
        <button
          type="button"
          onClick={copySummary}
          className="min-h-11 rounded-lg border-2 border-black px-4 py-2 text-lg"
        >
          {t.copy}
        </button>
      </div>
      {copyState !== "idle" && (
        <p role="status" className="print:hidden">
          {copyState === "ok" ? t.copied : t.copyFailed}
        </p>
      )}

      <Link href="/results" className="inline-flex min-h-11 items-center underline print:hidden">
        {t.back}
      </Link>
    </main>
  );
}
