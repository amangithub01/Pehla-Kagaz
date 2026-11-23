"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { runPreflight, compareNames } from "@/lib/engine/preflight";
import { useLocal } from "@/lib/useLocal";

type Lang = "en" | "te";

export default function BeforeYouGoPage() {
  const [lang] = useLocal<Lang>("lang", "en");
  const [today, setToday] = useState<Date | null>(null);

  useEffect(() => {
    setToday(new Date());
  }, []);

  // In-memory state only - NEVER saved to localStorage or sent over network
  const [applicantName, setApplicantName] = useState("");
  const [aadhaarName, setAadhaarName] = useState("");
  const [rationName, setRationName] = useState("");
  const [bankName, setBankName] = useState("");
  const [certIssuedYYYYMM, setCertIssuedYYYYMM] = useState("");

  const [bankActive, setBankActive] = useState<boolean | null>(null);
  const [mobileLinked, setMobileLinked] = useState<boolean | null>(null);
  const [aadhaarSeeded, setAadhaarSeeded] = useState<boolean | null>(null);

  // Compute preflight dynamically in memory
  const docNames = [
    { label: "Aadhaar Card", val: aadhaarName.trim() },
    { label: "Ration Card", val: rationName.trim() },
    { label: "Bank Passbook", val: bankName.trim() },
  ].filter((d) => d.val.length > 0);

  const preflightWarnings = today
    ? runPreflight(
        {
          nameOnApplicant: applicantName.trim(),
          nameOnDocs: docNames.map((d) => d.val),
          certIssuedYYYYMM: certIssuedYYYYMM.replace(/[^0-9]/g, ""),
        },
        { validityMonths: 12 },
        today,
      )
    : [];

  const nameComparisons = docNames.map((d) => ({
    label: d.label,
    name: d.val,
    comparison: applicantName.trim()
      ? compareNames(d.val, applicantName.trim())
      : null,
  }));

  const hasNameMismatch = nameComparisons.some(
    (c) => c.comparison && !c.comparison.match,
  );

  return (
    <main className="max-w-4xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-50 text-amber-800 text-xs font-semibold rounded-full border border-amber-200 mb-3">
          <span>🛡️</span>
          <span>
            {lang === "te"
              ? "100% ప్రైవేట్: పేర్లు ఎక్కడా నిల్వ చేయబడవు"
              : "100% In-Memory: Names & details are never saved or sent"}
          </span>
        </div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          {lang === "te" ? "మీసేవ / CSC కి వెళ్లే ముందు తనిఖీ (Pre-Flight)" : "Rejection Pre-Flight: Before You Go"}
        </h1>
        <p className="text-gray-600 text-sm leading-relaxed">
          {lang === "te"
            ? "దరఖాస్తు తిరస్కరణకు ప్రధాన కారణాలు పేర్లలో అక్షర దోషాలు, గడువు ముగిసిన సర్టిఫికెట్లు మరియు లింక్ చేయని బ్యాంక్ ఖాతాలు. మీసేవ కేంద్రానికి వెళ్లే ముందు వీటిని సరిచూసుకోండి."
            : "The #1 reason for scheme rejections at CSC / Mee Seva centres is spelling mismatches across documents, expired income certificates, or unlinked bank accounts. Check them here in memory before you leave home."}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Form Inputs */}
        <div className="space-y-6 bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
          <h2 className="text-lg font-bold text-gray-900 border-b pb-2">
            {lang === "te" ? "1. పత్రాలపై పేర్లు సరిపోల్చండి" : "1. Spellings Across Documents"}
          </h2>

          <div>
            <label className="block text-xs font-semibold uppercase text-gray-700 mb-1">
              {lang === "te" ? "దరఖాస్తుదారుడి అధికారిక పేరు" : "Applicant Full Legal Name"}
            </label>
            <input
              type="text"
              value={applicantName}
              onChange={(e) => setApplicantName(e.target.value)}
              placeholder="e.g. Ramesh Kandula"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase text-gray-700 mb-1">
              {lang === "te" ? "ఆధార్ కార్డుపై పేరు" : "Name on Aadhaar Card"}
            </label>
            <input
              type="text"
              value={aadhaarName}
              onChange={(e) => setAadhaarName(e.target.value)}
              placeholder="e.g. Kandula Ramesh"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase text-gray-700 mb-1">
              {lang === "te" ? "రేషన్ కార్డుపై పేరు" : "Name on Ration Card"}
            </label>
            <input
              type="text"
              value={rationName}
              onChange={(e) => setRationName(e.target.value)}
              placeholder="e.g. K Ramesh"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase text-gray-700 mb-1">
              {lang === "te" ? "బ్యాంక్ పాస్‌బుక్‌పై పేరు" : "Name on Bank Passbook"}
            </label>
            <input
              type="text"
              value={bankName}
              onChange={(e) => setBankName(e.target.value)}
              placeholder="e.g. Ramesh K"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>

          <h2 className="text-lg font-bold text-gray-900 border-b pb-2 pt-4">
            {lang === "te" ? "2. ఆదాయ ధృవీకరణ పత్రం గడువు" : "2. Certificate Issue Date"}
          </h2>

          <div>
            <label className="block text-xs font-semibold uppercase text-gray-700 mb-1">
              {lang === "te" ? "సర్టిఫికెట్ జారీ తేదీ (YYYY-MM)" : "Income Certificate Issued (YYYY-MM)"}
            </label>
            <input
              type="month"
              value={certIssuedYYYYMM}
              onChange={(e) => setCertIssuedYYYYMM(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
            <p className="text-xs text-gray-500 mt-1">
              {lang === "te"
                ? "తెలంగాణలో ఆదాయ ధృవీకరణ పత్రాలు 1 సంవత్సరం (12 నెలలు) చెల్లుతాయి."
                : "Income certificates in Telangana are valid for 12 months from issue date."}
            </p>
          </div>

          <h2 className="text-lg font-bold text-gray-900 border-b pb-2 pt-4">
            {lang === "te" ? "3. బ్యాంక్ ఖాతా సిద్ధత" : "3. Bank Account Readiness"}
          </h2>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-700">
                {lang === "te" ? "గత 6 నెలల్లో ఖాతా వాడారా? (Active)" : "Account active in last 6 months?"}
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setBankActive(true)}
                  className={`px-3 py-1 text-xs rounded-md font-medium border ${
                    bankActive === true
                      ? "bg-green-600 text-white border-green-600"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  Yes
                </button>
                <button
                  type="button"
                  onClick={() => setBankActive(false)}
                  className={`px-3 py-1 text-xs rounded-md font-medium border ${
                    bankActive === false
                      ? "bg-red-600 text-white border-red-600"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  No
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-700">
                {lang === "te" ? "మొబైల్ నంబర్ బ్యాంక్‌కు లింక్ అయి ఉందా?" : "Mobile linked for SMS & OTP?"}
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setMobileLinked(true)}
                  className={`px-3 py-1 text-xs rounded-md font-medium border ${
                    mobileLinked === true
                      ? "bg-green-600 text-white border-green-600"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  Yes
                </button>
                <button
                  type="button"
                  onClick={() => setMobileLinked(false)}
                  className={`px-3 py-1 text-xs rounded-md font-medium border ${
                    mobileLinked === false
                      ? "bg-red-600 text-white border-red-600"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  No
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-700">
                {lang === "te" ? "ఆధార్ బ్యాంక్‌తో సీడింగ్ అయి ఉందా? (DBT)" : "Aadhaar seeded for DBT?"}
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setAadhaarSeeded(true)}
                  className={`px-3 py-1 text-xs rounded-md font-medium border ${
                    aadhaarSeeded === true
                      ? "bg-green-600 text-white border-green-600"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  Yes
                </button>
                <button
                  type="button"
                  onClick={() => setAadhaarSeeded(false)}
                  className={`px-3 py-1 text-xs rounded-md font-medium border ${
                    aadhaarSeeded === false
                      ? "bg-red-600 text-white border-red-600"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  No
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Results / Live Diagnostics */}
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
            <h2 className="text-lg font-bold text-gray-900 border-b pb-2 mb-4">
              {lang === "te" ? "పరిశీలన ఫలితాలు (Live Audit)" : "Live Verification Results"}
            </h2>

            {/* Document Name Match Checklist */}
            <div className="space-y-3 mb-6">
              <h3 className="text-xs font-semibold uppercase text-gray-500">
                {lang === "te" ? "పేర్ల అనుకూలత" : "Name Compatibility"}
              </h3>
              {!applicantName.trim() ? (
                <p className="text-sm text-gray-400 italic">
                  {lang === "te" ? "పేర్లు నమోదు చేసి ఫలితాలు చూడండి." : "Enter applicant name on the left to compare spellings."}
                </p>
              ) : nameComparisons.length === 0 ? (
                <p className="text-sm text-gray-400 italic">
                  {lang === "te" ? "కనీసం ఒక పత్రం పేరు నమోదు చేయండి." : "Enter document names to test against."}
                </p>
              ) : (
                nameComparisons.map((c, i) => (
                  <div
                    key={i}
                    className={`p-3 rounded-lg border text-sm flex items-start justify-between ${
                      c.comparison?.match
                        ? c.comparison.reason === "exact"
                          ? "bg-green-50 border-green-200 text-green-900"
                          : "bg-amber-50 border-amber-200 text-amber-900"
                        : "bg-red-50 border-red-200 text-red-900"
                    }`}
                  >
                    <div>
                      <div className="font-semibold">{c.label}</div>
                      <div className="text-xs opacity-90 font-mono">{c.name}</div>
                    </div>
                    <div className="text-right">
                      {c.comparison?.match ? (
                        <span className="inline-flex items-center gap-1 font-medium text-xs px-2 py-0.5 rounded-full bg-white/70">
                          ✓ {c.comparison.reason === "exact" ? "Exact Match" : "Close Match"}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 font-medium text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-800">
                          ✕ Mismatch
                        </span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Warning Banners */}
            <div className="space-y-3">
              {preflightWarnings.map((w, idx) => (
                <div
                  key={idx}
                  className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800 flex gap-2 items-start"
                >
                  <span className="text-red-500 font-bold">⚠️</span>
                  <div>
                    <span className="font-semibold block">{w.code.toUpperCase()}</span>
                    <span>{w.message}</span>
                  </div>
                </div>
              ))}

              {bankActive === false && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-900 flex gap-2 items-start">
                  <span>⚠️</span>
                  <div>
                    <strong>Inactive Bank Account:</strong> Deposit Rs. 100 or do a small transaction at the branch to reactivate before applying for pension or welfare deposits.
                  </div>
                </div>
              )}

              {mobileLinked === false && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-900 flex gap-2 items-start">
                  <span>⚠️</span>
                  <div>
                    <strong>Mobile Not Linked:</strong> OTP verification will fail for e-Shram, PMSBY, PMJJBY, and PM SVANidhi. Update your mobile number at the bank branch or Mee Seva.
                  </div>
                </div>
              )}

              {aadhaarSeeded === false && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-900 flex gap-2 items-start">
                  <span>⚠️</span>
                  <div>
                    <strong>DBT Not Enabled:</strong> Ask your bank branch to link your Aadhaar with NPCI mapper so government benefits credit directly to your account.
                  </div>
                </div>
              )}

              {applicantName.trim() &&
                nameComparisons.length > 0 &&
                preflightWarnings.length === 0 &&
                bankActive !== false &&
                mobileLinked !== false &&
                aadhaarSeeded !== false && (
                  <div className="p-4 bg-green-50 border border-green-200 rounded-lg text-green-900 text-sm flex gap-3 items-center">
                    <span className="text-xl">✅</span>
                    <div>
                      <strong>All Pre-Flight Checks Look Good!</strong>
                      <p className="text-xs text-green-700 mt-0.5">
                        Your documents match and are ready. Proceed to the Claim Sheet for CSC visit.
                      </p>
                    </div>
                  </div>
                )}
            </div>
          </div>

          {/* CSC Mitigation Advice */}
          {hasNameMismatch && (
            <div className="bg-blue-50 p-5 rounded-xl border border-blue-200 text-blue-900 text-sm">
              <h4 className="font-bold flex items-center gap-1.5 mb-2">
                <span>💡</span> CSC Mitigation Tip:
              </h4>
              <p className="text-xs leading-relaxed">
                If the initial vs full name differs on your documents (e.g. <em>K. Ramesh</em> vs <em>Kandula Ramesh</em>), take a signed affidavit or an existing Voter ID / Gazette certificate to the Mee Seva operator. Most operators can cross-verify parentage and address to prevent rejection.
              </p>
            </div>
          )}

          <div className="flex justify-between items-center pt-2">
            <Link
              href="/plan"
              className="text-sm font-medium text-gray-600 hover:text-gray-900"
            >
              ← Back to Plan
            </Link>
            <Link
              href="/sheet"
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition"
            >
              View Printable Claim Sheet →
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
