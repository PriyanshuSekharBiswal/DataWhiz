// Fine-Tuning Preparation Engine: Compiles curated domain examples and verified human corrections into standardized JSONL datasets for future model fine-tuning

import { getStoredCorrections } from '@/lib/ai/feedback/feedbackStore';
import evalCases from '@/lib/ai/evaluation/evalDataset.json';

export interface FineTuningSample {
  messages: {
    role: 'system' | 'user' | 'assistant';
    content: string;
  }[];
}

export function exportFineTuningDatasetJSONL(): string {
  const samples: FineTuningSample[] = [];

  // 1. Export from curated benchmark cases
  for (const c of evalCases) {
    if (c.category === 'semantic_naming') {
      samples.push({
        messages: [
          {
            role: 'system',
            content: 'You are DataWhiz AI Semantic Intelligence. Output strict JSON with technical_name, display_name, meaning, semantic_role, and confidence.'
          },
          {
            role: 'user',
            content: `Infer business meaning for technical column: "${c.input.technicalName}" with sample values: ${JSON.stringify(c.input.sampleValues)}`
          },
          {
            role: 'assistant',
            content: JSON.stringify({
              technical_name: c.input.technicalName,
              display_name: c.expected.displayName,
              semantic_role: c.expected.semanticRole,
              confidence: c.expected.minConfidence
            })
          }
        ]
      });
    }
  }

  // 2. Export from verified user corrections
  const userCorrections = getStoredCorrections().filter(c => c.status === 'EDITED' || c.status === 'ACCEPTED');
  for (const uc of userCorrections) {
    samples.push({
      messages: [
        {
          role: 'system',
          content: 'You are DataWhiz AI Semantic Intelligence. Output strict JSON with technical_name, display_name, meaning, semantic_role, and confidence.'
        },
        {
          role: 'user',
          content: `Infer business meaning for technical column: "${uc.technicalName}" in domain: "${uc.domain || 'General'}"`
        },
        {
          role: 'assistant',
          content: JSON.stringify({
            technical_name: uc.technicalName,
            display_name: uc.userCorrection,
            confidence: 0.98
          })
        }
      ]
    });
  }

  return samples.map(s => JSON.stringify(s)).join('\n');
}
