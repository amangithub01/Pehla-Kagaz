"use client";

import { useState, type FormEvent } from "react";

type ReviewItem = {
  id: number;
  scheme_id: string;
  source_url: string;
  old_hash: string | null;
  new_hash: string;
  created_at: string;
};

const NOTE =
  "Approving records that someone reviewed this change. It does not edit scheme rules; update data/schemes/*.json by hand first if the rules changed.";

const NETWORK_ERROR = "Could not reach the server. Check your connection and try again.";

async function errorMessage(res: Response): Promise<string> {
  try {
    const body = (await res.json()) as { error?: unknown };
    if (typeof body.error === "string") return body.error;
  } catch {
    // Body was not JSON; fall through to the generic message.
  }
  return `Request failed (${res.status}).`;
}

function shortHash(hash: string | null): string {
  return hash ? hash.slice(0, 12) : "none";
}

export default function ReviewPage() {
  // The admin token lives in React state only: not in localStorage or sessionStorage.
  const [tokenInput, setTokenInput] = useState("");
  const [token, setToken] = useState<string | null>(null);
  const [items, setItems] = useState<ReviewItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function loadQueue(activeToken: string) {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/review", {
        headers: { "x-admin-token": activeToken },
        cache: "no-store",
      });
      if (!res.ok) {
        if (res.status === 401) setToken(null);
        setItems([]);
        setError(await errorMessage(res));
        return;
      }
      const body = (await res.json()) as { items: ReviewItem[] };
      setItems(body.items);
    } catch {
      setError(NETWORK_ERROR);
    } finally {
      setLoading(false);
    }
  }

  function handleOpen(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const entered = tokenInput.trim();
    if (!entered) {
      setError("Enter the admin token.");
      return;
    }
    setTokenInput("");
    setToken(entered);
    void loadQueue(entered);
  }

  function handleLock() {
    setToken(null);
    setItems([]);
    setError(null);
  }

  async function resolve(item: ReviewItem, action: "approve" | "dismiss") {
    if (!token) return;
    setBusyId(item.id);
    setError(null);
    try {
      const res = await fetch("/api/review", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-admin-token": token,
        },
        body: JSON.stringify({ id: item.id, action }),
        cache: "no-store",
      });
      if (!res.ok) {
        if (res.status === 401) setToken(null);
        setError(await errorMessage(res));
        // The item may already be resolved elsewhere; refresh the list.
        if (res.status === 404 || res.status === 409) void loadQueue(token);
        return;
      }
      setItems((prev) => prev.filter((entry) => entry.id !== item.id));
    } catch {
      setError(NETWORK_ERROR);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-6 sm:py-10">
      <h1 className="text-2xl font-bold text-gray-900">Source change review</h1>
      <p className="mt-2 text-sm text-gray-700">{NOTE}</p>

      {token === null ? (
        <form onSubmit={handleOpen} className="mt-6 flex flex-col gap-3">
          <label htmlFor="admin-token" className="text-sm font-medium text-gray-900">
            Admin token
          </label>
          <input
            id="admin-token"
            type="password"
            autoComplete="off"
            value={tokenInput}
            onChange={(event) => setTokenInput(event.target.value)}
            className="min-h-11 rounded-md border border-gray-400 bg-white px-3 text-base text-gray-900"
          />
          <button
            type="submit"
            className="min-h-11 min-w-11 rounded-md bg-gray-900 px-4 text-base font-medium text-white"
          >
            Open queue
          </button>
        </form>
      ) : (
        <div className="mt-6 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => void loadQueue(token)}
            disabled={loading}
            className="min-h-11 min-w-11 rounded-md border border-gray-400 bg-white px-4 text-base font-medium text-gray-900 disabled:opacity-60"
          >
            {loading ? "Loading…" : "Refresh"}
          </button>
          <button
            type="button"
            onClick={handleLock}
            className="min-h-11 min-w-11 rounded-md border border-gray-400 bg-white px-4 text-base font-medium text-gray-900"
          >
            Lock
          </button>
        </div>
      )}

      {error ? (
        <p role="alert" className="mt-4 text-sm font-medium text-red-800">
          {error}
        </p>
      ) : null}

      {token !== null && !loading && items.length === 0 && !error ? (
        <p className="mt-6 text-sm text-gray-700">No pending source changes.</p>
      ) : null}

      {token !== null && items.length > 0 ? (
        <ul className="mt-6 flex flex-col gap-4">
          {items.map((item) => (
            <li
              key={item.id}
              className="rounded-lg border border-gray-300 bg-white p-4 text-gray-900"
            >
              <p className="text-base font-semibold">{item.scheme_id}</p>
              <a
                href={item.source_url}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-1 block break-all text-sm text-blue-800 underline"
              >
                {item.source_url}
              </a>
              <p className="mt-1 text-sm text-gray-700">
                Detected: {new Date(item.created_at).toLocaleString()}
              </p>
              <p className="mt-1 font-mono text-xs text-gray-800">
                old: {shortHash(item.old_hash)} → new: {shortHash(item.new_hash)}
              </p>
              <div className="mt-3 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => void resolve(item, "approve")}
                  disabled={busyId === item.id}
                  className="min-h-11 min-w-11 rounded-md bg-green-800 px-4 text-base font-medium text-white disabled:opacity-60"
                >
                  Approve
                </button>
                <button
                  type="button"
                  onClick={() => void resolve(item, "dismiss")}
                  disabled={busyId === item.id}
                  className="min-h-11 min-w-11 rounded-md border border-gray-500 bg-white px-4 text-base font-medium text-gray-900 disabled:opacity-60"
                >
                  Dismiss
                </button>
              </div>
            </li>
          ))}
        </ul>
      ) : null}
    </main>
  );
}
