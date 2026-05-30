import { Request, Response, Router } from "express";

import { logger } from "../lib/logger";
import { enqueueJob, QUEUE_NAMES } from "../lib/queue";
import * as dsfmService from "../services/dsfm";

const router: Router = Router();

// Returns Analysis endpoint (lightweight, runs synchronously)
router.get("/returns", async (req: Request, res: Response): Promise<void> => {
  try {
    const symbol = String(req.query.symbol || "");
    const timeframe = String(req.query.timeframe || "1M");

    if (!symbol) {
      res.status(400).json({ error: "Symbol is required" });
      return;
    }

    const data = await dsfmService.processReturns(symbol, timeframe);
    res.json(data);
  } catch (e: any) {
    logger.error({ err: e }, "Error calculating returns:");
    res.status(500).json({ error: e.message || "failed_to_calculate_returns" });
  }
});

// Correlation Analysis endpoint (heavy, enqueued)
router.get(
  "/correlation",
  async (req: Request, res: Response): Promise<void> => {
    try {
      const timeframe = (req.query.timeframe as string) || "3M";
      const job = await enqueueJob(QUEUE_NAMES.ANALYTICS, "correlation", {
        timeframe,
      });
      res.status(202).json({ jobId: job.id, queueName: QUEUE_NAMES.ANALYTICS });
    } catch (e: any) {
      logger.error({ err: e }, "Error enqueuing correlation job:");
      res.status(500).json({ error: e.message || "failed_to_enqueue_job" });
    }
  },
);

// MPT (Modern Portfolio Theory) Optimization endpoint (heavy, enqueued)
router.post("/mpt", async (req: Request, res: Response): Promise<void> => {
  try {
    const { symbols, timeframe, riskFreeRate } = req.body || {};

    if (!symbols || !Array.isArray(symbols) || symbols.length < 2) {
      res.status(400).json({
        error: "At least 2 symbols required for portfolio optimization",
      });
      return;
    }

    const job = await enqueueJob(QUEUE_NAMES.PORTFOLIO, "mpt", {
      symbols,
      timeframe,
      riskFreeRate,
    });
    res.status(202).json({ jobId: job.id, queueName: QUEUE_NAMES.PORTFOLIO });
  } catch (e: any) {
    logger.error({ err: e }, "Error enqueuing MPT job:");
    res.status(500).json({ error: e.message || "failed_to_enqueue_job" });
  }
});

// Black-Litterman Optimization endpoint (heavy, enqueued)
router.post(
  "/black-litterman",
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { symbols, timeframe, riskAversion, tau } = req.body || {};

      if (!symbols || !Array.isArray(symbols) || symbols.length < 2) {
        res.status(400).json({
          error: "At least 2 symbols required for portfolio optimization",
        });
        return;
      }

      const job = await enqueueJob(QUEUE_NAMES.PORTFOLIO, "black-litterman", {
        symbols,
        timeframe,
        riskAversion,
        tau,
      });
      res.status(202).json({ jobId: job.id, queueName: QUEUE_NAMES.PORTFOLIO });
    } catch (e: any) {
      logger.error({ err: e }, "Error enqueuing Black-Litterman job:");
      res.status(500).json({ error: e.message || "failed_to_enqueue_job" });
    }
  },
);

// PCA Analysis endpoint
router.get("/pca", async (_req: Request, res: Response): Promise<void> => {
  try {
    res.json({
      message: "PCA analysis endpoint - implementation in progress",
      components: [],
      explainedVariance: [],
    });
  } catch (e) {
    logger.error({ err: e }, "Error in PCA analysis:");
    res.status(500).json({ error: "failed_to_calculate_pca" });
  }
});

// Network Analysis endpoint
router.get("/network", async (_req: Request, res: Response): Promise<void> => {
  try {
    res.json({
      message: "Network analysis endpoint - implementation in progress",
      nodes: [],
      edges: [],
      mst: [],
    });
  } catch (e) {
    logger.error({ err: e }, "Error in network analysis:");
    res.status(500).json({ error: "failed_to_analyze_network" });
  }
});

// ADF Test (Augmented Dickey-Fuller Test) for Stationarity (lightweight, runs synchronously)
router.get("/adf-test", async (req: Request, res: Response): Promise<void> => {
  try {
    const symbol = String(req.query.symbol || "");
    const timeframe = String(req.query.timeframe || "1M");

    if (!symbol) {
      res.status(400).json({ error: "Symbol is required" });
      return;
    }

    const data = await dsfmService.processAdfTest(symbol, timeframe);
    res.json(data);
  } catch (e: any) {
    logger.error({ err: e }, "Error in ADF test:");
    res.status(500).json({ error: e.message || "failed_to_perform_adf_test" });
  }
});

// ACF/PACF Calculation (lightweight, runs synchronously)
router.get("/acf-pacf", async (req: Request, res: Response): Promise<void> => {
  try {
    const symbol = String(req.query.symbol || "");
    const timeframe = String(req.query.timeframe || "1M");
    const maxLags = Number(req.query.maxLags || 20);

    if (!symbol) {
      res.status(400).json({ error: "Symbol is required" });
      return;
    }

    const data = await dsfmService.processAcfPacf(symbol, timeframe, maxLags);
    res.json(data);
  } catch (e: any) {
    logger.error({ err: e }, "Error calculating ACF/PACF:");
    res
      .status(500)
      .json({ error: e.message || "failed_to_calculate_acf_pacf" });
  }
});

// AR/MA/ARIMA Model endpoint (heavy, enqueued)
router.post("/arima", async (req: Request, res: Response): Promise<void> => {
  try {
    const { symbol, timeframe, order } = req.body || {};

    if (!symbol) {
      res.status(400).json({ error: "Symbol is required" });
      return;
    }

    const job = await enqueueJob(QUEUE_NAMES.FORECASTING, "arima", {
      symbol,
      timeframe,
      order,
    });
    res.status(202).json({ jobId: job.id, queueName: QUEUE_NAMES.FORECASTING });
  } catch (e: any) {
    logger.error({ err: e }, "Error enqueuing ARIMA job:");
    res.status(500).json({ error: e.message || "failed_to_enqueue_job" });
  }
});

// GARCH Model endpoint (heavy, enqueued)
router.post("/garch", async (req: Request, res: Response): Promise<void> => {
  try {
    const { symbol, timeframe, order } = req.body || {};

    if (!symbol) {
      res.status(400).json({ error: "Symbol is required" });
      return;
    }

    const job = await enqueueJob(QUEUE_NAMES.FORECASTING, "garch", {
      symbol,
      timeframe,
      order,
    });
    res.status(202).json({ jobId: job.id, queueName: QUEUE_NAMES.FORECASTING });
  } catch (e: any) {
    logger.error({ err: e }, "Error enqueuing GARCH job:");
    res.status(500).json({ error: e.message || "failed_to_enqueue_job" });
  }
});

// LSTM Forecasting endpoint (heavy, enqueued)
router.post("/lstm", async (req: Request, res: Response): Promise<void> => {
  try {
    const { symbol, timeframe, lookback, forecastSteps } = req.body || {};

    if (!symbol) {
      res.status(400).json({ error: "Symbol is required" });
      return;
    }

    const job = await enqueueJob(QUEUE_NAMES.FORECASTING, "lstm", {
      symbol,
      timeframe,
      lookback,
      forecastSteps,
    });
    res.status(202).json({ jobId: job.id, queueName: QUEUE_NAMES.FORECASTING });
  } catch (e: any) {
    logger.error({ err: e }, "Error enqueuing LSTM job:");
    res.status(500).json({ error: e.message || "failed_to_enqueue_job" });
  }
});

// FinBERT Sentiment Analysis endpoint (lightweight/direct)
router.post(
  "/sentiment/finbert",
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { text } = req.body || {};

      if (!text || typeof text !== "string" || text.trim().length === 0) {
        res
          .status(400)
          .json({ error: "Text is required for sentiment analysis" });
        return;
      }

      const data = await dsfmService.processFinBERT(text);
      res.json(data);
    } catch (e: any) {
      logger.error({ err: e }, "Error in FinBERT sentiment:");
      res
        .status(500)
        .json({ error: e.message || "failed_to_analyze_sentiment" });
    }
  },
);

// Rule-based Sentiment Analysis endpoint (lightweight/direct)
router.post(
  "/sentiment/rule-based",
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { text } = req.body || {};

      if (!text || typeof text !== "string" || text.trim().length === 0) {
        res
          .status(400)
          .json({ error: "Text is required for sentiment analysis" });
        return;
      }

      const data = await dsfmService.processRuleBased(text);
      res.json(data);
    } catch (e: any) {
      logger.error({ err: e }, "Error in rule-based sentiment:");
      res
        .status(500)
        .json({ error: e.message || "failed_to_analyze_sentiment" });
    }
  },
);

export default router;
