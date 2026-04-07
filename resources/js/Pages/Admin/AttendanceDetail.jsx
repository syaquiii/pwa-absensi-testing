import { Head, Link } from '@inertiajs/react';
import AppLayout from '../../Components/Layout/AppLayout';

export default function AttendanceDetail({ session, attendances, clusterStats, overallStats }) {
    const syncModeLabel = (mode) => mode === 'offline' ? '📴 Offline' : '🌐 Online';
    const syncModeClass = (mode) => mode === 'offline' ? 'badge-pending' : 'badge-active';

    return (
        <AppLayout>
            <Head title={`Detail Absensi — ${session.title}`} />

            <div className="page-container">
                {/* Header */}
                <div className="page-header">
                    <div className="flex justify-between items-center">
                        <div>
                            <div className="flex items-center gap-sm mb-sm">
                                <Link href="/admin/sessions" className="text-sm text-muted" style={{ textDecoration: 'none' }}>
                                    ← Kembali ke Sessions
                                </Link>
                            </div>
                            <h1 className="page-title">{session.title}</h1>
                            <p className="page-subtitle">
                                {new Date(session.session_date).toLocaleDateString('id-ID', {
                                    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
                                })}
                                {' • '}{session.start_time} - {session.end_time}
                                {' • Kode: '}
                                <code style={{
                                    background: 'var(--color-accent-light)',
                                    color: 'var(--color-accent)',
                                    padding: '2px 8px',
                                    borderRadius: 'var(--radius-sm)',
                                    fontWeight: 700,
                                    letterSpacing: '0.1em',
                                }}>{session.attendance_code}</code>
                            </p>
                        </div>
                    </div>
                </div>

                {/* Overall Stats */}
                <div className="grid grid-4 mb-lg">
                    <div className="stat-card animate-slide-up">
                        <div className="stat-value">{overallStats.totalAttended}</div>
                        <div className="stat-label">Total Hadir</div>
                        <div className="text-xs text-muted mt-sm">
                            dari {overallStats.totalStudents} siswa
                        </div>
                    </div>
                    <div className="stat-card animate-slide-up" style={{ animationDelay: '80ms' }}>
                        <div className="stat-value" style={{
                            background: overallStats.percentage >= 75
                                ? 'linear-gradient(135deg, var(--color-success), #16a34a)'
                                : overallStats.percentage >= 50
                                    ? 'linear-gradient(135deg, var(--color-warning), #d97706)'
                                    : 'linear-gradient(135deg, var(--color-danger), #dc2626)',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                            backgroundClip: 'text',
                        }}>
                            {overallStats.percentage}%
                        </div>
                        <div className="stat-label">Persentase Kehadiran</div>
                    </div>
                    <div className="stat-card animate-slide-up" style={{ animationDelay: '160ms' }}>
                        <div className="flex items-center gap-sm">
                            <span style={{ fontSize: '1.5rem' }}>🌐</span>
                            <div>
                                <div className="stat-value" style={{ fontSize: '1.5rem' }}>{overallStats.onlineCount}</div>
                                <div className="stat-label">Online</div>
                            </div>
                        </div>
                    </div>
                    <div className="stat-card animate-slide-up" style={{ animationDelay: '240ms' }}>
                        <div className="flex items-center gap-sm">
                            <span style={{ fontSize: '1.5rem' }}>📴</span>
                            <div>
                                <div className="stat-value" style={{ fontSize: '1.5rem' }}>{overallStats.offlineCount}</div>
                                <div className="stat-label">Offline Sync</div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Cluster Breakdown */}
                <div className="card mb-lg">
                    <h2 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: 'var(--space-md)' }}>
                        📊 Kehadiran per Cluster
                    </h2>
                    <div className="grid grid-2" style={{ gap: 'var(--space-sm)' }}>
                        {clusterStats.map((cluster, i) => (
                            <div key={i} className="animate-slide-up" style={{
                                animationDelay: `${i * 30}ms`,
                                background: 'var(--color-bg-tertiary)',
                                borderRadius: 'var(--radius-md)',
                                padding: 'var(--space-md)',
                                border: '1px solid var(--color-border)',
                            }}>
                                <div className="flex justify-between items-center mb-sm">
                                    <div>
                                        <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>{cluster.cluster_name}</span>
                                        <span className="text-xs text-muted" style={{ marginLeft: 8 }}>{cluster.cluster_code}</span>
                                    </div>
                                    <span style={{
                                        fontWeight: 700,
                                        fontSize: '0.95rem',
                                        color: cluster.percentage >= 75
                                            ? 'var(--color-success)'
                                            : cluster.percentage >= 50
                                                ? 'var(--color-warning)'
                                                : cluster.percentage > 0
                                                    ? 'var(--color-danger)'
                                                    : 'var(--color-text-muted)',
                                    }}>
                                        {cluster.percentage}%
                                    </span>
                                </div>
                                {/* Progress Bar */}
                                <div style={{
                                    height: 6,
                                    background: 'var(--color-bg-primary)',
                                    borderRadius: 'var(--radius-full)',
                                    overflow: 'hidden',
                                    marginBottom: 6,
                                }}>
                                    <div style={{
                                        height: '100%',
                                        width: `${cluster.percentage}%`,
                                        background: cluster.percentage >= 75
                                            ? 'var(--color-success)'
                                            : cluster.percentage >= 50
                                                ? 'var(--color-warning)'
                                                : 'var(--color-danger)',
                                        borderRadius: 'var(--radius-full)',
                                        transition: 'width 0.5s ease',
                                    }} />
                                </div>
                                <div className="flex justify-between text-xs text-muted">
                                    <span>{cluster.attended}/{cluster.total_students} siswa</span>
                                    <span>
                                        🌐{cluster.online_count} 📴{cluster.offline_count}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Student List */}
                <div className="card">
                    <div className="flex justify-between items-center mb-md">
                        <h2 style={{ fontSize: '1.1rem', fontWeight: 700 }}>
                            👥 Daftar Siswa yang Sudah Absen ({attendances.length})
                        </h2>
                    </div>

                    {attendances.length > 0 ? (
                        <div className="table-container">
                            <table>
                                <thead>
                                    <tr>
                                        <th>#</th>
                                        <th>Nama</th>
                                        <th>Cluster</th>
                                        <th>Status</th>
                                        <th>Mode</th>
                                        <th>Waktu Submit</th>
                                        <th>Waktu Sync</th>
                                        <th>Delay</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {attendances.map((att, index) => (
                                        <tr key={att.id} className="animate-fade-in">
                                            <td className="text-sm text-muted">{index + 1}</td>
                                            <td>
                                                <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{att.user_name}</div>
                                                <div className="text-xs text-muted">{att.user_email}</div>
                                            </td>
                                            <td>
                                                <span className="badge badge-info">{att.cluster_code}</span>
                                            </td>
                                            <td>
                                                <span className={`badge ${att.status === 'present' ? 'badge-active' : att.status === 'late' ? 'badge-pending' : 'badge-inactive'}`}>
                                                    {att.status === 'present' ? 'Hadir' : att.status === 'late' ? 'Terlambat' : 'Absen'}
                                                </span>
                                            </td>
                                            <td>
                                                <span className={`badge ${syncModeClass(att.sync_mode)}`}>
                                                    {syncModeLabel(att.sync_mode)}
                                                </span>
                                            </td>
                                            <td className="text-sm text-muted">
                                                {att.submitted_at
                                                    ? new Date(att.submitted_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
                                                    : '-'
                                                }
                                            </td>
                                            <td className="text-sm text-muted">
                                                {att.synced_at
                                                    ? new Date(att.synced_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
                                                    : '-'
                                                }
                                            </td>
                                            <td className="text-sm">
                                                {att.sync_delay > 0 ? (
                                                    <span style={{
                                                        color: att.sync_delay > 60
                                                            ? 'var(--color-danger)'
                                                            : att.sync_delay > 10
                                                                ? 'var(--color-warning)'
                                                                : 'var(--color-success)',
                                                        fontWeight: 600,
                                                    }}>
                                                        {att.sync_delay > 60
                                                            ? `${Math.round(att.sync_delay / 60)}m ${att.sync_delay % 60}s`
                                                            : `${att.sync_delay}s`
                                                        }
                                                    </span>
                                                ) : (
                                                    <span style={{ color: 'var(--color-success)' }}>instant</span>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <div className="text-center" style={{ padding: 'var(--space-2xl)' }}>
                            <div style={{ fontSize: '3rem', marginBottom: 'var(--space-md)' }}>📭</div>
                            <h3>Belum Ada yang Absen</h3>
                            <p className="text-muted text-sm mt-sm">Belum ada siswa yang mengirimkan absensi untuk sesi ini</p>
                        </div>
                    )}
                </div>
            </div>
        </AppLayout>
    );
}
