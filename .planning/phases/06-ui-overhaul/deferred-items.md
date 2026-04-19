# Phase 06 — Deferred Items

Items discovered during execution that are out of scope for the current plan and need to be addressed later.

## 06-02 — Deferred

### Narrow-viewport overlap (e2e/narrow-viewport.spec.ts)

- **Discovered during:** Plan 06-02, Task 2 verification
- **Status:** RED — `expect(intersects).toBe(false)` fails at 375×667 (iPhone SE) because the fixed bottom-right ThemeToggle overlaps the lobby's Start Game button.
- **Why deferred:**
  1. Plan 06-02 verification section (lines 519–527) does NOT list `narrow-viewport.spec.ts` among its gates; only `home-first-visit.spec.ts` and `theme-toggle.spec.ts` are required.
  2. The test's "no intersection" assertion conflicts with Plan 06-02's explicit design rationale (line 312): *"<ThemeToggle /> sits AFTER {@render children()} so it lives in document-order last; combined with z-index: 50 and position: fixed (mobile) it overlays content..."*
  3. The resolution requires **lobby-specific** layout changes (e.g. `pb-20` safe-area padding on the lobby container, or moving toggle into a bottom-stack), which belong in Plan 06-03 (board + lobby) or Plan 06-04 (e2e regression).
- **Suggested fix in later plan:** Either:
  - (a) Add mobile bottom padding (`pb-20`) to the lobby main so interactive content clears the 60×44 toggle footprint, or
  - (b) Relax the narrow-viewport assertion to allow overlay when the underlying element has `z-index < 50` (the design intent).
- **Test state:** Remains RED by design until Plan 06-03/04.
- **Resolution — Plan 06-04:** Fixed by changing ThemeToggle placement on narrow viewports (<640px) from `fixed bottom-4 right-4` to an inline flex footer row (`flex justify-end px-4 py-6 sm:static sm:p-0 sm:ml-auto`). The toggle now renders in document-flow at the end of the page body on mobile, so it cannot overlap any in-flow lobby/board content. Desktop placement (sm:static sm:ml-auto) is unchanged.

## 06-04 — Deferred

### Pre-existing e2e flakes (presence, host-designation, board-mark)

- **Discovered during:** Plan 06-04, Task 2 full-suite e2e run
- **Specs failing intermittently:**
  - `e2e/presence.spec.ts::SESS-05` — asserts `b.locator("li", { hasText: "Alice" })` in lobby, but lobby renders players as `<div>` chips (not `<li>`); only playing-phase player row is an `<li>`.
  - `e2e/host-designation.spec.ts::SESS-06` — same selector shape issue with `<li>` in lobby.
  - `e2e/board-mark.spec.ts` — timing flakes on badge `toHaveText("1", { timeout: 1500 })` where the peer badge update occasionally exceeds the 1.5s window.
- **Why deferred:**
  1. Verified pre-existing — these same specs fail at HEAD BEFORE Plan 06-04's Task 2 edits (stash/pop test performed).
  2. Not caused by any string migrated in this plan — selectors are for player names/badges, not UI-SPEC copy.
  3. Scope boundary (executor deviation Rule: only auto-fix issues DIRECTLY caused by the current task's changes).
- **Suggested fix in later plan:**
  - Update lobby to render players inside `<ul><li>` so presence/host-designation assertions match the playing-phase shape, OR update the specs to assert against the lobby div-chip selector instead.
  - Increase `toHaveText` timeout window in board-mark specs to absorb WebSocket roundtrip variance.
