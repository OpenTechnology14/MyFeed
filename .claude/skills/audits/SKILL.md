---
name: audits
description: Use when running MyFeed's check/audit tooling (verify, lint, dead-export, docs/route drift) or triaging a scope-audit's findings into a PR. Covers which checks actually exist on main today vs are proposed in open PRs, and how to split audit findings into agent-doable-now vs owner-decision-gated.
---

# MyFeed audit tooling and triage

## Checks that exist on `main` today

Verify against `package.json`'s `scripts` block before trusting this — several checks below were proposed in still-open PRs as of this writing (confirmed via `gh pr list --state all` and `git log origin/main`):

- `npm run verify` → `build && test && docs:check` (tsc + vite build, vitest, generated-docs sync check). This is the baseline check to run after any code change.
- `npm run test:e2e` → Playwright, for reader/setup/settings changes.
- `npm run docs:generate` / `npm run docs:check` → regenerate / verify generated docs (see the `docs` skill).
- `npm run format:check` → prettier check (added in PR #10, merged).
- `npm run test:manual` → guarded disposable-workspace manual click testing.
- `npm run backup` / `npm run local` → operational scripts, not audit checks.

## Checks proposed but NOT yet on `main` (verify before use)

As of this writing these PRs are open, not merged — their scripts/aliases do not exist yet:
- `npm run docs:check-links` (`scripts/check-docs-cross-links.ts`) — PR #8, "Backlog #4: docs cross-link consistency checker".
- `npm run routes:check` (`scripts/check-routes-drift.ts`) — PR #5, "Backlog #7: add server/routes.ts drift checker".
- `npm run lint` and `npm run knip` (ESLint config + dead-export detection) — PR #7, "Backlog #2 / #9: ESLint config and dead-export (knip) tooling".

Before writing instructions, a plan, or code that assumes any of the three above exist, run `ls scripts/`, `grep -E "lint|knip|routes:check|docs:check-links" package.json`, and `gh pr list --state all` to confirm current merge status — do not assume last-known state is still accurate.

## PR audit triage pattern

This repo's merged history (PR #10 "infra hygiene", PR #11 "tests + hygiene") shows the triage pattern to follow when reviewing a batch of audit/scope findings:

1. **Bucket findings by whether they need a decision only the owner can make.** Anything that changes product scope, adds a provider/credential, or touches one of the three conditional tracks (semantic AI filtering, external alert delivery, hosted multi-user — see the `design` skill) is owner-decision-gated. Everything else (test coverage gaps, dead code, missing comments on empty catches, CI/infra hygiene, extracting a function for testability) is agent-doable now.
2. **Batch same-tier findings into one PR with a clear enumerated summary** (see PR #11's body: three numbered items, each with what changed and why) rather than one PR per tiny finding.
2a. Keep each batch small enough that `npm run verify` and `npm run test:e2e` results can be reported concretely in the PR body as a checklist, not just claimed.
3. **Leave owner-decision-gated findings as PROP entries** in `docs/readable/PROPOSAL_WORK_QUEUE.md` with an explicit "Next step" / disposition line naming the decision needed, rather than opening a PR that implements a guess at the decision.
4. **Name the PR after the batch's theme**, not after an individual finding (e.g. "PR A (infra): CI workflow, .gitignore, format:check, README reorder").
