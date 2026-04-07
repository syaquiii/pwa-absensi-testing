import { defineConfig } from 'vite';
import laravel from 'laravel-vite-plugin';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
    plugins: [
        laravel({
            input: ['resources/css/app.css', 'resources/js/app.jsx'],
            refresh: true,
        }),
        react(),
        VitePWA({
            strategies: 'injectManifest',
            srcDir: 'resources/js',
            filename: 'service-worker.js',
            registerType: 'autoUpdate',
            buildBase: '/build/',
            scope: '/',
            manifest: {
                name: 'Absensi Digital',
                short_name: 'Absensi',
                description: 'Sistem absensi digital offline-first',
                start_url: '/',
                display: 'standalone',
                background_color: '#0f172a',
                theme_color: '#3b82f6',
                orientation: 'portrait-primary',
                icons: [
                    {
                        src: '/icons/icon-192x192.png',
                        sizes: '192x192',
                        type: 'image/png',
                    },
                    {
                        src: '/icons/icon-512x512.png',
                        sizes: '512x512',
                        type: 'image/png',
                    },
                    {
                        src: '/icons/icon-512x512.png',
                        sizes: '512x512',
                        type: 'image/png',
                        purpose: 'maskable',
                    },
                ],
            },
            injectManifest: {
                globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
                globIgnores: [
                    '**/registerSW.js',
                    '**/manifest.webmanifest',
                    '**/*.mjs'
                ],
                maximumFileSizeToCacheInBytes: 5000000,
                // Adjusts the precache paths since the SW runs at the root (/) but assets are in /build/
                modifyURLPrefix: {
                    '': '/build/',
                }
            },
            devOptions: {
                enabled: true,
                type: 'module',
            },
        }),
    ],
    server: {
        watch: {
            ignored: ['**/storage/framework/views/**'],
        },
    },
});
