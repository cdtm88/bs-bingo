---
phase: 03
reviewers: [codex]
reviewed_at: 2026-04-19T16:35:46Z
plans_reviewed: [03-01-PLAN.md,03-02-PLAN.md,03-03-PLAN.md,03-04-PLAN.md]
---

# Cross-AI Plan Review — Phase 03

## Codex Review

**Summary**

The plans are generally coherent and well-sequenced for Phase 3: Plan 01 establishes shared protocol and randomness primitives, Plans 02 and 03 split server/client ownership cleanly, and Plan 04 closes the UI and e2e loop. The strongest part is the explicit privacy boundary: boards are assigned per connection, peer updates only expose aggregate mark counts, and server-side validation rejects unknown or blank cells. Main risks are around protocol/state consistency, optimistic client behavior drifting from server authority, test fragility in randomness/statistics, and a few edge cases that become important later for reconnects, reset, host changes, and win detection.

**Strengths**

- Clear dependency graph: Plan 01 produces contracts used by Plans 02 and 03; Plan 04 composes both sides afterward.

- Good separation of concerns:
  - Protocol and shuffle utility in Plan 01.
  - Durable Object authoritative board/mark state in Plan 02.
  - Client store and cell primitive in Plan 03.
  - Page composition and e2e proof in Plan 04.

- Strong privacy posture:
  - `boardAssigned` is sent via per-connection `conn.send`, not broadcast.
  - `wordMarked` intentionally omits `cellId`, `wordId`, text, and layout.
  - Server rejects marks for cells outside the player’s own board.

- Server-authoritative marking is correctly centered in `party/game-room.ts`, which is the right place for authorization and cross-player propagation.

- Accessibility and mobile usability are considered early:
  - Blank cells are inert.
  - Non-blank cells use buttons.
  - 44px minimum tap targets are explicitly required.
  - Grid sizing is part of unit and e2e scope.

- The plans preserve Phase 2 behavior intentionally by calling out the old `startGame` broadcast semantics that need test updates.

- E2E coverage in Plan 04 targets the actual core loop: create room, add words, start game, assign board, click mark, peer sees count within 1 second.

**Concerns**

- **HIGH: Optimistic client marks can diverge from server truth.**  
  Plan 03 toggles `markedCellIds` locally before server confirmation, but `wordMarked` only returns `{ playerId, markCount }`. If the server silently drops a blank, stale, unknown, or unauthorized cell, the local player may continue seeing a mark that does not exist server-side. This is especially likely because the plan explicitly says invalid marks are silently dropped.

- **HIGH: No per-player acknowledgement for successful/failed mark operations.**  
  Since `wordMarked` does not include `cellId`, the marking player has no authoritative way to reconcile which local cell was accepted. This is fine for peer privacy, but the actor needs either an actor-only response or a full board/marks refresh path.

- **HIGH: Board and mark state lifecycle is under-specified.**  
  Plan 02 introduces `#boards` and `#marks`, but does not clearly say when they are cleared:
  - starting a new round,
  - failed `startGame`,
  - room reset,
  - player reconnect,
  - player identity replacement,
  - host reset from Phase 4.
  
  Even if Phase 3 does not implement reset yet, the state model should avoid painting later phases into a corner.

- **MEDIUM: Reconnect behavior is not covered.**  
  The broader project requirements include clean reconnect snapshots in Phase 5, but Phase 3 board assignment creates per-player private state. The plan does not say whether reconnecting with the same `playerId` gets the same board, a new board, or no board until the next start. That is a future phase requirement, but this data model choice matters now.

- **MEDIUM: Statistical shuffle test may be flaky or misleading.**  
  “Statistically uniform over 1000 runs” is risky in unit tests. True randomness can fail statistical thresholds occasionally, and 1000 runs may be too small to prove much. The more important properties are permutation correctness, unbiased index generation via rejection sampling, and avoidance of modulo bias.

- **MEDIUM: Crypto API availability needs test/runtime handling.**  
  `crypto.getRandomValues()` is right for Workers, but unit tests may run in Node/Vitest where `globalThis.crypto` behavior depends on environment/version. The plan should specify whether tests polyfill/mock crypto or rely on the runtime.

- **MEDIUM: Board uniqueness requirement may be stronger than implementation can guarantee.**  
  “Two different connections receive DIFFERENT board payloads” is desirable, but random shuffle can theoretically produce the same order. If the test expects guaranteed difference, it may be flaky unless randomness is controlled or the algorithm deliberately injects player-specific entropy.

- **MEDIUM: Cell ID semantics are not defined enough.**  
  The plans require unique `cellId`s, but do not specify whether they are:
  - stable across reconnect,
  - unique only within a board,
  - globally unique within a room,
  - derived from position,
  - random per round.
  
  This affects marking, privacy, reconnects, and future win detection.

- **MEDIUM: Blank-cell handling may conflict with future win detection.**  
  The project says blanks count for completed lines in Phase 4. Phase 3 says blank cells are inert and mark attempts are dropped. That is fine if blanks are implicitly counted as marked, but the board/mark representation should make that explicit before Phase 4.

- **MEDIUM: Start-game sequencing could create race conditions.**  
  Plan 02 says replace `startGame` to flip phase, broadcast `gameStarted`, then send per-connection boards. If clients switch to the playing UI on `gameStarted` before receiving `boardAssigned`, they show “Dealing your board…”. That is acceptable, but tests should verify no client can mark before receiving a board and that late board delivery is handled cleanly.

- **MEDIUM: Multi-connection same-player behavior is unclear.**  
  Anonymous sessions often create edge cases where the same `playerId` has multiple connections or a reopened tab. The plan keys marks by `playerId`, but board assignment is described per connection. If two connections share one player identity, they could receive different boards while sharing one mark count.

- **LOW: Plan 04 may be slightly broad.**  
  It adds a new board component, modifies player rows, changes the page, adds two unit files, and adds e2e. That is reasonable, but it is the highest integration-risk plan. Failures could be harder to localize.

- **LOW: Visual requirements are quite specific for a phase focused on core loop.**  
  Accent colors, pills, and exact styling are fine if they come from a UI spec, but they can distract from validating the multiplayer behavior if implementation time is tight.

- **LOW: “Silently dropped” invalid marks may make debugging harder.**  
  Silent rejection protects privacy, but server logs or test-only observability would help diagnose bad client state without changing protocol behavior.

**Suggestions**

- Add an actor-only mark acknowledgement message, for example:
  ```ts
  { type: "markAccepted", cellId, marked, markCount }
  { type: "markRejected", cellId }
  ```
  Keep peer broadcasts as `{ type: "wordMarked", playerId, markCount }` to preserve privacy.

- Alternatively, send the marking player a private refreshed mark set or board state after each accepted mark. The key point is that the actor needs authoritative reconciliation.

- Define board identity and lifecycle explicitly:
  - `roundId`
  - board keyed by `playerId`, not connection ID
  - `cellId` uniqueness scope
  - when `#boards` and `#marks` are cleared
  - whether reconnect returns the same board during an active round

- Include `roundId` in `boardAssigned` and mark handling if future reset/replay support matters. This prevents stale `markWord` messages from a previous round mutating current state.

- Make blanks explicitly “auto-counted” in the server representation, even if they are visually inert. That will simplify Phase 4 win detection.

- Replace “statistically uniform over 1000 runs” with more deterministic tests:
  - preserves input elements exactly,
  - does not mutate input,
  - calls `crypto.getRandomValues`,
  - uses rejection sampling for bounded integers,
  - deterministic tests with a mocked crypto byte stream,
  - optional statistical smoke test with loose thresholds if desired.

- Clarify how board uniqueness is guaranteed or soften the test. If uniqueness is required, derive boards with deterministic per-player/round entropy or retry when a duplicate layout is produced. If not required, test that boards are independently generated under controlled randomness.

- Add tests for same-player/multiple-connection behavior. The desired behavior should be chosen explicitly:
  - same `playerId` gets same board across connections, or
  - duplicate connections are not allowed to play independently.

- Add server tests for mark toggling idempotence:
  - first click increments count,
  - second click decrements count,
  - repeated toggles stay bounded,
  - invalid marks do not change count.

- Add a test that `markWord` before `boardAssigned` or before `playing` phase is ignored.

- Add an e2e or unit assertion that the marking player’s own badge updates too, not only the peer’s badge.

- In Plan 04, test mobile layout with an actual viewport, not only class assertions. Class presence does not guarantee tap target size after CSS/layout interactions.

- Ensure `BoardCell.svelte` exposes clear accessible labels such as “Mark synergy” / “Unmark synergy” and does not rely only on visual state.

- Consider adding light server-side logging for rejected mark attempts, without sending rejection details to other players.

**Risk Assessment**

Overall risk: **MEDIUM**.

The plans are well-structured and likely achieve the visible Phase 3 goal: unique boards, click-to-mark, and peer mark-count propagation. The main risk is not dependency ordering; that is solid. The main risk is state correctness around optimistic UI, private board assignment, and future round/reconnect behavior. Without an authoritative acknowledgement or reconciliation path, the client can show marks the server rejected. Without clearer board lifecycle semantics, Phase 4 and Phase 5 may need to rework the Phase 3 state model. These are fixable design gaps, not fundamental blockers.

---

## Consensus Summary

*Single reviewer — no consensus available.*

### Strengths
*(See Codex review above)*

### Concerns
*(See Codex review above)*
