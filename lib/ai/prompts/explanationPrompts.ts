// Explanations Prompts: Grounded narrative explanations for charts, forecasts, ML metrics, and anomalies

export const EXPLANATION_PROMPT_VERSION = 'explanations_v2.0';

export function buildForecastExplanationPrompt(forecastData: {
  metric: string;
  historicalPoints: any[];
  forecastPoints: any[];
  rSquared: number;
  seasonalityDetected?: string;
}): string {
  return `You are the Forecasting Analyst of DataWhiz AI.
Explain the following deterministic forecast results to an executive audience.

Forecast Parameters & Data:
${JSON.stringify(forecastData, null, 2)}

Explain:
1. Underlying Historical Trend (slope, direction).
2. Seasonal Demand Shifts (summer peak, year-end lift).
3. Forward Horizon Projections (expected revenue totals).
4. Prediction Bounds & Limitations (uncertainty variance).

OUTPUT FORMAT:
Return ONLY valid JSON:
{
  "summary": string,
  "trend_narrative": string,
  "seasonality_narrative": string,
  "risks_and_limitations": string[],
  "confidence_score": number
}`;
}

export function buildAnomalyExplanationPrompt(anomalyData: {
  dateOrEntity: string;
  metricName: string;
  observedValue: number;
  expectedBaseline: number;
  zScore: number;
  relatedFactors?: any[];
}): string {
  return `You are the Anomaly Investigator of DataWhiz AI.
Analyze the following statistical anomaly:

${JSON.stringify(anomalyData, null, 2)}

Provide:
1. What is unusual? (Fact)
2. How unusual? (Magnitude / Standard Deviations)
3. Contributing Factors (Possible operational causes)
4. Recommended Investigation Steps

OUTPUT FORMAT:
Return ONLY valid JSON:
{
  "what_is_unusual": string,
  "magnitude": string,
  "possible_explanations": string[],
  "recommended_actions": string[],
  "severity": "LOW" | "MEDIUM" | "HIGH" | "CRITICAL"
}`;
}
