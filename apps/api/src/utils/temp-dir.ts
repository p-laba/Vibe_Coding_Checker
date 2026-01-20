import { mkdir, rm, readdir, stat } from "fs/promises";
import { join } from "path";
import { randomBytes } from "crypto";
import { env } from "../config/env";
import { DEFAULTS } from "@vibe/shared/constants";

/**
 * Create a unique temporary directory for a scan
 */
export async function createTempDir(scanId: string): Promise<string> {
  // Ensure base temp directory exists
  await mkdir(env.SCAN_TEMP_DIR, { recursive: true });

  // Generate a random suffix for additional uniqueness
  const randomSuffix = randomBytes(8).toString("hex");
  const dirName = `${scanId}-${randomSuffix}`;
  const tempDir = join(env.SCAN_TEMP_DIR, dirName);

  // Create the directory
  await mkdir(tempDir, { recursive: true });

  console.log(`Created temp directory: ${tempDir}`);

  return tempDir;
}

/**
 * Clean up a temporary directory
 */
export async function cleanupTempDir(tempDir: string): Promise<void> {
  try {
    // Security check: ensure the path is within our temp directory
    if (!tempDir.startsWith(env.SCAN_TEMP_DIR)) {
      console.error(`Refusing to delete directory outside temp dir: ${tempDir}`);
      return;
    }

    await rm(tempDir, { recursive: true, force: true, maxRetries: 3 });
    console.log(`Cleaned up temp directory: ${tempDir}`);
  } catch (error) {
    console.error(`Failed to cleanup temp directory ${tempDir}:`, error);
  }
}

/**
 * Clean up old temporary directories
 */
export async function cleanupOldTempDirs(): Promise<void> {
  try {
    const entries = await readdir(env.SCAN_TEMP_DIR);
    const now = Date.now();

    for (const entry of entries) {
      const fullPath = join(env.SCAN_TEMP_DIR, entry);

      try {
        const stats = await stat(fullPath);
        const age = now - stats.mtime.getTime();

        if (age > DEFAULTS.TEMP_CLEANUP_AGE_MS) {
          await cleanupTempDir(fullPath);
        }
      } catch {
        // Skip entries that can't be stat'd
      }
    }
  } catch {
    // Temp dir might not exist yet, that's fine
  }
}

/**
 * Start periodic cleanup of old temp directories
 */
export function startCleanupScheduler(): NodeJS.Timeout {
  // Run cleanup every 5 minutes
  return setInterval(cleanupOldTempDirs, 5 * 60 * 1000);
}
