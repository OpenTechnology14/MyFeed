# Implementation record

Date: 2026-10-04. User chose 5 feeds. Connection default: 3 per feed. Reference project inspected: `/Users/alexpro/Downloads/OpenTechnologyApp`.

## Current status — 2026-10-08

The dated entries below are historical implementation notes. Current status is maintained in [PROPOSAL_WORK_QUEUE.md](PROPOSAL_WORK_QUEUE.md): 35 proposals total, 24 implemented/specified and 11 remaining. PROP-002–009, PROP-012–019, PROP-027–031 and PROP-033–035 are implemented locally. Page approval and authenticated account evidence remain separate; provider/hosted/semantic/automatic-alert tracks remain conditional; TikTok is unsupported. Manual Rocket.Chat/Mastodon-compatible publishing has local/provider mocks and browser simulations, not live messages. Reader layout and filtering remain unchanged. Historical entries do not override current code/queue.

### PROP-031 — YouTube metadata source (2026-10-08)

Implemented local read-only YouTube channel-upload, public-playlist, and explicitly labeled Shorts-playlist connections. The adapter requires a user-entered encrypted Data API key, resolves channel uploads to a playlist, reads at most three 50-item playlist pages plus matching duration batches, stores canonical links/thumbnails and safe bounded metadata, and supports retained older paging. Under-four-minute items are shown only as Shorts candidates; only a user-selected explicit playlist carries the Shorts-playlist label. No player, autoplay, download, transcript, personalized feed, subscription, private/account data, OAuth or outbound action was added.

Mocked connector fixtures passed for channel normalization, explicit/candidate labeling and older paging (`npx vitest run tests/connectors.test.ts --reporter=dot`, 10 tests). Once the combined workspace stabilized, `npm run verify` passed (production build/type check, 82 tests, generated-documentation synchronization) and the 15-workflow Playwright suite passed. The local preview was then started at `http://127.0.0.1:3188`. No YouTube key/account/live request was used; these are local/mock checks, not provider evidence.

Correction from the subsequent isolation audit: that earlier 15-workflow run at 02:19 UTC reached the already-running normal API via Vite instead of its unused temporary API, so its workspace-preservation/isolation claim is invalid. The contamination was identified, preserved/quarantined and guarded as recorded at the end of this document. Later full suites run with the normal server stopped and an API session pin provide the isolated browser evidence.

## Delivered first slice

Local React/TypeScript application, source configuration/ingestion, original-data pipeline, reading and saved views, background control surface, profile/theme settings, optional on-demand AI connection, file persistence, and generated agent/API/documentation registries.

## Verification

The production build/type check, 20 business/API tests, generated-documentation check, and full Playwright workflow passed. Browser checks covered starter setup, sample ingest, article reading, bookmarking, comma-separated mute rules, inclusion reasons, saved items after exclusion, reload persistence, new feed creation, profile editing, dark/light appearance, and mobile navigation. Screenshots were inspected at 1440×1000 and 390×844; the browser reported no application errors or horizontal page overflow.

Live source checks on 2026-10-04:

| Source   | Check                                                      | Result                              |
| -------- | ---------------------------------------------------------- | ----------------------------------- |
| RSS      | `https://hnrss.org/frontpage`, 11:27 EDT                   | 20 entries fetched and normalized.  |
| Bluesky  | Public author `bsky.app`, 11:27 EDT                        | 40 posts fetched and normalized.    |
| Mastodon | `Mastodon` account on `https://mastodon.social`, 11:27 EDT | 40 statuses fetched and normalized. |

Two additional mocked AI tests verify that only included excerpts are submitted, the configured model is used, Responses text is read after reasoning output, and generation finishing after a source disconnect cannot recreate removed source content. These checks make no external or paid AI requests.

The live check exposed a Node DNS callback incompatibility when the HTTP client requested all addresses. The pinned resolver now returns the requested callback shape, and all three public source round trips passed afterward.

Email, Rocket.Chat, and paid AI live round trips remain unverified because no user account credentials were provided. No paid AI request was made. Sample data and isolated test fixtures were used for browser tests; the user's actual workspace remains empty apart from its starter feed.

## Next proposed build sequence

The [proposal work queue](PROPOSAL_WORK_QUEUE.md) is the current ordered plan. It prioritizes approved page arrangements, the requested text-size controls, connection/data recovery, reliable incremental ingestion, provider evidence, and local release. Hosting is a conditional future edition; its identity, tenant storage, secrets, server-side plans, and durable workers must be complete before public exposure. New providers/OAuth and semantic AI are separately scoped later work.

## Content-first timeline and chat reading

The reader now leads with author identity, post text, paragraphs, and image attachments. All updates mixes posts, article/email previews, and conversation previews; Posts, Chats, and Articles & email provide focused views. Chat groups use source, room, and thread identity and render collected messages chronologically. Message read/save controls and mobile conversation navigation are supported. Pipeline counts and routine inclusion explanations live in Background data or item details. The sample source explicitly labels its six articles, two posts, and five messages across two conversations.

Validation for this change: `npm run verify` passed the production build/type check, all **27 tests**, and generated documentation synchronization. Both Playwright workflows passed. The new workflow covers post identity/body presentation, opening a thread from the mixed timeline, chronological messages, per-message read/unread behavior, query filtering without reintroducing neighboring messages, bookmarking, muted messages absent from conversations, saved messages surviving a filter change, and mobile conversation/back navigation. Desktop (1440×1000) and mobile (390×844) screenshots were inspected. No application errors or horizontal page overflow were reported.

Seven additional local tests cover legacy entry-type inference, thread roots and replies, source/channel isolation, timeline order under context ranking, identical chat events, and mocked Rocket.Chat/Mastodon/Bluesky metadata normalization. The mocked Rocket.Chat check confirms `showThreadMessages=true` and retained room/thread identifiers; it is not evidence of a live account connection. Mastodon normalization strips remote HTML, retains content warnings and image descriptions, and drops unsafe media schemes.

Public read-only round trips repeated on 2026-10-04 after this change returned 40 Bluesky posts and 40 Mastodon posts, each with 40 handles and 40 avatar URLs. Image metadata was retained on one Bluesky post and four Mastodon posts. Only counts were printed; no item bodies were logged or written to the user's store. Email, authenticated Rocket.Chat, and paid AI remain unverified live. Browser fixtures used an isolated temporary store; the actual workspace still starts with its empty starter feed.

## Separate page layouts and review previews

The app now has addressable feed list, feed reader, feed customization, profile, and app settings pages. The list uses searchable cards with the latest included content and Open feed/Customize actions. Profile and app settings render as full pages. Browser history, deep links, reload, and the existing starter/setup workflow remain supported. Distinct browser titles identify each page.

Review URLs are `/preview/feeds`, `/preview/feed`, `/preview/customize`, `/preview/profile`, and `/preview/settings`. They use the production components with a labeled fictional workspace. Preview changes stay in memory and reset on reload. Account and AI credential inputs are disabled there. The real workspace remains independently available at `/feeds`.

Validation: production build/type check, **29 tests**, documentation synchronization, and **four Playwright workflows** passed. The new checks cover all five preview URLs, feed-card search/open, browser back/forward, customization and profile edits, appearance changes, reset on reload, disabled account/AI configuration, and mobile layouts. Browser instrumentation recorded **zero workspace API requests** from the preview workflow, and its before/after API state was identical. A second page workflow verifies real feed-list/customization/profile/settings deep URLs and reload. Desktop screenshots at 1440×1000 and mobile screenshots at 390×844 were inspected for all five arrangements, with no application errors or horizontal page overflow. Existing ingestion, bookmark, filters, saved chats, settings, and conversation workflows passed as well. No live-provider or paid AI request was needed for this layout change.

## Customization and feature tracking baseline

On 2026-10-04, added a maintained [customization list](CUSTOMIZATION_LIST.md) with **19 IDs**, a [feature list](FEATURE_LIST.md) with **23 IDs**, a [click matrix](CLICK_MATRIX.md) with **38 primary interaction rows**, and a [feature matrix](FEATURE_MATRIX.md) linking controls/actions to implementation and verification coverage. Existing, requested, proposed, and deferred work are distinguished. The matrices identify existing local/API, sample browser, mocked upstream, and public live-provider evidence separately, with explicit gaps. README, PRODUCT, and canonical agent context link or describe these tracking documents; generated context was regenerated.

CUST-001 / FEAT-019 records the user's request for per-feed maximum words or characters per item. Its proposed specification covers display-only truncation, expansion/opening collected text, per-feed persistence/API validation, compatible defaults, Unicode/counting decisions, Saved views, and preserved originals/read state/bookmarks/filter eligibility. CLICK-036 through CLICK-038 reserve the planned interaction paths. The setting is **not implemented**; fixed post collapse and CSS preview clamps remain the current behavior. Additional media/typography/type-specific controls are proposed candidates.

Validation for this documentation-only change: `npm run docs:generate` and `npm run docs:check` passed. A local consistency check across seven tracking/index/context documents verified **44 local links**, **258 ID references**, **10 tables**, and unique customization/feature/click IDs. No application code changed; build/unit/E2E workflows were not rerun for this documentation change. No provider calls, paid AI requests, or workspace data changes were made. Existing application test results above are historical evidence, not new checks from this baseline.

## Ordered proposal work queue

On 2026-10-04, created [PROPOSAL_WORK_QUEUE.md](PROPOSAL_WORK_QUEUE.md) with **25 proposed items**, stable PROP IDs, a recommended order, prerequisites, relative scope, and item-level acceptance criteria. The first local-release path covers page arrangement review, the requested word/character setting, editing/recovery, connection repair, backup/restore, incremental/reliable ingestion, chat history, provider evidence, release checks, and local launch. Optional display and generation improvements follow. New providers/OAuth, hosted foundations, and semantic AI have explicit conditional scope.

Added FEAT-024 through FEAT-031 for the proposed connection repair, backups, incremental ingestion, sync resilience, expanded chat history, local lifecycle, generation review, and paged-history capabilities. The feature inventory/matrix now track **31 features**; existing **19 customization IDs** and **38 click IDs** are preserved. Linked the queue from README, PRODUCT, customization/feature/click/coverage documents, and canonical agent context. Existing implementation and verification statuses remain unchanged; page approval and account-specific evidence are separate queue items.

Validation for this documentation-only change: agent context regeneration and `npm run docs:check` passed. A local consistency check verified 25 unique proposal definitions and index rows, contiguous dependency-compatible order, an acyclic proposal graph, matching feature-list/matrix IDs, unique feature/customization/click IDs, valid local links/heading anchors, and well-formed Markdown tables. Application code was unchanged, so build/unit/browser workflows were not rerun. No provider calls, paid AI requests, task creation, or workspace data changes were made.

## Proposal labels and local preview access

On 2026-10-04, added a short label to each of the **25 proposal items**, both in the queue index and its definition. Stable PROP IDs, linked heading anchors, order, dependencies, and proposal statuses are preserved.

Validation for this documentation-only change: `npm run docs:check` passed, and a local consistency check confirmed 25 unique labels matching the index and definitions, preserved proposal anchors, and well-formed queue tables. All five local preview URLs returned HTTP 200 from the running development server. That availability check does not add new browser layout or live-provider evidence. Application code and workspace data were unchanged.

## Generated data matrix

On 2026-10-04, added [DATA_MATRIX.md](DATA_MATRIX.md) as the data companion to the existing Integrations document. It covers **11 stored/derived record groups**, all **19 Entry fields** with actual types/optional markers, mappings for the **six existing source kinds**, and retention, ingest identity, normalization bounds, public summaries, read/save state, filtering, deletion, media, and manual AI data flow. Provider setup and connection restrictions remain in INTEGRATIONS. The matrix explicitly distinguishes normalized collected text from raw/complete remote documents and local read state from IMAP Seen flags.

The canonical reviewed metadata is [scripts/data-matrix.ts](../../scripts/data-matrix.ts); generation also reads Entry declarations and shared limits/provider names from `shared/model.ts`. `npm run docs:generate` renders the matrix; `npm run docs:check` detects field/provider coverage mismatches and generated output drift. Linked the matrix from README, Integrations, Architecture, Feature Matrix, canonical agent context, and the generated documentation registry. Other maintained product lists/matrices were not converted into generated outputs. No reader, provider adapter, store, API, or settings behavior changed.

Validation: `npm run verify` passed production build/type checking, all **29 local/mocked tests**, and documentation synchronization. A local generator check confirmed deterministic output and rejection of three in-memory model changes (added field, removed field, renamed Entry interface). A documentation consistency check verified the 19 unique entry-field rows, **120 local links**, and **11 well-formed tables** across the changed/index/generated documents. Browser workflows were not rerun because this change affects documentation tooling only. No provider requests, paid AI calls, credentials, or user workspace data were used or changed; referenced browser/live results remain historical evidence.

## Connection-owned data and sidebar arrangement revision

On 2026-10-04, applied the requested arrangement change: removed the top workspace header, page heading/actions, and default Reading feed / Saved for later / Background data navigation. Feed creation is only in the sidebar; Feed view / Customize filters switches the selected feed’s mode, preserving it when choosing another feed. Settings and profile remain sidebar/rail actions. Preview review links moved into the sidebar. The root now opens the feed list. Bookmarks remain accessible through the reader’s Saved filter and connection data, including after feed-filter exclusion or source unlinking.

Connections now own collected data independently of feeds. `/connections` and `/preview/connections` provide source selection, original collected data, source receipts, refresh, enabled/background switches, and feed links. A connection may supply several feeds; each feed still accepts at most three sources including paused ones. Feed customization begins with source selection, then lens controls and expandable decision explanations. Linking/unlinking applies immediately; rules retain explicit Save customization.

The API accepts independent connection creation, validates all feed links before applying a change, and coalesces syncs by source across feeds. Source background collection is opt-in every five minutes. Existing stores migrate legacy feedId into feedIds and transfer background opt-in without replacing item IDs or credentials. Deleting a feed preserves connections/items; removing a connection deletes its owned items/credentials/source receipts and invalidates affected digests. In-flight generation checks current item eligibility; paused/resumed source requests cannot commit an older attempt.

Validation: `npm run verify` passed build/type checking, **33 local/unit/API tests**, and generated documentation synchronization. **Five Playwright workflows** passed using isolated temporary workspace/sample data. These cover all five original previews, new connection sharing/unlinking, selected-feed mode continuity, sidebar-only creation, header removal, source setup/linking, reader/filter/bookmark/chat behavior, profile/settings, and mobile navigation. Preview instrumentation observed zero workspace API requests and unchanged real workspace snapshots. New API checks cover pre-link ingestion, separate feed lenses, preserved IDs/read/save state after unlink/feed deletion/restart, link capacity including paused connections, legacy migration with credential preservation, and shared-source sync locking. Desktop and mobile screenshots were inspected, including connection details and the sidebar. No live-provider or paid AI request was made for this change. The user preview was restarted after browser checks.

## Unified reader, sidebar cleanup, and local mention alerts

On 2026-10-04, moved My workspace into an expandable app-settings control, placed named feeds above Feed mode, and removed the feed directory and layout-preview navigation panel. The retired directory URLs open the reader for compatibility; five current preview destinations are reader, customization, connections, profile, and settings. A small fictional-data badge remains. Feed entries have visible gaps in comfortable and compact layouts.

The reader now mixes every content type in one timeline. Removed Posts/Chats/Articles & email selections, the permanent search field, source dropdown, and sorting caption. The top line has The latest from your world plus Saved, Unread, and Alerts. Search opens near the top from the rail button below Menu, supports submit/clear/Escape, and restores focus. Conversations open from the mixed feed and return through Back to feed. Collected connection items expand individually to expose text and Save/Unsave.

Added FEAT-032 / CUST-020: local per-feed mention alerts, off by default, with up to 20 explicit @handles configured in customization. Exact case-insensitive whole-handle matching runs on included collected title/body text, preserving source/lens exclusions. The alert popup shows condensed excerpts, an unread count, and Open tagged post; opening marks read and respects content warnings. Older feeds receive off/empty defaults. This is deterministic text matching, not provider-native notification coverage or AI generation. External delivery is proposed as FEAT-033 / PROP-026, with its own destination/permission/retry/receipt scope; no outgoing alert delivery was built.

Validation: `npm run verify` passed production build/type checking, **37 local/unit/API tests**, and generated documentation synchronization. **Six Playwright workflows** passed using isolated temporary data and fictional samples. New assertions cover sidebar order, absence of removed controls, actual gaps between entries, popup position/focus/Escape, per-feed alert enable/handle controls, unread changes, muted mentions absent, expandable connection content and retained save state, app-settings workspace details, and mobile layouts. Unit checks cover complete/federated/Unicode handles, false positives from author names/email/URL paths, opt-in and paused/muted exclusions, defaults, input validation, and bounded excerpts. API checks verify alert configuration persistence and rejected invalid edits. Desktop/mobile feed, connection, settings, search, and alert screenshots were inspected. Preview requests remained isolated from workspace/provider APIs, with unchanged workspace snapshots. No live-provider or paid AI call was made. The local preview was restarted after E2E completed.

## Collapsed connection post logs

On 2026-10-04, added an explicit Post log button for each connection (CLICK-041 / FEAT-012). Logs start closed and expand within the connection details on the same page. Clicking the button again or Close post log collapses it. Only that connection’s collected originals appear; individual posts still expand for reading and Save/Unsave. Linked feeds and Activity remain available alongside the log. Changing connections hides the previous source’s log.

Validation: `npm run verify` passed production build/type checking, **37 local/unit/API tests**, and documentation synchronization. **Seven Playwright workflows** passed with isolated temporary data and fictional samples, including default collapse, each source’s own item counts, inline expansion/collapse, reload, saved items, and mobile overflow checks. Desktop connections and mobile expanded-log screenshots were inspected. The initial browser run exposed an ambiguous test selector for Customize filters after Linked feeds became the default tab; the selector now targets the sidebar Feed mode group. No live-provider or paid AI requests were made. The local preview was restarted after E2E.

## Reader refresh and mobile navigation placement

On 2026-10-04, moved Refresh feed from the sidebar into the reader top row beside Saved, Unread, and Alerts, preserving its busy/no-source state and existing sync action. Connections now sits beside App settings in the sidebar and has a button inside Settings. Mobile navigation uses a compact top strip with Search on the left and Menu at the top right; the sidebar opens from the right and closes on navigation.

Validation: `npm run verify` passed build/type checking, **37 local/unit/API tests**, and documentation synchronization. **Eight Playwright workflows** passed using isolated temporary data and fictional previews. New coverage checks refresh placement/action, Settings → Connections, mobile menu coordinates, right-edge drawer placement, dismissal on navigation, and overflow. Mobile reader and open-menu screenshots were inspected. No live-provider or paid AI request was made. The local preview was restarted after browser checks.

## Complete mobile rail actions

On 2026-10-04, moved every desktop icon-rail action into the mobile top bar: Home, Search, color theme, workspace guide, settings, profile, and Menu. Menu remains at the far right. The existing actions and desktop arrangement are preserved.

Validation: `npm run verify` passed build/type checking, **37 local/unit/API tests**, and documentation synchronization. **Eight browser workflows** passed with isolated temporary data and fictional previews. Navigation checks now verify all seven controls fit inside the top bar at 320px and 390px widths, and exercise mobile settings/profile navigation. The updated mobile screenshot was inspected. No live-provider or paid AI calls were made. The local preview was restarted after E2E.

## Left-aligned mobile header controls

On 2026-10-04, grouped all mobile top-bar actions on the left by removing the automatic spacer before theme/help/settings/profile. Existing order and the right-opening navigation panel remain unchanged.

Validation: `npm run verify` passed build/type checking, **37 local/unit/API tests**, and documentation synchronization; **eight isolated browser workflows** passed. Updated mobile assertions verify consistent 6px spacing across the formerly separated groups, with existing 320px/390px viewport checks. The mobile screenshot was inspected. No live-provider or paid AI calls were made. The local preview was restarted after E2E.

## Mobile Menu first

On 2026-10-04, moved Menu to the leftmost mobile header position, before Home, Search, theme, guide, settings, and profile. Validation: `npm run verify` passed build/type checking, 37 local tests, and documentation synchronization; all eight isolated browser workflows passed. The mobile position assertion confirms Menu precedes Home at the left edge, and the screenshot was inspected. No live-provider calls were made. The local preview was restarted after E2E.

## Left-opening mobile sidebar

On 2026-10-04, anchored the mobile sidebar to the left edge beneath the header, matching the leftmost Menu button, and reversed its shadow direction. Validation: `npm run verify` passed build/type checking, 37 local tests, and documentation synchronization; all eight isolated browser workflows passed, including the left-edge position and navigation dismissal checks. The open mobile sidebar screenshot was inspected. No live-provider calls were made. The local preview was restarted after E2E.

## Mobile Home on the right

On 2026-10-04, moved Home to the far right of the mobile header. Menu and the remaining actions stay grouped on the left. Validation: `npm run verify` passed build/type checking, 37 local tests, and documentation synchronization; all eight isolated browser workflows passed, including Home's right-edge position and existing mobile bounds/navigation checks. The mobile screenshot was inspected. No live-provider calls were made. The local preview was restarted after E2E.

## Help in sidebar and settings

On 2026-10-04, removed the guide icon from the desktop rail/mobile header and added labeled Help actions to the sidebar and App settings. Both open the existing workspace guide; opening Help from mobile navigation closes the sidebar.

Validation: `npm run verify` passed build/type checking, 37 local tests, and documentation synchronization; all eight isolated browser workflows passed, including Help from both destinations, dialog dismissal, and absence from the icon rail. No live-provider or paid AI calls were made. The local preview was restarted after E2E.

## Profile near sidebar top

On 2026-10-04, moved the sidebar profile button from the bottom to directly beneath the MyFeed name, above My feeds, on desktop and mobile. Validation: `npm run verify` passed build/type checking, 37 local tests, and documentation synchronization; all eight isolated browser workflows passed. Updated checks verify profile placement above feeds and that clicking it opens Profile and dismisses mobile navigation. The mobile sidebar screenshot was inspected. No live-provider calls were made. The local preview was restarted after E2E.

## Local production setup

On 2026-10-04, added `npm run prod` to build and start the existing local production server. README documents port 3188, shutdown/restart, shared data ownership, and production preview access. The compiled UI and API are served by one loopback server. This setup does not mark the ordered release backlog or provider verification complete.

Validation: `npm run verify` passed build/type checking, 37 local tests, and documentation synchronization; eight isolated browser workflows passed. A separate production-mode smoke check used a temporary store and verified compiled assets, the root and five preview routes, API availability, rejected external Origin, and no browser errors. The development server was stopped and the production server started with the existing local workspace. No provider or paid AI calls were made. The user's meaning of “Sol build” remains pending clarification.

## Connection-first requirements, final item-edit proposal, and audit matrices

On 2026-10-04, inspected the documentation structures in Hybrid Creator Platform (`docs/FULL_APPLICATION_AUDIT_MATRIX.md`, `docs/agent/MODULE-ITEM-MATRIX.md`, and `docs/agent/VERIFICATION-MATRIX.md`) and OpenTechnologyApp (`docs/readable/FULL_APPLICATION_AUDIT_MATRIX.md`) read-only. Added MyFeed's [connection matrix](CONNECTION_MATRIX.md), [full application audit](FULL_APPLICATION_AUDIT_MATRIX.md), [API audit](API_AUDIT_MATRIX.md), and [verification matrix](VERIFICATION_MATRIX.md). These cover configuration entry/ownership/readiness, components and all 35 feature IDs, the 13 current API method/path pairs, required scenarios, existing evidence, and next proof. The other applications' data, credentials, infrastructure, and pass results were not imported.

Recorded the requested direction that all posts, alerts, and features go through Connections first to configure. PROP-027 / FEAT-034 / CUST-021 / CLICK-042–043 tracks the unified setup journey. Source configuration already uses connections; current alert configuration remains in Customize filters and AI in Settings. Those gaps remain explicitly requested work. Per-feed scope, local profile/appearance, source capacity, read-only ingestion, and manual AI boundaries remain intact.

Appended **PROP-028: Edit item** as the final queue item, linked to FEAT-035 / CUST-022 / CLICK-044–046. It proposes connection-owned local title/body overrides, visible original/reset access, stable identity/read/save state, resync/restart/conflict handling, and backup/removal semantics. Source-derived filtering, mentions, and digest inputs continue using collected originals; remote posts/messages are never edited. No item editor, override schema, unified setup UI, or new API was implemented.

Updated the product/customization/feature/click documentation, README, canonical agent context, and documentation generator mappings, then regenerated agent context and registries. Existing proposal IDs and order were preserved; the queue now has 28 definitions with matching labels/index rows. Corrected stale current matrix descriptions of reader tabs, the retired directory, and background-sync control placement while preserving historical implementation records.

Validation: `npm run verify` passed production build/type checking, all **37 local/unit/API/mocked tests**, and generated-documentation synchronization. Vite reported two non-failing dependency comment-annotation warnings in Zod. A local documentation consistency check passed local links/heading anchors and Markdown table shapes across 20 files; unique/matching 35 feature, 22 customization, and 46 click IDs; all 28 proposal definitions/index labels and dependency order; full-audit feature coverage; and exact reconciliation of 13 registry/handler/API-matrix routes. Repeated generation was also checked for deterministic output. Browser/E2E workflows were not rerun because only documentation and its maintenance mappings changed; historical browser/provider results remain separately dated. No live-provider requests, paid AI calls, credentials, or user workspace data were used or changed, and the running local app was not restarted.

## Remove Settings Appearance

On 2026-10-04, removed the Appearance tab and theme picker from SettingsContent. App settings defaults to AI configuration; legacy appearance/unknown tabs render valid AI controls instead of an empty form. Profile editing remains a separate page, and the rail/header theme toggle remains available. Updated product, customization, feature, click, and connection documentation. No source/API/storage changes were needed.

Validation: `npm run verify` passed build/type checking, 37 local tests, and documentation synchronization; all eight isolated browser workflows passed. Existing theme checks now use the rail toggle and assert Appearance is absent. Preview theme reset, profile edits, AI preview restrictions, and settings routes passed. Production was rebuilt and restarted afterward. No provider or paid AI calls were made. Searches of project documentation, related MyFeed task history, and open repository issues did not locate Sol to-do labels; proposal selection remains pending the user's PROP IDs or task names.

## PROP-002 / PROP-003: per-feed item text limits

On 2026-10-04, began the user-authorized proposal build with the text-limit specification and implementation. Added a discriminated feed textLimit schema, old-store default migration, shared Intl word/grapheme presentation helper, customization controls, and collapsed post/article/email/chat previews. The compatible default preserves prior behavior; choosing a custom mode shows an editable starting value, applied only after Save. Full reading and conversation views retain originals. Text budgets do not change filtering, search, saved/read state, mention matching, or digest fingerprint/input behavior. Chat preview content warnings hide body text. The optional question about new-feed defaults remains unanswered, so no new automatic budget was selected.

Validation: `npm run verify` passed build/type checking, **42 local/unit/API tests**, and generated documentation synchronization; **nine isolated browser workflows** passed. Checks cover independent feed persistence and restart, invalid bounds/fractions/stale edits, legacy defaults, exact boundaries, family emoji/flags/combining marks, paragraph preservation, dictionary words without spaces, cloned preview isolation, pipeline/fingerprint invariance, post expansion, Saved and search beyond the budget, limited article/chat previews, full article/conversation access, and mobile rendering. Initial E2E found that Field help text was included in new control names; explicit labels resolved it. Mobile limited-post and desktop conversation screenshots were inspected. Updated readable inventories, queue statuses, and generated data contract source. No live-provider or paid AI calls were made. Production was rebuilt and restarted after E2E. Final page approval and later proposal work remain open.

## Ordered proposal implementation — 2026-10-05

Implemented the authorized local queue: session drafts/navigation/keyboard recovery (PROP-004), versioned source repair and read-only checks (005), protected paired backup/restore and startup validation (006), bounded provider checkpoints and exponential retry health (007–008), explicit older conversation/source collection (009), local release/launcher work (012–013), media/typography/type limits/conversation previews (014–017), reviewed manual AI token/cost reservations and uncertainty receipts (018), metadata summaries/revision-scoped retained-history pages (019), connection-first setup (027), and versioned source-owned local title/body overlays (028). Existing text-limit work remains PROP-002–003. Originals drive filtering, search, alerts and AI; presentation changes and configuration saves trigger no paid call or outbound message.

A pagination regression found during public checks was corrected: an initial three-page read establishes the high-water mark, while older history is explicit. Subsequent catch-up uses the prior high-water mark and only commits checkpoints with successful merging. IMAP uses read-only locks, UIDVALIDITY identities, metadata-first size checks and bounded ranges that advance through deleted UID slots; empty mailboxes clear stale partial work. Store/backup validation now includes optional checkpoints, health/checks and generation receipts. Local edit conflicts use the editor's captured baseline even when provider originals refresh.

Public read-only checks on 2026-10-05: NASA RSS returned 10 items on initial and repeat reads; public Bluesky `bsky.app` and Mastodon `Gargron` returned 120 initial / 40 repeat items. All repeats added zero new provider IDs, with no partial catch-up flag. No provider text, credentials, mailbox content or paid requests were logged. These prove public reads only, not account-login/OAuth or arbitrary instance compatibility.

A synthetic five-feed/fifteen-source fixture with 9,500 items (4,500 ordinary plus 5,000 saved) measured 13,885,924 bytes for full state versus 52,865 bytes for a 30-decision page, with a local 89.7 ms query. This is a single fixture measurement, not a production performance SLA. Full-lens filtering/deduplication precedes paging; ordinary retention remains 300/source plus saved items.

Isolated macOS launcher start/status/stop/restart checked production routes, paired-state preservation and restricted permissions. Explicit next-login configuration is implemented but was not activated on the user's machine; Linux is not live-verified. Update verifies reviewed local code after a protected pre-update archive and never pulls code automatically. Clean installation, final verification/browser results and release preview are recorded below when completed.

PROP-001 remains human arrangement review. PROP-010/011 require configured mailbox/Rocket.Chat accounts for authenticated evidence. PROP-020 needs a next-provider choice; 021–024 need a hosted edition/identity/platform scope; 025 needs a separate semantic-processing privacy/spending choice; 026 needs a destination/provider and idempotent delivery contract. These are waiting/conditional items, not completed code or mocked live proof. No public deployment, outbound messages, paid AI round trip, extra plugin, commit or push was performed.

The final retention review corrected a pre-existing edge case: recent bookmarks no longer consume the ordinary-item allowance. Merges retain the newest 300 unsaved items plus every saved item; receipt additions count only newly retained identities. Older-source controls state this limit explicitly so provider history is not presented as unlimited local retention. A mixed-recent-bookmark/older-item fixture checks the bound and receipt count.

Generation review failures clear the previous loaded input plan and disable submission; a browser fixture verifies this without a paid call. Review responses contain only bounded original title/body excerpts, author, ID and optional warning, excluding local overlays and unrelated item metadata. Exact returned model identity is enforced; Settings explains that moving model aliases may be rejected and a pinned snapshot ID is appropriate.

Final local release results on 2026-10-05: `npm run verify` passed TypeScript/production build, **66 local/unit/API/mocked tests in 11 files**, and generated-documentation synchronization. `npm run test:e2e` passed **14 isolated browser workflows**, including preview isolation, direct routes, keyboard/mobile navigation, draft recovery, source repair/checks, reading preferences, source editor, paging, failed generation-review cancellation, five-feed/three-source limits, background persistence and source deletion. Desktop customization and mobile reader/source screenshots were visually inspected. Vite's two Zod comment-annotation warnings are non-failing dependency output.

A code-only temporary checkout passed `npm ci --offline --no-audit --no-fund` and verification (65 tests at that earlier revision), without user data, keys or environment files; the directory was removed. A separate temporary macOS production fixture passed start/update/stop/restart/status, production preview HTTP 200, protected pre-update backup, same store/key and local edit/read/save preservation, active-server restore refusal, offline paired restore, and 0600 store permissions. It was stopped and removed. Final code checks include the additional retention regression (66 total). Local documentation links/tables, 28 matching proposal definitions/index entries and 17 registry/API matrix pairs were reconciled; `git diff --check` passed. User production is restarted after the final browser gate.

Production restart completed with `npm run local -- start`. The root and all five current `/preview/` routes returned HTTP 200 at `http://127.0.0.1:3188`; the preview browser opening was queued by the app. Development port 5188 is intentionally stopped. Existing user data was preserved; destructive release checks used temporary directories.

The local launcher/restore race hardening now uses an atomic `.operation-lock` marker. Isolated tests cover concurrent acquisition, release, stale-owner recovery and preservation of surrounding data. The marker is scoped to the configured data directory and is removed on normal or failed command completion.

After this hardening, `npm run verify` passed the production build, **68 tests in 12 files**, and generated documentation synchronization. The two existing Vite/Zod annotation messages remain non-failing dependency warnings. Browser workflows were not rerun because this change only affects local lifecycle scripts and isolated lock tests; the prior 14-workflow E2E gate remains recorded above.

## Connection reality and pipeline alignment — 2026-10-05

Inspected the current model/catalog, adapters, Connections setup, AI configuration and reviewed digest flow. Built source kinds remain RSS, Mastodon, Bluesky, IMAP, Rocket.Chat and Sample library; OpenAI is a workspace processing capability. AI currently produces a manually reviewed digest, not a configurable general pipeline or imported output source. A credential-free summary of the running local workspace showed one feed, zero connections/items, no AI key and zero generation receipts. No workspace mutation was performed.

Fresh direct public adapter reads used no credentials and persisted no content: Hacker News RSS returned 20 initial / 20 repeat entries, Bluesky `bsky.app` returned 120 / 40 and Mastodon `Gargron` on mastodon.social returned 120 / 40. Repeats introduced zero new provider identities for each source, with no partial catch-up flag. Only counts were printed. These are live public reads, not logged-in timeline, mailbox, Rocket.Chat or paid AI proof.

Created separately labeled requested proposals: PROP-029 AI Pipeline, PROP-030 API source, PROP-031 YouTube videos and Shorts, PROP-032 TikTok access and source. Stable links are FEAT-036–039, CUST-023–026, CLICK-057–060, CONN-014–017 and AUD-027–030. Direction for AI Pipeline is being clarified; the proposed default selects a custom feed as input, while external precomputed results use the API source. Existing explicit review/spending and local-only boundaries remain intact. The queue now has 32 items, with local item editing kept final; completed statuses did not change.

Official provider documentation was reviewed on 2026-10-05 and linked in INTEGRATIONS and the proposals. YouTube public channel/playlist metadata requires API-project credentials/quota; its under-four-minute search duration is not exact Shorts proof. TikTok Display covers authorized creator uploads and needs app/product approval; published production review excludes private/personal-use apps, a feasibility gate for this edition. Neither adapter is built, and no YouTube/TikTok credential, sandbox grant, paid call or outbound message was used. This is documentation/feasibility work; no UI/API/data schema was changed, so application and browser tests were not rerun.

Validation: documentation generation and `npm run docs:check` passed; `git diff --check` passed. A local consistency check confirmed 32 unique proposal definitions matching 32 index rows, Edit item remaining final, all new feature/customization/click/connection/audit rows present, and resolved local documentation links. Production remained running throughout.

## Manual posting proposals and remaining count — 2026-10-08

Reconciled the 32-item queue as 18 completed local specification/build items and 14 remaining review/account/conditional/requested items. Added PROP-033 Manual posting composer, PROP-034 Rocket.Chat posting and PROP-035 Fediverse posting; the queue now contains 35 items with 17 remaining. Existing completion evidence did not change, and Edit item remains the final entry. New traceability rows are FEAT-040–042, CUST-027–029, CLICK-061–064, CONN-018–020, AUD-031–033 and VERIFY-013.

Official Rocket.Chat single-room send/thread/client-ID and Mastodon publishing/write-scopes/visibility/idempotency documentation was reviewed on 2026-10-08 and linked in INTEGRATIONS/the queue. These establish potential write APIs, not authenticated readiness or live delivery. Proposed first scope is manual text/links and supported replies, with independently configured writing identity/destination, reviewed draft, persistent receipts and uncertain-send handling. Other providers use separately selected read/write scope under PROP-020; automated alert delivery remains PROP-026. No source code, routes, schemas, actual workspace data or provider messages were changed. This documentation-only work does not require application/E2E reruns and does not add posting functionality.

Validation: generation and `npm run docs:check` passed; `git diff --check` passed. The local queue check confirmed 35 unique index/definition pairs with matching labels and consecutive order, 18 completed/17 remaining, an acyclic declared dependency graph, resolved local documentation links, and all new tracking rows. Edit item remains final. These are documentation checks, not live posting tests.

## Default AI Pipeline and API source implementation — 2026-10-08

Delivered PROP-029/030 (FEAT-036/037, CUST-023/024, CLICK-057/058, CONN-014/015, AUD-027/028). Default digest processing is now an explicit selected-feed profile with persisted instructions, a Connections configuration/review entry, exact instruction/input review and the existing token/rate/budget confirmation. Instructions are included identically in token counting and generation. Output remains a referenced dated `feed.digest` snapshot outside source entries; no feedback loop, automatic run, arbitrary model endpoint or semantic lens was added. Old feeds migrate to an empty-instruction digest profile without changing their compatible fingerprint. Paid AI remains mocked/unverified.

API source adds a seventh catalog kind, public HTTPS JSON GET, encrypted bearer or X-prefixed API-key headers, declarative array/field mappings and stable string/safe-integer IDs. Invalid paths/prototype access, missing IDs, invalid text/date/tags, oversized pages and repeated cursors fail. Up to three 100-item pages are collected atomically; explicit older reads resume the saved cursor. Missing dates use 1970-01-01; mapping/auth-mode changes require confirmed reset and invalidate old work. Secret-only repairs retain credentials/items; repeat ingestion preserves saved/read/local overlays. Store/backup validation and generated data/API registries include the new configuration/cursor/profile. Configured headers never cross redirect origins.

Browser work uncovered and fixed existing Add connection callbacks treating a click event as a provider kind, and repair forms using RSS after reload instead of the existing connection's kind. New fields have explicit accessible names. The final isolated browser workflow verifies API setup/reload/mappings and hidden credential value, persisted pipeline instructions, disabled generation without a key, mobile Connections and in-memory preview reset. Source sync is intercepted in this browser fixture; it is not provider ingestion evidence. Mobile screenshot was inspected.

Separate live public check: Hacker News Algolia JSON returned 10 initial / 10 repeat items with zero new repeat provider IDs and completed single-page history. The adapter used no credentials and wrote nothing to the user's workspace; only counts were printed. This proves public JSON ingestion at that endpoint, not authenticated services or a live external AI pipeline. No paid AI call, posting or remote-account mutation occurred. The queue now has 20 implemented/specified and 15 remaining of 35; YouTube/TikTok and posting remain unimplemented.

Validation: TypeScript/production build, 78 local/unit/API/mocked tests in 14 files and generated documentation checks passed. The final full Playwright run passed all 15 isolated workflows after fixing the newly exposed setup/repair issues and field/selector names. Subsequent API safe-integer identity hardening is covered by the same API-source unit test; browser behavior did not change. The two known Vite/Zod annotation warnings remain non-failing. Production was started after browser checks; final consistency/HTTP checks are recorded below.

Final gate after identity hardening: `npm run verify` passed all 78 tests, production build and documentation synchronization. `git diff --check` and local-link/35-proposal index checks passed (20 completed, 15 remaining). Production Connections and all five preview routes returned HTTP 200 at port 3188; opening Connections in the app was queued. No user's source connection or AI credential was added; production startup only applies the compatible feed-profile migration.

## TikTok access feasibility decision — 2026-10-08

Rechecked PROP-032 against TikTok's current official documentation. The Display API supports an authorized creator's profile and recently uploaded public videos, but setup requires a TikTok developer account, approval for both Login Kit and TikTok API products, granted `user.info.basic` and `video.list` scopes, and direct creator consent. TikTok's review criteria exclude private/personal-use apps and require a developed externally facing website. Research Tools are a separate route restricted to approved qualifying non-commercial research use cases and are not a commercial reader credential.

The current MyFeed edition is local-only: its inspected store has one starter feed and zero connections, and there is no TikTok adapter, app approval, creator grant, or research approval configured. The decision is therefore to keep PROP-032 unsupported/deferred for this edition. No Connect control, scraper, purchased-plan assumption, TikTok request, credential, sandbox grant, or live-provider claim was added. Selected external links/embeds remain a separate future candidate, not automated ingestion.

## Manual posting implementation — 2026-10-08

Delivered PROP-033–035 / FEAT-040–042 / CUST-027–029 / CLICK-061–064 / CONN-018–020 / AUD-031–033. Added independent encrypted writing setup and read-only checks on existing Rocket.Chat/Mastodon-compatible sources, durable local drafts and exact five-minute reviews, explicit provider sends, and persistent outcome metadata. No write-only source type or extra source slot was added. Shared limits are 50 drafts and 100 receipts; unresolved attempts are never pruned/replayed automatically. Source repair disables writes, pause blocks Send, disconnect removes drafts/keys, and late acknowledgments update only preexisting receipts without recreating deleted source data. Nested ciphertext is omitted from summaries and both keys/drafts are validated in paired backups. Content export can include local draft text and receipts.

Rocket.Chat verifies writing-user identity, joined normal public-channel metadata and same-room thread root; single-room payloads have client IDs, no impersonation fields and no URL previews. Mastodon verifies its credential/profile, v2 instance limit and accessible public/unlisted parent IDs, with explicit audience/warning/language and idempotency key. Both recheck identity/target before transmission and reject write redirects. Definite permission/validation/rate rejection records Failed; timeout/malformed/ambiguous acknowledgment records Unknown, locks the draft and never retries. Interrupted Sending becomes Unknown on startup. No draft or locally submitted post becomes a collected original automatically.

Added source Post log and enabled-writer reader/chat Reply shortcuts. PostingPanel retains unsaved composer changes in session memory and saved drafts on disk, reviews exact sender/destination/body, and displays attempt/provider IDs and global receipts after source removal. Preview uses local fictional drafts/checks/Simulate send only. The digest-copy shortcut verifies fingerprint, history revision and all eligible references on a bounded page; stale/unavailable/filtered outputs cannot be copied through it. Copy is manual and does not generate or publish.

Evidence: isolated provider/API fixtures cover separate encryption/masking, no send on save/check/review, exact Mastodon audience/payload and Rocket.Chat root/identity, version/expiry/foreign/private-parent/size rejection, duplicate in-flight/recorded tokens, permission failure, timeout sanitization/locks, preflight and submitted disconnect races, interrupted restart, paired backup/restore, and stale digest-copy rejection. Browser fixtures cover local writing/draft persistence and exact review; provider check/send outcomes are intercepted simulations, not real deliveries. Fictional preview workflow observes zero workspace API requests and resets on reload. Source/network tests also block posting redirects and cross-origin query-key leaks. No live message, provider account/key or paid AI request was used in this implementation.

Final validation: `npm run verify` passed production build/type checking, **95 local/unit/API/mocked tests in 15 files**, and generated-documentation synchronization. `npm run test:e2e` passed **17 isolated workflows**; two additional targeted posting workflows passed after adding focused mobile control/composer screenshots and overflow assertions. Mobile posting controls and composer were visually inspected. Known Vite/Zod annotation warnings remain non-failing. `git diff --check`, local documentation links, all 35 matching proposal index/definition IDs (24 completed/11 remaining) and all 24 registry/API-audit pairs passed. User production was started again after browser checks; no writing credential or source was added to that workspace.

## Browser isolation incident, quarantine and guard — 2026-10-08

Final normal-server inspection found historical test-created feeds/connections in `data/store.json`, written at 2026-10-09 02:19 UTC (2026-10-08 local). The other MyFeed chat's recorded browser command ran while the normal API remained active; Vite proxied into it, while that run's intended `myfeed-e2e-a7fc...` store remained at revision 0 with zero sources. This was not a user-created integration and invalidates that earlier run's claimed isolation. This posting task's prior suites used separate temporary stores after stopping the normal server.

With the normal server stopped and lifecycle lock held, preserved exact paired store/key files at `data/recovery-2026-10-09T03-21-33.619Z/` (directory 0700/files 0600). Cleanup required an exact match for the five known fixture source names/kinds, the encrypted fictional API marker, the four known test feed names/creation window, and the original starter ID. Only identified fixture feeds/sources and their generated entries/runs were removed. The original starter ID/date, existing profile/customization metadata and encryption key were retained; prior preference values that tests may have overwritten were not invented. The complete pre-cleanup state remains recoverable from the paired snapshot. Normal state is again one feed, zero sources and no writing credentials.

Added fail-closed test sessions: validation before opening a store, temporary-root/name and symlink checks, per-run Playwright marker/global setup, matching request/response headers, and rejection of marked traffic by normal APIs. `npm run verify` passed 99 tests in 16 files, build and documentation checks. A controlled denial probe with the normal server active failed before any browser workflow and left the normal store hash unchanged. This was a read-only isolation test, not a destructive workflow against normal data. Final guarded full-suite/store-hash results are recorded below.

Final guarded run: all **17 Playwright workflows passed**, with the normal server stopped, the API's expected test-session marker verified before workflows, and the exact normal `data/store.json` SHA-256 unchanged before/after. Initial proxy 502/503/504 responses are retried only during startup; a missing/mismatched marker or normal API is refused before tests. The normal app was restored afterward to one existing starter feed/zero sources, retaining the key and profile/customization metadata. The quarantine snapshot remains available and is ignored by Git. No live message or paid AI call occurred.

Official references rechecked: [Display API overview](https://developers.tiktok.com/docs/en/display-api-overview), [Display API setup](https://developers.tiktok.com/docs/en/display-api-get-started), [scopes](https://developers.tiktok.com/docs/en/tiktok-api-scopes), [app review guidelines](https://developers.tiktok.com/docs/en/app-review-guidelines), and [Research Tools eligibility](https://developers.tiktok.com/products/research-api/). Documentation-only checks passed with `npm run docs:check` and `git diff --check`; application/unit/E2E tests were not rerun because no source, route, schema, or UI behavior changed.

## Sol/Astra local completion and unknown-send recovery — 2026-10-08

Closed the remaining manual-posting recovery gap under PROP-033–035. New receipts retain original sender/reply metadata; explicit `POST /api/outbound/receipts/:id/check` uses only provider GET requests. Rocket.Chat checks the original client message ID, room, sender, text and thread. Mastodon checks a user-supplied local-instance post ID against original source text, warning, sender, audience, explicit language, reply and attempt time. A matching candidate records `provider-lookup` confirmation; original Mastodon idempotency-key attribution remains independently unavailable. Missing/mismatched results never unlock retry or prove failure. Legacy missing evidence and deleted/changed sources are refused; positive results recheck source/writer/draft versions before settlement. Paused sources or disabled publishing can still perform an explicitly requested read-only lookup.

Connections source/global receipts expose the control. Provider fixture tests cover matching results, all payload/identity/time mismatches, legacy evidence, restart and deletion races; the browser fixture confirms an unknown send becomes confirmed through one lookup with no additional submission. No live provider send, outcome lookup or paid AI call was performed. Official GET/source contracts were reviewed and linked in INTEGRATIONS.

The queue now labels all 23 Sol/Astra local items as implemented/specified and distinguishes the parallel Terra/Luna YouTube/TikTok scope. Total remains 35 proposals, 24 implemented/specified and 11 review/account/conditional entries. This completes the local Sol/Astra build scope; it does not complete human page approval, live email/Rocket.Chat verification, unsupported TikTok access or the conditional provider/hosted/semantic/external-alert tracks.

Validation: `npm run verify` passed the production build, **105 tests in 16 files**, and generated-document synchronization. `npm run test:e2e` passed **17 isolated browser workflows**, including read-only outcome recovery. Exact normal store and key SHA-256 values remained unchanged before/after browser checks. `git diff --check` passed; 35 proposal definitions remain unique. The registry and API audit now contain 25 method/path pairs. Production was restored with `npm run local -- start`; the root and five preview pages returned HTTP 200 at `http://127.0.0.1:3188`.

## Remaining-work continuation readiness — 2026-10-08

Reviewed all 11 remaining entries after local Sol/Astra completion. None is an unconditionally selected local adapter/build: layout approval is human evidence; email/Rocket.Chat need explicitly configured test accounts; TikTok needs an eligible access route; provider expansion, hosted edition, semantic processing and external alerts need their recorded scope decisions. Asked which next build track to select without inventing a provider/destination, hosted architecture or automatic AI spending.

Corrected README's stale claim that PROP-027/028 were unimplemented, updated the page-approval links to the running production port, and clarified that PROP-026's missing automatic alert delivery does not imply manual posting is unavailable. Canonical agent context now documents read-only send recovery. Added a practical PROP-010/011 account verification procedure with explicit evidence classes, unchanged remote Seen checks, source/reading state, history/filtering, repair/restart and disposable-fixture cleanup. It is preparation, not live account evidence; proposal completion counts remain unchanged. Documentation generation/synchronization and whitespace/link/ID consistency checks passed. No application behavior, workspace credentials/data, remote messages or paid AI calls changed; application/E2E gates retain the previous 105-test/17-workflow result.

## Combined merge review — 2026-10-09

Reviewed the shared-checkout Sol/Astra changes together with “Work on Terra and Luna proposals” (PROP-031 public YouTube metadata and PROP-032 TikTok eligibility). No separate Terra/Luna commit/branch exists to cherry-pick; the provider and documentation changes are included in the combined delivery. TikTok's unsupported disposition remains consistent with the rechecked official private/personal-use app review restriction.

Review found a YouTube checkpoint bug: refresh began at a pending older-page cursor and replaced the newest checkpoint with an older result, while initial bounded collection could schedule old history as automatic catch-up. Fixed refresh to read the current first page before resuming, retain the previous high-water mark until catch-up completes, and reserve initial older pages for explicit history loading. Added three regression tests for initial/repeated collection, interrupted catch-up/completion and page/duration failure atomicity. Added isolated YouTube setup/reload/key-retaining repair browser coverage. Its first run exposed missing exact accessible names on source-ID/API-key fields; explicit labels were added and the final full suite passed.

Final validation: `npm run verify` passed build, **108 tests in 16 files**, and generated-document synchronization; `npm run test:e2e` passed **18 isolated workflows**. Normal `data/store.json` and `data/secret.key` SHA-256 values remained unchanged through both browser runs. Production was restored afterward. Staged whitespace checks and a credential-pattern scan passed; ignored data, recovery snapshots, credentials, build outputs and browser artifacts are excluded. Evidence remains local/mocked/browser; no live YouTube account, TikTok grant, provider message or paid AI call was used. Queue totals remain 24 implemented/specified and 11 approval/account/conditional entries.


## Manual UI click testing — 2026-10-12

Inspected OpenTechnologyApp's TESTING.md, manual testing workflow and generated click tree read-only. Adapted its scenario/checklist/evidence pattern to MyFeed; no infrastructure, live data or credentials were copied. Added `npm run test:manual`, a guarded real-backend temporary workspace with port refusal, unique test marker, direct API and Vite proxy marker verification, browser request tagging, drained shutdown and normal store/key fingerprint comparison. Added a documented priority sequence, generated checklist for all 65 existing CLICK interaction groups, and a dated execution ledger. Checklist generation participates in docs:generate/docs:check; it does not assert complete DOM instrumentation or execution.

Actually clicked fictional setup/linking, reader/article save/read/reload, conversations and unread message filtering, search, mute/filter explanations, Saved access to excluded originals, local title/body save/reload/original/reset, source post log, connection health/rename/background/pause/reload/removal cancellation/Activity, canceled feed creation and second-feed sharing/reload. Full steps, partial groups, artifacts and limitations are in [MANUAL_TEST_RESULTS.md](MANUAL_TEST_RESULTS.md). No live provider, paid AI or message submission occurred. Manual source/filter/reader/edit scope includes named substeps of CLICK-001–004, 006–014, 017–018, 021–026, 044–048.

Native unsaved-edit confirmation blocked the in-app browser and Chrome drivers while the Mac was locked. Unlock/dismiss was requested; remaining profile/settings, alerts/style, preview/AI/write and mobile manual sequences are NOT RUN, and manual discard is BLOCKED. Added meaningful preview E2E assertions for dismissing/accepting discard and reopening the unchanged original (CLICK-045); both passed without workspace API calls. No application behavior was changed to work around the driver.

Both manual and automated startup exposed Vite's temporary unmarked HTTP 500 before the API listens. The manual launcher now waits for the direct marked API first. Playwright startup retries unmarked 500s without accepting them as readiness; normal/mismatched successful APIs, normal denials and marked HTTP 500 failures still fail immediately. Three unit regressions cover this boundary. Initial runs stopped before workflows and were not counted as passing evidence.

Final validation: `npm run verify` passed production build/type checking, **111 local/unit/API/mocked tests in 16 files**, and generated-document synchronization. `npm run test:e2e` passed **18 isolated workflows**, including discard, desktop/mobile/settings and preview checks. `git diff --check` passed. Final launcher smoke verified unmarked direct API 403, marked proxy API 200 and clean shutdown; occupied normal-port launch was refused before opening a test store. Exact normal store/key fingerprints were unchanged through all runs. Fictional stores are retained in named temporary directories and screenshots in ignored test-results; the normal user preview was restored with `npm run local -- start` at port 3188. No provider/layout approval or every-manual-control completion is inferred.

## Proposal visual and Testing view — 2026-10-12

Owner requested the Hybrid Platform proposal selector and Testing option for MyFeed. Added
one Work view and Next step to each of the existing 35 item definitions, a queue Testing
policy and linked PROPOSAL_DASHBOARD.md tracker. No item order, stable ID, dated disposition,
acceptance condition or local implementation status changed. Work focus is 11 Testing
(mainly acceptance; remaining-feature subgroup empty), 16 Implemented locally, 7 Conditional,
1 Unsupported. The original 24 locally implemented/specified / 11 remaining baseline stays.

Source-derived conversation selector switches projects and work sections, filters Testing
subgroups, exposes selected status/proof limits/dependencies/next step and saves selection.
Browser DOM inspection verified MyFeed's eleven-item view, empty leftover-feature group,
PROP-031 details and reload persistence; Hybrid's nine-item leftover-feature subgroup and
P-056 selection also passed. 736px/360px viewport checks had no horizontal overflow (704px/
313px inner content width). Native window positioning could not run because the Mac was
locked; no physical display acceptance is claimed. No discussion submission, account check,
provider API, publishing, paid AI or MyFeed application/store mutation occurred.

Documentation-only checks: npm run docs:generate and npm run docs:check passed; all 35 ordered
IDs match HEAD, each has exactly one view/next-step, dated dispositions match HEAD, 50 local
links/anchors resolve and git diff --check passes. Hybrid's required make test reached 100%,
exit 0; queue/lane and generated-registry checks passed. MyFeed runtime/E2E gates were not
rerun because no runtime/reader/setup code changed; these checks do not close live gates.

## Dashboard documentation export and agent handoff — 2026-10-12

Owner asked to work the selector into each project's docs and referenced an agent merge.
Added browsable `docs/readable/proposal-dashboard.html`, editable source under `assets/` and
source-hash/count receipt; linked these from README, the canonical queue and dashboard guide.
Canonical CLAUDE context now names the dashboard/Testing contract and regenerated AGENTS agrees.
The Hybrid counterpart is linked from its docs index/queue/agent context. Each page defaults to
its own project; its project picker can compare both dated documentation snapshots. Automatic
refresh remains future scope. Prepare work request is read-only copyable text, not task messaging.

Both saved pages rendered in the browser. MyFeed's empty remaining-feature filter disables
handoff, selected PROP-031 survives reload and request preparation preserves the proposal/next
step and explicit permission gates. Both source-hash receipts match canonical queues; 73/35
unique ordered IDs and all work counts reconcile; 96 documentation links resolve. MyFeed docs
generate/check and git diff --check pass. Hybrid's required full make test reaches 100%, exit 0,
and generated docs/queue-lane checks pass. No app/store/provider/E2E workflow or Git merge was
performed; documentation integration does not establish provider or physical acceptance.

Merge check on 2026-10-12: `npm run verify` passed the production build, 111 tests in
16 files, and generated-document synchronization. The dashboard source and receipt
reconcile 35 unique MyFeed IDs and 73 unique Hybrid IDs, all work-view counts, and
the MyFeed queue SHA-256. `git diff --check` passed. The dashboard is documentation;
no live-provider or app workflow was exercised for this merge.
