---
phase: 04
reviewers: [codex]
reviewed_at: 2026-04-19T16:35:46Z
plans_reviewed: [04-01-PLAN.md,04-02-PLAN.md,04-03-PLAN.md,04-04-PLAN.md]
---

# Cross-AI Plan Review — Phase 04

## Codex Review

## Summary

The plan set is strong: it decomposes Phase 4 into a sensible contract-first sequence, then server authority, client presentation, and final route/e2e integration. The dependency ordering is mostly clean, test expectations are concrete, and the must-haves map well to the phase goals: authoritative win detection, real-time announcement, celebration, and play-again reset. The main risks are around persistence/reconnect completeness for ended-state details, tie/race handling when multiple marks arrive close together, and whether reset semantics fully preserve the intended lobby state without stale client data.

## Strengths

- Clear wave structure:
  - Plan 01 establishes shared protocol and pure win utilities.
  - Plans 02 and 03 can proceed in parallel against those contracts.
  - Plan 04 performs final route wiring and end-to-end validation.

- Good separation of concerns:
  - Win detection is pure and unit-tested.
  - Durable Object remains server-authoritative.
  - Store handles client state transitions.
  - UI components are isolated and testable.

- Strong protocol discipline:
  - `winDeclared` is server-only.
  - `winnerId` comes from connection state, not client input.
  - `startNewGame` is host-gated server-side.

- Good test coverage intent:
  - Pure line detection across rows, columns, diagonals, and board sizes.
  - Protocol schema tests.
  - Durable Object behavior tests.
  - Store handler tests.
  - Component rendering tests.
  - Two-browser Playwright flow for win and reset.

- Accessibility and UX are considered:
  - Reduced-motion fallback for win animation.
  - `aria-live` coverage in EndScreen tests.
  - Frozen ended board prevents accidental toggles.
  - Host-only reset CTA with non-host helper text.

- The broadcast ordering requirement is thoughtful:
  - Sending `wordMarked` before `winDeclared` avoids peers seeing a win before the final mark state catches up.

## Concerns

- **HIGH: Ended-state persistence may be incomplete.**  
  Plan 02 persists `#phase='ended'`, but the summaries do not clearly say that `winner`, `winningLine`, and `winningCellIds` are persisted server-side. Phase 5 requires reconnect snapshots including ended-phase win details. If only the phase is persisted, reconnecting clients may land in `ended` without enough data to render EndScreen correctly.

- **HIGH: Race/tie handling is underspecified.**  
  The plans say “first player to complete a full line wins,” but they do not explicitly define behavior when two `markWord` messages arrive in quick succession or when a stale message is processed after the phase flips. The existing phase guard helps after `ended`, but the server must ensure the transition to ended and broadcast is atomic enough that only one winner can be declared.

- **MEDIUM: Reset may not clear persisted winner details if those are added.**  
  Plan 02 says reset clears boards, marks, and phase. Plan 03 clears client-side winner fields. But if server-side win metadata is persisted, reset must also clear that metadata. This should be included explicitly to avoid stale winner data after play-again or reconnect.

- **MEDIUM: Word pool retained across reset is desirable but needs state consistency checks.**  
  Plan 02 intentionally does not touch `#words` or `#usedPacks`; Plan 04 expects both browsers return to lobby with word pool retained. That aligns with “another round without re-joining,” but it should also confirm all clients clear old boards and marks while preserving submitted words. The transition from ended to lobby could otherwise display a stale board briefly.

- **MEDIUM: Client `gameReset` handling may need to restore readiness/startability state.**  
  The plan clears board and marks and flips phase to lobby, but it does not mention any existing client flags related to submitted words, start button availability, player presence, host controls, or local board generation state. If the current store has derived state only, this is fine; if not, stale state is a risk.

- **MEDIUM: Confetti dependency adds client-side surface area for a narrow effect.**  
  Dynamic import avoids SSR issues, which is good. But adding `canvas-confetti` plus types for only winner-side celebration is a small scope increase. It is probably acceptable, but the plan should ensure failed import does not break win handling.

- **LOW: “Silently dropped” unauthorized actions may make debugging harder.**  
  Silent drops are consistent with existing phase guard behavior, but for host-only `startNewGame`, tests should at least verify no state mutation and no broadcast. Optional server-side debug logging could help without exposing anything to clients.

- **LOW: `WinLineIcon` Tailwind scanner concern is very implementation-specific.**  
  The literal `grid-cols-N` requirement is practical if Tailwind v4 scanning has bitten the project before, but it slightly couples the plan to styling internals. Not a major issue.

- **LOW: CSS selector may depend on BoardCell DOM structure.**  
  `[data-win-line='true'] > button` assumes the winning-line attribute sits directly above a button. If `BoardCell` markup changes, the animation silently breaks. A component-level class or test that asserts the final DOM behavior helps.

- **LOW: Plan 04 is marked `autonomous: false` due to human verification, but the exact checkpoint is not specified.**  
  The objective says human verification confirms the real browser experience, but the pass/fail criteria are not described beyond tests. That is workable, but a short checklist would improve repeatability.

## Suggestions

- Add explicit server-side persisted win metadata:
  - Store `winnerId`, `winnerName`, `winningLine`, and `winningCellIds` when the phase becomes `ended`.
  - Include those fields in full state snapshots.
  - Clear them on `startNewGame`.

- Add a Durable Object test for reconnect/rehydration after a win:
  - Simulate win.
  - Recreate or rehydrate room state.
  - Assert snapshot includes `phase='ended'` and complete win details.

- Add a race/tie test:
  - Two players each one mark away from winning.
  - Process two winning `markWord` messages.
  - Assert exactly one `winDeclared` broadcast and stable winner identity.
  - Assert the second mark is ignored if processed after phase ended, or explicitly define whether the final non-winning mark still broadcasts if it was processed first.

- Make `detectWin` ordering explicit:
  - If multiple lines complete on one mark, document and test which line is returned.
  - The plan says “first completed line for rows, columns, main diagonal, anti-diagonal”; preserve that as a stable contract.

- Add malformed or impossible board tests:
  - Empty cell list.
  - Cell count not matching square grid.
  - Duplicate cell IDs.
  - Marks containing IDs not on the board.
  
  These do not all need runtime errors, but expected behavior should be defined.

- Add a failed-confetti test or guard:
  - If `dynamic import('canvas-confetti')` rejects, win state should still update and no unhandled rejection should break the app.

- Ensure `gameReset` has one authoritative snapshot path:
  - After receiving `gameReset`, clients should not rely on old derived data from previous `board`, `markedCellIds`, or `playerMarks`.
  - Consider including enough room state in `gameReset` or immediately following with a state snapshot if the existing protocol supports that pattern.

- Add e2e coverage for reconnecting into an ended game:
  - This is especially important because later Phase 5 requirements depend on ended-phase reconnect correctness.

- Add e2e or unit coverage for non-host reset attempts:
  - Peer clicks or sends `startNewGame`.
  - No reset occurs.
  - Host and peer remain on EndScreen.

- Clarify board generation after reset:
  - Since boards are cleared and words retained, the next host start should generate fresh boards.
  - Add a test that the next round produces boards and marks start empty.

## Risk Assessment

**Overall risk: MEDIUM.**

The plans are well-structured and likely achieve the visible Phase 4 goals under normal play: a mark completes a line, the server declares a winner, clients show EndScreen, and the host can reset to lobby. The risk is not in basic implementation sequencing; it is in state lifecycle correctness around `ended` metadata, reconnect snapshots, and race conditions. Those areas are central to a real-time multiplayer game and can create subtle bugs that unit/component tests will not catch unless explicitly targeted. Adding persisted win metadata, reset cleanup, and race/reconnect tests would reduce the risk to LOW.

---

## Consensus Summary

*Single reviewer — no consensus available.*

### Strengths
*(See Codex review above)*

### Concerns
*(See Codex review above)*
