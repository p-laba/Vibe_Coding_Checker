import { BaseScanner } from "./base.scanner";
import { ScannerType } from "@vibe/shared/constants";
import type { Finding, SecretFinding } from "@vibe/shared/types";
import { getSecretType, SECRET_SEVERITY } from "@vibe/shared/types";
import type { DockerRunResult } from "../utils/docker";

// Gitleaks JSON output types
interface GitleaksFinding {
  Description: string;
  StartLine: number;
  EndLine: number;
  StartColumn: number;
  EndColumn: number;
  Match: string;
  Secret: string;
  File: string;
  Commit: string;
  Entropy: number;
  Author: string;
  Email: string;
  Date: string;
  Message: string;
  Tags: string[];
  RuleID: string;
  Fingerprint: string;
}

/**
 * Gitleaks scanner for deep secret detection
 */
export class GitleaksScanner extends BaseScanner {
  get type(): ScannerType {
    return ScannerType.GITLEAKS;
  }

  get command(): string[] {
    return [
      "detect",
      "--source", "/scan",
      "--report-format", "json",
      "--report-path", "/dev/stdout",
      "--no-git", // Scan files, not git history (faster)
      "--exit-code", "0", // Don't fail on findings
    ];
  }

  async parseOutput(result: DockerRunResult): Promise<Finding[]> {
    const findings: Finding[] = [];

    if (!result.stdout.trim() || result.stdout.trim() === "[]") {
      return findings;
    }

    try {
      const output: GitleaksFinding[] = JSON.parse(result.stdout);

      for (const gitleaksFinding of output) {
        findings.push(this.parseFinding(gitleaksFinding));
      }
    } catch (error) {
      console.error("Failed to parse Gitleaks output:", error);
      // Return empty findings rather than failing
    }

    return findings;
  }

  private parseFinding(finding: GitleaksFinding): SecretFinding {
    const secretType = getSecretType(finding.RuleID);
    const severity = SECRET_SEVERITY[secretType];

    return {
      type: "secret",
      id: `gitleaks-${finding.Fingerprint}`,
      severity,
      ruleId: finding.RuleID,
      description: finding.Description,
      file: finding.File,
      line: finding.StartLine,
      column: finding.StartColumn,
      match: this.redactSecret(finding.Secret || finding.Match),
      secretType,
      entropy: finding.Entropy,
      detectedBy: ScannerType.GITLEAKS,
      commit: finding.Commit || undefined,
      author: finding.Author || undefined,
      commitDate: finding.Date || undefined,
    };
  }
}
