---
phase: 02-lobby-gameplay-word-submission-start
reviewed: 2026-04-19T00:00:00Z
depth: standard
files_reviewed: 12
files_reviewed_list:
  - party/game-room.ts
  - src/app.css
  - src/lib/components/GridProgress.svelte
  - src/lib/components/PackPills.svelte
  - src/lib/components/TextInput.svelte
  - src/lib/components/WordChip.svelte
  - src/lib/components/WordPool.svelte
  - src/lib/protocol/messages.ts
  - src/lib/stores/room.svelte.ts
  - src/lib/util/gridTier.ts
  - src/lib/util/starterPacks.ts
  - src/routes/room/[code]/+page.svelte
findings:
  critical: 0
  warning: 3
  info: 3
  total: 6
status: issues_found
---

# Phase 02: Code Review Report

**Reviewed:** 2026-04-19T00:00:00Z
**Depth:** standard
**Files Reviewed:** 12
**Status:** issues_found

## Summary

Re-review following fixes applied from the prior iteration. All previously identified critical and most warning issues are resolved: the `JSON.parse` try/catch is present, the `submitWord` whitespace guard is in place, the `hostIsPresent` UI indicator exists, the `MAX_WORDS` pool cap is enforced, and the `GridProgress` fill uses `TIER_THRESHOLDS["5x5"]`. The dead `gameStarted` schema variant and its client handler have also been removed.

Three warnings remain covering a correctness gap in the optimistic mark/toggle flow, a listener-lifecycle smell in the reconnect store, and an unguarded runtime throw in the `markWord` handler. Three info items flag minor quality issues.

## Warnings

### WR-01: Optimistic mark toggle can permanently desync if server silently drops the `markWord`

**File:** `src/lib/stores/room.svelte.ts:330-335`

`toggleMark` flips `markedCellIds` locally before the server responds. The server silently drops invalid marks (blank cell, wrong phase, pre-hello) with no error message. If the server drops the message, the client's local set stays toggled indefinitely. The current `wordMarked` broadcast omits `cellId` (by design, BOAR-06), so the sender has no way to reconcile which cells are truly marked without a full sync. A page hide/show or reconnect triggers `syncRequest` and corrects the state, but during the same uninterrupted session the client can show a false mark.

**Fix (minimal):** Send a `syncRequest` after any mark that fails to echo back within a timeout, or add a per-cell pending map and time out unconfirmed marks. The simplest safe fix is to remove the optimistic flip and accept the minor latency, since the server already broadcasts `wordMarked` to all connections including the sender on success:

```typescript
toggleMark(cellId: string) {
  // No optimistic flip — server echoes wordMarked on success.
  // markedCellIds is owned by the server snapshot and syncResponse.
  ws.send(JSON.stringify({ type: "markWord", cellId }));
},
```

This requires `wordMarked` to carry `cellId` so the sender can update its own set — a small protocol addition that stays within BOAR-06's intent (no layout info, just the mark confirmation).

---

### WR-02: `visibilitychange` listener in `createRoomStore` is not removed if `disconnect()` is never called

**File:** `src/lib/stores/room.svelte.ts:278-286`

The `visibilitychange` listener is registered inside `createRoomStore` and removed only inside `disconnect()`. The page calls `disconnect()` from `onDestroy` and the `pagehide` handler. If the browser kills the page without firing either event (e.g., background tab eviction on iOS), the listener is never removed. This is low-risk for a single-page game session but will accumulate if `createRoomStore` is ever called more than once (e.g., room code changes via SvelteKit navigation without a full unload).

**Fix:** Return the cleanup function from the store and let the page drive cleanup, or attach the listener in the `onMount` body where `onDestroy` cleanup is guaranteed:

```typescript
// In +page.svelte onMount return, after store = createRoomStore(...)
return () => {
  store?.disconnect();
  // visibilitychange cleanup handled inside disconnect()
};
```

Ensure `disconnect()` always removes the listener even when `ws.readyState` is already `CLOSED`.

---

### WR-03: Unhandled runtime throw in `markWord` handler crashes the Durable Object request

**File:** `party/game-room.ts:549-553`

```typescript
const gridSize: 3 | 4 | 5 =
  myBoard.length === 25 ? 5
  : myBoard.length === 16 ? 4
  : myBoard.length === 9 ? 3
  : (() => { throw new Error(`Unexpected board length: ${myBoard.length}`); })();
```

If `#buildBoardForPlayer` ever produces a board outside {9, 16, 25} cells — due to future changes to `deriveGridTier` thresholds — this IIFE throws inside `onMessage`. An unhandled synchronous throw in a Durable Object's `onMessage` terminates the WebSocket request with a 1011 error. Marks are already persisted at this point (`#persistMarks()` ran on line 517) but the `winDeclared` broadcast never fires, leaving the game stuck in `playing` phase permanently.

**Fix:** Replace the throw with a defensive fallback and log:

```typescript
let gridSize: 3 | 4 | 5;
if (myBoard.length === 25) gridSize = 5;
else if (myBoard.length === 16) gridSize = 4;
else if (myBoard.length === 9) gridSize = 3;
else {
  console.error(`[GameRoom] Unexpected board length ${myBoard.length} — defaulting to 5`);
  gridSize = 5;
}
```

## Info

### IN-01: `wordsNeededToStart` in `gridTier.ts` hardcodes `5` instead of importing `MIN_WORDS_TO_START`

**File:** `src/lib/util/gridTier.ts:20`

```typescript
export function wordsNeededToStart(wordCount: number): number {
  return Math.max(0, 5 - wordCount);
}
```

`MIN_WORDS_TO_START` is the single source of truth (exported from `messages.ts`, enforced server-side). If the threshold changes, `wordsNeededToStart` silently diverges and the `canStart` UI calculation in `GridProgress` will be wrong.

**Fix:**

```typescript
import { MIN_WORDS_TO_START } from "$lib/protocol/messages";

export function wordsNeededToStart(wordCount: number): number {
  return Math.max(0, MIN_WORDS_TO_START - wordCount);
}
```

---

### IN-02: `myPlayerId` reads `sessionStorage` inside a `$derived.by` on every reactive evaluation

**File:** `src/routes/room/[code]/+page.svelte:94-103`

`$derived.by` re-runs whenever Svelte tracks a dependency change. `sessionStorage` is not reactive, so the read always returns the same value — but the closure still executes on every derived invalidation. Since `myPlayerId` never changes during a session, this should be a plain `let` set once in `onMount`.

**Fix:**

```typescript
let myPlayerId = $state("");
onMount(() => {
  const raw = sessionStorage.getItem(`bsbingo_player_${data.code}`);
  if (raw) {
    try { myPlayerId = (JSON.parse(raw) as { playerId: string }).playerId; }
    catch { /* ignore malformed entry */ }
  }
  store = createRoomStore(data.code);
  // ...
});
```

---

### IN-03: `submitWord` server handler comment implies `text` may be untrimmed, but Valibot already trims it

**File:** `party/game-room.ts:395-397`

```typescript
const normalized = text.trim();
if (!normalized) return; // silently drop all-whitespace submissions
```

The `submitWord` schema applies `v.trim()` and `v.minLength(1)` before the message reaches `onMessage`, so `text` is already trimmed and guaranteed non-empty by the time this code runs. The `normalized` variable and guard are redundant (the whitespace-only path is rejected by schema validation before it gets here). The comment misleads readers into thinking all-whitespace can arrive at this point.

**Fix:** Remove the redundant variable and add a clarifying comment, or keep it as an explicit defensive guard with a note that it is belt-and-suspenders:

```typescript
// text is already trimmed and non-empty (enforced by Valibot schema).
const { text } = result.output;
```

---

_Reviewed: 2026-04-19T00:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
