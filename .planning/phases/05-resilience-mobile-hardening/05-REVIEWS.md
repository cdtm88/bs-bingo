---
phase: 05
reviewers: [codex]
reviewed_at: 2026-04-19T16:35:46Z
plans_reviewed: [05-01-PLAN.md,05-02-PLAN.md,05-03-PLAN.md,05-04-PLAN.md]
---

# Cross-AI Plan Review — Phase 05

## Codex Review

## Summary

The plan set is generally strong and coherent: it breaks Phase 5 into the right layers, with server protocol/state resilience first, client synchronization second, e2e coverage third, and a gap-closure pass for ended-phase reconnect correctness. The biggest quality signal is that the later plan, 05-04, explicitly responds to verification findings instead of pretending the first three plans were complete. The overall design appears aligned with the phase goals: reconnect continuity, slot-hold behavior, host failover, visibility resync, and ended-state recovery. The main risks are around alarm correctness, stale reconnect identity, client debounce races, and e2e reliability when testing WebSocket reconnection and Durable Object timing.

## Strengths

- Clear dependency ordering:
  - 05-01 establishes protocol and server behavior.
  - 05-02 consumes those server contracts on the client.
  - 05-03 validates the integrated behavior with browser tests.
  - 05-04 closes verification gaps after real execution.

- Good separation of concerns:
  - Server-authoritative resilience logic stays in `party/game-room.ts`.
  - Client recovery and UI state reconciliation stay in `src/lib/stores/room.svelte.ts`.
  - Browser-level reconnect behavior is tested separately in Playwright.

- Strong attention to Durable Object lifecycle issues:
  - Persisting `#pendingSlots`.
  - Rehydrating in `onStart`.
  - Waiting on `#hydratedPromise` before using pending slot state.
  - Multiplexing alarms between slot eviction and idle reap.

- The plans correctly recognize that reconnect requires a full authoritative snapshot, not just incremental events.

- Host failover is treated as a server-side responsibility, which is the right architecture for multiplayer fairness.

- 05-04 identifies a real blocker: ended-phase reconnects need win details, not just `winnerId` / `winnerName`.

- The plan includes protocol schema updates, server persistence, client handling, and tests, so it avoids a common failure mode where only one layer is updated.

- Visibility-based resync is a good mobile/browser hardening step, especially for iOS Safari and backgrounded tabs.

- The Playwright test improvement in 05-04 removes a hard sleep, which should reduce CI time and flakiness.

## Concerns

- **HIGH: Reconnect identity via query-param `playerId` is trust-sensitive.**  
  If `playerId` alone is enough to reclaim a seat, another participant who learns or guesses a player ID could impersonate that player. This may be acceptable for a casual anonymous game, but the plan should explicitly acknowledge the tradeoff. A stronger design would pair `playerId` with a per-session secret stored in `sessionStorage`.

- **HIGH: Alarm multiplexing can be fragile.**  
  The rule “slot-hold evictions run first, idle-reap runs only when no pending slots remain” is sensible, but edge cases matter:
  - multiple pending slots with different expiry times,
  - a new disconnect while an alarm is already scheduled,
  - reconnect immediately before alarm execution,
  - host slot expiry while non-host slots remain,
  - stale persisted pending slots after DO wake.
  
  The plan mentions tests, but it should require coverage for rescheduling to the next soonest expiry, not just one pending slot.

- **HIGH: Host failover timing may be hard to verify reliably in e2e.**  
  A 45s slot-hold window plus DO alarm behavior can make tests slow and flaky. The plan does not mention a test-only override for slot-hold duration. Without that, the e2e suite may become expensive and unreliable.

- **MEDIUM: `syncRequest` behavior on reconnect may skip `hello` incorrectly in some cases.**  
  05-02 says the client sends `syncRequest` when `ws.reconnectAttempts > 0`, and `hello` only on first open. This assumes the server already knows the connection identity from the query param and previous state. That works for true reconnects, but edge cases should be specified:
  - fresh tab with same `playerId`,
  - room reaped while client reconnects,
  - server lost volatile connection tags after hibernation,
  - player was evicted from `#pendingSlots` before reconnect.
  
  The server should return a clear failure or require re-hello if the player cannot be resumed.

- **MEDIUM: Client “atomic” state updates may be difficult in Svelte store code.**  
  The plan says `syncResponse` updates `state`, `board`, `markedCellIds`, and `winner` atomically. That is a good requirement, but the implementation detail matters. If those are independent reactive variables, intermediate render states may still occur unless updates are batched or derived carefully.

- **MEDIUM: Disconnected-player debounce is underspecified.**  
  05-04 adds a guard so `playerDisconnected` does not re-add a player after `playerReconnected` arrives during the debounce window. That is good, but it implies the client has a delayed disconnected-state update. The exact timer lifecycle should be specified:
  - clear pending timer on reconnect,
  - clear pending timer on `syncResponse`,
  - clear all timers on `disconnect()`,
  - avoid timers mutating destroyed stores.

- **MEDIUM: Ended-phase snapshot completeness may still be incomplete.**  
  05-04 adds `winningLine`, `winningCellIds`, `winningWords`, and `gridSize`, which solves the stated blank screen. But the plan should confirm the ended snapshot also includes:
  - final board,
  - final marks,
  - winner identity,
  - phase === `ended`,
  - players roster,
  - host state if reset is available after ending.
  
  Otherwise the EndScreen may mount but still lack data needed for reset or display.

- **MEDIUM: Storage consistency around win declaration needs care.**  
  Persisting winner details should happen as one logical operation. If `winnerId` persists but `winningLine` fails, the system can rehydrate into another partial ended state. The plan should specify a single persisted win-details object or transactional-style grouped write where possible.

- **MEDIUM: E2E WebSocket drop simulation via `context.setOffline(true)` may affect all pages in that browser context.**  
  For multiplayer tests, if host and player pages share a context, setting offline may disconnect both and invalidate the scenario. The plan should require separate browser contexts when simulating one player’s network loss.

- **LOW: The protocol may grow in a piecemeal way.**  
  `syncResponse` is extended with several top-level win fields. This is fine for now, but a nested `winDetails` object might be cleaner and easier to validate:
  - `winDetails: null | { winnerId, winnerName, winningLine, winningCellIds, winningWords, gridSize }`

- **LOW: `playerReconnected` includes `isHost`, but `hostChanged` also exists.**  
  This is not necessarily wrong, but it creates two ways to communicate host status. The client must define precedence clearly if messages arrive close together.

- **LOW: No explicit malformed-message handling is mentioned.**  
  Since protocol schemas are being extended, plans should say invalid `syncRequest` / malformed messages are ignored or rejected consistently with existing validation behavior.

## Suggestions

- Add a resume token alongside `playerId`.
  - Store `{ playerId, resumeToken }` in `sessionStorage`.
  - Send both in the PartySocket query.
  - Persist or derive the token server-side.
  - Use it to prevent trivial player impersonation.

- Introduce test-configurable resilience timings.
  - Example: `SLOT_HOLD_MS` defaults to `45_000`, but tests can run with `1_000` or `2_000`.
  - This would make host-failover e2e coverage much faster and less flaky.

- Persist win details as one object instead of several independent keys.
  - Example storage key: `K_WIN_DETAILS`.
  - Shape: `{ winnerId, winnerName, winningLine, winningCellIds, winningWords, gridSize }`.
  - This reduces partial rehydration risk.

- Expand server unit tests for alarm edge cases:
  - multiple pending slots with staggered expiry,
  - reconnect before alarm fires,
  - host expiry while other pending slots remain,
  - stale expired pending slots on cold wake,
  - alarm reschedules to the next pending expiry.

- Require separate Playwright browser contexts for multiplayer disconnect tests.
  - One context per simulated user makes `setOffline()` safe and realistic.

- Specify reconnect failure behavior.
  - If `playerId` is unknown, expired, or token-invalid, server should send a clear error or require a normal `hello`.
  - The client should recover gracefully rather than hanging on a reconnecting state.

- Make `syncResponse` the canonical full-room state contract.
  - It should include everything required to render lobby, playing, and ended phases.
  - Avoid relying on prior client memory after a sync response.

- In the client, clear pending disconnected debounce timers on:
  - `playerReconnected`,
  - `syncResponse`,
  - `disconnect()`,
  - component destroy.

- Add an e2e case specifically for ended-phase reconnect.
  - 05-04 fixes this blocker, but the listed 05-03 tests do not explicitly include “winner screen survives reconnect after game ended.”
  - This should become a regression test.

- Consider documenting message ordering expectations.
  - For example, if `syncResponse` and `hostChanged` arrive close together, the client should treat `syncResponse` as authoritative.

## Risk Assessment

**Overall risk: MEDIUM.**

The plans are well-structured and likely to achieve the phase goals, but the implementation touches state persistence, WebSocket lifecycle behavior, browser backgrounding, Durable Object alarms, and multiplayer authority rules. Those are inherently race-prone areas. The largest risks are not scope creep or over-engineering; they are correctness under timing edge cases and e2e reliability.

The risk would drop toward **LOW** if the plans added resume-token protection, test-configurable slot timing, stronger alarm rescheduling tests, separate Playwright contexts for disconnect simulation, and an explicit ended-phase reconnect e2e test.

---

## Consensus Summary

*Single reviewer — no consensus available.*

### Strengths
*(See Codex review above)*

### Concerns
*(See Codex review above)*
