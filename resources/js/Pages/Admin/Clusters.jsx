import { Head, router } from '@inertiajs/react';
import { useState } from 'react';
import AppLayout from '../../Components/Layout/AppLayout';
import Toast from '../../Components/Toast';

export default function Clusters({ clusters, attendanceCounts, activeSession }) {
    const [selectedIds, setSelectedIds] = useState([]);
    const [isProcessing, setIsProcessing] = useState(false);

    const handleToggle = (clusterId) => {
        setIsProcessing(true);
        router.post(`/admin/clusters/${clusterId}/toggle`, {}, {
            preserveScroll: true,
            onFinish: () => setIsProcessing(false),
        });
    };

    const handleBatchToggle = (isActive) => {
        if (selectedIds.length === 0) return;
        setIsProcessing(true);
        router.post('/admin/clusters/batch-toggle', {
            cluster_ids: selectedIds,
            is_active: isActive,
        }, {
            preserveScroll: true,
            onFinish: () => {
                setIsProcessing(false);
                setSelectedIds([]);
            },
        });
    };

    const handleSelectAll = () => {
        if (selectedIds.length === clusters.length) {
            setSelectedIds([]);
        } else {
            setSelectedIds(clusters.map(c => c.id));
        }
    };

    const handleSelectCluster = (id) => {
        setSelectedIds(prev =>
            prev.includes(id)
                ? prev.filter(x => x !== id)
                : [...prev, id]
        );
    };

    const activeCount = clusters.filter(c => c.is_active).length;
    const totalStudents = clusters.reduce((sum, c) => sum + (c.users_count || 0), 0);

    return (
        <AppLayout>
            <Head title="Kelola Cluster" />
            <Toast />

            <div className="page-container">
                <div className="page-header">
                    <div className="flex justify-between items-center">
                        <div>
                            <h1 className="page-title">Kelola Cluster</h1>
                            <p className="page-subtitle">
                                {activeCount} dari {clusters.length} cluster aktif • {totalStudents.toLocaleString()} total siswa
                            </p>
                        </div>

                        {activeSession && (
                            <span className="badge badge-active">
                                Sesi: {activeSession.title}
                            </span>
                        )}
                    </div>
                </div>

                {/* Batch Actions Bar */}
                <div className="card mb-lg" style={{ padding: 'var(--space-md) var(--space-lg)' }}>
                    <div className="flex justify-between items-center">
                        <div className="flex items-center gap-md">
                            <label className="flex items-center gap-sm" style={{ cursor: 'pointer' }}>
                                <input
                                    type="checkbox"
                                    checked={selectedIds.length === clusters.length && clusters.length > 0}
                                    onChange={handleSelectAll}
                                    style={{ accentColor: 'var(--color-accent)' }}
                                />
                                <span className="text-sm">
                                    {selectedIds.length > 0
                                        ? `${selectedIds.length} dipilih`
                                        : 'Pilih semua'}
                                </span>
                            </label>
                        </div>

                        <div className="flex gap-sm">
                            <button
                                className="btn btn-success btn-sm"
                                onClick={() => handleBatchToggle(true)}
                                disabled={selectedIds.length === 0 || isProcessing}
                            >
                                🟢 Aktifkan ({selectedIds.length})
                            </button>
                            <button
                                className="btn btn-danger btn-sm"
                                onClick={() => handleBatchToggle(false)}
                                disabled={selectedIds.length === 0 || isProcessing}
                            >
                                🔴 Nonaktifkan ({selectedIds.length})
                            </button>
                        </div>
                    </div>
                </div>

                {/* Clusters Grid */}
                <div className="grid grid-2">
                    {clusters.map((cluster, index) => (
                        <div
                            key={cluster.id}
                            className={`cluster-card animate-slide-up ${cluster.is_active ? 'active' : ''}`}
                            style={{ animationDelay: `${index * 40}ms` }}
                        >
                            <div className="flex items-center gap-md" style={{ flex: 1 }}>
                                <input
                                    type="checkbox"
                                    checked={selectedIds.includes(cluster.id)}
                                    onChange={() => handleSelectCluster(cluster.id)}
                                    style={{ accentColor: 'var(--color-accent)' }}
                                    onClick={(e) => e.stopPropagation()}
                                />
                                <div className="cluster-info">
                                    <div className="cluster-name">{cluster.name}</div>
                                    <div className="cluster-meta">
                                        <span>👥 {cluster.users_count || 0} siswa</span>
                                        {attendanceCounts?.[cluster.id] !== undefined && (
                                            <span style={{ color: 'var(--color-success)' }}>
                                                ✅ {attendanceCounts[cluster.id]} hadir
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center gap-md">
                                <span className={`badge ${cluster.is_active ? 'badge-active' : 'badge-inactive'}`}>
                                    {cluster.is_active ? 'Aktif' : 'Nonaktif'}
                                </span>
                                <label className="toggle" onClick={(e) => e.stopPropagation()}>
                                    <input
                                        type="checkbox"
                                        checked={cluster.is_active}
                                        onChange={() => handleToggle(cluster.id)}
                                        disabled={isProcessing}
                                    />
                                    <span className="toggle-slider"></span>
                                </label>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </AppLayout>
    );
}
