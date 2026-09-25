/* ============================================================
   TrazaControl — Offline Service Worker
   Enables 100% offline operation in cold stores, drying rooms,
   slaughterhouses, and production plants without network coverage.
   ============================================================ */

const CACHE_NAME = 'trazacontrol-cache-v20260925';

const STATIC_ASSETS = [
    './',
    './index.html',
    './manifest.json',
    './css/main.css',
    './css/animations.css',
    './css/components.css',
    './css/layout.css',
    './css/modules.css',
    './lang/es.json',
    './lang/pt.json',
    './lang/en.json',
    './js/vendor/supabase.min.js',
    './js/supabase-config.js',
    './js/db.js',
    './js/sync.js',
    './js/utils.js',
    './js/i18n.js',
    './js/auth.js',
    './js/demo-data.js',
    './js/modules/dashboard.js',
    './js/modules/traceability.js',
    './js/modules/temperature.js',
    './js/modules/pest-control.js',
    './js/modules/cleaning.js',
    './js/modules/water.js',
    './js/modules/incidents.js',
    './js/modules/stock.js',
    './js/modules/recipes.js',
    './js/modules/suppliers.js',
    './js/modules/goods-entry.js',
    './js/modules/reports.js',
    './js/app.js'
];

// Install: Cache all static assets
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then(async (cache) => {
            console.log('[SW] Pre-caching static assets for offline mode...');
            for (const asset of STATIC_ASSETS) {
                try {
                    await cache.add(asset);
                } catch (e) {
                    console.warn('[SW] Could not pre-cache asset:', asset, e.message);
                }
            }
        }).then(() => self.skipWaiting())
    );
});

// Activate: Clean up older caches
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keys) => {
            return Promise.all(
                keys.filter(key => key !== CACHE_NAME).map(key => {
                    console.log('[SW] Removing old cache:', key);
                    return caches.delete(key);
                })
            );
        }).then(() => self.clients.claim())
    );
});

// Fetch: Stale-While-Revalidate for local assets, network-first for others, ignore external APIs
self.addEventListener('fetch', (event) => {
    const request = event.request;
    const url = new URL(request.url);

    // Never intercept Supabase cloud API requests, let them fail naturally so TrazaDB can queue them offline
    if (url.hostname.includes('supabase.co') || url.hostname.includes('challenges.cloudflare.com')) {
        return;
    }

    // Only handle GET requests
    if (request.method !== 'GET') {
        return;
    }

    // Navigation requests (HTML document)
    if (request.mode === 'navigate') {
        event.respondWith(
            fetch(request).catch(async () => {
                const cached = await caches.match('./index.html') || await caches.match('/index.html') || await caches.match('/');
                return cached || new Response('TrazaControl Offline', { headers: { 'Content-Type': 'text/html' } });
            })
        );
        return;
    }

    // Local static assets (CSS, JS, Fonts, JSON)
    event.respondWith(
        caches.match(request).then((cachedResponse) => {
            if (cachedResponse) {
                // Fetch in background to update cache (Stale-While-Revalidate)
                fetch(request).then((networkResponse) => {
                    if (networkResponse && networkResponse.status === 200) {
                        caches.open(CACHE_NAME).then((cache) => cache.put(request, networkResponse));
                    }
                }).catch(() => {/* Offline, ignore */});
                return cachedResponse;
            }

            // If not in cache, try network
            return fetch(request).then((networkResponse) => {
                if (networkResponse && networkResponse.status === 200) {
                    const responseClone = networkResponse.clone();
                    caches.open(CACHE_NAME).then((cache) => cache.put(request, responseClone));
                }
                return networkResponse;
            }).catch(() => {
                console.warn('[SW] Offline fetch fallback for:', request.url);
            });
        })
    );
});
