---
phase: 02
reviewers: [codex]
reviewed_at: 2026-04-19T16:35:46Z
plans_reviewed: [02-01-PLAN.md,02-02-PLAN.md,02-03-PLAN.md]
---

# Cross-AI Plan Review — Phase 02

## Codex Review

## Summary

The three plans are generally well-structured and correctly layered: Plan 01 defines protocol/util contracts, Plan 02 implements authoritative room behavior and store state, and Plan 03 builds the lobby UI on top. The sequencing is sensible and mostly achieves the Phase 2 goals: word submission, starter packs, minimum word threshold, grid-tier preview, and host-controlled game start. The main risks are around lifecycle durability, underspecified server guards, inconsistent starter-pack naming, and insufficient UI/store test coverage for real-time behavior and error states.

## Strengths

- Clear dependency ordering: protocol/utilities first, server/store second, UI last.
- Good split of responsibilities: Durable Object owns authoritative word pool and phase, store owns reactive client state, UI remains mostly presentational.
- Plans include concrete artifacts, exports, and “contains” checks, which makes implementation verifiable.
- Duplicate detection, ownership checks, host-only actions, and minimum word count are explicitly covered.
- Grid-tier boundary testing is called out, including important thresholds.
- Starter packs are treated as shared constants rather than duplicating data in UI/server code.
- Plan 03 clearly distinguishes host and non-host lobby behavior.
- The plans avoid premature Phase 3 board-generation scope, keeping Phase 2 focused on lobby setup.

## Concerns

- **HIGH: Durable Object persistence/hibernation is not called out in Plan 02.**  
  If the room uses PartyServer/Cloudflare Durable Objects with hibernation, in-memory `words`, `usedPacks`, and `phase` can be lost unless persisted and rehydrated. The plan says the DO is authoritative, but does not explicitly require storage writes or wake-up restoration.

- **HIGH: Phase guards are underspecified.**  
  The plans should state what happens if `submitWord`, `removeWord`, `loadStarterPack`, or `startGame` are received after the room leaves `lobby`. Without explicit guards, players may mutate the word pool after game start or trigger duplicate phase transitions.

- **MEDIUM: Starter pack naming appears inconsistent.**  
  The requirements mention `Corporate Classics`, `Agile`, and `Sales`, but the current protocol pattern in the repo uses identifiers like `corporate-classics`, `agile`, and `it-jargon`. The plans should lock both display names and wire identifiers to avoid UI/server/schema drift.

- **MEDIUM: Error-code contract is too loose.**  
  Plan 02 mentions duplicate and `not_owner` errors, while Plan 03 depends on duplicate errors to shake the input. The exact server error codes should be specified, for example `duplicate_word`, `not_owner`, `not_enough_words`, `invalid_pack`, so UI behavior is deterministic.

- **MEDIUM: Store testing is missing despite store behavior being part of Plan 02.**  
  Plan 02 modifies `src/lib/stores/room.svelte.ts`, but only lists `tests/unit/game-room.test.ts`. The room store needs tests for `wordAdded`, `wordRemoved`, `roomState`, `usedPacks`, `lastError`, and `send()` behavior.

- **MEDIUM: UI plan lacks explicit component/e2e test artifacts.**  
  Plan 03 has many user-facing truths but no test files. The critical flows should be covered: submit by Enter, duplicate inline error clears on typing, host-only pack pills/start button, non-host waiting copy, delete own chip, and start button threshold.

- **MEDIUM: Word normalization rules are incomplete.**  
  “Duplicate case-insensitive” is good, but the plans should define trim behavior, whitespace collapsing, and possibly Unicode normalization. Otherwise `"Strategy"`, `" strategy "`, and `"strategy"` may behave inconsistently.

- **MEDIUM: Word-pool size and abuse limits are not specified.**  
  Individual word max length is implied by protocol tests, but there is no explicit total pool cap or per-player rate/quantity cap. For an anonymous WebSocket game, this is a mild DoS/spam risk.

- **LOW: Non-host unauthorized actions being “silently ignored” may hurt debuggability.**  
  Silent ignore is acceptable for security, but it can make bugs hard to diagnose. A server-side no-op with optional dev logging, or a specific client-only error to sender, would be clearer.

- **LOW: Plan 02 says `startGame` broadcasts `roomState`, while Plan 01 also adds `gameStarted`.**  
  Both can work, but the plans should define the canonical state transition message. Duplicated events increase store complexity and create ordering edge cases.

- **LOW: Pack loading duplicate behavior is only partially defined.**  
  “Duplicates silently skipped” is fine, but the plan should say whether `usedPacks` is marked when all words were duplicates, and whether the UI receives an update when no words are added.

- **LOW: Accessibility requirements are underrepresented in Plan 03.**  
  The UI plan mentions click/tap behavior, but not keyboard focus, button labels, disabled semantics, error announcement, reduced motion for shake, or mobile touch target sizing.

## Suggestions

- Add explicit Plan 02 must-haves for Durable Object persistence:
  - persist `words`, `usedPacks`, and `phase`;
  - rehydrate them on DO wake;
  - include them in initial `roomState` snapshots.

- Specify lobby-only guards:
  - word submission/removal allowed only in `lobby`;
  - starter packs allowed only in `lobby` and host-only;
  - `startGame` allowed only from `lobby`;
  - repeated `startGame` after `playing` should be ignored or return a defined error.

- Define a shared starter-pack contract:
  - stable IDs, e.g. `corporate-classics`, `agile`, `sales`;
  - display labels, e.g. `Corporate Classics`, `Agile`, `Sales`;
  - schema picklist uses IDs only;
  - UI renders display labels from the same source.

- Add exact error-code requirements:
  - `duplicate_word`;
  - `not_owner`;
  - `not_enough_words`;
  - `unknown_word`;
  - `invalid_pack`;
  - optionally `invalid_phase`.

- Add store tests in Plan 02:
  - applying full `roomState`;
  - handling incremental `wordAdded` and `wordRemoved`;
  - updating `usedPacks`;
  - preserving reactive assignment patterns;
  - exposing `send()` and serializing messages correctly;
  - surfacing `lastError`.

- Add UI or integration tests in Plan 03:
  - host sees packs/start, non-host does not;
  - Add button and Enter submit the same message;
  - duplicate error shakes input and clears on edit;
  - own words are deletable, other players’ words are not;
  - start button enables at 5 words;
  - progress tier labels update at 5, 12, and 21 word thresholds.

- Define normalization as a utility or server helper:
  - trim;
  - collapse internal whitespace;
  - compare with `toLocaleLowerCase()` or a documented case-folding approach;
  - preserve user-entered display text or store normalized display consistently.

- Add a total word-pool cap, even if generous, such as 200 words per room. Starter packs plus manual submissions should respect the same cap.

- Clarify whether `gameStarted` is needed. Prefer one canonical transition mechanism:
  - either broadcast `roomState` with `phase: "playing"`;
  - or broadcast `gameStarted` plus ensure clients request/retain full state.
  A full `roomState` broadcast is safer for reconnect/resync consistency.

## Risk Assessment

**Overall risk: MEDIUM.**

The plan architecture is sound and should deliver the Phase 2 user experience, but several operational details are important for this project’s real-time Durable Object model. The biggest risk is assuming in-memory room state is enough; with WebSocket hibernation, word pool and phase state must be persisted and restored. The next largest risks are underspecified phase guards, inconsistent pack identifiers, and weak test coverage around the client store/UI behavior that turns server events into the actual lobby experience. These are fixable with tighter must-haves before execution.

---

## Consensus Summary

*Single reviewer — no consensus available.*

### Strengths
*(See Codex review above)*

### Concerns
*(See Codex review above)*
