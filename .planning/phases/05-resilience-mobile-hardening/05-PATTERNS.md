# Phase 5: Resilience & Mobile Hardening — Pattern Map (Gap Closure)

**Mapped:** 2026-04-18
**Mode:** gap_closure — only the four files identified in VERIFICATION.md
**Files analyzed:** 4
**Analogs found:** 4 / 4 (all are modifications to existing files — self-analog)

---

## File Classification

| File | Role | Data Flow | Closest Analog | Match Quality |
|------|------|-----------|----------------|---------------|
| `src/lib/protocol/messages.ts` | schema/protocol | request-response | Self (existing `winDeclared` schema, lines 97-105) | exact — extend same object pattern |
| `party/game-room.ts` | service/actor | event-driven | Self (existing `#sendSyncToConn` lines 181-190; `markWord` case win detection lines 455-484) | exact — extend existing method |
| `src/lib/stores/room.svelte.ts` | store/client | event-driven | Self (existing `syncResponse` handler lines 175-195; `winDeclared` handler lines 122-161) | exact — extend existing case |
| `e2e/05-resilience.spec.ts` | test | request-response | `e2e/win-and-reset.spec.ts` (uses `toBeVisible({timeout:N})` pattern throughout) | exact |

---

## Pattern Assignments

### `src/lib/protocol/messages.ts` — add win fields to `syncResponse` schema

**The gap:** `syncResponse` (lines 109-114) is missing `winningLine`, `winningCellIds`, `winningWords`, `gridSize` that exist on `winDeclared` (lines 97-105). These fields must be nullable/optional on `syncResponse` because the game may not be in the ended phase.

**Analog — `winDeclared` object** (lines 96-105):
```typescript
v.object({
  type: v.literal("winDeclared"),
  winnerId: v.pipe(v.string(), v.minLength(1)),
  winnerName: v.pipe(v.string(), v.minLength(1)),
  winningLine: WinningLine,
  winningCellIds: v.array(v.string()),
  winningWords: v.array(v.string()),
  gridSize: v.picklist([3, 4, 5]),
}),
```

**Current `syncResponse` object** (lines 109-114):
```typescript
v.object({
  type: v.literal("syncResponse"),
  state: RoomState,
  board: v.nullable(v.array(BoardCell)),
  markedCellIds: v.array(v.string()),
}),
```

**Target pattern — add nullable win fields after `markedCellIds`:**
```typescript
v.object({
  type: v.literal("syncResponse"),
  state: RoomState,
  board: v.nullable(v.array(BoardCell)),
  markedCellIds: v.array(v.string()),
  // Win fields — null when phase !== "ended"
  winningLine: v.nullable(WinningLine),
  winningCellIds: v.array(v.string()),
  winningWords: v.array(v.string()),
  gridSize: v.nullable(v.picklist([3, 4, 5])),
}),
```

**Key conventions to preserve:**
- `WinningLine` reuses the existing exported schema (line 31-35) — do not inline
- `v.nullable(...)` wraps the type (not `v.optional`) — consistent with `board` and `hostId`
- `winningCellIds`/`winningWords` default to empty arrays (not nullable) matching `winDeclared` — safe to send `[]` when phase !== ended

---

### `party/game-room.ts` — populate win fields in `#sendSyncToConn` when `phase === 'ended'`

**The gap:** `#sendSyncToConn` (lines 181-190) sends only `state`, `board`, `markedCellIds`. It must also send `winningLine`, `winningCellIds`, `winningWords`, `gridSize` when `this.#phase === "ended"`.

**Analog — win data derivation in `markWord` case** (lines 455-484):

The `winningWords` and `gridSize` derivation logic is already written in the `markWord` case. The board for the winner is `myBoard`. For `#sendSyncToConn`, the board is fetched via `this.#boards.get(playerId)`.

Win line is NOT stored separately — it was only broadcast. The verification gap says to send winningLine/winningCellIds/winningWords, which means these must either be persisted separately or re-derived. The simplest path: add storage keys `K_WINNING_LINE`, `K_WINNING_CELL_IDS`, `K_WINNING_WORDS`, `K_GRID_SIZE` and persist them in the `markWord` case alongside `#persistWinner()`.

**Existing persistence pattern** (`#persistWinner`, lines 174-177):
```typescript
#persistWinner() {
  void this.ctx.storage.put(K_WINNER_ID, this.#winnerId);
  void this.ctx.storage.put(K_WINNER_NAME, this.#winnerName);
}
```

**Analog — storage key naming convention** (lines 41-51):
```typescript
const K_ACTIVE = "active";
const K_HOST_ID = "hostId";
// ...
const K_WINNER_ID = "winnerId";
const K_WINNER_NAME = "winnerName";
```

**Analog — `onStart` rehydration block** (lines 95-119): every storage key is read in the `Promise.all` array. New win-line keys follow the same pattern.

**Analog — `winningWords` derivation** (lines 469-475):
```typescript
const winningWords = win.winningCellIds
  .map(id => myBoard.find(c => c.cellId === id))
  .filter((c): c is BoardCell => !!c && !c.blank && c.text !== null)
  .map(c => c.text as string);

const gridSize: 3 | 4 | 5 = myBoard.length === 25 ? 5 : myBoard.length === 16 ? 4 : 3;
```

**Target `#sendSyncToConn` pattern:**
```typescript
#sendSyncToConn(conn: Connection, playerId: string) {
  const board = this.#boards.get(playerId) ?? null;
  const marks = this.#marks.get(playerId);
  conn.send(JSON.stringify({
    type: "syncResponse",
    state: this.#snapshot(),
    board,
    markedCellIds: marks ? [...marks] : [],
    // Win fields — only meaningful when phase === "ended"
    winningLine: this.#phase === "ended" ? (this.#winningLine ?? null) : null,
    winningCellIds: this.#phase === "ended" ? (this.#winningCellIds ?? []) : [],
    winningWords: this.#phase === "ended" ? (this.#winningWords ?? []) : [],
    gridSize: this.#phase === "ended" ? (this.#gridSize ?? null) : null,
  }));
}
```

**New in-memory fields to add** (following the existing pattern at lines 60-73):
```typescript
#winningLine: import("./src/lib/protocol/messages.js").WinningLine | null = null;
#winningCellIds: string[] = [];
#winningWords: string[] = [];
#gridSize: 3 | 4 | 5 | null = null;
```

**Storage keys to add** (following line 49-51 pattern):
```typescript
const K_WINNING_LINE = "winningLine";       // WinningLine | null
const K_WINNING_CELL_IDS = "winningCellIds"; // string[]
const K_WINNING_WORDS = "winningWords";      // string[]
const K_GRID_SIZE = "gridSize";              // 3 | 4 | 5 | null
```

**`markWord` persist call site** (after line 467 `this.#persistWinner()`): extend `#persistWinner` to also persist win-line fields, or call a new `#persistWinDetails()`.

**`onStart` rehydration** (in the `Promise.all` at lines 95-119): add four more `this.ctx.storage.get` calls following the existing pattern.

---

### `src/lib/stores/room.svelte.ts` — restore win fields from `syncResponse`

**The gap:** The `syncResponse` handler (lines 175-195) sets `winner` from `msg.state.winnerId` but never touches `winningLine`, `winningCellIds`, `winningWords`, `winningGridSize` — they remain at their initial null/empty values. The `+page.svelte` EndScreen guard requires both `store?.winner && store?.winningLine`.

**Analog — `winDeclared` handler** (lines 122-128):
```typescript
case "winDeclared": {
  winner = { playerId: msg.winnerId, displayName: msg.winnerName };
  winningLine = msg.winningLine;
  winningCellIds = msg.winningCellIds;
  winningWords = msg.winningWords;
  winningGridSize = msg.gridSize;
  if (state) state = { ...state, phase: "ended" };
  // ...
}
```

**Current `syncResponse` handler** (lines 175-195) — note the missing win-field assignments:
```typescript
case "syncResponse": {
  state = msg.state;
  words = msg.state.words ?? [];
  usedPacks = new Set(msg.state.usedPacks ?? []);
  if (msg.board !== null) {
    board = msg.board;
  }
  markedCellIds = new Set(msg.markedCellIds);
  if (msg.state.winnerId) {
    const winnerPlayer = msg.state.players.find((p) => p.playerId === msg.state.winnerId);
    winner = {
      playerId: msg.state.winnerId,
      displayName: msg.state.winnerName ?? winnerPlayer?.displayName ?? "Someone",
    };
  } else {
    winner = null;
  }
  break;
}
```

**Target pattern — add win-field restoration after the `winner` assignment:**
```typescript
// After the winner block, inside case "syncResponse":
if (msg.winningLine !== null) {
  winningLine = msg.winningLine;
  winningCellIds = msg.winningCellIds;
  winningWords = msg.winningWords;
  winningGridSize = msg.gridSize ?? 3;
} else {
  // Not in ended phase (or no win data) — reset to defaults matching gameReset handler
  winningLine = null;
  winningCellIds = [];
  winningWords = [];
  winningGridSize = 3;
}
```

**Convention note:** `winningGridSize` fallback is `3` — matches the `$state` initial value at line 37 and the `gameReset` handler at line 171. `msg.gridSize ?? 3` handles the nullable schema safely.

---

### `e2e/05-resilience.spec.ts` — replace `waitForTimeout(50_000)` with `toBeVisible({timeout:55_000})`

**The gap:** Line 165 hard-sleeps 50 seconds regardless of whether the host-failover event has arrived. This wastes CI time and leaves only ~30-35s buffer in the 90s budget (`test.slow()` triples the base 30s timeout to 90s total).

**Analog — `toBeVisible({timeout:N})` pattern in same file:**
- Line 80: `await expect(b.getByText(/Reconnecting/i)).toBeVisible({ timeout: 3000 });`
- Line 84: `await expect(b.locator('[data-testid="board-grid"] button').first()).toBeVisible({ timeout: 8000 });`

**Analog — `toBeVisible({timeout:N})` in `win-and-reset.spec.ts`:**
- Line 47: `await expect(a.locator('[data-testid="board-grid"] button').first()).toBeVisible({ timeout: 3000 });`
- Line 67: `await expect(a.getByText(/^BINGO!$/)).toBeVisible({ timeout: 1500 });`

**Current code at line 165:**
```typescript
await b.waitForTimeout(50_000);

// B should now be host — see the Start Game button
await expect(b.getByRole("button", { name: /Start Game/i })).toBeVisible({ timeout: 5000 });
```

**Target pattern — replace the hard sleep with a single assertion timeout:**
```typescript
// Wait up to 55s for DO alarm to fire and B to receive hostChanged + become host
await expect(b.getByRole("button", { name: /Start Game/i })).toBeVisible({ timeout: 55_000 });
```

**Rationale:** `toBeVisible({timeout:55_000})` polls every 100ms and resolves the moment the button appears. In the common case (DO alarm fires at ~45s), this saves ~10s vs. always waiting 50s + 5s. The 55s ceiling leaves 35s spare within the 90s `test.slow()` budget, same margin as before but now the test fails fast if the button never appears rather than always consuming the full 50s.

---

## Shared Patterns

### Valibot nullable field pattern
**Source:** `src/lib/protocol/messages.ts` lines 22-27 (`BoardCell.wordId`, `BoardCell.text`) and line 112 (`syncResponse.board`)
**Apply to:** new `syncResponse` win fields
```typescript
// Nullable scalar
v.nullable(v.string())
// Nullable complex type
v.nullable(WinningLine)
// Nullable picklist
v.nullable(v.picklist([3, 4, 5]))
```

### DO storage persist-then-broadcast ordering
**Source:** `party/game-room.ts` lines 500-508 (startNewGame case comment: "Persist-then-broadcast ordering")
**Apply to:** New `#persistWinDetails()` call in `markWord` — persist before the existing `broadcast(winDeclared)` at line 476, same as `#persistWinner()` at line 467.

### `onStart` rehydration — parallel Promise.all
**Source:** `party/game-room.ts` lines 95-119
**Apply to:** Add 4 new `this.ctx.storage.get<...>(K_...)` calls to the existing destructured `Promise.all` array. Follow the same type annotation pattern: `this.ctx.storage.get<WinningLine | null>(K_WINNING_LINE)` etc.

---

## No Analog Found

None — all four changes are extensions to existing files with clear internal analogs.

---

## Metadata

**Analog search scope:** All four target files read in full; `e2e/win-and-reset.spec.ts` read for timeout pattern analog
**Files scanned:** 6
**Pattern extraction date:** 2026-04-18
