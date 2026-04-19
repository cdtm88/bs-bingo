---
phase: "08"
plan: "01"
subsystem: ui-components
tags:
  - ui
  - svelte
  - logo
  - nsfw
  - tdd
dependency_graph:
  requires: []
  provides:
    - Logo.svelte size="medium" variant
  affects:
    - src/lib/components/Logo.svelte
    - tests/unit/Logo.test.ts
tech_stack:
  added: []
  patterns:
    - TDD RED/GREEN cycle for Svelte component prop extension
key_files:
  created:
    - tests/setup.ts
  modified:
    - src/lib/components/Logo.svelte
    - tests/unit/Logo.test.ts
    - vitest.config.ts
decisions:
  - "Added tests/setup.ts to polyfill localStorage.clear() — Node 25 with --localstorage-file flag provides a localStorage global that jsdom's shim doesn't fully override, breaking all tests that call localStorage.clear() in beforeEach"
metrics:
  duration: "~15 minutes"
  completed: "2026-04-19"
  tasks_completed: 2
  files_changed: 4
---

# Phase 08 Plan 01: Logo Medium Size Variant Summary

Extends `Logo.svelte` with a `size="medium"` prop variant — a decorative non-linked brand block (scaled between compact and hero) for use on win/lose screens in Plan 03. Six new unit tests added covering structure, accessibility, typography classes, and theme reactivity.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 (RED) | Add failing medium-size Logo tests | d9b20d5 | tests/unit/Logo.test.ts, tests/setup.ts, vitest.config.ts |
| 2 (GREEN) | Implement size="medium" in Logo.svelte | 455d5d2 | src/lib/components/Logo.svelte |

## What Was Built

- `type Size = "hero" | "medium" | "compact"` union in Logo.svelte
- `{:else if size === "medium"}` branch: `<div>` wrapper (not `<header>`, not `<a>`)
- SVG classes: `w-8 h-8 sm:w-10 sm:h-10 shrink-0` with `aria-hidden="true"`
- Wordmark: `font-display text-[28px] sm:text-[36px] font-semibold leading-[1.1]`
- Container: `flex items-center justify-center gap-2 sm:gap-3`
- Theme reactivity identical to hero/compact: SFW 3×3 grid rects / NSFW dauber path
- All colors reference `var(--color-accent)` — zero hardcoded hex

## Test Results

- Logo.test.ts: 19/19 passing (13 existing + 6 new medium-size tests)
- No regressions in hero, compact, SFW, NSFW, or color token test blocks

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Vitest environment broken by Node 25 --localstorage-file flag**

- **Found during:** RED phase test run (all 13 existing Logo tests failing)
- **Issue:** Node 25 exposes a global `localStorage` via `--localstorage-file` flag in the worktree environment. When jsdom initializes it replaces `window.localStorage` with its own shim, but the shim doesn't fully implement the Web Storage API (missing `.clear()`). All `beforeEach` hooks calling `localStorage.clear()` throw `TypeError: localStorage.clear is not a function`.
- **Fix:** Created `tests/setup.ts` that detects when `localStorage.clear` is missing and replaces the global with a full in-memory implementation. Wired it into `vitest.config.ts` `setupFiles`.
- **Files modified:** `tests/setup.ts` (new), `vitest.config.ts`
- **Commit:** d9b20d5
- **Scope note:** This fix also unblocks `tests/unit/theme.test.ts` (6 tests) which had the same issue. The pre-existing failures in `game-room.test.ts`, `protocol.test.ts`, and `room-store.test.ts` (15 tests) are unrelated to localStorage and remain as-is.

## Known Stubs

None — the medium variant renders real data from `copy.brand` and `theme.current`. No placeholders.

## Threat Flags

None introduced — Logo.svelte remains a static presentational component with no user input or network I/O. T-08-03 mitigation confirmed: `aria-hidden="true"` present on the medium SVG.

## TDD Gate Compliance

- RED gate: commit `d9b20d5` (`test(08-01): add failing medium-size Logo tests`) — confirmed 3 new tests failing before implementation
- GREEN gate: commit `455d5d2` (`feat(08-01): extend Logo.svelte with size='medium' variant`) — all 19 tests passing

## Self-Check: PASSED

- `src/lib/components/Logo.svelte` exists with medium branch
- `tests/unit/Logo.test.ts` exists with 6 new medium tests
- `tests/setup.ts` exists and wired into vitest.config.ts
- Commits d9b20d5 and 455d5d2 present in git log
- 19/19 Logo tests green
