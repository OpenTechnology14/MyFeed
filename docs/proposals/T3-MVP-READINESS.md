# T3 MVP readiness — MyFeed side

**Status:** Scoping / estimate only. Registered as `WM-MYFEED-T3-MVP-SCOPE-01`.
**Type:** Review finding. **No code changes accompany this document.**

**Question being answered:** given OpenTechApp supplies a working `t3-api/v1` (per
[T3-MCP-01](https://github.com/OpenTechnology14/OpenTechnologyApp/blob/main/docs/proposals/T3-MCP-01.md)),
how close is MyFeed to a working MVP test of: Questions shown as feed cards, inline A/B/C
answers, and a simple Idea-intake form? This extends
[T3-UI-01](T3-UI-01.md)'s phase 1, scoped to the smallest slice that would actually prove the
loop end-to-end, not full phase 1.

---

## What's built today that this reuses directly

| Need | Existing piece | Reuse fit |
|---|---|---|
| Typed GET from the server | [`query<T>()`](../../src/api.ts#L17-L22) | Direct reuse — fetches `/api/<path>`, throws on non-OK, already generic. A `query<T3Question[]>('/t3/questions')` call needs zero new client plumbing. |
| Typed mutation (POST/PATCH) | [`request()`](../../src/api.ts#L2-L15) | Reusable *pattern*, not reusable *as-is* — it's typed to return `State`, MyFeed's single app-state blob. T3 answers/ideas aren't part of `State`, so this needs a sibling function (same shape, different return type), not a change to `request()` itself. |
| Review-before-submit UX | [`GenerationReview.tsx`](../../src/components/GenerationReview.tsx), [`PostingPanel.tsx`](../../src/components/PostingPanel.tsx) review-send flow | Directly reusable *shape*: show the exact payload, require an explicit confirm click, no auto-submit. An inline A/B/C answer is simpler than either (no token/cost math, no 5-minute expiry needed unless T3-MCP-01's contract requires one) — closer to a plain confirm dialog. |
| Card-list rendering | [`ConnectionsPage.tsx`](../../src/components/ConnectionsPage.tsx)'s connection list, [`FeedReader.tsx`](../../src/components/FeedReader.tsx)'s mixed timeline | Pattern reuse: a list of cards, each with its own small set of actions, is exactly what both of these already do. No new list-rendering concept needed. |
| Form primitives | [`Button`](../../src/components/ui.tsx#L15), [`Modal`](../../src/components/ui.tsx#L47), [`Field`](../../src/components/ui.tsx#L98), [`Toggle`](../../src/components/ui.tsx#L115) | Direct reuse for both the Questions-card actions and the Idea-intake form — no new design-system work. |
| Local bounded persistence (if a cache or draft is needed) | [`server/store.ts`](../../server/store.ts)'s atomic file-write pattern, [`src/drafts.ts`](../../src/drafts.ts)'s `useSessionDraft` | Reusable pattern for either an Idea-intake draft (session-local, not yet submitted) or a short-lived local cache of fetched Questions. |
| Connections-first entry point | Existing capability deep-link pattern (`?tab=capability-ai~feedId` etc., `src/navigation.ts`) | The T3 surface should follow the same convention — opt-in, reachable via a Connections-style entry point — rather than inventing a new navigation primitive. |

**Net:** every UI primitive this needs already exists and is already used for a structurally
similar flow (review-before-send, card lists, forms). This is span, not depth — there's no new
pattern to invent, just new screens built from existing pieces.

## What's net-new (not built today)

1. **A T3 client module** (`src/t3.ts` or similar) — thin wrapper calling `t3-api/v1` endpoints,
   typed to its actual response shapes. Depends entirely on T3-MCP-01's real contract; cannot be
   finalized until that lands, though the shape can be stubbed today against the abstract
   `listOpenQuestions`/`answerQuestion`/(`submitIdea`, new to this MVP cut) interface from
   [T3-UI-01](T3-UI-01.md).
2. **A server-side proxy route**, if the browser shouldn't call `t3-api/v1` directly (credential
   handling, CORS, or same-origin constraints — depends on T3-MCP-01's auth model, not yet
   known). If `t3-api/v1` is same-origin-friendly and needs no secret MyFeed doesn't already
   hold, this step might not be needed at all — a real cost-reducer worth confirming early.
3. **Idea-intake form** — new: title + one free-text field + submit. No precedent in MyFeed
   today (posting/digest both act on already-collected content; an Idea is net-new user input
   with no source item behind it). Smallest net-new piece in this whole MVP.
4. **Questions card list + inline A/B/C answer UI** — new component, built from the reusable
   pieces in the table above, not from scratch.
5. **Navigation entry point** — a new `Page`/route (e.g. `/t3` or a Connections capability-style
   deep link) in [`src/navigation.ts`](../../src/navigation.ts), following existing convention.

## Estimate: PRs + agent-time to a working MVP UI flow

Assumes T3-MCP-01's `t3-api/v1` is ready and stable (its own gates T3MCP-D01–D05 answered) —
this is the MyFeed-side estimate only, not including any OpenTechApp-side work.

| Slice | Scope | Est. PRs | Est. agent-time* |
|---|---|---|---|
| 1. T3 client module + stub data | `src/t3.ts`, typed against real `t3-api/v1`; unit tests with mocked responses | 1 | 1–2 hrs |
| 2. Questions feed-card list (read-only) | New component + route; renders Questions as cards, no answer actions yet | 1 | 2–3 hrs |
| 3. Inline A/B/C answer UI | Add the confirm-before-submit answer action to the cards from slice 2; resolves the T3-MCP-01 "who flips the row" question (T3-UI-D03) | 1 | 2–3 hrs |
| 4. Idea-intake form | New small form + submit route, following the posting-draft save pattern (no review gate needed — an idea isn't a send) | 1 | 1–2 hrs |
| 5. Integration pass (e2e test, verify, polish) | Playwright coverage for the new flow, visual/UX pass against existing style | 1 | 2–3 hrs |

**Total: ~5 PRs, ~8–13 hours of agent-time**, assuming no server-side proxy is needed (adds
roughly 1 more PR and 2–3 hours if it is) and no blocking surprises from `t3-api/v1`'s real auth
model.

*Agent-time is wall-clock estimate for a normal-effort coding model doing the work directly
(matches [T3-UI-01](T3-UI-01.md)'s model-routing recommendation) — not calendar time, and not
counting review/merge latency or owner decision turnaround.

## What would make this slower than the estimate

- **T3-MCP-01's auth model requires a server-side secret** MyFeed has to hold and proxy (adds
  slice 2.5: a proxy route, `server/` changes, encryption via `store.ts`'s existing pattern —
  not hard, but not nothing).
- **T3-UI-D03 (who resolves the row) lands on "MyFeed writes, coordinator doesn't"** — this
  changes slice 3's error-handling requirements (MyFeed would need its own retry/backoff logic
  resembling `server/alert-outbox.ts`'s pattern rather than a simple fire-and-confirm call).
- **`t3-api/v1`'s Question schema diverges meaningfully** from the abstract shape in T3-UI-01
  (e.g. nested options, multi-select instead of single-choice) — slice 2/3 would need rework,
  not just a type update.

None of these are currently known blockers — they're the open questions already tracked as
T3-UI-D01–D04 and T3MCP-D01–D05. This estimate assumes those resolve close to their simplest
form; a materially different answer on any of them should prompt re-estimating that slice, not
silently absorbing the difference into the existing number.
