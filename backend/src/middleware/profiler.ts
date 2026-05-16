import { NextFunction, Request, Response } from "express";
import { performance } from "perf_hooks";

import { logger } from "../lib/logger";

export const computeProfiler = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const start = performance.now();
  const startMemory = process.memoryUsage().heapUsed;

  res.on("finish", () => {
    const end = performance.now();
    const endMemory = process.memoryUsage().heapUsed;

    const durationMs = end - start;
    const memoryDiff = endMemory - startMemory;
    const memoryDiffMb = (memoryDiff / 1024 / 1024).toFixed(2);

    // Classify workload according to Phase 1 specs
    let workloadClass = "Lightweight";
    if (durationMs >= 2000) {
      workloadClass = "Heavy";
    } else if (durationMs >= 200) {
      workloadClass = "Medium";
    }

    logger.info(
      {
        type: "COMPUTE_PROFILE",
        method: req.method,
        route: req.originalUrl,
        durationMs: Number(durationMs.toFixed(2)),
        workloadClass,
        memoryDiffMb: Number(memoryDiffMb),
        statusCode: res.statusCode,
      },
      `[PROFILER] ${req.method} ${req.originalUrl} - ${workloadClass} (${durationMs.toFixed(2)}ms, Mem: ${memoryDiffMb}MB)`,
    );
  });

  next();
};
