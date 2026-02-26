// src/correlation.ts
var CORRELATION_ID_HEADER = "x-correlation-id";
function generateId() {
  return crypto.randomUUID().slice(0, 12);
}
function getCorrelationId(request) {
  return request.headers.get(CORRELATION_ID_HEADER) ?? generateId();
}
function addCorrelationIdHeader(response, correlationId) {
  response.headers.set(CORRELATION_ID_HEADER, correlationId);
  return response;
}
function withCorrelationId(handler) {
  return async (request) => {
    const correlationId = getCorrelationId(request);
    try {
      const response = await handler(request, correlationId);
      return addCorrelationIdHeader(response, correlationId);
    } catch (error) {
      if (error instanceof Error) {
        error.correlationId = correlationId;
      }
      throw error;
    }
  };
}
function withCorrelationIdAndParams(handler) {
  return async (request, context) => {
    const correlationId = getCorrelationId(request);
    try {
      const response = await handler(request, context, correlationId);
      return addCorrelationIdHeader(response, correlationId);
    } catch (error) {
      if (error instanceof Error) {
        error.correlationId = correlationId;
      }
      throw error;
    }
  };
}
function createCorrelationId() {
  return generateId();
}
export {
  CORRELATION_ID_HEADER,
  addCorrelationIdHeader,
  createCorrelationId,
  getCorrelationId,
  withCorrelationId,
  withCorrelationIdAndParams
};
//# sourceMappingURL=correlation.js.map