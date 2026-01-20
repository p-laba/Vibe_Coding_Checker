import Fastify, { FastifyInstance } from "fastify";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import rateLimit from "@fastify/rate-limit";
import websocket from "@fastify/websocket";

import { env, isProduction } from "./config/env";
import { registerHealthRoutes } from "./routes/health.routes";
import { registerScanRoutes } from "./routes/scan.routes";
import { registerWebSocketRoutes } from "./routes/ws.routes";
import { errorHandler } from "./middleware/error-handler";
import { getRedisClient } from "./services/redis.service";

/**
 * Build and configure the Fastify server
 */
export async function buildServer(): Promise<FastifyInstance> {
  const app = Fastify({
    logger: {
      level: env.LOG_LEVEL,
      transport: isProduction
        ? undefined
        : {
            target: "pino-pretty",
            options: {
              colorize: true,
              translateTime: "HH:MM:ss Z",
              ignore: "pid,hostname",
            },
          },
    },
    requestIdHeader: "x-request-id",
    requestIdLogLabel: "requestId",
  });

  // Register error handler
  app.setErrorHandler(errorHandler);

  // Register plugins
  await registerPlugins(app);

  // Register routes
  await registerRoutes(app);

  return app;
}

/**
 * Register Fastify plugins
 */
async function registerPlugins(app: FastifyInstance): Promise<void> {
  // CORS
  await app.register(cors, {
    origin: env.ALLOWED_ORIGINS,
    methods: ["GET", "POST", "OPTIONS"],
    credentials: true,
  });

  // Security headers
  await app.register(helmet, {
    contentSecurityPolicy: isProduction,
  });

  // Rate limiting
  const redis = getRedisClient();
  await app.register(rateLimit, {
    global: false, // Apply per-route
    redis,
    nameSpace: "rate-limit:",
    keyGenerator: (request) => {
      // Use X-Forwarded-For in production (behind load balancer)
      const forwarded = request.headers["x-forwarded-for"];
      if (forwarded) {
        return typeof forwarded === "string"
          ? forwarded.split(",")[0].trim()
          : forwarded[0];
      }
      return request.ip;
    },
  });

  // WebSocket support
  await app.register(websocket, {
    options: {
      maxPayload: 1024 * 1024, // 1MB max message size
    },
  });
}

/**
 * Register application routes
 */
async function registerRoutes(app: FastifyInstance): Promise<void> {
  // Health check routes
  await registerHealthRoutes(app);

  // Scan routes
  await registerScanRoutes(app);

  // WebSocket routes
  await registerWebSocketRoutes(app);
}

/**
 * Start the server
 */
export async function startServer(app: FastifyInstance): Promise<void> {
  try {
    await app.listen({
      port: env.PORT,
      host: "0.0.0.0",
    });

    app.log.info(`Server listening on http://0.0.0.0:${env.PORT}`);
  } catch (error) {
    app.log.error(error);
    process.exit(1);
  }
}
