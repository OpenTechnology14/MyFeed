---
name: code-creation
description: Use when writing or editing MyFeed server/shared/client TypeScript code (server/*.ts, shared/*.ts, src/**) — e.g. adding a route, a connector, a store field, or a React component. Encodes the loopback/security/persistence rules and the required verify/e2e checks so new code doesn't violate repo boundaries.
---

# MyFeed code creation rules

Source: root `CLAUDE.md` — "Architecture", "Boundaries", and "Checks and documentation" sections. Read that file in full before large changes; this skill is a distilled checklist, not a replacement.

## Network boundaries

- The API listens on `127.0.0.1:3188`; Vite dev server on `127.0.0.1:5188`. Never bind to `0.0.0.0` or a non-loopback interface.
- Every mutating route must enforce Host/Origin checks and accept JSON bodies only (no multipart/form posts for mutations).
- `server/network.ts` enforces HTTPS timeouts, response-size limits, redirect limits, and DNS-pinned public-address validation for any outbound fetch (connectors, API sources). New outbound calls must go through it, not raw `fetch`/`http`.
- Never add code that resolves or fetches a private/self-hosted network address — this is deliberately unsupported.

## Persistence and secrets

- `server/store.ts` uses atomic file writes (write-temp-then-rename) and AES-256-GCM for credential encryption. New persisted fields follow the same atomic-write path; never write partial state directly to `data/store.json`.
- Only credentials are encrypted; general content is plaintext in a restricted-permission data directory. Don't encrypt content fields, don't leave credential fields unencrypted.
- A corrupted or unknown-version store must fail visibly (throw/log clearly), never silently reset.
- Never log credentials, source response bodies, or mailbox message contents — not even at debug level.

## Client code

- Never use `dangerouslySetInnerHTML` for remote/source content. Render as plain text; keep filtering/alert explanations visible, not hidden in markup.
- Keep safe URL schemes only (http/https) when rendering links from source content.

## Testing

- Tests that touch storage must use isolated temp data directories (set `MYFEED_DATA_DIR` to a fresh dir), never the user's real workspace, and never real paid-provider credentials.
- Any Playwright/browser test must set a unique `MYFEED_E2E_SESSION` and use a named temporary store; `server/test-session.ts` rejects production/default-data sessions. Don't bypass this guard.

## Required checks after changes

- Run `npm run verify` after any server/shared/client code change. As of this writing `verify` runs `build` (tsc + vite build) → `test` (vitest) → `docs:check`. (Lint/knip/routes-drift checks are proposed in open PRs, not yet part of `verify` — check `package.json`'s `scripts.verify` before assuming otherwise.)
- Run `npm run test:e2e` for any change touching the reader, setup/connections flow, or settings.
- Before `test:e2e`, confirm ports 3188 and 5188 are free (`lsof -i :3188 -i :5188`); kill only stale processes you can confirm belong to this repo's dev/preview servers (matching the project path in the process command line), never an unrelated process using those ports.
