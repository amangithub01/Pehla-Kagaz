"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { QRCodeSVG } from "qrcode.react";
import { useLocal } from "@/lib/useLocal";
import { evalAll } from "@/lib/engine/evaluate";
import { planDocuments } from "@/lib/engine/docGraph";
import type { DocumentDef, Profile, Scheme } from "@/lib/engine/types";

type Lang = "en" | "te";

export default function ClaimSheetPage() {
  const [lang] = useLocal<Lang>("lang", "en");
  const [profile] = useLocal<Profile>("profile", {});
  const [haveDocs] = useLocal<string[]>("haveDocs", []);

  const [schemes, setSchemes] = useState<Scheme[]>([]);
  const [docsMap, setDocsMap] = useState<Record<string, DocumentDef>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/schemes")
      .then((res) => res.json())
      .then((data) => {
        if (data.schemes) {
          setSchemes(data.schemes);
          const map: Record<string, DocumentDef> = {};
          for (const d of data.documents ?? []) {
            map[d.id] = d;
          }
          setDocsMap(map);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const evaluated = useMemo(() => {
    if (schemes.length === 0) return [];
    return evalAll(schemes, profile);
  }, [schemes, profile]);

  const likelySchemes = useMemo(() => {
    const matched = evaluated
      .filter((r) => r.verdict === "likely_eligible")
      .map((r) => r.scheme);
    // If no likely matches, fall back to schemes that need info or top schemes
    if (matched.length > 0) return matched;
    return schemes.slice(0, 3);
  }, [evaluated, schemes]);

  const docPlan = useMemo(() => {
    if (likelySchemes.length === 0 || Object.keys(docsMap).length === 0) return [];
    return planDocuments(likelySchemes, docsMap, haveDocs);
  }, [likelySchemes, docsMap, haveDocs]);

  if (loading) {
    return (
      <main className="max-w-4xl mx-auto px-4 py-16 text-center text-gray-500">
        Loading Claim Sheet...
      </main>
    );
  }

  const [currentDate, setCurrentDate] = useState("");

  useEffect(() => {
    setCurrentDate(
      new Date().toLocaleDateString(lang === "te" ? "te-IN" : "en-IN", {
        year: "numeric",
        month: "long",
        day: "numeric",
      }),
    );
  }, [lang]);

  return (
    <main className="max-w-4xl mx-auto px-4 py-8 print:p-0 print:max-w-none text-gray-900">
      {/* Print Controls (Hidden on Print) */}
      <div className="print:hidden mb-6 flex flex-wrap justify-between items-center gap-4 bg-gray-50 p-4 rounded-xl border border-gray-200">
        <div className="flex items-center gap-2">
          <Link
            href="/plan"
            className="text-sm font-medium text-gray-600 hover:text-gray-900"
          >
            ← Back to Plan
          </Link>
          <span className="text-gray-300">|</span>
          <Link
            href="/before-you-go"
            className="text-sm font-medium text-gray-600 hover:text-gray-900"
          >
            Rejection Pre-Flight
          </Link>
          <span className="text-gray-300">|</span>
          <Link
            href="/tracker"
            className="text-sm font-medium text-gray-600 hover:text-gray-900"
          >
            Tracker
          </Link>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => window.print()}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition shadow-sm flex items-center gap-2"
          >
            <span>🖨️</span>
            <span>{lang === "te" ? "ప్రింట్ తీసుకోండి (Print)" : "Print 1-Page Claim Sheet"}</span>
          </button>
        </div>
      </div>

      {/* Printable Sheet Container */}
      <div className="bg-white p-8 rounded-xl border border-gray-300 print:border-none print:p-0 shadow-sm">
        {/* Header */}
        <div className="border-b-2 border-gray-900 pb-4 mb-6 flex justify-between items-start">
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-blue-800">
              Common Service Centre (CSC) & Mee Seva
            </div>
            <h1 className="text-2xl font-black text-gray-900 mt-0.5">
              {lang === "te" ? "ప్రభుత్వ సంక్షేమ పథకాల క్లెయిమ్ షీట్" : "Official Welfare Scheme Claim Sheet"}
            </h1>
            <p className="text-xs text-gray-500 mt-0.5">
              Generated: {currentDate} | Pehla Kagaz / Claim What&apos;s Yours
            </p>
          </div>
          <div className="text-right">
            <span className="inline-block px-3 py-1 bg-gray-100 text-gray-800 font-bold text-xs rounded border border-gray-300">
              CSC COUNTER COPY
            </span>
          </div>
        </div>

        {/* Beneficiary Profile Summary */}
        <div className="bg-gray-50 p-3 rounded-lg border border-gray-200 mb-6 text-xs grid grid-cols-2 sm:grid-cols-4 gap-2">
          <div>
            <span className="text-gray-500 block">Age:</span>
            <span className="font-semibold text-gray-800">
              {profile.age ? `${profile.age} years` : "Unspecified"}
            </span>
          </div>
          <div>
            <span className="text-gray-500 block">Occupation:</span>
            <span className="font-semibold text-gray-800 capitalize">
              {profile.occupation ? profile.occupation.replace("_", " ") : "Unspecified"}
            </span>
          </div>
          <div>
            <span className="text-gray-500 block">Monthly Income:</span>
            <span className="font-semibold text-gray-800">
              {profile.monthly_income ? `Rs. ${profile.monthly_income}` : "Unspecified"}
            </span>
          </div>
          <div>
            <span className="text-gray-500 block">Ration Card / Food Card:</span>
            <span className="font-semibold text-gray-800">
              {profile.has_ration_card ? "Yes (White/FSC)" : "None"}
            </span>
          </div>
        </div>

        {/* Matched Schemes with Fee & QR Code */}
        <div className="mb-6">
          <h2 className="text-sm font-bold uppercase tracking-wide text-gray-800 mb-3 border-b pb-1">
            {lang === "te" ? "అర్హత ఉన్న పథకాలు (Matched Schemes)" : "1. Schemes Likely Eligible For"}
          </h2>

          <div className="space-y-4">
            {likelySchemes.map((scheme) => {
              const targetUrl = scheme.apply_url || scheme.source_url || "https://telangana.gov.in";
              return (
                <div
                  key={scheme.id}
                  className="p-3 border border-gray-200 rounded-lg flex justify-between items-start gap-4 break-inside-avoid"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-gray-900">
                        {scheme.name[lang] || scheme.name.en}
                      </span>
                      <span className="text-[10px] uppercase font-semibold px-1.5 py-0.5 bg-gray-100 rounded text-gray-600">
                        {scheme.level}
                      </span>
                    </div>
                    <div className="text-xs text-gray-500">{scheme.department}</div>
                    <p className="text-xs text-gray-700 mt-1">
                      {scheme.benefit[lang] || scheme.benefit.en}
                    </p>
                    <div className="text-xs font-semibold text-blue-900 mt-1">
                      Official fee per source: {scheme.fee_inr === 0 ? "0 rupees (Free)" : `${scheme.fee_inr} rupees`}
                    </div>
                  </div>

                  <div className="flex flex-col items-center shrink-0">
                    <QRCodeSVG value={targetUrl} size={64} level="M" />
                    <span className="text-[9px] text-gray-500 mt-1 font-mono">
                      Scan portal
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Document Checklist in Ordered Sequence */}
        <div className="mb-6 break-inside-avoid">
          <h2 className="text-sm font-bold uppercase tracking-wide text-gray-800 mb-3 border-b pb-1">
            {lang === "te" ? "తీసుకెళ్లాల్సిన పత్రాలు (Ordered Document Sequence)" : "2. Ordered Documents to Carry to CSC"}
          </h2>

          <div className="border border-gray-200 rounded-lg overflow-hidden text-xs">
            <table className="w-full text-left">
              <thead className="bg-gray-100 border-b border-gray-200">
                <tr>
                  <th className="p-2 w-12 text-center">Ready</th>
                  <th className="p-2 font-semibold">Document Name</th>
                  <th className="p-2 font-semibold">Where / Issued By</th>
                  <th className="p-2 font-semibold">Prerequisite</th>
                  <th className="p-2 font-semibold text-right">Fee</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {docPlan.map((item) => {
                  const doc = docsMap[item.docId];
                  if (!doc) return null;
                  return (
                    <tr key={item.docId}>
                      <td className="p-2 text-center">
                        <span className="inline-block w-4 h-4 border-2 border-gray-400 rounded-sm"></span>
                      </td>
                      <td className="p-2 font-medium text-gray-900">
                        {doc.name[lang] || doc.name.en}
                      </td>
                      <td className="p-2 text-gray-600">
                        {doc.where} ({doc.issued_by})
                      </td>
                      <td className="p-2 text-gray-500">
                        {doc.requires.length > 0
                          ? doc.requires
                              .map((r) => docsMap[r]?.name[lang] || r)
                              .join(", ")
                          : "None"}
                      </td>
                      <td className="p-2 text-right font-medium text-gray-900">
                        {doc.fee_inr === 0 ? "Free" : `Rs. ${doc.fee_inr}`}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer Notice & Operator Instructions */}
        <div className="border-t-2 border-gray-900 pt-4 mt-8 break-inside-avoid">
          <div className="p-3 bg-gray-50 border border-gray-200 rounded text-[11px] text-gray-700 leading-relaxed mb-3">
            <strong>CSC Operator Note:</strong> Verify applicant biometric authentication and verify that names across Aadhaar, Ration Card, and Bank Account are compatible. Confirm no pending dues or active income tax status before logging application on Mee Seva.
          </div>

          <div className="text-center text-xs font-semibold text-gray-800">
            Likely eligible, not guaranteed. Scheme rules and eligibility must be verified by the CSC operator or official department before submission.
          </div>
        </div>
      </div>
    </main>
  );
}
