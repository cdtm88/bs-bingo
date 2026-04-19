---
phase: 06
reviewers: [codex]
reviewed_at: 2026-04-19T16:35:46Z
plans_reviewed: [06-01-PLAN.md,06-02-PLAN.md,06-03-PLAN.md,06-04-PLAN.md]
---

# Cross-AI Plan Review — Phase 06

## Codex Review

## Summary

The Phase 6 plan set is generally well-structured and likely to achieve the UI overhaul goals: it establishes shared theme/copy infrastructure first, splits parallel-safe visual and copy work into separate plans, and finishes with a broad copy migration plus viewport/UAT validation. The strongest aspect is the explicit artifact contract between plans. The main risks are around Svelte reactivity details, theme initialization timing, hardcoded copy enforcement being underspecified, and Plan 04 carrying too much final-phase scope without enough automated coverage for every changed screen.

## Strengths

- Clear dependency ordering: Plan 01 creates the theme store, copy module, CSS tokens, and test scaffolds before downstream UI work begins.

- Good parallelization: Plans 02 and 03 both depend on Plan 01 but intentionally touch different files, which should reduce merge conflicts.

- Strong artifact contracts: Each plan names files, exports, required strings, and key links, making handoff and verification easier.

- Good separation of concerns:
  - Plan 01 owns infrastructure.
  - Plan 02 owns global theme toggle and home/banner migration.
  - Plan 03 owns board-specific visual identity.
  - Plan 04 owns final copy sweep and full-screen validation.

- Accessibility is partially considered:
  - Theme toggle uses `role="switch"`.
  - Dauber overlay has `pointer-events: none`.
  - Reduced motion is explicitly required for the stamp animation.

- Regression awareness is good: Plan 03 explicitly requires SFW board behavior to remain unchanged and existing `BoardCell` tests to keep passing.

- The copy contract is treated as a first-class dependency rather than scattered string replacement work.

- Final plan includes a human checkpoint, which is appropriate for a UI/theming phase where automated tests will not catch all visual regressions.

## Concerns

- **HIGH: Theme initialization may flash the wrong theme before hydration.**  
  Plan 02 says layout calls `theme.init()` on mount. If the saved theme is `nsfw`, the page may first render SFW, then flip after client mount. For a theming overhaul, this creates visible flicker and may affect screenshots/e2e assertions.

- **HIGH: Plan 04 is broad and touches many user-facing screens at once.**  
  It modifies six files across end screen, lobby, join, error, word pool, and pack pills. That is a lot of final sweep work, especially because it also includes grep audit, narrow viewport verification, and human UAT. This is the most likely plan to miss edge cases.

- **HIGH: Copy migration verification is underspecified.**  
  “No UI-SPEC Copywriting Contract strings remain hardcoded” is useful, but grep audits are brittle unless the exact grep command or denylist is specified. Hardcoded strings can differ by punctuation, interpolation, casing, or partial phrasing.

- **MEDIUM: Svelte 5 rune/store reactivity needs sharper contracts.**  
  The plans assume `copy.brand`, `theme.current`, and layout title updates are reactive. That depends on how `copy.ts` is implemented. If `copy` is a plain object computed once from `theme.current`, theme switching will not update copy live.

- **MEDIUM: `copy.ts` may become an overloaded global module.**  
  Centralizing all UI copy is good for this phase, but the plan risks making one large module responsible for every string, interpolation helper, and pack label. That is acceptable short-term, but it can become hard to maintain without structure.

- **MEDIUM: Theme toggle accessibility contract is incomplete.**  
  The plan requires `role="switch"` and `aria-label="Professional Mode"`, but does not mention `aria-checked`, keyboard behavior, visible focus state, or whether the label accurately reflects the current state.

- **MEDIUM: LocalStorage access needs SSR/browser guards.**  
  Plan 01 says the theme store persists to `localStorage` and applies `document.documentElement`. In SvelteKit, both must be guarded so server rendering or tests without browser globals do not fail.

- **MEDIUM: Document title reactivity may be easy to get subtly wrong.**  
  Plan 02 requires `+layout.svelte` to update `document.title` to `copy.brand` reactively. If the title is only set on mount, theme toggles will not update it.

- **MEDIUM: Plan 03 changes `room.svelte.ts` for confetti based on client theme state.**  
  This is probably fine because confetti is presentation-only, but `room.svelte.ts` may already be a high-risk real-time state store. The plan should make clear that no server-authoritative game state or win logic changes are allowed.

- **MEDIUM: NSFW visual additions may affect board layout stability.**  
  The BoardHeader row, dauber stamp, and blank-cell crosshatch could change cell sizing, scroll behavior, or tap targets, especially on mobile. The plan mentions no layout shift for the stamp but not for the header or blank styling.

- **LOW: Naming mismatch around starter packs.**  
  Project context says packs are Corporate Classics, Agile, Sales. Plan 04 mentions `copy.packCorporate / copy.packAgile / copy.packITJargon`. If the actual UI still has Sales, this may introduce product drift.

- **LOW: Test scaffold strategy may create intentional red tests that disrupt unrelated workflows.**  
  Plan 01 creates RED e2e/unit stubs. That is fine inside a phased workflow, but CI behavior should be explicit. If these tests run in normal CI before Plans 02-04 land, the branch will be intentionally broken.

- **LOW: `BoardHeader` letter requirements are unusual for 3x3.**  
  `B·L·S` for grid size 3 may be intentional, but it should be confirmed against the UI spec. Users may expect consistent “BULLS” branding or traditional bingo-style columns.

- **LOW: Performance risk is small but not zero.**  
  Theme switching via CSS variables is cheap. The only mild risk is if copy is implemented with broad reactive invalidation or if confetti/stamp animations are heavy on low-end mobile devices.

## Suggestions

- Add an inline pre-hydration theme script in `app.html` or equivalent SvelteKit head strategy so `data-theme` is set before first paint.

- Make the theme store contract explicitly SSR-safe:
  - No direct `window`, `document`, or `localStorage` access at module evaluation time.
  - `init()` should be idempotent.
  - Invalid stored values should fall back safely to `sfw`.

- Strengthen `ThemeToggle` requirements:
  - Include `aria-checked={theme.current === 'sfw'}` or equivalent semantics.
  - Confirm Space/Enter toggling works.
  - Add visible focus style.
  - Add an accessible name that does not become misleading when state changes.

- Define the `copy.ts` shape so reactivity is guaranteed. For example, require either:
  - derived getters that read `theme.current`, or
  - a rune-backed object whose properties update when theme changes.

- Add tests that toggle theme and assert copy updates without page reload.

- Specify the grep audit as a concrete command or script. Prefer a small test script with an allowlist/denylist over ad hoc grep.

- Split Plan 04 into two plans if schedule allows:
  - Plan 04a: migrate remaining copy in components/routes.
  - Plan 04b: full audit, responsive fixes, UAT polish.
  
  If it must stay one plan, add more precise verification per modified screen.

- Add a route-level smoke e2e for the room screen in both themes, especially because Phase 6 affects the active gameplay surface.

- Add a mobile board screenshot or Playwright assertion for NSFW board layout after Plan 03, not just final narrow viewport after Plan 04.

- Clarify whether starter pack labels are changing from Sales to IT Jargon. If not, rename `copy.packITJargon` or update the plan to match the validated product context.

- Require that `room.svelte.ts` changes are presentation-only and do not alter WebSocket messages, mark propagation, win detection, reconnect behavior, or reset semantics.

- Add explicit acceptance criteria for reduced motion:
  - stamp animation disabled or duration near-zero,
  - confetti disabled/reduced if applicable,
  - no essential state conveyed only by motion.

- Clarify CI expectations for RED scaffolds from Plan 01. If intentional failures are created, they should either be skipped until implementation or the branch should not be expected to pass CI between waves.

## Risk Assessment

**Overall risk: MEDIUM**

The architecture and sequencing are sound, and the phase goal is achievable. The risk is not from algorithmic complexity or performance; it is from UI integration details across many screens, SvelteKit SSR/hydration behavior, and the difficulty of proving all copy is theme-driven. Plan 01 and Plan 03 are reasonably contained. Plan 02 has hydration/accessibility risks around the global toggle. Plan 04 is the highest-risk item because it is a broad final sweep with many files and relies partly on grep and human UAT. With stronger SSR guards, concrete audit commands, accessibility criteria, and one or two extra e2e checks around theme switching and gameplay layout, this plan set would move closer to low risk.

---

## Consensus Summary

*Single reviewer — no consensus available.*

### Strengths
*(See Codex review above)*

### Concerns
*(See Codex review above)*
