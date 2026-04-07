import { precacheAndRoute } from 'workbox-precaching';
import { registerRoute, NavigationRoute } from 'workbox-routing';
import { StaleWhileRevalidate, NetworkFirst, NetworkOnly } from 'workbox-strategies';
import { BackgroundSyncPlugin } from 'workbox-background-sync';
import { openDB } from 'idb';

// ─── Precache static assets (injected by vite-plugin-pwa) ───
precacheAndRoute(self.__WB_MANIFEST);

// ─── Eagerly cache important App Shell HTML routes on install ───
// This guarantees that the offline version is available even if the user
// hasn't naturally navigated to it. It prevents the Chrome Dino on refresh.
self.addEventListener('install', (event) => {
    const criticalRoutes = [
        '/student/attendance',
        '/student/dashboard'
    ];
    event.waitUntil(
        caches.open('html-pages').then((cache) => {
            return cache.addAll(criticalRoutes);
        }).then(() => self.skipWaiting())
    );
});

self.addEventListener('activate', (event) => {
    event.waitUntil(self.clients.claim());
});

// ─── Navigation requests: NetworkFirst (server → cache fallback) ───
// This is the KEY for offline support — caches the full HTML of visited pages
// so they can be served even when the server is down.
registerRoute(
    ({ request }) => request.mode === 'navigate',
    new NetworkFirst({
        cacheName: 'html-pages',
        networkTimeoutSeconds: 5,
    })
);

// ─── Inertia XHR responses: NetworkFirst ───
// Inertia partial reloads use XHR with X-Inertia header
registerRoute(
    ({ request }) => {
        return request.headers.get('X-Inertia') === 'true' ||
            request.headers.get('X-Requested-With') === 'XMLHttpRequest';
    },
    new NetworkFirst({
        cacheName: 'inertia-responses',
        networkTimeoutSeconds: 5,
    })
);

// ─── Health check: NetworkFirst ───
registerRoute(
    ({ url }) => url.pathname === '/api/health',
    new NetworkFirst({
        cacheName: 'health-check',
        networkTimeoutSeconds: 3,
    })
);

// ─── Static assets: StaleWhileRevalidate ───
registerRoute(
    ({ request }) =>
        request.destination === 'style' ||
        request.destination === 'script' ||
        request.destination === 'font' ||
        request.destination === 'image',
    new StaleWhileRevalidate({
        cacheName: 'static-assets',
    })
);

// ─── Attendance sync: Background Sync ───
const attendanceSyncPlugin = new BackgroundSyncPlugin('attendance-queue', {
    maxRetentionTime: 24 * 60, // Retry for 24 hours
});

registerRoute(
    ({ url }) => url.pathname === '/student/attendance/sync',
    new NetworkOnly({
        plugins: [attendanceSyncPlugin],
    }),
    'POST'
);

// ─── Custom Background Sync handler (drains IndexedDB outbox) ───
self.addEventListener('sync', (event) => {
    if (event.tag === 'attendance-sync') {
        console.log('[SW] Background Sync event: attendance-sync');
        event.waitUntil(
            (async () => {
                // Cluster-based stagger — same logic as useOfflineSync.js handleOnline.
                // Prevents thundering herd when all 400 students reconnect simultaneously.
                try {
                    const db = await openDB('absensi-pwa', 1);
                    const state = await db.get('app-state', 'cluster_id');
                    const clusterId = state?.value ?? 1;
                    const delayMs = (Number(clusterId) - 1) * 3000;
                    if (delayMs > 0) {
                        console.log(`[SW] Cluster ${clusterId} stagger: waiting ${delayMs}ms`);
                        await new Promise(resolve => setTimeout(resolve, delayMs));
                    }
                } catch {
                    // If app-state read fails, sync immediately (fail-safe)
                }
                await drainOutbox();
            })()
        );
    }
});

/**
 * Drain the IndexedDB outbox and send pending items to the server.
 */
async function drainOutbox() {
    try {
        const db = await openDB('absensi-pwa', 1);
        const allItems = await db.getAll('outbox');
        const pendingItems = allItems.filter(item => !item.synced);

        if (pendingItems.length === 0) {
            console.log('[SW] No pending items to sync');
            notifyClients({ type: 'SYNC_COMPLETE', count: 0 });
            return;
        }

        console.log(`[SW] Syncing ${pendingItems.length} pending items`);

        // Get CSRF token from cookie
        const csrfToken = await getCookieValue('XSRF-TOKEN');

        const response = await fetch('/student/attendance/sync', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'X-XSRF-TOKEN': csrfToken ? decodeURIComponent(csrfToken) : '',
                'X-Requested-With': 'XMLHttpRequest',
            },
            credentials: 'same-origin',
            body: JSON.stringify({
                items: pendingItems.map(item => ({
                    idempotency_key: item.idempotencyKey,
                    session_id: item.sessionId,
                    attendance_code: item.attendanceCode,
                    status: item.status,
                    was_offline: item.wasOffline ?? true,
                    submitted_at: item.submittedAt,
                    device_info: item.deviceInfo,
                })),
            }),
        });

        if (response.status === 429) {
            // Server is rate-limiting — wait for Retry-After then let BackgroundSync retry
            const retryAfter = parseInt(response.headers.get('Retry-After') ?? '15');
            console.warn(`[SW] Rate limited. Retrying after ${retryAfter}s`);
            await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
            throw new Error('rate_limited'); // Re-throw → BackgroundSync will retry
        }

        if (response.status !== 200 && response.status !== 202) {
            throw new Error(`Sync failed with status: ${response.status}`);
        }

        const data = await response.json();

        // Mark synced items in IndexedDB (created, duplicate, or queued = server accepted)
        const tx = db.transaction('outbox', 'readwrite');
        for (const result of data.results) {
            if (result.result === 'created' || result.result === 'duplicate' || result.result === 'queued') {
                const item = await tx.store.get(result.key);
                if (item) {
                    item.synced = true;
                    item.syncedAt = new Date().toISOString();
                    await tx.store.put(item);
                }
            }
        }
        await tx.done;

        // Cleanup synced items
        const cleanupTx = db.transaction('outbox', 'readwrite');
        const allAfterSync = await cleanupTx.store.getAll();
        for (const item of allAfterSync) {
            if (item.synced) {
                await cleanupTx.store.delete(item.idempotencyKey);
            }
        }
        await cleanupTx.done;

        const syncedCount = data.results.filter(r => r.result === 'created' || r.result === 'duplicate' || r.result === 'queued').length;
        console.log(`[SW] Successfully synced ${syncedCount} items`);

        notifyClients({ type: 'SYNC_COMPLETE', count: syncedCount });

    } catch (error) {
        console.error('[SW] Outbox drain failed:', error);
        notifyClients({ type: 'SYNC_ERROR', error: error.message });
        throw error; // Re-throw to trigger retry
    }
}

/**
 * Send a message to all active clients (browser tabs).
 */
async function notifyClients(message) {
    const clients = await self.clients.matchAll({ type: 'window' });
    for (const client of clients) {
        client.postMessage(message);
    }
}

/**
 * Read a cookie value by name.
 */
async function getCookieValue(name) {
    try {
        if (self.cookieStore) {
            const cookie = await self.cookieStore.get(name);
            return cookie?.value;
        }
    } catch {
        // Fallback — cookie sent via credentials: 'same-origin'
    }
    return null;
}

// ─── Activate: claim clients + clean old caches ───
self.addEventListener('activate', (event) => {
    event.waitUntil(
        Promise.all([
            self.clients.claim(),
            // Clean old caches if needed
            caches.keys().then(keys =>
                Promise.all(
                    keys.filter(key => !['html-pages', 'inertia-responses', 'static-assets', 'health-check'].includes(key) && !key.startsWith('workbox-'))
                        .map(key => caches.delete(key))
                )
            ),
        ])
    );
    console.log('[SW] Service Worker activated and claiming clients');
});

// ─── Install: skip waiting ───
self.addEventListener('install', (event) => {
    self.skipWaiting();
    console.log('[SW] Service Worker installed');
});
