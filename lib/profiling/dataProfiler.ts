// Data Profiling Engine: Deep statistical, categorical, and temporal profiling for every column (High-Performance $O(N)$ Sampling)

import { ColumnProfile, NumericProfile, CategoricalProfile, DateProfile, ColumnSchema } from '@/lib/types';
import { parseNumberVal, parseDateVal } from '@/lib/schema/schemaDetector';

export function profileColumn(
  schema: ColumnSchema,
  rows: Record<string, any>[]
): ColumnProfile {
  const colName = schema.technicalName;
  const N = rows.length;
  let missingCount = 0;
  const sampleValues: any[] = [];
  const valueCounts = new Map<string, number>();

  // Determine sampling stride for massive datasets (N > 5000)
  const isLarge = N > 5000;
  const sampleStride = isLarge ? Math.ceil(N / 3000) : 1;

  const numericVals: number[] = [];
  const dateVals: Date[] = [];

  let numSum = 0;
  let numMin = Infinity;
  let numMax = -Infinity;
  let numCount = 0;

  for (let i = 0; i < N; i++) {
    const raw = rows[i][colName];
    if (raw === undefined || raw === null || String(raw).trim() === '') {
      missingCount++;
      continue;
    }

    const s = String(raw).trim();
    if (valueCounts.size < 500) {
      valueCounts.set(s, (valueCounts.get(s) || 0) + 1);
    }

    if (sampleValues.length < 5) {
      sampleValues.push(raw);
    }

    const num = parseNumberVal(raw);
    if (num !== null) {
      numCount++;
      numSum += num;
      if (num < numMin) numMin = num;
      if (num > numMax) numMax = num;

      if (!isLarge || i % sampleStride === 0) {
        numericVals.push(num);
      }
    }

    if (!isLarge || i % sampleStride === 0) {
      const dt = parseDateVal(raw);
      if (dt !== null) {
        dateVals.push(dt);
      }
    }
  }

  const filledCount = N - missingCount;
  const uniqueCount = valueCounts.size;
  const missingPercentage = N > 0 ? Math.round((missingCount / N) * 1000) / 10 : 0;
  const uniquePercentage = filledCount > 0 ? Math.round((uniqueCount / filledCount) * 1000) / 10 : 0;
  const duplicateCount = Math.max(0, filledCount - uniqueCount);

  let type: 'numeric' | 'categorical' | 'date' | 'boolean' | 'mixed' = 'categorical';
  if (numCount >= filledCount * 0.75 && filledCount > 0) {
    type = 'numeric';
  } else if (dateVals.length >= (filledCount / sampleStride) * 0.6 && filledCount > 0) {
    type = 'date';
  }

  let numeric: NumericProfile | undefined;
  if (type === 'numeric' && numericVals.length > 0) {
    const sorted = [...numericVals].sort((a, b) => a - b);
    const count = sorted.length;
    const min = numMin !== Infinity ? numMin : sorted[0];
    const max = numMax !== -Infinity ? numMax : sorted[count - 1];
    const mean = numCount > 0 ? numSum / numCount : 0;

    const median = count % 2 === 0 
      ? (sorted[count / 2 - 1] + sorted[count / 2]) / 2 
      : sorted[Math.floor(count / 2)];

    const variance = sorted.reduce((acc, v) => acc + Math.pow(v - mean, 2), 0) / count;
    const std = Math.sqrt(variance);

    const p25 = sorted[Math.floor(count * 0.25)] ?? min;
    const p75 = sorted[Math.floor(count * 0.75)] ?? max;
    const p95 = sorted[Math.floor(count * 0.95)] ?? max;

    // Skewness
    const m3 = sorted.reduce((acc, v) => acc + Math.pow(v - mean, 3), 0) / count;
    const skewness = std > 0 ? m3 / Math.pow(std, 3) : 0;

    // Kurtosis
    const m4 = sorted.reduce((acc, v) => acc + Math.pow(v - mean, 4), 0) / count;
    const kurtosis = std > 0 ? (m4 / Math.pow(std, 4)) - 3 : 0;

    // Outlier detection using IQR (1.5 * IQR)
    const iqr = p75 - p25;
    const lowerBound = p25 - 1.5 * iqr;
    const upperBound = p75 + 1.5 * iqr;
    const outlierIndices: number[] = [];
    let zeroCount = 0;
    let negativeCount = 0;

    const scanLimit = Math.min(N, 10000);
    for (let i = 0; i < scanLimit; i++) {
      const v = parseNumberVal(rows[i][colName]);
      if (v !== null) {
        if (v === 0) zeroCount++;
        if (v < 0) negativeCount++;
        if (v < lowerBound || v > upperBound) {
          outlierIndices.push(i);
        }
      }
    }

    // Build 5 histogram bins
    const span = (max - min) || 1;
    const binSize = span / 5;
    const histogram = [0, 1, 2, 3, 4].map(b => {
      const binStart = min + b * binSize;
      const binEnd = min + (b + 1) * binSize;
      const bCount = sorted.filter(v => v >= binStart && (b === 4 ? v <= binEnd : v < binEnd)).length;
      return {
        binStart: Math.round(binStart * 100) / 100,
        binEnd: Math.round(binEnd * 100) / 100,
        count: isLarge ? Math.round((bCount / count) * N) : bCount
      };
    });

    numeric = {
      min,
      max,
      mean: Math.round(mean * 100) / 100,
      median: Math.round(median * 100) / 100,
      std: Math.round(std * 100) / 100,
      skewness: Math.round(skewness * 100) / 100,
      kurtosis: Math.round(kurtosis * 100) / 100,
      p25: Math.round(p25 * 100) / 100,
      p75: Math.round(p75 * 100) / 100,
      p95: Math.round(p95 * 100) / 100,
      zeroCount,
      negativeCount,
      outlierCount: isLarge ? Math.round((outlierIndices.length / scanLimit) * N) : outlierIndices.length,
      outlierIndices: outlierIndices.slice(0, 50),
      histogram
    };
  }

  let categorical: CategoricalProfile | undefined;
  if (type === 'categorical') {
    const sortedFreq = Array.from(valueCounts.entries())
      .sort((a, b) => b[1] - a[1]);

    const topValues = sortedFreq.slice(0, 20).map(([value, count]) => ({
      value,
      count: isLarge ? Math.round((count / Math.min(N, 5000)) * N) : count,
      percentage: N > 0 ? Math.round((count / N) * 1000) / 10 : 0
    }));

    const rareValues = sortedFreq.slice(-10).map(([value, count]) => ({
      value,
      count
    }));

    categorical = {
      cardinality: uniqueCount,
      topValues,
      rareValues,
      mode: topValues[0]?.value || ''
    };
  }

  let date: DateProfile | undefined;
  if (type === 'date' && dateVals.length > 0) {
    const timestamps = dateVals.map(d => d.getTime()).sort((a, b) => a - b);
    const minDate = new Date(timestamps[0]).toISOString().split('T')[0];
    const maxDate = new Date(timestamps[timestamps.length - 1]).toISOString().split('T')[0];
    const rangeDays = Math.round((timestamps[timestamps.length - 1] - timestamps[0]) / (1000 * 60 * 60 * 24));

    let detectedGrain: 'day' | 'week' | 'month' | 'quarter' | 'year' = 'day';
    if (rangeDays > 365 * 2 && uniqueCount <= 10) {
      detectedGrain = 'year';
    } else if (rangeDays > 90 && uniqueCount <= 15) {
      detectedGrain = 'month';
    } else if (rangeDays > 28 && uniqueCount <= 20) {
      detectedGrain = 'week';
    }

    date = {
      minDate,
      maxDate,
      rangeDays,
      detectedGrain,
      gapsDetected: [],
      distinctDates: uniqueCount,
      invalidDatesCount: Math.max(0, N - dateVals.length - missingCount)
    };
  }

  return {
    name: colName,
    technicalName: colName,
    totalCount: N,
    missingCount,
    missingPercentage,
    uniqueCount,
    uniquePercentage,
    duplicateCount,
    sampleValues,
    type,
    numeric,
    categorical,
    date
  };
}

export function profileDataset(
  schemas: ColumnSchema[],
  rows: Record<string, any>[]
): ColumnProfile[] {
  return schemas.map(schema => profileColumn(schema, rows));
}
