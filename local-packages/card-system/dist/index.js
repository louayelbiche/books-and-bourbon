// src/parsers/card-parser.ts
var CARDS_TAG_REGEX = /\[CARDS\]\s*([\s\S]*?)\s*\[\/CARDS\]/i;
var ACTIONS_TAG_REGEX = /\[ACTIONS\]\s*([\s\S]*?)\s*\[\/ACTIONS\]/i;
var SUGGESTIONS_TAG_REGEX = /\[SUGGESTIONS?:\s*([^\]]+)\]\s*$/i;
var VALID_CARD_TYPES = /* @__PURE__ */ new Set(["product", "service", "page", "event"]);
var VALID_ACTION_TYPES = /* @__PURE__ */ new Set(["navigate", "message", "api_call"]);
var ALLOWED_URL_PROTOCOLS = /* @__PURE__ */ new Set(["http:", "https:"]);
function stripHtmlTags(str) {
  return str.replace(/<[^>]*>/g, "");
}
function sanitizeUrl(url) {
  if (!url) return "";
  try {
    const resolved = url.startsWith("//") ? `https:${url}` : url;
    const parsed = new URL(resolved);
    return ALLOWED_URL_PROTOCOLS.has(parsed.protocol) ? url : "";
  } catch {
    const lower = url.toLowerCase().replace(/[\s\x00-\x1f]/g, "");
    if (lower.startsWith("javascript:") || lower.startsWith("data:") || lower.startsWith("vbscript:")) {
      return "";
    }
    return url;
  }
}
var MAX_SUBTITLE_LENGTH = 60;
function normalizeSubtitle(raw) {
  if (typeof raw !== "string" || !raw.trim()) return void 0;
  const cleaned = stripHtmlTags(raw.trim());
  if (!cleaned) return void 0;
  if (cleaned.length > MAX_SUBTITLE_LENGTH) return "Price not listed";
  return cleaned;
}
function validateCards(raw) {
  return raw.filter((c) => c !== null && typeof c === "object").filter((c) => typeof c.title === "string" && c.title.trim().length > 0).map((c) => ({
    id: typeof c.id === "string" && c.id ? c.id : `card-${crypto.randomUUID()}`,
    type: VALID_CARD_TYPES.has(c.type) ? c.type : "product",
    title: stripHtmlTags(c.title.trim()),
    image: typeof c.image === "string" && c.image.trim() ? sanitizeUrl(c.image.trim()) || void 0 : void 0,
    subtitle: normalizeSubtitle(c.subtitle),
    description: typeof c.description === "string" ? stripHtmlTags(c.description) : void 0,
    url: typeof c.url === "string" ? sanitizeUrl(c.url) : "",
    availability: ["available", "low_stock", "sold_out"].includes(c.availability) ? c.availability : "available",
    variants: Array.isArray(c.variants) ? c.variants : void 0,
    metadata: typeof c.metadata === "object" && c.metadata !== null ? c.metadata : void 0,
    generatedAt: typeof c.generatedAt === "number" ? c.generatedAt : Date.now()
  }));
}
function parseStructuredResponse(rawText) {
  let text = rawText;
  let cards = [];
  let actions = [];
  let suggestions = [];
  const cardsMatch = text.match(CARDS_TAG_REGEX);
  if (cardsMatch) {
    text = text.replace(CARDS_TAG_REGEX, "").trim();
    try {
      const parsed = JSON.parse(cardsMatch[1]);
      cards = Array.isArray(parsed) ? validateCards(parsed) : [];
    } catch {
      cards = [];
    }
  }
  const actionsMatch = text.match(ACTIONS_TAG_REGEX);
  if (actionsMatch) {
    text = text.replace(ACTIONS_TAG_REGEX, "").trim();
    try {
      const parsed = JSON.parse(actionsMatch[1]);
      actions = Array.isArray(parsed) ? parsed.filter((a) => VALID_ACTION_TYPES.has(a.type)).map((a) => ({
        ...a,
        label: typeof a.label === "string" ? stripHtmlTags(a.label) : "",
        payload: typeof a.payload === "string" && a.type === "navigate" ? sanitizeUrl(a.payload) : typeof a.payload === "string" ? a.payload : ""
      })) : [];
    } catch {
      actions = [];
    }
  }
  const suggestionsMatch = text.match(SUGGESTIONS_TAG_REGEX);
  if (suggestionsMatch) {
    text = text.replace(SUGGESTIONS_TAG_REGEX, "").trim();
    suggestions = suggestionsMatch[1].split("|").map((s) => s.trim()).filter(Boolean).slice(0, 3);
  }
  return { text, cards, actions, suggestions };
}

// src/validation/migration-flag.ts
function isCardToolMigrationEnabled() {
  const flag = typeof process !== "undefined" ? process.env.CARD_TOOL_MIGRATION : void 0;
  return flag === "true" || flag === "1";
}
var MIGRATION_FALLBACK_EVENT = "EVT-07";
function toMigrationFallbackEvent(agentType, reason, siteName) {
  return {
    event: MIGRATION_FALLBACK_EVENT,
    agentType,
    reason,
    siteName,
    timestamp: Date.now()
  };
}

// src/parsers/migration-parser.ts
var CARDS_TAG_REGEX2 = /\[CARDS\]\s*[\s\S]*?\s*\[\/CARDS\]/i;
var ACTIONS_TAG_REGEX2 = /\[ACTIONS\]\s*[\s\S]*?\s*\[\/ACTIONS\]/i;
var SUGGESTIONS_TAG_REGEX2 = /\[SUGGESTIONS?:\s*([^\]]+)\]\s*$/i;
function parseMigrationAwareResponse(rawText, agentType, onFallback) {
  if (isCardToolMigrationEnabled()) {
    let text = rawText;
    text = text.replace(CARDS_TAG_REGEX2, "").trim();
    text = text.replace(ACTIONS_TAG_REGEX2, "").trim();
    let suggestions = [];
    const suggestionsMatch = text.match(SUGGESTIONS_TAG_REGEX2);
    if (suggestionsMatch) {
      text = text.replace(SUGGESTIONS_TAG_REGEX2, "").trim();
      suggestions = suggestionsMatch[1].split("|").map((s) => s.trim()).filter(Boolean).slice(0, 3);
    }
    return { text, cards: [], actions: [], suggestions };
  }
  if (onFallback && agentType) {
    onFallback(toMigrationFallbackEvent(agentType, "flag_off"));
  }
  return parseStructuredResponse(rawText);
}

// src/components/CardRenderer.tsx
import { useState } from "react";
import { jsx, jsxs } from "react/jsx-runtime";
function CardRenderer({ card, theme, config, onClick, imageErrorLabel }) {
  var _a, _b;
  const [isHovered, setIsHovered] = useState(false);
  const isMobile = typeof window !== "undefined" && window.innerWidth < 768;
  const clickTarget = config.clickBehavior === "auto" ? isMobile ? "_blank" : "_blank" : config.clickBehavior === "new_tab" ? "_blank" : "_self";
  const handleClick = () => {
    onClick(card);
  };
  const cardStyle = {
    background: theme.card.bg,
    border: `1px solid ${isHovered ? theme.card.hoverBorder : theme.card.border}`,
    borderRadius: theme.card.radius,
    boxShadow: theme.card.shadow,
    overflow: "hidden",
    cursor: "pointer",
    transition: "border-color 0.2s ease",
    minHeight: "44px"
  };
  const bodyStyle = {
    padding: "8px 10px",
    flex: 1,
    minWidth: 0
  };
  const titleStyle = {
    margin: 0,
    fontSize: theme.cardTitle.fontSize,
    fontWeight: 600,
    color: theme.cardTitle.color,
    lineHeight: 1.3,
    display: "-webkit-box",
    WebkitLineClamp: 2,
    WebkitBoxOrient: "vertical",
    overflow: "hidden"
  };
  const subtitleRowStyle = {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    marginTop: "2px",
    flexWrap: "wrap"
  };
  const subtitleStyle = {
    margin: 0,
    fontSize: theme.cardSubtitle.fontSize,
    color: theme.cardSubtitle.color,
    lineHeight: 1.4,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap"
  };
  const variantsRowStyle = {
    display: "flex",
    flexWrap: "wrap",
    gap: "4px",
    marginTop: "6px"
  };
  const variantBadgeStyle = (isSelected) => ({
    padding: "2px 8px",
    fontSize: "11px",
    borderRadius: "4px",
    background: isSelected ? theme.cardVariant.activeBg : theme.cardVariant.bg,
    border: `1px solid ${isSelected ? theme.cardVariant.activeBorder : theme.cardVariant.border}`,
    color: isSelected ? "#fff" : theme.cardVariant.text,
    lineHeight: 1.4
  });
  const availabilityStyle = {
    display: "inline-block",
    padding: "1px 6px",
    fontSize: "10px",
    borderRadius: "3px",
    fontWeight: 500,
    ...card.availability === "sold_out" ? { background: "#fef2f2", color: "#dc2626" } : card.availability === "low_stock" ? { background: "#fffbeb", color: "#d97706" } : {}
  };
  const hasImage = !!card.image;
  const rowStyle = {
    display: "flex",
    flexDirection: "row",
    alignItems: "stretch"
  };
  const thumbnailStyle = {
    width: "72px",
    minHeight: "72px",
    flexShrink: 0,
    background: theme.cardImage.bg,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    borderTopLeftRadius: "inherit",
    borderBottomLeftRadius: "inherit"
  };
  const thumbnailImgStyle = {
    width: "100%",
    height: "100%",
    objectFit: "cover"
  };
  return /* @__PURE__ */ jsx(
    "div",
    {
      style: cardStyle,
      role: "button",
      tabIndex: 0,
      onClick: handleClick,
      onKeyDown: (e) => {
        if (e.key === "Enter" || e.key === " ") handleClick();
      },
      onMouseEnter: () => setIsHovered(true),
      onMouseLeave: () => setIsHovered(false),
      "aria-label": `View ${card.title}`,
      children: /* @__PURE__ */ jsxs("div", { style: rowStyle, children: [
        hasImage && /* @__PURE__ */ jsx("div", { style: thumbnailStyle, children: /* @__PURE__ */ jsx(
          "img",
          {
            src: card.image,
            alt: card.title,
            style: thumbnailImgStyle,
            loading: "lazy"
          }
        ) }),
        /* @__PURE__ */ jsxs("div", { style: bodyStyle, children: [
          /* @__PURE__ */ jsx("p", { style: titleStyle, children: card.title }),
          (((_a = card.subtitle) == null ? void 0 : _a.trim()) || card.availability && card.availability !== "available") && /* @__PURE__ */ jsxs("div", { style: subtitleRowStyle, children: [
            ((_b = card.subtitle) == null ? void 0 : _b.trim()) && /* @__PURE__ */ jsx("p", { style: subtitleStyle, children: card.subtitle.trim() }),
            card.availability && card.availability !== "available" && /* @__PURE__ */ jsx("span", { style: availabilityStyle, children: card.availability === "sold_out" ? "Sold out" : "Low stock" })
          ] }),
          config.enableVariantSelectors && card.variants && card.variants.length > 0 && /* @__PURE__ */ jsx("div", { style: variantsRowStyle, children: card.variants.map((variant) => variant.options.map((opt) => /* @__PURE__ */ jsx(
            "span",
            {
              style: variantBadgeStyle(opt === variant.selected),
              children: opt
            },
            `${variant.name}-${opt}`
          ))) }),
          !hasImage && config.imagePlaceholderText && /* @__PURE__ */ jsx("p", { style: { margin: "4px 0 0", fontSize: "10px", color: theme.cardSubtitle.color, opacity: 0.7, lineHeight: 1.3 }, children: config.imagePlaceholderText })
        ] })
      ] })
    }
  );
}

// src/components/CardList.tsx
import { useState as useState2, useEffect, useRef } from "react";
import { jsx as jsx2, jsxs as jsxs2 } from "react/jsx-runtime";
function CardList({ cards, theme, config, onCardClick, imageErrorLabel, onCardVisible, onCardDwell }) {
  const [visibleCount, setVisibleCount] = useState2(config.maxCardsPerMessage);
  const containerRef = useRef(null);
  const visibilityTimers = useRef(/* @__PURE__ */ new Map());
  const notifiedCards = useRef(/* @__PURE__ */ new Set());
  useEffect(() => {
    if (!onCardVisible && !onCardDwell) return;
    if (!containerRef.current) return;
    if (typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const cardId = entry.target.getAttribute("data-card-id");
          if (!cardId) continue;
          const card = cards.find((c) => c.id === cardId);
          if (!card) continue;
          if (entry.isIntersecting && entry.intersectionRatio >= 0.5) {
            if (!visibilityTimers.current.has(cardId)) {
              const timer = window.setTimeout(() => {
                if (!notifiedCards.current.has(cardId)) {
                  notifiedCards.current.add(cardId);
                  onCardVisible == null ? void 0 : onCardVisible(card);
                }
                visibilityTimers.current.set(cardId, Date.now());
              }, 500);
              visibilityTimers.current.set(cardId, -timer);
            }
          } else {
            const timerOrStart = visibilityTimers.current.get(cardId);
            if (timerOrStart !== void 0) {
              if (timerOrStart < 0) {
                window.clearTimeout(-timerOrStart);
              } else if (timerOrStart > 0 && notifiedCards.current.has(cardId)) {
                const dwellMs = Date.now() - timerOrStart;
                if (dwellMs > 0) onCardDwell == null ? void 0 : onCardDwell(card, dwellMs);
              }
              visibilityTimers.current.delete(cardId);
            }
          }
        }
      },
      { threshold: 0.5 }
    );
    const cardElements = containerRef.current.querySelectorAll("[data-card-id]");
    cardElements.forEach((el) => observer.observe(el));
    return () => {
      observer.disconnect();
      for (const [, timerOrStart] of visibilityTimers.current) {
        if (timerOrStart < 0) window.clearTimeout(-timerOrStart);
      }
      visibilityTimers.current.clear();
    };
  }, [cards, onCardVisible, onCardDwell]);
  if (!cards || cards.length === 0) return null;
  const visibleCards = cards.slice(0, visibleCount);
  const hasMore = cards.length > visibleCount;
  const handleShowMore = () => {
    const nextStep = config.expandSteps.find((step) => step > visibleCount);
    setVisibleCount(nextStep ?? cards.length);
  };
  const containerStyle2 = {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
    marginTop: "8px",
    maxWidth: "100%"
  };
  const showMoreStyle = {
    padding: "6px 12px",
    fontSize: "12px",
    color: theme.cardSubtitle.color,
    background: "transparent",
    border: `1px solid ${theme.card.border}`,
    borderRadius: "8px",
    cursor: "pointer",
    alignSelf: "center",
    minHeight: "36px",
    transition: "background 0.2s"
  };
  return /* @__PURE__ */ jsxs2("div", { ref: containerRef, style: containerStyle2, children: [
    visibleCards.map((card) => /* @__PURE__ */ jsx2("div", { "data-card-id": card.id, children: /* @__PURE__ */ jsx2(
      CardRenderer,
      {
        card,
        theme,
        config,
        onClick: onCardClick,
        imageErrorLabel
      }
    ) }, card.id)),
    hasMore && /* @__PURE__ */ jsxs2(
      "button",
      {
        type: "button",
        style: showMoreStyle,
        onClick: handleShowMore,
        children: [
          "Show more (",
          cards.length - visibleCount,
          " remaining)"
        ]
      }
    )
  ] });
}

// src/components/CardImage.tsx
import { useState as useState3 } from "react";
import { jsx as jsx3, jsxs as jsxs3 } from "react/jsx-runtime";
function CardImage({ src, alt, theme, errorLabel, placeholderText }) {
  const [status, setStatus] = useState3(
    src ? "loading" : "error"
  );
  if (!src) {
    if (!placeholderText) return null;
    const placeholderStyle = {
      padding: "12px",
      fontSize: "11px",
      lineHeight: 1.4,
      color: theme.fallbackText,
      background: theme.fallbackBg,
      borderTopLeftRadius: "inherit",
      borderTopRightRadius: "inherit",
      textAlign: "center",
      opacity: 0.8
    };
    return /* @__PURE__ */ jsx3("div", { style: placeholderStyle, children: placeholderText });
  }
  if (status === "error") {
    const errorStyle2 = {
      padding: "6px 12px",
      fontSize: "11px",
      color: theme.fallbackText,
      background: theme.fallbackBg,
      borderTopLeftRadius: "inherit",
      borderTopRightRadius: "inherit"
    };
    return /* @__PURE__ */ jsxs3("div", { style: errorStyle2, children: [
      "\u26A0",
      " ",
      errorLabel || "Image unavailable"
    ] });
  }
  const containerStyle2 = {
    aspectRatio: theme.aspectRatio,
    background: theme.bg,
    overflow: "hidden",
    position: "relative",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    borderTopLeftRadius: "inherit",
    borderTopRightRadius: "inherit"
  };
  const imgStyle = {
    width: "100%",
    height: "100%",
    objectFit: "cover",
    opacity: status === "loaded" ? 1 : 0,
    transition: "opacity 0.3s ease"
  };
  return /* @__PURE__ */ jsx3("div", { style: containerStyle2, children: /* @__PURE__ */ jsx3(
    "img",
    {
      src,
      alt,
      onLoad: () => setStatus("loaded"),
      onError: () => setStatus("error"),
      style: imgStyle,
      loading: "lazy"
    }
  ) });
}

// src/components/ActionPills.tsx
import { useState as useState4 } from "react";
import { jsx as jsx4 } from "react/jsx-runtime";
function ActionPills({ actions, theme, onAction }) {
  if (!actions || actions.length === 0) return null;
  const containerStyle2 = {
    display: "flex",
    flexWrap: "wrap",
    gap: "8px",
    marginTop: "8px"
  };
  return /* @__PURE__ */ jsx4("div", { style: containerStyle2, children: actions.map((action) => /* @__PURE__ */ jsx4(
    ActionPill,
    {
      action,
      theme,
      onAction
    },
    action.id
  )) });
}
function ActionPill({
  action,
  theme,
  onAction
}) {
  const [isHovered, setIsHovered] = useState4(false);
  const style = action.style || "primary";
  const baseStyle = {
    padding: "8px 16px",
    fontSize: "13px",
    fontWeight: 500,
    borderRadius: "20px",
    cursor: "pointer",
    minHeight: "44px",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    transition: "background 0.2s, color 0.2s",
    border: "none",
    whiteSpace: "nowrap"
  };
  const styleMap = {
    primary: {
      ...baseStyle,
      background: isHovered ? theme.hoverBg : theme.primaryBg,
      color: theme.primaryText
    },
    secondary: {
      ...baseStyle,
      background: isHovered ? theme.hoverBg : theme.secondaryBg,
      color: isHovered ? theme.primaryText : theme.secondaryText,
      border: `1px solid ${theme.border}`
    },
    ghost: {
      ...baseStyle,
      background: "transparent",
      color: theme.secondaryText,
      textDecoration: isHovered ? "underline" : "none"
    }
  };
  return /* @__PURE__ */ jsx4(
    "button",
    {
      type: "button",
      style: styleMap[style] || styleMap.primary,
      onClick: () => onAction(action),
      onMouseEnter: () => setIsHovered(true),
      onMouseLeave: () => setIsHovered(false),
      children: action.label
    }
  );
}

// src/components/AgentProgressCard.tsx
import { jsx as jsx5, jsxs as jsxs4 } from "react/jsx-runtime";
function formatDuration(ms) {
  const seconds = Math.round(ms / 1e3);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const remaining = seconds % 60;
  return `${minutes}m ${remaining}s`;
}
var containerStyle = {
  padding: "12px 0 0"
};
var labelStyle = {
  fontSize: "13px",
  fontWeight: 500,
  color: "#374151",
  marginBottom: "8px"
};
var barTrackStyle = {
  width: "100%",
  height: "6px",
  background: "#e5e7eb",
  borderRadius: "3px",
  overflow: "hidden"
};
var metaStyle = {
  display: "flex",
  justifyContent: "space-between",
  marginTop: "6px",
  fontSize: "11px",
  color: "#9ca3af"
};
var errorStyle = {
  fontSize: "12px",
  color: "#dc2626",
  marginTop: "8px",
  lineHeight: 1.4
};
var summaryStyle = {
  fontSize: "12px",
  color: "#6b7280",
  marginTop: "8px",
  lineHeight: 1.4
};
function AgentProgressCard({ data }) {
  const { status, percent, currentPhaseLabel, phaseIndex, totalPhases } = data;
  const barColor = status === "error" ? "#dc2626" : status === "completed" ? "#16a34a" : "#3b82f6";
  const barFillStyle = {
    width: `${percent}%`,
    height: "100%",
    background: barColor,
    borderRadius: "3px",
    transition: "width 0.4s ease"
  };
  return /* @__PURE__ */ jsxs4("div", { style: containerStyle, children: [
    /* @__PURE__ */ jsx5("div", { style: labelStyle, children: currentPhaseLabel }),
    /* @__PURE__ */ jsx5("div", { style: barTrackStyle, children: /* @__PURE__ */ jsx5("div", { style: barFillStyle }) }),
    /* @__PURE__ */ jsxs4("div", { style: metaStyle, children: [
      /* @__PURE__ */ jsxs4("span", { children: [
        "Phase ",
        phaseIndex + 1,
        " of ",
        totalPhases
      ] }),
      /* @__PURE__ */ jsxs4("span", { children: [
        percent,
        "%"
      ] })
    ] }),
    status === "error" && data.error && /* @__PURE__ */ jsx5("div", { style: errorStyle, children: data.error }),
    status === "completed" && /* @__PURE__ */ jsxs4("div", { style: summaryStyle, children: [
      data.durationMs != null && /* @__PURE__ */ jsxs4("span", { children: [
        "Completed in ",
        formatDuration(data.durationMs)
      ] }),
      data.phasesCompleted.length > 0 && /* @__PURE__ */ jsxs4("span", { children: [
        data.durationMs != null ? " \xB7 " : "",
        data.phasesCompleted.length,
        " phase",
        data.phasesCompleted.length !== 1 ? "s" : ""
      ] }),
      data.toolsUsed && data.toolsUsed.length > 0 && /* @__PURE__ */ jsxs4("span", { children: [
        " \xB7 ",
        data.toolsUsed.length,
        " tool",
        data.toolsUsed.length !== 1 ? "s" : "",
        " used"
      ] })
    ] })
  ] });
}

// src/components/SharedPanel.tsx
import { jsx as jsx6, jsxs as jsxs5 } from "react/jsx-runtime";
function PanelItemRenderer({
  item,
  onPin,
  onUnpin,
  onRemove,
  onCopy,
  onDownload,
  copyingId,
  renderCard
}) {
  const itemStyle = {
    background: "#ffffff",
    border: "1px solid #e5e7eb",
    borderRadius: "8px",
    padding: "12px",
    position: "relative"
  };
  const headerStyle = {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "8px",
    fontSize: "11px",
    color: "#9ca3af"
  };
  const buttonStyle = {
    background: "none",
    border: "none",
    cursor: "pointer",
    padding: "2px 6px",
    fontSize: "11px",
    color: "#9ca3af"
  };
  return /* @__PURE__ */ jsxs5("div", { style: itemStyle, children: [
    /* @__PURE__ */ jsxs5("div", { style: headerStyle, children: [
      /* @__PURE__ */ jsx6("span", { children: item.type }),
      /* @__PURE__ */ jsxs5("span", { style: { display: "flex", gap: "4px" }, children: [
        onCopy && /* @__PURE__ */ jsx6("button", { type: "button", style: buttonStyle, onClick: () => onCopy(item), children: copyingId === item.id ? "Copied!" : "Copy" }),
        onDownload && /* @__PURE__ */ jsx6("button", { type: "button", style: buttonStyle, onClick: () => onDownload(item), children: "Save" }),
        item.pinned ? /* @__PURE__ */ jsx6("button", { type: "button", style: buttonStyle, onClick: () => onUnpin == null ? void 0 : onUnpin(item.id), children: "Unpin" }) : /* @__PURE__ */ jsx6("button", { type: "button", style: buttonStyle, onClick: () => onPin == null ? void 0 : onPin(item.id), children: "Pin" }),
        !item.pinned && /* @__PURE__ */ jsx6("button", { type: "button", style: buttonStyle, onClick: () => onRemove == null ? void 0 : onRemove(item.id), children: "\xD7" })
      ] })
    ] }),
    item.type === "agent-progress" ? /* @__PURE__ */ jsx6(AgentProgressCard, { data: item.data }) : renderCard ? renderCard(item) : /* @__PURE__ */ jsx6(DefaultPanelContent, { item })
  ] });
}
function DefaultPanelContent({ item }) {
  const contentStyle = {
    fontSize: "13px",
    color: "#374151",
    lineHeight: 1.5
  };
  return /* @__PURE__ */ jsxs5("div", { style: contentStyle, children: [
    /* @__PURE__ */ jsx6("div", { style: { fontWeight: 500, marginBottom: "4px" }, children: item.data.title || item.type }),
    item.data.description != null && /* @__PURE__ */ jsx6("div", { style: { color: "#6b7280", fontSize: "12px" }, children: String(item.data.description) })
  ] });
}
function SharedPanel({
  items,
  position = "right",
  onPin,
  onUnpin,
  onRemove,
  onCopy,
  onDownload,
  copyingId,
  renderCard
}) {
  const isVertical = position === "right";
  const panelStyle = {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
    padding: "12px",
    overflowY: "auto",
    height: isVertical ? "100%" : void 0,
    maxHeight: isVertical ? void 0 : "40vh",
    minWidth: isVertical ? "320px" : void 0,
    borderLeft: isVertical ? "1px solid #e5e7eb" : void 0,
    borderTop: !isVertical ? "1px solid #e5e7eb" : void 0,
    background: "#fafafa"
  };
  const emptyStyle = {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    height: "100%",
    minHeight: "120px",
    color: "#9ca3af",
    fontSize: "13px",
    fontStyle: "italic"
  };
  if (items.length === 0) {
    return /* @__PURE__ */ jsx6("div", { style: panelStyle, children: /* @__PURE__ */ jsx6("div", { style: emptyStyle, children: "Artifacts will appear here" }) });
  }
  return /* @__PURE__ */ jsx6("div", { style: panelStyle, children: items.map((item) => /* @__PURE__ */ jsx6(
    PanelItemRenderer,
    {
      item,
      onPin,
      onUnpin,
      onRemove,
      onCopy,
      onDownload,
      copyingId,
      renderCard
    },
    item.id
  )) });
}

// src/components/BusinessBreakdownCard.tsx
import { Fragment, jsx as jsx7, jsxs as jsxs6 } from "react/jsx-runtime";

// src/components/AssessmentCard.tsx
import { jsx as jsx8, jsxs as jsxs7 } from "react/jsx-runtime";
var PILLAR_LABELS = {
  digital_presence: "Digital Presence",
  ai_leap: "AI Leap",
  customer_connection: "Customer Connection"
};
function scoreColor(score) {
  if (score >= 80) return "#10B981";
  if (score >= 60) return "#22C55E";
  if (score >= 40) return "#F59E0B";
  return "#EF4444";
}
function gradeLabel(grade) {
  return grade || "?";
}
var SEVERITY_COLORS = {
  critical: "#EF4444",
  warning: "#F59E0B",
  info: "#3B82F6"
};
function AssessmentSummaryCard({ data }) {
  const color = scoreColor(data.overallScore);
  const containerStyle2 = {
    border: "1px solid hsl(var(--border))",
    borderRadius: "8px",
    padding: "16px",
    background: "hsl(var(--card))"
  };
  const headerStyle = {
    display: "flex",
    alignItems: "center",
    gap: "14px",
    marginBottom: "14px"
  };
  const scoreCircleStyle = {
    width: "56px",
    height: "56px",
    borderRadius: "50%",
    border: `3px solid ${color}`,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "20px",
    fontWeight: 700,
    color,
    flexShrink: 0
  };
  const pillarsRowStyle = {
    display: "grid",
    gridTemplateColumns: "repeat(3, 1fr)",
    gap: "8px"
  };
  const pillarMiniStyle = (score) => ({
    padding: "8px",
    borderRadius: "6px",
    background: "hsl(var(--muted))",
    textAlign: "center",
    borderLeft: `3px solid ${scoreColor(score)}`
  });
  return /* @__PURE__ */ jsxs7("div", { style: containerStyle2, children: [
    /* @__PURE__ */ jsxs7("div", { style: headerStyle, children: [
      /* @__PURE__ */ jsx8("div", { style: scoreCircleStyle, children: data.overallScore }),
      /* @__PURE__ */ jsxs7("div", { style: { flex: 1, minWidth: 0 }, children: [
        /* @__PURE__ */ jsx8("div", { style: { fontSize: "14px", fontWeight: 600, color: "hsl(var(--foreground))" }, children: data.businessName || data.domain }),
        /* @__PURE__ */ jsxs7("div", { style: { fontSize: "12px", color: "hsl(var(--muted-foreground))", marginTop: "2px" }, children: [
          data.domain,
          data.partial && /* @__PURE__ */ jsx8("span", { style: { color: "#F59E0B", marginLeft: "6px" }, children: "(partial)" })
        ] }),
        /* @__PURE__ */ jsxs7("div", { style: { fontSize: "11px", color: "hsl(var(--muted-foreground))", marginTop: "2px" }, children: [
          data.recommendationCount,
          " recommendation",
          data.recommendationCount !== 1 ? "s" : ""
        ] })
      ] })
    ] }),
    /* @__PURE__ */ jsx8("div", { style: pillarsRowStyle, children: data.pillars.map((p) => /* @__PURE__ */ jsxs7("div", { style: pillarMiniStyle(p.score), children: [
      /* @__PURE__ */ jsx8("div", { style: { fontSize: "11px", color: "hsl(var(--muted-foreground))", marginBottom: "4px" }, children: PILLAR_LABELS[p.pillar] || p.pillar }),
      /* @__PURE__ */ jsx8("div", { style: { fontSize: "18px", fontWeight: 700, color: scoreColor(p.score) }, children: p.score }),
      /* @__PURE__ */ jsxs7("div", { style: { fontSize: "10px", color: "hsl(var(--muted-foreground))" }, children: [
        gradeLabel(p.grade),
        " ",
        p.gapCount > 0 && `\xB7 ${p.gapCount} gap${p.gapCount > 1 ? "s" : ""}`
      ] })
    ] }, p.pillar)) })
  ] });
}
var SIGNAL_LABELS = {
  website_speed: "Website Speed",
  mobile_friendly: "Mobile Friendly",
  ssl_valid: "SSL Certificate",
  framework_modern: "Modern Framework",
  last_updated: "Last Updated",
  seo_basics: "SEO Basics",
  social_presence: "Social Presence",
  social_activity: "Social Activity",
  geo_readiness: "GEO Readiness",
  ai_search_visibility: "AI Search Visibility",
  structured_data: "Structured Data",
  content_quality: "Content Quality",
  chatbot_present: "AI Chatbot",
  booking_system: "Booking System",
  ordering_system: "Ordering System",
  email_capture: "Email Capture",
  review_response_rate: "Review Response Rate",
  review_response_time: "Response Time",
  contact_methods: "Contact Methods",
  after_hours: "After-Hours Availability",
  social_dm: "Social DM"
};
function PillarDetailCard({ data }) {
  const color = scoreColor(data.score);
  const containerStyle2 = {
    border: "1px solid hsl(var(--border))",
    borderRadius: "8px",
    padding: "16px",
    background: "hsl(var(--card))",
    borderLeft: `3px solid ${color}`
  };
  return /* @__PURE__ */ jsxs7("div", { style: containerStyle2, children: [
    /* @__PURE__ */ jsxs7("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }, children: [
      /* @__PURE__ */ jsxs7("div", { children: [
        /* @__PURE__ */ jsx8("div", { style: { fontSize: "13px", fontWeight: 600, color: "hsl(var(--foreground))" }, children: PILLAR_LABELS[data.pillar] || data.pillar }),
        /* @__PURE__ */ jsx8("div", { style: { fontSize: "11px", color: "hsl(var(--muted-foreground))" }, children: data.domain })
      ] }),
      /* @__PURE__ */ jsxs7("div", { style: { textAlign: "right" }, children: [
        /* @__PURE__ */ jsx8("span", { style: { fontSize: "22px", fontWeight: 700, color }, children: data.score }),
        /* @__PURE__ */ jsx8("span", { style: { fontSize: "12px", color: "hsl(var(--muted-foreground))" }, children: "/100" }),
        /* @__PURE__ */ jsxs7("div", { style: { fontSize: "11px", color: "hsl(var(--muted-foreground))" }, children: [
          "Grade: ",
          gradeLabel(data.grade)
        ] })
      ] })
    ] }),
    /* @__PURE__ */ jsx8("div", { style: { display: "flex", flexDirection: "column", gap: "6px" }, children: data.signals.map((s) => /* @__PURE__ */ jsx8("div", { style: { display: "flex", alignItems: "center", gap: "8px" }, children: /* @__PURE__ */ jsxs7("div", { style: { flex: 1, minWidth: 0 }, children: [
      /* @__PURE__ */ jsxs7("div", { style: { fontSize: "12px", color: "hsl(var(--foreground))", display: "flex", justifyContent: "space-between" }, children: [
        /* @__PURE__ */ jsx8("span", { children: SIGNAL_LABELS[s.signal] || s.signal }),
        /* @__PURE__ */ jsx8("span", { style: { color: scoreColor(s.score), fontWeight: 600 }, children: s.score })
      ] }),
      /* @__PURE__ */ jsx8("div", { style: { height: "4px", background: "hsl(var(--muted))", borderRadius: "2px", marginTop: "3px", overflow: "hidden" }, children: /* @__PURE__ */ jsx8("div", { style: { height: "100%", width: `${Math.min(s.score, 100)}%`, background: scoreColor(s.score), borderRadius: "2px", transition: "width 0.3s" } }) })
    ] }) }, s.signal)) })
  ] });
}
function GapRecommendationCard({ data }) {
  const sevColor = SEVERITY_COLORS[data.severity] || SEVERITY_COLORS.info;
  const containerStyle2 = {
    border: "1px solid hsl(var(--border))",
    borderRadius: "8px",
    padding: "12px 16px",
    background: "hsl(var(--card))",
    borderLeft: `3px solid ${sevColor}`
  };
  const badgeStyle = {
    display: "inline-block",
    padding: "1px 6px",
    fontSize: "10px",
    fontWeight: 600,
    borderRadius: "3px",
    color: "#fff",
    background: sevColor,
    textTransform: "uppercase",
    letterSpacing: "0.5px"
  };
  return /* @__PURE__ */ jsxs7("div", { style: containerStyle2, children: [
    /* @__PURE__ */ jsxs7("div", { style: { display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }, children: [
      /* @__PURE__ */ jsx8("span", { style: badgeStyle, children: data.severity }),
      /* @__PURE__ */ jsx8("span", { style: { fontSize: "12px", fontWeight: 600, color: "hsl(var(--foreground))" }, children: SIGNAL_LABELS[data.signal] || data.signal }),
      /* @__PURE__ */ jsxs7("span", { style: { fontSize: "11px", color: scoreColor(data.currentScore), fontWeight: 600, marginLeft: "auto" }, children: [
        data.currentScore,
        "/100"
      ] })
    ] }),
    data.impact && /* @__PURE__ */ jsx8("div", { style: { fontSize: "12px", color: "hsl(var(--muted-foreground))", lineHeight: 1.4, marginBottom: "4px" }, children: data.impact }),
    data.offering && /* @__PURE__ */ jsxs7("div", { style: { fontSize: "11px", color: "hsl(var(--primary))", fontWeight: 500 }, children: [
      "Recommended: ",
      data.offering
    ] }),
    /* @__PURE__ */ jsxs7("div", { style: { fontSize: "10px", color: "hsl(var(--muted-foreground))", marginTop: "4px" }, children: [
      PILLAR_LABELS[data.pillar] || data.pillar,
      " \xB7 ",
      data.domain
    ] })
  ] });
}

// src/components/TwoTierPills.tsx
import { useState as useState5, useCallback, useRef as useRef2 } from "react";
import { jsx as jsx9 } from "react/jsx-runtime";
var RADIUS_MAP = {
  sm: "4px",
  md: "8px",
  lg: "12px",
  full: "9999px"
};
function ActionPill2({
  pill,
  theme = { variant: "solid", colorScheme: "primary", borderRadius: "md" },
  disabled = false,
  loading = false,
  onAction
}) {
  const [isHovered, setIsHovered] = useState5(false);
  const isDisabled = disabled || loading;
  const baseStyle = {
    padding: "8px 16px",
    fontSize: "13px",
    fontWeight: 600,
    borderRadius: RADIUS_MAP[theme.borderRadius],
    cursor: isDisabled ? "not-allowed" : "pointer",
    minHeight: "44px",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    transition: "all 0.2s",
    whiteSpace: "nowrap",
    opacity: isDisabled ? 0.6 : 1,
    border: theme.variant === "outline" ? "2px solid #111827" : "none",
    background: theme.variant === "solid" ? isHovered ? "#1f2937" : "#111827" : isHovered ? "#f3f4f6" : "transparent",
    color: theme.variant === "solid" ? "#ffffff" : "#111827",
    boxShadow: isHovered && !isDisabled ? "0 2px 8px rgba(0,0,0,0.12)" : "none"
  };
  return /* @__PURE__ */ jsx9(
    "button",
    {
      type: "button",
      style: baseStyle,
      disabled: isDisabled,
      onClick: () => !isDisabled && onAction(pill),
      onMouseEnter: () => setIsHovered(true),
      onMouseLeave: () => setIsHovered(false),
      children: loading ? "..." : pill.label
    }
  );
}
function MessagePill({
  pill,
  theme = { variant: "ghost", colorScheme: "neutral", borderRadius: "full" },
  disabled = false,
  onMessage
}) {
  const [isHovered, setIsHovered] = useState5(false);
  const baseStyle = {
    padding: "6px 14px",
    fontSize: "13px",
    fontWeight: 400,
    borderRadius: RADIUS_MAP[theme.borderRadius],
    cursor: disabled ? "not-allowed" : "pointer",
    minHeight: "36px",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    transition: "all 0.2s",
    whiteSpace: "nowrap",
    opacity: disabled ? 0.5 : 1,
    border: theme.variant === "subtle" ? "1px solid #e5e7eb" : "none",
    background: theme.variant === "subtle" ? isHovered ? "#f3f4f6" : "#f9fafb" : isHovered ? "#f3f4f6" : "transparent",
    color: "#6b7280"
  };
  return /* @__PURE__ */ jsx9(
    "button",
    {
      type: "button",
      style: baseStyle,
      disabled,
      onClick: () => !disabled && onMessage(pill),
      onMouseEnter: () => setIsHovered(true),
      onMouseLeave: () => setIsHovered(false),
      children: pill.label
    }
  );
}
function PillContainer({
  pills,
  actionTheme,
  messageTheme,
  onAction,
  onMessage,
  debounceMs = 500
}) {
  const [processingAction, setProcessingAction] = useState5(null);
  const debounceRef = useRef2(null);
  const handleAction = useCallback(
    (pill) => {
      if (processingAction) return;
      setProcessingAction(pill.label);
      onAction(pill);
      debounceRef.current = setTimeout(() => {
        setProcessingAction(null);
      }, debounceMs);
    },
    [processingAction, onAction, debounceMs]
  );
  if (!pills || pills.length === 0) return null;
  const containerStyle2 = {
    display: "flex",
    flexWrap: "wrap",
    gap: "8px",
    marginTop: "8px"
  };
  return /* @__PURE__ */ jsx9("div", { style: containerStyle2, children: pills.map((pill, index) => {
    const key = `${pill.type}-${pill.label}-${index}`;
    if (pill.type === "action") {
      return /* @__PURE__ */ jsx9(
        ActionPill2,
        {
          pill,
          theme: actionTheme,
          loading: processingAction === pill.label,
          disabled: processingAction !== null,
          onAction: handleAction
        },
        key
      );
    }
    return /* @__PURE__ */ jsx9(
      MessagePill,
      {
        pill,
        theme: messageTheme,
        disabled: processingAction !== null,
        onMessage
      },
      key
    );
  }) });
}

// src/hooks/usePanel.ts
import { useState as useState6, useCallback as useCallback2 } from "react";
var panelReducers = {
  evict(current, maxItems, defaultIds) {
    if (current.length <= maxItems) return current;
    const evictable = current.filter((item) => !item.pinned && !defaultIds.has(item.id)).sort((a, b) => a.timestamp - b.timestamp);
    if (evictable.length === 0) return current;
    const toEvict = evictable[0];
    return current.filter((item) => item.id !== toEvict.id);
  },
  push(items, newItem, maxItems, defaultIds) {
    const filtered = items.filter((p) => p.id !== newItem.id);
    const next = [newItem, ...filtered];
    return panelReducers.evict(next, maxItems, defaultIds);
  },
  update(items, itemId, updates) {
    const exists = items.some((item) => item.id === itemId);
    if (!exists) return items;
    return items.map(
      (item) => item.id === itemId ? { ...item, ...updates } : item
    );
  },
  remove(items, itemId) {
    return items.filter((item) => item.id !== itemId);
  },
  pin(items, itemId) {
    return items.map(
      (item) => item.id === itemId ? { ...item, pinned: true } : item
    );
  },
  unpin(items, itemId) {
    return items.map(
      (item) => item.id === itemId ? { ...item, pinned: false } : item
    );
  }
};
function usePanel(options = {}) {
  const { maxItems = 10, defaultItems = [] } = options;
  const defaultIds = new Set(defaultItems.map((d) => d.id));
  const [items, setItems] = useState6(() => [...defaultItems]);
  const pushItem = useCallback2(
    (item) => {
      setItems((prev) => panelReducers.push(prev, item, maxItems, defaultIds));
    },
    [maxItems, defaultIds]
  );
  const updateItem = useCallback2(
    (itemId, updates) => {
      setItems((prev) => panelReducers.update(prev, itemId, updates));
    },
    []
  );
  const removeItem = useCallback2(
    (itemId) => {
      setItems((prev) => panelReducers.remove(prev, itemId));
    },
    []
  );
  const pinItem = useCallback2(
    (itemId) => {
      setItems((prev) => panelReducers.pin(prev, itemId));
    },
    []
  );
  const unpinItem = useCallback2(
    (itemId) => {
      setItems((prev) => panelReducers.unpin(prev, itemId));
    },
    []
  );
  const clearItems = useCallback2(() => {
    setItems([...defaultItems]);
  }, [defaultItems]);
  return {
    items,
    pushItem,
    updateItem,
    removeItem,
    pinItem,
    unpinItem,
    clearItems
  };
}

// src/hooks/usePanelExport.ts
import { useState as useState7, useCallback as useCallback3 } from "react";

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

// src/hooks/usePanelExport.ts
function usePanelExport() {
  const [copying, setCopying] = useState7(null);
  const copyItem = useCallback3(async (item) => {
    const text = formatPanelItem(item);
    const ok = await copyToClipboard(text);
    if (ok) {
      setCopying(item.id);
      setTimeout(() => setCopying(null), 1500);
    }
  }, []);
  const downloadItem = useCallback3((item) => {
    if (hasDownloadableHtml(item)) {
      const html = getHtmlContent(item);
      const blob2 = new Blob([html], { type: "text/html" });
      const filename2 = `${item.type}-${item.id}.html`;
      downloadBlob(blob2, filename2);
      return;
    }
    if (hasDownloadableImage(item)) {
      const url = getImageUrl(item);
      const ext = url.includes(".png") ? "png" : "jpg";
      const filename2 = `${item.type}-${item.id}.${ext}`;
      void downloadImageUrl(url, filename2);
      return;
    }
    const text = formatPanelItem(item);
    const filename = getPanelItemFilename(item);
    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    downloadBlob(blob, filename);
  }, []);
  const downloadItemImage = useCallback3(
    async (item) => {
      const url = getImageUrl(item);
      if (!url) return;
      const ext = url.includes(".png") ? "png" : "jpg";
      const filename = `${item.type}-${item.id}.${ext}`;
      await downloadImageUrl(url, filename);
    },
    []
  );
  const downloadItemHtml = useCallback3((item) => {
    const html = getHtmlContent(item);
    if (!html) return;
    const blob = new Blob([html], { type: "text/html" });
    const filename = `${item.type}-${item.id}.html`;
    downloadBlob(blob, filename);
  }, []);
  return { copyItem, downloadItem, downloadItemImage, downloadItemHtml, copying };
}

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

// src/validation/validate-record-id.ts
var UUID_V4_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
var CUID_REGEX = /^c[a-z0-9]{23,}$/;
function validateRecordId(id) {
  if (typeof id !== "string") return false;
  if (id.length === 0) return false;
  return UUID_V4_REGEX.test(id) || CUID_REGEX.test(id);
}

// src/validation/build-card.ts
var mapperRegistry = /* @__PURE__ */ new Map();
function registerCardMapper(type, mapper) {
  mapperRegistry.set(type, mapper);
}
var noopLogger = {
  onDrop: () => {
  },
  onRender: () => {
  }
};
async function buildCardFromDB(type, recordId, tenantId, queryFn, logger = noopLogger) {
  const timestamp = Date.now();
  if (!validateRecordId(recordId)) {
    const dropLog = {
      event: "card-validation-drop",
      cardType: type,
      recordId,
      reason: "invalid_record_id",
      tenantId,
      timestamp
    };
    logger.onDrop(dropLog);
    return { success: false, reason: "invalid_record_id", type, recordId };
  }
  let record;
  try {
    record = await queryFn(type, recordId, tenantId);
  } catch (error) {
    const dropLog = {
      event: "card-validation-drop",
      cardType: type,
      recordId,
      reason: "query_failed",
      tenantId,
      timestamp,
      error: error instanceof Error ? error.message : String(error)
    };
    logger.onDrop(dropLog);
    return { success: false, reason: "query_failed", type, recordId };
  }
  if (!record) {
    const dropLog = {
      event: "card-validation-drop",
      cardType: type,
      recordId,
      reason: "record_not_found",
      tenantId,
      timestamp
    };
    logger.onDrop(dropLog);
    return { success: false, reason: "record_not_found", type, recordId };
  }
  const mapper = mapperRegistry.get(type);
  if (!mapper) {
    const dropLog = {
      event: "card-validation-drop",
      cardType: type,
      recordId,
      reason: "mapping_error",
      tenantId,
      timestamp,
      error: `No mapper registered for card type: ${type}`
    };
    logger.onDrop(dropLog);
    return { success: false, reason: "mapping_error", type, recordId };
  }
  let card;
  try {
    card = mapper(record, tenantId);
  } catch (error) {
    const dropLog = {
      event: "card-validation-drop",
      cardType: type,
      recordId,
      reason: "mapping_error",
      tenantId,
      timestamp,
      error: error instanceof Error ? error.message : String(error)
    };
    logger.onDrop(dropLog);
    return { success: false, reason: "mapping_error", type, recordId };
  }
  const renderLog = {
    event: "card-rendered",
    cardType: type,
    recordId,
    source: "db",
    timestamp
  };
  logger.onRender(renderLog);
  return { success: true, card };
}
async function buildCardsFromDB(items, tenantId, queryFn, logger = noopLogger) {
  const results = await Promise.all(
    items.map(
      ({ type, recordId }) => buildCardFromDB(type, recordId, tenantId, queryFn, logger)
    )
  );
  return results.filter((r) => r.success).map((r) => r.card);
}

// src/validation/validate-action-payload.ts
async function validateActionPayload(payload, tenantId, queryFn) {
  const { recordId, cardType } = payload;
  if (!validateRecordId(recordId)) {
    return {
      valid: false,
      error: "Invalid record reference. Please try again."
    };
  }
  try {
    const record = await queryFn(cardType, recordId, tenantId);
    if (!record) {
      return {
        valid: false,
        error: "The referenced item no longer exists. It may have been removed."
      };
    }
  } catch {
    return {
      valid: false,
      error: "Unable to verify the referenced item. Please try again later."
    };
  }
  return { valid: true, recordId, cardType };
}

// src/validation/analytics.ts
function toCardRenderedEvent(log, agentType, tenantId) {
  return {
    event: "card_rendered",
    properties: {
      cardType: log.cardType,
      agentType,
      recordId: log.recordId,
      tenantId,
      source: "db",
      timestamp: log.timestamp
    }
  };
}
function toCardDroppedEvent(log, agentType) {
  return {
    event: "card_dropped",
    properties: {
      cardType: log.cardType,
      agentType,
      reason: log.reason,
      recordId: log.recordId,
      tenantId: log.tenantId ?? "",
      timestamp: log.timestamp,
      error: log.error
    }
  };
}

// src/validation/config.ts
var DEFAULT_AGENT_CARD_CONFIG = {
  enablePanel: true,
  panelPosition: "right",
  panelDefaultItems: [],
  maxPanelItems: 10,
  actionPillStyle: {
    variant: "solid",
    colorScheme: "primary",
    borderRadius: "md"
  },
  messagePillStyle: {
    variant: "ghost",
    colorScheme: "neutral",
    borderRadius: "full"
  },
  enableProgressiveRendering: true,
  enabled: true
};

// src/validation/demo-pills.ts
var CAMPAIGN_PHASES = [
  {
    phase: "brand-analysis",
    pills: [
      { type: "action", label: "Analyze my brand", payload: { action: "analyze_brand" } },
      { type: "message", label: "What info do you need?", payload: { text: "What info do you need?" } }
    ]
  },
  {
    phase: "recipient-generation",
    pills: [
      { type: "action", label: "Generate recipients", payload: { action: "generate_recipients" } },
      { type: "message", label: "How many recipients?", payload: { text: "How many recipients should I target?" } }
    ]
  },
  {
    phase: "email-drafting",
    pills: [
      { type: "action", label: "Draft emails", payload: { action: "draft_emails" } },
      { type: "message", label: "Change the tone", payload: { text: "Can you make the tone more casual?" } }
    ]
  },
  {
    phase: "review",
    pills: [
      { type: "action", label: "Review campaign", payload: { action: "list_campaigns" } },
      { type: "message", label: "Show me a preview", payload: { text: "Show me a preview of the first email" } }
    ]
  }
];
var ENGAGEMENT_PHASES = [
  {
    phase: "persona-selection",
    pills: [
      { type: "action", label: "View subscribers", payload: { action: "get_subscribers" } },
      { type: "message", label: "What personas are available?", payload: { text: "What personas are available?" } }
    ]
  },
  {
    phase: "subject-lines",
    pills: [
      { type: "action", label: "Browse templates", payload: { action: "list_newsletters" } },
      { type: "message", label: "Make them catchier", payload: { text: "Can you make them catchier?" } }
    ]
  },
  {
    phase: "content-generation",
    pills: [
      { type: "action", label: "Write newsletter", payload: { action: "generate_newsletter" } },
      { type: "message", label: "Add a section", payload: { text: "Can you add a section about upcoming events?" } }
    ]
  },
  {
    phase: "review",
    pills: [
      { type: "action", label: "Preview email", payload: { action: "preview_email" } },
      { type: "message", label: "Schedule for Monday", payload: { text: "Schedule this for Monday morning" } }
    ]
  }
];
var SOCIAL_PHASES = [
  {
    phase: "brand-analysis",
    pills: [
      { type: "action", label: "Analyze brand voice", payload: { action: "get_brand_voice" } },
      { type: "message", label: "What will you analyze?", payload: { text: "What aspects of my brand will you analyze?" } }
    ]
  },
  {
    phase: "content-generation",
    pills: [
      { type: "action", label: "Generate posts", payload: { action: "generate_linkedin_posts" } },
      { type: "message", label: "Focus on thought leadership", payload: { text: "Focus on thought leadership content" } }
    ]
  },
  {
    phase: "review",
    pills: [
      { type: "action", label: "Review all posts", payload: { action: "list_content" } },
      { type: "message", label: "Adjust Day 3", payload: { text: "Can you adjust the Day 3 post?" } }
    ]
  }
];
var MARKETING_PHASES = [
  {
    phase: "brand-analysis",
    pills: [
      { type: "action", label: "Analyze my brand", payload: { action: "analyze_brand" } },
      { type: "message", label: "What do you need?", payload: { text: "What information do you need to get started?" } }
    ]
  },
  {
    phase: "research",
    pills: [
      { type: "action", label: "Research pain points", payload: { action: "mine_pain_points" } },
      { type: "message", label: "Research competitors", payload: { text: "Research competitor ads" } }
    ]
  },
  {
    phase: "creative",
    pills: [
      { type: "action", label: "Generate ad briefs", payload: { action: "generate_brief" } },
      { type: "message", label: "Create ad images", payload: { text: "Create ad images for my campaign" } }
    ]
  },
  {
    phase: "review",
    pills: [
      { type: "action", label: "Campaign summary", payload: { action: "synthesize_campaign" } },
      { type: "message", label: "Export campaign", payload: { text: "Export my campaign assets" } }
    ]
  }
];
var PIDGIE_PHASES = [
  {
    phase: "greeting",
    pills: [
      { type: "message", label: "What services do you offer?", payload: { text: "What services do you offer?" } },
      { type: "message", label: "What are your hours?", payload: { text: "What are your hours?" } }
    ]
  },
  {
    phase: "exploration",
    pills: [
      { type: "message", label: "Show me products", payload: { text: "Can you show me your products?" } },
      { type: "message", label: "Upcoming events?", payload: { text: "Do you have any upcoming events?" } }
    ]
  }
];
var AGENT_PHASES = {
  campaign: CAMPAIGN_PHASES,
  engagement: ENGAGEMENT_PHASES,
  social: SOCIAL_PHASES,
  pidgie: PIDGIE_PHASES,
  marketing: MARKETING_PHASES,
  "lead-scout": [],
  reputation: []
};
function getDemoPills(agentType, phase) {
  const phases = AGENT_PHASES[agentType];
  if (!phases) return [];
  const phaseConfig = phases.find((p) => p.phase === phase);
  return (phaseConfig == null ? void 0 : phaseConfig.pills) ?? [];
}
function getAgentPhases(agentType) {
  const phases = AGENT_PHASES[agentType];
  if (!phases) return [];
  return phases.map((p) => p.phase);
}
function getDefaultActionPillTheme() {
  return { variant: "solid", colorScheme: "primary", borderRadius: "md" };
}
function getDefaultMessagePillTheme() {
  return { variant: "ghost", colorScheme: "neutral", borderRadius: "full" };
}

// src/validation/progressive-emitter.ts
var DEFAULT_LATENCY_THRESHOLD_MS = 1500;
function createProgressiveEmitter(writer, queryFn, tenantId, logger, options) {
  const threshold = (options == null ? void 0 : options.latencyThresholdMs) ?? DEFAULT_LATENCY_THRESHOLD_MS;
  const emitted = [];
  let dropped = 0;
  const startTime = Date.now();
  let firstCardTime = null;
  let fellBackToBatch = false;
  let progressiveCount = 0;
  let batchedCount = 0;
  const batchQueue = [];
  async function emitCard(card) {
    if (fellBackToBatch) {
      batchQueue.push(card);
      batchedCount++;
      return;
    }
    await writer.cards([card], "progressive");
    progressiveCount++;
    if (firstCardTime === null) {
      firstCardTime = Date.now();
      const latency = firstCardTime - startTime;
      if (latency > threshold) {
        fellBackToBatch = true;
      }
    }
  }
  return {
    async emit(type, recordId) {
      const result = await buildCardFromDB(type, recordId, tenantId, queryFn, logger);
      if (!result.success) {
        dropped++;
        return false;
      }
      const card = result.card;
      await emitCard({
        type: card.type,
        id: card.id,
        data: card.data,
        source: card.source
      });
      emitted.push(type);
      return true;
    },
    async emitDirect(card) {
      await emitCard({
        type: card.type,
        id: card.id,
        data: card.data,
        source: card.source
      });
      emitted.push(card.type);
    },
    getSummary() {
      const now = Date.now();
      if (batchQueue.length > 0) {
      }
      return {
        emitted: emitted.length,
        dropped,
        cardTypes: [...emitted],
        perf: {
          firstCardLatencyMs: firstCardTime !== null ? firstCardTime - startTime : null,
          totalMs: now - startTime,
          fellBackToBatch,
          progressiveCount,
          batchedCount
        }
      };
    },
    async flushBatch() {
      if (batchQueue.length === 0) return;
      await writer.cards([...batchQueue], "immediate");
      batchQueue.length = 0;
    }
  };
}

// src/validation/card-labels.ts
var DEFAULT_CARD_LABELS = {
  businessBreakdown: {
    services: "Services",
    products: "Products",
    todaysHours: "Today's Hours",
    contact: "Contact",
    faqAvailable: "{count} FAQ available",
    faqsAvailable: "{count} FAQs available",
    closedToday: "Closed today",
    emptyState: "Business details will appear here as data loads",
    moreItems: "+{count} more"
  },
  chrome: {
    pinToPanel: "Pin to panel",
    unpinFromPanel: "Unpin from panel",
    removeFromPanel: "Remove from panel",
    emptyPanel: "Artifacts will appear here",
    loading: "Loading...",
    error: "Something went wrong",
    retry: "Retry"
  }
};
var FR_CARD_LABELS = {
  businessBreakdown: {
    services: "Services",
    products: "Produits",
    todaysHours: "Horaires du jour",
    contact: "Contact",
    faqAvailable: "{count} FAQ disponible",
    faqsAvailable: "{count} FAQs disponibles",
    closedToday: "Ferm\xE9 aujourd'hui",
    emptyState: "Les d\xE9tails de l'entreprise appara\xEEtront ici au chargement",
    moreItems: "+{count} de plus"
  },
  chrome: {
    pinToPanel: "\xC9pingler au panneau",
    unpinFromPanel: "D\xE9tacher du panneau",
    removeFromPanel: "Retirer du panneau",
    emptyPanel: "Les artefacts appara\xEEtront ici",
    loading: "Chargement...",
    error: "Quelque chose s'est mal pass\xE9",
    retry: "R\xE9essayer"
  }
};
var AR_CARD_LABELS = {
  businessBreakdown: {
    services: "\u0627\u0644\u062E\u062F\u0645\u0627\u062A",
    products: "\u0627\u0644\u0645\u0646\u062A\u062C\u0627\u062A",
    todaysHours: "\u0633\u0627\u0639\u0627\u062A \u0627\u0644\u0639\u0645\u0644 \u0627\u0644\u064A\u0648\u0645",
    contact: "\u0627\u0644\u062A\u0648\u0627\u0635\u0644",
    faqAvailable: "{count} \u0633\u0624\u0627\u0644 \u0634\u0627\u0626\u0639 \u0645\u062A\u0627\u062D",
    faqsAvailable: "{count} \u0623\u0633\u0626\u0644\u0629 \u0634\u0627\u0626\u0639\u0629 \u0645\u062A\u0627\u062D\u0629",
    closedToday: "\u0645\u063A\u0644\u0642 \u0627\u0644\u064A\u0648\u0645",
    emptyState: "\u0633\u062A\u0638\u0647\u0631 \u062A\u0641\u0627\u0635\u064A\u0644 \u0627\u0644\u0646\u0634\u0627\u0637 \u0627\u0644\u062A\u062C\u0627\u0631\u064A \u0647\u0646\u0627 \u0639\u0646\u062F \u062A\u062D\u0645\u064A\u0644 \u0627\u0644\u0628\u064A\u0627\u0646\u0627\u062A",
    moreItems: "+{count} \u0625\u0636\u0627\u0641\u064A"
  },
  chrome: {
    pinToPanel: "\u062A\u062B\u0628\u064A\u062A \u0641\u064A \u0627\u0644\u0644\u0648\u062D\u0629",
    unpinFromPanel: "\u0625\u0644\u063A\u0627\u0621 \u0627\u0644\u062A\u062B\u0628\u064A\u062A \u0645\u0646 \u0627\u0644\u0644\u0648\u062D\u0629",
    removeFromPanel: "\u0625\u0632\u0627\u0644\u0629 \u0645\u0646 \u0627\u0644\u0644\u0648\u062D\u0629",
    emptyPanel: "\u0633\u062A\u0638\u0647\u0631 \u0627\u0644\u0639\u0646\u0627\u0635\u0631 \u0647\u0646\u0627",
    loading: "\u062C\u0627\u0631\u064D \u0627\u0644\u062A\u062D\u0645\u064A\u0644...",
    error: "\u062D\u062F\u062B \u062E\u0637\u0623 \u0645\u0627",
    retry: "\u0625\u0639\u0627\u062F\u0629 \u0627\u0644\u0645\u062D\u0627\u0648\u0644\u0629"
  }
};
var LABEL_REGISTRY = {
  en: DEFAULT_CARD_LABELS,
  fr: FR_CARD_LABELS,
  ar: AR_CARD_LABELS
};
function getCardLabels(locale) {
  return LABEL_REGISTRY[locale] ?? DEFAULT_CARD_LABELS;
}
function interpolateLabel(template, values) {
  return template.replace(/\{(\w+)\}/g, (_, key) => {
    return key in values ? String(values[key]) : `{${key}}`;
  });
}
export {
  AR_CARD_LABELS,
  ActionPill2 as ActionPill,
  ActionPills,
  AgentProgressCard,
  AssessmentSummaryCard,
  CardImage,
  CardList,
  CardRenderer,
  DEFAULT_AGENT_CARD_CONFIG,
  DEFAULT_CARD_CONFIG,
  DEFAULT_CARD_LABELS,
  DEFAULT_CARD_THEME,
  FR_CARD_LABELS,
  GapRecommendationCard,
  MIGRATION_FALLBACK_EVENT,
  MessagePill,
  PanelItemRenderer,
  PillContainer,
  PillarDetailCard,
  SharedPanel,
  buildCardFromDB,
  buildCardsFromDB,
  copyToClipboard,
  createProgressiveEmitter,
  downloadBlob,
  downloadImageUrl,
  formatPanelItem,
  getAgentPhases,
  getCardLabels,
  getDefaultActionPillTheme,
  getDefaultMessagePillTheme,
  getDemoPills,
  getHtmlContent,
  getImageUrl,
  getPanelItemFilename,
  getStalenessLabel,
  hasDownloadableHtml,
  hasDownloadableImage,
  interpolateLabel,
  isCardToolMigrationEnabled,
  parseMigrationAwareResponse,
  parseStructuredResponse,
  registerCardMapper,
  toCardDroppedEvent,
  toCardRenderedEvent,
  toMigrationFallbackEvent,
  usePanel,
  usePanelExport,
  validateActionPayload,
  validateRecordId
};
//# sourceMappingURL=index.js.map