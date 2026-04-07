import { Head, router } from "@inertiajs/react";
import { useState, useCallback, useEffect } from "react";
import AppLayout from "../../Components/Layout/AppLayout";
import OfflineBanner from "../../Components/OfflineBanner";
import SyncStatusBadge from "../../Components/SyncStatusBadge";
import ManualSyncButton from "../../Components/ManualSyncButton";
import Toast from "../../Components/Toast";
import { useOfflineSync } from "../../hooks/useOfflineSync";
import { useConnectivity } from "../../hooks/useConnectivity";
import { setAppState } from "../../lib/indexeddb";

export default function Attendance({ sessions, existingAttendances, cluster }) {
    const { isOnline } = useConnectivity();
    const {
        pendingCount,
        isSyncing,
        lastSyncTime,
        syncError,
        hasSyncSupport,
        queueAttendance,
        manualSync,
    } = useOfflineSync();

    // Universal single code input
    const [globalCode, setGlobalCode] = useState("");
    const [submitError, setSubmitError] = useState(null);
    const [submittedSessions, setSubmittedSessions] = useState({});

    // SHA-256 Web Crypto helper
    const sha256 = async (message) => {
        const msgBuffer = new TextEncoder().encode(message);
        const hashBuffer = await crypto.subtle.digest("SHA-256", msgBuffer);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
    };

    const handleGlobalAttend = async () => {
        const code = globalCode.toUpperCase();

        if (code.length < 3) {
            setSubmitError("Kode minimal 3 karakter");
            return;
        }

        try {
            // Cryptographically check the code locally
            const hashedInput = await sha256(code);
            const targetSession = sessions.find(
                (s) => s.hashed_code === hashedInput,
            );

            if (!targetSession) {
                setSubmitError("Kode absensi tidak ditemukan atau salah.");
                return;
            }

            if (isSubmitted(targetSession.id)) {
                setSubmitError("Anda sudah absen untuk sesi ini.");
                return;
            }

            // Queue the correct targeted session
            const key = await queueAttendance(
                targetSession.id,
                "present",
                code,
            );

            localStorage.setItem(
                `attend_queued_${targetSession.id}`,
                JSON.stringify({ key, time: new Date().toISOString(), code }),
            );

            setSubmittedSessions((prev) => ({
                ...prev,
                [targetSession.id]: {
                    key,
                    time: new Date().toISOString(),
                    code,
                },
            }));

            // Clear on success
            setGlobalCode("");
            setSubmitError(null);

            // Fire global toast logic if needed, UI will react automatically
        } catch (err) {
            console.error("Failed to queue attendance:", err);
            setSubmitError("Gagal menyimpan. Coba lagi.");
        }
    };

    // Cleanup queue caching if server already has it, else restore from queue
    useEffect(() => {
        const localSessions = {};
        if (sessions) {
            sessions.forEach((s) => {
                const lsKey = `attend_queued_${s.id}`;
                if (existingAttendances?.[s.id]) {
                    localStorage.removeItem(lsKey);
                } else {
                    const queuedData = localStorage.getItem(lsKey);
                    if (queuedData) {
                        try {
                            localSessions[s.id] = JSON.parse(queuedData);
                        } catch (e) {}
                    }
                }
            });
        }
        // Also clean up submittedSessions state for items that have arrived from server
        setSubmittedSessions((prev) => {
            const next = { ...prev, ...localSessions };
            let changed = false;
            Object.keys(next).forEach((id) => {
                if (existingAttendances?.[id]) {
                    delete next[id];
                    changed = true;
                }
            });
            return changed ? next : prev;
        });
    }, [sessions, existingAttendances]);

    // Intelligent Polling: Auto-refresh INERTIA props if there is an optimistic UI state waiting for the Queue
    const hasPendingUI = Object.keys(submittedSessions).some(id => !existingAttendances?.[id]);
    useEffect(() => {
        let interval;
        if (hasPendingUI && isOnline) {
            interval = setInterval(() => {
                router.reload({ only: ['existingAttendances'], preserveState: true, preserveScroll: true });
            }, 3000);
        }
        return () => clearInterval(interval);
    }, [hasPendingUI, isOnline]);

    const isSubmitted = (sessionId) => {
        return existingAttendances?.[sessionId] || submittedSessions[sessionId];
    };

    const clusterActive = cluster?.is_active;

    useEffect(() => {
        if (cluster?.id) {
            setAppState("cluster_id", cluster.id);
        }
    }, [cluster?.id]);

    return (
        <AppLayout>
            <Head title="Absensi" />
            <OfflineBanner />
            <Toast />

            <div className="page-container">
                <div className="page-header">
                    <div className="flex justify-between items-center">
                        <div>
                            <h1 className="page-title">Absensi</h1>
                            <p className="page-subtitle">
                                {cluster?.name || "Cluster tidak diset"} •{" "}
                                <span
                                    style={{
                                        color: clusterActive
                                            ? "var(--color-success)"
                                            : "var(--color-danger)",
                                    }}
                                >
                                    {clusterActive
                                        ? "🟢 Cluster aktif"
                                        : "🔴 Cluster tidak aktif"}
                                </span>
                            </p>
                        </div>
                        <div
                            className="flex flex-col items-center gap-sm"
                            style={{ alignItems: "flex-end" }}
                        >
                            <SyncStatusBadge
                                pendingCount={pendingCount}
                                isSyncing={isSyncing}
                                lastSyncTime={lastSyncTime}
                            />
                            {!isOnline && (
                                <span className="badge badge-pending">
                                    Offline Mode
                                </span>
                            )}
                        </div>
                    </div>
                </div>

                {!clusterActive && (
                    <div
                        className="card mb-lg"
                        style={{
                            border: "1px solid rgba(239, 68, 68, 0.3)",
                            background: "rgba(239, 68, 68, 0.05)",
                        }}
                    >
                        <div className="flex items-center gap-md">
                            <div style={{ fontSize: "2rem" }}>🚫</div>
                            <div>
                                <h3
                                    style={{
                                        fontSize: "1rem",
                                        marginBottom: 4,
                                    }}
                                >
                                    Cluster Belum Diaktifkan
                                </h3>
                                <p className="text-sm text-muted">
                                    Admin belum mengaktifkan cluster Anda untuk
                                    absensi. Silakan tunggu hingga cluster
                                    diaktifkan.
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {(() => {
                    if (!sessions || sessions.length === 0) {
                        return (
                            <div
                                className="card text-center"
                                style={{ padding: "var(--space-2xl)" }}
                            >
                                <div
                                    style={{
                                        fontSize: "3rem",
                                        marginBottom: "var(--space-md)",
                                    }}
                                >
                                    📭
                                </div>
                                <h3>Tidak Ada Sesi Aktif</h3>
                                <p className="text-muted text-sm mt-sm">
                                    Saat ini tidak ada sesi absensi yang aktif
                                    untuk cluster Anda.
                                </p>
                            </div>
                        );
                    }

                    const unsubmittedSessions = sessions.filter(
                        (s) => !isSubmitted(s.id),
                    );
                    const attendedSessions = sessions.filter((s) =>
                        isSubmitted(s.id),
                    );

                    return (
                        <div
                            className="grid"
                            style={{ gap: "var(--space-xl)" }}
                        >
                            {unsubmittedSessions.length > 0 ? (
                                <div
                                    className="card animate-slide-up"
                                    style={{
                                        padding: "var(--space-xl)",
                                        textAlign: "center",
                                        border: "2px solid var(--color-border)",
                                        background: "var(--color-bg-card)",
                                    }}
                                >
                                    <h2
                                        style={{
                                            fontSize: "1.4rem",
                                            fontWeight: 800,
                                            marginBottom: "var(--space-sm)",
                                        }}
                                    >
                                        Masukkan Kode Absensi
                                    </h2>
                                    <p
                                        className="text-muted"
                                        style={{
                                            marginBottom: "var(--space-lg)",
                                        }}
                                    >
                                        Ketikkan 6-digit kode unik sesi Anda
                                    </p>

                                    <div
                                        style={{
                                            maxWidth: "350px",
                                            margin: "0 auto",
                                        }}
                                    >
                                        <input
                                            type="text"
                                            className="form-input"
                                            value={globalCode}
                                            onChange={(e) => {
                                                setGlobalCode(
                                                    e.target.value
                                                        .toUpperCase()
                                                        .replace(
                                                            /[^A-Z0-9]/g,
                                                            "",
                                                        )
                                                        .slice(0, 6),
                                                );
                                                setSubmitError(null);
                                            }}
                                            placeholder="------"
                                            maxLength={6}
                                            disabled={!clusterActive}
                                            onKeyDown={(e) => {
                                                if (e.key === "Enter")
                                                    handleGlobalAttend();
                                            }}
                                            style={{
                                                fontFamily:
                                                    "'JetBrains Mono', monospace",
                                                fontSize: "2.5rem",
                                                letterSpacing: "0.2em",
                                                textAlign: "center",
                                                textTransform: "uppercase",
                                                padding: "var(--space-md)",
                                                marginBottom: "var(--space-md)",
                                                border: "2px dashed var(--color-border)",
                                                background: "rgba(0,0,0,0.05)",
                                                borderRadius: "16px",
                                            }}
                                        />
                                        {submitError && (
                                            <span
                                                className="form-error"
                                                style={{
                                                    display: "block",
                                                    marginBottom:
                                                        "var(--space-md)",
                                                }}
                                            >
                                                {submitError}
                                            </span>
                                        )}
                                        <button
                                            className="attendance-btn"
                                            onClick={handleGlobalAttend}
                                            disabled={
                                                !clusterActive ||
                                                globalCode.length < 3
                                            }
                                            style={{
                                                width: "100%",
                                                padding: "16px",
                                                fontSize: "1.2rem",
                                                borderRadius: "16px",
                                            }}
                                        >
                                            {clusterActive
                                                ? globalCode.length >= 3
                                                    ? "✅ HADIR"
                                                    : "Ketik Kode..."
                                                : "🚫 Cluster Tidak Aktif"}
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div
                                    className="card text-center animate-slide-up"
                                    style={{
                                        padding: "var(--space-2xl)",
                                        border: "1px solid rgba(34, 197, 94, 0.3)",
                                        background: "rgba(34, 197, 94, 0.05)",
                                    }}
                                >
                                    <div
                                        style={{
                                            fontSize: "4rem",
                                            marginBottom: "var(--space-sm)",
                                        }}
                                    >
                                        🎉
                                    </div>
                                    <h2
                                        style={{
                                            color: "var(--color-success)",
                                            marginBottom: "var(--space-xs)",
                                        }}
                                    >
                                        Semua Selesai!
                                    </h2>
                                    <p className="text-muted">
                                        Kamu sudah menyelesaikan seluruh absensi
                                        hari ini. Silakan istirahat.
                                    </p>
                                </div>
                            )}

                            {attendedSessions.length > 0 && (
                                <div
                                    className="animate-slide-up"
                                    style={{ animationDelay: "0.1s" }}
                                >
                                    <h3
                                        style={{
                                            fontSize: "1.1rem",
                                            marginBottom: "var(--space-md)",
                                            paddingLeft: "var(--space-xs)",
                                            borderLeft:
                                                "4px solid var(--color-primary)",
                                        }}
                                    >
                                        &nbsp; History Absensi
                                    </h3>
                                    <div
                                        className="grid"
                                        style={{ gap: "var(--space-sm)" }}
                                    >
                                        {attendedSessions.map((session) => (
                                            <div
                                                key={session.id}
                                                className="card"
                                                style={{
                                                    padding: "var(--space-md)",
                                                    border: "1px solid rgba(59, 130, 246, 0.3)",
                                                    background:
                                                        "rgba(59, 130, 246, 0.05)",
                                                    display: "flex",
                                                    justifyContent:
                                                        "space-between",
                                                    alignItems: "center",
                                                }}
                                            >
                                                <div>
                                                    <h4
                                                        style={{
                                                            fontWeight: 700,
                                                            marginBottom: "4px",
                                                        }}
                                                    >
                                                        {session.title}
                                                    </h4>
                                                    <small
                                                        className="text-muted"
                                                        style={{ opacity: 0.8 }}
                                                    >
                                                        {new Date(
                                                            session.session_date,
                                                        ).toLocaleDateString(
                                                            "id-ID",
                                                            {
                                                                day: "numeric",
                                                                month: "short",
                                                            },
                                                        )}{" "}
                                                        • {session.start_time} -{" "}
                                                        {session.end_time}
                                                    </small>
                                                </div>
                                                <div
                                                    style={{
                                                        textAlign: "right",
                                                    }}
                                                >
                                                    <span
                                                        className="badge badge-info"
                                                        style={{
                                                            display:
                                                                "inline-block",
                                                            marginBottom: "4px",
                                                        }}
                                                    >
                                                        ✓ Hadir
                                                    </span>
                                                    {submittedSessions[
                                                        session.id
                                                    ] &&
                                                        !existingAttendances?.[
                                                            session.id
                                                        ] && (
                                                            <div
                                                                className="text-xs"
                                                                style={{
                                                                    opacity: 0.7,
                                                                }}
                                                            >
                                                                ⏳ Menunggu
                                                                sinkronisasi...
                                                            </div>
                                                        )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })()}

                <div
                    style={{
                        marginTop: "var(--space-xl)",
                        display: "flex",
                        justifyContent: "center",
                    }}
                >
                    <ManualSyncButton
                        pendingCount={pendingCount}
                        isSyncing={isSyncing}
                        onSync={manualSync}
                        hasSyncSupport={hasSyncSupport}
                    />
                </div>

                {syncError && (
                    <div className="text-center mt-md">
                        <span
                            className="text-sm"
                            style={{ color: "var(--color-danger)" }}
                        >
                            ⚠️ Sync error: {syncError}
                        </span>
                    </div>
                )}
            </div>
        </AppLayout>
    );
}
