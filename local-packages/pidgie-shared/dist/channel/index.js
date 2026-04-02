// src/channel/index.ts
function suggestionsToWhatsApp(suggestions, bodyText = "How can I help?") {
  if (!suggestions || suggestions.length === 0) return null;
  if (suggestions.length <= 3) {
    return {
      type: "button",
      body: { text: bodyText },
      action: {
        buttons: suggestions.map((s, i) => ({
          type: "reply",
          reply: { id: String(i), title: s.slice(0, 20) }
        }))
      }
    };
  }
  return {
    type: "list",
    body: { text: bodyText },
    action: {
      button: "Options",
      sections: [{
        title: "Suggestions",
        rows: suggestions.slice(0, 10).map((s, i) => ({
          id: String(i),
          title: s.slice(0, 24),
          description: s.length > 24 ? s.slice(0, 72) : void 0
        }))
      }]
    }
  };
}
function convertSuggestionsForChannel(suggestions, channel, bodyText) {
  if (channel === "web") return suggestions;
  return suggestionsToWhatsApp(suggestions, bodyText);
}
export {
  convertSuggestionsForChannel,
  suggestionsToWhatsApp
};
//# sourceMappingURL=index.js.map