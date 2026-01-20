/**
 * Scanner types available in the system
 */
export const ScannerType = {
  TRIVY: "trivy",
  GITLEAKS: "gitleaks",
  SEMGREP: "semgrep",
} as const;

export type ScannerType = (typeof ScannerType)[keyof typeof ScannerType];

/**
 * Scanner display names
 */
export const SCANNER_NAMES: Record<ScannerType, string> = {
  trivy: "Trivy",
  gitleaks: "Gitleaks",
  semgrep: "Semgrep",
};

/**
 * Scanner descriptions
 */
export const SCANNER_DESCRIPTIONS: Record<ScannerType, string> = {
  trivy: "Dependency vulnerabilities and secrets detection",
  gitleaks: "Deep secret and credential scanning",
  semgrep: "Static code analysis for security vulnerabilities",
};

/**
 * All available scanners
 */
export const ALL_SCANNERS: ScannerType[] = [
  ScannerType.TRIVY,
  ScannerType.GITLEAKS,
  ScannerType.SEMGREP,
];

/**
 * Scan status values
 */
export const ScanStatus = {
  QUEUED: "queued",
  CLONING: "cloning",
  SCANNING: "scanning",
  COMPLETED: "completed",
  FAILED: "failed",
} as const;

export type ScanStatus = (typeof ScanStatus)[keyof typeof ScanStatus];

/**
 * Finding types
 */
export const FindingType = {
  VULNERABILITY: "vulnerability",
  SECRET: "secret",
  SAST: "sast",
} as const;

export type FindingType = (typeof FindingType)[keyof typeof FindingType];

/**
 * SAST categories (based on OWASP)
 */
export const SASTCategory = {
  INJECTION: "injection",
  XSS: "xss",
  AUTHENTICATION: "authentication",
  AUTHORIZATION: "authorization",
  CRYPTO: "crypto",
  PATH_TRAVERSAL: "path-traversal",
  SSRF: "ssrf",
  DESERIALIZATION: "deserialization",
  MISCONFIGURATION: "misconfiguration",
  OTHER: "other",
} as const;

export type SASTCategory = (typeof SASTCategory)[keyof typeof SASTCategory];

/**
 * Package ecosystems supported
 */
export const PackageEcosystem = {
  NPM: "npm",
  PIP: "pip",
  GO: "go",
  MAVEN: "maven",
  CARGO: "cargo",
  NUGET: "nuget",
  GEM: "gem",
  COMPOSER: "composer",
} as const;

export type PackageEcosystem =
  (typeof PackageEcosystem)[keyof typeof PackageEcosystem];
