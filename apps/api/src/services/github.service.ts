import { safeParseGitHubUrl } from "@vibe/shared/schemas";
import type { RepoInfo } from "@vibe/shared/types";
import { Errors } from "../middleware/error-handler";

/**
 * Validate a GitHub URL and check if the repository is public
 */
export async function validateGitHubUrl(url: string): Promise<RepoInfo> {
  // Parse and validate URL format
  const parseResult = safeParseGitHubUrl(url);

  if (!parseResult.success) {
    throw Errors.invalidGitHubUrl(url);
  }

  const { owner, repo, normalizedUrl } = parseResult.data;

  // Check if repository exists and is public via GitHub API
  try {
    const response: globalThis.Response = await fetch(
      `https://api.github.com/repos/${owner}/${repo}`,
      {
        method: "GET",
        headers: {
          Accept: "application/vnd.github.v3+json",
          "User-Agent": "Vibe-Security-Scanner/1.0",
        },
      }
    );

    if (response.status === 404) {
      throw Errors.repositoryNotFound(url);
    }

    if (response.status === 403) {
      // Could be rate limited or private
      const remaining = response.headers.get("x-ratelimit-remaining");
      if (remaining === "0") {
        console.warn("GitHub API rate limit reached");
        // Continue anyway - we'll try to clone and see what happens
      } else {
        throw Errors.privateRepository(url);
      }
    }

    if (!response.ok) {
      throw Errors.repositoryNotFound(url);
    }

    const data = (await response.json()) as { private?: boolean; default_branch?: string };

    if (data.private) {
      throw Errors.privateRepository(url);
    }

    return {
      owner,
      repo,
      url: normalizedUrl,
      isPublic: !data.private,
      defaultBranch: data.default_branch,
    };
  } catch (error) {
    // Re-throw AppErrors
    if (error instanceof Error && error.name === "AppError") {
      throw error;
    }

    // Network errors - try to proceed anyway
    console.warn("GitHub API check failed, proceeding with clone:", error);
    return {
      owner,
      repo,
      url: normalizedUrl,
      isPublic: true, // Assume public, will fail at clone if not
    };
  }
}

/**
 * Quick validation without GitHub API call
 * Use when you just need URL format validation
 */
export function quickValidateGitHubUrl(url: string): {
  valid: boolean;
  owner?: string;
  repo?: string;
  error?: string;
} {
  const parseResult = safeParseGitHubUrl(url);

  if (!parseResult.success) {
    return { valid: false, error: parseResult.error };
  }

  return {
    valid: true,
    owner: parseResult.data.owner,
    repo: parseResult.data.repo,
  };
}
