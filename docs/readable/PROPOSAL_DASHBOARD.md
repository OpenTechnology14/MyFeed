# Proposal dashboard tracker

Owner requested the proposal visual and Testing option on 2026-10-12. This bounded documentation
follow-up is recorded in the [canonical queue](PROPOSAL_WORK_QUEUE.md#testing-and-proposal-visual).
Assignment: `gpt-6.1-sol` / `high` — queue integrity, source-based display and responsive checks.

[Open the proposal dashboard](proposal-dashboard.html). It can be opened locally without
the MyFeed server; this repository initially selects MyFeed.

The selector reads the queue's item definitions, Work view, Next step, dated status, order and
dependencies. It is a checked-in dated documentation snapshot. It does not edit the application, execute a
proposal, start an account check, send a message or make a paid request. Automatic regeneration and CI freshness checks remain separate implementation scope.

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
Work view, not from historical prose; preserve exact IDs, order and dependency gates. Refresh the [editable source](assets/proposal-dashboard-source.html),
[exported page](proposal-dashboard.html) and [source-hash/count receipt](proposal-dashboard-snapshot.json)
in both repositories, preserving their default project and canonical gates; reconcile this table.
Export through the Visualize renderer after updating embedded queue data. Run `npm run docs:generate`,
`npm run docs:check` and VERIFY-001's maintained Markdown link/ID/table consistency checks.
A visual does not establish execution evidence; use VERIFICATION_MATRIX.md and IMPLEMENTATION.md
for actual acceptance runs. Runtime AI model configuration remains independent of agent choices.

- [x] Work view and next step on all 35 definitions, with unchanged IDs/order/statuses.
- [x] Testing option and subgroup choices, including empty remaining-feature group.
- [x] Hybrid Platform / MyFeed selector with source-based proposal details.
- [x] Checked-in page, source and snapshot receipt, linked from README and canonical queue.
- [ ] Live IMAP/Rocket.Chat, paid AI, YouTube key/quota and user-submitted publishing acceptance.
- [ ] Final arrangement approval and remaining manual/clean-host acceptance.

Verification is recorded in [IMPLEMENTATION.md](IMPLEMENTATION.md). Account credentials and
provider content must never be included in the dashboard or its evidence.

## Testing and agent merge handoff

Testing is a work view for a built slice, owner review or named acceptance gate; it does not
close provider, paid-AI, publishing or layout-approval requirements. Substantial missing code
returns to Build; conditional hosted/provider tracks retain their admission conditions.
Prepare work request displays copyable text only. It does not message an agent or execute work.
The browser remembers presentation choices locally; opening the page fetches no workspace data.

Include the README, canonical queue, this guide, IMPLEMENTATION evidence, exported page and
editable source/receipt in the documentation merge. Generate/check docs and review local links,
35 unique stable IDs, all work-view counts and source hashes. Inspect both project views and
request preparation in the exported page, including empty filters and narrow layout. No MyFeed
app, database, credential or provider changes belong to this handoff.
