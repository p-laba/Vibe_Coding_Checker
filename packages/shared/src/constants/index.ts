export * from "./severity";
export * from "./errors";
export * from "./scanner";

/**
 * Application constants
 */
export const APP_NAME = "Vibe Security Scanner";
export const APP_VERSION = "1.0.0";

/**
 * Default configuration values
 */
export const DEFAULTS = {
  /** Maximum repository size in MB */
  MAX_REPO_SIZE_MB: 500,

  /** Clone timeout in milliseconds */
  CLONE_TIMEOUT_MS: 60_000,

  /** Scanner timeout in milliseconds */
  SCANNER_TIMEOUT_MS: 300_000,

  /** Rate limit: scans per window */
  RATE_LIMIT_MAX: 5,

  /** Rate limit window in hours */
  RATE_LIMIT_WINDOW_HOURS: 1,

  /** WebSocket heartbeat interval in milliseconds */
  WS_HEARTBEAT_INTERVAL_MS: 30_000,

  /** Temporary directory cleanup age in milliseconds */
  TEMP_CLEANUP_AGE_MS: 30 * 60 * 1000, // 30 minutes
} as const;

/**
 * GitHub URL pattern
 */
export const GITHUB_URL_PATTERN =
  /^https:\/\/github\.com\/[\w-]+\/[\w.-]+\/?$/;

/**
 * Scan ID prefix
 */
export const SCAN_ID_PREFIX = "scan_";
