import type { Severity } from "../constants/severity";
import type { ScannerType } from "../constants/scanner";

/**
 * Secret finding (from Gitleaks and Trivy)
 */
export interface SecretFinding {
  /** Finding type discriminator */
  type: "secret";
  /** Unique finding ID */
  id: string;
  /** Severity level */
  severity: Severity;
  /** Rule ID that detected this secret */
  ruleId: string;
  /** Rule description */
  description: string;
  /** File path where secret was found */
  file: string;
  /** Line number */
  line: number;
  /** Column number (if available) */
  column?: number;
  /** Redacted secret match (first/last 4 chars visible) */
  match: string;
  /** Secret type category */
  secretType: SecretType;
  /** Entropy score (higher = more random = more likely a secret) */
  entropy?: number;
  /** Scanner that found this secret */
  detectedBy: ScannerType;
  /** Git commit SHA (if from history) */
  commit?: string;
  /** Git commit author (if from history) */
  author?: string;
  /** Git commit date (if from history) */
  commitDate?: string;
}

/**
 * Common secret types
 */
export type SecretType =
  | "aws-access-key"
  | "aws-secret-key"
  | "github-token"
  | "github-pat"
  | "gitlab-token"
  | "google-api-key"
  | "gcp-service-account"
  | "azure-client-secret"
  | "stripe-api-key"
  | "stripe-secret-key"
  | "slack-token"
  | "slack-webhook"
  | "discord-token"
  | "twilio-api-key"
  | "sendgrid-api-key"
  | "mailgun-api-key"
  | "jwt-secret"
  | "private-key"
  | "rsa-private-key"
  | "ssh-private-key"
  | "database-url"
  | "postgres-password"
  | "mysql-password"
  | "mongodb-uri"
  | "redis-password"
  | "api-key"
  | "bearer-token"
  | "oauth-token"
  | "generic-secret"
  | "high-entropy-string"
  | "password"
  | "other";

/**
 * Map rule IDs to secret types
 */
export const SECRET_TYPE_MAP: Record<string, SecretType> = {
  "aws-access-key-id": "aws-access-key",
  "aws-secret-access-key": "aws-secret-key",
  "github-pat": "github-pat",
  "github-fine-grained-pat": "github-pat",
  "github-oauth": "github-token",
  "gcp-api-key": "google-api-key",
  "google-api-key": "google-api-key",
  "stripe-api-key": "stripe-api-key",
  "private-key": "private-key",
  "jwt": "jwt-secret",
  "generic-api-key": "api-key",
};

/**
 * Get secret type from rule ID
 */
export function getSecretType(ruleId: string): SecretType {
  const normalizedRuleId = ruleId.toLowerCase().replace(/_/g, "-");

  for (const [pattern, secretType] of Object.entries(SECRET_TYPE_MAP)) {
    if (normalizedRuleId.includes(pattern)) {
      return secretType;
    }
  }

  return "other";
}

/**
 * Severity classification for secret types
 */
export const SECRET_SEVERITY: Record<SecretType, Severity> = {
  "aws-access-key": "critical",
  "aws-secret-key": "critical",
  "github-token": "critical",
  "github-pat": "critical",
  "gitlab-token": "critical",
  "google-api-key": "high",
  "gcp-service-account": "critical",
  "azure-client-secret": "critical",
  "stripe-api-key": "critical",
  "stripe-secret-key": "critical",
  "slack-token": "high",
  "slack-webhook": "medium",
  "discord-token": "high",
  "twilio-api-key": "high",
  "sendgrid-api-key": "high",
  "mailgun-api-key": "high",
  "jwt-secret": "critical",
  "private-key": "critical",
  "rsa-private-key": "critical",
  "ssh-private-key": "critical",
  "database-url": "critical",
  "postgres-password": "critical",
  "mysql-password": "critical",
  "mongodb-uri": "critical",
  "redis-password": "high",
  "api-key": "high",
  "bearer-token": "high",
  "oauth-token": "high",
  "generic-secret": "medium",
  "high-entropy-string": "low",
  password: "high",
  other: "medium",
};
