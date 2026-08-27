// Schema Detection Engine: Distinguishes physical vs logical/semantic types with confidence scoring and measurement metadata

import { ColumnSchema, PhysicalType, LogicalType, SemanticRole } from '@/lib/types';
import { inferMeasurement } from '@/lib/units/measurementEngine';
import { inferAggregationSemantics } from '@/lib/analytics/aggregationEngine';

export function parseNumberVal(val: any): number | null {
  if (val === null || val === undefined) return null;
  if (typeof val === 'number') return isFinite(val) ? val : null;
  const s = String(val).trim().replace(/[$,₹€£¥%\s]/g, '').replace(/,/g, '');
  if (!s || !/^-?\d*\.?\d+(e[-+]?\d+)?$/i.test(s)) return null;
  const n = parseFloat(s);
  return isFinite(n) ? n : null;
}

const STRICT_DATE_REGEX = /^(\d{4}[-/.]\d{1,2}[-/.]\d{1,2}|\d{1,2}[-/.]\d{1,2}[-/.]\d{2,4}|\d{4}-\d{2}-\d{2}T|\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]* \d{1,2})/i;

export function safeIsoDate(val: any): string | null {
  if (!val) return null;
  try {
    if (val instanceof Date) {
      const t = val.getTime();
      if (isNaN(t)) return null;
      return val.toISOString().split('T')[0];
    }
    const s = String(val).trim();
    if (/^\d{1,3}$/.test(s) || /^\d+\.\d+$/.test(s)) return null;

    if (STRICT_DATE_REGEX.test(s)) {
      const timestamp = Date.parse(s);
      if (!isNaN(timestamp)) {
        const d = new Date(timestamp);
        if (!isNaN(d.getTime())) {
          const yr = d.getFullYear();
          if (yr >= 1970 && yr <= 2100) {
            return d.toISOString().split('T')[0];
          }
        }
      }
    }
  } catch {
    return null;
  }
  return null;
}

export function parseDateVal(val: any): Date | null {
  if (!val) return null;
  try {
    if (val instanceof Date) {
      return isNaN(val.getTime()) ? null : val;
    }
    const s = String(val).trim();
    if (/^\d{1,3}$/.test(s) || /^\d+\.\d+$/.test(s)) return null;

    if (STRICT_DATE_REGEX.test(s)) {
      const timestamp = Date.parse(s);
      if (!isNaN(timestamp)) {
        const d = new Date(timestamp);
        if (!isNaN(d.getTime())) {
          const yr = d.getFullYear();
          if (yr >= 1970 && yr <= 2100) {
            return d;
          }
        }
      }
    }
  } catch {
    return null;
  }
  return null;
}

export function detectColumnSchema(
  colName: string,
  sampleRows: Record<string, any>[],
  totalRowCount: number
): ColumnSchema {
  let nullCount = 0;
  let numCount = 0;
  let dateCount = 0;
  let boolCount = 0;
  let stringCount = 0;

  const valueCounts = new Map<string, number>();
  const sampleValues: any[] = [];

  for (const row of sampleRows) {
    const raw = row[colName];
    sampleValues.push(raw);
    if (raw === undefined || raw === null || String(raw).trim() === '') {
      nullCount++;
      continue;
    }

    const s = String(raw).trim();
    valueCounts.set(s, (valueCounts.get(s) || 0) + 1);

    if (s.toLowerCase() === 'true' || s.toLowerCase() === 'false' || s.toLowerCase() === 'yes' || s.toLowerCase() === 'no') {
      boolCount++;
    }

    if (parseNumberVal(raw) !== null) {
      numCount++;
    } else if (parseDateVal(raw) !== null) {
      dateCount++;
    } else {
      stringCount++;
    }
  }

  const filledCount = sampleRows.length - nullCount;
  const uniqueCount = valueCounts.size;
  const lowerCol = colName.toLowerCase().replace(/[\s_-]+/g, '');

  // 1. Physical Type Detection
  let physicalType: PhysicalType = 'string';
  if (filledCount === 0) {
    physicalType = 'null';
  } else if (numCount / filledCount >= 0.7) {
    physicalType = 'number';
  } else if (dateCount / filledCount >= 0.6) {
    physicalType = 'date';
  } else if (boolCount / filledCount >= 0.8) {
    physicalType = 'boolean';
  } else {
    physicalType = 'string';
  }

  const isDateKey = /^(date_?key|datekey|year_?month_?key|ymd|period_?key)$/i.test(colName) ||
    (physicalType === 'number' && /key$/i.test(colName) && sampleRows.some(r => /^(19|20)\d{6}$/.test(String(r[colName] ?? ''))));
  const isIdName = !isDateKey && /(id|uuid|code|key|identifier|hash|sku|account|ticket|postal|zip|phone|ssn)$/i.test(colName);
  const isPrimaryKeyCandidate = (uniqueCount === filledCount && filledCount === totalRowCount && isIdName && totalRowCount > 5) && !isDateKey;
  const isForeignKeyCandidate = isDateKey || (isIdName && !isPrimaryKeyCandidate);

  // 2. Unit & Measurement Inference
  const measurementInf = inferMeasurement(colName, physicalType, sampleValues, isIdName || isDateKey);
  const aggInf = inferAggregationSemantics(colName, measurementInf.measurementType, isIdName || isDateKey);

  // 3. Logical Type & Semantic Role Inferences
  let logicalType: LogicalType = 'dimension_category';
  let semanticRole: SemanticRole = 'unclassified';
  let confidence = 0.85;

  const isHighUniquenessId = (uniqueCount === filledCount && totalRowCount > 5) || (uniqueCount / Math.max(1, totalRowCount) > 0.8 && totalRowCount > 20);
  const isDedicatedIdName = /^(id|uuid|guid|ssn|hash)$/i.test(colName) || /_id$|_uuid$|id$/i.test(colName);
  const isIdentifier = isDateKey || isPrimaryKeyCandidate || (isDedicatedIdName && (uniqueCount > 25 || uniqueCount === filledCount)) || (isIdName && isHighUniquenessId);

  const isTemporalName = /^(year|yyyy|yr|quarter|qtr|q[1-4]|hour|minute|sec|week|iso|yearmonth)$/i.test(colName);
  const isDateName = !isDateKey && /(^|_)(date|time|timestamp|datetime|created_?at|updated_?at|joined_?at|start_?date|end_?date)(_|$)/i.test(colName);
  const isGeoName = /(region|state|city|country|location|zone|territory|market|plant)/i.test(colName);
  const isTargetName = /^(churn|is_churned|churn_status|default_risk|target_outcome|response_target|defect|fraud|delivered|delivered_status|conversion|success)$/i.test(colName);

  if (isDateKey) {
    logicalType = 'identifier';
    semanticRole = 'foreign_key';
    confidence = 0.98;
  } else if (isIdentifier) {
    logicalType = 'identifier';
    semanticRole = lowerCol.includes('foreign') || lowerCol.includes('ref') || uniqueCount < totalRowCount ? 'foreign_key' : 'primary_key';
    confidence = 0.95;
  } else if (isTemporalName && physicalType !== 'number') {
    logicalType = 'dimension_category';
    semanticRole = 'timestamp';
    confidence = 0.95;
  } else if (physicalType === 'date' || (isDateName && physicalType !== 'number')) {
    logicalType = 'date';
    semanticRole = 'timestamp';
    confidence = 0.92;
  } else if (isTargetName && (uniqueCount <= 3 || physicalType === 'boolean')) {
    logicalType = 'target_binary';
    semanticRole = 'target_variable';
    confidence = 0.95;
  } else if (physicalType === 'number' && !isTemporalName) {
    if (measurementInf.measurementType === 'currency') {
      logicalType = 'measure_currency';
      semanticRole = 'primary_metric';
      confidence = 0.92;
    } else if (measurementInf.measurementType === 'percentage') {
      logicalType = 'measure_percentage';
      semanticRole = 'secondary_metric';
      confidence = 0.90;
    } else if (measurementInf.measurementType === 'mass' || measurementInf.measurementType === 'volume' || measurementInf.measurementType === 'quantity' || measurementInf.measurementType === 'count') {
      logicalType = 'measure_quantity';
      semanticRole = 'primary_metric';
      confidence = 0.90;
    } else if (measurementInf.measurementType === 'temperature') {
      logicalType = 'measure_quantity';
      semanticRole = 'secondary_metric';
      confidence = 0.88;
    } else {
      logicalType = 'measure_quantity';
      semanticRole = 'secondary_metric';
      confidence = 0.80;
    }
  } else if (isGeoName) {
    logicalType = 'dimension_geo';
    semanticRole = 'primary_dimension';
    confidence = 0.91;
  } else if (uniqueCount <= 25) {
    logicalType = 'dimension_category';
    semanticRole = 'primary_dimension';
    confidence = 0.86;
  } else {
    logicalType = 'free_text';
    semanticRole = 'unclassified';
    confidence = 0.70;
  }

  const isNullable = nullCount > 0;
  const isConstant = uniqueCount <= 1;
  const isHighCardinality = uniqueCount > 50 && physicalType === 'string' && !isIdName && !isDateKey;

  const possibleUsage: string[] = [];
  if (semanticRole === 'primary_metric' || semanticRole === 'secondary_metric') {
    possibleUsage.push('KPI Aggregation', 'Trend Analysis', 'Correlation Matrix');
    if (aggInf.allowedAggregations.includes('sum')) possibleUsage.push('Forecasting Target');
  }
  if (semanticRole === 'timestamp' || logicalType === 'date') {
    possibleUsage.push('Time-Series X-Axis', 'Temporal Filtering', 'Seasonal Decomposition');
  }
  if (semanticRole === 'primary_dimension') {
    possibleUsage.push('Bar Grouping', 'Cross-Filtering', 'Category Breakdown', 'Drill-Down');
  }
  if (semanticRole === 'target_variable' || logicalType.startsWith('target')) {
    possibleUsage.push('Classification Target', 'Churn Driver Modeling', 'Cohort Comparison');
  }

  return {
    name: colName,
    technicalName: colName,
    displayName: colName,
    businessMeaning: '',
    physicalType,
    logicalType,
    semanticRole,
    confidence: Math.round(confidence * 100) / 100,
    isNullable,
    isPrimaryKeyCandidate,
    isForeignKeyCandidate,
    isConstant,
    isHighCardinality,
    possibleUsage,
    interpretationUncertain: confidence < 0.75,
    unit: measurementInf.unitMetadata.unitSymbol || measurementInf.unitMetadata.unitName,
    measurementType: measurementInf.measurementType,
    unitMetadata: measurementInf.unitMetadata,
    aggregationBehavior: aggInf.behavior,
    allowedAggregations: aggInf.allowedAggregations,
    evidence: [...measurementInf.evidence, ...aggInf.evidence]
  };
}

export function detectDatasetSchema(
  columns: string[],
  rows: Record<string, any>[]
): ColumnSchema[] {
  const sample = rows.length > 500 ? rows.slice(0, 500) : rows;
  return columns.map(col => detectColumnSchema(col, sample, rows.length));
}
