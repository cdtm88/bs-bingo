<!-- Phase 6 — NSFW-only board header (CONTEXT D-10, UI-SPEC lines 290-298) -->
<script lang="ts">
  type Props = {
    gridSize: 3 | 4 | 5;
  };
  let { gridSize }: Props = $props();

  // Literal tokens so Tailwind Oxide scanner keeps them: grid-cols-3 grid-cols-4 grid-cols-5
  const colsClass = $derived(
    gridSize === 3 ? "grid-cols-3" : gridSize === 4 ? "grid-cols-4" : "grid-cols-5"
  );

  // UI-SPEC line 294: "B·L·S" for 3×3; B·U·L·L·S for 5×5; B·U·L·L for 4×4.
  const letters = $derived(
    gridSize === 5
      ? ["B", "U", "L", "L", "S"]
      : gridSize === 4
        ? ["B", "U", "L", "L"]
        : ["B", "L", "S"]
  );
</script>

<div
  data-testid="board-header"
  class={["grid w-full gap-2 mb-2", colsClass].join(" ")}
  aria-hidden="true"
>
  {#each letters as letter, i (i)}
    <div
      data-header-letter
      class="h-12 flex items-center justify-center
             font-display text-[32px] sm:text-[40px] font-semibold
             tracking-[0.15em] uppercase
             text-[var(--color-ink-secondary)]"
    >
      {letter}
    </div>
  {/each}
</div>
