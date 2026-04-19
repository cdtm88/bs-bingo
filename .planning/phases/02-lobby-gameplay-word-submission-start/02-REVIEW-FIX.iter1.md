---
phase: 02-lobby-gameplay-word-submission-start
fixed_at: 2026-04-19T00:00:00Z
review_path: .planning/phases/02-lobby-gameplay-word-submission-start/02-REVIEW.md
iteration: 1
findings_in_scope: 8
fixed: 4
skipped: 4
status: partial
---

# Phase 02: Code Review Fix Report

**Fixed at:** 2026-04-19
**Source review:** .planning/phases/02-lobby-gameplay-word-submission-start/02-REVIEW.md
**Iteration:** 1

**Summary:**
- Findings in scope: 8
- Fixed: 4
- Skipped: 4

## Fixed Issues

### WR-01: Unguarded `JSON.parse` in client message handler

**Files modified:** `src/lib/stores/room.svelte.ts`
**Commit:** 219bab2
**Applied fix:** Wrapped `JSON.parse` in a try/catch block; non-JSON frames are silently ignored and the message handler returns early without propagating a SyntaxError.

---

### WR-03: Host disconnection orphans the room with no client feedback

**Files modified:** `src/routes/room/[code]/+page.svelte`
**Commit:** 02ed4c5
**Applied fix:** Added `hostIsPresent` derived boolean (checks if any player in `roomState.players` matches `roomState.hostId`). Non-host waiting footer now shows a destructive-colour warning "The host left. Waiting for them to reconnect…" when the host is absent, and the normal waiting message otherwise.

---

### WR-04: `loadStarterPack` has no pool size cap

**Files modified:** `party/game-room.ts`
**Commit:** 5c9d9f0
**Applied fix:** Added `MAX_WORDS = 200` constant. Guard added in `submitWord` (returns `word_limit_reached` error) and in `loadStarterPack` loop (`break` when cap reached).

---

### IN-03: Magic divisor `21` duplicated in `GridProgress`

**Files modified:** `src/lib/components/GridProgress.svelte`
**Commit:** 2a4ebbb
**Applied fix:** Replaced all hardcoded `21` references with `TIER_THRESHOLDS["5x5"]` (already imported). Marker span thresholds also converted to `TIER_THRESHOLDS["3x3"]` and `TIER_THRESHOLDS["4x4"]` for full consistency.

---

## Skipped Issues

### CR-01: `startGame` phase transition is never received by the client

**File:** `party/game-room.ts:186` / `src/lib/stores/room.svelte.ts:79`
**Reason:** skipped: code context differs from review. The current server code (game-room.ts line 473) already sends `{ type: "gameStarted" }` — not `roomState` — on `startGame`. The client's `case "gameStarted"` handler is therefore reachable and correct. The described protocol inconsistency no longer exists.

---

### WR-02: `submitWord` does not validate non-empty after `trim()`

**File:** `party/game-room.ts:118`
**Reason:** skipped: already fixed in current code. Line 394 reads `if (!normalized) return;` — the post-trim empty guard is already present. No change needed.

---

### IN-01: `gameStarted` in `ServerMessage` is dead schema

**File:** `src/lib/protocol/messages.ts:59`
**Reason:** skipped: not dead code in current implementation. The server emits `{ type: "gameStarted" }` at game-room.ts line 473, making this schema entry live. Removing it would break the client's message handler.

---

### IN-02: Placeholder "Game on!" UI with hardcoded TODO

**File:** `src/routes/room/[code]/+page.svelte:142-150`
**Reason:** skipped: code context differs from review. The placeholder scaffold text is no longer present; the `phase === "playing"` branch now renders the real `<Board/>` component. No leaking implementation copy exists.

---

_Fixed: 2026-04-19_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
