# AI actions inventory

> **Status:** Audit, read-only · **Date:** 2026-11-10 · Registered as `WM-MYFEED-AI-ACTIONS-AUDIT-01`

Scope: every place in MyFeed today that is AI-related, either because it calls a
model/provider or because it is a deterministic stand-in presented as a future AI
feature. "Built" means it exists on `main` and a user can exercise it right now.
"Proposed" means it is documented in the proposal queue but not implemented.

This file is a snapshot of `main` at the time of audit and will drift; re-check
against current code before treating it as current status.

## Built (exists today)

| Name | Entry point | What it does (user's perspective) | Code refs | You can see this by... |
|---|---|---|---|---|
| **Connect your AI provider** | Settings → AI provider tab | User pastes their own OpenAI API key and picks a model string. No account is created by MyFeed; it's the user's own OpenAI account, billed to them. Can disconnect at any time. | [`src/components/SettingsContent.tsx:65-192`](../src/components/SettingsContent.tsx), `PUT /api/ai` in [`server/app.ts:630-654`](../server/app.ts) | Open Settings → AI provider, enter a key + model, save. No network call happens until you also generate a digest. |
| **Generate digest (manual, per-feed)** | Feed reader sidebar "Generate digest" button, or Connections → feed-linked AI Pipeline entry | Sends up to 20 of that feed's currently-included items (title/content/author, trimmed to a configurable character limit) plus the feed's reader-context text to OpenAI's Responses API, with instructions to write a grounded, cited summary. Nothing is sent until the user reviews the exact input and confirms; a per-request token/cost ceiling is enforced before the real request fires. | [`src/components/FeedReader.tsx:334-355`](../src/components/FeedReader.tsx), [`src/components/GenerationReview.tsx`](../src/components/GenerationReview.tsx) (full review UI), [`shared/generation.ts`](../shared/generation.ts) (pure input-building, cost math, digest instructions), `GET /api/feeds/:id/digest-plan` + `POST /api/feeds/:id/digest` in [`server/app.ts:146-166,655-820`](../server/app.ts) | In a feed with items, click "Generate digest" in the right sidebar (button only appears once an AI provider is connected). Review the exact items/instructions/model shown, confirm, and a real OpenAI call is made. |
| **Digest token-count pre-check** | Same flow as above, automatic step before the real generation call | Before spending anything, the server calls OpenAI's `input_tokens` endpoint to get a real token count for the exact request, and blocks the generation (no main request sent) if it would exceed the user's configured input-token or dollar ceiling. | [`server/app.ts:692-708`](../server/app.ts), `reservedCost()` in [`shared/generation.ts:64-71`](../shared/generation.ts) | Set a very low max-cost/max-input-tokens value in the digest review options, then try to generate — it blocks with an explicit "No generation request was sent" message instead of silently calling the paid endpoint. |
| **Generation receipts** | Settings → AI provider (receipt history), also referenced by the digest-plan response | Every digest attempt — blocked, submitted, completed, or failed — is recorded locally (model, reserved cost, actual input/output tokens, status), capped at the last 50. No automatic retry on an uncertain outcome. | `GenerationReceipt` type in `shared/model.ts`, receipt-writing logic in [`server/app.ts:676-816`](../server/app.ts) | Generate a digest, then look at the receipt that gets appended; interrupt a generation (e.g. network loss) and see it recorded as a non-"completed" status rather than silently retried. |
| **Semantic-lens classifier (offline stub)** | No UI — library-level only, exercised by its own test suite | A deterministic, fully offline keyword-matching "classifier": given caller-supplied categories (each a label + literal keyword list), it labels an entry with the first category whose keyword appears in its text, or "no match." This is **not** a real AI/ML model — it's explicitly a stand-in stub for PROP-025 slice 2 (real classifier), which hasn't been built. Behind a module-level flag that defaults to `false`; nothing in the app turns it on. | [`shared/semantic-filter-stub.ts`](../shared/semantic-filter-stub.ts) (`classifySemanticLens`, `evaluateSemanticLens`, `exampleSemanticCategories`), tests in [`tests/semantic-filter-stub.test.ts`](../tests/semantic-filter-stub.test.ts) | Not reachable from the UI today. Run `npm test -- semantic-filter-stub` to see it classify sample entries, or read the module directly — it makes zero network calls. |

### Adjacent but not AI (to avoid false inclusion)

| Name | Why it's not in the "built AI" table | Code refs |
|---|---|---|
| **Generic API source (PROP-030)** | A declarative, non-executable JSON field-mapping connector for importing another system's *already-generated* output (e.g. an external AI pipeline's results) as a read-only feed source. MyFeed makes no model call here — it just maps JSON fields to Entry fields. | [`shared/api-source.ts`](../shared/api-source.ts) |
| **Mention-alert summaries** | CLAUDE.md and the code agree these are local text excerpts (bounded to 180 chars, `shared/alert-delivery.ts`), never an AI/model call. | [`shared/alert-delivery.ts:13-23`](../shared/alert-delivery.ts) |
| **Deterministic keyword feed-filtering (`shared/pipeline.ts`)** | The feed lens / inclusion-exclusion logic most items pass through daily is plain rule evaluation (keywords, source, type), not AI. It predates and is unaffected by the semantic-lens stub above. | [`shared/pipeline.ts`](../shared/pipeline.ts) |

## Proposed (not built)

| Name | Proposal | What it would add | Current gate |
|---|---|---|---|
| Real semantic classifier (slice 2 of the stub above) | [PROP-025](readable/PROPOSAL_WORK_QUEUE.md#prop-025) | Replace the deterministic keyword stub with an actual ML/LLM classifier for opt-in semantic feed lenses | **Owner-decision-gated**: model choice, what data leaves the device, spending/rate limits — none decided |
| AI Pipeline default digest profile refinements / generic processing profiles beyond the one digest flow | [PROP-029](readable/PROPOSAL_WORK_QUEUE.md#prop-029) | Broader processing-profile configuration beyond today's single per-feed digest button | Status: Testing — see queue for current disposition |
| Paid-model review / rate verification UI improvements | [PROP-018](readable/PROPOSAL_WORK_QUEUE.md#prop-018) | Already-built token/cost gating (above) has a queue entry for further review/UX work | Owner action — exact scope not yet re-opened |

## What this audit did not do

No code was changed. No model call was made to verify the OpenAI integration end-to-end live
(that would need a real API key and would spend money) — the input-building, cost-ceiling and
receipt logic were read and are covered by existing unit tests, but a live provider round-trip
was not re-verified in this pass.
