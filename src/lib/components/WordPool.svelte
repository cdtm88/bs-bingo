<script lang="ts">
  import type { WordEntry } from "$lib/protocol/messages";
  import WordChip from "./WordChip.svelte";
  import { copy } from "$lib/copy";

  type WordPoolProps = {
    words: WordEntry[];
    playerId: string;
    onDelete: (wordId: string) => void;
  };

  let { words, playerId, onDelete }: WordPoolProps = $props();
</script>

<section class="flex flex-col gap-4">
  <h2 class="text-2xl font-semibold">Words ({words.length})</h2>
  {#if words.length === 0}
    <div class="py-6 text-center">
      <p class="text-[var(--color-ink-secondary)] font-semibold">{copy.wordPoolEmptyHeading}</p>
      <p class="mt-1 text-sm text-[var(--color-ink-secondary)]">
        {copy.wordPoolEmptyBody}
      </p>
    </div>
  {:else}
    <div class="flex flex-wrap gap-2">
      {#each words as entry (entry.wordId)}
        <WordChip
          word={entry.text}
          canDelete={entry.submittedBy === playerId}
          onDelete={() => onDelete(entry.wordId)}
        />
      {/each}
    </div>
  {/if}
</section>
