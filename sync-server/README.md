# BORIS Sync Server

Cloudflare Worker that acts as an encrypted relay for cross-device sync.

## Setup

1. Install Wrangler: `npm install -g wrangler`
2. Login: `wrangler login`
3. Create KV namespace: `wrangler kv namespace create SYNC_KV`
4. Update `wrangler.toml` with the namespace ID from step 3
5. Deploy: `wrangler deploy`

## How it works

- All data is AES-256-GCM encrypted **client-side** before upload
- The worker stores opaque binary blobs — it never sees your data
- Rooms auto-expire after 90 days of inactivity
- Max snapshot size: 10 MB

## API

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/sync/create-room` | Create sync room (returns roomId + secret) |
| POST | `/api/sync/join` | Join room with roomId + secret |
| POST | `/api/sync/push` | Upload encrypted snapshot |
| GET | `/api/sync/pull` | Download latest snapshot |
| GET | `/api/sync/status` | Room info |
| DELETE | `/api/sync/leave` | Leave room |
