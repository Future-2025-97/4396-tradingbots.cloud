import { useEffect, useRef } from 'react';

const useRaydiumWebSocket = (onMessage) => {
    const wsRef = useRef(null);

    useEffect(() => {
        // Create a WebSocket connection
        wsRef.current = new WebSocket('wss://atlas-mainnet.helius-rpc.com?api-key=bad5ab60-f610-45bf-8afa-34d2e8bc5108'); // Replace with the correct WebSocket URL

        // Handle incoming messages
        wsRef.current.onmessage = (event) => {
            const data = JSON.parse(event.data);
            onMessage(data); // Call the provided callback with the incoming data
        };

        // Handle errors
        wsRef.current.onerror = (error) => {
            console.error('WebSocket error:', error);
        };

        // Clean up on component unmount
        return () => {
            if (wsRef.current) {
                wsRef.current.close();
            }
        };
    }, [onMessage]);

    return wsRef;
};
export default useRaydiumWebSocket;