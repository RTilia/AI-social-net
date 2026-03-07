import { useEffect, useRef } from 'react';

/**
 * Custom hook for WebSocket connection.
 * @param {Object} callbacks - Map of message types to handlers.
 * @param {string} url - WebSocket URL (optional, defaults to relative /ws).
 */
export function useWebSocket(callbacks = {}, url) {
    const ws = useRef(null);

    useEffect(() => {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const host = window.location.host;
        const wsUrl = url || `${protocol}//${host}/ws`;

        const connect = () => {
            console.log('Connecting to WebSocket:', wsUrl);
            ws.current = new WebSocket(wsUrl);

            ws.current.onopen = () => {
                console.log('WebSocket connected');
            };

            ws.current.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    if (data.type && callbacks[data.type]) {
                        callbacks[data.type](data);
                    }
                } catch (err) {
                    console.error('Error parsing WS message:', err);
                }
            };

            ws.current.onclose = () => {
                console.log('WebSocket disconnected. Reconnecting in 3s...');
                setTimeout(connect, 3000);
            };

            ws.current.onerror = (err) => {
                console.error('WebSocket error:', err);
                ws.current.close();
            };
        };

        connect();

        return () => {
            if (ws.current) {
                ws.current.close();
            }
        };
    }, [url]); // Only recreate if URL changes (rare)

    return ws.current;
}
