/**
 * Centralized structured logger utility.
 * Delegates to the console but formats output consistently and provides a hook for future observability tools.
 */
export const logger = {
  info(message: string, context?: Record<string, unknown>): void {
    if (context) {
      console.log(`[INFO] ${message}`, JSON.stringify(context));
    } else {
      console.log(`[INFO] ${message}`);
    }
  },

  warn(message: string, context?: Record<string, unknown>): void {
    if (context) {
      console.warn(`[WARN] ${message}`, JSON.stringify(context));
    } else {
      console.warn(`[WARN] ${message}`);
    }
  },

  error(message: string, error?: unknown, context?: Record<string, unknown>): void {
    const errorDetails = error instanceof Error ? { message: error.message, stack: error.stack } : error;
    const combinedContext = {
      ...(context || {}),
      ...(errorDetails ? { error: errorDetails } : {}),
    };

    if (Object.keys(combinedContext).length > 0) {
      console.error(`[ERROR] ${message}`, JSON.stringify(combinedContext));
    } else {
      console.error(`[ERROR] ${message}`);
    }
  },
};
