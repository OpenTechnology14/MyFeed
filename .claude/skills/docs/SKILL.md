---
name: docs
description: Use when adding, updating, or reorganizing MyFeed documentation under docs/readable/, docs/agent-registries/, AGENTS.md, or the proposal queue — e.g. after a feature change that affects a readable doc, or when asked to add/update a PROP item. Clarifies which docs are generated (never hand-edit) vs hand-maintained, and how to verify sync.
---

# MyFeed documentation conventions

## `docs/readable/` — hand-maintained human-readable docs

Current files (verify with `ls docs/readable/` before relying on this list — it changes):
`API_AUDIT_MATRIX.md`, `ARCHITECTURE.md`, `CLICK_MATRIX.md`, `CONNECTION_MATRIX.md`, `CUSTOMIZATION_LIST.md`, `DATA_MATRIX.md` (generated — see below), `FEATURE_LIST.md`, `FEATURE_MATRIX.md`, `FULL_APPLICATION_AUDIT_MATRIX.md`, `IMPLEMENTATION.md`, `INTEGRATIONS.md`, `MANUAL_TESTING_WORKFLOW.md`, `MANUAL_TEST_RESULTS.md`, `PRODUCT.md`, `PROPOSAL_DASHBOARD.md`, `PROPOSAL_WORK_QUEUE.md`, plus `proposal-dashboard.html` / `proposal-dashboard-snapshot.json`.

Each owns a distinct concern (see CLAUDE.md's "Architecture" section for the authoritative one-line description of each). Keep them synchronized with the code they document — `scripts/generate-docs.ts`'s `DOC_UPDATE_MATRIX` output (`docs/agent-registries/DOC_UPDATE_MATRIX.md`) lists which source files map to which readable doc; check that matrix when deciding what else to update alongside a code change.

## `docs/readable/PROPOSAL_WORK_QUEUE.md` — canonical proposal queue

- Every proposal has a stable `PROP-NNN` ID, explicit dependencies, scope, and acceptance criteria. Never reuse or renumber an ID.
- Keep **proposed** work distinct from **implemented** work: a PROP entry states its disposition (e.g. "Waiting for input / conditional scope", "Implemented ...", "Owner: ..."). Don't describe a conditional/blocked PROP as implemented, and don't implement a conditional PROP's blocked slice without an explicit owner decision — see the `design` skill for the three big conditional tracks (semantic AI filtering, external alert delivery, hosted multi-user).
- When you ship a slice of a PROP, update its disposition line with the date and what was actually built, not just restate the proposal text.

## Generated docs — never hand-edit

`npm run docs:generate` (= `tsx scripts/generate-docs.ts`) produces, and `npm run docs:check` (`--check` mode) verifies byte-for-byte:
- `AGENTS.md` (repo root) — generated verbatim from `CLAUDE.md` with a generated-file header prepended.
- `docs/agent-registries/API_ROUTE_REFERENCE.md` — generated from `server/routes.ts`.
- `docs/agent-registries/DOC_UPDATE_MATRIX.md` — generated from the source/doc pairs listed inside `scripts/generate-docs.ts`.
- `docs/agent-registries/README.md` — generated index of the above.
- `docs/readable/DATA_MATRIX.md` — generated from `scripts/data-matrix.ts` + `shared/model.ts`.
- `docs/agent-registries/CLICK_TREE_MANUAL_CHECKLIST.md` — generated from `docs/readable/CLICK_MATRIX.md` + `scripts/click-checklist.ts`.

If you need `AGENTS.md` to say something new, edit `CLAUDE.md` (its hand-maintained source) and regenerate — never edit `AGENTS.md` directly. Same pattern for the other generated files: edit their declared source, then run `npm run docs:generate`. Always finish a docs change with `npm run docs:generate && npm run docs:check` to confirm the generator and the checked-in output agree.

## Cross-link checker — not yet available

A `docs:check-links` script backed by `scripts/check-docs-cross-links.ts` was proposed in PR #8 ("Backlog #4: docs cross-link consistency checker"). As of this writing that PR is **open, not merged** — the script and npm alias do not exist on `main`. Confirm with `ls scripts/ | grep cross-link` and `grep docs:check-links package.json` before referencing or relying on this tool; if it has since merged, use `npm run docs:check-links` to find dead intra-doc links before finishing a docs PR.
