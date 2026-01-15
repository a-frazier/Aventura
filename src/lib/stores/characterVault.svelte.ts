import type { VaultCharacter, VaultCharacterType, Character } from '$lib/types';
import { database } from '$lib/services/database';

const DEBUG = true;

function log(...args: any[]) {
  if (DEBUG) {
    console.log('[CharacterVault]', ...args);
  }
}

/**
 * Store for managing the global Character Vault.
 * Characters in the vault are templates that can be copied to stories.
 */
class CharacterVaultStore {
  // All vault characters
  characters = $state<VaultCharacter[]>([]);

  // Loading state
  isLoaded = $state(false);

  // Derived: protagonists only
  get protagonists(): VaultCharacter[] {
    return this.characters.filter(c => c.characterType === 'protagonist');
  }

  // Derived: supporting characters only
  get supportingCharacters(): VaultCharacter[] {
    return this.characters.filter(c => c.characterType === 'supporting');
  }

  // Derived: favorites
  get favorites(): VaultCharacter[] {
    return this.characters.filter(c => c.favorite);
  }

  /**
   * Load all vault characters from database.
   */
  async load(): Promise<void> {
    try {
      this.characters = await database.getVaultCharacters();
      this.isLoaded = true;
      log('Loaded', this.characters.length, 'vault characters');
    } catch (error) {
      console.error('[CharacterVault] Failed to load:', error);
      this.characters = [];
      this.isLoaded = true;
    }
  }

  /**
   * Add a new character to the vault.
   */
  async add(input: Omit<VaultCharacter, 'id' | 'createdAt' | 'updatedAt'>): Promise<VaultCharacter> {
    const now = Date.now();
    const character: VaultCharacter = {
      ...input,
      id: crypto.randomUUID(),
      createdAt: now,
      updatedAt: now,
    };

    await database.addVaultCharacter(character);
    this.characters = [character, ...this.characters];
    log('Added vault character:', character.name);
    return character;
  }

  /**
   * Update an existing vault character.
   */
  async update(id: string, updates: Partial<VaultCharacter>): Promise<void> {
    await database.updateVaultCharacter(id, updates);
    this.characters = this.characters.map(c =>
      c.id === id ? { ...c, ...updates, updatedAt: Date.now() } : c
    );
    log('Updated vault character:', id);
  }

  /**
   * Delete a vault character.
   */
  async delete(id: string): Promise<void> {
    await database.deleteVaultCharacter(id);
    this.characters = this.characters.filter(c => c.id !== id);
    log('Deleted vault character:', id);
  }

  /**
   * Toggle favorite status.
   */
  async toggleFavorite(id: string): Promise<void> {
    const character = this.characters.find(c => c.id === id);
    if (character) {
      await this.update(id, { favorite: !character.favorite });
    }
  }

  /**
   * Save a story character to the vault.
   * Creates a copy of the character as a vault template.
   */
  async saveFromStory(
    storyCharacter: Character,
    asType: VaultCharacterType,
    storyId: string
  ): Promise<VaultCharacter> {
    const isProtagonist = storyCharacter.relationship === 'self';

    return this.add({
      name: storyCharacter.name,
      description: storyCharacter.description,
      characterType: asType,
      background: null,
      motivation: null,
      role: isProtagonist ? null : storyCharacter.relationship,
      relationshipTemplate: isProtagonist ? null : storyCharacter.relationship,
      traits: [...storyCharacter.traits],
      visualDescriptors: [...(storyCharacter.visualDescriptors || [])],
      portrait: storyCharacter.portrait,
      tags: [],
      favorite: false,
      source: 'story',
      originalStoryId: storyId,
      metadata: null,
    });
  }

  /**
   * Copy a vault character to a story.
   * Returns the data needed to create a story Character.
   */
  copyToStory(vaultCharacter: VaultCharacter, storyId: string, branchId: string | null): Omit<Character, 'id'> {
    const isProtagonist = vaultCharacter.characterType === 'protagonist';

    return {
      storyId,
      name: vaultCharacter.name,
      description: vaultCharacter.description,
      relationship: isProtagonist ? 'self' : (vaultCharacter.relationshipTemplate || null),
      traits: [...vaultCharacter.traits],
      visualDescriptors: [...vaultCharacter.visualDescriptors],
      portrait: vaultCharacter.portrait,
      status: 'active',
      metadata: null,
      branchId,
    };
  }

  /**
   * Search vault characters by name, description, or tags.
   */
  async search(query: string): Promise<VaultCharacter[]> {
    if (!query.trim()) {
      return this.characters;
    }
    return database.searchVaultCharacters(query);
  }

  /**
   * Get characters by type.
   */
  getByType(type: VaultCharacterType): VaultCharacter[] {
    return this.characters.filter(c => c.characterType === type);
  }

  /**
   * Get a character by ID.
   */
  getById(id: string): VaultCharacter | undefined {
    return this.characters.find(c => c.id === id);
  }
}

export const characterVault = new CharacterVaultStore();
