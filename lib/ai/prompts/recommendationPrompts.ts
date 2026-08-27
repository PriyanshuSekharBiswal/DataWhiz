// AI Recommendation Prompts: Actionable, evidence-backed strategic recommendations with confidence & limitations

export const RECOMMENDATION_PROMPT_VERSION = 'recommendations_v2.0';

export interface RecommendationPromptInput {
  domain: string;
  observations: { headline: string; observation: string; grounded_evidence: string[] }[];
  kpis: { label: string; value: string }[];
}

export function buildRecommendationsPrompt(input: RecommendationPromptInput): string {
  return `You are the Strategic Recommendation Engine of DataWhiz AI.
Transform validated business observations into concrete, prioritized operational and investment recommendations.

### CRITICAL RULES:
1. EVIDENCE-BASED: Every recommendation must link directly to observable findings in the dataset.
2. NEVER GUARANTEE: Phrase recommendations as probabilistic optimizations (e.g. "We recommend prioritizing X based on Y historical margin").
3. INCLUDE LIMITATIONS: Explicitly list assumptions or unmeasured external risks (e.g. supplier lead times, inflation).

### FEW-SHOT EXAMPLES:

Example 1:
INPUT:
Observation: "Cardiosense generates €1.84M at 32.4% gross margin, while seasonal summer lift adds +18% demand in June–August."

OUTPUT:
{
  "recommendations": [
    {
      "id": "rec-1",
      "category": "INVESTMENT_PRIORITY",
      "title": "Pre-Allocate Working Capital to Cardiosense Ahead of Q2",
      "action": "Increase inventory buffer for Cardiosense by 15% starting in April to capture peak summer demand without stockouts.",
      "supporting_evidence": ["Cardiosense €1.84M top revenue contributor", "32.4% above-average gross margin", "+18% historical summer demand surge"],
      "expected_impact": "Prevents stockouts during peak quarter and protects highest-margin SKU volume.",
      "confidence": 0.89,
      "limitations": ["Assumes supplier lead time remains under 14 days", "Subject to local regulatory pricing controls"]
    }
  ]
}

---

### YOUR TASK:
Generate strategic recommendations for:
Domain: ${input.domain}
KPIs: ${JSON.stringify(input.kpis, null, 2)}
Observations:
${JSON.stringify(input.observations, null, 2)}

### OUTPUT FORMAT:
Return ONLY a valid JSON object matching:
{
  "recommendations": [
    {
      "id": string,
      "category": "INVESTMENT_PRIORITY" | "RISK_MITIGATION" | "OPERATIONAL_EFFICIENCY" | "COMMERCIAL_EXPANSION",
      "title": string,
      "action": string,
      "supporting_evidence": string[],
      "expected_impact": string,
      "confidence": number,
      "limitations": string[]
    }
  ]
}`;
}
