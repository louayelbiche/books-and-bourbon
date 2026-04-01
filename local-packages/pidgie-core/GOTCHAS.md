# BIB Pidgie - Gotchas

Common pitfalls and how to avoid them.

---

## 1. Gemini systemInstruction Format

**Symptom:** `400 Bad Request` error with message about invalid `system_instruction`

**Cause:** Passing a string instead of a Content object to `systemInstruction`

**Fix:**
```typescript
// Wrong
systemInstruction: "Your prompt here"

// Correct
systemInstruction: {
  role: 'user',
  parts: [{ text: "Your prompt here" }],
}
```

---

## 2. CORS Blocking on Development Ports

**Symptom:** Chat works via curl but fails in browser with "Origin not allowed"

**Cause:** Running dev server on non-standard port (e.g., 3001) that's not in CORS whitelist

**Fix:** Add all development ports to allowed origins:
```typescript
const ALLOWED_ORIGINS = [
  'https://production.com',
  'http://localhost:3000',
  'http://localhost:3001',  // Add this!
  'http://localhost:3002',
];
```

---

## 3. React Infinite Loop on Language Change

**Symptom:** "Maximum update depth exceeded" error, browser freezes

**Cause:** Including `messages` array in useEffect dependencies while also calling `setMessages`

**Fix:** Remove `messages` from dependencies, use functional update:
```typescript
// Wrong
useEffect(() => {
  if (messages[0]?.id === 'greeting') {
    setMessages([...]);
  }
}, [messages]); // Causes infinite loop!

// Correct
useEffect(() => {
  setMessages(prev => {
    if (prev[0]?.id === 'greeting') {
      return [...];
    }
    return prev;
  });
}, [lang]); // Only trigger on lang change
```

---

## 4. Next.js 16 Turbopack + Local Package Links

**Symptom:** `Module not found: Can't resolve '@runwell/pidgie-core'` during build

**Cause:** Turbopack doesn't handle `file:` dependencies or symlinks well

**Fix Options:**
1. **Inline the code** - Copy essential modules locally (recommended for deployments)
2. **Use npm link** with `transpilePackages` in next.config.ts
3. **Publish packages** to npm registry

For Toumana, we inlined the Gemini client in `src/lib/pidgie/gemini.ts`.

---

## 5. Missing API Key Error Not Visible

**Symptom:** Chat returns generic error, no indication of missing API key

**Cause:** Error sanitization hides the actual cause

**Fix:** Check server logs for "GEMINI_API_KEY not configured" message. Always configure:
```bash
# .env.local
GEMINI_API_KEY=your-key-here
```

---

## 6. Stale Messages in API Request

**Symptom:** First message works, but conversation context is lost

**Cause:** Reading `messages` state immediately after `setMessages` (state update is async)

**Fix:** Build API messages from current state + new message:
```typescript
const sendMessage = async () => {
  const userMessage = { role: 'user', content: input };
  setMessages(prev => [...prev, userMessage]);

  // Use current messages + new message (not the updated state)
  const apiMessages = messages
    .filter(m => m.id !== 'greeting')
    .concat(userMessage);

  await fetch('/api/chat', {
    body: JSON.stringify({ messages: apiMessages })
  });
};
```

---

## 7. Greeting Shows Before Chat Opens

**Symptom:** Greeting message appears immediately on page load

**Cause:** Setting greeting in useEffect without checking if chat is open

**Fix:** Guard with `isOpen` state:
```typescript
useEffect(() => {
  if (isOpen && !hasGreeted) {
    setMessages([{ id: 'greeting', content: t.greeting, ... }]);
    setHasGreeted(true);
  }
}, [isOpen, hasGreeted]);
```

---

## 8. Health Check Secret Naming

**Symptom:** Confusing health check names (e.g., "toumana-health" for a hotel)

**Cause:** Generic naming without context

**Fix:** Use descriptive names:
```bash
# Bad
HEALTH_CHECK_SECRET=toumana-health-2026

# Good
HEALTH_CHECK_SECRET=toumana-pidgie-2026
```

---

## 9. Chat Widget Z-Index Conflicts

**Symptom:** Chat widget appears behind other elements (modals, headers)

**Cause:** Z-index not high enough or stacking context issues

**Fix:** Use high z-index and ensure proper positioning:
```css
.chat-button {
  position: fixed;
  z-index: 9999;
}

.chat-window {
  position: fixed;
  z-index: 9998;
}
```

---

## 10. Rate Limiting Not Persisting

**Symptom:** Rate limits reset on server restart

**Cause:** In-memory rate limit map clears when server restarts

**Impact:** Acceptable for development, but for production consider:
- Redis-backed rate limiting
- Edge middleware rate limiting
- Cloudflare rate limiting

---

## 11. bodyText Now Preserves Paragraph Breaks

**Changed in:** Feb 2026 (scraping depth improvements)

**Old behavior:** `bodyText` collapsed all whitespace to single spaces (`\s+` → ` `). Guaranteed single-line.

**New behavior:** `bodyText` preserves `\n` and `\n\n` paragraph breaks. Only horizontal whitespace (spaces/tabs) is collapsed.

**Impact on consumers:**
- **Detection module:** Uses `.test()` with literal phrase patterns like `/add to cart/i`. These match within single lines, so newline preservation is low-risk. However, if Cheerio produces text split across paragraph boundaries (e.g., `<p>add to</p><p>cart</p>`), a newline could appear between words and break the match. **Risk: Low but non-zero.**
- **Content-utils / combinedContent:** Benefits from preserved structure (more readable for LLMs).
- **Product extractor (Shopimate):** Explicitly designed for the new format — splits on `\n\n`.

**If you see detection regressions**, check whether a phrase pattern spans a paragraph break in the source HTML.

---

## 12. Regex /g Flag + Module-Level Constants = Shared State Bug

**Symptom:** Intermittent price extraction failures or wrong results

**Cause:** Regex patterns defined with `/g` flag at module level (e.g., `const PATTERNS = [/foo/g]`) have mutable `lastIndex` state. Calling `.test()` on a `/g` regex advances `lastIndex`, and since the regex object is shared across all callers, concurrent or sequential calls can see corrupted state.

**Fix:** Don't use `/g` flag on module-level regex constants unless you explicitly need all-matches behavior. Use `.match()` without `/g` (returns first match) or create fresh regex inside the function.

```typescript
// BAD — /g flag on shared constant
const PATTERNS = [/\$[\d,]+/g];
PATTERNS.some(p => p.test(text)); // Advances lastIndex!

// GOOD — no /g flag
const PATTERNS = [/\$[\d,]+/];
PATTERNS.some(p => p.test(text)); // Safe, no state mutation
```

---

## 13. European Comma-Decimal Prices

**Symptom:** Prices like `€1.299,50` parse as `1.299` instead of `1299.50`

**Cause:** Naive price parsing that strips non-digit characters treats dots as decimals, producing `1.299.50` → `parseFloat` → `1.299`.

**Fix:** Compare position of last comma vs last dot:
- Last comma after last dot → European notation (comma = decimal): `1.299,50` → `1299.50`
- Last dot after last comma → US notation (dot = decimal): `1,299.50` → `1299.50`

**Edge case:** `999,000` (US thousands, no decimal) gets misread as European `999.00`. Mitigated by the `< 100000` price cap in extractPrice.

---

## Quick Debugging Checklist

When chat isn't working:

1. **Check server logs** - Look for actual error message
2. **Test API directly** - `curl -X POST http://localhost:3001/api/pidgie/chat ...`
3. **Add Origin header** - `curl -H "Origin: http://localhost:3001" ...`
4. **Verify env vars** - Is `GEMINI_API_KEY` set?
5. **Check browser console** - CORS errors? React errors?
6. **Verify port** - Is CORS whitelist updated for current port?

---

## Related Files

- [LEARNINGS.md](./LEARNINGS.md) - Best practices
- [README.md](./README.md) - Setup and configuration
- [security-framework/docs/fix-patterns.md](../../security-framework/docs/fix-patterns.md) - Security patterns
