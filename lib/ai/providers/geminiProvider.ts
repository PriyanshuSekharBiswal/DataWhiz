// Google Gemini LLM Provider Implementation

import { GoogleGenerativeAI } from '@google/generative-ai';
import {
  LLMProvider,
  LLMGenerateOptions,
  LLMStructuredOptions,
  LLMResponse,
  StructuredLLMResult,
  ChatMessage,
  ProviderHealth
} from '../types';
import { cleanJsonOutput } from './openrouterProvider';

export class GeminiProvider implements LLMProvider {
  public readonly name = 'gemini';
  private genAI: GoogleGenerativeAI | null = null;

  constructor() {
    const apiKey = process.env.GEMINI_API_KEY || '';
    if (apiKey) {
      this.genAI = new GoogleGenerativeAI(apiKey);
    }
  }

  public get isConfigured(): boolean {
    return Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim());
  }

  public getModelName(): string {
    return process.env.LLM_MODEL || 'gemini-1.5-flash';
  }

  private getClient(): GoogleGenerativeAI {
    if (!this.genAI) {
      const apiKey = process.env.GEMINI_API_KEY || '';
      if (!apiKey) {
        throw new Error('[GeminiProvider] GEMINI_API_KEY is not configured in environment.');
      }
      this.genAI = new GoogleGenerativeAI(apiKey);
    }
    return this.genAI;
  }

  /**
   * Free-form text generation
   */
  async generateText(prompt: string, options?: LLMGenerateOptions): Promise<LLMResponse> {
    const startTime = Date.now();
    const modelName = this.getModelName();
    const client = this.getClient();

    const model = client.getGenerativeModel({
      model: modelName,
      systemInstruction: options?.systemInstruction || 'You are DataWhiz AI, a precise data intelligence engine. Always ground answers in actual facts.'
    });

    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: options?.temperature !== undefined ? options.temperature : 0.1,
        maxOutputTokens: options?.maxTokens || 4096
      }
    });

    const responseText = result.response.text();
    const latencyMs = Date.now() - startTime;

    return {
      text: responseText,
      raw: responseText,
      provider: this.name,
      model: modelName,
      latencyMs
    };
  }

  /**
   * Structured JSON output generation with validation and 1 retry
   */
  async generateStructured<T>(
    prompt: string,
    fallbackValue: T,
    options?: LLMStructuredOptions<T>
  ): Promise<StructuredLLMResult<T>> {
    const startTime = Date.now();
    const modelName = this.getModelName();
    const promptVersion = options?.promptVersion || 'v1.0';
    const client = this.getClient();

    let retries = 0;
    let lastError = '';

    while (retries <= 1) {
      try {
        const model = client.getGenerativeModel({
          model: modelName,
          systemInstruction: options?.systemInstruction || 'You are DataWhiz AI. Output MUST be strictly valid JSON without preamble or markdown.'
        });

        const currentPrompt = retries === 0
          ? `${prompt}\n\nIMPORTANT: Return ONLY a valid JSON object matching the required schema.`
          : `${prompt}\n\nPREVIOUS ATTEMPT FAILED TO PARSE. Return ONLY strict, valid raw JSON without quotes or markdown fences.`;

        const result = await model.generateContent({
          contents: [{ role: 'user', parts: [{ text: currentPrompt }] }],
          generationConfig: {
            temperature: options?.temperature !== undefined ? options.temperature : 0.1,
            responseMimeType: 'application/json'
          }
        });

        const rawText = result.response.text();
        const cleaned = cleanJsonOutput(rawText);
        const parsed = JSON.parse(cleaned);

        if (options?.validator && !options.validator(parsed)) {
          throw new Error('[GeminiProvider] JSON failed custom schema validator check.');
        }

        const latencyMs = Date.now() - startTime;

        return {
          data: parsed as T,
          confidence: (parsed as any)?.confidence || 0.9,
          raw: cleaned,
          latencyMs,
          promptVersion,
          modelUsed: modelName,
          providerUsed: this.name,
          fallbackUsed: false,
          structuredOutputValid: true
        };
      } catch (err: any) {
        lastError = err.message || String(err);
        retries++;
      }
    }

    throw new Error(`[Gemini Structured Execution Failed]: ${lastError}`);
  }

  /**
   * Multi-turn conversational chat
   */
  async chat(messages: ChatMessage[], options?: LLMGenerateOptions): Promise<LLMResponse> {
    const startTime = Date.now();
    const modelName = this.getModelName();
    const client = this.getClient();

    const systemMsg = messages.find(m => m.role === 'system');
    const conversation = messages.filter(m => m.role !== 'system');

    const model = client.getGenerativeModel({
      model: modelName,
      systemInstruction: options?.systemInstruction || systemMsg?.content || 'You are DataWhiz AI.'
    });

    const chatSession = model.startChat({
      history: conversation.slice(0, -1).map(m => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }]
      })),
      generationConfig: {
        temperature: options?.temperature !== undefined ? options.temperature : 0.1,
        maxOutputTokens: options?.maxTokens || 4096
      }
    });

    const lastMsg = conversation[conversation.length - 1]?.content || '';
    const result = await chatSession.sendMessage(lastMsg);
    const responseText = result.response.text();
    const latencyMs = Date.now() - startTime;

    return {
      text: responseText,
      raw: responseText,
      provider: this.name,
      model: modelName,
      latencyMs
    };
  }

  /**
   * Lightweight server-side health check
   */
  async healthCheck(): Promise<ProviderHealth> {
    const modelName = this.getModelName();
    if (!this.isConfigured) {
      return {
        name: this.name,
        configured: false,
        reachable: false,
        model: modelName,
        status: 'unconfigured',
        error: 'GEMINI_API_KEY not configured'
      };
    }

    const startTime = Date.now();
    try {
      const client = this.getClient();
      const model = client.getGenerativeModel({ model: modelName });
      const result = await model.generateContent({
        contents: [{ role: 'user', parts: [{ text: 'Reply with JSON: {"status":"healthy"}' }] }],
        generationConfig: { maxOutputTokens: 20, responseMimeType: 'application/json' }
      });

      const latencyMs = Date.now() - startTime;
      const text = result.response.text();

      return {
        name: this.name,
        configured: true,
        reachable: Boolean(text),
        model: modelName,
        status: text ? 'healthy' : 'standby',
        latencyMs
      };
    } catch (err: any) {
      return {
        name: this.name,
        configured: true,
        reachable: false,
        model: modelName,
        status: 'error',
        latencyMs: Date.now() - startTime,
        error: err.message || String(err)
      };
    }
  }
}

export const geminiProvider = new GeminiProvider();
