// Aggregation Intelligence Engine: Enforces strict mathematical aggregation semantics per measurement family

import { AggregationBehavior, AllowedAggregation, MeasurementType, ColumnSchema } from '@/lib/types';

export interface AggregationInference {
  behavior: AggregationBehavior;
  defaultAggregation: AllowedAggregation;
  allowedAggregations: AllowedAggregation[];
  evidence: string[];
}

/**
 * Infer aggregation behavior from measurement type and column properties
 */
export function inferAggregationSemantics(
  colName: string,
  measurementType: MeasurementType,
  isIdOrKey: boolean = false
): AggregationInference {
  const lower = colName.toLowerCase();
  const evidence: string[] = [];

  // 1. Identifiers / Keys / Codes
  if (isIdOrKey || measurementType === 'identifier' || /_id$|_key$|_code$|_pk$|_fk$/i.test(lower) || /datekey|date_key|customer_?id|order_?id/i.test(lower)) {
    evidence.push('Identifier/Key column cannot be aggregated additively (SUM is forbidden)');
    return {
      behavior: 'non_additive',
      defaultAggregation: 'count',
      allowedAggregations: ['count', 'distinct_count'],
      evidence
    };
  }

  // 2. Temperatures (SUM is meaningless, Mean/Median/Min/Max meaningful)
  if (measurementType === 'temperature' || /temp|celsius|fahrenheit|kelvin/i.test(lower)) {
    evidence.push('Temperature measure is intensive (SUM is invalid; MEAN, MEDIAN, MIN, MAX are valid)');
    return {
      behavior: 'average_like',
      defaultAggregation: 'mean',
      allowedAggregations: ['mean', 'median', 'min', 'max', 'count'],
      evidence
    };
  }

  // 3. Percentages (SUM is mathematically invalid)
  if (measurementType === 'percentage' || /pct|percent|percentage|margin_pct|share_pct|growth_pct|rate/i.test(lower)) {
    evidence.push('Percentage measure is non-additive across records (SUM is invalid; MEAN, WEIGHTED_AVERAGE valid)');
    return {
      behavior: 'percentage',
      defaultAggregation: 'mean',
      allowedAggregations: ['mean', 'median', 'min', 'max', 'weighted_average', 'count'],
      evidence
    };
  }

  // 4. Ratios (e.g. Current Ratio, Quick Ratio, Debt-to-Equity, P/E)
  if (measurementType === 'ratio' || /ratio|multiplier|index|roas|roi|cpc|cpm|ctr/i.test(lower)) {
    evidence.push('Ratio is dimensionless non-additive metric (SUM is invalid; MEAN, MEDIAN valid)');
    return {
      behavior: 'ratio',
      defaultAggregation: 'mean',
      allowedAggregations: ['mean', 'median', 'min', 'max', 'weighted_average', 'count'],
      evidence
    };
  }

  // 5. Unit Price / Unit Cost (SUM across different products/items is invalid)
  if (/unit_?price|unit_?cost|price_per_|rate_per_/i.test(lower) && !/revenue|total|spend|amount|cost_total/i.test(lower)) {
    evidence.push('Unit pricing/rate measure is non-additive across line items (SUM is invalid; MEAN/WEIGHTED_AVG valid)');
    return {
      behavior: 'average_like',
      defaultAggregation: 'mean',
      allowedAggregations: ['mean', 'median', 'min', 'max', 'weighted_average', 'count'],
      evidence
    };
  }

  // 6. Snapshots / Balances / Stock levels (SUM across time is invalid, Semi-additive)
  if (/snapshot|balance|inventory_level|headcount|active_users|occupancy/i.test(lower)) {
    evidence.push('Snapshot metric is semi-additive (SUM across time invalid; LATEST, MEAN valid)');
    return {
      behavior: 'snapshot',
      defaultAggregation: 'latest',
      allowedAggregations: ['latest', 'earliest', 'mean', 'min', 'max', 'count'],
      evidence
    };
  }

  // 7. General Additive Measures (Revenue, Sales, Units, Volume, Mass, Clicks, Spend)
  if (measurementType === 'currency' || measurementType === 'mass' || measurementType === 'volume' || measurementType === 'count' || measurementType === 'quantity') {
    evidence.push('Extensive physical or financial quantity is fully additive (SUM is primary aggregation)');
    return {
      behavior: 'additive',
      defaultAggregation: 'sum',
      allowedAggregations: ['sum', 'mean', 'median', 'min', 'max', 'count'],
      evidence
    };
  }

  return {
    behavior: 'additive',
    defaultAggregation: 'sum',
    allowedAggregations: ['sum', 'mean', 'median', 'min', 'max', 'count'],
    evidence: ['Default continuous numeric aggregation']
  };
}

/**
 * Validate if an aggregation function is permissible on a column
 */
export function isAggregationAllowed(
  agg: string,
  schema?: Partial<ColumnSchema>
): { allowed: boolean; reason?: string } {
  const normAgg = agg.toLowerCase().replace(/avg/g, 'mean') as AllowedAggregation;

  if (schema?.allowedAggregations && schema.allowedAggregations.length > 0) {
    if (!schema.allowedAggregations.includes(normAgg)) {
      return {
        allowed: false,
        reason: `Operation '${agg}' is forbidden on '${schema.displayName || schema.technicalName}' because its aggregation behavior is '${schema.aggregationBehavior}'. Allowed operations: [${schema.allowedAggregations.join(', ')}].`
      };
    }
  }

  if (normAgg === 'sum') {
    if (schema?.aggregationBehavior === 'non_additive' ||
        schema?.aggregationBehavior === 'percentage' ||
        schema?.aggregationBehavior === 'ratio' ||
        schema?.aggregationBehavior === 'average_like') {
      return {
        allowed: false,
        reason: `SUM aggregation is mathematically invalid for '${schema.displayName || schema.technicalName}' (behavior: ${schema.aggregationBehavior}).`
      };
    }
  }

  return { allowed: true };
}

/**
 * Perform safe aggregation calculation respecting semantic rules
 */
export function computeSafeAggregation(
  numbers: number[],
  requestedAgg: string = 'sum',
  schema?: Partial<ColumnSchema>
): { value: number; appliedAggregation: AllowedAggregation; warning?: string } {
  if (!numbers.length) {
    return { value: 0, appliedAggregation: 'count' };
  }

  let targetAgg = requestedAgg.toLowerCase().replace(/avg/g, 'mean') as AllowedAggregation;
  let warning: string | undefined = undefined;

  const validation = isAggregationAllowed(targetAgg, schema);
  if (!validation.allowed) {
    // Fall back to schema default or mean
    const fallback = schema?.aggregationBehavior === 'non_additive' ? 'count' : 'mean';
    warning = `${validation.reason} Safely adjusted aggregation to '${fallback}'.`;
    targetAgg = fallback;
  }

  let value = 0;
  switch (targetAgg) {
    case 'mean': {
      const sum = numbers.reduce((a, b) => a + b, 0);
      value = Math.round((sum / numbers.length) * 100) / 100;
      break;
    }
    case 'median': {
      const sorted = [...numbers].sort((a, b) => a - b);
      const mid = Math.floor(sorted.length / 2);
      value = sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
      break;
    }
    case 'min':
      value = Math.min(...numbers);
      break;
    case 'max':
      value = Math.max(...numbers);
      break;
    case 'count':
      value = numbers.length;
      break;
    case 'distinct_count':
      value = new Set(numbers).size;
      break;
    case 'latest':
      value = numbers[numbers.length - 1];
      break;
    case 'earliest':
      value = numbers[0];
      break;
    case 'sum':
    default: {
      const sum = numbers.reduce((a, b) => a + b, 0);
      value = Math.round(sum * 100) / 100;
      targetAgg = 'sum';
      break;
    }
  }

  return { value, appliedAggregation: targetAgg, warning };
}
