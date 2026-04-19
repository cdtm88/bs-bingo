---
phase: 08-add-logos-to-the-bullshit-versions-home-page-win-page-and-lo
plan: "02"
subsystem: copy
tags:
  - copy
  - nsfw
  - theme
  - tdd
dependency_graph:
  requires: []
  provides:
    - 11 new Proxy-accessible copy keys (winnerCallout, nonWinnerConsolation, playAgainHostNote, winLineSuffixWinner, winLineSuffixNonWinner, joinCodeLabel, joinCodePlaceholder, orDivider, joinModalNameHelper, roomNotFoundError, genericError)
    - 2 sharpened NSFW values (addWordButton, wordPoolEmptyHeading)
  affects:
    - Plans 03 and 04 (downstream string migrations that consume these keys)
tech_stack:
  added: []
  patterns:
    - TDD RED/GREEN on copy module (test-first, then implement)
    - Symmetric sfw/nsfw STRINGS bundles; CopyKey type derived from sfw
key_files:
  created: []
  modified:
    - src/lib/copy.ts
    - tests/unit/copy.test.ts
    - vitest.config.ts
decisions:
  - Used TDD: wrote 28 failing tests first, then implemented all new keys
  - Updated stale Phase 7 test assertions (addWordButton, wordPoolEmptyHeading) to match sharpened values — these were correctly stale, not regressions
  - Fixed vitest.config.ts: added environmentOptions.jsdom.url to provide localStorage in jsdom; setup.ts polyfill added by parallel 08-01 agent resolves Node v25 --localstorage-file interference
metrics:
  duration: ~12 minutes
  completed: "2026-04-19"
  tasks_completed: 2
  files_modified: 3
---

# Phase 08 Plan 02: Extend copy.ts with 11 new keys + sharpen 2 NSFW values Summary

**One-liner:** 11 new sfw/nsfw-symmetric copy keys for EndScreen and join-flow migrations, plus two NSFW values sharpened from generic to voice-consistent ("Log it", "Pool's empty. Someone start.").

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| RED | Add failing tests (28 new assertions) | 2d23302 | tests/unit/copy.test.ts, vitest.config.ts |
| GREEN | Implement 11 new keys + 2 sharpened values | 104bc8d | src/lib/copy.ts, tests/unit/copy.test.ts |

## What Was Built

**src/lib/copy.ts** — Extended `STRINGS.sfw` and `STRINGS.nsfw` with 11 new keys:

End-screen keys (D-04/D-05/D-06/D-07):
- `winnerCallout` — "You called it." / "You clocked it."
- `winLineSuffixWinner` — "." / "." (neutral by design)
- `winLineSuffixNonWinner` — " completed." / ". And you missed it."
- `nonWinnerConsolation` — "Nice try. One more round?" / "You lost. The meeting continues."
- `playAgainHostNote` — description of what happens on play-again

Join-flow keys (D-10/D-11/D-12):
- `joinCodeLabel`, `joinCodePlaceholder`, `orDivider`
- `joinModalNameHelper`, `roomNotFoundError`, `genericError`

Sharpened NSFW values (D-08/D-09):
- `addWordButton`: "Add it" → "Log it"
- `wordPoolEmptyHeading`: "Nothing in the pool yet" → "Pool's empty. Someone start."

**tests/unit/copy.test.ts** — 28 new assertions added:
- 22 for new keys (sfw + nsfw pair per key)
- 2 for sharpened values
- 4 quality-ceiling regression guards (winHeadline, reconnectingBanner, playAgain, modalJoinSubmit)
- Total suite: 62 tests, all green

## Verification

- `npx vitest run tests/unit/copy.test.ts` — 62/62 passed
- `npx tsc --noEmit` — no errors on src/lib/copy.ts
- sfw/nsfw key symmetry: 42 keys each, zero asymmetry confirmed
- All 11 new keys present in both bundles (grep count = 2 each)
- Quality-ceiling NSFW values unchanged: CALLED IT!, Hanging on for dear life…, Back into the grinder, Pull up a chair

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] vitest.config.ts missing jsdom URL → localStorage unavailable**
- **Found during:** RED phase setup
- **Issue:** jsdom without a `url` option throws SecurityError on opaque origins; Node v25 `--localstorage-file` flag (injected by the shell environment) shadowed jsdom's localStorage with a reduced API (no `.clear()`), breaking all tests
- **Fix:** Added `environmentOptions.jsdom.url: "http://localhost/"` to vitest.config.ts; setup.ts polyfill (created by parallel 08-01 agent) handles residual Node v25 interference
- **Files modified:** vitest.config.ts
- **Commit:** 2d23302

**2. [Rule 1 - Bug] Stale Phase 7 test assertions for sharpened NSFW values**
- **Found during:** GREEN phase (first run after implementing sharpened values)
- **Issue:** Phase 7 tests asserted `addWordButton = "Add it"` and `wordPoolEmptyHeading = "Nothing in the pool yet"` — both now sharpened per D-08/D-09 spec
- **Fix:** Updated both test assertions to the new values; these were correctly stale (the sharpening is intentional per plan)
- **Files modified:** tests/unit/copy.test.ts
- **Commit:** 104bc8d

## Known Stubs

None — all new keys have real string values in both sfw and nsfw bundles. No placeholder text, no empty values, no TODO strings.

## Threat Flags

None — copy.ts is a static string table. All new strings are plain text with no HTML markup; no new network endpoints, auth paths, or schema changes introduced.

## Self-Check: PASSED

- src/lib/copy.ts — FOUND
- tests/unit/copy.test.ts — FOUND
- 08-02-SUMMARY.md — FOUND
- commit 2d23302 (RED) — FOUND
- commit 104bc8d (GREEN) — FOUND
