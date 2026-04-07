import { createInertiaApp } from "@inertiajs/react";
import { createRoot } from "react-dom/client";
import { resolvePageComponent } from "laravel-vite-plugin/inertia-helpers";

// Register service worker using the root route to bypass scope restrictions
if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
        navigator.serviceWorker
            .register("/service-worker.js", { scope: "/", type: "module" })
            .then((registration) => {
                console.log(
                    "[PWA] Service Worker registered:",
                    registration.scope,
                );

                // Auto-refresh mechanism on new app version
                registration.addEventListener('updatefound', () => {
                    const newWorker = registration.installing;
                    newWorker.addEventListener('statechange', () => {
                        // Check if a new version just installed and we had an old one running
                        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                            console.log('[PWA] Versi situs baru terdeteksi! Melakukan update cache...');
                            // Note: Because service-worker.js calls self.skipWaiting(), 
                            // it will immediately trigger 'controllerchange' below.
                        }
                    });
                });
            })
            .catch((error) => {
                console.error(
                    "[PWA] Service Worker registration failed:",
                    error,
                );
            });

        // When the new worker takes over (skipWaiting -> clients.claim), reload to get the new assets UI
        let refreshing = false;
        navigator.serviceWorker.addEventListener('controllerchange', () => {
            if (!refreshing) {
                refreshing = true;
                console.log('[PWA] Controller changed, reloading page for new version...');
                window.location.reload();
            }
        });
    });
}

createInertiaApp({
    title: (title) =>
        title ? `${title} — Absensi Digital` : "Absensi Digital",
    resolve: (name) =>
        resolvePageComponent(
            `./Pages/${name}.jsx`,
            import.meta.glob("./Pages/**/*.jsx"),
        ),
    setup({ el, App, props }) {
        const root = createRoot(el);
        root.render(<App {...props} />);
    },
    progress: {
        color: "#3b82f6",
        showSpinner: true,
    },
});
