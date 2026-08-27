import fs from 'fs';
import path from 'path';

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

async function testFallbackSimulation() {
  console.log('Testing LLMRouter Fallback Simulation:');

  // Test with a fallback value when all providers fail or are bypassed
  const fallback = { status: 'deterministic-safe', count: 42 };
  
  // Temporarily corrupt OPENROUTER_API_KEY to test fallback
  const origKey = process.env.OPENROUTER_API_KEY;
  process.env.OPENROUTER_API_KEY = 'invalid_key_for_testing';

  const res = await llmRouter.generateStructured(
    'This prompt will trigger fallback',
    fallback,
    { promptName: 'fallback_sim_test' }
  );

  console.log('- Fallback Result Data:', res.data);
  console.log('- Fallback Provider Used:', res.providerUsed);
  console.log('- Fallback Used Flag:', res.fallbackUsed);

  // Restore key
  process.env.OPENROUTER_API_KEY = origKey;

  if (res.data.status === 'deterministic-safe' && res.fallbackUsed === true) {
    console.log('✅ Fallback simulation succeeded without crashing!');
  } else {
    console.error('❌ Fallback simulation unexpected result');
    process.exit(1);
  }
}

testFallbackSimulation().catch(e => {
  console.error(e);
  process.exit(1);
});
