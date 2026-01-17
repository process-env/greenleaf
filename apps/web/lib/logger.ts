import pino from "pino";

const isDevelopment = process.env.NODE_ENV !== "production";

export const logger = pino({
  level: process.env.LOG_LEVEL || (isDevelopment ? "debug" : "info"),
  ...(isDevelopment && {
    transport: {
      target: "pino-pretty",
      options: {
        colorize: true,
        ignore: "pid,hostname",
        translateTime: "SYS:standard",
      },
    },
  }),
  base: {
    env: process.env.NODE_ENV,
    service: "greenleaf-web",
  },
  redact: {
    paths: [
      "req.headers.authorization",
      "req.headers.cookie",
      "password",
      "secret",
      "token",
      "apiKey",
      "email",
    ],
    censor: "[REDACTED]",
  },
});

// Create child loggers for specific domains
export const orderLogger = logger.child({ domain: "orders" });
export const authLogger = logger.child({ domain: "auth" });
export const cartLogger = logger.child({ domain: "cart" });
export const paymentLogger = logger.child({ domain: "payment" });
export const adminLogger = logger.child({ domain: "admin" });

// Helper for logging API requests
export function logApiRequest(
  method: string,
  path: string,
  statusCode: number,
  durationMs: number,
  extra?: Record<string, unknown>
) {
  const level = statusCode >= 500 ? "error" : statusCode >= 400 ? "warn" : "info";
  logger[level]({
    type: "api_request",
    method,
    path,
    statusCode,
    durationMs,
    ...extra,
  });
}

// Helper for logging errors with context
export function logError(
  error: Error,
  context?: Record<string, unknown>
) {
  logger.error({
    type: "error",
    error: {
      name: error.name,
      message: error.message,
      stack: error.stack,
    },
    ...context,
  });
}

export default logger;
