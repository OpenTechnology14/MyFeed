# PROP-021 — Hosted Multi-User Edition

**Status:** Conditional / decision pending. This expands the PROP-021 entry in
[PROPOSAL_WORK_QUEUE.md](../readable/PROPOSAL_WORK_QUEUE.md#prop-021) ("Hosted edition scope").
It does not replace that entry's PROP ID, dependencies, or acceptance criteria — it is the
detailed architecture discussion the queue item points to before PROP-022 can start.

**Type:** Decision / specification document. **No code changes accompany this document.**

**Depends on:** PROP-013 (local launch/updates) per the queue. **Blocks:** PROP-022 (hosted
identity), PROP-023 (hosted data and secrets), PROP-024 (hosted operations) — all three remain
conditional and unscoped until the open questions below are answered by the owner.

---

## Open questions (owner decisions required — nothing below is decided)

| # | Question | Why it can't be inferred | Resolves into |
| - | --- | --- | --- |
| 1 | Which tenancy model? (shared schema / schema-per-tenant / project-per-tenant) | Cost, isolation guarantees, and migration effort differ sharply; current codebase has zero tenancy concept to extrapolate from | PROP-022/023 storage design |
| 2 | Which identity provider? (Supabase Auth / Auth0 / self-hosted (Lucia or custom) / Clerk) | Depends on whether a self-hostable distribution is still required, budget, and how much custom session/CSRF work the owner wants to own | PROP-022 identity implementation |
| 3 | Which distribution model? (pure SaaS / self-hostable only / both) | Directly changes the previous two answers — a self-hostable requirement rules out some identity providers and favors lighter-weight tenancy models | Overall hosted architecture shape |
| 4 | Plan/pricing tiers, if any | No pricing model exists today; out of scope for this architecture doc but affects plan-limit enforcement in PROP-023 | PROP-023 |
| 5 | Target hosting provider/region | Not evaluated here; affects latency, data residency, and operational cost | PROP-024 |

Until an owner answers questions 1–3, this document presents options and tradeoffs only. Any
code that assumes an answer (e.g., a specific auth SDK import) is out of scope for PROP-021 and
belongs to PROP-022 at the earliest.

---

## Current state (baseline this proposal compares against)

Per the root `CLAUDE.md` Boundaries section:

- **No authentication or tenant database exists.** The app is explicitly single-user.
- API listens on loopback only (`127.0.0.1:3188`), Vite dev server on `127.0.0.1:5188`.
- `server/store.ts` is atomic **file persistence** under a local `data/` directory — not a
  transactional database. Credentials inside it are AES-256-GCM encrypted at rest; everything
  else is plaintext JSON on disk.
- There is no CSRF protection beyond Host/Origin header checks suited to a single local user,
  no session concept, no per-request ownership model, and no durable job queue.
- The explicit statement in `CLAUDE.md`: *"A hosted edition needs authentication, tenant
  isolation, server-side plan enforcement, CSRF protections, encrypted managed secrets, and a
  durable queue before exposure."* This proposal is the architecture discussion for exactly that
  list — it does not shortcut it.

Any hosted design below must assume it is starting from **zero** multi-tenant infrastructure,
not retrofitting partial tenancy.

---

## Tenancy models

Evaluated against the current single-user file-store architecture (`server/store.ts`, `data/`
directory, no transactional DB today).

| Model | Description | Pros | Cons (against this codebase specifically) |
| --- | --- | --- | --- |
| **Shared schema** (one DB, `tenant_id` column on every table/row) | All tenants share one database and schema; every query filters by `tenant_id` | Cheapest to operate at scale; single migration path; easiest to add read replicas/analytics across tenants | Requires rewriting `server/store.ts` from file-based persistence to a real relational/document store from scratch — every existing read/write path needs a `tenant_id` filter added, and a single missed filter is a cross-tenant data leak (this is the #1 real-world cause of multi-tenant breaches). Highest discipline requirement for the smallest codebase (no existing query layer to retrofit this into — it would be built new) |
| **Schema-per-tenant** (one DB, one schema per tenant) | Each tenant gets its own schema/namespace inside a shared database instance | Strong logical isolation without one database per tenant; easier "export this tenant's schema" backups, which maps naturally onto this app's existing per-user backup/restore feature (PROP-006, `server/backup.ts`) | Migrations must run against every tenant schema (N migrations per release instead of 1); connection pooling and schema-switching add operational complexity disproportionate to a small/early user base; most hosting platforms for Postgres don't make this cheap to automate at low tenant counts |
| **Project-per-tenant** (fully separate database/project per tenant, closest to "one copy of the local app per tenant, hosted") | Each tenant effectively gets their own isolated deployment/database, provisioned on signup | Maximizes isolation; closest conceptual match to the current architecture, where each user's `data/` directory is already fully independent — this is the smallest conceptual leap from "local single-user file store" to "hosted" | Does not scale operationally past a modest tenant count without heavy automation (provisioning, monitoring, upgrading N independent databases); defeats most of the cost benefit of "hosted" multi-tenancy in the first place; still needs a provisioning/identity layer to route a signed-in user to their project |

**Observation, not a recommendation:** project-per-tenant is the smallest architectural delta
from today's per-user `data/` directory model, but it inherits the current file-store's
limitations at hosted scale (no real transactional guarantees under concurrent access) unless
each tenant's store is itself upgraded to a real database — at which point the operational cost
of project-per-tenant compounds. The owner's choice here is a real tradeoff, not a default.

---

## Identity providers

Comparison assumes the distribution-model question (self-hostable vs. SaaS vs. both) is still
open — some providers are listed with a self-hosting caveat for exactly that reason.

| Provider | Cost model | Self-host friendliness | Notes relevant to this app |
| --- | --- | --- | --- |
| **Supabase Auth** | Free tier, then usage-based (MAUs); open-source | Fully self-hostable (it's an open-source Postgres + GoTrue stack) — compatible with a self-hostable distribution | Bundling it would also pull in Supabase's Postgres, which would answer the tenancy-storage question (likely shared-schema with RLS) as a side effect — a bundled decision the owner should make explicitly, not by default |
| **Auth0** | Free tier (limited MAUs), then per-MAU pricing that rises quickly past free tier | Not self-hostable (fully managed SaaS only, by Okta) | Rules out a self-hostable distribution entirely if chosen; appropriate only if the distribution decision is "pure SaaS" |
| **Self-hosted (Lucia or custom)** | No per-MAU cost; engineering time cost instead | Maximally self-hostable by definition — ships inside this app's own server like everything else today | Highest engineering/maintenance burden: session management, password reset flows, OAuth provider integrations, and CSRF protection must all be built and kept secure in-house. Lucia itself is a library, not a hosted service, so "self-hosted" here means "we own the auth code," which is a meaningfully different commitment than wiring up a managed provider |
| **Clerk** | Free tier, then per-MAU pricing (generally positioned as a more full-featured/pricier alternative to Auth0 for smaller teams) | Not self-hostable (managed SaaS only) | Same self-hosting constraint as Auth0; differentiator is more polished pre-built UI components for sign-in/sign-up, which matters less for this app's own custom reader UI |

**Framing, not a recommendation:** if the distribution answer includes "self-hostable," Auth0
and Clerk are eliminated by definition, leaving Supabase Auth or a self-built solution. If the
answer is "pure SaaS only," all four remain viable and the choice becomes cost/control tradeoffs
instead of a hosting-capability filter.

---

## Distribution scenarios

| Scenario | Tradeoffs given the current "no auth, no tenant DB, loopback-only" baseline |
| --- | --- |
| **Pure SaaS only** | Simplifies identity-provider choice (any managed provider works) and tenancy choice (shared schema becomes viable without worrying about export-for-self-host needs). Drops the self-hosted distribution that exists today — current users running the app locally on loopback would need a migration path to a hosted account, or the local edition would need to be maintained as a permanently separate build. |
| **Self-hostable only** | Preserves today's local-first value proposition and loopback-only security boundary as the *only* boundary that needs real review — operators running their own instance accept their own security posture. Rules out identity providers that aren't self-hostable (Auth0, Clerk). Still requires building real multi-tenancy if "self-hostable" means "one operator can host for multiple users" rather than "each user runs their own fully single-user instance" (which is just... the current app, unchanged). This scenario needs its own sub-decision: is "self-hostable multi-user" actually wanted, or is single-user-per-instance sufficient forever? |
| **Both (dual distribution)** | Maximizes flexibility for users but means maintaining two deployment targets indefinitely: the current loopback-only single-user build, and a hosted multi-tenant build with full auth/isolation/CSRF/secrets/queue infrastructure. Doubles the surface area for security review (per `CLAUDE.md`'s explicit list) and the ongoing maintenance cost of keeping both in sync as features land. This is the only scenario where the identity-provider choice must satisfy *both* a self-hosted operator and a managed SaaS deployment simultaneously, which narrows the provider list to self-hostable options (Supabase Auth or self-built) even if the SaaS side would otherwise prefer Auth0/Clerk. |

None of these scenarios can be partially started — per `CLAUDE.md`, the loopback-only binding,
absence of CSRF protection beyond Host/Origin checks, and absence of a tenant database are
today's correct security posture for a single-user local app. Choosing a distribution model is
the gating decision before any of PROP-022's authentication work can be scoped safely.

---

## Migration plan: current single-user state → multi-user

This is a sequence, not a commitment to any specific tenancy/identity/distribution answer above —
each phase's concrete implementation depends on those decisions, but the phase *order* holds
regardless of which options are chosen.

1. **Decide the three open questions** (tenancy model, identity provider, distribution model).
   Nothing past this point can be scoped concretely without these answers. This is the explicit
   purpose of PROP-021 and the reason PROP-022–024 remain blocked.
2. **Design the tenant data model.** Define what "a tenant" owns (feeds, connections, items,
   receipts, settings, AI generation history) and how `server/store.ts`'s current single-user
   file layout maps onto the chosen tenancy model — this likely means replacing file-based
   persistence with a transactional store entirely, per PROP-023's existing scope.
3. **Design identity and session lifecycle** against the chosen provider: sign-up/sign-in flow,
   session expiry/renewal, and how an authenticated session resolves to a tenant ID on every
   request. This is PROP-022's existing scope in the queue.
4. **Add tenant ownership and authorization checks to every existing API route** before any
   route is exposed beyond loopback — per-feed, per-connection, per-item, per-receipt, and
   per-AI-generation ownership checks, matching PROP-022's existing acceptance criteria
   ("isolated tenants cannot enumerate, read, mutate, generate from, or delete each other's
   data").
5. **Replace file persistence with transactional storage, encrypted managed secrets, and
   server-side plan enforcement.** This is PROP-023's existing scope — concurrent writes,
   quota checks, and credential handling must all move off the current single-process file
   model.
6. **Add a durable job queue and hosted operations.** Ingestion/generation work currently runs
   in-process (opt-in background worker in `server/app.ts`); a hosted multi-user edition needs
   per-tenant scheduling, retries, quotas, and cancellation, per PROP-024's existing scope.
7. **Build the migration path for existing local users**, if the distribution decision keeps a
   local edition alive: an explicit, user-initiated export (reusing the existing credential-free
   content export and encrypted backup formats from PROP-006) into a new hosted tenant, never an
   automatic or silent migration.
8. **Security review against the full list in `CLAUDE.md`'s Boundaries section** — authentication,
   tenant isolation, server-side plan enforcement, CSRF protections, encrypted managed secrets,
   and a durable queue — before any public exposure, matching PROP-024's existing acceptance
   criteria.

Steps 2–8 are not estimated here; they correspond to the existing XL-sized PROP-022/023/024 items
in the queue, which explicitly note they need to be "broken into concrete deliverables once the
edition is selected" (PROP-021's existing acceptance text). This document does not re-estimate
or re-scope those items — it only unblocks the decision they're waiting on.

---

## Closing statement

**No code in this proposal. Code slice begins at PROP-022, after the owner picks tenancy model +
identity provider + distribution model.**
