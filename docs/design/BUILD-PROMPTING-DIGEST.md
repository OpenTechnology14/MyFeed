# Build-prompting digest: the three roadmap tracks

For prompting an agent to extend MyFeed toward semantic AI filtering, external alert delivery, or a hosted multi-user edition. Sourced from `README.md`, root `CLAUDE.md`, and `docs/readable/PROPOSAL_WORK_QUEUE.md`. See `.claude/skills/design/SKILL.md` for the gating rule this digest applies: **never invent an owner decision — only prompt for the already-unblocked slice.**

Re-check `docs/readable/PROPOSAL_WORK_QUEUE.md`'s disposition lines for PROP-021/022, PROP-025, PROP-026 before using any prompt below — this digest is a snapshot, not a live status.

---

## 1. Semantic AI filtering (PROP-025)

**(a) Already built:** Feed rules use deterministic keyword inclusion/exclusion and context-keyword ranking (`shared/pipeline.ts`), with explainable per-item reasons. On-demand OpenAI digests (PROP-029/030) exist as a separate generation feature with explicit review/token/cost confirmation (`shared/generation.ts`) — but that is manual digest generation, not automatic feed filtering, and PROP-029/030 don't touch inclusion/exclusion logic.

**(b) Blocked on an owner decision:** Whether/how to replace or augment the deterministic keyword lens with a real semantic-AI model call for filtering. The queue's "Next step" for PROP-025 is explicit: "Decide privacy, exact processing model, costs and review boundary before semantic filtering." Until that's decided, `main` keeps deterministic keyword processing as the only lens (README: "Background context uses explainable keyword ranking; it does not run semantic AI filtering").

**(c) Example well-scoped prompt for the next agent-doable slice** (offline evaluator behind a flag, no live model call — this is what open PR #3 scopes):

> Add an offline semantic-lens evaluator in `shared/` that takes a feed's existing deterministic rules plus a fixed, versioned set of synthetic/test inputs and produces explainable include/exclude decisions using only local string/keyword heuristics — no network call, no OpenAI key use. Gate it entirely behind a feature flag that defaults off. Do not wire it into the live feed-filtering path in `shared/pipeline.ts`; add it as a parallel, independently-tested module with its own unit tests. Do not add any real-model API call — that part of PROP-025 is blocked on an owner decision about privacy/cost/review boundary and is out of scope for this task.

---

## 2. External alert delivery (PROP-026)

**(a) Already built:** Mention alerts are opt-in per feed with explicit `@handles`, matched against whole handles in eligible collected text, surfaced as local in-app excerpts (README / CLAUDE.md Product rules). No external delivery exists yet on `main`.

**(b) Blocked on an owner decision:** Which delivery provider(s) to support and what destination/authorization model to use. PROP-026's dependency is explicitly "user-selected delivery provider." Until chosen, alerts stay local-only; no external send path may exist.

**(c) Example well-scoped prompt for the next agent-doable slice** (contract + outbox + test sink, no real provider — this is what open PR #4 scopes):

> Define a delivery-provider-agnostic contract in `shared/` for an alert "outbox" entry (destination placeholder, payload, attempt/receipt state) and implement a local in-memory or file-backed test sink that records what *would* be sent, with sanitized receipts (completed/blocked/uncertain, matching the AI-generation receipt pattern in `shared/generation.ts`). Do not integrate any real external provider (Slack, email, webhook, etc.) and do not add a destination-configuration UI that implies a live provider is available — provider selection is an owner decision (PROP-026 dependency: "user-selected delivery provider") and is out of scope here. Keep this entirely additive; existing local-only alert matching and display must be unaffected.

---

## 3. Hosted multi-user edition (PROP-021–024)

**(a) Already built:** Nothing hosted exists on `main`. The app is explicitly single-user/local: no authentication, no tenant database, loopback-only ports 3188/5188 (CLAUDE.md "Boundaries"). PROP-021 (architecture/migration plan, docs-only) is proposed but not yet merged — confirm with `git log origin/main` before assuming otherwise.

**(b) Blocked on an owner decision:** PROP-021 requires the owner to decide and specify a hosted edition at all; PROP-022 (identity/tenant auth) is conditional on PROP-021 being accepted, and further requires deciding a hosting provider/distribution. CLAUDE.md is explicit: "A hosted edition needs authentication, tenant isolation, server-side plan enforcement, CSRF protections, encrypted managed secrets, and a durable queue before exposure" — none of that may be built speculatively.

**(c) Example well-scoped prompt for the next agent-doable slice** (docs-only architecture proposal, no code — this is what open PR #2 scopes, and is the *only* agent-doable slice until PROP-021 is accepted):

> Write a hosted-edition architecture and migration plan as a new doc under `docs/readable/` (or `docs/proposals/` if that's where PROP-021 keeps its text), covering: what in the current single-user local architecture (`server/store.ts`, `server/app.ts`, loopback binding) would need to change for multi-tenant identity, data isolation, and secret management, and in what order. Do not write or modify any actual server code toward authentication, a tenant database, or a non-loopback bind — PROP-022–024 are explicitly conditional on this proposal being accepted and on the owner choosing a hosting provider/distribution, which is out of scope for this task.
