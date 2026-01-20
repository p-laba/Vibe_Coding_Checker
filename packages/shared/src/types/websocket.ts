import type { ScannerType } from "../constants/scanner";
import type { ErrorCode } from "../constants/errors";
import type { VulnerabilityFinding } from "./vulnerability";
import type { SecretFinding } from "./secret";
import type { SASTFinding } from "./sast";
import type { ScanSummary } from "./scan";

/**
 * All possible WebSocket event types
 */
export type WSEventType =
  | "connected"
  | "scan:started"
  | "scan:progress"
  | "scanner:started"
  | "scanner:progress"
  | "scanner:finding"
  | "scanner:completed"
  | "scan:completed"
  | "scan:failed"
  | "heartbeat"
  | "error";

/**
 * Base WebSocket event structure
 */
export interface WSEventBase {
  /** Event type */
  type: WSEventType;
  /** Scan identifier */
  scanId: string;
  /** Event timestamp (ISO 8601) */
  timestamp: string;
}

/**
 * Connection established event
 */
export interface WSConnectedEvent extends WSEventBase {
  type: "connected";
}

/**
 * Scan started event
 */
export interface ScanStartedEvent extends WSEventBase {
  type: "scan:started";
  data: {
    repoUrl: string;
    branch: string;
    scanners: ScannerType[];
  };
}

/**
 * Overall scan progress event
 */
export interface ScanProgressEvent extends WSEventBase {
  type: "scan:progress";
  data: {
    phase: "cloning" | "scanning" | "finalizing";
    progress: number;
    message: string;
  };
}

/**
 * Individual scanner started event
 */
export interface ScannerStartedEvent extends WSEventBase {
  type: "scanner:started";
  data: {
    scanner: ScannerType;
    totalFiles?: number;
  };
}

/**
 * Individual scanner progress event
 */
export interface ScannerProgressEvent extends WSEventBase {
  type: "scanner:progress";
  data: {
    scanner: ScannerType;
    progress: number;
    filesScanned?: number;
    currentFile?: string;
  };
}

/**
 * Any finding type
 */
export type Finding = VulnerabilityFinding | SecretFinding | SASTFinding;

/**
 * New finding discovered event
 */
export interface ScannerFindingEvent extends WSEventBase {
  type: "scanner:finding";
  data: {
    scanner: ScannerType;
    finding: Finding;
  };
}

/**
 * Individual scanner completed event
 */
export interface ScannerCompletedEvent extends WSEventBase {
  type: "scanner:completed";
  data: {
    scanner: ScannerType;
    duration: number;
    findingsCount: number;
    summary: {
      critical: number;
      high: number;
      medium: number;
      low: number;
      info: number;
    };
  };
}

/**
 * Scan completed successfully event
 */
export interface ScanCompletedEvent extends WSEventBase {
  type: "scan:completed";
  data: {
    summary: ScanSummary;
  };
}

/**
 * Scan failed event
 */
export interface ScanFailedEvent extends WSEventBase {
  type: "scan:failed";
  data: {
    error: {
      code: ErrorCode;
      message: string;
      phase?: string;
      scanner?: ScannerType;
    };
  };
}

/**
 * Heartbeat event (keep connection alive)
 */
export interface HeartbeatEvent extends WSEventBase {
  type: "heartbeat";
}

/**
 * Generic error event
 */
export interface WSErrorEvent extends WSEventBase {
  type: "error";
  data: {
    code: ErrorCode;
    message: string;
  };
}

/**
 * Union of all WebSocket events
 */
export type WSEvent =
  | WSConnectedEvent
  | ScanStartedEvent
  | ScanProgressEvent
  | ScannerStartedEvent
  | ScannerProgressEvent
  | ScannerFindingEvent
  | ScannerCompletedEvent
  | ScanCompletedEvent
  | ScanFailedEvent
  | HeartbeatEvent
  | WSErrorEvent;

/**
 * Type guard for finding events
 */
export function isFindingEvent(event: WSEvent): event is ScannerFindingEvent {
  return event.type === "scanner:finding";
}

/**
 * Type guard for completion events
 */
export function isCompletionEvent(
  event: WSEvent
): event is ScanCompletedEvent | ScanFailedEvent {
  return event.type === "scan:completed" || event.type === "scan:failed";
}

/**
 * Type guard for progress events
 */
export function isProgressEvent(
  event: WSEvent
): event is ScanProgressEvent | ScannerProgressEvent {
  return event.type === "scan:progress" || event.type === "scanner:progress";
}

/**
 * Create a WebSocket event
 */
export function createWSEvent<T extends WSEvent>(
  type: T["type"],
  scanId: string,
  data?: T extends { data: infer D } ? D : never
): T {
  const event: WSEventBase = {
    type,
    scanId,
    timestamp: new Date().toISOString(),
  };

  if (data !== undefined) {
    return { ...event, data } as T;
  }

  return event as T;
}
