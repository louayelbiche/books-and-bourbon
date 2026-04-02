// src/env/index.ts
var GEMINI_KEY_PATTERN = /AIza[A-Za-z0-9_-]{35}/g;
var GENERIC_KEY_PATTERN = /[A-Za-z0-9_-]{40,}/g;
var OPENAI_KEY_PATTERN = /sk-[A-Za-z0-9]{20,}/g;
var ENV_VALIDATED = false;
function redactApiKeys(input) {
  return input.replace(GEMINI_KEY_PATTERN, "[REDACTED_GEMINI_KEY]").replace(OPENAI_KEY_PATTERN, "[REDACTED_OPENAI_KEY]").replace(GENERIC_KEY_PATTERN, (match) => {
    if (/[A-Z]/.test(match) && /[a-z0-9]/.test(match)) {
      return "[REDACTED_KEY]";
    }
    return match;
  });
}
function redactError(error) {
  if (error instanceof Error) {
    return redactApiKeys(error.message);
  }
  return redactApiKeys(String(error));
}
function validateEnv() {
  if (ENV_VALIDATED) return;
  const dangerousVars = Object.keys(process.env).filter(
    (key) => key.startsWith("NEXT_PUBLIC_") && /API.?KEY/i.test(key)
  );
  if (dangerousVars.length > 0) {
    throw new Error(
      `[ENV] FATAL: API keys exposed via NEXT_PUBLIC_ variables: ${dangerousVars.join(", ")}. These would be sent to the browser. Remove them immediately.`
    );
  }
  const geminiKey = process.env.GEMINI_API_KEY;
  if (!geminiKey) {
    console.error("[ENV] GEMINI_API_KEY: MISSING");
    throw new Error("[ENV] GEMINI_API_KEY is required but not set");
  }
  if (!geminiKey.startsWith("AIza") || geminiKey.length < 30) {
    console.error("[ENV] GEMINI_API_KEY: present but invalid format (expected AIza... prefix, 30+ chars)");
    throw new Error("[ENV] GEMINI_API_KEY has invalid format");
  }
  console.log("[ENV] GEMINI_API_KEY: present (valid)");
  const openaiKey = process.env.OPENAI_API_KEY;
  if (!openaiKey) {
    console.warn("[ENV] OPENAI_API_KEY: not set (voice input will be unavailable)");
  } else {
    console.log("[ENV] OPENAI_API_KEY: present");
  }
  ENV_VALIDATED = true;
}

export {
  ENV_VALIDATED,
  redactApiKeys,
  redactError,
  validateEnv
};
//# sourceMappingURL=chunk-EFCDWQE3.js.map