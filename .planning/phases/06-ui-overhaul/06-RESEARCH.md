# Phase 6: UI Overhaul - Research

**Researched:** 2026-04-18
**Domain:** Dual-mode theming (SFW/NSFW) via Tailwind v4 CSS custom-property overrides + Svelte 5 runes-backed theme store with localStorage persistence
**Confidence:** HIGH

## Summary

Phase 6 is a pure visual/copy overhaul of an already-shipped 15-component app. No new gameplay. No backend changes. The entire feature reduces to three mechanical concerns:

1. **Theme switching** — flip a `data-theme` attribute on `<html>`, let CSS custom-property overrides do the rest. Tailwind v4 picks up the overridden `var(--color-*)` values automatically in every existing utility class. The project's components already read colors exclusively via `var(--color-*)` (verified across every component file), so zero component markup needs to change for the SFW path.
2. **Copy routing** — every user-facing string moves from inline JSX to a `copy.ts` module keyed by the theme store. Components read `copy.key` directly. Swapping themes swaps copy reactively via Svelte 5 runes.
3. **Two new files only** — `ThemeToggle.svelte` (persistent footer/fixed pill) and `BoardHeader.svelte` (the B·U·L·L·S row, rendered in NSFW mode only). Plus two modules: `theme.svelte.ts` (store) and `copy.ts` (copy map).

The risky parts are not the theme swap (trivial) — they are: (a) a complete copy audit that catches every hardcoded string in 15 components + 4 routes, (b) the dauber-stamp visual not being ugly or causing layout shift on mobile, and (c) the `data-theme` attribute being applied before first paint to avoid a flash of the wrong theme (FOUT-equivalent). SvelteKit SSR ships with a default-theme pre-render; the store must initialize from `localStorage` on the client and apply the attribute synchronously during layout load.

**Primary recommendation:** Implement in three sequential waves — (1) theme store + `@theme` tokens + layout wiring + `ThemeToggle`; (2) copy module + exhaustive component copy extraction; (3) NSFW-only visuals (BoardHeader, dauber stamp, crosshatch texture, confetti palette). Each wave is independently verifiable and doesn't touch gameplay.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Theme token resolution | Browser (CSS engine) | — | CSS custom-property cascade is the native mechanism; no JS involvement needed per-paint |
| Theme state (current mode) | Browser (client) | — | Per-device preference per D-02; server is theme-agnostic per CONTEXT D-02 |
| Theme persistence | Browser (`localStorage`) | — | No server storage — anonymous, client-owned, ephemeral |
| Theme attribute application | Frontend Server (SvelteKit `+layout.svelte`) + Browser | — | Server renders with default `sfw`; client hydrates and may flip to `nsfw` from `localStorage` |
| Copy string lookup | Browser (client module) | — | `copy.ts` is imported into every component; runs in SSR (defaults to SFW) and client (reactive to store) |
| Dauber stamp rendering | Browser (CSS + inline SVG) | — | Pure presentation; no server involvement |
| Confetti palette | Browser | — | Existing `canvas-confetti` dynamic import in `room.svelte.ts` |
| WebSocket protocol | API / Backend | — | **Untouched** — gameplay state is theme-agnostic per D-02 |
| Game room state | API / Backend (Durable Object) | — | **Untouched** |

**Why this matters for Phase 6:** Every capability lives in the browser tier. There are zero tasks that should touch `server/`, `protocol/messages.ts`, or the Durable Object. If a plan ever proposes a backend change in Phase 6, it is out of scope.

## User Constraints (from CONTEXT.md)

### Locked Decisions

**Theme Architecture**
- **D-01:** Two named modes — `sfw` ("Buzzword Bingo", current dark palette) and `nsfw` ("Bullshit Bingo", warm parchment/orange palette). Modes differ in color tokens, the board visual, and copy strings. Game state, WebSocket protocol, and all logic are untouched.
- **D-02:** Per-device toggle, stored in `localStorage`. Each player independently chooses their mode. The game is not aware of any player's mode — only the UI layer cares. No server changes.
- **D-03:** SFW is the default. NSFW requires deliberate opt-in. On first visit, `localStorage` has no entry → defaults to `sfw`.

**Toggle UX**
- **D-04:** Toggle is accessible on ALL screens (home, lobby, board, end) — not just the home page. A player must be able to panic-toggle mid-meeting without navigating away. Placement: persistent in the page footer or a fixed corner element.
- **D-05:** Toggle framing: **"Professional Mode"** with a 💼 icon. Toggle ON = SFW/Buzzword Bingo (the labeled state). Toggle OFF = NSFW/Bullshit Bingo.

**SFW Mode ("Buzzword Bingo")**
- **D-06:** Current dark palette unchanged. No visual overhaul for SFW mode.
- **D-07:** Title rebranded from "Bullshit Bingo" → "Buzzword Bingo" throughout (page title, wordmark, tab title). All other copy stays as-is in SFW mode.

**NSFW Mode ("Bullshit Bingo") — Visual Palette**
- **D-08:** Warm parchment palette via `[data-theme="nsfw"]` on `<html>`:
  - `--color-bg`: `#F5EDD6` (warm parchment)
  - `--color-surface`: `#E8D9B0` (manila tan)
  - `--color-divider`: `#C9A96B` (warm gold)
  - `--color-accent`: `#D4520A` (burnt orange)
  - `--color-destructive`: `#C0392B` (deep red)
  - `--color-ink-primary`: `#2C1810` (dark espresso brown)
  - `--color-ink-secondary`: `#7A4F2A` (mid brown)
  - `--color-ink-disabled`: `#B8956A` (light tan)
  - `--color-ink-inverse`: `#F5EDD6` (parchment — on accent buttons)
  - Fonts unchanged.
- **D-09:** Vibe is bingo hall meets bar napkin — warm, low-fi, slightly chaotic. Not polished SaaS.

**NSFW Mode — Board Identity**
- **D-10:** Classic bingo card treatment:
  - B·U·L·L·S header row across 5 columns (B·U·L·L for 4×4; B·S or B-S for 3×3).
  - Cream/parchment cells with brown border lines.
  - Burnt-orange dauber stamp overlay on marked cells (semi-transparent, circular, word legible beneath).
  - Blank cells: subtle crosshatch/dot texture.
  - Win line: burnt-orange pulsing ring (same animation as SFW yellow).

**NSFW Mode — Copy**
- **D-11:** Deep copy overhaul. See CONTEXT.md § D-11 table and UI-SPEC § Copywriting Contract for the full map.

**Technical Implementation**
- **D-12:** CSS custom property swap via `[data-theme="nsfw"]` on `<html>`. All `--color-*` tokens override at this selector. Tailwind v4 custom properties compose correctly with this pattern.
- **D-13:** Theme store at `src/lib/stores/theme.svelte.ts` — `$state<'sfw' | 'nsfw'>('sfw')`, initialized from `localStorage.getItem('theme')` on first read (client-side only, SSR-guarded), persisted on every change. Store applies `data-theme` to `document.documentElement`.
- **D-14:** Copy handled via `src/lib/copy.ts` — exports a single `copy(key, theme)` function (or reactive object driven by the store). Components import copy by key — no inline ternaries.
- **D-15:** `BoardHeader.svelte` is a new component rendered in NSFW mode only (theme-conditional in `Board.svelte`). Dauber stamp is an NSFW-conditional style in `BoardCell.svelte`.

### Claude's Discretion

- Exact dauber stamp CSS implementation (SVG overlay vs. radial-gradient pseudo-element vs. absolutely-positioned `<span>`) — use whatever renders correctly on mobile with no layout shift.
- Blank cell texture in NSFW mode.
- Exact toggle placement (footer vs. fixed bottom-right corner) — whichever keeps it accessible on mobile without overlapping board cells.
- Confetti palette in NSFW mode (burnt oranges/browns instead of defaults).
- Animation/transition on mode switch — instant is fine.
- `<title>` and `<meta name="description">` should reflect the active mode name.

### Deferred Ideas (OUT OF SCOPE)

- Sound effects on mark and win (v2 — SOCL-03)
- Near-miss indicator (v2 — SOCL-02)
- QR code for join link (v2 — ACCE-01)
- Dark mode toggle for NSFW mode (v2)
- "BS detector" meter / running tally during the game

## Phase Requirements

No requirement IDs map to Phase 6 — Phase 6 is pure visual/copy polish of already-shipped v1 requirements (SESS-, LOBB-, BOAR-, WIN-, RESI-). The phase success criteria (visual cohesion, inviting home/join flow, clear lobby/board, satisfying end screen, zero-instruction onboarding) are measured by human verification + the UI Design Contract checker, not by requirement IDs.

## Project Constraints (from CLAUDE.md)

Active directives from `./CLAUDE.md` that affect Phase 6 planning:

| Directive | How it applies to Phase 6 |
|-----------|---------------------------|
| Browser-only, no native app | ThemeToggle must work on mobile Safari + desktop Chrome. No native share/notifications. |
| Sub-1s performance | Theme swap must be instant (no JS recompute, no network). CSS-only swap via `data-theme` satisfies this. |
| Zero-signup | No per-user theme preference; theme is per-device via `localStorage`. Aligns with D-02. |
| Don't use Redux/Zustand/MobX | Theme store is a Svelte 5 rune — correct by default per D-13. |
| Don't hand-roll polling sync | N/A — Phase 6 adds no real-time features. |
| Tailwind v4 + `@theme` tokens | `[data-theme="nsfw"]` override block goes in `src/app.css`. No `tailwind.config.js` needed. |
| Valibot for validation | N/A — Phase 6 adds no message types. Existing `copy` module is plain TS keys. |
| Components are first-party Svelte | Two new components (`ThemeToggle`, `BoardHeader`) go in `src/lib/components/`. No shadcn, no registry. |
| 44px min tap target | ThemeToggle pill is 44px tall per UI-SPEC. |

## Standard Stack

### Core (already installed — verified from `package.json`)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `tailwindcss` | `4.2.2` [VERIFIED: npm view 2026-04-18] | Utility styling + `@theme` tokens | v4 Oxide engine; `@theme` custom properties compose with `[data-theme]` overrides natively |
| `svelte` | `5.55.4` [VERIFIED: npm view 2026-04-18] | UI layer with runes | `$state` runes in `.svelte.ts` — established project pattern (see `src/lib/stores/room.svelte.ts`) |
| `@sveltejs/kit` | `2.57.1` [VERIFIED: package.json] | Router + layout | `+layout.svelte` is the correct wiring point for theme-attribute application |
| `lucide-svelte` | `1.0.1` [VERIFIED: npm ls] | Icon library | Already installed; `Briefcase` icon present |
| `canvas-confetti` | `1.9.4` [VERIFIED: npm view 2026-04-18] | Win confetti | Already dynamically imported in `src/lib/stores/room.svelte.ts` lines 138–162; only the `colors:` array changes per theme |

### Supporting (no new packages needed — this is the strong signal)

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `@fontsource-variable/inter` | `5.2.8` [VERIFIED: npm view] | Inter Variable — body font | Unchanged from Phase 1 |
| `@fontsource-variable/space-grotesk` | `5.2.5` [VERIFIED: package.json] | Space Grotesk Variable — display font | Unchanged from Phase 1; also used for NSFW `BoardHeader` per UI-SPEC |

### Zero new dependencies required

Phase 6 adds no new npm packages. Every primitive needed — CSS custom properties, the `Briefcase` icon, the Svelte 5 runes pattern, `canvas-confetti` colour array, the `:root[data-theme]` selector — already ships with the existing stack. [VERIFIED: package.json audit]

**Installation:** No install step. `pnpm install` if dependencies somehow drift, but Phase 6 introduces zero new deps.

### Alternatives Considered (and rejected)

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `@theme` + `[data-theme]` override | Tailwind v4 `@custom-variant dark` | CONTEXT D-12 locks the attribute pattern. `@custom-variant dark` is for `dark:*` class-style variants; we're swapping CSS custom-property values, not adding variants. [CITED: tailwindcss.com/docs/dark-mode] |
| Plain `$state` in `.svelte.ts` | `svelte-persisted-state` library | Adds a dependency for what is a 20-line store. Project pattern (see `room.svelte.ts`) already does manual localStorage; match it. |
| Static copy object | i18n library (e.g., `svelte-i18n`) | Overkill. Two themes, one locale; a keyed TS object is simpler and smaller. |
| SVG dauber stamp | CSS `border-radius: 50%` + `radial-gradient` | CONTEXT § Claude's Discretion calls for "slightly irregular circle (not a perfect CSS border-radius)" — UI-SPEC line 219 commits to inline SVG for the tactile hand-drawn feel. |

## Architecture Patterns

### System Architecture Diagram

```
  [localStorage: "theme"]
           │
           ▼
  +--------------------------+       initial SSR render: default 'sfw'
  |  theme.svelte.ts store   |◄──── on mount: read localStorage → may flip to 'nsfw'
  |  $state<'sfw'|'nsfw'>    |
  +--------------------------+
           │
           │ (1) applies data-theme attribute
           ▼                                    (2) reactive read
  <html data-theme="nsfw">                  ┌────────────────────┐
           │                                │  copy.ts module    │
           │ CSS cascade                    │  reactive 'copy'   │
           ▼                                │  object            │
  :root[data-theme="nsfw"] {               └────────────────────┘
    --color-bg: #F5EDD6;                            │
    --color-accent: #D4520A;                        │ imported by every
    ...                                             ▼ component
  }
           │                              ┌──────────────────────┐
           │ var(--color-*)               │  15 existing         │
           ▼                              │  components          │
  ┌──────────────────────────┐            │  +ThemeToggle (new)  │
  │  Every Svelte component  │◄───────────│  +BoardHeader (new)  │
  │  (no markup change for   │   copy.*   └──────────────────────┘
  │   color — only for copy) │
  └──────────────────────────┘
```

**Data flow trace (theme toggle interaction):**
1. User taps ThemeToggle → `theme.svelte.ts` setter runs
2. Store writes `localStorage.setItem('theme', 'nsfw')`
3. Store sets `document.documentElement.setAttribute('data-theme', 'nsfw')`
4. CSS cascade re-evaluates; every `var(--color-*)` in every rendered rule resolves to the new value — **browser repaints with new palette instantly, no JS involvement past step 3**
5. Reactive `copy` object (derived from store) re-runs in every component that read it → copy strings update
6. BoardHeader + dauber stamps are already in the DOM (rendered when `theme === 'nsfw'` in `Board.svelte` / `BoardCell.svelte`) — they flip visible/hidden via the same cascade

### Recommended Project Structure

```
src/
├── app.css                             # NSFW override block added to existing @theme
├── lib/
│   ├── copy.ts                         # NEW — keyed copy map, reactive to theme store
│   ├── stores/
│   │   ├── room.svelte.ts              # (existing) — confetti color array becomes per-theme
│   │   └── theme.svelte.ts             # NEW — $state rune + localStorage + data-theme apply
│   └── components/
│       ├── BoardHeader.svelte          # NEW — B·U·L·L·S header, NSFW-only conditional
│       ├── ThemeToggle.svelte          # NEW — Professional Mode pill, persistent in layout
│       ├── Board.svelte                # MODIFY — theme-conditional render of BoardHeader
│       ├── BoardCell.svelte            # MODIFY — dauber stamp overlay + crosshatch in NSFW
│       ├── EndScreen.svelte            # MODIFY — copy from copy.ts, no hardcoded strings
│       ├── WordPool.svelte             # MODIFY — copy from copy.ts
│       ├── PackPills.svelte            # MODIFY — pack labels from copy.ts
│       └── [8 other existing]          # MODIFY — every user-facing string → copy.ts
└── routes/
    ├── +layout.svelte                  # MODIFY — mount ThemeToggle + apply data-theme on init
    ├── +page.svelte                    # MODIFY — wordmark + tagline + CTAs from copy.ts
    └── room/[code]/+page.svelte        # MODIFY — every string from copy.ts
```

### Pattern 1: Theme store with localStorage persistence

**What:** Svelte 5 rune-backed store in a `.svelte.ts` module that mirrors `localStorage` and applies `data-theme` to `<html>`.

**When to use:** Exactly once, for `theme.svelte.ts`. Do not replicate this pattern for any other state in Phase 6.

**Example:**
```typescript
// src/lib/stores/theme.svelte.ts
// Pattern sourced from Svelte 5 docs + project precedent (src/lib/session.ts, src/lib/stores/room.svelte.ts)
// [CITED: svelte.dev/docs/svelte/$state] — export object + mutator functions, do not export reassignable $state directly

type Theme = 'sfw' | 'nsfw';
const STORAGE_KEY = 'theme';

function readStored(): Theme {
  if (typeof localStorage === 'undefined') return 'sfw'; // SSR guard — D-03 default
  const raw = localStorage.getItem(STORAGE_KEY);
  return raw === 'nsfw' ? 'nsfw' : 'sfw'; // invalid / missing → 'sfw' per D-03
}

// Mutable $state wrapped in an object so we can export a stable reference
const themeState = $state<{ current: Theme }>({ current: 'sfw' });

export const theme = {
  get current() { return themeState.current; },
  init() {
    // Call from +layout.svelte onMount (or inside `if (browser)`)
    themeState.current = readStored();
    applyAttribute(themeState.current);
  },
  set(next: Theme) {
    themeState.current = next;
    if (typeof localStorage !== 'undefined') localStorage.setItem(STORAGE_KEY, next);
    applyAttribute(next);
  },
  toggle() {
    this.set(themeState.current === 'sfw' ? 'nsfw' : 'sfw');
  },
};

function applyAttribute(t: Theme) {
  if (typeof document === 'undefined') return;
  document.documentElement.setAttribute('data-theme', t);
}
```

Consumers read `theme.current` in templates — Svelte's compiler wires the runes reactivity through the getter.

### Pattern 2: Reactive copy map

**What:** A `copy.ts` module that exposes a reactive object whose keys resolve to per-theme strings.

**When to use:** Exactly once, for `copy.ts`. Every component reads `copy.homeTagline`, `copy.startButton`, etc. — no inline ternaries anywhere.

**Example:**
```typescript
// src/lib/copy.ts
import { theme } from '$lib/stores/theme.svelte';

const STRINGS = {
  sfw: {
    brand: 'Buzzword Bingo',
    tagline: 'The meeting game. Mark the buzzwords, first to a line wins.',
    createCta: 'Create a game',
    startGame: 'Start Game',
    winHeadline: 'BINGO!',
    // ... every key from UI-SPEC § Copywriting Contract
  },
  nsfw: {
    brand: 'Bullshit Bingo',
    tagline: "For meetings that could've been an email.",
    createCta: 'Start the chaos',
    startGame: 'Start the suffering',
    winHeadline: 'CALLED IT!',
    // ... matching NSFW copy
  },
} as const;

type CopyKey = keyof typeof STRINGS.sfw;

// Proxy object — every property access re-reads `theme.current`, so components
// re-run their templates when the store changes.
export const copy = new Proxy({} as Record<CopyKey, string>, {
  get(_, key: string) {
    return STRINGS[theme.current][key as CopyKey] ?? '';
  },
});

// For strings with interpolation (winner name), expose functions:
export function winnerSubhead(name: string): string {
  return theme.current === 'sfw' ? `${name} wins!` : `${name} called Bullshit.`;
}
```

**Why Proxy:** a plain `$derived`-wrapped object would require every component to destructure or re-derive. The Proxy approach keeps usage ergonomic: `<h1>{copy.winHeadline}</h1>` — Svelte's reactivity sees the `theme.current` read inside the getter and re-runs the block when it changes.

### Pattern 3: NSFW-conditional DOM

**What:** For visuals that only exist in one mode (BoardHeader row, dauber stamp, crosshatch texture), gate rendering on `theme.current === 'nsfw'`.

**Example:**
```svelte
<!-- Board.svelte -->
<script lang="ts">
  import BoardHeader from './BoardHeader.svelte';
  import { theme } from '$lib/stores/theme.svelte';
  // ...existing props...
</script>

{#if theme.current === 'nsfw' && cells}
  <BoardHeader {gridSize} />
{/if}
<!-- existing grid markup unchanged -->
```

### Anti-Patterns to Avoid

- **Scattering `theme === 'nsfw' ? 'X' : 'Y'` across components.** Violates D-14; every copy string must route through `copy.ts`. A single audit file is maintainable; 15 component-local ternaries are not.
- **Using Tailwind's built-in `dark:` variant.** The project doesn't declare `@custom-variant dark`. CONTEXT D-12 specifies `[data-theme="nsfw"]` overrides on the custom properties. Conflating "dark mode" with "NSFW mode" breaks if v2 ever adds a dark NSFW variant.
- **Writing `data-theme` in the SSR HTML via a cookie read.** Phase 6 accepts the brief FOUT on first visit — D-03 defaults to SFW, so the mismatch only exists for players who previously opted into NSFW. The instant CSS repaint on `data-theme` flip is visually acceptable and avoids SSR complexity.
- **Hardcoding `#F5D547` / `#D4520A` inside components.** Always use `var(--color-accent)`. The current codebase already does this universally (verified across all 15 components); don't regress.
- **Animating the theme swap via CSS transitions on `color` / `background-color`.** Would cause a 300ms fade-through of every element on toggle — visually busy per CONTEXT. Instant swap is correct.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Theme persistence | Custom cookie sync + hydration logic | `localStorage` read in `onMount` (SSR-guarded) | D-02 — per-device preference; no server involvement |
| Reactive copy string | `getContext` / per-component `$derived` wrappers | Proxy-backed `copy` object (Pattern 2) | Single source of truth; easy to audit coverage |
| Color swap | Duplicate every component with a `data-nsfw` class | `[data-theme="nsfw"]` CSS custom property override | Tailwind v4's custom properties resolve lazily through the cascade — the built-in mechanism is exactly what we want [CITED: tailwindcss.com/docs/theme] |
| Dauber stamp geometry | CSS `clip-path` / complex masks | Inline SVG circle with a slight path irregularity + CSS `opacity` | UI-SPEC commits to SVG; SVG is GPU-composited and avoids layout shift |
| FOUT mitigation | Inline `<script>` in app.html | Accept first-paint SFW + instant flip to NSFW | NSFW is opt-in; the flip is imperceptible for SFW users (majority) |
| Tab title per theme | Manual `document.title =` in every route | `$effect` in `+layout.svelte` that writes `document.title` from `copy.brand` | Centralizes title management |

**Key insight:** Tailwind v4 + CSS custom properties + Svelte 5 runes form a fully native dual-theme stack. The temptation to reach for a theme-management library or a CSS-in-JS solution is wrong here; the platform primitives already solve the problem cleanly.

## Runtime State Inventory

Phase 6 is a pure UI overhaul — not a rename, refactor, or migration. No runtime state inventory needed.

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| Stored data | None — Phase 6 adds a single `localStorage` key (`theme`) with values `'sfw'` or `'nsfw'`. No existing stored data is affected. | None |
| Live service config | None — no services, no tunnels, no n8n, no Cloudflare Worker config change (Durable Object bindings unchanged). | None |
| OS-registered state | None — no Task Scheduler, no launchd, no pm2. | None |
| Secrets/env vars | None — no new env vars; no secret renames. | None |
| Build artifacts | None — no package rename, no directory move. Existing build output remains valid. | None |

Verified by: (1) grep of codebase for `nsfw` / `sfw` / `theme` — zero existing matches outside planning docs; (2) `package.json` audit — no dependency rename; (3) CONTEXT explicitly scopes the phase to visual polish only.

## Common Pitfalls

### Pitfall 1: Tailwind v4 Oxide scanner misses dynamically composed class names

**What goes wrong:** Writing `class="grid-cols-${n}"` or similar template-literal class composition → Oxide never scans the runtime string → utility class doesn't exist in the emitted CSS → grid breaks.

**Why it happens:** Oxide's scanner reads source as text, not as JS output. It cannot infer that `n` is always 3, 4, or 5.

**How to avoid:** Enumerate literal class tokens in a `$derived` ternary, as the codebase already does in `Board.svelte` lines 16–23 and `WinLineIcon.svelte` lines 13–15. Apply the same pattern to new `ThemeToggle` / `BoardHeader` components.

**Warning signs:** Class names that include interpolated variables; `grid-cols-`, `text-[${...}]`, `bg-[${...}]` expressions.

### Pitfall 2: `$state` reassignment vs. mutation confusion in `.svelte.ts`

**What goes wrong:** Exporting a `$state` primitive directly from a module — imports lose reactivity because the Svelte compiler can't wrap cross-file references in the getter/setter transform.

**Why it happens:** Known Svelte 5 limitation [CITED: svelte.dev/docs/svelte/$state].

**How to avoid:** Export a stable object (like `theme` in Pattern 1 above) whose properties are `$state`-backed. Consumers read `theme.current` (a getter) — reactivity works through the getter call.

**Warning signs:** `export let foo = $state(...)` in a `.svelte.ts` — will compile but won't react on import.

### Pitfall 3: First-paint FOUT from `data-theme` flip after hydration

**What goes wrong:** Player with `localStorage.theme === 'nsfw'` reloads; SSR renders the dark SFW palette; hydration runs, store reads `localStorage`, flips attribute, parchment appears. The 50–200ms of dark-to-parchment flash is jarring.

**Why it happens:** SvelteKit's Cloudflare adapter renders server-side without browser storage access; the client can only correct after hydration.

**How to avoid:** For Phase 6 scope, accept the flash — NSFW is opt-in, and the audience is small. Mitigate by:
- Applying `data-theme` attribute as early as possible (in `+layout.svelte` `onMount`, or even inline `<script>` before body paint).
- Setting CSS `color-scheme: light;` on `[data-theme="nsfw"]` so browser UI (scrollbars) tracks the theme.

If a future phase needs zero-FOUT, ship an inline `<script>` in `src/app.html` that reads `localStorage.theme` and sets `data-theme` synchronously before Svelte hydrates. Out of scope for Phase 6.

**Warning signs:** Brief dark flash on page load for NSFW users. Acceptable trade-off; document in verification.

### Pitfall 4: Hardcoded copy left behind in a component

**What goes wrong:** Missing a single string in a component → SFW reads wrong brand ("Bullshit" leaked) or NSFW feels half-committed (professional "Start Game" next to "Who's ready to suffer?").

**Why it happens:** 15 components + 4 routes + ErrorPage + Banner + EndScreen. Easy to miss one.

**How to avoid:** Executor must grep the codebase for every user-facing string after the copy migration:
```bash
# Each of these should return empty (or only match lines inside copy.ts):
grep -r "Bullshit Bingo" src/ --include="*.svelte" --include="*.ts"
grep -r "Buzzword Bingo" src/ --include="*.svelte" --include="*.ts"
grep -r "Create a game" src/ --include="*.svelte"
grep -r "Start Game" src/ --include="*.svelte"
grep -r "BINGO" src/ --include="*.svelte"
grep -r "Waiting for" src/ --include="*.svelte"
```
Include a verification task in the plan: "grep audit: no user-facing hardcoded strings outside copy.ts."

**Warning signs:** String literals in JSX-style templates; `aria-label="..."` attributes with hardcoded text; `placeholder="..."` attributes with copy.

### Pitfall 5: Dauber stamp causes layout shift or blocks clicks

**What goes wrong:** A dauber stamp `<span>` with `display: block` pushes cell content → cell height changes when marked → board "jumps." Or the stamp has `pointer-events: auto` → intercepts unmark clicks.

**Why it happens:** Absolute positioning without `pointer-events: none`; missing container `position: relative`.

**How to avoid:** Cell is already `position: relative` (BoardCell.svelte is a styled `<button>`). Stamp must be:
```svelte
<span
  class="absolute inset-0 pointer-events-none flex items-center justify-center"
  aria-hidden="true"
>
  <svg viewBox="0 0 100 100" class="w-[85%] h-[85%] opacity-[0.72]">
    <!-- hand-drawn irregular circle path -->
  </svg>
</span>
```

**Warning signs:** Clicks on marked cells don't unmark; cell content shifts when the mark toggles; Playwright tests fail with intercepted clicks.

### Pitfall 6: `prefers-reduced-motion` not respected in new animations

**What goes wrong:** Switch indicator slide (150ms) and dauber stamp scale-in (120ms) ignore user preference.

**Why it happens:** New animations added without `@media (prefers-reduced-motion)` overrides.

**How to avoid:** Every new `@keyframes` or `transition:` must have a `motion-reduce:transition-none` class (Tailwind v4 supports this out of the box — see existing `Banner.svelte` line 15 and `BoardCell.svelte` line 39).

**Warning signs:** Reduced-motion user sees the switch indicator slide; dauber stamp animates despite preference.

### Pitfall 7: Contrast regression in NSFW secondary text

**What goes wrong:** `--color-ink-secondary: #7A4F2A` on `--color-surface: #E8D9B0` is 4.4:1 (AA, not AAA). Small label text becomes borderline.

**Why it happens:** The parchment palette's warm browns sit closer in luminance than the SFW dark palette.

**How to avoid:** Trust the UI-SPEC's audited contrast numbers (lines 122–128), but verify with a real contrast checker during execution. Specifically: use secondary ink only for Body (16px) or larger — never for Label (14px) against surface. If a spec-compliant combination fails at runtime, escalate — don't silently lower standards.

**Warning signs:** Hints or helper text hard to read on manila tan cards during UAT.

## Code Examples

### CSS override block (goes in `src/app.css`)

```css
/* Source: UI-SPEC D-08; Tailwind v4 docs verified 2026-04-18 */
@import "tailwindcss";

@theme {
  /* SFW defaults (unchanged from Phase 1) */
  --color-bg:            #0F0F14;
  --color-surface:       #1A1A23;
  --color-divider:       #2A2A36;
  --color-accent:        #F5D547;
  --color-destructive:   #F87171;
  --color-ink-primary:   #F5F5F7;
  --color-ink-secondary: #A1A1AA;
  --color-ink-disabled:  #52525B;
  --color-ink-inverse:   #0F0F14;
  --font-sans:    "Inter Variable", system-ui, sans-serif;
  --font-display: "Space Grotesk Variable", "Inter Variable", sans-serif;
}

/* NSFW override — CONTEXT D-08 + D-12 */
:root[data-theme="nsfw"] {
  --color-bg:            #F5EDD6;
  --color-surface:       #E8D9B0;
  --color-divider:       #C9A96B;
  --color-accent:        #D4520A;
  --color-destructive:   #C0392B;
  --color-ink-primary:   #2C1810;
  --color-ink-secondary: #7A4F2A;
  --color-ink-disabled:  #B8956A;
  --color-ink-inverse:   #F5EDD6;
  color-scheme: light; /* browser UI tracks parchment */
}

/* Win-line pulse now reads var(--color-accent) — colour tracks theme */
@keyframes winLinePulse {
  0%, 100% { box-shadow: 0 0 0 2px var(--color-accent), 0 0 8px  var(--color-accent); }
  50%      { box-shadow: 0 0 0 2px var(--color-accent), 0 0 16px var(--color-accent); }
}

[data-win-line="true"] > button {
  animation: winLinePulse 1200ms ease-in-out infinite;
  border-radius: 0.5rem;
}

/* NSFW-only: crosshatch on blank cells (Claude's discretion per UI-SPEC line 226) */
:root[data-theme="nsfw"] .bingo-blank-cell {
  background-image: repeating-linear-gradient(
    45deg,
    transparent 0 8px,
    var(--color-divider) 8px 9px
  );
  background-blend-mode: overlay;
  opacity: 0.92;
}
```

### ThemeToggle component skeleton (`src/lib/components/ThemeToggle.svelte`)

```svelte
<!-- Source: UI-SPEC § Professional Mode toggle (lines 185–214) -->
<script lang="ts">
  import { Briefcase } from "lucide-svelte";
  import { theme } from "$lib/stores/theme.svelte";

  const isSfw = $derived(theme.current === "sfw");
</script>

<div
  class="fixed bottom-4 right-4 sm:static sm:ml-auto z-50"
  role="group"
  aria-label="Theme controls"
>
  <button
    type="button"
    role="switch"
    aria-checked={isSfw}
    aria-label="Professional Mode"
    onclick={() => theme.toggle()}
    class="inline-flex items-center gap-2 min-h-11 px-4 rounded-full
           bg-[var(--color-surface)] border border-[var(--color-divider)]
           text-sm font-semibold text-[var(--color-ink-primary)]
           hover:border-[var(--color-ink-secondary)]
           active:translate-y-px
           focus-visible:outline-2 focus-visible:outline-offset-2
           focus-visible:outline-[var(--color-ink-secondary)]
           transition-colors motion-reduce:transition-none cursor-pointer"
  >
    <Briefcase size={16} />
    <span>Professional Mode</span>
    <span
      class="inline-block w-8 h-4 rounded-full bg-[var(--color-divider)] relative
             transition-colors motion-reduce:transition-none"
      class:bg-\[var\(--color-accent\)\]={isSfw}
      aria-hidden="true"
    >
      <span
        class="absolute top-0.5 w-3 h-3 rounded-full bg-white transition-[left] duration-150 ease-out motion-reduce:transition-none"
        style="left: {isSfw ? '18px' : '2px'}"
      ></span>
    </span>
  </button>
</div>
```

### Confetti palette swap (modify `src/lib/stores/room.svelte.ts`)

```typescript
// Existing dynamic import at lines 138–162.
// Change the colors: array to a per-theme palette:
import { theme } from '$lib/stores/theme.svelte';

const sfwPalette = ["#F5D547", "#F5F5F7", "#F87171"];
const nsfwPalette = ["#D4520A", "#C9A96B", "#7A4F2A", "#F5EDD6", "#2C1810"];

confetti({
  particleCount: reduce ? 60 : 180,
  // ...existing options...
  colors: theme.current === 'nsfw' ? nsfwPalette : sfwPalette,
});
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `tailwind.config.js` + `darkMode: 'class'` | CSS-first `@theme` + `[data-theme]` override | Tailwind v4 (Jan 2025) | No config file needed; native CSS cascade; Phase 6 approach matches current best practice [CITED: tailwindcss.com/docs/dark-mode 2026] |
| Svelte stores via `writable()` from `svelte/store` | `$state` runes in `.svelte.ts` modules | Svelte 5.0 (Oct 2024) | Project already uses runes (`src/lib/stores/room.svelte.ts`); stay on runes |
| CSS-in-JS / styled-components for theming | CSS custom properties + Tailwind utilities | Ongoing (since ~2022) | Faster runtime, smaller bundle, simpler mental model |

**Deprecated/outdated:**
- `darkMode: 'class'` config key — removed in Tailwind v4. Use `@custom-variant` or `[data-theme]` overrides.
- Legacy Svelte 4 `writable` for shared client state — works but runes are the idiomatic Svelte 5 pattern and the established project convention.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | The Proxy-based `copy` object pattern re-runs component templates on `theme.current` changes (Svelte 5 reactivity tracks the property read inside the Proxy getter) | Pattern 2 | If wrong: components cache SFW copy and don't update on toggle. Mitigation: executor can fall back to `$derived` wrappers per component (ugly but works) or a `copy()` function that takes `theme.current` as an argument. The Proxy pattern is idiomatic Svelte 5 but less commonly documented than the function-call form; treat as preferred-but-not-locked. |
| A2 | The FOUT on first paint for NSFW-opted-in users is acceptable | Pitfall 3 | If user feedback says it's jarring: add inline `<script>` in `src/app.html` as follow-up — out of Phase 6 scope. |
| A3 | NSFW contrast ratios in UI-SPEC lines 122–128 are accurate | Color / Pitfall 7 | UI-SPEC was checker-approved (see CONTEXT status "Ready for planning"). If an executor finds a failing combination at runtime, escalate — the UI-SPEC owns the contrast budget. |
| A4 | Tailwind v4's Oxide engine re-resolves `var(--color-*)` on cascade re-evaluation (i.e., the attribute flip is enough — no Tailwind recompile needed) | Pattern 1 + CSS override block | Verified by Tailwind docs — `@theme` values compile to `:root { --color-*: ... }` declarations; the custom-property cascade is standard CSS. Very low risk. |

**Nothing else assumed** — every other claim is verified against the codebase, `package.json`, Tailwind docs, or Svelte 5 docs.

## Open Questions

1. **Proxy vs. function call for `copy` lookup.**
   - What we know: Svelte 5 runes track property reads; the Proxy's `get` trap reads `theme.current`, which should establish reactivity.
   - What's unclear: Whether this pattern has edge cases with SSR (the Proxy exists module-scope; during SSR `theme.current` is `'sfw'` — correct for first paint).
   - Recommendation: Proceed with the Proxy pattern. If testing reveals reactivity issues, drop to a `getCopy()` function that components call inside `$derived`. Both are equivalent in output; the Proxy is nicer to read.

2. **Toggle placement on the board screen.**
   - What we know: UI-SPEC commits to fixed bottom-right on mobile; footer on desktop.
   - What's unclear: Whether bottom-right overlaps the 5×5 board grid edge on narrow (<360px) phones. CONTEXT flags this as Claude's discretion.
   - Recommendation: Executor should run a narrow-viewport Playwright check (iPhone SE 375px width) to confirm the toggle doesn't overlap cell clicks. If it does, fall back to a footer row below the board.

3. **Dauber stamp SVG asset source.**
   - What we know: UI-SPEC asks for "slightly irregular circle" with "hand-drawn quality" (line 138 of CONTEXT).
   - What's unclear: Whether to inline the SVG path, hand-tune Bezier control points, or use a small PNG.
   - Recommendation: Inline SVG with a hand-tuned `<path>` — 4 control points forming an ellipse-with-wobble. Keeps the component self-contained; scales crisply; respects `prefers-reduced-motion`.

## Environment Availability

Phase 6 is a code/CSS-only change. No external runtime dependencies. No new tooling.

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Build + dev server | ✓ | 23.11.0 [VERIFIED: `node -v`] | — |
| pnpm | Package management | ✓ (project-pinned 10.33.0) | — | — |
| Tailwind v4 Oxide engine | Utility compilation | ✓ | 4.2.2 | — |
| Wrangler | Local dev + deploy | ✓ | 4.83.0 | — |
| Playwright | E2E validation | ✓ | 1.49+ | — |

**No missing dependencies.** All versions verified against `package.json` / `npm view` on 2026-04-18.

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 2.1.0 (unit — jsdom) + Playwright 1.49+ (e2e — Chromium) |
| Config file | `vitest.config.ts`, `playwright.config.ts` |
| Quick run command | `pnpm test:unit` |
| Full suite command | `pnpm test` (vitest + playwright) |

### Phase Requirements → Test Map

Phase 6 has no requirement IDs. Success criteria are behavioral (visual cohesion, copy accuracy, toggle persistence). Map each success criterion to a test type:

| Success Criterion | Behavior | Test Type | Automated Command | File Exists? |
|-------------------|----------|-----------|-------------------|-------------|
| SC-1: Consistent design language | Every component reads `var(--color-*)` — no hardcoded hex | unit (grep-style) | `pnpm test:unit -- --run theme-hardcoded.test.ts` | ❌ Wave 0 |
| SC-1: Theme attribute applied | `<html data-theme="sfw">` present on load; flips on toggle | e2e | `pnpm test:e2e -- theme-toggle.spec.ts` | ❌ Wave 0 |
| SC-1: Copy sourced from `copy.ts` | No user-facing strings hardcoded in components | unit (grep) | `pnpm test:unit -- --run copy-extraction.test.ts` | ❌ Wave 0 |
| SC-1: NSFW overrides apply | Clicking toggle changes computed `--color-bg` | e2e | covered by theme-toggle.spec.ts | ❌ Wave 0 |
| SC-2: Home + join frictionless | Home renders tagline + CTA + ThemeToggle in viewport | e2e | `pnpm test:e2e -- home-first-visit.spec.ts` | ❌ Wave 0 |
| SC-3: Lobby + board readable | Pack pills, word pool, roster, grid visible in 375px viewport | e2e | `pnpm test:e2e -- narrow-viewport.spec.ts` | ❌ Wave 0 |
| SC-3: B·U·L·L·S header in NSFW | `BoardHeader` renders when `theme === 'nsfw'`, absent in SFW | unit (component) | `pnpm test:unit -- --run BoardHeader.test.ts` | ❌ Wave 0 |
| SC-3: Dauber stamp toggles mark | NSFW cell click adds stamp; second click removes it; click target intact | unit + e2e | `BoardCell.test.ts` existing + new NSFW branch | partial — extend existing |
| SC-4: End screen celebration | Confetti palette array swaps per theme | unit | `pnpm test:unit -- --run room-store.test.ts` (extend) | partial — extend existing |
| SC-4: End screen copy | `CALLED IT!` vs `BINGO!` per theme | unit | `EndScreen.test.ts` extend | partial — extend existing |
| SC-5: Zero-instruction onboarding | First-visit home shows brand, tagline, CTA, toggle without modal | e2e | `home-first-visit.spec.ts` | ❌ Wave 0 |
| Toggle persistence | `localStorage.theme` round-trips; reload retains NSFW | e2e | `theme-toggle.spec.ts` | ❌ Wave 0 |
| No regression — SFW unchanged | Phase 1–5 Playwright specs still pass | e2e (existing) | `pnpm test:e2e` | ✓ |
| No regression — contrast | Axe-core run against both themes | e2e | `pnpm test:e2e -- a11y.spec.ts` | ❌ Wave 0 — optional |

### Sampling Rate

- **Per task commit:** `pnpm test:unit` (fast; ~3s locally)
- **Per wave merge:** `pnpm test` (unit + e2e, ~60s)
- **Phase gate:** Full suite green + manual verification screenshot pass per UI-SPEC screen checklist

### Wave 0 Gaps

- [ ] `tests/unit/theme.test.ts` — covers theme store: initial state, localStorage round-trip, SSR guard, `toggle()` flips current
- [ ] `tests/unit/copy.test.ts` — covers copy module: SFW defaults, NSFW values, interpolation functions (winnerSubhead etc.)
- [ ] `tests/unit/BoardHeader.test.ts` — renders B·U·L·L·S for size 5, B·U·L·L for 4, B·S for 3
- [ ] `e2e/theme-toggle.spec.ts` — toggle click flips `data-theme`; reload retains theme; toggle visible on every route
- [ ] `e2e/home-first-visit.spec.ts` — brand + tagline + CTA + toggle all visible above the fold
- [ ] `e2e/narrow-viewport.spec.ts` — iPhone SE (375px) check: ThemeToggle doesn't overlap interactive elements

No framework install needed — Vitest + Playwright already configured and used in Phases 1–5.

## Security Domain

Phase 6 makes no backend changes, no auth changes, no data handling changes, no new user input. Security review scope is minimal.

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | — (no auth; zero-signup model unchanged) |
| V3 Session Management | no | — (`sessionStorage` player identity unchanged; `localStorage` theme is non-sensitive) |
| V4 Access Control | no | — (no new endpoints / roles) |
| V5 Input Validation | no | — (no new user input; theme values are UI-controlled `'sfw'`/`'nsfw'` strings, validated on read via `raw === 'nsfw' ? 'nsfw' : 'sfw'`) |
| V6 Cryptography | no | — |
| V14 Configuration | minor | Ensure `localStorage` keys don't leak PII — theme key holds only `'sfw'`/`'nsfw'`, safe |

### Known Threat Patterns for SvelteKit + Browser Stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| XSS via reflected copy string | Tampering | All copy is static, authored in `copy.ts`; no user data interpolates into HTML except `{name}` in winner subhead, which uses Svelte's default text binding (auto-escaped) |
| localStorage poisoning | Tampering | Theme read validates to `'sfw'`/`'nsfw'` enum; malformed value defaults to `'sfw'`. No privilege elevation possible. |
| Prototype pollution via Proxy | Tampering | The `copy` Proxy only implements `get`; no `set`/`deleteProperty` traps exposed. Read-only interface. |

## Sources

### Primary (HIGH confidence)

- `./CLAUDE.md` (project instructions) — stack, constraints, conventions
- `.planning/phases/06-ui-overhaul/06-CONTEXT.md` — locked decisions D-01 through D-15
- `.planning/phases/06-ui-overhaul/06-UI-SPEC.md` — full visual/interaction contract (checker-approved)
- `.planning/phases/01-foundation-transport-room-lobby-presence/01-UI-SPEC.md` — SFW baseline tokens
- Codebase verification: `src/lib/components/*.svelte`, `src/lib/stores/room.svelte.ts`, `src/app.css`, `src/routes/**` — confirms component already uses `var(--color-*)` universally and runes are the store pattern
- `package.json` — verified dependencies and versions

### Secondary (MEDIUM → HIGH via cross-verification)

- [Tailwind v4 Theme docs](https://tailwindcss.com/docs/theme) — confirms `[data-theme]` override pattern works with `@theme` tokens [WebFetch 2026-04-18]
- [Tailwind v4 Dark Mode docs](https://tailwindcss.com/docs/dark-mode) — `@custom-variant dark ([data-theme=dark])` is the alternative for variant-class use; we use the custom-property-override path instead [WebFetch 2026-04-18]
- [Svelte 5 `$state` rune docs](https://svelte.dev/docs/svelte/$state) — confirms export-object pattern for `.svelte.ts` modules [WebFetch 2026-04-18]
- [Cloudflare Durable Objects docs](https://developers.cloudflare.com/durable-objects/) — confirms Phase 6 does not require any DO changes (validated in Phase 1 research)
- npm registry: `npm view tailwindcss version` → 4.2.2 [VERIFIED 2026-04-18]
- npm registry: `npm view svelte version` → 5.55.4 [VERIFIED 2026-04-18]
- npm registry: `npm view canvas-confetti version` → 1.9.4 [VERIFIED 2026-04-18]
- npm registry: `npm view lucide-svelte version` → 1.0.1 [VERIFIED 2026-04-18]

### Tertiary (LOW — not used for load-bearing claims)

- Medium / DEV.to blog posts on Tailwind v4 theming — informational only; verified every claim against official docs before citing

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — zero new dependencies; all existing packages verified at registry-current versions
- Architecture: HIGH — three clean patterns (theme store, copy map, conditional DOM), each with codebase precedent
- Pitfalls: HIGH — most are project-specific (Oxide scanner, rune reactivity) and verified against existing components
- Copy / visual spec: HIGH — locked in UI-SPEC by the ui-checker
- Proxy-based `copy` reactivity: MEDIUM — works idiomatically but less-documented than function-call form; A1 flags this

**Research date:** 2026-04-18
**Valid until:** 2026-05-18 (30 days — Tailwind v4 and Svelte 5 are stable; no breaking-change risk in that window)
