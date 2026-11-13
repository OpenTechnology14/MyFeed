# MyFeed

A personal media app that brings your sources into feeds shaped by your own filters and background context. Built with React, TypeScript, Vite, and a local Express API. Everything runs on your own machine: your sources, your credentials, your data.

Connections includes JSON API imports, bounded public YouTube metadata and a default selected-feed AI digest profile. Manual Rocket.Chat/Mastodon-compatible posting has separate encrypted writer setup, local drafts, exact review/Send and durable outcome receipts. Source collection and AI never publish automatically. Paid AI, YouTube accounts and live publishing require your own configured credentials and separate evidence; TikTok remains unsupported for this local-only edition.

## Run locally

Browser testing must use its temporary workspace: stop the local server before `npm run test:e2e`. A per-run session guard verifies the API before any workflow and blocks test traffic from the normal workspace. Production data must never be used as a test fixture.

For hands-on UI testing, stop normal servers and run `npm run test:manual`. It starts a guarded disposable workspace with the real local API. Follow the [manual click workflow](docs/readable/MANUAL_TESTING_WORKFLOW.md), [generated checklist](docs/agent-registries/CLICK_TREE_MANUAL_CHECKLIST.md), and [dated results](docs/readable/MANUAL_TEST_RESULTS.md). Stop the session before restarting the user app.

Requires Node.js 22.12 or newer.

```sh
npm ci
npm run dev
```

Open [MyFeed locally](http://127.0.0.1:5188). The API runs at `127.0.0.1:3188`. Both servers stay local. For a production build on this computer, run:

```sh
npm run prod
```

Open [MyFeed production locally](http://127.0.0.1:3188). This builds the UI and runs one local server for the app and API; Vite is not needed. Stop it with Ctrl+C. Restart an already-built app with `npm start`. The existing `data/` directory is shared with development, so run one server at a time and keep `store.json` and `secret.key` together for backups. Layout previews remain available under `/preview/` on port 3188. This is the local production setup; the ordered release backlog remains in the proposal work queue.

## First feed

1. Open the starter feed and choose **Connect your first source**.
2. In Connections, add a direct RSS/Atom URL, public Mastodon/Bluesky source, email mailbox, or Rocket.Chat public channel. Sample library is optional and clearly labeled.
3. MyFeed performs an initial connection sync. Use Linked feeds to choose the feeds it supplies. The reader combines posts, messages, articles, and email in one feed. Name feeds and customize their filters to choose what each shows. **Connections** owns collected data and sync activity; link a connection to feeds, then use **Customize filters** in the sidebar.
4. Add keywords to include or mute, background context, duplicate handling, sort order, and layout. Enable background sync on individual connections to poll every five minutes while the local server runs.
5. Create up to **5 feeds**, with **3 connections per feed**. Bookmark updates, open articles, and read channel/thread conversations. Try Sample library for labeled fictional posts, chats, and articles. Personal details live in Profile; My workspace and optional AI configuration live in App settings; theme is available from the rail/header. Saved, Unread, and Alerts sit above the feed; Search opens from the rail beneath Menu.

## Review page layouts

The code includes separate pages. Review the arrangements with fictional data before configuring sources:

- [Connections](http://127.0.0.1:5188/preview/connections)
- [Feed page](http://127.0.0.1:5188/preview/feed)
- [Feed customization](http://127.0.0.1:5188/preview/customize)
- [Profile](http://127.0.0.1:5188/preview/profile)
- [App settings](http://127.0.0.1:5188/preview/settings)

Use the sidebar to switch feeds, customization, connections, profile, and settings. A small badge labels fictional previews. Preview edits are temporary and do not touch your real workspace. Open [your local feed](http://127.0.0.1:5188/) to work with real feeds and connections.

## What is implemented

- Durable local feed/source/profile state, encrypted credentials, server-enforced limits, read/save state.
- Content-first social timeline with authors, handles, image attachments, and content warnings; channel/thread chat reading with individual message bookmarks and mobile navigation.
- RSS/Atom ingestion; public Mastodon accounts/timelines; public Bluesky author feeds; TLS IMAP mailbox ingestion; Rocket.Chat public-channel history.
- Normalization, idempotent source ingestion, cross-source link deduplication, include/mute filters, context keyword ranking, reason tracking, opt-in polling, per-source errors, and run history.
- On-demand OpenAI digests with an explicit source/context review, token count, output cap and cost reservation using your verified model rates. No automatic call, retry, key fallback, or substituted model. Receipts distinguish completed, blocked and uncertain calls.
- Connection repair and read-only checks, successful-merge checkpoints, bounded incremental/older collection, retry health and paged retained history.
- Per-feed word/grapheme limits, type overrides, media visibility/size, typography, reading width and conversation preview count. Saved originals stay accessible.
- Connection-owned local title/body edits with original/reset access and revision conflicts. Edits affect presentation; filtering, alerts and AI continue using collected originals.
- Connections is the setup entry for sources, local alerts and manual AI; readiness does not claim an authenticated provider round trip.
- Light/dark/system appearance, responsive navigation, accessible dialogs, generated agent/API documentation, pipeline/API tests and browser workflow checks.

## Boundaries

This edition is a **single-user local app**. It has no hosted authentication, OAuth account authorization, or multi-tenant database. Keep it on loopback. IMAP requires an app password; Rocket.Chat requires a token and public channel ID. Private/self-hosted network addresses are deliberately unsupported. Other social networks and arbitrary ActivityPub servers require additional adapters. Background context uses explainable keyword ranking; it does not run semantic AI filtering.

External provider accounts require your own credentials and live validation. Paid AI calls occur only after reviewing and confirming a digest with token/output/cost bounds. `data/store.json` contains plaintext collected content; credentials are encrypted using `data/secret.key`. Back up both together. Neither is committed. For isolated checks set `MYFEED_DATA_DIR` to a separate directory.

## Local process and updates

After building, use the detached launcher on macOS/Linux:

```sh
npm run local -- start
npm run local -- status
npm run local -- stop
```

It serves the app and previews at port 3188 and records its process and restricted log in the data directory. Stop drains active requests; it never forcibly kills an unrelated process. Do not run development and production simultaneously. On macOS, `npm run local -- login-enable` explicitly configures launch at the next login; `login-disable` removes that configuration. Keep the checkout and Node path in place. Login activation and Linux operation have not been live validated.

Launcher lifecycle commands and offline restore use an atomic operation marker in the data directory. A competing start, stop, update, or restore exits without touching the store; an abandoned marker is reclaimed only when its recorded process is no longer alive.

After obtaining reviewed code changes, set `MYFEED_BACKUP_PASSWORD` securely in your environment and run `npm run local -- update`. This stops the app, writes a protected pre-update backup, runs verification, and restarts on success. It does not pull code automatically. If verification fails, the app stays stopped; restore reviewed code and rebuild before restarting. Preserve the protected archive for data recovery.

## Backup and recovery

Stop the server before restore. Set `MYFEED_BACKUP_PASSWORD` securely in your environment (12–500 characters), then use:

```sh
npm run backup -- create /absolute/path/myfeed.backup.json
npm run backup -- export /absolute/path/content.json
npm run backup -- restore /absolute/path/myfeed.backup.json
```

Create writes a password-protected AES-256-GCM archive of the exact store and credential key, using PBKDF2-SHA256 with 210,000 iterations and random salt/IV. Export contains collected content, local edits and profile/configuration without provider credentials. Files use restricted permissions and refuse to overwrite. Keep the password separately. Archives are bounded to 64 MiB.

Restore validates version, integrity, structure, links/limits and credential/key pairing before replacing files. It refuses while the local server runs, saves old paired files beneath `data/recovery/`, and marks an in-progress restore. If replacement is interrupted, startup refuses the marker. Recover a matching `store.json` and `secret.key` pair, then remove `.restore-pending` after recovery. Preserve recovery copies until restored state is verified. There is no automatic backup deletion policy.

## Development

```sh
npm run verify        # Type check, production build, business/API tests, doc sync
npm run test:e2e      # Browser workflow; isolated test data, no paid provider calls
npm run docs:generate # Regenerate agent context, API registry, documentation/data matrices
```

E2E starts its own servers on 5188/3188. Stop your development servers first. Test artifacts live in ignored `test-results/`; test data uses a temporary directory.

## Documentation

- [Full application audit: surfaces, ownership, evidence, and next proof](docs/readable/FULL_APPLICATION_AUDIT_MATRIX.md)
- [Connection matrix: configure posts, alerts, and features first](docs/readable/CONNECTION_MATRIX.md)
- [API audit matrix: route scenarios and coverage gaps](docs/readable/API_AUDIT_MATRIX.md)
- [Verification matrix: required checks and evidence limits](docs/readable/VERIFICATION_MATRIX.md)
- [Ordered proposal work queue](docs/readable/PROPOSAL_WORK_QUEUE.md)
- [Product behavior](docs/readable/PRODUCT.md)
- [Customization tracking list](docs/readable/CUSTOMIZATION_LIST.md)
- [Feature tracking list](docs/readable/FEATURE_LIST.md)
- [Click matrix: actions, outcomes, and coverage gaps](docs/readable/CLICK_MATRIX.md)
- [Feature matrix: implementation and verification coverage](docs/readable/FEATURE_MATRIX.md)
- [Architecture](docs/readable/ARCHITECTURE.md)
- [Provider setup and integration coverage](docs/readable/INTEGRATIONS.md)
- [Generated data matrix: fields, mappings, storage, and lifecycle](docs/readable/DATA_MATRIX.md)
- [Implementation and validation evidence](docs/readable/IMPLEMENTATION.md)
- [Design-system pointer: hub-pending crosswalk](docs/design/DESIGN-SYSTEM-POINTER.md)
- [Generated API reference](docs/agent-registries/API_ROUTE_REFERENCE.md)
- [Generated documentation matrix](docs/agent-registries/DOC_UPDATE_MATRIX.md)
- [Agent context source](CLAUDE.md)

Mention alerts are configured per feed with an opt-in switch and explicit @handles. They show short excerpts from eligible collected text mentioning those handles. They are local text matches, not provider notification APIs or AI summaries. External alert delivery is future work in PROP-026.

Connections-first setup (PROP-027) and local item editing (PROP-028) are implemented. Setup links collected sources to feeds and opens downstream alert/AI configuration. Item editing changes a local display copy; originals remain available for filtering, alerts and AI. The [proposal queue](docs/readable/PROPOSAL_WORK_QUEUE.md#solastra-completion-boundary) separates completed local work from pending approval, live-account evidence and conditional future builds.

## Proposal dashboard

[Open the proposal dashboard](docs/readable/proposal-dashboard.html) to choose MyFeed or
Hybrid Platform, inspect Testing and remaining features, and prepare an agent work request.
The [dashboard workflow and refresh tracker](docs/readable/PROPOSAL_DASHBOARD.md) explains
source ownership and snapshot limits. The [canonical proposal queue](docs/readable/PROPOSAL_WORK_QUEUE.md)
retains authorization, order and acceptance criteria.
