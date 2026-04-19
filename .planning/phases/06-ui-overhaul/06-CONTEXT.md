# Phase 6: UI Overhaul - Context

**Gathered:** 2026-04-18
**Status:** Ready for planning

<domain>
## Phase Boundary

Dual-mode design system: a safe-for-work "Buzzword Bingo" mode (dark, current palette) and an NSFW "Bullshit Bingo" mode (warm parchment, browns + burnt orange, classic bingo card aesthetic, deep snarky copy). Every screen — home, lobby, board, end — gets polished under both modes. No new gameplay features.

</domain>

<decisions>
## Implementation Decisions

### Theme Architecture

- **D-01:** Two named modes — `sfw` ("Buzzword Bingo", current dark palette) and `nsfw` ("Bullshit Bingo", warm parchment/orange palette). Modes differ in color tokens, the board visual, and copy strings. Game state, WebSocket protocol, and all logic are untouched.
- **D-02:** Per-device toggle, stored in `localStorage`. Each player independently chooses their mode. The game is not aware of any player's mode — only the UI layer cares. No server changes.
- **D-03:** SFW is the default. NSFW requires deliberate opt-in. On first visit, `localStorage` has no entry → defaults to `sfw`.

### Toggle UX

- **D-04:** Toggle is accessible on ALL screens (home, lobby, board, end) — not just the home page. A player must be able to panic-toggle mid-meeting without navigating away. Placement: persistent in the page footer or a fixed corner element.
- **D-05:** Toggle framing: **"Professional Mode"** with a 💼 icon. Toggle ON = SFW/Buzzword Bingo (the labeled state). Toggle OFF = NSFW/Bullshit Bingo. This makes the plausible cover story the visible state — at a glance, anyone seeing the toggle sees "Professional Mode: on".

### SFW Mode ("Buzzword Bingo")

- **D-06:** Current dark palette unchanged — `#0F0F14` bg, `#F5D547` accent, Inter + Space Grotesk fonts. No visual overhaul needed for SFW mode.
- **D-07:** Title rebranded from "Bullshit Bingo" → "Buzzword Bingo" throughout (page title, wordmark, tab title). All other copy stays as-is in SFW mode.

### NSFW Mode ("Bullshit Bingo") — Visual Palette

- **D-08:** Warm parchment palette, applied via `[data-theme="nsfw"]` CSS custom property overrides on `<html>`:
  - `--color-bg`: `#F5EDD6` (warm parchment — page background)
  - `--color-surface`: `#E8D9B0` (manila tan — cards, surfaces)
  - `--color-divider`: `#C9A96B` (warm gold — borders)
  - `--color-accent`: `#D4520A` (burnt orange — primary CTAs, host crown, room code)
  - `--color-destructive`: `#C0392B` (deep red)
  - `--color-ink-primary`: `#2C1810` (dark espresso brown — body text)
  - `--color-ink-secondary`: `#7A4F2A` (mid brown — hints, secondary text)
  - `--color-ink-disabled`: `#B8956A` (light tan — disabled states)
  - `--color-ink-inverse`: `#F5EDD6` (parchment — text on accent buttons)
  - Fonts unchanged (Inter + Space Grotesk still correct — Space Grotesk on warm parchment reads like a retro bingo hall poster).
- **D-09:** The overall vibe is bingo hall meets bar napkin — warm, low-fi, slightly chaotic. Not polished SaaS. The palette intentionally feels a little grubby and fun.

### NSFW Mode ("Bullshit Bingo") — Board Identity

- **D-10:** Classic bingo card treatment in NSFW mode:
  - Board header row: **"B · U · L · L · S"** across the five columns (for 5×5), **"B · U · L · L"** for 4×4, **"B · S"** or **"B-S"** abbreviated for 3×3. Header cells use dark brown ink on slightly darker surface.
  - Grid: cream/parchment cells with visible brown border lines — the "card" aesthetic.
  - **Dauber stamp mark style**: When a cell is marked, show a large semi-transparent burnt orange circular splat (like a real bingo dauber) overlaid on the cell, rather than the subtle fill used in SFW. The word text remains legible beneath/over the dauber.
  - Blank cells: shown as a filled parchment square with a subtle crosshatch or dot texture (Claude's discretion on exact treatment — should read as "blank" without being ugly).
  - Win line: keep the yellow glow ring from SFW → swap to a pulsing burnt orange ring in NSFW, same animation, different color.

### NSFW Mode ("Bullshit Bingo") — Copy

- **D-11:** Deep copy overhaul throughout NSFW mode. Every string that can be funnier, is. Key strings:

  | Location | SFW copy | NSFW copy |
  |----------|----------|-----------|
  | App name | Buzzword Bingo | Bullshit Bingo |
  | Home tagline | (neutral) | "For meetings that could've been an email." |
  | Lobby waiting hint | "Waiting for players…" | "Who's ready to suffer?" |
  | Word input placeholder | "Add a buzzword…" | "What corporate BS will they say?" |
  | Host start button | "Start game" | "Start the suffering" |
  | Non-host waiting | "Waiting for host to start…" | "Waiting for someone to pull the trigger…" |
  | Win announcement | "BINGO!" | "CALLED IT!" |
  | Winner subhead | "[Name] wins!" | "[Name] called Bullshit." |
  | Non-winner subhead | "[Name] called Bingo!" | "[Name] called it before you." |
  | Reconnecting banner | "Reconnecting…" | "Hanging on for dear life…" |
  | Error page heading | "Room not found" | "That room's gone." |
  | Error page body | "This room doesn't exist or has already ended." | "Probably for the best. Go find another meeting to survive." |
  | Play again CTA | "Start new game" | "Do it again" |
  | Starter pack: Corporate Classics | "Corporate Classics" | "Corporate Classics (the greatest hits)" |
  | Starter pack: Agile | "Agile" | "Agile (🙄)" |
  | Starter pack: Sales | "Sales" | "Sales (you poor soul)" |

### Technical Implementation

- **D-12:** CSS custom property swap via `[data-theme="nsfw"]` attribute on `<html>`. All `--color-*` tokens override at this selector. Tailwind v4 custom properties compose correctly with this pattern — no Tailwind config changes needed, all existing utility classes automatically pick up the overridden vars.
- **D-13:** Theme store at `src/lib/stores/theme.svelte.ts` — `$state<'sfw' | 'nsfw'>('sfw')`, initialized from `localStorage.getItem('theme')` on first read (client-side only, with SSR guard), persisted on every change. Store applies `data-theme` to `document.documentElement`.
- **D-14:** Copy handled via a dedicated copy module — `src/lib/copy.ts` — that exports a single `copy(key, theme)` function (or a reactive object driven by the theme store). Components import copy by key rather than scattering inline ternaries. This keeps the copy set maintainable as one file.
- **D-15:** Board header ("B-U-L-L-S") is a new `BoardHeader.svelte` component rendered in NSFW mode only (theme-conditional in the board layout). Dauber stamp is an NSFW-conditional style in `BoardCell.svelte`.

### Claude's Discretion

- Exact dauber stamp CSS implementation (SVG overlay vs. radial-gradient pseudo-element vs. absolutely-positioned `<span>`) — use whatever renders correctly on mobile with no layout shift.
- Blank cell texture in NSFW mode.
- Exact toggle placement (footer vs. fixed bottom-right corner) — whichever keeps it accessible on mobile without overlapping board cells.
- Confetti in NSFW mode: consider whether the existing `canvas-confetti` call should get a different color palette (burnt oranges/browns instead of defaults). Minor, but thematic.
- Animation/transition on mode switch — could be a brief fade-through or instant. Instant is fine.
- `<title>` and `<meta name="description">` should reflect the active mode name.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Design System Baseline (SFW)
- `.planning/phases/01-foundation-transport-room-lobby-presence/01-UI-SPEC.md` — All SFW color tokens, spacing scale, typography, component inventory. These are the SFW defaults that the NSFW palette overrides.

### Phase Requirements
- `.planning/REQUIREMENTS.md` — No new requirements for Phase 6 (all v1 requirements validated in phases 1–5). Phase 6 is pure visual polish.
- `.planning/PROJECT.md` — Core constraints: zero-signup, browser-only, sub-1s performance. Visual overhaul must not regress these.

### Prior Phase Decisions
- `.planning/phases/04-win-detection-announcement-play-again/04-CONTEXT.md` — D-02, D-03, D-04 describe the win/end screen (confetti, EndScreen component, WinLineIcon). NSFW overhaul builds on top of this.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/app.css` — `@theme` block with all current CSS custom properties. NSFW override block goes here as `[data-theme="nsfw"] { ... }`.
- `src/lib/components/` — All 13 components (Button, Board, BoardCell, EndScreen, ErrorPage, Modal, TextInput, Badge, Banner, GridProgress, PackPills, PlayerRow, WinLineIcon, WordChip, WordPool) are already built. Phase 6 modifies visual styles and adds NSFW-conditional elements; it does not rebuild components from scratch.
- `src/routes/+layout.svelte` — Apply `data-theme` attribute here so it wraps the entire app tree.

### Established Patterns
- All components already use CSS custom properties via `var(--color-*)` — the swap approach works without touching component markup.
- Svelte 5 `$state` runes in `.svelte.ts` files are the established store pattern (see existing `src/lib/session.ts` for the `localStorage` persistence pattern).

### Integration Points
- `src/routes/+layout.svelte` — theme store initialization (SSR guard: `if (browser)`) and `data-theme` application.
- `src/app.css` — NSFW `[data-theme="nsfw"]` CSS block.
- Every component that renders text — reads from `copy.ts` module rather than hardcoded strings.

</code_context>

<specifics>
## Specific Ideas

- The "Professional Mode 💼" toggle is the key UX joke — it is itself the bit. The toggle being ON reads as "I am being professional right now" while hiding the chaos underneath.
- "B · U · L · L · S" across the board header is the biggest single visual payoff. It should be prominent enough to read at a glance.
- The dauber stamp should feel tactile — a slightly irregular circle (not a perfect CSS border-radius) would reinforce the analog bingo-hall feel. SVG with a slight hand-drawn quality is ideal.
- NSFW tagline "For meetings that could've been an email." goes on the home page under the wordmark — same position as whatever neutral tagline currently occupies that space.

</specifics>

<deferred>
## Deferred Ideas

- Sound effects on mark and win (v2 — listed in REQUIREMENTS.md §Social SOCL-03)
- Near-miss indicator (v2 — SOCL-02)
- QR code for join link (v2 — ACCE-01)
- Dark mode toggle for NSFW mode (the NSFW palette is light — if this ever gets a dark variant, that's v2)
- "BS detector" meter / running tally during the game — fun idea surfaced during discussion, out of Phase 6 scope

</deferred>

---

*Phase: 06-ui-overhaul*
*Context gathered: 2026-04-18*
