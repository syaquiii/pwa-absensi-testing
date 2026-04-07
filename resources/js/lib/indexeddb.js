import { openDB } from 'idb';

const DB_NAME = 'absensi-pwa';
const DB_VERSION = 1;

/**
 * Open (or create) the IndexedDB database.
 */
function getDB() {
    return openDB(DB_NAME, DB_VERSION, {
        upgrade(db) {
            // Outbox: pending attendance submissions
            if (!db.objectStoreNames.contains('outbox')) {
                const outbox = db.createObjectStore('outbox', { keyPath: 'idempotencyKey' });
                outbox.createIndex('synced', 'synced');
                outbox.createIndex('createdAt', 'createdAt');
            }

            // Sessions cache: offline session data
            if (!db.objectStoreNames.contains('sessions-cache')) {
                db.createObjectStore('sessions-cache', { keyPath: 'id' });
            }

            // App state: user info, cluster status, etc.
            if (!db.objectStoreNames.contains('app-state')) {
                db.createObjectStore('app-state', { keyPath: 'key' });
            }
        },
    });
}

/* ── Outbox Operations ── */

/**
 * Add an attendance record to the outbox for later sync.
 */
export async function addToOutbox(attendance) {
    const db = await getDB();
    const record = {
        ...attendance,
        synced: false,
        createdAt: new Date().toISOString(),
    };
    await db.put('outbox', record);
    return record;
}

/**
 * Get all pending (unsynced) outbox items.
 */
export async function getOutboxItems() {
    const db = await getDB();
    const all = await db.getAll('outbox');
    return all.filter(item => !item.synced);
}

/**
 * Get count of pending items.
 */
export async function getPendingCount() {
    const items = await getOutboxItems();
    return items.length;
}

/**
 * Mark an item as synced by its idempotency key.
 */
export async function markSynced(idempotencyKey) {
    const db = await getDB();
    const tx = db.transaction('outbox', 'readwrite');
    const item = await tx.store.get(idempotencyKey);
    if (item) {
        item.synced = true;
        item.syncedAt = new Date().toISOString();
        await tx.store.put(item);
    }
    await tx.done;
}

/**
 * Mark multiple items as synced.
 */
export async function markMultipleSynced(keys) {
    const db = await getDB();
    const tx = db.transaction('outbox', 'readwrite');
    for (const key of keys) {
        const item = await tx.store.get(key);
        if (item) {
            item.synced = true;
            item.syncedAt = new Date().toISOString();
            await tx.store.put(item);
        }
    }
    await tx.done;
}

/**
 * Clear all synced items from the outbox.
 */
export async function clearSynced() {
    const db = await getDB();
    const all = await db.getAll('outbox');
    const tx = db.transaction('outbox', 'readwrite');
    for (const item of all) {
        if (item.synced) {
            await tx.store.delete(item.idempotencyKey);
        }
    }
    await tx.done;
}

/**
 * Get all outbox items (for debugging/display).
 */
export async function getAllOutboxItems() {
    const db = await getDB();
    return db.getAll('outbox');
}

/**
 * Mark all pending items as wasOffline = true (used when sync fails due to server down).
 */
export async function markPendingAsOffline() {
    const db = await getDB();
    const all = await db.getAll('outbox');
    const tx = db.transaction('outbox', 'readwrite');
    for (const item of all) {
        if (!item.synced && !item.wasOffline) {
            item.wasOffline = true;
            await tx.store.put(item);
        }
    }
    await tx.done;
}

/* ── Sessions Cache Operations ── */

export async function cacheSessions(sessions) {
    const db = await getDB();
    const tx = db.transaction('sessions-cache', 'readwrite');
    for (const session of sessions) {
        await tx.store.put(session);
    }
    await tx.done;
}

export async function getCachedSessions() {
    const db = await getDB();
    return db.getAll('sessions-cache');
}

/* ── App State Operations ── */

export async function setAppState(key, value) {
    const db = await getDB();
    await db.put('app-state', { key, value, updatedAt: new Date().toISOString() });
}

export async function getAppState(key) {
    const db = await getDB();
    const record = await db.get('app-state', key);
    return record?.value ?? null;
}
