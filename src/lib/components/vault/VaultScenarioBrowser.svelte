<script lang="ts">
  import { scenarioVault } from "$lib/stores/scenarioVault.svelte";
  import type { VaultScenario } from "$lib/types";
  import { Search, MapPin, Loader2 } from "lucide-svelte";

  interface Props {
    onSelect: (scenario: VaultScenario) => void;
    /** ID of scenario that has been selected (to show visual indicator) */
    selectedScenarioId?: string | null;
    onNavigateToVault?: () => void;
  }

  let { onSelect, selectedScenarioId = null, onNavigateToVault }: Props = $props();

  let searchQuery = $state("");

  const filteredScenarios = $derived.by(() => {
    let items = scenarioVault.scenarios;

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      items = items.filter(
        (s) =>
          s.name.toLowerCase().includes(query) ||
          s.description?.toLowerCase().includes(query) ||
          s.tags.some((t) => t.toLowerCase().includes(query)),
      );
    }

    // Sort favorites first, then by updated
    return [...items].sort((a, b) => {
      if (a.favorite && !b.favorite) return -1;
      if (!a.favorite && b.favorite) return 1;
      return b.updatedAt - a.updatedAt;
    });
  });

  $effect(() => {
    if (!scenarioVault.isLoaded) {
      scenarioVault.load();
    }
  });

  function handleSelect(scenario: VaultScenario) {
    onSelect(scenario);
  }

  function isSelected(scenarioId: string): boolean {
    return selectedScenarioId === scenarioId;
  }
</script>

<div class="space-y-3">
  <!-- Search -->
  {#if scenarioVault.scenarios.length > 0}
    <div class="relative">
      <Search
        class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-surface-500"
      />
      <input
        type="text"
        bind:value={searchQuery}
        placeholder="Search scenarios..."
        class="w-full rounded-lg border border-surface-600 bg-surface-800 pl-10 pr-3 py-2 text-sm text-surface-100 placeholder-surface-500 focus:border-accent-500 focus:outline-none"
      />
    </div>
  {/if}

  <!-- Scenario List -->
  <div class="max-h-64 overflow-y-auto">
    {#if !scenarioVault.isLoaded}
      <div class="flex h-32 items-center justify-center">
        <Loader2 class="h-6 w-6 animate-spin text-surface-500" />
      </div>
    {:else if filteredScenarios.length === 0}
      <div class="flex h-32 items-center justify-center">
        <div class="text-center">
          <MapPin class="mx-auto h-8 w-8 text-surface-600" />
          <p class="mt-2 text-sm text-surface-400">
            {#if searchQuery}
              No scenarios match your search
            {:else}
              No scenarios in vault
            {/if}
          </p>
          {#if !searchQuery && onNavigateToVault}
            <button
              class="mt-3 px-3 py-1.5 rounded-lg bg-surface-700 hover:bg-surface-600 text-xs text-surface-200 transition-colors"
              onclick={onNavigateToVault}
            >
              Go to Vault
            </button>
          {/if}
        </div>
      </div>
    {:else}
      <div class="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {#each filteredScenarios as scenario (scenario.id)}
          <button
            class="relative text-left rounded-lg border bg-surface-800 p-3 transition-all {isSelected(scenario.id) ? 'border-green-500 bg-green-500/10' : 'border-surface-700 hover:border-accent-500'}"
            onclick={() => handleSelect(scenario)}
          >
            {#if isSelected(scenario.id)}
              <div class="absolute top-2 right-2 text-xs text-green-400 bg-green-500/20 px-1.5 py-0.5 rounded">
                Selected
              </div>
            {/if}
            <div class="flex items-start gap-2">
              <MapPin class="h-5 w-5 text-green-400 shrink-0 mt-0.5" />
              <div class="flex-1 min-w-0">
                <h4 class="font-medium text-surface-100 truncate text-sm">{scenario.name}</h4>
                <p class="text-xs text-surface-400 mt-0.5">
                  {scenario.npcs.length} NPCs
                </p>
              </div>
            </div>
          </button>
        {/each}
      </div>
    {/if}
  </div>
</div>
