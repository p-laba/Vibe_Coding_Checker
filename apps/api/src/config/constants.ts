/**
 * API configuration constants
 */
export const API_CONFIG = {
  /** API version prefix */
  API_PREFIX: "/api",

  /** Health check endpoint */
  HEALTH_ENDPOINT: "/health",

  /** Readiness check endpoint */
  READY_ENDPOINT: "/ready",

  /** WebSocket endpoint pattern */
  WS_ENDPOINT: "/ws/:scanId",
} as const;

/**
 * Queue configuration
 */
export const QUEUE_CONFIG = {
  /** Main scan queue name */
  SCAN_QUEUE: "scan-queue",

  /** Queue job options */
  JOB_OPTIONS: {
    attempts: 3,
    backoff: {
      type: "exponential" as const,
      delay: 1000,
    },
    removeOnComplete: {
      count: 100,
      age: 3600, // 1 hour
    },
    removeOnFail: {
      count: 100,
      age: 86400, // 24 hours
    },
  },

  /** Worker concurrency */
  WORKER_CONCURRENCY: 3,
} as const;

/**
 * Scanner Docker images
 */
export const SCANNER_IMAGES = {
  trivy: "aquasec/trivy:0.58.1",
  gitleaks: "zricethezav/gitleaks:v8.21.2",
  semgrep: "semgrep/semgrep:1.99.0",
} as const;

/**
 * Scanner timeout configuration (in milliseconds)
 */
export const SCANNER_TIMEOUTS = {
  trivy: 180_000, // 3 minutes
  gitleaks: 120_000, // 2 minutes
  semgrep: 300_000, // 5 minutes
} as const;
