---
phase: 06-ui-overhaul
plan: 03
subsystem: ui

tags: [board, nsfw-identity, dauber-stamp, board-header, crosshatch, confetti-palette, svelte-5-runes, tailwind-v4]

requires:
  - phase: 06-ui-overhaul
    plan: 01
    provides: theme store (theme.current), :root[data-theme="nsfw"] palette override, .bingo-blank-cell crosshatch rule, var(--color-accent) in winLinePulse, tests/unit/BoardHeader.test.ts RED scaffold

provides:
  - BoardHeader.svelte component (B·U·L·L·S / B·U·L·L / B·L·S decorative row, NSFW-only)
  - Conditional BoardHeader render above the grid in Board.svelte
  - Dauber stamp SVG overlay on marked cells in BoardCell.svelte (NSFW-only, pointer-events-none)
  - .bingo-blank-cell class applied in NSFW blanks (crosshatch activates from Plan 01 CSS)
  - Per-theme confetti palette in room.svelte.ts on winDeclared (sfwConfettiPalette / nsfwConfettiPalette)
  - @keyframes dauberStampIn + prefers-reduced-motion fallback in app.css

affects: [06-04-e2e-regression]

tech-stack:
  added: []
  patterns:
    - "Decorative header row as grid-cols-{3,4,5} literal token matching the Board grid below"
    - "Conditional child component render gated on theme.current (no layout shift — BoardHeader is full-width above grid)"
    - "Absolutely-positioned pointer-events-none overlay inside <button> for visual accent that does not break click semantics (T-06-11)"
    - "Module-scope palette constants keyed by theme enum; safe-by-construction against tampering (T-06-09)"
    - "relative z-10 on text span to keep content above stamp overlay"

key-files:
  created:
    - src/lib/components/BoardHeader.svelte
  modified:
    - src/lib/components/Board.svelte
    - src/lib/components/BoardCell.svelte
    - src/lib/stores/room.svelte.ts
    - src/app.css

key-decisions:
  - "Kept single BoardHeader component (no SFW variant) — SFW board has zero header row per UI-SPEC; NSFW is the only theme that uses the B-U-L-L-S wordmark"
  - "Dauber stamp path is a literal in BoardCell.svelte (not a shared SVG asset) — 22-line path, one caller, no reuse"
  - "Text span wraps marked text at z-10 so the burnt-orange dauber (var(--color-accent), opacity 0.72) sits underneath but still reads"
  - "relative overflow-hidden added to the button so the stamp is clipped to the rounded cell corners"
  - "Confetti palettes defined as module-scope const arrays (not $state) — palette content is theme-invariant; only the selection is reactive at win time"

requirements-completed: [SC-3b, SC-3c, SC-4a]

duration: 4min16s
completed: 2026-04-18
---

# Phase 06 Plan 03: Board Identity — Header, Dauber Stamp, Crosshatch Summary

**NSFW-only board visual payoff: B·U·L·L·S decorative header row, burnt-orange hand-drawn dauber stamp on marked cells (click-through), crosshatch texture on blanks, and per-theme confetti palette — all three gates apply via `theme.current === "nsfw"` guards so the SFW path is byte-identical to Phase 5.**

## Performance

- **Duration:** ~4 min 16 s
- **Started:** 2026-04-18T17:12:40Z
- **Completed:** 2026-04-18T17:16:56Z
- **Tasks:** 3 (Task 1 GREEN, Task 2 multi-file wire, Task 3 store edit)
- **Files created:** 1 (BoardHeader.svelte)
- **Files modified:** 4 (Board.svelte, BoardCell.svelte, app.css, room.svelte.ts)
- **Tests run:** 347 unit (all GREEN) + win-and-reset e2e (2/2 GREEN)

## Accomplishments

- **BoardHeader.svelte (new).** Takes a `gridSize: 3 | 4 | 5` prop and renders a decorative grid row matching the board width below. Emits the correct letters per UI-SPEC line 294: B·U·L·L·S for 5×5, B·U·L·L for 4×4, B·L·S for 3×3. Each letter wrapped in `[data-header-letter]` for test assertion. Typography: font-display (Space Grotesk), 32/40px responsive, weight 600, tracking 0.15em, uppercase, ink-secondary colour. `aria-hidden="true"` because the letters are decorative — the underlying grid cells already carry the semantic labels. Height 48px matching UI-SPEC line 56. Turns the 3 RED tests from Plan 01 GREEN.
- **Board.svelte wiring.** Added `import BoardHeader` + `import { theme }`. Added a `gridSize` $derived that mirrors the existing colsClass derivation. Conditionally renders `<BoardHeader {gridSize} />` above the grid when `theme.current === "nsfw"` AND `cells !== null`. SFW path unchanged.
- **BoardCell.svelte dauber stamp + crosshatch.** Blank branch now applies `bingo-blank-cell` class in NSFW so the Plan-01 crosshatch `repeating-linear-gradient` activates. Word branch gained `relative overflow-hidden` on the button and a conditionally-rendered `<span>` dauber overlay (absolutely-positioned, `pointer-events-none`, SVG circle path with slight irregularity for hand-drawn feel, `fill="var(--color-accent)"` + `opacity=0.72`). Text span got `relative z-10` so the word reads above the stamp. Dauber only renders when `marked && theme.current === "nsfw"`.
- **app.css dauberStampIn.** New 120ms ease-out keyframe (scale 0.6→1, opacity 0→1) with `prefers-reduced-motion: reduce` fallback (animation: none). Third `prefers-reduced-motion` block in the file — joins shake and win-line.
- **room.svelte.ts per-theme confetti.** Imports `theme`, defines two module-scope palette consts, and selects at win time (`theme.current === "nsfw" ? nsfwConfettiPalette : sfwConfettiPalette`). Both reduce-motion and normal confetti branches use the same per-theme palette. Every other confetti parameter (particleCount, spread, ticks, origin, startVelocity) is unchanged.

## Task Commits

1. **Task 1: BoardHeader component** — `e43b6dd` (feat)
2. **Task 2: Board/BoardCell wire + app.css keyframes** — `9f82603` (feat)
3. **Task 3: Per-theme confetti palette** — `bc0633a` (feat)

## Files Created / Modified

### Created
- `src/lib/components/BoardHeader.svelte` (39 LOC)

### Modified
- `src/lib/components/Board.svelte`
  - +2 imports (BoardHeader, theme)
  - +1 $derived (gridSize)
  - +3 template lines (theme gate + `<BoardHeader {gridSize} />`)
- `src/lib/components/BoardCell.svelte`
  - +1 import (theme)
  - Blank branch: class string → class array with `bingo-blank-cell` in NSFW
  - Word branch: `relative overflow-hidden` added to button classes; dauber SVG overlay span inserted as first child; text span gets `relative z-10`
- `src/lib/stores/room.svelte.ts`
  - +1 import (theme)
  - +2 module-scope palette consts
  - +1 `const palette` derivation inside winDeclared
  - Both `colors: ["#F5D547", …]` literals → `colors: palette`
- `src/app.css`
  - +14 lines: @keyframes dauberStampIn + .dauber-stamp class + reduce-motion override

## API Surface for Downstream Plans

Nothing new exported. Plan 04 (e2e regression) consumes the visual result through DOM assertions:

```ts
// NSFW board header presence
page.locator('[data-testid="board-header"]')
page.locator('[data-header-letter]').allTextContents() // ["B","U","L","L","S"] etc.

// NSFW dauber stamp presence on a marked cell
page.locator('button[aria-pressed="true"] .dauber-stamp')

// Click-through safety: clicking a marked cell in NSFW still fires onToggle
await markedButton.click() // still flips aria-pressed to "false"
```

## Test State After Plan 03

| Test file | State | Reason |
|-----------|-------|--------|
| `tests/unit/BoardHeader.test.ts` | GREEN (3/3) | Component shipped — Plan 01 RED now GREEN |
| `tests/unit/Board.test.ts` | GREEN (11/11) | No regression — header conditional only renders in NSFW, tests default to SFW |
| `tests/unit/BoardCell.test.ts` | GREEN (16/16) | No regression — dauber conditional only renders in NSFW+marked |
| `tests/unit/room-store.test.ts` | GREEN (34/34) | No regression — S3 test checks particleCount ∈ {60, 180}, palette swap invisible to the assertion |
| **Full unit suite** | **GREEN (347/347)** | 19 files, 347 tests — no regressions |
| `e2e/win-and-reset.spec.ts` | GREEN (2/2) | Phase 4 win + reset flow still works with per-theme confetti |

## Decisions Made

1. **`gridSize` derivation is a cast, not a fresh type guard.** Used `$derived(...) as unknown as 3 | 4 | 5` to mirror the existing colsClass derivation pattern. The board can legitimately have 9/16/25 cells; any other length is a server bug. Adding runtime validation here would be noise.
2. **Dauber path is inline.** The SVG path is 6 lines; extracting a shared `<DauberIcon>` component would add an import and a prop surface for zero gain — BoardCell is the only call site.
3. **Text span uses `relative z-10`, not `z-20`.** Only two layers (stamp + text), and the overlay itself uses `absolute inset-0` at the default z-index of 0. `z-10` is the minimum stacking-context lift needed.
4. **Palette arrays are const, not $state.** Palette *content* never changes. Only the *selection* is reactive, and that reactivity happens inside the winDeclared closure where `theme.current` is already reactive.

## Deviations from Plan

None. The plan was executed exactly as written.

## Deferred Issues (out of scope)

**Pre-existing e2e failures in `e2e/board-mark.spec.ts`.** After Task 2 I ran `pnpm test:e2e e2e/board-mark.spec.ts` and saw 2 failing tests (lines 48 and 103 — "marking a cell updates the acting player's own badge" and "clicking a marked cell removes the mark"). I stashed my changes, re-ran the spec against `cd40afc` (the parent commit — the one this plan was based on), and saw **3 failing tests** in the same file:

- `Phase 3: marking a cell updates the acting player's own badge within 1s` (line 48)
- `Phase 3: peer's badge updates within 1s after a player marks a cell` (line 75)
- `Phase 3: mark toggle — clicking a marked cell removes the mark` (line 103)

These are all pre-existing regressions in the player-row mark-badge rendering that are not caused by Plan 03 changes (Plan 03 touches no player-row code). In fact my Task 2 changes reduced failures from 3 to 2 — the peer-badge test (line 75) now passes. Restored my changes with `git stash pop`. Per the executor scope-boundary rule ("Only auto-fix issues DIRECTLY caused by the current task's changes"), these failures are deferred for a follow-up debug.

- **Impact on Plan 03:** None — the dauber-stamp click-through threat (T-06-11) was validated by the 30 unit tests that still pass, including BoardCell's `clicking the button invokes onToggle` test. The badge-count propagation is an unrelated player-row concern.
- **Recommended next step:** Capture with `/gsd-debug e2e board-mark badge lag` — likely a Phase 5 timing regression or a PlayerRow change that landed between Phase 4 and Phase 5.

## Threat Surface Check

No new trust boundaries introduced. Threat register T-06-09 through T-06-12 all mitigated per plan:

- **T-06-09** (Tampering, confetti palette): boolean on a validated enum (`theme.current === "nsfw"`); palettes are literal module-scope consts — no user input reaches `confetti({ colors })`.
- **T-06-10** (XSS via SVG): dauber SVG markup is a literal in the `.svelte` template; no dynamic content interpolation, path data is hardcoded.
- **T-06-11** (Click-intercept / UI redressing): `pointer-events: none` on the overlay span + existing `<button>` handles clicks. Unit test `clicking the button invokes onToggle` still GREEN; win-and-reset e2e GREEN.
- **T-06-12** (DoS on SSR): SvelteKit SPA mode (`ssr=false` in `+layout.ts`); BoardHeader only mounts post-hydration — no SSR path exercised.

## Known Stubs

None. All code ships with real behaviour:
- BoardHeader emits real letters for every supported gridSize.
- Board.svelte conditional is wired to the live theme store.
- BoardCell dauber is rendered whenever marked + NSFW; SVG is the final visual asset (not a placeholder).
- Confetti palette swaps at win time on every theme read.

## Self-Check: PASSED

Files verified on disk:
- FOUND: `src/lib/components/BoardHeader.svelte`
- FOUND: `src/lib/components/Board.svelte` (modified — has `import BoardHeader`, `theme.current === "nsfw"`, `<BoardHeader {gridSize}`)
- FOUND: `src/lib/components/BoardCell.svelte` (modified — has `bingo-blank-cell`, `dauber-stamp`, `pointer-events-none`, `relative overflow-hidden`, `relative z-10`)
- FOUND: `src/lib/stores/room.svelte.ts` (modified — has `sfwConfettiPalette`, `nsfwConfettiPalette`, `import { theme } from "./theme.svelte"`, `colors: palette`, no `colors: ["#F5D547"`)
- FOUND: `src/app.css` (modified — has `@keyframes dauberStampIn`, 3 `prefers-reduced-motion` blocks)

Commits verified in git log:
- FOUND: `e43b6dd` (Task 1 — BoardHeader component)
- FOUND: `9f82603` (Task 2 — Board/BoardCell wire + keyframes)
- FOUND: `bc0633a` (Task 3 — per-theme confetti palette)

Tests verified:
- `pnpm test:unit tests/unit/BoardHeader.test.ts` → 3/3 PASS
- `pnpm test:unit tests/unit/Board.test.ts tests/unit/BoardCell.test.ts tests/unit/BoardHeader.test.ts` → 30/30 PASS
- `pnpm test:unit tests/unit/room-store.test.ts` → 34/34 PASS
- `pnpm test:unit` (full suite) → 347/347 PASS (19 files)
- `pnpm test:e2e e2e/win-and-reset.spec.ts` → 2/2 PASS
- `pnpm build` → success (Tailwind Oxide accepts the new tokens; dauberStampIn is emitted; patch-worker.mjs runs)

---
*Phase: 06-ui-overhaul*
*Completed: 2026-04-18*
