// Centralized Authoritative Target & Outcome Inference Service
// Determines true prediction targets, task types, and semantic polarity without hardcoded domain assumptions

import { ColumnSchema, ColumnProfile, TargetCandidate, UserIntent, SemanticPolarity } from '@/lib/types';
import { parseNumberVal } from '@/lib/schema/schemaDetector';

const EXCLUDE_TARGET_NAMES_REGEX = /^(id|key|code|zip|postal|pin|ssn|phone|row_?id|record_?id|seq|year|month|day|hour|min|sec|timestamp|created_?at|updated_?at|date|datekey|date_key|promo|promoflag|is_promo|has_promo|discount_flag|dummy)$/i;

const UNFAVORABLE_TARGET_TOKENS = /churn|default|fraud|defect|failure|cancel|delay|incident|violation|drop|loss|risk/i;
const FAVORABLE_TARGET_TOKENS = /delivered|converted|conversion|retention|retained|renewal|success|pass|passed|promoted|qualified|won|approved/i;
const GENERAL_TARGET_TOKENS = /target|outcome|label|class|status|response/i;

export function inferTargetCandidates(
  schemas: ColumnSchema[],
  profiles: ColumnProfile[],
  rows: Record<string, any>[],
  userIntent?: UserIntent
): TargetCandidate[] {
  const candidates: TargetCandidate[] = [];
  const N = rows.length;

  for (const schema of schemas) {
    const col = schema.technicalName;
    const lower = col.toLowerCase().replace(/[\s_-]+/g, '');
    const profile = profiles.find(p => p.technicalName === col);

    // 1. Hard exclusions: Identifiers, timestamps, postal codes, keys, pure constant columns
    if (schema.logicalType === 'identifier' || schema.semanticRole === 'identifier' || schema.semanticRole === 'foreign_key' || schema.semanticRole === 'primary_key' || schema.isPrimaryKeyCandidate || schema.isConstant || schema.semanticRole === 'timestamp' || schema.logicalType === 'date' || /_key$|key$/i.test(col)) {
      continue;
    }
    if (EXCLUDE_TARGET_NAMES_REGEX.test(col) && !UNFAVORABLE_TARGET_TOKENS.test(col) && !FAVORABLE_TARGET_TOKENS.test(col) && !GENERAL_TARGET_TOKENS.test(col)) {
      continue;
    }

    // Compute distinct values directly from rows for robust classification
    const nonNullValues = rows
      .map(r => r[col])
      .filter(v => v !== undefined && v !== null && String(v).trim() !== '');

    const distinctValuesMap = new Map<string, number>();
    for (const v of nonNullValues) {
      const s = String(v).trim();
      distinctValuesMap.set(s, (distinctValuesMap.get(s) || 0) + 1);
    }
    const uniqueCount = distinctValuesMap.size;
    const distinctKeys = Array.from(distinctValuesMap.keys());

    const evidence: string[] = [];
    let taskType: TargetCandidate['taskType'] = 'none';
    let confidence = 0.5;
    let leakageRisk: TargetCandidate['leakageRisk'] = 'none';
    let usable = true;
    let purpose = '';
    let positiveClass: string | undefined = undefined;
    let polarity: SemanticPolarity = 'unknown';
    const classDistribution: Record<string, number> = {};

    distinctValuesMap.forEach((count, val) => {
      classDistribution[val] = count;
    });

    // 2. Binary Target Analysis (e.g. churn, delivered, defect, fraud, conversion, active)
    if (uniqueCount === 2 || schema.physicalType === 'boolean') {
      const valA = distinctKeys[0] ?? '';
      const valB = distinctKeys[1] ?? '';

      const isBinaryFormat = (
        (valA === '0' && valB === '1') || (valA === '1' && valB === '0') ||
        (valA.toLowerCase() === 'true' && valB.toLowerCase() === 'false') ||
        (valA.toLowerCase() === 'false' && valB.toLowerCase() === 'true') ||
        (valA.toLowerCase() === 'yes' && valB.toLowerCase() === 'no') ||
        (valA.toLowerCase() === 'no' && valB.toLowerCase() === 'yes') ||
        UNFAVORABLE_TARGET_TOKENS.test(col) || FAVORABLE_TARGET_TOKENS.test(col) || GENERAL_TARGET_TOKENS.test(col)
      );

      if (isBinaryFormat) {
        taskType = 'binary_classification';
        evidence.push('Two distinct discrete states (binary distribution)');

        // Detect positive minority/target class
        if (valA === '1' || valA.toLowerCase() === 'true' || valA.toLowerCase() === 'yes') {
          positiveClass = valA;
        } else if (valB === '1' || valB.toLowerCase() === 'true' || valB.toLowerCase() === 'yes') {
          positiveClass = valB;
        } else if (UNFAVORABLE_TARGET_TOKENS.test(valA) || FAVORABLE_TARGET_TOKENS.test(valA)) {
          positiveClass = valA;
        } else if (UNFAVORABLE_TARGET_TOKENS.test(valB) || FAVORABLE_TARGET_TOKENS.test(valB)) {
          positiveClass = valB;
        } else {
          // Default to the less frequent class
          const countA = distinctValuesMap.get(valA) || 0;
          const countB = distinctValuesMap.get(valB) || 0;
          positiveClass = countA < countB ? valA : valB;
        }

        // Infer Semantic Polarity:
        // delivered = 1 is favorable, churn = 1 is unfavorable
        if (UNFAVORABLE_TARGET_TOKENS.test(col)) {
          polarity = 'unfavorable';
          evidence.push(`Semantic polarity identified as UNFAVORABLE / RISK ('${col}')`);
        } else if (FAVORABLE_TARGET_TOKENS.test(col)) {
          polarity = 'favorable';
          evidence.push(`Semantic polarity identified as FAVORABLE / SUCCESS ('${col}')`);
        } else {
          polarity = 'neutral';
        }

        // Check severe class imbalance
        const countA = distinctValuesMap.get(valA) || 0;
        const countB = distinctValuesMap.get(valB) || 0;
        const minClassCount = Math.min(countA, countB);
        if (minClassCount < 5 && N >= 30) {
          leakageRisk = 'medium';
          evidence.push(`Extreme class imbalance: minority class count = ${minClassCount}`);
        }

        // Token match boost
        if (UNFAVORABLE_TARGET_TOKENS.test(col) || FAVORABLE_TARGET_TOKENS.test(col)) {
          confidence = 0.95;
          evidence.push(`Column name matches recognized supervised target token '${col}'`);
          purpose = `Binary prediction target for supervised classification (${positiveClass} vs others)`;
        } else if (/promo|discount|weekend|holiday|flag/i.test(col)) {
          // Explanatory control flag
          confidence = 0.35;
          usable = false;
          evidence.push('Context indicates explanatory control flag rather than business prediction target');
          purpose = 'Explanatory control flag';
        } else {
          confidence = 0.75;
          purpose = `Binary classification candidate (${col})`;
        }
      }
    }

    // 3. Multi-Class Categorical Target Analysis (e.g. status tier, risk grade: 3 to 8 classes)
    if (taskType === 'none' && uniqueCount >= 3 && uniqueCount <= 8 && schema.physicalType === 'string') {
      if (UNFAVORABLE_TARGET_TOKENS.test(col) || FAVORABLE_TARGET_TOKENS.test(col) || GENERAL_TARGET_TOKENS.test(col) || /tier|grade|priority|severity|segment|risk_level/i.test(col)) {
        taskType = 'multiclass_classification';
        confidence = 0.82;
        evidence.push(`Discrete multi-class distribution with ${uniqueCount} categories`);
        purpose = `Multi-class classification target for categorizing ${col}`;
      }
    }

    // 4. Continuous Outcome Measure Analysis (e.g. revenue, sales, duration, score, yield)
    if (taskType === 'none' && (schema.physicalType === 'number' || schema.logicalType.startsWith('measure'))) {
      const numProfile = profile?.numeric;
      if (numProfile && numProfile.std > 0 && schema.measurementType !== 'temperature') {
        // Continuous measure
        taskType = 'regression';
        if (schema.semanticRole === 'primary_metric' || /revenue|sales|income|amount|yield|score|value|total/i.test(col)) {
          confidence = 0.90;
          evidence.push('High-variance continuous numeric measure representing key performance outcome');
          purpose = `Continuous regression and performance outcome target (${col})`;
        } else {
          confidence = 0.68;
          evidence.push('Continuous numerical feature');
          purpose = `Secondary continuous regression candidate (${col})`;
        }
      }
    }

    // 5. User Intent Alignment
    if (userIntent?.targetMetric && userIntent.targetMetric.toLowerCase() === col.toLowerCase()) {
      confidence = Math.min(0.99, confidence + 0.15);
      evidence.push(`Explicitly requested by user intent ('${userIntent.targetMetric}')`);
    }

    // 6. Check Leakage: ID-like high cardinality or zero variation
    if (uniqueCount === N && N > 10) {
      leakageRisk = 'high';
      usable = false;
      evidence.push('Perfect uniqueness (100% unique per row) causes complete target leakage');
    }

    if (taskType !== 'none' && confidence >= 0.5) {
      candidates.push({
        column: col,
        purpose,
        taskType,
        confidence,
        evidence,
        leakageRisk,
        usable: usable && leakageRisk !== 'high',
        positiveClass,
        polarity,
        classDistribution: Object.keys(classDistribution).length ? classDistribution : undefined
      });
    }
  }

  // Sort candidates by confidence descending
  return candidates.sort((a, b) => b.confidence - a.confidence);
}
