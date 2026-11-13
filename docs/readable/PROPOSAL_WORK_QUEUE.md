# Proposal work queue

Created: 2026-10-04. This is the ordered proposal queue for work after the current MyFeed build. It links the [feature inventory](FEATURE_LIST.md), [customization inventory](CUSTOMIZATION_LIST.md), [click matrix](CLICK_MATRIX.md), and [coverage matrix](FEATURE_MATRIX.md). Current implementation and dated evidence remain in [IMPLEMENTATION.md](IMPLEMENTATION.md).

The five current page previews (reader, customization, connections, profile, settings), reader, filtering, source adapters, profile/settings, and manual digest already exist. Their presence does not imply arrangement approval or live verification of every provider. The word/character setting is now implemented with compatible defaults; validation evidence is recorded below. This queue separates new builds, decisions, and verification work so those distinctions remain visible.

The local build owner is **Codex**. Dated statuses below distinguish implemented local work, user review, live-account evidence, and conditional tracks. Build authorization does not imply arrangement approval or an authenticated provider round trip. The numbered order is the recommended sequence. Dependencies describe prerequisites; independent specification and backup work can proceed while page review is pending. Sizes are relative scope, not delivery dates: S = review or narrow change, M = bounded feature across a few layers, L = ingestion/storage work, XL = a future edition requiring further breakdown.

## Recommended sequence

**First local release:** approve the five arrangements → settle and implement item text limits → finish editing/error/keyboard behavior → connection repair and backups → incremental/reliable ingestion and conversation history → provider evidence and release checks → local launch/install workflow.

**After that release:** add optional media/typography controls, type-specific limits and conversation preview counts, richer manual generation, and large-history loading. Select additional providers individually. Hosted work and semantic AI remain conditional future tracks.

**Connection work requested on 2026-10-05, updated 2026-10-08:** AI Pipeline's default selected-feed digest profile (PROP-029), the separate API source (PROP-030), and bounded public YouTube channel/playlist metadata reads (PROP-031) are implemented locally. TikTok access feasibility (PROP-032) remains the next-provider work. The default pipeline uses the selected feed's eligible originals and persisted instructions, outputs a dated generated snapshot in that feed, and runs only after review/confirmation. External generated results can arrive through API source ingestion. Provider access gates apply to each named capability. Edit item remains the final queue item.

**Posting requested on 2026-10-08:** shared manual composer and write-capability setup (PROP-033) → Rocket.Chat messages/thread replies (PROP-034) → Mastodon-compatible Fediverse posts/replies (PROP-035). Start drafting and account setup through Connections, retain the selected destination in review, and send only on the user's explicit action. Other providers receive their own read/write capability scope through PROP-020; public reading support does not establish posting credentials or permissions. Posting and automatic alert delivery (PROP-026) remain separate.

A local release can use verified public RSS, Mastodon, and Bluesky sources while authenticated email/Rocket.Chat remain explicitly unverified. Missing account credentials should not stop independent UI, persistence, or public-source work. Claiming those authenticated providers as live-verified requires PROP-010 / PROP-011. Paid AI verification is separate and optional under PROP-018.

Each item has a stable **PROP ID** and a short **label** for review and discussion. Labels appear in the index and the item definition; refer to either when giving feedback.

## Connection-first configuration requirement

All posts, alerts, and features go through **Connections first to configure**, then link/select the feed and customize downstream behavior. The [connection matrix](CONNECTION_MATRIX.md) records current placement, ownership, missing setup paths, and evidence. Source collection already follows this ownership model; the existing local-alert/manual-AI gateway is implemented under PROP-027; future capabilities follow their own conditional items. Local feed controls retain per-feed scope and require no invented external account. Saving setup never sends a post/alert or triggers paid AI.

This requirement applies to connection repair (PROP-005), generation controls (PROP-018), provider expansion (PROP-020), semantic processing (PROP-025), delivery (PROP-026), and manual posting (PROP-033–035) when built. PROP-027 consolidates the setup journey for existing capabilities; it is not a dependency on optional delivery or hosted work. PROP-028 adds local item editing and is deliberately the final queue item. Neither new local item depends on the conditional hosted track merely because it appears later in the list.

The [full audit](FULL_APPLICATION_AUDIT_MATRIX.md), [API audit](API_AUDIT_MATRIX.md), and [verification matrix](VERIFICATION_MATRIX.md) support this queue without creating another priority list.

## Current delivery status — 2026-10-08

**35 proposals total: 24 implemented/specified, 11 remaining.** Completed local items are PROP-002–009, PROP-012–019, PROP-027–031 and PROP-033–035. Remaining items are PROP-001, PROP-010/011, PROP-020–026 and PROP-032. Page approval and authenticated provider evidence need user review/accounts; later-provider/hosted/semantic/alert tracks remain conditional, and TikTok is unsupported for this local-only edition. Manual posting is implemented locally with mocked provider/browser proof, not live publishing evidence. The remaining count includes review, evidence and conditional tracks. Delivery uses stable PROP IDs; the scope labels below explain the Sol/Astra continuation request.

### Sol/Astra completion boundary

The Sol/Astra local scope continued in this chat is complete. The separate “Work on Terra and Luna proposals” chat selected PROP-031/032. These labels coordinate scope; they do not claim which model executed each change.

| Scope label                   | Proposal items                                         | Disposition                                                                                                                          |
| ----------------------------- | ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------ |
| Sol/Astra local               | PROP-002–009, PROP-012–019, PROP-027–030, PROP-033–035 | 23 implemented/specified; local, mocked and browser evidence. Includes read-only recovery checks for unknown posting outcomes.       |
| Terra/Luna YouTube            | PROP-031                                               | Implemented locally; configured key/live account evidence remains separate.                                                          |
| Terra/Luna TikTok feasibility | PROP-032                                               | Unsupported for the local personal edition; adapter deferred until provider access is established.                                   |
| Human review/account evidence | PROP-001, PROP-010/011                                 | Page approval and real email/Rocket.Chat verification remain pending.                                                                |
| Conditional future scope      | PROP-020–026                                           | Further provider choice, hosted edition, semantic AI privacy/spending and external alert destination decisions remain prerequisites. |

The 11 remaining entries retain their acceptance criteria. Local completion does not establish live provider permissions, human layout approval or completion of conditional future builds.

The production app and these five review pages are served locally at port **3188**. Port 5188 URLs below remain valid when running the development server; do not run both servers together.

## Testing and proposal visual

**Owner follow-up (2026-10-12):** add the proposal selector and Testing option used in a sibling internal project
Creator Platform. This is documentation/work selection for the existing 35 items, not another
feature backlog or permission to start conditional work. Agent assignment for this bounded
follow-up: `gpt-6.1-sol` / `high` — source-based queue classification and responsive visual review.
Execution model selection is outside this documentation; existing Sol/Astra/Terra/Luna scope
labels remain coordination labels, not evidence that a particular model ran a change.

Testing is a **work view**, separate from implementation status. Use it when a current working
slice mainly needs owner review, manual/clean-host checks, accounts or provider evidence.
Testing may include named bounded leftover work; substantial new features stay in the build or
conditional view. Move back to build if acceptance exposes substantial implementation gaps.
Every item has one Work view and one Next step in its definition; these fields own the selector.
Its original order, dependencies, dated status and acceptance criteria remain authoritative.

Current view: **11 Testing, 16 Implemented locally, 7 Conditional, 1 Unsupported — 35 total**.
The existing delivery baseline is still **24 locally implemented/specified and 11 remaining**;
eight locally built items also need testing, so Testing must never be added to that baseline.
All eleven Testing items mainly need acceptance; none is currently classified as Testing with
remaining features. Conditional hosted/provider/semantic/delivery builds are not testing-ready.

Testing contains PROP-001, PROP-010/011/012/013, PROP-018, PROP-029, PROP-031 and PROP-033–035.
The selector offers **All testing**, **Mainly acceptance**, and **Remaining features**; empty
subgroups are shown honestly. Selecting a proposal exposes its current proof limits and next
step; discussing a slice does not run tests, publish, use credentials or spend on AI.

[Dashboard tracking and refresh](PROPOSAL_DASHBOARD.md)
records the checked-in snapshot, local work-request handoff and proof.

## Queue by item

| Order | Proposal              | Label                     | Item / deliverable                                                     | Dependencies                                                       | Size |
| ----- | --------------------- | ------------------------- | ---------------------------------------------------------------------- | ------------------------------------------------------------------ | ---- |
| 1     | [PROP-001](#prop-001) | Page approval             | Review and record the five page arrangements                           | User layout feedback                                               | S    |
| 2     | [PROP-002](#prop-002) | Text-limit specification  | Specify word/character limits per item                                 | None; can accompany layout review                                  | S    |
| 3     | [PROP-003](#prop-003) | Text-limit implementation | Build persisted item text limits across reading views                  | PROP-001, PROP-002                                                 | M    |
| 4     | [PROP-004](#prop-004) | Editing and navigation    | Finish draft, navigation, error, and keyboard behavior                 | PROP-001, PROP-003                                                 | M    |
| 5     | [PROP-005](#prop-005) | Connection repair         | Edit and repair existing source connections                            | PROP-004                                                           | M    |
| 6     | [PROP-006](#prop-006) | Backup and restore        | Add verified backup/restore and store recovery checks                  | None; finish before expanded ingestion                             | M    |
| 7     | [PROP-007](#prop-007) | Incremental ingestion     | Add source cursors and bounded incremental ingestion                   | PROP-005, PROP-006                                                 | L    |
| 8     | [PROP-008](#prop-008) | Sync reliability          | Add retry/backoff and clearer source health                            | PROP-007                                                           | M    |
| 9     | [PROP-009](#prop-009) | Chat history              | Load older chat messages and complete collected threads                | PROP-007, PROP-008                                                 | L    |
| 10    | [PROP-010](#prop-010) | Email verification        | Verify authenticated email end to end                                  | PROP-005, PROP-008; configured test mailbox                        | M    |
| 11    | [PROP-011](#prop-011) | Rocket.Chat verification  | Verify authenticated Rocket.Chat end to end                            | PROP-005, PROP-008, PROP-009; configured test account              | M    |
| 12    | [PROP-012](#prop-012) | Local release checks      | Complete the first local-release acceptance checks                     | PROP-003–009; PROP-010/011 for live provider claims                | M    |
| 13    | [PROP-013](#prop-013) | Local launch and updates  | Package local launch, shutdown, and update workflow                    | PROP-012; supported platform decision                              | M    |
| 14    | [PROP-014](#prop-014) | Media controls            | Add media visibility and size controls                                 | PROP-003; optional customization scope                             | M    |
| 15    | [PROP-015](#prop-015) | Reading typography        | Add font size, line spacing, and reading width                         | PROP-003, PROP-004; optional customization scope                   | M    |
| 16    | [PROP-016](#prop-016) | Item-type overrides       | Add item-type text-limit overrides                                     | PROP-003; optional customization scope                             | M    |
| 17    | [PROP-017](#prop-017) | Conversation previews     | Add conversation preview message count                                 | PROP-009; optional customization scope                             | S    |
| 18    | [PROP-018](#prop-018) | AI generation controls    | Add manual generation review and budget controls                       | PROP-008, PROP-012; explicit user AI configuration for live checks | L    |
| 19    | [PROP-019](#prop-019) | History pagination        | Add paged retained history and scale checks                            | PROP-007, PROP-009                                                 | L    |
| 20    | [PROP-029](#prop-029) | AI Pipeline               | Configure a default custom-feed input and explicit AI processing       | PROP-018, PROP-027                                                 | L    |
| 21    | [PROP-030](#prop-030) | API source                | Import a read-only JSON API through explicit item-field mappings       | PROP-005, PROP-007, PROP-008                                       | L    |
| 22    | [PROP-031](#prop-031) | YouTube videos and Shorts | Public channel/playlist metadata and honest short-video scope          | PROP-005, PROP-007, PROP-008; user API project for live proof      | L    |
| 23    | [PROP-032](#prop-032) | TikTok access and source  | Establish an eligible API/account path before building ingestion       | Provider approval/access; PROP-005, PROP-007, PROP-008             | L    |
| 24    | [PROP-033](#prop-033) | Manual posting composer   | Add explicit write setup, drafts, destination review and send receipts | PROP-005, PROP-006, PROP-008, PROP-027                             | L    |
| 25    | [PROP-034](#prop-034) | Rocket.Chat posting       | Send text messages and thread replies to an authorized channel         | PROP-033; configured writable Rocket.Chat account/channel          | M    |
| 26    | [PROP-035](#prop-035) | Fediverse posting         | Publish text posts/replies through a Mastodon-compatible account       | PROP-033; configured account with write permissions                | M    |
| 27    | [PROP-020](#prop-020) | Provider expansion        | Select later provider/OAuth read or write adapters beyond named items  | Provider selection; PROP-033 for posting adapters                  | L    |
| 28    | [PROP-021](#prop-021) | Hosted edition scope      | Decide and specify a hosted edition                                    | PROP-013; user chooses hosted distribution                         | S    |
| 29    | [PROP-022](#prop-022) | Hosted identity           | Build hosted identity and tenant authorization                         | PROP-021                                                           | XL   |
| 30    | [PROP-023](#prop-023) | Hosted data and secrets   | Build transactional tenant storage, secrets, and plans                 | PROP-022                                                           | XL   |
| 31    | [PROP-024](#prop-024) | Hosted operations         | Build hosted workers, operations, and release gate                     | PROP-023                                                           | XL   |
| 32    | [PROP-025](#prop-025) | Semantic AI filtering     | Specify and build opt-in semantic AI lenses                            | PROP-018; separate semantic-processing decision                    | L    |
| 33    | [PROP-026](#prop-026) | External alert delivery   | Configure explicit destinations and deliver selected mention alerts    | PROP-008, user-selected delivery provider                          | L    |
| 34    | [PROP-027](#prop-027) | Connection-first setup    | Configure posts, alerts, AI, and feature setup through Connections     | PROP-001, PROP-005                                                 | M    |
| 35    | [PROP-028](#prop-028) | Edit item                 | Edit a local item copy while preserving its collected original         | PROP-005, PROP-006, PROP-027                                       | M    |

## Maintaining the queue

Keep proposal IDs stable when order changes. Move status through Proposed → Ready → In progress → Done based on actual work, and record a specific dependency when work waits for input. Before starting an item, name an owner, settle its outstanding decisions, and add any new interaction rows. Do not mark a feature complete solely because its proposal or mock test exists.

Each delivered item updates its feature/customization/click rows, PRODUCT, relevant architecture/integration documentation, and IMPLEMENTATION with the actual checks. Code changes run `npm run verify`; reader/setup/settings changes also run `npm run test:e2e`, followed by the user preview. Schema and API changes update the model/route registries and compatibility evidence. Documentation-only queue changes run generation, synchronization, and link/ID/dependency consistency checks.

## Item definitions

### PROP-001

**Work view:** Testing

**Next step:** Review the five current page arrangements and record explicit owner approval.

**Label:** Page approval

**Disposition (2026-10-05):** Waiting for input / conditional scope. User review remains open for the five arrangements; current requested revisions are built. This does not block independent authorized implementation.

**Current navigation update:** Refresh joins Saved/Unread/Alerts; mobile Menu and drawer are on the left, Home on the right; Help is in sidebar/settings, profile is near the sidebar top; Settings Appearance is removed. Final arrangement review remains open.

**Latest arrangement (2026-10-04):** one mixed feed with spaced cards; named feeds above mode; no directory or preview navigation panel; My workspace in settings; rail search popup; Saved/Unread/Alerts top controls; local mention configuration and expandable source items. Final layout approval remains open.

**Earlier review revision (2026-10-04):** sidebar-only feed creation and Feed view / Customize filters switch; top header and default Reading/Saved/Background navigation removed. Connections own collected data and link to feeds before filtering. This implements the requested arrangement revision; final layout approval remains open.

**Approve and record the five page arrangements.** Type: Review. Links: FEAT-018, FEAT-017.

Review the running production previews: [connections](http://127.0.0.1:3188/preview/connections), [feed](http://127.0.0.1:3188/preview/feed), [customization](http://127.0.0.1:3188/preview/customize), [profile](http://127.0.0.1:3188/preview/profile), and [app settings](http://127.0.0.1:3188/preview/settings). Record feedback by page: content placement, navigation, controls, density, and mobile arrangement. Include the timeline-to-conversation transition.

**Acceptance:** each page has an explicit accepted arrangement or a concrete revision list; agreed revisions are reflected in the actual shared components and previews. Preview isolation and the content-first reader remain intact. Existing previews are evidence for review, not a recorded user sign-off.

### PROP-002

**Work view:** Implemented locally

**Next step:** Current local slice is recorded as implemented/specified; preserve its acceptance limits.

**Label:** Text-limit specification

**Status (2026-10-04):** Specified in CUST-001; compatible defaults preserved. Optional new-feed default preference remains open.

**Settle the per-item text-size specification.** Type: Specification. Links: CUST-001, FEAT-019, CLICK-036–038.

Define current-default / Words / Characters modes, numerical bounds and presets, language-aware word counting, visible-character counting, and the truncation marker. Specify collapsed post bodies, article/email excerpts, and individual messages in conversation previews. Titles, authors, media, full reading dialogs, and opened conversations retain their existing scope. Define inheritance/defaults for old feeds.

**Acceptance:** the CUST-001 specification contains exact validation/counting rules and examples for paragraphs, emoji, combining marks, and text without spaces. Display limits do not change collected content, filtering, search, ranking, deduplication, or AI input bounds. No guessed preset is silently treated as a user decision.

### PROP-003

**Work view:** Implemented locally

**Next step:** Current local slice is recorded as implemented/specified; preserve its acceptance limits.

**Label:** Text-limit implementation

**Status (2026-10-04):** Implemented and locally validated: 42 unit/API tests and 9 browser workflows pass; Unicode, migration, persistence, expansion, Saved/search, and article/chat previews covered. Arrangement review remains open and is not inferred from build authorization.

**Implement configurable maximum words or characters.** Type: Build. Links: CUST-001, FEAT-019, CLICK-036–038.

Add a per-feed setting to `shared/model.ts`, the feed API, Customize, compatible store loading, the preview reducer, and a shared text-presentation helper. Apply it consistently to Reading and Saved; retain expansion/opening access to collected text. Replace hard-coded collapse behavior only where the approved policy says to do so.

**Acceptance:** independent feeds persist different limits; invalid and stale edits explain the error; old stores open with compatible defaults. Boundary/Unicode examples, warnings, saved/read state, keywords beyond the excerpt, and excluded chat neighbors are verified. Required build/API/reader E2E checks and desktop/mobile inspection pass; tracking rows move to Implemented only with that evidence.

### PROP-004

**Work view:** Implemented locally

**Next step:** Current local slice is recorded as implemented/specified; preserve its acceptance limits.

**Label:** Editing and navigation

**Status (2026-10-04):** Implemented session-retained feed/profile drafts with explicit Discard, unload warning, missing-page/feed recovery, and mobile keyboard/focus behavior. Validated local browser paths; broader release error scenarios stay in PROP-012.

**Finish editing, navigation, error, and keyboard behavior.** Type: Build / verification. Links: FEAT-001, FEAT-013, FEAT-014, FEAT-017, FEAT-018; CLICK-001–006, 024–032, 035.

Define and implement unsaved-draft behavior when changing feeds, settings sections, or browser history. Make missing-feed routes, no-match searches, validation failures, server-offline states, and stale-save recovery clear. Cover keyboard activation, dialog Escape/focus return, mobile drawer focus, and accessible expanded/collapsed states.

**Acceptance:** drafts are retained or discarded through an explicit, understandable action; unknown routes do not silently masquerade as the selected feed. The preview exit works on desktop/mobile. Complete the corresponding click-matrix gaps with meaningful assertions and recorded layout evidence.

### PROP-005

**Work view:** Implemented locally

**Next step:** Current local slice is recorded as implemented/specified; preserve its acceptance limits.

**Label:** Connection repair

**Status (2026-10-04):** Implemented versioned configuration/credential repair and read-only checks. Explicit reset is required for account/address changes. Local/API and sample-browser checks pass; authenticated live accounts remain separate evidence.

**Edit and repair an existing connection.** Type: Build. Links: FEAT-024; extends FEAT-002, FEAT-003, FEAT-016 and CLICK-007–010.

Begin from Connections, retaining the selected source and linked-feed context. Add editing for connection name/configuration and credential replacement without requiring immediate destructive disconnect. Specify what happens when the account, endpoint, room, or mailbox changes, including any explicit reset of incompatible collected data. Add a bounded, read-only connection check and actionable health results. Introduce a configuration version so results from an old configuration cannot be committed after an edit.

**Acceptance:** blank secret preserves the existing encrypted credential; replacement never appears in responses/logs. Failure keeps recoverable configuration and data. Three connections, including paused sources, remain the limit. Old-config sync results are discarded. Provider check results distinguish configured, read succeeded, paused, and needs attention.

### PROP-006

**Work view:** Implemented locally

**Next step:** Current local slice is recorded as implemented/specified; preserve its acceptance limits.

**Label:** Backup and restore

**Status (2026-10-04):** Implemented offline protected backup/restore/content-export command and store/key fail-visible guards. Temporary-directory tests cover round trips, credentials, validation failures, recovery copies, and interrupted restore markers.

**Verified backup, restore, and store recovery.** Type: Build / verification. Links: FEAT-025, FEAT-016.

Specify a versioned local backup format that preserves the encrypted credential store and its key together in a protected archive. Define a separate content export without credentials. Restore must validate the archive/version before replacing anything, make a recovery snapshot, and coordinate with running sync. Add failure checks for damaged stores, missing/wrong keys, and interrupted writes using isolated data directories.

**Acceptance:** a fixture restored into a fresh directory retains feeds, collected text, stable IDs, bookmarks, read state, and decryptable credentials. Invalid backups fail visibly and preserve the destination. No test overwrites the user's real data, and no secret is printed. Backup protection and retention choices are documented before account data grows.

### PROP-007

**Work view:** Implemented locally

**Next step:** Current local slice is recorded as implemented/specified; preserve its acceptance limits.

**Label:** Incremental ingestion

**Status (2026-10-05):** Implemented bounded social/chat/IMAP collection checkpoints, overlap and failed-fetch guards; progress commits with ingestion. Initial collection stays bounded; older history is an explicit action. Public-provider and mocked-account evidence stay separate.

**Incremental ingestion and bounded catch-up.** Type: Build. Links: FEAT-026, FEAT-003, FEAT-010, FEAT-016.

Add per-connection progress/cursor state and adapter-specific incremental fetching for the existing sources. Handle edited entries and mailbox identity changes. Advance progress only after successful ingest; support bounded catch-up after downtime. Keep retention explicit: the present baseline is 300 ordinary items per source plus saved items, not unlimited provider history.

**Acceptance:** restart resumes safely, repeated results preserve IDs/read/save state, and failed or interrupted fetches do not skip data. Configuration changes invalidate incompatible cursors. Provider fixtures cover overlapping pages and updated entries; public-source evidence is recorded separately. Do not introduce hosted infrastructure for this local slice.

### PROP-008

**Work view:** Implemented locally

**Next step:** Current local slice is recorded as implemented/specified; preserve its acceptance limits.

**Label:** Sync reliability

**Status (2026-10-05):** Implemented persisted source failures/backoff, manual immediate retry and recovery health; worker remains opt-in and five-minute regular collection. Failed fetches do not advance checkpoints.

**Retry, backoff, and source-health reporting.** Type: Build. Links: FEAT-027; extends FEAT-010–012.

Handle transient failures and rate limits with bounded retries/backoff and per-source scheduling. Show last attempt, last success, pending/retry state, and a sanitized failure category. Healthy sources should remain useful when one source is slow or failing. Preserve opt-in background behavior and the five-minute normal sync interval.

**Acceptance:** permanent configuration errors do not retry indefinitely; pause/remove prevents queued work from committing; restart does not duplicate work. Manual refresh and background runs produce truthful receipts. No credentials or item/mailbox bodies enter diagnostics.

### PROP-009

**Work view:** Implemented locally

**Next step:** Current local slice is recorded as implemented/specified; preserve its acceptance limits.

**Label:** Chat history

**Status (2026-10-05):** Implemented explicit older pages for Mastodon/Bluesky/Rocket.Chat/IMAP and eligible chronological conversation paging. Retention remains 300 ordinary items per source plus saved items, so remote-history completion does not mean unlimited local retention.

**Collected chat history and thread continuity.** Type: Build. Links: FEAT-028, FEAT-007; extends CLICK-013, 021–022.

Add bounded older-message/thread fetching on top of source cursors. Show which conversation is a channel or thread, its date context, and whether the collected history is partial. Add a deliberate load-older action. Opening a conversation must still apply current feed and reading filters before grouping.

**Acceptance:** chronology remains stable across pages; repeated text, rooms, sources, and roots remain distinct. A missing or excluded parent never causes excluded context to reappear. Counts describe eligible collected messages; older saved messages remain reachable. The feature remains read-only.

### PROP-010

**Work view:** Testing

**Next step:** Configure a dedicated supported IMAP test mailbox and execute the read-only account procedure.

**Label:** Email verification

**Disposition (2026-10-05):** Waiting for input / conditional scope. Needs an explicitly configured test mailbox/account for authenticated live read-only verification. IMAP normalization/UID/read-only/size behavior is covered by mocks only.

**Email account verification.** Type: Verification / fixes as needed. Links: FEAT-003, FEAT-005, FEAT-006, FEAT-008; CLICK-007–008, 012–014.

Use an explicitly configured test mailbox to prove existing IMAP setup, TLS connectivity, message normalization, article/email reading, retry, credential repair, and restart. Check provider-specific account requirements when this item starts; OAuth-only accounts belong to PROP-020.

**Acceptance:** record dated account-specific evidence without message bodies or credentials. Read operations preserve remote Seen flags; oversized messages are handled as documented; local read/save state remains independent. Account access is an input dependency. Mocked tests alone do not complete live verification. Use the [account verification procedure](VERIFICATION_MATRIX.md#live-account-verification-procedure).

### PROP-011

**Work view:** Testing

**Next step:** Configure a dedicated Rocket.Chat read account/public channel and verify room/thread/history boundaries.

**Label:** Rocket.Chat verification

**Disposition (2026-10-05):** Waiting for input / conditional scope. Needs an explicitly configured Rocket.Chat server, channel and account/token for live read-only verification. Request/history/grouping behavior has mocked evidence only.

**Rocket.Chat account verification.** Type: Verification / fixes as needed. Links: FEAT-003, FEAT-007, FEAT-028; CLICK-007–008, 013, 021–022.

Use an explicitly configured test account and public channel to verify credentials, replies, room/thread identity, history, pause/resume, and recovery. Preserve the existing public-network boundary. Private rooms/DMs are separate adapter scope.

**Acceptance:** dated live read evidence matches the conversation UI; source/filter boundaries and in-flight removal are verified. No message is sent, and no token or channel message body is logged. If credentials are unavailable, keep the live-proof gap visible and continue independent work. Use the [account verification procedure](VERIFICATION_MATRIX.md#live-account-verification-procedure).

### PROP-012

**Work view:** Testing

**Next step:** Finish the remaining manual acceptance substeps and arrangement review; keep authenticated/paid claims separate.

**Label:** Local release checks

**Status (2026-10-05):** Local automated release gate exercised with isolated stores, provider mocks and browser workflows. Final arrangement review and authenticated live IMAP/Rocket.Chat/paid-AI claims remain separate. See IMPLEMENTATION for the exact final commands and limits.

**First local-release acceptance.** Type: Verification. Links: FEAT-001–019, FEAT-024–028; existing click/feature matrices.

Close release-critical gaps left in the matrices: fifth-feed/third-source UI limits, pause/resume/removal/cancel, partial sync failure, include/mute/context/sort/dedup controls, warning reveal/long text, all content modes and source isolation, Saved/unsave, background toggle/save/reload, profile errors, and Light/Dark/System behavior. Add checks where there is an actual uncovered behavior rather than duplicating implementation.

**Acceptance:** an isolated first-use-to-reading-to-recovery workflow passes required build, API, documentation, and browser checks with keyboard/mobile evidence. Public live evidence and account-specific evidence remain distinct. The release names only the capabilities it can substantiate; PROP-010/011 are required before calling their providers live-verified. Open issues have owners and a release disposition.

### PROP-013

**Work view:** Testing

**Next step:** Exercise the managed macOS install/start/stop/update on a clean operator host; login activation is separate opt-in.

**Label:** Local launch and updates

**Status (2026-10-05):** Implemented macOS-managed launch/status/graceful stop/update, protected pre-update backup, explicit login-enable/login-disable commands, and atomic lifecycle locking shared with offline restore. Isolated launch/restart/lock behavior checked; login activation and Linux operation are not claimed as live-verified.

**Local launch, process lifecycle, and updates.** Type: Build / packaging. Links: FEAT-029, FEAT-011, FEAT-016.

Choose the initial supported platform, then provide a repeatable install/start/stop/update path and visible local-server status. Include graceful shutdown, port conflicts, versioned data compatibility, and recovery instructions. Starting on login is an explicit option; background collection requires the process to be running.

**Acceptance:** a clean installation and restart retain state/key pairing, upgrades can recover from failure, and the app stays on loopback. Closing the page and stopping the server have clearly different consequences. Local release does not require the hosted track.

### PROP-014

**Work view:** Implemented locally

**Next step:** Current local slice is recorded as implemented/specified; preserve its acceptance limits.

**Label:** Media controls

**Status (2026-10-05):** Implemented per-feed preview media visibility and small/normal/large sizing, per-item reveal and visible unavailable-image fallback.

**Media visibility and sizing.** Type: Optional build. Links: CUST-017, FEAT-020.

Specify per-feed image visibility and size presets for post/article previews, with accessible descriptions and a way to view retained media. Decide consistent behavior for broken or slow images and content warnings.

**Acceptance:** settings persist per feed, work in Reading/Saved and isolated previews, and preserve source URLs/descriptions. Hidden media does not delete data or change inclusion; warnings still protect media until reveal. Mobile sizing and keyboard access are checked.

### PROP-015

**Work view:** Implemented locally

**Next step:** Current local slice is recorded as implemented/specified; preserve its acceptance limits.

**Label:** Reading typography

**Status (2026-10-05):** Implemented 14–24px reading font, 1.2–2.2 spacing and full/medium/narrow width with compatible defaults and mobile checks.

**Text appearance and reading width.** Type: Optional build. Links: CUST-018, FEAT-020.

Specify font-size, line-spacing, and reading-width controls and whether they belong to a feed or workspace. Use the approved arrangements and item limits to define comfortable and compact results.

**Acceptance:** labels and defaults are clear; preferences persist at the chosen scope; browser zoom, contrast, paragraphs, long handles, and narrow screens remain usable. Reading density does not alter eligibility or collected data.

### PROP-016

**Work view:** Implemented locally

**Next step:** Current local slice is recorded as implemented/specified; preserve its acceptance limits.

**Label:** Item-type overrides

**Status (2026-10-05):** Implemented post, article/email and chat text overrides; inherit feed/current default/words/characters. Originals and full reading remain accessible.

**Type-specific text-budget overrides.** Type: Optional build. Links: CUST-016, FEAT-020.

Let posts, article/email previews, and chat previews inherit the feed budget or override it. Build on PROP-003's counting and persistence rules rather than introducing a second truncation policy.

**Acceptance:** inheritance and reset behavior are visible; old feeds continue to use their feed default. Every override passes the same Unicode, warning, expansion, Saved, and original-preservation contract.

### PROP-017

**Work view:** Implemented locally

**Next step:** Current local slice is recorded as implemented/specified; preserve its acceptance limits.

**Label:** Conversation previews

**Status (2026-10-05):** Implemented 1–10 eligible chronological preview messages, default 3; full eligible conversation pages remain readable.

**Conversation preview message count.** Type: Optional build. Links: CUST-019, FEAT-020, FEAT-007.

Add a bounded per-feed count for messages shown in a collapsed conversation, replacing the current fixed three-message preview. Keep the opened conversation's collected history separate from the preview count.

**Acceptance:** the preview uses only eligible messages, preserves chronology, and indicates when more are available. Changing the count neither fetches hidden context automatically nor changes grouping/read/save state.

### PROP-018

**Work view:** Testing

**Next step:** Only after exact-model rate/input/budget review, authorize one paid provider check; no automatic spending.

**Label:** AI generation controls

**Status (2026-10-05):** Implemented explicit input/context review, input/output caps, user-verified rates and per-request spending bound. Exact provider token counting precedes generation; unknown charges keep reserved receipts and require a new manual review. Mocked checks pass; no paid live call was made.

**Manual AI generation review and budget controls.** Type: Optional build / verification. Links: FEAT-030, FEAT-015, CUST-014; CLICK-033–034.

Configure the processing connection/key/model through Connections first; keep generation an explicit reader action. Extend the existing manual digest with review of eligible inputs/context, explicit generation choices, input/output limits, a user spending limit, and generation receipts/errors. Define cancellation/retry and any additional output templates as separate bounded actions. Reading display budgets must not accidentally become AI input budgets.

**Acceptance:** only the explicitly configured user key/model is used; no automatic or fallback provider calls occur. Outputs retain dated source references and cannot resurrect removed/filtered content. Review estimates identify their assumptions and use provider information verified at implementation time. A paid live round trip needs configured credentials and an explicitly requested, bounded generation; mocked evidence stays separate.

### PROP-019

**Work view:** Implemented locally

**Next step:** Current local slice is recorded as implemented/specified; preserve its acceptance limits.

**Label:** History pagination

**Status (2026-10-05):** Implemented item-free navigation summaries and bounded retained reader/source/filter/alert/history queries, Unicode revision cursors and stale-page recovery. Complete lens/search/read filters precede paging; synthetic 9500-item fixture and browser paths are checked.

**Paged retained history and performance.** Type: Optional build. Links: FEAT-031, FEAT-006, FEAT-009, FEAT-026, FEAT-028.

Replace full-workspace item loading where needed with bounded API paging/querying and efficient rendering. Specify retention independently from pagination, including older saved items. Assess worst-case five feeds × three connections plus accumulated bookmarks using synthetic fixtures.

**Acceptance:** stable page boundaries avoid missing/duplicate items after sync; search, source/unread filters, context order, Saved, and conversations agree across pages. API summaries still exclude credentials. Measure before/after responsiveness and payloads; preserve documented data ownership and API registry synchronization.

### PROP-020

**Work view:** Conditional

**Next step:** Choose the next provider and its exact read/write capability before scoping an adapter.

**Label:** Provider expansion

**Disposition (2026-10-08):** Named API/YouTube/TikTok requests have PROP-030–032, and manual Rocket.Chat/Fediverse posting has PROP-033–035. This umbrella remains for later provider/OAuth read or write choices and their account/application setup; it does not duplicate those items.

**Next provider or OAuth adapter.** Type: Conditional build. Links: FEAT-021.

Select further provider/account experiences individually, then create an adapter proposal declaring read and write separately, including authorization, token renewal/revocation, source identity, pagination, normalization, and evidence. API/YouTube/TikTok input scope is separately recorded in PROP-030–032; current posting scope is PROP-033–035. Later social posting, email sending or media uploads need provider-specific permissions, draft/payload limits and an explicit send contract using PROP-033; a working reader never implies permission to post. Verify current provider documentation before committing scope.

**Acceptance:** a selected-provider item replaces this broad selection task before implementation begins. The adapter preserves source/connection limits, independent credentials, explicit operation permissions, URL guards, and deletion races. Reading remains read-only unless a separate write capability is configured and the user submits a specific send. Existing Mastodon/Bluesky public support is not proof for another network or arbitrary ActivityPub, nor for posting on those accounts.

### PROP-021

**Work view:** Conditional

**Next step:** Choose whether a hosted edition is wanted; settle identity, tenancy and distribution scope.

**Label:** Hosted edition scope

**Disposition (2026-10-18):** Waiting for input / conditional scope, docs-only. Needs a hosted-distribution choice and platform/identity/tenancy/plan scope. Current production is local single-user only. The detailed options/tradeoffs writeup is recorded in [docs/proposals/PROPOSAL_HOSTED_MULTI_USER.md](../proposals/PROPOSAL_HOSTED_MULTI_USER.md); no tenancy model, identity provider, or distribution model has been chosen there — it presents options only.

**Hosted-edition decision and architecture.** Type: Conditional decision. Links: FEAT-022.

After the local release, decide whether remote/multi-user access is actually needed. Specify identity, tenant ownership, plan limits, retention, hosting/operations cost, secrets, queue behavior, and migration from local data. Break XL implementation items into concrete deliverables once the edition is selected. See [PROPOSAL_HOSTED_MULTI_USER.md](../proposals/PROPOSAL_HOSTED_MULTI_USER.md) for the tenancy-model, identity-provider, and distribution-scenario comparison and the proposed migration-plan sequence; that document is documentation only and contains no code.

**Acceptance:** a reviewed hosted architecture and migration plan exist. Until PROP-022–024 are complete, the current build retains its local bindings. Selecting a hosting provider or deploying is separate future work. PROP-022 (hosted identity) remains explicitly blocked until the owner picks a tenancy model, identity provider, and distribution model in the linked document.

### PROP-022

**Work view:** Conditional

**Next step:** Requires hosted scope approval; design tenant authorization before any public service.

**Label:** Hosted identity

**Disposition (2026-10-05):** Waiting for input / conditional scope. Conditional on PROP-021: hosted identity and tenant authorization are not implemented in this local edition. Blocked until the owner picks a tenancy model, identity provider, and distribution model in [PROPOSAL_HOSTED_MULTI_USER.md](../proposals/PROPOSAL_HOSTED_MULTI_USER.md).

**Hosted identity and tenant authorization.** Type: Conditional build. Links: FEAT-022.

Implement authenticated identity and tenant scope for every feed, connection, item, receipt, settings action, and AI generation. Include session lifecycle, cross-origin/CSRF protections, request ownership, and authorization failure behavior.

**Acceptance:** isolated tenants cannot enumerate, read, mutate, generate from, or delete each other's data. Unauthenticated requests are rejected. Identity and ownership checks are exercised before any public exposure.

### PROP-023

**Work view:** Conditional

**Next step:** Requires hosted identity contract; design transactional tenant data, secrets and plans.

**Label:** Hosted data and secrets

**Disposition (2026-10-05):** Waiting for input / conditional scope. Conditional on PROP-021/022: transactional hosted tenant storage, managed secrets and plans are not implemented.

**Transactional tenant storage, managed secrets, and plans.** Type: Conditional build. Links: FEAT-022, FEAT-016.

Move hosted state to transactional durable storage with tenant ownership, constraints, revisions, and tested migrations. Add encrypted managed secrets/rotation and tenant-owned provider credentials. Enforce plan limits server-side, including paused sources. Define backup/restore/deletion and retention for this edition.

**Acceptance:** concurrent writes and quota checks are correct; credential material never enters client summaries or logs. Tenant backup/restore and local migration are validated with fixtures. Preserve local data/key recovery while migrating; do not reuse another application's live store or credentials.

### PROP-024

**Work view:** Conditional

**Next step:** Requires hosted identity/data foundations; design durable workers and release/rollback.

**Label:** Hosted operations

**Disposition (2026-10-05):** Waiting for input / conditional scope. Conditional on PROP-021–023: hosted queue/operations/release gates are not implemented and the local server is not exposed publicly.

**Hosted workers, operations, and release gate.** Type: Conditional build / release. Links: FEAT-022, FEAT-010–012.

Add a durable ingestion/generation queue with scheduling, retries, ownership, quotas, cancellation, and sanitized monitoring. Define operational backup recovery and deployment rollback. Recheck provider/account authorization and integration evidence for the hosted environment.

**Acceptance:** failed/restarted workers resume safely and never commit deleted tenant/source work; per-tenant health and generation limits hold. Authentication, isolation, plans, CSRF, secrets, durable storage, and worker checks all pass before a concrete hosted deployment is presented for approval.

### PROP-025

**Work view:** Conditional (slice 2) / Implemented-offline, flag-off (slice 1)

**Next step:** Decide privacy, exact processing model, costs and review boundary before a real-model semantic classifier (slice 2).

**Label:** Semantic AI filtering

**Disposition (2026-10-18):** Slice 1 (offline evaluator) is implemented in `shared/semantic-filter-stub.ts`: a deterministic keyword-rule classifier behind a stub, categorizing entries with a `reasoning` string per decision, gated off by default via the module-level `semanticFilterEnabled` flag (no UI wiring, no network calls, no real model). It is not wired into the reader/pipeline beyond its own tests. Slice 2 — a real ML/LLM classifier — remains conditional scope: waiting for the owner to decide model, input privacy, and spending limits before any model call is added. The current deterministic keyword lens in `shared/pipeline.ts` is unaffected and remains the only lens exercised by the app.

**Update (2026-10-31):** Added `exampleSemanticCategories` to the slice 1 module — three sample categories (security, product-updates, open-source) with a handful of literal keywords each, used only as caller-supplied test/demo data, not a default the harness reaches for on its own. This is sample content, not a taxonomy decision: `SemanticFilterSpec.categories` remains entirely caller-supplied, so nothing here commits the product to shipping these specific categories. Still flag-off, still no network/model calls. Slice 2's owner-decision gate (model, privacy, spending) is unchanged.

**Update (2026-11-04):** Extended `exampleSemanticCategories` with two more sample categories — funding (`series a`/`series b`/`seed round`/`raised $`/`valuation`) and outages (`outage`/`service disruption`/`status page`/`degraded performance`) — same literal-substring, caller-supplied, non-default pattern as the prior update. Content change only; no new interface, no taxonomy commitment, still flag-off and offline.

**Opt-in semantic AI feed lenses.** Type: Conditional specification / build. Links: FEAT-023, FEAT-004, FEAT-030.

Define a separate semantic-processing option only if requested: explicit scope/opt-in, input privacy, spending limits, caching/versioning, reproducibility, and an inclusion/exclusion explanation. Keep deterministic keyword rules available and make the processing mode visible. Slice 1 satisfies the "keep deterministic rules available, make the mode visible/inspectable" groundwork offline; slice 2 (real-model integration) is the remaining conditional build once scope is decided.

**Acceptance:** semantic processing preserves collected originals and saved access; display changes do not trigger spending. Users can inspect/override decisions and disable processing. Evaluation covers relevance, misleading/untrusted source text, error/cost limits, and changing rules. A hosted implementation additionally requires PROP-024. Slice 1's offline stub meets the inspectable/disable-by-default parts of this acceptance; cost/spending-limit acceptance applies only once a real model (slice 2) is built.

### PROP-026

**Work view:** Conditional

**Next step:** Owner picks a real delivery provider (webhook, email, Slack, ...) before any external send exists; until then the contract, outbox and local test sink below are the complete local scope.

**Label:** External alert delivery

**Disposition (2026-10-18):** Contract + durable outbox + local recording test sink implemented locally. No real external destination exists yet — this is deliberately not wired to any network provider. Needs an owner-selected delivery provider and reviewable destination/payload before anything leaves the machine.

**Update (2026-11-02):** Added a second local adapter, `server/alert-sink-logger.ts` (`createLoggerSinkAdapter`), alongside the existing test-sink. It implements the same `AlertDestinationAdapter` interface and round-trips through the existing outbox unchanged. Unlike the test-sink, it deliberately omits `AlertEvent.excerpt` from what it logs — only delivery metadata (feed/connection/entry ids, handle, source, timestamps) — because excerpt text can originate from IMAP mailbox content (see `shared/alerts.ts`) and a log stream is more exposed than the test-sink's gitignored local file; this keeps the adapter inside CLAUDE.md's "never log... mailbox message contents" boundary. Still no real network provider; the owner-decision gate on provider choice is unchanged.

**Deliver alerts through explicitly configured connections.** Type: Contract + outbox implemented locally; real provider adapter remains conditional future build. Links: FEAT-033; builds on implemented FEAT-032 / CUST-020 local mention summaries.

`shared/alert-delivery.ts` defines the delivery contract reused from the existing posting pattern (`shared/posting.ts`, `server/posting.ts`, `server/posting-routes.ts`): a strict alert-event payload schema (feed id, connection id, entry id, matched handle, bounded local excerpt, source, timestamp), a stable per-(feed, handle, entry) idempotency-key derivation that survives re-syncs and excerpt/time changes, a bounded retry/backoff schedule with a max-attempts cutoff, a dedupe TTL, and an abstract `AlertDestinationAdapter` interface. `server/alert-outbox.ts` is a durable, deduplicating, retrying outbox over that contract, persisted with the same atomic-write pattern as `server/store.ts` in its own `data/alert-outbox.json` file, kept separate from the main application store's schema. `server/alert-sink-test.ts` is the only adapter wired up today: it appends delivered-alert records to a local, gitignored `data/alert-sink-test.log` file instead of making any network call — swapping in a real provider later is a thin additional adapter against the same interface, not a redesign.

No route, UI control or default-feed wiring exists yet; nothing enqueues a real alert automatically, and enabling mention alerts (FEAT-032/CUST-020) does not enable delivery. Choosing a real delivery provider and the reviewable destination/payload/opt-in UI remains conditional future work.

**Acceptance:** the contract validates a well-formed alert event and rejects malformed ones; the idempotency key is stable across repeated derivation and across excerpt/timestamp changes for the same (feed, handle, entry), and differs when any of those three differ; dedupe within the TTL window is a no-op, not a re-send; retries follow the documented backoff schedule and stop at the max-attempts cutoff, marking the record failed; a non-retryable failure fails immediately without consuming the full backoff schedule; the local test sink writes one record per delivered alert and makes no network call. Secrets are not applicable to the current test-sink-only scope; a future real adapter must keep them out of logs and reuse `server/store.ts` encryption, matching the posting pattern. No automatic external alerts are sent by the current build; separately configured manual posting is implemented under PROP-033–035.

### PROP-027

**Work view:** Implemented locally

**Next step:** Current local slice is recorded as implemented/specified; preserve its acceptance limits.

**Label:** Connection-first setup

**Status (2026-10-05):** Implemented existing source/local-alert/manual-AI setup through Connections with readiness, selected feed and return paths. Compatible AI settings storage is retained; local features do not fabricate an account or consume source slots. Saving configuration has no paid/write effect.

**Configure all posts, alerts, and features through Connections first.** Type: Requested build. Links: FEAT-034, CUST-021, CLICK-042–043; [connection matrix](CONNECTION_MATRIX.md). Dependencies: PROP-001, PROP-005.

Make Connections the common configuration entry for source posts/articles/email/chat, local mention alerts, processing/AI, and connected feature setup. Start with the owning source or capability, show actual readiness, retain the selected feed/item, and hand off to its downstream customization or reader. Per-feed filters, display preferences, and mention handles keep their feed scope; profile/appearance stay local. Future delivery providers must follow the same setup contract when separately implemented under PROP-026.

Bring current Settings → AI provider and Customize → mention setup into this journey with compatible deep links/return actions. Define the processing/destination representation and capacity policy before changing any model; the current five-feed/three-linked-source cap stays enforced, paused sources included. Missing/unsupported setup must give an actionable Connections path. Saved configuration alone is not proof of a provider round trip.

**Acceptance:** source, alert, and AI setup each begins in Connections and returns to the intended target. Existing credentials/settings migrate without loss or exposure; no account is fabricated for deterministic local features. Missing configuration, invalid input, pause/disconnect, cancel, stale draft, reload, mobile/keyboard, and isolated previews are covered. Configuration save makes no paid AI call or outbound delivery. Record local/mocked/live evidence separately and preserve current read-only ingestion, shared-item ownership, and feed limits.

### PROP-029

**Work view:** Testing

**Next step:** Review an explicitly authorized selected-feed AI run and its snapshot/receipt; generated outputs must not recurse.

**Label:** AI Pipeline

**Status (2026-10-08):** Implemented the default selected-feed reading-digest profile, persisted instructions, Connections review/run entry, exact instructions/token review and feed-owned output snapshot. Legacy feeds migrate compatibly; generated snapshots are excluded from source inputs. External result import is available through PROP-030. Arbitrary chains/providers, semantic filtering and automated runs are outside this default profile. Paid AI live evidence remains absent. Owner: Codex.

**Default selected-feed processing profile.** Links: FEAT-036, CUST-023, CLICK-057, CONN-014. Dependencies: PROP-018, PROP-027. Configure through Connections, select a custom feed as input, review the eligible originals and context, configure instructions/key/model, and manually run the default summary profile. Expose output as a clearly labeled generated result with input references, model, run date and receipt. A future output destination must be explicit; generated results must not recursively become their own inputs. Keep the existing digest as the compatible first profile rather than claiming it is the entire pipeline.

Importing an external AI pipeline's already-generated feed is an input source through PROP-030, with upstream attribution and stable IDs. It is distinct from making a paid model request inside MyFeed. Processing profiles retain the existing no-source-slot policy; an imported API source counts toward three connections per feed. Semantic inclusion/exclusion remains PROP-025, and external deliveries remain PROP-026.

**Implemented contract:** selected feed → eligible originals/context and saved digest-profile instructions → explicitly reviewed manual generation → labeled digest snapshot in the same feed. Originals/read/save/references remain intact. Configuration saves, page loads and source sync never spend money. Existing model/token/rate/budget, disconnect/stale-input, no-feedback, receipt and preview guards remain enforced. Local/mocked processing is separately evidenced from paid live calls. This implements the default profile and API import path, not arbitrary AI chains or model endpoints.

### PROP-030

**Work view:** Implemented locally

**Next step:** Current local slice is recorded as implemented/specified; preserve its acceptance limits.

**Label:** API source

**Status (2026-10-08):** Implemented JSON API source schema/catalog/setup, encrypted bearer or X-prefixed API-key headers, bounded declarative mappings, 100-item pages/three-page operations, explicit older pages and stable item IDs. Mapping changes require explicit data reset; no partial malformed batch is committed. A live public Hacker News JSON read returned 10 initial/repeat items and zero new repeat IDs; authenticated/external AI services remain account-specific evidence. Owner: Codex.

**Read-only JSON API connection.** Links: FEAT-037, CUST-024, CLICK-058, CONN-015. Dependencies: PROP-005, PROP-007, PROP-008. Configure public HTTPS endpoint, optional encrypted bearer/header API key, item-array path and bounded declarative mappings for stable provider ID, title/body, author, date, link and optional media/tags. Use no executable mapper or arbitrary request script. Support a deliberately bounded pagination contract and sanitized check/collection receipts. An external AI pipeline can use this path when it supplies a compatible read endpoint.

**Acceptance:** schema/migration, source identity, retention and capacity policy are explicit; it is a collected source and counts toward three per feed. Validate response shape, mandatory stable IDs, missing/malformed fields, date policy, duplicate/repeat reads, cursor bounds, limits, rate failures, auth failures and credential replacement without logging response bodies. Apply existing public-address/redirect/timeout/size guards, revision checks and in-flight deletion protection. Blank secret retains credentials during repair; request secrets never enter public summaries. First scope is read-only GET; provider-specific OAuth, body-based read APIs, inbound webhooks and outgoing calls need separately declared contracts. A generic source does not bypass a vendor's permissions, plan, OAuth or unsupported endpoints.

### PROP-031

**Work view:** Testing

**Next step:** Configure a user-owned YouTube API key and verify bounded metadata reads and quota errors.

**Label:** YouTube videos and Shorts

**Status (2026-10-08):** Implemented locally with a user-entered encrypted YouTube Data API key, public channel uploads or public/explicit-Shorts playlist configuration, bounded metadata paging, canonical links/thumbnails and duration labels. Mocked adapter fixtures cover normalization and older paging. No YouTube API key, OAuth grant or live request was used; live quota/account proof remains separate. Owner: Codex.

**Public channel/playlist video source first.** Links: FEAT-038, CUST-025, CLICK-059, CONN-016. Dependencies: PROP-005, PROP-007, PROP-008; user-owned enabled API project/key for live evidence. Start with channel uploads or an explicit playlist, stable video IDs, title/description/author/date, thumbnails, canonical links and duration. Personal subscriptions or private/account data require a separate OAuth experience; the app's personalized Shorts recommendation feed is not part of this proposal.

The [YouTube API setup](https://developers.google.com/youtube/v3/getting-started) requires a project/credentials and uses quotas. The [search duration filter](https://developers.google.com/youtube/v3/docs/search/list#videoDuration) identifies videos under four minutes, not specifically Shorts. Inference from the published search/video schemas: there is no general Shorts-only selector or reliable public `isShort` field to promise here. Use an explicit user-selected Shorts playlist or clearly label short-duration results as candidates; recheck this capability before building. Prefer playlist paging to repeated broad searches.

**Delivered local scope:** Connections requires a user-owned enabled project/API key and shows the bounded 3–7 (channel) or 2–6 (playlist) one-unit list-call estimate per collection. It reads at most three 50-item playlist pages and matching metadata batches, persists safe source identity/progress, and allows explicit older-page collection under ordinary retention. It stores title, description, channel, date, thumbnail, canonical watch link and parsed duration; cards only link out. A user-selected `shorts-playlist` records that explicit scope, while durations under four minutes are visibly only Shorts candidates. It neither plays/downloads/transcribes video nor reads personalized recommendations, subscriptions, private/account data, or OAuth resources.

**Evidence and remaining acceptance:** mocked fixtures cover metadata normalization, safe canonical metadata, explicit-versus-candidate Shorts labels, bounds and older cursors; API fixtures cover encrypted key validation. Duplicate/repeat identity, source lifecycle and capacity reuse the common connection contract. No configured project/key, quota failure, account or live request has been used, so live provider proof remains separate.

### PROP-032

**Work view:** Unsupported

**Next step:** Revisit only after an eligible TikTok access path and explicit scope decision.

**Label:** TikTok access and source

**Status (2026-10-08):** Feasibility decision: unsupported for the current local-only edition; no adapter implemented. No TikTok connection, developer app approval, creator grant, or eligible research access is configured. Owner: Codex.

**Determine the actual eligible product and data access.** Links: FEAT-039, CUST-026, CLICK-060, CONN-017. Source implementation depends on an approved/eligible provider path plus PROP-005, PROP-007, PROP-008. The [Display API](https://developers.tiktok.com/docs/en/display-api-overview) covers an authorized creator's profile/public uploaded videos, and [setup](https://developers.tiktok.com/docs/en/display-api-get-started) requires a developer account, approval for Login Kit and TikTok API products, and the granted `user.info.basic` and `video.list` scopes. [Scope documentation](https://developers.tiktok.com/docs/en/tiktok-api-scopes) and user consent still apply per account. This is not documented access to the user's For You or following recommendation timeline. The [review rules](https://developers.tiktok.com/docs/en/app-review-guidelines) exclude private/personal-use apps and require a developed externally facing website; sandbox work does not prove production eligibility. A business subscription alone does not establish access to the desired timeline. Research Tools have separate [eligibility and approval requirements](https://developers.tiktok.com/products/research-api/), including qualifying non-commercial research affiliation, so [Research API project approval](https://developers.tiktok.com/docs/en/research-api-get-started) is not a fallback commercial reader credential. For this local-only app, Connect must remain visibly unsupported until a user supplies an approved external Display API app plus a consenting creator, or a separately eligible and approved research use case.

**Acceptance:** first record the requested data (own uploads, consenting creators, selected video links, or personal timeline) and a permitted eligible product/account route. Explain unmet approval/region/product restrictions before showing Connect as usable. For the current local-only edition, record Unsupported with the reason above; selected external links/embeds are a separate candidate, not automated ingestion or API proof. If an eligible Display API route is later supplied, scope consent, tokens/refresh/revocation, provider identities, metadata/cover expiry, bounded pagination, sanitized failure states and fixtures before implementation. No scraping, purchased-plan guarantee, automatic posting or fabricated production verification.

### PROP-033

**Work view:** Testing

**Next step:** Review composer/account/destination behavior; real Send requires explicit user submission.

**Label:** Manual posting composer

**Status (2026-10-08):** Implemented separate writing configuration/credential/check, durable local drafts, exact five-minute review, explicit send and persistent sent/failed/unknown receipts. Reading, saves/checks and AI remain non-publishing. Source slots are unchanged; no write-only kind was added. Pausing blocks sending, source repair disables posting, and disconnect removes drafts/keys while preserving send metadata. Unknown outcomes now support explicit read-only provider reconciliation; missing/mismatched evidence stays locked. Browser simulations and provider mocks pass; no live message was sent. Owner: Codex.

**Connection-owned posting capability and shared drafts.** Links: FEAT-040, CUST-027, CLICK-061–062/065, CONN-018. Dependencies: PROP-005, PROP-006, PROP-008, PROP-027. Configure a distinct write capability in Connections with authenticated posting identity, provider permissions and selected destinations. Existing read tokens/public-author settings must never be treated as a posting identity. Decide migration and capacity for write-only accounts before adding stored connection types; enabling writes on an existing source must not multiply its reading-source slot. Preserve five feeds and three linked collected sources per feed.

Start with a plain-text/link composer for one explicitly selected destination. Keep author/account, room or audience, optional reply target and exact body visible through draft → preview → Send. A reader Reply can open the appropriate provider composer but cannot silently select an account from an arbitrary mixed-feed item. Unsaved draft handling, character limits and output errors should use the existing navigation/dialog patterns. Manually selected AI output may populate a draft, but generation, source refresh, filtering and configuration save do not send it. Multi-account cross-posting, schedules, media upload, remote edit/delete and automated alerts need explicit later scope; local item editing remains PROP-028.

**Acceptance:** durable draft/send receipt schemas and backup/removal policies are defined before implementation. Bind each send to its reviewed draft version, authenticated connection configuration and exact destination; changed account/body/audience requires renewed review. Persist attempt IDs and returned provider ID/URL, distinguish Draft/Sending/Sent/Failed/Unknown without exposing credentials or logging bodies. Double-submit/reload must not repeat a confirmed post. Network uncertainty stops automatic retry until provider-specific reconciliation establishes the result; disconnect blocks unsubmitted work but cannot retract an already transmitted request. Saving/canceling stays local; provider error, limits, permissions, expired credential, no supported destination, keyboard/mobile and preview isolation are covered with fixtures. Real sends require the user's explicit submission to a configured destination and are recorded separately from mocks. This proposal is not authorization to send messages during implementation.

### PROP-034

**Work view:** Testing

**Next step:** Use an explicitly permitted test channel/account for a user-submitted message/reply and outcome reconciliation.

**Label:** Rocket.Chat posting

**Status (2026-10-08):** Implemented writing-user/token identity and joined public-channel checks, text/link sends, same-channel thread replies and strict acknowledgment matching. Conservative local limit is 2000 Unicode code points; actual server permissions/limits remain authoritative. Read-only, broadcast, archived/encrypted channels and private/DM rooms are excluded. Mocked send/reply/duplicate/timeout/lifecycle evidence exists; live account sending remains unverified. Owner: Codex.

**Manual channel messages and thread replies.** Links: FEAT-041, CUST-028, CLICK-063, CONN-019. Dependencies: PROP-033 and a configured writable Rocket.Chat account/channel. Initial scope is text/links in a permitted configured channel, plus a reply bound to that channel's thread root. Display the signed-in sender, server, room and reply target. Do not claim private groups/DMs, impersonated authors, E2E-encrypted rooms, uploads or arbitrary servers are supported by the current public-channel reader.

The [Rocket.Chat send API](https://developer.rocket.chat/apidocs/send-message) requires user ID/auth token, accepts a single room, a client message ID and a thread root; the [post API](https://developer.rocket.chat/apidocs/post-message) also supports message/thread posting. Prefer the single-destination send contract and evaluate the server's actual duplicate-ID behavior; a supplied message ID is not assumed to guarantee idempotency on every version. Server membership, role, room settings, API availability and credential policy determine whether the account may send.

**Acceptance:** version/capability and server policy errors are visible before representing posting as ready. Validate writable room, sender and thread ownership; prevent replying into another room/source and preserve draft on failure. Match the returned message identity to the send receipt and subsequent ingestion without duplicate timeline entries. Check client IDs, duplicate submissions, timeout/unknown outcomes, rate/permission failures, replaced credentials and source removal with mocks; live account sending is a separate explicit user action. No browser preview or connection check sends a test message automatically.

### PROP-035

**Work view:** Testing

**Next step:** Use an explicitly permitted Mastodon-compatible account for a user-submitted post/reply and outcome reconciliation.

**Label:** Fediverse posting

**Status (2026-10-08):** Implemented credential verification and v2 instance limits, text/link posts with explicit unlisted/public/followers-only audience, warning/language and replies to rechecked public/unlisted status IDs. Writing requires appropriate account scopes; duplicate tokens never resend, provider idempotency keys complement durable local receipts, and uncertainty is locked for outcome inspection. Broader Fediverse, direct/private parent replies, media, edits/deletes and scheduling remain outside scope. Mocked proof only; no live publishing. Owner: Codex.

**Manual Mastodon-compatible posts and replies.** Links: FEAT-042, CUST-029, CLICK-064, CONN-020. Dependencies: PROP-033 and an authenticated account granted appropriate write permissions. Configure the posting account/instance separately from any public account being followed. First scope is text/links, explicit audience/visibility, content warning, language and an optional reply target. Resolve instance limits before presenting a valid send. Reply IDs must belong to the destination instance's view of the status; a provider ID from another connection/instance is not blindly reusable. Broader ActivityPub software, direct/private messaging, attachments, boosts, remote edit/delete and scheduling need their own declared support rather than inheriting it from the public reader.

The [Mastodon status API](https://docs.joinmastodon.org/methods/statuses/#post) publishes statuses with a user token and `write:statuses`; audience and reply fields are provider-specific. Its `Idempotency-Key` is retained for up to one hour, so local durable send receipts and handling of older uncertain attempts remain necessary. Request only the needed [OAuth scopes](https://docs.joinmastodon.org/api/oauth-scopes/); preserve independent read access when posting is disabled or revoked.

**Acceptance:** configured sender, audience, warning/body and reply target survive review unchanged; unsupported instance/version/permissions and oversized input fail visibly. Do not silently choose a broader audience than reviewed. Fixtures cover scopes, idempotency lifetime, timeout/uncertain receipts, rate/validation/auth errors, replaced/disconnected accounts and safe normalized ingestion of returned status. A locally submitted status is not a provider original until acknowledged by the server. Live publishing is separately evidenced only after the user explicitly sends through a configured account. Enabling this capability never posts or tests publicly by itself.

### PROP-028

**Work view:** Implemented locally

**Next step:** Current local slice is recorded as implemented/specified; preserve its acceptance limits.

**Label:** Edit item

**Status (2026-10-05):** Implemented revisioned source-owned local title/body overlays, original view, cancel/discard and explicit reset; reader/chat shortcuts target the source editor. Re-ingestion/restart/backup preserve overlays and saved/read identities; rules/mentions/AI use originals.

**Edit a local collected-item copy from its connection.** Type: Requested build. Links: FEAT-035, CUST-022, CLICK-044–046; CONN-012. Dependencies: PROP-005, PROP-006, PROP-027. This is the final proposal item as requested.

Add Connections → Post log → item → Edit local copy for post, article, email, and individual chat-item title/body text. Reader and alert shortcuts return to the owning connection/item editor. Alert summaries are derived from source items, not separately editable records. This is distinct from connection repair (PROP-005), feed customization, and display text limits (PROP-003).

Store local overrides separately from collected provider text. Show an edited indicator, Show original, Save, Cancel, and Reset local edits. Preserve the source/item/external IDs, author, timestamps, media/warnings, thread membership, and saved/read state. One connection-owned override is shared across linked feeds; never edit the provider post, mailbox message, or remote chat. Feed filtering/ranking/deduplication, mention detection, and AI digest inputs continue to use collected originals so local edits cannot fabricate source evidence or alerts. Display edited text only with clear local provenance and original access.

Specify title/body bounds, Unicode handling, empty-field policy, revision conflicts, and reset confirmation before building. Re-ingestion can update the collected version while retaining overrides; reset reveals the latest collected version. Unlinking/deleting a feed retains overrides; removing the owning connection removes them. Include overrides in the versioned backup/restore contract without overwriting originals.

**Acceptance:** editing, cancel, original view, and reset work on desktop/mobile with keyboard/focus support; invalid/stale saves fail without data loss. Reload/restart, repeated sync with changed provider text, two linked feeds, read/save state, content warnings, hidden/excluded chat items, source removal during save, and backup/restore are covered with isolated fixtures. Local overrides never change source-derived inclusion, alerts, or digest inputs. Preview edits are in memory only; no remote write, paid call, or live account is needed for local acceptance. Update schema/data/API registries only when implementation exists; entry PATCH now supports revisioned local overlays as well as saved/read flags.
