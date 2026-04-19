# Phase 7: Polish — logo, favicon, harder NSFW copy, paint dauber animation - Context

**Gathered:** 2026-04-19
**Status:** Ready for planning

<domain>
## Phase Boundary

Finishing-touches pass layered on Phase 6's dual-mode design system. Four discrete deliverables:

1. **Dual-mode SVG logo/wordmark** — a visual identity mark for each theme, used on the home page and in a persistent compact header across all screens.
2. **Favicon** — a single neutral mark that fixes the broken `favicon.png` reference and works safely on shared screens regardless of mode.
3. **Harder NSFW copy** — sharpen existing NSFW strings with more specific, wit-first cynicism; expand to strings Phase 6 left mild. No new gameplay features.
4. **Paint dauber animation upgrade** — replace the current scale-in with an impact + ink bleed ring animation in NSFW mode.

No game logic, WebSocket protocol, or server changes.

</domain>

<decisions>
## Implementation Decisions

### Logo / Wordmark

- **D-01:** Dual-mode SVG lockup — separate SFW and NSFW logo variants, each with an icon + wordmark.
  - **SFW ("Buzzword Bingo"):** Grid/checkmark icon + "Buzzword Bingo" wordmark, dark palette (`var(--color-ink-primary)` / `var(--color-accent)`).
  - **NSFW ("Bullshit Bingo"):** Dauber splat icon + "Bullshit Bingo" wordmark, burnt orange/parchment palette. The splat icon echoes the board's dauber stamp mark — intentional visual coherence.
- **D-02:** Logo appears in two contexts:
  - **Home page:** Full-size hero wordmark (replaces or wraps the current `<h1>{copy.brand}</h1>` block).
  - **All other screens (lobby, board, end screen):** Compact logo in a persistent header bar.
- **D-03:** Theme-reactive — the correct variant renders based on `theme.current`. Use the existing theme store; no new state needed.

### Favicon

- **D-04:** Single neutral SVG or PNG mark — a bingo grid or abstract checkmark that is not mode-specific. The favicon never betrays the NSFW state on a shared screen. No JS dynamic swap.
- **D-05:** Fix the broken `favicon.png` reference in `src/app.html`. Update to `favicon.svg` if SVG is chosen (add a PNG fallback `<link>` for Safari if needed).

### NSFW Copy — Harder

- **D-06:** Direction is **sharper cynicism (wit-first)** — rewrite mild existing strings with more specific, darkly amused language. Tone target: jaded office worker who quotes The Office, not shock value.
- **D-07:** Tone guardrails: dark office humor targeting meetings, corporate culture, and the situation. No personal attacks, no protected-class references.
- **D-08:** Scope: audit all strings in `src/lib/copy.ts` NSFW bundle. Strings that are already punchy stay. Strings that read as generic or mild get rewritten. If Phase 6 left any NSFW strings as near-copies of SFW (low differentiation), sharpen those too.
- **D-09:** Example rewrites (directional — planner should audit the full bundle):
  - `"For meetings that could've been an email."` → `"For meetings that could've been a Slack message nobody asked for."` or similar specificity upgrade.
  - `"Waiting for someone to pull the trigger…"` → something more specific to the meeting context.
  - Any validation messages, empty states, or helper text left generic in Phase 6 get the same treatment.

### Paint Dauber Animation — NSFW mode only

- **D-10:** Upgrade to **Impact + Ink Bleed Ring**: two-phase animation — (1) the stamp circles in with a scale overshoot, (2) an expanding ring fades out like ink spreading from a real dauber.
- **D-11:** Requires a wrapper element (e.g., `<span class="dauber-wrap">`) around the existing SVG overlay inside `BoardCell.svelte`. The `::after` pseudo-element on `.dauber-wrap` renders the bleed ring.
- **D-12:** `pointer-events: none` must remain on all layers — the underlying button still receives clicks.
- **D-13:** `prefers-reduced-motion` guard: animation collapses to instant opacity change, no motion.
- **D-14:** NSFW mode only — the dauber overlay doesn't exist in SFW, so no SFW animation changes.
- **D-15:** Reference CSS (from research — planner should tune timing per visual QA):

```css
@keyframes dauberStampIn {
  0%   { transform: scale(0.5);  opacity: 0; }
  60%  { transform: scale(1.08); opacity: 0.80; }
  100% { transform: scale(1.0);  opacity: 0.72; }
}

@keyframes dauberBleed {
  0%   { transform: scale(0.9); opacity: 0.5; }
  100% { transform: scale(1.6); opacity: 0; }
}

.dauber-stamp {
  animation: dauberStampIn 180ms cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards;
}

/* .dauber-wrap: position:absolute inset-0 pointer-events:none */
.dauber-wrap::after {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: 50%;
  background: var(--color-accent);
  opacity: 0;
  animation: dauberBleed 400ms 60ms ease-out forwards;
}

@media (prefers-reduced-motion: reduce) {
  .dauber-stamp { animation: none; opacity: 0.72; }
  .dauber-wrap::after { animation: none; }
}
```

### Claude's Discretion

- Exact SVG path geometry for the grid/checkmark (SFW favicon and logo icon) — any clean minimal mark that reads at 32px and 200px.
- Exact SVG path for the dauber splat logo icon in NSFW — should echo the board dauber's slightly irregular circle aesthetic.
- Whether favicon ships as SVG or PNG (pick whichever has better cross-browser coverage; SVG is preferred with PNG fallback).
- Specific string rewrites for NSFW copy — the planner should audit `copy.ts` and rewrite all strings that score low on wit/specificity. Tone reference: the existing "Hanging on for dear life…" and "CALLED IT!" are the quality ceiling to match or exceed.
- Whether the compact persistent header logo is inside `+layout.svelte` or injected per-route.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Design System
- `src/app.css` — All CSS custom properties including `[data-theme="nsfw"]` override block. Logo and favicon mark colors must use these tokens.
- `.planning/phases/06-ui-overhaul/06-CONTEXT.md` — All Phase 6 decisions: dual-mode architecture, palette tokens, ThemeToggle placement, dauber stamp design intent (D-10), existing SVG path for the dauber circle.

### Copy
- `src/lib/copy.ts` — The single source of truth for all user-facing strings. NSFW copy audit must cover every key in the `nsfw` object. Planner reads the full file to identify mild strings.

### Components
- `src/lib/components/BoardCell.svelte` — Current dauber stamp implementation (SVG path, `.dauber-stamp` class, `pointer-events-none` chain). Animation upgrade modifies this file.
- `src/routes/+layout.svelte` — Where persistent header logo and `data-theme` application live.
- `src/routes/+page.svelte` — Current home page wordmark (h1 block). Logo replaces or wraps this.

### Infrastructure
- `src/app.html` — Favicon link reference to fix (`favicon.png` → actual file).

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/lib/stores/theme.svelte.ts` — `theme.current` reactive store. Logo component reads this to switch variants; no new state needed.
- `src/lib/copy.ts` — Proxy object (`copy.brand` etc.) already reactive to theme changes. Logo wordmark text derives from this.
- Existing dauber SVG path in `BoardCell.svelte` — the NSFW logo icon's dauber splat should be visually consistent with this path (same family of organic irregular circle).

### Established Patterns
- CSS custom property tokens (`var(--color-*)`) flip automatically under `[data-theme="nsfw"]` — logo SVG must use these tokens via `currentColor` or explicit `var()` references, not hardcoded hex.
- Phase 6 established: animation class `dauber-stamp` on a `<span>` with `pointer-events-none absolute inset-0` inside the button. New `.dauber-wrap` wrapper follows same placement pattern.

### Integration Points
- `src/routes/+layout.svelte` — Compact logo goes here (wraps all routes).
- `src/routes/+page.svelte` — Hero logo replaces the current `<h1>` block.
- `src/app.html` — Static favicon link (update href, possibly format).
- `static/` — Logo SVG files and favicon asset(s) live here.

</code_context>

<specifics>
## Specific Ideas

- The dauber splat logo icon in NSFW mode directly mirrors what happens when you mark a cell — same ink-splat visual vocabulary. This creates a moment of recognition when users first stamp a word.
- The SFW grid/checkmark icon should read as "professional bingo" — minimal, geometric, respectable enough to show on a shared screen.
- The NSFW copy rewrite tone reference: "Hanging on for dear life…" (reconnecting banner) and "CALLED IT!" (win headline) are already punchy. Every other string should reach that level.
- Bleed ring animation: the ring expands outward and fades, simulating ink spread from a real dauber on paper. The 60ms delay before bleed starts (after stamp settles at 60% of stampIn) gives the impact-then-spread sequence.

</specifics>

<deferred>
## Deferred Ideas

- JS dynamic favicon swap on theme toggle — considered and declined in favor of a single neutral mark. Could be revisited as a v2 delight feature if the cover-story angle becomes a priority.
- OG image / social card — the dual-mode logo SVGs would be natural source material, but generating OG images is out of Phase 7 scope.
- PWA manifest icons — same as above; logo SVGs are the right source but manifest is out of scope.
- Sound effects on dauber stamp (SOCL-03 v2).

</deferred>

---

*Phase: 07-polish-logo-favicon-harder-nsfw-copy-paint-dauber-animation*
*Context gathered: 2026-04-19*
