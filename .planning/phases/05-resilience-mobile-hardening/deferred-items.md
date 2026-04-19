# Phase 05 Deferred Items

## Pre-existing e2e Failures (out of scope for Plan 03)

### board-mark.spec.ts — 2 tests failing before Phase 5 changes

**Tests:**
- `Phase 3: marking a cell updates the acting player's own badge within 1s`
- `Phase 3: mark toggle — clicking a marked cell removes the mark`

**Root cause:** Both tests mark the first `button` cell on a 3×3 board (5 words + 4 blanks). With blank cells counting as pre-marked towards win lines, marking a single word cell can immediately complete a line and trigger a win. When the game transitions to `phase === "ended"`, the board unmounts and `li` elements with `mark-badge` no longer render — causing the `toHaveText("1")` assertion to fail.

**Evidence:** Failures reproduce on `git stash` (base commit `01e551f`) — confirmed pre-existing before Plan 03 work.

**Deferred to:** Post-Phase 5 cleanup. Fix requires either seeding enough words for a 4×4+ board in these tests (preventing 1-click wins), or re-ordering assertions to check before the win transition.
