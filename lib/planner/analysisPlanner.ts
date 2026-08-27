// Analysis Planner Engine: Generates, validates, and ranks executable analytical tasks based on dataset context, capabilities, and intent

import {
  DatasetContext,
  CapabilityMap,
  UserIntent,
  CapabilityType,
  AnalysisTask,
  AnalysisPlan,
  BusinessQuestion
} from '@/lib/types';

export function planAnalysis(
  context: DatasetContext,
  capabilities: CapabilityMap,
  intent: UserIntent
): AnalysisPlan {
  const tasks: AnalysisTask[] = [];
  const skippedTasks: { category: CapabilityType; reason: string }[] = [];

  const questions: BusinessQuestion[] = context.businessQuestions || [];
  const schemas = context.schema;
  const timeInfo = context.timeDimensions;
  const targetCandidates = context.targetCandidates || [];
  const primaryTarget = targetCandidates.find(t => t.usable && t.confidence >= 0.70);
  const primaryMetric = context.primaryMetricColumn || (context.measures[0]?.technicalName);
  const primaryDim = context.primaryDimensionColumn || (context.dimensions[0]?.technicalName);

  // 1. Map Questions & Capabilities to Executable Analysis Tasks
  const capabilityToToolsMap: Record<CapabilityType, string[]> = {
    eda: ['resolve_semantic_column', 'descriptive_statistics'],
    descriptive_stats: ['descriptive_statistics', 'distribution'],
    distribution: ['distribution', 'aggregate'],
    comparison: ['group', 'aggregate', 'compare'],
    trend: ['group', 'aggregate', 'period_compare'],
    period_comparison: ['period_compare', 'growth'],
    correlation_analysis: ['correlation', 'feature_importance'],
    lag_analysis: ['lag_correlation'],
    time_series_forecasting: ['forecast'],
    trend_decomposition: ['aggregate', 'period_compare'],
    regression_modeling: ['regression', 'feature_importance'],
    classification_churn: ['classification', 'feature_importance'],
    clustering_segmentation: ['clustering'],
    anomaly_detection: ['anomaly_detection'],
    cohort: ['group', 'cross_tab'],
    ranking: ['rank', 'aggregate'],
    driver_analysis: ['feature_importance', 'correlation'],
    statistical_testing: ['statistical_test'],
    geographic_breakdown: ['group', 'aggregate', 'rank'],
    product_investment_scoring: ['rank', 'compare']
  };

  const candidateCategories: CapabilityType[] = [
    'descriptive_stats',
    'distribution',
    'comparison',
    'trend',
    'period_comparison',
    'correlation_analysis',
    'ranking',
    'anomaly_detection',
    'driver_analysis',
    'cohort',
    'product_investment_scoring',
    'geographic_breakdown',
    'classification_churn',
    'time_series_forecasting',
    'regression_modeling',
    'clustering_segmentation'
  ];

  for (const cat of candidateCategories) {
    const cap = capabilities[cat];
    const relatedQuestion = questions.find(q => q.analysisType === cat);

    if (!cap || !cap.supported) {
      skippedTasks.push({
        category: cat,
        reason: cap ? cap.reason : 'Capability not supported by dataset schema.'
      });
      continue;
    }

    // Determine task attributes
    let title = '';
    let questionText = relatedQuestion?.question || '';
    let purpose = '';
    let measures: string[] = [];
    let dimensions: string[] = [];
    let target: string | undefined = undefined;
    let timeField: string | undefined = undefined;
    let timeGrain: string | undefined = undefined;
    const measureSchema = schemas.find(s => s.technicalName === primaryMetric);
    let aggregation: 'sum' | 'avg' | 'count' | 'min' | 'max' = 'sum';
    if (measureSchema?.aggregationBehavior === 'average_like' || measureSchema?.aggregationBehavior === 'percentage' || measureSchema?.aggregationBehavior === 'ratio') {
      aggregation = 'avg';
    } else if (measureSchema?.aggregationBehavior === 'non_additive') {
      aggregation = 'count';
    }

    switch (cat) {
      case 'descriptive_stats':
        title = 'Descriptive Statistics & Baseline Metric Distributions';
        purpose = 'Establish mathematical distribution, spread, mean, median, and IQR benchmarks.';
        measures = context.measures.map(m => m.technicalName);
        break;

      case 'distribution':
        title = 'Frequency Bins & Outlier Profile';
        purpose = 'Analyze frequency histogram shapes and detect positive/negative skewness.';
        measures = primaryMetric ? [primaryMetric] : [];
        break;

      case 'comparison':
        title = `Cross-Segment Metric Comparison by ${primaryDim ? context.humanFriendlyNames[primaryDim] : 'Dimension'}`;
        purpose = 'Evaluate performance deltas across major operational categories.';
        measures = primaryMetric ? [primaryMetric] : [];
        dimensions = primaryDim ? [primaryDim] : [];
        break;

      case 'trend':
        title = `Longitudinal Trajectory & Moving Average Smoothing`;
        purpose = 'Track chronological trajectory and isolate moving average momentum.';
        measures = primaryMetric ? [primaryMetric] : [];
        timeField = timeInfo?.column;
        timeGrain = timeInfo?.grain;
        break;

      case 'period_comparison':
        title = 'Sequential Period-over-Period & Rate-of-Change Analysis';
        purpose = 'Compute delta variations and growth momentum across chronological periods.';
        measures = primaryMetric ? [primaryMetric] : [];
        timeField = timeInfo?.column;
        timeGrain = timeInfo?.grain;
        break;

      case 'correlation_analysis':
        title = 'Bivariate Correlation Matrix & Co-movement Structure';
        purpose = 'Map Pearson cross-correlation to detect synergy, collinearity, and inverse drivers.';
        measures = context.measures.slice(0, 5).map(m => m.technicalName);
        break;

      case 'ranking':
        title = `Top-N Pareto Concentration Breakdown`;
        purpose = 'Identify top 20% entities driving 80% of aggregate outcome volume.';
        measures = primaryMetric ? [primaryMetric] : [];
        dimensions = primaryDim ? [primaryDim] : [];
        break;

      case 'anomaly_detection':
        title = 'Statistical Outlier & Incident Detection';
        purpose = 'Detect points exceeding 1.5x IQR or 3-sigma thresholds.';
        measures = primaryMetric ? [primaryMetric] : [];
        timeField = timeInfo?.column;
        break;

      case 'driver_analysis':
        title = `Key Driver Attribution for '${primaryMetric ? context.humanFriendlyNames[primaryMetric] : 'Outcome'}'`;
        purpose = 'Quantify relative feature importance and directional driver impact.';
        measures = primaryMetric ? [primaryMetric] : [];
        target = primaryMetric;
        break;

      case 'cohort':
        title = 'Multi-Cohort Behavioral & Categorical Segmentation';
        purpose = 'Compare behavioral metrics across distinct categorical groups.';
        dimensions = context.dimensions.slice(0, 2).map(d => d.technicalName);
        measures = primaryMetric ? [primaryMetric] : [];
        break;

      case 'product_investment_scoring':
        title = 'Multi-Criteria Strategic Entity Prioritization';
        purpose = 'Score and classify entities into Invest, Hold, Monitor, or Divest tiers.';
        dimensions = primaryDim ? [primaryDim] : [];
        measures = primaryMetric ? [primaryMetric] : [];
        break;

      case 'geographic_breakdown':
        title = 'Territorial Market Distribution & Regional Concentration';
        purpose = 'Quantify market volume and share across geographic jurisdictions.';
        dimensions = context.schema.filter(s => s.logicalType === 'dimension_geo').map(s => s.technicalName);
        measures = primaryMetric ? [primaryMetric] : [];
        break;

      case 'classification_churn':
        title = `Supervised Risk Classification for '${primaryTarget ? context.humanFriendlyNames[primaryTarget.column] : 'Target'}'`;
        purpose = 'Train classification baseline to identify high-risk cohort probability.';
        target = primaryTarget?.column;
        measures = context.measures.map(m => m.technicalName);
        dimensions = context.dimensions.map(d => d.technicalName);
        break;

      case 'time_series_forecasting':
        title = 'Forward Horizon Exponential Smoothing Forecast';
        purpose = 'Generate forward projections with 80% confidence prediction intervals.';
        measures = primaryMetric ? [primaryMetric] : [];
        timeField = timeInfo?.column;
        timeGrain = timeInfo?.grain;
        break;

      default:
        title = `${cat.replace(/_/g, ' ').toUpperCase()} Analysis`;
        purpose = `Execute verified ${cat} analytics.`;
    }

    // Scoring & Prioritization
    let priorityScore = 80;
    if (cat === 'descriptive_stats' || cat === 'trend' || cat === 'comparison') priorityScore += 15;
    if (cat === 'classification_churn' && primaryTarget) priorityScore += 18;
    if (cat === 'time_series_forecasting' && timeInfo && timeInfo.totalPeriods >= 12) priorityScore += 12;
    if (intent.requestedAnalyses?.includes(cat)) priorityScore += 20;

    const priority: AnalysisTask['priority'] = priorityScore >= 90 ? 'HIGH' : priorityScore >= 75 ? 'MEDIUM' : 'LOW';

    tasks.push({
      id: `task-${cat}-${Date.now().toString(36)}`,
      title,
      question: questionText || undefined,
      purpose,
      analysisType: cat,
      category: cat,
      target,
      measures: measures.length ? measures : undefined,
      dimensions: dimensions.length ? dimensions : undefined,
      timeField,
      timeGrain,
      aggregation,
      requiredTools: capabilityToToolsMap[cat] || ['aggregate'],
      requiredColumns: cap.requiredColumns || [],
      priority,
      priorityScore: Math.min(100, priorityScore),
      relevance: Math.round(cap.confidence * 95),
      businessValue: priorityScore,
      dataSufficiency: 95,
      statisticalValidity: Math.round(cap.confidence * 100),
      interpretability: 90,
      computationalCost: cat === 'time_series_forecasting' || cat === 'classification_churn' ? 40 : 15,
      userIntentMatch: intent.requestedAnalyses?.includes(cat) ? 100 : 70,
      confidence: cap.confidence,
      rationale: cap.reason,
      status: 'PENDING'
    });
  }

  // Sort tasks by priorityScore descending
  tasks.sort((a, b) => b.priorityScore - a.priorityScore);

  const highPriorityTasks = tasks.filter(t => t.priority === 'HIGH');
  const planSummary = `Authoritative Analysis Plan constructed with ${tasks.length} executable analytical tasks (${highPriorityTasks.length} high priority) and ${skippedTasks.length} unsupported capabilities pruned.`;

  return {
    planSummary,
    tasks,
    highPriorityTasks,
    skippedTasks
  };
}
