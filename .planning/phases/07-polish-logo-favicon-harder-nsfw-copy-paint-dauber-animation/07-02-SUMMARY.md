---
phase: 07-polish-logo-favicon-harder-nsfw-copy-paint-dauber-animation
plan: 02
subsystem: ui
tags: [favicon, svg, sveltekit, playwright, cloudflare-assets]

# Dependency graph
requires:
  - phase: 06-ui-overhaul
    provides: data-theme attribute on <html> (sfw/nsfw), app.html shell structure
provides:
  - Static neutral bingo-grid favicon at /favicon.svg
  - Mode-agnostic tab identity (shared-screen cover story)
  - E2E regression guard for favicon 200 response + markup wiring + NSFW-term neutrality
affects: [deploy, browser-tab-identity, shared-screen-meetings]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "static/ directory served at root by Cloudflare Assets binding (SvelteKit convention)"
    - "Hardcoded hex in static SVG assets (no CSS custom-property context) — exception to no-hex rule, documented inline"

key-files:
  created:
    - static/favicon.svg
    - e2e/favicon.spec.ts
  modified:
    - src/app.html

key-decisions:
  - "Favicon is mode-neutral (same asset for sfw/nsfw) — no 'Bullshit' text, no dauber splat — per D-04 shared-screen cover story"
  - "Fill color hardcoded to #F5D547 (SFW accent yellow) — static assets have no CSS var context; this is the one acceptable exception to the var(--color-*) rule"
  - "Keep %sveltekit.assets% prefix in link tag for idiomatic SvelteKit (resolves to empty string under Cloudflare adapter)"

patterns-established:
  - "Static root-served assets: place in static/ at repo root; reachable at /<filename>"
  - "Neutrality guard in e2e: assert response body does not contain NSFW-revealing strings"

requirements-completed: []

# Metrics
duration: ~12min
completed: 2026-04-19
---

# Phase 07 Plan 02: Neutral Favicon + Link Fix Summary

**Neutral 3×3 bingo-grid favicon.svg created in new static/ directory, app.html link fixed from broken favicon.png to favicon.svg with image/svg+xml MIME, and Playwright spec added asserting 200 response + markup wiring + shared-screen neutrality (no 'bullshit'/'dauber' strings in body).**

## Performance

- **Duration:** ~12 min
- **Started:** 2026-04-19
- **Completed:** 2026-04-19
- **Tasks:** 2
- **Files created:** 2 (static/favicon.svg, e2e/favicon.spec.ts)
- **Files modified:** 1 (src/app.html)

## Accomplishments

- Eliminated `/favicon.png` 404 in browser devtools Network tab (D-05)
- Established mode-agnostic browser-tab identity so NSFW state cannot be inferred from the tab icon during a shared-screen meeting (D-04, threat T-07-04)
- Created reusable `static/` directory for root-served assets (first-time use in this repo)
- Added 4-test Playwright regression spec covering status code, content-type, markup correctness, and NSFW-term neutrality

## Task Commits

Each task was committed atomically:

1. **Task 1: Create static/favicon.svg + fix src/app.html link** — `51b1a07` (feat)
2. **Task 2: E2E spec — favicon loads with 200 and markup is wired** — `b8b1452` (test)

## Files Created/Modified

- `static/favicon.svg` — created; 3×3 bingo-grid SVG (viewBox 0 0 32 32), top-left cell filled #F5D547, remaining 8 cells stroke-only at #F5D547. No NSFW-revealing strings.
- `src/app.html` — modified line 5; replaced `href="%sveltekit.assets%/favicon.png"` with `href="%sveltekit.assets%/favicon.svg" type="image/svg+xml"`.
- `e2e/favicon.spec.ts` — created; 4 tests asserting /favicon.svg returns 200 with image/svg+xml content-type, link tag wiring, 9-rect grid shape, and neutrality (no 'bullshit'/'dauber' strings).

## Decisions Made

- **Hex-in-SVG exception:** `#F5D547` is hardcoded directly in the SVG because static assets load without stylesheet context (no `var(--color-*)` resolution). Documented inline in the plan (Task 1 action note) as the sole exception to the project's no-hex rule.
- **Mode-agnostic icon:** The same favicon serves both `data-theme="sfw"` and `data-theme="nsfw"` — part of the "shared-screen cover story" that prevents inference of NSFW state via the tab icon.
- **Kept `%sveltekit.assets%` prefix:** Idiomatic SvelteKit; under the Cloudflare adapter the placeholder resolves to an empty string so the fetched URL is still `/favicon.svg`.

## Deviations from Plan

None — plan executed exactly as written.

(Note: A build + dev-server restart was required between writing the files and running the e2e spec — see "Issues Encountered". This was a test-infrastructure step the plan did not explicitly call out, not a plan deviation. The favicon and app.html changes themselves match the plan verbatim.)

## Issues Encountered

- **First e2e run surfaced 4 failures** because `wrangler dev` serves `.svelte-kit/cloudflare/` (the SvelteKit build output), not `src/app.html` and `static/` directly. The running dev server had been booted before the new files existed and was serving a stale build where `app.html` still referenced `favicon.png`.
- **Resolution:** Ran `pnpm build` (which runs `svelte-kit sync && vite build && patch-worker.mjs`) to copy `static/favicon.svg` into `.svelte-kit/cloudflare/` and regenerate the HTML shell. Then killed the old wrangler process on port 5173 and re-ran `pnpm test:e2e favicon.spec.ts` — all 4 tests passed.
- This is the expected behaviour for the Cloudflare adapter workflow and is not a code defect. No follow-up needed.

## TDD Gate Compliance

Task 2 carried `tdd="true"` and the spec commit uses `test(...)` prefix (gate satisfied). The implementation commit (Task 1) preceded it with `feat(...)` prefix. Because the implementation was specified in Task 1 and the test in Task 2, the test was authored *after* the feature already existed in this working tree — the test therefore passed on first run against a rebuilt dev server. No RED-phase failure was observed on the correct build; the early failures were stale-build artefacts, not genuine RED.

## User Setup Required

None — no external service configuration required. Favicon is served by the existing Cloudflare Assets binding.

## Next Phase Readiness

- 07-02 complete; /favicon.png 404 is gone and a passing regression spec exists.
- Plan 07-03 (NSFW copy harder) and 07-04 (paint-dauber animation) are unaffected by this change and can proceed.
- Deploy-time check: when phase 7 ships, verify favicon is visible on first load with no console 404.

## Self-Check: PASSED

Files verified present:
- `static/favicon.svg` — FOUND
- `src/app.html` — FOUND (references favicon.svg with type="image/svg+xml", zero references to favicon.png)
- `e2e/favicon.spec.ts` — FOUND

Commits verified present in git log:
- `51b1a07` feat(07-02): add neutral bingo-grid favicon.svg and fix app.html link — FOUND
- `b8b1452` test(07-02): e2e spec for favicon 200 response + neutrality guard — FOUND

E2E run: 4/4 tests passed in 2.1s against a fresh build.

---
*Phase: 07-polish-logo-favicon-harder-nsfw-copy-paint-dauber-animation*
*Plan: 02*
*Completed: 2026-04-19*
