"use client";

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
var DEFAULT_LABELS = {
  services: "Services",
  products: "Products",
  todaysHours: "Today's Hours",
  contact: "Contact",
  faqAvailable: "{count} FAQ available",
  faqsAvailable: "{count} FAQs available",
  closedToday: "Closed today",
  emptyState: "Business data not yet captured",
  moreItems: "+{count} more"
};
function interpolate(template, values) {
  return template.replace(/\{(\w+)\}/g, (_, key) => {
    return key in values ? String(values[key]) : `{${key}}`;
  });
}
var notCapturedStyle = {
  color: "#9ca3af",
  fontStyle: "italic",
  fontSize: "12px"
};
function BusinessBreakdownCard({ data, labels: labelOverrides }) {
  const labels = { ...DEFAULT_LABELS, ...labelOverrides };
  const containerStyle2 = {
    padding: "12px",
    fontSize: "13px",
    lineHeight: 1.6,
    color: "#374151"
  };
  const headingStyle = {
    fontSize: "14px",
    fontWeight: 600,
    color: "#111827",
    marginBottom: "8px"
  };
  const sectionStyle = {
    marginBottom: "12px"
  };
  const labelStyle2 = {
    fontSize: "11px",
    fontWeight: 600,
    color: "#6b7280",
    textTransform: "uppercase",
    letterSpacing: "0.05em",
    marginBottom: "4px"
  };
  const chipStyle = {
    display: "inline-block",
    padding: "2px 8px",
    fontSize: "12px",
    borderRadius: "4px",
    marginRight: "4px",
    marginBottom: "4px"
  };
  const availableChipStyle = {
    ...chipStyle,
    background: "#ecfdf5",
    color: "#065f46"
  };
  const unavailableChipStyle = {
    ...chipStyle,
    background: "#fef2f2",
    color: "#991b1b"
  };
  const hasServices = data.services && data.services.length > 0;
  const hasProducts = data.products && data.products.length > 0;
  const hasHours = data.hours != null;
  const hasContact = Boolean(data.contactEmail || data.contactPhone);
  const hasFaq = data.faqCount != null && data.faqCount > 0;
  const isFullyEmpty = !hasServices && !hasProducts && !hasHours && !hasContact && !hasFaq;
  return /* @__PURE__ */ jsxs6("div", { style: containerStyle2, children: [
    /* @__PURE__ */ jsx7("div", { style: headingStyle, children: data.businessName }),
    /* @__PURE__ */ jsx7("div", { style: { ...chipStyle, background: "#f3f4f6", color: "#374151", marginBottom: "12px" }, children: data.category }),
    isFullyEmpty && /* @__PURE__ */ jsx7("div", { style: notCapturedStyle, children: labels.emptyState }),
    !isFullyEmpty && /* @__PURE__ */ jsxs6("div", { style: sectionStyle, children: [
      /* @__PURE__ */ jsx7("div", { style: labelStyle2, children: labels.services }),
      hasServices ? /* @__PURE__ */ jsx7("div", { children: data.services.map((s) => /* @__PURE__ */ jsx7(
        "span",
        {
          style: s.available ? availableChipStyle : unavailableChipStyle,
          children: s.name
        },
        s.name
      )) }) : /* @__PURE__ */ jsx7("div", { style: notCapturedStyle, children: "\u2014" })
    ] }),
    !isFullyEmpty && /* @__PURE__ */ jsxs6("div", { style: sectionStyle, children: [
      /* @__PURE__ */ jsx7("div", { style: labelStyle2, children: labels.products }),
      hasProducts ? /* @__PURE__ */ jsxs6("div", { style: { display: "flex", flexDirection: "column", gap: "2px" }, children: [
        data.products.slice(0, 5).map((p) => /* @__PURE__ */ jsxs6(
          "div",
          {
            style: { display: "flex", justifyContent: "space-between" },
            children: [
              /* @__PURE__ */ jsx7("span", { children: p.name }),
              /* @__PURE__ */ jsx7("span", { style: { fontWeight: 500 }, children: new Intl.NumberFormat("en-US", {
                style: "currency",
                currency: p.currency
              }).format(p.price) })
            ]
          },
          p.name
        )),
        data.products.length > 5 && /* @__PURE__ */ jsx7("span", { style: { fontSize: "12px", color: "#9ca3af" }, children: interpolate(labels.moreItems, { count: data.products.length - 5 }) })
      ] }) : /* @__PURE__ */ jsx7("div", { style: notCapturedStyle, children: "\u2014" })
    ] }),
    !isFullyEmpty && /* @__PURE__ */ jsxs6("div", { style: sectionStyle, children: [
      /* @__PURE__ */ jsx7("div", { style: labelStyle2, children: labels.todaysHours }),
      hasHours ? /* @__PURE__ */ jsx7("div", { children: data.hours.today ?? /* @__PURE__ */ jsx7("span", { style: notCapturedStyle, children: labels.closedToday }) }) : /* @__PURE__ */ jsx7("div", { style: notCapturedStyle, children: "\u2014" })
    ] }),
    !isFullyEmpty && /* @__PURE__ */ jsxs6("div", { style: sectionStyle, children: [
      /* @__PURE__ */ jsx7("div", { style: labelStyle2, children: labels.contact }),
      hasContact ? /* @__PURE__ */ jsxs6(Fragment, { children: [
        data.contactEmail && /* @__PURE__ */ jsx7("div", { children: data.contactEmail }),
        data.contactPhone && /* @__PURE__ */ jsx7("div", { children: data.contactPhone })
      ] }) : /* @__PURE__ */ jsx7("div", { style: notCapturedStyle, children: "\u2014" })
    ] }),
    hasFaq && /* @__PURE__ */ jsx7("div", { style: { fontSize: "12px", color: "#9ca3af" }, children: interpolate(
      data.faqCount === 1 ? labels.faqAvailable : labels.faqsAvailable,
      { count: data.faqCount }
    ) })
  ] });
}

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
export {
  ActionPill2 as ActionPill,
  ActionPills,
  AgentProgressCard,
  AssessmentSummaryCard,
  BusinessBreakdownCard,
  CardImage,
  CardList,
  CardRenderer,
  GapRecommendationCard,
  MessagePill,
  PanelItemRenderer,
  PillContainer,
  PillarDetailCard,
  SharedPanel
};
//# sourceMappingURL=index.js.map