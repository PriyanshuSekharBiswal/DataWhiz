// LLM Provider Interface Facade: Routes requests through LLMRouter (Ox Alpha via OpenRouter preferred with Gemini fallback)

import {
  LLMGenerateOptions,
  LLMStructuredOptions,
  StructuredLLMResult,
  LLMResponse,
  ObservabilityLog
} from '../types';
import { llmRouter, getObservabilityLogs } from '../llmRouter';
import { cleanJsonOutput } from '../providers/openrouterProvider';

export { cleanJsonOutput, getObservabilityLogs };
export type { StructuredLLMResult, ObservabilityLog };

export interface LLMConfig {
  provider: 'openrouter' | 'gemini' | 'openai' | 'anthropic' | 'local';
  modelName: string;
  temperature: number;
  maxTokens: number;
  promptVersion: string;
}

const DEFAULT_CONFIG: LLMConfig = {
  provider: (process.env.LLM_PROVIDER as any) || 'openrouter',
  modelName: process.env.OPENROUTER_MODEL || 'openrouter/free',
  temperature: 0.1,
  maxTokens: 4096,
  promptVersion: 'v2.1'
};

/**
 * Unified LLM Client Facade
 */
export class LLMClient {
  private config: LLMConfig;

  constructor(customConfig?: Partial<LLMConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...customConfig };
  }

  /**
   * Free-form text generation with system instruction grounding
   */
  async generate(prompt: string, systemInstruction?: string): Promise<string> {
    const res = await llmRouter.generateText(prompt, {
      systemInstruction: systemInstruction || 'You are DataWhiz AI, a precise data intelligence engine. Always ground answers in actual facts.',
      temperature: this.config.temperature,
      maxTokens: this.config.maxTokens,
      promptVersion: this.config.promptVersion
    });
    return res.text;
  }

  /**
   * Structured JSON Output with Automatic Validation and Retries across Router Hierarchy
   */
  async structuredOutput<T>(
    prompt: string,
    fallbackValue: T,
    options?: {
      systemInstruction?: string;
      promptName?: string;
      promptVersion?: string;
      validator?: (data: any) => boolean;
    }
  ): Promise<StructuredLLMResult<T>> {
    return llmRouter.generateStructured<T>(prompt, fallbackValue, {
      systemInstruction: options?.systemInstruction,
      promptName: options?.promptName,
      promptVersion: options?.promptVersion || this.config.promptVersion,
      validator: options?.validator,
      temperature: this.config.temperature,
      maxTokens: this.config.maxTokens
    });
  }
}

export const defaultLLMClient = new LLMClient();
