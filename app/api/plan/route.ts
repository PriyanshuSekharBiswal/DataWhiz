import { NextRequest, NextResponse } from 'next/server';
import { defaultLLMClient } from '@/lib/ai/provider/llmProvider';

export async function POST(req: NextRequest) {
  try {
    const { profileText, fileName, domain, capabilities, userGoal } = await req.json();

    const systemPrompt = `You are DataWhiz AI's Master Analysis Planner.
You evaluate the dataset profile, business domain, and verified analytical capabilities to design an adaptive, non-redundant dashboard and analytical execution plan.
You decide WHAT analyses and visualizations are appropriate; deterministic engines compute every number.
Reply strictly with one valid JSON object.`;

    const userPrompt = `DATASET CONTEXT:
File: ${fileName || 'dataset.csv'}
Domain: ${domain || 'General Tabular'}
Capabilities: ${JSON.stringify(capabilities || {})}
${userGoal ? `User Intent / Goal: "${userGoal}"` : ''}

SCHEMA & METRICS SUMMARY:
${profileText}

Return a valid JSON object of this structure:
{
  "domain": "specific business domain name e.g. Retail & E-Commerce, Telco Churn, Digital Advertising",
  "domain_confidence": 0.5 to 1.0,
  "summary": "2 to 3 sentence executive summary of the dataset's commercial significance and key analytical anchors",
  "kpis": [
    {
      "label": "Human readable title",
      "column": "exact technical column name",
      "agg": "sum|avg|count|min|max",
      "format": "number|currency|percent|integer",
      "role": "primary|secondary|diagnostic"
    }
  ],
  "charts": [
    {
      "title": "Clear analytical figure title",
      "type": "bar|line|pie|area|scatter|heatmap|horizontal_bar",
      "x": "column name for X axis or category",
      "y": "metric column name",
      "agg": "sum|avg|count|min|max",
      "groupBy": "optional grouping dimension",
      "why": "Specific analytical rationale for why this figure is valuable"
    }
  ],
  "questions": ["Specific business question 1", "Specific business question 2", "Specific business question 3"]
}

CRITICAL RULES:
1. ADAPTIVE COUNTS: Choose between 3 to 6 high-value KPIs and 3 to 6 complementary charts. Do NOT force a fixed count.
2. NO REDUNDANCY: Do not select multiple charts showing the same metric by almost identical dimensions.
3. CAPABILITY GROUNDING: Only propose time series (line/area) if a chronological date column exists with verified history. Only propose classification / cohort charts if a target status variable exists.
4. VALID COLUMNS: Use ONLY valid column names from the provided schema.`;

    const result = await defaultLLMClient.structuredOutput<any>(
      userPrompt,
      null,
      {
        systemInstruction: systemPrompt,
        promptName: 'ai_analysis_planner',
        validator: (data) => Boolean(data && Array.isArray(data.kpis) && Array.isArray(data.charts) && data.kpis.length >= 2 && data.charts.length >= 2)
      }
    );

    if (result.data) {
      return NextResponse.json({ success: true, plan: result.data, source: result.modelUsed });
    }

    return NextResponse.json({ success: false, plan: null, source: 'fallback' });
  } catch (error: any) {
    console.error('[API /api/plan Error]', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
