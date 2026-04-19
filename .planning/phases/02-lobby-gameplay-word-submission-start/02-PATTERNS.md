# Phase 2: Lobby Gameplay — Word Submission & Start - Pattern Map

**Mapped:** 2026-04-17
**Files analyzed:** 8 (new/modified files in this phase)
**Analogs found:** 8 / 8 — all files are extensions of Phase 1 codebase; exact analogs exist

---

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `src/lib/protocol/messages.ts` | model | — | `src/lib/protocol/messages.ts` (self) | exact (in-place extension) |
| `src/lib/stores/room.svelte.ts` | store | event-driven | `src/lib/stores/room.svelte.ts` (self) | exact (in-place extension) |
| `party/game-room.ts` | service | event-driven | `party/game-room.ts` (self) | exact (in-place extension) |
| `src/lib/util/starterPacks.ts` | utility | — | `src/lib/util/roomCode.ts` | role-match |
| `src/lib/components/WordChip.svelte` | component | — | `src/lib/components/Badge.svelte` | role-match (chip-style visual, conditional action) |
| `src/lib/components/WordPool.svelte` | component | event-driven | `src/routes/room/[code]/+page.svelte` | role-match (section with each-keyed list) |
| `src/lib/components/PackPills.svelte` | component | request-response | `src/lib/components/Button.svelte` + `PlayerRow.svelte` | role-match (conditional rendering + onclick) |
| `src/lib/components/GridProgress.svelte` | component | — | `src/lib/components/PlayerRow.svelte` | role-match ($derived display logic) |
| `src/lib/components/TextInput.svelte` | component | — | `src/lib/components/TextInput.svelte` (self) | exact (in-place extension, add `shake` prop) |
| `src/routes/room/[code]/+page.svelte` | component | event-driven | `src/routes/room/[code]/+page.svelte` (self) | exact (in-place extension) |
| `tests/unit/game-room.test.ts` | test | — | `tests/unit/game-room.test.ts` (self) | exact (extend existing describe block) |
| `tests/unit/protocol.test.ts` | test | — | `tests/unit/protocol.test.ts` (self) | exact (extend existing describe block) |
| `src/lib/util/gridTier.ts` | utility | — | `src/lib/util/roomCode.ts` | role-match (pure function utility) |

---

## Pattern Assignments

### `src/lib/protocol/messages.ts` (model, in-place extension)

**Analog:** `src/lib/protocol/messages.ts` (lines 1–41, current state)

**Current state** — the full file as it exists:
```typescript
// src/lib/protocol/messages.ts lines 1–41
import * as v from "valibot";

export const Player = v.object({ ... });
export const RoomState = v.object({
  code: v.string(),
  phase: v.literal("lobby"),   // <-- MUST expand to union
  hostId: v.nullable(v.string()),
  players: v.array(Player),
  // <-- words array MISSING — add here
});
export const ClientMessage = v.variant("type", [
  v.object({ type: v.literal("hello"), ... }),
  v.object({ type: v.literal("ping") }),
  // <-- 4 new variants go here
]);
export const ServerMessage = v.variant("type", [
  v.object({ type: v.literal("roomState"), state: RoomState }),
  v.object({ type: v.literal("playerJoined"), player: Player }),
  v.object({ type: v.literal("playerLeft"), playerId: v.string() }),
  v.object({ type: v.literal("error"), code: v.string(), message: v.optional(v.string()) }),
  v.object({ type: v.literal("pong") }),
  // <-- 3 new variants go here
]);
```

**New types to add** (insert above `RoomState`):
```typescript
// New shared type — used by RoomState snapshot and delta messages
export const WordEntry = v.object({
  wordId: v.string(),
  text: v.string(),
  submittedBy: v.string(), // playerId (host's id for pack words — see Pitfall 3 in RESEARCH.md)
});
export type WordEntry = v.InferOutput<typeof WordEntry>;
```

**`RoomState` changes** — replace `phase` and add `words` and `usedPacks`:
```typescript
export const RoomState = v.object({
  code: v.string(),
  phase: v.union([v.literal("lobby"), v.literal("playing")]),  // CRITICAL: expand from literal
  hostId: v.nullable(v.string()),
  players: v.array(Player),
  words: v.array(WordEntry),           // NEW
  usedPacks: v.array(v.string()),      // NEW — expose DO's #usedPacks for refresh recovery
});
```

**New `ClientMessage` variants** (append inside the `v.variant` array, lines 19–26):
```typescript
  v.object({
    type: v.literal("submitWord"),
    text: v.pipe(v.string(), v.minLength(1), v.maxLength(30)),
  }),
  v.object({
    type: v.literal("removeWord"),
    wordId: v.string(),
  }),
  v.object({
    type: v.literal("loadStarterPack"),
    pack: v.picklist(["corporate-classics", "agile", "sales"]),
  }),
  v.object({ type: v.literal("startGame") }),
```

**New `ServerMessage` variants** (append inside the `v.variant` array, lines 29–36):
```typescript
  v.object({ type: v.literal("wordAdded"), word: WordEntry }),
  v.object({ type: v.literal("wordRemoved"), wordId: v.string() }),
  v.object({ type: v.literal("gameStarted") }), // Phase 3 acts on this
```

**Import pattern** (line 1 — unchanged, copy as-is):
```typescript
import * as v from "valibot";
```

---

### `src/lib/stores/room.svelte.ts` (store, event-driven, in-place extension)

**Analog:** `src/lib/stores/room.svelte.ts` (full file, 83 lines)

**Existing `$state` declarations pattern** (lines 17–18) — copy and add below:
```typescript
// Existing:
let state = $state<RoomState | null>(null);
let status = $state<"connecting" | "open" | "reconnecting" | "closed">("connecting");

// ADD after existing declarations:
let words = $state<WordEntry[]>([]);
let usedPacks = $state<Set<string>>(new Set());
```

**Existing message handler switch** (lines 53–68) — extend with new cases:
```typescript
// Existing switch (lines 53–68):
switch (msg.type) {
  case "roomState":
    state = msg.state;
    // ADD: hydrate word pool on connect/reconnect
    words = msg.state.words ?? [];
    usedPacks = new Set(msg.state.usedPacks ?? []);
    break;
  case "playerJoined":
    if (state && !state.players.some((p) => p.playerId === msg.player.playerId)) {
      state.players = [...state.players, msg.player];
    }
    break;
  case "playerLeft":
    if (state) state.players = state.players.filter((p) => p.playerId !== msg.playerId);
    break;
  case "error":
    console.warn("Server error:", msg.code, msg.message);
    break;

  // ADD new cases:
  case "wordAdded":
    if (!words.some((w) => w.wordId === msg.word.wordId)) {
      words = [...words, msg.word];
    }
    break;
  case "wordRemoved":
    words = words.filter((w) => w.wordId !== msg.wordId);
    break;
}
```

**Existing store return** (lines 71–83) — extend return object:
```typescript
// Existing return:
return {
  get state() { return state; },
  get status() { return status; },
  disconnect() { ws.close(); connection.status = "closed"; },

  // ADD: typed send wrapper (Phase 2 components need to send messages)
  // NOTE: current store has no send() — components cannot reach ws directly
  send(msg: ClientMessage) {
    ws.send(JSON.stringify(msg));
  },

  // ADD: new reactive getters
  get words() { return words; },
  get usedPacks() { return usedPacks; },
};
```

**Import additions** (line 3 — extend existing import from messages):
```typescript
// Existing:
import { ServerMessage, PARTY_NAME as _PARTY_NAME, type RoomState } from "$lib/protocol/messages";
// EXTEND to:
import {
  ServerMessage,
  PARTY_NAME as _PARTY_NAME,
  type RoomState,
  type WordEntry,
  type ClientMessage,
} from "$lib/protocol/messages";
```

**RoomStore interface** (lines 22–26 in `+page.svelte` shows how the page types the store — update accordingly):
```typescript
interface RoomStore {
  state: RoomState | null;
  status: "connecting" | "open" | "reconnecting" | "closed";
  words: WordEntry[];
  usedPacks: Set<string>;
  send(msg: ClientMessage): void;
  disconnect(): void;
}
```

---

### `party/game-room.ts` (service, event-driven, in-place extension)

**Analog:** `party/game-room.ts` (full file, 193 lines)

**Existing private fields** (lines 31–35) — add below:
```typescript
// Existing:
#hostId: string | null = null;
#players = new Map<string, Player>();
#createdAt = 0;
#active = false;

// ADD:
#words = new Map<string, WordEntry>();       // wordId → entry
#phase: "lobby" | "playing" = "lobby";
#usedPacks = new Set<string>();              // pack names loaded this session
```

**Existing import line** (lines 13–19) — extend:
```typescript
// Existing:
import {
  ClientMessage,
  type Player,
  type RoomState,
} from "../src/lib/protocol/messages.js";

// EXTEND to:
import {
  ClientMessage,
  type Player,
  type RoomState,
  type WordEntry,
} from "../src/lib/protocol/messages.js";
import { STARTER_PACKS } from "../src/lib/util/starterPacks.js";
import { nanoid } from "nanoid";
```

**Existing `onMessage` switch** (lines 67–109) — add 4 new cases after `case "ping"`:
```typescript
case "submitWord": {
  const { text } = result.output;
  const normalized = text.trim();
  // Dedupe: synchronous check + insert — NEVER await between these (Pitfall 4)
  const exists = [...this.#words.values()].some(
    (w) => w.text.toLowerCase() === normalized.toLowerCase()
  );
  if (exists) {
    conn.send(JSON.stringify({
      type: "error",
      code: "duplicate_word",
      message: `"${normalized}" is already in the pool`,
    }));
    return;
  }
  const wordId = nanoid();
  const state = conn.state as { playerId?: string } | null;
  const entry: WordEntry = {
    wordId,
    text: normalized,
    submittedBy: state?.playerId ?? "unknown",
  };
  this.#words.set(wordId, entry);
  this.broadcast(JSON.stringify({ type: "wordAdded", word: entry }));
  return;
}

case "removeWord": {
  const { wordId } = result.output;
  const entry = this.#words.get(wordId);
  if (!entry) return; // idempotent
  const state = conn.state as { playerId?: string } | null;
  if (entry.submittedBy !== state?.playerId) {
    conn.send(JSON.stringify({ type: "error", code: "not_owner" }));
    return;
  }
  this.#words.delete(wordId);
  this.broadcast(JSON.stringify({ type: "wordRemoved", wordId }));
  return;
}

case "loadStarterPack": {
  const state = conn.state as { playerId?: string } | null;
  if (state?.playerId !== this.#hostId) return; // host-only, silent ignore
  const { pack } = result.output;
  if (this.#usedPacks.has(pack)) return; // once-per-session
  this.#usedPacks.add(pack);
  const packWords = STARTER_PACKS[pack as keyof typeof STARTER_PACKS];
  for (const text of packWords) {
    const alreadyIn = [...this.#words.values()].some(
      (w) => w.text.toLowerCase() === text.toLowerCase()
    );
    if (alreadyIn) continue;
    const wordId = nanoid();
    // Use host's playerId (not "pack") so host can delete pack words (Pitfall 3)
    const entry: WordEntry = { wordId, text, submittedBy: state.playerId! };
    this.#words.set(wordId, entry);
    this.broadcast(JSON.stringify({ type: "wordAdded", word: entry }));
  }
  return;
}

case "startGame": {
  const state = conn.state as { playerId?: string } | null;
  if (state?.playerId !== this.#hostId) return;
  if (this.#words.size < 5) {
    conn.send(JSON.stringify({ type: "error", code: "not_enough_words" }));
    return;
  }
  this.#phase = "playing";
  this.broadcast(JSON.stringify({ type: "roomState", state: this.#snapshot() }));
  return;
}
```

**Existing `#snapshot()` method** (lines 185–193) — update to include new fields:
```typescript
// Existing (lines 185–192):
#snapshot(): RoomState {
  return {
    code: this.name,
    phase: "lobby",           // <-- change to this.#phase
    hostId: this.#hostId,
    players: [...this.#players.values()],
    // ADD:
    words: [...this.#words.values()],
    usedPacks: [...this.#usedPacks],
  };
}
```

---

### `src/lib/util/starterPacks.ts` (utility, NEW)

**Analog:** `src/lib/util/roomCode.ts` — same role (pure constants + exported types, no side effects)

**`roomCode.ts` import/export pattern** (reference):
```typescript
// src/lib/util/roomCode.ts — pattern to follow: export const + named type + pure function
export const ROOM_CODE_ALPHABET = "...";
export const makeRoomCode = customAlphabet(ROOM_CODE_ALPHABET, 6);
export function normalizeCode(raw: string): string { ... }
```

**Full pattern for new file:**
```typescript
// src/lib/util/starterPacks.ts
// IMPORTANT: imported only by party/game-room.ts — must NOT be re-exported through
// client-visible modules (prevents pack preview / cheating).

export const PACK_NAMES = ["corporate-classics", "agile", "sales"] as const;
export type PackName = (typeof PACK_NAMES)[number];

export const STARTER_PACKS: Record<PackName, string[]> = {
  "corporate-classics": [
    "Synergy", "Circle back", "Move the needle", "Low-hanging fruit",
    "Deep dive", "Bandwidth", "Alignment", "Leverage", "Pain point",
    "Boil the ocean", "Paradigm shift", "Action item", "Touch base",
    "Blue-sky thinking", "Drill down", "Holistic approach", "Take offline",
    "Best practices", "Core competency", "Value add",
  ],
  "agile": [
    "Sprint", "Velocity", "Backlog", "Stand-up", "Retrospective",
    "Story points", "Kanban", "Scrum", "Epic", "User story",
    "Definition of done", "MVP", "Iterative", "Pivot", "Ship it",
    "Two-pizza team", "Fail fast", "Continuous delivery", "DevOps", "Stakeholder",
  ],
  "sales": [
    "Pipeline", "Closing", "Quota", "Prospect", "Discovery call",
    "Champion", "ROI", "Upsell", "Churn", "Conversion",
    "Elevator pitch", "Decision maker", "BANT", "Objection handling",
    "Solution selling", "Land and expand", "Net new", "MRR", "ARR", "Forecasting",
  ],
};
```

---

### `src/lib/util/gridTier.ts` (utility, NEW)

**Analog:** `src/lib/util/roomCode.ts` — same role (pure functions, no imports, exported constants)

**Full pattern for new file:**
```typescript
// src/lib/util/gridTier.ts
// Pure functions — used by GridProgress component and unit tests (gridTier.test.ts)

export type GridTier = "3x3" | "4x4" | "5x5";

/** Tier thresholds per CONTEXT.md D-10 and REQUIREMENTS.md LOBB-05. */
export const TIER_THRESHOLDS: Record<GridTier, number> = {
  "3x3": 5,
  "4x4": 12,
  "5x5": 21,
};

export function deriveGridTier(wordCount: number): GridTier {
  if (wordCount >= 21) return "5x5";
  if (wordCount >= 12) return "4x4";
  return "3x3"; // covers 0–11; minimum to start is 5
}

/** Words still needed before the host can start. 0 = start enabled. */
export function wordsNeededToStart(wordCount: number): number {
  return Math.max(0, 5 - wordCount);
}

/** Words needed to advance to the next tier (or 0 if already at 5x5). */
export function wordsToNextTier(wordCount: number): number {
  if (wordCount >= 21) return 0;
  if (wordCount >= 12) return 21 - wordCount;
  if (wordCount >= 5) return 12 - wordCount;
  return 5 - wordCount;
}
```

---

### `src/lib/components/WordChip.svelte` (component, NEW)

**Analog:** `src/lib/components/Badge.svelte` — same role (chip-style `<span>`, inline-flex, design token classes, conditional slot content)

**`Badge.svelte` core pattern** (lines 1–19 — copy structure):
```svelte
<!-- Badge.svelte lines 1–19 — structural analog -->
<script lang="ts">
  import type { Snippet } from "svelte";
  type BadgeProps = { icon?: Snippet; children: Snippet; };
  let { icon, children }: BadgeProps = $props();
</script>
<span class="inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded-md
  bg-[var(--color-accent)] text-[var(--color-ink-inverse)]">
  {#if icon}{@render icon()}{/if}
  {@render children()}
</span>
```

**`PlayerRow.svelte` conditional rendering pattern** (lines 41–48 — conditional action button):
```svelte
<!-- PlayerRow.svelte lines 41–48 — conditional host badge pattern to copy for × button -->
{#if player.isHost}
  <Badge>
    {#snippet icon()}<Crown size={12} />{/snippet}
    {#snippet children()}Host{/snippet}
  </Badge>
{/if}
```

**Full pattern for new file:**
```svelte
<!-- src/lib/components/WordChip.svelte -->
<script lang="ts">
  import { fade } from "svelte/transition";
  import { X } from "lucide-svelte";

  type WordChipProps = {
    word: string;
    canDelete?: boolean;
    onDelete?: () => void;
  };

  let { word, canDelete = false, onDelete }: WordChipProps = $props();
</script>

<span
  in:fade={{ duration: 120 }}
  out:fade={{ duration: 120 }}
  class="inline-flex items-center gap-1 py-2 px-3 rounded-lg
    bg-[var(--color-surface)] border border-[var(--color-divider)]
    text-[var(--color-ink-primary)] text-base
    hover:border-[#3A3A48] transition-colors motion-reduce:transition-none
    focus-visible:outline-2 focus-visible:outline-offset-2
    focus-visible:outline-[var(--color-ink-secondary)]"
>
  {word}
  {#if canDelete}
    <button
      onclick={onDelete}
      aria-label={`Remove "${word}"`}
      class="flex items-center justify-center
             min-h-11 min-w-11 -my-2 -mr-3
             text-[var(--color-ink-secondary)]
             hover:text-[var(--color-ink-primary)]
             active:scale-[0.92] transition-transform motion-reduce:transition-none
             focus-visible:outline-2 focus-visible:outline-offset-2
             focus-visible:outline-[var(--color-ink-secondary)]"
    >
      <X size={14} />
    </button>
  {/if}
</span>
```

---

### `src/lib/components/WordPool.svelte` (component, event-driven, NEW)

**Analog:** `src/routes/room/[code]/+page.svelte` — the `<section>` block (lines 117–128) shows the pattern for a keyed `{#each}` list with section header and empty state.

**Existing lobby page section pattern** (lines 117–129):
```svelte
<!-- +page.svelte lines 117–129 — section + heading + keyed each -->
<section class="flex flex-col gap-4">
  <h2 class="text-2xl font-semibold">Players · {playerCount}</h2>
  {#if playerCount < 2}
    <p class="text-[var(--color-ink-secondary)]">
      Waiting for players. Share the code or link to get going.
    </p>
  {/if}
  <ul class="flex flex-col gap-2">
    {#each roomState?.players ?? [] as player (player.playerId)}
      <PlayerRow {player} />
    {/each}
  </ul>
</section>
```

**Full pattern for new file:**
```svelte
<!-- src/lib/components/WordPool.svelte -->
<script lang="ts">
  import type { WordEntry } from "$lib/protocol/messages";
  import WordChip from "./WordChip.svelte";

  type WordPoolProps = {
    words: WordEntry[];
    playerId: string; // current user's playerId — determines canDelete
    onDelete: (wordId: string) => void;
  };

  let { words, playerId, onDelete }: WordPoolProps = $props();
</script>

<section class="flex flex-col gap-4">
  <h2 class="text-2xl font-semibold">Words ({words.length})</h2>
  {#if words.length === 0}
    <div class="py-6 text-center">
      <p class="text-[var(--color-ink-secondary)] font-semibold">No words yet</p>
      <p class="mt-1 text-sm text-[var(--color-ink-secondary)]">
        Add buzzwords you expect to hear. The pool grows as everyone contributes.
      </p>
    </div>
  {:else}
    <div class="flex flex-wrap gap-2">
      {#each words as entry (entry.wordId)}
        <WordChip
          word={entry.text}
          canDelete={entry.submittedBy === playerId}
          onDelete={() => onDelete(entry.wordId)}
        />
      {/each}
    </div>
  {/if}
</section>
```

---

### `src/lib/components/PackPills.svelte` (component, request-response, NEW)

**Analog:** `src/lib/components/Button.svelte` (lines 1–52) — provides the base button patterns; `PlayerRow.svelte` provides the conditional rendering pattern.

**`Button.svelte` base classes pattern** (lines 26–35):
```svelte
<!-- Button.svelte lines 26–35 — base + variant class derivation -->
const baseClasses =
  "inline-flex items-center justify-center gap-2 font-semibold transition-transform
   motion-reduce:transition-none focus-visible:outline-2 focus-visible:outline-offset-2
   focus-visible:outline-[var(--color-ink-secondary)] disabled:opacity-40
   disabled:cursor-not-allowed cursor-pointer";

const variantClasses = $derived(
  variant === "secondary"
    ? "bg-[var(--color-surface)] border border-[var(--color-divider)]
       text-[var(--color-ink-primary)] hover:border-[#3A3A48]
       active:translate-y-px min-h-11 px-4 rounded-lg"
    : ...
);
```

**Full pattern for new file:**
```svelte
<!-- src/lib/components/PackPills.svelte -->
<script lang="ts">
  import { Check } from "lucide-svelte";

  type PackPillsProps = {
    usedPacks: Set<string>;
    onLoad: (pack: string) => void;
  };

  const PACKS = [
    { id: "corporate-classics", label: "Corporate Classics" },
    { id: "agile",              label: "Agile" },
    { id: "sales",              label: "Sales" },
  ] as const;

  let { usedPacks, onLoad }: PackPillsProps = $props();
</script>

<section class="flex flex-col gap-3">
  <p class="text-sm font-semibold text-[var(--color-ink-secondary)]">
    Seed from a starter pack:
  </p>
  <div class="flex flex-wrap gap-2">
    {#each PACKS as pack (pack.id)}
      {@const used = usedPacks.has(pack.id)}
      <button
        onclick={() => { if (!used) onLoad(pack.id); }}
        disabled={used}
        aria-label={used ? "Already loaded" : `Load ${pack.label} pack`}
        class="inline-flex items-center gap-2 min-h-11 px-4 rounded-lg
               bg-[var(--color-surface)] border border-[var(--color-divider)]
               text-sm font-semibold transition-colors motion-reduce:transition-none
               focus-visible:outline-2 focus-visible:outline-offset-2
               focus-visible:outline-[var(--color-ink-secondary)]
               {used
                 ? 'text-[#52525B] cursor-not-allowed'
                 : 'text-[var(--color-ink-primary)] hover:border-[#3A3A48] active:translate-y-px cursor-pointer'}"
      >
        {#if used}<Check size={14} />{/if}
        {pack.label}
      </button>
    {/each}
  </div>
</section>
```

---

### `src/lib/components/GridProgress.svelte` (component, NEW)

**Analog:** `src/lib/components/PlayerRow.svelte` — same role (`$derived` display values from a prop, pure display logic, no side effects).

**`PlayerRow.svelte` `$derived` pattern** (lines 18–19):
```svelte
<!-- PlayerRow.svelte lines 18–19 — $derived from prop -->
const color = $derived(getPlayerColor(player.playerId));
const initials = $derived(getInitials(player.displayName));
```

**Full pattern for new file:**
```svelte
<!-- src/lib/components/GridProgress.svelte -->
<script lang="ts">
  import { deriveGridTier, wordsNeededToStart, wordsToNextTier, TIER_THRESHOLDS } from "$lib/util/gridTier";

  type GridProgressProps = {
    wordCount: number;
    isHost: boolean;
    hostName?: string;
  };

  let { wordCount, isHost, hostName = "the host" }: GridProgressProps = $props();

  const tier = $derived(deriveGridTier(wordCount));
  const needed = $derived(wordsNeededToStart(wordCount));
  const canStart = $derived(needed === 0);

  // Progress bar fill: 0–100% within the range 0–21 (5×5 max threshold)
  const fillPct = $derived(Math.min(100, (wordCount / 21) * 100));

  const hint = $derived(
    canStart
      ? isHost
        ? "Ready — start when you are."
        : `Ready for a ${tier} board — ${hostName} can start!`
      : `Need ${needed} more word${needed === 1 ? "" : "s"} to start a ${tier} board`
  );
</script>

<div class="flex flex-col gap-3">
  <!-- Progress bar with tier markers -->
  <div class="relative pt-5">
    <!-- Tier marker labels -->
    {#each [{ tier: "3×3", threshold: 5 }, { tier: "4×4", threshold: 12 }, { tier: "5×5", threshold: 21 }] as marker}
      <span
        class="absolute top-0 text-xs text-[var(--color-ink-secondary)] -translate-x-1/2"
        style="left: {(marker.threshold / 21) * 100}%"
      >
        {marker.tier}
      </span>
    {/each}
    <!-- Track -->
    <div class="h-2 w-full rounded-full bg-[var(--color-divider)] overflow-hidden">
      <!-- Fill -->
      <div
        class="h-full rounded-full bg-[var(--color-accent)] transition-[width] duration-200 ease-out
               motion-reduce:transition-none"
        style="width: {fillPct}%"
      ></div>
    </div>
  </div>
  <!-- Threshold hint -->
  <p class="text-sm text-[var(--color-ink-secondary)]">{hint}</p>
</div>
```

---

### `src/lib/components/TextInput.svelte` (component, in-place extension)

**Analog:** `src/lib/components/TextInput.svelte` (full file, 75 lines)

**Existing props type** (lines 2–14) — add `shake`:
```typescript
// Add to TextInputProps (after existing props, before closing brace):
shake?: boolean; // triggers shake animation on duplicate rejection; clears parent state on next input
```

**Existing `$derived` inputClasses** (lines 38–42) — extend:
```typescript
// Existing:
const inputClasses = $derived(
  variant === "code"
    ? `${baseInputClasses} ${codeInputClasses}`
    : baseInputClasses
);

// REPLACE with (adds shake class):
const inputClasses = $derived(
  (variant === "code"
    ? `${baseInputClasses} ${codeInputClasses}`
    : baseInputClasses) + (shake ? " shake" : "")
);
```

**Existing `<input>` element** (lines 53–69) — no markup changes needed; `class={inputClasses}` already applies.

**New CSS to add** (add to `src/app.css` after existing `@theme` block, or in component `<style>`):
```css
@keyframes shake {
  0%, 100% { transform: translateX(0); }
  20%       { transform: translateX(-6px); }
  40%       { transform: translateX(6px); }
  60%       { transform: translateX(-6px); }
  80%       { transform: translateX(6px); }
}

.shake { animation: shake 300ms ease-in-out; }

@media (prefers-reduced-motion: reduce) {
  .shake { animation: none; }
}
```

---

### `src/routes/room/[code]/+page.svelte` (component, event-driven, in-place extension)

**Analog:** `src/routes/room/[code]/+page.svelte` (full file, 144 lines)

**Existing `onMount` store creation** (lines 33–46) — the store creation point; Phase 2 assigns the new typed store:
```svelte
// Existing store type (lines 22–31):
interface RoomStore {
  state: RoomState | null;
  status: "connecting" | "open" | "reconnecting" | "closed";
  disconnect(): void;
}
// EXTEND interface to:
interface RoomStore {
  state: RoomState | null;
  status: "connecting" | "open" | "reconnecting" | "closed";
  words: WordEntry[];
  usedPacks: Set<string>;
  send(msg: ClientMessage): void;
  disconnect(): void;
}
```

**Existing `iAmHost` derived** (lines 60–63) — reuse as the host guard for host-only sections:
```svelte
// Existing (lines 60–63) — already computes this:
const iAmHost = $derived(
  roomState?.hostId != null && roomState.hostId === myPlayerId && myPlayerId !== ""
);
```

**Existing footer pattern** (lines 131–143) — the current placeholder for Start Game; Phase 2 replaces it with full controls:
```svelte
<!-- Existing footer (lines 131–143) — currently a stub, replace content -->
<footer>
  {#if iAmHost}
    <!-- REPLACE stub with: GridProgress + Start Game button + PackPills -->
  {:else}
    <!-- REPLACE with: waiting text using roomState?.players?.find(p=>p.isHost)?.displayName -->
  {/if}
</footer>
```

**New `$state` to add** (after existing `copyLinkLabel` declaration, line 32):
```svelte
let wordInput = $state("");
let wordError = $state("");
let inputShake = $state(false);
```

**New send handlers pattern** — follow existing `copyCode()` async function pattern (lines 65–70):
```svelte
// Pattern: function → side-effect → state update
async function copyCode() {
  if (typeof navigator === "undefined" || !navigator.clipboard) return;
  await navigator.clipboard.writeText(data.code);
  copyCodeLabel = "Copied";
  setTimeout(() => (copyCodeLabel = "Copy code"), 2000);
}

// Follow same pattern for word actions:
function submitWord() {
  const text = wordInput.trim();
  if (!text) return;
  store?.send({ type: "submitWord", text });
  wordInput = "";
}

function removeWord(wordId: string) {
  store?.send({ type: "removeWord", wordId });
}

function loadPack(pack: string) {
  store?.send({ type: "loadStarterPack", pack: pack as "corporate-classics" | "agile" | "sales" });
}

function startGame() {
  store?.send({ type: "startGame" });
}
```

**Error handling: catch `duplicate_word` server error** — add to existing `case "error"` in store (handled via the `error` message `code` field):
```svelte
// In the page component, watch store.state for error signals OR expose an errors
// reactive from the store. Simpler: add error $state to store return and set it
// in the "error" case handler, then react in the page.
// 
// Alternatively handle in the page using a local $state for wordError,
// populated when store emits an error — the store's console.warn is the current
// "error" handling. Phase 2 needs to surface duplicate_word to the UI.
// Recommendation: expose get lastError() from store or pass onError callback.
```

---

### `tests/unit/game-room.test.ts` (test, in-place extension)

**Analog:** `tests/unit/game-room.test.ts` (full file, 328 lines)

**Test harness pattern** (lines 1–96 — DO NOT change): The `makeConn`, `FakeConn`, `vi.mock("partyserver")` block is the reusable harness. All Phase 2 tests follow the same pattern.

**New test describe structure** — copy `beforeEach` pattern (lines 100–107):
```typescript
describe("GameRoom — word pool (Phase 2)", () => {
  let room: InstanceType<typeof GameRoom>;

  beforeEach(() => {
    room = new GameRoom({} as never, {} as never);
    vi.clearAllMocks();
  });

  // Helper: join player
  function joinPlayer(conn: FakeConn, playerId: string, displayName: string) {
    room.onMessage(conn as never, JSON.stringify({ type: "hello", playerId, displayName }));
    vi.clearAllMocks();
  }

  it("submitWord adds word and broadcasts wordAdded", () => {
    const conn = makeConn("c1");
    joinPlayer(conn, "p1", "Alice");

    room.onMessage(conn as never, JSON.stringify({ type: "submitWord", text: "Synergy" }));

    expect((room as any).broadcast).toHaveBeenCalledOnce();
    const msg = JSON.parse((room as any).broadcast.mock.calls[0][0]);
    expect(msg.type).toBe("wordAdded");
    expect(msg.word.text).toBe("Synergy");
    expect(msg.word.submittedBy).toBe("p1");
  });

  it("submitWord duplicate (case-insensitive) sends error to submitter", () => { ... });
  it("removeWord by owner removes and broadcasts wordRemoved", () => { ... });
  it("removeWord by non-owner sends not_owner error", () => { ... });
  it("loadStarterPack by host adds words, marks pack used", () => { ... });
  it("loadStarterPack by non-host is silently ignored", () => { ... });
  it("loadStarterPack twice sends second load silently", () => { ... });
  it("startGame with < 5 words sends not_enough_words error", () => { ... });
  it("startGame with 5 words flips phase and broadcasts roomState", () => { ... });
  it("roomState snapshot includes words and usedPacks", () => { ... });
});
```

---

### `tests/unit/protocol.test.ts` (test, in-place extension)

**Analog:** `tests/unit/protocol.test.ts` (full file, 149 lines)

**Existing test pattern** (lines 5–14 — copy structure):
```typescript
// Existing pattern — describe block + v.safeParse assertion:
it("accepts a valid hello message", () => {
  const result = v.safeParse(ClientMessage, { type: "hello", playerId: "p1", displayName: "Alice" });
  expect(result.success).toBe(true);
});
```

**New tests to add** — extend `describe("ClientMessage")`, `describe("ServerMessage")`, `describe("RoomState schema")`:
```typescript
// In describe("ClientMessage"):
it("accepts submitWord with text 1–30 chars", () => {
  const r = v.safeParse(ClientMessage, { type: "submitWord", text: "Synergy" });
  expect(r.success).toBe(true);
});
it("rejects submitWord with empty text", () => { ... });
it("rejects submitWord with text > 30 chars", () => { ... });
it("accepts removeWord with wordId", () => { ... });
it("accepts loadStarterPack with valid pack", () => { ... });
it("rejects loadStarterPack with unknown pack", () => { ... });
it("accepts startGame", () => { ... });

// In describe("ServerMessage"):
it("accepts wordAdded message", () => {
  const r = v.safeParse(ServerMessage, {
    type: "wordAdded",
    word: { wordId: "abc", text: "Synergy", submittedBy: "p1" }
  });
  expect(r.success).toBe(true);
});
it("accepts wordRemoved message", () => { ... });
it("accepts gameStarted message", () => { ... });

// In describe("RoomState schema"):
it("accepts roomState with words array and usedPacks", () => {
  const r = v.safeParse(RoomState, {
    code: "ABC234",
    phase: "playing",    // must accept "playing" now
    hostId: "p1",
    players: [],
    words: [{ wordId: "w1", text: "Synergy", submittedBy: "p1" }],
    usedPacks: ["agile"],
  });
  expect(r.success).toBe(true);
});
it("rejects phase: 'lobby' being the only valid value (regression guard)", () => {
  // phase: "playing" must also be valid after Phase 2 change
  const r = v.safeParse(RoomState, { code: "X", phase: "playing", hostId: null, players: [], words: [], usedPacks: [] });
  expect(r.success).toBe(true);
});
```

---

### `tests/unit/gridTier.test.ts` (test, NEW)

**Analog:** `tests/unit/roomCode.test.ts` — same role (pure function unit tests, no mocks needed)

**`roomCode.test.ts` pattern** (follow import and describe structure):
```typescript
import { describe, it, expect } from "vitest";
import { deriveGridTier, wordsNeededToStart, wordsToNextTier } from "../../src/lib/util/gridTier";

describe("deriveGridTier", () => {
  it("returns 3x3 for 0 words", () => expect(deriveGridTier(0)).toBe("3x3"));
  it("returns 3x3 for 4 words", () => expect(deriveGridTier(4)).toBe("3x3"));
  it("returns 3x3 for 5 words (minimum start)", () => expect(deriveGridTier(5)).toBe("3x3"));
  it("returns 3x3 for 11 words", () => expect(deriveGridTier(11)).toBe("3x3"));
  it("returns 4x4 for 12 words", () => expect(deriveGridTier(12)).toBe("4x4"));
  it("returns 4x4 for 20 words", () => expect(deriveGridTier(20)).toBe("4x4"));
  it("returns 5x5 for 21 words", () => expect(deriveGridTier(21)).toBe("5x5"));
  it("returns 5x5 for 50 words", () => expect(deriveGridTier(50)).toBe("5x5"));
});

describe("wordsNeededToStart", () => {
  it("returns 5 for 0 words", () => expect(wordsNeededToStart(0)).toBe(5));
  it("returns 1 for 4 words", () => expect(wordsNeededToStart(4)).toBe(1));
  it("returns 0 for 5 words", () => expect(wordsNeededToStart(5)).toBe(0));
  it("returns 0 for 20 words", () => expect(wordsNeededToStart(20)).toBe(0));
});
```

---

## Shared Patterns

### Svelte 5 `$props()` + `$derived` component structure
**Source:** `src/lib/components/PlayerRow.svelte` (lines 8–19), `src/lib/components/Button.svelte` (lines 1–35)
**Apply to:** All 4 new components (`WordChip`, `WordPool`, `PackPills`, `GridProgress`)
```svelte
<script lang="ts">
  // 1. Type alias for props
  type FooProps = { value: string; optional?: boolean; };
  // 2. Destructure with $props(), provide defaults
  let { value, optional = false }: FooProps = $props();
  // 3. $derived for any computed display values
  const computed = $derived(someFunction(value));
</script>
```

### Design token Tailwind classes
**Source:** `src/lib/components/Button.svelte` (lines 26–35), `src/app.css` (`@theme` block)
**Apply to:** All new components
```
bg-[var(--color-surface)]         # chip, pill backgrounds
border-[var(--color-divider)]     # chip, pill borders
text-[var(--color-ink-primary)]   # default text
text-[var(--color-ink-secondary)] # muted/label text
text-[#52525B]                    # disabled/used state (--color-ink-disabled)
bg-[var(--color-accent)]          # Start Game button, progress fill
hover:border-[#3A3A48]            # hover border brightening
min-h-11 min-w-11                 # 44px tap target floor
focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-ink-secondary)]
motion-reduce:transition-none     # on all animated elements
```

### Fade transition for list items
**Source:** `src/lib/components/PlayerRow.svelte` (lines 1, 22–25)
**Apply to:** `WordChip.svelte` chip enter/exit
```svelte
import { fade } from "svelte/transition";
// On the root element:
in:fade={{ duration: 120 }}
out:fade={{ duration: 120 }}
```

### Valibot `v.safeParse` guard (server-side WS)
**Source:** `party/game-room.ts` (lines 52–66) — unchanged from Phase 1, all new `onMessage` cases go inside the existing guarded switch
```typescript
const result = v.safeParse(ClientMessage, parsed);
if (!result.success) {
  conn.send(JSON.stringify({ type: "error", code: "bad_message" }));
  return;
}
switch (result.output.type) { ... }
```

### Host-only guard pattern
**Source:** `party/game-room.ts` (lines 67–72, existing `hello` handler) — `conn.state` is set via `conn.setState({ playerId })` after hello
**Apply to:** `loadStarterPack` and `startGame` handlers
```typescript
const state = conn.state as { playerId?: string } | null;
if (state?.playerId !== this.#hostId) return; // silent ignore for non-host
```

### DO `#snapshot()` must stay in sync with `RoomState` schema
**Source:** `party/game-room.ts` (lines 185–193)
**Apply to:** Any DO field added must also appear in `#snapshot()` AND in the `RoomState` Valibot schema simultaneously — a 3-way atomic change.

---

## No Analog Found

All Phase 2 files have analogs — either exact (in-place extensions of Phase 1 files) or role-match analogs from the existing codebase.

| File | Reason |
|------|--------|
| n/a | All files covered |

---

## Metadata

**Analog search scope:** `/Users/christianmoore/ai/bs-bingo/src/`, `/Users/christianmoore/ai/bs-bingo/party/`, `/Users/christianmoore/ai/bs-bingo/tests/`
**Files scanned:** 12 source files read directly
**Pattern sources:** Actual file contents (not seed patterns) — Phase 1 is fully implemented
**Pattern extraction date:** 2026-04-17
