/*
 * Service worker for Iki Tekerli.
 *
 * Kept deliberately conservative. A service worker sits in front of every
 * request and persists across visits, so an over-eager one can serve stale HTML
 * for days or take the site down entirely — worse than having none at all.
 * The rules here are therefore narrow:
 *
 *   - Navigations go to the network first and only fall back to the cache, so a
 *     deploy is never masked by a cached page.
 *   - Immutable build assets are served cache-first, since their URLs change on
 *     every build.
 *   - Anything else is left alone.
 *
 * Bumping CACHE_VERSION discards every previous cache on the next activation.
 */

const CACHE_VERSION = "iki-teker-v1";
const OFFLINE_URL = "/offline.html";

const PRECACHE = [OFFLINE_URL, "/icons/icon-192.png", "/icons/icon-512.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_VERSION)
      .then((cache) => cache.addAll(PRECACHE))
      // A failed precache must not block installation; the worker is still
      // useful for the runtime rules below.
      .catch(() => undefined)
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((key) => key !== CACHE_VERSION).map((key) => caches.delete(key))),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;

  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Build output is content-hashed, so it can be trusted from cache forever.
  if (url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/icons/")) {
    event.respondWith(
      caches.match(request).then(
        (hit) =>
          hit ??
          fetch(request).then((response) => {
            const copy = response.clone();
            caches.open(CACHE_VERSION).then((cache) => cache.put(request, copy));
            return response;
          }),
      ),
    );
    return;
  }

  // Pages: network first, cache as a fallback, offline page as a last resort.
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE_VERSION).then((cache) => cache.put(request, copy));
          return response;
        })
        .catch(async () => {
          const cached = await caches.match(request);
          if (cached) return cached;
          const offline = await caches.match(OFFLINE_URL);
          return offline ?? Response.error();
        }),
    );
  }
});
