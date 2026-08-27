// Business & Analytical Question Discovery Engine
// Generates, validates, and ranks dataset-grounded analytical questions across 12 analytical categories

import { BusinessQuestion, DatasetContext, DatasetUnderstandingReport, CapabilityType } from '@/lib/types';
import { parseNumberVal } from '@/lib/schema/schemaDetector';

export function discoverBusinessQuestions(
  context: DatasetContext,
  report?: DatasetUnderstandingReport
): BusinessQuestion[] {
  const questions: BusinessQuestion[] = [];
  const primaryMetric = report?.primaryOutcome || context.primaryMetricColumn || (context.measures[0]?.technicalName) || 'Metric';
  const primaryMetricName = context.schema.find(s => s.technicalName === primaryMetric)?.displayName || primaryMetric;
  const timeInfo = report?.timeDimension || context.timeDimensions;
  const rows = context.cleanedRows;
  const caps = context.capabilities;
  const targetCandidates = context.targetCandidates || [];
  const primaryTarget = targetCandidates.find(t => t.usable && t.confidence >= 0.70);
  const dimensions = context.dimensions;
  const primaryDim = context.primaryDimensionColumn ? context.schema.find(s => s.technicalName === context.primaryDimensionColumn) : dimensions[0];
  const primaryDimName = primaryDim?.displayName || 'Segment';

  // 1. PERFORMANCE
  if (primaryMetric && rows.length > 0) {
    const isNumeric = context.schema.find(s => s.technicalName === primaryMetric)?.physicalType === 'number';
    let summary = '';
    if (isNumeric) {
      const totalVal = rows.map(r => parseNumberVal(r[primaryMetric]) || 0).reduce((a, b) => a + b, 0);
      const avgVal = totalVal / Math.max(1, rows.length);
      summary = `Total aggregate is ${totalVal.toLocaleString(undefined, { maximumFractionDigits: 2 })} with average ${avgVal.toLocaleString(undefined, { maximumFractionDigits: 2 })} across ${rows.length.toLocaleString()} records.`;
    } else {
      summary = `Evaluated frequency distribution across ${rows.length.toLocaleString()} records.`;
    }

    questions.push({
      id: 'q-perf-1',
      category: 'PERFORMANCE',
      question: `What is the baseline aggregate and central tendency of ${primaryMetricName}?`,
      whyItMatters: `Establishes core executive benchmark level and scale across all recorded observations.`,
      requiredFields: [primaryMetric],
      analysisType: 'descriptive_stats',
      supportedMetric: primaryMetric,
      answerSummary: summary,
      confidence: 0.98,
      priority: 'HIGH',
      supported: true,
      reason: 'Direct statistical computation available.'
    });
  }

  // 2. TREND
  if (timeInfo && primaryMetric) {
    const supported = caps.trend?.supported ?? (timeInfo.totalPeriods >= 3);
    questions.push({
      id: 'q-trend-1',
      category: 'TREND',
      question: `How has ${primaryMetricName} evolved across the ${timeInfo.totalPeriods} ${timeInfo.grain} periods from ${timeInfo.startDate} to ${timeInfo.endDate}?`,
      whyItMatters: `Detects chronological momentum, growth trajectory, and cyclic patterns over time.`,
      requiredFields: [timeInfo.column, primaryMetric],
      analysisType: 'trend',
      supportedMetric: primaryMetric,
      answerSummary: `Tracked longitudinal trajectory at ${timeInfo.grain} frequency with moving average smoothing.`,
      confidence: supported ? 0.95 : 0.40,
      priority: 'HIGH',
      supported,
      reason: supported ? 'Continuous chronological sequence available.' : 'Insufficient time-series history.'
    });
  }

  // 3. COMPARISON
  if (primaryDim && primaryMetric) {
    const supported = caps.comparison?.supported ?? true;
    questions.push({
      id: 'q-comp-1',
      category: 'COMPARISON',
      question: `How does ${primaryMetricName} vary across different ${primaryDimName} segments?`,
      whyItMatters: `Identifies performance variance, leader segments, and underperforming cohorts.`,
      requiredFields: [primaryDim.technicalName, primaryMetric],
      analysisType: 'comparison',
      supportedMetric: primaryMetric,
      answerSummary: `Cross-segment aggregation isolates highest and lowest yielding ${primaryDimName} groups.`,
      confidence: 0.94,
      priority: 'HIGH',
      supported,
      reason: 'Valid dimension and metric pair present.'
    });
  }

  // 4. DRIVERS
  const explanatoryVars = report?.explanatoryVariables || context.measures.map(m => m.technicalName);
  if (explanatoryVars.length > 0 && primaryMetric) {
    const supported = caps.driver_analysis?.supported ?? (explanatoryVars.length >= 2);
    questions.push({
      id: 'q-drivers-1',
      category: 'DRIVERS',
      question: `Which features and attributes have the strongest statistical association with ${primaryMetricName}?`,
      whyItMatters: `Surfaces high-impact explanatory drivers to inform strategic interventions.`,
      requiredFields: [primaryMetric, ...explanatoryVars.slice(0, 3)],
      analysisType: 'driver_analysis',
      supportedMetric: primaryMetric,
      answerSummary: `Bivariate correlation and feature importance ranking mapped across explanatory attributes.`,
      confidence: supported ? 0.92 : 0.45,
      priority: 'HIGH',
      supported,
      reason: supported ? 'Multiple explanatory features available.' : 'Insufficient predictor attributes.'
    });
  }

  // 5. RELATIONSHIPS & CORRELATIONS
  if (context.measures.length >= 2) {
    const supported = caps.correlation_analysis?.supported ?? true;
    questions.push({
      id: 'q-rel-1',
      category: 'RELATIONSHIPS',
      question: `Are there significant correlations or co-dependencies among the numerical metrics?`,
      whyItMatters: `Prevents collinearity traps and identifies complementary operational levers.`,
      requiredFields: context.measures.slice(0, 4).map(m => m.technicalName),
      analysisType: 'correlation_analysis',
      supportedMetric: primaryMetric,
      answerSummary: `Pairwise Pearson correlation matrix evaluated across continuous attributes.`,
      confidence: 0.90,
      priority: 'MEDIUM',
      supported,
      reason: 'Multiple continuous measures available.'
    });
  }

  // 6. CONTRIBUTION & CONCENTRATION (PARETO)
  if (primaryDim && primaryMetric) {
    const supported = caps.ranking?.supported ?? true;
    questions.push({
      id: 'q-contrib-1',
      category: 'CONTRIBUTION',
      question: `What proportion of ${primaryMetricName} is driven by the top ${primaryDimName} entities?`,
      whyItMatters: `Determines Pareto concentration risk (e.g. 80/20 rule) and structural dependency.`,
      requiredFields: [primaryDim.technicalName, primaryMetric],
      analysisType: 'ranking',
      supportedMetric: primaryMetric,
      answerSummary: `Cumulative share analysis identifies concentration volume across top entities.`,
      confidence: 0.91,
      priority: 'MEDIUM',
      supported,
      reason: 'Dimension and metric ranking available.'
    });
  }

  // 7. SEGMENTATION & COHORT
  if (dimensions.length >= 1 && (context.measures.length >= 1 || primaryTarget)) {
    const supported = caps.cohort?.supported ?? true;
    questions.push({
      id: 'q-seg-1',
      category: 'SEGMENTATION',
      question: `How do distinct cohorts differ in behavior and outcome profile?`,
      whyItMatters: `Enables tailored strategy and risk mitigation per distinct user/entity group.`,
      requiredFields: [dimensions[0].technicalName, primaryMetric],
      analysisType: 'cohort',
      supportedMetric: primaryMetric,
      answerSummary: `Multi-dimensional segmentation partitions records into distinct performance clusters.`,
      confidence: 0.89,
      priority: 'MEDIUM',
      supported,
      reason: 'Categorical dimensions and metric available.'
    });
  }

  // 8. ANOMALY & OUTLIERS
  if (primaryMetric && rows.length >= 8) {
    const supported = caps.anomaly_detection?.supported ?? true;
    questions.push({
      id: 'q-anom-1',
      category: 'ANOMALY',
      question: `Are there statistical anomalies, extreme spikes, or data quality outliers in ${primaryMetricName}?`,
      whyItMatters: `Flags operational incidents, measurement errors, or exceptional high-value events.`,
      requiredFields: [primaryMetric],
      analysisType: 'anomaly_detection',
      supportedMetric: primaryMetric,
      answerSummary: `Interquartile range (IQR > 1.5) and Z-score outlier detection executed.`,
      confidence: 0.92,
      priority: 'HIGH',
      supported,
      reason: 'Sufficient numerical sample for distribution modeling.'
    });
  }

  // 9. RISK & CLASSIFICATION
  if (primaryTarget && primaryTarget.taskType === 'binary_classification') {
    const supported = caps.classification_churn?.supported ?? true;
    const targetName = context.schema.find(s => s.technicalName === primaryTarget.column)?.displayName || primaryTarget.column;
    questions.push({
      id: 'q-risk-1',
      category: 'RISK',
      question: `What characteristics distinguish positive '${targetName}' events from standard records?`,
      whyItMatters: `Enables proactive identification of at-risk or high-probability cases.`,
      requiredFields: [primaryTarget.column, ...explanatoryVars.slice(0, 3)],
      analysisType: 'classification_churn',
      supportedMetric: primaryTarget.column,
      answerSummary: `Supervised classification model separates risk drivers and scores cohort risk.`,
      confidence: supported ? 0.93 : 0.40,
      priority: 'HIGH',
      supported,
      reason: supported ? 'Discrete binary target identified.' : 'No binary target candidate.'
    });
  }

  // 10. FORECAST & PROJECTION
  if (timeInfo && primaryMetric) {
    const supported = caps.time_series_forecasting?.supported ?? false;
    questions.push({
      id: 'q-fc-1',
      category: 'FORECAST',
      question: `What is the expected trajectory of ${primaryMetricName} over the next forward periods?`,
      whyItMatters: `Provides forward-looking planning estimates with empirical confidence intervals.`,
      requiredFields: [timeInfo.column, primaryMetric],
      analysisType: 'time_series_forecasting',
      supportedMetric: primaryMetric,
      answerSummary: supported ? `Exponential smoothing projection generated with 80% confidence interval band.` : `Forecasting unsupported due to insufficient chronological periods.`,
      confidence: supported ? 0.90 : 0.30,
      priority: supported ? 'HIGH' : 'LOW',
      supported,
      reason: supported ? 'Chronological time series verified.' : 'Forecasting requirements not met.'
    });
  }

  // 11. DECISION & PRIORITIZATION
  if (primaryDim && primaryMetric) {
    const supported = caps.product_investment_scoring?.supported ?? true;
    questions.push({
      id: 'q-dec-1',
      category: 'DECISION',
      question: `Which ${primaryDimName} entities represent top strategic priorities versus divestment candidates?`,
      whyItMatters: `Guides resource allocation toward high-growth, high-margin, stable entities.`,
      requiredFields: [primaryDim.technicalName, primaryMetric],
      analysisType: 'product_investment_scoring',
      supportedMetric: primaryMetric,
      answerSummary: `Multi-criteria ranking matrix evaluates growth, margin, trend, and stability.`,
      confidence: 0.88,
      priority: 'MEDIUM',
      supported,
      reason: 'Entity dimension and performance metrics available.'
    });
  }

  return questions;
}
