---
phase: 06-ui-overhaul
plan: 01
subsystem: ui

tags: [theme, copy, tailwind-v4, svelte-5-runes, data-theme, nsfw, sfw, proxy, localStorage]

requires:
  - phase: 01-foundation
    provides: sessionStorage identity, tailwindcss @theme tokens baseline
  - phase: 05-resilience
    provides: stable Svelte 5 runes store pattern (room.svelte.ts)

provides:
  - theme store ({ current, init, set, toggle }) with localStorage + data-theme attribute
  - copy module (Proxy + interpolation helpers) covering all UI-SPEC Copywriting Contract keys
  - NSFW CSS override block in src/app.css under :root[data-theme="nsfw"]
  - winLinePulse keyframes now read var(--color-accent) — win line colour tracks theme
  - Wave 0 RED test scaffolds (3 unit + 3 e2e) gating downstream plans 02/03/04

affects: [06-02-home-lobby, 06-03-board-endscreen, 06-04-e2e-regression]

tech-stack:
  added: []
  patterns:
    - "Svelte 5 runes store: $state object wrapped in a getter-exposing export (Pitfall 2 compliance)"
    - "Proxy-based reactive copy map: theme.current read on every property access"
    - "Tailwind v4 palette override via :root[data-theme='...'] re-declaring @theme tokens"

key-files:
  created:
    - src/lib/stores/theme.svelte.ts
    - src/lib/copy.ts
    - tests/unit/theme.test.ts
    - tests/unit/copy.test.ts
    - tests/unit/BoardHeader.test.ts
    - e2e/theme-toggle.spec.ts
    - e2e/home-first-visit.spec.ts
    - e2e/narrow-viewport.spec.ts
  modified:
    - src/app.css

key-decisions:
  - "Keep #F5D547 as the canonical SFW accent hex inside @theme — swapped only in animation/shadow rules (deviation vs acceptance criterion)"
  - "Proxy + interpolation helpers co-exist: bare copy.* for static keys, functions for name-interpolated strings"
  - "color-scheme: light declared in NSFW override so browser chrome (scrollbars, form controls) tracks parchment palette"

patterns-established:
  - "Theme-aware tokens: any new colour should reference var(--color-*) never a hex literal outside @theme or :root overrides"
  - "String centralisation: all user-facing strings import from $lib/copy — no inline ternaries on theme"
  - "RED scaffolding first: Wave 0 writes failing tests for modules that ship in later plans"

requirements-completed: [SC-1a, SC-1b, SC-1c, SC-2, SC-5, Toggle-P]

duration: 3min
completed: 2026-04-18
---

# Phase 06 Plan 01: Theme + Copy Foundation Summary

**Dual-theme (SFW/NSFW) foundation — Svelte 5 rune-based theme store with localStorage persistence, Proxy-reactive copy map covering the entire UI-SPEC Copywriting Contract, and a Tailwind v4 @theme override block that repaints the whole app via one `data-theme="nsfw"` attribute.**

## Performance

- **Duration:** ~3 min
- **Started:** 2026-04-18T17:05:34Z
- **Completed:** 2026-04-18T17:08:29Z
- **Tasks:** 3
- **Files created:** 8
- **Files modified:** 1 (src/app.css)
- **Unit tests added:** 3 files, 23 assertions (20 GREEN, 3 RED by design)
- **E2E specs added:** 3 files (RED — target routes/components ship in plans 02–04)

## Accomplishments

- Theme store (`src/lib/stores/theme.svelte.ts`) exposes `theme.current`/`init`/`set`/`toggle` with SSR guards. `theme.init()` reads `localStorage['theme']`, validates against the `'sfw'|'nsfw'` enum, and applies `data-theme` to `document.documentElement`.
- Copy module (`src/lib/copy.ts`) provides a single import surface (`copy`, `winnerSubhead`, `nonWinnerSubhead`, `waitingForHost`) covering every key in UI-SPEC lines 132–179 — no component needs its own ternary.
- CSS token override: one `:root[data-theme="nsfw"]` block re-declares all nine colour tokens plus `color-scheme: light`; the existing `winLinePulse` animation now pulses in orange on NSFW and gold on SFW with zero component changes.
- NSFW blank-cell crosshatch rule (`:root[data-theme="nsfw"] .bingo-blank-cell`) ready for Plan 03's BoardCell.
- Wave 0 test scaffolds are in place so every downstream task has a real `<verify>` target.

## Task Commits

1. **Task 1: Wave 0 RED scaffolds** — `4d1e419` (test)
2. **Task 2: Theme store** — `d37fb70` (feat)
3. **Task 3: Copy module + NSFW CSS override** — `65aeea9` (feat)

## Files Created/Modified

### Created
- `src/lib/stores/theme.svelte.ts` — Svelte 5 rune-backed theme store (40 LOC)
- `src/lib/copy.ts` — Proxy-reactive copy map + 3 interpolation helpers (116 LOC)
- `tests/unit/theme.test.ts` — 6 tests, GREEN
- `tests/unit/copy.test.ts` — 14 tests, GREEN
- `tests/unit/BoardHeader.test.ts` — 3 tests, RED (component ships in Plan 03)
- `e2e/theme-toggle.spec.ts` — 3 tests, RED (ThemeToggle ships in Plan 02)
- `e2e/home-first-visit.spec.ts` — 1 test, RED (home rewrite in Plan 02)
- `e2e/narrow-viewport.spec.ts` — 1 test, RED (toggle placement in Plan 02)

### Modified
- `src/app.css`
  - Added `:root[data-theme="nsfw"]` override block (9 colour tokens + `color-scheme: light`)
  - Added `:root[data-theme="nsfw"] .bingo-blank-cell` crosshatch rule
  - Swapped hard-coded `#F5D547` references in `@keyframes winLinePulse` and the reduced-motion fallback to `var(--color-accent)` — win-line colour now tracks theme

## API Surface for Downstream Plans

```ts
// Theme
import { theme } from "$lib/stores/theme.svelte";
theme.current;   // 'sfw' | 'nsfw' — reactive
theme.init();    // call once in root +layout.svelte onMount
theme.set('nsfw');
theme.toggle();

// Copy
import { copy, winnerSubhead, nonWinnerSubhead, waitingForHost } from "$lib/copy";
copy.brand;                    // "Buzzword Bingo" | "Bullshit Bingo"
copy.startGame;                // "Start Game" | "Start the suffering"
winnerSubhead("Alice");        // "Alice wins!" | "Alice called Bullshit."
nonWinnerSubhead("Alice");     // "Alice called Bingo!" | "Alice called it before you."
waitingForHost("Alice");       // "Waiting for Alice to start the game…" | "Waiting for Alice to pull the trigger…"
```

### Copy keys available
`brand, metaDescription, homeTagline, createCta, joinCta, modalCreateSubmit, modalJoinSubmit, joinModalTitle, emptyName, maxChars, invalidCode, wordInputLabel, wordInputPlaceholder, duplicateWord, startGame, waitingForHostLobby, waitingForPlayers, packCorporate, packAgile, packITJargon, winHeadline, playAgain, endWaitingForHost, reconnectingBanner, errorHeading, errorBody, errorCta`

## Test State After Plan 01

| Test file | State | Reason |
|-----------|-------|--------|
| `tests/unit/theme.test.ts` | GREEN (6/6) | Target module shipped this plan |
| `tests/unit/copy.test.ts` | GREEN (14/14) | Target module shipped this plan |
| `tests/unit/BoardHeader.test.ts` | RED (import-resolution failure) | Component ships Plan 03 |
| `e2e/theme-toggle.spec.ts` | RED | `<ThemeToggle>` + roles ship Plan 02 |
| `e2e/home-first-visit.spec.ts` | RED | Home rewrite in Plan 02 |
| `e2e/narrow-viewport.spec.ts` | RED | Toggle placement in Plan 02 |

**Full-suite regression:** `pnpm test:unit` reports **344 pre-existing tests still passing** + 20 new GREEN tests. The only failure is the expected `BoardHeader.test.ts` import-resolution RED.

## Decisions Made

1. **Kept `#F5D547` in the SFW `@theme` block.** The plan's acceptance criterion and the `<verify>` command (`! grep -q '#F5D547' src/app.css`) would have removed the only canonical definition of the SFW accent, breaking Tailwind v4 token registration. RESEARCH Pattern 1 (lines 476–489) explicitly keeps the hex in `@theme`. Swapped only animation/shadow usages. See "Deviations from Plan" below.
2. **Proxy for copy, functions for interpolation.** The Proxy forwards every property read through `theme.current` so Svelte 5 tracks reactivity; interpolation helpers are plain functions because the Svelte 5 compiler can still track the call-site `theme.current` read.
3. **`color-scheme: light` in NSFW.** Ensures native form controls and scrollbars flip to light on parchment without custom styling.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Acceptance criterion would remove canonical SFW accent definition**
- **Found during:** Task 3 (CSS override)
- **Issue:** Plan acceptance criterion stated `grep "#F5D547" src/app.css returns NO matches`. The `<verify>` command `! grep -q '#F5D547' src/app.css` would only pass if the hex were deleted entirely. But RESEARCH Pattern 1 (the authoritative code example, lines 476–489) keeps `#F5D547` in `@theme` as the SFW token definition — removing it would leave `var(--color-accent)` undefined and break every button, win line, and dauber on SFW.
- **Fix:** Kept `#F5D547` in `@theme` (one occurrence — the canonical source-of-truth). Swapped the three *other* occurrences in `@keyframes winLinePulse` and the reduced-motion fallback to `var(--color-accent)`. This matches the plan's actual intent ("winLinePulse keyframes read var(--color-accent) instead of hardcoded #F5D547" — must_haves.truths line) and the RESEARCH pattern, just not the over-strict grep check.
- **Files modified:** `src/app.css`
- **Verification:** 3 occurrences of `var(--color-accent)` in animation/shadow rules; 1 occurrence of `#F5D547` in `@theme` (canonical SFW token); build passes; all 20 new tests GREEN; no Phase 1–5 regression.
- **Committed in:** `65aeea9` (Task 3 commit)

---

**Total deviations:** 1 auto-fixed (Rule 1 — plan authoring bug in a `<verify>` one-liner that contradicted both the plan's own `must_haves.truths` and the RESEARCH pattern).
**Impact on plan:** None — the real intent (theme-aware win line) is preserved. Downstream plans can reliably reference `var(--color-accent)` and see it flip on `data-theme` change.

## Issues Encountered

- None during execution. The deviation above was caught by reading the `<verify>` line against the `must_haves.truths` and the RESEARCH authoritative example before writing the CSS.

## User Setup Required

None — no external service configuration required. Theme preference is browser-local via `localStorage['theme']`.

## Threat Surface Check

No new network endpoints, auth paths, file access, or schema changes introduced. Threat register T-06-01 through T-06-04 are all mitigated per the plan:

- T-06-01 (localStorage tampering) — `readStored()` enum-validates to `'sfw'` or `'nsfw'` only.
- T-06-02 (copy Proxy tampering) — Proxy defines only a `get` trap; no `set`/`deleteProperty`/`defineProperty`. Strings are `as const` module-scope constants.
- T-06-03 (disclosure) — key holds only `'sfw'`/`'nsfw'`, no PII.
- T-06-04 (SSR DoS) — both `typeof localStorage === "undefined"` and `typeof document === "undefined"` guards present.

## Known Stubs

None. All code ships with real behaviour:
- `theme` store is fully wired to localStorage + DOM.
- `copy` returns real strings for every key in the contract.
- CSS override block is live — a `document.documentElement.setAttribute('data-theme','nsfw')` call today would repaint the existing Phase 1–5 UI (button/focus-ring colours track the accent token).

## Next Phase Readiness

- Plan 02 (home + lobby rewrite) can `import { theme }` from layout and `import { copy, waitingForHost }` throughout the route tree.
- Plan 03 (board + end-screen) can render BoardHeader and expect the Wave-0 scaffold to go GREEN; `copy.winHeadline` and `winnerSubhead`/`nonWinnerSubhead` are ready.
- Plan 04 (e2e regression) has three `*-spec.ts` scaffolds in `e2e/` — no new test files needed; just flip them GREEN as the UI work lands.

## Self-Check: PASSED

Files verified on disk:
- FOUND: `src/lib/stores/theme.svelte.ts`
- FOUND: `src/lib/copy.ts`
- FOUND: `src/app.css` (modified)
- FOUND: `tests/unit/theme.test.ts`
- FOUND: `tests/unit/copy.test.ts`
- FOUND: `tests/unit/BoardHeader.test.ts`
- FOUND: `e2e/theme-toggle.spec.ts`
- FOUND: `e2e/home-first-visit.spec.ts`
- FOUND: `e2e/narrow-viewport.spec.ts`

Commits verified in git log:
- FOUND: `4d1e419` (Task 1 — test scaffolds)
- FOUND: `d37fb70` (Task 2 — theme store)
- FOUND: `65aeea9` (Task 3 — copy + CSS)

Tests verified:
- `pnpm test:unit tests/unit/theme.test.ts` → 6/6 PASS
- `pnpm test:unit tests/unit/copy.test.ts` → 14/14 PASS
- `pnpm test:unit` full suite → 344 pre-existing + 20 new = 364 PASS; only `BoardHeader.test.ts` RED (expected, component ships Plan 03)
- `pnpm build` → success (Tailwind v4 Oxide engine accepted CSS)

---
*Phase: 06-ui-overhaul*
*Completed: 2026-04-18*
