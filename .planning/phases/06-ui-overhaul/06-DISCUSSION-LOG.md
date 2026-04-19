# Phase 6: UI Overhaul - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-18
**Phase:** 06-ui-overhaul
**Areas discussed:** Theme architecture, Toggle UX, Board identity, Copy depth

---

## Theme Architecture

| Option | Description | Selected |
|--------|-------------|----------|
| Single dark theme, polished | Polish within current palette only | |
| Dual-mode: SFW + NSFW | Two full design modes behind a toggle | ✓ |

**User's choice:** Dual-mode — SFW "Buzzword Bingo" (dark, current palette) + NSFW "Bullshit Bingo" (warm parchment/orange palette).
**Notes:** User defined this direction upfront. SFW is the default (safe for open monitors). NSFW is opt-in. The rebrand to "Buzzword Bingo" in SFW mode is a deliberate cover-story feature, not a compromise.

---

## Mode Sync (Per-device vs. Per-room)

| Option | Description | Selected |
|--------|-------------|----------|
| Per-device (localStorage) | Each player picks their own mode independently | ✓ |
| Host sets mode for the room | Host toggles, all players switch simultaneously | |

**User's choice:** Per-device.
**Notes:** Game state and server are untouched — mode is purely a client-side presentation preference.

---

## Copy Depth in NSFW Mode

| Option | Description | Selected |
|--------|-------------|----------|
| Deep — lean in everywhere | Every string that can be funnier, is | ✓ |
| Surface — title + win screen only | NSFW treatment on name and win state only | |

**User's choice:** Deep — tagline, helper text, empty states, win screen, reconnecting banner, error page, starter pack names.

---

## Board Identity in NSFW Mode

| Option | Description | Selected |
|--------|-------------|----------|
| Classic bingo card | Cream card, "B-U-L-L-S" header, dauber stamp marks | ✓ |
| Warm palette only | Current board structure, warm colors applied | |

**User's choice:** Classic bingo card treatment. "B-U-L-L-S" header, dauber splat marks, brown grid lines, parchment cells.

---

## Claude's Discretion

- Exact toggle placement (footer vs. fixed corner)
- Dauber stamp CSS implementation (SVG vs. pseudo-element)
- Blank cell texture in NSFW mode
- Confetti color palette in NSFW mode
- Mode-switch animation (instant vs. fade)

## Deferred Ideas

- Sound effects (v2 — SOCL-03)
- Near-miss indicator (v2 — SOCL-02)
- QR code (v2 — ACCE-01)
- "BS detector" running meter — surfaced during discussion, deferred
- Dark variant of NSFW mode
