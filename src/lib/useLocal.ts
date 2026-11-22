"use client";

import { useSyncExternalStore } from "react";

// Same-tab writes do not fire the `storage` event, so writers notify here.
const listeners = new Set<() => void>();
// Values that could not be written to storage; kept in memory for this session.
const memory = new Map<string, string>();

function subscribe(callback: () => void): () => void {
  listeners.add(callback);
  window.addEventListener("storage", callback);
  return () => {
    listeners.delete(callback);
    window.removeEventListener("storage", callback);
  };
}

function getServerSnapshot(): null {
  return null;
}

// Server render and first client render both use `initial` (snapshot null);
// the stored value is read through useSyncExternalStore after hydration, so
// localStorage is never touched during SSR.
export function useLocal<T>(key: string, initial: T): [T, (v: T) => void] {
  const raw = useSyncExternalStore(
    subscribe,
    () => {
      if (memory.has(key)) return memory.get(key) ?? null;
      try {
        return localStorage.getItem(key);
      } catch {
        // unavailable storage; keep `initial`
        return null;
      }
    },
    getServerSnapshot,
  );

  let value = initial;
  if (raw !== null) {
    try {
      value = JSON.parse(raw) as T;
    } catch {
      // unreadable stored value; keep `initial`
    }
  }

  const update = (v: T) => {
    const json = JSON.stringify(v);
    try {
      localStorage.setItem(key, json);
      memory.delete(key);
    } catch {
      // storage unavailable; keep going in memory
      memory.set(key, json);
    }
    listeners.forEach((listener) => listener());
  };

  return [value, update];
}
