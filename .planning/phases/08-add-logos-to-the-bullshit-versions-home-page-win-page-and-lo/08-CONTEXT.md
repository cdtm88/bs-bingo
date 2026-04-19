# Phase 8: Add logos to the bullshit versions home page, win page and lose page and dial up the language - Context

**Gathered:** 2026-04-19
**Status:** Ready for planning

<domain>
## Phase Boundary

Branded end-screen moments + language sharpening across NSFW mode. Specific deliverables:

1. **Medium logo on win/lose screens** — a prominent brand mark above the win headline and above the loser content, in NSFW mode.
2. **Hardcoded end-screen strings → copy.ts** — move 4 mode-neutral hardcoded strings in `EndScreen.svelte` into `copy.ts` with NSFW variants.
3. **NSFW copy audit** — review all strings in `copy.ts` nsfw bundle; sharpen any that read as mild or generic vs. the quality ceiling.
4. **Home page NSFW polish pass** — join-flow strings (label, placeholder, error messages), the "or" divider, and a general audit of anything that still reads as generic SaaS in NSFW mode.

No game logic, WebSocket protocol, or server changes. No new gameplay features.

</domain>

<decisions>
## Implementation Decisions

### End Screen — Logo

- **D-01:** Add a medium-size logo (between compact and hero) to `EndScreen.svelte`, above the win headline on the winner view and above the loser content on the non-winner view.
  - This is in addition to the compact fixed header logo already present via `+layout.svelte`. It is a deliberate second, larger branded moment.
  - NSFW mode only — the existing SFW EndScreen layout is unchanged.
  - The `Logo.svelte` component already exists. Either add a new `size="medium"` prop or use inline size classes directly in EndScreen (planner's discretion — keep it clean).

### End Screen — Loser Tone

- **D-02:** NSFW loser tone is **deadpan contempt** — dry, corporate, deliberately anticlimactic. Examples: "You lost. The meeting continues." / "They got it. The suffering hasn't ended." Not mean, just matter-of-fact.
- **D-03:** Loser view gets the same medium logo treatment as the winner view (D-01).

### End Screen — Hardcoded Strings → copy.ts

All four currently hardcoded strings in `EndScreen.svelte` must be moved to `copy.ts` with NSFW variants:

- **D-04:** `"You called it."` (winner view, win-line context) → NSFW variant in deadpan-celebratory register. e.g. `"You clocked it."` / `"Saw it coming."`
- **D-05:** `"Nice try. One more round?"` (non-winner consolation) → NSFW deadpan contempt. e.g. `"You lost. The meeting continues."` / `"Better luck at the next pointless sync."`
- **D-06:** `"Word pool and players are kept. You can tweak the pool before starting."` (host play-again note) → NSFW variant. e.g. `"Same suspects, same pool. Add more ammo before you start."` / `"Pool's still loaded. Add more if you need to."`
- **D-07:** Win-line context `"[line] completed."` (non-winner view) → NSFW variant. e.g. `"[line]. Done."` / `"[line]. And you missed it."` — keep the dynamic line label, just sharpen the suffix.

### NSFW Copy Audit — copy.ts

- **D-08:** Full audit of the `nsfw` bundle in `src/lib/copy.ts`. Planner reads every key and identifies strings that score low on wit/specificity vs. the quality ceiling (`"Hanging on for dear life…"`, `"CALLED IT!"`, `"Back into the grinder"`).
- **D-09:** Sharpen low-performers in place. Tone reference unchanged from Phase 7: jaded office worker, wit-first cynicism, dark humor targeting meetings and corporate culture. No personal attacks, no protected-class references.

### Home Page — Join Flow Strings

- **D-10:** `"Join with code"` label and `"ABC234"` placeholder are hardcoded in `+page.svelte`. Move to `copy.ts` with NSFW variants. e.g. label: `"Got a code?"`, placeholder: `"ABC234"` (placeholder can stay neutral — it's a format hint, not copy).
- **D-11:** Error messages in the join modal flow are hardcoded in `+page.svelte`:
  - `"Room not found. Check the code and try again."` → NSFW e.g. `"Room's gone or that code's wrong. Try again."` / `"Dead end. Double-check that code."`
  - `"Something went wrong. Try again."` → NSFW e.g. `"Something broke. Not ideal. Try again."` / `"The gremlins got it. Try again."`
  These move to `copy.ts`.

### Home Page — General NSFW Polish Pass

- **D-12:** General NSFW polish pass on `+page.svelte`. Planner audits the home page in NSFW mode and improves anything that still reads as generic SaaS:
  - The `"or"` divider between Create and Join buttons — could be something more irreverent (e.g. `"or drag someone in"` / `"or"` stays but styled differently).
  - Overall layout/vibe — more bingo-hall / bar-napkin feel. Any spacing, typographic, or copy choices that feel too polished for the NSFW tone should be adjusted.
  - Planner has discretion on specific improvements within this brief.

### Claude's Discretion

- Exact `Logo.svelte` API change for "medium" size — add a new size prop or use inline classes in EndScreen; whichever is cleaner.
- Specific wording for each NSFW string rewrite — direction is captured in D-04 through D-11; planner writes the final strings.
- Whether the "or" divider on the home page gets a copy change, a visual treatment, or both.
- Any additional home-page NSFW detail improvements the planner identifies during the audit.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Components & Copy
- `src/lib/components/EndScreen.svelte` — Current end-screen implementation; all 4 hardcoded strings to migrate are in this file.
- `src/lib/copy.ts` — Single source of truth for all NSFW strings. All new strings go here. Planner reads the full nsfw bundle.
- `src/lib/components/Logo.svelte` — Existing dual-mode Logo component; planner adds medium-size support here.
- `src/routes/+page.svelte` — Home page; hardcoded join-flow strings to migrate are in this file.
- `src/routes/+layout.svelte` — Compact header logo implementation (reference pattern for how logo is already used).

### Prior Phase Context
- `.planning/phases/07-polish-logo-favicon-harder-nsfw-copy-paint-dauber-animation/07-CONTEXT.md` — All Phase 7 decisions: dual-mode logo design, SVG paths, NSFW copy tone direction (D-06 through D-09), quality ceiling references.
- `.planning/phases/06-ui-overhaul/06-CONTEXT.md` — All Phase 6 decisions: NSFW palette tokens, `[data-theme="nsfw"]` CSS architecture, copy module pattern (D-14).

### Design System
- `src/app.css` — CSS custom properties; all component styling uses `var(--color-*)` tokens.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `Logo.svelte` — Already has `hero` and `compact` sizes. Adding `medium` is a small prop extension (icon ~w-8 h-8, wordmark ~text-xl or text-2xl).
- `copy.ts` — Proxy pattern already established; adding new keys to both `sfw` and `nsfw` bundles is the correct extension pattern. The `CopyKey` type is derived automatically from `typeof STRINGS.sfw`.

### Established Patterns
- All user-facing strings route through `copy.ts` — new strings follow the same pattern, no inline ternaries in components.
- CSS custom property tokens (`var(--color-*)`) flip automatically under `[data-theme="nsfw"]` — Logo uses `var(--color-accent)` already.
- `winnerSubhead()` and `nonWinnerSubhead()` in `copy.ts` show the pattern for dynamic strings that need name interpolation.

### Integration Points
- `src/lib/components/EndScreen.svelte` — Add Logo import, add medium-size logo block at top of the section; migrate 4 hardcoded strings to copy.ts keys.
- `src/lib/copy.ts` — Add new keys to both `sfw` and `nsfw` bundles for all migrated strings.
- `src/routes/+page.svelte` — Migrate join-flow hardcoded strings to copy.ts; apply NSFW polish pass.

</code_context>

<specifics>
## Specific Ideas

- The medium logo on the win screen should precede "CALLED IT!" — making it feel like a Bullshit Bingo brand moment, not just a generic game result.
- Deadpan contempt tone for losers: the joke is that losing feels like the meeting itself — pointless, ongoing, something to survive. "You lost. The meeting continues." captures this perfectly.
- The "or" divider on the home page in NSFW mode could read as `"or show up uninvited"` instead of just `"or"` — a small touch that reinforces the NSFW voice.
- The host play-again note `"Word pool and players are kept…"` in NSFW mode: `"Same suspects, same pool. Add more ammo before you start."` — keeps the utility info but sounds like the game.

</specifics>

<deferred>
## Deferred Ideas

- None — discussion stayed within phase scope.

</deferred>

---

*Phase: 08-add-logos-to-the-bullshit-versions-home-page-win-page-and-lo*
*Context gathered: 2026-04-19*
