/**
 * @runwell/logger — Structured logging for all Runwell services
 *
 * JSON in production, pretty in dev, silent in test.
 * Automatic secret redaction.
 */
type LogLevel = 'debug' | 'info' | 'warn' | 'error';
interface LogContext {
    requestId?: string;
    sessionId?: string;
    module?: string;
    [key: string]: unknown;
}
interface LogEntry {
    timestamp: string;
    level: LogLevel;
    message: string;
    module: string;
    service: string;
    context?: LogContext;
    error?: {
        name: string;
        message: string;
        stack?: string;
    };
}
interface Logger {
    debug: (message: string, context?: LogContext) => void;
    info: (message: string, context?: LogContext) => void;
    warn: (message: string, context?: LogContext, error?: Error) => void;
    error: (message: string, context?: LogContext, error?: Error) => void;
    child: (baseContext: LogContext) => Logger;
}
declare function redactSecrets(obj: unknown, depth?: number): unknown;
declare function logError(error: unknown): Record<string, unknown>;
declare function logRequest(req: Request, extra?: Record<string, unknown>): {
    method: string;
    path: string;
    query: {
        [k: string]: string;
    };
    userAgent: string | null;
};
declare function createTimer(): {
    elapsed: () => number;
};
declare function createLogger(module: string): Logger;

export { type LogContext, type LogEntry, type LogLevel, type Logger, createLogger, createTimer, logError, logRequest, redactSecrets };
