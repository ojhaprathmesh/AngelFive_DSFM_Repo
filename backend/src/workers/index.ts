import { logger } from "../lib/logger";
import { QUEUE_NAMES } from "../lib/queue";
import { createWorker } from "../lib/worker";
import * as dsfmService from "../services/dsfm";

// ── Portfolio Queue Worker ───────────────────────────────────────────────────
createWorker(QUEUE_NAMES.PORTFOLIO, async (job) => {
  const { name, data } = job;
  logger.info(`[Portfolio Worker] Processing job ${job.id} (Type: ${name})`);

  if (name === "mpt") {
    const { symbols, timeframe, riskFreeRate } = data;
    return dsfmService.processMPT(symbols, timeframe, riskFreeRate);
  }

  if (name === "black-litterman") {
    const { symbols, timeframe, riskAversion, tau } = data;
    return dsfmService.processBlackLitterman(
      symbols,
      timeframe,
      riskAversion,
      tau,
    );
  }

  throw new Error(`Unknown job type in portfolio queue: ${name}`);
});

// ── Forecasting Queue Worker ─────────────────────────────────────────────────
createWorker(QUEUE_NAMES.FORECASTING, async (job) => {
  const { name, data } = job;
  logger.info(`[Forecasting Worker] Processing job ${job.id} (Type: ${name})`);

  if (name === "arima") {
    const { symbol, timeframe, order } = data;
    return dsfmService.processArima(symbol, timeframe, order);
  }

  if (name === "garch") {
    const { symbol, timeframe, order } = data;
    return dsfmService.processGarch(symbol, timeframe, order);
  }

  if (name === "lstm") {
    const { symbol, timeframe, lookback, forecastSteps } = data;
    return dsfmService.processLstm(symbol, timeframe, lookback, forecastSteps);
  }

  throw new Error(`Unknown job type in forecasting queue: ${name}`);
});

// ── Analytics Queue Worker ────────────────────────────────────────────────────
createWorker(QUEUE_NAMES.ANALYTICS, async (job) => {
  const { name, data } = job;
  logger.info(`[Analytics Worker] Processing job ${job.id} (Type: ${name})`);

  if (name === "correlation") {
    const { timeframe } = data;
    return dsfmService.processCorrelation(timeframe);
  }

  throw new Error(`Unknown job type in analytics queue: ${name}`);
});

logger.info(
  "[Workers] Registered portfolio, forecasting, and analytics queue workers.",
);
