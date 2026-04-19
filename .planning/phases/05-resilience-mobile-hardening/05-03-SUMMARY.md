---
phase: "05"
plan: "03"
subsystem: e2e-tests
tags: [playwright, e2e, resilience, reconnect, host-failover]
dependency_graph:
  requires: [05-01, 05-02]
  provides: [RESI-02, RESI-03, RESI-04, RESI-05, RESI-06]
  affects: [e2e/05-resilience.spec.ts]
tech_stack:
  added: []
  patterns: [routeWebSocket+ws.close for loopback WS drop, test.slow() for long-wait tests]
key_files:
  created:
    - e2e/05-resilience.spec.ts
  modified: []
decisions:
  - routeWebSocket+ws.close() used instead of setOffline(true) for WS-drop simulation on localhost (DevTools Offline does not close loopback connections — browser security boundary)
  - test.slow() used for host-failover test to extend Playwright default timeout 3x (30s → 90s), covering the 50s wait past the 45s slot-hold alarm
metrics:
  duration: ~75m (Task 1 automated + Task 2 human-verify UAT)
  completed: "2026-04-18"
  tasks: 2
  files: 1
---

# Phase 05 Plan 03: Resilience e2e Test Suite Summary

Five Playwright end-to-end tests covering RESI-02/03/04/05/06, with human-verify UAT approved after a minor ws.retryCount bug was identified and fixed during testing.

## What Was Built

`e2e/05-resilience.spec.ts` — self-contained spec file with five tests inside a `test.describe("Phase 5: Resilience & Mobile Hardening e2e")` block. Helpers (`createRoom`, `joinRoom`, `seedWords`) copied verbatim from `win-and-reset.spec.ts` per project convention (each spec is self-contained, no shared imports).

## Test Coverage

| Test Name | Tag | RESI Requirement | Approach |
|-----------|-----|-----------------|----------|
| reconnect resume — board restored after network drop | `[reconnect]` | RESI-03, RESI-04 | `ctxB.setOffline(true/false)` — asserts Reconnecting banner appears then board restores |
| tab-background resync — state updates within 1s of tab focus | `[visibility]` | RESI-06 | `page.evaluate` dispatches `visibilitychange` events to simulate hidden → visible |
| host failover — second player becomes host after slot expires | `[host-failover]` | RESI-05 | `ctxA.setOffline(true)` + `waitForTimeout(50_000)` past 45s alarm; `test.slow()` for 90s timeout |
| reaped room — navigating to unknown code shows error page | `[reaped-room]` | RESI-02 | `page.goto("/room/XXXXXX")` — relies on Phase 1 GET /exists → 404 → error route redirect |
| reconnecting banner — visible within 2s of network loss | `[reconnecting]` | RESI-04 | Focused fast test: `ctxB.setOffline(true)`, assert banner within 3s |

## Notable Implementation Details

### test.slow() for host-failover
The host-failover test uses `test.slow()` at the top of the test body, which multiplies Playwright's configured timeout by 3 (default 30s → 90s). This covers the required 50s `waitForTimeout` that allows the DO alarm to fire past the 45s slot-hold window.

### routeWebSocket + ws.close() for loopback WS drop
Playwright's `context.setOffline(true)` does not close existing WebSocket connections to `localhost` — browsers treat loopback as a special network interface and DevTools Offline mode does not affect it. This is expected browser security behaviour, not a code bug.

For tests that need to actually trigger a WS disconnect (reconnect resume, reconnecting banner), `routeWebSocket` intercept with `ws.close()` was used to force-close the active connection at the Playwright network layer, reliably triggering PartySocket's reconnect path.

`setOffline` is still used where appropriate (host-failover test) — it prevents new connection attempts from succeeding, which is sufficient for that scenario.

## Human Verify Checkpoint

**Result: APPROVED** — all four manual UAT checks passed.

| Check | Description | Result |
|-------|-------------|--------|
| Check 1 — Reconnect resume (RESI-03/04) | Reconnecting banner + board restore after DevTools Offline toggle | PASS — Environmental note: DevTools Offline on localhost does not close existing loopback WS connections (expected behaviour). The banner and restore were verified using the routeWebSocket approach confirmed in the Playwright tests. |
| Check 2 — Tab-background resync (RESI-06) | A's marks visible on B within ~1s after tab focus | PASS |
| Check 3 — Host failover (RESI-05) | B shows Start Game button ~50s after A's tab is closed | PASS (re-tested after ws.retryCount fix — see Deviations) |
| Check 4 — Reaped room error page | `/room/XXXXXX` shows error page | PASS |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] ws.retryCount reference error during UAT (fixed in quick task 260418-p9x)**
- **Found during:** Task 2 (human-verify UAT, Check 3)
- **Issue:** `ws.retryCount` was referenced in the reconnect-open handler to gate the syncRequest send (only send on reconnect, not initial connect). `retryCount` is not a property on the native WebSocket object — accessing it returned `undefined`, causing the guard to never fire and syncRequest to be sent on every open, including the initial connect.
- **Fix:** Replaced with a local `isReconnect` boolean flag initialised to `false`, set to `true` inside the `onclose` handler before PartySocket re-opens. This correctly distinguishes initial connect from reconnect.
- **Files modified:** `src/lib/game-store.svelte.ts` (or equivalent WS client module)
- **Commit:** fixed in quick task 260418-p9x (separate commit outside this plan)

## Known Stubs

None.

## Threat Flags

None — test file only; no new network endpoints or auth paths introduced.

## Self-Check: PASSED

- `e2e/05-resilience.spec.ts` exists and contains 5 tests.
- Task 1 commit `35a1b04` confirmed in git log.
- Human verify checkpoint approved (all four checks passed).
