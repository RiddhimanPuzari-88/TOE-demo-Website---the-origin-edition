# Session Log — TOE website work (Sep 2026)

Chronological record of every request → diagnosis → change → commit, for future reference.
Pre-session history (`d181223` and earlier: redesigns, WhatsApp links, card styles) is out of scope.

## 1. Smooth-scroll animation optimization
- **Request:** animations look good but basic scrolling lags.
- **Diagnosis (read-only audit of `index.html`):** `background-attachment: fixed` + fullscreen SVG grain overlay repainting per frame; `backdrop-filter: blur(24px)` on two stacked fixed navs; `filter: blur()` inside `.reveal` transitions and entrance keyframes; infinite loops on non-compositor props (`left` shimmer ×8 pills, `background-position` shine, `box-shadow` pulse, large radial scale glows); 70px-blur orbs animating offscreen + per-scroll JS writes; progress bar via `width%` (layout thrash); unthrottled tilt handlers. User allowed slight visual downgrades.
- **Change:** removed fixed attachment; progress → `scaleX()` transform; blurs cut to 8–12px (+ `none` on mobile); reveal/keyframes → transform+opacity only; shimmer/sweeps `left` → `translateX`; glows scale → opacity-only; orbs smaller blur + slower + paused offscreen; shine kept on hero only; WhatsApp pulse → opacity glow `::after`; float/logo to `translate3d`; `content-visibility` + `contain: paint/layout`; lazy/async images; rAF scroll + rAF tilt (post-cards only); mobile fast-path disables ambient loops.
- **Commit:** `fb4760c` — pushed to `origin/main`.

## 2. Dynamic Stories + admin dashboard
- **Request:** Stories & Insights hardcoded — admin should supply image + content from a dashboard.
- **Decision:** Firebase (Firestore text + Auth single-admin) + image uploads; static hosting kept.
- **Change:** `firebase-config.js` (placeholder config + `ADMIN_UID` + `TOE_USE_FIREBASE` flag); `stories.js` renderer (published query newest-first, Load More, skeleton/empty states, XSS escaping, reveal/tilt reuse via `__toeReveal`/`__toeTiltCard`, seed+cache+hardcoded fallbacks); `index.html` grid got `id="postsGrid"` + compat scripts; `admin.html` (login, list, CRUD form, Storage upload + preview/progress, seed import); `firestore.rules`, `storage.rules`, `seed-stories.json` (3 current stories), `FIREBASE_SETUP.md`.
- **Commit:** `1ba9ce8` — pushed.

## 3. Firebase Storage failure → Cloudinary switch
- **Request:** Storage uploads erroring in Firebase; “any other way?” → Chose Firebase-free images; admin sends only image + text.
- **Diagnosis:** placeholder config, `PASTE_ADMIN_UID` rules, `request.resource` null-on-delete rule bug, bucket-format mismatch, missing content-type metadata, `file://` CORS.
- **Change:** `TOE_CLOUDINARY` unsigned-preset config; admin form simplified to Title + Text (`f-text`, first 2 paras = excerpt) + Cover image + Status with Advanced collapsed; upload rewritten to Cloudinary `fetch`/XHR (progress, exact error toasts); `firebase-storage-compat.js` removed; saves auto-split text, auto-date, transform Cloudinary URLs (`w_1600,q_auto,f_auto`); `FIREBASE_SETUP.md` rewritten for Cloudinary.
- **Pushed** with the feature set (part of working tree → `1ba9ce8` line).

## 4. Config fix + keys review
- **Request:** pasted Cloudinary cloud name (`cf1n27id`, kept verbatim); “fix others”; “did you push the api key — got notification?”
- **Diagnosis:** `firebase-config.js` defined `const firebaseConfig` but readers expect `window.TOE_FIREBASE_CONFIG` → login disabled, seed fallback. API key in `1ba9ce8` is a public web key (flagged by GitHub scanning); Cloudinary cloud later verified live via `res.cloudinary.com` sample fetch.
- **Change:** renamed to `window.TOE_FIREBASE_CONFIG`; documented restriction steps (HTTP referrers per Vercel hostname incl. `-tau` aliases, API restrictions to Identity Toolkit + Firestore, Auth authorized domains). Full history purge explicitly declined — restriction is the standard fix.
- **Note:** live keys exist in 3 committed `firebase-config.js` copies (root, `site/`, `admin/`).

## 5. Admin hosting separation
- **Request:** admin must be an extra interface, not connected to the site → same-site URL, then full split into two Vercel projects.
- **Change:** `admin.html` hardened (`noindex`, `no-referrer`); root `vercel.json` (cache headers); `028d2fd` pushed. Then repo split: `site/` (website + images + own `vercel.json`, no admin refs) and `admin/` (`index.html` + config/seed copies + global-noindex `vercel.json`); admin back-link → absolute main domain; `FIREBASE_SETUP.md` dual-project layout.
- **Commits:** `028d2fd`, then `8559617` — pushed. Root flat files retained as deploy fallback until Root Directories flip (`site` / `admin`); both Vercel hostnames must join Auth + key allowlists.

## 6. Referrer-blocked login on `-tau` domain
- **Request:** `auth/requests-from-referer-https://...-tau.vercel.app-are-blocked`.
- **Diagnosis:** Vercel mints multiple aliases; key allowlist covered only the base domain.
- **Plan given:** add base + `-tau` + wildcard-preview referrers and both Auth hostnames; documented in README troubleshooting.

## 7. Admin images not appearing on site
- **Request:** admin saves don’t show on the site.
- **Diagnosis:** `stories.js` swallowed Firestore errors → silent seed fallback (blocked key / missing composite index / unpublished rules all invisible); Cloudinary cloud verified valid; save path + configs in sync; root vs `site/` copies identical.
- **Change:** `window.__toeStoriesStatus` + `[TOE stories]` console errors with per-cause fix hints; index-free fallback query (orderBy-only + client filter) self-heals missing composite index; `?debug=stories` red banner instead of silent fallback. Applied identically to `site/stories.js` + root `stories.js`.
- **Commit:** `97f3e29` — pushed. User action left: open `?debug=stories`, report banner; confirm green “Story published” toast vs red error.

## 8. Cinematic logo entrance
- **Request:** smooth logo-appearing animation on first open.
- **Change:** new `logoReveal` keyframes (rise 44px, scale 0.82→1.015→1 settle, 1.3s lux easing, transform/opacity only) chained into `floatSoft`; mobile keeps the 1s entrance, drops only infinite float. Applied to root + `site/index.html` identically.
- **Commit:** pending with docs push (this session’s final push).

## 9. Docs + final push (this entry)
- **Request:** document every session step; add project details to README; push for future reference. Reverts explicitly declined.
- **Change:** `README.md` (overview, URLs, repo map, stack, setup, admin flow, troubleshooting, perf rules, security) + this `SESSION_LOG.md`.
- **Left deliberately untouched:** `storage.rules` (deprecated) and `white.jpg` (15 MB, unreferenced) stay untracked; legacy root duplicates stay until Vercel Root Directory flip is confirmed.

## Open items for next session
1. Flip Vercel Root Directories (`site` / `admin`), then delete legacy root duplicates.
2. Confirm `-tau`/preview hostnames in key referrers + Auth domains; resolve `?debug=stories` output for the images issue.
3. Confirm Cloudinary preset `toe-stories` is Unsigned (upload 400 otherwise).
4. Create Firestore composite index via console link if prompted (fallback covers meanwhile).
5. Rotate Firebase web key only if unrestricted abuse is observed (requires config update in both copies + push).
