# Click tree — manual checklist

<!-- GENERATED from docs/readable/CLICK_MATRIX.md by scripts/click-checklist.ts. Do not hand-edit. Run npm run docs:generate. -->

65 interaction groups from the maintained [click matrix](../readable/CLICK_MATRIX.md). This is a scenario inventory, not a scan of every DOM control or evidence that a scenario passed. See the [manual workflow](../readable/MANUAL_TESTING_WORKFLOW.md) for exact click sequences and the [dated run record](../readable/MANUAL_TEST_RESULTS.md) for executed scope.

Copy this checklist into a run record; use PASS, FAIL, BLOCKED, NOT RUN, or NOT IMPLEMENTED. A checked group requires all named actions and applicable acceptance states; partial execution must list the substeps actually checked. Provider/paid/send scenarios require separate fixtures and authorization. CLI rows are not browser clicks.

- [ ] **CLICK-001 — Home or sidebar named feed**
  - Expected: Open remembered/selected feed; legacy feed-list URLs open the reader.
  - Acceptance states / existing evidence: Unknown feed, no matching search, back/forward, reload.
  - Links: FEAT-001, FEAT-018; baseline: B1 selection; B3 history; B4 legacy route/reload

- [ ] **CLICK-002 — Sidebar Create a feed → name → Create feed**
  - Expected: Open dialog, POST new feed, open its empty reader. Cancel/close makes no feed.
  - Acceptance states / existing evidence: Empty/overlong name, busy, fifth-feed limit.
  - Links: FEAT-001; baseline: B1 success; limits/error UI Gap

- [ ] **CLICK-003 — Sidebar Feed view / Customize filters; reader Saved filter**
  - Expected: Navigate within active feed; Saved uses bookmarks rather than current inclusion.
  - Acceptance states / existing evidence: Saved item later excluded; switch feed; empty Saved.
  - Links: FEAT-006, FEAT-009, FEAT-012; baseline: B1, B2

- [ ] **CLICK-004 — Sidebar Customize filters**
  - Expected: Open the selected feed customization route.
  - Acceptance states / existing evidence: Correct feed target; reload/deep link.
  - Links: FEAT-013, FEAT-018; baseline: B4 local route/reload

- [ ] **CLICK-005 — Toggle feed navigation / close / choose feed**
  - Expected: Open/close mobile sidebar; selecting a feed closes it.
  - Acceptance states / existing evidence: Mobile overlay, focus/keyboard, overflow.
  - Links: FEAT-017; baseline: B1 mobile selection; keyboard Gap

- [ ] **CLICK-006 — Sidebar / App settings Help / Close dialog / Dismiss error**
  - Expected: Show guide, close dialog, or dismiss shared error; no data mutation.
  - Acceptance states / existing evidence: Escape, focus return, error visible until dismissed.
  - Links: FEAT-017; baseline: B1 dialog close; mobile sidebar/settings Help covered; error Gap

- [ ] **CLICK-007 — Connect first source / provider shortcut / Add connection**
  - Expected: Open provider form; shortcut preselects provider.
  - Acceptance states / existing evidence: Starter state; independent creation, then link to feeds; busy.
  - Links: FEAT-002, FEAT-003; baseline: B1 email form/sample choice

- [ ] **CLICK-008 — Provider choice → fields → Add connection**
  - Expected: POST source config, encrypt credential, initial sync, show status/data.
  - Acceptance states / existing evidence: Invalid fields, unsupported URL, failure receipt; sample label; preview permits sample only.
  - Links: FEAT-002, FEAT-003, FEAT-010; baseline: B1 sample success; real forms/failure UI Gap

- [ ] **CLICK-009 — Connections: Connection enabled switch**
  - Expected: PATCH enabled state; pause retains data but removes source from ordinary lens/sync.
  - Acceptance states / existing evidence: Saved access; paused slot still counts; busy.
  - Links: FEAT-002; baseline: Gap

- [ ] **CLICK-010 — Connections: Remove connection → Keep it / Remove**
  - Expected: Open confirmation; Remove deletes source credential/items and invalidates affected digest.
  - Acceptance states / existing evidence: Cancel, in-flight sync, error; external account unchanged.
  - Links: FEAT-002, FEAT-016; baseline: Gap

- [ ] **CLICK-011 — Reader top row: Refresh feed**
  - Expected: POST sync; show receipt/toast or error; update enabled source data.
  - Acceptance states / existing evidence: No sources, busy, overlapping sync, partial failure.
  - Links: FEAT-010; baseline: Gap; B2 sync is an API request

- [ ] **CLICK-012 — Mixed timeline**
  - Expected: Posts, chats, articles, and email appear together; no type selection tabs.
  - Acceptance states / existing evidence: Empty type, Saved lens, eligible message/conversation counts.
  - Links: FEAT-006; baseline: B2 mixed content and conversations; B6 absence of type/source controls

- [ ] **CLICK-013 — Rail Search feed / Show results / Clear search; Unread**
  - Expected: Open top dialog and search eligible items; saved/unread/query applied before grouping.
  - Acceptance states / existing evidence: Handle/channel search, no results, excluded neighbors absent.
  - Links: FEAT-006, FEAT-007; baseline: B2 query/unread; B6 focus, close, and popup position

- [ ] **CLICK-014 — Article/email preview → reading dialog**
  - Expected: Open all collected text and reason; PATCH read=true on open.
  - Acceptance states / existing evidence: Close; saved excluded item; email rendering.
  - Links: FEAT-005, FEAT-008; baseline: B1 article dialog; read mutation/email Gap

- [ ] **CLICK-015 — Long post: Show more / Show less**
  - Expected: Toggle fixed 900-string-unit collapse in component state.
  - Acceptance states / existing evidence: Below/at/above threshold, paragraph/Unicode text.
  - Links: FEAT-005; baseline: Gap

- [ ] **CLICK-016 — Content warning: Show content / Hide content**
  - Expected: Reveal/hide body and media locally.
  - Acceptance states / existing evidence: No body/media before explicit reveal.
  - Links: FEAT-005; baseline: Gap

- [ ] **CLICK-017 — Entry/message: Save / Unsave**
  - Expected: PATCH saved flag; reflect in Saved across filter changes and sync.
  - Acceptance states / existing evidence: Busy, repeated click, reload, filtered chat.
  - Links: FEAT-009; baseline: B1, B2

- [ ] **CLICK-018 — Entry/message: Mark read / Mark unread**
  - Expected: PATCH read flag; update unread view.
  - Acceptance states / existing evidence: Current conversation shrinks under unread filter; IDs preserved.
  - Links: FEAT-008; baseline: B2 message toggle; ordinary-entry toggle Gap

- [ ] **CLICK-019 — Open source / Read at source / digest reference**
  - Expected: Open safe external URL in a new tab; no outbound message.
  - Acceptance states / existing evidence: Missing URL, safe scheme, reference alignment.
  - Links: FEAT-005, FEAT-015; baseline: Gap

- [ ] **CLICK-020 — Why is this in my feed?**
  - Expected: Toggle inclusion reason locally.
  - Acceptance states / existing evidence: Correct reason for current feed decision.
  - Links: FEAT-004; baseline: Gap

- [ ] **CLICK-021 — Conversation preview**
  - Expected: Open the eligible conversation from the mixed timeline.
  - Acceptance states / existing evidence: Source/channel/thread isolation; excluded root absent.
  - Links: FEAT-007; baseline: B2 conversation preview

- [ ] **CLICK-022 — Conversation preview / Back to feed**
  - Expected: Open chronological eligible messages; return to the mixed timeline.
  - Acceptance states / existing evidence: Empty groups; Saved lens; filtered neighbors stay absent.
  - Links: FEAT-007, FEAT-017; baseline: B2 desktop/mobile

- [ ] **CLICK-023 — Sidebar or Settings → Connections: select source / Post log / Linked feeds / Activity**
  - Expected: Change section/route without modifying data.
  - Acceptance states / existing evidence: Deep link, reload, correct active feed.
  - Links: FEAT-012; baseline: B1 Customize/data; other routes Gap

- [ ] **CLICK-024 — Customize: edit fields, color, toggles, selects → Save customization**
  - Expected: PATCH full feed config with revision; show success. Covers CUST-002–010 and CUST-020; CUST-011 saves in Connections.
  - Acceptance states / existing evidence: Limits, invalid keywords, busy, stale revision; persist only on save.
  - Links: FEAT-004, FEAT-011, FEAT-013; baseline: B1 mute/save; B3 temporary mute/save/reset; remaining controls Gap

- [ ] **CLICK-025 — Customize error: Reload saved customization**
  - Expected: Replace draft/rules/revision with currently loaded saved feed; clear error.
  - Acceptance states / existing evidence: Unsaved changes discarded only by this explicit action.
  - Links: FEAT-013, FEAT-016; baseline: Gap

- [ ] **CLICK-026 — Delete this feed → Cancel / Remove**
  - Expected: Remove feed, links, digest, feed receipts; preserve source data and at least one feed.
  - Acceptance states / existing evidence: Last-feed guard, cancellation, in-flight operations.
  - Links: FEAT-001, FEAT-016; baseline: Gap

- [ ] **CLICK-027 — Collected data inclusion filter**
  - Expected: Select all/included/filtered decision rows; originals retained.
  - Acceptance states / existing evidence: Counts and reasons reflect current lens.
  - Links: FEAT-004, FEAT-012; baseline: B1 reason visible; selecting filters Gap

- [ ] **CLICK-028 — Activity section**
  - Expected: Display run trigger/time/counts/errors; read-only.
  - Acceptance states / existing evidence: No runs, background/manual, mixed source outcomes.
  - Links: FEAT-012; baseline: Gap

- [ ] **CLICK-029 — Profile: fields → Save changes**
  - Expected: PATCH local profile with revision; show saved result.
  - Acceptance states / existing evidence: Invalid email, stale save, reload; email is profile only.
  - Links: FEAT-014; baseline: B1 name/save; B3 temporary name/save; B4 route; email/error Gap

- [ ] **CLICK-030 — Settings: AI provider**
  - Expected: Show AI configuration; legacy Appearance links show this section; no automatic AI generation.
  - Acceptance states / existing evidence: Profile separate page; deep link.
  - Links: FEAT-014, FEAT-015; baseline: B3 AI preview/disabled and no Appearance; B4 local route; local AI setup Gap

- [ ] **CLICK-031 — Retired: Appearance section**
  - Expected: Removed from Settings; use CLICK-032 for theme changes.
  - Acceptance states / existing evidence: Existing stored system preference remains compatible.
  - Links: FEAT-014; baseline: Removed by user request; no current selection control

- [ ] **CLICK-032 — Toggle color theme**
  - Expected: PATCH light/dark immediately.
  - Acceptance states / existing evidence: Busy/error, current system preference.
  - Links: FEAT-014; baseline: B1 dark→light

- [ ] **CLICK-033 — AI: key/model → Save changes / Disconnect AI**
  - Expected: PUT explicit AI config or remove local key; never expose secret.
  - Acceptance states / existing evidence: Missing config, save errors; preview AI disabled; no generation on save.
  - Links: FEAT-015, FEAT-016; baseline: Gap; mocked/API coverage in feature matrix

- [ ] **CLICK-034 — Connect your AI provider / Generate digest / digest summary**
  - Expected: Open AI settings if unconfigured; otherwise manually POST digest; summary expands snapshot.
  - Acceptance states / existing evidence: No included items, busy, provider error, stale/removed references.
  - Links: FEAT-015; baseline: Gap; paid live AI unverified

- [ ] **CLICK-035 — Retired layout navigation panel; direct preview URLs**
  - Expected: Direct preview pages remain isolated; normal sidebar navigation replaces the preview panel.
  - Acceptance states / existing evidence: No live API/provider mutation; reload resets sample edits.
  - Links: FEAT-018; baseline: B3 route/history/reset/no API; B6 no preview panel

- [ ] **CLICK-036 — Customize: Item text size → current defaults / Words / Characters → maximum**
  - Expected: Edit feed-specific display budget; clearly show unit and value.
  - Acceptance states / existing evidence: Positive integer, incompatible/empty value, defaults, feed isolation, keyboard labels.
  - Links: FEAT-019; baseline: Implemented; local/API/browser checks

- [ ] **CLICK-037 — Save customization / validation error for item size**
  - Expected: Validate API schema/revision, persist valid value, keep invalid draft with field explanation.
  - Acceptance states / existing evidence: Reload, old store, stale save, below/at/above maximum, desktop/mobile.
  - Links: FEAT-019; baseline: Implemented; local/API/browser checks

- [ ] **CLICK-038 — Limited post Show more / Show less; article/email or conversation open**
  - Expected: Expose collected text beyond budget without changing eligibility or read/save state except existing open/read behavior.
  - Acceptance states / existing evidence: Word/character boundaries, Unicode, warnings, Saved, excluded chats absent.
  - Links: FEAT-019; baseline: Implemented; local/API/browser checks

- [ ] **CLICK-039 — Alerts / Open tagged post**
  - Expected: Show condensed mention excerpts and open full collected text; opening marks read.
  - Acceptance states / existing evidence: Disabled/unconfigured, no matches, excluded items, warnings, mobile.
  - Links: FEAT-032; baseline: B6 local preview

- [ ] **CLICK-040 — Show mention alerts / Your @handles / Save customization**
  - Expected: Persist per-feed opt-in and explicit handles with validation.
  - Acceptance states / existing evidence: Old defaults, invalid handles, muted mentions.
  - Links: FEAT-032; baseline: API persistence/validation; B6 preview config

- [ ] **CLICK-041 — Connection Post log / item summary / Save / Unsave**
  - Expected: Open that connection’s inline post log, expand an item, and update shared bookmark state.
  - Acceptance states / existing evidence: Collapsed content hidden; reopen retains saved state.
  - Links: FEAT-012, FEAT-009; baseline: B6 sample preview

- [ ] **CLICK-042 — Connections → sources / Connected features**
  - Expected: Select source or local-alert/manual-AI capability, target feed, and downstream configuration
  - Acceptance states / existing evidence: Readiness, no local account fabrication, no effects on save; previews isolated
  - Links: FEAT-034; baseline: Implemented; browser/API evidence

- [ ] **CLICK-043 — Configure capability / Return to feed**
  - Expected: Keep selected feed context; missing AI/alerts open Connections; settings route remains compatible
  - Acceptance states / existing evidence: Deep links, reload, sidebar/mobile paths; no spending/delivery on save
  - Links: FEAT-034; baseline: Implemented for existing capabilities

- [ ] **CLICK-044 — Post log / reader → Edit local copy**
  - Expected: Open owning source item editor; editing is local only
  - Acceptance states / existing evidence: Plain text, source identity, warnings, desktop/mobile and preview isolation
  - Links: FEAT-035; baseline: Implemented; browser/API evidence

- [ ] **CLICK-045 — Item editor → Save / Cancel**
  - Expected: Save validated override with baseline editVersion, or confirm discard of unsaved changes
  - Acceptance states / existing evidence: Invalid/empty/stale/removal, read/save preservation, restart/resync
  - Links: FEAT-035; baseline: Implemented; local fixtures

- [ ] **CLICK-046 — Edited copy → Show original / Reset local edits**
  - Expected: Inspect retained collected version; explicitly confirm reset to latest original
  - Acceptance states / existing evidence: Cancel reset, changed provider text, backup, original rules/mentions/AI unaffected
  - Links: FEAT-035; baseline: Implemented; local fixtures

- [ ] **CLICK-047 — Connections → Edit connection / Save / Cancel**
  - Expected: Versioned config/credential repair; identity reset requires explicit checkbox
  - Acceptance states / existing evidence: API secret/reset/stale/old-sync tests; sample editor workflow
  - Links: FEAT-024; baseline: Implemented locally

- [ ] **CLICK-048 — Connections → Check connection**
  - Expected: Saved configuration read, health/count only; no ingest
  - Acceptance states / existing evidence: API/sample evidence; live account proof separate
  - Links: FEAT-024, FEAT-027; baseline: Implemented locally

- [ ] **CLICK-049 — Connections → Load older source items**
  - Expected: Bounded older collection; eligible chronological chat history; retention applies
  - Acceptance states / existing evidence: Mocked social/chat/IMAP checks; local history tests
  - Links: FEAT-026–028; baseline: Implemented; authenticated live proof pending

- [ ] **CLICK-050 — Customize → Show media / Media size; reader reveal**
  - Expected: Persist preview media preferences; retained media available
  - Acceptance states / existing evidence: Schema/default/build and preview controls; fallback retained
  - Links: FEAT-020; baseline: Implemented

- [ ] **CLICK-051 — Customize → Font / Spacing / Width**
  - Expected: Persist bounded reading typography
  - Acceptance states / existing evidence: API defaults, browser narrow/mobile overflow
  - Links: FEAT-020; baseline: Implemented

- [ ] **CLICK-052 — Customize → Item-type text overrides**
  - Expected: Override or inherit feed limit without changing originals
  - Acceptance states / existing evidence: Text tests and browser post override
  - Links: FEAT-020; baseline: Implemented

- [ ] **CLICK-053 — Customize → Conversation preview messages**
  - Expected: Show 1–10 eligible chronological preview messages
  - Acceptance states / existing evidence: Browser count and pure filtered grouping
  - Links: FEAT-020; baseline: Implemented

- [ ] **CLICK-054 — Reader → Generate digest → Review / Cancel / Count and generate**
  - Expected: Explicit original/context, token/rate/spending review; uncertain receipts in Connections
  - Acceptance states / existing evidence: Mocked token count/budget/retry/removal tests; browser review cancellation; no paid call
  - Links: FEAT-030; baseline: Implemented; paid live check pending

- [ ] **CLICK-055 — Reader / Post log / Filter results / Alerts → Load more / Reload**
  - Expected: Bounded revision pages, full-lens search/Saved/unread, stale-page recovery
  - Acceptance states / existing evidence: History/API/synthetic tests; browser live local paging
  - Links: FEAT-031; baseline: Implemented

- [ ] **CLICK-056 — CLI → local start/status/stop/update; backup create/restore/export**
  - Expected: Controlled loopback process, protected recovery archive; login launch is explicit
  - Acceptance states / existing evidence: Isolated macOS launch/restart and backup fixtures; Linux/login activation not live-verified
  - Links: FEAT-025, FEAT-029; baseline: Implemented locally

- [ ] **CLICK-057 — Connections → Configure pipeline profile / Review AI Pipeline**
  - Expected: Persist instructions in selected feed customization; review exact instructions/originals, confirm bounded run; output is feed snapshot, save does not run
  - Acceptance states / existing evidence: See acceptance in the expected result and linked workflow.
  - Links: FEAT-036 / PROP-029; baseline: Implemented locally; paid call unverified

- [ ] **CLICK-058 — Add connection → API source → map/check/link**
  - Expected: Supported read-only JSON mappings, stable IDs, protected header credentials, failure/check states and three-source capacity; repair/reset explicit
  - Acceptance states / existing evidence: See acceptance in the expected result and linked workflow.
  - Links: FEAT-037 / PROP-030; baseline: Implemented; API/adapter fixtures and public read

- [ ] **CLICK-059 — Add connection → YouTube → select channel/playlist/check**
  - Expected: Encrypted user API key, visible 3–7/2–6 one-unit bounded call estimate, public metadata and explicit-versus-candidate short-video scope
  - Acceptance states / existing evidence: See acceptance in the expected result and linked workflow.
  - Links: FEAT-038 / PROP-031; baseline: Implemented locally; mocked adapter/API evidence, no live key/account proof

- [ ] **CLICK-060 — Connections → TikTok → access/eligibility details**
  - Expected: Identify approved product/creator data; show restricted/unsupported state rather than imply personal timeline support
  - Acceptance states / existing evidence: See acceptance in the expected result and linked workflow.
  - Links: FEAT-039 / PROP-032; baseline: Unsupported for current local-only edition; not implemented

- [ ] **CLICK-061 — Connections → Configure writing account / Check writing account**
  - Expected: Save versioned separate encrypted key, then read-only sender/destination check; preserves reading identity and source slots
  - Acceptance states / existing evidence: See acceptance in the expected result and linked workflow.
  - Links: FEAT-040 / PROP-033; baseline: Implemented; fixtures, no live message

- [ ] **CLICK-062 — New message → Save local draft / Review send / Send reviewed message**
  - Expected: Durable draft/reload; exact five-minute review; explicit send; preserve failed body and lock uncertainty. Preview uses Simulate send only
  - Acceptance states / existing evidence: See acceptance in the expected result and linked workflow.
  - Links: FEAT-040 / PROP-033; baseline: Implemented; API/mock/browser fixtures

- [ ] **CLICK-063 — Rocket.Chat message/Post log → Reply**
  - Expected: Open correct source composer; server binds collected child to checked room/root; no excluded root content is restored
  - Acceptance states / existing evidence: See acceptance in the expected result and linked workflow.
  - Links: FEAT-041 / PROP-034; baseline: Implemented; mocked root/send proof

- [ ] **CLICK-064 — Fediverse item/Post log → Reply / connection → New message**
  - Expected: Checked writing account and explicit audience/warning/language; recheck public/unlisted local-instance parent before send
  - Acceptance states / existing evidence: See acceptance in the expected result and linked workflow.
  - Links: FEAT-042 / PROP-035; baseline: Implemented; mocked proof only

- [ ] **CLICK-065 — Unknown posting receipt → Check send outcome**
  - Expected: Read-only original Rocket.Chat client-ID lookup or supplied Mastodon post-ID comparison; missing/mismatched evidence stays Unknown with no retry
  - Acceptance states / existing evidence: See acceptance in the expected result and linked workflow.
  - Links: FEAT-040 / PROP-033–035; baseline: Implemented; mocked API/browser evidence only
