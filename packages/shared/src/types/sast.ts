import type { Severity } from "../constants/severity";
import type { SASTCategory } from "../constants/scanner";

/**
 * SAST (Static Application Security Testing) finding from Semgrep
 */
export interface SASTFinding {
  /** Finding type discriminator */
  type: "sast";
  /** Unique finding ID */
  id: string;
  /** Severity level */
  severity: Severity;
  /** Semgrep rule ID */
  ruleId: string;
  /** Vulnerability category */
  category: SASTCategory;
  /** Short title */
  title: string;
  /** Detailed message explaining the vulnerability */
  message: string;
  /** File path */
  file: string;
  /** Start line number */
  startLine: number;
  /** End line number */
  endLine: number;
  /** Start column */
  startColumn?: number;
  /** End column */
  endColumn?: number;
  /** Vulnerable code snippet */
  code: string;
  /** Suggested fix (if available) */
  fix?: string;
  /** Reference URLs */
  references: string[];
  /** CWE identifiers */
  cweIds?: string[];
  /** OWASP categories (e.g., "A01:2021") */
  owaspIds?: string[];
  /** Technology/language */
  technology?: string;
  /** Confidence level */
  confidence: "high" | "medium" | "low";
}

/**
 * Map Semgrep severity to our severity levels
 */
export function mapSemgrepSeverity(
  semgrepSeverity: string
): Severity {
  const map: Record<string, Severity> = {
    ERROR: "critical",
    WARNING: "high",
    INFO: "medium",
  };
  return map[semgrepSeverity.toUpperCase()] || "low";
}

/**
 * Categorize a Semgrep rule by its ID
 */
export function categorizeSASTRule(ruleId: string): SASTCategory {
  const lowerRuleId = ruleId.toLowerCase();

  if (lowerRuleId.includes("sql") || lowerRuleId.includes("injection")) {
    return "injection";
  }
  if (lowerRuleId.includes("xss") || lowerRuleId.includes("cross-site")) {
    return "xss";
  }
  if (
    lowerRuleId.includes("auth") &&
    !lowerRuleId.includes("authz")
  ) {
    return "authentication";
  }
  if (
    lowerRuleId.includes("authz") ||
    lowerRuleId.includes("authorization") ||
    lowerRuleId.includes("access-control")
  ) {
    return "authorization";
  }
  if (
    lowerRuleId.includes("crypto") ||
    lowerRuleId.includes("hash") ||
    lowerRuleId.includes("cipher") ||
    lowerRuleId.includes("random")
  ) {
    return "crypto";
  }
  if (
    lowerRuleId.includes("path") ||
    lowerRuleId.includes("traversal") ||
    lowerRuleId.includes("lfi") ||
    lowerRuleId.includes("directory")
  ) {
    return "path-traversal";
  }
  if (lowerRuleId.includes("ssrf")) {
    return "ssrf";
  }
  if (
    lowerRuleId.includes("deserial") ||
    lowerRuleId.includes("pickle") ||
    lowerRuleId.includes("yaml.load")
  ) {
    return "deserialization";
  }
  if (
    lowerRuleId.includes("config") ||
    lowerRuleId.includes("cors") ||
    lowerRuleId.includes("header")
  ) {
    return "misconfiguration";
  }

  return "other";
}

/**
 * Common OWASP mappings
 */
export const OWASP_2021_CATEGORIES: Record<string, string> = {
  "A01:2021": "Broken Access Control",
  "A02:2021": "Cryptographic Failures",
  "A03:2021": "Injection",
  "A04:2021": "Insecure Design",
  "A05:2021": "Security Misconfiguration",
  "A06:2021": "Vulnerable and Outdated Components",
  "A07:2021": "Identification and Authentication Failures",
  "A08:2021": "Software and Data Integrity Failures",
  "A09:2021": "Security Logging and Monitoring Failures",
  "A10:2021": "Server-Side Request Forgery (SSRF)",
};

/**
 * OWASP 2025 categories
 */
export const OWASP_2025_CATEGORIES: Record<string, string> = {
  "A01:2025": "Broken Access Control",
  "A02:2025": "Security Misconfiguration",
  "A03:2025": "Software Supply Chain Failures",
  "A04:2025": "Cryptographic Failures",
  "A05:2025": "Injection",
  "A06:2025": "Insecure Design",
  "A07:2025": "Identification and Authentication Failures",
  "A08:2025": "Data Integrity Failures",
  "A09:2025": "Security Logging and Alerting Failures",
  "A10:2025": "Mishandling of Exceptional Conditions",
};
