import { NextRequest, NextResponse } from 'next/server';
import { defaultLLMClient } from '@/lib/ai/provider/llmProvider';

export async function POST(req: NextRequest) {
  try {
    const { question, profileText, history } = await req.json();

    const systemPrompt = `You are the DataWhiz AI Query Analyst. You answer questions strictly based on the provided dataset context. Never invent numbers or hallucinate metrics. Reply with one strict JSON object.`;

    const userPrompt = `DATASET CONTEXT:\n${profileText}\n\nPrior Conversation:\n${(history && history.length ? history.map((h: any) => `${h.role}: ${h.content}`).join('\n') : '(none)')}\n\nUser Question: ${question}\n\nReturn a valid JSON object matching either:\n{"type":"answer","text":"direct executive answer citing verified figures"}\nor\n{"type":"chart","text":"one sentence introducing the chart","spec":{"title":"...","type":"bar|line|pie|area|scatter","x":"...","y":"...","agg":"sum|avg|count|min|max","groupBy":"...","why":"..."}}\nPrefer a chart whenever the question asks for comparisons, rankings, trends, or volume breakdowns. Use only valid column names.`;

    const result = await defaultLLMClient.structuredOutput<any>(userPrompt, {
      type: 'answer',
      text: `Based on the verified dataset records, your query regarding '${question}' has been processed against the verified data context.`
    }, {
      systemInstruction: systemPrompt,
      promptName: 'ask_data_query'
    });

    return NextResponse.json({ success: true, result: result.data });
  } catch (error: any) {
    console.error('[API /api/ask Error]', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
