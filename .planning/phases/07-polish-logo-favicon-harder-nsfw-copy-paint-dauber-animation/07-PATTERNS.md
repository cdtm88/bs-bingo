# Phase 7: Polish — logo, favicon, harder NSFW copy, paint dauber animation - Pattern Map

**Mapped:** 2026-04-19
**Files analyzed:** 10 (2 new + 8 modified)
**Analogs found:** 9 / 10 (favicon has no pre-existing analog — new asset category)

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `src/lib/components/Logo.svelte` (NEW) | leaf component | render / theme-reactive read | `src/lib/components/ThemeToggle.svelte` | exact (theme-reactive leaf) |
| `static/favicon.svg` (NEW) | static asset | static-serve | — | no analog (no `static/` dir exists) |
| `src/lib/copy.ts` (MODIFY) | data module (string bundle) | static lookup via Proxy | existing `STRINGS.nsfw` block (self-analog) | exact |
| `src/lib/components/BoardCell.svelte` (MODIFY) | leaf component | render / theme-reactive read | itself (existing `.dauber-stamp` block lines 53-77) | exact (in-file pattern extension) |
| `src/app.css` (MODIFY) | global stylesheet | static CSS | existing `dauberStampIn` block (lines 73-87) | exact (in-file keyframes extension) |
| `src/app.html` (MODIFY) | HTML shell | static markup | existing `<link rel="icon">` (line 5) | exact (one-line attribute fix) |
| `src/routes/+layout.svelte` (MODIFY) | route layout | render / slot composition | itself (existing `<ThemeToggle />` mount) | exact |
| `src/routes/+page.svelte` (MODIFY) | route page | render | itself (existing `<h1>` hero block lines 77-84) | exact |
| `tests/unit/copy.test.ts` (MODIFY) | unit test | assertion | itself (existing NSFW assertions) | exact |
| `tests/unit/BoardCell.test.ts` (MODIFY) | unit test | assertion | itself (existing marked-cell assertions) | exact |

---

## Pattern Assignments

### `src/lib/components/Logo.svelte` (NEW — leaf component, theme-reactive render)

**Analog:** `src/lib/components/ThemeToggle.svelte` (nearly identical shape: theme-reactive leaf using `$derived(theme.current === …)` + `var(--color-*)` tokens).

**Imports pattern** (ThemeToggle.svelte lines 1-4):
```svelte
<script lang="ts">
  import { Briefcase } from "lucide-svelte";
  import { theme } from "$lib/stores/theme.svelte";
```
Logo copies this import, swaps the lucide icon for inline SVG, and adds `import { copy } from "$lib/copy";` (pattern from `+page.svelte` line 8).

**Props pattern** (destructure with default — from BoardCell.svelte line 11):
```svelte
let { cell, marked, onToggle }: BoardCellProps = $props();
```
Logo applies: `let { size = "compact" }: { size?: "hero" | "compact" } = $props();`

**Theme-reactive derived pattern** (ThemeToggle.svelte lines 7-13):
```svelte
const isSfw = $derived(theme.current === "sfw");

const indicatorPos = $derived(isSfw ? "left-[18px]" : "left-[2px]");
const trackColor = $derived(
  isSfw ? "bg-[var(--color-accent)]" : "bg-[var(--color-ink-secondary)]"
);
```
Logo uses: `const isNsfw = $derived(theme.current === "nsfw");`

**Color token pattern** (BoardCell.svelte line 72):
```svelte
<path ... fill="var(--color-accent)" opacity="0.72" />
```
All logo SVG fills/strokes use `var(--color-accent)` or `currentColor`. NO hardcoded hex (anti-pattern per Phase 6 lesson).

**Class-array join pattern** (BoardCell.svelte lines 40-51, ThemeToggle.svelte lines 35-39):
```svelte
class={[
  "relative overflow-hidden",
  "aspect-square min-h-11 min-w-11 rounded-lg font-semibold",
  marked ? "bg-[var(--color-accent)] text-[var(--color-ink-inverse)]" : "...",
].join(" ")}
```
Logo uses this same array-join pattern for size-variant class selection.

**Wordmark typography reference** (+page.svelte lines 78-80 — this is the block Logo's hero variant replaces):
```svelte
<h1 class="font-display text-[40px] sm:text-[56px] font-semibold leading-[1.1]">
  {copy.brand}<span class="text-[var(--color-accent)]">.</span>
</h1>
```
Logo's hero variant preserves `font-display`, `text-[40px] sm:text-[56px]`, `font-semibold`, `leading-[1.1]`, and the trailing accent dot.

**aria-hidden on decorative SVG** (BoardCell.svelte line 59):
```svelte
<span ... aria-hidden="true">
  <svg viewBox="0 0 100 100" ...>
```
All icon SVGs inside Logo get `aria-hidden="true"`. Compact anchor variant gets `aria-label={copy.brand}` (reused accessible name pattern).

---

### `static/favicon.svg` (NEW — static asset, no analog)

**No analog in codebase.** The `static/` directory does not exist yet. This file has no comparable asset.

**Reference from RESEARCH.md Example 1** (lines 694-710): 32×32 viewBox, 3×3 grid with one cell filled. Use hardcoded hex `#F5D547` (SFW accent) — static assets are served without stylesheet context, so `var(--color-*)` won't resolve. This hardcode is the single acceptable exception to the "no hex" rule and is explicitly called out in RESEARCH Example 1.

**Planner responsibility:** Pre-create `static/` directory (`mkdir -p static`) per RESEARCH Pitfall 1.

---

### `src/lib/copy.ts` (MODIFY — string bundle rewrite)

**Analog:** The file itself — `STRINGS.nsfw` object (lines 59-100). The rewrite is a string-value change; structure does not change.

**Bundle structure pattern** (lines 59-100 — do not alter):
```typescript
nsfw: {
  brand: "Bullshit Bingo",
  metaDescription: "For meetings that could've been an email.",
  // ... keys match STRINGS.sfw exactly
} as const;
```
Key-for-key parity with `STRINGS.sfw` must be maintained. Rewrite values only.

**Interpolation helper pattern** (lines 115-128):
```typescript
export function waitingForHost(hostName: string): string {
  return theme.current === "nsfw"
    ? `Waiting for ${hostName} to pull the trigger…`
    : `Waiting for ${hostName} to start the game…`;
}
```
If `waitingForHost` / `winnerSubhead` / `nonWinnerSubhead` NSFW branches need rewriting (per RESEARCH audit), only the NSFW string-literal changes — signature and return type stay.

**Quality-ceiling references** (already in-file — DO NOT rewrite):
- Line 91: `winHeadline: "CALLED IT!"`
- Line 95: `reconnectingBanner: "Hanging on for dear life…"`
- Line 70: `emptyName: "Come on, give us something."`
- Lines 87-89: pack names with parenthetical asides.

Rewrite targets must match or exceed this punchiness bar. See RESEARCH lines 341-385 for full scored audit table.

---

### `src/lib/components/BoardCell.svelte` (MODIFY — add `.dauber-wrap` wrapper)

**Analog:** Itself — existing dauber-stamp block lines 53-77. The modification wraps this existing block in a new outer span.

**Current pattern** (lines 53-77):
```svelte
{#if marked && theme.current === "nsfw"}
  <span
    class="absolute inset-0 flex items-center justify-center pointer-events-none dauber-stamp motion-reduce:animate-none"
    aria-hidden="true"
  >
    <svg
      viewBox="0 0 100 100"
      class="w-[85%] h-[85%]"
      preserveAspectRatio="xMidYMid meet"
    >
      <path
        d="M 50,8 C 68,6 92,22 92,50 C 92,72 74,94 50,92 C 28,94 8,72 8,50 C 8,26 32,10 50,8 Z"
        fill="var(--color-accent)"
        opacity="0.72"
      />
    </svg>
  </span>
{/if}
```

**After modification** (per RESEARCH Example 3 lines 776-799):
- Outer span gains `dauber-wrap` class (replaces `dauber-stamp` on this element); keeps `absolute inset-0 pointer-events-none motion-reduce:animate-none aria-hidden`.
- Inner layout span added with `absolute inset-0 flex items-center justify-center`.
- `dauber-stamp` class moves to the `<svg>` element itself (animation target).

**Critical invariant** (line 57 — must persist):
```
pointer-events-none
```
On BOTH the new outer `.dauber-wrap` AND (by inheritance) its `::after`. See RESEARCH Pitfall 3 lines 432-439.

**Gated-render pattern** (line 53 — do not change the guard):
```svelte
{#if marked && theme.current === "nsfw"}
```
NSFW-only is locked by D-14. SFW never renders this branch.

---

### `src/app.css` (MODIFY — replace `dauberStampIn`, add `dauberBleed`)

**Analog:** Itself — existing `dauberStampIn` block lines 73-87.

**Current pattern** (lines 73-87):
```css
/* Phase 6 — NSFW dauber stamp scale-in (UI-SPEC line 260, RESEARCH Pitfall 5) */
@keyframes dauberStampIn {
  0%   { transform: scale(0.6); opacity: 0; }
  100% { transform: scale(1);   opacity: 1; }
}

.dauber-stamp {
  animation: dauberStampIn 120ms ease-out;
}

@media (prefers-reduced-motion: reduce) {
  .dauber-stamp {
    animation: none;
  }
}
```

**Target pattern** (CONTEXT D-15 — verbatim replacement):
```css
@keyframes dauberStampIn {
  0%   { transform: scale(0.5);  opacity: 0; }
  60%  { transform: scale(1.08); opacity: 0.80; }
  100% { transform: scale(1.0);  opacity: 0.72; }
}

@keyframes dauberBleed {
  0%   { transform: scale(0.9); opacity: 0.5; }
  100% { transform: scale(1.6); opacity: 0; }
}

.dauber-stamp {
  animation: dauberStampIn 180ms cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards;
}

.dauber-wrap::after {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: 50%;
  background: var(--color-accent);
  opacity: 0;
  animation: dauberBleed 400ms 60ms ease-out forwards;
}

@media (prefers-reduced-motion: reduce) {
  .dauber-stamp { animation: none; opacity: 0.72; }
  .dauber-wrap::after { animation: none; }
}
```

**Reduced-motion guard pattern** (existing at lines 52-54, 66-71, 83-87): every keyframe rule must ship with a matching `@media (prefers-reduced-motion: reduce)` override. The `dauberBleed` addition MUST ship with its override in the same block (Pitfall 5).

**Color token pattern** (line 80 existing, reused at new `.dauber-wrap::after`): `background: var(--color-accent);` — inherits NSFW burnt orange automatically via `[data-theme="nsfw"]` override at lines 18-29.

---

### `src/app.html` (MODIFY — favicon href + type)

**Analog:** Itself — line 5.

**Current** (line 5):
```html
<link rel="icon" href="%sveltekit.assets%/favicon.png" />
```

**Target** (RESEARCH Example 5):
```html
<link rel="icon" href="%sveltekit.assets%/favicon.svg" type="image/svg+xml" />
```

Single-line change. Keep `%sveltekit.assets%` prefix (idiomatic SvelteKit per RESEARCH Pitfall 2). Add `type="image/svg+xml"` per SVG favicon convention.

---

### `src/routes/+layout.svelte` (MODIFY — mount persistent compact Logo)

**Analog:** Itself — existing `<ThemeToggle />` mount at line 36 (same persistent-chrome pattern).

**Existing pattern** (lines 28-36):
```svelte
<Banner {visible}>
  {#snippet children()}
    <Loader2 size={16} class="animate-spin motion-reduce:animate-none" />
    <span>{copy.reconnectingBanner}</span>
  {/snippet}
</Banner>
{@render children()}
<ThemeToggle />
```

**Route-id-guard pattern** (needed per RESEARCH Pitfall 8 — hero + compact must not both render on `/`):

Import `page` from `$app/state` (Svelte 5 / SvelteKit 2 idiom) and guard the compact Logo:
```svelte
import { page } from "$app/state";
// ...
{#if page.route.id !== "/"}
  <Logo size="compact" />
{/if}
```
Planner picks: layout-with-guard (RESEARCH Open Q2 recommendation) vs. per-route injection. Recommended: layout-with-guard.

**Component-in-layout placement pattern** (line 36): persistent chrome lives after `{@render children()}`. Logo's compact-bar placement is planner's discretion (before/after Banner, top-left vs. top-center). Must NOT collide with `<ThemeToggle />`'s fixed top-right position.

**Tab title pattern already in place** (lines 22-26 — do not break):
```svelte
$effect(() => {
  if (typeof document !== "undefined") {
    document.title = copy.brand;
  }
});
```
Logo addition must not interfere with this reactive title effect.

---

### `src/routes/+page.svelte` (MODIFY — hero Logo replaces `<h1>` block)

**Analog:** Itself — existing `<header>` block lines 77-84.

**Current pattern** (lines 77-84):
```svelte
<header class="text-center">
  <h1 class="font-display text-[40px] sm:text-[56px] font-semibold leading-[1.1]">
    {copy.brand}<span class="text-[var(--color-accent)]">.</span>
  </h1>
  <p class="mt-4 text-[var(--color-ink-secondary)]">
    {copy.homeTagline}
  </p>
</header>
```

**Target:** Replace the `<h1>` line (lines 78-80) with `<Logo size="hero" />`. Keep the `<header>` wrapper and the `<p>` tagline untouched. Add `import Logo from "$lib/components/Logo.svelte";` in script.

**Logo subsumes the trailing accent dot** per RESEARCH Open Q3 (recommended): Hero variant of Logo includes `<span class="text-[var(--color-accent)]">.</span>`. Compact variant omits it.

---

### `tests/unit/copy.test.ts` (MODIFY — update assertions for rewritten NSFW strings)

**Analog:** Itself — existing NSFW assertions (lines 16-19, 25-28, 34-37, 43-46, 52-55, 61-64, 71-73).

**Existing assertion pattern** (lines 25-28):
```typescript
it("returns NSFW tagline when nsfw", () => {
  theme.set("nsfw");
  expect(copy.homeTagline).toBe("For meetings that could've been an email.");
});
```

**Update pattern:** For each rewritten NSFW string, update the `.toBe(...)` literal to match the new value. Test structure stays identical. Quality-ceiling assertions (lines 43-46 CALLED IT!, lines 71-73 Hanging on for dear life…) do NOT change.

**beforeEach pattern to preserve** (lines 6-10):
```typescript
beforeEach(() => {
  localStorage.clear();
  theme.init();
  theme.set("sfw");
});
```

**Any newly-rewritten key without existing coverage** should gain a new `it(...)` block following the same shape. Example: if `joinCta` is rewritten, add a parallel assertion for both SFW and NSFW branches.

---

### `tests/unit/BoardCell.test.ts` (MODIFY — assert `.dauber-wrap` on marked NSFW cell)

**Analog:** Itself — existing marked-cell assertions (lines 49-55, 72-81).

**Render helper pattern** (lines 10-15 — reuse):
```typescript
function renderCell(props: { cell: Cell; marked: boolean; onToggle?: () => void }) {
  container = document.createElement("div");
  document.body.appendChild(container);
  instance = mount(BoardCell, { target: container, props });
  return container;
}
```

**Assertion pattern** (line 53 — class-contains check):
```typescript
expect(cls).toContain("bg-[var(--color-accent)]");
```

**New assertions to add:** With `theme.set("nsfw")` in a `beforeEach` or per-test, assert:
1. Marked NSFW cell contains a `.dauber-wrap` element.
2. The `.dauber-wrap` element has class `pointer-events-none`.
3. The inner `<svg>` element has class `dauber-stamp` (moved from outer span in Phase 7).
4. Click on a marked NSFW cell still invokes `onToggle` (regression guard for Pitfall 3).

Note: existing tests implicitly run at theme `sfw` (the default from `theme.init()`). Planner adds an NSFW-path describe block.

---

## Shared Patterns

### Theme-Reactive Reading

**Source:** `src/lib/stores/theme.svelte.ts` lines 22-40
**Apply to:** `Logo.svelte`, any new component reading theme
```typescript
import { theme } from "$lib/stores/theme.svelte";
const isNsfw = $derived(theme.current === "nsfw");
```
Proxy-free, no subscriptions — Svelte 5 compiler tracks the getter call.

### Copy-as-Single-Source-of-Truth

**Source:** `src/lib/copy.ts` lines 106-112 (Proxy pattern)
**Apply to:** All components rendering user-facing strings
```typescript
import { copy } from "$lib/copy";
// ...
<span>{copy.brand}</span>
```
Do NOT branch on `theme.current` in component templates for copy strings. Logo uses `copy.brand` for wordmark text. Phase 6 SC-3 grep audit enforces this.

### Design Token Color Reference

**Source:** `src/app.css` lines 3-29 (@theme + `:root[data-theme="nsfw"]` override)
**Apply to:** All SVG fills/strokes, all component color classes, all keyframe properties
```css
/* In components and keyframes */
fill="var(--color-accent)"
background: var(--color-accent);
class="text-[var(--color-ink-primary)] bg-[var(--color-surface)]"
```
Exception: `static/favicon.svg` uses hardcoded hex `#F5D547` (no stylesheet context in static asset serve).

### `pointer-events-none` on Overlay Chains

**Source:** `src/lib/components/BoardCell.svelte` line 57 + Phase 6 contract
**Apply to:** `.dauber-wrap`, any new absolute-positioned overlay inside interactive elements
```svelte
<span class="absolute inset-0 pointer-events-none ...">
```
Descendants inherit `none` via `::after` because `::after` does not override. Anti-pattern: setting `pointer-events: auto` on any layer beneath the top interactive element.

### `prefers-reduced-motion` Guard Alongside Every Keyframe

**Source:** `src/app.css` lines 52-54, 66-71, 83-87 (three existing examples)
**Apply to:** Every new `@keyframes` rule
```css
@keyframes foo { ... }
.foo-anim { animation: foo 200ms ease-out; }

@media (prefers-reduced-motion: reduce) {
  .foo-anim { animation: none; /* or collapse to end state */ }
}
```
New `dauberBleed` keyframes ship with their own override (D-15 includes it verbatim).

### Vitest Mount/Unmount for Svelte 5 Components

**Source:** `tests/unit/BoardCell.test.ts` lines 1-26
**Apply to:** Any new unit test for a Svelte component (including Logo.test.ts if planner adds one)
```typescript
import { mount, unmount } from "svelte";
import Logo from "../../src/lib/components/Logo.svelte";

let instance: ReturnType<typeof mount> | null = null;
let container: HTMLElement | null = null;

afterEach(() => {
  if (instance) { unmount(instance); instance = null; }
  if (container) { container.remove(); container = null; }
});
```

### Playwright Theme E2E Setup

**Source:** `e2e/theme-toggle.spec.ts` lines 11-21
**Apply to:** Any new e2e spec that needs NSFW theme state (e.g., `reduced-motion.spec.ts`, `logo-placement.spec.ts`)
```typescript
await p.goto("/");
await p.getByRole("switch", { name: "Professional Mode" }).click();
await expect(p.locator("html")).toHaveAttribute("data-theme", "nsfw");
```

For reduced-motion specs, use Playwright context option:
```typescript
const ctx = await browser.newContext({ reducedMotion: 'reduce' });
```

---

## No Analog Found

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| `static/favicon.svg` | static asset | static-serve | `static/` directory does not exist in the project yet; no prior static-asset SVGs in repo. Planner follows RESEARCH Example 1 + Pattern 2 (SvelteKit convention). |

**Wave-0 test files to create** (no analog beyond general Playwright/Vitest shapes already cited):
- `tests/unit/Logo.test.ts` — follow `tests/unit/BoardCell.test.ts` mount/unmount pattern
- `e2e/favicon.spec.ts` — follow `e2e/theme-toggle.spec.ts` context-creation pattern; assert `curl`-equivalent 200 on `/favicon.svg`
- `e2e/logo-placement.spec.ts` — follow `e2e/theme-toggle.spec.ts` for theme flip + route navigation + visibility assertions
- `e2e/reduced-motion.spec.ts` — follow `e2e/theme-toggle.spec.ts` with `reducedMotion: 'reduce'` context option

---

## Metadata

**Analog search scope:**
- `src/lib/components/` (10 components)
- `src/lib/stores/` (theme, room, session)
- `src/routes/` (+layout, +page, /room/*, /error, +layout.ts)
- `src/app.css`, `src/app.html`
- `tests/unit/` (19 specs)
- `e2e/` (12 specs)

**Files read during pattern extraction:**
- `.planning/phases/07-polish-logo-favicon-harder-nsfw-copy-paint-dauber-animation/07-CONTEXT.md`
- `.planning/phases/07-polish-logo-favicon-harder-nsfw-copy-paint-dauber-animation/07-RESEARCH.md`
- `src/lib/components/BoardCell.svelte`
- `src/lib/components/ThemeToggle.svelte`
- `src/lib/components/Banner.svelte`
- `src/lib/copy.ts`
- `src/lib/stores/theme.svelte.ts`
- `src/app.css`
- `src/app.html`
- `src/routes/+layout.svelte`
- `src/routes/+page.svelte`
- `tests/unit/BoardCell.test.ts`
- `tests/unit/copy.test.ts`
- `tests/unit/theme.test.ts`
- `e2e/theme-toggle.spec.ts`

**Verified absences:**
- No `static/` directory at project root.
- No existing Logo/logo asset in `src/lib/` or elsewhere.
- No existing multi-phase animation examples beyond the single-phase pattern.

**Pattern extraction date:** 2026-04-19
