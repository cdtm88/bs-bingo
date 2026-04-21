# Milestones

## v1.0 MVP (Shipped: 2026-04-21)

**Phases completed:** 8 phases, 32 plans, 45 tasks  
**Timeline:** 2026-04-16 → 2026-04-19 (3 days)  
**Lines of code:** ~2,900 TypeScript + Svelte  
**Tests:** 432 passing (unit + e2e)  
**Known deferred items at close:** 3 (see STATE.md Deferred Items)

**Key accomplishments:**

- Full real-time multiplayer room system — create, join by code or link, live presence roster (SvelteKit + PartyServer + Cloudflare Durable Objects)
- Word submission lobby with starter packs, auto-sizing grid tiers (3×3/4×4/5×5), and host-gated game start
- Per-player server-generated bingo boards with Fisher-Yates shuffle; mark loop propagates to all peers within ~1s
- Server-authoritative win detection (row/col/diagonal including blanks), celebration screen, confetti, and host-triggered play-again without re-joining
- Resilience layer: slot-hold (45s), full state snapshot on reconnect, host failover via DO alarm, visibilitychange resync
- Dual-mode theming — SFW "Buzzword Bingo" (dark, professional) / NSFW "Bullshit Bingo" (parchment/burnt-orange, B-U-L-L-S header, dauber stamps, snarky copy) — every string sourced from copy.ts
- Branded Logo.svelte with SFW/NSFW variants, neutral favicon, Impact + Ink Bleed Ring dauber animation, sharpened NSFW copy
- Logos on NSFW EndScreen (winner + loser), full copy.ts migration for all remaining hardcoded strings, mobile 375px guard on join-page divider

---
