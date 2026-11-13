# Customization tracking list

Baseline: 2026-10-04. Track controls here, product capabilities in the [feature list](FEATURE_LIST.md), interactions in the [click matrix](CLICK_MATRIX.md), and implementation/evidence in the [feature matrix](FEATURE_MATRIX.md). These are maintained planning documents, separate from the generated documentation update matrix.

IDs remain stable when rows move. **Implemented** means the control exists in the inspected code; verification is tracked separately. **Requested** means the user asked for it and it awaits implementation. **Proposed** means a candidate for discussion, without a delivery commitment. Dated implementation evidence identifies delivered controls; optional hosted/semantic/delivery tracks remain conditional. The [proposal work queue](PROPOSAL_WORK_QUEUE.md) orders implementation and optional controls without creating a delivery commitment.

## Feed customization

Current persistent feed controls live in **sidebar → Customize filters**. Reader filters are temporary controls in the reader. CUST-011 is a connection control in Connections. The requested setup journey begins in Connections before selecting a feed/capability and configuring downstream behavior (CUST-021 / PROP-027); scope stays per feed where applicable. Connections now hands AI setup to the compatible Settings form, preserving workspace ownership.

| ID       | Customization              | Scope / choices                                                                                                                | Current status          | Feature            |
| -------- | -------------------------- | ------------------------------------------------------------------------------------------------------------------------------ | ----------------------- | ------------------ |
| CUST-001 | Maximum text per item      | Per feed: words or characters plus a maximum; expand to read more. See the specification below.                                | Implemented             | FEAT-019           |
| CUST-002 | Feed name                  | Per feed; required, up to 60 characters.                                                                                       | Implemented             | FEAT-013           |
| CUST-003 | Feed description           | Per feed; up to 240 characters.                                                                                                | Implemented             | FEAT-013           |
| CUST-004 | Feed color                 | Per feed; blue, violet, green, orange, rose.                                                                                   | Implemented             | FEAT-013           |
| CUST-005 | Include keywords           | Per feed; comma-separated, any match; empty accepts otherwise-eligible items.                                                  | Implemented             | FEAT-004           |
| CUST-006 | Mute keywords              | Per feed; matching items excluded from the lens; mute wins over include.                                                       | Implemented             | FEAT-004           |
| CUST-007 | Interests and perspective  | Per feed; context up to 2,000 characters for deterministic keyword ranking and manual digests.                                 | Implemented             | FEAT-004, FEAT-015 |
| CUST-008 | Hide duplicate stories     | Per feed; on/off, on by default; distinct chat events stay distinct.                                                           | Implemented             | FEAT-004           |
| CUST-009 | Sort order                 | Per feed; newest first (default) or match context first.                                                                       | Implemented             | FEAT-004           |
| CUST-010 | Reading layout             | Per feed; comfortable cards (default) or compact list.                                                                         | Implemented             | FEAT-013           |
| CUST-011 | Background sync            | Per connection; opt-in, off by default; fixed five-minute interval while the local server runs.                                | Implemented             | FEAT-011           |
| CUST-015 | Reading filters            | Reader session; popup search, saved, unread. All content types share one feed.                                                 | Implemented · temporary | FEAT-006           |
| CUST-016 | Item-size overrides        | Post, article/email, chat limits: inherit feed, current default, 1–5000 words or 1–20000 grapheme characters.                  | Implemented             | FEAT-020           |
| CUST-017 | Media size and visibility  | Preview show/hide with per-item reveal; small/normal/large max image heights 160/340/560px; alt/unavailable fallback retained. | Implemented             | FEAT-020           |
| CUST-018 | Text appearance            | 14–24px font, 1.2–2.2 line spacing, full/900px/680px reading width; compatible defaults 14/1.7/full.                           | Implemented             | FEAT-020           |
| CUST-019 | Conversation preview count | 1–10 already-eligible chronological messages, default 3; full conversation history pages remain accessible.                    | Implemented             | FEAT-020           |
| CUST-020 | Mention alerts             | Per feed; enabled switch and up to 20 explicit @handles; off/empty by default.                                                 | Implemented             | FEAT-032           |

## Workspace customization

| ID       | Customization              | Scope / choices                                                                                                                                                                                 | Current status                           | Feature            |
| -------- | -------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------- | ------------------ |
| CUST-012 | Appearance                 | Rail/header light/dark toggle; stored system preference remains compatible; no Appearance section; starter default is light.                                                                    | Implemented                              | FEAT-014           |
| CUST-013 | Local profile              | Profile; display name and optional email; profile email does not connect a mailbox.                                                                                                             | Implemented                              | FEAT-014           |
| CUST-014 | AI provider and generation | Connections → AI processing → compatible Settings form; explicit key/model. Reader reviews inputs/context, limits, current user-verified rates and per-request budget before manual generation. | Implemented · paid live check unverified | FEAT-015, FEAT-030 |

## CUST-001: maximum text per item

**Implemented policy (PROP-002 / PROP-003):** each feed stores a `textLimit` of Current default, Words, or Characters. Current default preserves the previous 900 UTF-16-unit post collapse and existing article/chat previews; old and new feeds receive this mode. It is a compatibility choice, not a newly chosen user budget. Selecting Words starts a visible draft at 100, Characters at 500; neither applies until Save customization. These are editable starting values, not mandatory presets.

Words accepts an integer from 1–5,000. `Intl.Segmenter('en', { granularity: 'word' })` counts `isWordLike` segments, including dictionary segmentation for scripts without spaces; punctuation/emoji do not count as words. Runtime ICU determines dictionary boundaries. Characters accepts an integer from 1–20,000 and counts extended grapheme clusters, including spaces and paragraph breaks. A family emoji, flag, or letter with combining accents is one character; no normalization rewrites the original. Empty text is unchanged. The contiguous original prefix ends before the first over-budget segment, with trailing whitespace removed only in word mode. The `…` marker is outside the budget and appears only when text is omitted.

Examples: 2 words of `One,\n\ntwo 👋 three.` yields `One,\n\ntwo 👋…`; 3 characters of `👨‍👩‍👧‍👦é🇨🇦x` yields `👨‍👩‍👧‍👦é🇨🇦…`. Text exactly within its limit retains its punctuation and has no marker.

Custom limits apply to collapsed post bodies, article/email excerpts, and each eligible chat message in conversation previews, in Reading and Saved. Titles, author details, timestamps, tags, and media are outside the budget. Existing visual line clamps can further shorten article/chat previews. Post Show more / Show less, article/email reading dialogs, and opened conversations preserve access to all collected text. Content warnings require reveal; chat preview warnings hide the message text.

This setting changes presentation only: originals, entry identity, saved/read state, filtering, search, context ranking, deduplication, mention detection, and digest inputs/fingerprints stay unchanged. The API validates the discriminated mode/value schema and existing revision guard. Old stores migrate to Current default; different feeds retain independent settings. Fictional preview changes reset on reload. Ingestion still bounds normalized content to 12,000 UTF-16 units; display controls cannot recover uncollected remote text.

Evidence and any remaining release checks are recorded in IMPLEMENTATION and the feature/click matrices. Final arrangement approval is still a separate user review.

## Proposed implementation order

CUST-001 is specified in [PROP-002](PROPOSAL_WORK_QUEUE.md#prop-002) and implemented in [PROP-003](PROPOSAL_WORK_QUEUE.md#prop-003), after page arrangement review. Optional display work follows the local release: media controls (CUST-017 / [PROP-014](PROPOSAL_WORK_QUEUE.md#prop-014)), typography (CUST-018 / [PROP-015](PROPOSAL_WORK_QUEUE.md#prop-015)), item-type overrides (CUST-016 / [PROP-016](PROPOSAL_WORK_QUEUE.md#prop-016)), then conversation preview count (CUST-019 / [PROP-017](PROPOSAL_WORK_QUEUE.md#prop-017)). These remain proposals; no controls were added by queue creation.

## Updating this list

Move status only with evidence. Add acceptance criteria before implementing proposed controls, retain existing IDs, and update the linked feature and click rows in the same change. Implementation and tests are separate from this planning baseline.

## Requested connection and item controls

| ID       | Customization                  | Scope / choices                                                                                                                                                                                 | Current status                 | Feature  |
| -------- | ------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------ | -------- |
| CUST-021 | Connection-first feature setup | Existing sources, local alerts and manual AI start in Connections; selected feed target, visible readiness, compatible deep links/return. No fabricated account or slot for local capabilities. | Implemented locally · PROP-027 | FEAT-034 |
| CUST-022 | Local item title/body          | Connection Post log editor; nonblank title ≤500 UTF-16 units, body ≤100000 units (empty allowed); revisioned original-preserving override, cancel/reset, shared across linked feeds.            | Implemented locally · PROP-028 | FEAT-035 |

Editing bounds and empty-field behavior are specified and implemented in PROP-028. Existing source text remains authoritative for eligibility, mentions, and digest inputs. CUST-022 is content editing, separate from the CUST-001 display budget. See the [connection matrix](CONNECTION_MATRIX.md) and [verification matrix](VERIFICATION_MATRIX.md).

## Requested pipeline and API/video setup controls — 2026-10-05

| ID | Customization | Proposed scope / choices | Current status | Feature |
| --- | --- | --- | --- | --- |
| CUST-023 | AI Pipeline profile | Selected feed as input; persisted digest-profile instructions ≤2000 UTF-16 units, exact review/model/token/budget checks, generated snapshot in that feed | Implemented locally · PROP-029; paid call unverified | FEAT-036 |
| CUST-024 | API source mapping | HTTPS JSON GET; bearer or X-prefixed header auth; dot paths ≤8 levels, stable IDs; 1–3 pages, ≤100 items/page, cursor strings ≤500; absent dates use 1970-01-01 | Implemented · PROP-030; no OAuth/webhook/write | FEAT-037 |
| CUST-025 | YouTube source selection | Public channel uploads or playlist ID, encrypted project key, 3–7/2–6 one-unit bounded call estimate; explicit Shorts playlist or clearly labeled duration candidates | Implemented locally · PROP-031; no live key/account proof | FEAT-038 |
| CUST-026 | TikTok access selection | Actual supported product, eligible account/approval and consented creator input; unsupported states before setup | Unsupported for current local-only edition · PROP-032; not implemented | FEAT-039 |

## Requested manual posting controls — 2026-10-08

| ID | Customization | Proposed scope / choices | Current status | Feature |
| --- | --- | --- | --- | --- |
| CUST-027 | Posting capability/draft | Separate encrypted writing key/opt-in, checked sender, plaintext local drafts ≤5000 units; 50 drafts/100 receipts; five-minute exact review; no automatic send/retry | Implemented locally · PROP-033; no live-send proof | FEAT-040 |
| CUST-028 | Rocket.Chat send target | Joined normal public channel and checked writing user; root verified before thread reply; conservative 2000-code-point text budget | Implemented locally · PROP-034; server permissions authoritative | FEAT-041 |
| CUST-029 | Fediverse post audience | Unlisted/public/followers-only; warning ≤500 units, optional language; v2 instance limit capped at 5000; only accessible public/unlisted parent replies | Implemented locally · PROP-035; mocked proof only | FEAT-042 |
