<script lang="ts">
  import type { BoardCell as Cell } from "$lib/protocol/messages";
  import { theme } from "$lib/stores/theme.svelte";

  type BoardCellProps = {
    cell: Cell;
    marked: boolean;
    onToggle?: () => void;
  };

  let { cell, marked, onToggle }: BoardCellProps = $props();

  function handleClick() {
    if (cell.blank) return; // defense-in-depth; blank cells have no onclick anyway
    onToggle?.();
  }
</script>

{#if cell.blank}
  <!-- D-14: blank/inert cell — no word, no text, non-interactive. Pitfall 6: must be a <div>, never a <button>. -->
  <!-- Phase 6 (CONTEXT D-10): NSFW gets crosshatch via .bingo-blank-cell; SFW path unchanged. -->
  <div
    class={[
      "aspect-square min-h-11 min-w-11 rounded-lg",
      "bg-[var(--color-surface)] border border-dashed border-[var(--color-divider)]/40",
      theme.current === "nsfw" ? "bingo-blank-cell" : "",
    ].join(" ")}
    aria-hidden="true"
    tabindex="-1"
  ></div>
{:else}
  <!-- D-12 (unmarked) / D-13 (marked) — variant-class swap per Button.svelte pattern. -->
  <button
    type="button"
    onclick={handleClick}
    aria-label={marked
      ? `${cell.text ?? ""}. Marked. Tap to unmark.`
      : `${cell.text ?? ""}. Tap to mark.`}
    aria-pressed={marked ? "true" : "false"}
    class={[
      "relative",
      "aspect-square min-h-11 min-w-11 rounded-lg font-semibold text-sm leading-tight",
      "transition-[background-color,color,border-color,transform] duration-[120ms] ease-out",
      "motion-reduce:transition-none",
      "active:scale-[0.97]",
      "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-ink-secondary)]",
      "cursor-pointer",
      marked && theme.current !== "nsfw"
        ? "bg-[var(--color-accent)] text-[var(--color-ink-inverse)] border border-[var(--color-accent)]"
        : marked && theme.current === "nsfw"
          ? "bg-[var(--color-surface)] text-[var(--color-ink-primary)] border border-[var(--color-accent)]"
          : "bg-[var(--color-surface)] text-[var(--color-ink-primary)] border border-[var(--color-divider)] hover:border-[#3A3A48]",
    ].join(" ")}
  >
    {#if marked && theme.current === "nsfw"}
      <!-- Phase 7 — NSFW dauber Impact + Ink Bleed Ring (CONTEXT D-10/D-11/D-12, RESEARCH Example 3).
           Outer .dauber-wrap hosts the ::after bleed ring; inner svg carries .dauber-stamp animation.
           pointer-events-none persists on the outer wrapper — inherited by ::after — so clicks still reach the button (D-12). -->
      <span
        class="absolute inset-0 pointer-events-none dauber-wrap motion-reduce:animate-none"
        aria-hidden="true"
      >
        <span class="absolute inset-0 flex items-center justify-center">
          <svg
            viewBox="0 0 100 100"
            class="w-[85%] h-[85%] dauber-stamp"
            preserveAspectRatio="xMidYMid meet"
          >
            <!-- Slightly irregular circle — echoes Logo NSFW icon (Plan 07-01) -->
            <path
              d="M 50,8
                 C 68,6  92,22  92,50
                 C 92,72  74,94  50,92
                 C 28,94  8,72  8,50
                 C 8,26  32,10  50,8 Z"
              fill="var(--color-accent)"
              opacity="0.72"
            />
          </svg>
        </span>
      </span>
    {/if}
    <span class="relative z-10 block px-[6px] break-words hyphens-auto">{cell.text}</span>
  </button>
{/if}
