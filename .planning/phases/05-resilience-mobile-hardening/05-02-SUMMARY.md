---
phase: "05-resilience-mobile-hardening"
plan: "02"
subsystem: "client"
tags: [resilience, websocket, reconnect, sync, visibility, partysocket, svelte5]
dependency_graph:
  requires: [05-01]
  provides: [client-reconnect-aware-open, sync-response-handler, disconnected-player-tracking, host-change-reflection, tab-background-resync]
  affects: [src/lib/stores/room.svelte.ts, src/routes/room/[code]/+page.svelte]
tech_stack:
  added: []
  patterns:
    - "query option on PartySocket sends playerId on every WS handshake including reconnects"
    - "ws.reconnectAttempts > 0 distinguishes reconnect from first connect in open handler"
    - "syncResponse atomically restores state/board/markedCellIds/winner in one handler"
    - "3s setTimeout debounce on playerDisconnected avoids flicker on transient drops"
    - "visibilitychange listener registered once per store; removed in disconnect() to prevent accumulation"
    - "SSR guard (typeof document !== 'undefined') wraps all document.addEventListener calls"
key_files:
  created: []
  modified:
    - src/lib/stores/room.svelte.ts
    - src/routes/room/[code]/+page.svelte
decisions:
  - "disconnectedPlayerIds debounced 3s client-side to match UX intent — avoids showing disconnected indicator on sub-second drops"
  - "handleVisibilityChange defined before return object so it is reachable in both addEventListener and disconnect() removeEventListener"
  - "iAmHost derivation in +page.svelte reads roomState.hostId which is updated by hostChanged handler — no additional logic needed in the page"
metrics:
  duration: "~10 minutes"
  completed: "2026-04-18T13:32:16Z"
  tasks_completed: 1
  files_changed: 2
---

# Phase 5 Plan 02: Client Resilience Layer Summary

Client-side wiring for the resilience layer: PartySocket query param, reconnect-aware open handler, four new server message handlers (syncResponse, playerDisconnected, playerReconnected, hostChanged), and a tab-background visibilitychange listener with proper cleanup.

## What Was Built

### PartySocket Query Option (RESI-01/03)

`PartySocket` is now constructed with `query: { playerId: player.playerId }`. This option is included in every WebSocket handshake — both the initial connect and every automatic reconnect. The server's `onConnect` handler reads `playerId` from `request.query` to detect slot-window reconnects.

### Reconnect-Aware Open Handler (RESI-04)

The `"open"` event handler now branches on `ws.reconnectAttempts`:

- `> 0` (reconnect): sends `{ type: "syncRequest" }` — server responds with full state snapshot via `syncResponse`
- `=== 0` (first connect): sends `{ type: "hello", playerId, displayName }` — existing new-player flow unchanged

### New Message Handlers

| Message | State mutations |
|---------|----------------|
| `syncResponse` | Atomically sets `state`, `words`, `usedPacks`, `board` (if non-null), `markedCellIds`, and `winner` from server snapshot |
| `playerDisconnected` | After 3s debounce, adds `playerId` to `disconnectedPlayerIds` Set if player is still in roster and not already reconnected |
| `playerReconnected` | Immediately removes `playerId` from `disconnectedPlayerIds` |
| `hostChanged` | Spreads `state` with new `hostId`; remaps `players` array setting `isHost` on the new host |

### Tab-Background Resync (RESI-06)

`handleVisibilityChange` is registered on `document` (with SSR guard). When `visibilityState === "visible"` and `ws.readyState === WebSocket.OPEN`, it sends `syncRequest`. If the WS is not open, PartySocket is already reconnecting — the open handler's `reconnectAttempts > 0` path will send `syncRequest` on reconnect instead.

### Cleanup

`disconnect()` now calls `document.removeEventListener("visibilitychange", handleVisibilityChange)` before closing the socket. The page component's existing `onDestroy(() => store?.disconnect())` (Phase 4) ensures cleanup on component teardown. No new `onDestroy` or `window.addEventListener` calls were added to the page.

### Interface Update

`RoomStore` in `+page.svelte` extended with:
```typescript
disconnectedPlayerIds: Set<string>;
```

## Commits

| Hash | Description |
|------|-------------|
| `5232a9a` | feat(05-02): client resilience layer — query param, reconnect handler, sync messages, visibility listener |

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None — all handlers are fully wired to reactive state. `disconnectedPlayerIds` is returned from the store and typed in the interface; UI consumption (showing a disconnected indicator) is a future plan concern.

## Threat Flags

No new threat surface beyond what the plan's threat model covers:
- T-5-06 (syncResponse info disclosure): syncResponse data is stored locally only — not re-broadcast or logged
- T-5-07 (reconnectAttempts spoofing): accepted — no security boundary
- T-5-08 (visibilitychange accumulation): mitigated — registered once, removed in disconnect()

## Self-Check: PASSED

- FOUND: `src/lib/stores/room.svelte.ts`
- FOUND: `src/routes/room/[code]/+page.svelte`
- FOUND commit `5232a9a`: feat(05-02): client resilience layer
- Build exits 0 (verified)
- visibilitychange count: 2 (addEventListener + removeEventListener)
- All done criteria grep checks passed
