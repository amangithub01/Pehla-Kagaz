"use client";

import { useState, useEffect, type FormEvent } from "react";
import type { Scheme } from "@/lib/engine/types";

type ReviewItem = {
  id: number;
  scheme_id: string;
  source_url: string;
  old_hash: string | null;
  new_hash: string;
  created_at: string;
};

export default function AdminPage() {
  const [passcode, setPasscode] = useState("");
  const [passcodeInput, setPasscodeInput] = useState("");
  const [unlocked, setUnlocked] = useState(false);
  const [activeTab, setActiveTab] = useState<"rules" | "queue">("rules");

  const [schemes, setSchemes] = useState<Scheme[]>([]);
  const [queueItems, setQueueItems] = useState<ReviewItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [resolvingId, setResolvingId] = useState<number | null>(null);
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  // Draft inputs for editable rule values: key = `${scheme.id}:${rule.id}`
  const [ruleEdits, setRuleEdits] = useState<Record<string, string>>({});

  useEffect(() => {
    // Check if passcode stored in session or prompt
    const saved = sessionStorage.getItem("admin_passcode");
    if (saved) {
      setPasscode(saved);
      setUnlocked(true);
      void fetchAll(saved);
    }
  }, []);

  async function fetchAll(code: string) {
    setLoading(true);
    setMessage(null);
    try {
      // 1. Fetch schemes
      const schemesRes = await fetch("/api/schemes", { cache: "no-store" });
      if (schemesRes.ok) {
        const data = await schemesRes.json();
        const loadedSchemes: Scheme[] = data.schemes ?? [];
        setSchemes(loadedSchemes);

        const initialEdits: Record<string, string> = {};
        for (const s of loadedSchemes) {
          for (const r of s.rules) {
            initialEdits[`${s.id}:${r.id}`] =
              typeof r.value === "object" ? JSON.stringify(r.value) : String(r.value);
          }
        }
        setRuleEdits(initialEdits);
      }

      // 2. Fetch review queue
      const queueRes = await fetch("/api/admin/review", {
        headers: { "x-admin": code },
        cache: "no-store",
      });
      if (queueRes.ok) {
        const queueData = await queueRes.json();
        setQueueItems(queueData.items ?? []);
      }
    } catch {
      setMessage({ text: "Failed to connect to server.", type: "error" });
    } finally {
      setLoading(false);
    }
  }

  function handleUnlock(e: FormEvent) {
    e.preventDefault();
    const entered = passcodeInput.trim();
    if (!entered) return;
    setPasscode(entered);
    setUnlocked(true);
    sessionStorage.setItem("admin_passcode", entered);
    void fetchAll(entered);
  }

  function handleLock() {
    setUnlocked(false);
    setPasscode("");
    setPasscodeInput("");
    sessionStorage.removeItem("admin_passcode");
  }

  async function handleSaveRule(schemeId: string, ruleId: string) {
    const rawVal = ruleEdits[`${schemeId}:${ruleId}`];
    if (rawVal === undefined) return;

    let parsedVal: unknown = rawVal;
    // Attempt parsing JSON for numbers, booleans, arrays
    try {
      parsedVal = JSON.parse(rawVal);
    } catch {
      // Keep as string if not JSON
      parsedVal = rawVal;
    }

    setSavingKey(`${schemeId}:${ruleId}`);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/rule", {
        method: "PATCH",
        headers: {
          "content-type": "application/json",
          "x-admin": passcode,
        },
        body: JSON.stringify({
          scheme_id: schemeId,
          rule_key: ruleId,
          value: parsedVal,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setMessage({
          text: err.error || "Failed to update rule.",
          type: "error",
        });
        return;
      }

      const resData = await res.json();
      setMessage({
        text: `Updated rule "${ruleId}" in ${schemeId}! Last verified updated to ${resData.last_verified}.`,
        type: "success",
      });

      // Update local schemes state
      setSchemes((prev) =>
        prev.map((s) => {
          if (s.id !== schemeId) return s;
          return {
            ...s,
            last_verified: resData.last_verified,
            rules: s.rules.map((r) =>
              r.id === ruleId ? { ...r, value: parsedVal } : r,
            ),
          };
        }),
      );
    } catch {
      setMessage({ text: "Network error while saving rule.", type: "error" });
    } finally {
      setSavingKey(null);
    }
  }

  async function handleResolveQueue(id: number, action: "approve" | "dismiss") {
    setResolvingId(id);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/review", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-admin": passcode,
        },
        body: JSON.stringify({ id, action }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setMessage({ text: err.error || "Failed to resolve item.", type: "error" });
        return;
      }

      setMessage({
        text: `Item #${id} ${action}d successfully.`,
        type: "success",
      });
      setQueueItems((prev) => prev.filter((item) => item.id !== id));
    } catch {
      setMessage({ text: "Network error while resolving item.", type: "error" });
    } finally {
      setResolvingId(null);
    }
  }

  if (!unlocked) {
    return (
      <main className="max-w-md mx-auto px-4 py-16">
        <div className="bg-white p-8 rounded-xl shadow-md border border-gray-200">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Admin Portal</h1>
          <p className="text-sm text-gray-600 mb-6">
            Enter the admin passcode to edit scheme eligibility rules and review source changes.
          </p>
          <form onSubmit={handleUnlock} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Passcode
              </label>
              <input
                type="password"
                value={passcodeInput}
                onChange={(e) => setPasscodeInput(e.target.value)}
                placeholder="Enter passcode..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                autoFocus
              />
            </div>
            <button
              type="submit"
              className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition"
            >
              Unlock Admin Console
            </button>
          </form>
        </div>
      </main>
    );
  }

  return (
    <main className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 pb-4 border-b border-gray-200">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Admin Rule Editor & Review</h1>
          <p className="text-sm text-gray-600">
            Live edits update Supabase and synchronise rule evaluation instantly.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => fetchAll(passcode)}
            disabled={loading}
            className="px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition"
          >
            {loading ? "Refreshing..." : "Refresh Data"}
          </button>
          <button
            onClick={handleLock}
            className="px-3 py-1.5 text-sm bg-red-50 hover:bg-red-100 text-red-600 rounded-lg transition"
          >
            Lock
          </button>
        </div>
      </div>

      {message && (
        <div
          className={`mb-6 p-4 rounded-lg text-sm ${
            message.type === "success"
              ? "bg-green-50 text-green-800 border border-green-200"
              : "bg-red-50 text-red-800 border border-red-200"
          }`}
        >
          {message.text}
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-gray-200 mb-6">
        <button
          onClick={() => setActiveTab("rules")}
          className={`py-2 px-6 font-medium text-sm border-b-2 transition ${
            activeTab === "rules"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-gray-500 hover:text-gray-700"
          }`}
        >
          Scheme Rules ({schemes.length})
        </button>
        <button
          onClick={() => setActiveTab("queue")}
          className={`py-2 px-6 font-medium text-sm border-b-2 transition ${
            activeTab === "queue"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-gray-500 hover:text-gray-700"
          }`}
        >
          Review Queue ({queueItems.length})
        </button>
      </div>

      {activeTab === "rules" && (
        <div className="space-y-8">
          {schemes.map((scheme) => (
            <div
              key={scheme.id}
              className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden"
            >
              <div className="bg-gray-50 px-6 py-4 border-b border-gray-200 flex justify-between items-center flex-wrap gap-2">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">
                    {scheme.name.en} ({scheme.id})
                  </h2>
                  <p className="text-xs text-gray-500">{scheme.department}</p>
                </div>
                <div className="text-xs text-gray-500 bg-white px-3 py-1 rounded-full border border-gray-200">
                  Last verified: <span className="font-semibold">{scheme.last_verified}</span>
                </div>
              </div>

              <div className="p-6 overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 text-gray-600">
                      <th className="pb-3 font-semibold">Rule Key</th>
                      <th className="pb-3 font-semibold">Field</th>
                      <th className="pb-3 font-semibold">Operator</th>
                      <th className="pb-3 font-semibold">Value (Editable)</th>
                      <th className="pb-3 font-semibold">Explanation</th>
                      <th className="pb-3 font-semibold text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {scheme.rules.map((rule) => {
                      const editKey = `${scheme.id}:${rule.id}`;
                      const isSaving = savingKey === editKey;
                      return (
                        <tr key={rule.id} className="hover:bg-gray-50">
                          <td className="py-3 font-mono text-xs text-gray-700">{rule.id}</td>
                          <td className="py-3 font-medium text-gray-800">{rule.field}</td>
                          <td className="py-3 text-gray-500 font-mono text-xs">{rule.op}</td>
                          <td className="py-3">
                            <input
                              type="text"
                              value={ruleEdits[editKey] ?? ""}
                              onChange={(e) =>
                                setRuleEdits((prev) => ({
                                  ...prev,
                                  [editKey]: e.target.value,
                                }))
                              }
                              className="px-2 py-1 border border-gray-300 rounded font-mono text-xs w-36 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                            />
                          </td>
                          <td className="py-3 text-xs text-gray-600 max-w-xs">{rule.explain.en}</td>
                          <td className="py-3 text-right">
                            <button
                              onClick={() => handleSaveRule(scheme.id, rule.id)}
                              disabled={isSaving}
                              className="px-3 py-1 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded font-medium transition disabled:opacity-50"
                            >
                              {isSaving ? "Saving..." : "Save Live"}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}

      {activeTab === "queue" && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Source Change Review Queue</h2>
          <p className="text-xs text-gray-600 mb-6">
            When automated source monitors detect diffs in official portals, alerts appear here for manual review.
          </p>

          {queueItems.length === 0 ? (
            <p className="text-sm text-gray-500 py-8 text-center bg-gray-50 rounded-lg">
              No pending source change alerts in the queue.
            </p>
          ) : (
            <div className="divide-y divide-gray-200">
              {queueItems.map((item) => (
                <div key={item.id} className="py-4 flex flex-col sm:flex-row justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold text-gray-900">{item.scheme_id}</span>
                      <span className="text-xs text-gray-400">#{item.id}</span>
                    </div>
                    <a
                      href={item.source_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-blue-600 hover:underline break-all block mb-2"
                    >
                      {item.source_url}
                    </a>
                    <div className="text-xs font-mono text-gray-500">
                      Hash: {item.new_hash?.slice(0, 16)}... | Detected:{" "}
                      {new Date(item.created_at).toLocaleDateString()}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 self-start sm:self-center">
                    <button
                      onClick={() => handleResolveQueue(item.id, "approve")}
                      disabled={resolvingId === item.id}
                      className="px-3 py-1.5 text-xs bg-green-600 hover:bg-green-700 text-white font-medium rounded transition"
                    >
                      Approve Change
                    </button>
                    <button
                      onClick={() => handleResolveQueue(item.id, "dismiss")}
                      disabled={resolvingId === item.id}
                      className="px-3 py-1.5 text-xs bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium rounded transition"
                    >
                      Dismiss
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </main>
  );
}
