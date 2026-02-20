# Future Features — BORIS OS

> These features are planned but **not yet implemented**. This document describes the approach, risks, and modular plan for each.

---

## 1. Real Calendar Integration (Google / Outlook)

### What
Replace the `schedule-placeholder` block with a real calendar view showing today's events from Google Calendar or Outlook.

### Approach
- **OAuth 2.0 PKCE flow** — browser-only auth, no server-side token storage
- Google Calendar API v3 / Microsoft Graph API for event reads
- Cache events in IndexedDB (`os_calendar_events` store) with 15-minute TTL
- Read-only initially (show events, not create them)
- Display as timeline blocks on the Today page

### Risks
- **Token expiry**: Refresh tokens require careful handling; silent refresh in background
- **API rate limits**: Google allows 1M queries/day (free), Outlook 10k/user/day
- **Scope creep**: Start read-only; event creation is a separate milestone
- **Privacy**: OAuth tokens stored in IndexedDB (local only); never synced to server

### Privacy
- Tokens never leave the device unless sync is enabled (Phase 3)
- User can revoke access at any time from Google/Microsoft account settings
- No calendar data sent to our serverless functions

### Modular Plan
1. Create `src/stores/calendar.js` (OAuth helpers, event fetching, caching)
2. Create `src/blocks/calendar-today/` block (order 25, replaces schedule-placeholder)
3. Add "Connect Calendar" button in Settings panel
4. Tests: mock API responses, verify cache invalidation

---

## 2. Multi-Device Sync (Local-First)

### What
Sync IndexedDB data across devices using a CRDT-like last-write-wins strategy with a lightweight server backend.

### Approach
- **Phase 1**: Cloudflare D1 as sync backend (SQLite at edge, free tier generous)
- **Phase 2**: Cloudflare Workers for `/api/sync` endpoint
- **Sync protocol**: Per-record `updatedAt` timestamp comparison (last-write-wins)
- **Conflict resolution**: Latest `updatedAt` wins; conflicts logged for manual review
- **Auth**: Cloudflare Turnstile (CAPTCHA-free) + simple device registration
- **Offline queue**: Failed syncs queued in IndexedDB, retried on reconnect

### Risks
- **Data conflicts**: Last-write-wins can lose edits if two devices edit simultaneously
- **Clock skew**: Device clocks may differ; mitigate with server-assigned timestamps on sync
- **Schema migrations**: DB version changes must be backward-compatible during rollout
- **Bandwidth**: Initial sync of full dataset could be large; use delta sync (only changed records since last sync)
- **Complexity**: Sync is the single hardest feature in local-first apps

### Privacy
- Data encrypted in transit (HTTPS) and at rest (D1 encryption)
- No third-party analytics or tracking on sync data
- User can delete all server data from Settings ("Verwijder serverdata")
- Sync is opt-in; app works fully offline without it

### Modular Plan
1. Add `sync_version` and `updatedAt` to all store records
2. Create `src/stores/sync.js` (queue, diff, push/pull logic)
3. Create Cloudflare Worker (`/api/sync`) with D1 backend
4. Add "Enable Sync" toggle in Settings with device pairing
5. Tests: conflict resolution, offline queue, schema migration compatibility

---

## 3. Mobile PWA Packaging

### What
Package BORIS OS as an installable Progressive Web App with offline support, push notifications, and app-like behavior on mobile.

### Approach
- **Service Worker** already exists (`sw.js`) — extend with smarter caching
- **Web App Manifest** — already present; add `shortcuts` for quick actions
- **Push notifications** — Friday review reminder, daily check-in nudge
- **App shortcuts** — "Nieuw inbox item", "Open dagboek" as home screen shortcuts
- **Splash screen** — Custom launch screen with BORIS branding

### Risks
- **iOS limitations**: No push notifications on iOS Safari (until iOS 16.4+, now supported)
- **Update propagation**: Service worker updates need careful versioning
- **Storage limits**: iOS Safari caps IndexedDB at ~1GB, but we're nowhere near that
- **Cache invalidation**: Stale service worker can serve old code; use versioned cache names

### Privacy
- Push notification subscription stored locally; server only stores push endpoint
- No tracking of app usage patterns
- Notification content generated client-side, never sent from server

### Modular Plan
1. Update `manifest.json` with shortcuts and categories
2. Extend `sw.js` with network-first strategy for API calls, cache-first for assets
3. Create `src/stores/notifications.js` (permission request, subscription management)
4. Add notification preferences in Settings panel
5. Tests: service worker lifecycle, cache invalidation, offline behavior

---

## 4. Optional AI Features

### What
Add opt-in AI-powered features: weekly summary generation, journal prompts, pattern recognition in habits/moods.

### Approach
- **Claude API** via serverless function (e.g. GitHub Actions, Cloudflare Workers)
- Client sends aggregated data (never raw journal text without consent) to serverless function
- Function calls Claude API, returns structured response
- Features:
  - **Smart weekly summary**: AI-generated narrative from your week data
  - **Journal prompts**: Personalized based on recent entries and emotional patterns
  - **Habit insights**: "Je beweegt meer op dagen dat je ook dankbaarheid noteert"
  - **Goal suggestions**: Based on project progress and task patterns

### Risks
- **Privacy**: Raw journal text sent to AI API — must be opt-in with clear consent
- **Cost**: Claude API calls cost per token; budget cap needed
- **Hallucination**: AI summaries may misrepresent data; always show alongside raw data
- **Dependency**: App must work fully without AI; it's an enhancement, not a requirement
- **Latency**: API calls take 1-5s; show loading state, never block UI

### Privacy
- All AI features strictly opt-in (disabled by default)
- Clear consent dialog before first use: "Je gegevens worden naar Anthropic gestuurd voor verwerking"
- No data stored on AI provider side (use ephemeral API calls)
- User can disable at any time from Settings
- API key stored in server-side env vars, never in client code
- Option to use local/on-device models when available (future)

### Modular Plan
1. Create serverless function for Claude API calls
2. Create `src/stores/ai.js` (opt-in state, request queue, response cache)
3. Create `src/blocks/ai-insights/` block (order 95, today-sections, opt-in only)
4. Add "AI Inzichten" toggle in Settings with consent dialog
5. Tests: mock API responses, verify opt-in gate, test without AI enabled

---

## Priority Order

| Feature | Priority | Complexity | Dependencies |
|---------|----------|------------|--------------|
| PWA packaging | High | Low | Existing SW |
| Calendar integration | Medium | Medium | OAuth setup |
| Multi-device sync | Medium | Very High | Server infra |
| AI features | Low | Medium | API key + consent |

PWA packaging is the highest priority because it has the lowest complexity and the highest immediate user impact (installable app, offline, notifications). Calendar integration is next for daily utility. Sync is high-value but high-complexity. AI is nice-to-have.

---

## Ground Rules

1. **Every feature is opt-in** — BORIS works fully offline, fully local, with zero external dependencies.
2. **Privacy by default** — No data leaves the device unless the user explicitly enables it.
3. **Modular additions** — Each feature is a separate module with its own store, block, and tests. No coupling between features.
4. **Graceful degradation** — If any external service is unavailable, the app continues to work normally.
5. **Test before ship** — Every new feature must have store-level tests before merging.
