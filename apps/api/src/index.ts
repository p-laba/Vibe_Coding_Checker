import { buildServer, startServer } from "./server";
import { initializeQueue, closeQueue } from "./services/queue.service";
import { closeRedis } from "./services/redis.service";
import { startScanWorker, closeScanWorker } from "./workers/scan.worker";

/**
 * Main application entry point
 */
async function main(): Promise<void> {
  console.log("Starting Vibe Security Scanner API...");

  // Initialize the job queue
  await initializeQueue();

  // Start the scan worker
  await startScanWorker();

  // Build and start the server
  const app = await buildServer();
  await startServer(app);

  // Graceful shutdown handlers
  const shutdown = async (signal: string) => {
    console.log(`Received ${signal}, shutting down gracefully...`);

    try {
      // Close the HTTP server
      await app.close();
      console.log("HTTP server closed");

      // Close the scan worker
      await closeScanWorker();
      console.log("Scan worker closed");

      // Close the queue
      await closeQueue();
      console.log("Queue closed");

      // Close Redis connection
      await closeRedis();
      console.log("Redis connection closed");

      process.exit(0);
    } catch (error) {
      console.error("Error during shutdown:", error);
      process.exit(1);
    }
  };

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
}

// Run the application
main().catch((error) => {
  console.error("Failed to start application:", error);
  process.exit(1);
});
