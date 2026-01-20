import Redis from "ioredis";
import { env } from "../config/env";

let redisClient: Redis | null = null;
let subscriberClient: Redis | null = null;

/**
 * Get or create the Redis client (singleton)
 */
export function getRedisClient(): Redis {
  if (!redisClient) {
    redisClient = new Redis(env.REDIS_URL, {
      maxRetriesPerRequest: null, // Required for BullMQ
      enableReadyCheck: false,
      retryStrategy: (times) => {
        if (times > 10) {
          console.error("Redis connection failed after 10 retries");
          return null;
        }
        return Math.min(times * 100, 3000);
      },
    });

    redisClient.on("error", (error) => {
      console.error("Redis client error:", error);
    });

    redisClient.on("connect", () => {
      console.log("Redis client connected");
    });
  }

  return redisClient;
}

/**
 * Get or create a subscriber client for pub/sub
 */
export function getSubscriberClient(): Redis {
  if (!subscriberClient) {
    subscriberClient = new Redis(env.REDIS_URL, {
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
      retryStrategy: (times) => {
        if (times > 10) {
          return null;
        }
        return Math.min(times * 100, 3000);
      },
    });

    subscriberClient.on("error", (error) => {
      console.error("Redis subscriber error:", error);
    });
  }

  return subscriberClient;
}

/**
 * Publish a message to a channel
 */
export async function publish(channel: string, message: string): Promise<void> {
  const client = getRedisClient();
  await client.publish(channel, message);
}

/**
 * Subscribe to a channel
 */
export async function subscribe(
  channel: string,
  callback: (message: string) => void
): Promise<() => Promise<void>> {
  const subscriber = getSubscriberClient();

  subscriber.on("message", (ch, message) => {
    if (ch === channel) {
      callback(message);
    }
  });

  await subscriber.subscribe(channel);

  // Return unsubscribe function
  return async () => {
    await subscriber.unsubscribe(channel);
  };
}

/**
 * Close Redis connections
 */
export async function closeRedis(): Promise<void> {
  if (redisClient) {
    await redisClient.quit();
    redisClient = null;
  }
  if (subscriberClient) {
    await subscriberClient.quit();
    subscriberClient = null;
  }
}

/**
 * Check Redis connection health
 */
export async function isRedisHealthy(): Promise<boolean> {
  try {
    const client = getRedisClient();
    const result = await client.ping();
    return result === "PONG";
  } catch {
    return false;
  }
}
