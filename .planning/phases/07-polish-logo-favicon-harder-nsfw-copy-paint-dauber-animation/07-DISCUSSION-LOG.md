# Phase 7: Polish — Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-19
**Phase:** 07-polish-logo-favicon-harder-nsfw-copy-paint-dauber-animation
**Areas discussed:** Logo / Wordmark, Favicon Strategy, Harder NSFW Copy, Paint Dauber Animation

---

## Logo / Wordmark

| Option | Description | Selected |
|--------|-------------|----------|
| Enhanced text CSS | Improve the existing h1 styling — letter-spacing, size, decoration. Zero new assets. | |
| Single adaptive SVG wordmark | New Logo.svelte with inline SVG using currentColor / CSS vars, themes automatically. | |
| Dual-mode SVG lockup | Separate SFW and NSFW logo variants with icon + wordmark. | ✓ |
| SVG icon only | Small icon mark beside the existing h1. | |

**User's choice:** Dual-mode SVG lockup

**Follow-up — Icon concept:**

| Option | Selected |
|--------|----------|
| SFW: grid/checkmark — NSFW: dauber splat | ✓ |
| SFW: grid — NSFW: bingo card | |
| Same icon, different colors | |

**Follow-up — Logo placement:**

| Option | Selected |
|--------|----------|
| Home page only | |
| Home page + persistent header | ✓ |

**Notes:** NSFW dauber splat icon intentionally echoes the board's dauber stamp mark — creates visual coherence. SFW grid/checkmark reads as professional/respectable on shared screens.

---

## Favicon Strategy

| Option | Description | Selected |
|--------|-------------|----------|
| JS dynamic swap on theme toggle | Two favicon files, reactive $derived in layout swaps on toggle. | |
| Single neutral mark | One favicon — bingo grid or abstract mark, safe for shared screens regardless of mode. | ✓ |
| Static PNG only | Fix broken favicon.png reference with one static file. | |

**User's choice:** Single neutral mark

**Notes:** Cover story angle is relevant but user prioritized shared-screen safety over the tab-switching delight feature. JS dynamic swap noted as v2 candidate.

---

## Harder NSFW Copy

| Option | Description | Selected |
|--------|-------------|----------|
| Sharper cynicism (wit-first) | Rewrite mild strings with more specific, darkly amused language. Wit > profanity. | ✓ |
| Targeted profanity injection | Drop precise swears into existing strings. | |
| Expand neutral strings + sharpen | Cover Phase 6 gaps AND sharpen existing strings. Widest scope. | |

**User's choice:** Sharper cynicism (wit-first)

**Follow-up — Tone guardrails:**

| Option | Selected |
|--------|----------|
| Dark office humor only — no personal attacks or protected-class jokes | ✓ |
| No limits — if it's funnier, use it | |

**Notes:** Tone targets meetings and corporate culture, not people. Existing punchy strings ("Hanging on for dear life…", "CALLED IT!") are the quality ceiling to match.

---

## Paint Dauber Animation

| Option | Description | Selected |
|--------|-------------|----------|
| Overshoot/Bounce Settle | 220ms with scale overshoot (1.12x) then settle. CSS keyframes only. | |
| Impact + Ink Bleed Ring | Stamp + expanding ring that fades like ink spreading. New wrapper element required. | ✓ |
| Splat Deformation | Shape morphs on impact via clip-path. High tuning cost, Safari risk. | |

**User's choice:** Impact + Ink Bleed Ring

**Notes:** Max delight option. Requires `.dauber-wrap` wrapper span around existing SVG overlay in `BoardCell.svelte`. `pointer-events-none` chain must be preserved. NSFW only.

---

## Claude's Discretion

- Exact SVG geometry for SFW grid/checkmark icon (favicon and logo)
- Exact SVG path for NSFW dauber splat logo icon (should echo board dauber's irregular circle)
- Favicon format (SVG preferred, PNG fallback)
- Specific per-string NSFW copy rewrites (planner audits full copy.ts bundle)
- Compact persistent header logo placement (layout.svelte vs per-route)

## Deferred Ideas

- JS dynamic favicon swap on theme toggle — declined for Phase 7; v2 candidate
- OG image / social cards — logo SVGs are the right source material but out of scope
- PWA manifest icons — same
- Sound effects on dauber stamp (v2 SOCL-03)
