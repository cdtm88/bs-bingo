<script lang="ts">
  import { goto } from "$app/navigation";
  import Button from "$lib/components/Button.svelte";
  import TextInput from "$lib/components/TextInput.svelte";
  import Modal from "$lib/components/Modal.svelte";
  import { normalizeCode } from "$lib/util/roomCode";
  import { setDisplayName } from "$lib/session";
  import { copy } from "$lib/copy";
  import Logo from "$lib/components/Logo.svelte";
  import { theme } from "$lib/stores/theme.svelte";
  import { ArrowRight } from "lucide-svelte";

  let joinCodeInput = $state("");
  let modalOpen = $state(false);
  let modalMode = $state<"create" | "join">("create");
  let pendingJoinCode = $state<string | null>(null);
  let displayNameInput = $state("");
  let modalError = $state<string | null>(null);
  let busy = $state(false);

  const joinCodeValid = $derived(joinCodeInput.length === 6);
  const isNsfw = $derived(theme.current === "nsfw");

  function handleCodeInput(e: Event) {
    const raw = (e.target as HTMLInputElement).value;
    joinCodeInput = normalizeCode(raw).slice(0, 6);
  }

  function openCreate() {
    modalMode = "create";
    pendingJoinCode = null;
    modalError = null;
    displayNameInput = "";
    modalOpen = true;
  }

  function openJoin() {
    if (!joinCodeValid) return;
    modalMode = "join";
    pendingJoinCode = joinCodeInput;
    modalError = null;
    displayNameInput = "";
    modalOpen = true;
  }

  async function submitModal() {
    const trimmed = displayNameInput.trim();
    if (!trimmed) {
      modalError = copy.emptyName;
      return;
    }
    if (trimmed.length > 20) {
      modalError = copy.maxChars;
      return;
    }
    busy = true;
    try {
      let code: string;
      if (modalMode === "create") {
        const res = await fetch("/api/rooms", { method: "POST" });
        if (!res.ok) throw new Error("Could not create room");
        const data = (await res.json()) as { code: string; shareUrl: string };
        code = data.code;
      } else {
        const check = await fetch(`/api/rooms/${pendingJoinCode}/exists`);
        if (!check.ok) {
          modalError = copy.roomNotFoundError;
          busy = false;
          return;
        }
        code = pendingJoinCode!;
      }
      setDisplayName(code, trimmed);
      await goto(`/room/${code}`);
    } catch {
      modalError = copy.genericError;
      busy = false;
    }
  }
</script>

<main
  class="home-main min-h-screen bg-[var(--color-bg)] text-[var(--color-ink-primary)] flex flex-col items-center px-4 pb-10 {isNsfw ? 'justify-start pt-2' : 'justify-start pt-[230px]'}"
>
  <div class="w-full max-w-[480px] flex flex-col gap-4 landscape:flex-row landscape:max-w-none landscape:gap-8 landscape:items-center landscape:h-[100svh]">
    <div class="landscape:shrink-0 landscape:flex landscape:items-center landscape:justify-center">
      <Logo size="hero" />
    </div>
    <div class="flex flex-col gap-4 landscape:flex-1 landscape:max-w-[400px] landscape:justify-center">
    <p class="text-[var(--color-ink-secondary)] text-center">
      {copy.homeTagline}
    </p>

    <Button variant="primary" onclick={openCreate}>
      {#snippet children()}
        {copy.createCta}
      {/snippet}
    </Button>

    <div
      class="flex items-center gap-4 text-[var(--color-ink-secondary)] text-sm font-semibold {isNsfw ? '' : 'uppercase'}"
    >
      <span class="flex-1 h-px bg-[var(--color-divider)]"></span>
      <span class="whitespace-nowrap">{copy.orDivider}</span>
      <span class="flex-1 h-px bg-[var(--color-divider)]"></span>
    </div>

    <form
      class="flex flex-col gap-4"
      onsubmit={(e) => {
        e.preventDefault();
        openJoin();
      }}
    >
      <TextInput
        label={copy.joinCodeLabel}
        variant="code"
        value={joinCodeInput}
        maxlength={6}
        placeholder={copy.joinCodePlaceholder}
        oninput={handleCodeInput}
        helper={joinCodeInput && !joinCodeValid ? copy.invalidCode : ""}
      />
      <Button variant="primary" type="submit" disabled={!joinCodeValid}>
        {#snippet children()}
          {copy.joinCta}
        {/snippet}
      </Button>
    </form>
    </div><!-- end right column -->
  </div>

  <Modal
    bind:open={modalOpen}
    title={copy.joinModalTitle}
    onclose={() => {
      modalOpen = false;
    }}
  >
    {#snippet children()}
      <form
        onsubmit={(e) => {
          e.preventDefault();
          submitModal();
        }}
        class="flex flex-col gap-4"
      >
        <TextInput
          label="Your name"
          placeholder="Your name"
          value={displayNameInput}
          oninput={(e) => {
            displayNameInput = (e.target as HTMLInputElement).value;
          }}
          maxlength={20}
          autofocus
          helper={copy.joinModalNameHelper}
          error={modalError ?? undefined}
        />
        <Button variant="primary" type="submit" disabled={busy}>
          {#snippet children()}
            {modalMode === "create" ? copy.modalCreateSubmit : copy.modalJoinSubmit}
            <ArrowRight size={16} />
          {/snippet}
        </Button>
      </form>
    {/snippet}
  </Modal>
</main>
