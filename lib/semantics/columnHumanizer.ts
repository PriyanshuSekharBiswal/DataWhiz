// Semantic Column Intelligence Engine: Multi-signal inference for human-friendly naming, business concept classification, and uncertainty tracking

import { ColumnSchema, PhysicalType, LogicalType, SemanticRole, MeasurementType, UnitMetadata, AggregationBehavior, AllowedAggregation } from '@/lib/types';
import { decodeCrypticColumn } from './crypticDecoder';
import { inferMeasurement } from '@/lib/units/measurementEngine';
import { inferAggregationSemantics } from '@/lib/analytics/aggregationEngine';

interface HumanizedConcept {
  displayName: string;
  businessMeaning: string;
  semanticRole: SemanticRole;
  logicalType: LogicalType;
  confidence: number;
  unit?: string;
  measurementType?: MeasurementType;
  unitMetadata?: UnitMetadata;
  aggregationBehavior?: AggregationBehavior;
  allowedAggregations?: AllowedAggregation[];
  evidence: string[];
  alternatives?: string[];
  uncertain: boolean;
  requiresReview: boolean;
}

const COMMON_ABBREVIATION_TOKENS: Record<string, string> = {
  amt: 'Amount',
  avg: 'Average',
  bal: 'Balance',
  brd: 'Branded',
  cat: 'Category',
  cd: 'Code',
  clk: 'Clicks',
  cnt: 'Count',
  cost: 'Cost',
  ctv: 'Connected TV',
  ctr: 'Click-Through Rate',
  cpc: 'Cost Per Click',
  cpm: 'Cost Per Mille',
  cpa: 'Cost Per Acquisition',
  cust: 'Customer',
  date: 'Date',
  desc: 'Description',
  diff: 'Difference',
  dig: 'Digital',
  dir: 'Direct',
  dis: 'Display',
  disc: 'Discount',
  div: 'Division',
  doc: 'Document',
  dt: 'Date',
  dtv: 'Digital Media',
  dup: 'Duplicate',
  dur: 'Duration',
  eml: 'Email',
  err: 'Error',
  est: 'Estimated',
  exp: 'Expense',
  flg: 'Flag',
  gen: 'Generic',
  grp: 'Gross Rating Points',
  id: 'Identifier',
  imp: 'Impressions',
  loc: 'Location',
  max: 'Maximum',
  min: 'Minimum',
  mkt: 'Marketing',
  mfg: 'Manufacturing',
  mo: 'Month',
  mth: 'Month',
  mths: 'Months',
  nm: 'Name',
  no: 'Number',
  num: 'Number',
  oem: 'OEM Placement',
  olv: 'Online Video',
  ooh: 'Out of Home',
  ord: 'Order',
  pct: 'Percentage',
  pkg: 'Package',
  pmx: 'Performance Max',
  prm: 'Premium',
  prod: 'Product',
  prc: 'Price',
  px: 'Price',
  qty: 'Quantity',
  rate: 'Rate',
  ratio: 'Ratio',
  rec: 'Record',
  ref: 'Reference',
  reg: 'Region',
  rev: 'Revenue',
  score: 'Score',
  sec: 'Seconds',
  seg: 'Segment',
  seq: 'Sequence',
  sku: 'Stock Keeping Unit',
  soc: 'Social Media',
  spd: 'Spend',
  src: 'Source',
  srh: 'Search',
  stat: 'Status',
  std: 'Standard',
  stm: 'Standard',
  str: 'Store',
  temp: 'Temperature',
  tenure: 'Tenure',
  time: 'Time',
  tot: 'Total',
  txn: 'Transaction',
  txt: 'Text',
  typ: 'Type',
  unit: 'Units',
  val: 'Value',
  var: 'Variance',
  vol: 'Volume',
  wk: 'Week',
  wt: 'Weight',
  yr: 'Year'
};

/**
 * Infer business meaning from multiple empirical signals
 */
export function inferColumnSemantics(schema: ColumnSchema): HumanizedConcept {
  const col = schema.technicalName;
  const lower = col.toLowerCase().replace(/[\s.-]+/g, '_');
  const tokens = lower.split('_').filter(Boolean);
  const evidence: string[] = [...(schema.evidence || [])];
  const alternatives: string[] = [];

  // Measurement & Aggregation inference
  const measurementInf = schema.unitMetadata && schema.measurementType
    ? { measurementType: schema.measurementType, unitMetadata: schema.unitMetadata, confidence: schema.confidence, evidence: [] }
    : inferMeasurement(col, schema.physicalType, [], schema.isPrimaryKeyCandidate);

  const aggInf = schema.aggregationBehavior && schema.allowedAggregations
    ? { behavior: schema.aggregationBehavior, allowedAggregations: schema.allowedAggregations, defaultAggregation: schema.allowedAggregations[0] || 'sum', evidence: [] }
    : inferAggregationSemantics(col, measurementInf.measurementType, schema.isPrimaryKeyCandidate);

  // 1. Check Cryptic Multi-Token Ad / System Codes (e.g. dtv_srh_pmx_tot_xxx_clk)
  if (tokens.length >= 3 && (lower.startsWith('dtv_') || /_imp|_clk|_grp|_vol|_cpc|_cpm/i.test(lower))) {
    const cryptic = decodeCrypticColumn(col);
    if (cryptic.confidence >= 0.70) {
      evidence.push(`Decoded from structured cryptic naming taxonomy (${tokens.join(' > ')})`);
      return {
        displayName: cryptic.decodedName,
        businessMeaning: `Multi-token metric representing ${cryptic.decodedName} (${cryptic.unit}).`,
        semanticRole: 'marketing_metric',
        logicalType: cryptic.unit === 'currency' ? 'measure_currency' : cryptic.unit === 'percentage' ? 'measure_percentage' : 'measure_quantity',
        confidence: cryptic.confidence,
        unit: cryptic.unit,
        measurementType: measurementInf.measurementType,
        unitMetadata: measurementInf.unitMetadata,
        aggregationBehavior: aggInf.behavior,
        allowedAggregations: aggInf.allowedAggregations,
        evidence,
        uncertain: cryptic.uncertainFlag,
        requiresReview: cryptic.uncertainFlag
      };
    }
  }

  // 2. Token Normalization & Abbreviation Expansion
  const expandedTokens: string[] = [];
  let recognizedTokenCount = 0;

  for (const t of tokens) {
    if (COMMON_ABBREVIATION_TOKENS[t]) {
      expandedTokens.push(COMMON_ABBREVIATION_TOKENS[t]);
      recognizedTokenCount++;
    } else {
      // Capitalize first letter of unknown token
      expandedTokens.push(t.charAt(0).toUpperCase() + t.slice(1));
    }
  }

  const generatedDisplayName = expandedTokens.join(' ');

  // 3. Multi-Signal Semantic Role Assignment
  let semanticRole: SemanticRole = schema.semanticRole;
  let logicalType: LogicalType = schema.logicalType;
  let confidence = schema.confidence;

  // Signal: Identifier / Primary Key / DateKey
  if (schema.logicalType === 'identifier' || schema.isPrimaryKeyCandidate || /^(id|key|uuid|guid|code|no|num|pk|fk)$/i.test(col) || /_id$|_key$|_pk$|_fk$|key$/i.test(col) || /date_?key|datekey/i.test(col)) {
    semanticRole = schema.isPrimaryKeyCandidate ? 'primary_key' : 'identifier';
    logicalType = 'identifier';
    confidence = 0.95;
    evidence.push('Column name and high-cardinality uniqueness indicate record identifier / key');
  }
  // Signal: Date / Timestamp
  else if ((schema.physicalType === 'date' || schema.logicalType === 'date' || schema.logicalType === 'datetime' || /(^|_)(date|time|timestamp|datetime|created_?at|updated_?at|start_?date|end_?date)(_|$)/i.test(col)) && schema.physicalType !== 'number') {
    semanticRole = 'timestamp';
    logicalType = schema.logicalType === 'datetime' ? 'datetime' : 'date';
    confidence = 0.94;
    evidence.push('Temporal physical type and date format pattern');
  }
  // Signal: Currency / Revenue / Cost / Margin
  else if (measurementInf.measurementType === 'currency') {
    semanticRole = 'measure';
    logicalType = 'measure_currency';
    confidence = 0.92;
    evidence.push('Financial currency terminology and continuous numeric distribution');
  }
  // Signal: Mass / Physical weight
  else if (measurementInf.measurementType === 'mass') {
    semanticRole = 'measure';
    logicalType = 'measure_quantity';
    confidence = 0.92;
    evidence.push(`Physical mass metric: ${measurementInf.unitMetadata.unitName}`);
  }
  // Signal: Volume / Liquid
  else if (measurementInf.measurementType === 'volume') {
    semanticRole = 'measure';
    logicalType = 'measure_quantity';
    confidence = 0.92;
    evidence.push(`Physical volume metric: ${measurementInf.unitMetadata.unitName}`);
  }
  // Signal: Temperature
  else if (measurementInf.measurementType === 'temperature') {
    semanticRole = 'measure';
    logicalType = 'measure_quantity';
    confidence = 0.92;
    evidence.push(`Temperature measurement: ${measurementInf.unitMetadata.unitName}`);
  }
  // Signal: Quantity / Units / Count / Volume
  else if (schema.physicalType === 'number' && (/qty|quantity|units|count|volume|impressions|clicks|visits|orders|transactions|views/i.test(col))) {
    semanticRole = 'measure';
    logicalType = 'measure_quantity';
    confidence = 0.90;
    evidence.push('Discrete count / volume terminology and numeric distribution');
  }
  // Signal: Percentage / Rate / Ratio
  else if (measurementInf.measurementType === 'percentage' || schema.physicalType === 'number' && (/pct|percent|percentage|rate|ratio|share|ctr|cvr|margin_pct/i.test(col) || /%/i.test(col))) {
    semanticRole = 'measure';
    logicalType = 'measure_percentage';
    confidence = 0.91;
    evidence.push('Rate/percentage terminology and numeric ratio distribution');
  }
  // Signal: Duration / Time Span
  else if (schema.physicalType === 'number' && (/duration|tenure|age|seconds|minutes|hours|days|weeks|months|years|mths|latency|cycletime/i.test(col))) {
    semanticRole = 'measure';
    logicalType = 'measure_quantity';
    confidence = 0.88;
    evidence.push('Duration / elapsed time terminology and continuous numeric distribution');
  }
  // Signal: Binary Prediction Target
  else if (/^(churn|default|fraud|defect|failure|converted|target|outcome|label|is_churned|is_fraud|is_defect)$/i.test(col)) {
    semanticRole = 'target_candidate';
    logicalType = 'target_binary';
    confidence = 0.94;
    evidence.push('High-relevance prediction target name and discrete classification distribution');
  }
  // Signal: Geographic Entity
  else if (/country|state|city|region|province|territory|postal|zip|latitude|longitude|lat|lon/i.test(col)) {
    semanticRole = 'geographic';
    logicalType = 'dimension_geo';
    confidence = 0.92;
    evidence.push('Geographic entity nomenclature');
  }
  // Signal: General Continuous Numeric Measure
  else if (schema.physicalType === 'number') {
    semanticRole = 'measure';
    logicalType = 'measure_quantity';
    confidence = 0.85;
    evidence.push('Continuous numeric variable with mathematical variance');
  }
  // Signal: Categorical Classification Dimension
  else if (schema.physicalType === 'string' || schema.physicalType === 'boolean') {
    semanticRole = 'category';
    logicalType = 'dimension_category';
    confidence = 0.85;
    evidence.push('Discrete text/categorical grouping dimension');
  }

  // 4. Uncertainty & Review Flag
  const isUncertain = confidence < 0.60 || (tokens.length === 1 && /^[a-z]\d+$/i.test(col));
  if (isUncertain) {
    alternatives.push('dimension_category', 'measure_quantity', 'free_text');
    evidence.push('Ambiguous cryptic naming with low semantic dictionary match');
  }

  const unitStr = measurementInf.unitMetadata.unitSymbol || measurementInf.unitMetadata.unitName || schema.unit;
  const businessMeaning = `Field '${generatedDisplayName}' (${col}) representing ${semanticRole.replace(/_/g, ' ')}${unitStr ? ` [${unitStr}]` : ''}.`;

  return {
    displayName: generatedDisplayName,
    businessMeaning,
    semanticRole,
    logicalType,
    confidence: Math.round(confidence * 100) / 100,
    unit: unitStr,
    measurementType: measurementInf.measurementType,
    unitMetadata: measurementInf.unitMetadata,
    aggregationBehavior: aggInf.behavior,
    allowedAggregations: aggInf.allowedAggregations,
    evidence,
    alternatives: alternatives.length ? alternatives : undefined,
    uncertain: isUncertain,
    requiresReview: isUncertain
  };
}

/**
 * Humanize single column name
 */
export function humanizeColumnName(colName: string): HumanizedConcept {
  return inferColumnSemantics({
    name: colName,
    technicalName: colName,
    displayName: colName,
    businessMeaning: '',
    physicalType: 'string',
    logicalType: 'dimension_category',
    semanticRole: 'dimension',
    confidence: 0.70,
    isNullable: false,
    isPrimaryKeyCandidate: false,
    isForeignKeyCandidate: false,
    isConstant: false,
    isHighCardinality: false,
    possibleUsage: [],
    interpretationUncertain: false
  });
}

/**
 * Enrich full dataset schema with multi-signal semantics
 */
export function enrichSchemaWithSemantics(schemas: ColumnSchema[]): ColumnSchema[] {
  return schemas.map(schema => {
    const concept = inferColumnSemantics(schema);

    return {
      ...schema,
      displayName: concept.displayName,
      businessMeaning: concept.businessMeaning,
      semanticRole: concept.semanticRole,
      logicalType: concept.logicalType,
      confidence: concept.confidence,
      unit: concept.unit,
      measurementType: concept.measurementType,
      unitMetadata: concept.unitMetadata,
      aggregationBehavior: concept.aggregationBehavior,
      allowedAggregations: concept.allowedAggregations,
      evidence: concept.evidence,
      alternatives: concept.alternatives,
      interpretationUncertain: concept.uncertain,
      requiresReview: concept.requiresReview
    };
  });
}
