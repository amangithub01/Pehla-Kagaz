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
    title: "Eligible Government Schemes",
    subtitle: "Matched against official government rules based on your profile",
    why: "Rule-by-rule eligibility breakdown",
    applyPortal: "Apply on Official Portal ↗",
    officialSource: "Official Guidelines / Source ↗",
    viewPlan: "View Document Plan →",
    lastVerified: "Verified as of",
    docsTitle: "Documents to collect, in order",
    where: "Where",
    loading: "Evaluating your eligibility against official schemes...",
    change: "← Change my answers",
    emptyEn:
      "No likely or possible schemes found yet. Check your answers on the questions page and try again.",
    emptyTe:
      "ప్రస్తుతం అర్హత ఉన్న లేదా మరింత సమాచారం అవసరమైన పథకాలు కనబడలేదు. ప్రశ్నల పేజీలో మీ జవాబులను తనిఖీ చేసి మళ్ళీ ప్రయత్నించండి.",
    footerDisclaimer:
      "Likely eligible, not guaranteed. Final approval rests with the sanctioning government department and CSC verification.",
  },
  te: {
    title: "అర్హత ఉన్న ప్రభుత్వ పథకాలు",
    subtitle: "మీ సమాచారం ఆధారంగా అధికారిక ప్రభుత్వ నియమాలతో సరిపోల్చబడింది",
    why: "నియమాల వారీగా అర్హత వివరాలు",
    applyPortal: "అధికారిక పోర్టల్‌లో దరఖాస్తు చేయండి ↗",
    officialSource: "అధికారిక మార్గదర్శకాలు / మూలం ↗",
    viewPlan: "పత్రాల ప్రణాళికను చూడండి →",
    lastVerified: "ధృవీకరించబడిన తేదీ",
    docsTitle: "ముందుగా సేకరించాల్సిన పత్రాలు",
    where: "ఎక్కడ",
    loading: "అధికారిక పథకాలతో మీ అర్హతను లెక్కిస్తోంది...",
    change: "← నా జవాబులు మార్చండి",
    emptyEn:
      "No likely or possible schemes found yet. Check your answers on the questions page and try again.",
    emptyTe:
      "ప్రస్తుతం అర్హత ఉన్న లేదా మరింత సమాచారం అవసరమైన పథకాలు కనబడలేదు. ప్రశ్నల పేజీలో మీ జవాబులను తనిఖీ చేసి మళ్ళీ ప్రయత్నించండి.",
    footerDisclaimer:
      "అర్హత అవకాశం ఉంది, హామీ కాదు. తుది ఆమోదం సంబంధిత ప్రభుత్వ శాఖ మరియు మీసేవ ధృవీకరణపై ఆధారపడి ఉంటుంది.",
  },
} as const;

function ResultCard({ r, lang }: { r: SchemeResult; lang: Lang }) {
  const { scheme } = r;
  const targetUrl = scheme.apply_url || scheme.source_url || "#";
  const isLikely = r.verdict === "likely_eligible";
  const isNeedInfo = r.verdict === "need_info";

  return (
    <article
      className={`flex flex-col gap-3 rounded-xl border p-5 shadow-xs transition hover:shadow-md bg-white ${
        isLikely
          ? "border-green-300 ring-1 ring-green-100"
          : isNeedInfo
          ? "border-blue-200"
          : "border-gray-200 opacity-80"
      }`}
    >
      {/* Header with Clickable Title */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
        <div>
          <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-500 block">
            {scheme.department} • {scheme.level}
          </span>
          <a
            href={targetUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xl font-bold text-gray-900 hover:text-blue-600 transition inline-flex items-center gap-1.5 group"
          >
            <span>{scheme.name[lang] || scheme.name.en}</span>
            <span className="text-gray-400 group-hover:text-blue-600 text-sm">↗</span>
          </a>
        </div>

        <span
          className={`self-start px-3 py-1 rounded-full text-xs font-semibold ${
            isLikely
              ? "bg-green-100 text-green-800 border border-green-200"
              : isNeedInfo
              ? "bg-blue-100 text-blue-800 border border-blue-200"
              : "bg-gray-100 text-gray-700 border border-gray-200"
          }`}
        >
          {verdictLabel[r.verdict][lang]}
        </span>
      </div>

      <p className="text-sm text-gray-700 leading-relaxed">
        {scheme.benefit[lang] || scheme.benefit.en}
      </p>

      {/* Rule Breakdown */}
      <details className="text-sm text-gray-800 bg-gray-50 rounded-lg p-3 border border-gray-100">
        <summary className="cursor-pointer font-medium text-blue-700 hover:text-blue-800 py-0.5 select-none">
          {L[lang].why}
        </summary>
        <ul className="mt-2.5 flex flex-col gap-2 pt-2 border-t border-gray-200 text-xs">
          {r.checks.map((c) => (
            <li
              key={c.rule.id}
              className={`flex items-start gap-2 ${
                c.status === "pass"
                  ? "text-green-900"
                  : c.status === "fail"
                  ? "text-red-900"
                  : "text-gray-700"
              }`}
            >
              <span className="font-bold text-sm leading-none" aria-hidden="true">
                {SYMBOL[c.status]}
              </span>
              <span>{reasonLine(c, lang)}</span>
            </li>
          ))}
        </ul>
      </details>

      {/* Action Buttons & Links Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-gray-100 text-xs">
        <div className="flex flex-wrap items-center gap-2">
          {scheme.apply_url && (
            <a
              href={scheme.apply_url}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition inline-flex items-center gap-1 shadow-xs"
            >
              <span>{L[lang].applyPortal}</span>
            </a>
          )}
          {scheme.source_url && (
            <a
              href={scheme.source_url}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-lg transition inline-flex items-center gap-1"
            >
              <span>{L[lang].officialSource}</span>
            </a>
          )}
        </div>

        <Link
          href="/plan"
          className="text-blue-600 hover:text-blue-800 font-semibold inline-flex items-center gap-1 ml-auto"
        >
          <span>{L[lang].viewPlan}</span>
        </Link>
      </div>

      <div className="text-[11px] text-gray-400 pt-0.5">
        {L[lang].lastVerified}: <span className="font-mono">{scheme.last_verified}</span>
      </div>
    </article>
  );
}

export default function ResultsPage() {
  const [lang] = useLocal<Lang>("lang", "en");
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
      <main className="mx-auto w-full max-w-3xl p-6 text-center text-gray-500 py-24">
        <p className="text-base">{L[lang].loading}</p>
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
    <main className="mx-auto flex min-h-screen w-full max-w-4xl flex-col gap-6 p-4 sm:p-6 lg:p-8">
      {/* Clean Summary Banner replacing the large yellow warning */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900">
            {t.title}
          </h1>
          <p className="text-xs sm:text-sm text-gray-600 mt-1 flex items-center gap-1.5">
            <span className="text-green-600 font-bold">✓</span>
            <span>{t.subtitle}</span>
          </p>
        </div>

        <Link
          href="/plan"
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs sm:text-sm font-semibold transition shrink-0 shadow-xs"
        >
          {t.viewPlan}
        </Link>
      </div>

      {!hasCandidates && (
        <div className="bg-white p-8 rounded-xl border border-gray-200 text-center text-gray-600">
          <p>{t.emptyEn}</p>
          <p className="mt-2">{t.emptyTe}</p>
        </div>
      )}

      {/* Scheme Cards */}
      <div className="flex flex-col gap-4">
        {results.map((r) => (
          <ResultCard key={r.scheme.id} r={r} lang={lang} />
        ))}
      </div>

      {/* Document Plan Summary */}
      {docSteps.length > 0 && (
        <section className="bg-white p-6 rounded-xl border border-gray-200 shadow-xs flex flex-col gap-4 mt-2">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-bold text-gray-900">{t.docsTitle}</h2>
            <Link
              href="/plan"
              className="text-xs font-semibold text-blue-600 hover:underline"
            >
              Full Interactive Plan →
            </Link>
          </div>
          <ol className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {docSteps.map((step, i) => {
              const doc = docsMap[step.docId];
              if (!doc) return null;
              return (
                <li
                  key={step.docId}
                  className="p-3 rounded-lg border border-gray-100 bg-gray-50 flex flex-col text-xs"
                >
                  <span className="font-semibold text-gray-900">
                    {i + 1}. {doc.name[lang] || doc.name.en}
                  </span>
                  <span className="text-gray-500 mt-0.5">
                    {t.where}: {doc.where} ({doc.issued_by})
                  </span>
                </li>
              );
            })}
          </ol>
        </section>
      )}

      {/* Footer Navigation & Legal Note */}
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4 pt-4 border-t border-gray-200 text-xs text-gray-500 pb-12">
        <Link
          href="/ask"
          className="text-blue-600 hover:underline font-medium"
        >
          {t.change}
        </Link>
        <p className="text-center sm:text-right italic">
          {t.footerDisclaimer}
        </p>
      </div>
    </main>
  );
}
