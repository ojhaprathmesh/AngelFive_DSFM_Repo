import { Request, Response, Router } from "express";

import { getQueue, QUEUE_NAMES } from "../lib/queue";

const router = Router();

router.get(
  "/:queueName/:jobId",
  async (req: Request, res: Response): Promise<void> => {
    const { queueName, jobId } = req.params;

    // Validate queue name
    if (!Object.values(QUEUE_NAMES).includes(queueName as any)) {
      res.status(400).json({ error: "invalid_queue" });
      return;
    }

    const queue = getQueue(queueName as any);
    if (!queue) {
      res.status(503).json({ error: "queue_unavailable" });
      return;
    }

    try {
      const job = await queue.getJob(jobId);

      if (!job) {
        res.status(404).json({ error: "job_not_found" });
        return;
      }

      const state = await job.getState();
      const progress = job.progress;
      const result = job.returnvalue;
      const failedReason = job.failedReason;

      res.json({
        id: job.id,
        state,
        progress,
        result: state === "completed" ? result : null,
        error: state === "failed" ? failedReason : null,
        timestamp: job.timestamp,
        processedOn: job.processedOn,
        finishedOn: job.finishedOn,
      });
    } catch (error) {
      res.status(500).json({ error: "failed_to_fetch_job" });
    }
  },
);

export default router;
