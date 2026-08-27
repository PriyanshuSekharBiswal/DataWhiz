// Natural Language User Intent Parser: Extracts analytical task, metrics, dimensions, filters, and horizons

import { UserIntent, CapabilityType, ColumnSchema } from '@/lib/types';

export function parseUserIntent(
  rawPrompt: string = '',
  schemas: ColumnSchema[]
): UserIntent {
  const trimmed = rawPrompt.trim();
  if (!trimmed || /analyze this data|auto|overview|general/i.test(trimmed)) {
    return {
      mode: 'auto',
      rawQuery: trimmed || 'Automatic Comprehensive Analysis',
      requestedAnalyses: ['eda', 'descriptive_stats', 'correlation_analysis', 'time_series_forecasting', 'anomaly_detection', 'product_investment_scoring']
    };
  }

  const lower = trimmed.toLowerCase();
  const requestedAnalyses: CapabilityType[] = [];

  // Match target metrics or dimensions in prompt
  let targetMetric: string | undefined;
  let targetDimension: string | undefined;

  for (const s of schemas) {
    const nameLower = s.technicalName.toLowerCase();
    const displayLower = s.displayName.toLowerCase();

    if (lower.includes(nameLower) || lower.includes(displayLower)) {
      if (s.physicalType === 'number' || s.logicalType.startsWith('measure')) {
        if (!targetMetric) targetMetric = s.technicalName;
      } else {
        if (!targetDimension) targetDimension = s.technicalName;
      }
    }
  }

  // Detect capability intentions
  if (/forecast|predict sales|next \d+ month|future/i.test(lower)) {
    requestedAnalyses.push('time_series_forecasting', 'trend_decomposition');
  }
  if (/churn|retention|cancel|attrition/i.test(lower)) {
    requestedAnalyses.push('classification_churn');
  }
  if (/invest|which product|best performing|recommend/i.test(lower)) {
    requestedAnalyses.push('product_investment_scoring', 'eda');
  }
  if (/correlat|relationship|impact|driver/i.test(lower)) {
    requestedAnalyses.push('correlation_analysis', 'regression_modeling');
  }
  if (/anomal|outlier|spike|unusual|drop/i.test(lower)) {
    requestedAnalyses.push('anomaly_detection');
  }
  if (/compare|region|city|state/i.test(lower)) {
    requestedAnalyses.push('geographic_breakdown', 'eda');
  }

  if (requestedAnalyses.length === 0) {
    requestedAnalyses.push('eda', 'descriptive_stats');
  }

  // Detect forecast horizon e.g. "next 6 months", "12 months"
  let forecastHorizon = 6;
  const horizonMatch = lower.match(/(?:next|for)\s+(\d+)\s+(?:months?|periods?|weeks?|days?)/i);
  if (horizonMatch && horizonMatch[1]) {
    forecastHorizon = parseInt(horizonMatch[1], 10);
  }

  // Detect time grain e.g. daily, weekly, monthly
  let timeGrain: 'day' | 'week' | 'month' | 'year' = 'month';
  if (/daily|day-wise|day/i.test(lower)) timeGrain = 'day';
  else if (/weekly|week-wise|week/i.test(lower)) timeGrain = 'week';
  else if (/yearly|annual/i.test(lower)) timeGrain = 'year';

  return {
    mode: 'requested',
    rawQuery: trimmed,
    targetMetric,
    targetDimension,
    forecastHorizon,
    timeGrain,
    requestedAnalyses
  };
}
