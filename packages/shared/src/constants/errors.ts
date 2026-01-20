/**
 * Error codes for the application
 */
export const ErrorCode = {
  // Input validation errors (4xx)
  INVALID_URL: "INVALID_URL",
  INVALID_GITHUB_URL: "INVALID_GITHUB_URL",
  PRIVATE_REPOSITORY: "PRIVATE_REPOSITORY",
  REPOSITORY_NOT_FOUND: "REPOSITORY_NOT_FOUND",
  BRANCH_NOT_FOUND: "BRANCH_NOT_FOUND",
  RATE_LIMITED: "RATE_LIMITED",
  REPOSITORY_TOO_LARGE: "REPOSITORY_TOO_LARGE",

  // Processing errors (5xx)
  CLONE_FAILED: "CLONE_FAILED",
  CLONE_TIMEOUT: "CLONE_TIMEOUT",
  SCANNER_FAILED: "SCANNER_FAILED",
  SCANNER_TIMEOUT: "SCANNER_TIMEOUT",
  DOCKER_UNAVAILABLE: "DOCKER_UNAVAILABLE",
  OUT_OF_MEMORY: "OUT_OF_MEMORY",
  DISK_FULL: "DISK_FULL",

  // System errors
  INTERNAL_ERROR: "INTERNAL_ERROR",
  REDIS_UNAVAILABLE: "REDIS_UNAVAILABLE",
  QUEUE_FAILED: "QUEUE_FAILED",
  WEBSOCKET_ERROR: "WEBSOCKET_ERROR",
} as const;

export type ErrorCode = (typeof ErrorCode)[keyof typeof ErrorCode];

/**
 * User-friendly error messages
 */
export const ERROR_MESSAGES: Record<ErrorCode, string> = {
  [ErrorCode.INVALID_URL]: "The provided URL is not valid",
  [ErrorCode.INVALID_GITHUB_URL]:
    "The URL must be a valid GitHub repository URL (https://github.com/owner/repo)",
  [ErrorCode.PRIVATE_REPOSITORY]:
    "Only public repositories can be scanned. This repository appears to be private.",
  [ErrorCode.REPOSITORY_NOT_FOUND]:
    "The repository does not exist or is not accessible",
  [ErrorCode.BRANCH_NOT_FOUND]: "The specified branch does not exist",
  [ErrorCode.RATE_LIMITED]:
    "Rate limit exceeded. Please wait before trying again.",
  [ErrorCode.REPOSITORY_TOO_LARGE]:
    "The repository is too large to scan. Maximum size is 500MB.",
  [ErrorCode.CLONE_FAILED]: "Failed to clone the repository",
  [ErrorCode.CLONE_TIMEOUT]:
    "Repository clone timed out. The repository may be too large.",
  [ErrorCode.SCANNER_FAILED]: "Security scanner encountered an error",
  [ErrorCode.SCANNER_TIMEOUT]: "Scanner execution timed out",
  [ErrorCode.DOCKER_UNAVAILABLE]: "Scanner service temporarily unavailable",
  [ErrorCode.OUT_OF_MEMORY]: "Repository too large to process",
  [ErrorCode.DISK_FULL]: "Service temporarily unavailable",
  [ErrorCode.INTERNAL_ERROR]: "An unexpected error occurred",
  [ErrorCode.REDIS_UNAVAILABLE]: "Service temporarily unavailable",
  [ErrorCode.QUEUE_FAILED]: "Failed to queue scan request",
  [ErrorCode.WEBSOCKET_ERROR]: "WebSocket connection failed",
};

/**
 * HTTP status codes for each error
 */
export const ERROR_STATUS_CODES: Record<ErrorCode, number> = {
  [ErrorCode.INVALID_URL]: 400,
  [ErrorCode.INVALID_GITHUB_URL]: 400,
  [ErrorCode.PRIVATE_REPOSITORY]: 403,
  [ErrorCode.REPOSITORY_NOT_FOUND]: 404,
  [ErrorCode.BRANCH_NOT_FOUND]: 404,
  [ErrorCode.RATE_LIMITED]: 429,
  [ErrorCode.REPOSITORY_TOO_LARGE]: 400,
  [ErrorCode.CLONE_FAILED]: 500,
  [ErrorCode.CLONE_TIMEOUT]: 504,
  [ErrorCode.SCANNER_FAILED]: 500,
  [ErrorCode.SCANNER_TIMEOUT]: 504,
  [ErrorCode.DOCKER_UNAVAILABLE]: 503,
  [ErrorCode.OUT_OF_MEMORY]: 500,
  [ErrorCode.DISK_FULL]: 503,
  [ErrorCode.INTERNAL_ERROR]: 500,
  [ErrorCode.REDIS_UNAVAILABLE]: 503,
  [ErrorCode.QUEUE_FAILED]: 500,
  [ErrorCode.WEBSOCKET_ERROR]: 500,
};

/**
 * Check if an error is retryable
 */
export const RETRYABLE_ERRORS: Set<ErrorCode> = new Set([
  ErrorCode.CLONE_TIMEOUT,
  ErrorCode.SCANNER_TIMEOUT,
  ErrorCode.DOCKER_UNAVAILABLE,
  ErrorCode.REDIS_UNAVAILABLE,
  ErrorCode.QUEUE_FAILED,
  ErrorCode.INTERNAL_ERROR,
]);

export function isRetryableError(code: ErrorCode): boolean {
  return RETRYABLE_ERRORS.has(code);
}
