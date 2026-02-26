import {
  CircuitOpenError
} from "./chunk-RC7HLAPX.js";

// src/circuit-breaker.ts
var defaultOptions = {
  failureThreshold: 5,
  resetTimeout: 3e4,
  halfOpenRequests: 3
};
var CircuitBreaker = class {
  state = "closed";
  failures = 0;
  successes = 0;
  lastFailure = null;
  lastSuccess = null;
  halfOpenAttempts = 0;
  totalRequests = 0;
  totalFailures = 0;
  options;
  log;
  constructor(options) {
    this.options = { ...defaultOptions, ...options };
    this.log = this.options.logger ?? {};
  }
  async execute(operation, fallback) {
    this.totalRequests++;
    if (this.state === "open") {
      if (this.shouldAttemptReset()) {
        this.transitionTo("half-open");
        this.halfOpenAttempts = 0;
      } else {
        if (fallback) {
          this.log.debug?.(
            `Circuit ${this.options.name}: using fallback (open)`
          );
          return fallback();
        }
        throw new CircuitOpenError(this.options.name);
      }
    }
    if (this.state === "half-open" && this.halfOpenAttempts >= this.options.halfOpenRequests) {
      if (fallback) {
        this.log.debug?.(
          `Circuit ${this.options.name}: using fallback (half-open limit)`
        );
        return fallback();
      }
      throw new CircuitOpenError(this.options.name);
    }
    if (this.state === "half-open") {
      this.halfOpenAttempts++;
    }
    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure(error);
      if (this.state === "open" && fallback) {
        this.log.debug?.(
          `Circuit ${this.options.name}: using fallback after failure`
        );
        return fallback();
      }
      throw error;
    }
  }
  onSuccess() {
    this.successes++;
    this.lastSuccess = /* @__PURE__ */ new Date();
    if (this.state === "half-open") {
      if (this.successes >= this.options.halfOpenRequests) {
        this.reset();
        this.log.info?.(
          `Circuit ${this.options.name}: closed (recovered)`
        );
      }
    } else {
      this.failures = 0;
    }
  }
  onFailure(error) {
    this.failures++;
    this.totalFailures++;
    this.lastFailure = /* @__PURE__ */ new Date();
    this.log.warn?.(`Circuit ${this.options.name}: failure recorded`, {
      failures: this.failures,
      threshold: this.options.failureThreshold,
      error: error instanceof Error ? error.message : String(error)
    });
    if (this.failures >= this.options.failureThreshold) {
      this.transitionTo("open");
      this.log.error?.(
        `Circuit ${this.options.name}: opened after ${this.failures} failures`
      );
    }
  }
  shouldAttemptReset() {
    if (!this.lastFailure) return false;
    const elapsed = Date.now() - this.lastFailure.getTime();
    return elapsed >= this.options.resetTimeout;
  }
  transitionTo(newState) {
    if (this.state !== newState) {
      const oldState = this.state;
      this.state = newState;
      this.options.onStateChange?.(oldState, newState, this.options.name);
    }
  }
  reset() {
    this.transitionTo("closed");
    this.failures = 0;
    this.successes = 0;
    this.halfOpenAttempts = 0;
  }
  forceOpen() {
    this.transitionTo("open");
    this.lastFailure = /* @__PURE__ */ new Date();
    this.log.warn?.(`Circuit ${this.options.name}: forced open`);
  }
  forceClose() {
    this.reset();
    this.log.info?.(`Circuit ${this.options.name}: forced closed`);
  }
  getStats() {
    return {
      name: this.options.name,
      state: this.state,
      failures: this.failures,
      successes: this.successes,
      lastFailure: this.lastFailure,
      lastSuccess: this.lastSuccess,
      nextAttempt: this.lastFailure ? new Date(this.lastFailure.getTime() + this.options.resetTimeout) : null,
      totalRequests: this.totalRequests,
      totalFailures: this.totalFailures
    };
  }
  isOpen() {
    return this.state === "open";
  }
  isClosed() {
    return this.state === "closed";
  }
};
function createCircuitBreaker(options) {
  return new CircuitBreaker(options);
}
export {
  CircuitBreaker,
  createCircuitBreaker
};
//# sourceMappingURL=circuit-breaker.js.map