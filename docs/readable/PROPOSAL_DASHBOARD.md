# Proposal dashboard tracker

Owner requested the proposal visual and Testing option on 2026-10-12. This bounded documentation
follow-up is recorded in the [canonical queue](PROPOSAL_WORK_QUEUE.md#testing-and-proposal-visual).

**Note on this public release:** the browsable HTML dashboard and its editable source/snapshot
receipt that this tracker originally pointed to are not carried into this repository — they
embedded another internal project's proposal data alongside MyFeed's own, which doesn't belong
in a public release. The Work view counts below are MyFeed's own queue data and remain current;
regenerate a MyFeed-only dashboard artifact separately if that visual is wanted again.

| Work view | Items |
| --- | ---: |
| Testing — mainly acceptance | 11 |
| Testing — remaining features | 0 |
| Implemented locally | 16 |
| Conditional | 7 |
| Unsupported | 1 |
| Total | 35 |

The existing baseline remains 24 locally implemented/specified, 11 remaining. Work focus and
implementation status are independent: eight local implementations also need acceptance.
No live-provider proof, arrangement approval or optional-track completion was promoted.

Refresh after queue changes: re-read each PROP definition and the index; derive counts from
Work view, not from historical prose; preserve exact IDs, order and dependency gates. Run
`npm run docs:generate`, `npm run docs:check` and VERIFY-001's maintained Markdown link/ID/table
consistency checks. A visual does not establish execution evidence; use VERIFICATION_MATRIX.md
and IMPLEMENTATION.md for actual acceptance runs. Runtime AI model configuration remains
independent of agent choices.

- [x] Work view and next step on all 35 definitions, with unchanged IDs/order/statuses.
- [x] Testing option and subgroup choices, including empty remaining-feature group.
- [ ] Live IMAP/Rocket.Chat, paid AI, YouTube key/quota and user-submitted publishing acceptance.
- [ ] Final arrangement approval and remaining manual/clean-host acceptance.

Verification is recorded in [IMPLEMENTATION.md](IMPLEMENTATION.md). Account credentials and
provider content must never be included in the dashboard or its evidence.

## Testing and agent merge handoff

Testing is a work view for a built slice, owner review or named acceptance gate; it does not
close provider, paid-AI, publishing or layout-approval requirements. Substantial missing code
returns to Build; conditional hosted/provider tracks retain their admission conditions.

Include the README, canonical queue, this guide, and IMPLEMENTATION evidence in the
documentation merge. Generate/check docs and review local links, 35 unique stable IDs, and all
work-view counts. No MyFeed app, database, credential or provider changes belong to this
handoff.
