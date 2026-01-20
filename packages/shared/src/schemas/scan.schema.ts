import { z } from "zod";
import { GITHUB_URL_PATTERN } from "../constants";
import { ScannerType } from "../constants/scanner";

/**
 * GitHub URL validation schema
 */
export const GitHubUrlSchema = z
  .string()
  .url("Must be a valid URL")
  .refine(
    (url) => {
      try {
        const parsed = new URL(url);
        return parsed.hostname === "github.com";
      } catch {
        return false;
      }
    },
    { message: "Must be a GitHub URL (https://github.com/...)" }
  )
  .refine((url) => GITHUB_URL_PATTERN.test(url), {
    message:
      "Must be a valid GitHub repository URL (https://github.com/owner/repo)",
  })
  .refine((url) => !url.includes(".."), {
    message: "Invalid URL: path traversal not allowed",
  })
  .transform((url) => {
    // Normalize URL: remove trailing slash
    return url.replace(/\/$/, "");
  });

/**
 * Scan request validation schema
 */
export const ScanRequestSchema = z.object({
  repoUrl: GitHubUrlSchema,
  branch: z
    .string()
    .min(1)
    .max(256)
    .regex(/^[\w\-./]+$/, "Invalid branch name")
    .optional(),
  scanners: z
    .array(z.enum([ScannerType.TRIVY, ScannerType.GITLEAKS, ScannerType.SEMGREP]))
    .min(1, "At least one scanner must be selected")
    .optional(),
});

export type ScanRequestInput = z.input<typeof ScanRequestSchema>;
export type ScanRequestOutput = z.output<typeof ScanRequestSchema>;

/**
 * Scan ID validation schema
 */
export const ScanIdSchema = z
  .string()
  .min(1)
  .max(64)
  .regex(/^scan_[\w-]+$/, "Invalid scan ID format");

/**
 * Parse and validate a GitHub URL
 * Returns owner and repo if valid, throws if invalid
 */
export function parseGitHubUrl(url: string): {
  owner: string;
  repo: string;
  normalizedUrl: string;
} {
  const validated = GitHubUrlSchema.parse(url);
  const match = validated.match(
    /^https:\/\/github\.com\/([\w-]+)\/([\w.-]+)$/
  );

  if (!match) {
    throw new Error("Failed to parse GitHub URL");
  }

  const [, owner, repo] = match;
  return {
    owner,
    repo,
    normalizedUrl: validated,
  };
}

/**
 * Safely parse a GitHub URL without throwing
 */
export function safeParseGitHubUrl(url: string):
  | { success: true; data: { owner: string; repo: string; normalizedUrl: string } }
  | { success: false; error: string } {
  try {
    const result = parseGitHubUrl(url);
    return { success: true, data: result };
  } catch (error) {
    const message =
      error instanceof z.ZodError
        ? error.errors[0]?.message || "Invalid URL"
        : error instanceof Error
          ? error.message
          : "Invalid URL";
    return { success: false, error: message };
  }
}

/**
 * Validate a scan request
 */
export function validateScanRequest(data: unknown): ScanRequestOutput {
  return ScanRequestSchema.parse(data);
}

/**
 * Safely validate a scan request without throwing
 */
export function safeValidateScanRequest(data: unknown):
  | { success: true; data: ScanRequestOutput }
  | { success: false; error: z.ZodError } {
  const result = ScanRequestSchema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, error: result.error };
}
