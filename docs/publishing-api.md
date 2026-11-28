# Omar publishing API (Phase 1)

All endpoints need the owner token like the rest of `/api`. Times without an offset are **Cairo time** (`Africa/Cairo`, DST handled).

| Action | Request |
|---|---|
| Publish now | `POST /api/posts` `{ "text": "...", "services": ["facebook","instagram"], "mode": "now", "assetUrl": "https://..." }` |
| Schedule | same, `"mode": "schedule", "scheduledFor": "2026-11-21 21:30"` |
| Queue (Buffer fixed schedule) | same, `"mode": "queue"` |
| Draft | same, `"mode": "draft"` then `POST /api/posts/:id/publish` |
| List / filter | `GET /api/posts?status=Scheduled&service=facebook` |
| Upcoming | `GET /api/posts/upcoming` |
| Edit (Draft / Scheduled / Failed) | `PATCH /api/posts/:id` `{ "text", "scheduledFor", "mode", "assetUrl" }` |
| Cancel | `POST /api/posts/:id/cancel` |
| Retry a failed post | `POST /api/posts/:id/publish` |
| Refresh status/link from Buffer | `POST /api/posts/:id/sync` |

Statuses: `Draft`, `Scheduled`, `Publishing`, `Published`, `Failed`, `Canceled`.
Duplicates (same service + text + media within 24h) are rejected unless `"allowDuplicate": true`.
Temporary Buffer errors (429 / 5xx / network) are retried up to 3 times; permanent errors mark the post `Failed` with the reason.
Scheduled and queued posts live inside Buffer, so they publish even when Dawwar is closed.
