"use client";

import { useEffect } from "react";

// Registers the service worker from /public/sw.js once the page has mounted.
export default function RegisterSW() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      try {
        void navigator.serviceWorker.register("/sw.js");
      } catch {
        // registration is optional; the app works without offline support
      }
    }
  }, []);

  return null;
}
