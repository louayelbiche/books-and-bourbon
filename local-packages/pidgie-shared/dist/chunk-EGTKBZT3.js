// src/api/ssrf.ts
function isBlockedUrl(urlString) {
  try {
    const url = new URL(urlString);
    const hostname = url.hostname.toLowerCase();
    const protocol = url.protocol;
    if (protocol !== "http:" && protocol !== "https:") {
      return true;
    }
    if (hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1" || hostname === "[::1]" || hostname === "0.0.0.0") {
      return true;
    }
    const ipMatch = hostname.match(/^(\d+)\.(\d+)\.(\d+)\.(\d+)$/);
    if (ipMatch) {
      const [, a, b, c, d] = ipMatch.map(Number);
      if (a === 10 || a === 127 || a === 172 && b >= 16 && b <= 31 || a === 192 && b === 168 || a === 169 && b === 254) {
        return true;
      }
      if (a === 255 || a === 0 && b === 0 && c === 0 && d === 0) {
        return true;
      }
    }
    const bareHost = hostname.replace(/^\[|\]$/g, "");
    if (bareHost.startsWith("fd") || bareHost.startsWith("fc")) return true;
    if (bareHost.startsWith("fe80")) return true;
    if (bareHost.startsWith("::ffff:")) {
      const mapped = bareHost.slice(7);
      const mappedMatch = mapped.match(/^(\d+)\.(\d+)\.(\d+)\.(\d+)$/);
      if (mappedMatch) {
        const [, ma, mb] = mappedMatch.map(Number);
        if (ma === 10 || ma === 127 || ma === 172 && mb >= 16 && mb <= 31 || ma === 192 && mb === 168 || ma === 169 && mb === 254) {
          return true;
        }
      }
    }
    if (hostname.endsWith(".internal") || hostname.endsWith(".local") || hostname.endsWith(".localhost") || hostname.endsWith(".localdomain")) {
      return true;
    }
    if (hostname === "169.254.169.254") {
      return true;
    }
    return false;
  } catch {
    return true;
  }
}
function sanitizeUrl(urlString) {
  try {
    const url = new URL(urlString);
    url.username = "";
    url.password = "";
    return url.toString();
  } catch {
    return urlString;
  }
}
async function checkIframeAllowed(url) {
  var _a, _b;
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5e3);
    const res = await fetch(url, {
      method: "HEAD",
      signal: controller.signal,
      redirect: "follow"
    });
    clearTimeout(timeout);
    const xfo = (_a = res.headers.get("x-frame-options")) == null ? void 0 : _a.toLowerCase();
    if (xfo === "deny" || xfo === "sameorigin") {
      return false;
    }
    const csp = ((_b = res.headers.get("content-security-policy")) == null ? void 0 : _b.toLowerCase()) || "";
    if (csp.includes("frame-ancestors")) {
      const match = csp.match(/frame-ancestors\s+([^;]+)/);
      if (match) {
        const value = match[1].trim();
        if (value === "'none'" || value === "'self'" || !value.includes("*")) {
          return false;
        }
      }
    }
    return true;
  } catch {
    return true;
  }
}

export {
  isBlockedUrl,
  sanitizeUrl,
  checkIframeAllowed
};
//# sourceMappingURL=chunk-EGTKBZT3.js.map