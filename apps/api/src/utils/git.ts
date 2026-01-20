import { simpleGit, SimpleGit, SimpleGitOptions } from "simple-git";
import { env } from "../config/env";

/**
 * Clone a repository to a local directory
 */
export async function cloneRepository(
  repoUrl: string,
  targetDir: string,
  options?: {
    branch?: string;
    depth?: number;
    timeout?: number;
  }
): Promise<void> {
  const gitOptions: Partial<SimpleGitOptions> = {
    baseDir: targetDir,
    binary: "git",
    maxConcurrentProcesses: 1,
    timeout: {
      block: options?.timeout ?? env.CLONE_TIMEOUT_MS,
    },
  };

  const git: SimpleGit = simpleGit(gitOptions);

  const cloneOptions = [
    "--depth",
    String(options?.depth ?? 1),
    "--single-branch",
  ];

  if (options?.branch) {
    cloneOptions.push("--branch", options.branch);
  }

  try {
    await git.clone(repoUrl, targetDir, cloneOptions);
    console.log(`Successfully cloned ${repoUrl} to ${targetDir}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    if (message.includes("timeout")) {
      throw new Error(`Clone timeout: ${repoUrl}`);
    }

    if (
      message.includes("not found") ||
      message.includes("Repository not found")
    ) {
      throw new Error(`Repository not found: ${repoUrl}`);
    }

    if (message.includes("Permission denied") || message.includes("403")) {
      throw new Error(`Repository is private: ${repoUrl}`);
    }

    throw new Error(`Clone failed: ${message}`);
  }
}

/**
 * Get repository information
 */
export async function getRepoInfo(
  repoDir: string
): Promise<{
  branch: string;
  commit: string;
  remoteUrl: string;
}> {
  const git = simpleGit(repoDir);

  const [branch, log, remotes] = await Promise.all([
    git.revparse(["--abbrev-ref", "HEAD"]),
    git.log(["-1"]),
    git.getRemotes(true),
  ]);

  return {
    branch: branch.trim(),
    commit: log.latest?.hash ?? "unknown",
    remoteUrl: remotes[0]?.refs?.fetch ?? "unknown",
  };
}
