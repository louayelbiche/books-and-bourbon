# WebStudio Sites QA Audit Report

**Date:** 2026-02-06
**Auditor:** Claude Code
**Base URL:** https://webstudio.runwellsystems.com

---

## Executive Summary

| Category | Total Sites | OK | Issues |
|----------|-------------|----|---------|
| Telegram | 48 | 27 | 21 |
| Showcase | 14 | 12 | 2 |
| CLI | 10 | 10 | 0 |
| Test | 15 | 14 | 1 |
| **Total** | **87** | **63** | **24** |

**Critical Finding:** Content Security Policy (CSP) is blocking external resources on ~24 sites.

---

## Issue #1: CSP Blocking Lenis Smooth Scroll (CRITICAL)

**Status:** BROKEN
**Impact:** 8 sites have broken smooth scrolling
**Root Cause:** `unpkg.com` and `jsdelivr.net` not in CSP `script-src`

### Affected Sites

**Using unpkg.com (6 sites):**
- `/telegram/an-edible-skincare-brand-with-ginger-and-myo-inosi/`
- `/telegram/build-me-a-new-website-for-this-product-https/`
- `/telegram/build-me-a-website-for-jii-sports-discover-world/`
- `/telegram/build-me-a-website-for-lush-kitchen-bali-coffee-an/`
- `/telegram/build-me-a-website-for-lush-kitchen-bali-coffee-an-6765/`
- `/telegram/build-me-a-website-for-xiomi-service-centre-for-re/`

**Using jsdelivr.net (2 sites):**
- `/showcase/build-a-luxury-boutique-hotel-landing-page-for-ma/`
- `/test/build-me-a-website-for-an-esthetician-and-take-the-18d0/`

### Fix Required
Add to CSP `script-src`:
```
https://unpkg.com https://cdn.jsdelivr.net
```

---

## Issue #2: CSP Blocking Pexels Images (CRITICAL)

**Status:** BROKEN
**Impact:** 15+ sites have missing images
**Root Cause:** `images.pexels.com` not in CSP `img-src`

### Current CSP img-src
```
img-src 'self' data: https://images.unsplash.com https://*.unsplash.com blob:
```

### Affected Sites (partial list)
- `/telegram/a-church-for-surfers-with-connections-to-other-su/`
- `/telegram/a-site-for-soundhealing-meditation-with-lights-tha/`
- `/telegram/build-a-website-for-a-brand-named-techpup-where-ea/`
- `/telegram/build-a-website-for-a-coach-and-a-siminar-speaker/`
- `/telegram/build-a-website-for-travel-agency-kembali-travel/`
- `/telegram/build-me-a-website-for-a-british-expat-tutoring-se/`
- `/telegram/build-me-a-website-for-multiplayer-hospital-manage/`
- `/telegram/build-me-a-website-for-runwell-using-this-website/`
- `/telegram/create-a-minimalist-blog-homepage-for-a-food-write/`
- `/telegram/create-a-yoga-website-and-make-it-user-friendly-an/`
- `/telegram/create-a-yoga-website-the-brand-name-is-mind-mood/`
- `/telegram/fetch-data-on-aladin-ben-and-build-him-a-webiste-h/`
- `/telegram/for-our-client-jardins-de-toumana-we-are-redesign/`
- `/telegram/i-want-you-to-build-me-a-website-for-hi-cube-brand/`
- `/telegram/i-would-like-you-to-build-me-a-property-listings-w/`

### Fix Required
Add to CSP `img-src`:
```
https://images.pexels.com https://*.pexels.com
```

---

## Issue #3: CSP Blocking Google Maps Embed

**Status:** BROKEN
**Impact:** 1 site has broken map
**Root Cause:** No `frame-src` directive for Google Maps

### Affected Site
- `/telegram/build-a-website-for-a-dentist-using-the-existing-w/`

### Fix Required
Add to CSP:
```
frame-src 'self' https://www.google.com https://maps.google.com
```

---

## Issue #4: HTTP 307 Redirect (Low Priority)

**Status:** EXPECTED BEHAVIOR
**Impact:** None - working as intended

### Site
- `/cli/dating-concierge/` → redirects to `/cli/dating-concierge/de/` (i18n locale)

**No fix required** - this is expected Next.js i18n behavior.

---

## Fixed Earlier This Session

The following was fixed at the start of this session:

**Issue:** CSP blocking Tailwind CSS and GSAP CDNs
**Fix Applied:** Added `https://cdn.tailwindcss.com https://cdnjs.cloudflare.com` to `script-src`
**Result:** 46+ sites now working correctly

---

## Recommended CSP Configuration

Update `/etc/nginx/snippets/security-headers.conf`:

```nginx
add_header Content-Security-Policy "
  default-src 'self';
  script-src 'self' 'unsafe-inline' 'unsafe-eval'
    https://cdn.tailwindcss.com
    https://cdnjs.cloudflare.com
    https://unpkg.com
    https://cdn.jsdelivr.net;
  style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
  font-src 'self' https://fonts.gstatic.com;
  img-src 'self' data: blob:
    https://images.unsplash.com https://*.unsplash.com
    https://images.pexels.com https://*.pexels.com;
  frame-src 'self' https://www.google.com https://maps.google.com;
  connect-src 'self';
  frame-ancestors 'self';
" always;
```

---

## Sites Verified Working (Sample)

All HTTP 200, no CSP issues:

| Site | Type | Status |
|------|------|--------|
| `/telegram/hidden-beans-coffee-showcase/` | Telegram | OK |
| `/telegram/linear-inspired-landing/` | Telegram | OK |
| `/showcase/architect-portfolio/` | Showcase | OK |
| `/showcase/cyberpunk-saas/` | Showcase | OK |
| `/cli/books-and-bourbon/` | CLI | OK |
| `/cli/toumana/` | CLI | OK |
| `/cli/mind-mood/` | CLI | OK |
| `/test/luxury-perfume/` | Test | OK |

---

## Action Items

| Priority | Issue | Fix | Sites Affected |
|----------|-------|-----|----------------|
| P0 | Pexels images blocked | Add to img-src | 15+ |
| P0 | Lenis script blocked | Add unpkg/jsdelivr to script-src | 8 |
| P1 | Google Maps blocked | Add frame-src | 1 |

---

## Appendix: Full Site Inventory

### Telegram Sites (48 total)
All return HTTP 200. See Issue #1 and #2 for sites with CSP problems.

### Showcase Sites (14 total)
- architect-portfolio
- brutalist-agency
- build-a-boutique-hotel-landing-page-for-the-velvet
- build-a-landing-page-for-a-kids-coding-school-call
- build-a-landing-page-for-a-vinyl-record-store-call
- build-a-luxury-boutique-hotel-landing-page-for-ma ⚠️ Lenis blocked
- create-a-portfolio-site-for-a-graphic-designer-nam
- cyberpunk-saas
- ethnic-jewelry-related-to-spirituality
- food-editorial
- linear-inspired-landing
- nexusai-startup
- test-belsem-sweet-dreams
- zen-spa-resort

### CLI Sites (10 total)
- books-and-bourbon
- brutalist-agency
- build-me-a-website-that-portrays-the-innocence-and-cef5
- cyberpunk-saas
- dating-concierge (307 redirect - expected)
- eof
- food-editorial
- mind-mood
- toumana
- zen-spa-resort

### Test Sites (15 total)
- build-a-modern-dark-landing-page-for-a-saas-startu
- build-me-a-website-for-an-esthetician-and-take-the-18d0 ⚠️ Lenis blocked
- elena-vance-photography
- fashion-designer
- faynajdi
- for-ads
- kaslik
- luxury-perfume
- music-producer
- notion-landing-page
- runwell-services-landing
- serenity-haven-spa
- tech-saas-startup
- toumana-hotel-homepage
- void-studio-test
