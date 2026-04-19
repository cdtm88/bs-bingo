# Phase 7: Polish — logo, favicon, harder NSFW copy, paint dauber animation - Research

**Researched:** 2026-04-18
**Domain:** Frontend visual polish — SVG logos, favicons, CSS animation, copy craft (SvelteKit 2 / Svelte 5 / Tailwind 4)
**Confidence:** HIGH

## Summary

Phase 7 is a pure frontend polish layer on top of Phase 6's dual-mode design system. Four deliverables, all local to `src/`, `src/app.css`, `src/app.html`, and a new `static/` directory that currently does not exist at the project root. No server changes, no new dependencies, no protocol or gameplay impact.

The highest-risk item is the paint dauber animation upgrade in `BoardCell.svelte` — the existing stamp is already production and the new wrapper + `::after` bleed ring must preserve `pointer-events: none` on all layers so the underlying button still receives clicks, and must respect `prefers-reduced-motion`. The lowest-risk item is the NSFW copy rewrite because `src/lib/copy.ts` is already the single source of truth (Phase 6 grep-audit enforced this) — rewrites are string edits inside one file with a trivial unit-test update.

**Primary recommendation:** Ship the four deliverables as four independent tasks in one phase. Add a `static/` directory (it doesn't exist yet — that's the root cause of the broken `favicon.png` 404), ship an SVG favicon referenced at `<link rel="icon" href="/favicon.svg" />` with no PNG fallback (modern browser SVG favicon support is universal in 2026). Build a single `Logo.svelte` component that reads `theme.current` and switches variants inline — avoids duplicating header placement across routes. Upgrade dauber to impact+bleed via the exact CSS contract in CONTEXT D-15. Audit `copy.ts` end-to-end and sharpen every string that does not meet the "CALLED IT!" / "Hanging on for dear life…" quality bar.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Logo / Wordmark:**
- **D-01:** Dual-mode SVG lockup — separate SFW and NSFW logo variants, each with an icon + wordmark.
  - SFW ("Buzzword Bingo"): Grid/checkmark icon + wordmark, dark palette (`var(--color-ink-primary)` / `var(--color-accent)`).
  - NSFW ("Bullshit Bingo"): Dauber splat icon + wordmark, burnt orange/parchment palette. The splat icon echoes the board's dauber stamp.
- **D-02:** Logo appears in two contexts — home page (full-size hero wordmark replacing/wrapping current `<h1>`) and all other screens (lobby, board, end) via a persistent compact header bar.
- **D-03:** Theme-reactive — correct variant renders based on `theme.current`. Use the existing theme store; no new state.

**Favicon:**
- **D-04:** Single neutral SVG or PNG mark — bingo grid or abstract checkmark. Not mode-specific. Never betrays NSFW state on a shared screen. No JS dynamic swap.
- **D-05:** Fix the broken `favicon.png` reference in `src/app.html`. Update to `favicon.svg` if SVG chosen (add PNG fallback `<link>` for Safari if needed).

**NSFW Copy — Harder:**
- **D-06:** Direction is sharper cynicism (wit-first) — rewrite mild existing strings with more specific, darkly amused language. Tone: jaded office worker who quotes The Office, not shock value.
- **D-07:** Tone guardrails — dark office humor targeting meetings, corporate culture, and the situation. No personal attacks, no protected-class references.
- **D-08:** Scope: audit all strings in `src/lib/copy.ts` NSFW bundle. Strings already punchy stay. Strings that read as generic or mild get rewritten. Strings Phase 6 left as near-copies of SFW (low differentiation) get sharpened too.
- **D-09:** Example directional rewrites (planner audits full bundle):
  - `"For meetings that could've been an email."` → `"For meetings that could've been a Slack message nobody asked for."` or similar specificity upgrade.
  - `"Waiting for someone to pull the trigger…"` → something more specific to the meeting context.
  - Any validation messages, empty states, or helper text left generic in Phase 6 get the same treatment.

**Paint Dauber Animation (NSFW only):**
- **D-10:** Upgrade to Impact + Ink Bleed Ring. Two phases: (1) stamp circles in with scale overshoot, (2) expanding ring fades out like ink spreading from a real dauber.
- **D-11:** Wrapper element (e.g., `<span class="dauber-wrap">`) around existing SVG overlay in `BoardCell.svelte`. The `::after` pseudo-element on `.dauber-wrap` renders the bleed ring.
- **D-12:** `pointer-events: none` must remain on all layers — underlying button still receives clicks.
- **D-13:** `prefers-reduced-motion` guard — animation collapses to instant opacity change, no motion.
- **D-14:** NSFW mode only — dauber overlay doesn't exist in SFW, so no SFW animation changes.
- **D-15:** Reference CSS (planner tunes timing per visual QA):
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
- Exact SVG path for the dauber splat logo icon in NSFW — echoes the board dauber's slightly irregular circle aesthetic.
- Whether favicon ships as SVG or PNG (SVG preferred with PNG fallback if needed).
- Specific string rewrites for NSFW copy — planner audits `copy.ts` and rewrites strings scoring low on wit/specificity. Tone reference: "Hanging on for dear life…" and "CALLED IT!" are the quality ceiling.
- Whether the compact persistent header logo is inside `+layout.svelte` or injected per-route.

### Deferred Ideas (OUT OF SCOPE)

- JS dynamic favicon swap on theme toggle — declined; v2 candidate.
- OG image / social card — out of Phase 7 scope.
- PWA manifest icons — out of scope.
- Sound effects on dauber stamp (SOCL-03 v2).
</user_constraints>

<phase_requirements>
## Phase Requirements

Phase 7 has **no mapped v1 requirements** — this is a polish phase on top of Phase 6's dual-mode design system. All v1 requirements (SESS-*, LOBB-*, BOAR-*, WIN-*, RESI-*) were completed in Phases 1–5 and the Phase 6 UI overhaul did not add new requirement IDs.

Success for Phase 7 is measured by deliverable completion:

| Deliverable | Success Criteria |
|-------------|------------------|
| Dual-mode logo/wordmark | Theme-reactive `Logo` component renders correct variant on home hero + persistent header on lobby/board/end screens. Icon + wordmark both use `var(--color-*)` tokens (not hex). Readable at 32px (compact) and 200px (hero). |
| Favicon | `/favicon.svg` loads with 200 (no 404 in browser devtools console). Mark is neutral — cannot be identified as SFW or NSFW at a glance on a shared screen. `src/app.html` link tag resolves. |
| Harder NSFW copy | Every string in `STRINGS.nsfw` in `src/lib/copy.ts` has been reviewed. Strings falling below the "CALLED IT!" quality bar have been rewritten. Unit tests in `tests/unit/copy.test.ts` updated to match new strings. |
| Paint dauber animation | Marking an NSFW cell shows scale-overshoot impact followed by an expanding ink bleed ring. Underlying button click still works (no `pointer-events` regression). `prefers-reduced-motion` collapses to instant opacity. No visual regression on SFW board. |
</phase_requirements>

## Project Constraints (from CLAUDE.md)

- **GSD Workflow Enforcement:** All Phase 7 edits must be planned and executed via GSD commands (`/gsd-plan-phase`, `/gsd-execute-phase`). Direct repo edits outside a GSD workflow are forbidden.
- **Stack lock (CLAUDE.md "What NOT to Use"):** No new state manager (Svelte 5 runes are the pattern), no new styling framework (Tailwind v4 only), no JS dynamic favicon swap (declined per D-04).
- **Zero-signup / browser-only / sub-1s performance:** Phase 7 is visual polish only. No regression to these constraints. New SVG assets must be inline in components or small enough that a 3G first-visit is unaffected.
- **Developer profile directives:** Terse, decision-first communication; present recommendations as decisions; keep strict scope — no drive-by refactors in Phase 7 tasks.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Logo rendering (hero + header) | Browser / Client (Svelte component) | — | Theme-reactive; reads client-only `theme.current` store. SSR renders default `sfw` variant, client hydrates to stored preference. |
| Favicon | Static / CDN | — | Single static SVG asset served from SvelteKit's `static/` directory by the Cloudflare Assets binding. No JS involvement. |
| Copy strings | Browser / Client (module) | — | `src/lib/copy.ts` is a reactive proxy that reads `theme.current`. Already the single source of truth; Phase 7 edits string values only. |
| Dauber animation | Browser / Client (CSS keyframes + Svelte markup) | — | Pure CSS animation on theme-conditional markup in `BoardCell.svelte`. No JS animation library. |

## Architecture Patterns

### System Architecture Diagram

```
Home page (/)                  Persistent header (/lobby, /room, /room/end, /error)
     │                                         │
     ▼                                         ▼
┌──────────────────┐                 ┌──────────────────┐
│ <Logo           │                  │ <Logo           │
│   size="hero"   │                  │   size="compact"│
│ />              │                  │ />              │
└────────┬─────────┘                 └────────┬─────────┘
         │                                    │
         └──────────────┬─────────────────────┘
                        │
                        ▼
             ┌─────────────────────┐
             │ reads theme.current │
             │ (Svelte 5 rune)     │
             └──────────┬──────────┘
                        │
             ┌──────────┴──────────┐
             │                     │
             ▼                     ▼
        theme="sfw"           theme="nsfw"
             │                     │
             ▼                     ▼
     grid/checkmark SVG    dauber splat SVG
     + "Buzzword Bingo"    + "Bullshit Bingo"
     (accent yellow)       (burnt orange)

         uses var(--color-*) tokens — no hardcoded hex
```

**Favicon (static, independent of theme):**

```
<link rel="icon" href="/favicon.svg">  ← src/app.html
               │
               ▼
       static/favicon.svg  ← neutral mark (bingo grid / checkmark)
               │
               ▼
       Served by Cloudflare Assets binding (wrangler.jsonc ASSETS)
               │
               ▼
       Visible in browser tab on every route, both themes
```

**Dauber animation stack (BoardCell.svelte, NSFW, marked cell):**

```
<button>                        ← receives click, pointer-events: auto
  <span.dauber-wrap>            ← position:absolute inset-0, pointer-events:none
    <svg.dauber-stamp>          ← scale-overshoot stamp in (180ms)
       <path fill=var(--color-accent)>
    </svg>
    ::after pseudo              ← bleed ring, 400ms 60ms ease-out
       radial ink spread, opacity 0.5→0, scale 0.9→1.6
  </span>
  <span.z-10>word text</span>
</button>
```

### Component Responsibilities

| Artifact | Responsibility | File |
|----------|---------------|------|
| `Logo.svelte` (new) | Theme-reactive logo component. Props: `size: 'hero' \| 'compact'`. Renders correct SVG icon + wordmark per `theme.current`. | `src/lib/components/Logo.svelte` |
| `+layout.svelte` | Renders `<Logo size="compact" />` in persistent header (above or next to ThemeToggle). | `src/routes/+layout.svelte` |
| `+page.svelte` (home) | Replaces `<h1>{copy.brand}</h1>` block with `<Logo size="hero" />`. Tagline (`copy.homeTagline`) stays. | `src/routes/+page.svelte` |
| `static/favicon.svg` (new) | Neutral bingo grid or checkmark, 32×32 viewBox. Uses `currentColor` or fixed neutral ink. | `static/favicon.svg` |
| `src/app.html` | Update `<link rel="icon">` from `favicon.png` to `favicon.svg`. Remove `%sveltekit.assets%/` prefix — SvelteKit serves `static/` contents at `/`. | `src/app.html` |
| `src/lib/copy.ts` | Rewrite mild NSFW strings per D-08 / D-09 tone spec. No structural change to proxy. | `src/lib/copy.ts` |
| `BoardCell.svelte` | Wrap existing `<span class="dauber-stamp">` in outer `<span class="dauber-wrap">`. Keep `pointer-events-none` on both. | `src/lib/components/BoardCell.svelte` |
| `app.css` | Replace `dauberStampIn` keyframes with overshoot version. Add `dauberBleed` keyframes. Add `.dauber-wrap::after` rule. Keep existing reduced-motion guard. | `src/app.css` |
| `tests/unit/copy.test.ts` | Update assertions for any rewritten string (brand/tagline/winHeadline assertions likely stable; rewritten middle strings need edits). | `tests/unit/copy.test.ts` |

### Recommended Project Structure

```
bs-bingo/
├── src/
│   ├── app.html                        # <link rel="icon" href="/favicon.svg">
│   ├── app.css                         # updated dauberStampIn + new dauberBleed + wrap rule
│   ├── lib/
│   │   ├── copy.ts                     # rewritten nsfw strings
│   │   └── components/
│   │       ├── Logo.svelte             # NEW
│   │       └── BoardCell.svelte        # + dauber-wrap
│   └── routes/
│       ├── +layout.svelte              # persistent <Logo size="compact" />
│       └── +page.svelte                # <Logo size="hero" />
├── static/                             # NEW directory (does not exist today)
│   └── favicon.svg                     # NEW, single neutral mark
└── tests/unit/
    └── copy.test.ts                    # updated assertions for new strings
```

### Pattern 1: Theme-reactive Logo component (Svelte 5 runes)

**What:** A Svelte 5 component that reads `theme.current` via the existing store getter and renders the correct SVG variant. Proxy-free — the Svelte compiler tracks the getter call and re-renders the component when `theme.current` changes.

**When to use:** Anywhere the logo appears — `+page.svelte` (hero) and `+layout.svelte` (compact). One component, two sizes, two theme variants.

**Why this over inline per-route markup:** CONTEXT claims the logo "appears in two contexts" (D-02) and leaves per-route-vs-layout placement to Claude's discretion. A single reusable component reduces the surface area for logo changes and guarantees visual consistency. Phase 6 already established the convention of small leaf components (`BoardCell`, `WordChip`, `PlayerRow`).

**Example (pseudo-structure, not implementation):**

```svelte
<!-- src/lib/components/Logo.svelte -->
<script lang="ts">
  import { theme } from "$lib/stores/theme.svelte";
  import { copy } from "$lib/copy";

  type Size = "hero" | "compact";
  let { size = "compact" }: { size?: Size } = $props();

  // Reactive — re-reads on theme change (Svelte 5 runes track the getter call).
  const isNsfw = $derived(theme.current === "nsfw");
</script>

<span class={[
  "inline-flex items-center gap-2",
  size === "hero" ? "text-[40px] sm:text-[56px] font-display font-semibold" : "text-base font-display font-semibold",
].join(" ")}>
  {#if isNsfw}
    <!-- NSFW: dauber splat SVG icon + "Bullshit Bingo" -->
    <svg viewBox="0 0 24 24" aria-hidden="true" class={size === "hero" ? "w-10 h-10" : "w-5 h-5"}>
      <path d="..." fill="var(--color-accent)" opacity="0.85" />
    </svg>
    <span>{copy.brand}<span class="text-[var(--color-accent)]">.</span></span>
  {:else}
    <!-- SFW: grid/checkmark SVG icon + "Buzzword Bingo" -->
    <svg viewBox="0 0 24 24" aria-hidden="true" class={size === "hero" ? "w-10 h-10" : "w-5 h-5"}>
      <path d="..." stroke="currentColor" stroke-width="2" fill="none" />
    </svg>
    <span>{copy.brand}<span class="text-[var(--color-accent)]">.</span></span>
  {/if}
</span>
```

**Source:** [CITED: Svelte 5 runes docs — https://svelte.dev/docs/svelte/$derived]; existing patterns in `src/lib/components/BoardCell.svelte` and `src/lib/components/ThemeToggle.svelte` [VERIFIED: read from codebase].

### Pattern 2: SVG favicon without JS swap

**What:** A single `static/favicon.svg` referenced from `src/app.html` via `<link rel="icon" href="/favicon.svg">`. No theme reaction.

**When to use:** Always — D-04 locks this. NSFW-revealing favicons are explicitly out per the shared-screen cover story.

**Why this path:**
1. SvelteKit's convention is `static/*` assets serve at the root path [CITED: https://svelte.dev/docs/kit/project-structure].
2. `%sveltekit.assets%/` prefix in the current broken `app.html` is documented but unnecessary for root-served static files; `/favicon.svg` works identically and is more idiomatic.
3. SVG favicons have universal modern browser support in 2026 — Safari added SVG favicon support in 15.4 (March 2022) [CITED: https://caniuse.com/link-icon-svg]. No PNG fallback is required for this project's target audience (meeting participants on modern devices).

**Example:**

```html
<!-- src/app.html -->
<link rel="icon" href="/favicon.svg" type="image/svg+xml" />
```

```svg
<!-- static/favicon.svg — example grid icon -->
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">
  <!-- 3×3 or 5×5 grid with one cell marked — reads as "bingo" universally -->
  <rect x="2"  y="2"  width="8" height="8" fill="#F5D547" />
  <rect x="12" y="2"  width="8" height="8" fill="none" stroke="#F5D547" stroke-width="2" />
  <rect x="22" y="2"  width="8" height="8" fill="none" stroke="#F5D547" stroke-width="2" />
  <!-- ... -->
</svg>
```

**Source:** [CITED: SvelteKit project-structure docs]; [CITED: caniuse link-icon-svg, 97%+ global support in 2026].

### Pattern 3: Two-phase impact+bleed CSS animation

**What:** The CSS contract locked in CONTEXT D-15 — scale-overshoot stamp (180ms cubic-bezier) plus a staggered bleed ring via `::after` (400ms, 60ms delay). Both respect `prefers-reduced-motion`.

**When to use:** On the NSFW dauber stamp when a cell becomes marked. Only inside the `{#if marked && theme.current === "nsfw"}` branch of `BoardCell.svelte`.

**Why this over the current single scale-in:** CONTEXT D-10 locks the upgrade. The bleed ring is the "ink spreading on paper" metaphor that makes the mark feel tactile. The 60ms delay after stamp-settle gives an impact-then-spread rhythm rather than simultaneous noise.

**Example:** See D-15 CSS block in User Constraints above. Markup change:

```svelte
<!-- src/lib/components/BoardCell.svelte (NSFW + marked branch) -->
{#if marked && theme.current === "nsfw"}
  <span
    class="absolute inset-0 flex items-center justify-center pointer-events-none dauber-wrap motion-reduce:animate-none"
    aria-hidden="true"
  >
    <svg viewBox="0 0 100 100" class="w-[85%] h-[85%] dauber-stamp" preserveAspectRatio="xMidYMid meet">
      <path d="M 50,8 C 68,6 92,22 92,50 C 92,72 74,94 50,92 C 28,94 8,72 8,50 C 8,26 32,10 50,8 Z"
            fill="var(--color-accent)" opacity="0.72" />
    </svg>
  </span>
{/if}
```

**Critical:** `pointer-events-none` MUST stay on `.dauber-wrap`. The `::after` inherits this. The wrapper span does NOT get `pointer-events-auto` anywhere. Only the outer `<button>` receives clicks.

**Source:** [CITED: CSS `::after` + `pointer-events` inheritance — MDN]; existing dauber-stamp pattern in `src/app.css` lines 73-87 [VERIFIED: read from codebase].

### Pattern 4: Copy rewrite audit methodology

**What:** A systematic pass over `STRINGS.nsfw` in `src/lib/copy.ts` where each string is scored against the "CALLED IT!" / "Hanging on for dear life…" quality bar. Low-scoring strings get rewritten; high-scoring strings stay.

**When to use:** Once, during the copy-rewrite task. Document scores inline in the plan so the reviewer can see reasoning.

**Scoring rubric (Claude's discretion, derived from D-06 and D-09):**

| Score | Criteria | Action |
|-------|----------|--------|
| Keep | Specific, darkly witty, references the meeting/corporate situation concretely | No change |
| Sharpen | Generic or mild — reads like "SFW with attitude" rather than a distinct voice | Rewrite |
| Mild near-copy of SFW | NSFW string is structurally the same as SFW with a single word swapped | Rewrite for voice distinction |

**Audit of current `STRINGS.nsfw` (baseline scoring — planner may adjust):**

| Key | Current NSFW value | Score | Rewrite direction |
|-----|--------------------|-------|-------------------|
| `brand` | "Bullshit Bingo" | Keep | — |
| `metaDescription` | "For meetings that could've been an email." | Sharpen | More specific: "For meetings that could've been a Slack message nobody asked for." (per D-09) |
| `homeTagline` | "For meetings that could've been an email." | Sharpen | Same rewrite as metaDescription OR distinct voice |
| `createCta` | "Start the chaos" | Keep | — |
| `joinCta` | "Jump in" | Sharpen | Reads mild — e.g., "Pull up a chair" |
| `modalCreateSubmit` | "Start the chaos" | Keep | — |
| `modalJoinSubmit` | "Jump in" | Sharpen (same as joinCta) | — |
| `joinModalTitle` | "What should we call you?" | Mild near-copy of SFW | Rewrite with voice |
| `emptyName` | "Come on, give us something." | Keep | — |
| `maxChars` | "Max 20 characters." | Mild near-copy of SFW | Rewrite with voice (or accept that validation messages should be terse) |
| `invalidCode` | "Six letters and numbers. Try again." | Mild near-copy of SFW | Rewrite with voice |
| `wordInputLabel` | "What corporate BS will they say?" | Keep | — |
| `wordInputPlaceholder` | "What corporate BS will they say?" | Keep | — |
| `duplicateWord` | "Somebody beat you to it." | Sharpen | More cynical — e.g., "Already on the list. Think harder." |
| `startGame` | "Start the suffering" | Keep | — |
| `waitingForHostLobby` | "Waiting for someone to pull the trigger…" | Sharpen per D-09 | More meeting-specific |
| `waitingForPlayers` | "Who's ready to suffer? Share the code to drag someone in." | Keep | — |
| `addWordButton` | "Add" | Mild near-copy of SFW | Consider "Drop it in" or accept button terseness |
| `playersLabel` | "Players" | Mild near-copy of SFW | Consider "Victims" / "Attendees" |
| `wordPoolEmptyHeading` | "No words yet" | Mild near-copy of SFW | Rewrite |
| `wordPoolEmptyBody` | "Add the BS you expect to hear. Everybody chips in." | Sharpen | Weak second sentence |
| `packCorporate` | "Corporate Classics (the greatest hits)" | Keep | — |
| `packAgile` | "Agile (🙄)" | Keep | — |
| `packITJargon` | "IT Jargon (you poor soul)" | Keep | — |
| `winHeadline` | "CALLED IT!" | Keep (quality ceiling) | — |
| `playAgain` | "Do it again" | Sharpen | Mild — e.g., "Back into the grinder" |
| `endWaitingForHost` | "Waiting for the host to start a new game." | Mild near-copy of SFW | Rewrite with voice |
| `reconnectingBanner` | "Hanging on for dear life…" | Keep (quality ceiling) | — |
| `errorHeading` | "That room's gone." | Keep | — |
| `errorBody` | "Probably for the best. Go find another meeting to survive." | Keep | — |
| `errorCta` | "Start a new one" | Mild near-copy of SFW | Rewrite — e.g., "Light a new one up" |

**Interpolation helpers (`winnerSubhead`, `nonWinnerSubhead`, `waitingForHost`):**

| Helper | Current NSFW | Score |
|--------|--------------|-------|
| `winnerSubhead(name)` | "${name} called Bullshit." | Keep |
| `nonWinnerSubhead(name)` | "${name} called it before you." | Keep |
| `waitingForHost(hostName)` | "Waiting for ${hostName} to pull the trigger…" | Sharpen per D-09 |

**Caveat:** Specific rewrites are Claude's discretion per CONTEXT. This table exists so the planner has a starting scorecard. The planner is free to disagree and keep/cut differently — the deliverable is *a justified pass*, not adherence to this exact table.

### Anti-Patterns to Avoid

- **Hardcoding colors in logo SVGs.** All icon fills/strokes must use `var(--color-*)` tokens or `currentColor`. Hex codes break the theme swap (lesson from Phase 6 Pitfall 2 [CITED: `.planning/phases/06-ui-overhaul/06-RESEARCH.md`]).
- **JS dynamic favicon swap.** Declined in CONTEXT deferred. Attempting this re-opens the shared-screen betrayal risk.
- **Mounting two `<Logo>` components simultaneously.** The hero logo on home page and the compact header logo should NOT both render on `/`. Either the home page suppresses the header logo, or the header logo has a `$page.route.id === '/'` guard. Discretionary choice — ensure only one is visible at a time.
- **Adding `pointer-events: auto` to `.dauber-wrap` or its `::after`.** Breaks click-through to the underlying button (CONTEXT D-12).
- **Per-key branching in copy callers.** Don't scatter `theme.current === 'nsfw' ? ... : ...` inline in components for rewritten strings. Route them through `copy.ts`. Phase 6's grep audit (SC-3) established this contract and Phase 6 Plan 04 enforced it.
- **Writing the favicon outside `static/`.** Putting the SVG in `src/lib/` or inlining it in `app.html` bypasses Cloudflare's Assets binding and breaks the cache path. Must live in `static/favicon.svg`.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Theme-reactive wordmark text | Inline ternaries in `Logo.svelte` or consuming routes | `copy.brand` proxy (already exists) | Phase 6 established `copy.ts` as single source of truth; duplicating the SFW/NSFW split here breaks the grep audit (SC-3). |
| Logo SVG icon hot-reload per theme | JS-driven `<img src={theme === 'nsfw' ? nsfw.svg : sfw.svg}>` | Inline SVG inside `Logo.svelte` under `{#if}` branches | Inline SVG colors inherit from CSS custom properties for free; no asset fetch latency on theme flip; Svelte's compiler already handles the if/else efficiently. |
| Static-asset cache-busting for favicon | Query strings like `?v=2` | Let SvelteKit/Cloudflare's Assets binding handle it | Overwriting `static/favicon.svg` is sufficient; browsers honor `Cache-Control` headers set by Cloudflare Assets. |
| Dauber bleed ring animation | JS requestAnimationFrame loop | CSS `@keyframes` + `::after` | CSS is GPU-composited, respects `prefers-reduced-motion` natively, zero runtime cost. |
| NSFW copy tone policing | ChatGPT/LLM call at runtime | Static strings in `copy.ts` | All strings are static literals; no runtime generation. Tone is the author's job during this phase. |
| Favicon across multiple sizes | `favicon-16.png`, `favicon-32.png`, `favicon-180.png`, `apple-touch-icon.png`, `android-chrome-192.png`, etc. | Single SVG favicon | Modern browsers scale SVG losslessly. Multi-size PNG bundle is PWA/manifest territory (deferred per CONTEXT). |

**Key insight:** This phase is 100% "glue small standard tools together" — no custom primitives, no clever infrastructure. The recurring pitfall is to over-engineer (dynamic favicons, animation libraries, LLM copy generation) when the locked decisions already prescribe simple static answers.

## Common Pitfalls

### Pitfall 1: Missing `static/` directory breaks favicon ship

**What goes wrong:** The project has no `static/` directory at root (verified — `ls static/` returns "No such file or directory"). If a task writes `static/favicon.svg` without first creating the directory, the file may land elsewhere or the write fails silently in some shells.

**Why it happens:** SvelteKit expects `static/` by convention but does not require it — the framework starts fine without one. The 404 on `favicon.png` is not a SvelteKit error; it's a browser failing to fetch a non-existent static asset.

**How to avoid:** First task step must verify and create the directory if absent. `mkdir -p static/` is idempotent and safe.

**Warning signs:** Browser DevTools Network tab shows 404 on `/favicon.svg` after shipping; browser console shows `Failed to load resource: the server responded with a status of 404 (Not Found) @ http://localhost:8787/favicon.svg`.

### Pitfall 2: SvelteKit `%sveltekit.assets%` prefix confusion

**What goes wrong:** Current `app.html` uses `href="%sveltekit.assets%/favicon.png"`. The `%sveltekit.assets%` placeholder gets replaced at build time with the asset path prefix. For root-served static files in a standard Cloudflare adapter setup, this resolves to an empty string — so `%sveltekit.assets%/favicon.svg` and `/favicon.svg` are equivalent in this project.

**Why it happens:** The placeholder exists to support custom `paths.assets` config for CDN-hosted static assets. When unused (as here), it's cosmetic overhead and mildly confusing.

**How to avoid:** Either keep the prefix (safe, idiomatic SvelteKit) or drop it (simpler). Both work. Recommended: keep the prefix for consistency with SvelteKit docs. Resulting line: `<link rel="icon" href="%sveltekit.assets%/favicon.svg" type="image/svg+xml" />`.

**Warning signs:** If `%sveltekit.assets%` leaks literally into the rendered HTML, there's a build-chain bug unrelated to Phase 7.

### Pitfall 3: Dauber animation breaks click-through

**What goes wrong:** If any layer in the dauber stack (outer wrap span, inner SVG, `::after` pseudo) loses `pointer-events: none`, the cell becomes unclickable for unmarking. The button visually animates but clicks are swallowed by the overlay.

**Why it happens:** `pointer-events: none` does not inherit by default for descendants — only `pointer-events: auto` on a descendant overrides the parent's `none`. But the CSS in D-15 doesn't specify `pointer-events` on `::after`, which means the pseudo-element inherits from `.dauber-wrap` — which means IF `.dauber-wrap` is `none`, the `::after` is also non-interactive. This is correct behavior. The pitfall is accidentally removing `pointer-events-none` from the wrapper span's class list during the refactor.

**How to avoid:** Keep `pointer-events-none` explicitly on `.dauber-wrap` (Tailwind utility) AND confirm there is no CSS rule anywhere setting `.dauber-wrap::after { pointer-events: auto; }`. Phase 6 Plan 03 established this contract — re-verify it holds.

**Warning signs:** Unit/e2e test for marking/unmarking a cell passes on SFW but fails or hangs on NSFW (because the second tap doesn't unmark). The existing `BoardCell.test.ts` covers the click-to-toggle behavior — run this test suite on the NSFW path after the change.

### Pitfall 4: Dauber animation runs on re-render, not just on mark

**What goes wrong:** Moving from `dauberStampIn 120ms ease-out` (current, runs once on element creation) to `dauberStampIn 180ms cubic-bezier forwards` + `dauberBleed 400ms 60ms ease-out forwards` is fine — but if the `<span class="dauber-wrap">` re-renders (Svelte component update, not just entering the DOM), the animation could replay unexpectedly and show the bleed ring on every mark-count broadcast.

**Why it happens:** Svelte re-renders components when reactive state changes. `BoardCell` re-renders when `marked` changes, which is fine (exactly when we want animation). But if parent renders cause children to re-mount (via `{#key}` or array-reshuffling), the animation replays.

**How to avoid:** Confirm `BoardCell.svelte` is not wrapped in `{#key}` on a volatile value. The existing render path uses a stable `cell.text` identity — good. Do not change the parent Board.svelte iteration during this phase.

**Warning signs:** Visual test — marking one cell, then waiting 5 seconds, should NOT replay the bleed ring. If it does, there's an incidental re-render happening.

### Pitfall 5: `prefers-reduced-motion` guard regression

**What goes wrong:** The current `app.css` has `@media (prefers-reduced-motion: reduce) { .dauber-stamp { animation: none; } }`. If the new bleed ring's keyframe is added without a matching `prefers-reduced-motion` override, users with reduce-motion preferences still see the ring.

**Why it happens:** Easy to miss when writing new keyframes. D-15 includes the override but only someone reading D-15 carefully will apply it.

**How to avoid:** D-15 locked CSS includes `@media (prefers-reduced-motion: reduce) { .dauber-wrap::after { animation: none; } }`. Copy the block verbatim. E2E can set `reducedMotion: 'reduce'` on Playwright context and assert the dauber opacity transition is instant.

**Warning signs:** Manual QA with macOS/iOS "Reduce motion" accessibility setting enabled — the bleed ring should NOT expand.

### Pitfall 6: Favicon baked into OS/browser cache

**What goes wrong:** Even after fixing `app.html` to point to `favicon.svg` and adding the file, users who have visited the broken `favicon.png` URL may see the default browser favicon cached for days. Particularly acute on mobile where favicon caching is aggressive.

**Why it happens:** Browsers cache favicons aggressively because they're rarely changed. A 404'd favicon path may be "negatively cached" by some browsers.

**How to avoid:** Accept that this is a first-load-fresh-user phenomenon and not worth fighting. Hard-refresh (Ctrl+Shift+R) clears it for local dev. No production action needed — the fix takes effect on next uncached visit.

**Warning signs:** Developer sees "no favicon changed" after deploy. Verify by (a) checking `curl -I https://.../favicon.svg` returns 200 with `Content-Type: image/svg+xml`, (b) test in incognito/private window.

### Pitfall 7: Logo icon SVG doesn't read at 32px

**What goes wrong:** A detailed grid/checkmark icon that looks beautiful at 200px hero size becomes an unreadable blob at 32px compact header size.

**Why it happens:** SVG paths tuned for one size don't always downscale — sub-pixel stroke widths disappear, fine detail vanishes.

**How to avoid:** Test the icon at BOTH target sizes (compact header ≈ 20px, hero ≈ 40px) during development. Use a viewBox of 0 0 24 24 (standard icon grid) and keep stroke widths ≥2 units. Prefer a bold, chunky mark that reads like a pictogram.

**Warning signs:** Side-by-side visual at 20px and 40px — the 20px should still be identifiable as "bingo card" or "checkmark."

### Pitfall 8: Persistent header logo eats home-page real estate

**What goes wrong:** If `+layout.svelte` renders `<Logo size="compact" />` unconditionally, the home page shows TWO logos — the hero one on the page plus the compact one in the layout. Visually cluttered.

**Why it happens:** Layout components wrap all routes by default.

**How to avoid:** Two options:
1. **Route-level guard in layout:** `{#if $page.route.id !== '/'} <Logo size="compact" /> {/if}` — simple but couples the layout to a specific route.
2. **Per-route injection:** Don't put Logo in layout at all. Each non-home route renders its own compact logo. More code, less coupling.

Recommended: route-level guard. Home page is the only exception and this reads clearly.

**Warning signs:** Two logos visible simultaneously on home page during local dev.

## Runtime State Inventory

**Trigger:** This phase has a string rewrite (NSFW copy) that could count as a rename-adjacent concern. Performing the inventory for completeness.

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| Stored data | None — copy strings are static literals in `src/lib/copy.ts`, never persisted to SQLite (GameRoom DO), localStorage, or sessionStorage. | None |
| Live service config | None — no external service references the NSFW copy strings. No Cloudflare Workers environment variables, no Datadog dashboards, no webhook payloads. | None |
| OS-registered state | None — browser-only project with no OS task registration. | None |
| Secrets and env vars | None — copy strings are not secrets and no env var references them. | None |
| Build artifacts / installed packages | `.svelte-kit/` and `.wrangler/` cache directories may have stale bundled copies of the old NSFW strings. These auto-regenerate on next `pnpm build`. No explicit clean step needed. | None — normal build cycle regenerates |

**Canonical question:** After every file in the repo is updated, what runtime systems still have the old strings cached, stored, or registered? **Answer: none.** All copy is static, client-loaded, and theme-switched at runtime from the in-memory `STRINGS` object. The favicon is the only runtime-cached asset; browser cache self-heals on next visit.

## Environment Availability

This phase is pure code/asset changes. No new external tools, CLIs, or services required.

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Build pipeline | ✓ (assumed, since project builds today) | package.json type=module | — |
| pnpm | Package manager | ✓ (project uses pnpm 10.33.0 per package.json) | 10.33.0 | — |
| SvelteKit 2 | Framework | ✓ (already installed) | 2.57.1 | — |
| Svelte 5 | UI | ✓ (already installed) | 5.55.4 | — |
| Tailwind CSS 4 | Styling | ✓ (already installed) | 4.2.2 | — |
| Wrangler | Dev/deploy | ✓ (already installed) | 4.83.0 | — |
| Playwright | E2E | ✓ (already installed) | 1.49.0+ | — |
| Vitest | Unit | ✓ (already installed) | 2.1.0+ | — |

**No new dependencies needed.** All four Phase 7 deliverables use the existing stack.

## Standard Stack

### Core (already installed — no additions)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Svelte | 5.55.4 | UI with runes | `$derived(theme.current === 'nsfw')` in Logo.svelte is the established reactivity pattern [VERIFIED: BoardCell.svelte, ThemeToggle.svelte]. |
| SvelteKit | 2.57.1 | Routing + static asset serving | `static/` convention serves favicon at root. [CITED: svelte.dev/docs/kit/project-structure] |
| Tailwind CSS | 4.2.2 | Utility-first styling | `pointer-events-none`, `motion-reduce:*`, `inset-0` utilities already in use. [VERIFIED: BoardCell.svelte] |
| @sveltejs/adapter-cloudflare | 7.2.8 | Build output | No Phase 7 impact. Static assets served via Cloudflare Assets binding. |

### Supporting (already installed)

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| lucide-svelte | 1.0.1 | Icon library | Used for ThemeToggle briefcase icon. NOT used for Phase 7 logo — custom SVG fits brand better. |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Inline SVG in Logo.svelte | `<img src="/logo-sfw.svg">` with two separate static files | Static files don't auto-inherit `var(--color-*)` tokens — would need `fill="currentColor"` + a wrapper with `color: var(--color-accent)`. Inline is simpler. |
| SVG favicon | Multi-size PNG bundle | PNG bundle is PWA territory (out of scope per CONTEXT deferred). Modern browsers handle SVG favicons universally in 2026. |
| CSS `@keyframes` animation | Motion One / GSAP / animejs | D-15 locks pure CSS. Adding a library for one 400ms animation is overkill. |
| Copy-as-const-object (current) | JSON file + runtime load | Current pattern is simpler and already proven by Phase 6. Do not introduce async loading. |

**Installation:** No new installs required.

**Version verification (checked against current codebase):**
- Svelte 5.55.4 [VERIFIED: package.json]
- SvelteKit 2.57.1 [VERIFIED: package.json]
- Tailwind 4.2.2 [VERIFIED: package.json]

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Multiple PNG favicon sizes + `apple-touch-icon` | Single SVG favicon | Safari 15.4 (March 2022) — last holdout browser [CITED: caniuse link-icon-svg] | No PNG fallback needed for this project's target in 2026 |
| Logo as rendered HTML text (`<h1>Brand</h1>`) | Logo as SVG icon + wordmark in a component | N/A — this IS the current change | Enables visual identity mark, unlocks NSFW dauber-splat icon per D-01 |
| Single-phase CSS animation on marker | Two-phase impact + bleed ring via `::after` | N/A — this IS the current change | Tactile "ink spread on paper" feel; locked in D-10 |
| Inline ternaries for copy strings | Central `copy.ts` proxy | Phase 6 Plan 01 | Already done; Phase 7 edits string values only |

**Deprecated/outdated:**

- Multi-file PNG favicon bundles for non-PWA apps — unnecessary since Safari 15.4.
- `prefers-reduced-motion` without a fallback value — correct pattern is to collapse animations to their end state (opacity 0.72 for dauber), not remove the visual entirely.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Modern browser SVG favicon support is universal enough in 2026 to skip PNG fallback | Pattern 2, State of the Art | Low — tested browsers (Chrome, Safari, Firefox, Edge) all support SVG favicons since 2022. Edge case: some older internal-corporate browsers on managed laptops. Fallback is trivial (add `<link rel="alternate icon" type="image/png" href="/favicon.png">` and a 32×32 PNG). |
| A2 | `%sveltekit.assets%/` prefix resolves to empty string for root-served static assets in the Cloudflare adapter setup | Pitfall 2 | Low — this is the documented SvelteKit behavior [CITED: svelte.dev/docs/kit]. If wrong, favicon loads from a hashed path that still works. |
| A3 | Rewriting copy strings does not require running a grep audit the way Phase 6 Plan 04 did | Implicit | Low — Phase 6's audit was about routing inline ternaries through `copy.ts`. Phase 7 only edits values inside `copy.ts`. Grep audit would return the same zero-violation result. |
| A4 | The existing `BoardCell.test.ts` already exercises click-to-toggle on an NSFW marked cell (i.e., the regression surface for Pitfall 3 is covered) | Validation Architecture | Medium — needs planner to verify by reading the test file. If uncovered, add a test. |
| A5 | Logo component on home page + layout header does NOT need SSR-specific handling beyond the existing `+layout.ts` `ssr=false` | Pattern 1 | Low — Phase 6 established `ssr=false` for the layout, so all client-only Svelte 5 reactivity works. Logo reads `theme.current` which is initialized client-side. |

**User confirmation needed before execution:** None. All assumptions are low-to-medium risk and verifiable during the execute-phase step via unit tests or quick manual check. If the planner disagrees with A1 (SVG-only favicon), the fix is trivially additive.

## Open Questions

1. **Favicon geometry: grid vs. checkmark**
   - What we know: D-04 says "bingo grid or abstract checkmark" — both are acceptable.
   - What's unclear: Which reads more distinctively at 16px and is more ownable as a brand mark?
   - Recommendation: Planner picks grid (3×3 with one cell filled yellow) — more unique as a brand mark; a checkmark is visually generic and competes with task-app favicons.

2. **Persistent header logo: in `+layout.svelte` with route guard, or per-route injection?**
   - What we know: CONTEXT leaves this to Claude's discretion.
   - What's unclear: Route guard in layout couples logic to route ID; per-route adds three injections (lobby, board, end, error).
   - Recommendation: Layout with route guard on home page only. Single place to change logo-header decisions in the future.

3. **Should `Logo size="hero"` on home page INCLUDE the trailing accent dot (`.`) currently on `<h1>Buzzword Bingo<span class="text-accent">.</span></h1>`?**
   - What we know: Phase 6 chose the accent dot as a visual flourish.
   - What's unclear: Does the new Logo component subsume the dot, or keep it as a sibling?
   - Recommendation: Include the dot inside Logo.svelte hero variant to preserve visual continuity. Dot is absent in compact variant.

4. **Exact tuning of dauber animation timing (180ms vs. 200ms, etc.) — per CONTEXT D-15 comment.**
   - What we know: CONTEXT explicitly says "planner should tune timing per visual QA."
   - What's unclear: Whether the 180ms / 400ms / 60ms values feel right in the running app.
   - Recommendation: Ship D-15 values as-is, flag for human verification in phase execution, adjust if reviewer flags it.

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Unit framework | Vitest 2.1.0 (with jsdom, @testing-library/svelte) |
| E2E framework | Playwright 1.49.0 |
| Config files | `vitest.config.ts`, `playwright.config.ts` |
| Quick run command | `pnpm test:unit` |
| Full suite command | `pnpm test` (runs unit + e2e) |
| Type check | `pnpm check` |
| Build check | `pnpm build` |

### Phase Deliverable → Test Map

| Deliverable | Behavior | Test Type | Automated Command | File Exists? |
|-------------|----------|-----------|-------------------|-------------|
| Favicon | `/favicon.svg` returns 200 | e2e | `pnpm test:e2e e2e/favicon.spec.ts` | ❌ Wave 0 — new spec |
| Favicon | `app.html` link tag has correct href+type | unit (DOM snapshot) or e2e | include in favicon.spec.ts | ❌ Wave 0 |
| Logo component | Renders SFW variant when theme.current === 'sfw' | unit | `pnpm test:unit tests/unit/Logo.test.ts` | ❌ Wave 0 — new unit test |
| Logo component | Renders NSFW variant when theme.current === 'nsfw' | unit | same | ❌ Wave 0 |
| Logo component | hero size used on home, compact used elsewhere | e2e | `pnpm test:e2e e2e/logo-placement.spec.ts` | ❌ Wave 0 — new spec |
| Logo component | No duplicate logo on home page (hero only, not hero + compact) | e2e | in logo-placement.spec.ts | ❌ Wave 0 |
| NSFW copy rewrite | Updated strings return expected values | unit | `pnpm test:unit tests/unit/copy.test.ts` | ✅ Update existing |
| NSFW copy rewrite | No inline copy regression (grep audit) | manual / grep | `grep -r "Bullshit Bingo\|Buzzword Bingo" src/ --include="*.svelte" --exclude=copy.ts` should return only Logo.svelte | ✅ (rerun Phase 6 audit pattern) |
| Dauber animation | Marking a cell in NSFW adds `.dauber-wrap` to DOM | unit (testing-library) | `pnpm test:unit tests/unit/BoardCell.test.ts` | ✅ Update existing |
| Dauber animation | Clicking a marked cell still unmarks (pointer-events not broken) | unit + e2e | BoardCell.test.ts + board-mark.spec.ts | ✅ Update existing |
| Dauber animation | `prefers-reduced-motion: reduce` disables ring animation | e2e | `pnpm test:e2e e2e/reduced-motion.spec.ts` with Playwright `reducedMotion: 'reduce'` context | ❌ Wave 0 — new spec |
| Dauber animation | No SFW regression on dauber (SFW does not render dauber markup at all) | unit | BoardCell.test.ts assertion | ✅ Update existing |

### Sampling Rate

- **Per task commit:** `pnpm test:unit` (under 10 seconds — covers Logo, copy, BoardCell unit tests)
- **Per wave merge:** `pnpm check && pnpm test:unit` (adds type check)
- **Phase gate:** `pnpm test` (full unit + e2e) + manual UAT checklist below

### Wave 0 Gaps

- [ ] `tests/unit/Logo.test.ts` — new unit test for Logo component (SFW/NSFW variant switching, hero vs compact sizing)
- [ ] `e2e/favicon.spec.ts` — new Playwright spec asserting `/favicon.svg` returns 200 and `app.html` link tag is correctly wired
- [ ] `e2e/logo-placement.spec.ts` — new Playwright spec asserting hero logo on home, compact logo on lobby/board/end, no duplicate on home
- [ ] `e2e/reduced-motion.spec.ts` — new Playwright spec with `reducedMotion: 'reduce'` context verifying dauber animation is disabled
- [ ] `static/` directory creation — precondition for favicon.svg write
- [ ] Update `tests/unit/copy.test.ts` assertions for rewritten NSFW strings (specific edits depend on final copy choices)
- [ ] Update `tests/unit/BoardCell.test.ts` to assert `.dauber-wrap` class on marked NSFW cell

### Manual UAT Checklist

Deliverables that cannot be fully automated:

- [ ] Logo visual quality at 20px (compact) and 40px (hero) — both SFW and NSFW variants readable
- [ ] Dauber bleed ring animation "feels like ink" subjectively — not too fast (<150ms total) or too slow (>800ms total)
- [ ] Favicon visible in browser tab for at least Chrome, Safari, Firefox — no broken-image indicator
- [ ] NSFW copy overall tone — jaded-office-worker voice, not shock-value or protected-class references
- [ ] No duplicate logos visible anywhere
- [ ] Theme flip mid-game — logo swaps correctly without flash of wrong variant

## Security Domain

Phase 7 is pure frontend polish with no auth, data, or input surfaces. Applicable ASVS categories:

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | — (zero-signup, no auth in scope) |
| V3 Session Management | no | — (session handling unchanged) |
| V4 Access Control | no | — (no access control surface changed) |
| V5 Input Validation | no | — (no new user input surfaces) |
| V6 Cryptography | no | — (no crypto surface) |

**One security-adjacent consideration — NSFW content on shared screens:**

The "shared screen cover story" is part of this project's core UX contract: a user showing the app during a meeting must not inadvertently reveal the NSFW mode. Phase 7 reinforces this by (a) choosing a neutral favicon (D-04) and (b) making the Professional Mode toggle the visible "state" (Phase 6 D-05). The risk is not a security vulnerability per se but a UX betrayal. Mitigation:

- Favicon MUST be neutral — no dauber splat, no "Bullshit" text.
- Browser tab title already flips correctly via `document.title = copy.brand` in `+layout.svelte` — nothing to change here, but planner should confirm this still works after logo swap (should not regress).
- Any OG image / social card asset could be NSFW-revealing but is explicitly deferred.

### Known Threat Patterns for Frontend Polish

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| User renders unvetted SVG from untrusted source | Spoofing / injection | N/A — all SVGs in Phase 7 are authored in-repo, no user-generated SVG surface |
| Cache poisoning of favicon | Tampering | Mitigated by Cloudflare Assets binding's integrity controls; no Phase 7 action needed |

## Code Examples

### Example 1: Favicon SVG (reference — exact path geometry is Claude's discretion)

```svg
<!-- static/favicon.svg — neutral grid mark -->
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="32" height="32">
  <!-- Grid of 3×3 cells, one cell highlighted. Neutral yellow accent (SFW palette). -->
  <rect x="2"  y="2"  width="8" height="8" rx="1.5" fill="#F5D547" />
  <rect x="12" y="2"  width="8" height="8" rx="1.5" fill="none" stroke="#F5D547" stroke-width="1.5" />
  <rect x="22" y="2"  width="8" height="8" rx="1.5" fill="none" stroke="#F5D547" stroke-width="1.5" />
  <rect x="2"  y="12" width="8" height="8" rx="1.5" fill="none" stroke="#F5D547" stroke-width="1.5" />
  <rect x="12" y="12" width="8" height="8" rx="1.5" fill="none" stroke="#F5D547" stroke-width="1.5" />
  <rect x="22" y="12" width="8" height="8" rx="1.5" fill="none" stroke="#F5D547" stroke-width="1.5" />
  <rect x="2"  y="22" width="8" height="8" rx="1.5" fill="none" stroke="#F5D547" stroke-width="1.5" />
  <rect x="12" y="22" width="8" height="8" rx="1.5" fill="none" stroke="#F5D547" stroke-width="1.5" />
  <rect x="22" y="22" width="8" height="8" rx="1.5" fill="none" stroke="#F5D547" stroke-width="1.5" />
</svg>
```

**Note on color:** Favicon must use a hardcoded color (not `var(--color-*)`) because it's served statically with no stylesheet context. Choose a neutral accent that reads on both light and dark browser tab backgrounds — the SFW yellow `#F5D547` is visible on both and does not signal NSFW state.

[Source: SvelteKit static asset convention, locked decision D-04]

### Example 2: Logo component — structural pattern

```svelte
<!-- src/lib/components/Logo.svelte — structural reference -->
<script lang="ts">
  import { theme } from "$lib/stores/theme.svelte";
  import { copy } from "$lib/copy";

  type Size = "hero" | "compact";
  let { size = "compact" }: { size?: Size } = $props();

  const isNsfw = $derived(theme.current === "nsfw");
</script>

{#if size === "hero"}
  <header class="text-center flex items-center justify-center gap-3">
    {#if isNsfw}
      <!-- NSFW dauber splat icon — larger, irregular circle -->
      <svg viewBox="0 0 100 100" class="w-14 h-14" aria-hidden="true">
        <path d="M 50,8 C 68,6 92,22 92,50 C 92,72 74,94 50,92 C 28,94 8,72 8,50 C 8,26 32,10 50,8 Z"
              fill="var(--color-accent)" opacity="0.85" />
      </svg>
    {:else}
      <!-- SFW grid icon -->
      <svg viewBox="0 0 32 32" class="w-14 h-14" aria-hidden="true">
        <!-- 3x3 grid, one filled cell -->
        <rect x="2"  y="2"  width="8" height="8" rx="1.5" fill="var(--color-accent)" />
        <!-- ... remaining 8 outlined cells ... -->
      </svg>
    {/if}
    <h1 class="font-display text-[40px] sm:text-[56px] font-semibold leading-[1.1]">
      {copy.brand}<span class="text-[var(--color-accent)]">.</span>
    </h1>
  </header>
{:else}
  <!-- compact -->
  <a href="/" class="inline-flex items-center gap-2 text-base font-display font-semibold" aria-label={copy.brand}>
    {#if isNsfw}
      <svg viewBox="0 0 100 100" class="w-5 h-5" aria-hidden="true">
        <path d="M 50,8 C 68,6 92,22 92,50 C 92,72 74,94 50,92 C 28,94 8,72 8,50 C 8,26 32,10 50,8 Z"
              fill="var(--color-accent)" opacity="0.85" />
      </svg>
    {:else}
      <svg viewBox="0 0 32 32" class="w-5 h-5" aria-hidden="true">
        <rect x="2"  y="2"  width="8" height="8" rx="1.5" fill="var(--color-accent)" />
      </svg>
    {/if}
    <span>{copy.brand}</span>
  </a>
{/if}
```

**Key constraints:**
- Icon `fill` uses `var(--color-accent)` — swaps to burnt orange under `[data-theme="nsfw"]` automatically.
- Wordmark text comes from `copy.brand` — theme-reactive via proxy.
- Compact variant is an anchor linking to `/` for UX affordance.
- Both variants use `font-display` (Space Grotesk) consistent with existing home page h1.

### Example 3: BoardCell dauber upgrade — markup change

```svelte
<!-- src/lib/components/BoardCell.svelte — NSFW marked branch only -->
{#if marked && theme.current === "nsfw"}
  <!-- BEFORE (Phase 6):
  <span class="absolute inset-0 flex items-center justify-center pointer-events-none dauber-stamp motion-reduce:animate-none" aria-hidden="true">
    <svg ...><path ... /></svg>
  </span>
  -->
  <!-- AFTER (Phase 7): wrap the svg+stamp inside a dauber-wrap span -->
  <span
    class="absolute inset-0 pointer-events-none dauber-wrap motion-reduce:animate-none"
    aria-hidden="true"
  >
    <span class="absolute inset-0 flex items-center justify-center">
      <svg viewBox="0 0 100 100" class="w-[85%] h-[85%] dauber-stamp" preserveAspectRatio="xMidYMid meet">
        <path
          d="M 50,8 C 68,6 92,22 92,50 C 92,72 74,94 50,92 C 28,94 8,72 8,50 C 8,26 32,10 50,8 Z"
          fill="var(--color-accent)"
          opacity="0.72"
        />
      </svg>
    </span>
  </span>
{/if}
```

**What changed:**
- Outer wrapper span now has class `dauber-wrap` (receives `::after` bleed ring).
- Inner span receives the flex-center layout (previously on the outer).
- `dauber-stamp` class moves to the SVG element directly (animation target).
- `pointer-events-none` is on the outer `.dauber-wrap` — inherited by `::after`.

### Example 4: app.css updated keyframes (from D-15, verbatim)

```css
/* src/app.css — replace existing dauberStampIn block with this */

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

[Source: CONTEXT D-15 verbatim — user-locked contract]

### Example 5: app.html favicon fix

```html
<!-- src/app.html — BEFORE -->
<link rel="icon" href="%sveltekit.assets%/favicon.png" />

<!-- src/app.html — AFTER -->
<link rel="icon" href="%sveltekit.assets%/favicon.svg" type="image/svg+xml" />
```

[Source: SvelteKit static-asset convention + caniuse SVG favicon support]

## Sources

### Primary (HIGH confidence)

- **SvelteKit project structure docs** — `https://svelte.dev/docs/kit/project-structure` [CITED: verified via WebFetch; confirms `static/` is the conventional directory for unmodified static assets like favicons]
- **Svelte 5 runes docs** — `https://svelte.dev/docs/svelte/$state`, `https://svelte.dev/docs/svelte/$derived` [CITED via training + verified against existing BoardCell.svelte/ThemeToggle.svelte patterns]
- **CONTEXT.md D-01 through D-15** — locked user decisions [VERIFIED: read in this session]
- **Phase 6 CONTEXT.md** — dauber stamp design intent, palette tokens, B-U-L-L-S board identity [VERIFIED: read in this session]
- **Existing codebase files** — `BoardCell.svelte`, `app.css`, `app.html`, `copy.ts`, `Logo placement sites`, `theme.svelte.ts`, `ThemeToggle.svelte`, `+layout.svelte`, `+page.svelte`, `tests/unit/copy.test.ts`, `e2e/theme-toggle.spec.ts`, `package.json`, `wrangler.jsonc`, `svelte.config.js`, `scripts/patch-worker.mjs` [VERIFIED: read in this session]

### Secondary (MEDIUM confidence)

- **caniuse — SVG favicon support** — general knowledge of browser support landscape; Safari 15.4 added support in March 2022 [ASSUMED: general browser support knowledge, not reverified in this session]
- **MDN — `pointer-events` inheritance behavior** — general CSS knowledge [ASSUMED]
- **MDN — `prefers-reduced-motion` best practices** — general accessibility knowledge [ASSUMED]

### Tertiary (LOW confidence)

None — no unverified WebSearch findings in this research.

## Metadata

**Confidence breakdown:**

- **Standard stack:** HIGH — all dependencies are already installed and verified in package.json; no new libraries.
- **Architecture:** HIGH — follows established Phase 6 patterns (theme-reactive components, copy.ts, CSS custom properties); Logo.svelte is a straightforward new component.
- **Pitfalls:** HIGH for known paths (pointer-events, prefers-reduced-motion — both regressions Phase 6 already demonstrated care for); MEDIUM for favicon caching (could be flakier on obscure browsers, mitigated by accepting first-load-fresh fix).
- **Validation architecture:** HIGH — Vitest + Playwright already wired; four new test files to add (Logo, favicon, logo-placement, reduced-motion), three existing to update (copy.test.ts, BoardCell.test.ts, theme-toggle.spec.ts).

**Research date:** 2026-04-18

**Valid until:** 2026-05-18 (30 days — browser favicon support and CSS animation patterns are stable; only likely invalidation is Svelte 5 rune API changes, which are also stable post-GA).
