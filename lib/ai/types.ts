// Provider-Independent LLM Types and Interfaces for DataWhiz AI

export type LLMProviderType = 'openrouter' | 'gemini' | 'fallback' | string;

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface LLMGenerateOptions {
  systemInstruction?: string;
  temperature?: number;
  maxTokens?: number;
  promptName?: string;
  promptVersion?: string;
  timeoutMs?: number;
  purpose?: string;
}

export interface LLMStructuredOptions<T> extends LLMGenerateOptions {
  validator?: (data: any) => boolean;
  schemaDescription?: string;
}

export interface LLMResponse {
  text: string;
  raw: string;
  provider: string;
  model: string;
  latencyMs: number;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export interface StructuredLLMResult<T> {
  data: T;
  confidence: number;
  raw: string;
  latencyMs: number;
  promptVersion: string;
  modelUsed: string;
  providerUsed: string;
  fallbackUsed: boolean;
  structuredOutputValid: boolean;
  error?: string;
}

export interface ProviderHealth {
  name: string;
  configured: boolean;
  reachable: boolean;
  model: string;
  status: 'healthy' | 'standby' | 'error' | 'unconfigured';
  latencyMs?: number;
  error?: string;
}

export interface LLMRouterHealthReport {
  timestamp: string;
  preferredProvider: string;
  fallbackProvider: string;
  providers: {
    openrouter: ProviderHealth;
    gemini: ProviderHealth;
  };
}

export interface ObservabilityLog {
  timestamp: string;
  promptName: string;
  promptVersion: string;
  purpose?: string;
  providerUsed: string;
  modelUsed: string;
  inputTokenEstimate: number;
  latencyMs: number;
  success: boolean;
  fallbackUsed: boolean;
  structuredOutputValid: boolean;
  retries: number;
  error?: string;
}

export interface LLMProvider {
  readonly name: string;
  readonly isConfigured: boolean;
  getModelName(): string;
  generateText(prompt: string, options?: LLMGenerateOptions): Promise<LLMResponse>;
  generateStructured<T>(prompt: string, fallbackValue: T, options?: LLMStructuredOptions<T>): Promise<StructuredLLMResult<T>>;
  chat(messages: ChatMessage[], options?: LLMGenerateOptions): Promise<LLMResponse>;
  healthCheck(): Promise<ProviderHealth>;
}
