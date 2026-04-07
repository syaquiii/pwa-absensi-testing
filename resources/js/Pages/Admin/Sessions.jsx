import { Head, useForm, router, Link } from '@inertiajs/react';
import { useState } from 'react';
import AppLayout from '../../Components/Layout/AppLayout';
import Toast from '../../Components/Toast';

export default function Sessions({ sessions }) {
    const [showForm, setShowForm] = useState(false);

    const { data, setData, post, processing, errors, reset } = useForm({
        title: '',
        attendance_code: '',
        session_date: new Date().toISOString().split('T')[0],
        start_time: '08:00',
        end_time: '09:30',
        status: 'active',
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        post('/admin/sessions', {
            preserveScroll: true,
            onSuccess: () => {
                reset();
                setShowForm(false);
            },
        });
    };

    const handleStatusChange = (sessionId, newStatus) => {
        router.put(`/admin/sessions/${sessionId}`, {
            status: newStatus,
        }, { preserveScroll: true });
    };

    const handleDelete = (sessionId) => {
        if (confirm('Yakin ingin menghapus sesi ini?')) {
            router.delete(`/admin/sessions/${sessionId}`, {
                preserveScroll: true,
            });
        }
    };

    const statusColors = {
        scheduled: 'badge-pending',
        active: 'badge-active',
        closed: 'badge-inactive',
    };

    const statusLabels = {
        scheduled: 'Terjadwal',
        active: 'Aktif',
        closed: 'Selesai',
    };

    return (
        <AppLayout>
            <Head title="Kelola Session" />
            <Toast />

            <div className="page-container">
                <div className="page-header">
                    <div className="flex justify-between items-center">
                        <div>
                            <h1 className="page-title">Kelola Session</h1>
                            <p className="page-subtitle">Buat dan kelola sesi absensi dengan kode unik</p>
                        </div>
                        <button
                            className="btn btn-primary"
                            onClick={() => setShowForm(!showForm)}
                        >
                            {showForm ? '✕ Batal' : '+ Buat Session'}
                        </button>
                    </div>
                </div>

                {/* Create Form */}
                {showForm && (
                    <div className="card mb-lg animate-slide-up">
                        <h3 style={{ marginBottom: 'var(--space-md)' }}>Buat Session Baru</h3>
                        <form onSubmit={handleSubmit}>
                            <div className="grid grid-2 mb-md">
                                <div className="form-group">
                                    <label className="form-label" htmlFor="title">Nama Session</label>
                                    <input
                                        id="title"
                                        type="text"
                                        className="form-input"
                                        value={data.title}
                                        onChange={(e) => setData('title', e.target.value)}
                                        placeholder="e.g. Pertemuan 1"
                                        required
                                    />
                                    {errors.title && <span className="form-error">{errors.title}</span>}
                                </div>
                                <div className="form-group">
                                    <label className="form-label" htmlFor="attendance_code">Kode Absensi</label>
                                    <input
                                        id="attendance_code"
                                        type="text"
                                        className="form-input"
                                        value={data.attendance_code}
                                        onChange={(e) => setData('attendance_code', e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6))}
                                        placeholder="e.g. AB3F2K"
                                        maxLength={6}
                                        required
                                        style={{
                                            fontFamily: "'JetBrains Mono', monospace",
                                            fontSize: '1.1rem',
                                            letterSpacing: '0.15em',
                                            textTransform: 'uppercase',
                                        }}
                                    />
                                    <span className="text-xs text-muted">
                                        Maks 6 karakter, huruf & angka. Kode ini akan diinput siswa untuk absen.
                                    </span>
                                    {errors.attendance_code && <span className="form-error">{errors.attendance_code}</span>}
                                </div>
                            </div>
                            <div className="grid grid-4 mb-md">
                                <div className="form-group">
                                    <label className="form-label" htmlFor="session_date">Tanggal</label>
                                    <input
                                        id="session_date"
                                        type="date"
                                        className="form-input"
                                        value={data.session_date}
                                        onChange={(e) => setData('session_date', e.target.value)}
                                        required
                                    />
                                    {errors.session_date && <span className="form-error">{errors.session_date}</span>}
                                </div>
                                <div className="form-group">
                                    <label className="form-label" htmlFor="start_time">Mulai</label>
                                    <input
                                        id="start_time"
                                        type="time"
                                        className="form-input"
                                        value={data.start_time}
                                        onChange={(e) => setData('start_time', e.target.value)}
                                        required
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="form-label" htmlFor="end_time">Selesai</label>
                                    <input
                                        id="end_time"
                                        type="time"
                                        className="form-input"
                                        value={data.end_time}
                                        onChange={(e) => setData('end_time', e.target.value)}
                                        required
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="form-label" htmlFor="status">Status</label>
                                    <select
                                        id="status"
                                        className="form-input"
                                        value={data.status}
                                        onChange={(e) => setData('status', e.target.value)}
                                    >
                                        <option value="scheduled">Terjadwal</option>
                                        <option value="active">Aktif</option>
                                        <option value="closed">Selesai</option>
                                    </select>
                                </div>
                            </div>
                            <div className="flex gap-sm" style={{ justifyContent: 'flex-end' }}>
                                <button type="button" className="btn btn-outline" onClick={() => setShowForm(false)}>
                                    Batal
                                </button>
                                <button type="submit" className="btn btn-primary" disabled={processing}>
                                    {processing ? 'Menyimpan...' : 'Simpan Session'}
                                </button>
                            </div>
                        </form>
                    </div>
                )}

                {/* Sessions Table */}
                <div className="card">
                    {sessions?.data?.length > 0 ? (
                        <div className="table-container">
                            <table>
                                <thead>
                                    <tr>
                                        <th>Nama</th>
                                        <th>Kode</th>
                                        <th>Tanggal</th>
                                        <th>Waktu</th>
                                        <th>Status</th>
                                        <th>Absensi</th>
                                        <th>Aksi</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {sessions.data.map((session) => (
                                        <tr key={session.id}>
                                            <td style={{ fontWeight: 600 }}>{session.title}</td>
                                            <td>
                                                <code style={{
                                                    background: 'var(--color-accent-light)',
                                                    color: 'var(--color-accent)',
                                                    padding: '3px 10px',
                                                    borderRadius: 'var(--radius-sm)',
                                                    fontFamily: "'JetBrains Mono', monospace",
                                                    fontSize: '0.9rem',
                                                    fontWeight: 700,
                                                    letterSpacing: '0.1em',
                                                }}>
                                                    {session.attendance_code}
                                                </code>
                                            </td>
                                            <td className="text-sm">
                                                {new Date(session.session_date).toLocaleDateString('id-ID', {
                                                    day: 'numeric', month: 'short', year: 'numeric'
                                                })}
                                            </td>
                                            <td className="text-sm text-muted">
                                                {session.start_time} - {session.end_time}
                                            </td>
                                            <td>
                                                <span className={`badge ${statusColors[session.status]}`}>
                                                    {statusLabels[session.status]}
                                                </span>
                                            </td>
                                            <td className="text-sm">
                                                <Link href={`/admin/sessions/${session.id}/attendances`} style={{ color: 'var(--color-accent)', fontWeight: 600 }}>
                                                    {session.attendances_count || 0} →
                                                </Link>
                                            </td>
                                            <td>
                                                <div className="flex gap-sm">
                                                    {session.status !== 'active' && (
                                                        <button
                                                            className="btn btn-success btn-sm"
                                                            onClick={() => handleStatusChange(session.id, 'active')}
                                                        >
                                                            Aktifkan
                                                        </button>
                                                    )}
                                                    {session.status === 'active' && (
                                                        <button
                                                            className="btn btn-outline btn-sm"
                                                            onClick={() => handleStatusChange(session.id, 'closed')}
                                                        >
                                                            Tutup
                                                        </button>
                                                    )}
                                                    <button
                                                        className="btn btn-danger btn-sm"
                                                        onClick={() => handleDelete(session.id)}
                                                    >
                                                        🗑
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <div className="text-center" style={{ padding: 'var(--space-2xl)' }}>
                            <div style={{ fontSize: '3rem', marginBottom: 'var(--space-md)' }}>📅</div>
                            <h3>Belum Ada Session</h3>
                            <p className="text-muted text-sm mt-sm">Buat session baru untuk memulai absensi</p>
                        </div>
                    )}
                </div>
            </div>
        </AppLayout>
    );
}
