// Capability Detection Engine: Evidence-Driven Analytical Feasibility Evaluation

import { CapabilityMap, CapabilityInfo, ColumnSchema, ColumnProfile } from '@/lib/types';
import { analyzeTemporalColumn } from '@/lib/context/timeIntelligence';

const EXCLUDE_METRICS_REGEX = /^(year|yyyy|yr|month|mon|mm|day|dd|quarter|qtr|q[1-4]|hour|minute|sec|postal|zip|pin|code|id|key|phone|ssn)$/i;

function makeCapability(
  name: string,
  supported: boolean,
  confidence: number,
  reason: string,
  requirements: string[],
  available_inputs: string[],
  missing_inputs: string[],
  warnings: string[] = []
): CapabilityInfo {
  return {
    name,
    supported,
    confidence: Math.round(confidence * 100) / 100,
    reason,
    requirements,
    available_inputs,
    missing_inputs,
    warnings,
    requiredColumns: available_inputs.length > 0 ? available_inputs : requirements,
    missingPrerequisites: missing_inputs
  };
}

export function detectCapabilities(
  schemas: ColumnSchema[],
  profiles: ColumnProfile[],
  rowCount: number,
  rawRows: Record<string, any>[] = []
): CapabilityMap {
  // Measures with non-zero variance and non-identifier semantic roles
  const numericCols = schemas.filter(s => {
    if (EXCLUDE_METRICS_REGEX.test(s.technicalName)) return false;
    if (s.logicalType === 'identifier' || s.isPrimaryKeyCandidate) return false;
    return s.physicalType === 'number' || s.logicalType.startsWith('measure');
  });

  const dateCols = schemas.filter(s =>
    (s.physicalType === 'date' || s.logicalType === 'date' || s.logicalType === 'datetime' || s.semanticRole === 'timestamp' || s.semanticRole === 'date') &&
    s.logicalType !== 'identifier'
  );

  const catCols = schemas.filter(s =>
    (s.logicalType.startsWith('dimension') || s.physicalType === 'string' || s.physicalType === 'boolean') &&
    s.logicalType !== 'identifier' && !s.isPrimaryKeyCandidate
  );

  const geoCols = schemas.filter(s =>
    s.logicalType === 'dimension_geo' ||
    /region|city|state|country|territory|zone|market|plant|location/i.test(s.technicalName)
  );

  const entityCols = schemas.filter(s =>
    s.semanticRole === 'entity' ||
    s.semanticRole === 'product_attribute' ||
    s.semanticRole === 'customer_attribute' ||
    /product|item|sku|customer|account|channel|category|store|machine|device|vehicle/i.test(s.technicalName)
  );

  // Supervised Target Column (e.g. churn, delivered_status, defect)
  const targetCol = schemas.find(s => {
    const p = profiles.find(pr => pr.technicalName === s.technicalName);
    const isLowCard = p ? p.uniqueCount >= 2 && p.uniqueCount <= 8 : true;
    return (s.semanticRole === 'target_candidate' || s.semanticRole === 'target_variable' || s.logicalType.startsWith('target') || /churn|delivered|defect|fraud|target|outcome|status/i.test(s.technicalName)) && isLowCard;
  });

  // Check temporal properties with Time Intelligence
  let hasValidTimeSeries = false;
  let timeGrain = 'unknown';
  let distinctDateCount = 0;

  if (dateCols.length > 0 && rawRows.length > 0) {
    const timeAnalysis = analyzeTemporalColumn(dateCols[0].technicalName, rawRows);
    hasValidTimeSeries = timeAnalysis.isTemporal && timeAnalysis.totalPeriods >= 6 && timeAnalysis.grain !== 'unknown';
    timeGrain = timeAnalysis.grain;
    distinctDateCount = timeAnalysis.totalPeriods;
  } else if (dateCols.length > 0) {
    const p = profiles.find(pr => pr.technicalName === dateCols[0].technicalName)?.date;
    distinctDateCount = p?.distinctDates ?? Math.min(rowCount, 10);
    hasValidTimeSeries = distinctDateCount >= 6 && rowCount >= 6;
  }

  // Varying numeric columns
  const varyingNumericCols = numericCols.filter(n => {
    const p = profiles.find(pr => pr.technicalName === n.technicalName)?.numeric;
    return (p?.std ?? 0) > 0;
  });

  // 1. EDA
  const edaSupported = rowCount > 0 && schemas.length > 0;
  const eda = makeCapability(
    'eda',
    edaSupported,
    1.0,
    `Exploratory data analysis available across all ${schemas.length} attributes and ${rowCount.toLocaleString()} records.`,
    ['At least 1 row and 1 column of data'],
    schemas.map(s => s.displayName),
    []
  );

  // 2. Descriptive Statistics
  const descStatsSupported = varyingNumericCols.length > 0;
  const descriptive_stats = makeCapability(
    'descriptive_stats',
    descStatsSupported,
    descStatsSupported ? 0.98 : 0.0,
    descStatsSupported
      ? `Distribution moments, central tendency, dispersion, and IQR metrics verified across ${varyingNumericCols.length} numerical fields.`
      : 'Requires at least one numeric measure with variance > 0.',
    ['At least 1 numeric measure with variance > 0'],
    varyingNumericCols.map(s => s.displayName),
    varyingNumericCols.length === 0 ? ['Numeric measurement column with non-zero variance'] : []
  );

  // 3. Distribution Analysis
  const distSupported = varyingNumericCols.length > 0 || catCols.length > 0;
  const distribution = makeCapability(
    'distribution',
    distSupported,
    distSupported ? 0.96 : 0.0,
    distSupported ? `Histogram frequency bins and categorical frequency distributions available.` : 'Requires data attributes.',
    ['At least 1 attribute'],
    [...varyingNumericCols, ...catCols].map(s => s.displayName),
    []
  );

  // 4. Comparison Analysis
  const compSupported = varyingNumericCols.length >= 1 && catCols.length >= 1;
  const comparison = makeCapability(
    'comparison',
    compSupported,
    compSupported ? 0.95 : 0.0,
    compSupported ? `Cross-segment metric aggregation and delta comparisons supported across ${catCols.length} dimensions.` : 'Requires at least 1 metric and 1 categorical dimension.',
    ['1 numeric measure', '1 categorical dimension'],
    [...(varyingNumericCols[0] ? [varyingNumericCols[0].displayName] : []), ...(catCols[0] ? [catCols[0].displayName] : [])],
    !compSupported ? ['A continuous measure and a categorical dimension'] : []
  );

  // 5. Trend Analysis
  const trendSupported = dateCols.length > 0 && varyingNumericCols.length > 0 && distinctDateCount >= 3;
  const trend = makeCapability(
    'trend',
    trendSupported,
    trendSupported ? 0.95 : 0.0,
    trendSupported ? `Longitudinal chronological trajectory and moving average smoothing supported.` : 'Requires a date column and a numeric measure across multiple dates.',
    ['1 date/time column', '1 numeric measure', 'Minimum 3 chronological points'],
    [...(dateCols[0] ? [dateCols[0].displayName] : []), ...(varyingNumericCols[0] ? [varyingNumericCols[0].displayName] : [])],
    !trendSupported ? ['Date column with at least 3 distinct time periods'] : []
  );

  // 6. Period Comparison (YoY / MoM / WoW)
  const periodCompSupported = dateCols.length > 0 && varyingNumericCols.length > 0 && distinctDateCount >= 6;
  const period_comparison = makeCapability(
    'period_comparison',
    periodCompSupported,
    periodCompSupported ? 0.92 : 0.0,
    periodCompSupported ? `Sequential period-over-period and rate-of-change analysis supported.` : 'Requires chronological history spanning multiple periods.',
    ['1 date column with multiple periods', '1 numeric measure'],
    [...(dateCols[0] ? [dateCols[0].displayName] : []), ...(varyingNumericCols[0] ? [varyingNumericCols[0].displayName] : [])],
    !periodCompSupported ? ['Sufficient chronological time periods for delta comparison'] : []
  );

  // 7. Correlation Analysis
  const corrSupported = varyingNumericCols.length >= 2 && rowCount >= 4;
  const correlation_analysis = makeCapability(
    'correlation_analysis',
    corrSupported,
    corrSupported ? 0.95 : 0.0,
    corrSupported ? `Bivariate Pearson correlation matrices available across ${varyingNumericCols.length} continuous metrics.` : 'Requires at least 2 numeric measures with non-zero variance.',
    ['At least 2 numeric measures', 'Minimum 4 observations'],
    varyingNumericCols.map(s => s.displayName),
    varyingNumericCols.length < 2 ? ['At least two numeric feature columns with non-zero variance'] : []
  );

  // 8. Lag Analysis
  const lagSupported = dateCols.length > 0 && varyingNumericCols.length >= 2 && distinctDateCount >= 8;
  const lag_analysis = makeCapability(
    'lag_analysis',
    lagSupported,
    lagSupported ? 0.88 : 0.0,
    lagSupported ? `Cross-correlation lag structures (t-1, t-2, t-3) supported.` : 'Requires sequential time-series with multiple measures and >= 8 periods.',
    ['1 date column with >= 8 periods', '2 or more numeric measures'],
    [...(dateCols[0] ? [dateCols[0].displayName] : []), ...varyingNumericCols.slice(0, 2).map(s => s.displayName)],
    !lagSupported ? ['Longitudinal sequence with at least 8 periods and 2 metrics'] : []
  );

  // 9. Time Series Forecasting
  const time_series_forecasting = makeCapability(
    'time_series_forecasting',
    hasValidTimeSeries && varyingNumericCols.length > 0,
    hasValidTimeSeries ? 0.92 : 0.0,
    hasValidTimeSeries
      ? `Autoregressive exponential smoothing projections available across ${distinctDateCount} periods (${timeGrain}).`
      : `Forecasting unsupported: requires a valid date column, numeric measure with variance, and >= 6 distinct chronological periods.`,
    ['Validated timestamp/date column', 'Continuous numeric measure with variance > 0', '>= 6 distinct time periods', '>= 6 rows'],
    [...(dateCols[0] ? [dateCols[0].displayName] : []), ...(varyingNumericCols[0] ? [varyingNumericCols[0].displayName] : [])],
    !hasValidTimeSeries ? ['Timestamp column with at least 6 distinct chronological periods'] : []
  );

  // 10. Trend Decomposition
  const decompSupported = dateCols.length > 0 && varyingNumericCols.length > 0 && distinctDateCount >= 12;
  const trend_decomposition = makeCapability(
    'trend_decomposition',
    decompSupported,
    decompSupported ? 0.85 : 0.0,
    decompSupported ? `Additive/multiplicative trend-cycle and seasonal decomposition supported.` : 'Requires >= 12 chronological periods for seasonal separation.',
    ['Date column with >= 12 periods', 'Numeric metric with variance'],
    [...(dateCols[0] ? [dateCols[0].displayName] : []), ...(varyingNumericCols[0] ? [varyingNumericCols[0].displayName] : [])],
    !decompSupported ? ['At least 12 distinct time periods for seasonal isolation'] : []
  );

  // 11. Regression Modeling
  const regSupported = varyingNumericCols.length >= 2 && rowCount >= 4;
  const regression_modeling = makeCapability(
    'regression_modeling',
    regSupported,
    regSupported ? 0.90 : 0.0,
    regSupported ? `Multivariate linear and ridge regression modeling supported across ${varyingNumericCols.length} features.` : 'Requires continuous target and >= 1 numeric predictor with >= 4 rows.',
    ['1 continuous target measure', '>= 1 continuous predictor', '>= 4 observations'],
    varyingNumericCols.map(s => s.displayName),
    !regSupported ? ['At least two continuous numeric variables and sufficient sample size'] : []
  );

  // 12. Classification / Supervised Target Prediction
  const classSupported = Boolean(targetCol && (varyingNumericCols.length >= 1 || catCols.length >= 1) && rowCount >= 4);
  const classification_churn = makeCapability(
    'classification_churn',
    classSupported,
    classSupported ? 0.92 : 0.0,
    classSupported ? `Supervised classification modeling and risk scoring available for '${targetCol?.displayName}'.` : 'Requires a discrete target column (e.g. churn, defect, status) and feature predictors.',
    ['Discrete binary/multi-class target column', 'Feature predictors', '>= 4 observations'],
    [...(targetCol ? [targetCol.displayName] : []), ...varyingNumericCols.slice(0, 3).map(s => s.displayName)],
    !classSupported ? ['Discrete target column and usable predictor attributes'] : []
  );

  // 13. Clustering & Segmentation
  const clusterSupported = (varyingNumericCols.length >= 2 || catCols.length >= 2) && rowCount >= 10;
  const clustering_segmentation = makeCapability(
    'clustering_segmentation',
    clusterSupported,
    clusterSupported ? 0.88 : 0.0,
    clusterSupported ? `K-Means and hierarchical multi-dimensional cohort clustering supported across ${varyingNumericCols.length} features.` : 'Requires >= 2 feature columns and >= 10 observations.',
    ['>= 2 numeric/categorical features', '>= 10 observations'],
    varyingNumericCols.map(s => s.displayName),
    !clusterSupported ? ['At least two features and 10+ records'] : []
  );

  // 14. Anomaly Detection
  const anomalySupported = (varyingNumericCols.length > 0 || dateCols.length > 0) && rowCount >= 8;
  const anomaly_detection = makeCapability(
    'anomaly_detection',
    anomalySupported,
    anomalySupported ? 0.91 : 0.0,
    anomalySupported ? `Interquartile range (IQR) outlier detection active.` : 'Requires numeric measure with >= 8 observations.',
    ['1 numeric measure', '>= 8 observations'],
    varyingNumericCols.map(s => s.displayName),
    !anomalySupported ? ['Numeric column with sufficient row sample'] : []
  );

  // 15. Cohort Analysis
  const cohortSupported = catCols.length >= 1 && (varyingNumericCols.length >= 1 || targetCol !== undefined);
  const cohort = makeCapability(
    'cohort',
    cohortSupported,
    cohortSupported ? 0.90 : 0.0,
    cohortSupported ? `Cohort performance comparison and categorical segmentation supported.` : 'Requires categorical dimension and numeric measure/target.',
    ['1 categorical dimension', '1 numeric measure or target'],
    catCols.map(s => s.displayName),
    !cohortSupported ? ['Categorical cohort dimension'] : []
  );

  // 16. Ranking & Top-N Analysis
  const rankingSupported = catCols.length >= 1 && varyingNumericCols.length >= 1;
  const ranking = makeCapability(
    'ranking',
    rankingSupported,
    rankingSupported ? 0.95 : 0.0,
    rankingSupported ? `Top-N and Pareto distribution ranking supported.` : 'Requires categorical dimension and metric.',
    ['1 categorical dimension', '1 numeric measure'],
    [...(catCols[0] ? [catCols[0].displayName] : []), ...(varyingNumericCols[0] ? [varyingNumericCols[0].displayName] : [])],
    !rankingSupported ? ['Dimension and metric pair'] : []
  );

  // 17. Driver Analysis
  const driverSupported = (targetCol !== undefined || varyingNumericCols.length >= 2) && rowCount >= 10;
  const driver_analysis = makeCapability(
    'driver_analysis',
    driverSupported,
    driverSupported ? 0.90 : 0.0,
    driverSupported ? `Key driver analysis and feature importance attribution supported.` : 'Requires outcome target/metric and multiple predictors.',
    ['1 outcome target/metric', 'Multiple predictors', '>= 10 observations'],
    varyingNumericCols.map(s => s.displayName),
    !driverSupported ? ['Target outcome and multiple predictor features'] : []
  );

  // 18. Statistical Testing (T-test / ANOVA / Chi-Square)
  const statTestSupported = (varyingNumericCols.length >= 1 && catCols.length >= 1) && rowCount >= 10;
  const statistical_testing = makeCapability(
    'statistical_testing',
    statTestSupported,
    statTestSupported ? 0.90 : 0.0,
    statTestSupported ? `Two-sample t-testing, ANOVA, and Chi-Square independence testing supported.` : 'Requires numerical metric across discrete categorical groups.',
    ['1 numeric measure', '1 discrete dimension', '>= 10 observations'],
    [...(varyingNumericCols[0] ? [varyingNumericCols[0].displayName] : []), ...(catCols[0] ? [catCols[0].displayName] : [])],
    !statTestSupported ? ['Measure and dimension pair with >= 10 rows'] : []
  );

  // 19. Geographic Breakdown
  const geoSupported = geoCols.length > 0 && varyingNumericCols.length > 0;
  const geographic_breakdown = makeCapability(
    'geographic_breakdown',
    geoSupported,
    geoSupported ? 0.92 : 0.0,
    geoSupported ? `Regional cross-tabulation and country market distribution supported.` : 'Requires geographic location column and numeric metric.',
    ['Geographic dimension (e.g. Country, Region, State, City)', 'Numeric metric'],
    geoCols.map(s => s.displayName),
    !geoSupported ? ['Geographic location dimension'] : []
  );

  // 20. Entity / Investment Prioritization Scoring
  const entityScoringSupported = entityCols.length > 0 && varyingNumericCols.length > 0;
  const product_investment_scoring = makeCapability(
    'product_investment_scoring',
    entityScoringSupported,
    entityScoringSupported ? 0.88 : 0.0,
    entityScoringSupported ? `Multi-criteria strategic entity scoring active across ${entityCols.length} dimensions.` : 'Requires entity dimension and performance metrics.',
    ['Entity dimension', 'Performance metric'],
    entityCols.map(s => s.displayName),
    !entityScoringSupported ? ['Entity dimension and metric'] : []
  );

  return {
    eda,
    descriptive_stats,
    distribution,
    comparison,
    trend,
    period_comparison,
    correlation_analysis,
    lag_analysis,
    time_series_forecasting,
    trend_decomposition,
    regression_modeling,
    classification_churn,
    clustering_segmentation,
    anomaly_detection,
    cohort,
    ranking,
    driver_analysis,
    statistical_testing,
    geographic_breakdown,
    product_investment_scoring
  };
}
