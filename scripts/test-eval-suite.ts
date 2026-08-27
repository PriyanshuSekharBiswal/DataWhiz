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

import { runEvaluationSuite } from '../lib/ai/evaluation/evalSuite';

async function testEval() {
  console.log('Running Evaluation Suite with LLMRouter (Ox Alpha)...');
  const report = await runEvaluationSuite();
  console.log('Evaluation Report:');
  console.log(`- Total Tests: ${report.totalTests}`);
  console.log(`- Passed Tests: ${report.passedTests}`);
  console.log(`- Semantic Accuracy: ${Math.round(report.semanticAccuracy * 100)}%`);
  console.log(`- Intent Accuracy: ${Math.round(report.intentAccuracy * 100)}%`);
  console.log(`- Quality Reasoning Accuracy: ${Math.round(report.qualityReasoningAccuracy * 100)}%`);
  console.log(`- Groundedness Score: ${Math.round(report.groundednessScore * 100)}%`);
  console.log(`- Hallucination Rate: ${Math.round(report.hallucinationRate * 100)}%`);
}

testEval().catch(err => {
  console.error('Eval error:', err);
  process.exit(1);
});
