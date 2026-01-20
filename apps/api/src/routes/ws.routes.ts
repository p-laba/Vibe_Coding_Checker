import { FastifyInstance, FastifyRequest } from "fastify";
import type { WebSocket } from "ws";
import { subscribe } from "../services/redis.service";
import { getJob } from "../services/queue.service";
import { createWSEvent, type WSConnectedEvent } from "@vibe/shared/types";

// Track active WebSocket connections per scan
const connections = new Map<string, Set<WebSocket>>();

/**
 * Register WebSocket routes
 */
export async function registerWebSocketRoutes(
  app: FastifyInstance
): Promise<void> {
  app.get(
    "/ws/:scanId",
    { websocket: true },
    async (socket: WebSocket, request: FastifyRequest<{ Params: { scanId: string } }>) => {
      const { scanId } = request.params;

      request.log.info({ scanId }, "WebSocket connection opened");

      // Validate scan exists
      const job = await getJob(scanId);
      if (!job) {
        socket.close(4004, "Scan not found");
        return;
      }

      // Track connection
      if (!connections.has(scanId)) {
        connections.set(scanId, new Set());
      }
      connections.get(scanId)!.add(socket);

      // Send connected event
      const connectedEvent: WSConnectedEvent = createWSEvent(
        "connected",
        scanId
      );
      socket.send(JSON.stringify(connectedEvent));

      // Subscribe to scan events via Redis pub/sub
      const unsubscribe = await subscribe(`scan:${scanId}`, (message) => {
        if (socket.readyState === socket.OPEN) {
          socket.send(message);
        }
      });

      // Handle heartbeat
      const heartbeatInterval = setInterval(() => {
        if (socket.readyState === socket.OPEN) {
          const heartbeat = createWSEvent("heartbeat", scanId);
          socket.send(JSON.stringify(heartbeat));
        }
      }, 30000);

      // Handle close
      socket.on("close", async () => {
        request.log.info({ scanId }, "WebSocket connection closed");
        clearInterval(heartbeatInterval);
        await unsubscribe();

        // Remove from tracking
        const scanConnections = connections.get(scanId);
        if (scanConnections) {
          scanConnections.delete(socket);
          if (scanConnections.size === 0) {
            connections.delete(scanId);
          }
        }
      });

      // Handle errors
      socket.on("error", (error) => {
        request.log.error({ scanId, error }, "WebSocket error");
      });
    }
  );
}

/**
 * Broadcast a message to all connections for a scan
 */
export function broadcastToScan(scanId: string, message: string): void {
  const scanConnections = connections.get(scanId);
  if (scanConnections) {
    for (const socket of scanConnections) {
      if (socket.readyState === socket.OPEN) {
        socket.send(message);
      }
    }
  }
}

/**
 * Get the number of active connections for a scan
 */
export function getConnectionCount(scanId: string): number {
  return connections.get(scanId)?.size ?? 0;
}

/**
 * Close all connections for a scan
 */
export function closeAllConnections(scanId: string): void {
  const scanConnections = connections.get(scanId);
  if (scanConnections) {
    for (const socket of scanConnections) {
      socket.close(1000, "Scan completed");
    }
    connections.delete(scanId);
  }
}
