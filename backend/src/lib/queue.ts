import { Queue, QueueEvents } from "bullmq";

import { logger } from "./logger";
import { getRedisClient, isRedisEnabled } from "./redis";

// ── Queue Definitions ────────────────────────────────────────────────────────

export const QUEUE_NAMES = {
  ANALYTICS: "analytics",
  FORECASTING: "forecasting",
  PORTFOLIO: "portfolio",
  NOTIFICATIONS: "notifications",
  MARKET_SYNC: "market-sync",
  ML_INFERENCE: "ml-inference",
} as const;

type QueueName = (typeof QUEUE_NAMES)[keyof typeof QUEUE_NAMES];

// A registry to hold initialized queues
const queues = new Map<QueueName, Queue>();
const queueEvents = new Map<QueueName, QueueEvents>();

/**
 * Get or initialize a queue
 */
export function getQueue(name: QueueName): Queue | null {
  if (!isRedisEnabled()) {
    logger.warn(`[Queue] Redis is disabled. Cannot initialize queue: ${name}`);
    return null;
  }

  if (queues.has(name)) {
    return queues.get(name)!;
  }

  const connection = getRedisClient();
  if (!connection) return null;

  const queue = new Queue(name, {
    connection,
    defaultJobOptions: {
      attempts: 3,
      backoff: {
        type: "exponential",
        delay: 1000,
      },
      removeOnComplete: {
        age: 3600, // keep for 1 hour
        count: 1000,
      },
      removeOnFail: {
        age: 24 * 3600, // keep for 24 hours
      },
    },
  });

  queues.set(name, queue);
  logger.info(`[Queue] Initialized queue: ${name}`);

  return queue;
}

/**
 * Get or initialize a QueueEvents instance for a queue
 * Useful for listening to job completions, progress, etc.
 */
export function getQueueEvents(name: QueueName): QueueEvents | null {
  if (!isRedisEnabled()) return null;

  if (queueEvents.has(name)) {
    return queueEvents.get(name)!;
  }

  const connection = getRedisClient();
  if (!connection) return null;

  const events = new QueueEvents(name, { connection });
  queueEvents.set(name, events);

  events.on("completed", ({ jobId }) => {
    logger.info(`[Queue] Job ${jobId} completed in ${name}`);
  });

  events.on("failed", ({ jobId, failedReason }) => {
    logger.error(`[Queue] Job ${jobId} failed in ${name}: ${failedReason}`);
  });

  return events;
}

/**
 * Add a job to a specific queue
 */
export async function enqueueJob(
  queueName: QueueName,
  jobName: string,
  data: any,
  options?: any,
) {
  const queue = getQueue(queueName);
  if (!queue) {
    throw new Error(`Queue ${queueName} not initialized or Redis disabled`);
  }

  return queue.add(jobName, data, options);
}

// Pre-initialize standard queues if Redis is enabled
export function initQueues() {
  if (!isRedisEnabled()) return;
  Object.values(QUEUE_NAMES).forEach((qName) => {
    getQueue(qName);
    getQueueEvents(qName);
  });
}
