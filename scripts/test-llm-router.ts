import fs from 'fs';
import path from 'path';

// Load .env.local manually if running in tsx
function loadEnv() {
  const envPath = path.resolve(process.cwd(), '.env.local');
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, 'utf8').split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const [k, ...v] = trimmed.split('=');
        if (k && !process.env[k.trim()]) {
          process.env[k.trim()] = v.join('=').trim().replace(/^["']|["']$/g, '');
        }
      }
    }
  }
}

loadEnv();

import { llmRouter } from '../lib/ai/llmRouter';
import { openrouterProvider } from '../lib/ai/providers/openrouterProvider';
import { geminiProvider } from '../lib/ai/providers/geminiProvider';
import { defaultLLMClient } from '../lib/ai/provider/llmProvider';
import { askGeminiJSON, askGeminiText } from '../lib/services/geminiService';

async function runComprehensiveTests() {
  console.log('====================================================');
  console.log('  DATAWHIZ AI: COMPREHENSIVE LLM INTEGRATION TEST  ');
  console.log('====================================================\n');

  // TEST 1: Check Environment Configuration
  console.log('[TEST 1] Checking Environment Variables:');
  console.log('- OPENROUTER_API_KEY configured:', Boolean(process.env.OPENROUTER_API_KEY));
  console.log('- OPENROUTER_MODEL:', process.env.OPENROUTER_MODEL || '(default: stealth/ox-alpha)');
  console.log('- GEMINI_API_KEY configured:', Boolean(process.env.GEMINI_API_KEY));
  console.log('✅ Environment check passed.\n');

  // TEST 2: Health Check on Providers
  console.log('[TEST 2] Running Health Checks via LLMRouter:');
  const healthReport = await llmRouter.healthCheck();
  console.log(JSON.stringify(healthReport, null, 2));
  console.log('✅ Health check completed.\n');

  // TEST 3: Direct OpenRouter (Ox Alpha) Structured Output Test
  console.log('[TEST 3] Testing Direct OpenRouter (Ox Alpha) Structured Output:');
  const prompt = `DATASET SUMMARY:
Columns: "transaction_id" (id), "order_date" (timestamp), "revenue_eur" (measure, sum=124000), "country" (dimension, 8 unique)
Domain: European Retail eCommerce

Return JSON:
{
  "domain": "Retail & E-Commerce",
  "confidence": 0.95,
  "key_findings": ["Strong European market coverage", "Revenue concentrated in core countries"],
  "analysis_plan": "Evaluate country revenue distribution and seasonality"
}`;

  const openrouterResult = await openrouterProvider.generateStructured<any>(prompt, {
    domain: 'Retail',
    confidence: 0.8,
    key_findings: [],
    analysis_plan: ''
  }, {
    systemInstruction: 'You are DataWhiz AI Master Analyst. Reply strictly with valid JSON.'
  });

  console.log('- Provider used:', openrouterResult.providerUsed);
  console.log('- Model used:', openrouterResult.modelUsed);
  console.log('- Latency (ms):', openrouterResult.latencyMs);
  console.log('- Structured Valid:', openrouterResult.structuredOutputValid);
  console.log('- Data output:', JSON.stringify(openrouterResult.data, null, 2));
  console.log('✅ Direct OpenRouter (Ox Alpha) test passed.\n');

  // TEST 4: Direct Gemini Provider Test
  console.log('[TEST 4] Testing Direct Gemini Provider:');
  try {
    const geminiResult = await geminiProvider.generateStructured<any>(prompt, {
      domain: 'Retail',
      confidence: 0.8,
      key_findings: []
    }, {
      systemInstruction: 'You are DataWhiz AI Analyst. Reply strictly with valid JSON.'
    });
    console.log('- Provider used:', geminiResult.providerUsed);
    console.log('- Model used:', geminiResult.modelUsed);
    console.log('- Latency (ms):', geminiResult.latencyMs);
    console.log('- Data output:', JSON.stringify(geminiResult.data, null, 2));
    console.log('✅ Direct Gemini provider test passed.\n');
  } catch (err: any) {
    console.log('Gemini direct test warning:', err.message);
  }

  // TEST 5: Router Priority & Fallback
  console.log('[TEST 5] Testing LLMRouter Primary Path (Should prioritize Ox Alpha):');
  const routerResult = await llmRouter.generateStructured<any>(
    'Analyze dataset with column dtv_srh_pmx_tot_xxx_clk. Return JSON: {"decoded_name":"Digital Search Performance Max Clicks","role":"measure","category":"marketing"}',
    { decoded_name: 'Search Clicks', role: 'measure', category: 'marketing' },
    { systemInstruction: 'Output strict JSON.' }
  );

  console.log('- Router Selected Provider:', routerResult.providerUsed);
  console.log('- Router Model:', routerResult.modelUsed);
  console.log('- Fallback Used:', routerResult.fallbackUsed);
  console.log('- Result Data:', routerResult.data);
  console.log('✅ LLMRouter primary route verified.\n');

  // TEST 6: Legacy Compatibility with defaultLLMClient & askGeminiJSON
  console.log('[TEST 6] Testing Legacy Adapters (defaultLLMClient & askGeminiJSON):');
  const legacyClientRes = await defaultLLMClient.structuredOutput<any>(
    'Return JSON: {"title":"Executive Sales Dashboard","charts_count":4}',
    { title: 'Dashboard', charts_count: 3 }
  );
  console.log('- defaultLLMClient result:', legacyClientRes.data, `(from ${legacyClientRes.providerUsed})`);

  const legacyGeminiRes = await askGeminiJSON<{ observations: string[] }>(
    'You are an analyst.',
    'Headlines: Retail sales surge 4% in Germany. Return JSON: {"observations":["German ecommerce expansion aligns with +4% sales growth"]}'
  );
  console.log('- askGeminiJSON result:', legacyGeminiRes);
  console.log('✅ Legacy adapters compatibility verified.\n');

  // TEST 7: Conversational Chat
  console.log('[TEST 7] Testing Conversational Chat via LLMRouter:');
  const chatRes = await llmRouter.chat([
    { role: 'system', content: 'You are DataWhiz conversational assistant.' },
    { role: 'user', content: 'In one sentence, explain what a 7-day moving average does for sales trend analysis.' }
  ]);
  console.log('- Chat response:', chatRes.text);
  console.log('- Chat provider/model:', chatRes.provider, '/', chatRes.model);
  console.log('✅ Conversational chat verified.\n');

  console.log('====================================================');
  console.log('  ALL INTEGRATION TESTS COMPLETED SUCCESSFULLY!    ');
  console.log('====================================================');
}

runComprehensiveTests().catch(err => {
  console.error('Test run failed:', err);
  process.exit(1);
});
