// Basic Service Worker for PWA Installation Requirements
// This script satisfies the browser requirement for a PWA without aggressively catching network traffic,
// which often leads to stale data bugs in Dynamic Next.js applications.

self.addEventListener("install", (event) => {
    console.log("[Service Worker] Installed.");
    // Skip waiting to activate immediately
    self.skipWaiting();
});

self.addEventListener("activate", (event) => {
    console.log("[Service Worker] Activated.");
    // Claim all open clients immediately
    event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", (event) => {
    // Pass through all requests natively
    event.respondWith(fetch(event.request));
});
