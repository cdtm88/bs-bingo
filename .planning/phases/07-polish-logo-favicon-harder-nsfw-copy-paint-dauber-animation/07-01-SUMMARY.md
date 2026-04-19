---
phase: 07-polish-logo-favicon-harder-nsfw-copy-paint-dauber-animation
plan: 01
subsystem: ui/branding
tags: [logo, theme, svelte5, svg, branding]
dependency-graph:
  requires:
    - src/lib/stores/theme.svelte.ts (theme.current getter)
    - src/lib/copy.ts (copy.brand proxy)
    - SvelteKit $app/state (reactive page.route.id)
  provides:
    - src/lib/components/Logo.svelte (dual-mode Logo: hero + compact)
  affects:
    - src/routes/+page.svelte (hero wordmark replaced by Logo)
    - src/routes/+layout.svelte (compact Logo in persistent chrome, route-guarded)
tech-stack:
  added: []
  patterns:
    - Svelte 5 runes: $derived(theme.current === "nsfw") for theme reactivity
    - Inline style="position:fixed;top;left;z-index" (matches ThemeToggle pattern, bypasses Tailwind scan + wrangler cache)
    - CSS tokens var(--color-accent) on SVG fills — no hardcoded hex
    - Route-guarded chrome: {#if page.route.id !== "/"} prevents duplicate-logo on home
key-files:
  created:
    - src/lib/components/Logo.svelte
    - tests/unit/Logo.test.ts
  modified:
    - src/routes/+page.svelte
    - src/routes/+layout.svelte
decisions:
  - Inline SVG authored in the component (no /static asset) — one file, theme-reactive by $derived, zero request overhead on theme flip
  - Compact Logo positioned top-left via inline style to mirror ThemeToggle (top-right) — keeps Tailwind out of the fixed-position critical path
  - Trailing accent dot `.` lives only on hero variant (compact wordmark stays clean in chrome)
  - NSFW icon echoes the dauber splat shape from BoardCell; SFW icon uses a 3×3 grid with one filled cell (clean corporate)
metrics:
  duration: ~4 minutes
  completed_date: 2026-04-19
---

# Phase 7 Plan 1: Logo Component Summary

One-liner: Dual-mode SVG Logo (SFW grid / NSFW dauber) + theme-reactive wordmark, mounted as hero on the home page and as a route-guarded compact header on every other route.

## What Shipped

- **`src/lib/components/Logo.svelte`** — Theme-reactive Svelte 5 component with two sizes:
  - `size="hero"` → `<header>` with large inline SVG icon + `<h1>Brand.</h1>` wordmark (trailing accent dot).
  - `size="compact"` → `<a href="/">` with small icon + brand text + `aria-label={copy.brand}`.
  - SFW icon: 9-rect grid (one filled) using `fill="var(--color-accent)"` and `stroke="var(--color-accent)"`.
  - NSFW icon: irregular dauber `<path>` using `fill="var(--color-accent)"` with 0.85 opacity — echoes BoardCell dauber.
  - Reactive via `$derived(theme.current === "nsfw")` — icon and wordmark swap instantly on Professional Mode toggle.

- **`tests/unit/Logo.test.ts`** — 13 assertions across 4 describe blocks covering: SFW wordmark + grid rects, NSFW wordmark + dauber path, hero/compact class selection, anchor href + aria-label, default-size = compact, and `var(--color-accent)` fill assertions on both variants.

- **`src/routes/+page.svelte`** — Replaced the hand-rolled hero `<header><h1>{copy.brand}<span>.</span></h1>…</header>` block with `<Logo size="hero" />`; tagline `<p>` preserved as a sibling with explicit `text-center` class (was previously inherited from the outer header).

- **`src/routes/+layout.svelte`** — Added `Logo` + `{ page } from "$app/state"` imports; mounted `<Logo size="compact" />` inside a fixed top-left container, guarded by `{#if page.route.id !== "/"}` so the home page shows only the hero Logo (no duplicate). ThemeToggle's top-right inline style is unchanged.

## Verification

- `pnpm test:unit` — **360/360 passing** (13 new Logo tests + all pre-existing suites green).
- `pnpm check` — 30 errors total, all pre-existing in `src/worker.ts` and `tests/unit/game-room.test.ts`. Verified unchanged from base commit (stashed + re-ran). Zero new errors in `Logo.svelte`, `+page.svelte`, or `+layout.svelte`.

## Must-Haves Truth Table

| Truth | Status |
|-------|--------|
| Home page shows dual-mode hero logo per theme | ✓ `<Logo size="hero" />` in +page.svelte |
| Every non-home route shows compact logo in persistent chrome | ✓ layout renders it, guarded by `page.route.id !== "/"` |
| Logo variant flips instantly on Professional Mode toggle — no reload | ✓ `$derived(theme.current === "nsfw")` reacts on each theme.set() |
| Home page shows exactly one logo (hero only) | ✓ route guard excludes compact on "/" |
| Logo icon SVG fills use var(--color-accent) | ✓ `grep '#[0-9A-Fa-f]{3,6}' Logo.svelte` → zero matches |
| ThemeToggle's fixed top-right position untouched | ✓ grep confirms `position:fixed;top:1rem;right:1rem` intact |

## Commits

| Commit | Task | Message |
|--------|------|---------|
| `5697e03` | 1 (RED) | `test(07-01): add failing test for Logo component` |
| `f36036b` | 1 (GREEN) | `feat(07-01): implement Logo component with SFW/NSFW variants` |
| `6f59b60` | 2 | `feat(07-01): wire Logo into home hero and layout header` |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Installed missing node_modules**
- **Found during:** Task 1 RED test run
- **Issue:** `pnpm test:unit` failed with `vitest: command not found` — worktree checkout did not have dependencies installed.
- **Fix:** `pnpm install --frozen-lockfile` in `ai/bs-bingo/`.
- **Files modified:** none (pnpm-managed `node_modules`).
- **Commit:** n/a (infrastructure fix, not a code change).

No other deviations — plan executed exactly as written.

## Authentication Gates

None.

## Known Stubs

None. Logo renders real, theme-reactive content from `copy.brand` and `theme.current`.

## TDD Gate Compliance

- RED commit: `5697e03` (`test(07-01):` — test file first, confirmed failing).
- GREEN commit: `f36036b` (`feat(07-01):` — implementation, all 13 Logo tests pass).
- REFACTOR: not needed (component was clean on first pass).

## Deferred Issues

- Pre-existing `svelte-check` errors in `src/worker.ts` (30) and `tests/unit/game-room.test.ts` — out of scope for this plan. Filed for future hygiene work.

## Self-Check: PASSED

- `src/lib/components/Logo.svelte` → FOUND
- `tests/unit/Logo.test.ts` → FOUND
- `src/routes/+page.svelte` (modified) → FOUND
- `src/routes/+layout.svelte` (modified) → FOUND
- Commit `5697e03` → FOUND in git log
- Commit `f36036b` → FOUND in git log
- Commit `6f59b60` → FOUND in git log
