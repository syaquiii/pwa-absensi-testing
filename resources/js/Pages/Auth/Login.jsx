import { Head, useForm, Link } from '@inertiajs/react';
import { useState } from 'react';

export default function Login() {
    const { data, setData, post, processing, errors } = useForm({
        email: '',
        password: '',
        remember: false,
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        post('/login');
    };

    return (
        <>
            <Head title="Login" />

            <div style={{
                minHeight: '100vh',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 'var(--space-lg)',
            }}>
                <div className="card animate-fade-in" style={{ width: '100%', maxWidth: '420px' }}>
                    {/* Header */}
                    <div className="text-center mb-lg">
                        <div style={{
                            width: 64,
                            height: 64,
                            background: 'linear-gradient(135deg, var(--color-accent), #8b5cf6)',
                            borderRadius: 'var(--radius-lg)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '1.75rem',
                            margin: '0 auto var(--space-md)',
                            boxShadow: '0 8px 30px rgba(59, 130, 246, 0.3)',
                        }}>
                            📋
                        </div>
                        <h1 style={{ fontSize: '1.5rem', fontWeight: 800 }}>Absensi Digital</h1>
                        <p className="text-muted text-sm mt-sm">Masuk untuk melanjutkan</p>
                    </div>

                    {/* Install PWA hint */}
                    <div style={{
                        background: 'var(--color-accent-light)',
                        border: '1px solid rgba(59, 130, 246, 0.2)',
                        borderRadius: 'var(--radius-md)',
                        padding: 'var(--space-sm) var(--space-md)',
                        marginBottom: 'var(--space-lg)',
                        fontSize: '0.8rem',
                        color: 'var(--color-accent)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 'var(--space-sm)',
                    }}>
                        <span>💡</span>
                        <span>Install aplikasi ini untuk pengalaman offline terbaik</span>
                    </div>

                    {/* Form */}
                    <form onSubmit={handleSubmit}>
                        <div className="form-group mb-md">
                            <label className="form-label" htmlFor="email">Email</label>
                            <input
                                id="email"
                                type="email"
                                className="form-input"
                                value={data.email}
                                onChange={(e) => setData('email', e.target.value)}
                                placeholder="nama@email.com"
                                autoComplete="email"
                                autoFocus
                                required
                            />
                            {errors.email && <span className="form-error">{errors.email}</span>}
                        </div>

                        <div className="form-group mb-md">
                            <label className="form-label" htmlFor="password">Password</label>
                            <input
                                id="password"
                                type="password"
                                className="form-input"
                                value={data.password}
                                onChange={(e) => setData('password', e.target.value)}
                                placeholder="••••••••"
                                autoComplete="current-password"
                                required
                            />
                            {errors.password && <span className="form-error">{errors.password}</span>}
                        </div>

                        <div className="flex items-center gap-sm mb-lg">
                            <input
                                id="remember"
                                type="checkbox"
                                checked={data.remember}
                                onChange={(e) => setData('remember', e.target.checked)}
                                style={{ accentColor: 'var(--color-accent)' }}
                            />
                            <label htmlFor="remember" className="text-sm text-muted" style={{ cursor: 'pointer' }}>
                                Ingat saya
                            </label>
                        </div>

                        <button
                            type="submit"
                            className="btn btn-primary btn-lg w-full"
                            disabled={processing}
                        >
                            {processing ? (
                                <>
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="animate-spin">
                                        <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                                    </svg>
                                    Masuk...
                                </>
                            ) : 'Masuk'}
                        </button>
                    </form>
                </div>
            </div>
        </>
    );
}
