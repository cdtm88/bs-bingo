<!-- Phase 6 — Professional Mode toggle (CONTEXT D-04, D-05; UI-SPEC lines 185-214) -->
<script lang="ts">
  import { Briefcase } from "lucide-svelte";
  import { theme } from "$lib/stores/theme.svelte";

  let { fixed = true }: { fixed?: boolean } = $props();
  const isSfw = $derived(theme.current === "sfw");

  // Literal tokens so Tailwind scanner keeps them: left-[2px] left-[18px]
  const indicatorPos = $derived(isSfw ? "left-[18px]" : "left-[2px]");
  const trackColor = $derived(
    isSfw ? "bg-[var(--color-accent)]" : "bg-[var(--color-ink-secondary)]"
  );
</script>

<div class:toggle-anchor={fixed} role="group" aria-label="Theme controls">
  <button
    type="button"
    role="switch"
    aria-checked={isSfw}
    aria-label="Professional Mode"
    onclick={() => theme.toggle()}
    class="inline-flex items-center gap-2 h-9 px-3 rounded-full
           bg-[var(--color-surface)] border border-[var(--color-ink-secondary)]/40
           text-xs font-medium text-[var(--color-ink-secondary)]
           hover:border-[var(--color-ink-secondary)] hover:text-[var(--color-ink-primary)]
           active:translate-y-px shadow-sm
           focus-visible:outline-2 focus-visible:outline-offset-2
           focus-visible:outline-[var(--color-ink-secondary)]
           transition-all motion-reduce:transition-none cursor-pointer"
  >
    <Briefcase size={16} />
    <span class="hidden sm:inline">Professional Mode</span>
    <span
      class={[
        "relative inline-block w-8 h-4 rounded-full",
        "transition-colors motion-reduce:transition-none",
        trackColor,
      ].join(" ")}
      aria-hidden="true"
    >
      <span
        class={[
          "absolute top-0.5 w-3 h-3 rounded-full bg-white",
          "transition-[left] duration-150 ease-out motion-reduce:transition-none",
          indicatorPos,
        ].join(" ")}
      ></span>
    </span>
  </button>
</div>

<style>
  .toggle-anchor {
    position: fixed;
    top: 1rem;
    right: 1rem;
    z-index: 50;
  }
</style>
