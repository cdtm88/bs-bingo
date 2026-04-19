<script lang="ts">
  import { page } from "$app/state";
  import ErrorPage from "$lib/components/ErrorPage.svelte";
  import { copy } from "$lib/copy";
  import { AlertTriangle } from "lucide-svelte";

  const heading = $derived(
    page.status === 404 ? copy.errorHeading : "Something went wrong"
  );
  const body = $derived(
    page.status === 404
      ? copy.errorBody
      : (page.error?.message ?? "An unexpected error occurred.")
  );
  const ctaLabel = $derived(copy.errorCta);
</script>

<ErrorPage
  {heading}
  {body}
  primaryAction={{ label: ctaLabel, href: "/" }}
>
  {#snippet icon()}
    <AlertTriangle size={48} class="text-[var(--color-destructive)]" />
  {/snippet}
</ErrorPage>
