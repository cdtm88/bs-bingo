---
plan: 08-03
phase: 08
status: complete
completed: 2026-04-19
---

## Summary

Wired `<Logo size="medium" />` into `EndScreen.svelte` in NSFW mode only, and migrated 4 hardcoded English strings to copy proxy reads.

## What Was Built

- **EndScreen.svelte**: Added `Logo` + `theme` imports; derived `isNsfw = $derived(theme.current === "nsfw")`; inserted `{#if isNsfw}<Logo size="medium" />{/if}` as first section child (above `<h1>`) on both winner and non-winner views.
- **Copy migration**: Replaced `"You called it."`, `"."` / `" completed."`, `"Nice try. One more round?"`, and `"Word pool and players are kept..."` with `copy.winnerCallout`, `copy.winLineSuffixWinner`, `copy.winLineSuffixNonWinner`, `copy.nonWinnerConsolation`, `copy.playAgainHostNote`.
- **EndScreen.test.ts**: Added 12 new tests (P8-1..P8-12) covering NSFW logo presence + document order on winner/non-winner views, SFW logo absence, and NSFW/SFW copy correctness for all migrated keys.

## Key Files

- `src/lib/components/EndScreen.svelte` — conditional medium Logo + migrated copy
- `tests/unit/EndScreen.test.ts` — 12 new Phase 8 tests (28 total)

## Verification

- `npx vitest run tests/unit/EndScreen.test.ts`: 28 tests green (16 original + 12 new)
- SFW EndScreen visual output unchanged (no Logo, existing layout)
- NSFW EndScreen shows medium Logo above headline on both views

## Self-Check: PASSED
