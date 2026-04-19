---
phase: 01
reviewers: [codex]
reviewed_at: 2026-04-19T16:35:46Z
plans_reviewed: [01-01-PLAN.md,01-02-PLAN.md,01-03-PLAN.md,01-04-PLAN.md,01-05-PLAN.md]
---

# Cross-AI Plan Review — Phase 01

## Codex Review

## Summary

The Phase 1 plan set is strong overall: it decomposes the foundation into sensible waves, keeps backend and UI work mostly parallelizable, defines concrete contracts between plans, and uses testable “must-have” truths rather than vague intent. The plans do appear capable of achieving the stated Phase 1 goals: create rooms, join by code/link, establish WebSocket-backed presence, designate a host, reject nonexistent rooms, and validate the full flow with Playwright. The main risks are around Cloudflare Durable Object lifecycle semantics, WebSocket/session edge cases, SvelteKit routing/error behavior, and a few places where the UI plans assume backend availability or browser APIs without enough fallback handling.

## Strengths

- Clear dependency structure:
  - `01-01` establishes shared protocol, utilities, config, and test infrastructure.
  - `01-02` and `01-03` can run in parallel after the foundation.
  - `01-04` integrates backend and UI.
  - `01-05` validates end-to-end behavior.

- Good contract-driven planning:
  - Each plan lists concrete files, exports, truth assertions, and key links.
  - The HTTP and WebSocket contracts are specific enough for downstream work and tests.

- Strong early protocol discipline:
  - Valibot schemas for `ClientMessage`, `ServerMessage`, `RoomState`, and `Player` reduce ambiguity between client and server.
  - Discriminated message types are a good fit for later phases.

- Good attention to Cloudflare Durable Object quirks:
  - The plan explicitly accounts for ghost-room risks from DO initialization.
  - Room existence is handled as a first-class lifecycle concern rather than inferred from stub access.

- Real-time acceptance criteria are measurable:
  - Presence joins/leaves within 1 second.
  - First `hello` becomes host.
  - Dead rooms return 404 at both HTTP and WebSocket upgrade paths.

- E2E coverage targets the right core flows:
  - Create/join-by-code.
  - Join-by-link.
  - Multi-context presence.
  - Host badge consistency.
  - Error page behavior.

- Human mobile validation is correctly called out:
  - Tap-target ergonomics and Clipboard behavior on real devices are hard to fully trust from automation alone.

## Concerns

- **HIGH: Room existence semantics may be fragile with Durable Objects.**  
  The plan depends on a distinction between “live room” and “never-touched code,” while Durable Object stubs can instantiate objects on access. The explicit initialized flag helps, but the plan should be very precise about where that flag lives, when it is written, and whether existence checks can accidentally create or revive rooms.

- **HIGH: WebSocket upgrade 404 behavior may be harder than stated.**  
  Returning HTTP 404 “at upgrade time” through PartyServer/Cloudflare routing can be tricky depending on how `routePartykitRequest` delegates requests. The plan should confirm whether the DO receives enough request context to reject before accepting the WebSocket, and whether the test observes a true failed upgrade rather than an accepted socket followed by an error message.

- **MEDIUM: Host assignment is underspecified for reconnects and duplicate sessions.**  
  Phase 1 only needs first-hello-is-host, but `sessionStorage` identity plus WebSockets creates edge cases:
  - Same player opens two tabs.
  - Host refreshes.
  - Host disconnects before another player joins.
  - Host leaves and rejoins.
  
  Later phases add host failover, but Phase 1 should at least avoid corrupting host state or duplicating players.

- **MEDIUM: Presence leave behavior may be noisy with multiple connections per player.**  
  If the same `playerId` has two active sockets, closing one socket should not necessarily broadcast `playerLeft`. The plan does not say whether presence is tracked by player or by connection. This could cause visible roster flicker and false leaves.

- **MEDIUM: Join flow does not appear to validate room existence before navigating.**  
  Plan `01-03` navigates to `/room/{code}` after collecting a display name. Plan `01-04` later adds guards. That is acceptable by wave ordering, but there may be a UX gap where users enter a name for a nonexistent room only to land on an error page. It works, but it may feel awkward.

- **MEDIUM: Clipboard API assumptions need fallback behavior.**  
  `navigator.clipboard.writeText` requires secure context and can fail due to permission or browser support. The plan specifies success behavior only. Since copy buttons are prominent in the lobby, failure handling should be planned.

- **MEDIUM: Reconnection behavior is only partially defined.**  
  The banner appears when status is `reconnecting`, but the plan does not define:
  - Retry policy.
  - Backoff.
  - Max retry behavior.
  - Whether a fresh `hello` is sent after reconnect.
  - Whether stale state is cleared or retained.
  
  Phase 5 handles deeper reconnect semantics, but basic Phase 1 reconnect behavior should be predictable.

- **MEDIUM: Server-side validation and sanitization of display names is not explicit.**  
  The UI limits names to 20 characters, but the server should also validate or clamp display names received in `hello`. Otherwise clients can bypass the UI and send oversized strings, empty strings, or markup-like content.

- **LOW: Plan `01-03` includes several reusable components before all are clearly needed.**  
  `Badge`, `PlayerRow`, `Banner`, and `ErrorPage` are used soon after, so this is not major scope creep. Still, the component kit should stay minimal and driven by the first phase’s screens.

- **LOW: Accessibility requirements are present but not complete.**  
  Minimum 44px tap targets are good, but the modal also needs clear focus management, labelled inputs, accessible error messaging, keyboard behavior, and reduced-motion consideration if animations are added.

- **LOW: Playwright test count may be too narrow for the backend contracts.**  
  The E2E suite validates user flows, but several critical backend behaviors from `01-02` are better covered by unit/integration tests:
  - Invalid WebSocket messages.
  - Duplicate `hello`.
  - Dead room upgrade rejection.
  - Close events.
  - Host persistence after second `hello`.

## Suggestions

- Define room lifecycle state explicitly:
  - `created: boolean`
  - `code`
  - `phase`
  - `hostId`
  - `players`
  - `connectionsByPlayerId` or equivalent
  - idle expiration/alarm behavior

- Add a backend test proving existence checks do not create rooms:
  - `GET /api/rooms/NOTREAL/exists` returns 404.
  - A later WebSocket attempt to the same code still returns 404.
  - No initialized room state is written during the check.

- Track presence by player, not just socket:
  - Allow multiple sockets per `playerId`.
  - Broadcast `playerLeft` only when the last socket for that player closes.
  - Treat repeated `hello` from same player as reconnect/update, not a new player.

- Add server-side validation for `hello`:
  - Reject or normalize invalid `playerId`.
  - Trim display names.
  - Enforce max display-name length server-side.
  - Fall back to a safe anonymous display name if needed.

- Specify invalid-message handling:
  - On schema parse failure, either ignore the message, send a structured error, or close with a defined code.
  - Add a unit test for this behavior.

- Add Clipboard failure UX:
  - If copy succeeds, show `Copied`.
  - If copy fails, show a short inline fallback such as `Copy failed` and leave the code/link visible for manual selection.

- Add direct tests for API shape:
  - `POST /api/rooms` returns valid `code` and `shareUrl`.
  - `GET /api/rooms/{code}/exists` returns 200 for created rooms.
  - Dead room returns 404.

- Add one Playwright test for reload/reconnect at Phase 1 scope:
  - Player joins.
  - Page reloads.
  - Same `sessionStorage` identity is reused.
  - Roster does not duplicate that player.

- Make the `01-04` store lifecycle explicit:
  - Open socket on mount.
  - Send `hello` on open.
  - Close socket on destroy/pagehide if applicable.
  - Preserve or reset state on reconnect intentionally.

- Clarify SvelteKit error handling:
  - Ensure `/room/NOTREAL` and `/join/NOTREAL` throw SvelteKit errors in `load`, not client-only rendering after hydration.
  - This improves SSR behavior and test determinism.

## Risk Assessment

**Overall risk: MEDIUM.**

The plan quality is high and the decomposition is sound, but the riskiest work sits in the real-time backend and Cloudflare Durable Object lifecycle, where subtle behavior can undermine room existence, WebSocket rejection, host identity, and presence accuracy. These are not architectural blockers; they are implementation risks that can be controlled with sharper lifecycle definitions and a few targeted tests. The UI scope is reasonable, though it needs fallback handling for Clipboard, modal accessibility, and reconnect edge cases. Overall, the plans should achieve the phase goals if the backend semantics are tested at the same precision as the contracts are written.

---

## Consensus Summary

*Single reviewer — no consensus available.*

### Strengths
*(See Codex review above)*

### Concerns
*(See Codex review above)*
