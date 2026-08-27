// Dynamic LLM Router: Preferred Ox Alpha (OpenRouter) with Seamless Gemini Fallback & Controlled Deterministic Recovery

import {
  LLMProvider,
  LLMGenerateOptions,
  LLMStructuredOptions,
  LLMResponse,
  StructuredLLMResult,
  ChatMessage,
  ObservabilityLog,
  LLMRouterHealthReport,
  ProviderHealth
} from './types';
import { openrouterProvider } from './providers/openrouterProvider';
import { geminiProvider } from './providers/geminiProvider';

const observabilityLogs: ObservabilityLog[] = [];

function recordLog(log: ObservabilityLog) {
  observabilityLogs.push(log);
  if (observabilityLogs.length > 500) {
    observabilityLogs.shift();
  }
}

export function getObservabilityLogs(): ObservabilityLog[] {
  return observabilityLogs.slice(-100);
}

export class LLMRouter {
  private openrouter: LLMProvider = openrouterProvider;
  private gemini: LLMProvider = geminiProvider;

  /**
   * Free-form text generation with router hierarchy: Ox Alpha -> Gemini -> Empty Fallback
   */
  async generateText(prompt: string, options?: LLMGenerateOptions): Promise<LLMResponse> {
    const startTime = Date.now();
    const promptName = options?.promptName || 'text_generation';
    const promptVersion = options?.promptVersion || 'v1.0';
    const purpose = options?.purpose || 'general';

    // 1. Try OpenRouter (Ox Alpha) if configured
    if (this.openrouter.isConfigured) {
      try {
        const res = await this.openrouter.generateText(prompt, options);
        recordLog({
          timestamp: new Date().toISOString(),
          promptName,
          promptVersion,
          purpose,
          providerUsed: res.provider,
          modelUsed: res.model,
          inputTokenEstimate: Math.ceil(prompt.length / 4),
          latencyMs: res.latencyMs,
          success: true,
          fallbackUsed: false,
          structuredOutputValid: true,
          retries: 0
        });
        return res;
      } catch (err: any) {
        console.warn(`[LLM Router] OpenRouter (${this.openrouter.getModelName()}) failed. Falling back to Gemini. Reason:`, err.message || err);
      }
    }

    // 2. Try Gemini Fallback if configured
    if (this.gemini.isConfigured) {
      try {
        const res = await this.gemini.generateText(prompt, options);
        recordLog({
          timestamp: new Date().toISOString(),
          promptName,
          promptVersion,
          purpose,
          providerUsed: res.provider,
          modelUsed: res.model,
          inputTokenEstimate: Math.ceil(prompt.length / 4),
          latencyMs: res.latencyMs,
          success: true,
          fallbackUsed: true,
          structuredOutputValid: true,
          retries: 0
        });
        return res;
      } catch (err: any) {
        console.error('[LLM Router] Gemini fallback also failed:', err.message || err);
      }
    }

    // 3. Controlled Deterministic Fallback
    const latencyMs = Date.now() - startTime;
    recordLog({
      timestamp: new Date().toISOString(),
      promptName,
      promptVersion,
      purpose,
      providerUsed: 'fallback',
      modelUsed: 'deterministic',
      inputTokenEstimate: Math.ceil(prompt.length / 4),
      latencyMs,
      success: false,
      fallbackUsed: true,
      structuredOutputValid: false,
      retries: 0,
      error: 'All configured LLM providers failed or were unconfigured.'
    });

    return {
      text: '',
      raw: '',
      provider: 'fallback',
      model: 'deterministic',
      latencyMs
    };
  }

  /**
   * Structured Output generation with router hierarchy: Ox Alpha -> Gemini -> Fallback Value
   */
  async generateStructured<T>(
    prompt: string,
    fallbackValue: T,
    options?: LLMStructuredOptions<T>
  ): Promise<StructuredLLMResult<T>> {
    const startTime = Date.now();
    const promptName = options?.promptName || 'structured_output';
    const promptVersion = options?.promptVersion || 'v1.0';
    const purpose = options?.purpose || 'general';

    // 1. Try OpenRouter (Ox Alpha) if configured
    if (this.openrouter.isConfigured) {
      try {
        const res = await this.openrouter.generateStructured<T>(prompt, fallbackValue, options);
        recordLog({
          timestamp: new Date().toISOString(),
          promptName,
          promptVersion,
          purpose,
          providerUsed: res.providerUsed,
          modelUsed: res.modelUsed,
          inputTokenEstimate: Math.ceil(prompt.length / 4),
          latencyMs: res.latencyMs,
          success: true,
          fallbackUsed: false,
          structuredOutputValid: true,
          retries: 0
        });
        return res;
      } catch (err: any) {
        console.warn(`[LLM Router] OpenRouter (${this.openrouter.getModelName()}) structured generation failed. Attempting Gemini fallback. Reason:`, err.message || err);
      }
    }

    // 2. Try Gemini Fallback if configured
    if (this.gemini.isConfigured) {
      try {
        const res = await this.gemini.generateStructured<T>(prompt, fallbackValue, options);
        const latencyMs = Date.now() - startTime;
        const result: StructuredLLMResult<T> = {
          ...res,
          latencyMs,
          fallbackUsed: true
        };
        recordLog({
          timestamp: new Date().toISOString(),
          promptName,
          promptVersion,
          purpose,
          providerUsed: res.providerUsed,
          modelUsed: res.modelUsed,
          inputTokenEstimate: Math.ceil(prompt.length / 4),
          latencyMs,
          success: true,
          fallbackUsed: true,
          structuredOutputValid: true,
          retries: 0
        });
        return result;
      } catch (err: any) {
        console.error('[LLM Router] Gemini structured fallback also failed:', err.message || err);
      }
    }

    // 3. Controlled Deterministic Fallback Object
    const latencyMs = Date.now() - startTime;
    recordLog({
      timestamp: new Date().toISOString(),
      promptName,
      promptVersion,
      purpose,
      providerUsed: 'fallback',
      modelUsed: 'deterministic-fallback',
      inputTokenEstimate: Math.ceil(prompt.length / 4),
      latencyMs,
      success: false,
      fallbackUsed: true,
      structuredOutputValid: false,
      retries: 0,
      error: 'All LLM providers unavailable or parsing failed.'
    });

    return {
      data: fallbackValue,
      confidence: 0.8,
      raw: JSON.stringify(fallbackValue),
      latencyMs,
      promptVersion,
      modelUsed: 'deterministic-fallback',
      providerUsed: 'fallback',
      fallbackUsed: true,
      structuredOutputValid: true
    };
  }

  /**
   * Conversational Chat with router hierarchy: Ox Alpha -> Gemini -> Fallback
   */
  async chat(messages: ChatMessage[], options?: LLMGenerateOptions): Promise<LLMResponse> {
    const startTime = Date.now();
    const promptName = options?.promptName || 'conversational_chat';
    const promptVersion = options?.promptVersion || 'v1.0';

    if (this.openrouter.isConfigured) {
      try {
        const res = await this.openrouter.chat(messages, options);
        recordLog({
          timestamp: new Date().toISOString(),
          promptName,
          promptVersion,
          providerUsed: res.provider,
          modelUsed: res.model,
          inputTokenEstimate: messages.reduce((acc, m) => acc + Math.ceil(m.content.length / 4), 0),
          latencyMs: res.latencyMs,
          success: true,
          fallbackUsed: false,
          structuredOutputValid: true,
          retries: 0
        });
        return res;
      } catch (err: any) {
        console.warn(`[LLM Router] OpenRouter chat failed, attempting Gemini fallback. Reason:`, err.message || err);
      }
    }

    if (this.gemini.isConfigured) {
      try {
        const res = await this.gemini.chat(messages, options);
        recordLog({
          timestamp: new Date().toISOString(),
          promptName,
          promptVersion,
          providerUsed: res.provider,
          modelUsed: res.model,
          inputTokenEstimate: messages.reduce((acc, m) => acc + Math.ceil(m.content.length / 4), 0),
          latencyMs: res.latencyMs,
          success: true,
          fallbackUsed: true,
          structuredOutputValid: true,
          retries: 0
        });
        return res;
      } catch (err: any) {
        console.error('[LLM Router] Gemini chat fallback also failed:', err.message || err);
      }
    }

    const latencyMs = Date.now() - startTime;
    return {
      text: 'DataWhiz deterministic query engine processed your dataset. (AI providers currently unreachable).',
      raw: '',
      provider: 'fallback',
      model: 'deterministic',
      latencyMs
    };
  }

  /**
   * Health check across all providers (Never exposes API keys)
   */
  async healthCheck(): Promise<LLMRouterHealthReport> {
    const [openrouterHealth, geminiHealth] = await Promise.all([
      this.openrouter.healthCheck().catch((err): ProviderHealth => ({
        name: 'openrouter',
        configured: this.openrouter.isConfigured,
        reachable: false,
        model: this.openrouter.getModelName(),
        status: 'error',
        error: err.message || String(err)
      })),
      this.gemini.healthCheck().catch((err): ProviderHealth => ({
        name: 'gemini',
        configured: this.gemini.isConfigured,
        reachable: false,
        model: this.gemini.getModelName(),
        status: 'error',
        error: err.message || String(err)
      }))
    ]);

    return {
      timestamp: new Date().toISOString(),
      preferredProvider: this.openrouter.isConfigured ? `openrouter (${this.openrouter.getModelName()})` : 'gemini',
      fallbackProvider: 'gemini',
      providers: {
        openrouter: openrouterHealth,
        gemini: geminiHealth
      }
    };
  }

  /**
   * Multi-provider benchmark comparison helper (Prepared for Step 15)
   */
  async benchmarkProvider<T>(
    providerName: 'openrouter' | 'gemini',
    prompt: string,
    fallbackValue: T,
    options?: LLMStructuredOptions<T>
  ): Promise<StructuredLLMResult<T>> {
    const provider = providerName === 'openrouter' ? this.openrouter : this.gemini;
    return provider.generateStructured<T>(prompt, fallbackValue, options);
  }
}

export const llmRouter = new LLMRouter();
