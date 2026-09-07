# TOE — Dynamic Stories Setup (Firebase text + Cloudinary images)

Public site (`index.html`) reads published stories. Dashboard (`admin.html`) only asks for image + text.

## 1) Firebase (text + login only, no Storage needed)
1. https://console.firebase.google.com → Add project (no Analytics needed).
2. **Authentication** → Sign-in method → enable **Email/Password** → Users → Add user. Copy its **UID**.
3. **Firestore Database** → Create database → **Production mode** → `asia-south1`.

## 2) Firestore rules
- Firestore → Rules → paste `firestore.rules` → replace `PASTE_ADMIN_UID` → Publish.
- `storage.rules` is legacy and unused (images use Cloudinary now).

## 3) Cloudinary (images, 5 min, avoids all Storage errors)
1. https://cloudinary.com → free signup → Dashboard → copy `cloud name`.
2. Settings → Upload → Upload presets → Add folder `toe-stories` → Preset name `toe-stories` → Signing Mode **Unsigned** → Save (restrict Allowed formats: jpg,png,webp, max 5MB).
3. Open `firebase-config.js` → set `TOE_CLOUDINARY = { cloudName, uploadPreset: "toe-stories", folder: "toe-stories" }`.

## 4) Wire the site
1. Firebase → Project settings → Web app → copy `firebaseConfig` → paste into `firebase-config.js`, set `TOE_ADMIN_UID`, set `TOE_USE_FIREBASE = true`.
2. Open `admin.html` → Login → **Import seed stories**.
3. Open `index.html` → Stories load newest-first. URL paste works even before Cloudinary is set.

## 5) Daily use (admin — image + text only)
- `admin.html` → **+ New story** → Title → Story text (blank line = new para, first 2 show before Read More) → Cover image (upload or paste URL) → Publish → Save.
- Advanced (tag, dates, highlight, credits) is optional and collapsed.
- Drafts never show publicly. Delete is Firestore-only (no storage cleanup to fail).

## 6) Notes
- Keys in `firebase-config.js` are public by design; security = Firestore rules + admin UID. Never commit service-account JSON.
- Offline/before-setup: `seed-stories.json` + cache keeps section alive.
- If Cloudinary upload fails, exact error shows in toast (common: preset still Signed → switch to Unsigned).
