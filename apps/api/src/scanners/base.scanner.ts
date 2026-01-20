import { ScannerType } from "@vibe/shared/constants";
import type { Finding } from "@vibe/shared/types";
import { runDockerContainer, type DockerRunResult } from "../utils/docker";
import { publish } from "../services/redis.service";
import { createWSEvent, type ScannerFindingEvent, type ScannerStartedEvent, type ScannerCompletedEvent } from "@vibe/shared/types";
import { SCANNER_IMAGES, SCANNER_TIMEOUTS } from "../config/constants";

export interface ScannerResult {
  scanner: ScannerType;
  findings: Finding[];
  duration: number;
  success: boolean;
  error?: string;
}

/**
 * Abstract base class for all scanners
 */
export abstract class BaseScanner {
  protected scanId: string;
  protected repoPath: string;
  protected startTime: number = 0;

  constructor(scanId: string, repoPath: string) {
    this.scanId = scanId;
    this.repoPath = repoPath;
  }

  /**
   * Scanner type identifier
   */
  abstract get type(): ScannerType;

  /**
   * Docker image to use
   */
  get dockerImage(): string {
    return SCANNER_IMAGES[this.type];
  }

  /**
   * Timeout for this scanner
   */
  get timeout(): number {
    return SCANNER_TIMEOUTS[this.type];
  }

  /**
   * Command to run inside the container
   */
  abstract get command(): string[];

  /**
   * Parse the scanner output into findings
   */
  abstract parseOutput(result: DockerRunResult): Promise<Finding[]>;

  /**
   * Whether non-zero exit codes are acceptable
   * (some scanners exit non-zero when findings are present)
   */
  protected allowNonZeroExit(_exitCode: number): boolean {
    return false;
  }

  /**
   * Run the scanner
   */
  async scan(): Promise<ScannerResult> {
    this.startTime = Date.now();

    try {
      // Emit started event
      await this.emitStarted();

      // Run the Docker container
      const result = await runDockerContainer({
        image: this.dockerImage,
        command: this.command,
        mountPath: this.repoPath,
        timeout: this.timeout,
      });

      // Check exit code
      if (result.exitCode !== 0 && !this.allowNonZeroExit(result.exitCode)) {
        throw new Error(
          `Scanner exited with code ${result.exitCode}: ${result.stderr}`
        );
      }

      // Parse findings
      const findings = await this.parseOutput(result);

      // Emit each finding
      for (const finding of findings) {
        await this.emitFinding(finding);
      }

      const duration = Date.now() - this.startTime;

      // Emit completed event
      await this.emitCompleted(findings, duration);

      return {
        scanner: this.type,
        findings,
        duration,
        success: true,
      };
    } catch (error) {
      const duration = Date.now() - this.startTime;
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      return {
        scanner: this.type,
        findings: [],
        duration,
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Emit scanner started event
   */
  protected async emitStarted(): Promise<void> {
    const event: ScannerStartedEvent = createWSEvent(
      "scanner:started",
      this.scanId,
      { scanner: this.type }
    );
    await publish(`scan:${this.scanId}`, JSON.stringify(event));
  }

  /**
   * Emit a finding event
   */
  protected async emitFinding(finding: Finding): Promise<void> {
    const event: ScannerFindingEvent = createWSEvent(
      "scanner:finding",
      this.scanId,
      { scanner: this.type, finding }
    );
    await publish(`scan:${this.scanId}`, JSON.stringify(event));
  }

  /**
   * Emit scanner completed event
   */
  protected async emitCompleted(
    findings: Finding[],
    duration: number
  ): Promise<void> {
    const summary = this.summarizeFindings(findings);
    const event: ScannerCompletedEvent = createWSEvent(
      "scanner:completed",
      this.scanId,
      {
        scanner: this.type,
        duration,
        findingsCount: findings.length,
        summary,
      }
    );
    await publish(`scan:${this.scanId}`, JSON.stringify(event));
  }

  /**
   * Summarize findings by severity
   */
  protected summarizeFindings(findings: Finding[]): {
    critical: number;
    high: number;
    medium: number;
    low: number;
    info: number;
  } {
    const summary = { critical: 0, high: 0, medium: 0, low: 0, info: 0 };

    for (const finding of findings) {
      if (finding.severity in summary) {
        summary[finding.severity as keyof typeof summary]++;
      }
    }

    return summary;
  }

  /**
   * Redact a secret value for safe display
   */
  protected redactSecret(value: string): string {
    if (value.length <= 8) {
      return "****";
    }
    return (
      value.slice(0, 4) + "*".repeat(Math.min(value.length - 8, 20)) + value.slice(-4)
    );
  }
}
