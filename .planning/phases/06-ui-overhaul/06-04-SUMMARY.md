---
phase: 06-ui-overhaul
plan: 04
subsystem: ui
tags: [copy-module, i18n-style, theming, sveltekit, e2e, routes]

# Dependency graph
requires:
  - phase: 06-ui-overhaul
    provides: "copy module with Proxy + interpolation helpers (winnerSubhead, nonWinnerSubhead, waitingForHost); theme store + data-theme attribute; ThemeToggle placed in layout"
provides:
  - "All user-facing UI-SPEC Copywriting Contract strings routed through src/lib/copy.ts (no hardcoded UI strings remain in components/routes)"
  - "Lobby/board route, join-by-link modal, and SvelteKit error page read from copy module"
  - "EndScreen, WordPool, PackPills migrated to copy module"
  - "ThemeToggle narrow-viewport fallback (inline flex footer row <640px) — resolves Plan 06-02 deferred overlap"
  - "Grep-audit clean baseline: phase-wide UI-SPEC strings live only in src/lib/copy.ts (1 acceptable comment match in server route)"
affects: [future-i18n, future-theme-variants, phase-07, copywriting]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "copy-module everywhere: all UI-visible strings via `copy.<key>` or interpolation helpers (winnerSubhead, nonWinnerSubhead, waitingForHost)"
    - "$derived(copy.key) in routes/+error.svelte so status-based branching resolves reactively as theme flips"
    - "ThemeToggle mobile placement = inline flex footer row (in-flow) to avoid overlapping lobby controls at 375px while preserving desktop sidebar placement via `sm:static sm:ml-auto`"

key-files:
  created:
    - ".planning/phases/06-ui-overhaul/06-04-SUMMARY.md"
  modified:
    - "src/lib/copy.ts (Task 1 — added wordPoolEmptyHeading/wordPoolEmptyBody/addWordButton/playersLabel to both sfw + nsfw bundles)"
    - "src/lib/components/EndScreen.svelte (Task 1 — winHeadline, winnerSubhead, nonWinnerSubhead, playAgain, endWaitingForHost)"
    - "src/lib/components/WordPool.svelte (Task 1 — wordPoolEmptyHeading/wordPoolEmptyBody)"
    - "src/lib/components/PackPills.svelte (Task 1 — PACK_IDS + packLabel() lookup from copy.packCorporate/packAgile/packITJargon)"
    - "tests/unit/EndScreen.test.ts (Task 1 — beforeEach theme reset; E8 regex updated to 'Alice called Bingo!')"
    - "src/routes/room/[code]/+page.svelte (Task 2 — wordInputLabel, wordInputPlaceholder, duplicateWord, startGame, waitingForHost(hostName), waitingForPlayers)"
    - "src/routes/join/[code]/+page.svelte (Task 2 — emptyName, maxChars, joinModalTitle, modalJoinSubmit)"
    - "src/routes/+error.svelte (Task 2 — errorHeading/errorBody/errorCta derived from copy; non-404 branch preserves page.error?.message)"
    - "src/lib/components/ThemeToggle.svelte (Task 2 — mobile 'fixed bottom-4 right-4' swapped to inline flex footer row to resolve 06-02 deferred overlap)"
    - "e2e/win-and-reset.spec.ts (Task 2 — '/got Bingo!/' → '/called Bingo!/' to match migrated SFW nonWinnerSubhead)"
    - ".planning/phases/06-ui-overhaul/deferred-items.md (marked 06-02 narrow-viewport RESOLVED; added 06-04 entry for pre-existing presence/host-designation/board-mark flakes)"

key-decisions:
  - "Applied the plan's Step E fallback: ThemeToggle on narrow viewports (<640px) became an inline flex footer row instead of fixed bottom-right. Desktop placement unchanged via sm:static sm:ml-auto. This resolves Plan 06-02's deferred narrow-viewport overlap as a side effect."
  - "Pre-existing e2e flakes (presence.spec.ts SESS-05, host-designation.spec.ts SESS-06, board-mark.spec.ts badge timing) were documented in deferred-items.md rather than fixed. Confirmed pre-existing via pre-edit diff check; scope-boundary per deviation rules."
  - "Left non-UI-SPEC copy untouched: 'Room code', 'Copy code'/'Copied', 'Players · {count}', 'Add' button snippet, 'Your name' TextInput helper — these are not in the UI-SPEC Copywriting Contract and not part of dual-mode theming."
  - "Error route uses `copy.errorHeading` only for 404 branch; non-404 branch keeps its existing 'Something went wrong' + `page.error?.message` (auto-escaped by Svelte) per T-06-13 XSS mitigation in plan's threat model."

patterns-established:
  - "Route-level copy integration: `$derived(copy.key)` in +error.svelte cycles through theme bundles without remounting (theme flip is O(1) DOM repaint)"
  - "ThemeToggle narrow-viewport pattern: 'flex justify-end px-4 py-6 sm:static sm:p-0 sm:ml-auto' keeps toggle in document flow on mobile while preserving desktop sidebar placement"
  - "PackPills.svelte PACK_IDS + packLabel() — id-only source-of-truth list + theme-aware label lookup, so pack labels change automatically on mode flip without re-mounting"

requirements-completed:
  - SC-1c
  - SC-3a
  - SC-3b
  - SC-3c
  - SC-4a
  - SC-4b
  - SC-5

# Metrics
duration: ~45min
completed: 2026-04-18
---

# Phase 06 Plan 04: Copy coverage sweep + grep audit + human UAT Summary

**Final copy coverage sweep: EndScreen/WordPool/PackPills + lobby/join/error routes now read every user-facing string from copy.ts; ThemeToggle narrow-viewport fallback resolves Plan 06-02 overlap; grep-audit clean across the phase.**

## Performance

- **Duration:** ~45min (incl. worktree fast-forward + full test re-runs)
- **Started:** 2026-04-18T17:50:00Z (approx — session resumed after context compaction)
- **Completed:** 2026-04-18T18:00:13Z
- **Tasks:** 2 of 3 auto tasks complete; Task 3 is a `checkpoint:human-verify` gate (awaiting developer UAT approval)
- **Files modified:** 11 (10 src + 1 planning)

## Accomplishments

- **Task 1 (5b08ce4):** Migrated `EndScreen.svelte` (winHeadline, winnerSubhead, nonWinnerSubhead, playAgain, endWaitingForHost), `WordPool.svelte` (empty-state heading + body), `PackPills.svelte` (labels via PACK_IDS + packLabel lookup). Added four new copy keys to both SFW+NSFW bundles: `wordPoolEmptyHeading`, `wordPoolEmptyBody`, `addWordButton`, `playersLabel`. Updated `tests/unit/EndScreen.test.ts` to isolate theme state per test and align E8 assertion with SFW `nonWinnerSubhead` output (`"Alice called Bingo!"`).
- **Task 2 (80c564a):** Migrated `src/routes/room/[code]/+page.svelte` (word-input label/placeholder, Start Game, non-host `waitingForHost(hostName)`, waiting-for-players, duplicate-word fallback), `src/routes/join/[code]/+page.svelte` (validation errors, modal title, submit button), `src/routes/+error.svelte` (heading/body/cta derived from `copy.errorHeading/errorBody/errorCta`). Applied the plan's Step E fallback: changed ThemeToggle mobile placement from `fixed bottom-4 right-4 z-50` to inline `flex justify-end px-4 py-6 sm:static sm:p-0 sm:ml-auto` so it renders at the end of the document flow on narrow viewports (no overlap with lobby Start Game button). Updated `e2e/win-and-reset.spec.ts` `/got Bingo!/` → `/called Bingo!/` to match migrated SFW copy.
- **Grep audit (aggregate command, phase-wide):** The only remaining match for UI-SPEC strings outside `src/lib/copy.ts` is a non-UI code comment in `src/routes/api/rooms/+server.ts:7` (`"At Bullshit Bingo scale"`). This is acceptable — it's a JSDoc comment referencing project scale, not rendered UI text.
- **Full affected e2e suite (18 specs): 18 passed** — `home-first-visit`, `theme-toggle` (3 specs), `join-by-link`, `join-by-code`, `error-page` (2 specs), `win-and-reset` (2 specs), `phase2-lobby` (6 specs), `narrow-viewport`.
- **Full unit suite: 347 passed across 19 test files.**
- **Task 3:** Human-verify checkpoint reached — full UAT checklist in plan's `<how-to-verify>` awaiting developer approval.

## Task Commits

Each task was committed atomically on `worktree-agent-ae60555f`:

1. **Task 1: Migrate EndScreen + WordPool + PackPills to copy.ts** — `5b08ce4` (feat)
2. **Task 2: Migrate route-level strings + narrow-viewport fallback + e2e alignment** — `80c564a` (feat)
3. **Task 3: Human UAT** — CHECKPOINT (no commit; human verification)
4. **Plan metadata:** pending — will be committed after this SUMMARY is written.

_Task 1 was carried over from the prior executor session; the worktree branch was fast-forwarded to include it before Task 2 edits._

## Files Created/Modified

### Created
- `.planning/phases/06-ui-overhaul/06-04-SUMMARY.md` — this file.

### Modified (code)
- `src/lib/copy.ts` — added `wordPoolEmptyHeading`, `wordPoolEmptyBody`, `addWordButton`, `playersLabel` to both sfw and nsfw bundles.
- `src/lib/components/EndScreen.svelte` — winner branch uses `{copy.winHeadline}` + `{winnerSubhead(winner.displayName)}`; non-winner uses `{nonWinnerSubhead(winner.displayName)}`; play-again button `{copy.playAgain}`; host-waiting `{copy.endWaitingForHost}`.
- `src/lib/components/WordPool.svelte` — empty-state heading + body read `copy.wordPoolEmptyHeading` and `copy.wordPoolEmptyBody`.
- `src/lib/components/PackPills.svelte` — `const PACK_IDS = [...]` + `packLabel(id)` resolves from `copy.packCorporate|packAgile|packITJargon`; preserves exact Tailwind class string.
- `src/routes/room/[code]/+page.svelte` — imports `copy, waitingForHost`; migrated word input, Start Game, waiting states, duplicate-word fallback.
- `src/routes/join/[code]/+page.svelte` — imports `copy`; validation errors + modal title + submit button use copy.
- `src/routes/+error.svelte` — derives heading/body/cta from copy.ts for 404 branch; non-404 retains `page.error?.message`.
- `src/lib/components/ThemeToggle.svelte` — wrapper changed to `flex justify-end px-4 py-6 sm:static sm:p-0 sm:ml-auto`; inline HTML comment documents the Step E fallback rationale.

### Modified (test)
- `tests/unit/EndScreen.test.ts` — added `beforeEach(() => { localStorage.clear(); theme.init(); })`; updated E8 regex to `/Alice called Bingo!/`.
- `e2e/win-and-reset.spec.ts` — `/HostAlice got Bingo!/` → `/HostAlice called Bingo!/` (2 locations).

### Modified (planning)
- `.planning/phases/06-ui-overhaul/deferred-items.md` — marked 06-02 narrow-viewport RESOLVED with fix description; added new "06-04 — Deferred" section documenting pre-existing e2e flakes.

## Decisions Made

1. **ThemeToggle mobile placement — chose Step E (footer-row) over Step E alternative (`pb-20` on lobby main).** The footer-row approach (inline flex, in document flow) is simpler and generalizes to every route — no per-route padding tweaks. Desktop placement is unchanged (`sm:static sm:ml-auto`). This also resolves the 06-02 deferred narrow-viewport overlap without touching lobby layout.
2. **Pre-existing e2e flakes deferred rather than fixed.** Verified via pre-edit diff that `presence.spec.ts`, `host-designation.spec.ts`, and `board-mark.spec.ts` fail the same way at HEAD before any Task 2 edits. They target player-list selectors (lobby div-chips vs. playing-phase li rows) and WebSocket badge-update timing — unrelated to copy migration. Documented in `deferred-items.md` per deviation Rule scope boundary.
3. **Error route non-404 branch retained its existing literal `"Something went wrong"` + `page.error?.message`.** Plan's copy contract only covers the 404 heading/body/cta; non-404 errors need to surface server-provided messages for debugging. T-06-13 (XSS via reflected error) is mitigated because Svelte `{...}` text binding auto-escapes.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] ThemeToggle narrow-viewport fallback applied during Task 2**
- **Found during:** Task 2, `e2e/narrow-viewport.spec.ts` run.
- **Issue:** Plan 06-02's original `fixed bottom-4 right-4 sm:static sm:ml-auto z-50` placement caused ThemeToggle to overlap the lobby Start Game button at 375×667 (iPhone SE), failing the `expect(intersects).toBe(false)` assertion.
- **Fix:** Applied the plan's pre-authorized Step E fallback: wrapper class changed to `flex justify-end px-4 py-6 sm:static sm:p-0 sm:ml-auto` so the toggle renders inline at the end of the page body on narrow viewports. Desktop placement unchanged.
- **Files modified:** `src/lib/components/ThemeToggle.svelte`.
- **Verification:** `pnpm test:e2e e2e/narrow-viewport.spec.ts` passes. Intersection check now reports no overlap because the toggle is below-fold in document order.
- **Committed in:** `80c564a` (Task 2 commit).

**2. [Rule 1 - Bug] e2e/win-and-reset.spec.ts assertions out of sync with migrated copy**
- **Found during:** Task 2, post-migration regression test run.
- **Issue:** SFW `nonWinnerSubhead("HostAlice") = "HostAlice called Bingo!"` (not `"HostAlice got Bingo!"`). Pre-migration `EndScreen.svelte` emitted the literal `{winner.displayName} got Bingo!`; the e2e specs still asserted against the pre-migration text.
- **Fix:** Updated both e2e locations to use `/called Bingo!/`.
- **Files modified:** `e2e/win-and-reset.spec.ts`.
- **Verification:** Both tests pass in the affected-specs run.
- **Committed in:** `80c564a` (Task 2 commit).

---

**Total deviations:** 2 auto-fixed (1 Rule 3 blocking, 1 Rule 1 bug)
**Impact on plan:** Both deviations were explicitly anticipated in the plan (Step E fallback guidance + note that test strings may drift after migration). No scope creep.

## Issues Encountered

- **Worktree branch tip missed Task 1's commit.** On resume after context compaction, the worktree branch was at `3912490` while Task 1's commit (`5b08ce4`) had been made on `main` in a different working directory structure. Fast-forwarded the worktree branch via `git merge --ff-only 5b08ce4` since `5b08ce4` is a linear descendant of the worktree's CLAUDE_BASE (`6d27e84c`) and of the previous tip. No other changes to git state.
- **Pre-existing e2e flakes surfaced during full-suite run in prior session** (`presence.spec.ts`, `host-designation.spec.ts`, `board-mark.spec.ts`). Verified pre-existing and documented in `deferred-items.md` rather than auto-fixed.

## Deferred Issues

See `.planning/phases/06-ui-overhaul/deferred-items.md` "06-04 — Deferred" section:
- `e2e/presence.spec.ts::SESS-05` — lobby-selector shape mismatch (`<li>` vs. `<div>` chip).
- `e2e/host-designation.spec.ts::SESS-06` — same selector-shape issue.
- `e2e/board-mark.spec.ts` — peer-mark badge timing flakes.

These predate Plan 06-04 and are not caused by copy migration. Suggested fix owners: a follow-up lobby UX plan or a test-refactor plan that standardizes player-list selectors and timeout windows.

## User Setup Required

None — Phase 6 changes are client-side only.

## Known Stubs

None.

## Threat Flags

None — no new network endpoints, auth paths, file access patterns, or schema changes at trust boundaries. All security-relevant changes align with plan's threat register (T-06-13 XSS mitigation: Svelte auto-escape on `page.error?.message`; T-06-14 copy proxy read-only; T-06-16 duplicate_word fallback is text-interpolated).

## Self-Check

Verified files and commits exist in the worktree:

- `.planning/phases/06-ui-overhaul/06-04-SUMMARY.md` — this file, FOUND once written.
- `src/lib/copy.ts`, `src/lib/components/EndScreen.svelte`, `src/lib/components/WordPool.svelte`, `src/lib/components/PackPills.svelte`, `src/lib/components/ThemeToggle.svelte`, `tests/unit/EndScreen.test.ts`, `src/routes/room/[code]/+page.svelte`, `src/routes/join/[code]/+page.svelte`, `src/routes/+error.svelte`, `e2e/win-and-reset.spec.ts`, `.planning/phases/06-ui-overhaul/deferred-items.md` — FOUND.
- Commit `5b08ce4` (Task 1) — FOUND via `git log`.
- Commit `80c564a` (Task 2) — FOUND via `git log`.

## Next Phase Readiness

- **Task 3 UAT pending:** Developer must complete the full `<how-to-verify>` checklist in the plan: both themes, home/lobby/board/end-screen/error/reduced-motion/mobile-375px/mid-game flip. Resume signal is `"approved"`.
- **Phase 6 status after UAT approval:** complete. All 4 plans closed (Plans 06-01 foundation, 06-02 home + toggle, 06-03 board identity, 06-04 copy sweep).
- **Known deferred items** ready for follow-up plan: presence/host-designation/board-mark e2e stability (see `deferred-items.md`).

---
*Phase: 06-ui-overhaul*
*Completed: 2026-04-18*
