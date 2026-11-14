# Security Policy

## Reporting a Vulnerability

Please report security vulnerabilities through **GitHub's private vulnerability reporting**
feature rather than a public issue:

1. Go to the [Security tab](../../security) of this repository.
2. Click **"Report a vulnerability"**.
3. Fill in as much detail as you can: affected version/commit, reproduction steps, and impact.

This creates a private advisory visible only to maintainers, so the report and any discussion
stay confidential until a fix is ready. Please do not open a public issue for a security
concern.

## Scope

MyFeed is a local, single-user application. The most relevant categories of concern are:

- Anything that could expose a user's stored credentials (connection secrets, AI provider keys)
  — these are encrypted at rest (AES-256-GCM) in `server/store.ts`.
- Anything that could bypass the loopback-only API binding (`127.0.0.1:3188`) or the Host/Origin
  checks that guard it.
- Supply-chain issues in dependencies (also reportable via Dependabot alerts on this repo).

There is no hosted/multi-user deployment of MyFeed today — see the Boundaries section of
`CLAUDE.md` for what a hosted edition would additionally require before it could be exposed to
the public internet.

## Response

We aim to acknowledge reports within a reasonable timeframe and will keep the reporter updated
as a fix is developed. Coordinated disclosure is appreciated.
