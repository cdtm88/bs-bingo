---
phase: 02-lobby-gameplay-word-submission-start
reviewed: 2026-04-19T00:00:00Z
depth: standard
files_reviewed: 12
files_reviewed_list:
  - party/game-room.ts
  - src/app.css
  - src/lib/components/GridProgress.svelte
  - src/lib/components/PackPills.svelte
  - src/lib/components/TextInput.svelte
  - src/lib/components/WordChip.svelte
  - src/lib/components/WordPool.svelte
  - src/lib/protocol/messages.ts
  - src/lib/stores/room.svelte.ts
  - src/lib/util/gridTier.ts
  - src/lib/util/starterPacks.ts
  - src/routes/room/[code]/+page.svelte
findings:
  critical: 0
  warning: 3
  info: 3
  total: 6
status: issues_found
---

# Phase 02: Code Review Report

**Reviewed:** 2026-04-19
**Depth:** standard
**Files Reviewed:** 12
**Status:** issues_found

## Summary

Re-review of the full phase-02 file set. All previously flagged issues from prior iterations have been resolved: the `gridSize` throw-or-default is now a defensive fallback with a `console.error` (line 556), `wordsNeededToStart` imports `MIN_WORDS_TO_START`, the `submitWord` comment is accurate, and `myPlayerId` is a plain `$state` set once in `onMount`. The `wordMarked` broadcast includes `cellId` and the client store's `toggleMark` is non-optimistic.

Three warnings remain: a state-consistency gap where `state.words` diverges from the standalone `words` array after incremental updates, a double-disconnect on SPA teardown, and an accessibility gap in `TextInput` where error text is not semantically linked to the input. Three info items cover minor quality issues.

---

## Warnings

### WR-01: `state.words` permanently stale after `wordAdded` / `wordRemoved` events

**File:** `src/lib/stores/room.svelte.ts:127-133`

On `wordAdded` and `wordRemoved`, only the standalone `words` array is updated. The `state` object's `words` field is never patched — it retains whatever was present at the last `roomState` or `syncResponse`. Any consumer of `store.state.words` (including a future feature or a third-party component) reads stale data. The page currently reads `store.words` (the standalone array) for rendering, so no visible bug exists today, but the inconsistency is a maintenance trap.

**Fix:** Mirror word mutations into `state`:
```ts
case "wordAdded":
  if (!words.some((w) => w.wordId === msg.word.wordId)) {
    words = [...words, msg.word];
    if (state) state = { ...state, words };
  }
  break;
case "wordRemoved":
  words = words.filter((w) => w.wordId !== msg.wordId);
  if (state) state = { ...state, words };
  break;
```

---

### WR-02: `disconnect()` called twice on SPA navigation teardown

**File:** `src/routes/room/[code]/+page.svelte:93-99`

The `onMount` return cleanup calls `store?.disconnect()` and `onDestroy` also calls `store?.disconnect()`. On SvelteKit SPA navigations both fire — so `ws.close()` and `connection.status = "closed"` are set twice, and the `visibilitychange` listener removal runs twice. The WS spec makes `close()` on an already-closed socket a no-op, so this is not a crash, but the double execution adds unnecessary noise and could cause issues if PartySocket's internal reconnect state machine is sensitive to repeat close calls.

**Fix:** Remove the `onDestroy` block — the `onMount` return cleanup already handles all teardown including the `visibilitychange` listener:
```svelte
// Delete:
onDestroy(() => {
  store?.disconnect();
});
```

---

### WR-03: `TextInput` error text not linked to the input — screen readers will not announce it

**File:** `src/lib/components/TextInput.svelte:54-77`

When `error` is set, a `<p>` renders below the input with the error message. There is no `aria-describedby` linking the input to that paragraph, and no `aria-invalid` on the input. Screen readers announce the label on focus but not the error. This affects the word submission flow where duplicate-word errors are surfaced exclusively via this component.

**Fix:**
```svelte
<!-- Add these deriveds -->
const errorId = $derived(error ? `${inputId}-error` : undefined);

<!-- On the <input> element, add: -->
aria-invalid={error ? "true" : undefined}
aria-describedby={errorId}

<!-- On the error <p>, add: -->
<p id={errorId} class="text-sm text-[var(--color-destructive)]">{error}</p>
```

---

## Info

### IN-01: `loadStarterPack` pack key uses a type assertion with no runtime fallback

**File:** `party/game-room.ts:448`

`STARTER_PACKS[pack as keyof typeof STARTER_PACKS]` casts `pack` to a key type. The Valibot picklist schema validates that `pack` is one of the three known strings before this code runs, so the cast is safe today. But if a key is added to the schema picklist without adding it to `STARTER_PACKS`, the result is `undefined` and the loop iterates over `undefined` silently, loading no words with no error signal.

**Fix:** Add a nullish guard:
```ts
const packWords = STARTER_PACKS[pack as keyof typeof STARTER_PACKS] ?? [];
```
Or derive the picklist from `Object.keys(STARTER_PACKS)` to keep schema and object in sync structurally.

---

### IN-02: Magic number `3` used as default / reset value for `winningGridSize` in three places

**File:** `src/lib/stores/room.svelte.ts:42, 204, 239`

`winningGridSize` is initialized and reset to the literal `3` in three separate locations. The `3` is the smallest valid grid tier, not a semantically named constant. If the minimum tier ever changes, all three sites must be updated together.

**Fix:**
```ts
const DEFAULT_GRID_SIZE: 3 | 4 | 5 = 3;
// Replace all three `3` literals with DEFAULT_GRID_SIZE
```

---

### IN-03: `inputId` derivation strips only whitespace — non-ASCII label characters produce invalid HTML `id` values

**File:** `src/lib/components/TextInput.svelte:32`

```ts
const inputId = $derived(id ?? `input-${label.toLowerCase().replace(/\s+/g, "-")}`);
```

Only whitespace is replaced. Punctuation, special characters, or emoji in `label` produce an `id` that may fail the HTML spec requirement that IDs not contain certain characters. All current callers pass an explicit `id` prop, so this is not a live bug — but the fallback is fragile.

**Fix:**
```ts
const inputId = $derived(id ?? `input-${label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`);
```

---

_Reviewed: 2026-04-19_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
