# The Origins Edition (TOE) — Website + Stories Admin

Founders-community landing site ("Stories & Insights") with a disconnected admin dashboard.
Public site reads published stories from Firestore; admin writes them (image + text only).
Same Firebase/Cloudinary data, separate hosting URLs.

## Live URLs

| Surface | URL |
|---|---|
| Main website | `https://toe-demo-website-the-origin-edition.vercel.app/` |
| Admin dashboard | Separate Vercel project on `admin/` folder (bookmark its `*.vercel.app` URL — unlisted, `noindex`) |

Debug helpers: append `?debug=stories` to the main URL to surface the exact Firestore read error, or inspect `window.__toeStoriesStatus` in DevTools.

## Repo map

```
site/                 Main website Vercel project (Root Directory = site)
  index.html          Landing page (hero, benefits, stories grid, CTA, founder, footer)
  stories.js          Dynamic story renderer (Firestore → fallback seed → hardcoded)
  firebase-config.js  Firebase web config + Cloudinary preset  ─┐ sync these
  seed-stories.json   Fallback stories (also used by Import seed) │ three copies
  vercel.json         Cache headers for js/json                   │
  *.png               Local images (hero logo, post covers)       │
admin/                Dashboard Vercel project (Root Directory = admin)
  index.html          Login-gated CRUD (title + text + cover image)
  firebase-config.js  COPY of site config ────────────────────────┘ keep in sync
  seed-stories.json   COPY for one-click seed import
  vercel.json         Global noindex + no-store headers
FIREBASE_SETUP.md     Backend setup guide (Firebase + Cloudinary)
firestore.rules       Firestore rules (publish in Firebase console)
SESSION_LOG.md        Full session history (what changed, when, why)
```

Root-level `index.html`, `admin.html`, `firebase-config.js`, `stories.js`, `vercel.json` are **legacy pre-split duplicates** — Vercel ignores them once Root Directories point at `site/` and `admin/`. Do not edit them; edit `site/` / `admin/` instead. Cleanup is a planned follow-up.

## Stack (no build step, static hosting)

- Plain HTML/CSS/JS, Firebase compat SDKs via CDN (Auth, Firestore)
- Firestore collection `stories` (text), Cloudinary unsigned uploads (images/CDN)
- Vercel static hosting × 2 projects, GitHub `main` auto-deploys

## Setup (first time)

1. **Firebase**: create project → enable Auth (Email/Password) + Firestore → add admin user → copy UID.
2. **Firestore rules**: paste `firestore.rules` with your `ADMIN_UID` → Publish. Public reads published stories only; writes admin-only.
3. **Cloudinary**: free account → Settings → Upload → unsigned preset `toe-stories` (folder `toe-stories`, image-only, ≤5 MB).
4. **Config**: paste web `firebaseConfig` + `ADMIN_UID` + Cloudinary `{cloudName, uploadPreset}` into BOTH `site/firebase-config.js` and `admin/firebase-config.js`; set `TOE_USE_FIREBASE = true`.
5. **Allowlist every Vercel hostname** (main + admin, including `-tau`/preview aliases):
   - Firebase Auth → Settings → Authorized domains (hostnames, no scheme).
   - Google Cloud → Credentials → API key → HTTP referrers (`https://<host>/*`) + restrict APIs to Identity Toolkit + Firestore.
6. **Composite index**: first `where(status)+orderBy(publishedAt)` query may prompt an index link — click Create, wait ~2 min. (The site self-heals without it via an index-free fallback query, but the index is faster.)
7. **Vercel**: main project Root Directory `site`; new project on same repo with Root Directory `admin`.
8. **Seed**: admin → Login → Import seed stories → 3 starter stories appear on the main site.

## Daily admin flow (image + text only)

Admin → **+ New story** → Title → Story text (blank line = new paragraph; first 2 show before “Read Full Story”) → Cover image (upload via Cloudinary or paste URL) → Published/Draft → Save. Advanced (tag, dates, highlight, credits) is optional and collapsed. Drafts never render publicly. Delete is Firestore-only.

## Troubleshooting

| Symptom | Cause → Fix |
|---|---|
| `auth/requests-from-referer-...-blocked` / `403 Referer blocked` | API key missing that hostname → add exact `https://<host>/*` referrer (+ `-tau` variants) |
| `auth/unauthorized-domain` | Hostname missing in Firebase Auth authorized domains |
| `permission-denied` on save/read | `firestore.rules` not published with your UID |
| `failed-precondition` / requires index | Create composite index from error link (site self-heals meanwhile) |
| Upload `400 Unknown upload preset` | Cloudinary preset `toe-stories` is Signed → flip to Unsigned |
| New posts missing on site | Open `?debug=stories` — red banner names the exact block; usually (1) or index |
| Root `/` shows admin / `/admin.html` alive on main | Main project Root Directory not yet `site` — set it |
| Scroll jank returns | Keep animations transform/opacity-only; never reintroduce `filter: blur()` transitions, `background-attachment: fixed`, or `left`/`box-shadow` keyframes |

## Performance rules (do not regress)

Scroll smoothness comes from compositor-only animation: `transform`/`opacity` exclusively. Banned patterns: `filter: blur()` in transitions/keyframes, `background-attachment: fixed`, `backdrop-filter` on fixed full-width layers above `~12px`, animating `left`/`width`/`box-shadow`/`background-position` in infinite loops, per-scroll style writes outside rAF. Infinite ambient anims pause offscreen via `IntersectionObserver`.

## Security notes

- `firebase-config.js` web keys are **public by design**; protection = API-key referrer/API restrictions + Firestore rules + admin-UID gate. Never commit service-account JSON or Cloudinary `api_secret` (unsigned preset needs none).
- Admin is unlinked from the site + `noindex`/`no-store`, but obscurity is not security — the UID gate + rules are.
