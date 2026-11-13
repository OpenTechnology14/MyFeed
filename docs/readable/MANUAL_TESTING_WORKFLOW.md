# Manual UI testing workflow

MyFeed has automated Playwright UI workflows in `tests/e2e/`, plus this manual layer for an operator or an agent driving the browser. Adapted from OpenTechnologyApp's `docs/readable/MANUAL_TESTING_WORKFLOW.md` and generated click tree, inspected 2026-10-12. Only the testing pattern was reused; no infrastructure, live data, accounts or credentials were imported.

Use the [generated click checklist](../agent-registries/CLICK_TREE_MANUAL_CHECKLIST.md) with stable CLICK IDs, [click matrix](CLICK_MATRIX.md), and [verification matrix](VERIFICATION_MATRIX.md). The checklist covers interaction groups, including proposed/unsupported and CLI rows; it does not claim every DOM element is instrumented. `docs:generate` rebuilds it and `docs:check` catches drift. Execution results belong in [MANUAL_TEST_RESULTS.md](MANUAL_TEST_RESULTS.md) and [IMPLEMENTATION.md](IMPLEMENTATION.md), not in the generated checklist.

## Start a disposable real-backend session

1. Stop the normal app with `npm run local -- stop`; stop any other development server too. Do not kill an unidentified process.
2. Run `npm run test:manual`. The launcher refuses occupied ports, creates a restricted `myfeed-e2e-manual-*` temporary directory and unique session, and boots the real local API and Vite on 3188/5188. It prints the browser URL only after the proxied API returns the matching marker. Vite attaches that session header to every API request; a normal API rejects those marked requests before handlers. No API guard is disabled.
3. Open the printed `http://127.0.0.1:5188/` in a browser. Start with one empty starter feed. Add **Sample library Example** through the UI. This is fictional upstream content persisted by the real API, not an intercepted/mock local backend. Use fixture names prefixed `Manual QA`.
4. Use only fictional content. Never enter a real token or perform a paid generation/provider Send in this session. Preview Simulate send is separate, temporary fictional evidence. Real integration verification follows the account procedure in the verification matrix.
5. Run the sequences below, observe the UI after each action, and reload after saves. Record actual outcomes and errors, not just HTTP success. Inspect sanitized counts/IDs in the temporary store when persistence is ambiguous; do not log credentials or private content.
6. Stop with Ctrl+C (or SIGTERM to the launcher). Both servers drain/close, and the launcher compares normal `data/store.json`/`secret.key` fingerprints. It retains the named temporary store for diagnosis. Close the test tab before returning ports to the normal app. After automated E2E too, restore the user preview with `npm run local -- start`.

## Click sequences, in priority order

| Scenario | Click sequence | Expected observation | CLICK IDs |
| --- | --- | --- | --- |
| M01 Starter/setup | Open root → Email Newsletters shortcut → inspect hostname → Close → Connect your first source → Sample library Example → Add connection → Linked feeds → My starter feed → Feed view | Provider preselection; labeled sample; mixed content appears only after linking | 001, 006–008, 012 |
| M02 Reading/state | Save an article → open its preview → inspect full text/reason → Close → Saved → reload → Unsave; mark a post read/unread → Unread | Save/read changes persist; unread removes read item; dialogs close | 003, 014, 017–018, 020 |
| M03 Search/conversation | Search feed → type a sample phrase → Show results → Clear search; Open conversation → Save message → mark read → Unread → Back to feed | Eligible results; chronological collected messages; no excluded context restoration | 013, 021–022 |
| M04 Lens/saved/originals | Save article → Customize filters → Mute keywords `open web, fediverse` → Save customization → Filter results → Feed view → Saved; inspect connection Post log | Exclusion has a reason; saved excluded item accessible; original retained | 003–004, 017, 023–026 |
| M05 Local edits | Reader or Post log → Edit local copy → change title/body → Save → reload → Show original → Reset local edits → confirm; edit then Cancel/discard | Local override persists; original unchanged; reset and discard work; saved/read preserved | 044–046 |
| M06 Connections | Connections → Check connection → Edit connection → Save → reload; toggle background on/off; pause/resume; inspect Activity/Post log; Remove connection → Keep it | Health/count visible; name/config persists; background/pause state persists; removal cancel retains items | 009–010, 023–024, 047–048 |
| M07 Feed lifecycle/limits | Create a feed → Cancel; create `Manual QA second` → link existing sample → switch feed/mode → reload; repeat to five feeds → attempt sixth | Correct selected feed; shared connection; canceled form makes no feed; limit visible | 001–004, 027–028 |
| M08 Profile/settings | Open profile → change display name → Save changes → reload; Open settings → expand My workspace; toggle theme twice; Help → Escape | Local saves persist; workspace expands; theme changes; dialog closes | 006, 029–035 |
| M09 Alerts/reading style | Connections → Local alerts → Configure selected feed → enable and set explicit handle → Save → Feed view → Alerts; configure word limit/media/font/spacing/width → save | Local excerpts and eligible mentions; per-feed preview style; originals retained | 036–043, 050–053 |
| M10 Preview/AI/write boundaries | Open all five `/preview/` pages; temporary edit → reload; preview writing draft → review → Simulate send; inspect AI configuration/review and cancel | Preview resets; no workspace API effects; no paid call or live send | 054, 057, 061–065 |
| M11 Mobile/keyboard | At 390×844 and 320×844, Menu → select feed → search/close → profile/settings; Tab through dialog, Escape; inspect overflow | Left drawer; navigation closes it; visible/tappable controls; no horizontal overflow | 005–006, 013, 029–035 |

A sequence tests only its named substeps. Do not mark an entire CLICK group passed if other controls/error states were omitted. Browser reload establishes reload persistence; it does not establish process-restart persistence. Destructive confirmation/limits/error/race/provider cases remain separately named assertions in automated tests or a specifically executed manual scenario.

## Evidence and defects

Record date/commit, browser/viewport, temporary directory/session, scenario and CLICK IDs, exact steps and expected/observed outcome, PASS/FAIL/BLOCKED/NOT RUN, evidence class, sanitized screenshots/log locations, normal fingerprint comparison, and teardown/preview restoration. Screenshots and browser artifacts stay in ignored `test-results/`; only fictional screenshots may be retained. For a defect, write a reproduction before fixing, route missing scope through the existing [proposal queue](PROPOSAL_WORK_QUEUE.md), and repeat the failing click sequence after the fix. Avoid creating a second priority queue.

Automated checks remain `npm run verify` and `npm run test:e2e`. Manual observation supplements those checks. Local sample clicks, mocked provider responses, live provider evidence, and human layout approval are separate claims.
