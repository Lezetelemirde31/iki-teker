"use client";

import { useEffect } from "react";

/**
 * Registers the service worker.
 *
 * Registration is deferred until after load so it never competes with the first
 * paint, and it is skipped entirely in development — a worker caching a dev
 * bundle produces exactly the kind of "my change isn't showing up" confusion
 * that is miserable to diagnose.
 */
export function ServiceWorkerRegistration() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;

    const register = () => {
      navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => {
        // An unavailable worker costs offline support and nothing else.
      });
    };

    if (document.readyState === "complete") register();
    else window.addEventListener("load", register, { once: true });
  }, []);

  return null;
}
