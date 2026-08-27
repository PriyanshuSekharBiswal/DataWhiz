// User Intent Prompts: Natural language query interpretation and analytical parameter extraction

export const INTENT_PROMPT_VERSION = 'intent_v2.0';

export interface IntentPromptInput {
  userQuery: string;
  availableColumns: { name: string; type: string; role: string }[];
  domainContext?: string;
}

export function buildIntentExtractionPrompt(input: IntentPromptInput): string {
  return `You are the Natural Language Intent Engine of DataWhiz AI.
Extract structured analytical intent from the user query against the available dataset schema.

### FEW-SHOT EXAMPLES:

Example 1:
Query: "Forecast revenue for the next 6 months in France"
OUTPUT:
{
  "task": "time_series_forecast",
  "target_metric": "revenue",
  "dimensions": ["France"],
  "filters": { "Country": "France" },
  "time_granularity": "monthly",
  "forecast_horizon_months": 6,
  "comparison": null,
  "desired_output": "forecast_chart_and_table",
  "confidence": 0.95
}

Example 2:
Query: "Which product should I invest more in?"
OUTPUT:
{
  "task": "strategic_investment_evaluation",
  "target_metric": "revenue_and_margin",
  "dimensions": ["Product_Name"],
  "filters": {},
  "time_granularity": null,
  "forecast_horizon_months": null,
  "comparison": "multi_product_ranking",
  "desired_output": "recommendation_with_evidence",
  "confidence": 0.92
}

Example 3:
Query: "Compare Cardiosense and Dermacare sales in 2025"
OUTPUT:
{
  "task": "cohort_comparison",
  "target_metric": "sales",
  "dimensions": ["Product_Name"],
  "filters": { "Year": "2025" },
  "comparison": { "entityA": "Cardiosense", "entityB": "Dermacare" },
  "desired_output": "comparison_cards_and_chart",
  "confidence": 0.96
}

---

### YOUR TASK:
User Query: "${input.userQuery}"

Available Dataset Columns:
${JSON.stringify(input.availableColumns, null, 2)}

${input.domainContext ? `Domain: ${input.domainContext}` : ''}

### OUTPUT FORMAT:
Return ONLY a valid JSON object matching:
{
  "task": "simple_query" | "time_series_forecast" | "strategic_investment_evaluation" | "cohort_comparison" | "anomaly_investigation" | "drilldown_filter" | "data_dictionary_lookup",
  "target_metric": string | null,
  "dimensions": string[],
  "filters": Record<string, string>,
  "time_granularity": "daily" | "weekly" | "monthly" | "yearly" | null,
  "forecast_horizon_months": number | null,
  "comparison": any | null,
  "desired_output": "metric_card" | "chart" | "table" | "recommendation_with_evidence" | "forecast_chart_and_table",
  "confidence": number,
  "required_tools": string[]
}`;
}
