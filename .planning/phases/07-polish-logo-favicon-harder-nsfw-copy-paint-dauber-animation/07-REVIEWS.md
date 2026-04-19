---
phase: 07
reviewers: [codex]
reviewed_at: 2026-04-19T16:35:46Z
plans_reviewed: [07-01-PLAN.md,07-02-PLAN.md,07-03-PLAN.md,07-04-PLAN.md]
---

# Cross-AI Plan Review — Phase 07

## Codex Review

## Summary

The plans are generally well-scoped, test-aware, and aligned with the phase goal: stronger brand identity, neutral favicon behavior, sharper NSFW copy, and a more tactile dauber animation. The strongest parts are the explicit must-have truths, file ownership, and preservation of important product constraints like Professional Mode privacy and reduced-motion support. The main risks are cross-plan integration issues in wave 1, theme/reactivity assumptions around Svelte 5 runes, and a few test designs that may be brittle or hard to assert meaningfully in unit/e2e environments.

## Strengths

- Clear phase decomposition: logo, favicon, copy, and animation are separable pieces with focused file scopes.
- Good acceptance criteria: most plans define concrete truths and artifacts rather than vague implementation intent.
- Strong attention to regression prevention:
  - home page must avoid duplicate logos
  - SFW mode must render no dauber markup
  - reduced-motion must disable animation
  - NSFW copy must preserve object shape parity
  - favicon must remain mode-neutral
- Accessibility and privacy constraints are considered, especially the neutral favicon and reduced-motion behavior.
- Tests are included for each plan, with both unit and e2e coverage where appropriate.
- The plans mostly respect existing architecture: SvelteKit static assets, route layout chrome, theme store, copy bundle, and component-level tests.

## Concerns

- **HIGH: Wave 1 plans may conflict in shared global/UI files.**  
  Plans 01 and 02 both touch app-level presentation concerns, and Plan 04 touches global CSS. They can run independently, but if executed concurrently there is a real integration risk around layout spacing, header/logo placement, theme toggle position, and CSS specificity.

- **HIGH: Logo plan may under-spec route/layout behavior.**  
  Plan 01 says compact logo appears on every non-home route including lobby, board, end, and error. In SvelteKit, error pages and nested route states can behave differently depending on whether `+layout.svelte` is active and what `page.route.id` contains. The route guard `page.route.id !== '/'` may not be sufficient for all error states.

- **MEDIUM: Theme reactivity in `Logo.svelte` needs careful Svelte 5 handling.**  
  The plan requires `"$derived(theme.current"` in the component. That is directionally right, but the actual implementation must ensure the logo flips immediately when `theme.toggle()` changes state. A non-reactive import read or incorrectly scoped derived value could pass simple render tests while failing live toggling.

- **MEDIUM: Plan 01 may introduce persistent chrome that affects gameplay layout.**  
  Adding a compact logo to board and end screens could reduce available viewport space, especially on mobile. The plan explicitly protects the theme toggle position, but does not call out board viewport constraints, touch targets, or possible overlap with existing controls.

- **MEDIUM: Favicon e2e coverage may be overkill or brittle.**  
  A Playwright spec asserting `/favicon.svg` returns 200 is useful, but testing `app.html` link wiring through browser behavior can be awkward depending on build/preview mode. A unit/static assertion may be more stable for the HTML link, with one e2e request check for the asset.

- **MEDIUM: Copy plan depends heavily on subjective audit labels.**  
  Plan 03 references “Sharpen” and “Mild near-copy of SFW” from research lines, but the executor only sees partial context in the summary. Without the exact list of strings to rewrite, there is risk of changing too much, missing some targets, or violating the “quality-ceiling strings stay untouched” rule.

- **MEDIUM: NSFW copy can easily drift into workplace-hostile language.**  
  The guardrails prohibit personal attacks and protected-class references, but the plan should also avoid sexual content, harassment-adjacent phrasing, and profanity that could make the app harder to share even in NSFW mode. “Harder NSFW” needs a ceiling, not just a floor.

- **MEDIUM: Animation tests may assert implementation details instead of behavior.**  
  Plan 04 requires specific class names and CSS keyframes. That is useful for protecting the intended structure, but tests that overfit to class placement can become brittle. The important behavior is: NSFW marked cells show the stamp/bleed, SFW does not, clicks still toggle, and reduced motion removes animation.

- **LOW: Pointer-events preservation is called out but not fully specified.**  
  Plan 04 correctly mentions the pointer-events chain, but it should explicitly require both wrapper and pseudo/child layers to remain non-interactive so the button receives clicks.

- **LOW: CSS token consistency could be stronger across logo and favicon.**  
  Plan 01 requires logo SVG fills to use `var(--color-accent)`, which is good. Plan 02’s favicon is static and neutral, so it should probably avoid depending on CSS variables that may not resolve reliably in browser tab icons.

- **LOW: Plan 02 says `static/` does not exist.**  
  That may be true at planning time, but executors should still check before creating it. This is minor, but plan wording should avoid assuming a stale directory state.

- **LOW: Plan 03 test update could simply mirror implementation literals.**  
  Updating tests to match new strings provides regression coverage, but it does not validate tone or guardrails. That is acceptable for unit tests, but the plan should include a manual review checklist for copy quality.

## Suggestions

- Add an explicit integration step after all wave 1 plans:
  - run unit tests
  - run e2e tests
  - manually verify home, lobby, board, end, and error routes
  - toggle Professional Mode on each relevant route
  - check mobile viewport layout

- For Plan 01, strengthen route guard requirements:
  - verify compact logo appears on normal non-home routes
  - verify behavior on SvelteKit error route
  - ensure board layout and primary controls remain usable on mobile
  - add a test or manual check that home renders only the hero logo

- For Plan 01, test live theme switching directly:
  - render logo in SFW
  - call `theme.set("nsfw")` or click the existing toggle
  - assert the wordmark/icon changes without remount or reload

- For Plan 02, prefer a stable split:
  - static/unit test: `src/app.html` references `%sveltekit.assets%/favicon.svg` with `type="image/svg+xml"`
  - e2e test: `/favicon.svg` returns 200 and an SVG content type
  - manual check: no `/favicon.png` request appears

- For Plan 03, include an explicit rewrite inventory from the research audit:
  - keys to rewrite
  - keys explicitly frozen
  - interpolation helpers affected
  - expected parity check between `STRINGS.sfw` and `STRINGS.nsfw`

- For Plan 03, add a structural parity test if one does not already exist:
  - compare key sets recursively between SFW and NSFW strings
  - include helper behavior tests for `waitingForHost`, `winnerSubhead`, and `nonWinnerSubhead`

- For Plan 03, define a clearer NSFW tone ceiling:
  - cynical office humor is allowed
  - profanity should be limited and purposeful
  - no sexual insults, identity references, or attacks on players/coworkers
  - target meetings, jargon, process, and corporate theater

- For Plan 04, make the reduced-motion spec precise:
  - `prefers-reduced-motion: reduce` should remove `animation-name` or set animation duration effectively to zero
  - opacity should still communicate marked state immediately
  - no delayed visual state that could confuse users

- For Plan 04, add one behavior-level test for unmarking:
  - render a marked NSFW cell
  - click the cell
  - assert the click handler fires or marked state toggles
  - this protects the pointer-events requirement better than class checks alone

- For Plan 04, avoid relying only on Tailwind `motion-reduce:animate-none` if the bleed ring is implemented via `::after`; pseudo-element animation may need an explicit CSS media query.

- Add a final visual smoke pass:
  - desktop and mobile home page
  - desktop and mobile board
  - SFW and NSFW themes
  - reduced-motion mode
  - favicon network request

## Risk Assessment

**Overall risk: MEDIUM.**

The individual plans are modest and technically reasonable, but the phase touches visible brand surfaces, global layout, theme-reactive rendering, copy tone, and animation behavior at the same time. None of the plans look fundamentally misdirected, but integration risk is real because several changes affect persistent UI chrome and global CSS. The highest-risk areas are route/layout behavior for the compact logo, live theme switching, mobile board layout after adding chrome, and reliable reduced-motion handling for pseudo-element animation. With an explicit integration pass and a few stronger behavior tests, this phase should be safe to execute.

---

## Consensus Summary

*Single reviewer — no consensus available.*

### Strengths
*(See Codex review above)*

### Concerns
*(See Codex review above)*
