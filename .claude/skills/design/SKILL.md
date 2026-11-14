---
name: design
description: Use when scoping new MyFeed features or evaluating a feature request against product rules — especially anything touching feed/connection limits, semantic AI filtering, external alert delivery, or multi-user/hosted support. Encodes which roadmap tracks are owner-decision-gated so you don't build past an unmade decision.
---

# MyFeed design intent and proposal gating

Source: root `CLAUDE.md` "Product rules" section and `docs/readable/PROPOSAL_WORK_QUEUE.md`.

## Core model

- 5 feeds, 3 connections per feed (paused connections still count). Limits live in `shared/model.ts`, enforced server-side.
- Configuration is connections-first: set up a connection in Connections, then link/select feeds, then customize downstream behavior (filters, alerts, AI) per feed.
- Feed rules are lenses over collected originals — filtering never destroys originals; every inclusion/exclusion decision must be explainable; saved items stay accessible after a filter change.
- Reading is one mixed timeline (posts/articles/email previews/chat), no content-type tabs. Group-chat grouping happens after the feed lens and reading filters, never before.

## The core rule: never invent owner decisions

Three roadmap directions are explicitly blocked on a decision only the product owner can make. Do not implement the blocked slice of these — only the already-unblocked slice — without a new, explicit owner decision recorded in the proposal queue.

### Semantic AI filtering (PROP-025)
- Current state on `main` (verify with `git log origin/main --oneline` and `ls shared/` before relying on this — it may have changed): **not merged**. PR #3 ("PROP-025 slice 1: offline semantic-lens evaluator (flag off)") is open.
- Blocked on: privacy/exact-processing-model/cost/review-boundary decision (see PROPOSAL_WORK_QUEUE.md PROP-025 "Next step"). Deterministic keyword-based ranking (`shared/pipeline.ts`) remains the only filtering mechanism until that decision is made.
- Do not wire a real model call into feed filtering under this PROP without that decision being recorded as resolved in the queue.

### External alert delivery (PROP-026)
- Current state on `main`: **not merged**. PR #4 ("PROP-026: alert delivery contract, outbox, and test sink only") is open.
- Blocked on: user-selected delivery provider choice. Until resolved, mention alerts stay local-only summaries (no external provider notification completeness or delivery claims).
- The agent-doable slice (contract + outbox + test sink, no real provider) is explicitly separated from the owner-gated slice (an actual external provider integration) in the proposal text — keep that separation when building.

### Hosted multi-user edition (PROP-021–024)
- Current state on `main`: **not merged**. PR #2 ("PROP-021: Hosted Multi-User Edition architecture proposal (docs only)") is open.
- PROP-021 is docs-only (architecture/migration plan). PROP-022–024 (identity/tenancy, transactional storage/secrets, hosted ops) are explicitly conditional on PROP-021 and on the owner choosing a hosting provider/distribution — per CLAUDE.md's "Boundaries" section, this build has no hosted auth, tenant DB, or multi-user support, and must not be deployed as a public/multi-user service.
- Do not add authentication, a tenant database, or server-side plan enforcement speculatively; that only happens after PROP-021 is accepted and PROP-022+ decisions are made.

## Before scoping new work in these three areas

1. Re-check `docs/readable/PROPOSAL_WORK_QUEUE.md` for the PROP's current disposition line — it is the source of truth, this skill is a snapshot.
2. If the disposition still says "Waiting for input" / "conditional scope", scope only the already-unblocked slice (if any) and say explicitly in your plan which parts are owner-gated and excluded.
3. See `docs/design/BUILD-PROMPTING-DIGEST.md` for example prompts scoped correctly to the next agent-doable slice in each of these three tracks.
