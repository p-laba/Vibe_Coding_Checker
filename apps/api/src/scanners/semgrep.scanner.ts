import { BaseScanner } from "./base.scanner";
import { ScannerType } from "@vibe/shared/constants";
import type { Finding, SASTFinding } from "@vibe/shared/types";
import { mapSemgrepSeverity, categorizeSASTRule } from "@vibe/shared/types";
import type { DockerRunResult } from "../utils/docker";

// Semgrep JSON output types
interface SemgrepOutput {
  results: SemgrepResult[];
  errors: SemgrepError[];
}

interface SemgrepResult {
  check_id: string;
  path: string;
  start: { line: number; col: number };
  end: { line: number; col: number };
  extra: {
    message: string;
    severity: string;
    lines: string;
    metadata?: {
      references?: string[];
      cwe?: string[];
      owasp?: string[];
      technology?: string[];
      confidence?: string;
    };
    fix?: string;
  };
}

interface SemgrepError {
  message: string;
  level: string;
}

/**
 * Semgrep scanner for static code analysis
 */
export class SemgrepScanner extends BaseScanner {
  get type(): ScannerType {
    return ScannerType.SEMGREP;
  }

  get command(): string[] {
    return [
      "semgrep",
      "scan",
      "--config", "p/owasp-top-ten",
      "--config", "p/security-audit",
      "--json",
      "--metrics=off",
      "--quiet",
      "/scan",
    ];
  }

  async parseOutput(result: DockerRunResult): Promise<Finding[]> {
    const findings: Finding[] = [];

    if (!result.stdout.trim()) {
      return findings;
    }

    try {
      const output: SemgrepOutput = JSON.parse(result.stdout);

      // Log any errors from Semgrep
      for (const error of output.errors || []) {
        console.warn("Semgrep error:", error.message);
      }

      for (const semgrepResult of output.results || []) {
        findings.push(this.parseFinding(semgrepResult));
      }
    } catch (error) {
      console.error("Failed to parse Semgrep output:", error);
      // Return empty findings rather than failing
    }

    return findings;
  }

  private parseFinding(result: SemgrepResult): SASTFinding {
    const category = categorizeSASTRule(result.check_id);
    const severity = mapSemgrepSeverity(result.extra.severity);

    return {
      type: "sast",
      id: `semgrep-${result.check_id}-${result.path}-${result.start.line}`,
      severity,
      ruleId: result.check_id,
      category,
      title: this.extractTitle(result.extra.message),
      message: result.extra.message,
      file: result.path,
      startLine: result.start.line,
      endLine: result.end.line,
      startColumn: result.start.col,
      endColumn: result.end.col,
      code: result.extra.lines,
      fix: result.extra.fix,
      references: result.extra.metadata?.references || [],
      cweIds: result.extra.metadata?.cwe,
      owaspIds: result.extra.metadata?.owasp,
      technology: result.extra.metadata?.technology?.[0],
      confidence: this.mapConfidence(result.extra.metadata?.confidence),
    };
  }

  private extractTitle(message: string): string {
    // Extract first sentence as title
    const firstSentence = message.split(/\.\s/)[0];
    return firstSentence.length > 100
      ? firstSentence.slice(0, 97) + "..."
      : firstSentence;
  }

  private mapConfidence(
    confidence?: string
  ): "high" | "medium" | "low" {
    if (!confidence) return "medium";
    const lower = confidence.toLowerCase();
    if (lower === "high") return "high";
    if (lower === "low") return "low";
    return "medium";
  }
}
