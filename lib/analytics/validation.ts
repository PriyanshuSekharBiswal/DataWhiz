// Result Validation Engine: Validates mathematical and statistical integrity of analytical results

import { AnalysisResult } from '@/lib/types';

export interface ValidationCheckOptions {
  minSampleSize?: number;
  minDistinctValues?: number;
  allowEmpty?: boolean;
  requiredFields?: string[];
  maxMissingPct?: number;
}

export function validateAnalysisResult<T = any>(
  tool: string,
  data: T,
  sourceColumns: string[],
  sampleSize: number,
  options: ValidationCheckOptions = {}
): {
  status: 'VALID' | 'VALID_WITH_WARNING' | 'INVALID';
  warnings: string[];
  reason?: string;
} {
  const warnings: string[] = [];
  const minSample = options.minSampleSize ?? 3;

  // 1. Check Sample Size
  if (sampleSize === 0 && !options.allowEmpty) {
    return {
      status: 'INVALID',
      warnings: ['Zero observations available after filter evaluation.'],
      reason: 'Empty dataset or non-matching filter criteria.'
    };
  }

  if (sampleSize < minSample) {
    warnings.push(`Small sample size (N = ${sampleSize}); results may have high variance.`);
  }

  // 2. Check for null or empty payload
  if (data === null || data === undefined) {
    return {
      status: 'INVALID',
      warnings: ['Result payload is null or undefined.'],
      reason: 'Computation produced null or undefined output.'
    };
  }

  // 3. Tool-Specific Mathematical Integrity Checks
  if (tool === 'group' || tool === 'rank') {
    const arr = Array.isArray(data) ? data : [];
    if (arr.length === 0) {
      warnings.push('Group/Rank aggregation produced no groups.');
    }
  } else if (tool === 'aggregate') {
    const agg = data as any;
    if (!agg || typeof agg.value !== 'number' || isNaN(agg.value)) {
      return {
        status: 'INVALID',
        warnings: ['Aggregate computation produced non-numeric or NaN value.'],
        reason: 'Invalid aggregate value'
      };
    }
  } else if (tool === 'forecast') {
    const fc = data as any;
    const points = fc?.forecastPoints || fc?.predictions;
    if (!fc || !points || points.length === 0) {
      return {
        status: 'INVALID',
        warnings: ['Forecast model failed to generate forward predictions.'],
        reason: 'Model convergence failure or insufficient historical sequence.'
      };
    }
  } else if (tool === 'correlation') {
    const corr = data as any;
    if (corr && typeof corr.coefficient === 'number' && (isNaN(corr.coefficient) || !isFinite(corr.coefficient))) {
      return {
        status: 'INVALID',
        warnings: ['Correlation coefficient is NaN or non-finite (zero variance).'],
        reason: 'One or both variables have zero variance.'
      };
    }
  } else if (tool === 'classification') {
    const cl = data as any;
    if (cl && cl.overallChurnRate === undefined && cl.accuracy === undefined) {
      warnings.push('Classification result missing standard performance metrics.');
    }
  }

  const status = warnings.length > 0 ? 'VALID_WITH_WARNING' : 'VALID';

  return {
    status,
    warnings,
    reason: warnings.length > 0 ? warnings.join('; ') : undefined
  };
}
