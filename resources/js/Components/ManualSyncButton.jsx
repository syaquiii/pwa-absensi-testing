export default function ManualSyncButton({ pendingCount, isSyncing, onSync, hasSyncSupport }) {
    // Only show if Background Sync is NOT supported (iOS/Safari fallback)
    // OR if there are pending items (show as convenience even with sync support)
    if (pendingCount === 0) return null;

    return (
        <button
            className="sync-button"
            onClick={onSync}
            disabled={isSyncing || pendingCount === 0}
        >
            {isSyncing ? (
                <>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="animate-spin">
                        <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                    </svg>
                    <span>Menyinkronkan...</span>
                </>
            ) : (
                <>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="23 4 23 10 17 10" />
                        <polyline points="1 20 1 14 7 14" />
                        <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
                    </svg>
                    <span>Sync Sekarang</span>
                    <span className="badge-count">{pendingCount}</span>
                </>
            )}

            {!hasSyncSupport && !isSyncing && (
                <span className="text-xs" style={{ opacity: 0.7, display: 'block', marginTop: 2 }}>
                    (Manual sync diperlukan di perangkat ini)
                </span>
            )}
        </button>
    );
}
