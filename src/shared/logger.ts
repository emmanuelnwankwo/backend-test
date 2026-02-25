import { LogLevel } from "./types";

interface LogContext {
  [key: string]: any;
}

function log(level: LogLevel, message: string, context?: LogContext): void {
  const logEntry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    ...context,
  };
  console.log(JSON.stringify(logEntry));
}

export const logger = {
  info: (message: string, context?: LogContext) => log(LogLevel.INFO, message, context),
  warn: (message: string, context?: LogContext) => log(LogLevel.WARN, message, context),
  error: (message: string, context?: LogContext) => log(LogLevel.ERROR, message, context),
};
