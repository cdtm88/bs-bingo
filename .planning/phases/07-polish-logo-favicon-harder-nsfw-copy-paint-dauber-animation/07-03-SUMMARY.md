---
phase: 07-polish-logo-favicon-harder-nsfw-copy-paint-dauber-animation
plan: 03
subsystem: ui
tags: [copy, nsfw, i18n, tone, svelte]

requires:
  - phase: 06-ui-overhaul
    provides: copy module (STRINGS.sfw / STRINGS.nsfw + theme reactivity)
provides:
  - Sharpened NSFW copy across all audit-flagged keys (no more near-copies of SFW)
  - Regression guards for quality-ceiling strings (CALLED IT!, Hanging on for dear life…, Start the chaos, etc.)
  - Expanded copy.test.ts coverage: 16 → 34 assertions
affects: [07-01-logo, 07-02-favicon, 07-04-dauber-animation, future-phases-with-new-copy]

tech-stack:
  added: []
  patterns:
    - Single-source-of-truth copy bundle (STRINGS.sfw/nsfw key-for-key parity)
    - Quality-ceiling regression tests (locks in landmark literals)

key-files:
  created: []
  modified:
    - src/lib/copy.ts (NSFW bundle + waitingForHost helper NSFW branch)
    - tests/unit/copy.test.ts (updated 1 assertion, added 18 new)

key-decisions:
  - "Favored specific meeting/corporate references ('hit unmute', 'performance review') over generic cynicism to match D-06 jaded-office-worker voice"
  - "Preserved all 15 quality-ceiling strings untouched per plan — they define the NSFW tone bar"
  - "Added regression guards for 3 landmark NSFW strings (createCta, emptyName, startGame) to prevent accidental tone drift"

patterns-established:
  - "Quality-ceiling regression guards: unit tests that lock in landmark copy to prevent future edits from weakening tone"

requirements-completed: []

duration: ~4min
completed: 2026-04-19
---

# Phase 07 Plan 03: NSFW Copy Sharpening Summary

**Rewrote 15 mild NSFW strings with sharper meeting/corporate cynicism (Slack message nobody asked for, hit unmute, performance review, Back into the grinder) while locking landmark strings behind regression guards.**

## Performance

- **Duration:** ~4 min
- **Started:** 2026-04-19T05:32:00Z (approx — worktree init)
- **Completed:** 2026-04-19T05:36:32Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments

- NSFW bundle now passes the D-06 voice bar across every audit-flagged key — no more near-copies of SFW (`maxChars`, `joinModalTitle`, `wordPoolEmptyHeading`, etc. are now distinctly jaded).
- `waitingForHost` interpolation helper NSFW branch updated to match the rewritten `waitingForHostLobby` ("hit unmute" reference is now consistent in lobby and host-waiting copy).
- Test coverage doubled: 16 → 34 assertions in `copy.test.ts`, including regression guards for quality-ceiling strings (CALLED IT!, Hanging on for dear life…, Start the chaos, Come on give us something, Start the suffering).
- Key-for-key parity between `STRINGS.sfw` and `STRINGS.nsfw` preserved — TypeScript `pnpm check` reports zero errors in `copy.ts`.

## Task Commits

1. **Task 1: Rewrite mild NSFW strings in copy.ts** — `75ea860` (feat)
2. **Task 2: Update copy.test.ts assertions + add coverage for rewritten NSFW keys** — `695389c` (test)

_Task 1 used `tdd="true"` but per the plan's action block, source was modified first and verified via `pnpm check` (type parity gate); Task 2 then aligned tests and behaviorally verified via `pnpm test:unit`._

## Files Created/Modified

- `src/lib/copy.ts` — rewrote 15 NSFW string values + NSFW branch of `waitingForHost()` helper
- `tests/unit/copy.test.ts` — added `waitingForHost` import, updated `homeTagline` literal, appended 18 new assertions (15 rewritten-key tests + 2 helper branch tests + 3 quality-ceiling regression guards)
- `.planning/phases/07-polish-logo-favicon-harder-nsfw-copy-paint-dauber-animation/deferred-items.md` — logged pre-existing TypeScript errors in `src/worker.ts` and `tests/unit/game-room.test.ts` (out of scope)

## Decisions Made

- None beyond the plan. All copy rewrites came from the plan's explicit action block; no tone interpretation needed.

## Deviations from Plan

None — plan executed exactly as written.

The plan's embedded `pnpm check` gate surfaced 30 pre-existing TypeScript errors in `src/worker.ts` and `tests/unit/game-room.test.ts`. Per the executor scope boundary rule, these are baseline failures not introduced by this plan's edits. Verified `copy.ts` / `copy.test.ts` themselves emit zero errors (parity gate passes). Logged the unrelated errors to `deferred-items.md` for a follow-up plan.

## Issues Encountered

- Worktree had no `node_modules` at start. Ran `pnpm install --prefer-offline` once to restore the toolchain before running `pnpm check` and `pnpm test:unit`. No impact on outputs.

## Verification

- `pnpm test:unit -- copy.test.ts` → **367/367 tests pass** (34 in copy.test.ts, all green).
- `pnpm check` → `copy.ts` and `copy.test.ts` emit zero errors; TypeScript confirms STRINGS.sfw/nsfw key-for-key parity.
- Acceptance grep checks (from both Task 1 and Task 2 plans): all pass (counts match plan expectations exactly).

## User Setup Required

None — copy changes are static literals; no external service configuration needed.

## Next Phase Readiness

- NSFW copy is now consistently "jaded office worker" voice across the full string bundle. Safe to share with testers for manual tone UAT.
- Regression guards are in place, so Phase 07-04 (dauber animation) or future copy-adjacent work cannot accidentally weaken the landmark strings.
- Pre-existing `src/worker.ts` TypeScript errors (logged in `deferred-items.md`) remain; recommend a separate cleanup plan — they are independent of all Phase 07 work.

## Self-Check: PASSED

Verified:
- `src/lib/copy.ts` modified and committed in `75ea860` — FOUND.
- `tests/unit/copy.test.ts` modified and committed in `695389c` — FOUND.
- Commit `75ea860` in git log — FOUND.
- Commit `695389c` in git log — FOUND.

---
*Phase: 07-polish-logo-favicon-harder-nsfw-copy-paint-dauber-animation*
*Completed: 2026-04-19*
