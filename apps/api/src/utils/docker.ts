import { spawn } from "child_process";

export interface DockerRunOptions {
  image: string;
  command: string[];
  mountPath: string;
  timeout: number;
  env?: Record<string, string>;
}

export interface DockerRunResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

/**
 * Run a Docker container with security restrictions
 */
export function runDockerContainer(
  options: DockerRunOptions
): Promise<DockerRunResult> {
  return new Promise((resolve, reject) => {
    const args = buildDockerArgs(options);

    const docker = spawn("docker", args, {
      stdio: ["ignore", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";

    docker.stdout.on("data", (data) => {
      stdout += data.toString();
    });

    docker.stderr.on("data", (data) => {
      stderr += data.toString();
    });

    // Timeout handler
    const timeoutId = setTimeout(() => {
      docker.kill("SIGKILL");
      reject(new Error(`Docker container timed out after ${options.timeout}ms`));
    }, options.timeout);

    docker.on("close", (code) => {
      clearTimeout(timeoutId);
      resolve({
        stdout,
        stderr,
        exitCode: code ?? 1,
      });
    });

    docker.on("error", (error) => {
      clearTimeout(timeoutId);
      reject(new Error(`Docker execution failed: ${error.message}`));
    });
  });
}

/**
 * Build Docker run arguments with security restrictions
 */
function buildDockerArgs(options: DockerRunOptions): string[] {
  const args = [
    "run",
    "--rm", // Remove container after exit
    "--network", "none", // No network access - critical for security!
    "--memory", "2g", // Memory limit
    "--memory-swap", "2g", // No swap
    "--cpus", "1.0", // CPU limit
    "--pids-limit", "100", // Process limit
    "--read-only", // Read-only root filesystem
    "--security-opt", "no-new-privileges:true", // No privilege escalation
    "--cap-drop", "ALL", // Drop all capabilities
    // Temporary filesystem for tools that need to write
    "--tmpfs", "/tmp:rw,noexec,nosuid,size=100m",
    // Mount the repository read-only
    "-v", `${options.mountPath}:/scan:ro`,
  ];

  // Add environment variables
  if (options.env) {
    for (const [key, value] of Object.entries(options.env)) {
      args.push("-e", `${key}=${value}`);
    }
  }

  // Add image and command
  args.push(options.image);
  args.push(...options.command);

  return args;
}

/**
 * Check if Docker is available
 */
export async function isDockerAvailable(): Promise<boolean> {
  return new Promise((resolve) => {
    const docker = spawn("docker", ["version", "--format", "{{.Server.Version}}"], {
      stdio: ["ignore", "pipe", "pipe"],
    });

    docker.on("close", (code) => {
      resolve(code === 0);
    });

    docker.on("error", () => {
      resolve(false);
    });

    // Timeout after 5 seconds
    setTimeout(() => {
      docker.kill();
      resolve(false);
    }, 5000);
  });
}

/**
 * Pull a Docker image if not present
 */
export async function ensureDockerImage(image: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const docker = spawn("docker", ["pull", image], {
      stdio: ["ignore", "pipe", "pipe"],
    });

    docker.on("close", (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Failed to pull Docker image: ${image}`));
      }
    });

    docker.on("error", (error) => {
      reject(error);
    });

    // Timeout after 5 minutes
    setTimeout(() => {
      docker.kill();
      reject(new Error(`Docker pull timed out for image: ${image}`));
    }, 300000);
  });
}
