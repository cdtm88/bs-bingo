# Phase 3: Board Generation & Core Mark Loop - Pattern Map

**Mapped:** 2026-04-17
**Files analyzed:** 13 (new/modified)
**Analogs found:** 13 / 13 — all new files have role-match analogs in the Phase 1/2 codebase; all modified files are in-place extensions.

---

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `src/lib/protocol/messages.ts` | model (schema) | — | `src/lib/protocol/messages.ts` (self) | exact (in-place extension) |
| `src/lib/util/shuffle.ts` (NEW) | utility | transform (pure) | `src/lib/util/gridTier.ts` + `src/lib/util/roomCode.ts` | role-match (pure-function utility on Workers runtime) |
| `party/game-room.ts` | service (DO actor) | event-driven | `party/game-room.ts` (self) — `submitWord`, `loadStarterPack`, `startGame` handlers | exact (in-place extension) |
| `src/lib/stores/room.svelte.ts` | store | event-driven | `src/lib/stores/room.svelte.ts` (self) — `wordAdded`/`wordRemoved` handlers | exact (in-place extension) |
| `src/lib/components/Board.svelte` (NEW) | component (container) | — | `src/lib/components/WordPool.svelte` | role-match (section with keyed `{#each}` over protocol list + empty-state) |
| `src/lib/components/BoardCell.svelte` (NEW) | component (leaf, interactive) | request-response (onclick → store.send) | `src/lib/components/WordChip.svelte` + `src/lib/components/Button.svelte` | role-match (button-on-surface w/ variants + aria) |
| `src/lib/components/PlayerRow.svelte` | component | — | `src/lib/components/PlayerRow.svelte` (self) | exact (additive `markCount` prop + conditional badge) |
| `src/routes/room/[code]/+page.svelte` | component (page) | event-driven | `src/routes/room/[code]/+page.svelte` (self) | exact (replace `gameStarted` stub block with `<Board />` + `PlayerRow markCount`) |
| `tests/unit/shuffle.test.ts` (NEW) | test (unit) | — | `tests/unit/roomCode.test.ts` + `tests/unit/gridTier.test.ts` | role-match (pure-function unit test) |
| `tests/unit/game-room.test.ts` | test (unit) | — | `tests/unit/game-room.test.ts` (self) — "GameRoom — word pool (Phase 2)" describe block | exact (add "Phase 3" describe block, reuse `makeConn`/`FakeConn`/`joinPlayer`) |
| `tests/unit/protocol.test.ts` | test (unit) | — | `tests/unit/protocol.test.ts` (self) | exact (append `v.safeParse` tests for 3 new variants + `BoardCell`) |
| `tests/unit/room-store.test.ts` | test (unit) | — | `tests/unit/room-store.test.ts` (self) — `wordAdded`/`wordRemoved` tests | exact (append `boardAssigned`/`wordMarked` handler tests) |
| `tests/e2e/board-mark.spec.ts` (NEW) | test (e2e) | request-response | `e2e/phase2-lobby.spec.ts` | role-match (two-browser Playwright flow with `createRoom`/`joinRoom` helpers) |

---

## Pattern Assignments

### `src/lib/protocol/messages.ts` (model, in-place extension)

**Analog:** `src/lib/protocol/messages.ts` (self — currently 66 lines, see lines 11–16 for `WordEntry` and lines 28–60 for the two `v.variant` discriminated unions).

**Import pattern — unchanged** (line 1, copy as-is):
```typescript
import * as v from "valibot";
```

**`WordEntry` pattern to mirror** (lines 11–16) — add `BoardCell` directly after, following the same `v.object` + `v.InferOutput<typeof X>` export pair:
```typescript
// EXISTING (lines 11–16) — structural analog to copy
export const WordEntry = v.object({
  wordId: v.string(),
  text: v.string(),
  submittedBy: v.string(),
});
export type WordEntry = v.InferOutput<typeof WordEntry>;
```

**New `BoardCell` schema** — append above `RoomState` (insert after line 16):
```typescript
export const BoardCell = v.object({
  cellId: v.string(),
  wordId: v.nullable(v.string()),
  text: v.nullable(v.string()),
  blank: v.boolean(),
});
export type BoardCell = v.InferOutput<typeof BoardCell>;
```

**`RoomState` (lines 18–26) — DO NOT add a `board` field.** Per RESEARCH.md §Anti-Patterns and CONTEXT.md `<code_context>`, boards are per-player private payloads, never broadcast in `RoomState`.

**`ClientMessage` extension pattern** (lines 28–48) — variant append pattern; mirror the `submitWord` bounded-string shape at lines 35–38 for `markWord`:
```typescript
// EXISTING submitWord variant (lines 35–38) — shape to mirror
v.object({
  type: v.literal("submitWord"),
  text: v.pipe(v.string(), v.minLength(1), v.maxLength(30)),
}),
```
**Add** inside the variant array (before the closing `]`):
```typescript
v.object({
  type: v.literal("markWord"),
  cellId: v.pipe(v.string(), v.minLength(1)),
}),
```

**`ServerMessage` extension pattern** (lines 51–60) — variant append. Mirror `wordAdded` (line 57) for `boardAssigned`, and `wordRemoved` (line 58) + `playerLeft` (line 53) for `wordMarked`:
```typescript
// EXISTING wordAdded + wordRemoved variants (lines 57–59)
v.object({ type: v.literal("wordAdded"), word: WordEntry }),
v.object({ type: v.literal("wordRemoved"), wordId: v.string() }),
v.object({ type: v.literal("gameStarted") }),
```
**Add** inside the variant array:
```typescript
v.object({ type: v.literal("boardAssigned"), cells: v.array(BoardCell) }),
v.object({
  type: v.literal("wordMarked"),
  playerId: v.pipe(v.string(), v.minLength(1)),
  markCount: v.pipe(v.number(), v.integer(), v.minValue(0)),
}),
```

---

### `src/lib/util/shuffle.ts` (utility, NEW)

**Analog:** `src/lib/util/gridTier.ts` (30 lines) — same shape (pure functions, no imports, exported named functions, leading `//` contract comment). `roomCode.ts` is the secondary analog (uses external crypto-grade source).

**`gridTier.ts` structural template** (lines 1–3 + pattern of leading comment + `export function`):
```typescript
// src/lib/util/gridTier.ts — analog structure
// Pure functions — used by GridProgress component and unit tests (gridTier.test.ts)

export type GridTier = "3x3" | "4x4" | "5x5";
```

**Full new file — follow RESEARCH.md Pattern 1 verbatim** (the algorithmic content is prescribed; the file-level structure copies `gridTier.ts`):
```typescript
// src/lib/util/shuffle.ts
// Cryptographically unbiased Fisher–Yates shuffle.
// Runs on Cloudflare Workers (Web Crypto is available) and in Vitest (jsdom).
// Used only by party/game-room.ts. Kept in src/lib/util/ so Vitest can import it
// without the "cloudflare:workers" module ambient.

function randomIntBelow(n: number): number {
  if (n <= 0) throw new Error("n must be > 0");
  const buf = new Uint32Array(1);
  const max = Math.floor(0xffffffff / n) * n;
  let x: number;
  do {
    crypto.getRandomValues(buf);
    x = buf[0];
  } while (x >= max);
  return x % n;
}

/** In-place shuffle. Returns the same array for chaining. */
export function shuffle<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = randomIntBelow(i + 1);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}
```

---

### `party/game-room.ts` (service, event-driven, in-place extension)

**Analog:** `party/game-room.ts` (self — 275 lines). The existing `submitWord` (lines 116–141), `loadStarterPack` (lines 157–176), and `startGame` (lines 178–188) handlers are direct structural templates for the Phase 3 additions.

**Import pattern to extend** (lines 15–22):
```typescript
// EXISTING (lines 15–22)
import {
  ClientMessage,
  type Player,
  type RoomState,
  type WordEntry,
} from "../src/lib/protocol/messages.js";
import { STARTER_PACKS } from "../src/lib/util/starterPacks.js";
import { nanoid } from "nanoid";
```
**Extend to add `BoardCell` type + `shuffle`:**
```typescript
import {
  ClientMessage,
  type Player,
  type RoomState,
  type WordEntry,
  type BoardCell,
} from "../src/lib/protocol/messages.js";
import { STARTER_PACKS } from "../src/lib/util/starterPacks.js";
import { shuffle } from "../src/lib/util/shuffle.js";
import { deriveGridTier } from "../src/lib/util/gridTier.js";
import { nanoid } from "nanoid";
```

**Private-field declaration pattern** (lines 34–42, existing Map/Set/primitive declarations):
```typescript
// EXISTING (lines 34–42) — shape to mirror
#hostId: string | null = null;
#players = new Map<string, Player>();
#createdAt = 0;
#active = false;
#words = new Map<string, WordEntry>();
#phase: "lobby" | "playing" = "lobby";
#usedPacks = new Set<string>();
```
**Add two new fields** (directly below):
```typescript
#boards = new Map<string, BoardCell[]>();      // playerId → that player's cells
#marks = new Map<string, Set<string>>();       // playerId → set of marked cellIds
```

**Host-guard + word-count gate pattern (current `startGame`, lines 178–188) — REPLACE this whole case:**
```typescript
// EXISTING startGame case (lines 178–188) — to be replaced
case "startGame": {
  const connState = conn.state as { playerId?: string } | null;
  if (connState?.playerId !== this.#hostId) return;
  if (this.#words.size < 5) {
    conn.send(JSON.stringify({ type: "error", code: "not_enough_words" }));
    return;
  }
  this.#phase = "playing";
  this.broadcast(JSON.stringify({ type: "roomState", state: this.#snapshot() }));
  return;
}
```
**Replace with** (follows RESEARCH.md Pattern 2; note the **broadcast-first, per-connection-send-second** ordering per Pitfall 8):
```typescript
case "startGame": {
  const connState = conn.state as { playerId?: string } | null;
  if (connState?.playerId !== this.#hostId) return;
  if (this.#words.size < 5) {
    conn.send(JSON.stringify({ type: "error", code: "not_enough_words" }));
    return;
  }
  this.#phase = "playing";

  // 1. Phase flip FIRST so every client mounts <Board/> before boardAssigned arrives.
  //    (WS FIFO per connection guarantees actor sees gameStarted before their board.)
  this.broadcast(JSON.stringify({ type: "gameStarted" }));

  // 2. Per-connection private board delivery (never broadcast — BOAR-03).
  const wordPool = [...this.#words.values()];
  for (const c of this.getConnections()) {
    const s = c.state as { playerId?: string } | null;
    if (!s?.playerId) continue;                       // pre-hello connection — skip
    const cells = this.#buildBoardForPlayer(wordPool);
    this.#boards.set(s.playerId, cells);
    this.#marks.set(s.playerId, new Set());
    c.send(JSON.stringify({ type: "boardAssigned", cells }));
  }
  return;
}
```

**New `markWord` case** — insert in the `onMessage` switch alongside the other case blocks. Follow the same guard pattern as `removeWord` (lines 143–155) — playerId lookup, authorization, silent-drop on invalid:
```typescript
// EXISTING removeWord case (lines 143–155) — authorization + silent-on-invalid pattern
case "removeWord": {
  const { wordId } = result.output;
  const entry = this.#words.get(wordId);
  if (!entry) return; // idempotent
  const connState = conn.state as { playerId?: string } | null;
  if (entry.submittedBy !== connState?.playerId) {
    conn.send(JSON.stringify({ type: "error", code: "not_owner" }));
    return;
  }
  this.#words.delete(wordId);
  this.broadcast(JSON.stringify({ type: "wordRemoved", wordId }));
  return;
}
```
**New case to add:**
```typescript
case "markWord": {
  const connState = conn.state as { playerId?: string } | null;
  if (!connState?.playerId) return;
  if (this.#phase !== "playing") return;

  const myBoard = this.#boards.get(connState.playerId);
  const myMarks = this.#marks.get(connState.playerId);
  if (!myBoard || !myMarks) return;                     // not dealt yet — silent drop

  const { cellId } = result.output;
  const cell = myBoard.find((c) => c.cellId === cellId);
  if (!cell || cell.blank) return;                      // cellId not on my board OR blank — silent drop

  // Toggle (UI-SPEC: second tap unmarks)
  if (myMarks.has(cellId)) myMarks.delete(cellId);
  else myMarks.add(cellId);

  this.broadcast(JSON.stringify({
    type: "wordMarked",
    playerId: connState.playerId,
    markCount: myMarks.size,
  }));
  return;
}
```

**Board-build helper** — add as a private class method (place next to `#snapshot()` at lines 265–274):
```typescript
#buildBoardForPlayer(wordPool: WordEntry[]): BoardCell[] {
  const tier = deriveGridTier(wordPool.length);
  const cellCount = tier === "5x5" ? 25 : tier === "4x4" ? 16 : 9;

  // Copy-per-player (Pitfall 5: never reuse the shuffled array across players).
  const shuffled = shuffle([...wordPool]);
  const wordCells: BoardCell[] = shuffled.slice(0, cellCount).map((w) => ({
    cellId: nanoid(),
    wordId: w.wordId,
    text: w.text,
    blank: false,
  }));
  const blankCount = Math.max(0, cellCount - wordCells.length);
  const blankCells: BoardCell[] = Array.from({ length: blankCount }, () => ({
    cellId: nanoid(),
    wordId: null,
    text: null,
    blank: true,
  }));

  // Fill-tail then shuffle the combined array so blanks are uniformly distributed.
  // (RESEARCH.md Assumption A4 — this is mathematically equivalent to choosing a
  // random blanks subset.)
  return shuffle([...wordCells, ...blankCells]);
}
```

**`#snapshot()` method — DO NOT modify.** Board MUST NOT appear in `RoomState` (RESEARCH.md Anti-Patterns, CONTEXT.md `<code_context>`). Current lines 265–274 stay as-is.

---

### `src/lib/stores/room.svelte.ts` (store, event-driven, in-place extension)

**Analog:** `src/lib/stores/room.svelte.ts` (self — 120 lines). The `wordAdded` and `wordRemoved` message handlers (lines 82–89) and the `words`/`usedPacks` `$state` pair (lines 25–27) are direct templates.

**Import pattern to extend** (lines 3–9):
```typescript
// EXISTING (lines 3–9)
import {
  ServerMessage,
  PARTY_NAME as _PARTY_NAME,
  type RoomState,
  type WordEntry,
  type ClientMessage,
} from "$lib/protocol/messages";
```
**Extend to add `BoardCell`:**
```typescript
import {
  ServerMessage,
  PARTY_NAME as _PARTY_NAME,
  type RoomState,
  type WordEntry,
  type ClientMessage,
  type BoardCell,
} from "$lib/protocol/messages";
```

**`$state` declaration pattern** (lines 23–27, existing reactive store fields):
```typescript
// EXISTING (lines 23–27) — pattern to copy
let state = $state<RoomState | null>(null);
let status = $state<"connecting" | "open" | "reconnecting" | "closed">("connecting");
let words = $state<WordEntry[]>([]);
let usedPacks = $state<Set<string>>(new Set());
let lastError = $state<{ code: string; message?: string } | null>(null);
```
**Add three new fields** (directly below `lastError`):
```typescript
let board = $state<BoardCell[] | null>(null);
let playerMarks = $state<Record<string, number>>({});
let markedCellIds = $state<Set<string>>(new Set());        // MY marks only (optimistic)
```

**Message-handler switch-case pattern** (lines 62–90, existing cases) — mirror the `wordAdded`/`wordRemoved` style (immutable reassignment, never in-place mutation):
```typescript
// EXISTING wordAdded/wordRemoved cases (lines 82–89) — pattern to copy
case "wordAdded":
  if (!words.some((w) => w.wordId === msg.word.wordId)) {
    words = [...words, msg.word];
  }
  break;
case "wordRemoved":
  words = words.filter((w) => w.wordId !== msg.wordId);
  break;
```
**Add two new cases** in the switch (inside `ws.addEventListener("message", ...)`):
```typescript
case "boardAssigned":
  board = msg.cells;
  markedCellIds = new Set();                // fresh board → no marks yet
  break;
case "wordMarked":
  playerMarks = { ...playerMarks, [msg.playerId]: msg.markCount };
  break;
```
**CRITICAL (Pitfall 3):** reassigning `markedCellIds = new Set(...)` is required to trigger rune reactivity. Never call `.add()`/`.delete()` on the existing `Set`.

**Returned object extension pattern** (lines 93–119, existing getters + `send` + `disconnect`):
```typescript
// EXISTING return (lines 93–119) — pattern to copy
return {
  get state() { return state; },
  get status() { return status; },
  send(msg: ClientMessage) { ws.send(JSON.stringify(msg)); },
  get words() { return words; },
  get usedPacks() { return usedPacks; },
  get lastError() { return lastError; },
  clearError() { lastError = null; },
  disconnect() { ws.close(); connection.status = "closed"; },
};
```
**Extend return to expose board state + `toggleMark`:**
```typescript
return {
  // ...existing getters unchanged
  get board() { return board; },
  get playerMarks() { return playerMarks; },
  get markedCellIds() { return markedCellIds; },
  toggleMark(cellId: string) {
    // Optimistic flip — reassign Set (Pitfall 3)
    const next = new Set(markedCellIds);
    if (next.has(cellId)) next.delete(cellId);
    else next.add(cellId);
    markedCellIds = next;
    ws.send(JSON.stringify({ type: "markWord", cellId }));
  },
};
```

---

### `src/lib/components/Board.svelte` (component, NEW)

**Analog:** `src/lib/components/WordPool.svelte` (35 lines) — same role (section wrapper, typed props from protocol, keyed `{#each}` over a protocol-typed list, empty/loading state).

**`WordPool.svelte` structural template** (full file — copy the section/heading/empty-state/each pattern):
```svelte
<!-- src/lib/components/WordPool.svelte lines 1–34 — structural analog -->
<script lang="ts">
  import type { WordEntry } from "$lib/protocol/messages";
  import WordChip from "./WordChip.svelte";

  type WordPoolProps = {
    words: WordEntry[];
    playerId: string;
    onDelete: (wordId: string) => void;
  };
  let { words, playerId, onDelete }: WordPoolProps = $props();
</script>

<section class="flex flex-col gap-4">
  <h2 class="text-2xl font-semibold">Words ({words.length})</h2>
  {#if words.length === 0}
    <div class="py-6 text-center">
      <p class="text-[var(--color-ink-secondary)] font-semibold">No words yet</p>
      <p class="mt-1 text-sm text-[var(--color-ink-secondary)]">...</p>
    </div>
  {:else}
    <div class="flex flex-wrap gap-2">
      {#each words as entry (entry.wordId)}
        <WordChip word={entry.text} ... />
      {/each}
    </div>
  {/if}
</section>
```

**Full new file** (grid container for Phase 3 — follows RESEARCH.md Code Examples §Board.svelte with structure lifted from `WordPool.svelte`):
```svelte
<!-- src/lib/components/Board.svelte -->
<script lang="ts">
  import type { BoardCell as Cell } from "$lib/protocol/messages";
  import BoardCell from "./BoardCell.svelte";

  type BoardProps = {
    cells: Cell[] | null;
    markedCellIds: Set<string>;
    onToggleMark: (cellId: string) => void;
  };
  let { cells, markedCellIds, onToggleMark }: BoardProps = $props();

  // 9 → 3 cols, 16 → 4 cols, 25 → 5 cols. Default 3 while loading.
  const cols = $derived(
    cells == null ? 3 : cells.length === 25 ? 5 : cells.length === 16 ? 4 : 3
  );
</script>

<section class="flex flex-col gap-3">
  <p class="text-sm font-semibold text-[var(--color-ink-secondary)]">Your board</p>
  {#if cells == null}
    <div class="flex flex-col items-center justify-center py-10 gap-2">
      <p class="text-[var(--color-ink-secondary)] font-semibold">Dealing your board…</p>
      <p class="text-sm text-[var(--color-ink-secondary)]">
        Hang tight — we're shuffling the words.
      </p>
    </div>
  {:else}
    <div
      class="grid gap-2"
      style="grid-template-columns: repeat({cols}, minmax(44px, 1fr));"
    >
      {#each cells as cell (cell.cellId)}
        <BoardCell
          {cell}
          marked={markedCellIds.has(cell.cellId)}
          onToggle={() => onToggleMark(cell.cellId)}
        />
      {/each}
    </div>
  {/if}
</section>
```

---

### `src/lib/components/BoardCell.svelte` (component, NEW)

**Analog:** Primary — `src/lib/components/WordChip.svelte` (40 lines, the "word-on-surface tile with optional action" archetype already in the design system). Secondary — `src/lib/components/Button.svelte` (variant-class derivation via `$derived`) for marked/unmarked class toggling.

**`WordChip.svelte` — marked-like visual structure + interactivity** (lines 14–38):
```svelte
<!-- WordChip.svelte lines 14–38 — surface background + border + conditional inner button -->
<span
  class="inline-flex items-center gap-1 py-2 px-3 rounded-lg
    bg-[var(--color-surface)] border border-[var(--color-divider)]
    text-[var(--color-ink-primary)] text-base
    hover:border-[#3A3A48] transition-colors motion-reduce:transition-none"
>
  {word}
  {#if canDelete}
    <button
      onclick={onDelete}
      aria-label={`Remove "${word}"`}
      class="flex items-center justify-center
             min-h-11 min-w-11 ...
             active:scale-[0.92] transition-transform motion-reduce:transition-none
             focus-visible:outline-2 focus-visible:outline-offset-2
             focus-visible:outline-[var(--color-ink-secondary)]
             cursor-pointer"
    >
      <X size={14} />
    </button>
  {/if}
</span>
```

**`Button.svelte` — variant-class derivation** (lines 29–35):
```svelte
<!-- Button.svelte lines 29–35 — $derived variant pattern for marked vs unmarked -->
const variantClasses = $derived(
  variant === "primary"
    ? "bg-[var(--color-accent)] text-[var(--color-ink-inverse)] ..."
    : variant === "secondary"
      ? "bg-[var(--color-surface)] border border-[var(--color-divider)] ..."
      : "..."
);
```

**Full new file** — merges the two analogs and adheres to CONTEXT.md D-12/D-13/D-14 (three visual states) and Pitfall 6 (blank cells are `<div>`, not `<button>`):
```svelte
<!-- src/lib/components/BoardCell.svelte -->
<script lang="ts">
  import type { BoardCell as Cell } from "$lib/protocol/messages";

  type BoardCellProps = {
    cell: Cell;
    marked: boolean;
    onToggle?: () => void;
  };
  let { cell, marked, onToggle }: BoardCellProps = $props();

  function handleClick() {
    if (cell.blank) return;          // defensive — blanks have no onclick anyway
    onToggle?.();
  }
</script>

{#if cell.blank}
  <!-- D-14: faint dashed/dimmed border, no text, non-interactive -->
  <div
    class="aspect-square min-h-11 min-w-11 rounded-lg
           bg-[var(--color-surface)]
           border border-dashed border-[var(--color-divider)]/40"
    aria-hidden="true"
    tabindex="-1"
  ></div>
{:else}
  <!-- D-12 (unmarked) + D-13 (marked) via $derived class swap -->
  <button
    type="button"
    onclick={handleClick}
    aria-label={marked
      ? `${cell.text}. Marked. Tap to unmark.`
      : `${cell.text}. Tap to mark.`}
    aria-pressed={marked}
    class={[
      "aspect-square min-h-11 min-w-11 rounded-lg font-semibold text-sm leading-tight",
      "transition-[background-color,color,border-color,transform] duration-[120ms] ease-out",
      "motion-reduce:transition-none",
      "active:scale-[0.97]",
      "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-ink-secondary)]",
      "cursor-pointer",
      marked
        ? "bg-[var(--color-accent)] text-[var(--color-ink-inverse)] border border-[var(--color-accent)]"
        : "bg-[var(--color-surface)] text-[var(--color-ink-primary)] border border-[var(--color-divider)] hover:border-[#3A3A48]",
    ].join(" ")}
  >
    <span class="block px-[6px] break-words hyphens-auto">{cell.text}</span>
  </button>
{/if}
```

---

### `src/lib/components/PlayerRow.svelte` (component, in-place extension)

**Analog:** `src/lib/components/PlayerRow.svelte` (self — 50 lines). Conditional-host-badge pattern at lines 40–49 is the direct template for the conditional mark-count badge.

**Existing host-badge conditional** (lines 40–49) — structural template to follow:
```svelte
<!-- EXISTING lines 40–49 — conditional trailing slot pattern to copy -->
{#if player.isHost}
  <Badge>
    {#snippet icon()}
      <Crown size={12} />
    {/snippet}
    {#snippet children()}
      Host
    {/snippet}
  </Badge>
{/if}
```

**Existing props type** (lines 8–16) — extend:
```svelte
<!-- EXISTING lines 8–16 -->
type PlayerRowProps = {
  player: {
    playerId: string;
    displayName: string;
    isHost: boolean;
  };
};
let { player }: PlayerRowProps = $props();
```
**Extend to:**
```svelte
type PlayerRowProps = {
  player: {
    playerId: string;
    displayName: string;
    isHost: boolean;
  };
  markCount?: number;                // Phase 3 — defaults to 0 (backwards compatible)
};
let { player, markCount = 0 }: PlayerRowProps = $props();
```

**Add conditional mark-count pill after the existing host-badge block** (new siblings of the Host `{#if}`, inside the same `<li>`):
```svelte
{#if markCount > 0}
  <span
    class="inline-flex items-center h-5 px-2 rounded-full
           bg-[var(--color-accent)] text-[var(--color-ink-inverse)]
           text-sm font-semibold tabular-nums"
    aria-label={`${markCount} ${markCount === 1 ? "mark" : "marks"}`}
  >
    {markCount}
  </span>
{/if}
```

**Backwards-compat:** All Phase 1/2 callers (`+page.svelte` line 195) pass only `{player}` — default `markCount = 0` keeps them rendering unchanged.

---

### `src/routes/room/[code]/+page.svelte` (page component, in-place extension)

**Analog:** `src/routes/room/[code]/+page.svelte` (self — 267 lines). Lines 141–149 (the current `gameStarted` stub) are the direct replacement site; lines 193–198 (the Players section) are the template for updating `<PlayerRow>` with `markCount`.

**Existing `gameStarted` stub** (lines 141–149) — REPLACE:
```svelte
<!-- EXISTING lines 141–149 — to be replaced -->
{#if gameStarted}
  <div class="flex flex-col items-center justify-center min-h-[60vh] gap-4">
    <h1 class="font-display text-[40px] sm:text-[56px] font-semibold text-[var(--color-accent)]">
      Game on!
    </h1>
    <p class="text-[var(--color-ink-secondary)]">
      Board generation coming in the next phase.
    </p>
  </div>
{:else}
  ...lobby...
{/if}
```

**Replace with** (follows CONTEXT.md D-01/D-02 — same route, conditional render, WS stays alive):
```svelte
{#if gameStarted}
  <section class="flex flex-col gap-4">
    <h2 class="text-2xl font-semibold">Players · {playerCount}</h2>
    <ul class="flex flex-col gap-2">
      {#each roomState?.players ?? [] as player (player.playerId)}
        <PlayerRow
          {player}
          markCount={store?.playerMarks?.[player.playerId] ?? 0}
        />
      {/each}
    </ul>
  </section>
  <Board
    cells={store?.board ?? null}
    markedCellIds={store?.markedCellIds ?? new Set()}
    onToggleMark={(id) => store?.toggleMark(id)}
  />
{:else}
  <!-- existing lobby block (lines 151–264) unchanged -->
{/if}
```

**`RoomStore` interface extension** (lines 26–35) — add three Phase 3 getters + the `toggleMark` method to match the store return:
```svelte
<!-- EXISTING lines 26–35 — extend -->
interface RoomStore {
  state: RoomState | null;
  status: "connecting" | "open" | "reconnecting" | "closed";
  words: WordEntry[];
  usedPacks: Set<string>;
  lastError: { code: string; message?: string } | null;
  send(msg: ClientMessage): void;
  clearError(): void;
  disconnect(): void;
  // ADD:
  board: BoardCell[] | null;
  playerMarks: Record<string, number>;
  markedCellIds: Set<string>;
  toggleMark(cellId: string): void;
}
```

**Import additions** (line 4–11):
```svelte
import Board from "$lib/components/Board.svelte";      // NEW
import type { RoomState, WordEntry, ClientMessage, BoardCell } from "$lib/protocol/messages";
```

---

### `tests/unit/shuffle.test.ts` (test, NEW)

**Analog:** `tests/unit/roomCode.test.ts` (pure utility — import, describe, direct assertions). Also `tests/unit/gridTier.test.ts` for the exhaustive-boundary describe style.

**Follow `roomCode.test.ts`-style import + describe + immediate assertions. No mocks needed** (`crypto.getRandomValues` is available in Vitest jsdom environment). Tests cover:
- Identity: empty array → empty, single element → same element
- Preservation: shuffled array is a permutation of input (same multiset)
- Randomness property (statistical): 1000 runs of `shuffle([1..5])` — each element appears at each index with frequency within ~3σ of uniform (≈ 200 ± 40)
- Unbiasedness smoke: `randomIntBelow(n)` returns values in `[0, n)` for a loop of 10000 calls, `n=7`

**Example scaffold (abbreviated, follows gridTier.test.ts style):**
```typescript
import { describe, it, expect } from "vitest";
import { shuffle } from "../../src/lib/util/shuffle";

describe("shuffle", () => {
  it("returns empty array for empty input", () => {
    expect(shuffle([])).toEqual([]);
  });
  it("preserves multiset (all original elements retained)", () => {
    const input = [1, 2, 3, 4, 5];
    const out = shuffle([...input]);
    expect(out.slice().sort()).toEqual([1, 2, 3, 4, 5]);
  });
  it("is statistically uniform over 1000 runs", () => {
    const counts: number[][] = Array.from({ length: 5 }, () => [0, 0, 0, 0, 0]);
    for (let i = 0; i < 1000; i++) {
      const arr = shuffle([0, 1, 2, 3, 4]);
      arr.forEach((v, idx) => counts[v][idx]++);
    }
    // Each cell should be ~200 occurrences; allow ±80 (4σ) for test stability
    counts.flat().forEach((c) => {
      expect(c).toBeGreaterThan(120);
      expect(c).toBeLessThan(280);
    });
  });
});
```

---

### `tests/unit/game-room.test.ts` (test, in-place extension)

**Analog:** `tests/unit/game-room.test.ts` (self — 561 lines). The "GameRoom — word pool (Phase 2)" describe block (lines 334–561) is the direct template — reuses `makeConn`, `FakeConn`, `joinPlayer`, `getBroadcast` helpers.

**Existing Phase-2 `beforeEach` + `joinPlayer` helper** (lines 334–349) — direct template:
```typescript
// EXISTING lines 334–349 — pattern to copy for Phase 3 describe
describe("GameRoom — word pool (Phase 2)", () => {
  let room: InstanceType<typeof GameRoom>;

  beforeEach(() => {
    room = new GameRoom({} as never, {} as never);
    vi.clearAllMocks();
  });

  function joinPlayer(conn: FakeConn, playerId: string, displayName: string) {
    room.onMessage(conn as never, JSON.stringify({ type: "hello", playerId, displayName }));
    vi.clearAllMocks();
  }

  function getBroadcast() {
    return (room as unknown as { broadcast: ReturnType<typeof vi.fn> }).broadcast;
  }
  // ...tests...
});
```

**Existing `startGame` test pattern** (lines 489–523) — direct template for the new board-assigned assertion style:
```typescript
// EXISTING lines 508–523 — startGame success case; Phase 3 extends this
it("startGame with 5 words flips phase to playing and broadcasts roomState", () => {
  const conn = makeConn("c1");
  joinPlayer(conn, "p1", "Alice");
  for (let i = 0; i < 5; i++) {
    room.onMessage(conn as never, JSON.stringify({ type: "submitWord", text: `Word${i}` }));
  }
  vi.clearAllMocks();
  room.onMessage(conn as never, JSON.stringify({ type: "startGame" }));

  expect(getBroadcast()).toHaveBeenCalledOnce();
  const msg = JSON.parse(getBroadcast().mock.calls[0][0]);
  expect(msg.type).toBe("roomState");
  expect(msg.state.phase).toBe("playing");
});
```

**New Phase 3 describe block — add at end of file.** **IMPORTANT:** Phase 3 changes `startGame` semantics. The two Phase 2 tests at lines 508–523 and 525–539 assert `broadcast` is called with `roomState` — after Phase 3, `startGame` broadcasts `gameStarted` first instead, then per-`conn.send` for boards. Those two Phase 2 tests must be updated accordingly (listed in VALIDATION.md).

To test the per-connection `boardAssigned` dispatch, the test harness needs to stub `getConnections()` on the `FakeServer` — add this override in the new describe block's `beforeEach` (mock only for Phase 3 tests, don't disturb Phase 2):
```typescript
describe("GameRoom — board & marks (Phase 3)", () => {
  let room: InstanceType<typeof GameRoom>;
  let conns: FakeConn[];

  beforeEach(() => {
    room = new GameRoom({} as never, {} as never);
    conns = [];
    // Stub getConnections() to return the local conns array
    (room as unknown as { getConnections: () => FakeConn[] }).getConnections = () => conns;
    vi.clearAllMocks();
  });

  function joinPlayer(conn: FakeConn, playerId: string, displayName: string) {
    conns.push(conn);
    room.onMessage(conn as never, JSON.stringify({ type: "hello", playerId, displayName }));
    vi.clearAllMocks();
  }

  function addWords(conn: FakeConn, n: number) {
    for (let i = 0; i < n; i++) {
      room.onMessage(conn as never, JSON.stringify({ type: "submitWord", text: `Word${i}` }));
    }
  }

  function getBroadcast() {
    return (room as unknown as { broadcast: ReturnType<typeof vi.fn> }).broadcast;
  }

  it("startGame broadcasts gameStarted first, then sends per-connection boardAssigned (BOAR-01/03)", () => {
    const host = makeConn("c1");
    const peer = makeConn("c2");
    joinPlayer(host, "p1", "Alice");
    joinPlayer(peer, "p2", "Bob");
    addWords(host, 5);
    vi.clearAllMocks();
    host._sent.length = 0; peer._sent.length = 0;

    room.onMessage(host as never, JSON.stringify({ type: "startGame" }));

    // 1. Broadcast fired ONCE with gameStarted (NOT roomState, NOT boardAssigned)
    expect(getBroadcast()).toHaveBeenCalledOnce();
    expect(JSON.parse(getBroadcast().mock.calls[0][0]).type).toBe("gameStarted");

    // 2. Each connection got ITS OWN boardAssigned via conn.send
    const hostBoard = JSON.parse(host._sent.find((m) => JSON.parse(m).type === "boardAssigned")!);
    const peerBoard = JSON.parse(peer._sent.find((m) => JSON.parse(m).type === "boardAssigned")!);
    expect(hostBoard.type).toBe("boardAssigned");
    expect(peerBoard.type).toBe("boardAssigned");
    // Boards have different cellIds (per-player nanoid)
    expect(hostBoard.cells[0].cellId).not.toBe(peerBoard.cells[0].cellId);
  });

  it("board has correct cellCount with blanks filling the remainder (BOAR-04)", () => { ... });
  it("markWord by owner toggles and broadcasts wordMarked (BOAR-05/06)", () => { ... });
  it("markWord second time unmarks (idempotent toggle)", () => { ... });
  it("markWord with a blank cellId is silently dropped", () => { ... });
  it("markWord with a cellId not on the player's board is silently dropped", () => { ... });
  it("wordMarked broadcast contains only playerId and markCount (no layout)", () => { ... });
});
```

---

### `tests/unit/protocol.test.ts` (test, in-place extension)

**Analog:** `tests/unit/protocol.test.ts` (self — 233 lines). Existing `submitWord`/`loadStarterPack`/`startGame` tests in `describe("ClientMessage")` (lines 60–91) and `wordAdded`/`wordRemoved`/`gameStarted` tests in `describe("ServerMessage")` (lines 150–164) are direct templates. `WordEntry schema` block (lines 227–232) is the direct template for a new `BoardCell schema` block.

**Existing `submitWord` test pattern** (lines 60–75) — template to copy:
```typescript
// EXISTING lines 60–75 — the minimal-/boundary-/reject- triple
it("accepts submitWord with text 1–30 chars", () => {
  const r = v.safeParse(ClientMessage, { type: "submitWord", text: "Synergy" });
  expect(r.success).toBe(true);
});
it("rejects submitWord with empty text", () => { ... });
it("rejects submitWord with text > 30 chars", () => { ... });
it("accepts submitWord with exactly 30 chars", () => { ... });
```

**Existing `wordAdded` test pattern** (lines 150–156) — template for `boardAssigned`:
```typescript
// EXISTING lines 150–156 — object-property variant pattern
it("accepts wordAdded message", () => {
  const r = v.safeParse(ServerMessage, {
    type: "wordAdded",
    word: { wordId: "w1", text: "Synergy", submittedBy: "p1" },
  });
  expect(r.success).toBe(true);
});
```

**Existing `WordEntry schema` describe** (lines 227–232) — template for `BoardCell schema`:
```typescript
describe("WordEntry schema", () => {
  it("accepts valid WordEntry", () => {
    const r = v.safeParse(WordEntry, { wordId: "w1", text: "Synergy", submittedBy: "p1" });
    expect(r.success).toBe(true);
  });
});
```

**New tests to append:**
- In `describe("ClientMessage")`: `accepts markWord with cellId` + `rejects markWord with empty cellId`
- In `describe("ServerMessage")`: `accepts boardAssigned with cells array` + `accepts wordMarked with playerId/markCount` + `rejects wordMarked with negative markCount`
- New `describe("BoardCell schema")`: accepts word cell `{ cellId, wordId, text, blank: false }`; accepts blank cell `{ cellId, wordId: null, text: null, blank: true }`; rejects missing `blank`.

---

### `tests/unit/room-store.test.ts` (test, in-place extension)

**Analog:** `tests/unit/room-store.test.ts` (self — 200 lines). The `wordAdded`/`wordRemoved` handler tests (implicit via `roomState`) pattern at lines 101–172 is the direct template. `MockPartySocket` hoisted helper (lines 4–40) and `ws.emit("message", {...})` pattern is reused verbatim.

**Existing "populates state when roomState message is received" test** (lines 101–122) — direct template for new `boardAssigned` and `wordMarked` handler tests:
```typescript
// EXISTING lines 101–122 — create store → emit open → emit message → assert store field
it("populates state when roomState message is received", () => {
  const store = createRoomStore("ABC123");
  const ws = getLastInstance()!;
  ws.emit("open", {});

  const roomState = { code: "ABC123", phase: "lobby", hostId: "test-player-id", players: [...], words: [], usedPacks: [] };
  ws.emit("message", { data: JSON.stringify({ type: "roomState", state: roomState }) });

  expect(store.state).not.toBeNull();
  expect(store.state!.code).toBe("ABC123");
});
```

**New tests to append:**
```typescript
it("sets board and clears markedCellIds when boardAssigned is received", () => {
  const store = createRoomStore("ABC123");
  const ws = getLastInstance()!;
  ws.emit("open", {});

  const cells = [
    { cellId: "c1", wordId: "w1", text: "Synergy", blank: false },
    { cellId: "c2", wordId: null, text: null, blank: true },
  ];
  ws.emit("message", { data: JSON.stringify({ type: "boardAssigned", cells }) });

  expect(store.board).toEqual(cells);
  expect(store.markedCellIds.size).toBe(0);
});

it("updates playerMarks map when wordMarked is received", () => {
  const store = createRoomStore("ABC123");
  const ws = getLastInstance()!;
  ws.emit("open", {});

  ws.emit("message", { data: JSON.stringify({ type: "wordMarked", playerId: "p1", markCount: 3 }) });

  expect(store.playerMarks["p1"]).toBe(3);
});

it("toggleMark optimistically flips markedCellIds and sends markWord", () => {
  const store = createRoomStore("ABC123");
  const ws = getLastInstance()!;
  ws.emit("open", {});
  ws.lastSent = null;

  store.toggleMark("c1");
  expect(store.markedCellIds.has("c1")).toBe(true);
  expect(JSON.parse(ws.lastSent!)).toEqual({ type: "markWord", cellId: "c1" });

  store.toggleMark("c1");
  expect(store.markedCellIds.has("c1")).toBe(false);
});
```

---

### `tests/e2e/board-mark.spec.ts` (test, NEW)

**Analog:** `e2e/phase2-lobby.spec.ts` (80+ lines) — same two-browser Playwright flow. The `createRoom()` and `joinRoom()` helpers at lines 3–17 are reusable verbatim.

**Existing `createRoom` / `joinRoom` helpers** (lines 3–17) — copy to the new spec:
```typescript
// e2e/phase2-lobby.spec.ts lines 3–17 — reusable helpers
async function createRoom(page, name) {
  await page.goto("/");
  await page.getByRole("button", { name: "Create a game" }).click();
  await page.getByLabel("Your name").fill(name);
  await page.getByRole("button", { name: /Create game/ }).click();
  await page.waitForURL(/\/room\/[A-Z2-9]{6}$/);
  return page.url().split("/").pop()!;
}

async function joinRoom(page, code, name) {
  await page.goto(`/join/${code}`);
  await page.getByLabel("Your name").fill(name);
  await page.getByRole("button", { name: /Join game/ }).click();
  await page.waitForURL(`**/room/${code}`);
}
```

**Existing "word submission appears in both browsers" test structure** (lines 47–69) — template for the two-browser mark test:
```typescript
// e2e/phase2-lobby.spec.ts lines 47–69 — two-context Playwright pattern
test("Phase 2: word submission appears in both browsers", async ({ browser }) => {
  const ctxA = await browser.newContext();
  const ctxB = await browser.newContext();
  const a = await ctxA.newPage();
  const b = await ctxB.newPage();

  const code = await createRoom(a, "Host");
  await joinRoom(b, code, "Player2");
  await expect(a.getByText("Players · 2")).toBeVisible({ timeout: 5000 });

  // ... action + assertion on both pages ...

  await ctxA.close();
  await ctxB.close();
});
```

**New Phase 3 e2e spec scaffold:**
```typescript
import { test, expect } from "@playwright/test";
// reuse createRoom / joinRoom from phase2-lobby.spec.ts (or extract to e2e/helpers.ts)

test("Phase 3: marking a cell updates peer's mark-count badge within 1s (BOAR-05/06)", async ({ browser }) => {
  const ctxA = await browser.newContext();
  const ctxB = await browser.newContext();
  const a = await ctxA.newPage();
  const b = await ctxB.newPage();

  const code = await createRoom(a, "Host");
  await joinRoom(b, code, "Player2");
  await expect(a.getByText("Players · 2")).toBeVisible({ timeout: 5000 });

  // Seed 5 words + start
  await a.getByPlaceholder("Add a buzzword…").fill("Synergy");
  await a.getByPlaceholder("Add a buzzword…").press("Enter");
  for (const w of ["Leverage", "Alignment", "Bandwidth", "Holistic"]) {
    await a.getByPlaceholder("Add a buzzword…").fill(w);
    await a.getByPlaceholder("Add a buzzword…").press("Enter");
  }
  await a.getByRole("button", { name: /Start Game/ }).click();

  // Both transition to the board view
  await expect(a.getByText("Your board")).toBeVisible({ timeout: 3000 });
  await expect(b.getByText("Your board")).toBeVisible({ timeout: 3000 });

  // A marks the first word cell (finds a button cell — blanks are divs, not buttons)
  const firstCell = a.locator('button[aria-label*="Tap to mark"]').first();
  const cellText = await firstCell.textContent();
  await firstCell.click();

  // A's own cell shows marked state (aria-pressed=true)
  await expect(firstCell).toHaveAttribute("aria-pressed", "true");

  // B sees A's mark count = 1 next to A's name within 1s
  await expect(b.getByLabel(/1 mark/).first()).toBeVisible({ timeout: 1000 });

  await ctxA.close();
  await ctxB.close();
});
```

---

## Shared Patterns

### Svelte 5 `$props()` + typed protocol imports

**Source:** `src/lib/components/PlayerRow.svelte` (lines 1–19), `src/lib/components/WordPool.svelte` (lines 1–11), `src/lib/components/WordChip.svelte` (lines 1–11)
**Apply to:** `Board.svelte`, `BoardCell.svelte` (new); `PlayerRow.svelte` (extension)

```svelte
<script lang="ts">
  import type { SomeType } from "$lib/protocol/messages";
  type ComponentProps = { /* fields */ };
  let { field, optional = defaultValue }: ComponentProps = $props();
  const derivedValue = $derived(fn(field));
</script>
```

### Design-token Tailwind classes (from `src/app.css @theme`)

**Source:** `src/app.css` (lines 3–15), used throughout every existing component
**Apply to:** `Board.svelte`, `BoardCell.svelte`, `PlayerRow.svelte` mark badge

```
bg-[var(--color-bg)]              /* page background #0F0F14 */
bg-[var(--color-surface)]         /* cell + card background #1A1A23 */
bg-[var(--color-accent)]          /* marked cell + mark badge #F5D547 */
text-[var(--color-ink-primary)]   /* default white text #F5F5F7 */
text-[var(--color-ink-secondary)] /* muted label text #A1A1AA */
text-[var(--color-ink-inverse)]   /* dark text on accent #0F0F14 */
border-[var(--color-divider)]     /* subtle border #2A2A36 */
hover:border-[#3A3A48]            /* hover brightening (not a token — hardcoded) */
min-h-11 min-w-11                 /* 44px tap-target floor (BOAR-07) */
focus-visible:outline-2 focus-visible:outline-offset-2
  focus-visible:outline-[var(--color-ink-secondary)]
motion-reduce:transition-none     /* prefers-reduced-motion respect */
```

### Svelte 5 `$state<Set>` — reassign, never mutate (Pitfall 3)

**Source:** `src/lib/stores/room.svelte.ts` (line 66: `usedPacks = new Set(msg.state.usedPacks ?? []);`) — already uses the reassignment idiom for Set state
**Apply to:** `markedCellIds` in `room.svelte.ts` (Phase 3) — ANY toggle must reassign:

```typescript
// CORRECT — reassignment triggers rune reactivity
const next = new Set(markedCellIds);
if (next.has(cellId)) next.delete(cellId);
else next.add(cellId);
markedCellIds = next;

// WRONG — in-place mutation does not fire reactivity
markedCellIds.add(cellId);  // ❌ UI won't re-render
```

### Server-side WS: Valibot-guard → switch-case → broadcast vs. conn.send

**Source:** `party/game-room.ts` (lines 56–71 — the guard; lines 73–189 — the switch)
**Apply to:** all new cases (`markWord`) and modified cases (`startGame`) in `party/game-room.ts`

```typescript
onMessage(conn: Connection, raw: string | ArrayBuffer) {
  let parsed: unknown;
  try { parsed = JSON.parse(raw as string); }
  catch { conn.send(JSON.stringify({ type: "error", code: "bad_message" })); return; }

  const result = v.safeParse(ClientMessage, parsed);
  if (!result.success) { conn.send(JSON.stringify({ type: "error", code: "bad_message" })); return; }

  switch (result.output.type) {
    case "markWord": { /* per-player validation → conn-owner mutation → broadcast summary */ }
  }
}
```

**Primitive choice rule (RESEARCH.md §Anti-Patterns):**
- `this.broadcast(JSON.stringify(...))` — for events every player should see (phase flips, `wordMarked` count, `playerJoined/Left`)
- `conn.send(JSON.stringify(...))` inside `for (const c of this.getConnections())` — for per-player private payloads (`boardAssigned`)
- `conn.send(...)` on the originating `conn` only — for direct responses (`error`, `pong`)

### Host-only guard pattern

**Source:** `party/game-room.ts` lines 158–159 (`loadStarterPack`), 179–180 (`startGame`)
**Apply to:** `startGame` replacement (unchanged guard, new body)

```typescript
const connState = conn.state as { playerId?: string } | null;
if (connState?.playerId !== this.#hostId) return;   // silent-ignore for non-host
```

### Test harness — DO vitest pattern

**Source:** `tests/unit/game-room.test.ts` lines 15–87 (`makeConn`, `FakeConn`, `vi.mock("partyserver")` with `FakeServer`)
**Apply to:** new Phase 3 describe block in `game-room.test.ts`. **Extension needed:** stub `getConnections()` on the instance to return the harness's `conns` array (the PartyServer `Server` base class provides it at runtime but `FakeServer` does not).

```typescript
(room as unknown as { getConnections: () => FakeConn[] }).getConnections = () => conns;
```

### `$effect` for cross-store error surfacing (existing pattern, informational)

**Source:** `src/routes/room/[code]/+page.svelte` (lines 128–136 — watches `store.lastError`)
**Not required for Phase 3** — mark failures are server-side silent drops per UI-SPEC. No `$effect` needed in `+page.svelte` for Phase 3.

---

## No Analog Found

All Phase 3 files have a concrete analog. None require RESEARCH.md seed-patterns in lieu of a codebase template.

| File | Reason |
|------|--------|
| n/a | Every new file maps to an existing Phase 1/2 component or utility with the same role/data-flow shape. |

---

## Metadata

**Analog search scope:**
- `/Users/christianmoore/ai/bs-bingo/src/lib/components/` (10 components)
- `/Users/christianmoore/ai/bs-bingo/src/lib/util/` (5 utilities)
- `/Users/christianmoore/ai/bs-bingo/src/lib/stores/` (1 store)
- `/Users/christianmoore/ai/bs-bingo/src/lib/protocol/` (1 protocol)
- `/Users/christianmoore/ai/bs-bingo/src/routes/` (current pages)
- `/Users/christianmoore/ai/bs-bingo/party/` (1 DO)
- `/Users/christianmoore/ai/bs-bingo/tests/unit/` (9 unit suites)
- `/Users/christianmoore/ai/bs-bingo/e2e/` (6 specs)

**Files read directly for pattern extraction:** 15
- `src/lib/protocol/messages.ts`
- `src/lib/stores/room.svelte.ts`
- `party/game-room.ts`
- `src/routes/room/[code]/+page.svelte`
- `src/lib/components/PlayerRow.svelte`
- `src/lib/components/WordPool.svelte`
- `src/lib/components/WordChip.svelte`
- `src/lib/components/Button.svelte`
- `src/lib/components/Badge.svelte`
- `src/lib/util/gridTier.ts`
- `src/lib/util/roomCode.ts`
- `src/app.css`
- `tests/unit/game-room.test.ts`
- `tests/unit/protocol.test.ts`
- `tests/unit/room-store.test.ts`
- `e2e/phase2-lobby.spec.ts`

**Pattern extraction date:** 2026-04-17
