import {
  RateLimitError,
  isAppError
} from "./chunk-RC7HLAPX.js";

// src/response.ts
import { NextResponse } from "next/server";
function successResponse(data, options) {
  const response = {
    success: true,
    data,
    meta: {
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      ...options?.correlationId && { correlationId: options.correlationId },
      ...options?.meta || {}
    }
  };
  return NextResponse.json(response, { status: options?.status ?? 200 });
}
function errorResponse(error, optionsOrCorrelationId) {
  const correlationId = typeof optionsOrCorrelationId === "string" ? optionsOrCorrelationId : optionsOrCorrelationId?.correlationId;
  const logger = typeof optionsOrCorrelationId === "object" ? optionsOrCorrelationId?.logger : void 0;
  if (isAppError(error)) {
    if (correlationId) {
      error.correlationId = correlationId;
    }
    logger?.error(error.message, {
      code: error.code,
      correlationId,
      details: error.details,
      isOperational: error.isOperational
    });
    const response = {
      success: false,
      error: {
        code: error.code,
        message: error.userMessage,
        ...correlationId && { correlationId },
        ...error.details && Object.keys(error.details).length > 0 && {
          details: error.details
        }
      }
    };
    if (error instanceof RateLimitError) {
      response.error.retryAfter = error.retryAfter;
    }
    const headers = {};
    if (error instanceof RateLimitError) {
      headers["Retry-After"] = String(error.retryAfter);
    }
    return NextResponse.json(response, {
      status: error.statusCode,
      headers: Object.keys(headers).length > 0 ? headers : void 0
    });
  }
  const errorMessage = error instanceof Error ? error.message : String(error);
  const errorStack = error instanceof Error ? error.stack : void 0;
  logger?.error("Unhandled error", {
    error: errorMessage,
    stack: errorStack,
    correlationId,
    type: error?.constructor?.name
  });
  return NextResponse.json(
    {
      success: false,
      error: {
        code: "ERR-SYS-001",
        message: "An unexpected error occurred",
        ...correlationId && { correlationId }
      }
    },
    { status: 500 }
  );
}
function notFoundResponse(resource, correlationId) {
  return NextResponse.json(
    {
      success: false,
      error: {
        code: "ERR-DB-003",
        message: `${resource} not found`,
        ...correlationId && { correlationId }
      }
    },
    { status: 404 }
  );
}
function unauthorizedResponse(message = "Authentication required", correlationId) {
  return NextResponse.json(
    {
      success: false,
      error: {
        code: "ERR-AUTH-001",
        message,
        ...correlationId && { correlationId }
      }
    },
    { status: 401 }
  );
}
function forbiddenResponse(message = "Insufficient permissions", correlationId) {
  return NextResponse.json(
    {
      success: false,
      error: {
        code: "ERR-AUTH-004",
        message,
        ...correlationId && { correlationId }
      }
    },
    { status: 403 }
  );
}
function validationErrorResponse(message, details, correlationId) {
  return NextResponse.json(
    {
      success: false,
      error: {
        code: "ERR-VAL-001",
        message,
        ...correlationId && { correlationId },
        ...details && { details }
      }
    },
    { status: 400 }
  );
}
export {
  errorResponse,
  forbiddenResponse,
  notFoundResponse,
  successResponse,
  unauthorizedResponse,
  validationErrorResponse
};
//# sourceMappingURL=response.js.map