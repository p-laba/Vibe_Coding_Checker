import { z } from "zod";

/**
 * Environment variable validation schema
 */
const EnvSchema = z.object({
  // Server
  PORT: z.coerce.number().default(3001),
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
  LOG_LEVEL: z
    .enum(["fatal", "error", "warn", "info", "debug", "trace"])
    .default("info"),

  // Redis
  REDIS_URL: z.string().url().default("redis://localhost:6379"),

  // CORS
  ALLOWED_ORIGINS: z
    .string()
    .default("http://localhost:3000")
    .transform((val) => val.split(",")),

  // Scanner configuration
  SCAN_TIMEOUT_MS: z.coerce.number().default(300_000), // 5 minutes
  CLONE_TIMEOUT_MS: z.coerce.number().default(60_000), // 1 minute
  MAX_REPO_SIZE_MB: z.coerce.number().default(500),
  SCAN_TEMP_DIR: z.string().default("/tmp/vibe-scans"),

  // Rate limiting
  RATE_LIMIT_MAX: z.coerce.number().default(5),
  RATE_LIMIT_WINDOW_HOURS: z.coerce.number().default(1),
});

export type Env = z.infer<typeof EnvSchema>;

/**
 * Parse and validate environment variables
 */
function parseEnv(): Env {
  const result = EnvSchema.safeParse(process.env);

  if (!result.success) {
    console.error("Invalid environment variables:");
    console.error(result.error.format());
    process.exit(1);
  }

  return result.data;
}

/**
 * Validated environment configuration
 */
export const env = parseEnv();

/**
 * Check if running in production
 */
export const isProduction = env.NODE_ENV === "production";

/**
 * Check if running in development
 */
export const isDevelopment = env.NODE_ENV === "development";
