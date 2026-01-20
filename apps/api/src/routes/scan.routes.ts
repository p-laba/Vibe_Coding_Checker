import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { env } from "../config/env";
import { API_CONFIG } from "../config/constants";
import { validateScanRequest } from "@vibe/shared/schemas";
import type { ScanRequest, ScanResponse } from "@vibe/shared/types";
import { validateGitHubUrl } from "../services/github.service";
import { addScanJob, getQueuePosition, getJob } from "../services/queue.service";
import { Errors } from "../middleware/error-handler";
import { ScanStatus } from "@vibe/shared/constants";

/**
 * Register scan routes
 */
export async function registerScanRoutes(app: FastifyInstance): Promise<void> {
  // Create a new scan
  app.post(`${API_CONFIG.API_PREFIX}/scan`, {
    config: {
      rateLimit: {
        max: env.RATE_LIMIT_MAX,
        timeWindow: `${env.RATE_LIMIT_WINDOW_HOURS} hour`,
        errorResponseBuilder: (_request, context) => ({
          statusCode: 429,
          error: "RATE_LIMITED",
          message: `Rate limit exceeded. ${context.max} scans per hour allowed.`,
          retryAfter: Math.ceil(context.ttl / 1000),
        }),
      },
    },
    handler: createScanHandler,
  });

  // Get scan status
  app.get(`${API_CONFIG.API_PREFIX}/scan/:scanId`, getScanStatusHandler);
}

/**
 * Create scan handler
 * POST /api/scan
 */
async function createScanHandler(
  request: FastifyRequest<{ Body: ScanRequest }>,
  reply: FastifyReply
): Promise<void> {
  // Validate request body
  const validatedBody = validateScanRequest(request.body);

  // Validate GitHub URL and check if public
  const repoInfo = await validateGitHubUrl(validatedBody.repoUrl);

  // Get client IP for rate limiting tracking
  const clientIp = getClientIp(request);

  // Add job to queue
  const { scanId } = await addScanJob(
    repoInfo.url,
    repoInfo.owner,
    repoInfo.repo,
    clientIp,
    {
      branch: validatedBody.branch ?? repoInfo.defaultBranch,
      scanners: validatedBody.scanners,
    }
  );

  // Get queue position
  const queuePosition = await getQueuePosition(scanId);

  // Build WebSocket URL
  const wsProtocol = env.NODE_ENV === "production" ? "wss" : "ws";
  const host = request.headers.host ?? `localhost:${env.PORT}`;
  const wsUrl = `${wsProtocol}://${host}/ws/${scanId}`;

  const response: ScanResponse = {
    scanId,
    wsUrl,
    estimatedDuration: 60, // Rough estimate in seconds
    queuePosition,
  };

  request.log.info({ scanId, repoUrl: repoInfo.url }, "Scan job created");

  reply.status(202).send(response);
}

/**
 * Get scan status handler
 * GET /api/scan/:scanId
 */
async function getScanStatusHandler(
  request: FastifyRequest<{ Params: { scanId: string } }>,
  reply: FastifyReply
): Promise<void> {
  const { scanId } = request.params;

  const job = await getJob(scanId);

  if (!job) {
    throw Errors.repositoryNotFound();
  }

  const state = await job.getState();
  const progress = job.progress as number;

  let status: ScanStatus;
  switch (state) {
    case "waiting":
    case "delayed":
      status = ScanStatus.QUEUED;
      break;
    case "active":
      status = ScanStatus.SCANNING;
      break;
    case "completed":
      status = ScanStatus.COMPLETED;
      break;
    case "failed":
      status = ScanStatus.FAILED;
      break;
    default:
      status = ScanStatus.QUEUED;
  }

  reply.send({
    scanId,
    status,
    progress: typeof progress === "number" ? progress : 0,
    createdAt: job.data.createdAt,
    startedAt: job.processedOn
      ? new Date(job.processedOn).toISOString()
      : undefined,
    completedAt: job.finishedOn
      ? new Date(job.finishedOn).toISOString()
      : undefined,
  });
}

/**
 * Extract client IP from request
 */
function getClientIp(request: FastifyRequest): string {
  const forwarded = request.headers["x-forwarded-for"];
  if (forwarded) {
    return typeof forwarded === "string"
      ? forwarded.split(",")[0].trim()
      : forwarded[0];
  }
  return request.ip;
}
