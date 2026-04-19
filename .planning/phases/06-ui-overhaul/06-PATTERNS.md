# Phase 6: UI Overhaul - Pattern Map

**Mapped:** 2026-04-18
**Files analyzed:** 23 (2 new modules, 2 new components, 12 modified existing components, 3 modified routes, 4 new test files)
**Analogs found:** 23 / 23 (every file has a direct codebase analog — Phase 6 is overlay/polish, not greenfield)

---

## File Classification

### NEW files (create)

| New File | Role | Data Flow | Closest Analog | Match Quality |
|----------|------|-----------|----------------|---------------|
| `src/lib/stores/theme.svelte.ts` | store (rune-backed) | client state + localStorage persistence | `src/lib/session.ts` (sessionStorage pattern) + `src/lib/stores/room.svelte.ts` (runes + getter-exposure pattern) | role-match (composite — no existing client-preference store) |
| `src/lib/copy.ts` | module (reactive dictionary) | read-only lookup reactive to a store | `src/lib/stores/room.svelte.ts` (rune-exposed getter pattern) | role-match (no existing i18n/copy module) |
| `src/lib/components/ThemeToggle.svelte` | component (toggle/switch) | client-only input → store mutation | `src/lib/components/PackPills.svelte` (pill-shaped button w/ focus/hover states) + `src/lib/components/Button.svelte` (variant-class derivation) | role-match |
| `src/lib/components/BoardHeader.svelte` | component (presentational) | static render from props | `src/lib/components/WinLineIcon.svelte` (grid-cols derivation by `gridSize` prop) + `src/lib/components/GridProgress.svelte` (thresholds-enumerated row) | exact |
| `tests/unit/theme.test.ts` | test (unit) | store state | `tests/unit/session.test.ts` (storage-backed module tests) | exact |
| `tests/unit/copy.test.ts` | test (unit) | module API | `tests/unit/gridTier.test.ts` (pure-module deriver tests) | role-match |
| `tests/unit/BoardHeader.test.ts` | test (unit) | component render | `tests/unit/BoardCell.test.ts` (mount/unmount with props) | exact |
| `e2e/theme-toggle.spec.ts` | test (e2e) | browser interaction + localStorage | `e2e/host-designation.spec.ts` (multi-context flow + button clicks) | role-match |
| `e2e/home-first-visit.spec.ts` | test (e2e) | single-page render | `e2e/error-page.spec.ts` (single-route visibility check) | exact |
| `e2e/narrow-viewport.spec.ts` | test (e2e) | viewport-scoped check | `e2e/host-designation.spec.ts` (context setup) | role-match |

### MODIFIED files (edit in place)

| Modified File | Role | Data Flow | Change Driver | Match Quality |
|---------------|------|-----------|---------------|---------------|
| `src/app.css` | global styles | CSS cascade | D-08 / D-12 — add `[data-theme="nsfw"]` override block, update `winLinePulse` to use `var(--color-accent)` | exact (extends own file) |
| `src/routes/+layout.svelte` | layout | SSR-aware mount | D-13 — call `theme.init()` + render `ThemeToggle` globally | exact (extends own file) |
| `src/routes/+page.svelte` | page | client render | D-07 / D-11 — wordmark + tagline + CTA labels from `copy.ts` | exact (extends own file) |
| `src/routes/room/[code]/+page.svelte` | page | client render | D-11 — lobby/board copy from `copy.ts` | exact (extends own file) |
| `src/routes/+error.svelte` | error page | client render | D-11 — heading/body/CTA from `copy.ts` | exact (extends own file) |
| `src/routes/join/[code]/+page.svelte` | page | client render | D-11 — modal copy from `copy.ts` | exact (extends own file) |
| `src/lib/components/Board.svelte` | component | presentational | D-10 / D-15 — conditional render of `<BoardHeader>` in NSFW | exact (extends own file) |
| `src/lib/components/BoardCell.svelte` | component | presentational | D-10 — dauber stamp overlay in NSFW + crosshatch on blank cells | exact (extends own file) |
| `src/lib/components/EndScreen.svelte` | component | presentational | D-11 — headline/subhead/CTA from `copy.ts` | exact (extends own file) |
| `src/lib/components/WordPool.svelte` | component | presentational | D-11 — placeholders + empty-state from `copy.ts` | exact (extends own file) |
| `src/lib/components/PackPills.svelte` | component | presentational | D-11 — pack labels from `copy.ts` | exact (extends own file) |
| `src/lib/components/Banner.svelte` | component | presentational | D-11 — "Reconnecting…" → theme-driven copy | exact (extends own file) |
| `src/lib/components/ErrorPage.svelte` | component | presentational | D-11 — all strings are already passed as props; caller routes copy through `copy.ts` | exact (extends own file) |
| `src/lib/components/GridProgress.svelte` | component | presentational | D-11 — hint strings from `copy.ts` (only if copy diverges per theme; otherwise no-op) | exact (extends own file) |
| `src/lib/stores/room.svelte.ts` | store | confetti palette | D-12 — per-theme `colors:` array on the dynamic confetti import | exact (extends own file) |

---

## Pattern Assignments

### `src/lib/stores/theme.svelte.ts` (NEW — store, runes + localStorage)

**Analogs:**
- `src/lib/session.ts` — storage-get/set pattern (sessionStorage; theme uses localStorage)
- `src/lib/stores/room.svelte.ts` — Svelte 5 runes + getter-exposure pattern for cross-module reactivity

**Storage access pattern** (`src/lib/session.ts` lines 5-12):
```typescript
export function getOrCreatePlayer(code: string): PlayerSession {
  const key = `bsbingo_player_${code}`;
  const existing = sessionStorage.getItem(key);
  if (existing) return JSON.parse(existing);
  const p: PlayerSession = { playerId: nanoid(), displayName: "" };
  sessionStorage.setItem(key, JSON.stringify(p));
  return p;
}
```
Copy this shape for `theme`: single constant `STORAGE_KEY = 'theme'`, guarded read-then-default, write on every mutation. Swap `sessionStorage` → `localStorage`. Add `typeof localStorage === 'undefined'` SSR guard.

**Runes + getter pattern** (`src/lib/stores/room.svelte.ts` lines 18-20 and 269-275):
```typescript
// Module-scope $state exposed via a getter so cross-module reactivity works
export const connection = $state<{ status: "idle" | "connecting" | ... }>({ status: "idle" });

// Returned-object getter wrapper (used inside createRoomStore)
return {
  get state() { return state; },
  get status() { return status; },
  ...
};
```
Apply the returned-object-with-getters shape to `theme`: export a frozen-interface object `{ get current(), init(), set(next), toggle() }`. Do NOT export a bare `$state` primitive — the RESEARCH Pitfall 2 calls this out explicitly.

**Side-effect pattern** (`src/lib/stores/room.svelte.ts` lines 265-267):
```typescript
if (typeof document !== "undefined") {
  document.addEventListener("visibilitychange", handleVisibilityChange);
}
```
Use identical `typeof document !== "undefined"` guard to wrap the `document.documentElement.setAttribute('data-theme', ...)` call.

---

### `src/lib/copy.ts` (NEW — reactive copy map)

**Analog:** `src/lib/stores/room.svelte.ts` (for the "getter that re-reads a rune" primitive). No pre-existing i18n/copy module — this is novel shape in the codebase.

**Pattern to copy — getter reads `$state` for reactivity** (`src/lib/stores/room.svelte.ts` line 270):
```typescript
get state() {
  return state; // reactivity propagates through the getter call
},
```
For `copy.ts`, the Proxy `get` trap reads `theme.current` (imported from `theme.svelte.ts`). Every template property access re-runs because the Svelte compiler tracks the `theme.current` getter call inside the trap.

**Fallback if Proxy reactivity misbehaves** (RESEARCH A1 flags this): expose `export function copy<K extends CopyKey>(key: K): string` and have components wrap the call in `$derived(copy('key'))`. Pattern precedent: `src/lib/components/GridProgress.svelte` lines 12-23 use `$derived` ternaries extensively.

**Interpolation function pattern** (`src/lib/util/winLine.ts` via `formatWinLine` in `EndScreen.svelte` line 29):
```typescript
const winLineLabel = $derived(formatWinLine(winningLine));
```
Copy this shape for `winnerSubhead(name)`, `nonWinnerSubhead(name)` — plain functions, not object keys, so callers can interpolate.

---

### `src/lib/components/ThemeToggle.svelte` (NEW — toggle/switch)

**Analog:** `src/lib/components/PackPills.svelte` (pill-shaped button with focus-visible, hover border, disabled-style precedents) + `src/lib/components/Button.svelte` (variant-class derivation)

**Imports + props shape** — follow PackPills (line 1-3):
```svelte
<script lang="ts">
  import { Check } from "lucide-svelte";
  // ThemeToggle: import { Briefcase } from "lucide-svelte";
  //             import { theme } from "$lib/stores/theme.svelte";
  //             import { copy } from "$lib/copy";
</script>
```

**Pill-shape utility classes** (`src/lib/components/PackPills.svelte` lines 29-36):
```svelte
class="inline-flex items-center gap-2 min-h-11 px-4 rounded-lg
       bg-[var(--color-surface)] border border-[var(--color-divider)]
       text-sm font-semibold transition-colors motion-reduce:transition-none
       focus-visible:outline-2 focus-visible:outline-offset-2
       focus-visible:outline-[var(--color-ink-secondary)]
       {used
         ? 'text-[var(--color-ink-disabled)] cursor-not-allowed'
         : 'text-[var(--color-ink-primary)] hover:border-[#3A3A48] active:translate-y-px cursor-pointer'}"
```
Copy the utility stack. For the toggle, change `rounded-lg` → `rounded-full` per UI-SPEC.

**Derived state reactive to store** (`src/lib/components/BoardCell.svelte` line 38-45 — marked-class derivation via ternary):
```svelte
marked
  ? "bg-[var(--color-accent)] text-[var(--color-ink-inverse)] border border-[var(--color-accent)]"
  : "bg-[var(--color-surface)] text-[var(--color-ink-primary)] border border-[var(--color-divider)] hover:border-[#3A3A48]"
```
Pattern for theme-toggle switch indicator: derive the track color from `isSfw = theme.current === 'sfw'`.

**Tailwind v4 literal-token safety** (`src/lib/components/Board.svelte` lines 14-23):
```typescript
// Literal string tokens so Tailwind scanner includes them: grid-cols-3 grid-cols-4 grid-cols-5
const colsClass = $derived(
  cells?.length === 9 ? "grid-cols-3" : cells?.length === 16 ? "grid-cols-4" : "grid-cols-5"
);
```
Apply identical literal-enumeration to any dynamic class in `ThemeToggle` (e.g., indicator position: use two full class strings, not `left-[${n}px]`).

**ARIA switch pattern** — UI-SPEC locks: `role="switch"` + `aria-checked` + `aria-label="Professional Mode"`. No codebase analog for `role="switch"` — follow the UI-SPEC directly; it matches WAI-ARIA switch pattern.

---

### `src/lib/components/BoardHeader.svelte` (NEW — presentational grid header)

**Analogs:**
- `src/lib/components/WinLineIcon.svelte` — grid-cols-by-gridSize derivation
- `src/lib/components/GridProgress.svelte` — thresholds-array enumeration pattern

**Grid size derivation** (`src/lib/components/WinLineIcon.svelte` lines 13-15):
```typescript
const colsClass = $derived(
  gridSize === 3 ? "grid-cols-3" : gridSize === 4 ? "grid-cols-4" : "grid-cols-5"
);
```
Use identically in `BoardHeader.svelte`. Add a `letters` derivation:
```typescript
const letters = $derived(
  gridSize === 5 ? ["B","U","L","L","S"]
  : gridSize === 4 ? ["B","U","L","L"]
  : ["B","L","S"]   // 3×3 — UI-SPEC says "B·L·S" on line 294
);
```

**Rendering an enumerated row** (`src/lib/components/GridProgress.svelte` lines 28-34):
```svelte
{#each [{ tier: "3\u00d73", threshold: 5 }, { tier: "4\u00d74", threshold: 12 }, ...] as marker}
  <span class="absolute top-0 text-xs text-[var(--color-ink-secondary)] -translate-x-1/2"
        style="left: {(marker.threshold / 21) * 100}%">
    {marker.tier}
  </span>
{/each}
```
Analogous shape: `{#each letters as letter}` inside a grid with `colsClass`. Display type font is Space Grotesk per UI-SPEC; follow the home wordmark (`src/routes/+page.svelte` line 77):
```svelte
<h1 class="font-display text-[40px] sm:text-[56px] font-semibold leading-[1.1]">
```
Size down per UI-SPEC line 73: `text-[32px] sm:text-[40px]`, `tracking-[0.15em]`, `uppercase`.

---

### `src/app.css` (MODIFY — add NSFW override block + refactor keyframes)

**Analog:** own file — already contains the `@theme` + keyframes structure to extend.

**Existing `@theme` block** (lines 3-15) — **unchanged**. NSFW block is appended.

**Existing keyframes already in this file** (lines 31-46):
```css
@keyframes winLinePulse {
  0%, 100% { box-shadow: 0 0 0 2px #F5D547, 0 0 8px  #F5D547; }
  50%      { box-shadow: 0 0 0 2px #F5D547, 0 0 16px #F5D547; }
}

[data-win-line="true"] > button {
  animation: winLinePulse 1200ms ease-in-out infinite;
  border-radius: 0.5rem;
}
```
**Change to make** (D-12 / UI-SPEC line 221): swap hardcoded `#F5D547` → `var(--color-accent)` in both keyframes + the reduced-motion fallback (line 44) so the pulse colour tracks the theme automatically.

**Add after existing `@theme` block** — exact CSS from RESEARCH.md lines 492-525 (the `:root[data-theme="nsfw"] { ... }` block plus `color-scheme: light;` and the crosshatch rule for `.bingo-blank-cell`).

**Precedent for `@media (prefers-reduced-motion)` overrides** — already present at lines 27-29 and 41-46. Mirror this for any new NSFW animations (dauber stamp scale-in per UI-SPEC line 264).

---

### `src/routes/+layout.svelte` (MODIFY — wire theme store + mount ThemeToggle)

**Analog:** own file — already handles global-overlay mounting (Banner).

**Existing pattern to extend** (lines 1-18):
```svelte
<script lang="ts">
  import "../app.css";
  import "@fontsource-variable/inter";
  import "@fontsource-variable/space-grotesk";
  import Banner from "$lib/components/Banner.svelte";
  import { connection } from "$lib/stores/room.svelte";
  import { Loader2 } from "lucide-svelte";
  let { children } = $props();
  const visible = $derived(connection.status === "reconnecting");
</script>

<Banner {visible}>...</Banner>
{@render children()}
```

**Changes to make:**
1. Import `theme` from `$lib/stores/theme.svelte` and `ThemeToggle` from `$lib/components/ThemeToggle.svelte`.
2. Add `$effect(() => { theme.init(); })` — runs once on mount; SSR-guarded inside the store.
3. Render `<ThemeToggle />` after `{@render children()}` so it sits above all page content via `position: fixed` (per UI-SPEC line 190).
4. Update Banner copy: replace `<span>Reconnecting…</span>` (line 15) with `<span>{copy.reconnectingBanner}</span>` per D-11.
5. Add `$effect(() => { document.title = copy.brand; })` per RESEARCH "Tab title per theme" row.

**SSR guard precedent** — `src/lib/stores/room.svelte.ts` line 48 (`typeof window !== "undefined"`). Apply the same guard inside `theme.init()`; do NOT add a browser check in `+layout.svelte` because `+layout.ts` already sets `ssr = false` project-wide (line 3 of `src/routes/+layout.ts`).

---

### `src/routes/+page.svelte` (MODIFY — home copy from `copy.ts`)

**Analog:** own file.

**Changes** (per D-07 / D-11):
- Line 78 (wordmark): `Bullshit Bingo<span ...>.</span>` → `{copy.brand}<span ...>.</span>`
- Line 81 (tagline): replace hardcoded string with `{copy.homeTagline}`
- Line 87 (primary CTA): `Create a game` → `{copy.createCta}`
- Lines 111, 119, 154 (modal + join copy): all literal strings → `copy.*` keys per UI-SPEC § Copywriting Contract table
- Line 45-46, 49 (validation messages): route through `copy.emptyName` / `copy.maxChars`

**Precedent: component reads props, route provides copy strings** — same shape as `ErrorPage` which takes `heading` / `body` as props. No architectural change; only the literal values move to `copy.ts`.

---

### `src/routes/room/[code]/+page.svelte` (MODIFY — lobby/board copy)

**Analog:** own file.

**Existing strings to route through `copy.ts`:**
- Line 245 (`label="Add a buzzword"`) → `{copy.wordInputLabel}`
- Line 247 (`placeholder="Add a buzzword…"`) → `{copy.wordInputPlaceholder}`
- Line 262 (Add button): stays as "Add" (not in copy table; kept literal — UI-SPEC copy table does not redefine this)
- Line 281 (`Start Game`) → `{copy.startGame}`
- Line 285 (`Waiting for {hostName} to start the game…`) → `{copy.waitingForHost(hostName)}`
- Line 297 (`Waiting for players. Share the code or link above.`) → `{copy.waitingForPlayers}`
- Line 209 (`Room code`) — UI-SPEC does NOT list this as theme-varying; leave literal unless UI-SPEC copy table is amended.

**Pattern: reactive template read** — Svelte already auto-reacts to `copy.*` reads per Pattern 2 in RESEARCH. No `$derived` wrapper needed if Proxy works; if falling back to `copy()` function, wrap in `$derived` (precedent: line 27-31 — `shareUrl` is `$derived`).

---

### `src/lib/components/Board.svelte` (MODIFY — conditional BoardHeader render)

**Analog:** own file.

**Add import:**
```svelte
import BoardHeader from "./BoardHeader.svelte";
import { theme } from "$lib/stores/theme.svelte";
```

**Add before the grid `<div>` (after line 33)** — use the conditional-block pattern already in this file (line 26 `{#if cells === null}` / `{:else}`):
```svelte
{#if theme.current === "nsfw" && cells}
  <BoardHeader gridSize={cells.length === 9 ? 3 : cells.length === 16 ? 4 : 5} />
{/if}
```
Literal-enumeration for `gridSize` mirrors the existing `colsClass` derivation pattern (lines 15-23).

---

### `src/lib/components/BoardCell.svelte` (MODIFY — dauber stamp + crosshatch)

**Analog:** own file. Blank-vs-word conditional already exists (lines 18-27 vs 29-50).

**Add import:**
```svelte
import { theme } from "$lib/stores/theme.svelte";
```

**Blank cell — add crosshatch class in NSFW** (modify line 21-26):
```svelte
<div
  class={[
    "aspect-square min-h-11 min-w-11 rounded-lg",
    "bg-[var(--color-surface)] border border-dashed border-[var(--color-divider)]/40",
    theme.current === "nsfw" ? "bingo-blank-cell" : "",
  ].join(" ")}
  aria-hidden="true"
  tabindex="-1"
></div>
```
The `bingo-blank-cell` class is defined in `app.css` (see app.css section above).

**Word cell — dauber stamp overlay when marked** — add an absolutely-positioned `<span>` inside the `<button>` (after line 48). Use the `pointer-events-none` + `inset-0` pattern from RESEARCH Pitfall 5 (lines 435-444).

**Precedent: conditional overlay inside a container** — `src/lib/components/PlayerRow.svelte` lines 45-54 already shows a `data-testid` marked span with conditional classes. Same pattern, but absolutely-positioned.

**Transition safety** — existing `transition-[...] duration-[120ms] motion-reduce:transition-none` stack at line 38-40 is the reference for the dauber's scale-in animation.

---

### `src/lib/components/EndScreen.svelte` (MODIFY — copy from module)

**Analog:** own file.

**Strings to migrate** (per UI-SPEC Copywriting Contract):
- Line 38 (`BINGO!`) → `{copy.winHeadline}`
- Line 46 (`{winner.displayName} got Bingo!`) → `{copy.nonWinnerSubhead(winner.displayName)}`
- Line 53 (`"You called it."` / `completed`) — this is interpolation, route through a single function `copy.winLineLabelText(isWinner, winLineLabel)` OR keep literal since both themes share this wording (UI-SPEC does not redefine it)
- Line 76 (`Start new game`) → `{copy.playAgain}`
- Line 78 (`Word pool and players are kept...`) — UI-SPEC does not redefine; leave literal
- Line 85 (`Waiting for the host to start a new game.`) → `{copy.endWaitingForHost}`

---

### `src/lib/stores/room.svelte.ts` (MODIFY — confetti palette per theme)

**Analog:** own file, lines 138-162.

**Current state** (line 149-150, 156-158):
```typescript
colors: ["#F5D547", "#F5F5F7", "#F87171"],  // SFW defaults in both reduce / non-reduce branches
```

**Change to make** (per RESEARCH lines 580-591):
1. Add at top of file: `import { theme } from './theme.svelte';`
2. Define two const palettes before the confetti call:
   ```typescript
   const sfwPalette = ["#F5D547", "#F5F5F7", "#F87171"];
   const nsfwPalette = ["#D4520A", "#C9A96B", "#7A4F2A", "#F5EDD6", "#2C1810"];
   ```
3. Replace both `colors:` lines with `colors: theme.current === 'nsfw' ? nsfwPalette : sfwPalette`

**Precedent for dynamic import with theme awareness** — none in this codebase; the dynamic import itself is already present. Only the `colors:` array becomes theme-driven.

---

### `tests/unit/theme.test.ts` (NEW — theme store unit tests)

**Analog:** `tests/unit/session.test.ts` (lines 1-49) — exact shape for storage-backed module tests.

**Pattern to copy** (`tests/unit/session.test.ts` lines 1-27):
```typescript
import { describe, it, expect, beforeEach } from "vitest";
import { getOrCreatePlayer, setDisplayName } from "../../src/lib/session";

describe("getOrCreatePlayer", () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it("returns a non-empty playerId and empty displayName on first call", () => {
    const player = getOrCreatePlayer("ABC234");
    expect(player.playerId).toBeTruthy();
    ...
  });
});
```

**Apply:**
- `beforeEach(() => { localStorage.clear(); })` (swap `sessionStorage` → `localStorage`)
- Tests: default value = 'sfw'; `set('nsfw')` persists; invalid stored value falls back to 'sfw' per D-03; `toggle()` flips; `init()` applies `data-theme` attribute (check `document.documentElement.getAttribute('data-theme')`)

---

### `tests/unit/copy.test.ts` (NEW — copy map unit tests)

**Analog:** `tests/unit/gridTier.test.ts` — pure-module derivation tests.

**Pattern to copy** — import the module, drive theme store into each mode, assert lookup output. Example:
```typescript
import { describe, it, expect, beforeEach } from "vitest";
import { theme } from "../../src/lib/stores/theme.svelte";
import { copy } from "../../src/lib/copy";

beforeEach(() => { localStorage.clear(); theme.set('sfw'); });

it("returns SFW brand by default", () => {
  expect(copy.brand).toBe("Buzzword Bingo");
});

it("swaps to NSFW brand when theme is nsfw", () => {
  theme.set('nsfw');
  expect(copy.brand).toBe("Bullshit Bingo");
});
```

---

### `tests/unit/BoardHeader.test.ts` (NEW — component render tests)

**Analog:** `tests/unit/BoardCell.test.ts` — exact mount/unmount lifecycle for Svelte 5 components.

**Setup block to copy verbatim** (`tests/unit/BoardCell.test.ts` lines 1-26):
```typescript
import { describe, it, expect, vi, afterEach } from "vitest";
import { mount, unmount } from "svelte";
import BoardCell from "../../src/lib/components/BoardCell.svelte";

let instance: ReturnType<typeof mount> | null = null;
let container: HTMLElement | null = null;

function renderCell(props: { cell: Cell; marked: boolean; onToggle?: () => void }) {
  container = document.createElement("div");
  document.body.appendChild(container);
  instance = mount(BoardCell, { target: container, props });
  return container;
}

afterEach(() => {
  if (instance) { unmount(instance); instance = null; }
  if (container) { container.remove(); container = null; }
});
```

**Apply:** swap `BoardCell` → `BoardHeader`, assert 5 letters for gridSize=5 ("B","U","L","L","S"), 4 for gridSize=4, 3 for gridSize=3 ("B","L","S").

**Svelte transition jsdom stub** — if BoardHeader uses `in:fade` or similar, copy the `beforeAll` block from `tests/unit/PlayerRow.test.ts` lines 6-15 (stubs `HTMLElement.prototype.animate`).

---

### `e2e/theme-toggle.spec.ts` (NEW — toggle flow + persistence)

**Analog:** `e2e/host-designation.spec.ts` — multi-step flow with button interactions.

**Pattern to copy** (`e2e/host-designation.spec.ts` lines 1-12):
```typescript
import { test, expect } from "@playwright/test";

test("toggle flips data-theme and persists across reload", async ({ browser }) => {
  const ctx = await browser.newContext();
  const p = await ctx.newPage();
  await p.goto("/");
  // Initial state: data-theme === 'sfw'
  await expect(p.locator("html")).toHaveAttribute("data-theme", "sfw");
  // Click toggle
  await p.getByRole("switch", { name: "Professional Mode" }).click();
  await expect(p.locator("html")).toHaveAttribute("data-theme", "nsfw");
  // Reload → still nsfw
  await p.reload();
  await expect(p.locator("html")).toHaveAttribute("data-theme", "nsfw");
  await ctx.close();
});
```

---

### `e2e/home-first-visit.spec.ts` (NEW — home render check)

**Analog:** `e2e/error-page.spec.ts` — single-route visibility assertion.

**Apply:** visit `/` with cleared `localStorage`; assert `Buzzword Bingo` wordmark visible; assert tagline visible; assert `Create a game` CTA visible; assert `Professional Mode` toggle visible.

---

### `e2e/narrow-viewport.spec.ts` (NEW — iPhone SE layout check)

**Analog:** `e2e/host-designation.spec.ts` context setup.

**Apply:** `browser.newContext({ viewport: { width: 375, height: 667 } })`. Go through create → lobby → start game → assert ThemeToggle button bounding box does NOT intersect board cells. Playwright API: `getBoundingBox()` on each.

---

## Shared Patterns

### CSS Custom Property Usage
**Source:** every existing component in `src/lib/components/`
**Apply to:** ALL new components + ALL modifications

**Rule** (verified across every component file): colour values MUST read `var(--color-*)` — never a hardcoded hex. Precedent: `src/lib/components/Button.svelte` line 33-36, `src/lib/components/BoardCell.svelte` lines 43-45, `src/lib/components/Banner.svelte` line 15.

Exception — already existing: `src/lib/components/Button.svelte` line 35 uses `hover:border-[#3A3A48]` (a one-step-brighter divider for hover). UI-SPEC line 205 specifies `#3A3A48` (SFW hover) / `#B08B4F` (NSFW hover) — this is the single hover-colour-by-theme exception; may need a `var(--color-divider-hover)` token if DRY is desired, or keep literals.

---

### Tailwind v4 Literal Class Tokens (Oxide Scanner Safety)
**Source:** `src/lib/components/Board.svelte` lines 14-23, `src/lib/components/WinLineIcon.svelte` lines 13-15
**Apply to:** ALL new components that compose class names dynamically

```typescript
// Literal string tokens so Tailwind scanner includes them: grid-cols-3 grid-cols-4 grid-cols-5
const colsClass = $derived(
  gridSize === 3 ? "grid-cols-3" : gridSize === 4 ? "grid-cols-4" : "grid-cols-5"
);
```
NEVER use template literals like `grid-cols-${n}` or `bg-[${color}]`. RESEARCH Pitfall 1 calls this out explicitly.

---

### `prefers-reduced-motion` Opt-Out
**Source:** `src/lib/components/BoardCell.svelte` line 39, `src/lib/components/Banner.svelte` line 15, `src/app.css` lines 27-29 and 41-46
**Apply to:** ALL new animations (theme toggle indicator slide, dauber stamp scale-in)

Inline utility: add `motion-reduce:transition-none` (or `motion-reduce:animate-none`) alongside every `transition-*` / `animate-*` class.

CSS keyframes: wrap inside `@media (prefers-reduced-motion: reduce) { ... animation: none; ... }` block.

---

### Focus-Visible Outline
**Source:** `src/lib/components/Button.svelte` line 29, `src/lib/components/BoardCell.svelte` line 41, `src/lib/components/PackPills.svelte` lines 32-33
**Apply to:** ThemeToggle (interactive)

```
focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-ink-secondary)]
```
Identical shape across all interactive components. Copy verbatim.

---

### 44px Minimum Tap Target
**Source:** `src/lib/components/Button.svelte` line 33 (`min-h-11`), `src/lib/components/BoardCell.svelte` line 37, `src/lib/components/PackPills.svelte` line 29
**Apply to:** ThemeToggle pill

`min-h-11` (44px) on the outer interactive element. UI-SPEC line 193 reinforces this.

---

### SSR Guard for Browser APIs
**Source:** `src/lib/stores/room.svelte.ts` lines 48, 137, 259-267
**Apply to:** `theme.svelte.ts` (localStorage + document.documentElement), confetti palette read

Pattern: `if (typeof window !== "undefined")` or `if (typeof localStorage === "undefined") return <default>;`. Already pervasive in the codebase.

Note: project-wide `ssr = false` in `src/routes/+layout.ts` line 3 means SSR-only code paths don't actually execute — but the guards remain good hygiene for module-init code (e.g., the copy module imports run at module-load).

---

### Lucide Icon Import
**Source:** `src/lib/components/PackPills.svelte` line 2 (`Check`), `src/routes/+page.svelte` line 8 (`ArrowRight`), `src/lib/components/PlayerRow.svelte` line 3 (`Crown`)
**Apply to:** ThemeToggle (`Briefcase`)

```svelte
import { Briefcase } from "lucide-svelte";
// ...
<Briefcase size={16} />
```
Size 16 is the project convention for inline button icons; 48 for error page icons (`src/routes/+error.svelte` line 20).

---

### Svelte 5 Runes `$props` / `$state` / `$derived`
**Source:** every component
**Apply to:** ALL new components

- `let { foo, bar }: Props = $props();` — single destructured call
- `$state<T>(initial)` for mutable state
- `$derived(expression)` for reactive reads
- Getter pattern in module-exported objects (see theme store)

RESEARCH Pitfall 2: NEVER `export let foo = $state(...)` from a `.svelte.ts` — wrap in an exported object with getters.

---

## No Analog Found

Every new file in Phase 6 has at least a role-match analog. There are no novel roles in this phase.

The two closest to novel:
- `src/lib/copy.ts` — no prior copy/i18n module, but the "getter-over-$state" pattern from `room.svelte.ts` maps directly.
- `src/lib/stores/theme.svelte.ts` — no prior client-preference store, but `session.ts` (storage pattern) + `room.svelte.ts` (runes + getters) combine cleanly.

---

## Metadata

**Analog search scope:** `src/lib/components/`, `src/lib/stores/`, `src/lib/`, `src/routes/`, `tests/unit/`, `e2e/`, `src/app.css`

**Files scanned:** 15 components, 1 store file, 5 route files, 1 CSS file, 1 session module, 16 unit-test files, 9 e2e-test files — all read or enumerated.

**Pattern extraction date:** 2026-04-18

**Ready for planning:** yes. Planner can reference file paths + line numbers directly.
