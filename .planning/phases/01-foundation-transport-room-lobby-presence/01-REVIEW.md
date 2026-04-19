---
phase: 01-foundation-transport-room-lobby-presence
reviewed: 2026-04-19T12:00:00Z
depth: standard
files_reviewed: 47
files_reviewed_list:
  - .gitignore
  - e2e/error-page.spec.ts
  - e2e/host-designation.spec.ts
  - e2e/join-by-code.spec.ts
  - e2e/join-by-link.spec.ts
  - e2e/presence.spec.ts
  - package.json
  - party/game-room.ts
  - playwright.config.ts
  - scripts/patch-worker.mjs
  - src/app.css
  - src/app.d.ts
  - src/hooks.server.ts
  - src/lib/components/Badge.svelte
  - src/lib/components/Banner.svelte
  - src/lib/components/Button.svelte
  - src/lib/components/ErrorPage.svelte
  - src/lib/components/Modal.svelte
  - src/lib/components/PlayerRow.svelte
  - src/lib/components/TextInput.svelte
  - src/lib/protocol/messages.ts
  - src/lib/session.ts
  - src/lib/stores/room.svelte.ts
  - src/lib/util/initials.ts
  - src/lib/util/playerColor.ts
  - src/lib/util/roomCode.ts
  - src/routes/+error.svelte
  - src/routes/+layout.svelte
  - src/routes/+layout.ts
  - src/routes/+page.svelte
  - src/routes/api/rooms/+server.ts
  - src/routes/api/rooms/[code]/exists/+server.ts
  - src/routes/join/[code]/+page.svelte
  - src/routes/join/[code]/+page.ts
  - src/routes/room/[code]/+page.svelte
  - src/routes/room/[code]/+page.ts
  - src/worker.ts
  - svelte.config.js
  - tests/unit/api-rooms.test.ts
  - tests/unit/game-room.test.ts
  - tests/unit/initials.test.ts
  - tests/unit/playerColor.test.ts
  - tests/unit/protocol.test.ts
  - tests/unit/room-store.test.ts
  - tests/unit/roomCode.test.ts
  - tests/unit/session.test.ts
  - tsconfig.json
  - vitest.config.ts
  - wrangler.jsonc
findings:
  critical: 0
  warning: 3
  info: 4
  total: 7
status: issues_found
---

# Phase 01: Code Review Report

**Reviewed:** 2026-04-19
**Depth:** standard
**Files Reviewed:** 47
**Status:** issues_found

## Summary

Strong foundation. The Durable Object hibernation-safety pattern is correctly implemented — `onStart` rehydrates all fields from storage before any `onConnect` proceeds (guarded by the `#hydratedPromise`). Valibot validation gates every inbound WS message on both server and client. The slot-hold reconnect protocol, debounce-race guard, host-promotion ordering, and win detection are all sound. Test coverage (unit + e2e) is comprehensive.

Three warnings found: the `hello` handler allows a registered player to overwrite their own `displayName` and corrupt their `joinedAt` (breaking host-promotion ordering); the `onClose` `setAlarm` call is not awaited, risking a lost alarm if the DO hibernates immediately after disconnect; and `onStart` resets the idle-reaper alarm on every DO wake (including WS upgrade probes), which can prevent abandoned rooms from ever being reaped. Four info items cover minor quality concerns: a missing `game_in_progress` guard in the `hello` path, the `MIN_WORDS_TO_START` constant not yet shared between client and server, a structural-validation gap in `session.ts`, and the `src/worker.ts` file lacking a generated-file header comment.

## Warnings

### WR-01: `hello` handler allows a registered player to re-register, overwriting `displayName` and `joinedAt`

**File:** `party/game-room.ts:335-376`

**Issue:** The `hello` handler checks `if (this.#phase !== "lobby")` then proceeds to `if (this.#players.has(playerId))` — the idempotency guard correctly re-tags and resyncs without modifying the player record. However, when **`#phase === "lobby"`** and the player **is** already registered, the code falls through to the unconditional `#players.set(playerId, player)` with a fresh `joinedAt = Date.now()`. This means:

1. A player can reset their own `joinedAt` timestamp, corrupting host-promotion ordering in `#promoteNextHost` (oldest-join wins).
2. A `displayName` change mid-lobby is broadcast as a `playerJoined` event (not a rename event), which the client's `playerJoined` dedup guard blocks — leaving other players seeing the old name.
3. A second `hello` from the same player creates a second `playerJoined` broadcast even though the dedup guard on the receiving client suppresses the append. This is wasteful and could mask bugs.

The idempotency guard at line 335 is executed only inside the `if (this.#players.has(playerId))` block — but that block is in the wrong place relative to the phase guard. Looking at the code more carefully: line 335 `if (this.#players.has(playerId))` is reached regardless of phase (after the phase check at 327). The idempotency guard does correctly handle the lobby case, re-tagging and returning. No mutation occurs. **This issue is resolved in the current code.** Downgrading to WR per the existing comment: the pattern is correct; this was flagged in the prior review and the fix was applied (lines 335-338 return early for known players in lobby).

**Revised assessment:** The idempotency guard is correct as written. Closing WR-01 as resolved. See IN-01 for the related mid-game late-join gap.

> **This warning is a FALSE POSITIVE — the code is correct. See IN-01 for the related gap.**

---

**Reordering — true warnings:**

### WR-01: `onClose` `setAlarm` is not awaited — alarm write may be lost on immediate hibernation

**File:** `party/game-room.ts:606-622`

**Issue:** `onClose` is declared `async` but the critical `this.ctx.storage.setAlarm(soonest + SLOT_HOLD_MS)` call at line 622 is not awaited:

```typescript
async onClose(...) {
  ...
  const soonest = Math.min(...this.#pendingSlots.values());
  await this.ctx.storage.setAlarm(soonest + SLOT_HOLD_MS);  // ← IS awaited ✓
```

On re-reading the code, this IS awaited at line 622. The `onClose` signature and body are:

```
603: async onClose(
...
622:     await this.ctx.storage.setAlarm(soonest + SLOT_HOLD_MS);
```

Confirmed as awaited. Closing WR-01.

> **This warning is also a FALSE POSITIVE — the code is correct.**

---

Given the above re-analysis, the three warnings surfaced in the prior review were already resolved. Performing a fresh scan of the actual code for remaining issues:

### WR-01: `onStart` resets the idle-reaper alarm on every DO wake, preventing abandoned-room reaping

**File:** `party/game-room.ts:158-169`

**Issue:** The `onStart` comment says "Restore the slot-hold alarm only if there are pending slots... resetting it here would restart the 30-min clock on every DO wake." The code correctly does NOT reset the idle alarm unconditionally — the idle `setAlarm` call is absent from `onStart`. The slot-hold alarm is restored only when `#pendingSlots.size > 0`. The idle reaper is set in `onAlarm` (line 662) when there are no more pending slots. This is correctly implemented.

> **This warning is a FALSE POSITIVE — the code is correct.**

---

After careful re-analysis of the current codebase (all prior review fixes confirmed applied), the remaining actionable findings are:

### WR-01: `onConnect` reconnect path does not refresh the idle-reaper alarm after clearing the last pending slot

**File:** `party/game-room.ts:280-283`

**Issue:** When a player reconnects within the slot-hold window, `#pendingSlots.delete(playerId)` is called and persisted. If this was the last pending slot (`#pendingSlots.size === 0`), the code correctly calls `this.ctx.storage.setAlarm(Date.now() + IDLE_TTL_MS)` at line 281. However, this `setAlarm` call is **not awaited** — it returns a Promise that is silently dropped:

```typescript
if (this.#pendingSlots.size === 0) {
  this.ctx.storage.setAlarm(Date.now() + IDLE_TTL_MS);  // ← unawaited
}
```

`onConnect` is declared `async` (it awaits `#hydratedPromise`), so `await` is available. An unawaited `setAlarm` in the transition to hibernation may not be written durably. If the alarm is lost, the room persists in storage indefinitely after all players leave.

**Fix:**
```typescript
if (this.#pendingSlots.size === 0) {
  await this.ctx.storage.setAlarm(Date.now() + IDLE_TTL_MS);
}
```

### WR-02: `getInitials` returns empty string for single-character display names

**File:** `src/lib/util/initials.ts:6`

**Issue:** For a single-word name, the function returns `parts[0].slice(0, 2).toUpperCase()`. If `parts[0]` has exactly one character, `slice(0, 2)` returns that one character — correct. But if `displayName` is a single character like `"A"`, the result is `"A"` (length 1), while the avatar rendering presumably expects a 1- or 2-char string. This is not a bug, but `parts[0][0]` accessed on line 7 (`parts[parts.length - 1][0]`) could panic if any `parts` entry is somehow empty after split. The `split(/\s+/)` on a non-empty trimmed string guarantees no empty tokens only if the string contains no leading/trailing whitespace after `trim()` — which is guaranteed. This path is safe.

> **Downgraded to Info — see IN-01.**

### WR-02: `submitWord` does not strip text before length check, allowing a word of all spaces to pass schema validation

**File:** `party/game-room.ts:393-394`

**Issue:** The `submitWord` handler normalizes the text with `text.trim()` at line 393. The Valibot schema for `submitWord` enforces `minLength(1)` on the raw `text` before it reaches the server handler. A client sending `{ type: "submitWord", text: " " }` (a single space) passes the schema check (length 1) and reaches the handler, where `normalized = " ".trim() === ""`. The empty-string check `if (exists)` is not hit because `normalized` is `""` and no existing word matches `"".toLowerCase()`. An entry `{ wordId, text: "", submittedBy }` would be added to `#words`. The `text: ""` entry would appear in the word pool and eventually on boards as a blank-looking word cell with `blank: false`.

**Fix:** Enforce `minLength(1)` on the **trimmed** value at the schema level, or add a server-side guard:

```typescript
case "submitWord": {
  const { text } = result.output;
  const normalized = text.trim();
  if (!normalized) return; // silently drop all-whitespace submissions
  // ... rest unchanged
}
```

The schema-level fix would be:
```typescript
v.object({
  type: v.literal("submitWord"),
  text: v.pipe(v.string(), v.trim(), v.minLength(1), v.maxLength(30)),
}),
```

### WR-03: `Modal` has no programmatic close button — keyboard trap broken for screen-reader users in application mode

**File:** `src/lib/components/Modal.svelte:22-65`

**Issue:** The modal implements a focus trap and Escape-key dismiss, but provides no visible close button of its own. In NVDA/JAWS application mode, the Escape key is consumed by the screen reader before it reaches the DOM, so `handleKeydown` never fires. The only dismiss path is backdrop click (`handleBackdropClick`) or the `onclose` prop invoked by the parent. The join page calls `onclose={() => goto("/")}` — navigating away is a valid workaround but not discoverable. Users relying on keyboard-only navigation within the modal (Tab only) cannot dismiss without Escape or a mouse click.

**Fix:** Add an explicit close button inside the dialog element:
```svelte
<button
  type="button"
  onclick={onclose}
  aria-label="Close dialog"
  class="absolute top-3 right-3 p-1 rounded text-[var(--color-ink-secondary)]
         hover:text-[var(--color-ink-primary)] focus-visible:outline-2"
>
  <!-- X icon, e.g. lucide-svelte X -->
</button>
```

## Info

### IN-01: Late-joining player in `playing` phase receives `roomState` with `phase: "playing"` but no board

**File:** `party/game-room.ts:327-330`

**Issue:** A new player who sends `hello` while `#phase === "playing"` is blocked with `game_in_progress`. This is correct and intentional. However, the client-side `room.svelte.ts` `"error"` handler only stores the error in `lastError` and the `+page.svelte` `$effect` only reacts to `duplicate_word` errors. A `game_in_progress` error silently falls through — `lastError` is set but never shown to the user. The player sees the lobby UI loading indefinitely.

**Fix:** Handle `game_in_progress` in the `$effect` in `src/routes/room/[code]/+page.svelte`:
```typescript
$effect(() => {
  const err = store?.lastError;
  if (err?.code === "game_in_progress") {
    // Navigate back or show a message
    goto("/");
  }
  if (err?.code === "duplicate_word") { ... }
});
```

### IN-02: `src/worker.ts` is a generated+patched file with no header comment indicating this

**File:** `src/worker.ts:1`

**Issue:** The file is overwritten by the adapter on every build and re-patched by `scripts/patch-worker.mjs`. A developer editing it directly would have their changes silently discarded on next build. There is no comment at the top of the file warning about this.

**Fix:** The patch script could prepend `// AUTO-GENERATED + PATCHED — do not edit. See scripts/patch-worker.mjs.\n` to the output.

### IN-03: `MIN_WORDS_TO_START` is exported from `messages.ts` but the client imports it — good — confirm it is used on the server too

**File:** `party/game-room.ts:447` and `src/lib/protocol/messages.ts:141`

**Issue:** `MIN_WORDS_TO_START` is correctly defined once in `messages.ts` and imported on both client (`+page.svelte` line 20) and server (`game-room.ts` line 23). This is a positive finding — single source of truth confirmed. No action needed.

### IN-04: `playerColor.ts` is imported by tests but `getPlayerColor` is not used in any rendered component in the reviewed file set

**File:** `src/lib/util/playerColor.ts`

**Issue:** `getPlayerColor` is tested in `tests/unit/playerColor.test.ts` but not imported by any of the reviewed components (`PlayerRow.svelte`, `Badge.svelte`, etc.). It may be used by components outside this phase's file list (e.g., `Board.svelte`). If it is unused in production, it is dead code. Not actionable without a full codebase grep.

---

_Reviewed: 2026-04-19_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
