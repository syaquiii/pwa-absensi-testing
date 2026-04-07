export default function SyncStatusBadge({ pendingCount, isSyncing, lastSyncTime }) {
    if (pendingCount === 0 && !isSyncing) {
        if (lastSyncTime) {
            return (
                <div className="flex items-center gap-sm text-sm" style={{ color: 'var(--color-success)' }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <polyline points="20 6 9 17 4 12" />
                    </svg>
                    <span>Tersinkronisasi • {formatTime(lastSyncTime)}</span>
                </div>
            );
        }
        return null;
    }

    if (isSyncing) {
        return (
            <div className="flex items-center gap-sm text-sm" style={{ color: 'var(--color-accent)' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="animate-spin">
                    <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                </svg>
                <span>Menyinkronkan...</span>
            </div>
        );
    }

    return (
        <div className="flex items-center gap-sm text-sm" style={{ color: 'var(--color-warning)' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
            </svg>
            <span>{pendingCount} item menunggu sinkronisasi</span>
        </div>
    );
}

function formatTime(date) {
    if (!date) return '';
    const d = new Date(date);
    return d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}
