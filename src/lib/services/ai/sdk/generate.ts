/**
 * Unified Generate Functions
 *
 * Central module for all AI generation operations using the Vercel AI SDK.
 * Uses explicit provider selection from APIProfile.providerType.
 */

import { generateText, streamText, Output } from 'ai';
import type { ProviderOptions } from '@ai-sdk/provider-utils';
import type { z } from 'zod';
import { settings } from '$lib/stores/settings.svelte';
import { createProviderFromProfile } from './providers';
import type { ProviderType, GenerationPreset, ReasoningEffort, APIProfile } from '$lib/types';
import { createLogger } from '../core/config';

const log = createLogger('Generate');

// JSON-compatible types for provider options
type JSONValue = null | string | number | boolean | JSONObject | JSONValue[];
type JSONObject = { [key: string]: JSONValue | undefined };

// ============================================================================
// Types
// ============================================================================

interface BaseGenerateOptions {
  /** Preset ID (e.g., 'suggestions', 'classifier') */
  presetId: string;
  /** System prompt */
  system: string;
  /** User prompt */
  prompt: string;
  /** Optional abort signal for cancellation */
  signal?: AbortSignal;
}

interface GenerateObjectOptions<T extends z.ZodType> extends BaseGenerateOptions {
  /** Zod schema for output validation */
  schema: T;
}

// ============================================================================
// Provider Options Builder
// ============================================================================

/**
 * Map provider types to their providerOptions key in the AI SDK.
 */
const PROVIDER_OPTIONS_KEY: Record<ProviderType, string> = {
  openrouter: 'openrouter',
  openai: 'openai',
  anthropic: 'anthropic',
  google: 'google',
};

/**
 * Convert reasoning effort level to token budget for Anthropic.
 */
function effortToBudget(effort: ReasoningEffort): number {
  const budgets: Record<ReasoningEffort, number> = {
    off: 0,
    low: 4000,
    medium: 8000,
    high: 16000,
  };
  return budgets[effort] ?? 8000;
}

/**
 * Build provider-specific options from preset settings.
 * Uses explicit providerType from profile.
 */
export function buildProviderOptions(
  preset: GenerationPreset,
  providerType: ProviderType
): ProviderOptions | undefined {
  const options: JSONObject = {};
  const providerKey = PROVIDER_OPTIONS_KEY[providerType];

  // Reasoning configuration (provider-specific format)
  if (preset.reasoningEffort && preset.reasoningEffort !== 'off') {
    switch (providerType) {
      case 'openrouter':
        // OpenRouter: { reasoning: { effort: 'low'|'medium'|'high' } }
        options.reasoning = { effort: preset.reasoningEffort };
        break;
      case 'openai':
        // OpenAI (o1 models): { reasoningEffort: 'low'|'medium'|'high' }
        options.reasoningEffort = preset.reasoningEffort;
        break;
      case 'anthropic':
        // Anthropic: { thinking: { type: 'enabled', budgetTokens: N } }
        options.thinking = { type: 'enabled', budgetTokens: effortToBudget(preset.reasoningEffort) };
        break;
      case 'google':
        // Google: No reasoning support yet
        break;
    }
  }

  // Provider routing (OpenRouter only)
  if (providerType === 'openrouter' && preset.providerOnly?.length) {
    options.provider = { only: preset.providerOnly };
  }

  // Manual body params (top_p, top_k, penalties, etc.)
  if (preset.manualBody) {
    try {
      const manual = JSON.parse(preset.manualBody) as JSONObject;
      if (manual && typeof manual === 'object' && !Array.isArray(manual)) {
        for (const [key, value] of Object.entries(manual)) {
          if (!['messages', 'tools', 'tool_choice', 'stream', 'model'].includes(key)) {
            options[key] = value;
          }
        }
      }
    } catch {
      log('Invalid manualBody JSON, skipping');
    }
  }

  if (Object.keys(options).length === 0) {
    return undefined;
  }

  return { [providerKey]: options } as ProviderOptions;
}

// ============================================================================
// Config Resolution
// ============================================================================

interface ResolvedConfig {
  preset: GenerationPreset;
  profile: APIProfile;
  providerType: ProviderType;
  model: ReturnType<ReturnType<typeof createProviderFromProfile>['chat']>;
  providerOptions: ProviderOptions | undefined;
}

/**
 * Resolve preset → profile → model.
 * This is the single place where we go from presetId to a ready-to-use model.
 */
function resolveConfig(presetId: string): ResolvedConfig {
  const preset = settings.getPresetConfig(presetId);
  const profileId = preset.profileId ?? settings.apiSettings.mainNarrativeProfileId;
  const profile = settings.getProfile(profileId);

  if (!profile) {
    throw new Error(`Profile not found: ${profileId}`);
  }

  const provider = createProviderFromProfile(profile);
  const model = provider.chat(preset.model);
  const providerOptions = buildProviderOptions(preset, profile.providerType);

  return { preset, profile, providerType: profile.providerType, model, providerOptions };
}

/**
 * Resolved config for main narrative profile.
 * Uses settings from apiSettings directly.
 */
interface NarrativeConfig {
  profile: APIProfile;
  providerType: ProviderType;
  model: ReturnType<ReturnType<typeof createProviderFromProfile>['chat']>;
  temperature: number;
  maxTokens: number;
  providerOptions: ProviderOptions | undefined;
}

/**
 * Resolve config from the main narrative profile.
 * Uses apiSettings.defaultModel, temperature, and maxTokens directly.
 */
function resolveNarrativeConfig(): NarrativeConfig {
  const profile = settings.getMainNarrativeProfile();

  if (!profile) {
    throw new Error('Main narrative profile not configured. Please set up an API profile in Settings.');
  }

  const provider = createProviderFromProfile(profile);
  const modelId = settings.apiSettings.defaultModel;
  const model = provider.chat(modelId);

  // Build a minimal preset-like object for provider options
  const narrativePreset: GenerationPreset = {
    id: '_narrative',
    name: 'Narrative',
    description: 'Main narrative generation',
    profileId: profile.id,
    model: modelId,
    temperature: settings.apiSettings.temperature,
    maxTokens: settings.apiSettings.maxTokens,
    reasoningEffort: settings.apiSettings.reasoningEffort ?? 'off',
    providerOnly: [],
    manualBody: ''
  };

  const providerOptions = buildProviderOptions(narrativePreset, profile.providerType);

  return {
    profile,
    providerType: profile.providerType,
    model,
    temperature: settings.apiSettings.temperature,
    maxTokens: settings.apiSettings.maxTokens,
    providerOptions
  };
}

// ============================================================================
// Generate Functions
// ============================================================================

/**
 * Generate structured output from LLM.
 * Uses AI SDK's Output.object() for automatic Zod schema validation.
 */
export async function generateStructured<T extends z.ZodType>(
  options: GenerateObjectOptions<T>
): Promise<z.infer<T>> {
  const { presetId, schema, system, prompt, signal } = options;
  const { preset, providerType, model, providerOptions } = resolveConfig(presetId);

  log('generateStructured', { presetId, model: preset.model, providerType });

  const result = await generateText({
    model,
    system,
    prompt,
    output: Output.object({ schema }),
    temperature: preset.temperature,
    maxOutputTokens: preset.maxTokens,
    providerOptions,
    abortSignal: signal,
  });

  return result.output as z.infer<T>;
}

/**
 * Generate plain text output from LLM.
 */
export async function generatePlainText(options: BaseGenerateOptions): Promise<string> {
  const { presetId, system, prompt, signal } = options;
  const { preset, providerType, model, providerOptions } = resolveConfig(presetId);

  log('generatePlainText', { presetId, model: preset.model, providerType });

  const { text } = await generateText({
    model,
    system,
    prompt,
    temperature: preset.temperature,
    maxOutputTokens: preset.maxTokens,
    providerOptions,
    abortSignal: signal,
  });

  return text;
}

/**
 * Stream text output from LLM.
 */
export function streamPlainText(options: BaseGenerateOptions) {
  const { presetId, system, prompt, signal } = options;
  const { preset, providerType, model, providerOptions } = resolveConfig(presetId);

  log('streamPlainText', { presetId, model: preset.model, providerType });

  return streamText({
    model,
    system,
    prompt,
    temperature: preset.temperature,
    maxOutputTokens: preset.maxTokens,
    providerOptions,
    abortSignal: signal,
  });
}

/**
 * Stream structured output from LLM.
 */
export function streamStructured<T extends z.ZodType>(options: GenerateObjectOptions<T>) {
  const { presetId, schema, system, prompt, signal } = options;
  const { preset, providerType, model, providerOptions } = resolveConfig(presetId);

  log('streamStructured', { presetId, model: preset.model, providerType });

  return streamText({
    model,
    system,
    prompt,
    output: Output.object({ schema }),
    temperature: preset.temperature,
    maxOutputTokens: preset.maxTokens,
    providerOptions,
    abortSignal: signal,
  });
}

// ============================================================================
// Narrative Generation Functions (Main Profile)
// ============================================================================

interface NarrativeGenerateOptions {
  /** System prompt */
  system: string;
  /** User prompt */
  prompt: string;
  /** Optional abort signal for cancellation */
  signal?: AbortSignal;
}

/**
 * Stream narrative text using the main narrative profile.
 * Uses apiSettings.defaultModel, temperature, and maxTokens.
 */
export function streamNarrative(options: NarrativeGenerateOptions) {
  const { system, prompt, signal } = options;
  const { providerType, model, temperature, maxTokens, providerOptions } = resolveNarrativeConfig();

  log('streamNarrative', { model: settings.apiSettings.defaultModel, providerType });

  return streamText({
    model,
    system,
    prompt,
    temperature,
    maxOutputTokens: maxTokens,
    providerOptions,
    abortSignal: signal,
  });
}

/**
 * Generate narrative text using the main narrative profile.
 * Uses apiSettings.defaultModel, temperature, and maxTokens.
 */
export async function generateNarrative(options: NarrativeGenerateOptions): Promise<string> {
  const { system, prompt, signal } = options;
  const { providerType, model, temperature, maxTokens, providerOptions } = resolveNarrativeConfig();

  log('generateNarrative', { model: settings.apiSettings.defaultModel, providerType });

  const { text } = await generateText({
    model,
    system,
    prompt,
    temperature,
    maxOutputTokens: maxTokens,
    providerOptions,
    abortSignal: signal,
  });

  return text;
}
