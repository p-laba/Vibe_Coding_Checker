"use client";

import { useCallback, useRef, useState } from "react";
import { useScanStore } from "@/lib/store";
import type { WSEvent } from "@vibe/shared/types";

export function useWebSocket(scanId: string) {
  const [isConnected, setIsConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const { handleEvent } = useScanStore();

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    const wsUrl =
      process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:5000";
    const fullUrl = `${wsUrl}/ws/${scanId}`;

    console.log("Connecting to WebSocket:", fullUrl);

    const ws = new WebSocket(fullUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log("WebSocket connected");
      setIsConnected(true);
    };

    ws.onmessage = (event) => {
      try {
        const data: WSEvent = JSON.parse(event.data);
        console.log("WebSocket event:", data.type);
        handleEvent(data);
      } catch (error) {
        console.error("Failed to parse WebSocket message:", error);
      }
    };

    ws.onerror = (error) => {
      console.error("WebSocket error:", error);
    };

    ws.onclose = (event) => {
      console.log("WebSocket closed:", event.code, event.reason);
      setIsConnected(false);
      wsRef.current = null;

      // Attempt to reconnect if not a normal close
      if (event.code !== 1000 && event.code !== 4004) {
        reconnectTimeoutRef.current = setTimeout(() => {
          console.log("Attempting to reconnect...");
          connect();
        }, 3000);
      }
    };
  }, [scanId, handleEvent]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (wsRef.current) {
      wsRef.current.close(1000, "User disconnected");
      wsRef.current = null;
    }

    setIsConnected(false);
  }, []);

  return {
    connect,
    disconnect,
    isConnected,
  };
}
