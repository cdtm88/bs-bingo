---
phase: 05-resilience-mobile-hardening
fixed_at: 2026-04-18T19:33:00Z
review_path: .planning/phases/05-resilience-mobile-hardening/05-REVIEW.md
iteration: 1
findings_in_scope: 5
fixed: 5
skipped: 0
status: all_fixed
---

# Phase 05: Code Review Fix Report

**Fixed at:** 2026-04-18T19:33:00Z
**Source review:** .planning/phases/05-resilience-mobile-hardening/05-REVIEW.md
**Iteration:** 1

**Summary:**
- Findings in scope: 5
- Fixed: 5
- Skipped: 0

## Fixed Issues

### WR-01: `onStart` unconditionally overwrites slot-expiry alarm when pending slots exist

**Files modified:** `party/game-room.ts`
**Commit:** 827b356
**Applied fix:** Replaced the `if (size === 0)` guard with a full `if/else` — when `#pendingSlots.size > 0` on wake, the soonest-slot alarm is restored via `Math.min(...values()) + SLOT_HOLD_MS`; otherwise the idle-reaper alarm is set. This prevents lost alarm state from leaving pending slots orphaned indefinitely.

### WR-02: Expired-slot reconnect path skips `playerReconnected` broadcast

**Files modified:** `party/game-room.ts`
**Commit:** 9be2541
**Applied fix:** Added `this.broadcast({ type: "playerReconnected", playerId, isHost }, [conn.id])` before `#sendSyncToConn` in the `#players.has(playerId)` branch of `onConnect`, mirroring the active-slot path. Peers now receive the broadcast and clear their disconnect indicators on expired-slot reconnects.

### WR-03: `gridSize` derived from `myBoard.length` — silent default of `3` for unexpected lengths

**Files modified:** `party/game-room.ts`
**Commit:** 1659911
**Applied fix:** Replaced the two-branch ternary with an exhaustive three-branch form that explicitly matches `=== 9 ? 3`, and terminates with an IIFE throw for any other length. Unexpected board sizes now surface as an error rather than silently producing the wrong grid layout.

### IN-01: `disconnectEpochs` map never evicts entries for permanently-left players

**Files modified:** `src/lib/stores/room.svelte.ts`
**Commit:** 8609a0b
**Applied fix:** Added `disconnectEpochs.delete(msg.playerId)` to the `playerLeft` case in the message handler, evicting the stale epoch entry when a player permanently leaves.

### IN-02: Unit test for `onStart` rehydration does not cover Phase 5 storage keys

**Files modified:** `tests/unit/game-room.test.ts`
**Commit:** 456f0db
**Applied fix:** Added a new `describe("GameRoom — Phase 5 rehydration (ended phase)")` block with a test that stubs all Phase 5 storage keys (`pendingSlots`, `winnerId`, `winnerName`, `winningLine`, `winningCellIds`, `winningWords`, `gridSize`, `phase: "ended"`) and asserts that `syncRequest` after `onStart` delivers correct win-line fields in the `syncResponse`. Also updated the S4 test whose assertion (`no playerReconnected for known-outside-window`) contradicted the WR-02 fix — it now asserts the correct post-fix behaviour. All 82 unit tests pass.

---

_Fixed: 2026-04-18T19:33:00Z_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
