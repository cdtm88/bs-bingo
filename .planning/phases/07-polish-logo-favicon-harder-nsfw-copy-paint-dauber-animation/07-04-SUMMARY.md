---
phase: 07-polish-logo-favicon-harder-nsfw-copy-paint-dauber-animation
plan: "04"
subsystem: animation/ui
tags: [animation, css, nsfw, accessibility, e2e, unit-test]
dependency_graph:
  requires: []
  provides:
    - dauber-wrap markup pattern in BoardCell.svelte
    - dauberBleed keyframes + .dauber-wrap::after bleed ring rule in app.css
    - NSFW unit test coverage for dauber-wrap presence and pointer-events chain
    - prefers-reduced-motion e2e guard verification
  affects:
    - src/app.css
    - src/lib/components/BoardCell.svelte
    - tests/unit/BoardCell.test.ts
    - e2e/reduced-motion.spec.ts
tech_stack:
  added: []
  patterns:
    - CSS scale-overshoot keyframes (cubic-bezier stamp animation)
    - CSS ::after pseudo-element expanding ring animation
    - prefers-reduced-motion @media guard on both animation targets
    - Playwright stylesheet CSS inspection for pseudo-element animation verification
key_files:
  created:
    - e2e/reduced-motion.spec.ts
  modified:
    - src/app.css
    - src/lib/components/BoardCell.svelte
    - tests/unit/BoardCell.test.ts
decisions:
  - "Used stylesheet rule inspection (cssRules iteration) instead of getComputedStyle(el, '::after') for pseudo-element animation tests — pseudo-elements require a rendered layout context that probe elements don't provide."
  - "Added waitForLoadState('networkidle') to all e2e tests that inspect stylesheets — wrangler dev serves CSS via a separate immutable asset URL that loads asynchronously after HTML."
metrics:
  duration: "~35 minutes"
  completed: "2026-04-19"
  tasks_completed: 4
  files_changed: 4
---

# Phase 7 Plan 04: Paint Dauber Impact + Ink Bleed Ring Animation Summary

**One-liner:** Scale-overshoot stamp (180ms cubic-bezier) + expanding ink bleed ring (::after, 400ms 60ms delay) with prefers-reduced-motion guard and full unit/e2e coverage.

## Tasks Completed

| # | Name | Commit | Files |
|---|------|--------|-------|
| 1 | Replace dauber keyframes + add bleed ring CSS | f778fb4 | src/app.css |
| 2 | Wrap BoardCell dauber stamp with .dauber-wrap | f778fb4 | src/lib/components/BoardCell.svelte |
| 3 | Extend BoardCell.test.ts with NSFW dauber coverage | f778fb4 | tests/unit/BoardCell.test.ts |
| 4 | E2E spec — prefers-reduced-motion guard | f778fb4 | e2e/reduced-motion.spec.ts |

## What Was Built

### CSS (src/app.css)
- Replaced flat `dauberStampIn` (120ms ease-out, scale 0.6→1) with overshoot keyframes: `0% scale(0.5) → 60% scale(1.08) → 100% scale(1.0)` at 180ms `cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards`
- Added `dauberBleed` keyframes: scale 0.9→1.6, opacity 0.5→0
- Added `.dauber-wrap::after` rule: `content: ''`, `position: absolute`, `inset: 0`, `border-radius: 50%`, `background: var(--color-accent)`, `opacity: 0`, `animation: dauberBleed 400ms 60ms ease-out forwards`
- Single `@media (prefers-reduced-motion: reduce)` block collapses `.dauber-stamp { animation: none; opacity: 0.72 }` and `.dauber-wrap::after { animation: none }`

### BoardCell.svelte (src/lib/components/BoardCell.svelte)
- NSFW-marked branch now has: outer `<span class="... dauber-wrap ...">` (pointer-events-none, aria-hidden) hosting the `::after` bleed ring; inner `<span class="absolute inset-0 flex items-center justify-center">` for flex-centering; `<svg class="w-[85%] h-[85%] dauber-stamp">` for the stamp animation target
- SVG path, fill, viewBox, opacity unchanged

### BoardCell.test.ts
- Added `import { theme }` and new `describe("BoardCell — NSFW dauber ...")` block with 6 assertions: `.dauber-wrap` presence, `pointer-events-none` on wrapper, `.dauber-stamp` on SVG (not outer span), click-through via button, SFW non-rendering, unmarked non-rendering
- All 353 tests pass

### e2e/reduced-motion.spec.ts
- 4 Playwright tests: reduce disables `.dauber-stamp` (getComputedStyle probe), reduce has `.dauber-wrap::after` in `@media` block (CSSMediaRule inspection), no-preference resolves `.dauber-stamp` animationName to `"dauberStampIn"`, no-preference stylesheet contains `dauberBleed` in `.dauber-wrap::after` rule

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Added waitForLoadState('networkidle') to e2e tests that inspect stylesheets**
- **Found during:** Task 4 execution
- **Issue:** `p.goto("/")` resolves after HTML received but before the CSS asset (`/_app/immutable/assets/0.*.css`) is applied — `document.styleSheets` was empty or stale for contexts that load CSS async
- **Fix:** Added `await p.waitForLoadState("networkidle")` before any stylesheet inspection
- **Files modified:** e2e/reduced-motion.spec.ts
- **Commit:** f778fb4

**2. [Rule 1 - Bug] Replaced getComputedStyle(el, "::after") with stylesheet rule inspection for pseudo-element tests**
- **Found during:** Task 4 execution
- **Issue:** `getComputedStyle(probe, "::after")` on a freshly-appended div returns `content: "none"` and `animationName: "none"` — pseudo-elements are not rendered until the element is part of a layout context
- **Fix:** Tests 2 and 4 use `sheet.cssRules` iteration to find the relevant CSS rule text directly, which is reliable regardless of layout context
- **Files modified:** e2e/reduced-motion.spec.ts
- **Commit:** f778fb4

**3. [Rule 3 - Blocking] Forced SvelteKit rebuild before e2e test run**
- **Found during:** Task 4 execution
- **Issue:** `wrangler dev` with `reuseExistingServer: true` served the pre-task-1 CSS build (scale 0.6, no dauberBleed, no .dauber-wrap::after) — tests that verified animation names failed against the stale bundle
- **Fix:** Ran `pnpm build` to regenerate the SvelteKit Cloudflare output, then killed the old wrangler dev process before the final e2e run
- **Commit:** N/A (build artifact, not committed)

## Known Stubs

None.

## Threat Flags

None. All security-relevant surfaces (pointer-events chain, prefers-reduced-motion) were addressed as part of the plan's explicit threat model (T-07-10, T-07-11).

## Self-Check: PASSED

- [x] `src/app.css` exists and contains `dauberBleed`
- [x] `src/lib/components/BoardCell.svelte` exists and contains `dauber-wrap`
- [x] `tests/unit/BoardCell.test.ts` exists and contains `dauber-wrap` assertions
- [x] `e2e/reduced-motion.spec.ts` exists
- [x] Commit f778fb4 exists
- [x] `pnpm test:unit -- BoardCell.test.ts` → 353 passed
- [x] `pnpm test:e2e -- reduced-motion.spec.ts` → 4 passed
