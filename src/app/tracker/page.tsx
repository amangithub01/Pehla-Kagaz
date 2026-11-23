"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useLocal } from "@/lib/useLocal";
import { formatDate, getFollowupStatus, addDays } from "@/lib/dates";
import { generateIcs, downloadIcs, type CalendarReminder } from "@/lib/ics";
import type { Scheme } from "@/lib/engine/types";

type Lang = "en" | "te";

export type TrackedApplication = {
  id: string;
  schemeId: string;
  schemeName: string;
  department: string;
  appliedDate: string; // YYYY-MM-DD
  followupDays: number;
  deadline?: string | null;
  status: "applied" | "in_progress" | "approved" | "rejected";
  refNumber?: string;
  notes?: string;
};

export default function TrackerPage() {
  const [lang] = useLocal<Lang>("lang", "en");
  const [tracker, setTracker] = useLocal<TrackedApplication[]>("tracker", []);
  const [schemes, setSchemes] = useState<Scheme[]>([]);

  // Add modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedSchemeId, setSelectedSchemeId] = useState("");
  const [today, setToday] = useState<Date | null>(null);
  const [appliedDate, setAppliedDate] = useState("");

  useEffect(() => {
    const now = new Date();
    setToday(now);
    setAppliedDate(now.toISOString().slice(0, 10));
  }, []);
  const [refNumber, setRefNumber] = useState("");
  const [notes, setNotes] = useState("");

  const [downloading, setDownloading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/schemes")
      .then((res) => res.json())
      .then((data) => {
        if (data.schemes) {
          setSchemes(data.schemes);
          if (data.schemes.length > 0 && !selectedSchemeId) {
            setSelectedSchemeId(data.schemes[0].id);
          }
        }
      })
      .catch(() => {});
  }, [selectedSchemeId]);

  function handleAddApplication(e: React.FormEvent) {
    e.preventDefault();
    const scheme = schemes.find((s) => s.id === selectedSchemeId);
    if (!scheme) return;

    const newApp: TrackedApplication = {
      id: `${scheme.id}-${Date.now()}`,
      schemeId: scheme.id,
      schemeName: scheme.name[lang] || scheme.name.en,
      department: scheme.department,
      appliedDate,
      followupDays: scheme.followup_days || 30,
      deadline: scheme.deadline ?? null,
      status: "applied",
      refNumber: refNumber.trim() || undefined,
      notes: notes.trim() || undefined,
    };

    setTracker([...tracker, newApp]);
    setShowAddModal(false);
    setRefNumber("");
    setNotes("");
  }

  function handleUpdateStatus(id: string, status: TrackedApplication["status"]) {
    setTracker(
      tracker.map((item) => (item.id === id ? { ...item, status } : item)),
    );
  }

  function handleDelete(id: string) {
    setTracker(tracker.filter((item) => item.id !== id));
  }

  async function handleExportIcs() {
    if (tracker.length === 0) return;
    setDownloading(true);
    try {
      const reminders: CalendarReminder[] = tracker.map((item) => {
        const followup = addDays(item.appliedDate, item.followupDays);
        return {
          title: `Follow up: ${item.schemeName}`,
          description: `Check application status for ${item.schemeName} at ${item.department}. Ref: ${item.refNumber || "None"}. Notes: ${item.notes || "None"}.`,
          targetDate: followup,
        };
      });

      const icsContent = await generateIcs(reminders);
      downloadIcs("claim-reminders.ics", icsContent);
      setMessage("Downloaded claim-reminders.ics");
      setTimeout(() => setMessage(null), 3000);
    } catch (err) {
      console.error(err);
      setMessage("Could not generate calendar reminders.");
    } finally {
      setDownloading(false);
    }
  }

  function getWhatsAppShareUrl(): string {
    const lines = [
      "📌 *My Government Scheme Claim & Follow-up Plan:*",
      "",
      ...tracker.map((t, idx) => {
        const status = getFollowupStatus(t.appliedDate, t.followupDays);
        return `${idx + 1}. *${t.schemeName}* (${t.status.toUpperCase()})\n   - Applied: ${t.appliedDate}\n   - Next Action: ${status.label}\n   - Ref: ${t.refNumber || "Pending receipt"}`;
      }),
      "",
      "Created with Claim What's Yours (Pehla Kagaz)",
    ];
    return `https://wa.me/?text=${encodeURIComponent(lines.join("\n"))}`;
  }

  return (
    <main className="max-w-4xl mx-auto px-4 py-8">
      {/* Top Section */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            {lang === "te" ? "దరఖాస్తుల ట్రాకర్" : "Application Tracker & Deadlines"}
          </h1>
          <p className="text-gray-600 text-sm mt-1">
            {lang === "te"
              ? "మీ దరఖాస్తులను ట్రాక్ చేయండి, ఫాలో-అప్ గడువులను చూడండి మరియు క్యాలెండర్‌కు ఎగుమతి చేయండి."
              : "Track submitted CSC / Mee Seva applications, follow-up deadlines, and export reminders."}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition shadow-sm"
          >
            + {lang === "te" ? "దరఖాస్తు జోడించండి" : "Add Application"}
          </button>

          {tracker.length > 0 && (
            <>
              <button
                onClick={handleExportIcs}
                disabled={downloading}
                className="px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-lg text-sm font-medium transition"
              >
                📅 {downloading ? "Exporting..." : "Export .ics"}
              </button>

              <a
                href={getWhatsAppShareUrl()}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition inline-flex items-center gap-1.5"
              >
                <span>💬</span> {lang === "te" ? "వాట్సాప్‌లో షేర్ చేయండి" : "Share on WhatsApp"}
              </a>
            </>
          )}
        </div>
      </div>

      {message && (
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 text-blue-800 rounded-lg text-sm">
          {message}
        </div>
      )}

      {/* Tracker List */}
      {tracker.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center shadow-sm">
          <div className="text-4xl mb-3">📋</div>
          <h2 className="text-lg font-semibold text-gray-900 mb-1">
            {lang === "te" ? "ఇంకా దరఖాస్తులు నమోదు కాలేదు" : "No Applications Tracked Yet"}
          </h2>
          <p className="text-sm text-gray-500 max-w-md mx-auto mb-6">
            {lang === "te"
              ? "మీరు మీసేవ లేదా సిఎస్‌సి కేంద్రంలో దరఖాస్తు చేసిన తర్వాత ఇక్కడ నమోదు చేసుకోండి. ఫాలో-అప్ సమయాలు ఇక్కడ కనిపిస్తాయి."
              : "Once you submit an application at Mee Seva or CSC, add it here to track follow-up dates and status."}
          </p>
          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition"
          >
            + {lang === "te" ? "మొదటి దరఖాస్తును జోడించండి" : "Track Your First Application"}
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {tracker.map((item) => {
            const followup = getFollowupStatus(
              item.appliedDate,
              item.followupDays,
              today || undefined,
            );
            return (
              <div
                key={item.id}
                className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm transition hover:border-gray-300"
              >
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-3">
                  <div>
                    <span className="text-xs uppercase font-semibold text-gray-400 block">
                      {item.department}
                    </span>
                    <h2 className="text-lg font-bold text-gray-900">
                      {item.schemeName}
                    </h2>
                  </div>

                  {/* Follow-up Banner */}
                  <div
                    className={`px-3 py-1 rounded-full text-xs font-semibold inline-flex items-center gap-1.5 ${
                      followup.isOverdue
                        ? "bg-red-100 text-red-800 border border-red-200"
                        : followup.isDueToday
                        ? "bg-amber-100 text-amber-800 border border-amber-200 animate-pulse"
                        : "bg-blue-50 text-blue-800 border border-blue-200"
                    }`}
                  >
                    <span>⏰</span>
                    <span>{followup.label}</span>
                    <span className="text-xs opacity-75 font-normal">
                      ({formatDate(followup.followupDate, lang)})
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs py-3 border-t border-b border-gray-100 my-2">
                  <div>
                    <span className="text-gray-500 block">Applied Date</span>
                    <span className="font-medium text-gray-800">
                      {formatDate(item.appliedDate, lang)}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500 block">Mee Seva / Ref #</span>
                    <span className="font-mono font-medium text-gray-800">
                      {item.refNumber || "Not recorded"}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500 block">Status</span>
                    <select
                      value={item.status}
                      onChange={(e) =>
                        handleUpdateStatus(
                          item.id,
                          e.target.value as TrackedApplication["status"],
                        )
                      }
                      className="mt-0.5 px-2 py-0.5 border border-gray-300 rounded text-xs font-medium bg-white focus:outline-none"
                    >
                      <option value="applied">Applied (సమర్పించబడింది)</option>
                      <option value="in_progress">In Progress (పురోగతిలో ఉంది)</option>
                      <option value="approved">Approved (ఆమోదించబడింది)</option>
                      <option value="rejected">Rejected (తిరస్కరించబడింది)</option>
                    </select>
                  </div>
                  <div className="text-right flex items-center justify-end">
                    <button
                      onClick={() => handleDelete(item.id)}
                      className="text-red-500 hover:text-red-700 text-xs font-medium"
                    >
                      Remove
                    </button>
                  </div>
                </div>

                {item.notes && (
                  <p className="text-xs text-gray-600 bg-gray-50 p-2.5 rounded-lg mt-2">
                    <strong>Note:</strong> {item.notes}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-xl border border-gray-200">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              {lang === "te" ? "దరఖాస్తు జోడించండి" : "Add Scheme Application"}
            </h2>

            <form onSubmit={handleAddApplication} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Scheme
                </label>
                <select
                  value={selectedSchemeId}
                  onChange={(e) => setSelectedSchemeId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                >
                  {schemes.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name[lang] || s.name.en} ({s.department})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Date of Application
                </label>
                <input
                  type="date"
                  value={appliedDate}
                  onChange={(e) => setAppliedDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Mee Seva Application / Ack Number (Optional)
                </label>
                <input
                  type="text"
                  value={refNumber}
                  onChange={(e) => setRefNumber(e.target.value)}
                  placeholder="e.g. MS2026112345"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Notes / CSC Operator Advice (Optional)
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. Operator said field verification by Revenue Inspector within 10 days"
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition"
                >
                  Save Application
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
