import { Queue, QueueEvents, Job } from "bullmq";
import { nanoid } from "nanoid";
import { QUEUE_CONFIG } from "../config/constants";
import { env } from "../config/env";
import { SCAN_ID_PREFIX, ALL_SCANNERS, ScannerType } from "@vibe/shared/constants";
import type { ScanJob } from "@vibe/shared/types";

let scanQueue: Queue<ScanJob> | null = null;
let queueEvents: QueueEvents | null = null;

/**
 * Get Redis connection options for BullMQ
 */
function getRedisConnection() {
  return {
    host: new URL(env.REDIS_URL).hostname,
    port: parseInt(new URL(env.REDIS_URL).port || "6379"),
    maxRetriesPerRequest: null,
  };
}

/**
 * Initialize the scan queue
 */
export async function initializeQueue(): Promise<void> {
  const connection = getRedisConnection();

  scanQueue = new Queue<ScanJob>(QUEUE_CONFIG.SCAN_QUEUE, {
    connection,
    defaultJobOptions: QUEUE_CONFIG.JOB_OPTIONS,
  });

  queueEvents = new QueueEvents(QUEUE_CONFIG.SCAN_QUEUE, {
    connection,
  });

  console.log("Scan queue initialized");
}

/**
 * Get the scan queue instance
 */
export function getScanQueue(): Queue<ScanJob> {
  if (!scanQueue) {
    throw new Error("Queue not initialized. Call initializeQueue() first.");
  }
  return scanQueue;
}

/**
 * Get queue events instance for listening to job updates
 */
export function getQueueEvents(): QueueEvents {
  if (!queueEvents) {
    throw new Error("Queue events not initialized. Call initializeQueue() first.");
  }
  return queueEvents;
}

/**
 * Generate a unique scan ID
 */
export function generateScanId(): string {
  return `${SCAN_ID_PREFIX}${nanoid(16)}`;
}

/**
 * Add a scan job to the queue
 */
export async function addScanJob(
  repoUrl: string,
  owner: string,
  repo: string,
  clientIp: string,
  options?: {
    branch?: string;
    scanners?: ScannerType[];
  }
): Promise<{ scanId: string; job: Job<ScanJob> }> {
  const queue = getScanQueue();
  const scanId = generateScanId();

  const jobData: ScanJob = {
    scanId,
    repoUrl,
    owner,
    repo,
    branch: options?.branch,
    scanners: options?.scanners ?? ALL_SCANNERS,
    createdAt: new Date().toISOString(),
    clientIp,
  };

  const job = await queue.add(scanId, jobData, {
    jobId: scanId,
  });

  return { scanId, job };
}

/**
 * Get queue position for a job
 */
export async function getQueuePosition(scanId: string): Promise<number> {
  const queue = getScanQueue();
  const job = await queue.getJob(scanId);

  if (!job) {
    return -1;
  }

  const state = await job.getState();

  if (state === "active") {
    return 0;
  }

  if (state === "waiting") {
    const waiting = await queue.getWaiting();
    const index = waiting.findIndex((j) => j.id === scanId);
    return index + 1;
  }

  return -1;
}

/**
 * Get job by scan ID
 */
export async function getJob(scanId: string): Promise<Job<ScanJob> | undefined> {
  const queue = getScanQueue();
  return queue.getJob(scanId);
}

/**
 * Close the queue and queue events
 */
export async function closeQueue(): Promise<void> {
  if (queueEvents) {
    await queueEvents.close();
    queueEvents = null;
  }
  if (scanQueue) {
    await scanQueue.close();
    scanQueue = null;
  }
}
