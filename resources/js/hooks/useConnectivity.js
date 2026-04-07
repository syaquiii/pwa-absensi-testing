import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * Hook to monitor online/offline connectivity status.
 * Uses both navigator.onLine and health check pinging for reliability.
 */
export function useConnectivity(healthCheckUrl = '/api/health', pingInterval = 10000) {
    const [isOnline, setIsOnline] = useState(navigator.onLine);
    const [lastCheckTime, setLastCheckTime] = useState(null);
    const intervalRef = useRef(null);

    const checkHealth = useCallback(async () => {
        try {
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 5000);

            const response = await fetch(healthCheckUrl, {
                method: 'GET',
                signal: controller.signal,
                cache: 'no-store',
            });

            clearTimeout(timeout);

            if (response.ok) {
                setIsOnline(true);
                setLastCheckTime(new Date());
            } else {
                setIsOnline(false);
            }
        } catch {
            setIsOnline(false);
        }
    }, [healthCheckUrl]);

    useEffect(() => {
        const handleOnline = () => {
            setIsOnline(true);
            checkHealth(); // Verify with server
        };

        const handleOffline = () => {
            setIsOnline(false);
        };

        const handleServerOffline = () => setIsOnline(false);
        const handleServerOnline = () => {
            setIsOnline(true);
            setLastCheckTime(new Date());
        };

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);
        window.addEventListener('server-offline', handleServerOffline);
        window.addEventListener('server-online', handleServerOnline);

        // Initial check on load
        checkHealth();

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
            window.removeEventListener('server-offline', handleServerOffline);
            window.removeEventListener('server-online', handleServerOnline);
        };
    }, [checkHealth]);

    return { isOnline, lastCheckTime };
}
