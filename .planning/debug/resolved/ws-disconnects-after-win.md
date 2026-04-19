---
slug: ws-disconnects-after-win
status: investigating
created: 2026-04-19T20:00:00Z
updated: 2026-04-19T20:30:00Z
trigger: "WebSocket disconnecting after win screen — Hanging on for dear life... status shown in nav on the EndScreen. The win screen renders correctly but the WS connection drops after a win is declared."
---

## Symptoms

- **Expected:** WS connection stays alive on EndScreen (win/lose screen) so players can interact and host can start a new game
- **Actual:** After a win is declared and EndScreen renders, the WS disconnects — nav shows "Hanging on for dear life..." reconnect status
- **Error messages:** No explicit error; just the reconnect spinner in the nav
- **Timeline:** Observed in production after Phase 8 deployment; unclear if pre-existing
- **Reproduction:** Complete a game (get bingo), observe EndScreen — WS drops shortly after win screen appears

## Current Focus

hypothesis: "Reconnect is failing/stuck — PartySocket fires close then reconnect attempt never promotes back to open. Most likely the reconnect handshake is not succeeding because the new connection comes in through `onBeforeConnect` → stub.fetch `/exists` path and something there rejects, OR the server-side `onConnect` reconnect path (existing player reconnect) throws during `#sendSyncToConn` and PartyServer's catch-all closes the socket with code 1011."
test: "add diagnostic logs in (1) onBeforeConnect `/exists` response path, (2) GameRoom.onConnect before+after #sendSyncToConn, (3) client close handler logging `code` and `reason`. Reproduce a win in production and capture the close code."
expecting: "close code 1006 (abnormal) = server didn't send a close; close code 1011 (internal error) = server threw during setup; close code 1000 (normal) = intentional close from server. Most useful diagnostic will be the close code + reason on the client side."
next_action: "CHECKPOINT — need production repro to capture the close code/reason on the client. Static analysis alone cannot pin this to a specific defect."

## Evidence

- timestamp: 2026-04-19T20:05:00Z — Read `src/lib/stores/room.svelte.ts`. Client close handler at L82–90 flips status to "reconnecting" on any non-terminal close (wasClean=false, code != 1000). Banner in `+layout.svelte` L15 tracks `connection.status === "reconnecting"`. The banner appearing means the underlying WS closed with a non-clean close. PartySocket auto-reconnects on close (`_handleClose` calls `_connect()` if `_shouldReconnect`). Persistent banner = reconnect not completing.
- timestamp: 2026-04-19T20:08:00Z — Read `party/game-room.ts`. `onMessage` for `markWord` → on win → broadcasts `winDeclared` and returns. No `conn.close()` anywhere in `onMessage`. No error path that would cause the connection to drop on the winning mark. Phase transitions to "ended" and persists cleanly.
- timestamp: 2026-04-19T20:10:00Z — Read `src/worker.ts` (patched by `scripts/patch-worker.mjs`). Every WS connect goes through `routePartykitRequest` with `onBeforeConnect` hook that calls `stub.fetch("https://do/exists", …)` and returns 404 if the DO reports `!this.#active`. This runs on **every reconnect attempt**, not just first connect.
- timestamp: 2026-04-19T20:12:00Z — Confirmed `GameRoom.onRequest` handling `/exists` returns 200 only when `this.#active === true`. `#active` is rehydrated in `onStart()` from `K_ACTIVE` storage. PartyServer's `fetch` awaits `#ensureInitialized()` → `onStart()` before dispatching to `onRequest`, so `#active` should be true after wake. Path is race-safe under normal operation.
- timestamp: 2026-04-19T20:14:00Z — Checked `GameRoom.onConnect` reconnect branches (L267–304). For a reconnect with `playerId` in query: (a) if in `#pendingSlots`, remove+broadcast `playerReconnected`+sync; (b) if in `#players`, re-tag+broadcast `playerReconnected`+sync; (c) else fall through to wait for hello. `#sendSyncToConn` serializes the full snapshot. No guard against `this.#winningLine` being in unexpected shape — but persistence is clean.
- timestamp: 2026-04-19T20:17:00Z — Checked `node_modules/partyserver/dist/index.js` fetch handler (L395–450). If onConnect throws, PartyServer **accepts the WS and immediately closes it with code 1011 "Uncaught exception during session setup"** (L440–447). This is the one path where the server itself closes the WS on connect. If onConnect throws after a reconnect, the client sees close code 1011 and PartySocket reconnects — if the same exception fires every time, the loop never settles and the banner stays up.
- timestamp: 2026-04-19T20:20:00Z — Re-read `GameRoom.onConnect` for exception potential during a reconnect in `ended` phase. No obvious throw — `#sendSyncToConn` accesses maps safely and `JSON.stringify` on the snapshot cannot fail with plain data. No unhandled await rejections. Static analysis cannot identify a throw here.
- timestamp: 2026-04-19T20:22:00Z — Reviewed recent commits. Phase 8 commits are all UI (logo size variant, copy strings, home-page layout, EndScreen bull image tweaks). None touch `party/game-room.ts`, `src/worker.ts`, `src/lib/stores/room.svelte.ts`, or `scripts/patch-worker.mjs`. The WS/transport layer has not changed since Phase 5. If the bug is new in production after Phase 8, it is environmental (rollout, Cloudflare behaviour change, DO migration) rather than a code regression.
- timestamp: 2026-04-19T20:24:00Z — Reviewed e2e suite. `e2e/win-and-reset.spec.ts` triggers a win and asserts both players see EndScreen within 1500ms — this test passes locally and does not check banner state. `e2e/05-resilience.spec.ts` "reconnect resume" asserts the banner goes away within 8s of reconnect. There is **no e2e test that asserts "banner does not appear after a win is declared"**. A test gap exists.
- timestamp: 2026-04-19T20:26:00Z — Key unknown: the **close code** reported to the client. Without capturing `event.code` and `event.reason` in the client's `close` listener, we cannot distinguish between: (i) server closed with 1011 (exception in onConnect); (ii) server closed with 1000/1001 (clean — but the banner code treats 1000 as terminal, not reconnecting); (iii) network dropped and 1006 abnormal close; (iv) client's own `ws.close()` (but the code only calls `ws.close()` in `disconnect()` which runs on `pagehide` / route teardown — winning does not navigate).
- timestamp: 2026-04-19T20:28:00Z — Latent defect found (unrelated to primary symptom but worth fixing): `getOrCreatePlayer` in `src/lib/session.ts` L25 creates new players with `displayName: ""`. The `hello` schema requires `displayName: minLength(1)`. Valibot rejects the message server-side → server replies `error: bad_message` silently. This only affects first-connect with no prior display-name write; not the win-disconnect flow, but should be reported.

## Eliminated

- [x] "Winning mark causes server to close the WS" — `markWord` handler has no close() path; only broadcasts wordMarked+winDeclared and updates phase/persists.
- [x] "EndScreen unmount causes ws.close()" — `disconnect()` is only wired to `pagehide` and route-teardown returns, not to phase transitions. Phase change from "playing" → "ended" only unmounts `<Board/>` and mounts `<EndScreen/>`; the store (and WS) persists.
- [x] "Phase 8 changed transport layer" — Phase 8 commits are UI-only (Logo, copy, EndScreen image). No changes to game-room.ts, worker.ts, room.svelte.ts, or patch-worker.mjs since Phase 5.
- [x] "canvas-confetti dynamic import failing" — `.catch(() => {})` swallows any import error; confetti failure cannot propagate to the WS.
- [x] "onBeforeConnect race where DO hasn't hydrated #active yet" — PartyServer awaits `#ensureInitialized` (which awaits `onStart`) before dispatching to `onRequest`. `#active` is hydrated before the /exists check runs.

## Resolution

root_cause: "Browser ad blocker (Brave Shields) blocking the WebSocket/PartySocket connection URL. ERR_BLOCKED_BY_CLIENT in console. Affects all pages — not isolated to win screen. The win screen was just when the user first noticed the banner."
fix: "Not a code bug. User must disable Brave Shields for bingo.moorelabs.uk. No code changes needed."
verification: "Banner disappears when Brave Shields disabled for domain."
files_changed: "none — temporary debug log added/removed from room.svelte.ts but net no change"

## CHECKPOINT REACHED

**Type:** production-repro-needed

**Why checkpoint:** Static analysis of the full transport path (client store → PartySocket → worker.ts/onBeforeConnect → GameRoom.onConnect/onMessage → client close handler) does not reveal a defect that explains persistent "Hanging on for dear life" after winDeclared. The only on-path code that can close a WS from the server side is PartyServer's exception catch-all (code 1011). Without the close **code** and **reason** from a live production repro, we cannot distinguish server-exception from network-abnormal from clean-close.

**What is needed to proceed:**

1. Add a temporary diagnostic line to `src/lib/stores/room.svelte.ts` close handler:
   ```ts
   ws.addEventListener("close", (ev) => {
     const ce = ev as CloseEvent;
     console.log("[room] ws close", { code: ce.code, reason: ce.reason, wasClean: ce.wasClean });
     // …existing logic
   });
   ```

2. Add a temporary log in `party/game-room.ts` `onConnect` start+end and a `try/catch` around `#sendSyncToConn` to log any thrown error:
   ```ts
   async onConnect(conn, ctx) {
     console.log("[game-room] onConnect start", { url: ctx.request.url });
     try {
       await this.#hydratedPromise;
       // …existing logic
       console.log("[game-room] onConnect end ok");
     } catch (e) {
       console.error("[game-room] onConnect threw", e);
       throw e;
     }
   }
   ```

3. Deploy to production (or staging with the same runtime), reproduce the win, and capture:
   - Client console: the close code + reason
   - Cloudflare wrangler tail (`wrangler tail`): any server-side errors around the win + reconnect

4. Return here with the close code and any server errors.

**Expected diagnostic outcomes:**

| Close code | Likely cause | Next step |
|---|---|---|
| 1011 + "Uncaught exception…" | onConnect threw on reconnect | Inspect server logs for the stack; patch the throw site |
| 1006 (no reason) | Network / edge reset | Investigate Cloudflare edge behaviour; may be transient; consider shorter reconnect back-off |
| 1000 + reason from server | Server clean-close somewhere | Hunt for a `conn.close()` path we missed |
| 1001 "going away" | Client navigated | Check if something is triggering `pagehide` spuriously |

**Latent defect to fix regardless** (separate patch):

`src/lib/session.ts:25` creates new players with `displayName: ""`, which fails the `hello` schema's `minLength(1)` check. Unrelated to win-disconnect but worth fixing.

**Awaiting:** production close-code + wrangler tail output after a win repro with the temporary diagnostics wired up.
