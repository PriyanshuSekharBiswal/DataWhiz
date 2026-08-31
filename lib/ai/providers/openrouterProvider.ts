// OpenRouter / Ox Alpha LLM Provider Implementation

import {
  LLMProvider,
  LLMGenerateOptions,
  LLMStructuredOptions,
  LLMResponse,
  StructuredLLMResult,
  ChatMessage,
  ProviderHealth
} from '../types';

/**
 * Clean LLM output to extract valid JSON without markdown wrapping
 */
export function cleanJsonOutput(text: string): string {
  if (!text) return '{}';
  let cleaned = text.trim();

  // Strip Markdown code blocks (```json ... ``` or ``` ...)
  if (cleaned.startsWith('```json')) {
    cleaned = cleaned.replace(/^```json\s*/i, '').replace(/\s*```$/i, '');
  } else if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```\s*/i, '').replace(/\s*```$/i, '');
  }

  // Find first { or [ and last } or ]
  const firstBrace = cleaned.indexOf('{');
  const firstBracket = cleaned.indexOf('[');
  const lastBrace = cleaned.lastIndexOf('}');
  const lastBracket = cleaned.lastIndexOf(']');

  if (firstBrace !== -1 && (firstBracket === -1 || firstBrace < firstBracket)) {
    if (lastBrace !== -1) {
      cleaned = cleaned.slice(firstBrace, lastBrace + 1);
    }
  } else if (firstBracket !== -1) {
    if (lastBracket !== -1) {
      cleaned = cleaned.slice(firstBracket, lastBracket + 1);
    }
  }

  return cleaned.trim();
}

export class OpenRouterProvider implements LLMProvider {
  public readonly name = 'openrouter';

  public get isConfigured(): boolean {
    return Boolean(process.env.OPENROUTER_API_KEY && process.env.OPENROUTER_API_KEY.trim());
  }

  public getModelName(): string {
    return process.env.OPENROUTER_MODEL || 'openrouter/free';
  }

  private getApiKey(): string {
    return process.env.OPENROUTER_API_KEY || '';
  }

  private getHeaders(): Record<string, string> {
    const key = this.getApiKey();
    return {
      'Authorization': `Bearer ${key}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'http://localhost:3000',
      'X-Title': 'DataWhiz AI Analytics Platform'
    };
  }

  /**
   * Free-form text generation
   */
  async generateText(prompt: string, options?: LLMGenerateOptions): Promise<LLMResponse> {
    const startTime = Date.now();
    const model = this.getModelName();

    if (!this.isConfigured) {
      throw new Error('[OpenRouter] OPENROUTER_API_KEY is not configured in environment.');
    }

    const messages: ChatMessage[] = [];
    if (options?.systemInstruction) {
      messages.push({ role: 'system', content: options.systemInstruction });
    }
    messages.push({ role: 'user', content: prompt });

    const timeoutMs = options?.timeoutMs || 30000;
    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({
        model,
        messages,
        temperature: options?.temperature !== undefined ? options.temperature : 0.1,
        max_tokens: options?.maxTokens || 4096
      }),
      signal: AbortSignal.timeout(timeoutMs)
    });

    if (!res.ok) {
      const errorText = await res.text().catch(() => res.statusText);
      throw new Error(`[OpenRouter HTTP ${res.status}] ${errorText}`);
    }

    const data = await res.json();
    const text = data.choices?.[0]?.message?.content || '';
    const latencyMs = Date.now() - startTime;

    return {
      text,
      raw: text,
      provider: this.name,
      model,
      latencyMs,
      usage: data.usage ? {
        promptTokens: data.usage.prompt_tokens || 0,
        completionTokens: data.usage.completion_tokens || 0,
        totalTokens: data.usage.total_tokens || 0
      } : undefined
    };
  }

  /**
   * Structured JSON output generation with validation and 1 controlled retry
   */
  async generateStructured<T>(
    prompt: string,
    fallbackValue: T,
    options?: LLMStructuredOptions<T>
  ): Promise<StructuredLLMResult<T>> {
    const startTime = Date.now();
    const model = this.getModelName();
    const promptVersion = options?.promptVersion || 'v1.0';

    if (!this.isConfigured) {
      throw new Error('[OpenRouter] OPENROUTER_API_KEY is not configured.');
    }

    let retries = 0;
    let lastError = '';

    while (retries <= 1) {
      try {
        const timeoutMs = options?.timeoutMs || 30000;
        const currentPrompt = retries === 0
          ? `${prompt}\n\nIMPORTANT: Return ONLY a valid JSON object matching the required schema. Do NOT include markdown code blocks or conversational text.`
          : `${prompt}\n\nPREVIOUS ATTEMPT FAILED TO PARSE. Return ONLY strict, raw JSON without markdown wrapping or explanations.`;

        const messages: ChatMessage[] = [];
        if (options?.systemInstruction) {
          messages.push({
            role: 'system',
            content: `${options.systemInstruction}\nOutput MUST be strictly valid JSON without preamble or markdown.`
          });
        }
        messages.push({ role: 'user', content: currentPrompt });

        const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: this.getHeaders(),
          body: JSON.stringify({
            model,
            messages,
            temperature: options?.temperature !== undefined ? options.temperature : 0.1,
            max_tokens: options?.maxTokens || 4096,
            response_format: { type: 'json_object' }
          }),
          signal: AbortSignal.timeout(timeoutMs)
        });

        if (!res.ok) {
          const errBody = await res.text().catch(() => res.statusText);
          throw new Error(`[OpenRouter HTTP ${res.status}] ${errBody}`);
        }

        const data = await res.json();
        const rawContent = data.choices?.[0]?.message?.content || '';
        const cleaned = cleanJsonOutput(rawContent);

        if (!cleaned || cleaned === '{}') {
          throw new Error('[OpenRouter] Empty content returned from model.');
        }

        const parsed = JSON.parse(cleaned);

        if (options?.validator && !options.validator(parsed)) {
          throw new Error('[OpenRouter] Response JSON failed custom schema validator check.');
        }

        const latencyMs = Date.now() - startTime;

        return {
          data: parsed as T,
          confidence: (parsed as any)?.confidence || 0.92,
          raw: cleaned,
          latencyMs,
          promptVersion,
          modelUsed: model,
          providerUsed: this.name,
          fallbackUsed: false,
          structuredOutputValid: true
        };
      } catch (err: any) {
        lastError = err.message || String(err);
        retries++;
      }
    }

    throw new Error(`[OpenRouter Structured Execution Failed]: ${lastError}`);
  }

  /**
   * Multi-turn conversational chat
   */
  async chat(messages: ChatMessage[], options?: LLMGenerateOptions): Promise<LLMResponse> {
    const startTime = Date.now();
    const model = this.getModelName();

    if (!this.isConfigured) {
      throw new Error('[OpenRouter] OPENROUTER_API_KEY is not configured.');
    }

    const timeoutMs = options?.timeoutMs || 30000;
    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({
        model,
        messages,
        temperature: options?.temperature !== undefined ? options.temperature : 0.1,
        max_tokens: options?.maxTokens || 4096
      }),
      signal: AbortSignal.timeout(timeoutMs)
    });

    if (!res.ok) {
      const errorText = await res.text().catch(() => res.statusText);
      throw new Error(`[OpenRouter HTTP ${res.status}] ${errorText}`);
    }

    const data = await res.json();
    const text = data.choices?.[0]?.message?.content || '';
    const latencyMs = Date.now() - startTime;

    return {
      text,
      raw: text,
      provider: this.name,
      model,
      latencyMs,
      usage: data.usage ? {
        promptTokens: data.usage.prompt_tokens || 0,
        completionTokens: data.usage.completion_tokens || 0,
        totalTokens: data.usage.total_tokens || 0
      } : undefined
    };
  }

  /**
   * Lightweight server-side health check
   */
  async healthCheck(): Promise<ProviderHealth> {
    const model = this.getModelName();
    if (!this.isConfigured) {
      return {
        name: this.name,
        configured: false,
        reachable: false,
        model,
        status: 'unconfigured',
        error: 'OPENROUTER_API_KEY not configured'
      };
    }

    const startTime = Date.now();
    try {
      const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({
          model,
          messages: [
            { role: 'system', content: 'Healthcheck' },
            { role: 'user', content: 'Reply with JSON: {"status":"healthy"}' }
          ],
          max_tokens: 50,
          response_format: { type: 'json_object' }
        }),
        signal: AbortSignal.timeout(12000)
      });

      const latencyMs = Date.now() - startTime;

      if (res.ok) {
        return {
          name: this.name,
          configured: true,
          reachable: true,
          model,
          status: 'healthy',
          latencyMs
        };
      }

      const errText = await res.text().catch(() => res.statusText);
      return {
        name: this.name,
        configured: true,
        reachable: false,
        model,
        status: 'error',
        latencyMs,
        error: `HTTP ${res.status}: ${errText.slice(0, 120)}`
      };
    } catch (err: any) {
      return {
        name: this.name,
        configured: true,
        reachable: false,
        model,
        status: 'error',
        latencyMs: Date.now() - startTime,
        error: err.message || String(err)
      };
    }
  }
}

export const openrouterProvider = new OpenRouterProvider();
