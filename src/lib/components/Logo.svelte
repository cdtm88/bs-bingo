<!-- Phase 7 — dual-mode Logo (CONTEXT D-01, D-02, D-03; RESEARCH Pattern 1) -->
<script lang="ts">
  import { theme } from "$lib/stores/theme.svelte";
  import { copy } from "$lib/copy";

  type Size = "hero" | "medium" | "compact";
  let { size = "compact" }: { size?: Size } = $props();

  // Svelte 5 runes track the getter call — re-renders on theme flip.
  const isNsfw = $derived(theme.current === "nsfw");
</script>

{#if size === "hero"}
  {#if isNsfw}
    <header class="text-center flex flex-col items-center">
      <img src="/bull-logo.png" alt="" aria-hidden="true" class="logo-hero-bull-img w-full max-w-[320px] sm:max-w-[400px] object-contain" />
      <h1 class="logo-hero-bull-title font-display text-[40px] sm:text-[56px] font-semibold leading-[1.1]">
        {copy.brand}<span class="text-[var(--color-accent)]">.</span>
      </h1>
    </header>
  {:else}
    <header class="text-center flex items-center justify-center gap-3 sm:gap-4">
      <!-- SFW: 3x3 grid with one cell filled -->
      <svg viewBox="0 0 32 32" class="w-12 h-12 sm:w-14 sm:h-14 shrink-0" aria-hidden="true">
        <rect x="2"  y="2"  width="8" height="8" rx="1.5" fill="var(--color-accent)" />
        <rect x="12" y="2"  width="8" height="8" rx="1.5" fill="none" stroke="var(--color-accent)" stroke-width="1.5" />
        <rect x="22" y="2"  width="8" height="8" rx="1.5" fill="none" stroke="var(--color-accent)" stroke-width="1.5" />
        <rect x="2"  y="12" width="8" height="8" rx="1.5" fill="none" stroke="var(--color-accent)" stroke-width="1.5" />
        <rect x="12" y="12" width="8" height="8" rx="1.5" fill="none" stroke="var(--color-accent)" stroke-width="1.5" />
        <rect x="22" y="12" width="8" height="8" rx="1.5" fill="none" stroke="var(--color-accent)" stroke-width="1.5" />
        <rect x="2"  y="22" width="8" height="8" rx="1.5" fill="none" stroke="var(--color-accent)" stroke-width="1.5" />
        <rect x="12" y="22" width="8" height="8" rx="1.5" fill="none" stroke="var(--color-accent)" stroke-width="1.5" />
        <rect x="22" y="22" width="8" height="8" rx="1.5" fill="none" stroke="var(--color-accent)" stroke-width="1.5" />
      </svg>
      <h1 class="font-display text-[32px] sm:text-[40px] font-semibold leading-[1.1] whitespace-nowrap">
        {copy.brand}<span class="text-[var(--color-accent)]">.</span>
      </h1>
    </header>
  {/if}
{:else if size === "medium"}
  <div class="flex items-center justify-center gap-2 sm:gap-3">
    {#if isNsfw}
      <img src="/bull-logo.png" alt="" aria-hidden="true" class="w-8 h-8 sm:w-10 sm:h-10 shrink-0 object-contain" />
    {:else}
      <!-- SFW: 3x3 grid with one filled cell (same 9 rects as hero/compact) -->
      <svg viewBox="0 0 32 32" class="w-8 h-8 sm:w-10 sm:h-10 shrink-0" aria-hidden="true">
        <rect x="2"  y="2"  width="8" height="8" rx="1.5" fill="var(--color-accent)" />
        <rect x="12" y="2"  width="8" height="8" rx="1.5" fill="none" stroke="var(--color-accent)" stroke-width="1.5" />
        <rect x="22" y="2"  width="8" height="8" rx="1.5" fill="none" stroke="var(--color-accent)" stroke-width="1.5" />
        <rect x="2"  y="12" width="8" height="8" rx="1.5" fill="none" stroke="var(--color-accent)" stroke-width="1.5" />
        <rect x="12" y="12" width="8" height="8" rx="1.5" fill="none" stroke="var(--color-accent)" stroke-width="1.5" />
        <rect x="22" y="12" width="8" height="8" rx="1.5" fill="none" stroke="var(--color-accent)" stroke-width="1.5" />
        <rect x="2"  y="22" width="8" height="8" rx="1.5" fill="none" stroke="var(--color-accent)" stroke-width="1.5" />
        <rect x="12" y="22" width="8" height="8" rx="1.5" fill="none" stroke="var(--color-accent)" stroke-width="1.5" />
        <rect x="22" y="22" width="8" height="8" rx="1.5" fill="none" stroke="var(--color-accent)" stroke-width="1.5" />
      </svg>
    {/if}
    <span class="font-display text-[28px] sm:text-[36px] font-semibold leading-[1.1]">
      {copy.brand}<span class="text-[var(--color-accent)]">.</span>
    </span>
  </div>
{:else}
  <a
    href="/"
    class="inline-flex items-center gap-2 text-base font-display font-semibold text-[var(--color-ink-primary)] hover:opacity-80 transition-opacity motion-reduce:transition-none"
    aria-label={copy.brand}
  >
    {#if isNsfw}
      <img src="/bull-logo.png" alt="" aria-hidden="true" class="w-8 h-8 shrink-0 object-contain" />
    {:else}
      <svg viewBox="0 0 32 32" class="w-5 h-5 shrink-0" aria-hidden="true">
        <rect x="2"  y="2"  width="8" height="8" rx="1.5" fill="var(--color-accent)" />
        <rect x="12" y="2"  width="8" height="8" rx="1.5" fill="none" stroke="var(--color-accent)" stroke-width="2" />
        <rect x="22" y="2"  width="8" height="8" rx="1.5" fill="none" stroke="var(--color-accent)" stroke-width="2" />
        <rect x="2"  y="12" width="8" height="8" rx="1.5" fill="none" stroke="var(--color-accent)" stroke-width="2" />
        <rect x="12" y="12" width="8" height="8" rx="1.5" fill="none" stroke="var(--color-accent)" stroke-width="2" />
        <rect x="22" y="12" width="8" height="8" rx="1.5" fill="none" stroke="var(--color-accent)" stroke-width="2" />
        <rect x="2"  y="22" width="8" height="8" rx="1.5" fill="none" stroke="var(--color-accent)" stroke-width="2" />
        <rect x="12" y="22" width="8" height="8" rx="1.5" fill="none" stroke="var(--color-accent)" stroke-width="2" />
        <rect x="22" y="22" width="8" height="8" rx="1.5" fill="none" stroke="var(--color-accent)" stroke-width="2" />
      </svg>
    {/if}
    <span class="whitespace-nowrap">{copy.brand}</span>
  </a>
{/if}
