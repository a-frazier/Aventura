import type { OpenAIProvider } from './openrouter';
import type { GenerationPreset, TranslationSettings } from '$lib/types';
import { settings } from '$lib/stores/settings.svelte';
import { buildExtraBody } from './requestOverrides';
import { promptService, type PromptContext } from '$lib/services/prompts';
import { tryParseJsonWithHealing } from './jsonHealing';

const DEBUG = true;

function log(...args: any[]) {
  if (DEBUG) {
    console.log('[Translation]', ...args);
  }
}

// Use Intl.DisplayNames for proper language name resolution
const languageDisplayNames = new Intl.DisplayNames(['en'], { type: 'language' });

// Common language codes for the UI dropdown
const SUPPORTED_LANGUAGE_CODES = [
  'en', 'es', 'fr', 'de', 'it', 'pt', 'ja', 'ko', 'zh', 'ru',
  'ar', 'hi', 'nl', 'pl', 'tr', 'vi', 'th', 'id', 'sv', 'da',
  'no', 'fi', 'cs', 'el', 'he', 'uk', 'ro', 'hu', 'bg', 'hr',
  'sk', 'sl', 'et', 'lv', 'lt', 'ms', 'fil', 'bn', 'ta', 'te',
];

export interface TranslationResult {
  translatedContent: string;
  detectedLanguage?: string;
}

export interface UITranslationItem {
  id: string;
  text: string;
  type: 'name' | 'description' | 'title';
}

export class TranslationService {
  private provider: OpenAIProvider;
  private settingsOverride?: Partial<GenerationPreset>;
  private presetId: string;

  constructor(provider: OpenAIProvider, presetId: string = 'translation', settingsOverride?: Partial<GenerationPreset>) {
    this.provider = provider;
    this.presetId = presetId;
    this.settingsOverride = settingsOverride;
  }

  private get preset(): GenerationPreset {
    return settings.getPresetConfig(this.presetId);
  }

  private get model(): string {
    return this.settingsOverride?.model ?? this.preset.model;
  }

  private get temperature(): number {
    return this.settingsOverride?.temperature ?? this.preset.temperature;
  }

  private get maxTokens(): number {
    return this.settingsOverride?.maxTokens ?? this.preset.maxTokens;
  }

  private get extraBody(): Record<string, unknown> | undefined {
    return buildExtraBody({
      manualMode: settings.advancedRequestSettings.manualMode,
      manualBody: this.settingsOverride?.manualBody ?? this.preset.manualBody,
      reasoningEffort: this.settingsOverride?.reasoningEffort ?? this.preset.reasoningEffort,
      providerOnly: this.settingsOverride?.providerOnly ?? this.preset.providerOnly,
    });
  }

  /**
   * Get the human-readable name for a language code using Intl API
   */
  private getLanguageName(code: string): string {
    if (code === 'auto') return 'auto-detect';
    try {
      return languageDisplayNames.of(code) || code;
    } catch {
      return code;
    }
  }

  /**
   * Module 1: Translate narration (post-generation)
   * Handles both plain text and visual prose HTML
   */
  async translateNarration(
    content: string,
    targetLanguage: string,
    isVisualProse: boolean = false
  ): Promise<TranslationResult> {
    // Skip if target is English and content appears to be English
    if (targetLanguage === 'en') {
      return { translatedContent: content };
    }

    log('translateNarration called', {
      contentLength: content.length,
      targetLanguage,
      isVisualProse,
    });

    const promptContext: PromptContext = {
      mode: 'adventure',
      pov: 'second',
      tense: 'present',
      protagonistName: 'the protagonist',
    };

    const systemPrompt = promptService.renderPrompt('translate-narration', promptContext, {
      targetLanguage: this.getLanguageName(targetLanguage),
    });

    const userPrompt = promptService.renderUserPrompt('translate-narration', promptContext, {
      content,
    });

    try {
      const response = await this.provider.generateResponse({
        model: this.model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: this.temperature,
        maxTokens: this.maxTokens,
        extraBody: this.extraBody,
      });

      log('Narration translated', {
        originalLength: content.length,
        translatedLength: response.content.length,
      });

      return { translatedContent: response.content.trim() };
    } catch (error) {
      log('Narration translation failed:', error);
      throw error;
    }
  }

  /**
   * Module 2: Translate user input to English
   * Used before sending to AI for narrative generation
   */
  async translateInput(
    content: string,
    sourceLanguage: string
  ): Promise<TranslationResult> {
    log('translateInput called', {
      contentLength: content.length,
      sourceLanguage,
    });

    const promptContext: PromptContext = {
      mode: 'adventure',
      pov: 'second',
      tense: 'present',
      protagonistName: 'the protagonist',
    };

    const systemPrompt = promptService.renderPrompt('translate-input', promptContext, {
      sourceLanguage: sourceLanguage === 'auto' ? 'the detected language' : this.getLanguageName(sourceLanguage),
    });

    const userPrompt = promptService.renderUserPrompt('translate-input', promptContext, {
      content,
    });

    try {
      const response = await this.provider.generateResponse({
        model: this.model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: this.temperature,
        maxTokens: this.maxTokens,
        extraBody: this.extraBody,
      });

      log('Input translated', {
        originalLength: content.length,
        translatedLength: response.content.length,
      });

      return { translatedContent: response.content.trim() };
    } catch (error) {
      log('Input translation failed:', error);
      throw error;
    }
  }

  /**
   * Module 3: Batch translate UI elements
   * Used for world state (characters, locations, items, story beats)
   */
  async translateUIElements(
    items: UITranslationItem[],
    targetLanguage: string
  ): Promise<UITranslationItem[]> {
    if (items.length === 0) return [];

    // Skip if target is English
    if (targetLanguage === 'en') {
      return items;
    }

    log('translateUIElements called', {
      itemCount: items.length,
      targetLanguage,
    });

    const promptContext: PromptContext = {
      mode: 'adventure',
      pov: 'second',
      tense: 'present',
      protagonistName: 'the protagonist',
    };

    const systemPrompt = promptService.renderPrompt('translate-ui', promptContext, {
      targetLanguage: this.getLanguageName(targetLanguage),
    });

    const userPrompt = promptService.renderUserPrompt('translate-ui', promptContext, {
      elementsJson: JSON.stringify(items, null, 2),
    });

    try {
      const response = await this.provider.generateResponse({
        model: this.model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: this.temperature,
        maxTokens: this.maxTokens,
        extraBody: this.extraBody,
      });

      const parsed = tryParseJsonWithHealing<UITranslationItem[]>(response.content);
      if (!parsed || !Array.isArray(parsed)) {
        log('Failed to parse UI translation response');
        return items;
      }

      log('UI elements translated', {
        inputCount: items.length,
        outputCount: parsed.length,
      });

      return parsed;
    } catch (error) {
      log('UI translation failed:', error);
      return items;
    }
  }

  /**
   * Check if translation should be performed based on settings
   */
  static shouldTranslate(translationSettings: TranslationSettings): boolean {
    return translationSettings.enabled && translationSettings.targetLanguage !== 'en';
  }

  /**
   * Check if user input translation should be performed
   */
  static shouldTranslateInput(translationSettings: TranslationSettings): boolean {
    return translationSettings.enabled && translationSettings.translateUserInput;
  }

  /**
   * Check if narration translation should be performed
   */
  static shouldTranslateNarration(translationSettings: TranslationSettings): boolean {
    return translationSettings.enabled && translationSettings.translateNarration && translationSettings.targetLanguage !== 'en';
  }

  /**
   * Check if world state UI translation should be performed
   */
  static shouldTranslateWorldState(translationSettings: TranslationSettings): boolean {
    return translationSettings.enabled && translationSettings.translateWorldState && translationSettings.targetLanguage !== 'en';
  }
}

/**
 * Get all supported language codes with their display names
 */
export function getSupportedLanguages(): { code: string; name: string }[] {
  return SUPPORTED_LANGUAGE_CODES
    .map(code => {
      try {
        return { code, name: languageDisplayNames.of(code) || code };
      } catch {
        return { code, name: code };
      }
    })
    .sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Get language name for display using Intl API
 */
export function getLanguageDisplayName(code: string): string {
  if (code === 'auto') return 'Auto-detect';
  try {
    return languageDisplayNames.of(code) || code;
  } catch {
    return code;
  }
}
