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

const CACHE_VERSION = "iki-tekerli-v2";
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

/*
 * Push.
 *
 * The payload is composed and translated on the server, so this end only has to
 * display it. Doing the wording here would mean shipping three dictionaries
 * into the worker and keeping them in step with the app's.
 */
self.addEventListener("push", (event) => {
  if (!event.data) return;

  let payload;
  try {
    payload = event.data.json();
  } catch {
    return;
  }

  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      icon: "/icons/icon-192.png",
      badge: "/icons/icon-192.png",
      // Same tag replaces the previous one rather than stacking five
      // notifications for a single conversation.
      tag: payload.tag,
      data: { url: payload.url },
      // A rental request is worth a buzz; the phone decides how.
      vibrate: [80, 40, 80],
    }),
  );
});

/*
 * Tapping a notification.
 *
 * If a tab for this site is already open it is focused and navigated, rather
 * than opening a second one — someone with the app open and a notification
 * arriving should end up in one place, not two.
 */
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = event.notification.data?.url;
  if (!target) return;

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if (new URL(client.url).origin === self.location.origin && "focus" in client) {
          client.navigate(target);
          return client.focus();
        }
      }
      return self.clients.openWindow(target);
    }),
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
