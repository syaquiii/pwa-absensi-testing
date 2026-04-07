import { useState, useEffect, useCallback, useRef } from 'react';
import { addToOutbox, getOutboxItems, markMultipleSynced, clearSynced, getPendingCount, markPendingAsOffline, getAppState } from '../lib/indexeddb';
import { generateUUID } from '../lib/uuid';

/**
 * Core offline sync hook.
 * Manages the IndexedDB outbox, Background Sync registration, and iOS manual fallback.
 */
export function useOfflineSync() {
    const [pendingCount, setPendingCount] = useState(0);
    const [isSyncing, setIsSyncing] = useState(false);
    const [lastSyncTime, setLastSyncTime] = useState(null);
    const [syncError, setSyncError] = useState(null);
    const [hasSyncSupport, setHasSyncSupport] = useState(false);
    const syncingRef = useRef(false);

    // Check Background Sync API support
    useEffect(() => {
        const check = async () => {
            if ('serviceWorker' in navigator && 'SyncManager' in window) {
                setHasSyncSupport(true);
            }
        };
        check();
    }, []);

    // Update pending count on mount and changes
    const refreshPendingCount = useCallback(async () => {
        try {
            const count = await getPendingCount();
            setPendingCount(count);
        } catch (err) {
            console.error('[OfflineSync] Error getting pending count:', err);
        }
    }, []);

    useEffect(() => {
        refreshPendingCount();

        // Listen for messages from Service Worker
        const handleSWMessage = (event) => {
            if (event.data?.type === 'SYNC_COMPLETE') {
                setIsSyncing(false);
                setLastSyncTime(new Date());
                setSyncError(null);
                refreshPendingCount();
            } else if (event.data?.type === 'SYNC_ERROR') {
                setIsSyncing(false);
                setSyncError(event.data.error);
            }
        };

        navigator.serviceWorker?.addEventListener('message', handleSWMessage);

        return () => {
            navigator.serviceWorker?.removeEventListener('message', handleSWMessage);
        };
    }, [refreshPendingCount]);

    /**
     * Queue an attendance submission for sync.
     * Stores in IndexedDB and triggers Background Sync (if supported).
     */
    const queueAttendance = useCallback(async (sessionId, status = 'present', attendanceCode = '') => {
        const idempotencyKey = generateUUID();

        const attendance = {
            idempotencyKey,
            sessionId,
            status,
            attendanceCode: attendanceCode.toUpperCase(),
            wasOffline: !navigator.onLine,
            submittedAt: new Date().toISOString(),
            deviceInfo: navigator.userAgent,
        };

        // 1. Save to IndexedDB (instant, offline-safe)
        await addToOutbox(attendance);
        await refreshPendingCount();

        // 2. Try to register Background Sync
        if (hasSyncSupport && 'serviceWorker' in navigator) {
            try {
                const registration = await navigator.serviceWorker.ready;
                await registration.sync.register('attendance-sync');
                console.log('[OfflineSync] Background Sync registered');
            } catch (err) {
                console.warn('[OfflineSync] Background Sync registration failed, will retry:', err);
            }
        }

        // 3. If online, also try immediate sync
        if (navigator.onLine) {
            manualSync();
        }

        return idempotencyKey;
    }, [hasSyncSupport, refreshPendingCount]);

    /**
     * Manual sync — used as iOS fallback and immediate sync attempt.
     * Drains the IndexedDB outbox and POSTs to the server.
     */
    const manualSync = useCallback(async () => {
        if (syncingRef.current) return;
        syncingRef.current = true;
        setIsSyncing(true);
        setSyncError(null);

        try {
            const items = await getOutboxItems();

            if (items.length === 0) {
                setIsSyncing(false);
                syncingRef.current = false;
                return;
            }

            // Get CSRF token from meta tag
            const csrfToken = document.querySelector('meta[name="csrf-token"]')?.content;

            const response = await fetch('/student/attendance/sync', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'X-CSRF-TOKEN': csrfToken || '',
                    'X-Requested-With': 'XMLHttpRequest',
                },
                credentials: 'same-origin',
                body: JSON.stringify({
                    items: items.map(item => ({
                        idempotency_key: item.idempotencyKey,
                        session_id: item.sessionId,
                        attendance_code: item.attendanceCode,
                        status: item.status,
                        was_offline: item.wasOffline ?? false,
                        submitted_at: item.submittedAt,
                        device_info: item.deviceInfo,
                    })),
                }),
            });

            if (!response.ok) {
                throw new Error(`Sync failed: ${response.status}`);
            }

            const data = await response.json();

            // 'queued' = dispatched to server queue (202 response) — safe to clear from outbox
            const syncedKeys = data.results
                .filter(r => r.result === 'created' || r.result === 'duplicate' || r.result === 'queued')
                .map(r => r.key);

            if (syncedKeys.length > 0) {
                await markMultipleSynced(syncedKeys);
                await clearSynced();
            }

            setLastSyncTime(new Date());
            setSyncError(null);
            await refreshPendingCount();
            
            // Notify UI that the server is successfully responding
            window.dispatchEvent(new Event('server-online'));
        } catch (err) {
            console.error('[OfflineSync] Manual sync failed:', err);
            setSyncError(err.message);
            // Mark pending items as offline since sync failed (server down / unreachable)
            await markPendingAsOffline();
            
            // Notify UI that the server is down so it switches to Offline Mode
            window.dispatchEvent(new Event('server-offline'));
        } finally {
            setIsSyncing(false);
            syncingRef.current = false;
        }
    }, [refreshPendingCount]);

    // Auto-sync when coming back online.
    // Cluster-based stagger: each cluster waits (clusterId - 1) x 3s before syncing.
    // This prevents thundering herd when 400 students reconnect after server downtime.
    // IMPORTANT: stagger is ONLY applied here, NOT in manualSync or queueAttendance.
    useEffect(() => {
        const handleOnline = async () => {
            const clusterId = await getAppState('cluster_id') ?? 1;
            const delayMs = (Number(clusterId) - 1) * 3000; // 3 seconds per cluster

            if (delayMs > 0) {
                console.log(`[OfflineSync] Back online. Cluster ${clusterId} — waiting ${delayMs}ms before sync.`);
                await new Promise(resolve => setTimeout(resolve, delayMs));
            }

            manualSync();
        };

        window.addEventListener('online', handleOnline);
        return () => window.removeEventListener('online', handleOnline);
    }, [manualSync]);

    return {
        pendingCount,
        isSyncing,
        lastSyncTime,
        syncError,
        hasSyncSupport,
        queueAttendance,
        manualSync,
        refreshPendingCount,
    };
}
