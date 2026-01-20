import { BaseScanner } from "./base.scanner";
import { ScannerType, PackageEcosystem } from "@vibe/shared/constants";
import type { Finding, VulnerabilityFinding, SecretFinding } from "@vibe/shared/types";
import type { Severity } from "@vibe/shared/constants";
import type { DockerRunResult } from "../utils/docker";

// Trivy JSON output types
interface TrivyOutput {
  Results?: TrivyResult[];
}

interface TrivyResult {
  Target: string;
  Type: string;
  Vulnerabilities?: TrivyVulnerability[];
  Secrets?: TrivySecret[];
}

interface TrivyVulnerability {
  VulnerabilityID: string;
  PkgName: string;
  InstalledVersion: string;
  FixedVersion?: string;
  Severity: string;
  Title?: string;
  Description?: string;
  References?: string[];
  CVSS?: {
    nvd?: { V3Score?: number; V3Vector?: string };
    redhat?: { V3Score?: number };
  };
  CweIDs?: string[];
  PublishedDate?: string;
  LastModifiedDate?: string;
}

interface TrivySecret {
  RuleID: string;
  Category: string;
  Severity: string;
  Title: string;
  StartLine: number;
  EndLine: number;
  Match: string;
}

/**
 * Trivy scanner for dependencies and secrets
 */
export class TrivyScanner extends BaseScanner {
  get type(): ScannerType {
    return ScannerType.TRIVY;
  }

  get command(): string[] {
    return [
      "fs",
      "--format", "json",
      "--scanners", "vuln,secret",
      "--severity", "CRITICAL,HIGH,MEDIUM,LOW",
      "--no-progress",
      "--quiet",
      "/scan",
    ];
  }

  protected allowNonZeroExit(exitCode: number): boolean {
    // Trivy exits with code 1 when vulnerabilities are found
    return exitCode === 1;
  }

  async parseOutput(result: DockerRunResult): Promise<Finding[]> {
    const findings: Finding[] = [];

    if (!result.stdout.trim()) {
      return findings;
    }

    try {
      const output: TrivyOutput = JSON.parse(result.stdout);

      for (const trivyResult of output.Results || []) {
        // Parse vulnerability findings
        for (const vuln of trivyResult.Vulnerabilities || []) {
          findings.push(this.parseVulnerability(vuln, trivyResult));
        }

        // Parse secret findings
        for (const secret of trivyResult.Secrets || []) {
          findings.push(this.parseSecret(secret, trivyResult.Target));
        }
      }
    } catch (error) {
      console.error("Failed to parse Trivy output:", error);
      // Return empty findings rather than failing
    }

    return findings;
  }

  private parseVulnerability(
    vuln: TrivyVulnerability,
    result: TrivyResult
  ): VulnerabilityFinding {
    return {
      type: "vulnerability",
      id: `trivy-${vuln.VulnerabilityID}-${vuln.PkgName}`,
      cveId: vuln.VulnerabilityID,
      severity: this.mapSeverity(vuln.Severity),
      title: vuln.Title || vuln.VulnerabilityID,
      description: vuln.Description || "",
      package: {
        name: vuln.PkgName,
        version: vuln.InstalledVersion,
        ecosystem: this.mapEcosystem(result.Type),
        manifestFile: result.Target,
      },
      fixedVersion: vuln.FixedVersion,
      cvss: vuln.CVSS
        ? {
            score: vuln.CVSS.nvd?.V3Score || vuln.CVSS.redhat?.V3Score || 0,
            vector: vuln.CVSS.nvd?.V3Vector,
          }
        : undefined,
      references: vuln.References || [],
      cweIds: vuln.CweIDs,
      publishedAt: vuln.PublishedDate,
      modifiedAt: vuln.LastModifiedDate,
    };
  }

  private parseSecret(secret: TrivySecret, target: string): SecretFinding {
    return {
      type: "secret",
      id: `trivy-secret-${secret.RuleID}-${target}-${secret.StartLine}`,
      severity: this.mapSeverity(secret.Severity),
      ruleId: secret.RuleID,
      description: secret.Title,
      file: target,
      line: secret.StartLine,
      match: this.redactSecret(secret.Match),
      secretType: this.mapSecretType(secret.RuleID),
      detectedBy: ScannerType.TRIVY,
    };
  }

  private mapSeverity(trivySeverity: string): Severity {
    const map: Record<string, Severity> = {
      CRITICAL: "critical",
      HIGH: "high",
      MEDIUM: "medium",
      LOW: "low",
      UNKNOWN: "info",
    };
    return map[trivySeverity.toUpperCase()] || "info";
  }

  private mapEcosystem(trivyType: string): PackageEcosystem {
    const map: Record<string, PackageEcosystem> = {
      npm: PackageEcosystem.NPM,
      "node-pkg": PackageEcosystem.NPM,
      yarn: PackageEcosystem.NPM,
      pnpm: PackageEcosystem.NPM,
      pip: PackageEcosystem.PIP,
      pipenv: PackageEcosystem.PIP,
      poetry: PackageEcosystem.PIP,
      gomod: PackageEcosystem.GO,
      gobinary: PackageEcosystem.GO,
      pom: PackageEcosystem.MAVEN,
      gradle: PackageEcosystem.MAVEN,
      cargo: PackageEcosystem.CARGO,
      nuget: PackageEcosystem.NUGET,
      "dotnet-core": PackageEcosystem.NUGET,
      bundler: PackageEcosystem.GEM,
      gemspec: PackageEcosystem.GEM,
      composer: PackageEcosystem.COMPOSER,
    };
    return map[trivyType.toLowerCase()] || PackageEcosystem.NPM;
  }

  private mapSecretType(ruleId: string): SecretFinding["secretType"] {
    const lower = ruleId.toLowerCase();
    if (lower.includes("aws")) return "aws-access-key";
    if (lower.includes("github")) return "github-token";
    if (lower.includes("private-key")) return "private-key";
    if (lower.includes("api-key")) return "api-key";
    return "other";
  }
}
