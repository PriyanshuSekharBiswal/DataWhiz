// LLM Service Adapter (Routes through LLMRouter: Ox Alpha via OpenRouter preferred with Gemini fallback)

import { llmRouter } from '@/lib/ai/llmRouter';

export async function askGeminiJSON<T = any>(
  systemPrompt: string,
  userPrompt: string,
  modelName?: string
): Promise<T | null> {
  try {
    const result = await llmRouter.generateStructured<T | null>(userPrompt, null, {
      systemInstruction: systemPrompt,
      promptName: 'legacy_ask_json',
      temperature: 0.1
    });
    return result.data;
  } catch (error: any) {
    console.error('[LLM Service Error]', error?.message || error);
    return null;
  }
}

export async function askGeminiText(
  systemPrompt: string,
  userPrompt: string,
  modelName?: string
): Promise<string> {
  try {
    const result = await llmRouter.generateText(userPrompt, {
      systemInstruction: systemPrompt,
      promptName: 'legacy_ask_text',
      temperature: 0.1
    });
    return result.text;
  } catch (error: any) {
    console.error('[LLM Text Error]', error?.message || error);
    return '';
  }
}
