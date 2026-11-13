# MyFeed — agent context

MyFeed is a single-user local media reader built from patterns inspected in `/Users/alexpro/Downloads/OpenTechnologyApp`. Its sources are independent; never modify or import that application's live data or credentials.

This file is the canonical agent context. Run `npm run docs:generate` after changing it. `AGENTS.md` and files under `docs/agent-registries/` are generated; never hand-edit those outputs. `npm run docs:check` verifies synchronization.

## Product rules

- Start with one empty starter feed. The user explicitly chose **5 feeds** on 2026-10-04. Each feed accepts **3 connections**. Limits belong in `shared/model.ts` and must be enforced by the API. Paused sources still count.
- Configuration direction: all posts, alerts, and features go through Connections first to configure, then link/select feeds and customize downstream behavior. The unified setup flow is implemented locally under PROP-027; current alerts are configured in Customize filters and AI in Settings. Preserve per-feed settings and local-only profile/theme controls; Appearance is removed from Settings; theme changes use the rail/header toggle; do not invent provider accounts for local controls.
- Item editing under PROP-028 is implemented locally: title/body overrides with original/reset access, stable provenance and read/save state, and no remote edits.
- Feed rules are lenses over collected source items. Filtering must not destroy originals. Every decision must explain inclusion or exclusion. Saved items remain accessible even after a filter change.
- Reading is one mixed timeline with gaps between author-led posts, article/email previews, and channel/thread conversations. No content-type tabs or source/sort controls in the reader. Saved, Unread, and Alerts are the top controls; search opens a top dialog from the rail below Menu. Group chats only after the feed lens and reading filters; never restore excluded messages as conversation context. Keep distinct chat events even when text is identical. Reading/sync remains read-only; optional manual replies use separately configured writing identity and explicit review/Send.
- Layout review lives at five `/preview/` page URLs with labeled, in-memory fictional data. Preview actions must never call workspace/provider APIs, persist credentials, or change the real active feed. Keep reader, customization, connections, profile, and app settings directly addressable. Legacy feed-list URLs open the active reader; do not show a feed directory or layout-preview navigation panel.
- Connections own collected data independently and can link to multiple feeds. Each feed accepts at most three linked connections, including paused ones. Unlinking or deleting a feed preserves connections and items. Background sync is opt-in per connection, checks every five minutes, and requires the local server to run.
- Keep navigation in the sidebar: named feeds, Create a feed, Feed view / Customize filters mode toggle, Connections, profile, and settings. No top workspace header or default Reading feed, Saved for later, or Background data navigation. Saved is a reader filter; original data and run history are inspected per connection. Named feeds appear above Feed mode. My workspace expands inside app settings. The root opens the remembered feed.
- Mention alerts are opt-in per feed with explicit @handles. Match whole handles in eligible collected text; summaries are local excerpts, never automatic AI calls. No provider-native notification completeness or external delivery is claimed. External alert delivery is proposed work.
- Do not present sample entries, mocked tests, or unverified provider accounts as live integrations. Public Bluesky author feeds, Mastodon-compatible feeds and bounded public YouTube metadata are implemented. YouTube keys/accounts, authenticated email/chat, paid AI and live publishing need separate evidence; TikTok remains unsupported in this local-only edition.
- AI generation requires input/context review and explicit per-request confirmation, token limits, a spending limit, and user-verified rates for the configured exact model. Token counting precedes submission; unknown charges have reserved receipts and no automatic retry.
- AI generation is on-demand. It uses the user's explicitly configured OpenAI key and model. No provider/platform credential fallback, automatic spending, or outbound messages. Rules/context ranking are deterministic keyword processing, not semantic AI filtering.
- AI Pipeline's default digest profile (PROP-029) and generic API source (PROP-030) are implemented locally. Select a custom input feed in Connections, configure its persisted processing instructions in customization, review/count/confirm a manual run and view its generated snapshot in that feed. Generated snapshots never become source inputs. External pipeline results can be imported through the read-only API source. Paid AI remains unverified. Public YouTube metadata (PROP-031) is implemented locally with user key/quota requirements; TikTok (PROP-032) remains unsupported.
- Manual composer/write setup, Rocket.Chat sending and Mastodon-compatible posting are implemented locally under PROP-033–035. Writing tokens are separately encrypted, identities/destinations checked, and saves/checks/reading/AI never post. Each Send requires an exact five-minute draft/account/audience/reply review and fresh preflight. Durable attempts prevent double-submit; uncertain or interrupted sends never retry automatically. Explicit read-only outcome checks require frozen sender/reply evidence and matching provider results; missing/mismatched results remain unknown. Mastodon candidate matching does not independently attribute the original idempotency key. No live publishing was tested. Drafts do not become source originals; source deletion removes drafts/keys but retains send metadata receipts. Live test messages need explicit user submission.

## Architecture

- `shared/model.ts`: types, schemas, provider catalog, and limits.
- `shared/pipeline.ts`: pure filtering, context ranking, deduplication, and ingest merging.
- `shared/history.ts`: retained-history queries, complete-lens filtering before paging, Unicode-safe revision cursors.
- `shared/generation.ts`: reviewed original inputs and explicit token/rate/budget constraints.
- `shared/api-source.ts`: bounded declarative JSON source mappings, stable IDs and API credential/pagination configuration; no executable mapper.
- `shared/posting.ts`, `server/posting.ts`, `server/posting-routes.ts`: writing setup, local drafts/reviews, explicit provider sends, read-only outcome reconciliation and durable acknowledgment/uncertainty receipts.
- `shared/alert-delivery.ts`, `server/alert-outbox.ts`, `server/alert-sink-test.ts`: PROP-026 external alert delivery — contract (payload shape, idempotency-key derivation, retry/backoff policy, dedupe TTL, destination adapter interface), a durable deduplicating/retrying outbox persisted like `server/store.ts`, and the only adapter wired up today, a local recording test sink. No real network provider, route or default-feed wiring exists yet.
- `shared/local-copy.ts`: display-only local title/body overrides; originals remain pipeline/alert/AI evidence.
- `shared/presentation.ts`: compatible entry-type inference, source/channel/thread grouping, chronological messages, and timeline collapse.
- `server/backup.ts` and `scripts/backup.ts`: protected offline paired backup/restore and credential-free content export.
- `scripts/local.ts` and `scripts/operation-lock.ts`: managed macOS start/status/stop/update plus an atomic lifecycle/restore lock; login launch requires explicit CLI opt-in.
- `server/store.ts`: atomic file persistence, AES-256-GCM credential encryption, public summaries.
- `server/connectors.ts`: bounded read-only RSS, Mastodon, Bluesky, IMAP, Rocket.Chat, JSON API, and sample adapters.
- `server/network.ts`: HTTPS requests with timeout/size/redirect limits and DNS-pinned public-address validation.
- `server/app.ts`: API, limit enforcement, sync locking, opt-in background worker, manual AI generation.
- `server/routes.ts`: canonical API documentation registry. Update it when routes change.
- `src/App.tsx` and `src/components/`: reader, background views, profile/settings, accessible dialogs.
- `docs/readable/`: human-readable product/architecture/integration documents. `scripts/generate-docs.ts` generates agent context, route registry, and documentation matrix.
- `docs/readable/PROPOSAL_WORK_QUEUE.md`: canonical ordered proposal queue with stable PROP IDs, dependencies, scope, and acceptance criteria. Keep proposed work distinct from implementation, layout approval, and provider evidence; local release precedes optional/hosted tracks.
- `docs/readable/PROPOSAL_DASHBOARD.md` and `proposal-dashboard.html`: maintained Testing workflow and dated browsable snapshot. Per-item Work view/Next step come from the canonical queue; presentation never grants execution, provider or paid-AI permission. Refresh source/receipt after queue changes.
- `docs/readable/CUSTOMIZATION_LIST.md` and `FEATURE_LIST.md`: maintained product inventory/backlog with stable customization and feature IDs. Per-feed item text limits are implemented in shared/text.ts: compatible default, word or grapheme character budgets. They affect previews only; filtering/search/AI retain originals.
- `docs/readable/CLICK_MATRIX.md` and `FEATURE_MATRIX.md`: maintained interaction and implementation/evidence baselines. Update linked IDs, statuses, paths, and coverage when behavior changes; distinguish proposed controls from implemented ones and local/mocked checks from live proof.
- `docs/readable/CONNECTION_MATRIX.md`, `FULL_APPLICATION_AUDIT_MATRIX.md`, `API_AUDIT_MATRIX.md`, and `VERIFICATION_MATRIX.md`: maintained setup, component/capability audit, route scenario, and change-to-check contracts. Keep evidence separate from build status and link gaps to the existing proposal queue. Connection-first configuration and local item editing are implemented locally; live account/provider evidence and optional tracks remain separate.
- `docs/readable/DATA_MATRIX.md`: generated data contract from `scripts/data-matrix.ts`, Entry fields, and shared limits/provider names. Update the source registry when mappings, normalization, storage, retention, or removal changes; do not edit the generated matrix. Provider setup remains in INTEGRATIONS.md.

## Boundaries

- API listens on `127.0.0.1:3188`; Vite on `127.0.0.1:5188`. Keep loopback bindings, Host/Origin checks, JSON-only mutations, and public-network URL validation.
- No authentication or tenant database exists. Do not deploy this build as a public or multi-user service. A hosted edition needs authentication, tenant isolation, server-side plan enforcement, CSRF protections, encrypted managed secrets, and a durable queue before exposure.
- Never log credentials, source response bodies, or mailbox message contents. `data/`, `.env*`, and browser test artifacts are ignored. Local item content is plaintext in the restricted-permission data directory; credentials alone are encrypted.
- Preserve encryption key and store together when backing up. A corrupted or unknown-version store must fail visibly rather than reset itself.
- Never use `dangerouslySetInnerHTML` for remote content. Keep safe URL schemes, plain text rendering, and all filtering explanations.
- Disconnect/deletion must prevent an in-flight sync from recreating data. Repeated ingestion must preserve IDs and saved/read state.
- Use isolated temp data directories for tests. Never use the user's real workspace for destructive tests or credentials for paid-provider tests.
- Browser tests require a unique `MYFEED_E2E_SESSION` and named temporary store. `server/test-session.ts` rejects production/default-data test sessions, the normal API refuses test-marked traffic, and Playwright verifies the matching API marker before any workflow. Stop normal servers before E2E even with this guard; fixed-port Vite proxying must never route tests into the normal workspace.

## Checks and documentation

Run `npm run verify` after code changes; run `npm run test:e2e` for reader/setup/settings changes. Start the user preview after E2E finishes (both use the fixed local ports). Record outcomes in `docs/readable/IMPLEMENTATION.md` and distinguish local/mocked checks from live-provider evidence.

For manual browser clicks, stop normal servers and use `npm run test:manual` with `docs/readable/MANUAL_TESTING_WORKFLOW.md`. Its marked Vite proxy and verified isolated API use a fresh temporary store. The generated `docs/agent-registries/CLICK_TREE_MANUAL_CHECKLIST.md` derives interaction groups from CLICK_MATRIX.md; record only executed substeps in MANUAL_TEST_RESULTS.md, including blocked checks and cleanup. A generated checklist is not execution evidence.

Read existing code before changes. Keep readable documentation synchronized with relevant code changes. Do not spawn subagents unless the user or applicable instructions explicitly request delegation. Do not install extra plugins or copy infrastructure from OpenTechnologyApp without a concrete need.

## Skills

Claude Code skills distilled from this file live under `.claude/skills/`:
- `.claude/skills/code-creation/SKILL.md` — loopback/security/persistence rules and required checks for server/shared/client code.
- `.claude/skills/docs/SKILL.md` — `docs/readable/` ownership, the generated-vs-hand-maintained doc boundary, and the proposal queue discipline.
- `.claude/skills/design/SKILL.md` — product rules and the owner-decision gate for semantic AI filtering, external alert delivery, and the hosted multi-user track.
- `.claude/skills/audits/SKILL.md` — which audit/check scripts actually exist on `main` today, and the PR-triage pattern for scope-audit findings.

Keep these in sync with this file; they are hand-maintained, not generated.

## Design

`docs/design/BUILD-PROMPTING-DIGEST.md` distills how to prompt an agent to extend MyFeed toward the three conditional roadmap tracks (semantic AI filtering, external alert delivery, hosted multi-user), covering what's already built, what's owner-decision-gated, and a well-scoped example prompt for the next agent-doable slice of each. Keep it in sync with `docs/readable/PROPOSAL_WORK_QUEUE.md`.

`docs/design/DESIGN-SYSTEM-POINTER.md` is a forward pointer to the not-yet-published `hybrid-creator-platform/design-system/` hub (tokens, components, voice-and-tone), states what MyFeed defines locally today in `src/styles.css`, and records local-override findings. `docs/design/proposals/TEMPLATE.md` is the generic template for future proposals needing visual/UX design artifacts.
