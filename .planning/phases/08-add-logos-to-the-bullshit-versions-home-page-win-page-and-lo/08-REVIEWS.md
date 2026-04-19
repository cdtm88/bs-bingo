---
phase: 08
reviewers: [codex]
reviewed_at: 2026-04-19T16:35:46Z
plans_reviewed: [08-01-PLAN.md,08-02-PLAN.md,08-03-PLAN.md,08-04-PLAN.md]
---

# Cross-AI Plan Review — Phase 08

## Codex Review

## Summary

The plan set is generally coherent and well-sequenced for a small UI/copy phase. It decomposes the work cleanly into reusable component support, copy-key expansion, EndScreen wiring, and home-page migration, with sensible dependency ordering: Plans 03 and 04 consume Plan 02, and Plan 03 also consumes Plan 01. The main risks are around overclaiming “byte-identical” SFW output, incomplete accounting of hardcoded strings, possible test fragility around theme state, and copy/type coupling in `copy.ts`. Overall, the plans look executable and aligned with the phase goal, but they would benefit from sharper verification criteria and a few guardrails around Svelte rune/theme behavior and visual regression expectations.

## Strengths

- Clear dependency graph:
  - Plan 01 and Plan 02 are independent Wave 1 work.
  - Plan 03 correctly depends on both the new logo size and new copy keys.
  - Plan 04 correctly depends on the new copy keys only.

- Good scope separation:
  - Logo API change is isolated from EndScreen usage.
  - Copy expansion is isolated from UI migration.
  - Home-page copy migration is kept separate from EndScreen changes.

- Strong artifact-level expectations:
  - Each plan lists concrete files, expected symbols, and strings to verify.
  - The `must_haves` make implementation review easier.

- Good regression awareness:
  - Plan 02 explicitly protects high-performing NSFW strings from accidental changes.
  - Plan 03 protects SFW EndScreen from unintended logo/layout changes.
  - Plan 04 includes a mobile-width layout requirement for the longer NSFW divider.

- Reasonable test coverage intent:
  - Unit coverage for `Logo`, `copy`, and `EndScreen`.
  - E2E coverage for the home-page NSFW copy and narrow viewport behavior.

- The plans preserve project constraints:
  - No new server behavior.
  - No auth/session changes.
  - No performance-sensitive real-time code touched.
  - Browser-only UX remains intact.

## Concerns

- **MEDIUM: “Byte-identical SFW output” is probably too strict or underspecified.**  
  Plan 03 says SFW EndScreen visual output must be byte-identical. In Svelte component tests, DOM output can shift due to harmless whitespace, generated attributes, or test renderer behavior. If the real goal is “no visible/layout change,” the plan should say that and define how to verify it.

- **MEDIUM: Hardcoded string counts may be inaccurate.**  
  Plan 03 says “all 4 previously hardcoded English strings,” while Plan 04 says “remaining 4 hardcoded English strings,” but the new keys listed imply more than four user-facing copy surfaces on the home page. If the source files have additional literals, these plans may leave some behind while still satisfying the named assertions.

- **MEDIUM: Theme state can leak between tests.**  
  Multiple plans rely on `theme.set("nsfw")` / SFW behavior. If tests do not reset the theme store after each case, Logo, EndScreen, copy, and home-page tests may become order-dependent.

- **MEDIUM: Plan 02 creates many downstream dependencies at once.**  
  Adding 11 copy keys plus changing 2 existing NSFW values is reasonable, but Plans 03 and 04 become blocked on exact key names and wording. Any churn in Plan 02 can cascade into both Wave 2 plans.

- **LOW: `copy.ts` key symmetry is asserted but not described mechanically.**  
  The plan says both bundles must contain identical keys, but it does not require a test that compares `Object.keys(STRINGS.sfw)` and `Object.keys(STRINGS.nsfw)`. Without that, symmetry may be assumed rather than enforced.

- **LOW: `Logo size="medium"` semantics need accessibility clarity.**  
  The plan says medium logo is decorative, non-linked, and SVG is `aria-hidden="true"`. If the wordmark text is visible text, the component may still be announced by screen readers unless explicitly handled. That may be fine, but the intended accessible behavior should be explicit.

- **LOW: Plan 04’s layout test may be brittle.**  
  “Does not visually wrap or clip at 375px” is a good requirement, but an E2E assertion needs a concrete method: bounding box, screenshot comparison, `scrollWidth <= clientWidth`, single-line computed style, or text box height.

- **LOW: Copy quality requirements are subjective.**  
  “Sharpened to the CALLED IT! quality bar” is directionally useful, but not independently verifiable unless `08-UI-SPEC.md` contains exact target copy. Plan 02 should reference exact expected strings or acceptance examples.

- **LOW: No explicit check for SFW/NSFW mode switching at runtime.**  
  The plans test each mode, but they do not explicitly mention switching mode after render. Since the app uses theme-reactive copy and `$derived`, runtime reactivity is worth guarding for at least one affected component.

- **LOW: File ownership is clean, but merge conflict risk exists between Plans 03 and 04 only indirectly through tests/config.**  
  They touch different implementation files, but both may rely on shared copy/theme test setup. This is manageable but should be noted if executed in parallel.

## Suggestions

- Replace “byte-identical SFW output” with a more practical acceptance criterion:
  - “SFW EndScreen renders no logo and preserves existing headline/subhead/button DOM structure and classes.”
  - Optionally add a focused snapshot if the project already uses snapshots.

- Add an explicit key-symmetry test in `copy.test.ts`:
  ```ts
  expect(Object.keys(STRINGS.nsfw).sort()).toEqual(Object.keys(STRINGS.sfw).sort());
  ```

- Require exact expected copy values for all new and changed keys in Plan 02, especially:
  - `winnerCallout`
  - `nonWinnerConsolation`
  - `playAgainHostNote`
  - `winLineSuffixWinner`
  - `winLineSuffixNonWinner`
  - `orDivider`
  - sharpened `addWordButton`
  - sharpened `wordPoolEmptyHeading`

- Add test cleanup requirements wherever the theme is mutated:
  - Reset to SFW in `afterEach`.
  - Avoid tests depending on global store state from prior tests.

- Clarify accessible behavior for medium `Logo`:
  - If decorative, consider `aria-hidden="true"` on the entire logo wrapper, not only the SVG.
  - If the wordmark should be announced, keep the wrapper visible to assistive tech and only hide the icon.

- Make Plan 04’s mobile layout assertion concrete:
  - Assert the divider element has `scrollWidth <= clientWidth`.
  - Assert its bounding box height does not exceed one line plus tolerance.
  - Assert no horizontal page overflow at 375px.

- Add a “no hardcoded user-facing English” verification step using a targeted grep or test convention. The plan should distinguish user-facing literals from technical strings, test names, class names, and aria labels.

- In Plan 03, include a runtime reactivity test if feasible:
  - Render EndScreen in SFW, assert no logo.
  - Switch to NSFW, assert logo appears and copy updates.
  - Or keep mode-specific tests if the component lifecycle/test harness makes live switching awkward.

- Consider making Plan 02 slightly more reviewable by grouping keys by consuming surface:
  - EndScreen keys.
  - Home join-flow keys.
  - Existing NSFW sharpened keys.

- Add a final phase-level verification command list:
  - Unit tests for `Logo`, `copy`, and `EndScreen`.
  - E2E home first-visit spec.
  - Typecheck/build, because `copy.ts` and Svelte prop typing are central to this phase.

## Risk Assessment

**Overall risk: LOW to MEDIUM.**

The implementation surface is small and mostly presentational: Svelte components, copy constants, and tests. There are no meaningful security, persistence, networking, or real-time multiplayer risks. Performance impact should be negligible.

The risk rises to **MEDIUM** mainly because the phase changes shared copy infrastructure and theme-reactive UI used across multiple components. Test leakage from global theme state, brittle visual assertions, and incomplete hardcoded-string migration are the most likely failure modes. With explicit key-symmetry tests, theme cleanup, concrete layout assertions, and clearer accessibility expectations for the decorative logo, the plan set would be low risk and well-aligned with the phase goals.

---

## Consensus Summary

*Single reviewer — no consensus available.*

### Strengths
*(See Codex review above)*

### Concerns
*(See Codex review above)*
