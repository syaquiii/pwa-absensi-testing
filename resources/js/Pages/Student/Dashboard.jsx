import { Head, Link } from '@inertiajs/react';
import AppLayout from '../../Components/Layout/AppLayout';
import OfflineBanner from '../../Components/OfflineBanner';
import Toast from '../../Components/Toast';

export default function Dashboard({ cluster, activeSession, recentAttendances }) {
    return (
        <AppLayout>
            <Head title="Dashboard" />
            <OfflineBanner />
            <Toast />

            <div className="page-container">
                <div className="page-header">
                    <h1 className="page-title">Dashboard Student</h1>
                    <p className="page-subtitle">Selamat datang! Berikut ringkasan absensi Anda.</p>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-3 mb-lg">
                    {/* Cluster Status */}
                    <div className="stat-card">
                        <div className="flex items-center gap-sm mb-md">
                            <div style={{
                                width: 40, height: 40,
                                borderRadius: 'var(--radius-md)',
                                background: 'var(--color-accent-light)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                            }}>
                                🏢
                            </div>
                            <div>
                                <div className="stat-label">Cluster</div>
                                <div style={{ fontWeight: 700 }}>{cluster?.name || 'Belum ada'}</div>
                            </div>
                        </div>
                        <span className={`badge ${cluster?.is_active ? 'badge-active' : 'badge-inactive'}`}>
                            {cluster?.is_active ? '🟢 Aktif' : '🔴 Tidak aktif'}
                        </span>
                    </div>

                    {/* Active Session */}
                    <div className="stat-card">
                        <div className="flex items-center gap-sm mb-md">
                            <div style={{
                                width: 40, height: 40,
                                borderRadius: 'var(--radius-md)',
                                background: 'var(--color-success-light)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                            }}>
                                📅
                            </div>
                            <div>
                                <div className="stat-label">Sesi Aktif</div>
                                <div style={{ fontWeight: 700 }}>
                                    {activeSession?.title || 'Tidak ada sesi'}
                                </div>
                            </div>
                        </div>
                        {activeSession && (
                            <span className="text-sm text-muted">
                                {activeSession.start_time} - {activeSession.end_time}
                            </span>
                        )}
                    </div>

                    {/* Quick Action */}
                    <div className="stat-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
                        {activeSession && cluster?.is_active ? (
                            <Link href="/student/attendance" className="btn btn-success btn-lg" style={{ width: '100%' }}>
                                ✅ Absen Sekarang
                            </Link>
                        ) : (
                            <div className="text-center">
                                <p className="text-muted text-sm">
                                    {!activeSession ? 'Belum ada sesi aktif' : 'Cluster Anda belum diaktifkan'}
                                </p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Recent Attendances */}
                <div className="card">
                    <h2 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: 'var(--space-md)' }}>
                        Riwayat Absensi Terakhir
                    </h2>

                    {recentAttendances?.length > 0 ? (
                        <div className="table-container">
                            <table>
                                <thead>
                                    <tr>
                                        <th>Sesi</th>
                                        <th>Status</th>
                                        <th>Waktu Submit</th>
                                        <th>Sync</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {recentAttendances.map((att) => (
                                        <tr key={att.id} className="animate-fade-in">
                                            <td>{att.attendance_session?.title || '-'}</td>
                                            <td>
                                                <span className={`badge ${att.status === 'present' ? 'badge-active' : att.status === 'late' ? 'badge-pending' : 'badge-inactive'}`}>
                                                    {att.status === 'present' ? 'Hadir' : att.status === 'late' ? 'Terlambat' : 'Absen'}
                                                </span>
                                            </td>
                                            <td className="text-sm text-muted">
                                                {att.submitted_at ? new Date(att.submitted_at).toLocaleString('id-ID') : '-'}
                                            </td>
                                            <td>
                                                {att.synced_at ? (
                                                    <span style={{ color: 'var(--color-success)' }}>✓</span>
                                                ) : (
                                                    <span className="animate-pulse" style={{ color: 'var(--color-warning)' }}>⏳</span>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <p className="text-muted text-sm text-center" style={{ padding: 'var(--space-xl)' }}>
                            Belum ada riwayat absensi
                        </p>
                    )}
                </div>
            </div>
        </AppLayout>
    );
}
