---
phase: 01-foundation-transport-room-lobby-presence
fixed_at: 2026-04-19T00:00:00Z
review_path: .planning/phases/01-foundation-transport-room-lobby-presence/01-REVIEW.md
iteration: 1
findings_in_scope: 11
fixed: 11
skipped: 0
status: all_fixed
---

# Phase 01: Code Review Fix Report

**Fixed at:** 2026-04-19T00:00:00Z
**Source review:** .planning/phases/01-foundation-transport-room-lobby-presence/01-REVIEW.md
**Iteration:** 1

**Summary:**
- Findings in scope: 11
- Fixed: 11
- Skipped: 0

## Fixed Issues

### CR-01: JSON.parse on sessionStorage value without error handling

**Files modified:** `src/lib/session.ts`, `src/routes/room/[code]/+page.svelte`
**Commit:** 0000771
**Applied fix:** Wrapped `JSON.parse(existing)` in `getOrCreatePlayer` with try/catch that removes the corrupted key and falls through to create a fresh session. Also wrapped the inline `JSON.parse(raw)` in the `myPlayerId` derived block in the room page with try/catch returning `""` on failure.

### WR-01: onStart schedules alarm without await

**Files modified:** `party/game-room.ts`
**Commit:** 39b3c07
**Applied fix:** Added `await` to both `ctx.storage.setAlarm()` calls inside `onStart` (the pending-slots branch and the idle-TTL branch) so the alarm is persisted before the DO begins handling requests.

### WR-02: connection.status never transitions to "closed" on terminal WebSocket close

**Files modified:** `src/lib/stores/room.svelte.ts`
**Commit:** 568438e
**Applied fix:** Changed the `close` event listener to inspect `ev.wasClean` and `ev.code`. A clean close (wasClean=true or code 1000) transitions to `"closed"`; all other closes (PartySocket actively reconnecting, wasClean=false) stay as `"reconnecting"`.
**Note:** requires human verification — logic branch depends on PartySocket's exact close-event semantics.

### WR-03: join flow on home page skips room-existence check

**Files modified:** `src/routes/+page.svelte`
**Commit:** c94074c
**Applied fix:** Added a `fetch(/api/rooms/${pendingJoinCode}/exists)` call in the `"join"` branch of `submitModal`. If the response is not ok, sets `modalError` and returns early — same pattern the `/join/[code]` route uses.

### WR-04: getInitials does not guard against empty string

**Files modified:** `src/lib/util/initials.ts`
**Commit:** 24790a6
**Applied fix:** Added an early return `"?"` when `displayName.trim()` is falsy before splitting, matching the suggested guard exactly.

### WR-05: onAlarm re-arms alarm without await

**Files modified:** `party/game-room.ts`
**Commit:** 38e1299
**Applied fix:** Added `await` to both `ctx.storage.setAlarm()` calls inside `onAlarm` — the pending-slots reschedule branch and the idle-TTL re-arm branch — so the alarm write is durable before the DO can be evicted.

### IN-01: console.warn in production client-side message handler

**Files modified:** `src/lib/stores/room.svelte.ts`
**Commit:** 3300ce6
**Applied fix:** Gated `console.warn("Server error:", ...)` behind `import.meta.env.DEV` so it is a no-op in production builds.

### IN-02: Magic number 2000ms in copy feedback timeouts

**Files modified:** `src/routes/room/[code]/+page.svelte`
**Commit:** 26ce413
**Applied fix:** Introduced `const COPY_FEEDBACK_MS = 2000` at the top of the script block and replaced both `setTimeout` literals with the named constant.

### IN-03: patch-worker.mjs references non-existent postbuild hook

**Files modified:** `scripts/patch-worker.mjs`
**Commit:** aa6d036
**Applied fix:** Updated the comment from "via postbuild in package.json" to "as part of the build script in package.json" to match the actual inline chain in `package.json`.

### IN-04: params.code passed to DO without validation

**Files modified:** `src/routes/api/rooms/[code]/exists/+server.ts`
**Commit:** 66736c5
**Applied fix:** Added a regex guard at the top of the `GET` handler that returns 404 immediately if `params.code` does not match the 6-character unambiguous-alphabet pattern, preventing arbitrary strings from reaching `idFromName`.

### IN-05: TextInput uses both bind:value and oninput — double update risk

**Files modified:** `src/lib/components/TextInput.svelte`
**Commit:** 1fecc3a
**Applied fix:** Replaced `bind:value` on the `<input>` DOM element with a one-way `{value}` prop binding. All writes now flow exclusively through the caller-supplied `oninput` handler. The component's `$bindable` prop still allows callers to use `bind:value` at the component level (e.g., `bind:value={wordInput}`) — Svelte propagates the prop value down to the DOM element correctly.

---

_Fixed: 2026-04-19T00:00:00Z_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
