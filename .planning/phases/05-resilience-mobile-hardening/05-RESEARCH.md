# Phase 5: Resilience & Mobile Hardening — Research

**Researched:** 2026-04-18
**Domain:** PartyServer reconnect lifecycle, Cloudflare DO alarms, slot-hold pattern, Page Visibility API
**Confidence:** HIGH

---

## Summary

Phase 5 hardens the existing working game (Phases 1-4 complete) against real-meeting failure modes: network drops, phone screen locks, tab backgrounding, and host disappearance. The primary technical work is on the server (GameRoom DO) and the client store (`room.svelte.ts`); the protocol grows by one new message type (`syncState`) and two new client message types (`hello` gains a `reconnect` flag, and `syncRequest` is added).

The slot-hold pattern is the architectural centrepiece: when a player's WS closes, the DO sets a per-player alarm-backed timer (30-60 s) instead of immediately evicting them. If they reconnect within the window, their board, marks, and host role are preserved. If they don't, they are evicted exactly as today. PartySocket's built-in reconnect handles the client side automatically; the store only needs to send a `syncRequest` on re-open and respond to `syncResponse`.

Host failover uses the **DO Alarms API** — the only timer mechanism that survives hibernation. `setTimeout` is disqualified because the runtime cannot reconstruct a closure after the DO is evicted. One alarm per room tracks the oldest pending failover; the alarm handler promotes the next-longest-connected player.

Page Visibility resync is a two-line addition to the store: a `visibilitychange` listener calls `ws.send(syncRequest)` when `document.visibilityState === 'visible'`, which triggers the same server-side snapshot path used for reconnect.

**Primary recommendation:** implement in three plans — (1) server-side slot-hold + host failover alarm + `syncRequest`/`syncResponse` protocol, (2) client store + UI indicator, (3) e2e verification suite.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Slot-hold grace period timer | API / DO | — | State lives in the DO; only the DO can set a durable alarm |
| Player re-identification on reconnect | API / DO | Browser/Client | Server reads `playerId` from query param; client sends stable ID from sessionStorage |
| Full-state snapshot on reconnect | API / DO | — | DO holds authoritative state; client is stateless across WS sessions |
| Host failover promotion | API / DO | — | Server-authoritative; must not be a client decision |
| "Reconnecting…" UI indicator | Browser/Client | — | PartySocket fires close/open events; store translates to status rune |
| Tab-background resync trigger | Browser/Client | — | Page Visibility API is a browser primitive; store acts on it |
| Room-not-found on reaped room | API / DO | Browser/Client | `/exists` endpoint already returns 404; client already handles error route |

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| RESI-01 | Player identity stored in sessionStorage, decoupled from WS connection | `getOrCreatePlayer` already uses sessionStorage keyed by room code — no change needed. Identity survives tab close and network drop. |
| RESI-02 | Server holds player slot 30–60 s after disconnection | Slot-hold via per-player alarm. `onClose` starts a 45 s countdown instead of immediately calling `#players.delete`. Alarm handler evicts if player still absent. |
| RESI-03 | Reconnecting player receives full game state snapshot and resumes session | `onConnect` detects returning player by `playerId` query param. Sends board + marks + `roomState` snapshot. Client store handles `syncResponse`. |
| RESI-04 | UI shows "reconnecting…" indicator when WS is lost | PartySocket already fires `close` on drop; store already sets `status = 'reconnecting'`. Banner component already exists. The gap is the `open` handler resending `hello` / `syncRequest` correctly on reconnect. |
| RESI-05 | If host disconnects, host role transfers to next-longest-connected player | Alarm-backed host failover. `onClose` sets `#pendingHostFailover` alarm for the slot-hold window. If host doesn't reconnect, alarm fires and promotes oldest active connection. |
| RESI-06 | Game resyncs state when browser tab becomes visible again | `visibilitychange` listener in room store sends `syncRequest`. Server responds with full snapshot. |
</phase_requirements>

---

## Key Question Answers

### Q1: How does PartySocket reconnect interact with DO WebSocket Hibernation?

**Two distinct concepts that are often confused:**

**DO wakeup from hibernation** — The DO hibernates when no JS is running (between messages). When a message arrives (from an already-connected client), the DO wakes, its constructor runs (`onStart` fires), and WS connections are restored. The client WebSocket **never closed** during this; from the client's perspective nothing happened.

**Client reconnect** — A fully new TCP+WS handshake initiated by PartySocket's retry logic. This happens when a real network drop occurs. From the DO's perspective this is a brand-new `onConnect` call with a brand-new `conn.id`. The hibernation mechanism has nothing to do with it.

**Critical implication:** `onConnect` fires on EVERY new WebSocket upgrade request, including reconnects. The DO does NOT automatically recognise a reconnecting player — you must read a `playerId` identifier from the request to correlate them.

[VERIFIED: Cloudflare DO docs — "When a WebSocket receives a message when the runtime recreates the Durable Object, a random UUID for the session is attached to the WebSocket" — confirms each new WS gets a new server-side identity unless you override with your own identifier]

[VERIFIED: PartySocket README — `id` option and `_pk` query param set a client-controlled connection.id; `query` option passes arbitrary query params on every connect/reconnect]

### Q2: How to identify a returning player in PartyServer's onConnect?

PartySocket passes `query` params as URL query strings on every connection attempt, including reconnects. The PartyServer `ConnectionContext` exposes `context.request` (a standard `Request`), so:

```typescript
// Client (room.svelte.ts)
const ws = new PartySocket({
  host,
  party: PARTY_NAME,
  room: code,
  query: { playerId: player.playerId },   // sent on every connect + reconnect
});

// Server (game-room.ts) — onConnect
onConnect(conn: Connection, ctx: ConnectionContext) {
  const url = new URL(ctx.request.url);
  const playerId = url.searchParams.get("playerId");
  if (playerId && this.#players.has(playerId)) {
    // returning player — re-tag and send sync
    conn.setState({ playerId });
    this.#sendSyncToConn(conn, playerId);
    return;
  }
  // new player — wait for hello message (existing flow)
}
```

[VERIFIED: PartyServer source — `_pk` query param is read via `url.searchParams.get("_pk")` inside the partyserver package; same mechanism applies to custom params. `ctx.request.url` is the full WS upgrade URL.]

[VERIFIED: PartySocket docs — `query` option accepts an object or async function; it is appended to the WS URL on every connect attempt including retries.]

**Why query param instead of the `hello` message approach:** `onConnect` fires before any message. Reading from the query param lets the server know immediately (without waiting for a round-trip `hello`) whether this is a returning player. The `hello` message path is preserved for new players.

### Q3: How should the DO broadcast full game state on reconnect?

Use a dedicated `syncResponse` server message. Do NOT re-use `boardAssigned` alone because:
- The client may be in any phase (lobby / playing / ended) and needs a consistent snapshot
- The board is private and must go only to that specific connection, not broadcast
- The marks (which cells are checked) are also private

**Recommended approach:**

```typescript
// New ServerMessage variant
{ type: "syncResponse", state: RoomState, board: BoardCell[] | null, markedCellIds: string[] }

// Server sends via conn.send() (never broadcast)
#sendSyncToConn(conn: Connection, playerId: string) {
  const board = this.#boards.get(playerId) ?? null;
  const marks = this.#marks.get(playerId);
  const markedCellIds = marks ? [...marks] : [];
  conn.send(JSON.stringify({
    type: "syncResponse",
    state: this.#snapshot(),
    board,
    markedCellIds,
  }));
}
```

The client store handles `syncResponse` the same way it handles the initial `roomState` + `boardAssigned` combo, updating all state atoms atomically.

**Winner state:** `#snapshot()` does not include winner info today. Either add `winnerId`/`winnerName` to `RoomState`, or include it in `syncResponse` as extra fields. The simpler path is adding optional `winnerId: string | null` to `RoomState` and persisting it.

### Q4: Timer mechanism for host failover in a Cloudflare DO

**`setTimeout` is disqualified under hibernation.** When the DO hibernates (which it does between messages — the whole point of `static options = { hibernate: true }`), any in-memory `setTimeout` callback is lost. The next wakeup cannot recreate it.

**The Alarms API is the only correct mechanism.** Key properties:
- Persists through hibernation — alarm is stored durably by the runtime
- Guaranteed at-least-once delivery (retried with backoff on failure)
- One alarm per DO — must multiplex if needed
- Can be cancelled (`ctx.storage.deleteAlarm()`) or rescheduled with a new `setAlarm()`

**Pattern for host failover with one alarm slot:**

```typescript
// In storage
const K_FAILOVER_PLAYER_ID = "failoverPlayerId"; // player whose slot is expiring
const K_FAILOVER_ALARM_AT  = "failoverAlarmAt";  // scheduled wake time

// onClose
async onClose(conn) {
  const { playerId } = conn.state ?? {};
  if (!playerId) return;

  const isHost = playerId === this.#hostId;

  // Mark player as disconnected (not deleted yet) — store disconnect time
  this.#pendingSlots.set(playerId, { disconnectedAt: Date.now() });
  await this.ctx.storage.put(K_PENDING_SLOTS, [...this.#pendingSlots.entries()]);

  // Schedule slot-expiry alarm (soonest pending slot wins)
  const soonest = this.#earliestPendingSlot();
  this.ctx.storage.setAlarm(soonest + SLOT_HOLD_MS);

  if (isHost) {
    await this.ctx.storage.put(K_FAILOVER_PLAYER_ID, playerId);
  }
  // Broadcast playerDisconnected (not playerLeft) so peers see "..." indicator
  this.broadcast(JSON.stringify({ type: "playerDisconnected", playerId }));
}

// onAlarm
async onAlarm() {
  const now = Date.now();
  for (const [pid, { disconnectedAt }] of this.#pendingSlots) {
    if (now >= disconnectedAt + SLOT_HOLD_MS) {
      // Evict — slot expired
      this.#pendingSlots.delete(pid);
      this.#players.delete(pid);
      this.broadcast(JSON.stringify({ type: "playerLeft", playerId: pid }));

      // Host failover
      if (pid === this.#hostId) {
        this.#promoteNextHost();
      }
    }
  }
  // If more pending slots remain, reschedule for the next expiry
  const next = this.#earliestPendingSlot();
  if (next !== null) {
    this.ctx.storage.setAlarm(next + SLOT_HOLD_MS);
  } else {
    // No more pending — reap check
    this.ctx.storage.setAlarm(Date.now() + IDLE_TTL_MS);
  }
}
```

**Caveat — alarm collision with idle reaper:** The existing `onAlarm` is already used as an idle reaper. This phase must evolve `onAlarm` to multiplex both duties: slot expiry checks first, idle reap second.

[VERIFIED: Cloudflare docs — "Each Durable Object is able to schedule a single alarm at a time"; `setAlarm()` replaces the existing alarm]
[VERIFIED: Cloudflare docs — alarms survive hibernation; setTimeout does not]

### Q5: Page Visibility API + PartySocket for tab-background resync

The integration is a single `visibilitychange` listener in `createRoomStore`. When the tab returns to foreground, the store sends a `syncRequest` message. If the WS is still open (connection survived), the server responds with a full snapshot. If the WS dropped while hidden, PartySocket's reconnect will have already fired (or will fire), and the `open` handler will send the sync.

```typescript
// In createRoomStore (room.svelte.ts)
function handleVisibilityChange() {
  if (document.visibilityState === 'visible' && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({ type: 'syncRequest' }));
  }
}
document.addEventListener('visibilitychange', handleVisibilityChange);

// Cleanup in disconnect()
disconnect() {
  document.removeEventListener('visibilitychange', handleVisibilityChange);
  ws.close();
  connection.status = 'closed';
}
```

[VERIFIED: MDN — `document.visibilityState === 'visible'` fires on tab focus, screen unlock, and alt-tab back]
[ASSUMED: The store is created once per page load and not cleaned up on route change — needs to verify SvelteKit lifecycle. If the page component unmounts and remounts, the listener registration must happen inside an `$effect` or `onMount`/`onDestroy` pair to avoid leaks.]

### Q6: Known gotchas with PartyServer + WebSocket Hibernation affecting reconnect/resume

**Gotcha 1 — `onStart` does NOT restore per-connection state**

`conn.state` (set via `conn.setState()`) IS persisted through hibernation via `serializeAttachment` under the hood — PartyServer handles this. However, the in-memory class fields (`#pendingSlots`, `#players`, etc.) are wiped on every hibernation cycle. `onStart` must rehydrate everything from storage.

The existing code already does this correctly for phases 1-4. Phase 5 adds `#pendingSlots` (disconnected-player grace period map) — this must also be persisted and rehydrated in `onStart`.

**Gotcha 2 — `conn.setState` size limit is 2048 bytes**

The existing code stores `{ playerId }` only — fine. Phase 5 does not need to add more to `conn.state`.

**Gotcha 3 — `getConnections()` only returns CURRENTLY CONNECTED sockets**

You cannot iterate over disconnected (hibernated-but-pending) connections. The slot-hold map must be a separate data structure (`#pendingSlots: Map<string, { disconnectedAt: number }>`) stored independently of the WS connections.

**Gotcha 4 — alarm cancellation race**

If a disconnected player reconnects before the alarm fires, you must cancel the slot-expiry intent. You can't cancel the alarm itself (if other slots are pending), but you can remove the player from `#pendingSlots` so `onAlarm` skips them. If they were the ONLY pending slot, call `ctx.storage.deleteAlarm()` and restore the idle reaper alarm.

**Gotcha 5 — broadcast on reconnect sends to all connections including new WS**

When a player reconnects, their old `conn.id` is gone. The new connection receives `onConnect`. Do not broadcast `playerJoined` again for a returning player — this would cause other clients to add a duplicate roster entry. Instead, broadcast `playerReconnected` so peers can update their "disconnected" indicator.

**Gotcha 6 — winner state missing from `#snapshot()`**

The current `#snapshot()` does not include `winnerId`/`winnerName`. A player who disconnects during the ended phase and reconnects will get the lobby roster but no winner. Add `winnerId` and `winnerName` as optional fields to `RoomState` and persist/rehydrate them.

**Gotcha 7 — `sessionStorage` does not survive tab close (by design)**

RESI-01 says "player identity is stored in sessionStorage". In Chrome/Safari, `sessionStorage` is per-tab and cleared on tab close. A player who fully closes the tab and reopens it gets a NEW `playerId` — they cannot reclaim their slot. This is acceptable for a meeting game (the slot-hold is for network drops, not intentional tab closes). The requirement "return to the same seat...identified by their sessionStorage token" means the token must survive the tab being alive — it does (session tabs share sessionStorage across navigations within the same tab).

If the product wants full tab-close recovery, `localStorage` would be needed. The requirements do not call for this. [ASSUMED: requirements accept sessionStorage semantics — verify with product owner if in doubt.]

---

## Standard Stack

No new libraries are needed for Phase 5. All resilience work is implemented using existing stack components:

| Component | Already in Stack | Phase 5 Use |
|-----------|-----------------|-------------|
| PartySocket 1.1.16 | Yes | `query` option for playerId, `open` handler for reconnect sync |
| PartyServer 0.4.1 | Yes | `onConnect` reading query params, `onAlarm` for slot-hold |
| DO Storage (`ctx.storage`) | Yes | Persist `#pendingSlots`, `#hostFailover`, `#winnerId` |
| DO Alarms (`ctx.storage.setAlarm`) | Yes (idle reaper) | Extend to slot-hold + host failover |
| Svelte 5 runes | Yes | `status` rune already exists for reconnecting indicator |
| Page Visibility API | Browser built-in | `visibilitychange` listener in store |

---

## Architecture Patterns

### System Architecture Diagram

```
Client (PartySocket)                    GameRoom DO
     |                                       |
     |-- WS drop ---> [PartySocket retries] |
     |                                       |
     |-- new WS connect (query: playerId) -->|
     |                                       |-- onConnect: read playerId from URL
     |                                       |-- if returning: conn.setState + sendSync
     |<---------- syncResponse -------------|
     |   (RoomState + board + markedCellIds)|
     |                                       |
     |                                 [45s alarm pending]
     |-- WS connect within 45s -------->    |
     |                                       |-- cancel slot expiry for playerId
     |                                       |
     |                                 [alarm fires at 45s if no reconnect]
     |                                       |-- evict player
     |                                       |-- if was host: #promoteNextHost()
     |                                       |-- broadcast playerLeft + hostChanged
     |
     |-- tab visible (visibilitychange) ---> ws.send(syncRequest)
     |<---------- syncResponse --------------|
```

### Recommended Changes to Project Structure

```
party/
└── game-room.ts          # Add: #pendingSlots, #winnerId, slot-hold alarm logic,
                          #        #promoteNextHost(), #sendSyncToConn(), onConnect query-param read

src/lib/
├── protocol/
│   └── messages.ts       # Add: syncRequest (client), syncResponse (server),
                          #      playerDisconnected (server), playerReconnected (server),
                          #      hostChanged (server); add winnerId/winnerName to RoomState
└── stores/
    └── room.svelte.ts    # Add: syncResponse handler, visibilitychange listener,
                          #      send playerId in query param, playerDisconnected/Reconnected handlers
```

### Pattern 1: Slot-Hold with Single Alarm Multiplexing

**What:** Store disconnected-player metadata in a DO storage map. Use the one alarm slot to wake at the soonest pending expiry. `onAlarm` iterates all pending slots and evicts expired ones, then reschedules for the next.

**When to use:** Any time you need multiple independent timers in a DO that also uses hibernation.

```typescript
// Source: derived from Cloudflare DO docs (setAlarm / deleteAlarm) + project pattern
const SLOT_HOLD_MS = 45_000; // 45 seconds
const K_PENDING_SLOTS = "pendingSlots"; // Array<[playerId, disconnectedAt]>
const K_WINNER_ID = "winnerId";
const K_WINNER_NAME = "winnerName";

// onClose — start slot hold
onClose(conn: Connection) {
  const { playerId } = (conn.state as { playerId?: string }) ?? {};
  if (!playerId) return;

  this.#pendingSlots.set(playerId, Date.now());
  void this.ctx.storage.put(K_PENDING_SLOTS, [...this.#pendingSlots.entries()]);

  // Schedule alarm for soonest expiry (replaces existing alarm)
  const soonest = Math.min(...this.#pendingSlots.values());
  this.ctx.storage.setAlarm(soonest + SLOT_HOLD_MS);

  this.broadcast(JSON.stringify({ type: "playerDisconnected", playerId }));
}

// onConnect — detect returning player
onConnect(conn: Connection, ctx: ConnectionContext) {
  const url = new URL(ctx.request.url);
  const playerId = url.searchParams.get("playerId") ?? undefined;

  if (playerId && this.#pendingSlots.has(playerId)) {
    // Returning within slot-hold window
    this.#pendingSlots.delete(playerId);
    void this.ctx.storage.put(K_PENDING_SLOTS, [...this.#pendingSlots.entries()]);

    conn.setState({ playerId });
    this.broadcast(JSON.stringify({
      type: "playerReconnected",
      playerId,
      isHost: playerId === this.#hostId,
    }), [conn.id]); // exclude self
    this.#sendSyncToConn(conn, playerId);

    // Cancel alarm if no more pending slots; restore idle reaper
    if (this.#pendingSlots.size === 0) {
      this.ctx.storage.setAlarm(Date.now() + IDLE_TTL_MS);
    }
    return;
  }

  if (playerId && this.#players.has(playerId)) {
    // Player reconnects but was already evicted (outside window) or is a fresh tab
    // with a known playerId — treat as new player but re-use their board if game active
    conn.setState({ playerId });
    this.#sendSyncToConn(conn, playerId);
    return;
  }
  // New player — wait for hello (existing flow unchanged)
}
```

### Pattern 2: Host Promotion

**What:** On host eviction from `onAlarm`, find the player with the smallest `joinedAt` timestamp among currently connected players (longest-connected proxy). Update `#hostId`, persist, broadcast `hostChanged`.

```typescript
// Source: project-derived pattern
#promoteNextHost() {
  const connected = new Set(
    [...this.getConnections()]
      .map(c => (c.state as { playerId?: string } | null)?.playerId)
      .filter(Boolean) as string[]
  );

  let nextHost: Player | null = null;
  for (const player of this.#players.values()) {
    if (!connected.has(player.playerId)) continue;
    if (!nextHost || player.joinedAt < nextHost.joinedAt) nextHost = player;
  }

  if (!nextHost) return; // no connected players left — room will reap

  this.#hostId = nextHost.playerId;
  this.#persistHostId();

  // Update isHost flag on player object
  for (const [pid, p] of this.#players) {
    this.#players.set(pid, { ...p, isHost: pid === this.#hostId });
  }
  this.#persistPlayers();

  this.broadcast(JSON.stringify({
    type: "hostChanged",
    newHostId: this.#hostId,
  }));
}
```

### Pattern 3: syncResponse — Private Full Snapshot

```typescript
// Source: project-derived pattern
#sendSyncToConn(conn: Connection, playerId: string) {
  const board = this.#boards.get(playerId) ?? null;
  const marks = this.#marks.get(playerId);
  conn.send(JSON.stringify({
    type: "syncResponse",
    state: this.#snapshot(),       // public room state
    board,                          // private board (null if not yet dealt)
    markedCellIds: marks ? [...marks] : [],
  }));
}
```

### Pattern 4: Tab-Background Resync (Client)

```typescript
// Source: MDN Page Visibility API + project-derived
// In createRoomStore, after ws construction:

function handleVisibilityChange() {
  if (document.visibilityState === 'visible' && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({ type: 'syncRequest' }));
  }
  // If WS is not open, PartySocket is already reconnecting; the open handler will sync.
}

if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', handleVisibilityChange);
}

// In disconnect():
if (typeof document !== 'undefined') {
  document.removeEventListener('visibilitychange', handleVisibilityChange);
}
```

### Anti-Patterns to Avoid

- **Using `setTimeout` for slot-hold:** Lost on hibernation. Use `ctx.storage.setAlarm()` exclusively.
- **Deleting the player immediately in `onClose`:** Breaks slot-hold. Move deletion to `onAlarm`.
- **Broadcasting `playerJoined` for returning players:** Creates duplicate roster entries on peer clients. Use `playerReconnected` instead.
- **Resending `boardAssigned` standalone on reconnect:** Does not restore phase, marks, or winner. Use `syncResponse` which carries all three.
- **Reading `playerId` only from `hello` message:** `onConnect` fires before messages; correlate in `onConnect` via query param so you can skip the `hello` round-trip for returning players.
- **Checking `ws.readyState` without SSR guard:** `document` is undefined during SSR. Always gate Page Visibility listener with `typeof document !== 'undefined'`.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Client reconnect with exponential backoff | Custom retry loop | PartySocket built-in | Already handles jitter, max delay, buffering |
| Per-connection state across hibernation | Custom serialization | `conn.setState()` / PartyServer `serializeAttachment` | Runtime manages serialization and restoration |
| Durable timer across hibernation | `setTimeout` | `ctx.storage.setAlarm()` | Only alarms survive DO eviction |

---

## Common Pitfalls

### Pitfall 1: Alarm Collision — Slot-Hold vs Idle Reaper
**What goes wrong:** The existing `onAlarm` is purely an idle reaper. Phase 5 calls `setAlarm` for slot expiry. The two uses fight over the single alarm slot.
**Why it happens:** DOs have one alarm. `setAlarm` overwrites the previous scheduled time.
**How to avoid:** Evolve `onAlarm` to check `#pendingSlots.size > 0` first. If slots exist, process them and reschedule for the next pending expiry. Only fall through to idle-reap logic if no slots are pending.
**Warning signs:** Players getting evicted immediately, or idle rooms never being reaped.

### Pitfall 2: `onConnect` Called Before `onStart` Completes
**What goes wrong:** If the DO wakes cold and `onConnect` fires before `onStart`'s async storage reads complete, `this.#pendingSlots` is empty — the returning player is treated as new.
**Why it happens:** PartyServer calls `onStart` once on wake, but it's async. The runtime may deliver the WS connect event before awaits complete.
**How to avoid:** In `onConnect`, await a hydration guard (`this.#hydratedPromise`) before reading `#pendingSlots`. Set the promise in the constructor, resolve it at the end of `onStart`.

```typescript
// Constructor
#hydratedPromise: Promise<void>;
#resolveHydrated!: () => void;
constructor(ctx: DurableObjectState, env: Env) {
  super(ctx, env);
  this.#hydratedPromise = new Promise(r => (this.#resolveHydrated = r));
}

// onStart — end of function
async onStart() {
  // ... existing rehydration ...
  this.#resolveHydrated();
}

// onConnect
async onConnect(conn, ctx) {
  await this.#hydratedPromise;
  // ... safe to read #pendingSlots now ...
}
```

[ASSUMED: PartyServer does not guarantee onStart completes before onConnect is invoked on a cold wake — this is a known pattern in raw DO usage; verify against PartyServer source if needed.]

### Pitfall 3: `#snapshot()` Missing Winner State
**What goes wrong:** A player disconnects during `phase: "ended"` and reconnects. `syncResponse` sends them the snapshot, but no winner is shown — `#snapshot()` does not include `winnerId`/`winnerName`.
**Why it happens:** Winner info was stored only as broadcast payload, not as DO state.
**How to avoid:** Add `#winnerId: string | null = null` and `#winnerName: string | null = null` as DO fields, persist them when `winDeclared` is set, include in `#snapshot()`, and rehydrate in `onStart`.

### Pitfall 4: Duplicate `playerJoined` on Reconnect
**What goes wrong:** Returning player triggers `onConnect`, server broadcasts `playerJoined`, all peers add a duplicate roster entry.
**Why it happens:** Reusing the new-player code path for reconnects.
**How to avoid:** In `onConnect`, if `playerId` is recognized (either in `#pendingSlots` or `#players`), take the reconnect path and broadcast `playerReconnected` instead of `playerJoined`. Client store handles `playerReconnected` by toggling a "disconnected" flag, not adding a new entry.

### Pitfall 5: visibilitychange Listener Leak
**What goes wrong:** Multiple `document.addEventListener('visibilitychange', ...)` calls accumulate if the store is recreated (e.g., play-again cycle navigates back through the room route).
**Why it happens:** Store creation without matched cleanup.
**How to avoid:** Always remove the listener in `disconnect()`. In the Svelte page component, call `store.disconnect()` inside `onDestroy`.

### Pitfall 6: `pendingSlots` Not Rehydrated After Hibernation
**What goes wrong:** DO hibernates while slots are pending. On wake, `#pendingSlots` is empty (in-memory wiped). The alarm fires but `onAlarm` finds nothing to evict.
**Why it happens:** Missing rehydration of the new `K_PENDING_SLOTS` storage key in `onStart`.
**How to avoid:** Add `K_PENDING_SLOTS` to the `onStart` `Promise.all` rehydration block alongside existing keys.

---

## Protocol Changes Required

### New ClientMessage variants

```typescript
// Add to ClientMessage union (messages.ts)
v.object({ type: v.literal("syncRequest") }),
```

### New ServerMessage variants

```typescript
// Add to ServerMessage union (messages.ts)
v.object({
  type: v.literal("syncResponse"),
  state: RoomState,
  board: v.nullable(v.array(BoardCell)),
  markedCellIds: v.array(v.string()),
}),
v.object({
  type: v.literal("playerDisconnected"),
  playerId: v.string(),
}),
v.object({
  type: v.literal("playerReconnected"),
  playerId: v.string(),
  isHost: v.boolean(),
}),
v.object({
  type: v.literal("hostChanged"),
  newHostId: v.string(),
}),
```

### RoomState additions

```typescript
// Extend RoomState (messages.ts)
winnerId: v.nullable(v.string()),
winnerName: v.nullable(v.string()),
```

---

## Suggested Plan Breakdown

**3 plans** — server, client, verification.

### Plan 05-01: Server-Side Slot-Hold + Host Failover + syncResponse

Scope: `party/game-room.ts`, `src/lib/protocol/messages.ts` (schema only)

Tasks:
1. Add `winnerId`/`winnerName` to `RoomState` schema + DO fields; persist/rehydrate; include in `#snapshot()`
2. Add `K_PENDING_SLOTS` to DO storage; rehydrate in `onStart`; add `#pendingSlots` Map
3. Extend `onClose` to populate `#pendingSlots` instead of immediately deleting player; set slot-hold alarm
4. Add `onConnect` query-param read (`playerId`); implement reconnect path: re-tag conn, cancel slot, `#sendSyncToConn`, broadcast `playerReconnected`
5. Implement `#sendSyncToConn` (private full snapshot)
6. Add `syncRequest` handler in `onMessage` — calls `#sendSyncToConn`
7. Evolve `onAlarm` to multiplex slot expiry + host failover + idle reaper
8. Implement `#promoteNextHost()` with joinedAt-based selection
9. Add new ServerMessage schemas: `syncResponse`, `playerDisconnected`, `playerReconnected`, `hostChanged`
10. Add `syncRequest` ClientMessage schema
11. Unit tests: slot-hold eviction, host failover promotion, alarm multiplex

### Plan 05-02: Client Store + UI

Scope: `src/lib/stores/room.svelte.ts`, `src/routes/room/[code]/+page.svelte` (minor), `src/lib/components/` (existing Banner)

Tasks:
1. Add `playerId` to PartySocket `query` option
2. Update `open` handler: send `syncRequest` instead of `hello` if `ws.retryCount > 0` (reconnect), or always send `hello` then `syncRequest` for idempotence
3. Add `syncResponse` handler: update `state`, `board`, `markedCellIds`, `winner` atomically
4. Add `playerDisconnected` handler: mark player as disconnected in UI (e.g., greyed-out in roster)
5. Add `playerReconnected` handler: clear disconnected flag
6. Add `hostChanged` handler: update `state.hostId`, update `isHost` flags on players
7. Add Page Visibility listener: `visibilitychange` → `syncRequest` when visible + open
8. Add listener cleanup in `disconnect()`
9. Call `store.disconnect()` in page `onDestroy`
10. Extend `RoomState` handling to read `winnerId`/`winnerName` from `syncResponse.state`

### Plan 05-03: e2e Verification Suite

Scope: `e2e/` (Playwright)

Tests:
1. Network drop + reconnect: simulate WS close, verify "reconnecting" banner, verify state restored within 2s of reconnect
2. Slot-hold eviction: disconnect player, wait >45 s, verify they appear as left
3. Host failover: disconnect host, wait slot window, verify `hostChanged` received, new host sees Start Game button
4. Tab-background resync: hide tab, mutate game state server-side, show tab, verify state updated
5. Reaped room: let idle room expire via alarm, navigate to code, verify error page

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Playwright (existing) |
| Config file | `playwright.config.ts` |
| Quick run command | `npx playwright test --grep "reconnect"` |
| Full suite command | `npx playwright test` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| RESI-01 | playerId survives WS drop within same tab | unit | `npx vitest run src/lib/session` | Exists (session.ts covered) |
| RESI-02 | Server holds slot 30-60 s | e2e | `npx playwright test --grep "slot-hold"` | Wave 0 gap |
| RESI-03 | Reconnect restores board + marks + phase | e2e | `npx playwright test --grep "reconnect"` | Wave 0 gap |
| RESI-04 | "Reconnecting…" banner visible on drop | e2e | `npx playwright test --grep "reconnecting"` | Wave 0 gap |
| RESI-05 | Host failover on slot expiry | e2e | `npx playwright test --grep "host-failover"` | Wave 0 gap |
| RESI-06 | visibilitychange triggers resync | e2e | `npx playwright test --grep "visibility"` | Wave 0 gap |

### Wave 0 Gaps
- [ ] `e2e/05-resilience.spec.ts` — covers RESI-02/03/04/05/06 (5 new Playwright tests)

---

## Environment Availability

Phase 5 is code-only changes to existing source files. No new external dependencies.

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Cloudflare DO Alarms | RESI-02/05 | Included in existing DO setup | platform | — |
| Page Visibility API | RESI-06 | All modern browsers | browser native | — |
| Playwright | e2e tests | Existing in project | — | — |

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | PartyServer does not guarantee `onStart` completes before `onConnect` on a cold wake | Pitfall 2 | If onStart IS guaranteed synchronous before onConnect, the hydration guard is unnecessary (harmless but extra code) |
| A2 | `sessionStorage` semantics accepted for RESI-01 (tab-close does not preserve identity) | Key Question 6 (gotcha 7) | If product wants cross-tab-close recovery, switch to `localStorage` keyed by room code |
| A3 | `#players` should NOT be deleted on `onClose` when slot-hold is active (deferred to alarm) | Pattern 1 | If the host-failover requirement means "promote immediately on disconnect" (not after timeout), the pattern changes |
| A4 | `player.joinedAt` is a sufficient proxy for "longest-connected" for host promotion | Pattern 2 / RESI-05 | `joinedAt` is set at `hello` time, not WS-connect time. A player who reconnected gets their original `joinedAt` restored — which is correct behaviour |

---

## Open Questions

1. **Should `playerDisconnected` be visible to peers immediately or after a short debounce?**
   - What we know: Broadcast immediately on `onClose`. Mobile networks can drop for 1-2 s then recover.
   - What's unclear: Should we show the "disconnected" indicator immediately (jarring for brief drops) or delay it 5 s?
   - Recommendation: Broadcast immediately server-side (authoritative), but add a 3 s client-side debounce before rendering the "disconnected" badge. If `playerReconnected` arrives within 3 s, skip the visual entirely.

2. **Does the host-failover slot-hold window need to differ from the player slot-hold window?**
   - What we know: RESI-02 says 30–60 s for player slots. RESI-05 says "does not return within the slot-hold window".
   - What's unclear: Should hosts get a longer grace period (they matter more)?
   - Recommendation: Use the same 45 s for both. Complexity of different windows outweighs benefit for a meeting game.

3. **Mid-game reconnect when board was assigned but player entry is gone from `#players`**
   - What we know: `#boards` and `#marks` are keyed by `playerId` and persist through hibernation.
   - What's unclear: If a player's slot expired AND they reconnect, should they get their old board back (they can still play but are no longer "registered")?
   - Recommendation: If `#boards.has(playerId)` but `!#players.has(playerId)`, re-add the player to `#players` with original data if still available, or create a minimal Player record. This is an edge case (outside slot window + still playing); simplest is to treat them as a fresh join who happens to get their board back via `syncResponse`.

---

## Sources

### Primary (HIGH confidence)
- [PartyServer README (Context7: /threepointone/partyserver)] — lifecycle hooks, `conn.setState`, `getConnections`, hibernation option
- [PartySocket API (Context7: /cloudflare/partykit)] — `query` option, `id` option, reconnect options, `_pk` query param mechanism
- [Cloudflare DO WebSocket Hibernation docs](https://developers.cloudflare.com/durable-objects/best-practices/websockets/) — `serializeAttachment`, hibernation semantics
- [Cloudflare DO Alarms API](https://developers.cloudflare.com/durable-objects/api/alarms/) — single alarm per DO, `setAlarm`/`deleteAlarm`, guaranteed delivery
- [Cloudflare DO Lifecycle](https://developers.cloudflare.com/durable-objects/concepts/durable-object-lifecycle/) — setTimeout evicted on hibernation (confirmed)
- [MDN Page Visibility API](https://developer.mozilla.org/en-US/blog/using-the-page-visibility-api/) — `visibilitychange` event, `document.visibilityState`

### Secondary (MEDIUM confidence)
- [PartyServer source (GitHub)](https://github.com/cloudflare/partykit/blob/main/packages/partyserver/src/index.ts) — `_pk` query param → `connection.id`, `ctx.request.url` access pattern
- [Cloudflare DO Hibernation example](https://developers.cloudflare.com/durable-objects/examples/websocket-hibernation-server/) — `serializeAttachment` / `deserializeAttachment` pattern

### Tertiary (LOW confidence)
- None

---

## Metadata

**Confidence breakdown:**
- Server-side slot-hold + alarm pattern: HIGH — DO alarms and their guarantees are well-documented; single alarm multiplexing is a known pattern
- PartySocket `query` param for player identification: HIGH — confirmed via partyserver source and docs
- `onConnect` before `onStart` race: MEDIUM — `onStart` async race is well-documented for raw DOs; PartyServer wrapper behavior not explicitly documented
- Page Visibility integration: HIGH — browser standard, MDN verified
- Winner state gap in `#snapshot()`: HIGH — verified by reading existing `game-room.ts` source

**Research date:** 2026-04-18
**Valid until:** 2026-07-18 (stable platform APIs; PartyServer is actively maintained but API surface is stable)
