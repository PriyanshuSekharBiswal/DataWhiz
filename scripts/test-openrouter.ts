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

async function checkOpenRouter() {
  const apiKey = process.env.OPENROUTER_API_KEY;
  const model = process.env.OPENROUTER_MODEL || 'openrouter/free';
  
  if (!apiKey) {
    console.error('OPENROUTER_API_KEY is not set in environment.');
    return;
  }

  console.log(`Testing OpenRouter with model: ${model}...`);
  try {
    const compRes = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'http://localhost:3000',
        'X-Title': 'DataWhiz'
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: 'You are DataWhiz reasoning engine. Respond strictly with valid JSON.' },
          { role: 'user', content: 'Return JSON: {"status":"operational","model":"ox-alpha","test":true}' }
        ],
        temperature: 0.1,
        response_format: { type: 'json_object' }
      })
    });

    console.log('Completion status:', compRes.status, compRes.statusText);
    const compData = await compRes.json();
    console.log('Choice content:', compData.choices?.[0]?.message?.content);
  } catch (err) {
    console.error('Error during OpenRouter test:', err);
  }
}

checkOpenRouter();
