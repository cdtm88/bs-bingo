---
phase: 01-foundation-transport-room-lobby-presence
reviewed: 2026-04-19T00:00:00Z
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
  - vitest.config.ts
  - wrangler.jsonc
findings:
  critical: 0
  warning: 3
  info: 3
  total: 6
status: issues_found
---

# Phase 01: Code Review Report

**Reviewed:** 2026-04-19
**Depth:** standard
**Files Reviewed:** 47
**Status:** issues_found

## Summary

This is a re-review. All five critical/warning findings from the previous review (2026-04-16) have been resolved: `session.ts` now has a try/catch around `JSON.parse`; `connection.status` transitions to `"closed"` on terminal close; the home-page join flow now checks room existence before navigating; `console.warn` is gated behind `import.meta.env.DEV`; and `params.code` is validated against the alphabet regex before the DO lookup. Three new warnings surfaced on this pass, plus three info items, none of which were present in the prior review.

The Durable Object hibernation-safety pattern is correctly implemented. Valibot validation gates all inbound messages. The slot-hold reconnect protocol is sound and the debounce-race guard for `playerReconnected` is correctly implemented using an epoch counter. The overall code quality is high.

---

## Warnings

### WR-01: `hello` message allows display-name and `joinedAt` mutation for already-registered players

**File:** `party/game-room.ts:323-361`

**Issue:** The `hello` handler does not check whether the `playerId` is already registered. A player who has joined can send a second `hello` with a different `displayName` and overwrite their record (`this.#players.set(playerId, player)`). The `joinedAt` timestamp is reset to `Date.now()`, corrupting host-promotion ordering (oldest-join wins in `#promoteNextHost`). During the `playing` phase, a player who re-sends `hello` will also re-receive a `roomState` snapshot, potentially desynchronising their local state with the board already assigned.

**Fix:**

```typescript
case "hello": {
  const { playerId, displayName } = result.output;

  // Idempotency guard: do not re-register an already-known player.
  if (this.#players.has(playerId)) {
    // Re-tag the connection and resend current state (duplicate-tab / hot-reload path).
    conn.setState({ playerId });
    conn.send(JSON.stringify({ type: "roomState", state: this.#snapshot() }));
    return;
  }

  // ... rest of existing hello handling unchanged ...
}
```

### WR-02: `onClose` calls `setAlarm` without `await` — alarm write may not survive hibernation

**File:** `party/game-room.ts:606`

**Issue:** `this.ctx.storage.setAlarm(soonest + SLOT_HOLD_MS)` in `onClose` is called without `await` and without `void`. `onClose` is synchronous, so the returned Promise is silently discarded. The Cloudflare guarantee is that awaited storage writes are durable before a handler returns; unawaited writes during the transition to hibernation are not guaranteed to persist. If the write is lost, the slot-hold alarm never fires, the disconnected player's slot is never reaped, and the `#pendingSlots` / `#players` maps accumulate stale entries indefinitely until the next wake.

Note: `#persistPendingSlots()` is also fire-and-forget (`void this.ctx.storage.put(...)`), but fire-and-forget `put` calls are explicitly documented as safe in the DO model because they are coalesced by the platform before the response is sent. The `setAlarm` call is the higher-risk one.

**Fix:** Convert `onClose` to `async` and await the alarm:

```typescript
async onClose(
  conn: Connection,
  _code: number,
  _reason: string,
  _wasClean: boolean
) {
  const state = conn.state as { playerId?: string } | null;
  if (!state?.playerId) return;
  const player = this.#players.get(state.playerId);
  if (!player) return;

  const disconnectedAt = Date.now();
  this.#pendingSlots.set(state.playerId, disconnectedAt);
  this.#persistPendingSlots();

  const soonest = Math.min(...this.#pendingSlots.values());
  await this.ctx.storage.setAlarm(soonest + SLOT_HOLD_MS);

  this.broadcast(JSON.stringify({ type: "playerDisconnected", playerId: state.playerId }));
}
```

### WR-03: `onStart` resets the idle-reaper alarm on every DO wake, defeating idle cleanup

**File:** `party/game-room.ts:160-165`

**Issue:** `onStart` unconditionally calls `ctx.storage.setAlarm(Date.now() + IDLE_TTL_MS)` when `#pendingSlots` is empty. The DO wakes on every incoming request, including the WS upgrade probe from `onBeforeConnect` in `src/worker.ts`. Each wake resets the 30-minute idle clock from the current moment. A room whose last player disconnected cleanly (alarm correctly set in `onAlarm`) will have its reap timer reset every time a new WS connection is probed against that room name — even one from a different user attempting to join a non-existent room (the probe is rejected by `onBeforeConnect` but `onStart` has already run). Under any load, abandoned rooms accumulate indefinitely rather than being reaped at 30 minutes.

**Fix:** Remove the idle alarm reset from `onStart`. The alarm is set correctly by `onAlarm`/`onClose` and survives hibernation:

```typescript
async onStart() {
  this.#hydratedPromise = new Promise((r) => (this.#resolveHydrated = r));

  const [ /* ... all existing storage gets ... */ ] = await Promise.all([ /* ... */ ]);

  // ... all existing field assignments ...

  // Restore slot-hold alarm only — do NOT reset the idle reaper.
  // The idle reaper alarm was set by onAlarm/onClose and persists through hibernation.
  if (this.#pendingSlots.size > 0) {
    const soonest = Math.min(...this.#pendingSlots.values());
    await this.ctx.storage.setAlarm(soonest + SLOT_HOLD_MS);
  }
  // No else branch — the idle alarm is already scheduled from before hibernation.

  this.#resolveHydrated();
}
```

---

## Info

### IN-01: `hello` sends `roomState` snapshot before board is dealt — reconnecting player in `playing` phase sees stale state

**File:** `party/game-room.ts:346-360`

**Issue:** The `hello` handler sends a `roomState` snapshot that includes `phase: "playing"` but does not include the player's board. A player who navigates to a room that is already in the `playing` phase (via a direct link, not through the join flow) will receive `roomState` with `phase: "playing"` but no `boardAssigned` message. The client mounts the `<Board/>` component (since `phase === "playing"`) but `store.board` remains `null`, rendering an empty board.

The `syncRequest` / `syncResponse` path in `onConnect` handles this for reconnecting players with a known `playerId`. The gap is a truly new player arriving at a room mid-game — they join the `#players` map and receive a board deal only at `startGame` time. This is an intended design constraint (the current code intentionally skips mid-game joins), but there is no error or redirect to communicate this to the new arrival. This is an info item because the behavior matches the design intent; it just lacks a clear user-facing signal.

**Fix (future):** Send a `"game_in_progress"` error code back to a `hello` received while `#phase === "playing"` so the client can show a "game already in progress" message:

```typescript
case "hello": {
  if (this.#phase !== "lobby") {
    conn.send(JSON.stringify({ type: "error", code: "game_in_progress" }));
    return;
  }
  // ... existing hello handling ...
}
```

### IN-02: Magic number `5` (minimum words to start) duplicated between client and server

**File:** `src/routes/room/[code]/+page.svelte:111` and `party/game-room.ts:447`

**Issue:** The minimum-words-to-start threshold appears as the literal `5` in both places. The server enforces it; the client uses it for the `canStart` derived value that enables the Start button. These must stay in sync. A future change to the threshold requires editing two files.

**Fix:** Export a constant from a shared location:

```typescript
// src/lib/protocol/messages.ts (or a new src/lib/util/gameRules.ts)
export const MIN_WORDS_TO_START = 5;
```

Then import and use it in both `+page.svelte` and `game-room.ts`.

### IN-03: `getOrCreatePlayer` structural validation is absent — stale-schema entries silently accepted

**File:** `src/lib/session.ts:9-11`

**Issue:** After the try/catch added in the prior fix, the result of `JSON.parse(existing)` is cast directly to `PlayerSession` without checking that `playerId` and `displayName` fields exist and are strings. If a future schema change adds required fields, or if a browser extension writes a partial object under the key, the cast succeeds silently and the caller receives an object missing expected properties. The `displayName: ""` default in the fresh-create path means a missing `displayName` would later cause the `hello` message to be rejected by the server schema (`minLength(1)`), surfacing as a confusing `bad_message` error.

**Fix:**

```typescript
if (existing) {
  try {
    const parsed = JSON.parse(existing) as unknown;
    if (
      parsed !== null &&
      typeof parsed === "object" &&
      typeof (parsed as Record<string, unknown>).playerId === "string" &&
      typeof (parsed as Record<string, unknown>).displayName === "string"
    ) {
      return parsed as PlayerSession;
    }
  } catch {
    // Corrupted entry — fall through.
  }
  sessionStorage.removeItem(key); // clear invalid entry in all error cases
}
```

---

_Reviewed: 2026-04-19_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
