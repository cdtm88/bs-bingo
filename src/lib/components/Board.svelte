<script lang="ts">
  import BoardCell from "./BoardCell.svelte";
  import BoardHeader from "./BoardHeader.svelte";
  import { theme } from "$lib/stores/theme.svelte";
  import type { BoardCell as Cell } from "$lib/protocol/messages";

  type BoardProps = {
    cells: Cell[] | null;
    markedCellIds: Set<string>;
    onToggle: (cellId: string) => void;
  };

  let { cells, markedCellIds, onToggle }: BoardProps = $props();

  // Derive columns from board length. 9 → 3, 16 → 4, 25 → 5.
  // Literal string tokens so Tailwind scanner includes them: grid-cols-3 grid-cols-4 grid-cols-5
  const colsClass = $derived(
    cells?.length === 9
      ? "grid-cols-3"
      : cells?.length === 16
        ? "grid-cols-4"
        : cells?.length === 25
          ? "grid-cols-5"
          : "grid-cols-3"
  );

  // Grid size for BoardHeader (Phase 6 — CONTEXT D-10). 9 → 3, 16 → 4, 25 → 5.
  const gridSize = $derived(
    cells?.length === 9 ? 3 : cells?.length === 16 ? 4 : 5
  ) as unknown as 3 | 4 | 5;
</script>

{#if cells === null}
  <div
    class="flex items-center justify-center min-h-[40vh] text-[var(--color-ink-secondary)]"
    aria-live="polite"
  >
    <p class="text-base">Dealing your board…</p>
  </div>
{:else}
  {#if theme.current === "nsfw"}
    <BoardHeader {gridSize} />
  {/if}
  <div
    data-testid="board-grid"
    class={["grid w-full gap-2", colsClass].join(" ")}
  >
    {#each cells as cell (cell.cellId)}
      <BoardCell
        {cell}
        marked={markedCellIds.has(cell.cellId)}
        onToggle={() => onToggle(cell.cellId)}
      />
    {/each}
  </div>
{/if}
