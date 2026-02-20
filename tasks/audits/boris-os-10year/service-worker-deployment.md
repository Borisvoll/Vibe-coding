# Service Worker & Deployment — 10-Year Audit

**Risk Level: MEDIUM-HIGH**
**Confidence: High** — based on direct analysis of public/sw.js, src/main.js, vite.config.js, package.json

---

## 1. Service Worker Cache Strategy

### Current Implementation (`public/sw.js`)

**Pre-cached on install (4 files only):**
```
BASE/
BASE/index.html
BASE/manifest.json
BASE/favicon.svg
```

**Runtime cache strategy:**
- **Navigation requests** (mode: 'navigate'): Network-first, fallback to cached index.html
- **Other GET requests**: Cache-first, then network (with cache-on-success)
- **Non-GET requests**: Passthrough (no caching)

### Version Management
The SW version is derived from a URL query parameter:
```javascript
const VERSION = new URL(self.location.href).searchParams.get('v') || 'dev';
const CACHE_NAME = `bpv-tracker-${VERSION}`;
```

Registration in `src/main.js:166`:
```javascript
const swUrl = `${import.meta.env.BASE_URL}sw.js?v=${encodeURIComponent(APP_VERSION)}`;
```

**Strengths:**
- Version-tagged cache names ensure old caches are cleaned on activate
- `activate` event deletes all caches except current version
- `self.clients.claim()` ensures new SW controls all tabs immediately

**Critical Weakness: JS/CSS bundles are NOT pre-cached.**

Vite generates hashed filenames (e.g., `index-a1b2c3d4.js`). These are only cached on first request (runtime cache). If the user loads the app with a network connection, closes the tab, then goes offline — the HTML is cached but the JS bundle might not be (if it wasn't loaded in the same session).

**Failure Scenario:**
1. User visits BORIS OS → SW installs, caches index.html
2. New deploy → SW detects update, user clicks "Ververs"
3. Page reloads → index.html loads (cached), references new JS bundle
4. User goes offline before JS bundle loads
5. **App is broken** — HTML loads but JS doesn't

**Risk: Medium-High**

**Minimal Fix:** Generate a Vite plugin that produces a manifest of all build output files. The SW reads this manifest on install and pre-caches all critical assets:
```javascript
// In install handler:
const manifest = await fetch(BASE + 'asset-manifest.json').then(r => r.json());
cache.addAll([BASE, `${BASE}index.html`, ...manifest.files]);
```

---

## 2. Update Reliability

### Update Flow
1. `initServiceWorker()` registers SW with version query param (`src/main.js:163-195`)
2. If `registration.waiting` exists → show update banner immediately
3. `updatefound` event → watch installing worker state
4. When new SW reaches `installed` state AND there's an existing controller → show banner
5. User clicks "Ververs" → sends `SKIP_WAITING` message to waiting SW
6. SW calls `self.skipWaiting()` → becomes active
7. `controllerchange` event fires → page reloads

**Strengths:**
- Update banner is non-intrusive (user chooses when to update)
- `controllerchange` listener ensures reload happens
- `swControllerChangeBound` flag prevents duplicate listener registration

**Weaknesses:**

| Finding | Risk | Impact |
|---------|------|--------|
| No `onblocked` handling — if multiple tabs are open, SW activation may be delayed | **Low** | Banner shows but update hangs |
| `showUpdateBanner()` has no dedup beyond `updateBanner` null check | **Low** | Only one banner, correct |
| The banner uses `registration.waiting?.postMessage()` — if waiting SW was already activated, postMessage goes nowhere | **Low** | No-op, user refreshes manually |

**Assessment:** The update flow is standard and reliable. No critical issues.

---

## 3. SW/DB Upgrade Race Condition

### Scenario
New version deployed: both SW and DB_VERSION change simultaneously.

1. SW update detected → user clicks "Ververs"
2. Page reloads → new code loads
3. `initDB()` fires `onupgradeneeded` with new DB_VERSION
4. Meanwhile, SW activate is cleaning old caches

**Analysis:** These are independent operations:
- SW operates in a separate thread (service worker scope)
- IndexedDB operates in the main thread
- There's no shared resource between them

**Risk: None** — SW cache cleanup and IndexedDB migration don't interact.

**However**, there's a subtle edge case: If the SW pre-caches the old `index.html` but the new JS bundle has a new DB_VERSION, the cached HTML might reference an outdated JS bundle that expects an older schema.

**Mitigation:** The version-tagged cache (`bpv-tracker-${VERSION}`) ensures old bundles are served together. When the version changes, all old caches are deleted. This is correct.

---

## 4. Stale Build Risk

### GitHub Pages CDN
GitHub Pages serves files through a CDN with automatic cache headers. Typical headers:
- `Cache-Control: max-age=600` (10 minutes)
- Etag-based revalidation

**Risk: Low** — The 10-minute cache means users get updates within 10 minutes of deployment. The SW's version-tagged cache provides the second layer.

### Stale SW Risk
The browser checks for SW updates:
- On navigation (page load)
- Every 24 hours (per spec)
- Byte-for-byte comparison of SW script

Since the SW URL includes `?v=APP_VERSION`, changing the version forces a new SW registration. **This is correct.**

**Edge Case:** If `APP_VERSION` is not updated on deploy, the SW URL doesn't change, and browsers may serve the cached SW.

**Finding:** `src/version.js` — need to verify this is updated on every deploy.

**Risk: Medium** if APP_VERSION is manually maintained.

---

## 5. GitHub Pages Constraints

### Constraints Impacting BORIS OS

| Constraint | Impact | Mitigation |
|------------|--------|------------|
| No server-side logic | Can't set custom headers (CSP, CORS) | Accept — app is pure client-side |
| 404.html SPA fallback | Deploy step copies index.html → 404.html | **In place** (workflow) |
| Max repo size 1GB | Not an issue — app is <5MB | None needed |
| Bandwidth limits | 100GB/month soft limit | Not an issue for personal app |
| No custom redirects | Hash-based routing instead of pushState | **Already using hash routing** |
| HTTPS only | SW requires HTTPS — GitHub Pages provides it | **Covered** |
| Single branch deploy | Only deploys from main | Standard |

**10-Year Risk:** GitHub Pages is one of the most stable free hosting platforms. GitHub has maintained it since 2008. The deployment workflow uses standard GitHub Actions — these are actively maintained.

**Risk: Low** — GitHub Pages is a durable choice. The only concern is GitHub changing its free tier policies, which has a low but non-zero probability over 10 years.

**Backup Plan:** The app is a static bundle. It can be deployed to Netlify, Vercel, Cloudflare Pages, or any static host with zero code changes (just update `base` in vite.config.js).

---

## 6. Offline Guarantees

### What Works Offline (after first visit)

| Feature | Offline? | Reason |
|---------|----------|--------|
| App shell (HTML) | Yes | Pre-cached by SW |
| JS/CSS bundles | **Maybe** | Only if loaded during a previous online session |
| All block rendering | **Maybe** | Depends on JS cache |
| IndexedDB reads/writes | Yes | Fully local |
| Mode switching | Yes | localStorage + local DB |
| Task CRUD | Yes | Local IndexedDB |
| Auto-sync | No | Requires network (jsonbin.io) |
| Export/import | Yes | Local file system |
| Search | Yes | Local IndexedDB |

**Critical Gap:** The JS/CSS bundles are not guaranteed to be cached offline. If a user visits BORIS OS once, the SW caches `index.html` but the Vite-generated JS chunks are only runtime-cached.

**Failure Scenario:** User loads BORIS OS at a library (online). Goes home (offline). Opens BORIS OS. `index.html` loads from cache, but the JS bundle was evicted from the runtime cache (browser storage pressure). App shows a blank page.

**Risk: Medium-High**

**Minimal Fix:** Pre-cache all build output in the SW install handler (as described in section 1).

---

## 7. APP_VERSION Management

Looking at the version file:

`src/version.js` exports `APP_VERSION`. This needs to be manually bumped or auto-generated during build.

**10-Year Risk:** If APP_VERSION is forgotten on deploy:
- SW cache name doesn't change
- Users may not get updates
- Update banner may not appear

**Minimal Fix:** Generate version from git hash or timestamp in vite.config.js:
```javascript
define: {
  __APP_VERSION__: JSON.stringify(process.env.GITHUB_SHA?.slice(0, 8) || Date.now().toString(36))
}
```

---

## Summary

| Domain | Risk | Verdict |
|--------|------|---------|
| Cache versioning | Low | Version-tagged, auto-cleanup |
| JS/CSS pre-caching | **Medium-High** | Not pre-cached — offline gap |
| Update flow | Low | Standard, reliable pattern |
| SW/DB race condition | None | Independent systems |
| Stale build | Low-Medium | Depends on APP_VERSION management |
| GitHub Pages durability | Low | Stable platform, easy to migrate |
| Offline guarantee | **Medium-High** | HTML cached, bundles not guaranteed |
| SPA routing | Low | Hash-based + 404.html fallback |

### Principal Engineer Assessment
> The service worker is functional but has a significant gap: Vite-generated JS/CSS bundles are not pre-cached, which breaks offline reliability. This is the single most impactful improvement needed. The fix is straightforward — generate an asset manifest at build time and pre-cache it in the SW install handler. Everything else (update flow, cache versioning, GitHub Pages deployment) is solid and sustainable for 10+ years.
