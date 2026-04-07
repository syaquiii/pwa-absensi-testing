import { useConnectivity } from '../hooks/useConnectivity';
import { useOfflineSync } from '../hooks/useOfflineSync';

export default function OfflineBanner() {
    const { isOnline } = useConnectivity();
    const { pendingCount, isSyncing } = useOfflineSync();

    // Offline state
    if (!isOnline) {
        return (
            <div className="offline-banner">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="1" y1="1" x2="23" y2="23" />
                    <path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55" />
                    <path d="M5 12.55a10.94 10.94 0 0 1 5.17-2.39" />
                    <path d="M10.71 5.05A16 16 0 0 1 22.56 9" />
                    <path d="M1.42 9a15.91 15.91 0 0 1 4.7-2.88" />
                    <path d="M8.53 16.11a6 6 0 0 1 6.95 0" />
                    <line x1="12" y1="20" x2="12.01" y2="20" />
                </svg>
                <span>Anda sedang offline — data akan disinkronkan saat koneksi pulih</span>
            </div>
        );
    }

    // Just came back online with pending data
    if (isSyncing || pendingCount > 0) {
        return (
            <div className="offline-banner syncing">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="spin">
                    <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                </svg>
                <span>Kamu kembali online, data sedang di-sync...</span>
            </div>
        );
    }

    return null;
}
