# Design system pointer (hub-pending)

**Status:** Pointer only · **Hub:** drafted, not yet published · **Owner:** OpenTechnology14

The design-system hub referenced below — `hybrid-creator-platform/design-system/` — does
not exist in that repository yet. It has been described as "still drafted," meaning
planned, not yet present. This document records the paths MyFeed would consume from it
once it is published. Every path in this file is a forward reference; none of them
resolve today. Nothing here grants MyFeed any dependency on, or import from, that
repository now. MyFeed's sources are independent (root `CLAUDE.md`), and this pointer
does not change that — it only states what *would* be inherited if and when the hub
lands, and what MyFeed defines locally until then.

## What MyFeed has today

MyFeed defines its own color, typography, and spacing values locally in
`src/styles.css` — for example `--bg`, `--card`, `--fg`, `--muted`, `--border`,
`--primary`, `--accent`, `--sidebar`, `--secondary`, and `--shadow` as CSS custom
properties on `:root`, plus the `DM Sans` font import and base element rules (buttons,
inputs, focus states). These are hand-authored and self-contained; nothing in MyFeed
currently reads from or references an external design-system package.

## Future pointers

These paths are forward references into the not-yet-published hub. They are listed for
when the hub is published, not as current dependencies.

- **`design-system/tokens.yaml`** (future) — color, typography, spacing, radii, and
  shadow tokens. If published and adopted, MyFeed's `src/styles.css` custom properties
  (`--bg`, `--card`, `--fg`, `--muted`, `--border`, `--primary`, `--accent`, `--sidebar`,
  `--secondary`, `--shadow`, font family) would be the candidates for replacement with
  values sourced from this file, rather than being hand-maintained in `src/styles.css`
  itself. Until the hub exists, these values stay local and hand-maintained.
- **`design-system/components.md`** (future) — component-level rules (buttons, inputs,
  cards, etc.). If published, MyFeed's local component styling in `src/styles.css` and
  `src/components/` would be checked against it for consistency; no such check exists
  today because there is nothing yet to check against.
- **`design-system/voice-and-tone.md`** (future) — voice and tone guidance. MyFeed
  inherits the OpenTechnology family register in the meantime: deep, warm, measured,
  narrative. One rule from that register is treated as a hard constraint, not a style
  suggestion: **do not name celebrities.** This applies to all MyFeed-authored copy
  (UI text, generated digests, documentation) regardless of whether the hub's
  voice-and-tone file has been published yet.

## Local overrides

No local overrides at this time.

## Proposal template

Future proposals that need visual/UX design artifacts should start from
[`docs/design/proposals/TEMPLATE.md`](proposals/TEMPLATE.md). It links back to the
canonical proposal queue (`docs/readable/PROPOSAL_WORK_QUEUE.md`) and leaves room to
reference hub tokens/components once the hub exists.
