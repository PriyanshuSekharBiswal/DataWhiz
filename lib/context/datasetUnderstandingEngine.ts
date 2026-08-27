// Authoritative Dataset Understanding Engine: Domain-agnostic 14-question evaluation

import {
  DatasetContext,
  DatasetUnderstandingReport,
  DatasetArchetype,
  ColumnSchema,
  TimeDimensionInfo
} from '@/lib/types';
import { analyzeTemporalColumn, DetailedTimeAnalysis } from './timeIntelligence';

export function analyzeTimeGrain(
  dateColumn: string,
  rows: Record<string, any>[]
): {
  grain: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly' | 'mixed';
  startDate: string;
  endDate: string;
  totalPeriods: number;
  gapsDetected: string[];
} {
  const result = analyzeTemporalColumn(dateColumn, rows);
  let grain: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly' | 'mixed' = 'daily';

  if (result.grain === 'intraday' || result.grain === 'daily') grain = 'daily';
  else if (result.grain === 'weekly' || result.grain === 'biweekly') grain = 'weekly';
  else if (result.grain === 'monthly') grain = 'monthly';
  else if (result.grain === 'quarterly') grain = 'quarterly';
  else if (result.grain === 'yearly') grain = 'yearly';
  else grain = 'mixed';

  return {
    grain,
    startDate: result.startDate,
    endDate: result.endDate,
    totalPeriods: result.totalPeriods,
    gapsDetected: result.gapsDetected
  };
}

export function buildDatasetUnderstandingReport(context: DatasetContext): DatasetUnderstandingReport {
  const schemas = context.schema;
  const profiles = context.profiles;
  const rows = context.cleanedRows;
  const numRows = rows.length;

  const targetCandidates = context.targetCandidates || [];
  const primaryTarget = targetCandidates.find(t => t.usable && t.confidence >= 0.70);

  // 1. Structural Trait Discovery & Archetype Classification (Not hardcoded to sales)
  const mediaTokensRegex = /_imp|_clk|_grp|_vol|dtv_|aud_|ctv_|olv_|srh_|soc_|dis_|ooh_|oem_|eml_|ntv_|dmt_/i;
  const mediaColumns = schemas.filter(s => mediaTokensRegex.test(s.technicalName));
  const isMarketingMmm = mediaColumns.length >= 4;

  const isChurnArchetype = Boolean(primaryTarget && primaryTarget.taskType === 'binary_classification' && /churn|retention|subscriber|cancel/i.test(primaryTarget.column));

  const mfgFeatures = schemas.filter(s => /defect|yield|machine|cycle_time|sensor|temperature|vibration|pressure/i.test(s.technicalName));
  const isManufacturing = mfgFeatures.length >= 2 || schemas.some(s => /defect_rate|scrap_rate|oee/i.test(s.technicalName));

  const isFinancialTimeSeries = Boolean(
    context.timeDimensions &&
    context.timeDimensions.totalPeriods >= 10 &&
    schemas.some(s => /price|open|high|low|close|volume|adj_close|nav|interest_rate|stock/i.test(s.technicalName))
  );

  const isCommercialRelational = Boolean(
    (context.tables && context.tables.length >= 2) ||
    (schemas.some(s => s.logicalType === 'measure_currency' || /revenue|margin|cost|price/i.test(s.technicalName)) &&
     schemas.some(s => /product|store|customer|region|order|item/i.test(s.technicalName)))
  );

  let archetype: DatasetArchetype = 'general_tabular';
  let archetypeConfidence = 0.75;
  let primaryDomain = context.domain.primaryDomain || 'General Business & Operations';

  if (isMarketingMmm) {
    archetype = 'marketing_media_mix';
    archetypeConfidence = 0.95;
    primaryDomain = 'Marketing Mix & Media Attribution';
  } else if (isChurnArchetype) {
    archetype = 'customer_churn';
    archetypeConfidence = 0.96;
    primaryDomain = 'Customer Retention & Churn Analytics';
  } else if (isManufacturing) {
    archetype = 'manufacturing_quality';
    archetypeConfidence = 0.92;
    primaryDomain = 'Industrial Manufacturing & Quality Engineering';
  } else if (isFinancialTimeSeries) {
    archetype = 'financial_time_series';
    archetypeConfidence = 0.94;
    primaryDomain = 'Financial & Time-Series Asset Analytics';
  } else if (isCommercialRelational) {
    archetype = 'commercial_relational';
    archetypeConfidence = 0.93;
    primaryDomain = 'Commercial Sales & Operations';
  }

  // 2. Identify Authoritative Outcome & Explanatory Variables
  let primaryOutcome = '';
  const secondaryOutcomes: string[] = [];
  const explanatoryVariables: string[] = [];

  if (primaryTarget) {
    primaryOutcome = primaryTarget.column;
    const predictors = schemas.filter(s => s.technicalName !== primaryOutcome && s.logicalType !== 'identifier' && !s.isPrimaryKeyCandidate);
    explanatoryVariables.push(...predictors.map(s => s.technicalName));
  } else {
    primaryOutcome = context.primaryMetricColumn || (context.measures[0]?.technicalName) || '';
    if (context.measures.length > 1) {
      secondaryOutcomes.push(...context.measures.slice(1, 4).map(m => m.technicalName));
    }
    const otherMeasures = context.measures.filter(m => m.technicalName !== primaryOutcome).map(m => m.technicalName);
    const dims = context.dimensions.map(d => d.technicalName);
    explanatoryVariables.push(...otherMeasures, ...dims);
  }

  // 3. Time Dimension Assessment
  const timeInfo = context.timeDimensions;

  // 4. Entity Identification based on dataset structure
  let primaryEntity = 'Record';
  const idCol = schemas.find(s => s.logicalType === 'identifier' || s.isPrimaryKeyCandidate);
  if (idCol) {
    primaryEntity = idCol.displayName.replace(/ Identifier| ID| Key/gi, '') || 'Entity Record';
  } else if (archetype === 'marketing_media_mix') {
    primaryEntity = timeInfo ? `Weekly Campaign Cohort (${timeInfo.grain})` : 'Marketing Channel Attribution';
  } else if (archetype === 'customer_churn') {
    primaryEntity = 'Customer Subscriber Account';
  } else if (archetype === 'manufacturing_quality') {
    primaryEntity = 'Machine Production Batch / Sensor Cycle';
  } else if (archetype === 'financial_time_series') {
    primaryEntity = 'Financial Trading Period';
  } else if (archetype === 'commercial_relational') {
    primaryEntity = 'Transaction / Commercial Order';
  }

  // 5. Key Dimensions & Measures
  const keyDimensions = context.dimensions.map(d => d.displayName);
  const keyMeasures = context.measures.map(m => m.displayName);

  // 6. Trustworthy Insights
  const trustworthyInsights: string[] = [
    `Verified data structure with ${numRows.toLocaleString()} rows across ${schemas.length} recognized attributes.`,
    timeInfo && timeInfo.startDate ? `Longitudinal index (${timeInfo.grain.toUpperCase()}) spanning ${timeInfo.startDate} to ${timeInfo.endDate} (${timeInfo.totalPeriods} chronological periods).` : 'Cross-sectional tabular profile without longitudinal time indexing.',
    primaryOutcome ? `Primary outcome established as '${context.humanFriendlyNames[primaryOutcome] || primaryOutcome}'.` : 'Multi-dimensional exploratory profile.'
  ];

  // 7. Uncertainties & Risks
  const uncertaintiesAndRisks: string[] = [];
  const uncertainCols = schemas.filter(s => s.interpretationUncertain || s.requiresReview);
  if (uncertainCols.length > 0) {
    uncertaintiesAndRisks.push(`${uncertainCols.length} column(s) have low semantic confidence: [${uncertainCols.slice(0, 3).map(c => c.technicalName).join(', ')}].`);
  }
  if (timeInfo && timeInfo.gapsDetected.length > 0) {
    uncertaintiesAndRisks.push(`Temporal discontinuities detected: ${timeInfo.gapsDetected.slice(0, 2).join('; ')}.`);
  }
  if (!idCol && archetype === 'commercial_relational') {
    uncertaintiesAndRisks.push('Order-level identifiers are absent; transaction-level basket analytics (e.g. AOV) cannot be calculated.');
  }

  // 8. Recommended Analytical Strategy & Unsupported Analyses
  let recommendedStrategy = '';
  const unsupportedAnalyses: { analysis: string; reason: string }[] = [];

  if (archetype === 'marketing_media_mix') {
    recommendedStrategy = `Marketing Attribution & Response Analysis: Evaluate the statistical relationship between '${primaryOutcome}' and advertising channels.`;
    unsupportedAnalyses.push({ analysis: 'Receipt-Level Basket Size (AOV)', reason: 'Data represents periodic aggregated campaign volume rather than individual checkout receipts.' });
  } else if (archetype === 'customer_churn') {
    recommendedStrategy = `Supervised Classification & Churn Driver Analysis: Feature importance ranking, high-risk cohort scoring, and segment survival breakdown for target '${primaryOutcome}'.`;
    if (!timeInfo || timeInfo.totalPeriods < 6) {
      unsupportedAnalyses.push({ analysis: 'Time-Series Forecasting', reason: 'Cross-sectional subscriber snapshot lacks longitudinal time-series timestamps.' });
    }
  } else if (archetype === 'manufacturing_quality') {
    recommendedStrategy = `Process Quality & Defect Root-Cause Analysis: Distribution analysis, cycle time profiling, and machine anomaly detection.`;
  } else if (archetype === 'financial_time_series') {
    recommendedStrategy = `Longitudinal Asset Performance & Volatility Modeling: Trend decomposition, rolling metrics, and sequential forecasting.`;
  } else if (archetype === 'commercial_relational') {
    recommendedStrategy = `Multi-Dimensional Commercial Breakdown: Profitability, volume, and entity Pareto ranking across dimensions.`;
  } else {
    recommendedStrategy = `Exploratory Data Analysis (EDA): Distribution profiling, multi-segment comparison, and correlation analysis.`;
  }

  // Check temporal forecasting support
  if (!timeInfo || timeInfo.totalPeriods < 6 || !timeInfo.startDate) {
    if (!unsupportedAnalyses.some(u => u.analysis.includes('Forecasting'))) {
      unsupportedAnalyses.push({ analysis: 'Time-Series Forecasting', reason: 'Insufficient chronological history (requires at least 6 periods with known time grain).' });
    }
  }

  // Check classification support
  if (!primaryTarget || primaryTarget.taskType === 'none' || primaryTarget.usable === false) {
    unsupportedAnalyses.push({ analysis: 'Supervised Target Classification', reason: 'No valid binary or multi-class outcome target identified.' });
  }

  // 9. High Priority Business & Analytical Questions
  const highPriorityQuestions: string[] = [];
  if (primaryOutcome) {
    const outcomeName = context.humanFriendlyNames[primaryOutcome] || primaryOutcome;
    highPriorityQuestions.push(`What is the overall performance and distribution of '${outcomeName}'?`);
    if (keyDimensions.length > 0) {
      highPriorityQuestions.push(`How does '${outcomeName}' vary across top '${keyDimensions[0]}'?`);
    }
    if (timeInfo && timeInfo.totalPeriods >= 6) {
      highPriorityQuestions.push(`What is the historical trend trajectory and seasonality of '${outcomeName}'?`);
    }
    if (primaryTarget && primaryTarget.taskType === 'binary_classification') {
      highPriorityQuestions.push(`Which factors are most strongly associated with '${context.humanFriendlyNames[primaryTarget.column] || primaryTarget.column}'?`);
    }
  }

  const datasetSummary = `This dataset represents a ${archetype.replace(/_/g, ' ').toUpperCase()} dataset within the ${primaryDomain} domain, containing ${numRows.toLocaleString()} rows across ${schemas.length} recognized attributes.`;

  return {
    datasetSummary,
    archetype,
    archetypeConfidence,
    primaryDomain,
    primaryOutcome,
    secondaryOutcomes,
    explanatoryVariables,
    primaryEntity,
    timeDimension: timeInfo,
    keyDimensions,
    keyMeasures,
    trustworthyInsights,
    uncertaintiesAndRisks,
    recommendedAnalyticalStrategy: recommendedStrategy,
    unsupportedAnalyses,
    highPriorityQuestions
  };
}
