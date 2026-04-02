// src/utils/staleness.ts
function getStalenessLabel(generatedAt, thresholdMs = 36e5) {
  const normalizedAt = generatedAt < 1e12 ? generatedAt * 1e3 : generatedAt;
  const age = Date.now() - normalizedAt;
  if (age < thresholdMs) return null;
  const hours = Math.floor(age / 36e5);
  if (hours < 1) return null;
  if (hours === 1) return "Generated 1 hour ago";
  if (hours < 24) return `Generated ${hours} hours ago`;
  const days = Math.floor(hours / 24);
  if (days > 365) return null;
  return `Generated ${days} day${days > 1 ? "s" : ""} ago`;
}

// src/utils/defaults.ts
var DEFAULT_CARD_CONFIG = {
  maxCardsPerMessage: 3,
  expandSteps: [5, 8],
  stalenessThresholdMs: 36e5,
  clickBehavior: "auto",
  enableVariantSelectors: false,
  enableAddToCart: false
};
var DEFAULT_CARD_THEME = {
  card: {
    bg: "#ffffff",
    border: "#e5e7eb",
    radius: "10px",
    shadow: "0 1px 3px rgba(0,0,0,0.08)",
    hoverBorder: "#d1d5db"
  },
  cardImage: {
    bg: "#f3f4f6",
    fallbackBg: "#f9fafb",
    fallbackText: "#9ca3af",
    aspectRatio: "16/9"
  },
  cardTitle: {
    color: "#111827",
    fontSize: "13px"
  },
  cardSubtitle: {
    color: "#6b7280",
    fontSize: "11px"
  },
  cardVariant: {
    bg: "#f3f4f6",
    border: "#e5e7eb",
    text: "#374151",
    activeBg: "#111827",
    activeBorder: "#111827"
  },
  cardStaleness: {
    color: "#9ca3af",
    fontSize: "11px"
  },
  action: {
    primaryBg: "#111827",
    primaryText: "#ffffff",
    secondaryBg: "transparent",
    secondaryText: "#111827",
    border: "#d1d5db",
    hoverBg: "#1f2937"
  }
};

// src/utils/panel-export.ts
function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
async function downloadImageUrl(url, filename) {
  const res = await fetch(url);
  const blob = await res.blob();
  downloadBlob(blob, filename);
}
async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}
var IMAGE_CARD_TYPES = /* @__PURE__ */ new Set(["ad-image", "image-batch"]);
function hasDownloadableImage(item) {
  if (IMAGE_CARD_TYPES.has(item.type)) {
    return typeof item.data.imageUrl === "string" && item.data.imageUrl !== "";
  }
  return false;
}
function getImageUrl(item) {
  if (hasDownloadableImage(item)) {
    return item.data.imageUrl;
  }
  return null;
}
function hasDownloadableHtml(item) {
  if (item.type === "email-preview") {
    return typeof item.data.htmlBody === "string" && item.data.htmlBody !== "";
  }
  if (item.type === "newsletter-preview") {
    return typeof item.data.htmlContent === "string" && item.data.htmlContent !== "";
  }
  return false;
}
function getHtmlContent(item) {
  if (item.type === "email-preview" && typeof item.data.htmlBody === "string") {
    return item.data.htmlBody;
  }
  if (item.type === "newsletter-preview" && typeof item.data.htmlContent === "string") {
    return item.data.htmlContent;
  }
  return null;
}
function formatAdBrief(d) {
  const lines = ["# Ad Brief", ""];
  if (d.platform) lines.push(`**Platform:** ${d.platform}`);
  if (d.product) lines.push(`**Product:** ${d.product}`);
  if (d.format) lines.push(`**Format:** ${d.format}`);
  if (d.duration) lines.push(`**Duration:** ${d.duration}`);
  lines.push("");
  if (d.hookType || d.hookText) {
    lines.push("## Hook");
    if (d.hookType) lines.push(`**Type:** ${d.hookType}`);
    if (d.hookText) lines.push(`**Text:** ${d.hookText}`);
    if (d.hookVisual) lines.push(`**Visual:** ${d.hookVisual}`);
    lines.push("");
  }
  if (d.problemVisualization) {
    lines.push("## Problem");
    lines.push(String(d.problemVisualization));
    lines.push("");
  }
  if (d.solutionBenefit || d.solutionProofPoint) {
    lines.push("## Solution");
    if (d.solutionBenefit) lines.push(`**Benefit:** ${d.solutionBenefit}`);
    if (d.solutionProofPoint)
      lines.push(`**Proof Point:** ${d.solutionProofPoint}`);
    lines.push("");
  }
  if (d.ctaAction || d.ctaUrgency) {
    lines.push("## CTA");
    if (d.ctaAction) lines.push(`**Action:** ${d.ctaAction}`);
    if (d.ctaUrgency) lines.push(`**Urgency:** ${d.ctaUrgency}`);
  }
  return lines.join("\n");
}
function formatAdScript(d) {
  const lines = ["# Ad Script", ""];
  if (d.platform) lines.push(`**Platform:** ${d.platform}`);
  if (d.totalDuration) lines.push(`**Total Duration:** ${d.totalDuration}`);
  lines.push("");
  const scenes = d.scenes;
  if (Array.isArray(scenes)) {
    for (const scene of scenes) {
      lines.push(`## Scene ${scene.sceneNumber ?? "?"} (${scene.duration ?? ""})`);
      if (scene.visual) lines.push(`**Visual:** ${scene.visual}`);
      if (scene.voiceover) lines.push(`**Voiceover:** ${scene.voiceover}`);
      if (scene.onScreenText) lines.push(`**On-screen:** ${scene.onScreenText}`);
      lines.push("");
    }
  }
  if (d.talentNotes) lines.push(`**Talent Notes:** ${d.talentNotes}`);
  if (d.musicDirection) lines.push(`**Music Direction:** ${d.musicDirection}`);
  return lines.join("\n");
}
function formatAdImage(d) {
  const lines = ["# Ad Image", ""];
  if (d.imageUrl) lines.push(`**Image URL:** ${d.imageUrl}`);
  if (d.platform) lines.push(`**Platform:** ${d.platform}`);
  if (d.dimensions) lines.push(`**Dimensions:** ${d.dimensions}`);
  if (d.promptUsed) lines.push(`**Prompt:** ${d.promptUsed}`);
  if (typeof d.qaScore === "number") lines.push(`**QA Score:** ${d.qaScore}`);
  const qa = d.qaBreakdown;
  if (qa && typeof qa === "object") {
    lines.push("");
    lines.push("## QA Breakdown");
    for (const [k, v] of Object.entries(qa)) {
      lines.push(`- ${k}: ${v}`);
    }
  }
  return lines.join("\n");
}
function formatAdCampaignSummary(d) {
  const lines = ["# Campaign Summary", ""];
  if (d.brandName) lines.push(`**Brand:** ${d.brandName}`);
  if (d.executiveSummary) {
    lines.push("");
    lines.push("## Executive Summary");
    lines.push(String(d.executiveSummary));
  }
  const topPainPoints = d.topPainPoints;
  if (Array.isArray(topPainPoints) && topPainPoints.length > 0) {
    lines.push("");
    lines.push("## Top Pain Points");
    for (const p of topPainPoints) lines.push(`- ${p}`);
  }
  const topHooks = d.topHooks;
  if (Array.isArray(topHooks) && topHooks.length > 0) {
    lines.push("");
    lines.push("## Top Hooks");
    for (const h of topHooks) lines.push(`- ${h}`);
  }
  const recs = d.recommendations;
  if (Array.isArray(recs) && recs.length > 0) {
    lines.push("");
    lines.push("## Recommendations");
    for (const r of recs) lines.push(`- ${r}`);
  }
  return lines.join("\n");
}
function formatPainPoint(d) {
  const lines = ["# Pain Point", ""];
  if (d.category) lines.push(`**Category:** ${d.category}`);
  if (typeof d.engagementScore === "number")
    lines.push(`**Engagement Score:** ${d.engagementScore}`);
  if (typeof d.relevanceScore === "number")
    lines.push(`**Relevance Score:** ${d.relevanceScore}`);
  if (d.productFit) lines.push(`**Product Fit:** ${d.productFit}`);
  const quotes = d.verbatimQuotes;
  if (Array.isArray(quotes) && quotes.length > 0) {
    lines.push("");
    lines.push("## Verbatim Quotes");
    for (const q of quotes) {
      lines.push(`- "${q.text ?? ""}" (${q.subreddit ?? ""}, ${q.url ?? ""})`);
    }
  }
  const angles = d.adAngles;
  if (Array.isArray(angles) && angles.length > 0) {
    lines.push("");
    lines.push("## Ad Angles");
    for (const a of angles) lines.push(`- ${a}`);
  }
  return lines.join("\n");
}
function formatCompetitorPattern(d) {
  const lines = ["# Competitor Patterns", ""];
  if (d.source) lines.push(`**Source:** ${d.source}`);
  const patterns = d.patterns;
  if (Array.isArray(patterns) && patterns.length > 0) {
    lines.push("");
    lines.push("## Patterns");
    for (const p of patterns) {
      lines.push(`### ${p.hookType ?? "Unknown"}`);
      if (p.hookExample) lines.push(`**Example:** ${p.hookExample}`);
      if (p.format) lines.push(`**Format:** ${p.format}`);
      if (p.engagementSignal)
        lines.push(`**Engagement:** ${p.engagementSignal}`);
      lines.push("");
    }
  }
  const hooks = d.trendingHooks;
  if (Array.isArray(hooks) && hooks.length > 0) {
    lines.push("## Trending Hooks");
    for (const h of hooks) lines.push(`- ${h}`);
    lines.push("");
  }
  const formats = d.trendingFormats;
  if (Array.isArray(formats) && formats.length > 0) {
    lines.push("## Trending Formats");
    for (const f of formats) lines.push(`- ${f}`);
  }
  return lines.join("\n");
}
function formatEmailPreview(d) {
  const lines = ["# Email", ""];
  if (d.recipientName) lines.push(`**To:** ${d.recipientName}`);
  if (d.recipientCompany) lines.push(`**Company:** ${d.recipientCompany}`);
  if (d.recipientTemperature)
    lines.push(`**Temperature:** ${d.recipientTemperature}`);
  if (d.subject) lines.push(`**Subject:** ${d.subject}`);
  if (d.previewText) lines.push(`**Preview:** ${d.previewText}`);
  if (d.status) lines.push(`**Status:** ${d.status}`);
  return lines.join("\n");
}
function formatNewsletterPreview(d) {
  const lines = ["# Newsletter", ""];
  if (d.title) lines.push(`**Title:** ${d.title}`);
  if (d.subject) lines.push(`**Subject:** ${d.subject}`);
  if (typeof d.sectionCount === "number")
    lines.push(`**Sections:** ${d.sectionCount}`);
  return lines.join("\n");
}
function formatSocialPost(d) {
  const lines = [];
  if (d.day) lines.push(`Day ${d.dayNumber ?? ""}: ${d.day}`);
  if (d.contentType) lines.push(`Type: ${d.contentType}`);
  lines.push("");
  if (d.content) lines.push(String(d.content));
  const hashtags = d.hashtags;
  if (Array.isArray(hashtags) && hashtags.length > 0) {
    lines.push("");
    lines.push(hashtags.join(" "));
  }
  return lines.join("\n");
}
function formatLinkedInPreview(d) {
  const lines = [];
  if (d.authorName) lines.push(`${d.authorName}`);
  if (d.authorTitle) lines.push(`${d.authorTitle}`);
  if (d.day) lines.push(`Day: ${d.day}`);
  lines.push("");
  if (d.content) lines.push(String(d.content));
  const hashtags = d.hashtags;
  if (Array.isArray(hashtags) && hashtags.length > 0) {
    lines.push("");
    lines.push(hashtags.join(" "));
  }
  return lines.join("\n");
}
function formatBrandProfile(d) {
  const lines = ["# Brand Profile", ""];
  if (d.companyName) lines.push(`**Company:** ${d.companyName}`);
  if (d.tone) lines.push(`**Tone:** ${d.tone}`);
  if (d.industry) lines.push(`**Industry:** ${d.industry}`);
  if (d.website) lines.push(`**Website:** ${d.website}`);
  const traits = d.traits;
  if (Array.isArray(traits) && traits.length > 0) {
    lines.push("");
    lines.push("## Traits");
    for (const t of traits) lines.push(`- ${t}`);
  }
  const products = d.products;
  if (Array.isArray(products) && products.length > 0) {
    lines.push("");
    lines.push("## Products");
    for (const p of products) lines.push(`- ${p}`);
  }
  return lines.join("\n");
}
function formatBrandAnalysis(d) {
  const lines = ["# Brand Analysis", ""];
  if (d.companyName) lines.push(`**Company:** ${d.companyName}`);
  if (d.tone) lines.push(`**Tone:** ${d.tone}`);
  if (d.targetAudience) lines.push(`**Target Audience:** ${d.targetAudience}`);
  if (d.industry) lines.push(`**Industry:** ${d.industry}`);
  const types = d.contentTypes;
  if (Array.isArray(types) && types.length > 0) {
    lines.push("");
    lines.push("## Content Types");
    for (const t of types) lines.push(`- ${t}`);
  }
  const insights = d.competitorInsights;
  if (Array.isArray(insights) && insights.length > 0) {
    lines.push("");
    lines.push("## Competitor Insights");
    for (const i of insights) lines.push(`- ${i}`);
  }
  return lines.join("\n");
}
function escapeCsvField(value) {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}
function formatRecipientTable(d) {
  const recipients = d.recipients;
  if (!Array.isArray(recipients) || recipients.length === 0) {
    return "No recipients";
  }
  const header = "Name,Email,Company,Title,Temperature";
  const rows = recipients.map(
    (r) => [
      escapeCsvField(r.name ?? ""),
      escapeCsvField(r.email ?? ""),
      escapeCsvField(r.company ?? ""),
      escapeCsvField(r.title ?? ""),
      escapeCsvField(r.temperature ?? "")
    ].join(",")
  );
  return [header, ...rows].join("\n");
}
function formatWeekOverview(d) {
  const lines = ["# Week Overview", ""];
  if (typeof d.totalPosts === "number")
    lines.push(`**Total Posts:** ${d.totalPosts}`);
  const posts = d.posts;
  if (Array.isArray(posts)) {
    lines.push("");
    for (const p of posts) {
      lines.push(
        `## Day ${p.dayNumber ?? "?"}: ${p.day ?? ""}`
      );
      if (p.contentType) lines.push(`**Type:** ${p.contentType}`);
      if (p.preview) lines.push(p.preview);
      lines.push("");
    }
  }
  return lines.join("\n");
}
function formatPersona(d) {
  const lines = ["# Persona", ""];
  if (d.name) lines.push(`**Name:** ${d.name}`);
  if (d.industry) lines.push(`**Industry:** ${d.industry}`);
  if (d.voiceDescription) {
    lines.push("");
    lines.push("## Voice");
    lines.push(String(d.voiceDescription));
  }
  const traits = d.traits;
  if (Array.isArray(traits) && traits.length > 0) {
    lines.push("");
    lines.push("## Traits");
    for (const t of traits) lines.push(`- ${t}`);
  }
  return lines.join("\n");
}
var FORMATTERS = {
  "ad-brief": formatAdBrief,
  "ad-script": formatAdScript,
  "ad-image": formatAdImage,
  "ad-campaign-summary": formatAdCampaignSummary,
  "pain-point": formatPainPoint,
  "competitor-pattern": formatCompetitorPattern,
  "email-preview": formatEmailPreview,
  "newsletter-preview": formatNewsletterPreview,
  "social-post": formatSocialPost,
  "linkedin-preview": formatLinkedInPreview,
  "brand-profile": formatBrandProfile,
  "brand-analysis": formatBrandAnalysis,
  "recipient-table": formatRecipientTable,
  "week-overview": formatWeekOverview,
  "persona": formatPersona
};
function formatPanelItem(item) {
  const formatter = FORMATTERS[item.type];
  if (formatter) {
    return formatter(item.data);
  }
  return JSON.stringify(item.data, null, 2);
}
var EXTENSIONS = {
  "recipient-table": "csv",
  "email-preview": "md",
  "newsletter-preview": "md",
  "social-post": "txt",
  "linkedin-preview": "txt"
};
function getPanelItemFilename(item) {
  const ext = EXTENSIONS[item.type] ?? "md";
  const slug = typeof item.data.title === "string" ? item.data.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) : item.type;
  return `${item.type}-${slug}.${ext}`;
}
export {
  DEFAULT_CARD_CONFIG,
  DEFAULT_CARD_THEME,
  copyToClipboard,
  downloadBlob,
  downloadImageUrl,
  formatPanelItem,
  getHtmlContent,
  getImageUrl,
  getPanelItemFilename,
  getStalenessLabel,
  hasDownloadableHtml,
  hasDownloadableImage
};
//# sourceMappingURL=index.js.map