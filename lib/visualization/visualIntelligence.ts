// Visual Intelligence Engine: Dynamically selects optimal visualizations with best-figure scoring, redundancy control, and layout optimization

import { DynamicChartSpec, ColumnSchema, ColumnProfile } from '@/lib/types';
import { scoreAndSelectVisualizations } from '@/lib/analytics/analysisIntelligence';

export function buildDynamicCharts(
  schemas: ColumnSchema[],
  profiles: ColumnProfile[],
  rows: Record<string, any>[]
): DynamicChartSpec[] {
  return scoreAndSelectVisualizations(schemas, profiles, rows);
}
