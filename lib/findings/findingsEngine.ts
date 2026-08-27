// Findings Engine: Generates and ranks strictly verified mathematical findings backed by real calculations

import { Finding, DatasetContext, FindingNature } from '@/lib/types';
import { parseNumberVal, safeIsoDate } from '@/lib/schema/schemaDetector';
import { executeDataWhizTool } from '@/lib/ai/tools/toolRegistry';

export function extractVerifiedFindings(context: DatasetContext): Finding[] {
  const findings: Finding[] = [];
  const rows = context.cleanedRows;
  const schemas = context.schema;
  const N = rows.length;

  if (N === 0) return findings;

  const metricCol = context.primaryMetricColumn || schemas.find(s => s.semanticRole === 'primary_metric' || s.physicalType === 'number')?.technicalName;
  const dimCol = context.primaryDimensionColumn || schemas.find(s => s.logicalType.startsWith('dimension'))?.technicalName;
  const timeInfo = context.timeDimensions;
  const targetCandidates = context.targetCandidates || [];
  const primaryTarget = targetCandidates.find(t => t.usable && t.confidence >= 0.70);

  const metricDisplay = metricCol ? (schemas.find(s => s.technicalName === metricCol)?.displayName || metricCol) : 'Primary Metric';
  const dimDisplay = dimCol ? (schemas.find(s => s.technicalName === dimCol)?.displayName || dimCol) : 'Segment';

  // 1. Period Comparison & Trend Finding (Calculated Finding)
  if (metricCol && timeInfo && rows.length >= 4) {
    const periodRes = executeDataWhizTool('period_compare', { metric: metricCol, timeField: timeInfo.column }, context);
    if (periodRes.validationStatus !== 'INVALID' && periodRes.data?.deltas?.length > 0) {
      const deltas = periodRes.data.deltas;
      const latestDelta = deltas[deltas.length - 1];

      const type = latestDelta.percentageChange >= 0 ? 'growth' : 'decline';
      const statement = `${metricDisplay} recorded a ${latestDelta.percentageChange >= 0 ? '+' : ''}${latestDelta.percentageChange}% ${type === 'growth' ? 'growth' : 'decline'} in ${latestDelta.period} vs ${latestDelta.previousPeriod}.`;
      const evidence = `Deterministic calculation: Period ${latestDelta.period} (${latestDelta.value.toLocaleString()}) vs ${latestDelta.previousPeriod} (${latestDelta.previousValue.toLocaleString()}) yielding delta of ${latestDelta.delta >= 0 ? '+' : ''}${latestDelta.delta.toLocaleString()} (${latestDelta.percentageChange}%).`;

      findings.push({
        id: `f-period-${Date.now().toString(36)}`,
        statement,
        type,
        nature: 'CALCULATED_FINDING',
        metric: metricDisplay,
        value: latestDelta.value,
        comparisonValue: latestDelta.previousValue,
        percentageChange: latestDelta.percentageChange,
        magnitude: Math.abs(latestDelta.percentageChange),
        evidence,
        confidence: 'high',
        analysisTaskId: 'period_comparison',
        statisticalStrength: 0.95,
        businessRelevance: 0.95,
        actionability: 0.90,
        novelty: 0.85,
        limitations: `Temporal grain is ${timeInfo.grain} across ${timeInfo.totalPeriods} periods.`
      });
    }
  }

  // 2. Categorical Concentration (Pareto / Top-N) Finding (Fact / Calculated Finding)
  if (metricCol && dimCol) {
    const rankRes = executeDataWhizTool('rank', { metric: metricCol, dimension: dimCol, limit: 5 }, context);
    if (rankRes.validationStatus !== 'INVALID' && rankRes.data?.length > 0) {
      const topEntity = rankRes.data[0];
      const statement = `'${topEntity.entity}' is the primary ${dimDisplay.toLowerCase()} driver, contributing ${topEntity.sharePct}% of total ${metricDisplay.toLowerCase()}.`;
      const evidence = `Deterministic aggregation: '${topEntity.entity}' accounts for ${topEntity.value.toLocaleString()} (${topEntity.sharePct}%) of cumulative volume.`;

      findings.push({
        id: `f-conc-${Date.now().toString(36)}`,
        statement,
        type: 'concentration',
        nature: 'FACT',
        metric: metricDisplay,
        dimension: topEntity.entity,
        value: topEntity.value,
        percentageChange: topEntity.sharePct,
        magnitude: topEntity.sharePct,
        evidence,
        confidence: 'high',
        analysisTaskId: 'ranking',
        statisticalStrength: 0.92,
        businessRelevance: 0.94,
        actionability: 0.92,
        novelty: 0.80,
        limitations: `Evaluated across top ${rankRes.data.length} distinct ${dimDisplay} categories.`
      });
    }
  }

  // 3. Supervised Classification / Target Cohort Finding (Observation / Calculated Finding)
  if (primaryTarget && primaryTarget.taskType === 'binary_classification' && dimCol) {
    const classRes = executeDataWhizTool('classification', { target: primaryTarget.column }, context);
    if (classRes.validationStatus !== 'INVALID' && classRes.data?.highRiskCohorts?.length > 0) {
      const topRisk = classRes.data.highRiskCohorts[0];
      const targetDisplay = schemas.find(s => s.technicalName === primaryTarget.column)?.displayName || primaryTarget.column;
      const isUnfavorable = primaryTarget.polarity === 'unfavorable';
      const isFavorable = primaryTarget.polarity === 'favorable';
      const cohortDescriptor = isUnfavorable ? 'High-risk cohort detected' : isFavorable ? 'Top-performing cohort detected' : 'Leading segment cohort detected';

      const statement = `${cohortDescriptor}: '${topRisk.category}' exhibits a ${topRisk.churnRate}% ${targetDisplay.toLowerCase()} rate (${topRisk.riskMultiplier}x dataset baseline).`;
      const evidence = `Supervised cohort analysis on ${N.toLocaleString()} records: '${topRisk.category}' has ${topRisk.churnRate}% incidence rate vs dataset baseline.`;

      findings.push({
        id: `f-risk-${Date.now().toString(36)}`,
        statement,
        type: 'segmentation',
        nature: 'OBSERVATION',
        metric: targetDisplay,
        dimension: topRisk.category,
        value: topRisk.churnRate,
        percentageChange: topRisk.churnRate,
        magnitude: topRisk.riskMultiplier * 10,
        evidence,
        confidence: 'high',
        analysisTaskId: 'classification_churn',
        statisticalStrength: 0.94,
        businessRelevance: 0.96,
        actionability: 0.95,
        novelty: 0.90,
        limitations: 'Calculated using empirical cohort frequency rates.'
      });
    }
  }

  // 4. Anomaly & Outlier Finding (Calculated Finding)
  if (metricCol && rows.length >= 8) {
    const anomRes = executeDataWhizTool('anomaly_detection', { metric: metricCol }, context);
    if (anomRes.validationStatus !== 'INVALID' && anomRes.data?.anomaliesCount > 0) {
      const count = anomRes.data.anomaliesCount;
      const statement = `Detected ${count} statistical outlier incident(s) in ${metricDisplay} exceeding 1.5x IQR threshold.`;
      const evidence = `IQR evaluation on ${N} observations (valid bounds: [${anomRes.data.lowerBound.toFixed(1)}, ${anomRes.data.upperBound.toFixed(1)}]) identified ${count} outlier records.`;

      findings.push({
        id: `f-anom-${Date.now().toString(36)}`,
        statement,
        type: 'anomaly',
        nature: 'CALCULATED_FINDING',
        metric: metricDisplay,
        value: count,
        magnitude: (count / N) * 100,
        evidence,
        confidence: 'high',
        analysisTaskId: 'anomaly_detection',
        statisticalStrength: 0.90,
        businessRelevance: 0.88,
        actionability: 0.86,
        novelty: 0.85,
        limitations: 'Tukey IQR outlier boundary methodology.'
      });
    }
  }

  // 5. Correlation Finding (Calculated Finding / Observation)
  if (context.measures.length >= 2) {
    const mA = context.measures[0].technicalName;
    const mB = context.measures[1].technicalName;
    const corrRes = executeDataWhizTool('correlation', { metricA: mA, metricB: mB }, context);
    if (corrRes.validationStatus !== 'INVALID' && Math.abs(corrRes.data?.coefficient || 0) >= 0.4) {
      const coeff = corrRes.data.coefficient;
      const nameA = context.measures[0].displayName;
      const nameB = context.measures[1].displayName;
      const direction = coeff >= 0 ? 'positive' : 'inverse';
      const statement = `Strong ${direction} correlation (r = ${coeff}) observed between ${nameA} and ${nameB}.`;
      const evidence = `Bivariate Pearson correlation across ${corrRes.data.sampleSize} pairs: r = ${coeff}.`;

      findings.push({
        id: `f-corr-${Date.now().toString(36)}`,
        statement,
        type: 'correlation',
        nature: 'CALCULATED_FINDING',
        metric: `${nameA} ↔ ${nameB}`,
        value: coeff,
        magnitude: Math.abs(coeff) * 100,
        evidence,
        confidence: 'high',
        analysisTaskId: 'correlation_analysis',
        statisticalStrength: 0.92,
        businessRelevance: 0.89,
        actionability: 0.82,
        novelty: 0.85,
        limitations: 'Correlation denotes statistical association, not causal direction.'
      });
    }
  }

  // Rank findings by composite score: businessRelevance * 0.4 + statisticalStrength * 0.3 + actionability * 0.2 + novelty * 0.1
  findings.sort((a, b) => {
    const scoreA = (a.businessRelevance || 0.8) * 0.4 + (a.statisticalStrength || 0.8) * 0.3 + (a.actionability || 0.8) * 0.2 + (a.novelty || 0.8) * 0.1;
    const scoreB = (b.businessRelevance || 0.8) * 0.4 + (b.statisticalStrength || 0.8) * 0.3 + (b.actionability || 0.8) * 0.2 + (b.novelty || 0.8) * 0.1;
    return scoreB - scoreA;
  });

  return findings;
}
