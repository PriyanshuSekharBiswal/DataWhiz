// Analysis & Visualization Intelligence Engine: Dataset Narrative, Business Question Generation, and Best-Figure Scoring Optimization

import {
  DatasetContext,
  DatasetNarrative,
  BusinessQuestion,
  ScoredVisualization,
  DynamicChartSpec,
  ColumnSchema,
  ColumnProfile
} from '@/lib/types';
import { parseNumberVal, safeIsoDate } from '@/lib/schema/schemaDetector';
import { formatMetricValue } from '@/lib/formatting/numberFormatter';
import { discoverBusinessQuestions } from '@/lib/questions/businessQuestionEngine';

const EXCLUDE_METRICS_REGEX = /^(year|yyyy|yr|month|mon|mm|day|dd|quarter|qtr|q[1-4]|hour|minute|sec|postal|zip|pin|code|id|key|phone|ssn)$/i;
const TARGET_REGEX = /^(churn|is_churned|churn_status|default_risk|target_label|response_target|fraud_flag)$/i;
const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function computeLinearTrend(arr: number[]): { values: number[]; start: number; end: number; slope: number; growthPct: number } {
  const n = arr.length;
  if (n <= 1) return { values: arr, start: arr[0] || 0, end: arr[0] || 0, slope: 0, growthPct: 0 };
  const xs = arr.map((_, i) => i);
  const meanX = xs.reduce((a, b) => a + b, 0) / n;
  const meanY = arr.reduce((a, b) => a + b, 0) / n;
  let num = 0, den = 0;
  for (let i = 0; i < n; i++) {
    num += (xs[i] - meanX) * (arr[i] - meanY);
    den += (xs[i] - meanX) ** 2;
  }
  const slope = den !== 0 ? num / den : 0;
  const intercept = meanY - slope * meanX;
  const values = xs.map(x => Math.round((slope * x + intercept) * 100) / 100);
  const start = values[0];
  const end = values[n - 1];
  const growthPct = start !== 0 ? ((end - start) / Math.abs(start)) * 100 : 0;
  return { values, start, end, slope, growthPct };
}

function computePearsonCorrelation(xVals: number[], yVals: number[]): number {
  const n = Math.min(xVals.length, yVals.length);
  if (n < 3) return 0;
  let sumX = 0, sumY = 0;
  for (let i = 0; i < n; i++) {
    sumX += xVals[i];
    sumY += yVals[i];
  }
  const meanX = sumX / n;
  const meanY = sumY / n;
  let num = 0, denX = 0, denY = 0;
  for (let i = 0; i < n; i++) {
    const dx = xVals[i] - meanX;
    const dy = yVals[i] - meanY;
    num += dx * dy;
    denX += dx * dx;
    denY += dy * dy;
  }
  const den = Math.sqrt(denX * denY);
  if (den === 0) return 0;
  return Math.round((num / den) * 1000) / 1000;
}

/**
 * 1. Deep Dataset Narrative Understanding
 */
export function generateDatasetNarrative(context: DatasetContext): DatasetNarrative {
  const schemas = context.schema;
  const domain = context.domain.primaryDomain;
  const N = context.cleanedRows.length;

  const keyMeasures = schemas
    .filter(s => s.logicalType.startsWith('measure') || (s.physicalType === 'number' && !EXCLUDE_METRICS_REGEX.test(s.technicalName)))
    .map(s => s.displayName);

  const keyDimensions = schemas
    .filter(s => s.logicalType.startsWith('dimension') || (s.physicalType === 'string' && s.logicalType !== 'identifier'))
    .map(s => s.displayName);

  const dateCols = schemas.filter(s => s.physicalType === 'date' || s.logicalType === 'date');
  const dateProfile = dateCols[0] ? context.profiles.find(p => p.technicalName === dateCols[0].technicalName)?.date : undefined;
  const timeCoverage = dateProfile ? `${dateProfile.minDate} to ${dateProfile.maxDate} (${dateProfile.distinctDates} distinct dates)` : undefined;

  const keyEntities = context.domain.detectedEntities || [];
  if (!keyEntities.length && keyDimensions.length > 0) {
    keyEntities.push(keyDimensions[0]);
  }

  const overviewText = `This dataset represents verified ${domain} activity containing ${N.toLocaleString()} records across ${schemas.length} dimensions. The primary analytical anchors are ${keyMeasures.slice(0, 3).join(', ')} tracked against ${keyDimensions.slice(0, 3).join(', ')}${timeCoverage ? ` over ${timeCoverage}` : ''}.`;

  const majorOpportunities = [
    'Trajectory & cyclical trend decomposition to reveal momentum',
    'Categorical contribution ranking and market concentration',
    'Geographic and entity performance optimization',
    'Forward predictive planning and seasonal indexing'
  ];

  const limitations = [
    'Calculations reflect scope-bounded sample observations',
    'Exogenous market dynamics and competitor actions are not modeled'
  ];

  return {
    overviewText,
    primaryDomain: domain,
    keyEntities,
    keyMeasures,
    keyDimensions,
    timeCoverage,
    majorOpportunities,
    limitations
  };
}

/**
 * 2. Business Question Generation & Prioritization Grounded in Real Calculations
 */
export function generateBusinessQuestions(context: DatasetContext): BusinessQuestion[] {
  if (context.businessQuestions && context.businessQuestions.length > 0) {
    return context.businessQuestions;
  }
  return discoverBusinessQuestions(context, context.understandingReport);
}

/**
 * 3. Best-Figure Scoring & Redundancy Optimization
 */
export const scoreAndSelectVisualizations = buildDynamicCharts;
export function buildDynamicCharts(
  schemas: ColumnSchema[],
  profiles: ColumnProfile[],
  rows: Record<string, any>[]
): DynamicChartSpec[] {
  const N = rows.length;
  if (N === 0) return [];

  const trueNumCols = schemas.filter(s => {
    if (EXCLUDE_METRICS_REGEX.test(s.technicalName) || (s.logicalType as string) === 'identifier') return false;
    return s.logicalType.startsWith('measure') || (s.physicalType === 'number' && s.semanticRole !== 'timestamp');
  }).sort((a, b) => {
    const scoreMetric = (s: ColumnSchema) => {
      const name = s.technicalName.toLowerCase();
      if (/revenue|sales|income|turnover|gmv|amount|spend|charge|val/i.test(name)) return 100;
      if (/units|volume|orders|qty|clicks|impressions/i.test(name)) return 70;
      if (/margin|profit/i.test(name)) return 50;
      return 10;
    };
    return scoreMetric(b) - scoreMetric(a);
  });

  const catCols = schemas.filter(s => {
    if ((s.logicalType as string) === 'identifier' || /flag|promo|status/i.test(s.technicalName)) return false;
    return s.logicalType.startsWith('dimension') || (s.physicalType === 'string' && (s.logicalType as string) !== 'identifier');
  }).sort((a, b) => {
    const scoreDim = (s: ColumnSchema) => {
      const name = s.technicalName.toLowerCase();
      if (/category|cat|dept|division/i.test(name)) return 100;
      if (/product|item|sku|brand|drug|service/i.test(name)) return 90;
      if (/country|region|market|territory|location|city|store|pharmacy/i.test(name)) return 80;
      if (/segment|tier|channel|type/i.test(name)) return 70;
      return 40;
    };
    return scoreDim(b) - scoreDim(a);
  });

  const dateCols = schemas.filter(s => (s.physicalType === 'date' || s.logicalType === 'date' || s.semanticRole === 'timestamp') && (s.logicalType as string) !== 'identifier')
    .sort((a, b) => {
      const aIsExactDate = a.technicalName.toLowerCase() === 'date' ? 100 : a.logicalType === 'date' ? 80 : 50;
      const bIsExactDate = b.technicalName.toLowerCase() === 'date' ? 100 : b.logicalType === 'date' ? 80 : 50;
      return bIsExactDate - aIsExactDate;
    });

  const targetCol = schemas.find(s => {
    const isTargetName = TARGET_REGEX.test(s.technicalName);
    const profile = profiles.find(p => p.technicalName === s.technicalName);
    const isLowCardinality = profile ? profile.uniqueCount >= 2 && profile.uniqueCount <= 5 : true;
    return (isTargetName || s.semanticRole === 'target_variable' || s.logicalType === 'target_binary') && isLowCardinality;
  });

  const primaryMetric = trueNumCols[0]?.technicalName || '';
  const secondaryMetric = trueNumCols.find(m => /units|volume|orders|qty/i.test(m.technicalName))?.technicalName || trueNumCols[1]?.technicalName || '';
  const primaryDim = catCols[0]?.technicalName || '';
  const secondaryDim = catCols.find(c => c.technicalName !== primaryDim)?.technicalName || '';
  const geoDim = catCols.find(s => s.logicalType === 'dimension_geo' || /country|state|region|city|location|plant/i.test(s.technicalName))?.technicalName ||
    schemas.find(s => /country|region/i.test(s.technicalName) && (s.logicalType as string) !== 'identifier')?.technicalName;
  const primaryDate = dateCols[0]?.technicalName || '';

  const primaryMetricSchema = schemas.find(s => s.technicalName === primaryMetric);
  const metricDisplayName = primaryMetricSchema?.displayName || primaryMetric || 'Volume';
  const unitMeta = primaryMetricSchema?.unitMetadata;

  const scoredCharts: ScoredVisualization[] = [];

  // FIGURE CANDIDATE 1: HERO ACTUAL TREND OVER TIME (Line - Full Width)
  if (primaryDate) {
    const dateMap = new Map<string, number>();
    const dateYearMap = new Map<number, Map<number, number>>();

    const stride = N > 15000 ? Math.ceil(N / 8000) : 1;
    for (let i = 0; i < N; i += stride) {
      const r = rows[i];
      const rawDate = r[primaryDate];
      const iso = safeIsoDate(rawDate) || String(rawDate || '').trim();
      const v = (primaryMetric ? (parseNumberVal(r[primaryMetric]) || 0) : 1) * stride;

      if (iso) {
        dateMap.set(iso, (dateMap.get(iso) || 0) + v);
        const dObj = new Date(iso);
        if (!isNaN(dObj.getTime())) {
          const yr = dObj.getFullYear();
          const mo = dObj.getMonth();
          if (!dateYearMap.has(yr)) dateYearMap.set(yr, new Map());
          const yrMap = dateYearMap.get(yr)!;
          yrMap.set(mo, (yrMap.get(mo) || 0) + v);
        }
      }
    }

    const sortedDates = [...dateMap.keys()].sort();
    if (sortedDates.length >= 3) {
      const trendValues = sortedDates.map(d => dateMap.get(d) || 0);
      const trendResult = computeLinearTrend(trendValues);

      const data = sortedDates.slice(0, 100).map(date => ({
        name: date,
        value: Math.round(dateMap.get(date)! * 100) / 100
      }));

      const dateDisplay = schemas.find(s => s.technicalName === primaryDate)?.displayName || primaryDate;
      const direction = trendResult.growthPct >= 0 ? 'risen' : 'declined';
      const growthStr = `${trendResult.growthPct >= 0 ? '+' : ''}${trendResult.growthPct.toFixed(1)}%`;

      const chart1: DynamicChartSpec = {
        id: `hero-trend-${primaryMetric || 'volume'}`,
        title: `${metricDisplayName} Historical Trajectory`,
        why: `Actual performance progression tracked across ${dateDisplay} with moving average trendline.`,
        type: 'line',
        x: primaryDate,
        y: primaryMetric || 'count',
        unit: primaryMetricSchema?.unit,
        unitMetadata: unitMeta,
        isSourceDerivedDimension: true,
        hasMeaningfulLabels: true,
        data,
        layoutSpan: 'full',
        height: 360,
        calloutText: `📈 ${growthStr} baseline trajectory: the fitted trend has ${direction} from ${formatMetricValue(trendResult.start, unitMeta)} to ${formatMetricValue(trendResult.end, unitMeta)} over ${sortedDates.length} periods.`
      };

      scoredCharts.push({
        chart: chart1,
        score: 98,
        relevance: 28,
        readability: 25,
        evidenceStrength: 25,
        businessValue: 25,
        clutterPenalty: 1,
        redundancyPenalty: 1,
        priority: 'HERO'
      });

      // FIGURE CANDIDATE 2: MULTI-YEAR MONTHLY OVERLAY (Line - Full Width)
      const availableYears = [...dateYearMap.keys()].sort();
      if (availableYears.length >= 2) {
        const yr1 = availableYears[availableYears.length - 2];
        const yr2 = availableYears[availableYears.length - 1];

        const yr1Values = MONTH_NAMES.map((_, mIdx) => Math.round(dateYearMap.get(yr1)?.get(mIdx) || 0));
        const yr2Values = MONTH_NAMES.map((_, mIdx) => Math.round(dateYearMap.get(yr2)?.get(mIdx) || 0));

        const overlayChart: DynamicChartSpec = {
          id: 'hero-seasonality-overlay',
          title: `Monthly ${metricDisplayName} Trajectory, Both Years Overlaid`,
          why: `Multi-year seasonal curve comparing ${yr1} baseline vs ${yr2} to reveal seasonal peak patterns.`,
          type: 'line',
          unit: primaryMetricSchema?.unit,
          unitMetadata: unitMeta,
          isSourceDerivedDimension: true,
          hasMeaningfulLabels: true,
          data: MONTH_NAMES.map((m, idx) => ({ name: m, value: yr2Values[idx] })),
          layoutSpan: 'full',
          height: 320,
          multiDatasets: [
            {
              label: `${yr1} (Historical Baseline)`,
              data: yr1Values,
              color: '#0284C7',
              backgroundColor: 'rgba(2, 132, 199, 0.05)',
              borderDash: [5, 5],
              pointRadius: 3
            },
            {
              label: `${yr2} (Current Year)`,
              data: yr2Values,
              color: '#F59E0B',
              backgroundColor: 'rgba(245, 158, 11, 0.12)',
              fill: true,
              pointRadius: 4
            }
          ],
          calloutText: `🗓️ Seasonal Demand Pattern: Direct multi-year comparison reveals seasonal variance between ${yr1} and ${yr2}.`
        };

        scoredCharts.push({
          chart: overlayChart,
          score: 94,
          relevance: 25,
          readability: 25,
          evidenceStrength: 25,
          businessValue: 24,
          clutterPenalty: 1,
          redundancyPenalty: 2,
          priority: 'HERO'
        });
      }
    }
  }

  // FIGURE CANDIDATE 3: PRIMARY CATEGORICAL CONTRIBUTION (Donut or Horizontal Bar)
  if (primaryDim) {
    const catMap = new Map<string, number>();
    const stride = N > 15000 ? Math.ceil(N / 8000) : 1;

    for (let i = 0; i < N; i += stride) {
      const r = rows[i];
      const rawCat = r[primaryDim];
      if (rawCat === undefined || rawCat === null || String(rawCat).trim() === '') continue;
      const cat = String(rawCat).trim();
      const v = (primaryMetric ? (parseNumberVal(r[primaryMetric]) || 0) : 1) * stride;
      catMap.set(cat, (catMap.get(cat) || 0) + v);
    }

    const catData = Array.from(catMap.entries())
      .map(([name, value]) => ({ name, value: Math.round(value * 100) / 100 }))
      .sort((a, b) => b.value - a.value);

    if (catData.length > 0) {
      const dimDisplay = schemas.find(s => s.technicalName === primaryDim)?.displayName || primaryDim;
      const isDonutAppropriate = catData.length <= 5;

      const chart3: DynamicChartSpec = {
        id: `breakdown-${primaryDim}`,
        title: `${metricDisplayName} by ${dimDisplay}`,
        why: `Market share and categorical distribution across top ${dimDisplay.toLowerCase()} segments.`,
        type: isDonutAppropriate ? 'pie' : 'bar',
        unit: primaryMetricSchema?.unit,
        unitMetadata: unitMeta,
        isSourceDerivedDimension: true,
        hasMeaningfulLabels: true,
        data: isDonutAppropriate ? catData.slice(0, 5) : catData.slice(0, 8),
        layoutSpan: 'half',
        height: 300
      };

      scoredCharts.push({
        chart: chart3,
        score: 91,
        relevance: 24,
        readability: 24,
        evidenceStrength: 24,
        businessValue: 23,
        clutterPenalty: isDonutAppropriate ? 1 : 2,
        redundancyPenalty: 1,
        priority: 'PRIMARY'
      });
    }
  }

  // FIGURE CANDIDATE 4: TARGET COHORT / RISK BREAKDOWN (Bar)
  if (targetCol && primaryDim) {
    const cohortMap = new Map<string, { total: number; positive: number }>();
    for (const r of rows) {
      const rawSeg = r[primaryDim];
      if (!rawSeg) continue;
      const seg = String(rawSeg).trim();
      const val = String(r[targetCol.technicalName] ?? '').trim().toLowerCase();
      const isPos = ['yes', '1', 'true', 'churn', 'positive', 'default', 'delivered'].includes(val);
      const entry = cohortMap.get(seg) || { total: 0, positive: 0 };
      entry.total++;
      if (isPos) entry.positive++;
      cohortMap.set(seg, entry);
    }

    const cohortData = Array.from(cohortMap.entries())
      .filter(([_, e]) => e.total >= 2)
      .map(([name, e]) => ({ name, value: Math.round((e.positive / e.total) * 1000) / 10 }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6);

    if (cohortData.length > 0) {
      const dimDisplay = schemas.find(s => s.technicalName === primaryDim)?.displayName || primaryDim;
      const targetDisplay = targetCol.displayName;
      const isUnfavorable = targetCol.polarity === 'unfavorable';

      const cohortChart: DynamicChartSpec = {
        id: `target-cohort-${targetCol.technicalName}`,
        title: `${targetDisplay} Rate by ${dimDisplay}`,
        why: `Evaluates event incidence rate distribution across ${dimDisplay.toLowerCase()}.`,
        type: 'bar',
        unit: '%',
        unitMetadata: { measurementType: 'percentage', unitSymbol: '%' },
        isSourceDerivedDimension: true,
        hasMeaningfulLabels: true,
        data: cohortData,
        layoutSpan: 'half',
        height: 300,
        calloutText: `🎯 Cohort Rate: '${cohortData[0]?.name}' exhibits ${cohortData[0]?.value}% ${targetDisplay.toLowerCase()} rate.`
      };

      scoredCharts.push({
        chart: cohortChart,
        score: 93,
        relevance: 26,
        readability: 24,
        evidenceStrength: 24,
        businessValue: 25,
        clutterPenalty: 1,
        redundancyPenalty: 1,
        priority: 'PRIMARY'
      });
    }
  }

  // ----------------------------------------------------
  // SPECIALIZED FIGURE: MARKETING MEDIA MIX (MMM) CHARTS
  // ----------------------------------------------------
  const mediaCols = schemas.filter(s => /_imp|_clk|_grp|_vol|dtv_|aud_|ctv_|olv_|srh_|soc_|dis_|ooh_|oem_|eml_|ntv_/i.test(s.technicalName));
  if (mediaCols.length >= 4) {
    // 1. Channel Family Share
    const familyVolumeMap = new Map<string, number>();
    for (const mc of mediaCols) {
      const colName = mc.technicalName;
      const totalVol = rows.map(r => parseNumberVal(r[colName]) || 0).reduce((a, b) => a + b, 0);
      let family = 'Other Digital';
      if (/soc/i.test(colName)) family = 'Social Media';
      else if (/srh/i.test(colName)) family = 'Search Ads';
      else if (/ctv/i.test(colName)) family = 'Connected TV';
      else if (/olv|vid/i.test(colName)) family = 'Online Video';
      else if (/dis/i.test(colName)) family = 'Display Network';
      else if (/ooh/i.test(colName)) family = 'Out-of-Home';
      else if (/aud/i.test(colName)) family = 'Digital Audio';
      else if (/eml/i.test(colName)) family = 'Email Marketing';
      else if (/dml|dmt/i.test(colName)) family = 'Direct Mail';
      else if (/ntv/i.test(colName)) family = 'Native Ads';

      familyVolumeMap.set(family, (familyVolumeMap.get(family) || 0) + totalVol);
    }

    const familyData = Array.from(familyVolumeMap.entries())
      .map(([name, value]) => ({ name, value: Math.round(value) }))
      .sort((a, b) => b.value - a.value);

    if (familyData.length > 0) {
      const mmmFamilyChart: DynamicChartSpec = {
        id: 'mmm-channel-family-share',
        title: 'Media Channel Volume Share by Platform',
        why: 'Relative delivery volume across major advertising platforms (Social, Display, Search, Video, CTV).',
        type: 'pie',
        unit: 'units',
        unitMetadata: { measurementType: 'count', unitName: 'Volume' },
        isSourceDerivedDimension: true,
        hasMeaningfulLabels: true,
        data: familyData,
        layoutSpan: 'half',
        height: 300
      };

      scoredCharts.push({
        chart: mmmFamilyChart,
        score: 96,
        relevance: 28,
        readability: 26,
        evidenceStrength: 26,
        businessValue: 26,
        clutterPenalty: 0,
        redundancyPenalty: 0,
        priority: 'HERO'
      });
    }

    // 2. Top Media Drivers Correlation with Sales
    if (primaryMetric) {
      const salesVals = rows.map(r => parseNumberVal(r[primaryMetric]) || 0);
      const corrList: { name: string; value: number }[] = [];

      for (const mc of mediaCols.slice(0, 15)) {
        const mcVals = rows.map(r => parseNumberVal(r[mc.technicalName]) || 0);
        const rVal = computePearsonCorrelation(mcVals, salesVals);
        if (!isNaN(rVal)) {
          corrList.push({
            name: mc.displayName.replace(/Media & Advertising — /g, '').slice(0, 25),
            value: Math.round(rVal * 100) / 100
          });
        }
      }

      corrList.sort((a, b) => b.value - a.value);

      if (corrList.length >= 3) {
        const mmmCorrChart: DynamicChartSpec = {
          id: 'mmm-driver-elasticity',
          title: `Media Driver Elasticity (Correlation with ${metricDisplayName})`,
          why: `Statistical elasticity and linear correlation between individual media channels and ${metricDisplayName}.`,
          type: 'bar',
          unit: 'r',
          unitMetadata: { measurementType: 'ratio', unitName: 'Pearson r' },
          isSourceDerivedDimension: true,
          hasMeaningfulLabels: true,
          data: corrList.slice(0, 8),
          layoutSpan: 'half',
          height: 300,
          calloutText: `📈 Top Driver: '${corrList[0]?.name}' has highest correlation (r = ${corrList[0]?.value}) with sales.`
        };

        scoredCharts.push({
          chart: mmmCorrChart,
          score: 97,
          relevance: 29,
          readability: 26,
          evidenceStrength: 27,
          businessValue: 28,
          clutterPenalty: 0,
          redundancyPenalty: 0,
          priority: 'HERO'
        });
      }
    }

    // 3. Search Ad Click Distribution (Branded vs Non-Branded vs PMax)
    const searchCols = mediaCols.filter(c => /srh/i.test(c.technicalName));
    if (searchCols.length >= 2) {
      const searchData = searchCols.map(sc => {
        const totalClicks = rows.map(r => parseNumberVal(r[sc.technicalName]) || 0).reduce((a, b) => a + b, 0);
        return {
          name: sc.displayName.replace(/Media & Advertising — Search Ads — /g, ''),
          value: Math.round(totalClicks)
        };
      }).sort((a, b) => b.value - a.value);

      const searchChart: DynamicChartSpec = {
        id: 'mmm-search-click-breakdown',
        title: 'Search Ads Click Volume: Branded vs Non-Branded vs PMax',
        why: 'Breakdown of high-intent search traffic by brand affinity and campaign strategy.',
        type: 'bar',
        unit: 'clicks',
        unitMetadata: { measurementType: 'count', unitName: 'Clicks', unitSymbol: 'clicks' },
        isSourceDerivedDimension: true,
        hasMeaningfulLabels: true,
        data: searchData,
        layoutSpan: 'half',
        height: 300
      };

      scoredCharts.push({
        chart: searchChart,
        score: 91,
        relevance: 25,
        readability: 25,
        evidenceStrength: 24,
        businessValue: 24,
        clutterPenalty: 1,
        redundancyPenalty: 1,
        priority: 'PRIMARY'
      });
    }
  }

  // FIGURE CANDIDATE 5: SECONDARY / TERRITORIAL RANKING (Horizontal Bar)
  const rankingDim = geoDim || secondaryDim;
  if (rankingDim && rankingDim !== primaryDim) {
    const geoMap = new Map<string, number>();
    const stride = N > 15000 ? Math.ceil(N / 8000) : 1;

    for (let i = 0; i < N; i += stride) {
      const r = rows[i];
      const rawG = r[rankingDim];
      if (!rawG) continue;
      const g = String(rawG).trim();
      const v = (primaryMetric ? (parseNumberVal(r[primaryMetric]) || 0) : 1) * stride;
      geoMap.set(g, (geoMap.get(g) || 0) + v);
    }

    const geoData = Array.from(geoMap.entries())
      .map(([name, value]) => ({ name, value: Math.round(value * 100) / 100 }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);

    if (geoData.length > 0) {
      const dimDisplay = schemas.find(s => s.technicalName === rankingDim)?.displayName || rankingDim;

      const chart5: DynamicChartSpec = {
        id: `ranking-${rankingDim}`,
        title: `${metricDisplayName} by ${dimDisplay}`,
        why: `Ranked contribution across top ${dimDisplay.toLowerCase()} territorial drivers.`,
        type: 'bar',
        unit: primaryMetricSchema?.unit,
        unitMetadata: unitMeta,
        isSourceDerivedDimension: true,
        hasMeaningfulLabels: true,
        data: geoData,
        layoutSpan: 'half',
        height: 300
      };

      scoredCharts.push({
        chart: chart5,
        score: 89,
        relevance: 23,
        readability: 23,
        evidenceStrength: 23,
        businessValue: 22,
        clutterPenalty: 1,
        redundancyPenalty: 1,
        priority: 'PRIMARY'
      });
    }
  }

  // FIGURE CANDIDATE 6: BIVARIATE NUMERIC RELATIONSHIP (When 2+ measures exist)
  if (primaryMetric && secondaryMetric && primaryMetric !== secondaryMetric) {
    const sampleStep = N > 100 ? Math.ceil(N / 80) : 1;
    const scatterData: { name: string; value: number; xVal: number }[] = [];

    for (let i = 0; i < N; i += sampleStep) {
      const vX = parseNumberVal(rows[i][primaryMetric]);
      const vY = parseNumberVal(rows[i][secondaryMetric]);
      if (vX !== null && vY !== null) {
        scatterData.push({
          name: `${vX.toFixed(1)}`,
          value: Math.round(vY * 100) / 100,
          xVal: vX
        });
      }
    }

    if (scatterData.length >= 8) {
      const metricA = schemas.find(s => s.technicalName === primaryMetric)?.displayName || primaryMetric;
      const metricB = schemas.find(s => s.technicalName === secondaryMetric)?.displayName || secondaryMetric;
      const secSchema = schemas.find(s => s.technicalName === secondaryMetric);

      const scatterChart: DynamicChartSpec = {
        id: `scatter-${primaryMetric}-${secondaryMetric}`,
        title: `${metricB} vs ${metricA}`,
        why: `Bivariate distribution evaluating relationship and elasticity between ${metricA} and ${metricB}.`,
        type: 'bar',
        unit: secSchema?.unit,
        unitMetadata: secSchema?.unitMetadata,
        isSourceDerivedDimension: true,
        hasMeaningfulLabels: true,
        data: scatterData.slice(0, 25),
        layoutSpan: 'half',
        height: 300
      };

      scoredCharts.push({
        chart: scatterChart,
        score: 85,
        relevance: 21,
        readability: 22,
        evidenceStrength: 22,
        businessValue: 22,
        clutterPenalty: 2,
        redundancyPenalty: 2,
        priority: 'SECONDARY'
      });
    }
  }

  // ----------------------------------------------------
  // REDUNDANCY FILTERING & BEST COMPLEMENTARY SELECTION
  // ----------------------------------------------------
  scoredCharts.sort((a, b) => b.score - a.score);

  const finalFigures: DynamicChartSpec[] = [];
  const seenFigureIds = new Set<string>();

  for (const item of scoredCharts) {
    if (!seenFigureIds.has(item.chart.id) && finalFigures.length < 6) {
      seenFigureIds.add(item.chart.id);
      finalFigures.push(item.chart);
    }
  }

  return finalFigures;
}
