import {
  checkIframeAllowed,
  isBlockedUrl,
  sanitizeUrl
} from "../chunk-EGTKBZT3.js";

// src/api/create-scrape-handler.ts
import { scrapeWebsite, normalizeUrl, resolveCanonicalUrl } from "@runwell/pidgie-core/scraper";
import { captureScreenshots } from "@runwell/pidgie-core/screenshot";
import { createLogger, logError } from "@runwell/logger";
var scrapeLogger = createLogger("scrape-handler");
function createScrapeHandler(options) {
  const {
    sessionStore,
    afterScrape,
    createSession,
    buildResponse,
    checkIframe = false,
    invalidUrlMessage = "Invalid URL format. Please enter a valid website URL.",
    preScrape,
    afterScreenshots,
    rateLimit = 5
  } = options;
  const rateLimitMap = /* @__PURE__ */ new Map();
  return async function POST(request) {
    var _a, _b;
    try {
      if (rateLimit > 0) {
        const clientIp = ((_b = (_a = request.headers.get("x-forwarded-for")) == null ? void 0 : _a.split(",")[0]) == null ? void 0 : _b.trim()) || "unknown";
        const now = Date.now();
        const entry = rateLimitMap.get(clientIp);
        if (!entry || now > entry.resetAt) {
          rateLimitMap.set(clientIp, { count: 1, resetAt: now + 6e4 });
        } else if (entry.count >= rateLimit) {
          return Response.json({ error: "Too many requests. Please wait a moment.", code: "RATE_LIMITED" }, { status: 429 });
        } else {
          entry.count++;
        }
      }
      const body = await request.json();
      const { url } = body;
      if (!url || typeof url !== "string") {
        return Response.json({ error: "URL is required" }, { status: 400 });
      }
      let normalizedUrl;
      try {
        const result = normalizeUrl(url);
        if (!result) {
          return Response.json({ error: invalidUrlMessage }, { status: 400 });
        }
        normalizedUrl = result;
      } catch {
        return Response.json({ error: invalidUrlMessage }, { status: 400 });
      }
      if (isBlockedUrl(normalizedUrl)) {
        return Response.json({ error: invalidUrlMessage }, { status: 400 });
      }
      normalizedUrl = sanitizeUrl(normalizedUrl);
      normalizedUrl = await resolveCanonicalUrl(normalizedUrl);
      if (preScrape) {
        const cached = await preScrape(normalizedUrl, body);
        if (cached) return cached;
      }
      const startTime = Date.now();
      const website = await scrapeWebsite(normalizedUrl);
      const scrapeDuration = Date.now() - startTime;
      if (website.pages.length === 0) {
        return Response.json(
          { error: "Could not scrape any content from this website." },
          { status: 400 }
        );
      }
      let extras = {};
      if (afterScrape) {
        extras = await afterScrape(website, normalizedUrl);
      }
      if (checkIframe) {
        const allowsIframe = await checkIframeAllowed(normalizedUrl);
        extras.allowsIframe = allowsIframe;
      }
      const session = createSession(website, extras);
      captureScreenshots({
        url: website.url,
        sessionId: session.id
      }).then((screenshots) => {
        sessionStore.updateScreenshots(session.id, {
          mobile: screenshots.mobile ?? void 0,
          desktop: screenshots.desktop ?? void 0
        });
      }).catch((err) => scrapeLogger.error("Screenshot failed", logError(err)));
      if (afterScreenshots) {
        afterScreenshots(website, scrapeDuration).catch(
          (err) => scrapeLogger.error("afterScreenshots error", logError(err))
        );
      }
      const responseBody = buildResponse(session, website, extras, { scrapeDuration });
      return Response.json({ success: true, ...responseBody });
    } catch (error) {
      scrapeLogger.error("Scrape handler error", logError(error));
      const message = error instanceof Error ? error.message : "";
      if (message.includes("timeout") || message.includes("TIMEOUT") || message.includes("ETIMEDOUT")) {
        return Response.json(
          { error: "The site took too long to respond. Please try again." },
          { status: 504 }
        );
      }
      if (message.includes("ENOTFOUND") || message.includes("getaddrinfo")) {
        return Response.json(
          { error: "Could not reach this website. Please check the URL and try again." },
          { status: 400 }
        );
      }
      return Response.json(
        { error: "Failed to scrape website. Please check the URL and try again." },
        { status: 500 }
      );
    }
  };
}
export {
  createScrapeHandler
};
//# sourceMappingURL=scrape.js.map