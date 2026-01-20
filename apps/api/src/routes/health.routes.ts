import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { API_CONFIG } from "../config/constants";
import { isRedisHealthy } from "../services/redis.service";
import { APP_VERSION } from "@vibe/shared/constants";

/**
 * Register health check routes
 */
export async function registerHealthRoutes(app: FastifyInstance): Promise<void> {
  // Basic health check
  app.get(API_CONFIG.HEALTH_ENDPOINT, healthHandler);

  // Detailed readiness check
  app.get(API_CONFIG.READY_ENDPOINT, readyHandler);
}

/**
 * Basic health check handler
 * Returns 200 if the server is running
 */
async function healthHandler(
  _request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  reply.send({
    status: "healthy",
    version: APP_VERSION,
    timestamp: new Date().toISOString(),
  });
}

interface ReadinessCheck {
  redis: boolean;
  docker?: boolean;
  scanners?: {
    trivy: boolean;
    gitleaks: boolean;
    semgrep: boolean;
  };
}

/**
 * Detailed readiness check handler
 * Checks all dependencies are available
 */
async function readyHandler(
  _request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const checks: ReadinessCheck = {
    redis: false,
  };

  // Check Redis
  checks.redis = await isRedisHealthy();

  // Check if all checks pass
  const allPassing = Object.values(checks).every((v) =>
    typeof v === "boolean" ? v : Object.values(v).every(Boolean)
  );

  const statusCode = allPassing ? 200 : 503;

  reply.status(statusCode).send({
    ready: allPassing,
    checks,
    version: APP_VERSION,
    timestamp: new Date().toISOString(),
  });
}
