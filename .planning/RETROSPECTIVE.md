# Project Retrospective

*A living document updated after each milestone. Lessons feed forward into future planning.*

---

## Milestone: v1.0 — MVP

**Shipped:** 2026-04-21  
**Phases:** 8 | **Plans:** 32 | **Timeline:** 3 days (2026-04-16 → 2026-04-19)

### What Was Built

- Full multiplayer real-time bingo game on Cloudflare Durable Objects + SvelteKit
- Word submission lobby with starter packs and auto-sizing grids
- Server-authoritative win detection, celebration screen, play-again loop
- Resilience layer: slot-hold, full state reconnect, host failover, visibilitychange resync
- Dual-mode theming (SFW/NSFW) with complete copy.ts abstraction and per-theme palette
- Branded logo, favicon, Impact + Ink Bleed Ring dauber animation, full copy polish

### What Worked

- Plans-first approach: every plan had clear success criteria before execution started — minimal backtracking
- Svelte 5 runes + Tailwind v4 proved fast to iterate: theme switching via single `data-theme` attribute was elegant
- DO hibernation + WebSocket Hibernation API handled the resilience requirements cleanly — no Node process to manage
- copy.ts Proxy pattern enabled reactive, theme-aware strings without per-key stores — scales well

### What Was Inefficient

- SUMMARY.md one-liner extraction by gsd-tools failed (files used varied heading formats) — required manual cleanup of MILESTONES.md
- Phases 7 and 8 marked `roadmap_complete: false` by gsd-tools despite all plans having SUMMARYs — likely a ROADMAP.md format mismatch after inline phase additions
- debug artifacts accumulated without closing (3 deferred items) — worth resolving inline rather than deferring

### Patterns Established

- `post-build patch-worker.mjs` for adapter-cloudflare DO re-injection (required every build)
- `new Set(...)` reassignment pattern for Svelte 5 runes reactivity on Set mutations
- `cssRules` stylesheet inspection for pseudo-element animation e2e tests
- Server enriches win broadcast with `winningWords[]` so non-winners with private boards can display the winning line
- `data-theme="nsfw"` on `<html>` as single source of truth for all theme-aware CSS

### Key Lessons

1. DO hibernation state must be fully serialized — any in-memory shortcut breaks on wake
2. Human verify checkpoints caught real UX issues (frozen board on EndScreen) that automated tests wouldn't — keep them
3. copy.ts abstraction pays off in phases 6-8: centralizing strings before adding themes is the right order
4. slot-hold window symmetry (same duration for players and hosts) simplifies logic with no meaningful UX tradeoff

### Cost Observations

- Model mix: standard quality profile throughout
- Sessions: ~8-10 sessions across 3 days
- Notable: tight plan granularity (32 plans over 8 phases) kept each execution unit small and reviewable

---

## Cross-Milestone Trends

| Metric | v1.0 |
|--------|------|
| Phases | 8 |
| Plans | 32 |
| Tests | 432 |
| Days | 3 |
| Deferred items | 3 |
