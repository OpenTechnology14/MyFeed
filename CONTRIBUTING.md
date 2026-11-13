# Contributing to MyFeed

Thanks for considering a contribution. This project follows the
[Contributor Covenant](CODE_OF_CONDUCT.md) — please read it before participating.

## Before you start

- For anything beyond a small fix, open an issue first to discuss the change. This project has
  a set of fairly specific product/security rules documented in `CLAUDE.md` (loopback-only
  networking, no credential logging, Connections-first configuration, etc.) — a quick discussion
  upfront saves rework.
- Security issues go through [SECURITY.md](SECURITY.md)'s private reporting flow, never a public
  issue or PR.

## Development setup

```bash
npm install
npm run dev        # starts the API (127.0.0.1:3188) and Vite (127.0.0.1:5188)
```

## Checks before opening a PR

```bash
npm run verify      # build + unit tests + generated-docs check
npm run test:e2e    # Playwright end-to-end tests
```

Both must pass. If your change touches `CLAUDE.md`, run `npm run docs:generate` afterward —
`AGENTS.md` and the files under `docs/agent-registries/` are generated from it and should never
be hand-edited directly.

## Pull requests

- Keep unrelated changes in separate PRs.
- Describe what changed and why; link any relevant issue.
- New server/shared code should respect the boundaries in `CLAUDE.md` (loopback binding,
  encrypted credentials, no logging of credentials/response bodies/mailbox content, safe URL
  schemes only, no `dangerouslySetInnerHTML` for remote content).

## Code of Conduct

Participation in this project is governed by the [Contributor Covenant 2.1](CODE_OF_CONDUCT.md).
