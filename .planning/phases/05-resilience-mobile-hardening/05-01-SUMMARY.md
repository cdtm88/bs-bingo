---
phase: "05-resilience-mobile-hardening"
plan: "01"
subsystem: "server"
tags: [resilience, websocket, slot-hold, reconnect, host-failover, durable-objects, alarms]
dependency_graph:
  requires: []
  provides: [slot-hold-grace-period, reconnect-detection, full-state-sync-response, host-failover, new-protocol-messages]
  affects: [party/game-room.ts, src/lib/protocol/messages.ts, tests/unit/game-room.test.ts]
tech_stack:
  added: []
  patterns:
    - "Slot-hold: onClose adds to #pendingSlots Map instead of deleting player; onAlarm evicts after 45s"
    - "Hydration guard: #hydratedPromise (pre-resolved in constructor, re-armed in onStart) prevents cold-wake race in onConnect"
    - "Alarm multiplexing: slot expiry processed first, idle-reap falls through only when pendingSlots is empty"
    - "Host promotion: #promoteNextHost selects lowest joinedAt among currently connected players"
    - "Private full-state sync: #sendSyncToConn sends unicast syncResponse (board + marks + snapshot)"
key_files:
  created: []
  modified:
    - src/lib/protocol/messages.ts
    - party/game-room.ts
    - tests/unit/game-room.test.ts
    - tests/unit/protocol.test.ts
    - tests/unit/room-store.test.ts
decisions:
  - "Hydration guard starts pre-resolved so onConnect is not blocked in tests or when onStart never runs; onStart re-arms it before storage reads"
  - "SLOT_HOLD_MS = 45s for both players and host (same window per STATE.md decision)"
  - "onClose broadcasts playerDisconnected (not playerLeft); playerLeft fires from onAlarm after slot expiry"
  - "#winnerId/#winnerName persisted at win declaration and included in #snapshot() so syncResponse in ended phase carries winner info"
metrics:
  duration: "~30 minutes"
  completed: "2026-04-18T13:28:09Z"
  tasks_completed: 2
  files_changed: 5
---

# Phase 5 Plan 01: Server-Side Resilience Layer Summary

Server-side slot-hold grace period, reconnect detection via playerId query param, full-state syncResponse, host failover via DO alarms, and new protocol message variants for the resilience layer.

## What Was Built

### New Storage Keys

| Key | Type | Shape | Purpose |
|-----|------|-------|---------|
| `pendingSlots` | `Array<[playerId, disconnectedAt]>` | Map entries | Tracks disconnected players within slot-hold window |
| `winnerId` | `string \| null` | Scalar | Winner's playerId for syncResponse in ended phase |
| `winnerName` | `string \| null` | Scalar | Winner's displayName for syncResponse in ended phase |

### Protocol Changes (messages.ts)

- **ClientMessage**: Added `syncRequest` variant (zero payload)
- **ServerMessage**: Added `syncResponse` (state + board + markedCellIds), `playerDisconnected` (playerId), `playerReconnected` (playerId + isHost), `hostChanged` (newHostId)
- **RoomState**: Added optional `winnerId` and `winnerName` fields

### onConnect Branching Logic (3 paths)

1. **Slot-window reconnect** (`playerId` in `#pendingSlots`): removes from pendingSlots, tags conn, broadcasts `playerReconnected` to peers, sends `syncResponse` unicast, restores idle-reaper alarm if no more pending slots
2. **Known-outside-window** (`playerId` in `#players` but not `#pendingSlots`): tags conn and sends `syncResponse` — no broadcasts (duplicate tab or post-expiry rejoin)
3. **New player** (no `playerId` or unknown): falls through to await `hello` message (existing flow unchanged)

### onAlarm Multiplex Order

1. If `#pendingSlots.size > 0`: iterate all entries, evict expired ones (age ≥ 45s), broadcast `playerLeft`, trigger `#promoteNextHost()` if evicted player was host, reschedule alarm for next pending expiry if any remain — **return early**
2. If no pending slots remain: idle-reap check — if `#players.size === 0` call `deleteAll()`, else reschedule for IDLE_TTL_MS

### #promoteNextHost Selection Criteria

Iterates `getConnections()` to build the set of currently-connected playerIds. Among those in `#players`, selects the one with the smallest `joinedAt` timestamp (longest-connected proxy). Updates `#hostId`, persists hostId and players, broadcasts `hostChanged`.

## Commits

| Hash | Description |
|------|-------------|
| `358c058` | Protocol schema extensions + Phase 5 message tests (M1-M8) |
| `397642d` | Server slot-hold, reconnect path, host failover, multiplexed onAlarm + Phase 5 unit tests (S1-S15) |

## Test Results

- 307 total unit tests passing (16 test files)
- 15 new Phase 5 tests in `game-room.test.ts` (S1–S15)
- 8 new Phase 5 schema tests in `protocol.test.ts` (M1–M8)
- No regressions in Phase 1–4 tests

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed pre-existing winDeclared test missing gridSize field**
- **Found during:** Task 1 GREEN phase
- **Issue:** `protocol.test.ts` and `room-store.test.ts` had `emitWinDeclared` helpers that omitted the required `gridSize` field added in Phase 4. This caused `v.safeParse(ServerMessage, ...)` to fail silently, leaving `store.winner` as null.
- **Fix:** Added `gridSize: 3` to the test payload in both test files
- **Files modified:** `tests/unit/protocol.test.ts`, `tests/unit/room-store.test.ts`
- **Commit:** `397642d`

**2. [Rule 1 - Bug] Fixed agile pack word count in tests (20→17)**
- **Found during:** Task 2 GREEN phase
- **Issue:** Two tests expected agile pack to have 20 words; actual count is 17
- **Fix:** Updated expected counts from 20→17 and 19→16 (with one duplicate skipped)
- **Files modified:** `tests/unit/game-room.test.ts`
- **Commit:** `397642d`

**3. [Rule 1 - Bug] Updated onClose test for slot-hold semantics**
- **Found during:** Task 2 GREEN phase
- **Issue:** Existing Phase 1 `onClose` test expected `playerLeft` broadcast and player removal, but Phase 5 changes `onClose` to broadcast `playerDisconnected` and keep player in `#players` (slot-hold)
- **Fix:** Updated test expectations to match new slot-hold behavior; player count changes from 2 to 3 after another join (p1 still present during window)
- **Files modified:** `tests/unit/game-room.test.ts`
- **Commit:** `397642d`

**4. [Rule 1 - Bug] Fixed hydration guard to not block tests**
- **Found during:** Task 2 GREEN phase (S3/S4/S5/S13 timeouts)
- **Issue:** `#hydratedPromise` was created unresolved in the constructor. Tests that don't call `onStart()` would have `onConnect` await forever.
- **Fix:** `#hydratedPromise` starts pre-resolved by default; `onStart()` re-creates an unresolved promise before storage reads then resolves at end. This preserves the cold-wake guard without blocking tests.
- **Files modified:** `party/game-room.ts`
- **Commit:** `397642d`

**5. [Rule 1 - Bug] Fixed W7 test (winnerName fallback) to use alarm eviction**
- **Found during:** Task 2 GREEN phase
- **Issue:** W7 test used `room.onClose()` to remove player from `#players`, but Phase 5 slot-hold no longer deletes from `#players` in `onClose`. Test expected `winnerName === "Someone"` but got `"Alice"`.
- **Fix:** Changed W7 to drive `onAlarm()` with `vi.useFakeTimers()` advanced 50s to trigger real eviction
- **Files modified:** `tests/unit/game-room.test.ts`
- **Commit:** `397642d`

## Known Stubs

None — all implemented features are fully wired to storage and tested.

## Threat Flags

No new unmitigated threat surface. All threats T-5-01 through T-5-05 from the plan's threat model are addressed:
- T-5-01 (playerId spoofing): handled — server only uses playerId as lookup key
- T-5-02 (syncResponse info disclosure): handled — unicast via `conn.send()`, pre-hello dropped
- T-5-03 (host elevation): handled — promotion server-only via onAlarm, not client messages
- T-5-04 (DoS slot flooding): accepted — Map deduplication limits to N concurrent players
- T-5-05 (winnerId tampering): handled — set server-side from conn.state.playerId

## Self-Check: PASSED

- FOUND: `party/game-room.ts`
- FOUND: `src/lib/protocol/messages.ts`
- FOUND: `tests/unit/game-room.test.ts`
- FOUND: `.planning/phases/05-resilience-mobile-hardening/05-01-SUMMARY.md`
- FOUND commit `358c058`: feat(05-01): extend protocol
- FOUND commit `397642d`: feat(05-01): server slot-hold
- All 307 unit tests passing (16 test files)
