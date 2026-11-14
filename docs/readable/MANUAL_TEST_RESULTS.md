# Manual UI test results

Results are dated execution evidence for the [manual workflow](MANUAL_TESTING_WORKFLOW.md). The generated checklist is an inventory, not a passing result. Record only actions actually exercised; distinguish partial CLICK groups and unavailable provider cases.

## 2026-10-12 — isolated real local backend

Source: working tree based on `ec535c6`. Browsers: Codex in-app browser (1280×720 viewport) and Chrome. UI operations used the computer-use browser controls, with fresh UI observations; source creation, linking and edits were performed through the visible UI, not substituted API writes. The API and on-disk persistence were real; the sole upstream connection was the labeled fictional Sample library. No provider credentials, paid AI, remote message or other app's data was used.

Session: `582211bd-a306-4cee-bfa2-0ce75c3dc8df`. Temporary fixture: `/var/folders/lc/kz1y1w9x1bv9x65gjhrxc0p40000gn/T/myfeed-e2e-manual-Jcuw4s`. Two feeds, one shared sample connection and 13 originals were retained for diagnosis. Browser storage holds transient reading controls; reload deliberately resets Saved/Unread lenses while item save/read state persists.

| Scenario / status | Actual clicks and observed result | Scope limits |
| --- | --- | --- |
| M01 PASS | Root had one empty starter feed. Email shortcut opened IMAP fields; Close returned. Connect first source → Sample library → Add collected 13 items. Linking starter then Feed view showed posts, two conversations and six article previews. | No live provider setup |
| M02 PASS, named substeps | Saved an article, opened full collected text/reason, closed and selected Saved. Reload retained Unsave and Mark unread controls. Unread hid that read article. | Unsave and ordinary social-post read toggle were not manually exercised |
| M03 PASS | Opened three-message thread; saved Maya's message, marked Sam's read, selected Unread; two eligible messages remained. Returned, searched `lose the noise`, Show results produced exactly one matching message/conversation; Clear restored the timeline. | Additional search error/empty cases not run manually |
| M04 PASS | Saved customization with `open web, fediverse` muted. Filter results showed 9 included / 13 collected and explicit muted-keyword reasons. Article absent in ordinary reader, accessible via Saved. Expanded source Post log retained originals. | No provider ingestion race or large-history paging |
| M05 PASS, named substeps; discard BLOCKED manually | Edited saved excluded article's local title/body, saved, reloaded and saw the persisted copy/editor. Show original displayed collected text. Reset → Keep local edits canceled reset; Reset → Confirm restored original. | Cancel with an unsaved title opened the native confirmation and blocked browser control. Mac was reported locked; both in-app and Chrome dialog-control attempts failed. Unlock/dismiss requested. The later automated preview check passed both dismiss and accept branches and reopening the unchanged title; it does not turn this manual step into PASS. |
| M06 PASS, named substeps | Check connection reported 13 available and no collection/change. Renamed to `Manual QA sample`; name persisted. Background on survived reload, then off. Pause survived reload with refresh/check disabled and 13 items retained; resumed. Remove → Keep it retained source; Activity showed 13 fetched / 13 new / 0 errors. | Actual source deletion, older collection and error/race cases not manually run |
| M07 PASS, named substeps | Cancel creation left one feed. Created `Manual QA second`, linked the existing sample, switched to Feed view and reloaded; correct feed and original article appeared. | Five-feed/sixth-feed boundary checked in Playwright, not manually |
| M08–M11 NOT RUN manually | Remaining profile/settings, alert/style, preview/AI/write and mobile/keyboard sequences stopped behind the native prompt. | Related workflows passed in the automated suite; no claim of manual completion or live provider proof |

Artifacts: ignored `test-results/manual-ui/connections.jpg` (fictional manual connection-page capture); automated desktop/mobile screenshots and failure artifacts under `test-results/`. Screenshot paths are local evidence, not checked-in images. The manual screenshot was retained after Playwright's output-directory cleanup.

Isolation: launcher refused an occupied normal API port before opening any test workspace (EXPECTED DENY). Initial manual startup exposed Vite's transient unmarked HTTP 500; corrected launcher startup to verify the direct marked API before starting/validating Vite. A later E2E startup encountered the same race and exited before any workflow; guard now retries an unmarked startup 500 and still refuses normal/mismatched success, normal denial, and marked HTTP 500 API failures. Three regression tests cover those distinctions.

Teardown: Ctrl+C closed both manual servers; launcher reported unchanged normal store/key fingerprints and retained the temporary fixture. Normal `data/store.json` and `data/secret.key` SHA-256 were also unchanged through the full automated suite. Native-prompt test tabs are temporary and unmarked; they are not user-preview deliverables. No destructive action was performed against the normal workspace.

Automated validation and preview restoration are recorded below and in [IMPLEMENTATION.md](IMPLEMENTATION.md).

Final gates: `npm run verify` PASS (production build/type check, **111 tests in 16 files**, generated docs synchronized); `npm run test:e2e` PASS (**18 isolated workflows**, including native discard prompt keep/discard assertions). `git diff --check` PASS. Initial startup failures above were corrected before the passing runs.

Final launcher smoke: a fresh session `14a31535-6860-46e5-a3c6-09e1c477dc37` started cleanly after the direct-API-first fix, with fixture `/var/folders/lc/kz1y1w9x1bv9x65gjhrxc0p40000gn/T/myfeed-e2e-manual-lC5sBn`. Unmarked direct API returned 403; unmarked browser-side proxy request returned 200 with the exact run marker. Ctrl+C closed both servers and reported unchanged normal fingerprints. This was a read-only startup/guard smoke, not another manual click run.

User preview restored with `npm run local -- start` at `http://127.0.0.1:3188`. Normal store/key fingerprints remained unchanged across the manual, automated and smoke runs. Remaining manual steps require the locked Mac/native confirmation to be cleared; their status is still NOT RUN/BLOCKED, independently of automated results.
