---
phase: 02-lobby-gameplay-word-submission-start
fixed_at: 2026-04-19T00:00:00Z
review_path: .planning/phases/02-lobby-gameplay-word-submission-start/02-REVIEW.md
iteration: 3
findings_in_scope: 6
fixed: 6
skipped: 0
status: all_fixed
---

# Phase 02: Code Review Fix Report

**Fixed at:** 2026-04-19
**Source review:** `.planning/phases/02-lobby-gameplay-word-submission-start/02-REVIEW.md`
**Iteration:** 3

**Summary:**
- Findings in scope: 6
- Fixed: 6
- Skipped: 0

## Fixed Issues

### WR-01: `state.words` permanently stale after `wordAdded` / `wordRemoved` events

**Files modified:** `src/lib/stores/room.svelte.ts`
**Commit:** a8c2895
**Applied fix:** Added `if (state) state = { ...state, words }` after both the `wordAdded` and `wordRemoved` array updates so `state.words` stays in sync with the standalone `words` array on incremental events.

---

### WR-02: `disconnect()` called twice on SPA navigation teardown

**Files modified:** `src/routes/room/[code]/+page.svelte`
**Commit:** 92dfe0f
**Applied fix:** Removed the `onDestroy` block entirely — the `onMount` return cleanup already handles all teardown. Also removed the now-unused `onDestroy` import from the svelte import line.

---

### WR-03: `TextInput` error text not linked to the input — screen readers will not announce it

**Files modified:** `src/lib/components/TextInput.svelte`
**Commit:** f097957
**Applied fix:** Added `const errorId = $derived(error ? \`${inputId}-error\` : undefined)`. Added `aria-invalid={error ? "true" : undefined}` and `aria-describedby={errorId}` to the `<input>` element. Added `id={errorId}` to the error `<p>`. (IN-03 regex fix applied in the same commit.)

---

### IN-01: `loadStarterPack` pack key uses a type assertion with no runtime fallback

**Files modified:** `party/game-room.ts`
**Commit:** 3d0c867
**Applied fix:** Changed `STARTER_PACKS[pack as keyof typeof STARTER_PACKS]` to `STARTER_PACKS[pack as keyof typeof STARTER_PACKS] ?? []` so an unknown key produces an empty array rather than iterating over `undefined`.

---

### IN-02: Magic number `3` used as default / reset value for `winningGridSize` in three places

**Files modified:** `src/lib/stores/room.svelte.ts`
**Commit:** 88a73c8
**Applied fix:** Introduced `const DEFAULT_GRID_SIZE: 3 | 4 | 5 = 3` above `createRoomStore`. Replaced all `3` literals for `winningGridSize` (initializer, `gameReset` handler, `syncResponse` else-branch, and `?? 3` fallback) with `DEFAULT_GRID_SIZE`.

---

### IN-03: `inputId` derivation strips only whitespace — non-ASCII label characters produce invalid HTML `id` values

**Files modified:** `src/lib/components/TextInput.svelte`
**Commit:** f097957
**Applied fix:** Changed the regex from `replace(/\s+/g, "-")` to `replace(/[^a-z0-9]+/g, "-")` so all non-alphanumeric characters are normalized. Applied in the same commit as WR-03.

---

_Fixed: 2026-04-19_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 3_
