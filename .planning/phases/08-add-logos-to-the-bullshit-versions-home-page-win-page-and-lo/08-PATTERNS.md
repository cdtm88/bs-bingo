# Phase 8: Add logos to the bullshit versions home page, win page and lose page and dial up the language - Pattern Map

**Mapped:** 2026-04-19
**Files analyzed:** 4 modified files
**Analogs found:** 4 / 4 (all self-referential — these are the canonical files being modified)

---

## File Classification

| Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `src/lib/components/Logo.svelte` | component | transform (prop → render) | itself — extend existing `size` prop union | exact |
| `src/lib/components/EndScreen.svelte` | component | request-response (game state → display) | `src/routes/+layout.svelte` for Logo usage pattern | role-match |
| `src/lib/copy.ts` | utility / data | transform (theme → string) | itself — extend existing `sfw`/`nsfw` bundles | exact |
| `src/routes/+page.svelte` | route/component | request-response (user input → navigation) | itself — migrate hardcoded strings to `copy` proxy | exact |

---

## Pattern Assignments

### `src/lib/components/Logo.svelte` (component, transform)

**Change:** Add `"medium"` to the `Size` union. Medium sits between compact (`w-5 h-5` icon, `text-base` wordmark) and hero (`w-12 h-12` / `w-14 h-14` icon, `text-[40px]`/`text-[56px]` wordmark). Target: icon ~`w-8 h-8`, wordmark ~`text-2xl sm:text-3xl`, non-linked block layout (not an `<a>` tag — it's a brand moment, not nav).

**Existing size prop pattern** (lines 6-7):
```typescript
type Size = "hero" | "compact";
let { size = "compact" }: { size?: Size } = $props();
```
Extend to:
```typescript
type Size = "hero" | "medium" | "compact";
let { size = "compact" }: { size?: Size } = $props();
```

**Existing hero block pattern** (lines 13-41) — medium mirrors hero structure but without `<header>` semantics (use `<div>`) and with scaled-down icon/text sizes:
```svelte
{#if size === "hero"}
  <header class="text-center flex items-center justify-center gap-3 sm:gap-4">
    <!-- SVG icon w-12 h-12 sm:w-14 sm:h-14 -->
    <h1 class="font-display text-[40px] sm:text-[56px] font-semibold leading-[1.1]">
      {copy.brand}<span class="text-[var(--color-accent)]">.</span>
    </h1>
  </header>
```

**Medium size target classes:**
- NSFW dauber SVG: `w-8 h-8` (matches `w-12 h-12` hero scaled down)
- SFW grid SVG: `w-8 h-8`
- Wordmark: `font-display text-2xl sm:text-3xl font-semibold leading-[1.1]`
- Container: `flex items-center justify-center gap-3`

**CSS token pattern** (used throughout) — all color references use tokens:
```svelte
fill="var(--color-accent)"
class="text-[var(--color-accent)]"
```

---

### `src/lib/components/EndScreen.svelte` (component, request-response)

**Changes:**
1. Import `Logo` and add medium logo block above winner headline (NSFW only) and above loser content (NSFW only)
2. Migrate 4 hardcoded strings to `copy.*` keys

**Existing import pattern** (lines 1-6):
```typescript
import type { BoardCell, WinningLine } from "$lib/protocol/messages";
import WinLineIcon from "./WinLineIcon.svelte";
import Button from "./Button.svelte";
import { formatWinLine } from "$lib/util/winLine";
import { copy, winnerSubhead, nonWinnerSubhead } from "$lib/copy";
```
Add: `import Logo from "./Logo.svelte";`

**Theme-conditioned rendering pattern** — no inline ternaries in template; use `{#if isNsfw}` blocks. Derive `isNsfw` from theme store (same pattern as `Logo.svelte` lines 10-11):
```typescript
import { theme } from "$lib/stores/theme.svelte";
const isNsfw = $derived(theme.current === "nsfw");
```

**Logo placement pattern** (from `+layout.svelte` lines 43-44 for compact; hero from `+page.svelte` line 84):
```svelte
<Logo size="medium" />
```
Place this inside `{#if isNsfw}` blocks:
- Winner view: immediately before the `<h1>` on line 34
- Non-winner view: immediately before the `<h1>` on line 43

**Hardcoded strings to migrate** — current locations:

| Line | Current hardcode | New copy key |
|---|---|---|
| 54 | `"You called it."` (inline in expression) | `copy.winLineContext` |
| 54 | `" completed."` (inline in expression) | `copy.nonWinnerLineContext` |
| 71 | `"Nice try. One more round?"` | `copy.nonWinnerConsolation` |
| 80 | `"Word pool and players are kept. You can tweak the pool before starting."` | `copy.playAgainNote` |

**Current string expression pattern** (line 54):
```svelte
<p class="text-base text-[var(--color-ink-secondary)]">
  {isWinner ? "You called it." : ""} {winLineLabel}{isWinner ? "." : " completed."}
</p>
```
After migration:
```svelte
<p class="text-base text-[var(--color-ink-secondary)]">
  {isWinner ? copy.winLineContext : ""} {winLineLabel}{isWinner ? "." : copy.nonWinnerLineContext}
</p>
```

**Current non-winner consolation** (line 71):
```svelte
<p class="text-base text-[var(--color-ink-secondary)]">Nice try. One more round?</p>
```
After: `{copy.nonWinnerConsolation}`

**Current host note** (line 80):
```svelte
<p class="text-sm text-[var(--color-ink-secondary)]">
  Word pool and players are kept. You can tweak the pool before starting.
</p>
```
After: `{copy.playAgainNote}`

---

### `src/lib/copy.ts` (utility, transform)

**Change:** Add 4 new keys to both `sfw` and `nsfw` bundles, plus migrate 2 hardcoded strings from `+page.svelte` (join label + error messages).

**Bundle extension pattern** (lines 7-101) — `sfw` keys are the type source, `nsfw` must mirror every key exactly. `CopyKey` is derived automatically:
```typescript
const STRINGS = {
  sfw: {
    // existing keys...
    newKey: "SFW string here",
  },
  nsfw: {
    // existing keys...
    newKey: "NSFW string here",
  },
} as const;

type CopyKey = keyof typeof STRINGS.sfw;
```

**New keys to add** — place in the `// End screen` section after `endWaitingForHost`:

| Key | SFW value | NSFW value (deadpan contempt) |
|---|---|---|
| `winLineContext` | `"You called it."` | `"Saw it coming."` |
| `nonWinnerLineContext` | `" completed."` | `". And you missed it."` |
| `nonWinnerConsolation` | `"Nice try. One more round?"` | `"You lost. The meeting continues."` |
| `playAgainNote` | `"Word pool and players are kept. You can tweak the pool before starting."` | `"Same suspects, same pool. Add more ammo before you start."` |

**New keys for home page** — place in the `// Home CTAs` section:

| Key | SFW value | NSFW value |
|---|---|---|
| `joinWithCodeLabel` | `"Join with code"` | `"Got a code?"` |
| `joinCodePlaceholder` | `"ABC234"` | `"ABC234"` |
| `orDivider` | `"or"` | `"or show up uninvited"` |
| `roomNotFound` | `"Room not found. Check the code and try again."` | `"Dead end. Double-check that code."` |
| `genericError` | `"Something went wrong. Try again."` | `"Something broke. Not ideal. Try again."` |

**Proxy pattern** — the existing Proxy (lines 106-112) requires no changes; new keys resolve automatically:
```typescript
export const copy = new Proxy({} as Record<CopyKey, string>, {
  get(_target, key: string): string {
    const t: Theme = theme.current;
    const bundle = STRINGS[t];
    return (bundle as Record<string, string>)[key] ?? "";
  },
});
```

**NSFW copy audit targets** — existing keys to sharpen (low wit/specificity vs. quality ceiling `"Hanging on for dear life…"` / `"CALLED IT!"`):

| Key | Current NSFW value | Sharpened |
|---|---|---|
| `wordPoolEmptyBody` | `"Drop the BS you're expecting. Everyone pitches in — it's a team sport now."` | `"Everyone throws in the BS they're expecting to hear. It's a team sport. A terrible one."` |
| `waitingForPlayers` | `"Who's ready to suffer? Share the code to drag someone in."` | `"Drag someone in. Share the code — misery loves company."` |
| `endWaitingForHost` | `"Waiting for the host to summon everyone back…"` | `"Waiting for the host to make another bad call…"` |
| `modalJoinSubmit` | `"Pull up a chair"` | `"I'm in. Unfortunately."` |

All other NSFW keys (`"CALLED IT!"`, `"Hanging on for dear life…"`, `"Back into the grinder"`, `"That room's gone."`, `"Probably for the best."`, `"Six letters and numbers. Try again, champ."`) are at or above the quality ceiling — leave unchanged.

---

### `src/routes/+page.svelte` (route/component, request-response)

**Changes:**
1. Migrate 4 hardcoded strings to `copy.*`
2. Apply NSFW polish pass (or divider, general vibe)

**Existing `copy` import** (line 8) — already imported, no change needed.

**Hardcoded strings to migrate:**

| Lines | Current hardcode | Replacement |
|---|---|---|
| 65 | `"Room not found. Check the code and try again."` | `copy.roomNotFound` |
| 73 | `"Something went wrong. Try again."` | `copy.genericError` |
| 111 | `label="Join with code"` | `label={copy.joinWithCodeLabel}` |
| 115 | `placeholder="ABC234"` | `placeholder={copy.joinCodePlaceholder}` |

**Or divider pattern** (lines 96-101):
```svelte
<div
  class="flex items-center gap-4 text-[var(--color-ink-secondary)] text-sm font-semibold uppercase"
>
  <span class="flex-1 h-px bg-[var(--color-divider)]"></span>
  <span>or</span>
  <span class="flex-1 h-px bg-[var(--color-divider)]"></span>
</div>
```
Migrate the `"or"` text to `{copy.orDivider}`. In NSFW mode `orDivider` returns `"or show up uninvited"` — the horizontal rules provide visual rhythm regardless of string length. Remove `uppercase` class from container when using longer NSFW string (add `{#if isNsfw}` class binding or use conditional class).

**Theme derivation pattern** — `+page.svelte` does not currently derive `isNsfw`. Add same pattern as `Logo.svelte`:
```typescript
import { theme } from "$lib/stores/theme.svelte";
const isNsfw = $derived(theme.current === "nsfw");
```

---

## Shared Patterns

### CSS Token Usage
**Source:** `src/app.css` lines 3-15 (SFW) and lines 18-29 (NSFW override)
**Apply to:** All component edits — never hardcode hex values
```css
/* All color references use these tokens */
var(--color-accent)        /* yellow (SFW) / burnt orange (NSFW) */
var(--color-ink-primary)   /* primary text */
var(--color-ink-secondary) /* secondary/muted text */
var(--color-bg)            /* page background */
var(--color-surface)       /* card/panel background */
```
Tokens flip automatically under `:root[data-theme="nsfw"]` — no per-component theme branching needed for color.

### Theme Derivation
**Source:** `src/lib/components/Logo.svelte` lines 9-11
**Apply to:** `EndScreen.svelte`, `+page.svelte` (wherever NSFW-conditional structure is needed)
```typescript
import { theme } from "$lib/stores/theme.svelte";
const isNsfw = $derived(theme.current === "nsfw");
```

### copy Proxy Access
**Source:** `src/lib/copy.ts` lines 106-112
**Apply to:** All string migrations — no inline ternaries in templates
```typescript
// In component script:
import { copy } from "$lib/copy";
// In template:
{copy.someKey}  // resolves to sfw or nsfw string based on theme.current
```

### Conditional NSFW Blocks
**Source:** `src/lib/components/Logo.svelte` lines 13, 42 / `src/routes/+layout.svelte` line 38
**Apply to:** Logo insertion in `EndScreen.svelte`, or divider variant in `+page.svelte`
```svelte
{#if isNsfw}
  <!-- NSFW-only content -->
{/if}
```

---

## No Analog Found

None. All files are existing codebase files with well-established internal patterns.

---

## Metadata

**Analog search scope:** `src/lib/components/`, `src/lib/copy.ts`, `src/routes/`
**Files scanned:** 6
**Pattern extraction date:** 2026-04-19
