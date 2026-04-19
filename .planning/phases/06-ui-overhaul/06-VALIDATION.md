---
phase: 6
slug: ui-overhaul
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-18
---

# Phase 6 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 2.1.0 (unit — jsdom) + Playwright 1.49+ (e2e — Chromium) |
| **Config file** | `vitest.config.ts`, `playwright.config.ts` |
| **Quick run command** | `pnpm test:unit` |
| **Full suite command** | `pnpm test` (vitest + playwright) |
| **Estimated runtime** | ~60 seconds (unit ~3s, e2e ~60s) |

---

## Sampling Rate

- **After every task commit:** Run `pnpm test:unit`
- **After every plan wave:** Run `pnpm test` (unit + e2e)
- **Before `/gsd-verify-work`:** Full suite must be green + manual screenshot pass per UI-SPEC screen checklist
- **Max feedback latency:** ~60 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| SC-1a | — | 1 | Design language | — | No hardcoded hex colors | unit (grep) | `pnpm test:unit -- --run theme-hardcoded.test.ts` | ❌ Wave 0 | ⬜ pending |
| SC-1b | — | 1 | Theme attribute | — | `<html data-theme="sfw">` on load; flips on toggle | e2e | `pnpm test:e2e -- theme-toggle.spec.ts` | ❌ Wave 0 | ⬜ pending |
| SC-1c | — | 1 | Copy sourced | — | No user-facing strings hardcoded in components | unit (grep) | `pnpm test:unit -- --run copy-extraction.test.ts` | ❌ Wave 0 | ⬜ pending |
| SC-2 | — | 1 | Home frictionless | — | Home renders tagline + CTA + ThemeToggle in viewport | e2e | `pnpm test:e2e -- home-first-visit.spec.ts` | ❌ Wave 0 | ⬜ pending |
| SC-3a | — | 2 | Lobby readable | — | Pack pills, word pool, roster, grid visible at 375px | e2e | `pnpm test:e2e -- narrow-viewport.spec.ts` | ❌ Wave 0 | ⬜ pending |
| SC-3b | — | 2 | BoardHeader NSFW | — | B·U·L·L·S renders when `theme=nsfw`; absent in SFW | unit | `pnpm test:unit -- --run BoardHeader.test.ts` | ❌ Wave 0 | ⬜ pending |
| SC-3c | — | 2 | Dauber mark toggle | — | NSFW cell click adds stamp; second click removes it | unit + e2e | `BoardCell.test.ts` extend | partial | ⬜ pending |
| SC-4a | — | 2 | Confetti palette | — | Confetti palette swaps per theme | unit | `pnpm test:unit -- --run room-store.test.ts` extend | partial | ⬜ pending |
| SC-4b | — | 2 | End screen copy | — | `CALLED IT!` vs `BINGO!` per theme | unit | `EndScreen.test.ts` extend | partial | ⬜ pending |
| SC-5 | — | 1 | Zero-instruction onboard | — | First-visit home: brand + tagline + CTA + toggle visible | e2e | `home-first-visit.spec.ts` | ❌ Wave 0 | ⬜ pending |
| Toggle-P | — | 1 | Theme persistence | — | `localStorage.theme` round-trips; reload retains theme | e2e | `theme-toggle.spec.ts` | ❌ Wave 0 | ⬜ pending |
| Regression | — | all | No regressions | — | Phase 1–5 Playwright specs still pass | e2e | `pnpm test:e2e` | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/unit/theme.test.ts` — theme store: initial state, localStorage round-trip, SSR guard, `toggle()` flips current
- [ ] `tests/unit/copy.test.ts` — copy module: SFW defaults, NSFW values, interpolation functions (winnerSubhead etc.)
- [ ] `tests/unit/BoardHeader.test.ts` — renders B·U·L·L·S for size 5, B·U·L·L for 4, B·S for 3
- [ ] `e2e/theme-toggle.spec.ts` — toggle click flips `data-theme`; reload retains theme; toggle visible on every route
- [ ] `e2e/home-first-visit.spec.ts` — brand + tagline + CTA + toggle all visible above the fold
- [ ] `e2e/narrow-viewport.spec.ts` — iPhone SE (375px) check: ThemeToggle doesn't overlap interactive elements

*No framework install needed — Vitest + Playwright already configured and used in Phases 1–5.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Visual cohesion across screens | SC-1 | Subjective design quality | Screenshot each screen in SFW + NSFW; compare against UI-SPEC mockups |
| End screen emotional impact | SC-4 | Subjective delight | Manually trigger win state; verify confetti + copy feel satisfying |
| Dauber stamp SVG appearance | SC-3 | Visual quality | Inspect stamp SVG path in browser; verify wobble effect |
| ThemeToggle 375px overlap | SC-3 | Edge case UX | Open iPhone SE viewport; verify toggle doesn't overlap game controls |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 60s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
