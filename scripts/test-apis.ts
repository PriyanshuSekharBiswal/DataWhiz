import { fetchTavilyNews } from '../lib/services/tavilyService';
import { askGeminiJSON } from '../lib/services/geminiService';

async function testServices() {
  console.log('Testing Tavily News API with provided key...');
  const news = await fetchTavilyNews('Retail Sales and E-Commerce');
  console.log(`Fetched ${news.length} news items from Tavily:`);
  news.slice(0, 2).forEach((n, i) => console.log(` [${i+1}] ${n.headline} (${n.source})`));

  console.log('\nTesting Google Gemini API with provided key...');
  const res = await askGeminiJSON<{ test: string }>(
    'You are a helpful assistant. Reply in JSON.',
    'Reply with {"test": "Gemini LLM Connected Successfully"}'
  );
  console.log('Gemini Response:', res);
}

testServices();
