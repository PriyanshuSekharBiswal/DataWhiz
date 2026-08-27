import { NextRequest, NextResponse } from 'next/server';
import { askGeminiJSON } from '@/lib/services/geminiService';

export async function POST(req: NextRequest) {
  try {
    const { domain, news, profileText, kpis } = await req.json();

    const newsText = (news || []).map((n: any) => `- ${n.headline} (${n.meta}): ${n.summary}`).join('\n');
    const kpiText = (kpis || []).map((k: any) => `${k.label}: ${k.value}`).join('; ');

    const systemPrompt = `You are an analyst writing terse marginalia. Reply with one strict JSON object and nothing else.`;
    const userPrompt = `Subject: ${domain}\n\nRECENT HEADLINES:\n${newsText}\n\nDATASET SCHEMA:\n${profileText}\n\nCOMPUTED KPIs: ${kpiText}\n\nWrite 3 observations. Each must be ONE sentence, must name a specific headline AND a specific column name or number from the data, and must say something the reader could act on. No hedging, no preamble. Return JSON: {"observations":["","",""]}`;

    const res = await askGeminiJSON<{ observations: string[] }>(systemPrompt, userPrompt);
    const observations = res && Array.isArray(res.observations) ? res.observations : [];

    return NextResponse.json({ success: true, observations });
  } catch (error: any) {
    console.error('[API /api/insights Error]', error);
    return NextResponse.json({ success: false, observations: [] }, { status: 500 });
  }
}
