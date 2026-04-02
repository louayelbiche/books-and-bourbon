// src/index.ts
var SECRET_PATTERNS = [
  /api[_-]?key/i,
  /secret/i,
  /password/i,
  /token/i,
  /authorization/i,
  /bearer/i,
  /access[_-]?token/i,
  /refresh[_-]?token/i,
  /private[_-]?key/i,
  /cookie/i
];
var SECRET_VALUE_PATTERN = /^(shpat_|sk_|pk_|eyJ|ghp_|gho_|AKIA)/;
function isSecret(key, value) {
  for (const pattern of SECRET_PATTERNS) {
    if (pattern.test(key)) return true;
  }
  if (typeof value === "string" && SECRET_VALUE_PATTERN.test(value)) {
    return true;
  }
  return false;
}
function redactSecrets(obj, depth = 0) {
  if (depth > 10) return "[MAX_DEPTH]";
  if (obj === null || obj === void 0) return obj;
  if (typeof obj === "string") {
    return SECRET_VALUE_PATTERN.test(obj) ? "[REDACTED]" : obj;
  }
  if (Array.isArray(obj)) {
    return obj.map((item) => redactSecrets(item, depth + 1));
  }
  if (typeof obj === "object") {
    const redacted = {};
    for (const [key, value] of Object.entries(obj)) {
      if (isSecret(key, value)) {
        redacted[key] = "[REDACTED]";
      } else {
        redacted[key] = redactSecrets(value, depth + 1);
      }
    }
    return redacted;
  }
  return obj;
}
var LOG_LEVEL_PRIORITY = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3
};
function getLogLevel() {
  const level = process.env.LOG_LEVEL?.toLowerCase();
  if (level === "debug" || level === "info" || level === "warn" || level === "error") {
    return level;
  }
  return process.env.NODE_ENV === "production" ? "info" : "debug";
}
function shouldLog(level) {
  if (process.env.NODE_ENV === "test") return false;
  return LOG_LEVEL_PRIORITY[level] >= LOG_LEVEL_PRIORITY[getLogLevel()];
}
function getServiceName() {
  return process.env.SERVICE_NAME || "app";
}
function formatLogEntry(entry) {
  if (process.env.NODE_ENV === "production") {
    return JSON.stringify(redactSecrets(entry));
  }
  const { timestamp, level, module, message, context, error } = entry;
  let output = `[${timestamp}] [${level.toUpperCase()}] [${module}] ${message}`;
  if (context && Object.keys(context).length > 0) {
    output += ` ${JSON.stringify(redactSecrets(context))}`;
  }
  if (error) {
    output += `
  Error: ${error.name}: ${error.message}`;
    if (error.stack) {
      output += `
  ${error.stack}`;
    }
  }
  return output;
}
function logError(error) {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: process.env.NODE_ENV === "production" ? void 0 : error.stack
    };
  }
  return { error: String(error) };
}
function logRequest(req, extra) {
  const url = new URL(req.url);
  return {
    method: req.method,
    path: url.pathname,
    query: Object.fromEntries(url.searchParams),
    userAgent: req.headers.get("user-agent"),
    ...extra
  };
}
function createTimer() {
  const start = performance.now();
  return {
    elapsed: () => Math.round(performance.now() - start)
  };
}
function createLogger(module) {
  const service = getServiceName();
  function log(level, message, context, error) {
    if (!shouldLog(level)) return;
    const entry = {
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      level,
      message,
      module,
      service,
      context: context ? redactSecrets(context) : void 0,
      error: error ? {
        name: error.name,
        message: error.message,
        stack: error.stack
      } : void 0
    };
    const formatted = formatLogEntry(entry);
    switch (level) {
      case "debug":
        console.debug(formatted);
        break;
      case "info":
        console.info(formatted);
        break;
      case "warn":
        console.warn(formatted);
        break;
      case "error":
        console.error(formatted);
        break;
    }
  }
  const logger = {
    debug: (message, context) => log("debug", message, context),
    info: (message, context) => log("info", message, context),
    warn: (message, context, error) => log("warn", message, context, error),
    error: (message, context, error) => log("error", message, context, error),
    child(baseContext) {
      const childModule = baseContext.module || module;
      const childLogger = createLogger(childModule);
      const mergedContext = { ...baseContext };
      delete mergedContext.module;
      return {
        debug: (message, context) => childLogger.debug(message, { ...mergedContext, ...context }),
        info: (message, context) => childLogger.info(message, { ...mergedContext, ...context }),
        warn: (message, context, error) => childLogger.warn(message, { ...mergedContext, ...context }, error),
        error: (message, context, error) => childLogger.error(message, { ...mergedContext, ...context }, error),
        child: (ctx) => childLogger.child({ ...mergedContext, ...ctx })
      };
    }
  };
  return logger;
}
export {
  createLogger,
  createTimer,
  logError,
  logRequest,
  redactSecrets
};
//# sourceMappingURL=index.js.map