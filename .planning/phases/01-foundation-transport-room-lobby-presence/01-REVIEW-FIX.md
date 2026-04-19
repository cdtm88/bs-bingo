---
phase: 01-foundation-transport-room-lobby-presence
fixed_at: 2026-04-19T12:30:00Z
review_path: .planning/phases/01-foundation-transport-room-lobby-presence/01-REVIEW.md
iteration: 3
findings_in_scope: 7
fixed: 5
skipped: 2
status: partial
---

# Phase 01: Code Review Fix Report

**Fixed at:** 2026-04-19T12:30:00Z
**Source review:** .planning/phases/01-foundation-transport-room-lobby-presence/01-REVIEW.md
**Iteration:** 3

**Summary:**
- Findings in scope: 7
- Fixed: 5
- Skipped: 2

## Fixed Issues

### WR-01: `onConnect` setAlarm not awaited — idle-reaper alarm could be lost

**Files modified:** `party/game-room.ts`
**Commit:** b83b7ea
**Applied fix:** Added `await` to `this.ctx.storage.setAlarm(Date.now() + IDLE_TTL_MS)` inside the `if (this.#pendingSlots.size === 0)` block in `onConnect`, preventing a silently dropped Promise on the transition back from slot-hold to idle.

### WR-02: `submitWord` allows all-whitespace words through schema validation

**Files modified:** `src/lib/protocol/messages.ts`, `party/game-room.ts`
**Commit:** d0c9fb1
**Applied fix:** Added `v.trim()` to the `submitWord` schema pipe in `messages.ts` so whitespace-only strings fail `minLength(1)` before reaching the server. Also added a server-side `if (!normalized) return;` guard in the `submitWord` handler in `game-room.ts` for defense-in-depth.

### WR-03: Modal has no programmatic close button — keyboard trap broken for screen-reader users

**Files modified:** `src/lib/components/Modal.svelte`
**Commit:** c0a9dcc
**Applied fix:** Added an explicit close button (`aria-label="Close dialog"`) with an inline SVG X icon inside the dialog element, conditionally rendered when `onclose` is provided. Positioned `absolute top-3 right-3` with focus-visible outline for keyboard users.

### IN-01: `game_in_progress` error silently hangs the room page

**Files modified:** `src/routes/room/[code]/+page.svelte`
**Commit:** 77de516
**Applied fix:** Added a `game_in_progress` branch to the `$effect` error handler that calls `goto("/")` on receipt. Also added the missing `import { goto } from "$app/navigation"`. Players who try to join mid-game are now redirected home instead of seeing an infinite loading state.

### IN-02: `src/worker.ts` is a patched generated file with no warning comment

**Files modified:** `scripts/patch-worker.mjs`
**Commit:** 76e33f7
**Applied fix:** Updated the `patched` template string in `patch-worker.mjs` to prepend `// AUTO-GENERATED + PATCHED — do not edit directly. See scripts/patch-worker.mjs.` as the first line of every generated `src/worker.ts`.

## Skipped Issues

### IN-03: `MIN_WORDS_TO_START` single-source-of-truth confirmation

**File:** `party/game-room.ts:447` and `src/lib/protocol/messages.ts:141`
**Reason:** Positive finding — no action needed. Reviewer confirmed the constant is correctly defined once in `messages.ts` and imported on both client and server.
**Original issue:** Confirm `MIN_WORDS_TO_START` is used on both client and server (it is).

### IN-04: `getPlayerColor` may be dead code

**File:** `src/lib/util/playerColor.ts`
**Reason:** Confirmed dead code via grep — `getPlayerColor` is not imported by any component in `src/`. Reviewer explicitly marked this as not actionable and suggested no fix. Removal is out of scope for this pass; flagged as a future cleanup todo.
**Original issue:** `getPlayerColor` is tested but not used in any reviewed component.

---

_Fixed: 2026-04-19T12:30:00Z_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 3_
