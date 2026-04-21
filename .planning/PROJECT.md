# Bullshit Bingo

## What This Is

Bullshit Bingo is a fun multiplayer online mini-game designed to be played during meetings. Players join a shared game session, submit words they expect to hear, and receive a randomly generated bingo board. As buzzwords are spoken during the meeting, players click to mark them off — first to complete a full line wins.

## Core Value

Players can join a live game, mark off buzzwords as they're said, and race to be the first to call "Bingo" — the real-time competitive element is what makes it fun.

## Requirements

### Validated

- ✓ Users can create a new game session and share a join code/link — v1.0 (Phase 1)
- ✓ Users can join an existing game session via code or link — v1.0 (Phase 1)
- ✓ Live presence roster updates in real time — v1.0 (Phase 1)
- ✓ First player is host; non-hosts see waiting state — v1.0 (Phase 1)
- ✓ Expired/unknown room shows clear error — v1.0 (Phase 1)
- ✓ Players can submit words; duplicates rejected; own words removable — v1.0 (Phase 2)
- ✓ Host can seed word pool from starter packs (Corporate Classics, Agile, Sales) — v1.0 (Phase 2)
- ✓ Grid size auto-negotiates from word count (3×3/4×4/5×5) — v1.0 (Phase 2)
- ✓ Host cannot start until minimum word count met — v1.0 (Phase 2)
- ✓ Each player receives a uniquely server-generated bingo board — v1.0 (Phase 3)
- ✓ Boards are private; peers only see mark counts, not layouts — v1.0 (Phase 3)
- ✓ Players can mark cells; marks propagate to peers within ~1s — v1.0 (Phase 3)
- ✓ Server-authoritative win detection (row/col/diagonal, blanks count) — v1.0 (Phase 4)
- ✓ Winner celebration (confetti + announcement); all players see who won — v1.0 (Phase 4)
- ✓ Host can reset for another round without re-joining — v1.0 (Phase 4)
- ✓ Disconnected players resume cleanly via full state snapshot on reconnect — v1.0 (Phase 5)
- ✓ Slot-hold (45s) preserves seat across brief drops and tab closes — v1.0 (Phase 5)
- ✓ Host failover via DO alarm when host exceeds slot-hold window — v1.0 (Phase 5)
- ✓ Tab-background resync triggers on visibilitychange — v1.0 (Phase 5)
- ✓ Dual-mode theming (SFW/NSFW) with persistent toggle, full copy.ts coverage — v1.0 (Phase 6)
- ✓ Branded Logo.svelte, neutral favicon, Impact + Ink Bleed Ring dauber animation — v1.0 (Phase 7)
- ✓ NSFW EndScreen logos, full copy migration, sharpened copy, mobile 375px guard — v1.0 (Phase 8)

### Active

(None — all v1.0 requirements shipped)

### Out of Scope

- Persistent user accounts — anonymous/session-based play only (keeps it frictionless)
- Spectator mode — v2 addition
- Custom board sizes beyond standard options — v2
- Game history / statistics — v2
- Social reactions / near-miss indicators — v2
- QR code join — v2
- Profanity filter — v2
- Dark mode — NSFW mode already ships an alternate palette

## Context

- Shipped v1.0 with ~2,900 LOC TypeScript + Svelte, 432 passing tests (unit + e2e)
- Stack: SvelteKit 2 + Svelte 5 runes, PartyServer 0.4, Cloudflare Durable Objects + Workers, Tailwind v4, Valibot
- Dual-mode: SFW "Buzzword Bingo" (dark, professional) / NSFW "Bullshit Bingo" (parchment, B-U-L-L-S header, dauber stamps)
- Designed for use during video calls / remote meetings — no signup, join by link or code
- DO hibernation with WebSocket Hibernation API means zero cold-start latency and ~$5/mo realistic cost ceiling
- Real-time mark loop confirmed at ~974ms in e2e on wrangler dev

## Constraints

- **Performance**: Must feel instant — marking a word should reflect across all players within ~1 second
- **Accessibility**: No native app — browser-only, works on desktop and mobile
- **Simplicity**: Zero-signup flow — join by link or code, start playing immediately

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Browser-only, no native app | Minimizes friction — open a link during a meeting and play | ✓ Validated v1.0 |
| Anonymous sessions, no auth | No signup barrier; games are ephemeral | ✓ Validated v1.0 — sessionStorage identity works cleanly |
| Real-time via WebSockets | Words marked off must propagate to all players live | ✓ Validated v1.0 — sub-1s presence updates confirmed on mobile |
| SvelteKit + PartyServer + Cloudflare DO | Full stack chosen and validated | ✓ Validated v1.0 — 432 tests green, e2e passing |
| POST /create + guarded /exists for room lifecycle | DOs always initialize on first stub.fetch(); need explicit flag | ✓ v1.0 — prevents ghost rooms |
| pagehide listener for WebSocket disconnect | onDestroy doesn't fire on tab close; iOS Safari holds WS open | ✓ v1.0 — confirmed fix on real device |
| post-build patch-worker.mjs | adapter-cloudflare overwrites src/worker.ts on every build | ✓ v1.0 — script re-injects GameRoom export after build |
| DO hibernation requires full persist+rehydrate | All in-memory state must survive hibernation cycle | ✓ v1.0 — learned from start-game bug in Phase 3 |
| toggleMark reassigns new Set() | In-place .add()/.delete() doesn't trigger Svelte 5 runes reactivity | ✓ v1.0 — Phase 3 pattern |
| Dropped frozen board on EndScreen | Jarring resize during win transition; WinLineIcon + gold chips is cleaner | ✓ v1.0 — confirmed in Phase 4 human-verify |
| Server enriches winDeclared with winningWords[] | Non-winners can't derive from local board (BOAR-03 private layouts) | ✓ v1.0 — Phase 4 |
| Slot-hold = 45s for both players and host | Same window simplifies logic vs. different durations | ✓ v1.0 — Phase 5 |
| playerDisconnected debounce = 3s client-side | Prevents flicker on brief mobile drops | ✓ v1.0 — Phase 5 |
| sessionStorage semantics for RESI-01 | Tab-close doesn't preserve identity; slot-hold is for network drops in open tab | ✓ v1.0 — Phase 5 |
| data-theme="nsfw" attribute on <html> | Single attribute controls entire theme via CSS @layer and Tailwind variant | ✓ v1.0 — Phase 6 |
| copy.ts Proxy for reactive copy map | Svelte 5 $state() + Proxy enables reactive string access without per-key stores | ✓ v1.0 — Phase 6 |
| cssRules inspection for pseudo-element animation e2e | getComputedStyle(::after) needs rendered layout; stylesheet inspection works | ✓ v1.0 — Phase 7 |

## Evolution

This document evolves at phase transitions and milestone boundaries.

---
*Last updated: 2026-04-21 after v1.0 milestone*
