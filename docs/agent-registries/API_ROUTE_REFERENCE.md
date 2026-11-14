# API route reference

Generated from `server/routes.ts`. Do not hand-edit. All routes apply loopback Host/Origin restrictions. No hosted authentication is implemented.

| Method | Route | Outcome |
| --- | --- | --- |
| GET | `/api/history` | Bounded revision-scoped retained history; evaluate complete lenses/read filters before paging; reject stale cursors. |
| GET | `/api/feeds/:id/digest-plan` | Review bounded original inputs/context and selected-feed pipeline instructions without provider calls or spending. |
| GET | `/api/state` | Read local workspace; encrypted credentials are removed. |
| POST | `/api/feeds` | Create a feed; enforce the 5-feed limit. |
| PATCH | `/api/feeds/:id` | Save feed rules, pipeline digest profile/instructions, reading preferences and mention alerts; reject stale edits. |
| DELETE | `/api/feeds/:id` | Remove feed, links, digest, and feed receipts; preserve connections/items and at least one feed. |
| POST | `/api/connections` | Create an independent source, optionally link feeds; enforce 3 connections per feed; encrypt credentials. |
| PATCH | `/api/connections/:id` | Pause/resume, link feeds, or repair versioned configuration and encrypted credentials; identity changes require explicit data reset. |
| DELETE | `/api/connections/:id` | Disconnect source and remove reading/writing credentials, items and drafts; retain send metadata without retracting transmitted messages. |
| POST | `/api/feeds/:id/sync` | Sync enabled sources; deduplicate repeated requests and record outcomes. |
| POST | `/api/connections/:id/sync` | Collect source data independently of feed links; coalesce source syncs and record a source receipt. |
| POST | `/api/connections/:id/history` | Collect a bounded older page from supported sources; preserve eligible grouping and saved/read identity. |
| POST | `/api/connections/:id/check` | Bounded read-only check of saved configuration; record sanitized health/count without ingesting items; discard changed configuration results. |
| PATCH | `/api/entries/:id` | Save/read an item or save/reset a revision-checked local title/body override; collected originals remain unchanged. |
| PATCH | `/api/profile` | Save local reader identity and appearance; reject stale edits. |
| PUT | `/api/ai` | Configure user-provided AI key and model, or disconnect AI. |
| POST | `/api/feeds/:id/digest` | Review-confirmed digest: exact token count, user-verified rate/cost reservation, bounded output, sanitized uncertain/completed receipts; configured model only. |
| PUT | `/api/connections/:id/posting` | Version-checked separate encrypted writing credential/opt-in; no provider call or message on save. |
| POST | `/api/connections/:id/posting/check` | Read-only writing identity/channel/instance check; preserve source collection and make no post. |
| POST | `/api/outbound/drafts` | Create a local connection-owned text draft; at most 50 drafts; no provider effects. |
| PATCH | `/api/outbound/drafts/:id` | Edit current unsubmitted draft version; sent/unknown/active drafts cannot be resubmitted or overwritten. |
| DELETE | `/api/outbound/drafts/:id` | Remove local draft only; active/uncertain sends remain available; preserve receipts and remote messages. |
| GET | `/api/outbound/drafts/:id/review` | Issue five-minute local review bound to exact draft/account/destination/reply/limits; no provider call. |
| POST | `/api/outbound/drafts/:id/send` | Explicit confirmed reviewed send after fresh read-only preflight; persist attempts, acknowledge or lock uncertain outcomes; duplicate tokens do not resend. |
| POST | `/api/outbound/receipts/:id/check` | Read-only reconciliation of an unknown send against frozen sender/draft/destination/reply; matching provider evidence confirms delivery, never retransmits or unlocks missing outcomes. |
