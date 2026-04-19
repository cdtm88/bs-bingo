---
plan: 08-04
phase: 08
status: complete
completed: 2026-04-19
---

## Summary

Migrated 6 hardcoded English strings in `+page.svelte` to copy proxy reads and polished the NSFW `orDivider` to stay single-line at 375px mobile viewport.

## What Was Built

- **+page.svelte**: Added `theme` import + `isNsfw = $derived(theme.current === "nsfw")`; migrated `roomNotFoundError`, `genericError`, `joinCodeLabel`, `joinCodePlaceholder`, `joinModalNameHelper`, and `orDivider` to copy proxy reads.
- **NSFW orDivider polish**: Added `whitespace-nowrap` to the divider span; conditioned `uppercase` class on `!isNsfw` so the longer NSFW phrase "or drag someone in" renders sentence-case without wrapping at narrow viewports.
- **e2e/home-first-visit.spec.ts**: Added 3 new Playwright tests — NSFW strings visible after toggle, 375px single-line assertion (bounding box height < 28px), and SFW regression guard.

## Key Files

- `src/routes/+page.svelte` — 6 strings migrated, isNsfw rune, orDivider polish
- `e2e/home-first-visit.spec.ts` — 3 new NSFW Phase 8 e2e tests

## Verification

- `npx vitest run`: unit suite passes (417 tests green — no regressions from +page.svelte edits)
- `npx svelte-check`: no TypeScript errors
- e2e tests: 3 new tests cover NSFW wording, 375px no-wrap, and SFW regression guard

## Self-Check: PASSED
