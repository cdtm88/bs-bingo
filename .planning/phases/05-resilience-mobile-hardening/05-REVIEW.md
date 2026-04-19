---
phase: 05-resilience-mobile-hardening
reviewed: 2026-04-18T00:00:00Z
depth: standard
files_reviewed: 5
files_reviewed_list:
  - src/lib/protocol/messages.ts
  - party/game-room.ts
  - src/lib/stores/room.svelte.ts
  - e2e/05-resilience.spec.ts
  - tests/unit/game-room.test.ts
findings:
  critical: 0
  warning: 3
  info: 2
  total: 5
status: issues_found
---

# Phase 05: Code Review Report

**Reviewed:** 2026-04-18T00:00:00Z
**Depth:** standard
**Files Reviewed:** 5
**Status:** issues_found

## Summary

Five files reviewed covering the Phase 5 resilience features: slot-hold grace period, reconnect detection, `syncResponse` state snapshot, host failover via DO alarms, and ended-phase reconnect gap closure (gap-04). The core design is sound — hibernation safety, authorization guards, persist-before-broadcast ordering, and the epoch-based debounce race-fix are all correctly applied. Three warnings identify edge cases that produce silent misbehavior: an `onStart` alarm overwrite that can delay slot eviction when the DO wakes for a non-alarm reason, a missing `playerReconnected` broadcast for the expired-slot reconnect path, and a fragile `gridSize` derivation from board length. Two info items cover unbounded map growth and a gap in the unit-test coverage for Phase 5 rehydration fields.

---

## Warnings

### WR-01: `onStart` unconditionally overwrites slot-expiry alarm when pending slots exist

**File:** `party/game-room.ts:159-161`

**Issue:** `onStart` guards on `this.#pendingSlots.size === 0` before setting the idle-reaper alarm, which looks correct. However, the DO can wake from hibernation for reasons other than an alarm firing (e.g., an HTTP request to `/exists` or `/create`, or a new WebSocket connection). When that happens and pending slots exist, `onStart` does NOT set any alarm — so the previously scheduled slot-expiry alarm is still in place. That is fine.

The subtler problem: if the DO hibernated while pending slots were live AND the Cloudflare alarm infra fired the alarm while the DO was sleeping (causing a cold-wake `onAlarm`), `onStart` runs first, rehydrates `#pendingSlots` correctly, skips the alarm reset — and then `onAlarm` runs and reschedules correctly at line 619. This path is safe.

The actual bug is in the opposite direction: if `onStart` is called because a WS connection arrives (not because of the alarm) while `#pendingSlots.size > 0`, and the DO had previously lost its alarm state (e.g., due to a Cloudflare platform event), `onStart` exits without setting any alarm. The pending slots then sit in storage and `#players` forever — no `playerLeft` broadcast, no host promotion — until the next manual alarm is scheduled.

**Fix:** When `#pendingSlots.size > 0` on wake, always restore the slot-expiry alarm from the soonest pending slot, rather than relying on a previously-scheduled alarm that may have been lost:

```ts
// Replace lines 159-161 in onStart:
if (this.#pendingSlots.size > 0) {
  const soonest = Math.min(...this.#pendingSlots.values());
  this.ctx.storage.setAlarm(soonest + SLOT_HOLD_MS);
} else {
  this.ctx.storage.setAlarm(Date.now() + IDLE_TTL_MS);
}
```

---

### WR-02: Expired-slot reconnect path skips `playerReconnected` broadcast — peers' disconnect indicators never clear

**File:** `party/game-room.ts:281-287`

**Issue:** When a player whose slot has already expired reconnects (playerId is still in `#players` but not in `#pendingSlots`), `onConnect` tags the connection and sends `syncResponse` to the reconnecting player — but broadcasts nothing to peers. Peers still have the player in their `disconnectedPlayerIds` set from the original `playerDisconnected` event. That set is only cleared by a `playerReconnected` message (client store line 237). Since no `playerReconnected` is sent on this path, the disconnect indicator stays lit on all peer screens for the remainder of the session.

This path is reachable whenever a slot expires (45 s window passes, `onAlarm` evicts and broadcasts `playerLeft`) but the player then reconnects and sends `hello` with the same `playerId` — re-inserting themselves into `#players` via the `hello` handler. After that re-join they appear connected but peers who connected later or reloaded have `disconnectedPlayerIds` still set for them.

**Fix:** Broadcast `playerReconnected` in the expired-slot path, mirroring the active-slot path at lines 264-273:

```ts
// In the `if (playerId && this.#players.has(playerId))` branch:
if (playerId && this.#players.has(playerId)) {
  conn.setState({ playerId });
  this.broadcast(
    JSON.stringify({
      type: "playerReconnected",
      playerId,
      isHost: playerId === this.#hostId,
    }),
    [conn.id]
  );
  this.#sendSyncToConn(conn, playerId);
  return;
}
```

---

### WR-03: `gridSize` derived from `myBoard.length` — silent default of `3` for unexpected lengths

**File:** `party/game-room.ts:512`

**Issue:** Grid size is reverse-engineered from the board cell count:

```ts
const gridSize: 3 | 4 | 5 = myBoard.length === 25 ? 5 : myBoard.length === 16 ? 4 : 3;
```

The ternary falls through to `3` for any length that is neither 25 nor 16 — including the expected 9-cell 3×3 board (correct) but also any unexpected length. If `deriveGridTier` is ever extended (e.g., for a 2×2 tutorial mode with 4 cells), `gridSize` silently returns `3`, causing `EndScreen` and `WinLineIcon` to render with the wrong grid layout. The TypeScript type annotation `3 | 4 | 5` provides no runtime guard.

**Fix:** Add an exhaustive check so unexpected lengths throw rather than silently mis-reporting:

```ts
const gridSize: 3 | 4 | 5 =
  myBoard.length === 25 ? 5
  : myBoard.length === 16 ? 4
  : myBoard.length === 9 ? 3
  : (() => { throw new Error(`Unexpected board length: ${myBoard.length}`); })();
```

Longer-term, store `gridSize` on the board entry in `#boards` (e.g., `Map<string, { cells: BoardCell[]; gridSize: 3|4|5 }>`) so it does not need to be re-derived at win time.

---

## Info

### IN-01: `disconnectEpochs` map never evicts entries for permanently-left players

**File:** `src/lib/stores/room.svelte.ts:42`

**Issue:** `disconnectEpochs` is populated on every `playerDisconnected` event but never cleared when a player permanently leaves. The `playerLeft` handler (line 101) removes the player from `state.players` but does not call `disconnectEpochs.delete(msg.playerId)`. In a meeting room with many transient participants the map accumulates stale entries for the lifetime of the store. Memory-only concern — no correctness impact.

**Fix:**

```ts
case "playerLeft":
  if (state) state.players = state.players.filter((p) => p.playerId !== msg.playerId);
  disconnectEpochs.delete(msg.playerId);
  break;
```

---

### IN-02: Unit test for `onStart` rehydration does not cover Phase 5 storage keys

**File:** `tests/unit/game-room.test.ts:819-830`

**Issue:** The hibernation rehydration test stubs only the Phase 1-4 storage keys (`active`, `hostId`, `players`, `words`, `phase`, `usedPacks`, `boards`, `marks`). The Phase 5 keys — `pendingSlots`, `winnerId`, `winnerName`, `winningLine`, `winningCellIds`, `winningWords`, `gridSize` — all fall through to `Promise.resolve(undefined)`. The `onStart` fallbacks (`?? null`, `?? []`) handle this gracefully so no crash occurs, but the test gives no coverage that a reconnecting player in the `ended` phase receives correct win-line data in `syncResponse` after a wake. This gap would have caught the original gap-04 bug class in unit tests before e2e.

**Fix:** Add a Phase 5 rehydration test that stubs the full set of storage keys (including `winningLine`, `winningCellIds`, `winningWords`, `gridSize`, `winnerId`, `winnerName`, `phase: "ended"`) and asserts that `#sendSyncToConn` delivers the expected win-line fields.

---

_Reviewed: 2026-04-18T00:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
