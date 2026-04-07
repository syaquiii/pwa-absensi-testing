import { Head } from '@inertiajs/react';
import AppLayout from '../../Components/Layout/AppLayout';
import Toast from '../../Components/Toast';

export default function Dashboard({ stats }) {
    const statCards = [
        {
            icon: '👥',
            label: 'Total Siswa Aktif',
            value: stats?.totalStudents || 0,
            color: 'var(--color-accent)',
        },
        {
            icon: '🏢',
            label: 'Total Cluster',
            value: stats?.totalClusters || 0,
            color: '#8b5cf6',
        },
        {
            icon: '🟢',
            label: 'Cluster Aktif',
            value: stats?.activeClusters || 0,
            color: 'var(--color-success)',
        },
        {
            icon: '📋',
            label: 'Absensi Hari Ini',
            value: stats?.todayAttendanceCount || 0,
            color: 'var(--color-warning)',
        },
    ];

    return (
        <AppLayout>
            <Head title="Admin Dashboard" />
            <Toast />

            <div className="page-container">
                <div className="page-header">
                    <h1 className="page-title">Admin Dashboard</h1>
                    <p className="page-subtitle">
                        {stats?.todaySession
                            ? `Sesi aktif: ${stats.todaySession.title}`
                            : 'Tidak ada sesi aktif hari ini'}
                    </p>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-4 mb-lg">
                    {statCards.map((card, index) => (
                        <div key={index} className="stat-card animate-slide-up" style={{ animationDelay: `${index * 80}ms` }}>
                            <div style={{
                                width: 48,
                                height: 48,
                                borderRadius: 'var(--radius-md)',
                                background: `${card.color}15`,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '1.5rem',
                                marginBottom: 'var(--space-md)',
                            }}>
                                {card.icon}
                            </div>
                            <div className="stat-value">{card.value.toLocaleString()}</div>
                            <div className="stat-label">{card.label}</div>
                        </div>
                    ))}
                </div>

                {/* Quick Info */}
                <div className="card">
                    <h2 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: 'var(--space-md)' }}>
                        Panduan Admin
                    </h2>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
                        <div className="flex items-center gap-md">
                            <div style={{
                                width: 36, height: 36, borderRadius: 'var(--radius-sm)',
                                background: 'var(--color-accent-light)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                            }}>1</div>
                            <div>
                                <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>Buat Session Absensi</div>
                                <div className="text-sm text-muted">Pergi ke halaman Sessions → buat sesi baru untuk hari ini</div>
                            </div>
                        </div>
                        <div className="flex items-center gap-md">
                            <div style={{
                                width: 36, height: 36, borderRadius: 'var(--radius-sm)',
                                background: 'var(--color-success-light)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                            }}>2</div>
                            <div>
                                <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>Aktifkan Cluster</div>
                                <div className="text-sm text-muted">Pergi ke halaman Clusters → toggle cluster yang boleh absen</div>
                            </div>
                        </div>
                        <div className="flex items-center gap-md">
                            <div style={{
                                width: 36, height: 36, borderRadius: 'var(--radius-sm)',
                                background: 'var(--color-warning-light)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                            }}>3</div>
                            <div>
                                <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>Monitor Absensi</div>
                                <div className="text-sm text-muted">Pantau jumlah absensi per cluster secara real-time</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
