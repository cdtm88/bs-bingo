<script lang="ts">
  import "../app.css";
  import "@fontsource-variable/inter";
  import "@fontsource-variable/space-grotesk";
  import Banner from "$lib/components/Banner.svelte";
  import ThemeToggle from "$lib/components/ThemeToggle.svelte";
  import Logo from "$lib/components/Logo.svelte";
  import { connection } from "$lib/stores/room.svelte";
  import { theme } from "$lib/stores/theme.svelte";
  import { copy } from "$lib/copy";
  import { page } from "$app/state";
  import { Loader2 } from "lucide-svelte";

  let { children } = $props();
  const visible = $derived(connection.status === "reconnecting");

  // CONTEXT D-13 — initialize theme from localStorage exactly once on mount.
  // src/routes/+layout.ts sets ssr=false so this runs on client.
  $effect(() => {
    theme.init();
  });

  // RESEARCH — Tab title per theme. Reactive read of copy.brand re-runs on theme change.
  $effect(() => {
    if (typeof document !== "undefined") {
      document.title = copy.brand;
    }
  });
</script>

<Banner {visible}>
  {#snippet children()}
    <Loader2 size={16} class="animate-spin motion-reduce:animate-none" />
    <span>{copy.reconnectingBanner}</span>
  {/snippet}
</Banner>
{#if page.route.id !== "/"}
  <header class="sticky top-0 z-50 flex items-center justify-between px-4 h-14 bg-[var(--color-bg)]">
    <Logo size="compact" />
    <ThemeToggle fixed={false} />
  </header>
  {@render children()}
{:else}
  {@render children()}
  <ThemeToggle />
{/if}
