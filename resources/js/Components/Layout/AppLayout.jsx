import { Link, usePage, router } from '@inertiajs/react';

export default function AppLayout({ children }) {
    const { auth } = usePage().props;
    const user = auth?.user;

    const handleLogout = (e) => {
        e.preventDefault();
        router.post('/logout');
    };

    return (
        <div className="app-layout">
            <nav className="navbar">
                <div className="navbar-brand">
                    <div className="navbar-brand-icon">📋</div>
                    <span>Absensi Digital</span>
                </div>

                {user && (
                    <div className="flex items-center gap-md">
                        <ul className="navbar-nav">
                            {user.role === 'admin' ? (
                                <>
                                    <li>
                                        <Link href="/admin/dashboard" className={`navbar-link ${location.pathname === '/admin/dashboard' ? 'active' : ''}`}>
                                            Dashboard
                                        </Link>
                                    </li>
                                    <li>
                                        <Link href="/admin/clusters" className={`navbar-link ${location.pathname === '/admin/clusters' ? 'active' : ''}`}>
                                            Clusters
                                        </Link>
                                    </li>
                                    <li>
                                        <Link href="/admin/sessions" className={`navbar-link ${location.pathname === '/admin/sessions' ? 'active' : ''}`}>
                                            Sessions
                                        </Link>
                                    </li>
                                </>
                            ) : (
                                <>
                                    <li>
                                        <Link href="/student/dashboard" className={`navbar-link ${location.pathname === '/student/dashboard' ? 'active' : ''}`}>
                                            Dashboard
                                        </Link>
                                    </li>
                                    <li>
                                        <Link href="/student/attendance" className={`navbar-link ${location.pathname === '/student/attendance' ? 'active' : ''}`}>
                                            Absensi
                                        </Link>
                                    </li>
                                </>
                            )}
                        </ul>

                        <div className="navbar-user">
                            <span>{user.name}</span>
                            {user.cluster && (
                                <span className={`badge ${user.cluster.is_active ? 'badge-active' : 'badge-inactive'}`}>
                                    {user.cluster.code}
                                </span>
                            )}
                        </div>

                        <button onClick={handleLogout} className="btn btn-outline btn-sm">
                            Logout
                        </button>
                    </div>
                )}
            </nav>

            <main>{children}</main>
        </div>
    );
}
