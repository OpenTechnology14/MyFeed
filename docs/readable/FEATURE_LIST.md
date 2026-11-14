# Feature tracking list

Baseline: 2026-10-04. This is the product inventory and backlog. Use the [customization list](CUSTOMIZATION_LIST.md) for controls, the [click matrix](CLICK_MATRIX.md) for user actions, and the [feature matrix](FEATURE_MATRIX.md) for code and verification coverage.

**Implemented** means behavior exists in inspected code, without implying live-provider validation. **Requested** is user-requested work awaiting implementation. **Proposed** is a candidate whose recommended sequence is recorded in the [proposal work queue](PROPOSAL_WORK_QUEUE.md), without implying implementation or a delivery commitment. **Deferred** is future-edition work outside the current local slice. Keep IDs stable; record completed checks in [IMPLEMENTATION.md](IMPLEMENTATION.md).

## Current local edition

| ID       | Feature                            | Behavior to preserve                                                                                                                                    | Status                                         |
| -------- | ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------- |
| FEAT-001 | Feed lifecycle and limits          | One empty starter feed; create/select/delete feeds; maximum five; preserve the last feed.                                                               | Implemented                                    |
| FEAT-002 | Connection lifecycle and limits    | Attach up to three sources per feed, including paused sources; pause/resume; disconnect local data and credentials.                                     | Implemented                                    |
| FEAT-003 | Read-only source ingestion         | RSS/Atom, public Mastodon-compatible feeds, public Bluesky authors, TLS IMAP, Rocket.Chat public channels; sample content clearly labeled.              | Implemented · live evidence varies by provider |
| FEAT-004 | Explainable feed lens              | Include/mute, deterministic context ranking, sorting, deduplication; preserve collected originals and explain every decision.                           | Implemented                                    |
| FEAT-005 | Content-first timeline             | Author-led posts, handles, collected text, image descriptions, content warnings, article/email previews.                                                | Implemented                                    |
| FEAT-006 | Mixed reader and filters           | One mixed timeline; popup search plus saved/unread filters applied before conversation grouping. Sources and sorting configured in customization.       | Implemented                                    |
| FEAT-007 | Conversation reading               | Group by source/channel/thread; chronological eligible messages; individual message controls; mobile back navigation.                                   | Implemented                                    |
| FEAT-008 | Read state                         | Explicit read/unread controls; opening an article marks it read; preserve state on repeated ingestion.                                                  | Implemented                                    |
| FEAT-009 | Saved items                        | Save/unsave entries and messages; access saved items after feed rules exclude them; preserve state on sync/restart.                                     | Implemented                                    |
| FEAT-010 | Manual sync                        | Initial connection sync and Refresh feed; coalesce shared-connection requests; healthy sources finish alongside failures.                               | Implemented                                    |
| FEAT-011 | Opt-in background sync             | Check opted-in enabled connections every five minutes while the local API runs; off by default.                                                         | Implemented                                    |
| FEAT-012 | Connection data inspection         | Connections/status, original normalized items, decision explanations, inclusion filter, and activity receipts/errors.                                   | Implemented                                    |
| FEAT-013 | Feed personalization               | Name, description, color, and cards/compact layout in Customize.                                                                                        | Implemented                                    |
| FEAT-014 | Profile and appearance             | Local display name/email; rail/header light/dark toggle; stored system preference compatibility; settings and profile pages.                            | Implemented                                    |
| FEAT-015 | On-demand AI digest                | Explicit key/model; manual generation from up to 20 included excerpts; dated snapshot and references; stale/removed content cannot return.              | Implemented · live paid AI unverified          |
| FEAT-016 | Local persistence and boundaries   | Atomic store, encrypted credentials, loopback/network guards, stale-edit rejection, deletion protection, plain-text remote rendering.                   | Implemented                                    |
| FEAT-017 | Responsive navigation and dialogs  | Desktop/mobile reading, sidebar navigation, accessible dialogs, explicit remove confirmation, visible errors.                                           | Implemented                                    |
| FEAT-018 | Direct pages and isolated previews | Reader/customization/connections/profile/settings routes; fictional preview edits; sidebar named feeds. Directory and preview navigation panel removed. | Implemented                                    |
| FEAT-032 | Local mention alerts               | Per-feed opt-in and explicit @handles; eligible-text matching, condensed excerpts, unread count, and open tagged item.                                  | Implemented · text matching only               |

## Requested and future work

| ID       | Feature                            | Completion requirement / dependency                                                                                                                                                         | Status / priority                                                   |
| -------- | ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| FEAT-019 | Configurable maximum text per item | CUST-001: per-feed word or character budget, expansion, API validation/persistence, compatible old-store defaults, preserved collected text and reader state. See its acceptance checklist. | Implemented                                                         |
| FEAT-020 | Additional reading customization   | Per-feed item-type limits, media visibility/size, font size, line spacing, reading width and conversation preview count.                                                                    | Implemented locally · live accounts/optional tracks remain separate |
| FEAT-021 | More source adapters and OAuth     | Add each provider separately with read-only permissions, API support, account setup, ingestion semantics, and actual live evidence.                                                         | Deferred                                                            |
| FEAT-022 | Hosted edition foundations         | Authentication, tenant isolation, server-side plans, CSRF protections, encrypted managed secrets, durable storage and queue before public exposure.                                         | Deferred                                                            |
| FEAT-023 | Opt-in semantic AI filtering       | Define explicit opt-in, budget controls, and explainable decisions before any paid processing. Current rules remain deterministic.                                                          | Deferred                                                            |

## Additional proposed local capabilities

These rows describe remaining work, not existing code. Dependencies and acceptance criteria live in the linked queue items.

| ID       | Feature                         | Proposed completion requirement                                                                                                                | Queue / status                                                      |
| -------- | ------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| FEAT-024 | Connection repair               | Edit configuration and replace credentials; bounded read-only check; discard results fetched under superseded configuration.                   | Implemented locally · live accounts/optional tracks remain separate |
| FEAT-025 | Backup, export, and restore     | Protected versioned backup with matching encrypted store/key; separate content export; validated recoverable restore and corruption checks.    | Implemented locally · live accounts/optional tracks remain separate |
| FEAT-026 | Incremental ingestion           | Adapter-specific cursor/progress, bounded catch-up, restart recovery, compatible configuration changes, and preserved item/read/save identity. | Implemented locally · live accounts/optional tracks remain separate |
| FEAT-027 | Resilient sync and health       | Bounded retries/backoff, per-source attempt/success state, cancellation, restart behavior, and sanitized run outcomes.                         | Implemented locally · live accounts/optional tracks remain separate |
| FEAT-028 | Expanded collected chat history | Deliberate older-message/thread loading, date and partial-history context, preserved eligibility/grouping/chronology.                          | Implemented locally · live accounts/optional tracks remain separate |
| FEAT-029 | Local launch and updates        | Supported-platform install/start/stop/update, visible server state, opt-in start on login, graceful shutdown, and data compatibility.          | Implemented locally · live accounts/optional tracks remain separate |
| FEAT-030 | Manual generation review        | Eligible input review, explicit generation options, spending/input/output limits, receipts/cancel/retry, and referenced outputs.               | Implemented locally · live accounts/optional tracks remain separate |
| FEAT-031 | Paged retained history          | Stable bounded item queries/pages and efficient reading while preserving search, context order, Saved, retention, and conversation boundaries. | Implemented locally · live accounts/optional tracks remain separate |

The queue also contains page approval, specification, provider-verification, and release-check items. Those do not duplicate already implemented features. New providers/OAuth, the hosted edition, and semantic AI retain their Deferred status until their conditional scope is selected.

## Tracking workflow

Each change links a feature ID to its customization IDs, click rows, code, and checks in the feature matrix. Mark work In progress when implementation begins, Blocked with a concrete dependency, and Implemented only when behavior exists. Record remaining validation gaps independently; a passing sample or mocked test does not validate a real account.

The click and feature matrices are populated starting baselines, not a complete sign-off. Extend edge cases and automation as features are built, keeping required item-size work separate from proposed additions.

The 2026-10-04 arrangement revision keeps existing feature IDs: FEAT-002 now includes independent connections and multiple feed links; FEAT-011 is connection-owned; FEAT-012 inspects source data and receipts; FEAT-018 uses sidebar mode switching and creation without a top header. Saved remains an item/filter capability, not a default navigation page.

## Proposed alert delivery

| ID       | Feature                 | Scope                                                                                                                                       | Status                                                 |
| -------- | ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------ |
| FEAT-033 | External alert delivery | Explicit destination connections, provider-native mention support where available, delivery permissions, deduplication/retry, and receipts. | [PROP-026](PROPOSAL_WORK_QUEUE.md#prop-026) · Proposed |

## Requested connection-first setup and item editing

All posts, alerts, and feature setup enter through Connections; per-feed behavior follows the selected connection/feed. See the [connection matrix](CONNECTION_MATRIX.md) for the current placement and required changes. Existing source/local-alert/manual-AI setup and local item editing are implemented; optional capabilities remain conditional.

| ID       | Feature                        | Completion requirement                                                                                                                               | Queue / status                                                      |
| -------- | ------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| FEAT-034 | Connection-first configuration | Unified source/alert/AI/feature setup, readiness and target/return navigation; preserve scope, credentials, limits, and explicit effects             | Implemented locally · live accounts/optional tracks remain separate |
| FEAT-035 | Edit item locally              | Connection-owned title/body overrides, original/reset access, conflicts/resync/backup, stable identity and source-derived decisions; no remote edits | Implemented locally · live accounts/optional tracks remain separate |

Release scenarios and verification requirements are in the [full application audit](FULL_APPLICATION_AUDIT_MATRIX.md), [API audit](API_AUDIT_MATRIX.md), and [verification matrix](VERIFICATION_MATRIX.md).

## Requested pipeline and API/video connections — 2026-10-05

The default AI Pipeline profile, API source, and bounded public YouTube metadata source are implemented locally as of 2026-10-08. TikTok remains requested work. Their access requirements are in the queue; implementation does not imply authenticated or paid provider proof.

| ID | Feature | Completion requirement | Queue / status |
| --- | --- | --- | --- |
| FEAT-036 | AI Pipeline | Default selected-feed digest profile, persisted instructions, Connections review/run, reviewed bounded originals and feed-owned generated snapshot | [PROP-029](PROPOSAL_WORK_QUEUE.md#prop-029) · Implemented locally; paid AI unverified |
| FEAT-037 | API source | Read-only HTTPS JSON source, encrypted header credentials, declarative mappings/pagination, stable identity and source limits | [PROP-030](PROPOSAL_WORK_QUEUE.md#prop-030) · Implemented; public JSON live read; account-specific proof separate |
| FEAT-038 | YouTube videos / Shorts | Public channel/playlist metadata, encrypted user key, visible bounded quota estimate and honest explicit-playlist/candidate Shorts labels | [PROP-031](PROPOSAL_WORK_QUEUE.md#prop-031) · Implemented locally; no live key/account proof |
| FEAT-039 | TikTok access and source | Establish an eligible product/account/approval route before adapter implementation; explain unsupported personal timeline access | [PROP-032](PROPOSAL_WORK_QUEUE.md#prop-032) · Unsupported for current local-only edition; not built |

## Requested manual posting — 2026-10-08

Reading and posting are separate declared capabilities. Manual writing is implemented locally on existing Rocket.Chat/Mastodon-compatible connections, with independent credentials and explicit Send; no live publishing proof is claimed.

| ID | Feature | Completion requirement | Queue / status |
| --- | --- | --- | --- |
| FEAT-040 | Manual composer and write setup | Independent encrypted writer setup, local drafts, exact version/account/audience review, explicit Send and durable outcome receipts | [PROP-033](PROPOSAL_WORK_QUEUE.md#prop-033) · Implemented locally; publishing unverified |
| FEAT-041 | Rocket.Chat posting | Authenticated text/links and public-channel thread replies; joined/writable channel checks, matching IDs and duplicate/unknown protection | [PROP-034](PROPOSAL_WORK_QUEUE.md#prop-034) · Implemented locally; mocked provider proof only |
| FEAT-042 | Mastodon-compatible posting | Verified account/v2 limits, explicit audience/warning/language, public/unlisted-parent replies and durable idempotency/uncertainty handling | [PROP-035](PROPOSAL_WORK_QUEUE.md#prop-035) · Implemented locally; mocked provider proof only |
