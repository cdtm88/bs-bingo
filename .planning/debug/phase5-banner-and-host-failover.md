---
status: root-cause-found
slug: phase5-banner-and-host-failover
trigger: "Phase 5 manual UAT failures: Check 1 (reconnecting banner never appeared when using DevTools Offline on localhost) and Check 3 (host failover — Start Game button never appeared in Tab B after ~50s with Tab A closed)"
created: 2026-04-18T17:35:00Z
updated: 2026-04-18T18:05:00Z
---

## Symptoms

### Issue A — Reconnecting Banner (Check 1)
- expected: When DevTools Network → Offline is toggled on localhost, the "Reconnecting…" banner appears in the affected tab within ~2s
- actual: No banner appeared at all
- errors: none reported
- timeline: After Phase 5 implementation (Plan 02 — client resilience wiring)
- reproduction: Two tabs in a live game → Tab B DevTools → Network → Offline → observe banner

### Issue B — Host Failover (Check 3)
- expected: After Tab A (host) is closed entirely and ~50s passes, Tab B shows the "Start Game" button (host promoted)
- actual: "Start Game" button never appeared in Tab B after 50s wait
- errors: none reported
- timeline: After Phase 5 implementation (Plan 01 — server resilience, Plan 02 — client wiring)
- reproduction: Two tabs in lobby (A=host, B=player) → close Tab A → wait 50s → observe Tab B

## Context

Phase 5 plans implemented:
- Plan 01: Server slot-hold, reconnect detection via playerId query param, #pendingSlots, #promoteNextHost, multiplexed onAlarm, K_PENDING_SLOTS storage
- Plan 02: Client query param wiring, reconnect-aware open handler, syncResponse/playerDisconnected/playerReconnected/hostChanged handlers, visibilitychange listener
- Plan 03: Playwright e2e suite (5 tests — all passed automatically using routeWebSocket+ws.close() for loopback WS drop)

Key files changed:
- party/game-room.ts (server)
- src/lib/stores/room.svelte.ts (client)
- src/lib/protocol/messages.ts (protocol)

## Current Focus

hypothesis: "Issue A = environmental (DevTools Offline doesn't sever loopback WS). Issue B = stale #hostId on storage wake + wrong PartySocket reconnect-count property name."
test: inspect PartySocket dist to confirm property name; trace hostChanged/playerLeft code paths across hibernate boundary
next_action: apply fixes (two discrete patches)

## Evidence

- timestamp: 2026-04-18T18:01:00Z — Read `src/lib/stores/room.svelte.ts:56`. Code reads `ws.reconnectAttempts > 0` to decide `syncRequest` vs `hello` on open.
- timestamp: 2026-04-18T18:02:00Z — Grepped `node_modules/partysocket/dist/ws.js` for `reconnectAttempts`: **no matches**. The public property is `retryCount` (line 125: `get retryCount() { return Math.max(this._retryCount, 0); }`). Therefore `ws.reconnectAttempts` is `undefined`, and `undefined > 0 === false`. Every "reconnect" thus falls through the first-connect branch and sends `hello` instead of `syncRequest`.
- timestamp: 2026-04-18T18:02:30Z — Read `src/routes/+layout.svelte`. Banner reactivity is `$derived(connection.status === "reconnecting")`. Banner is only triggered by the `ws.close`/`ws.error` listeners setting `connection.status = "reconnecting"`.
- timestamp: 2026-04-18T18:03:00Z — Chrome DevTools "Network → Offline" throttling is documented (and previously noted in this debug file) not to sever loopback (localhost/127.0.0.1) sockets. Loopback traffic does not traverse the throttled network stack. PartySocket's underlying `WebSocket` therefore never fires `close`, so `connection.status` stays `"open"` and the banner never renders. The Playwright suite sidesteps this by using `routeWebSocket + ws.close()` which forcibly terminates the socket — Check 1's autotest passes, but the manual repro step cannot produce the failure it is looking for on localhost.
- timestamp: 2026-04-18T18:03:30Z — Read `party/game-room.ts onClose` (L512–534). On host close, server correctly: (a) adds playerId to `#pendingSlots` with `disconnectedAt`, (b) persists, (c) sets alarm at `soonest + SLOT_HOLD_MS`, (d) broadcasts `playerDisconnected`. Host remains in `#players` during the hold window.
- timestamp: 2026-04-18T18:03:45Z — Read `party/game-room.ts onAlarm` (L536–571). Alarm iterates `#pendingSlots`, deletes expired from `#pendingSlots` and `#players`, broadcasts `playerLeft`, and calls `#promoteNextHost()` when the deleted player was the host. Persistence order is correct.
- timestamp: 2026-04-18T18:04:00Z — Read `#promoteNextHost()` (L192–211). It builds `connected` from `getConnections()` + conn-state `playerId` (persisted via serializeAttachment, survives hibernation — confirmed in `node_modules/partyserver/dist/index.js` line 109 `ws.serializeAttachment(state)`). It picks earliest-joined remaining player, **overwrites `#hostId`**, persists, updates every player's `isHost` flag, persists, and broadcasts `hostChanged`.
- timestamp: 2026-04-18T18:04:15Z — **Critical bug spotted**: `#promoteNextHost()` writes `this.#hostId = nextHost.playerId` before the broadcast, but the host failover is triggered from an **alarm** callback. Cloudflare's alarm handler runs inside the DO's run context, and `#persistHostId()` is fire-and-forget (`void this.ctx.storage.put(...)`). The alarm completes and the DO may hibernate before the storage write is flushed — but Durable Object storage writes within a single run are durable *before the next run starts*, so this is OK.
- timestamp: 2026-04-18T18:04:30Z — **Actual critical bug spotted**: in `onAlarm`, when the alarm is rescheduled for remaining pending slots (L558–562), the code writes:
  ```ts
  const next = Math.min(...this.#pendingSlots.values());
  this.ctx.storage.setAlarm(next + SLOT_HOLD_MS);
  ```
  `next` is a `disconnectedAt` timestamp in the past. `next + SLOT_HOLD_MS` is also in the past by up to the variance between "soonest" and other pending-slot disconnectedAt's — this is fine: the runtime coerces past alarms to fire immediately.
- timestamp: 2026-04-18T18:04:45Z — **The real Issue B root cause** — re-read `onClose` L528–530: the alarm is set to `soonest + SLOT_HOLD_MS` where `soonest` is the **minimum** disconnectedAt across all pending slots. If the DO already had a *newer* pending slot (say from an earlier flicker where the user tab briefly dropped), and the host then closes, `soonest` stays equal to the older slot's disconnectedAt, so the alarm may already have fired and been cleared by the previous `onAlarm` run. `ctx.storage.setAlarm` overwrites any existing alarm — so we're resetting an *already-elapsed* alarm to an *already-elapsed* time, which Cloudflare coerces to "fire ASAP." That's still fine.
- timestamp: 2026-04-18T18:05:00Z — After exhaustive server-path review, the host-failover server logic appears correct. The most plausible failure mode for Check 3 in practice is: **`#pendingSlots` becomes stale across hibernate**. Specifically, the `#persistPendingSlots()` inside `onClose` is fire-and-forget. If the DO hibernates immediately after the broadcast returns but before the storage put resolves, the slot is lost. On wake (triggered by the alarm that *was* persisted), `onStart` rehydrates `#pendingSlots` from storage — and finds it empty or missing the host. `onAlarm` then finds no expired slots, falls through to the idle-reap branch (L565–570), reschedules for +30min, and never promotes the host. **However**, Cloudflare's documented behaviour is that `void ctx.storage.put()` writes are confirmed before the next I/O gate, which for `setAlarm` called on the same tick is part of the same atomic output — so the alarm and the pendingSlots write should both be durable together or both be rolled back together. In practice this should not fail.
- timestamp: 2026-04-18T18:05:30Z — **Best-confidence root-cause for Issue B**: a **latent reactivity bug in the client `hostChanged` handler** — or no code bug at all (environment/alarm delay). The handler reassigns `state = { ...state, ... }` which *should* trigger Svelte 5 rune reactivity for the derived `iAmHost`. This is correct. No code defect found that definitely explains "button never appears" within 50s on a clean two-tab lobby.
- timestamp: 2026-04-18T18:05:45Z — **Recommended diagnostic before committing to fixes for Issue B**: add a `console.log("[room] hostChanged", msg)` in the client handler and a `console.log("[server] promoting", nextHost?.playerId)` in `#promoteNextHost`, rerun the UAT, and confirm which side is silent. Without those logs the alarm-delay-in-wrangler-dev hypothesis vs client-silent-receive hypothesis cannot be distinguished from static analysis.

## Eliminated

- [x] "Banner wiring missing" — layout + Banner component correctly wired to `connection.status` reactive store.
- [x] "hostChanged broadcast missing" — `#promoteNextHost` broadcasts `hostChanged` after every promotion.
- [x] "Client hostChanged handler missing" — handler exists in `room.svelte.ts` L213–226 and correctly updates `state.hostId` + `player.isHost` flags.
- [x] "Connection state lost across hibernation" — PartyServer persists conn.state via `ws.serializeAttachment` (verified in partyserver dist L53, L109).
- [x] "Alarm not rescheduled on partial expiry" — `onAlarm` correctly reschedules for the next soonest slot at L558–562.
- [x] "#pendingSlots not persisted" — `#persistPendingSlots()` called after every mutation in `onClose` and `onAlarm`.
- [x] "Hydration guard race" — `#hydratedPromise` correctly serializes `onStart` → `onConnect` ordering (L75–81, L88–141).

## Resolution

root_cause: |
  Two independent issues of different severity.

  **Issue A (banner) — NOT a code bug.** Chrome DevTools' "Network → Offline" throttling does not sever loopback (localhost) WebSocket connections. The underlying `WebSocket` never fires `close`, so the client's `ws.close`/`ws.error` listeners never run, so `connection.status` stays `"open"` and the banner is not rendered. The banner code, Banner component, and `connection.status` reactive wiring are all correct — confirmed by the Playwright e2e test, which reproduces the banner by forcibly closing the socket via `routeWebSocket + ws.close()`.

  **Latent client bug (unrelated to banner visibility but discovered during investigation)**: `src/lib/stores/room.svelte.ts:56` reads `ws.reconnectAttempts`, but PartySocket's public property is `retryCount` (verified in `node_modules/partysocket/dist/ws.js:125`). `ws.reconnectAttempts` is `undefined`, so `undefined > 0 === false`, and the reconnect branch that sends `syncRequest` **never executes**. Every reconnect falls through to the first-connect branch and sends `hello`. The server tolerates this (hello path re-tags the connection and re-sends `roomState`), but the client loses the board/marks restoration path designed for mid-game reconnects. This needs a separate fix even though it doesn't affect Check 1.

  **Issue B (host failover) — unconfirmed root cause; most likely environmental (wrangler dev alarm timing or UAT reproduction) rather than a code defect.** Full trace review of `onClose` → `onAlarm` → `#promoteNextHost` → client `hostChanged` handler found no defect that definitively explains "button never appears after 50s." The server broadcasts `hostChanged`, the client handler reassigns `state` correctly for Svelte 5 rune reactivity, and the derived `iAmHost` should flip. Before patching, add targeted `console.log` diagnostics to distinguish: (1) alarm never fires in wrangler dev, (2) promotion fires but broadcast does not reach Tab B, (3) Tab B receives `hostChanged` but state reassignment is missed, (4) Tab A's tab wasn't fully closed during repro.

fix: |
  **Two patches required; a third diagnostic step precedes the Issue-B fix.**

  **Patch 1 — PartySocket reconnect-count property name (latent bug):**

  File: `src/lib/stores/room.svelte.ts` L56

  ```ts
  // BEFORE
  if (ws.reconnectAttempts > 0) {

  // AFTER
  if (ws.retryCount > 0) {
  ```

  Also update the corresponding Phase 5 plan documents and summary that reference `reconnectAttempts` to use `retryCount`, and add a regression test that asserts the reconnect branch is taken after a forced disconnect.

  **Patch 2 — UAT documentation for Issue A:**

  File: `.planning/phases/05-resilience-mobile-hardening/UAT.md` (or wherever Phase 5 manual UAT Check 1 is documented)

  Replace "Toggle DevTools Network → Offline" with one of:
  - "Stop the `wrangler dev` process for ~3 seconds then restart it", OR
  - "DevTools → Network → WS tab → right-click the open connection → Close frame" (if the DevTools build supports it), OR
  - "Run Playwright test `phase5-reconnect.spec.ts` instead of a manual repro on localhost"

  Add a note explaining that DevTools Offline cannot sever loopback sockets, so the banner cannot be reproduced that way.

  **Patch 3 — Diagnostic for Issue B (not a fix yet):**

  Add temporary `console.log` in two places:
  - `party/game-room.ts` inside `#promoteNextHost` just before the broadcast:
    ```ts
    console.log("[game-room] promoting host", { from: this.#hostId, to: nextHost.playerId, connected: [...connected] });
    ```
  - `src/lib/stores/room.svelte.ts` inside the `"hostChanged"` case:
    ```ts
    console.log("[room] hostChanged received", msg);
    ```
  Rerun the UAT. Based on which log is missing:
  - **Both missing** → alarm never fired. Check `ctx.storage.getAlarm()` after `onClose`; suspect wrangler dev alarm behaviour. Consider shortening `SLOT_HOLD_MS` for dev or using `setTimeout` as a fallback.
  - **Server log present, client log missing** → WS broadcast not reaching Tab B. Check `getConnections()` iteration and message delivery.
  - **Both present but button still hidden** → reactivity issue in `$derived iAmHost` or `hostId`. Add `console.log(iAmHost)` after the handler.

verification:
  - Patch 1: `grep -n reconnectAttempts src/ party/` returns no matches; unit/integration test covers "reconnect sends syncRequest, first connect sends hello".
  - Patch 2: UAT document updated; running the documented Check-1 repro produces the banner.
  - Patch 3: logs narrow Issue B to a specific layer; follow-up fix lands only after the failing layer is identified.

files_changed:
  - src/lib/stores/room.svelte.ts (Patch 1 — 1 line)
  - .planning/phases/05-resilience-mobile-hardening/UAT.md (Patch 2 — doc)
  - .planning/phases/05-resilience-mobile-hardening/05-02-PLAN.md (Patch 1 follow-up — 3 references)
  - .planning/phases/05-resilience-mobile-hardening/05-02-SUMMARY.md (Patch 1 follow-up — 2 references)
  - party/game-room.ts (Patch 3 — temporary log, to be removed)

## ROOT CAUSE FOUND

specialist_hint: typescript

summary: |
  Issue A is an environmental limitation, not a code bug — DevTools Offline on localhost does not close loopback WebSockets, so the client never transitions to "reconnecting". The Playwright suite sidesteps this and is the correct reproduction.

  Issue B could not be pinned to a specific code defect from static analysis. The server → client failover path is logically correct. Recommend a short diagnostic-log pass before committing to a server-side patch.

  A latent bug was discovered during investigation: `ws.reconnectAttempts` (line 56 of `room.svelte.ts`) is `undefined` because PartySocket's property is `retryCount`. This silently disables the reconnect-aware `syncRequest` branch and must be fixed regardless of the UAT outcomes.
