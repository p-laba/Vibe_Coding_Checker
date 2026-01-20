import type { ScannerType, ScanStatus } from "../constants/scanner";
import type { ErrorCode } from "../constants/errors";

/**
 * Scan request from client
 */
export interface ScanRequest {
  /** GitHub repository URL */
  repoUrl: string;
  /** Optional branch to scan (defaults to default branch) */
  branch?: string;
  /** Optional specific scanners to run (defaults to all) */
  scanners?: ScannerType[];
}

/**
 * Scan response after job creation
 */
export interface ScanResponse {
  /** Unique scan identifier */
  scanId: string;
  /** WebSocket URL for real-time updates */
  wsUrl: string;
  /** Estimated scan duration in seconds */
  estimatedDuration: number;
  /** Position in queue (0 = processing now) */
  queuePosition: number;
}

/**
 * Scan job data stored in queue
 */
export interface ScanJob {
  /** Unique scan identifier */
  scanId: string;
  /** GitHub repository URL */
  repoUrl: string;
  /** Repository owner */
  owner: string;
  /** Repository name */
  repo: string;
  /** Branch to scan */
  branch?: string;
  /** Scanners to run */
  scanners: ScannerType[];
  /** Job creation timestamp */
  createdAt: string;
  /** Client IP address (for rate limiting) */
  clientIp: string;
}

/**
 * Scan status response
 */
export interface ScanStatusResponse {
  /** Unique scan identifier */
  scanId: string;
  /** Current scan status */
  status: ScanStatus;
  /** Overall progress (0-100) */
  progress: number;
  /** Progress per scanner */
  scannerProgress: Record<
    ScannerType,
    {
      status: "pending" | "running" | "completed" | "failed";
      progress: number;
      findingsCount: number;
    }
  >;
  /** Scan start timestamp */
  startedAt?: string;
  /** Scan completion timestamp */
  completedAt?: string;
  /** Error information if failed */
  error?: {
    code: ErrorCode;
    message: string;
  };
}

/**
 * Scan summary after completion
 */
export interface ScanSummary {
  /** Total duration in milliseconds */
  duration: number;
  /** Total findings count */
  totalFindings: number;
  /** Findings by severity */
  bySeverity: {
    critical: number;
    high: number;
    medium: number;
    low: number;
    info: number;
  };
  /** Findings by scanner */
  byScanner: Record<ScannerType, number>;
  /** Findings by type */
  byType: {
    vulnerability: number;
    secret: number;
    sast: number;
  };
  /** Files scanned */
  filesScanned: number;
  /** Dependencies checked */
  dependenciesChecked: number;
}

/**
 * Repository information extracted from URL
 */
export interface RepoInfo {
  /** Repository owner (user or organization) */
  owner: string;
  /** Repository name */
  repo: string;
  /** Full URL */
  url: string;
  /** Whether repository is public */
  isPublic: boolean;
  /** Default branch name */
  defaultBranch?: string;
}
