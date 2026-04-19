---
phase: 260418-p9x
plan: "01"
subsystem: websocket-reconnect, host-failover
tags: [bug-fix, diagnostics, phase-5-uat]
key-files:
  modified:
    - src/lib/stores/room.svelte.ts
    - party/game-room.ts
decisions:
  - "Pre-existing tsc errors in .svelte-kit/ output, src/worker.ts (generated bundle), and one test file are unrelated to this fix and pre-date it"
metrics:
  duration: ~5m
  completed: "2026-04-18"
  tasks: 1
  files: 2
---

# Phase 260418-p9x Plan 01 Summary

**One-liner:** Fixed `ws.reconnectAttempts` → `ws.retryCount` bug (undefined guard) so reconnected clients send `syncRequest` instead of `hello`; added 4 temporary TEMP DIAG logs for host-failover UAT.

## Retrycount Fix

**File:** `src/lib/stores/room.svelte.ts`
**Line:** 56
**Change:** `ws.reconnectAttempts > 0` → `ws.retryCount > 0`

`reconnectAttempts` does not exist on `PartySocket` — reading it yields `undefined`, making `undefined > 0 === false` always. Every reconnect silently fell into the first-connect branch and sent `hello` instead of `syncRequest`.

## TEMP DIAG Log Locations

Run `grep -n "TEMP DIAG"` to find all four sites before merging:

| File | Line | Description |
|------|------|-------------|
| `src/lib/stores/room.svelte.ts` | 214 | `hostChanged` received — client-side, logs newHostId / previousHostId / selfPlayerId |
| `party/game-room.ts` | 198 | `#promoteNextHost` start — logs previousHostId, connectedPlayerIds, knownPlayerIds |
| `party/game-room.ts` | 210 | `#promoteNextHost` bail — logs when no connected candidate found |
| `party/game-room.ts` | 220 | `#promoteNextHost` promoting — logs newHostId and newHostName |

## TypeScript

No new errors introduced. Pre-existing errors in `.svelte-kit/` (generated build artifacts), `src/worker.ts` (bundled output), and one test file are unrelated and pre-date this fix. Our two modified files are clean.

## Deviations from Plan

None — plan executed exactly as written.

## Self-Check

- [x] `src/lib/stores/room.svelte.ts` uses `ws.retryCount` at line 56
- [x] No remaining `ws.reconnectAttempts` references
- [x] `party/game-room.ts` has exactly 3 TEMP DIAG lines in `#promoteNextHost`
- [x] `src/lib/stores/room.svelte.ts` has exactly 1 TEMP DIAG line in `hostChanged` case
- [x] Commit 2db9731 exists and contains both files

## Self-Check: PASSED
