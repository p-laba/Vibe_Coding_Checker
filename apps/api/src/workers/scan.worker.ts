import { Worker, Job } from "bullmq";
import { QUEUE_CONFIG } from "../config/constants";
import { env } from "../config/env";
import { publish } from "../services/redis.service";
import { cloneRepository } from "../utils/git";
import { createTempDir, cleanupTempDir, startCleanupScheduler } from "../utils/temp-dir";
import {
  TrivyScanner,
  GitleaksScanner,
  SemgrepScanner,
  type ScannerResult,
} from "../scanners";
import { ScannerType } from "@vibe/shared/constants";
import type { ScanJob, ScanSummary, Finding } from "@vibe/shared/types";
import {
  createWSEvent,
  type ScanStartedEvent,
  type ScanProgressEvent,
  type ScanCompletedEvent,
  type ScanFailedEvent,
} from "@vibe/shared/types";

let scanWorker: Worker<ScanJob> | null = null;
let cleanupInterval: NodeJS.Timeout | null = null;

/**
 * Get Redis connection options for BullMQ Worker
 */
function getRedisConnection() {
  return {
    host: new URL(env.REDIS_URL).hostname,
    port: parseInt(new URL(env.REDIS_URL).port || "6379"),
    maxRetriesPerRequest: null,
  };
}

/**
 * Start the scan worker
 */
export async function startScanWorker(): Promise<void> {
  const connection = getRedisConnection();

  scanWorker = new Worker<ScanJob>(
    QUEUE_CONFIG.SCAN_QUEUE,
    processScanJob,
    {
      connection,
      concurrency: QUEUE_CONFIG.WORKER_CONCURRENCY,
      limiter: {
        max: 10,
        duration: 60000,
      },
    }
  );

  scanWorker.on("completed", (job) => {
    console.log(`Scan job ${job.id} completed`);
  });

  scanWorker.on("failed", (job, error) => {
    console.error(`Scan job ${job?.id} failed:`, error);
  });

  scanWorker.on("error", (error) => {
    console.error("Worker error:", error);
  });

  // Start cleanup scheduler
  cleanupInterval = startCleanupScheduler();

  console.log("Scan worker started");
}

/**
 * Close the scan worker
 */
export async function closeScanWorker(): Promise<void> {
  if (cleanupInterval) {
    clearInterval(cleanupInterval);
    cleanupInterval = null;
  }

  if (scanWorker) {
    await scanWorker.close();
    scanWorker = null;
  }
}

/**
 * Process a scan job
 */
async function processScanJob(job: Job<ScanJob>): Promise<ScanSummary> {
  const { scanId, repoUrl, branch, scanners } = job.data;
  let tempDir: string | null = null;

  try {
    // Emit scan started event
    await emitScanStarted(scanId, repoUrl, branch ?? "default", scanners);

    // Create temporary directory
    await emitProgress(scanId, "cloning", 0, "Creating workspace...");
    tempDir = await createTempDir(scanId);

    // Clone repository
    await emitProgress(scanId, "cloning", 20, "Cloning repository...");
    await cloneRepository(repoUrl, tempDir, {
      branch,
      depth: 1,
      timeout: env.CLONE_TIMEOUT_MS,
    });
    await emitProgress(scanId, "cloning", 100, "Repository cloned");

    // Update job progress
    await job.updateProgress(20);

    // Run scanners in parallel
    await emitProgress(scanId, "scanning", 0, "Starting security scanners...");
    const results = await runScanners(scanId, tempDir, scanners);
    await job.updateProgress(90);

    // Aggregate results
    await emitProgress(scanId, "finalizing", 0, "Generating report...");
    const summary = aggregateResults(results);
    await job.updateProgress(100);

    // Emit completion event
    await emitScanCompleted(scanId, summary);

    return summary;
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : String(error);

    await emitScanFailed(scanId, errorMessage);
    throw error;
  } finally {
    // Always cleanup temp directory
    if (tempDir) {
      await cleanupTempDir(tempDir);
    }
  }
}

/**
 * Run all requested scanners in parallel
 */
async function runScanners(
  scanId: string,
  repoPath: string,
  scannerTypes: ScannerType[]
): Promise<ScannerResult[]> {
  const scannerInstances = {
    [ScannerType.TRIVY]: new TrivyScanner(scanId, repoPath),
    [ScannerType.GITLEAKS]: new GitleaksScanner(scanId, repoPath),
    [ScannerType.SEMGREP]: new SemgrepScanner(scanId, repoPath),
  };

  // Filter to requested scanners
  const activeScanners = scannerTypes
    .filter((type) => scannerInstances[type])
    .map((type) => scannerInstances[type]);

  // Run all scanners in parallel
  const results = await Promise.allSettled(
    activeScanners.map((scanner) => scanner.scan())
  );

  // Extract results, handling any failures
  return results.map((result, index) => {
    if (result.status === "fulfilled") {
      return result.value;
    }

    // Return error result for failed scanners
    const scanner = activeScanners[index];
    return {
      scanner: scanner.type,
      findings: [],
      duration: 0,
      success: false,
      error: result.reason?.message || "Unknown error",
    };
  });
}

/**
 * Aggregate results from all scanners
 */
function aggregateResults(results: ScannerResult[]): ScanSummary {
  const allFindings: Finding[] = [];
  let totalDuration = 0;

  const bySeverity = {
    critical: 0,
    high: 0,
    medium: 0,
    low: 0,
    info: 0,
  };

  const byScanner: Record<ScannerType, number> = {
    [ScannerType.TRIVY]: 0,
    [ScannerType.GITLEAKS]: 0,
    [ScannerType.SEMGREP]: 0,
  };

  const byType = {
    vulnerability: 0,
    secret: 0,
    sast: 0,
  };

  for (const result of results) {
    totalDuration = Math.max(totalDuration, result.duration);
    allFindings.push(...result.findings);
    byScanner[result.scanner] = result.findings.length;

    for (const finding of result.findings) {
      // Count by severity
      if (finding.severity in bySeverity) {
        bySeverity[finding.severity as keyof typeof bySeverity]++;
      }

      // Count by type
      if (finding.type in byType) {
        byType[finding.type as keyof typeof byType]++;
      }
    }
  }

  return {
    duration: totalDuration,
    totalFindings: allFindings.length,
    bySeverity,
    byScanner,
    byType,
    filesScanned: 0, // Would need file counting logic
    dependenciesChecked: 0, // Would need dependency counting logic
  };
}

// Event emission helpers

async function emitScanStarted(
  scanId: string,
  repoUrl: string,
  branch: string,
  scanners: ScannerType[]
): Promise<void> {
  const event: ScanStartedEvent = createWSEvent("scan:started", scanId, {
    repoUrl,
    branch,
    scanners,
  });
  await publish(`scan:${scanId}`, JSON.stringify(event));
}

async function emitProgress(
  scanId: string,
  phase: "cloning" | "scanning" | "finalizing",
  progress: number,
  message: string
): Promise<void> {
  const event: ScanProgressEvent = createWSEvent("scan:progress", scanId, {
    phase,
    progress,
    message,
  });
  await publish(`scan:${scanId}`, JSON.stringify(event));
}

async function emitScanCompleted(
  scanId: string,
  summary: ScanSummary
): Promise<void> {
  const event: ScanCompletedEvent = createWSEvent("scan:completed", scanId, {
    summary,
  });
  await publish(`scan:${scanId}`, JSON.stringify(event));
}

async function emitScanFailed(
  scanId: string,
  errorMessage: string
): Promise<void> {
  const event: ScanFailedEvent = createWSEvent("scan:failed", scanId, {
    error: {
      code: "INTERNAL_ERROR",
      message: errorMessage,
    },
  });
  await publish(`scan:${scanId}`, JSON.stringify(event));
}
