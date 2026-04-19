---
phase: 7
slug: polish-logo-favicon-harder-nsfw-copy-paint-dauber-animation
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-19
---

# Phase 7 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 2.x + Playwright |
| **Config file** | `vitest.config.ts` |
| **Quick run command** | `pnpm test run --reporter=verbose` |
| **Full suite command** | `pnpm test run && pnpm exec playwright test` |
| **Estimated runtime** | ~15 seconds (unit), ~45 seconds (E2E) |

---

## Sampling Rate

- **After every task commit:** Run `pnpm test run --reporter=verbose`
- **After every plan wave:** Run `pnpm test run && pnpm exec playwright test`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds (unit), 45 seconds (E2E)

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Deliverable | Test Type | Automated Command | Status |
|---------|------|------|-------------|-----------|-------------------|--------|
| 07-01-01 | logo | 1 | Logo.svelte component renders both variants | unit | `pnpm test run Logo` | ⬜ pending |
| 07-01-02 | logo | 1 | Logo appears in +layout.svelte header | unit | `pnpm test run layout` | ⬜ pending |
| 07-01-03 | logo | 1 | Home page hero logo renders | E2E | `pnpm exec playwright test home` | ⬜ pending |
| 07-02-01 | favicon | 1 | static/favicon.svg exists | file check | `test -f static/favicon.svg` | ⬜ pending |
| 07-02-02 | favicon | 1 | app.html references correct favicon | grep | `grep favicon src/app.html` | ⬜ pending |
| 07-03-01 | copy | 1 | NSFW strings changed (no mild strings remain) | unit | `pnpm test run copy` | ⬜ pending |
| 07-04-01 | dauber | 2 | dauber-wrap class present in BoardCell | unit | `pnpm test run BoardCell` | ⬜ pending |
| 07-04-02 | dauber | 2 | dauberBleed keyframes in app.css | grep | `grep dauberBleed src/app.css` | ⬜ pending |
| 07-04-03 | dauber | 2 | Marked cell click still toggles (pointer-events regression) | E2E | `pnpm exec playwright test board` | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] Existing `src/lib/copy.test.ts` — update expected NSFW string values after rewrite
- [ ] Existing `src/lib/components/BoardCell.test.ts` — add test for `.dauber-wrap` presence
- [ ] New `src/lib/components/Logo.test.ts` — unit tests for SFW/NSFW variant rendering

*Existing Vitest infrastructure covers all phase requirements — no new framework install needed.*

---

## Manual-Only Verifications

| Behavior | Why Manual | Test Instructions |
|----------|------------|-------------------|
| Logo renders correctly at hero size (home page) | Visual QA | Navigate to home, verify logo icon + wordmark in both SFW and NSFW modes |
| Logo renders correctly at compact size (all screens) | Visual QA | Navigate to lobby/board/end, verify compact logo in header |
| Dauber bleed ring animation feels tactile | Animation feel | Mark a cell in NSFW mode, verify stamp + bleed ring timing |
| Favicon appears in browser tab | Browser chrome | Load app, check tab icon matches expected neutral mark |
| NSFW copy reads as sharp/funny | Copy QA | Toggle to NSFW mode, read through all UI states |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 45s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
