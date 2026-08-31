// Dashboard Story Engine: Generates authoritative DashboardSpec and dynamic analytical story layout

import {
  DatasetContext,
  DashboardSpec,
  DashboardSection,
  DashboardTabConfig,
  KpiCardData,
  DynamicChartSpec,
  Finding,
  InvestmentRecommendation
} from '@/lib/types';
import { parseNumberVal } from '@/lib/schema/schemaDetector';
import { executeDataWhizTool } from '@/lib/ai/tools/toolRegistry';
import { formatMetricValue } from '@/lib/formatting/numberFormatter';

export function buildDashboardStory(context: DatasetContext): DashboardSpec {
  const schemas = context.schema;
  const rows = context.cleanedRows;
  const report = context.understandingReport;
  const findings = context.validatedFindings || [];
  const plan = context.analysisPlan;
  const caps = context.capabilities;
  const timeInfo = context.timeDimensions;
  const targetCandidates = context.targetCandidates || [];
  const primaryTarget = targetCandidates.find(t => t.usable && t.confidence >= 0.70);
  const primaryMetric = context.primaryMetricColumn || (context.measures[0]?.technicalName) || 'Metric';
  const primaryDim = context.primaryDimensionColumn || (context.dimensions[0]?.technicalName) || 'Category';

  const metricSchema = schemas.find(s => s.technicalName === primaryMetric);
  const dimSchema = schemas.find(s => s.technicalName === primaryDim);
  const metricDisplay = context.humanFriendlyNames[primaryMetric] || primaryMetric;
  const dimDisplay = context.humanFriendlyNames[primaryDim] || primaryDim;

  const sections: DashboardSection[] = [];
  const tabs: DashboardTabConfig[] = [
    { id: 'overview', label: 'Executive Overview', icon: 'LayoutDashboard' }
  ];

  // 1. Build Validated KPIs (No arbitrary slot filling)
  const kpis: KpiCardData[] = [];
  
  // KPI 1: Primary Measure Aggregate
  if (primaryMetric && rows.length > 0) {
    const isAverageLike = metricSchema?.aggregationBehavior === 'average_like' || metricSchema?.aggregationBehavior === 'percentage' || metricSchema?.aggregationBehavior === 'ratio';
    const reqAgg = isAverageLike ? 'avg' : 'sum';
    const aggRes = executeDataWhizTool('aggregate', { metric: primaryMetric, aggFunction: reqAgg }, context);

    if (aggRes.validationStatus !== 'INVALID') {
      const val = aggRes.data.value;
      const formattedVal = formatMetricValue(val, metricSchema?.unitMetadata);
      const aggLabel = isAverageLike ? 'Average' : 'Total';

      kpis.push({
        id: 'kpi-primary',
        label: `${aggLabel} ${metricDisplay}`,
        value: formattedVal,
        rawValue: val,
        role: 'primary',
        note: `${aggLabel} across ${rows.length.toLocaleString()} verified records`,
        how: `${aggRes.aggregation?.toUpperCase() || reqAgg.toUpperCase()}(${primaryMetric})`,
        confidence: 0.98,
        importanceScore: 100
      });
    }
  }

  // KPI 2: Time Trend or Rate of Change
  if (timeInfo && primaryMetric && rows.length >= 4) {
    const periodRes = executeDataWhizTool('period_compare', { metric: primaryMetric, timeField: timeInfo.column }, context);
    if (periodRes.validationStatus !== 'INVALID' && periodRes.data?.deltas?.length > 0) {
      const deltas = periodRes.data.deltas;
      const latest = deltas[deltas.length - 1];
      const isPos = latest.percentageChange >= 0;

      kpis.push({
        id: 'kpi-growth',
        label: `${metricDisplay} Delta`,
        value: `${isPos ? '+' : ''}${latest.percentageChange}%`,
        rawValue: latest.percentageChange,
        delta: `${latest.percentageChange >= 0 ? '▲ +' : '▼ '}${latest.percentageChange}%`,
        deltaPercent: latest.percentageChange,
        isPositive: isPos,
        role: 'diagnostic',
        note: `${latest.period} vs ${latest.previousPeriod} sequential change`,
        how: `Period Rate of Change (${timeInfo.grain})`,
        confidence: 0.95,
        importanceScore: 92
      });
    }
  }

  // KPI 3: Supervised Target Rate (if classification target exists)
  if (primaryTarget && primaryTarget.taskType === 'binary_classification') {
    const classRes = executeDataWhizTool('classification', { target: primaryTarget.column }, context);
    if (classRes.validationStatus !== 'INVALID' && classRes.data?.overallChurnRate !== undefined) {
      const rate = classRes.data.overallChurnRate;
      const targetName = context.humanFriendlyNames[primaryTarget.column] || primaryTarget.column;
      kpis.push({
        id: 'kpi-target-rate',
        label: `${targetName} Incidence Rate`,
        value: `${rate}%`,
        rawValue: rate,
        role: 'diagnostic',
        note: `Overall positive event frequency across dataset`,
        how: `Positive target count / Total records`,
        confidence: 0.94,
        importanceScore: 95
      });
    }
  }

  // KPI 4: Top Segment Concentration
  if (primaryDim && primaryMetric) {
    const rankRes = executeDataWhizTool('rank', { metric: primaryMetric, dimension: primaryDim, limit: 1 }, context);
    if (rankRes.validationStatus !== 'INVALID' && rankRes.data?.length > 0) {
      const top = rankRes.data[0];
      kpis.push({
        id: 'kpi-top-entity',
        label: `Top ${dimDisplay}`,
        value: top.entity,
        rawValue: top.value,
        note: `${top.sharePct}% volume share (${formatMetricValue(top.value, metricSchema?.unitMetadata)})`,
        how: `Max ${dimDisplay} volume contribution`,
        confidence: 0.92,
        importanceScore: 88
      });
    }
  }

  // 2. Build Hero Visuals
  const heroVisuals: DynamicChartSpec[] = [];

  // Hero 1: Time Series Trend
  if (timeInfo && primaryMetric && caps.trend?.supported) {
    const groupRes = executeDataWhizTool('group', { metric: primaryMetric, dimension: timeInfo.column, aggFunction: 'sum' }, context);
    if (groupRes.validationStatus !== 'INVALID') {
      const sorted = (groupRes.data as any[]).sort((a, b) => a.group.localeCompare(b.group));
      heroVisuals.push({
        id: 'hero-trend',
        title: `${metricDisplay} Historical Trajectory`,
        subtitle: `Tracked at ${timeInfo.grain} grain across ${sorted.length} chronological periods`,
        why: `Primary longitudinal timeline establishing operational growth and cycle behavior.`,
        type: 'line',
        xField: timeInfo.column,
        yField: primaryMetric,
        xLabel: timeInfo.column,
        yLabel: metricDisplay,
        timeGrain: timeInfo.grain,
        unit: metricSchema?.unit,
        unitMetadata: metricSchema?.unitMetadata,
        isSourceDerivedDimension: true,
        hasMeaningfulLabels: true,
        data: sorted.map(s => ({ name: s.group, value: s.value, [timeInfo.column]: s.group, [primaryMetric]: s.value })),
        layoutSpan: 'full'
      });
    }
  }

  // Hero 2: Segment Breakdown / Pareto
  if (primaryDim && primaryMetric) {
    const rankRes = executeDataWhizTool('rank', { metric: primaryMetric, dimension: primaryDim, limit: 10 }, context);
    if (rankRes.validationStatus !== 'INVALID') {
      heroVisuals.push({
        id: 'hero-segment',
        title: `${metricDisplay} by ${dimDisplay}`,
        subtitle: `Top ${rankRes.data.length} categories ranked by cumulative volume contribution`,
        why: `Categorical performance ranking and Pareto distribution.`,
        type: 'bar',
        xField: primaryDim,
        yField: primaryMetric,
        xLabel: dimDisplay,
        yLabel: metricDisplay,
        unit: metricSchema?.unit,
        unitMetadata: metricSchema?.unitMetadata,
        isSourceDerivedDimension: true,
        hasMeaningfulLabels: true,
        data: rankRes.data.map((r: any) => ({ name: r.entity, value: r.value, [primaryDim]: r.entity, [primaryMetric]: r.value })),
        layoutSpan: heroVisuals.length === 0 ? 'full' : 'half'
      });
    }
  }

  // 3. Dynamic Story Sections

  // Section: Time Series & Forecasting (if supported)
  if (timeInfo && caps.time_series_forecasting?.supported) {
    tabs.push({ id: 'forecasting', label: 'Projections & Trends', icon: 'TrendingUp', sectionType: 'forecast' });
    const fcRes = executeDataWhizTool('forecast', { metric: primaryMetric, dateColumn: timeInfo.column, horizon: 6 }, context);
    sections.push({
      id: 'sec-forecast',
      title: 'Predictive Projections & Forward Modeling',
      subtitle: `6-period forward forecasting with 80% confidence prediction intervals`,
      sectionType: 'forecast',
      chart: fcRes.data?.chartSpec,
      metadata: { forecastSummary: fcRes.data?.summary }
    });
  }

  // Section: Supervised Classification / Cohorts (if target exists)
  if (primaryTarget && caps.classification_churn?.supported) {
    tabs.push({ id: 'target-cohorts', label: 'Risk & Cohort Segmentation', icon: 'ShieldAlert', sectionType: 'model_result' });
    const classRes = executeDataWhizTool('classification', { target: primaryTarget.column }, context);
    sections.push({
      id: 'sec-classification',
      title: `Risk Modeling & Cohort Segmentation (${context.humanFriendlyNames[primaryTarget.column] || primaryTarget.column})`,
      subtitle: `Supervised feature importance and cohort incidence rate scoring`,
      sectionType: 'model_result',
      chart: classRes.data?.chartSpec,
      metadata: { classificationData: classRes.data }
    });
  }

  // Section: Media Attribution / Marketing Media
  const isMarketingMmm = schemas.some(s => /_imp$|_clk$/i.test(s.technicalName)) ||
    (schemas.filter(s => /spend|impression|click|ad_/i.test(s.technicalName)).length >= 2);
  if (isMarketingMmm) {
    tabs.push({ id: 'marketing-media', label: 'Media Attribution', icon: 'Megaphone', sectionType: 'chart_grid' });
  }

  // Section: Distribution & Statistics
  tabs.push({ id: 'statistics', label: 'Statistical Distribution', icon: 'BarChart2', sectionType: 'statistics' });
  sections.push({
    id: 'sec-statistics',
    title: 'Descriptive Statistics & Dispersion Benchmarks',
    subtitle: `Distribution moments, variance, skewness, and IQR dispersion across attributes`,
    sectionType: 'statistics'
  });

  // Section: Data Quality & Cleaning Audit
  tabs.push({ id: 'quality', label: 'Data Quality & Audit', icon: 'CheckCircle2', sectionType: 'data_quality' });
  sections.push({
    id: 'sec-quality',
    title: 'Data Hygiene & Transformation Audit Trail',
    subtitle: `Quality score: ${context.qualityReport.overallScore}/100 with ${context.cleaningHistory.length} automated cleaning steps`,
    sectionType: 'data_quality'
  });

  // Section: Data Dictionary
  tabs.push({ id: 'dictionary', label: 'Data Dictionary', icon: 'BookOpen', sectionType: 'data_dictionary' });
  sections.push({
    id: 'sec-dictionary',
    title: 'Authoritative Data Dictionary & Semantic Mapping',
    subtitle: `Complete attribute catalogue with technical-to-business translations`,
    sectionType: 'data_dictionary'
  });

  // Filter definitions
  const filters = [];
  if (primaryDim) {
    const uniqueDims = Array.from(new Set(rows.map(r => String(r[primaryDim] ?? '')).filter(Boolean))).slice(0, 10);
    filters.push({
      column: primaryDim,
      label: dimDisplay,
      options: ['All', ...uniqueDims],
      defaultOption: 'All'
    });
  }

  const title = report?.primaryDomain ? `${report.primaryDomain} Intelligence Dashboard` : 'DataWhiz AI Intelligence Dashboard';
  const subtitle = `Autonomous statistical profiling, validated findings, and decision modeling for ${rows.length.toLocaleString()} records.`;
  const datasetSummary = report?.datasetSummary || `${rows.length.toLocaleString()} rows and ${schemas.length} columns analyzed.`;

  return {
    id: `dash-${Date.now().toString(36)}`,
    title,
    subtitle,
    datasetSummary,
    filters,
    overview: {
      kpis,
      heroVisuals,
      topFindings: findings.slice(0, 4),
      recommendations: context.recommendations || []
    },
    sections,
    tabs,
    metadata: {
      generatedAt: new Date().toISOString(),
      domain: report?.primaryDomain || 'General',
      archetype: report?.archetype || 'general_tabular',
      totalRows: rows.length,
      totalColumns: schemas.length,
      provenanceEngine: 'DataWhiz Senior Analyst Brain v2.0'
    }
  };
}
