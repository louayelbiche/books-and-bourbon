// src/escalation/index.ts
var DEFAULT_ESCALATION_KEYWORDS = [
  "callback",
  "representative",
  "human",
  "manager",
  "speak to someone",
  "real person",
  "talk to a person",
  "customer service",
  "support agent"
];
var EscalationDetector = class {
  patterns;
  constructor(keywords = DEFAULT_ESCALATION_KEYWORDS) {
    this.patterns = keywords.map((k) => {
      const escaped = k.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      return new RegExp(`\\b${escaped}\\b`, "i");
    });
  }
  /** Returns true if any escalation keyword is found in the text. */
  detect(text) {
    return this.patterns.some((pattern) => pattern.test(text));
  }
};
export {
  DEFAULT_ESCALATION_KEYWORDS,
  EscalationDetector
};
//# sourceMappingURL=index.js.map