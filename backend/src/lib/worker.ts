import { Processor, Worker } from "bullmq";

import { logger } from "./logger";
import { getRedisClient, isRedisEnabled } from "./redis";

const workers: Worker[] = [];

/**
 * Creates and registers a BullMQ worker for a specific queue
 */
export function createWorker(
  queueName: string,
  processor: Processor,
  concurrency = 1,
): Worker | null {
  if (!isRedisEnabled()) {
    logger.warn(
      `[Worker] Redis is disabled. Cannot start worker for queue: ${queueName}`,
    );
    return null;
  }

  const connection = getRedisClient();
  if (!connection) return null;

  const worker = new Worker(queueName, processor, {
    connection: connection.duplicate() as any,
    concurrency,
  });

  worker.on("ready", () => {
    logger.info(
      `[Worker] Started worker for queue: ${queueName} (Concurrency: ${concurrency})`,
    );
  });

  worker.on("active", (job) => {
    logger.info(`[Worker] Job ${job.id} started in ${queueName}`);
  });

  worker.on("completed", (job) => {
    logger.info(`[Worker] Job ${job.id} completed in ${queueName}`);
  });

  worker.on("failed", (job, err) => {
    logger.error(
      `[Worker] Job ${job?.id} failed in ${queueName}: ${err.message}`,
    );
  });

  worker.on("error", (err) => {
    logger.error(`[Worker] Error in worker for ${queueName}: ${err.message}`);
  });

  workers.push(worker);
  return worker;
}

/**
 * Gracefully shuts down all active workers
 */
export async function shutdownWorkers() {
  logger.info(`[Worker] Shutting down ${workers.length} workers...`);
  await Promise.all(workers.map((worker) => worker.close()));
  logger.info("[Worker] All workers shut down.");
}
