<script lang="ts">
  import type { BoardCell, WinningLine } from "$lib/protocol/messages";
  import WinLineIcon from "./WinLineIcon.svelte";
  import Button from "./Button.svelte";
  import { formatWinLine } from "$lib/util/winLine";
  import { copy, winnerSubhead, nonWinnerSubhead } from "$lib/copy";
  import { theme } from "$lib/stores/theme.svelte";

  type Props = {
    winner: { playerId: string; displayName: string };
    winningLine: WinningLine;
    winningCellIds: string[];
    winningWords: string[];
    board: BoardCell[] | null;
    markedCellIds: Set<string>;
    isHost: boolean;
    isWinner: boolean;
    gridSize: 3 | 4 | 5;
    onStartNewGame: () => void;
  };
  let {
    winner,
    winningLine,
    winningWords,
    isHost,
    isWinner,
    gridSize,
    onStartNewGame,
  }: Props = $props();

  const winLineLabel = $derived(formatWinLine(winningLine));
  const isNsfw = $derived(theme.current === "nsfw");
</script>

<section class="flex flex-col items-center text-center gap-4 pt-2 pb-12 landscape:flex-row landscape:items-start landscape:text-left landscape:gap-6 landscape:pt-0 landscape:pb-2">
  {#if isNsfw}
    <img
      src={isWinner ? "/bull-win.png" : "/bull-lose.png"}
      alt=""
      aria-hidden="true"
      class="end-screen-bull-img w-full max-w-[320px] sm:max-w-[400px] object-contain landscape:shrink-0 landscape:self-center"
    />
  {/if}

  <div class="flex flex-col items-center gap-4 text-center landscape:flex-1 landscape:items-start landscape:text-left landscape:overflow-y-auto landscape:max-h-[calc(100svh_-_3.5rem_-_1rem)]">
  {#if isWinner}
    <h1
      class="font-display text-[40px] sm:text-[56px] font-semibold text-[var(--color-accent)] tracking-[0.02em] leading-[1.1]"
      aria-live="polite"
    >
      {copy.winHeadline}
    </h1>
    <p class="text-[24px] font-semibold text-[var(--color-ink-primary)]">{winnerSubhead(winner.displayName)}</p>
  {:else}
    <h1
      class="text-[24px] font-semibold text-[var(--color-ink-primary)]"
      aria-live="polite"
    >
      {nonWinnerSubhead(winner.displayName)}
    </h1>
  {/if}

  <WinLineIcon {gridSize} {winningLine} />

  <p class="text-base text-[var(--color-ink-secondary)]">
    {isWinner ? copy.winnerCallout : ""} {winLineLabel}{isWinner ? copy.winLineSuffixWinner : copy.winLineSuffixNonWinner}
  </p>

  {#if winningWords.length > 0}
    <div class="flex flex-wrap justify-center gap-2 landscape:justify-start" aria-label="Winning words">
      {#each winningWords as word}
        <span
          class="px-3 py-1.5 rounded-full text-sm font-semibold
                 bg-[var(--color-accent)] text-[var(--color-ink-inverse)]"
        >
          {word}
        </span>
      {/each}
    </div>
  {/if}

  {#if !isWinner}
    <p class="text-base text-[var(--color-ink-secondary)]">{copy.nonWinnerConsolation}</p>
  {/if}

  {#if isHost}
    <div class="flex flex-col items-center gap-2 w-full sm:w-auto landscape:items-start">
      <Button variant="primary" onclick={onStartNewGame}>
        {#snippet children()}{copy.playAgain}{/snippet}
      </Button>
      <p class="text-sm text-[var(--color-ink-secondary)]">
        {copy.playAgainHostNote}
      </p>
    </div>
  {:else}
    <p class="text-base text-[var(--color-ink-secondary)]">
      {copy.endWaitingForHost}
    </p>
  {/if}
  </div>
</section>
