import { NextRequest, NextResponse } from 'next/server';
import { defaultLLMClient } from '@/lib/ai/provider/llmProvider';

export async function POST(req: NextRequest) {
  try {
    const { question, profileText, history, domain, kpisText, sampleData } = await req.json();

    const systemPrompt = `You are DataWhiz AI, an elite Senior Principal Data Analyst and Business Intelligence Expert.
Your job is to answer the user's analytical questions regarding their uploaded dataset with supreme clarity, depth, accuracy, and executive presentation.

INSTRUCTIONS:
1. Ground your response in the provided dataset schema, column definitions, domain context, and KPIs. Never invent or hallucinate metrics.
2. Structure your answers in clean GitHub-flavored Markdown with bold emphasis, bullet points, headers, and comparative insights.
3. If the user asks for recommendations, explanations, insights, or root causes, provide structured and actionable findings.
4. When the user asks for a chart, graph, plot, trend, visual breakdown, distribution, or comparison, specify the 'chartSpec' object with exact column technical names from the schema.
5. Return a strict, valid JSON object matching:
{
  "type": "answer" | "chart",
  "text": "Comprehensive, articulate markdown answer with deep domain insights and numerical facts.",
  "chartSpec": {
    "title": "Descriptive Chart Title",
    "type": "bar" | "line" | "pie" | "donut" | "horizontal_bar" | "scatter" | "area",
    "xField": "Exact_Column_Technical_Name_For_X_Axis",
    "yField": "Exact_Column_Technical_Name_For_Y_Axis",
    "agg": "sum" | "avg" | "count" | "min" | "max",
    "why": "Brief rationale for this visualization"
  }
}`;

    const userPrompt = `DATASET DOMAIN: ${domain || 'General Business Analytics'}
DATASET SCHEMA & ATTRIBUTES:
${profileText}

DATASET OVERVIEW KPIS:
${kpisText || '(none)'}

DATASET SAMPLE OBSERVATIONS:
${sampleData ? JSON.stringify(sampleData.slice(0, 3), null, 2) : '(none)'}

PRIOR CONVERSATION HISTORY:
${(history && history.length ? history.map((h: any) => `${h.role}: ${h.content}`).join('\n') : '(none)')}

USER QUESTION: ${question}

Return a valid JSON object matching the required schema. If the question asks for a visual, trend, breakdown, graph, or chart, provide both a detailed analytical text and a complete chartSpec.`;

    const result = await defaultLLMClient.structuredOutput<any>(userPrompt, {
      type: 'answer',
      text: `Based on the verified dataset attributes for '${question}', the data has been analyzed against the underlying statistical records.`
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
