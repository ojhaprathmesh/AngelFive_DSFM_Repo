import pino from "pino";

import { ENV } from "../config/env";

export const logger = pino({
  level: ENV.NODE_ENV === "development" ? "debug" : "info",

  redact: {
    paths: [
      // HTTP request headers that carry secrets
      "req.headers.authorization",
      "req.headers.cookie",
      "req.headers['x-privatekey']",

      // Catch-all for nested objects that might log credentials
      "*.password",
      "*.token",
      "*.jwtToken",
      "*.resetLink",
      "*.totp",
    ],
    censor: "[REDACTED]",
  },

  transport:
    ENV.NODE_ENV === "development"
      ? {
          target: "pino-pretty",
          options: {
            colorize: true,
            translateTime: "SYS:standard",
            ignore: "pid,hostname,req,res,context,responseTime",
          },
        }
      : undefined,
});
