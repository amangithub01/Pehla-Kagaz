"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { planDocuments } from "@/lib/engine/docGraph";
import {
  evalAll,
  reasonLine,
  verdictLabel,
  type SchemeResult,
} from "@/lib/engine/evaluate";
import type { DocumentDef, Profile, Scheme } from "@/lib/engine/types";
import { useLocal } from "@/lib/useLocal";

type Lang = "en" | "te";
type Data = { schemes: Scheme[]; documents: DocumentDef[] };

const SYMBOL = { pass: "✓", fail: "✗", unknown: "?" } as const;

const L = {
  en: {
    title: "Your schemes",
    disclaimerHead: "Likely eligible, never guaranteed.",
    disclaimer:
      "Scheme rules have not yet been checked against official sources, so all scheme data is unverified. Confirm with the official office before you apply.",
    why: "Why this result?",
    official: "Official page",
    lastVerified: "Last verified",
    docsTitle: "Documents to collect, in order",
    where: "Where",
    loading: "Loading...",
    change: "Change my answers",
    langLabel: "Language",
    emptyEn:
      "No likely or possible schemes found yet. Check your answers on the Ask page and try again.",
    emptyTe:
      "ప్రస్తుతం అర్హత ఉన్న లేదా మరింత సమాచారం అవసరమైన పథకాలు కనబడలేదు. ప్రశ్నల పేజీలో మీ జవాబులను తనిఖీ చేసి మళ్ళీ ప్రయత్నించండి.",
  },
  te: {
    title: "మీ పథకాలు",
    disclaimerHead: "అవకాశం ఉంది, హామీ కాదు.",
    disclaimer:
      "పథకాల నియమాలను ఇంకా అధికారిక మూలాలతో తనిఖీ చేయలేదు, కాబట్టి పథకాల సమాచారం ధృవీకరించబడలేదు. దరఖాస్తు చేసే ముందు అధికారిక కార్యాలయంలో నిర్ధారించుకోండి.",
    why: "ఈ ఫలితం ఎందుకు?",
    official: "అధికారిక పేజీ",
    lastVerified: "చివరిగా ధృవీకరించబడినది",
    docsTitle: "ముందుగా సేకరించాల్సిన పత్రాలు",
    where: "ఎక్కడ",
    loading: "లోడ్ అవుతోంది...",
    change: "నా జవాబులు మార్చండి",
    langLabel: "భాష",
    emptyEn:
      "No likely or possible schemes found yet. Check your answers on the Ask page and try again.",
    emptyTe:
      "ప్రస్తుతం అర్హత ఉన్న లేదా మరింత సమాచారం అవసరమైన పథకాలు కనబడలేదు. ప్రశ్నల పేజీలో మీ జవాబులను తనిఖీ చేసి మళ్ళీ ప్రయత్నించండి.",
  },
} as const;

function ResultCard({ r, lang }: { r: SchemeResult; lang: Lang }) {
  const { scheme } = r;
  return (
    <article className="flex flex-col gap-2 rounded-lg border-2 border-zinc-300 p-4">
      <h3 className="text-2xl font-semibold">{scheme.name[lang]}</h3>
      <p>{scheme.benefit[lang]}</p>
      <p className="font-semibold">{verdictLabel[r.verdict][lang]}</p>
      <details>
        <summary className="block min-h-11 cursor-pointer py-2 underline">{L[lang].why}</summary>
        <ul className="mt-2 flex flex-col gap-1 text-base">
          {r.checks.map((c) => (
            <li key={c.rule.id}>
              <span aria-hidden="true">{SYMBOL[c.status]}</span>{" "}
              {reasonLine(c, lang)}
            </li>
          ))}
        </ul>
      </details>
      {scheme.source_url && (
        <a
          href={scheme.source_url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-h-11 items-center underline"
        >
          {L[lang].official}
        </a>
      )}
      <p className="text-sm text-zinc-600">
        {L[lang].lastVerified}: {scheme.last_verified}
      </p>
    </article>
  );
}

export default function ResultsPage() {
  const [lang, setLang] = useLocal<Lang>("lang", "en");
  const [profile] = useLocal<Profile>("profile", {});
  const [data, setData] = useState<Data | null>(null);

  useEffect(() => {
    fetch("/api/schemes")
      .then((r) => r.json())
      .then((d: Data) => setData(d))
      .catch(() => setData({ schemes: [], documents: [] }));
  }, []);

  const results = useMemo(
    () => (data ? evalAll(data.schemes, profile) : []),
    [data, profile],
  );

  if (data === null) {
    return (
      <main className="mx-auto w-full max-w-2xl p-4 sm:p-6 text-lg">
        <p>{L[lang].loading}</p>
      </main>
    );
  }

  const t = L[lang];
  const docsMap: Record<string, DocumentDef> = Object.fromEntries(
    data.documents.map((d) => [d.id, d]),
  );
  const candidates = results
    .filter((r) => r.verdict !== "not_eligible")
    .map((r) => r.scheme);
  const docSteps = planDocuments(candidates, docsMap, []);
  const hasCandidates = candidates.length > 0;

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-2xl flex-col gap-6 p-4 sm:p-6 text-lg">
      <div className="flex gap-2" role="group" aria-label={t.langLabel}>
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

      <h1 className="text-3xl font-bold">{t.title}</h1>

      <div
        role="note"
        className="flex flex-col gap-1 rounded-lg bg-amber-50 p-4 text-amber-950"
      >
        <p className="font-semibold text-amber-950">{t.disclaimerHead}</p>
        <p className="text-base text-amber-950">{t.disclaimer}</p>
      </div>

      {!hasCandidates && (
        <div className="flex flex-col gap-1">
          <p>{t.emptyEn}</p>
          <p>{t.emptyTe}</p>
        </div>
      )}

      <div className="flex flex-col gap-4">
        {results.map((r) => (
          <ResultCard key={r.scheme.id} r={r} lang={lang} />
        ))}
      </div>

      {docSteps.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="text-2xl font-bold">{t.docsTitle}</h2>
          <ol className="flex flex-col gap-3">
            {docSteps.map((step, i) => {
              const doc = docsMap[step.docId];
              return (
                <li
                  key={step.docId}
                  className="flex flex-col gap-1 rounded-lg border-2 border-zinc-300 p-3"
                >
                  <span className="font-semibold">
                    {i + 1}. {doc.name[lang]}
                  </span>
                  <span className="text-base">
                    {t.where}: {doc.where}
                  </span>
                </li>
              );
            })}
          </ol>
        </section>
      )}

      <Link href="/ask" className="inline-flex min-h-11 items-center underline">
        {t.change}
      </Link>
    </main>
  );
}
