<script lang="ts">
  import { characterVault } from '$lib/stores/characterVault.svelte';
  import { ui } from '$lib/stores/ui.svelte';
  import type { VaultCharacter, VaultCharacterType } from '$lib/types';
  import {
    Plus, Search, Star, User, Users, ChevronLeft, Upload, Loader2
  } from 'lucide-svelte';
  import VaultCharacterCard from './VaultCharacterCard.svelte';
  import VaultCharacterForm from './VaultCharacterForm.svelte';
  import { readCharacterCardFile, parseCharacterCard } from '$lib/services/characterCardImporter';

  // State
  let searchQuery = $state('');
  let filterType = $state<VaultCharacterType | 'all'>('all');
  let showFavoritesOnly = $state(false);
  let showForm = $state(false);
  let editingCharacter = $state<VaultCharacter | null>(null);
  let defaultFormType = $state<VaultCharacterType>('protagonist');
  let importing = $state(false);
  let importError = $state<string | null>(null);

  // Filtered characters
  const filteredCharacters = $derived.by(() => {
    let chars = characterVault.characters;

    // Filter by type
    if (filterType !== 'all') {
      chars = chars.filter(c => c.characterType === filterType);
    }

    // Filter favorites
    if (showFavoritesOnly) {
      chars = chars.filter(c => c.favorite);
    }

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      chars = chars.filter(c =>
        c.name.toLowerCase().includes(query) ||
        c.description?.toLowerCase().includes(query) ||
        c.tags.some(t => t.toLowerCase().includes(query)) ||
        c.traits.some(t => t.toLowerCase().includes(query))
      );
    }

    return chars;
  });

  // Load on mount
  $effect(() => {
    if (!characterVault.isLoaded) {
      characterVault.load();
    }
  });

  function openCreateForm(type: VaultCharacterType = 'protagonist') {
    editingCharacter = null;
    defaultFormType = type;
    showForm = true;
  }

  function openEditForm(character: VaultCharacter) {
    editingCharacter = character;
    showForm = true;
  }

  async function handleDelete(id: string) {
    await characterVault.delete(id);
  }

  async function handleToggleFavorite(id: string) {
    await characterVault.toggleFavorite(id);
  }

  function closeForm() {
    showForm = false;
    editingCharacter = null;
  }

  async function handleImportCard(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    importing = true;
    importError = null;

    try {
      const jsonString = await readCharacterCardFile(file);
      const card = parseCharacterCard(jsonString);

      if (!card) {
        throw new Error('Invalid character card format');
      }

      // Extract personality traits
      const traits = card.personality
        ? card.personality.split(/[,;]/).map(t => t.trim()).filter(Boolean).slice(0, 10)
        : [];

      // Create vault character from card
      await characterVault.add({
        name: card.name,
        description: card.description || null,
        characterType: 'supporting', // Default to supporting, user can change
        background: null,
        motivation: null,
        role: null,
        relationshipTemplate: null,
        traits,
        visualDescriptors: [],
        portrait: null, // Could extract from PNG if present
        tags: ['imported'],
        favorite: false,
        source: 'import',
        originalStoryId: null,
        metadata: { cardVersion: card.version },
      });

    } catch (error) {
      console.error('[CharacterVault] Import failed:', error);
      importError = error instanceof Error ? error.message : 'Failed to import character card';
    } finally {
      importing = false;
      input.value = '';
    }
  }
</script>

<div class="flex h-full flex-col bg-surface-900">
  <!-- Header -->
  <div class="flex items-center justify-between border-b border-surface-700 px-4 py-3 sm:px-6 sm:py-4">
    <div class="flex items-center gap-3">
      <button
        class="rounded p-1.5 hover:bg-surface-700"
        onclick={() => ui.setActivePanel('library')}
        title="Back to Library"
      >
        <ChevronLeft class="h-5 w-5 text-surface-400" />
      </button>
      <h2 class="text-lg font-semibold text-surface-100">Character Vault</h2>
      <span class="rounded-full bg-surface-700 px-2 py-0.5 text-xs text-surface-400">
        {characterVault.characters.length}
      </span>
    </div>
    <div class="flex items-center gap-2">
      <label class="flex cursor-pointer items-center gap-2 rounded-lg border border-surface-600 bg-surface-700 px-3 py-1.5 text-sm text-surface-300 hover:border-surface-500">
        {#if importing}
          <Loader2 class="h-4 w-4 animate-spin" />
        {:else}
          <Upload class="h-4 w-4" />
        {/if}
        <span class="hidden sm:inline">Import</span>
        <input
          type="file"
          accept=".json,.png"
          class="hidden"
          onchange={handleImportCard}
          disabled={importing}
        />
      </label>
      <button
        class="flex items-center gap-2 rounded-lg bg-accent-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-accent-600"
        onclick={() => openCreateForm()}
      >
        <Plus class="h-4 w-4" />
        <span class="hidden sm:inline">New Character</span>
      </button>
    </div>
  </div>

  <!-- Search and Filters -->
  <div class="border-b border-surface-700 px-4 py-3 space-y-3 sm:px-6">
    {#if importError}
      <div class="rounded-lg bg-red-500/10 border border-red-500/30 p-2 text-sm text-red-400 flex items-center justify-between">
        <span>{importError}</span>
        <button onclick={() => importError = null} class="text-red-400 hover:text-red-300">
          <span class="sr-only">Dismiss</span>
          &times;
        </button>
      </div>
    {/if}

    <div class="relative">
      <Search class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-surface-500" />
      <input
        type="text"
        bind:value={searchQuery}
        placeholder="Search characters..."
        class="w-full rounded-lg border border-surface-600 bg-surface-700 pl-10 pr-3 py-2 text-surface-100 placeholder-surface-500 focus:border-accent-500 focus:outline-none"
      />
    </div>

    <div class="flex flex-wrap items-center gap-2">
      <div class="flex items-center gap-1 rounded-lg bg-surface-800 p-1">
        <button
          class="rounded-md px-3 py-1 text-xs transition-colors {filterType === 'all' ? 'bg-surface-600 text-surface-100' : 'text-surface-400 hover:text-surface-200'}"
          onclick={() => filterType = 'all'}
        >
          All
        </button>
        <button
          class="flex items-center gap-1.5 rounded-md px-3 py-1 text-xs transition-colors {filterType === 'protagonist' ? 'bg-surface-600 text-surface-100' : 'text-surface-400 hover:text-surface-200'}"
          onclick={() => filterType = 'protagonist'}
        >
          <User class="h-3 w-3" />
          Protagonists
        </button>
        <button
          class="flex items-center gap-1.5 rounded-md px-3 py-1 text-xs transition-colors {filterType === 'supporting' ? 'bg-surface-600 text-surface-100' : 'text-surface-400 hover:text-surface-200'}"
          onclick={() => filterType = 'supporting'}
        >
          <Users class="h-3 w-3" />
          Supporting
        </button>
      </div>

      <button
        class="flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs transition-colors {showFavoritesOnly ? 'border-yellow-500/50 bg-yellow-500/10 text-yellow-400' : 'border-surface-600 text-surface-400 hover:border-surface-500'}"
        onclick={() => showFavoritesOnly = !showFavoritesOnly}
      >
        <Star class="h-3 w-3 {showFavoritesOnly ? 'fill-yellow-400' : ''}" />
        Favorites
      </button>
    </div>
  </div>

  <!-- Character Grid -->
  <div class="flex-1 overflow-y-auto p-4 sm:p-6">
    {#if !characterVault.isLoaded}
      <div class="flex h-full items-center justify-center">
        <Loader2 class="h-8 w-8 animate-spin text-surface-500" />
      </div>
    {:else if filteredCharacters.length === 0}
      <div class="flex h-full items-center justify-center">
        <div class="text-center">
          <Users class="mx-auto h-12 w-12 text-surface-600" />
          <p class="mt-3 text-surface-400">
            {#if searchQuery || showFavoritesOnly || filterType !== 'all'}
              No characters match your filters
            {:else}
              No characters in vault yet
            {/if}
          </p>
          <p class="mt-1 text-sm text-surface-500">
            {#if searchQuery || showFavoritesOnly || filterType !== 'all'}
              Try adjusting your search or filters
            {:else}
              Create reusable character templates for your stories
            {/if}
          </p>
          {#if !searchQuery && !showFavoritesOnly && filterType === 'all'}
            <div class="mt-4 flex justify-center gap-2">
              <button
                class="flex items-center gap-2 rounded-lg bg-accent-500 px-4 py-2 text-sm font-medium text-white hover:bg-accent-600"
                onclick={() => openCreateForm('protagonist')}
              >
                <User class="h-4 w-4" />
                Create Protagonist
              </button>
              <button
                class="flex items-center gap-2 rounded-lg border border-surface-600 bg-surface-700 px-4 py-2 text-sm text-surface-300 hover:border-surface-500"
                onclick={() => openCreateForm('supporting')}
              >
                <Users class="h-4 w-4" />
                Create Supporting
              </button>
            </div>
          {/if}
        </div>
      </div>
    {:else}
      <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {#each filteredCharacters as character (character.id)}
          <VaultCharacterCard
            {character}
            onEdit={() => openEditForm(character)}
            onDelete={() => handleDelete(character.id)}
            onToggleFavorite={() => handleToggleFavorite(character.id)}
          />
        {/each}
      </div>
    {/if}
  </div>
</div>

<!-- Form Modal -->
{#if showForm}
  <VaultCharacterForm
    character={editingCharacter}
    defaultType={defaultFormType}
    onClose={closeForm}
  />
{/if}
