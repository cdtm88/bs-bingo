# Phase 8: Add logos to the bullshit versions home page, win page and lose page and dial up the language - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-19
**Phase:** 08 — add-logos-to-the-bullshit-versions-home-page-win-page-and-lo
**Areas discussed:** Win/lose screen logo placement, Loser view copy & tone, Language dial-up targets, Home page NSFW sharpening

---

## Win/lose screen logo placement

| Option | Description | Selected |
|--------|-------------|----------|
| Yes — add logo above the headline | Medium logo above 'CALLED IT!' — branded victory moment | ✓ |
| NSFW only — logo on win, not on lose | Logo for winners only | |
| Both views — logo on win AND lose screens | Branded treatment on both | |
| No — compact header logo is enough | Layout header logo is sufficient | |

**User's choice:** Yes — add logo above the headline

| Option | Description | Selected |
|--------|-------------|----------|
| Medium — between compact and hero | Prominent without competing with headline | ✓ |
| Hero size — same as home page | Big branded moment | |
| Compact — same as header | Small, consistent | |

**User's choice:** Medium — between compact and hero

---

## Loser view copy & tone

| Option | Description | Selected |
|--------|-------------|----------|
| Commiseration — we're all suffering together | Dark solidarity | |
| Light mockery — playful jab | Teasing but good-natured | |
| Deadpan contempt | Dry, corporate, deliberately anticlimactic | ✓ |

**User's choice:** Deadpan contempt

| Option | Description | Selected |
|--------|-------------|----------|
| Yes — same medium logo treatment | Consistent branded moment on both views | ✓ |
| No — loser gets the compact header logo only | Only winners get prominent branding | |

**User's choice:** Yes — same medium logo treatment

---

## Language dial-up targets

| Option | Description | Selected |
|--------|-------------|----------|
| Winner context line: 'You called it.' | Hardcoded in EndScreen — needs NSFW variant | ✓ |
| Loser consolation: 'Nice try. One more round?' | Hardcoded in EndScreen — deadpan contempt treatment | ✓ |
| Host play-again note: 'Word pool and players are kept…' | Hardcoded in EndScreen — needs NSFW variant | ✓ |
| Winner win-line context: '[line] completed.' | Win line description — needs NSFW suffix | ✓ |

**User's choice:** All four hardcoded EndScreen strings get NSFW variants

| Option | Description | Selected |
|--------|-------------|----------|
| Yes — audit and sharpen low-performers | Review all nsfw strings in copy.ts | ✓ |
| No — copy.ts is sharp enough | Only fix hardcoded EndScreen strings | |

**User's choice:** Yes — audit and sharpen low-performers

---

## Home page NSFW sharpening

| Option | Description | Selected |
|--------|-------------|----------|
| 'Join with code' label and placeholder | Hardcoded, needs NSFW variant | ✓ |
| Error messages in the join flow | 'Room not found…' / 'Something went wrong…' | ✓ |
| Neither — home page is sharp enough | Don't touch join flow | |

**User's choice:** Both join-flow string groups

| Option | Description | Selected |
|--------|-------------|----------|
| Stronger tagline / subtext under the logo | More copy beneath the wordmark | |
| The 'or' divider feels too corporate | Irreverent NSFW divider text | |
| Visual treatment — layout or spacing | More bingo-hall feel | |
| All of the above — general polish pass | General NSFW audit on the home page | ✓ |

**User's choice:** All of the above — general polish pass on the NSFW home

---

## Claude's Discretion

- Exact Logo.svelte API for "medium" size — new prop or inline classes
- Specific wording for each NSFW string rewrite
- Whether "or" divider gets copy change, visual treatment, or both
- Additional home-page NSFW detail improvements identified during audit

## Deferred Ideas

None — discussion stayed within phase scope.
