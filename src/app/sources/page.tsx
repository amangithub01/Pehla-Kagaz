"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useLocal } from "@/lib/useLocal";
import type { Scheme } from "@/lib/engine/types";

type Lang = "en" | "te";

export default function SourcesPage() {
  const [lang] = useLocal<Lang>("lang", "en");
  const [schemes, setSchemes] = useState<Scheme[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/schemes")
      .then((res) => res.json())
      .then((data) => {
        if (data.schemes) {
          setSchemes(data.schemes);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <main className="max-w-6xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-50 text-blue-700 text-xs font-semibold rounded-full border border-blue-200 mb-3">
          <span>🔍</span>
          <span>Open Transparency</span>
        </div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          {lang === "te" ? "ప్రభుత్వ పథకాల అధికారిక మూలాలు" : "Official Sources & Rule Transparency"}
        </h1>
        <p className="text-gray-600 text-sm max-w-3xl leading-relaxed">
          {lang === "te"
            ? "ఈ వేదికలో ఉపయోగించే ప్రతి అర్హత నియమం ప్రభుత్వ అధికారిక గెజిట్, పోర్టల్ లేదా మార్గదర్శకాల ఆధారంగా రూపొందించబడింది. ప్రతి నియమం యొక్క అధికారిక మూలం మరియు వాక్యం ఇక్కడ పారదర్శకంగా పరిశీలించవచ్చు."
            : "Every single eligibility rule evaluated by the engine is mapped directly to official government portals and gazettes. Below is the complete transparency table showing department sources, verification dates, and verbatim source clauses."}
        </p>
      </div>

      {loading ? (
        <div className="p-12 text-center text-gray-500">Loading verified sources...</div>
      ) : (
        <div className="space-y-8">
          {schemes.map((scheme) => (
            <div
              key={scheme.id}
              className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden"
            >
              {/* Scheme Summary Bar */}
              <div className="bg-gray-50 px-6 py-4 border-b border-gray-200 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-bold text-gray-900">
                      {scheme.name[lang] || scheme.name.en}
                    </h2>
                    <span className="text-xs uppercase font-semibold px-2 py-0.5 bg-gray-200 rounded text-gray-700">
                      {scheme.level}
                    </span>
                  </div>
                  <p className="text-xs text-gray-600 mt-0.5">{scheme.department}</p>
                </div>

                <div className="flex items-center gap-4 text-xs">
                  <div>
                    <span className="text-gray-500 block">Official Source Portal:</span>
                    {scheme.source_url ? (
                      <a
                        href={scheme.source_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline font-medium break-all flex items-center gap-1"
                      >
                        <span>{scheme.source_url}</span>
                        <span>↗</span>
                      </a>
                    ) : (
                      <span className="text-gray-400 italic">Official Gazetted Scheme</span>
                    )}
                  </div>
                  <div className="text-right pl-4 border-l border-gray-200">
                    <span className="text-gray-500 block">Last Verified:</span>
                    <span className="font-semibold text-gray-800">
                      {scheme.last_verified}
                    </span>
                  </div>
                </div>
              </div>

              {/* Verbatim Rule Clauses */}
              <div className="p-6">
                <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-3">
                  Verbatim Eligibility Clauses & Evaluated Logic
                </h3>

                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-gray-100 text-gray-600 text-xs">
                      <tr>
                        <th className="p-3 font-semibold">Rule Key / Field</th>
                        <th className="p-3 font-semibold">Engine Condition</th>
                        <th className="p-3 font-semibold">Verbatim Source Clause</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {scheme.rules.map((rule) => (
                        <tr key={rule.id} className="hover:bg-gray-50">
                          <td className="p-3 font-mono text-xs text-gray-700 align-top">
                            <span className="font-semibold block">{rule.id}</span>
                            <span className="text-gray-400">{rule.field}</span>
                          </td>
                          <td className="p-3 text-xs align-top">
                            <span className="font-mono bg-gray-100 px-1.5 py-0.5 rounded text-gray-800">
                              {rule.op} {JSON.stringify(rule.value)}
                            </span>
                            <p className="text-gray-600 mt-1">{rule.explain[lang] || rule.explain.en}</p>
                          </td>
                          <td className="p-3 text-xs text-gray-700 bg-amber-50/30 font-serif italic border-l border-gray-100 align-top">
                            &ldquo;{rule.source_clause}&rdquo;
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
