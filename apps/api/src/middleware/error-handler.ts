import { FastifyError, FastifyReply, FastifyRequest } from "fastify";
import {
  ErrorCode,
  ERROR_MESSAGES,
  ERROR_STATUS_CODES,
} from "@vibe/shared/constants";

/**
 * Custom application error class
 */
export class AppError extends Error {
  public readonly code: ErrorCode;
  public readonly statusCode: number;
  public readonly details?: Record<string, unknown>;

  constructor(
    code: ErrorCode,
    details?: Record<string, unknown>,
    statusCode?: number
  ) {
    super(ERROR_MESSAGES[code]);
    this.name = "AppError";
    this.code = code;
    this.statusCode = statusCode ?? ERROR_STATUS_CODES[code];
    this.details = details;
  }

  toJSON() {
    return {
      error: this.code,
      message: this.message,
      details: this.details,
    };
  }
}

/**
 * Global error handler for Fastify
 */
export function errorHandler(
  error: FastifyError | AppError | Error,
  request: FastifyRequest,
  reply: FastifyReply
): void {
  const requestId = request.id;

  // Log error with context
  request.log.error({
    requestId,
    error: {
      name: error.name,
      message: error.message,
      code: (error as AppError).code,
      stack: error.stack,
    },
    request: {
      method: request.method,
      url: request.url,
      ip: request.ip,
    },
  });

  // Handle known application errors
  if (error instanceof AppError) {
    reply.status(error.statusCode).send({
      error: error.code,
      message: error.message,
      details: error.details,
      requestId,
    });
    return;
  }

  // Handle Fastify validation errors
  if ("validation" in error && error.validation) {
    reply.status(400).send({
      error: ErrorCode.INVALID_URL,
      message: "Validation failed",
      details: error.validation,
      requestId,
    });
    return;
  }

  // Handle rate limit errors
  if ("statusCode" in error && error.statusCode === 429) {
    reply.status(429).send({
      error: ErrorCode.RATE_LIMITED,
      message: ERROR_MESSAGES[ErrorCode.RATE_LIMITED],
      retryAfter: reply.getHeader("retry-after"),
      requestId,
    });
    return;
  }

  // Generic internal error
  reply.status(500).send({
    error: ErrorCode.INTERNAL_ERROR,
    message: "An unexpected error occurred",
    requestId,
  });
}

/**
 * Create an AppError for common error cases
 */
export const Errors = {
  invalidUrl: (url?: string) =>
    new AppError(ErrorCode.INVALID_URL, url ? { url } : undefined),

  invalidGitHubUrl: (url?: string) =>
    new AppError(ErrorCode.INVALID_GITHUB_URL, url ? { url } : undefined),

  privateRepository: (url?: string) =>
    new AppError(ErrorCode.PRIVATE_REPOSITORY, url ? { url } : undefined),

  repositoryNotFound: (url?: string) =>
    new AppError(ErrorCode.REPOSITORY_NOT_FOUND, url ? { url } : undefined),

  rateLimited: (retryAfter?: number) =>
    new AppError(
      ErrorCode.RATE_LIMITED,
      retryAfter ? { retryAfter } : undefined
    ),

  cloneFailed: (reason?: string) =>
    new AppError(ErrorCode.CLONE_FAILED, reason ? { reason } : undefined),

  cloneTimeout: () => new AppError(ErrorCode.CLONE_TIMEOUT),

  scannerFailed: (scanner?: string, reason?: string) =>
    new AppError(ErrorCode.SCANNER_FAILED, { scanner, reason }),

  scannerTimeout: (scanner?: string) =>
    new AppError(ErrorCode.SCANNER_TIMEOUT, scanner ? { scanner } : undefined),

  internalError: (reason?: string) =>
    new AppError(ErrorCode.INTERNAL_ERROR, reason ? { reason } : undefined),
};
