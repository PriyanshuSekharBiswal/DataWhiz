import { NextRequest, NextResponse } from 'next/server';
import { askGeminiJSON } from '@/lib/services/geminiService';

export async function POST(req: NextRequest) {
  try {
    const { domain, rows, cols, dup, missing, cells, colStats, corr } = await req.json();

    const body = (colStats || []).map((c: any) => `- ${c.name} [${c.type}] missing ${c.nullPct}%, ${c.summary} ${c.spread ? `, ${c.spread}` : ''}`).join('\n');
    const cr = (corr || []).map((c: any) => `- ${c.a} vs ${c.b}: r = ${Math.round(c.r * 100) / 100}`).join('\n') || '(none computed)';

    const systemPrompt = `You are a statistician reviewing a dataset profile. Reply with one strict JSON object and nothing else.`;
    const userPrompt = `Subject: ${domain || 'unknown'}\nRows in scope: ${rows}, columns: ${cols}, duplicate rows: ${dup}, missing cells: ${missing} of ${cells}.\n\nCOLUMN STATISTICS:\n${body}\n\nPEARSON CORRELATIONS:\n${cr}\n\nWrite 4 observations about this dataset: distribution shape, skew or outliers, data-quality problems, and the most useful relationship. Each must be ONE sentence naming a specific column and number. No preamble. Return JSON: {"observations":["","","",""]}`;

    const res = await askGeminiJSON<{ observations: string[] }>(systemPrompt, userPrompt);
    const observations = res && Array.isArray(res.observations) ? res.observations : [];

    return NextResponse.json({ success: true, observations });
  } catch (error: any) {
    console.error('[API /api/stat-notes Error]', error);
    return NextResponse.json({ success: false, observations: [] }, { status: 500 });
  }
}
