# MyFeed architecture

Browser isolation is enforced by `server/test-session.ts`: a test session may open only a named directory under the real OS temporary root, never production/default data or a symlink to ordinary data. Playwright generates a per-run marker, verifies it on the API before launching workflows, and supplies it on all test traffic. The normal API rejects marked requests; a temporary API rejects mismatched/unmarked requests. This prevents a Vite proxy from silently reaching an already-running normal server. Local server stop remains mandatory before E2E; the marker is a test-integrity guard, not hosted authentication.

```text
RSS / Mastodon / Bluesky / IMAP / Rocket.Chat / JSON API
                   ↓ read-only connector
           normalize bounded plain-text items
                   ↓ idempotent merge
           local collected entry store
                   ↓ connection links to feeds
        enabled source → mute → include → deduplicate
                   ↓ optional context ranking
     posts / article previews / grouped conversations + bookmarks
                   ↓ manual request only
         user-owned AI connection → digest snapshot
```

`shared/api-source.ts` validates declarative JSON paths and stable IDs. The API adapter performs public HTTPS GET reads with encrypted bearer/X-prefixed header credentials, at most three pages of 100 items, and same-origin cursor query parameters; explicit older reads resume `apiNextCursor`. Invalid later pages abort the whole batch. Source configuration changes invalidate prior work and require an explicit item reset; secret-only repair retains state. Credentials on any configured header block cross-origin redirects.

Feeds own `aiPipeline` with the default digest profile and processing instructions. Connections selects the input feed and launches GenerationReview; customization persists instructions. The server returns exact instructions with the review plan and uses the same instructions for token count and generation. Nonempty instruction changes affect the digest fingerprint; empty legacy defaults preserve the old fingerprint. Output stays in `feed.digest`, outside collected entries, preventing feedback loops. Existing cost/model/input/lifecycle guards remain in force.

`shared/posting.ts` defines additive writing settings, draft bodies/versions and receipts; `server/posting-routes.ts` owns source/writer checks, durable local drafts, ephemeral five-minute review tokens and explicit send state. `server/posting.ts` performs bounded read-only identity/channel/instance/reply validation and constructs only supported Rocket.Chat/Mastodon write payloads. Store summaries strip nested writing ciphertext independently; paired backups validate both credentials, draft ownership and receipt identities. Existing stores need no opt-in migration; only interrupted Sending is migrated to Unknown without retry.

Before provider transmission, the server persists a receipt and locks its draft Sending. Hashes bind body, source/writer versions, checked sender, destination/reply and limits. Fresh preflight must still match. Duplicate tokens return the recorded outcome; uncertain drafts remain locked. Writes reject all redirects. Source repair disables writing; pause blocks it; deletion removes drafts/credentials while retaining metadata receipts, permitting an acknowledgment of an already transmitted request without recreating the source. No posted body is inserted as an original; later ordinary ingestion owns provider identity/read/save state. Provider write mocks and simulated browser outcomes do not establish live publishing.

React at port 5188 talks to same-origin `/api` via Vite's proxy to Express at loopback port 3188. The production build is served by Express. The API is the authoritative owner of creation limits and persistence. Shared types and Zod schemas define the model. Mutable state updates clone, validate API inputs, write a temporary JSON file, and rename atomically before exposing the updated revision.

Connections own normalized entries and a feedIds link list; feeds own filter/customization configuration. Legacy feedId is migrated into feedIds, preserving credentials/items and transferring background opt-in to the connection. Feed deletion only removes links and feed receipts. Filtering is a derived lens and never deletes entries. Synchronization fetches upstream items outside the store mutation, then merges into current state only if the connection still exists and is enabled. This prevents stale in-flight requests from resurrecting disconnected data. Successful merges commit provider checkpoints atomically. Failed sources preserve checkpoints and show sanitized errors with exponential retry health (one minute through one hour). Configuration versions/epochs invalidate old checks and syncs. Failed sources have visible status and sanitized error explanations. Run receipts retain fetched/added/error counts. Up to 100 receipts are retained globally.

The [generated data matrix](DATA_MATRIX.md) lists stored/derived records, exact Entry fields/types, adapter field mappings, and retention/removal behavior. Its canonical documentation metadata is `scripts/data-matrix.ts`; generation also reads `shared/model.ts` and checks Entry/provider coverage. Collected originals are normalized and bounded data, not archived raw responses or complete remote documents.

Entry presentation metadata is additive and optional: content type, author handle/avatar, image URL/alt pairs, content warning, and chat room/thread identifiers. Older stores infer types from the connection and remain readable without a migration. `shared/presentation.ts` groups already-filtered messages, orders each conversation oldest first, and collapses it once in the supplied timeline order, preserving feed context ranking. `TimelineEntry.tsx` renders posts and article/email previews; `ConversationView.tsx` renders channel/thread previews and the conversation reader. Both use React text rendering and safe URLs rather than remote HTML.

The background worker checks every 30 seconds for opted-in connections due at the normal five-minute interval or their explicit retry time. It coalesces syncs per connection across feeds and uses the same pipeline as manual sync. It runs in the local server process; restarting does not erase data, but the process must remain alive for unattended ingestion. Browser refreshes are polling; there is no SSE/event queue in this version.

Credentials are encrypted using AES-256-GCM with a 32-byte locally generated key. API summaries strip ciphertext and only expose `hasSecret`. The data directory and files use restricted creation permissions. Collected text and local profile information are plaintext. Host/Origin restrictions and JSON-only mutations protect the local API from ordinary cross-origin browser requests. No multi-user authentication is claimed.

Outbound HTTP requests require public HTTPS endpoints, standard port 443, no embedded credentials, DNS resolution pinned to a checked public IP, a 20-second deadline, at most five redirects, and a 2 MB response cap. Authenticated cross-origin redirects fail. IMAP connects only to a checked public address at TLS port 993, retains the hostname for certificate verification, uses read-only mailbox locks, UIDVALIDITY-scoped IDs, latest-100 metadata and bounded 100-UID incremental/older ranges, skips messages above 1 MB, and does not mark mail as Seen.

## Sibling-project provenance

The following files were inspected in a sibling internal application; MyFeed adapts their patterns independently and does not reuse its production store or secrets.

| Reference                                                                                               | Pattern adopted                                                                                                 | MyFeed location                                                         |
| ------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| `src/index.css`, `tailwind.config.js`, `src/components/ui/button.tsx`                                   | Blue accent, restrained cards, compact controls, theme tokens.                                                  | `src/styles.css`, `src/components/ui.tsx`                               |
| `src/components/sidebar/SidebarRail.tsx`                                                                | Persistent compact rail, quick theme/settings/profile, drawer on mobile.                                        | `src/App.tsx`                                                           |
| `src/components/admin/ProfilePreferencesCard.tsx`, `src/components/SettingsPanel.tsx`                   | Profile preferences and grouped appearance/settings.                                                            | `src/components/SettingsPage.tsx`, `src/components/SettingsContent.tsx` |
| `src/components/DataView.tsx`, `src/components/queue/queueViewState.ts`, ownership notes in `AGENTS.md` | A view is a filtered lens over original data.                                                                   | `shared/pipeline.ts`, `src/components/BackgroundView.tsx`               |
| `server/connections.ts`, `src/components/ConnectionsPanel.tsx`                                          | Encrypted credentials, safe connection summaries, visible missing-connection consequence, no platform fallback. | `server/store.ts`, `server/connectors.ts`, settings UI                  |
| `docs/agent-registries/README.md`, `scripts/generate-agents-md.ts`, `CLAUDE.md`                         | Canonical agent source, generated documentation, drift checks.                                                  | `CLAUDE.md`, `scripts/generate-docs.ts`                                 |

MyFeed is intentionally a local first slice. A hosted version needs authenticated identity, tenancy/authorization, a transactional database, server-enforced plans, CSRF protection, managed secrets, queue-backed workers, source OAuth, and provider-specific live integration gates before release. The five-feed/three-source defaults can remain as the initial hosted plan's limits.

## Pages and layout previews

`src/navigation.ts` uses the browser History API for addressable feed-list, reader, background/customization, profile, and app-settings pages. Reloading a page and browser back/forward preserve its destination. The root and legacy feed-list URLs open the remembered reader. Connections uses /connections; mode switching and creation live in the sidebar, with no top workspace header. Vite and the production SPA fallback serve deep URLs.

Routes under `/preview/` render the same page components with a fictional, in-memory workspace from `src/preview.ts`. Preview mutations use a separate reducer and never call the workspace API or providers, write credentials, or change the stored active feed. Background sync is off in the fixture. Provider inputs are disabled in review mode; source creation accepts only sample connections. Preview changes reset on reload. The regular sidebar navigates preview pages; app settings offers an exit to the local workspace.

`shared/alerts.ts` derives opt-in mention alerts from included decisions using exact explicit handle tokens in collected title/body text. Feed alert configuration persists through the existing validated feed PATCH and older stores get off/empty defaults. No alert record, outgoing notification, or paid summary is created. FeedReader renders a single mixed timeline, top-positioned search/alert dialogs, and conversation detail with Back to feed.

## Configuration, local edits and bounded reading

Connections is the implemented setup entry for sources, local alerts and manual AI (PROP-027). Target/return links preserve the feed; readiness distinguishes configured data from live account evidence. Local handles stay feed-owned and AI stays workspace-owned without consuming source capacity.

PROP-028 stores revisioned `localEdit` overlays beside collected title/body. `shared/local-copy.ts` applies them only for presentation. Rules, mentions, search, deduplication and AI read originals. Sync retains overlays/version/read/save state; reset reveals the latest original. Backup validates and preserves overlays.

`shared/history.ts` filters/ranks/deduplicates the complete retained lens before producing revision/query-scoped pages. The app requests item-free workspace summaries/counts and uses `src/history.ts` for bounded reader/log/results/alert/conversation pages. Stale responses are suppressed; stale cursors request reload. Complete original input for AI comes from its separate reviewed plan.

`shared/generation.ts` bounds original excerpts and validates user-confirmed highest model rates, token/output caps and reservation. The server counts exact input, rejects over-budget plans, persists sanitized reservations/receipts, and submits only the configured model with explicit default service tier. Uncertain outcomes are never automatically retried. Result commits require unchanged source/configuration/rules. No semantic AI stage or outbound delivery is implemented.

Local lifecycle commands and offline restore serialize store replacement through an atomic data-directory operation marker. A live owner blocks a competing operation; a stale marker can be reclaimed after its recorded process is confirmed gone. The marker is removed in a finally block and contains only the owner PID.

Protected backup/restore preserves the store/key pair and uses a staging marker/recovery pair before replacement. Startup validates store/key structure and credentials and fails visibly on damage. `scripts/local.ts` manages detached local startup, graceful stop, explicit macOS next-login launch and backup-before-verification updates. It does not download code or deploy publicly.

Component ownership is mapped in the [full application audit](FULL_APPLICATION_AUDIT_MATRIX.md); route scenarios in the [API audit](API_AUDIT_MATRIX.md); required checks in the [verification matrix](VERIFICATION_MATRIX.md).
