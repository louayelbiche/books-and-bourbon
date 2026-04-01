/**
 * @runwell/logger — Structured logging for all Runwell services
 *
 * JSON in production, pretty in dev, silent in test.
 * Automatic secret redaction.
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogContext {
  requestId?: string;
  sessionId?: string;
  module?: string;
  [key: string]: unknown;
}

export interface LogEntry {
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

export interface Logger {
  debug: (message: string, context?: LogContext) => void;
  info: (message: string, context?: LogContext) => void;
  warn: (message: string, context?: LogContext, error?: Error) => void;
  error: (message: string, context?: LogContext, error?: Error) => void;
  child: (baseContext: LogContext) => Logger;
}

// --- Secret redaction ---

const SECRET_PATTERNS = [
  /api[_-]?key/i,
  /secret/i,
  /password/i,
  /token/i,
  /authorization/i,
  /bearer/i,
  /access[_-]?token/i,
  /refresh[_-]?token/i,
  /private[_-]?key/i,
  /cookie/i,
];

const SECRET_VALUE_PATTERN = /^(shpat_|sk_|pk_|eyJ|ghp_|gho_|AKIA)/;

function isSecret(key: string, value: unknown): boolean {
  for (const pattern of SECRET_PATTERNS) {
    if (pattern.test(key)) return true;
  }
  if (typeof value === 'string' && SECRET_VALUE_PATTERN.test(value)) {
    return true;
  }
  return false;
}

export function redactSecrets(obj: unknown, depth = 0): unknown {
  if (depth > 10) return '[MAX_DEPTH]';
  if (obj === null || obj === undefined) return obj;

  if (typeof obj === 'string') {
    return SECRET_VALUE_PATTERN.test(obj) ? '[REDACTED]' : obj;
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => redactSecrets(item, depth + 1));
  }

  if (typeof obj === 'object') {
    const redacted: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
      if (isSecret(key, value)) {
        redacted[key] = '[REDACTED]';
      } else {
        redacted[key] = redactSecrets(value, depth + 1);
      }
    }
    return redacted;
  }

  return obj;
}

// --- Log level management ---

const LOG_LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

function getLogLevel(): LogLevel {
  const level = process.env.LOG_LEVEL?.toLowerCase();
  if (level === 'debug' || level === 'info' || level === 'warn' || level === 'error') {
    return level;
  }
  return process.env.NODE_ENV === 'production' ? 'info' : 'debug';
}

function shouldLog(level: LogLevel): boolean {
  if (process.env.NODE_ENV === 'test') return false;
  return LOG_LEVEL_PRIORITY[level] >= LOG_LEVEL_PRIORITY[getLogLevel()];
}

// --- Formatting ---

function getServiceName(): string {
  return process.env.SERVICE_NAME || 'app';
}

function formatLogEntry(entry: LogEntry): string {
  if (process.env.NODE_ENV === 'production') {
    return JSON.stringify(redactSecrets(entry));
  }

  const { timestamp, level, module, message, context, error } = entry;
  let output = `[${timestamp}] [${level.toUpperCase()}] [${module}] ${message}`;

  if (context && Object.keys(context).length > 0) {
    output += ` ${JSON.stringify(redactSecrets(context))}`;
  }

  if (error) {
    output += `\n  Error: ${error.name}: ${error.message}`;
    if (error.stack) {
      output += `\n  ${error.stack}`;
    }
  }

  return output;
}

// --- Error helpers ---

export function logError(error: unknown): Record<string, unknown> {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: process.env.NODE_ENV === 'production' ? undefined : error.stack,
    };
  }
  return { error: String(error) };
}

// --- Request logging helper ---

export function logRequest(req: Request, extra?: Record<string, unknown>) {
  const url = new URL(req.url);
  return {
    method: req.method,
    path: url.pathname,
    query: Object.fromEntries(url.searchParams),
    userAgent: req.headers.get('user-agent'),
    ...extra,
  };
}

// --- Timer ---

export function createTimer() {
  const start = performance.now();
  return {
    elapsed: () => Math.round(performance.now() - start),
  };
}

// --- Logger factory ---

export function createLogger(module: string): Logger {
  const service = getServiceName();

  function log(level: LogLevel, message: string, context?: LogContext, error?: Error) {
    if (!shouldLog(level)) return;

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      module,
      service,
      context: context ? (redactSecrets(context) as LogContext) : undefined,
      error: error
        ? {
            name: error.name,
            message: error.message,
            stack: error.stack,
          }
        : undefined,
    };

    const formatted = formatLogEntry(entry);

    switch (level) {
      case 'debug':
        console.debug(formatted);
        break;
      case 'info':
        console.info(formatted);
        break;
      case 'warn':
        console.warn(formatted);
        break;
      case 'error':
        console.error(formatted);
        break;
    }
  }

  const logger: Logger = {
    debug: (message, context?) => log('debug', message, context),
    info: (message, context?) => log('info', message, context),
    warn: (message, context?, error?) => log('warn', message, context, error),
    error: (message, context?, error?) => log('error', message, context, error),
    child(baseContext: LogContext): Logger {
      const childModule = (baseContext.module as string) || module;
      const childLogger = createLogger(childModule);
      const mergedContext = { ...baseContext };
      delete mergedContext.module;

      return {
        debug: (message, context?) =>
          childLogger.debug(message, { ...mergedContext, ...context }),
        info: (message, context?) =>
          childLogger.info(message, { ...mergedContext, ...context }),
        warn: (message, context?, error?) =>
          childLogger.warn(message, { ...mergedContext, ...context }, error),
        error: (message, context?, error?) =>
          childLogger.error(message, { ...mergedContext, ...context }, error),
        child: (ctx) => childLogger.child({ ...mergedContext, ...ctx }),
      };
    },
  };

  return logger;
}
