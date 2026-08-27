// Tool & Function Calling Registry: Deterministic analytical primitives and provenance tracking

import { DatasetContext, ColumnSchema, ColumnProfile, AnalysisResult } from '@/lib/types';
import { parseNumberVal, safeIsoDate } from '@/lib/schema/schemaDetector';
import { validateAnalysisResult } from '@/lib/analytics/validation';
import { computeStatistics } from '@/lib/analytics/statisticsEngine';
import { generateForecast } from '@/lib/analytics/forecastingEngine';
import { evaluateClassification } from '@/lib/analytics/classificationEngine';
import { computeSafeAggregation } from '@/lib/analytics/aggregationEngine';

export interface ToolDefinition {
  name: string;
  description: string;
  parameters: Record<string, { type: string; description: string; required?: boolean }>;
}

export const DATAWHIZ_TOOLS: ToolDefinition[] = [
  {
    name: 'resolve_semantic_column',
    description: 'Resolves a business query term or technical token to the verified column schema and semantic role.',
    parameters: {
      query: { type: 'string', description: 'Column name or business term', required: true }
    }
  },
  {
    name: 'filter',
    description: 'Filters rows matching specified column criteria and returns subset.',
    parameters: {
      filters: { type: 'object', description: 'Key-value filters (e.g. { region: "Europe" })', required: true },
      limit: { type: 'number', description: 'Maximum rows to return', required: false }
    }
  },
  {
    name: 'aggregate',
    description: 'Calculates sum, avg, count, min, or max for a numerical metric.',
    parameters: {
      metric: { type: 'string', description: 'Numeric column to aggregate', required: true },
      aggFunction: { type: 'string', description: 'One of: sum, avg, count, min, max', required: false },
      filters: { type: 'object', description: 'Optional row filters', required: false }
    }
  },
  {
    name: 'group',
    description: 'Groups records by a categorical dimension and computes metric aggregates.',
    parameters: {
      metric: { type: 'string', description: 'Numeric column to aggregate', required: true },
      dimension: { type: 'string', description: 'Categorical column to group by', required: true },
      aggFunction: { type: 'string', description: 'One of: sum, avg, count, min, max', required: false }
    }
  },
  {
    name: 'rank',
    description: 'Ranks categories by an aggregated metric descending or ascending (Pareto/Top-N).',
    parameters: {
      metric: { type: 'string', description: 'Numeric column to rank by', required: true },
      dimension: { type: 'string', description: 'Categorical dimension to rank', required: true },
      limit: { type: 'number', description: 'Top N entries to return (default 10)', required: false }
    }
  },
  {
    name: 'compare',
    description: 'Computes difference and percentage delta between two cohorts or categories.',
    parameters: {
      metric: { type: 'string', description: 'Numeric metric to compare', required: true },
      dimension: { type: 'string', description: 'Categorical grouping dimension', required: true },
      cohortA: { type: 'string', description: 'First group value', required: true },
      cohortB: { type: 'string', description: 'Second group value', required: true }
    }
  },
  {
    name: 'period_compare',
    description: 'Calculates period-over-period or YoY rate of change across sequential time periods.',
    parameters: {
      metric: { type: 'string', description: 'Numeric metric to compare', required: true },
      timeField: { type: 'string', description: 'Date/time column', required: false }
    }
  },
  {
    name: 'correlation',
    description: 'Computes bivariate Pearson correlation coefficient between two numeric measures.',
    parameters: {
      metricA: { type: 'string', description: 'First numeric measure', required: true },
      metricB: { type: 'string', description: 'Second numeric measure', required: true }
    }
  },
  {
    name: 'descriptive_statistics',
    description: 'Calculates mean, median, standard deviation, IQR, and distribution percentiles.',
    parameters: {
      metric: { type: 'string', description: 'Numeric column to evaluate', required: true }
    }
  },
  {
    name: 'anomaly_detection',
    description: 'Identifies statistical outliers exceeding 1.5x IQR or 3-sigma thresholds.',
    parameters: {
      metric: { type: 'string', description: 'Numeric column to check for anomalies', required: true }
    }
  },
  {
    name: 'forecast',
    description: 'Generates forward exponential smoothing forecasts with confidence intervals.',
    parameters: {
      metric: { type: 'string', description: 'Numeric target measure', required: true },
      dateColumn: { type: 'string', description: 'Chronological timestamp column', required: false },
      horizon: { type: 'number', description: 'Periods to project forward (default 6)', required: false }
    }
  },
  {
    name: 'classification',
    description: 'Evaluates supervised classification cohort churn and feature risk importance.',
    parameters: {
      target: { type: 'string', description: 'Binary or multi-class target column', required: true }
    }
  },
  {
    name: 'get_data_dictionary',
    description: 'Returns human-friendly business definitions for all columns.',
    parameters: {}
  }
];

export function executeDataWhizTool<T = any>(
  toolName: string,
  args: Record<string, any>,
  context: DatasetContext
): AnalysisResult<T> {
  const startTime = Date.now();
  const rows = context.cleanedRows;
  const schemas = context.schema;

  let data: any = null;
  const sourceColumns: string[] = [];
  let aggregation: string | undefined = undefined;
  let sampleSize = rows.length;

  try {
    switch (toolName) {
      case 'resolve_semantic_column': {
        const query = String(args.query || '').toLowerCase().trim();
        const matched = schemas.find(s =>
          s.technicalName.toLowerCase() === query ||
          s.displayName.toLowerCase().includes(query)
        );
        sourceColumns.push(matched ? matched.technicalName : query);
        data = matched || { found: false, query };
        break;
      }

      case 'filter': {
        const filters = args.filters || {};
        const limit = args.limit || 50;
        const filtered = rows.filter(r => {
          for (const [k, v] of Object.entries(filters)) {
            if (String(r[k]).toLowerCase() !== String(v).toLowerCase()) return false;
          }
          return true;
        });
        sampleSize = filtered.length;
        sourceColumns.push(...Object.keys(filters));
        data = filtered.slice(0, limit);
        break;
      }

      case 'aggregate': {
        const metric = args.metric;
        const reqAgg = (args.aggFunction || 'sum').toLowerCase();
        const mSchema = schemas.find(s => s.technicalName === metric);
        sourceColumns.push(metric);

        const values = rows
          .map(r => parseNumberVal(r[metric]))
          .filter((v): v is number => v !== null);

        sampleSize = values.length;
        const aggRes = computeSafeAggregation(values, reqAgg, mSchema);
        aggregation = aggRes.appliedAggregation;
        data = { metric, aggFunction: aggRes.appliedAggregation, value: aggRes.value, count: values.length, warning: aggRes.warning };
        break;
      }

      case 'group': {
        const metric = args.metric;
        const dimension = args.dimension;
        const reqAgg = (args.aggFunction || 'sum').toLowerCase();
        const mSchema = schemas.find(s => s.technicalName === metric);
        sourceColumns.push(metric, dimension);

        const groups = new Map<string, number[]>();
        for (const r of rows) {
          const dimVal = String(r[dimension] ?? 'Unspecified').trim();
          const num = parseNumberVal(r[metric]);
          if (num !== null) {
            if (!groups.has(dimVal)) groups.set(dimVal, []);
            groups.get(dimVal)!.push(num);
          }
        }

        const result: { group: string; value: number; count: number }[] = [];
        let appliedAgg = reqAgg;
        groups.forEach((vals, group) => {
          const aggRes = computeSafeAggregation(vals, reqAgg, mSchema);
          appliedAgg = aggRes.appliedAggregation;
          result.push({ group, value: aggRes.value, count: vals.length });
        });

        aggregation = appliedAgg;
        result.sort((a, b) => b.value - a.value);
        data = result;
        break;
      }

      case 'rank': {
        const metric = args.metric;
        const dimension = args.dimension;
        const limit = args.limit || 10;
        const reqAgg = (args.aggFunction || 'sum').toLowerCase();
        sourceColumns.push(metric, dimension);

        const groupRes = executeDataWhizTool('group', { metric, dimension, aggFunction: reqAgg }, context);
        const groupData = (groupRes.data as any[]) || [];
        const total = groupData.reduce((acc, g) => acc + g.value, 0);

        let cumulative = 0;
        const ranked = groupData.slice(0, limit).map((g, idx) => {
          cumulative += g.value;
          return {
            rank: idx + 1,
            entity: g.group,
            value: g.value,
            sharePct: total > 0 ? Math.round((g.value / total) * 1000) / 10 : 0,
            cumulativeSharePct: total > 0 ? Math.round((cumulative / total) * 1000) / 10 : 0
          };
        });

        aggregation = groupRes.aggregation || reqAgg;
        data = ranked;
        break;
      }

      case 'compare': {
        const metric = args.metric;
        const dimension = args.dimension;
        const cohortA = String(args.cohortA);
        const cohortB = String(args.cohortB);
        sourceColumns.push(metric, dimension);

        const valsA = rows.filter(r => String(r[dimension]) === cohortA).map(r => parseNumberVal(r[metric])).filter((v): v is number => v !== null);
        const valsB = rows.filter(r => String(r[dimension]) === cohortB).map(r => parseNumberVal(r[metric])).filter((v): v is number => v !== null);

        const sumA = valsA.reduce((a, b) => a + b, 0);
        const sumB = valsB.reduce((a, b) => a + b, 0);
        const delta = sumA - sumB;
        const pctChange = sumB !== 0 ? Math.round((delta / Math.abs(sumB)) * 1000) / 10 : 0;

        data = {
          metric,
          dimension,
          cohortA: { name: cohortA, sum: sumA, count: valsA.length, avg: valsA.length ? sumA / valsA.length : 0 },
          cohortB: { name: cohortB, sum: sumB, count: valsB.length, avg: valsB.length ? sumB / valsB.length : 0 },
          difference: delta,
          percentageDelta: pctChange
        };
        break;
      }

      case 'period_compare': {
        const metric = args.metric || context.primaryMetricColumn;
        const timeField = args.timeField || context.primaryDateColumn;
        sourceColumns.push(metric, timeField);

        const groupRes = executeDataWhizTool('group', { metric, dimension: timeField, aggFunction: 'sum' }, context);
        const sorted = (groupRes.data as any[]).sort((a, b) => a.group.localeCompare(b.group));
        const deltas = [];

        for (let i = 1; i < sorted.length; i++) {
          const prev = sorted[i - 1];
          const curr = sorted[i];
          const diff = curr.value - prev.value;
          const pct = prev.value > 0 ? Math.round((diff / prev.value) * 1000) / 10 : 0;
          deltas.push({
            period: curr.group,
            previousPeriod: prev.group,
            value: curr.value,
            previousValue: prev.value,
            delta: diff,
            percentageChange: pct
          });
        }

        data = { metric, periods: sorted, deltas };
        break;
      }

      case 'correlation': {
        const metricA = args.metricA;
        const metricB = args.metricB;
        sourceColumns.push(metricA, metricB);

        const pairs: [number, number][] = [];
        for (const r of rows) {
          const a = parseNumberVal(r[metricA]);
          const b = parseNumberVal(r[metricB]);
          if (a !== null && b !== null) pairs.push([a, b]);
        }

        sampleSize = pairs.length;
        if (pairs.length < 3) {
          data = { metricA, metricB, coefficient: 0, sampleSize: pairs.length };
        } else {
          const n = pairs.length;
          const sumA = pairs.reduce((acc, p) => acc + p[0], 0);
          const sumB = pairs.reduce((acc, p) => acc + p[1], 0);
          const meanA = sumA / n;
          const meanB = sumB / n;

          let num = 0;
          let denA = 0;
          let denB = 0;
          for (const [a, b] of pairs) {
            const dA = a - meanA;
            const dB = b - meanB;
            num += dA * dB;
            denA += dA * dA;
            denB += dB * dB;
          }

          const denom = Math.sqrt(denA * denB);
          const coefficient = denom > 0 ? Math.round((num / denom) * 1000) / 1000 : 0;
          data = { metricA, metricB, coefficient, sampleSize: n };
        }
        break;
      }

      case 'descriptive_statistics': {
        const metric = args.metric;
        sourceColumns.push(metric);
        const stats = computeStatistics(schemas, context.profiles, rows);
        data = stats.descriptiveTable.find(d => d.column === metric) || stats;
        break;
      }

      case 'anomaly_detection': {
        const metric = args.metric;
        sourceColumns.push(metric);

        const values = rows
          .map((r, idx) => ({ idx, val: parseNumberVal(r[metric]) }))
          .filter((x): x is { idx: number; val: number } => x.val !== null);

        const nums = values.map(v => v.val).sort((a, b) => a - b);
        const p25 = nums[Math.floor(nums.length * 0.25)] || 0;
        const p75 = nums[Math.floor(nums.length * 0.75)] || 0;
        const iqr = p75 - p25;
        const lowerBound = p25 - 1.5 * iqr;
        const upperBound = p75 + 1.5 * iqr;

        const anomalies = values
          .filter(v => v.val < lowerBound || v.val > upperBound)
          .map(v => ({ rowIndex: v.idx, value: v.val, boundExceeded: v.val > upperBound ? 'upper' : 'lower' }));

        data = { metric, lowerBound, upperBound, anomaliesCount: anomalies.length, anomalies };
        break;
      }

      case 'forecast': {
        const metric = args.metric || context.primaryMetricColumn || '';
        const dateCol = args.dateColumn || context.primaryDateColumn || '';
        const horizon = args.horizon || 6;
        sourceColumns.push(metric, dateCol);

        data = generateForecast(dateCol, metric, rows, horizon);
        break;
      }

      case 'classification': {
        const target = args.target || context.primaryTargetColumn || '';
        sourceColumns.push(target);
        data = evaluateClassification(target, schemas, rows);
        break;
      }

      case 'get_data_dictionary': {
        data = schemas.map(s => ({
          technicalName: s.technicalName,
          displayName: s.displayName,
          role: s.semanticRole,
          meaning: s.businessMeaning
        }));
        break;
      }

      default:
        throw new Error(`Unknown analytical tool: '${toolName}'`);
    }

    const validation = validateAnalysisResult(toolName, data, sourceColumns, sampleSize);
    const durationMs = Date.now() - startTime;

    return {
      taskId: `res-${toolName}-${Date.now().toString(36)}`,
      tool: toolName,
      sourceColumns,
      filters: args.filters,
      aggregation,
      sampleSize,
      data,
      warnings: validation.warnings,
      validationStatus: validation.status,
      validationReason: validation.reason,
      provenance: {
        executedAt: new Date().toISOString(),
        engine: 'DataWhiz Deterministic Analytical Core',
        durationMs
      }
    };
  } catch (err: any) {
    return {
      taskId: `res-err-${Date.now().toString(36)}`,
      tool: toolName,
      sourceColumns,
      sampleSize,
      data: null as any,
      warnings: [err.message || 'Execution failure'],
      validationStatus: 'INVALID',
      validationReason: err.message || 'Error executing analytical tool',
      provenance: {
        executedAt: new Date().toISOString(),
        engine: 'DataWhiz Deterministic Analytical Core',
        durationMs: Date.now() - startTime
      }
    };
  }
}
