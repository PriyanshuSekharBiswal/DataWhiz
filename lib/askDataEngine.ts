// Ask Your Data Engine: Agentic Tool-Grounded Analytics, Multi-Step Execution & Verified Narrative Synthesis

import { DatasetContext, AskDataTurn, DynamicChartSpec, ColumnSchema } from '@/lib/types';
import { executeDataWhizTool } from '@/lib/ai/tools/toolRegistry';
import { parseUserIntent } from '@/lib/intent/intentParser';
import { evaluateInvestmentPriorities } from '@/lib/analytics/decisionEngine';
import { humanizeColumnName } from '@/lib/semantics/columnHumanizer';
import { parseNumberVal, safeIsoDate } from '@/lib/schema/schemaDetector';
import { formatMetricValue } from '@/lib/formatting/numberFormatter';

/**
 * Deterministically constructs interactive DynamicChartSpec from dataset rows
 */
export function buildChartForSpec(
  rows: Record<string, any>[],
  schemas: ColumnSchema[],
  spec: {
    type?: string;
    title?: string;
    xField?: string;
    yField?: string;
    agg?: string;
    why?: string;
  }
): DynamicChartSpec | null {
  if (!rows || rows.length === 0 || !schemas || schemas.length === 0) return null;

  const yColName = spec.yField || schemas.find(s => s.physicalType === 'number' || s.logicalType.startsWith('measure'))?.technicalName;
  if (!yColName) return null;
  const ySchema = schemas.find(s => s.technicalName === yColName);

  let xColName = spec.xField;
  if (!xColName) {
    if (spec.type === 'line' || spec.type === 'area') {
      xColName = schemas.find(s => s.physicalType === 'date' || s.logicalType === 'date' || s.semanticRole === 'timestamp')?.technicalName;
    }
    if (!xColName) {
      xColName = schemas.find(s => (s.physicalType === 'string' || s.logicalType.startsWith('dimension')) && s.technicalName !== yColName)?.technicalName;
    }
  }
  if (!xColName) xColName = yColName;

  const xSchema = schemas.find(s => s.technicalName === xColName);
  const chartType = (spec.type || (xSchema?.physicalType === 'date' || xSchema?.logicalType === 'date' ? 'line' : 'bar')).toLowerCase() as any;
  const agg = (spec.agg || 'sum').toLowerCase();

  const mName = ySchema?.displayName || yColName;
  const dName = xSchema?.displayName || xColName;

  // Case 1: Scatter plot between two numeric variables
  if (chartType === 'scatter' && xColName !== yColName && (xSchema?.physicalType === 'number' || xSchema?.logicalType.startsWith('measure'))) {
    const points: any[] = [];
    const stride = rows.length > 500 ? Math.ceil(rows.length / 300) : 1;
    for (let i = 0; i < rows.length; i += stride) {
      const r = rows[i];
      const xVal = parseNumberVal(r[xColName]);
      const yVal = parseNumberVal(r[yColName]);
      if (xVal !== null && yVal !== null) {
        points.push({ xVal, value: yVal, name: `Point ${points.length + 1}` });
      }
    }
    return {
      id: `chart-ask-scatter-${Date.now()}`,
      title: spec.title || `${mName} vs ${dName}`,
      why: spec.why || `Scatter correlation distribution between ${mName} and ${dName}.`,
      type: 'scatter',
      xField: xColName,
      yField: yColName,
      unit: ySchema?.unit,
      unitMetadata: ySchema?.unitMetadata,
      data: points
    };
  }

  // Case 2: Time-series Line / Area Chart
  const isDateX = xSchema?.physicalType === 'date' || xSchema?.logicalType === 'date' || /date|month|year|week|day|time/i.test(xColName);
  if (isDateX || chartType === 'line' || chartType === 'area') {
    const dateMap = new Map<string, { sum: number; count: number; min: number; max: number }>();
    for (const r of rows) {
      const rawDate = r[xColName];
      const dKey = safeIsoDate(rawDate) || String(rawDate ?? '').trim();
      const val = parseNumberVal(r[yColName]);
      if (!dKey || val === null) continue;

      const curr = dateMap.get(dKey) || { sum: 0, count: 0, min: Infinity, max: -Infinity };
      curr.sum += val;
      curr.count++;
      curr.min = Math.min(curr.min, val);
      curr.max = Math.max(curr.max, val);
      dateMap.set(dKey, curr);
    }

    const sortedDates = Array.from(dateMap.keys()).sort();
    const dataPoints = sortedDates.slice(0, 100).map(dKey => {
      const entry = dateMap.get(dKey)!;
      let finalVal = entry.sum;
      if (agg === 'avg' || agg === 'mean') finalVal = entry.count ? entry.sum / entry.count : 0;
      else if (agg === 'min') finalVal = entry.min;
      else if (agg === 'max') finalVal = entry.max;
      else if (agg === 'count') finalVal = entry.count;
      return {
        name: dKey,
        value: Math.round(finalVal * 100) / 100
      };
    });

    return {
      id: `chart-ask-line-${Date.now()}`,
      title: spec.title || `${mName} Trajectory over ${dName}`,
      why: spec.why || `Historical time trajectory of ${mName} grouped chronologically by ${dName}.`,
      type: chartType === 'area' ? 'area' : 'line',
      xField: xColName,
      yField: yColName,
      unit: ySchema?.unit,
      unitMetadata: ySchema?.unitMetadata,
      isSourceDerivedDimension: true,
      hasMeaningfulLabels: true,
      data: dataPoints
    };
  }

  // Case 3: Categorical Bar / Pie / Donut / Horizontal Bar
  const catMap = new Map<string, { sum: number; count: number; min: number; max: number }>();
  for (const r of rows) {
    const rawCat = r[xColName];
    const catKey = rawCat !== undefined && rawCat !== null && String(rawCat).trim() !== '' ? String(rawCat).trim() : 'Other';
    const val = parseNumberVal(r[yColName]) ?? 1;

    const curr = catMap.get(catKey) || { sum: 0, count: 0, min: Infinity, max: -Infinity };
    curr.sum += val;
    curr.count++;
    curr.min = Math.min(curr.min, val);
    curr.max = Math.max(curr.max, val);
    catMap.set(catKey, curr);
  }

  const entries = Array.from(catMap.entries()).map(([cat, entry]) => {
    let finalVal = entry.sum;
    if (agg === 'avg' || agg === 'mean') finalVal = entry.count ? entry.sum / entry.count : 0;
    else if (agg === 'min') finalVal = entry.min;
    else if (agg === 'max') finalVal = entry.max;
    else if (agg === 'count') finalVal = entry.count;
    return {
      name: cat,
      value: Math.round(finalVal * 100) / 100
    };
  });

  // Sort descending by value
  entries.sort((a, b) => b.value - a.value);
  const dataPoints = entries.slice(0, 15);

  return {
    id: `chart-ask-bar-${Date.now()}`,
    title: spec.title || `${mName} by ${dName}`,
    why: spec.why || `Categorical breakdown of ${mName} grouped by ${dName}.`,
    type: chartType === 'pie' || chartType === 'donut' ? chartType : chartType === 'horizontal_bar' ? 'horizontal_bar' : 'bar',
    xField: xColName,
    yField: yColName,
    unit: ySchema?.unit,
    unitMetadata: ySchema?.unitMetadata,
    isSourceDerivedDimension: true,
    hasMeaningfulLabels: true,
    data: dataPoints
  };
}

export function processAskQuery(
  question: string,
  context: DatasetContext
): AskDataTurn & { answer?: string } {
  const q = question.trim();
  const lower = q.toLowerCase();
  const rows = context.cleanedRows;
  const schemas = context.schema;
  const timeInfo = context.timeDimensions;
  const primaryMetric = context.primaryMetricColumn || (context.measures[0]?.technicalName) || 'Metric';
  const primaryDim = context.primaryDimensionColumn || (context.dimensions[0]?.technicalName) || 'Category';

  const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  // -------------------------------------------------------------------------
  // 0. Out-of-Scope / Unanswerable Query Detection
  // -------------------------------------------------------------------------
  const isOutOfScope = /stock|share price|apple|google|bitcoin|crypto|inflation rate|gdp|weather|forecast for tomorrow|tomorrow's weather|president/i.test(lower) &&
    !schemas.some(s => lower.includes(s.technicalName.toLowerCase()) || lower.includes(s.displayName.toLowerCase()));

  if (isOutOfScope) {
    const text = `### ⚠️ Data Scope Limitation\n\nThe uploaded dataset (${context.sourceMetadata.fileName}) does not contain fields or observations related to this query.\n\n**Available attributes in this dataset:**\n${schemas.map(s => `• **${s.displayName}** (\`${s.technicalName}\`)`).join('\n')}\n\n*Please ask an analytical question concerning the available features listed above.*`;
    return {
      id: `turn-${Date.now()}`,
      who: 'assistant',
      text,
      answer: text,
      timestamp,
      calculationExplanation: 'Query rejected: Required variables are absent from the dataset schema.',
      provenance: {
        toolName: 'unsupported_query',
        sourceColumns: [],
        sampleSize: 0
      }
    };
  }

  // -------------------------------------------------------------------------
  // 1. Specific Column Meaning / Definition Lookup
  // -------------------------------------------------------------------------
  const matchedCol = schemas.find(s => {
    const techLower = s.technicalName.toLowerCase();
    const dispLower = s.displayName.toLowerCase();
    return lower.includes(techLower) || (dispLower.length > 4 && lower.includes(dispLower));
  });

  const isDefinitionQuery = Boolean(
    matchedCol &&
    (lower.includes('definition') || lower.includes('stand for') || lower.includes('tell me about') || lower.includes('explain column') || /^(what is|what are|explain)\s+[`"']?[a-z0-9_]+[`"']?\??$/i.test(q)) &&
    !/forecast|trend|total|average|avg|mean|sum|rank|top|highest|compare|versus|vs|anomal|predict|outlier|chart|graph|plot/i.test(lower)
  );

  if (matchedCol && isDefinitionQuery) {
    const profile = context.profiles.find(p => p.technicalName === matchedCol.technicalName);
    const numProfile = profile?.numeric;

    const tableData = {
      headers: ['Attribute', 'Verified Value / Meaning'],
      rows: [
        ['Technical Field Name', matchedCol.technicalName],
        ['Human Display Name', matchedCol.displayName],
        ['Business Definition', matchedCol.businessMeaning],
        ['Semantic Role', matchedCol.semanticRole],
        ['Data Type', `${matchedCol.physicalType} (${matchedCol.logicalType})`],
        ['Semantic Confidence', `${Math.round(matchedCol.confidence * 100)}% Verified`],
        ...(numProfile ? [
          ['Dataset Mean / Average', numProfile.mean ? `${numProfile.mean.toFixed(2)}` : '—'],
          ['Standard Deviation', numProfile.std ? `${numProfile.std.toFixed(2)}` : '—'],
          ['Range (Min – Max)', `${numProfile.min} – ${numProfile.max}`]
        ] : [])
      ]
    };

    return {
      id: `turn-${Date.now()}`,
      who: 'assistant',
      text: `### 📌 Understanding \`${matchedCol.technicalName}\`\n\n**Business Name:** **${matchedCol.displayName}**\n\n**Business Meaning:**\n${matchedCol.businessMeaning}\n\n**Semantic Role:** \`${matchedCol.semanticRole}\` (Confidence: **${Math.round(matchedCol.confidence * 100)}%**)`,
      timestamp,
      tableData,
      calculationExplanation: 'Retrieved exact humanized semantic mapping and statistical profiling from DatasetContext.',
      provenance: {
        toolName: 'resolve_semantic_column',
        sourceColumns: [matchedCol.technicalName],
        sampleSize: rows.length
      }
    };
  }

  // -------------------------------------------------------------------------
  // 2. Data Dictionary / All Columns Overview
  // -------------------------------------------------------------------------
  if (/dictionary|all column|list columns|definitions|variable/i.test(lower)) {
    const dictResult = executeDataWhizTool('get_data_dictionary', {}, context);
    const tableData = {
      headers: ['Technical Column', 'Human Display Name', 'Semantic Role', 'Business Meaning'],
      rows: (dictResult.data as any[]).slice(0, 15).map(s => [s.technicalName, s.displayName, s.role, s.meaning])
    };

    return {
      id: `turn-${Date.now()}`,
      who: 'assistant',
      text: `### 📖 Data Dictionary & Semantic Catalogue\nHere is the verified semantic breakdown of technical columns mapped to business definitions:`,
      timestamp,
      tableData,
      calculationExplanation: 'Retrieved verified data dictionary from semantic understanding engine.',
      provenance: {
        toolName: 'get_data_dictionary',
        sourceColumns: schemas.map(s => s.technicalName),
        sampleSize: rows.length
      }
    };
  }

  // -------------------------------------------------------------------------
  // 3. Visual Chart & Graph Request Query (e.g. "show graph of revenue by region", "plot line chart")
  // -------------------------------------------------------------------------
  const isGraphRequested = /chart|graph|plot|visual|visualize|histogram|diagram|show me (a |the )?(trend|breakdown|distribution|curve)/i.test(lower) ||
    /breakdown\s+by|grouped\s+by|distribution\s+of|split\s+by/i.test(lower);

  if (isGraphRequested) {
    const numSchemas = schemas.filter(s => s.physicalType === 'number' || s.logicalType.startsWith('measure'));
    const matchedMeasure = numSchemas.find(s => {
      const tech = s.technicalName.toLowerCase();
      const disp = s.displayName.toLowerCase();
      const base = tech.replace(/_hz|_usd|_eur|_pct|_c|_kg|_imp|_clk/gi, '');
      return lower.includes(tech) || lower.includes(disp) || (base.length >= 3 && lower.includes(base));
    }) || schemas.find(s => s.technicalName === primaryMetric) || numSchemas[0];

    const mCol = matchedMeasure?.technicalName || primaryMetric;
    const mSchema = schemas.find(s => s.technicalName === mCol);
    const mDisplayName = mSchema?.displayName || mCol;

    const nonMeasureSchemas = schemas.filter(s => s.technicalName !== mCol && s.logicalType !== 'identifier');
    let matchedDim = nonMeasureSchemas.find(s => {
      const tech = s.technicalName.toLowerCase();
      const disp = s.displayName.toLowerCase();
      const base = tech.replace(/_id|_code|_key|_name/gi, '');
      return lower.includes(tech) || lower.includes(disp) || (base.length >= 3 && lower.includes(base));
    });

    if (!matchedDim) {
      if (/trend|time|over time|monthly|daily|yearly|trajectory|date|timeline/i.test(lower) && context.primaryDateColumn) {
        matchedDim = schemas.find(s => s.technicalName === context.primaryDateColumn);
      } else {
        matchedDim = schemas.find(s => s.technicalName === primaryDim) || schemas.find(s => s.physicalType === 'string' || s.logicalType.startsWith('dimension'));
      }
    }

    const dCol = matchedDim?.technicalName || primaryDim;
    const dDisplayName = matchedDim?.displayName || dCol;

    let chartType: 'bar' | 'line' | 'pie' | 'donut' | 'horizontal_bar' | 'scatter' | 'area' = 'bar';
    if (/pie|donut/i.test(lower)) chartType = 'pie';
    else if (/line|trend|trajectory|timeline|over time/i.test(lower) || matchedDim?.physicalType === 'date' || matchedDim?.logicalType === 'date') chartType = 'line';
    else if (/area/i.test(lower)) chartType = 'area';
    else if (/scatter/i.test(lower)) chartType = 'scatter';
    else if (/horizontal/i.test(lower) || /ranking/i.test(lower)) chartType = 'horizontal_bar';

    let aggFunc = 'sum';
    if (/avg|average|mean/i.test(lower)) aggFunc = 'avg';
    else if (/count|number of|frequency/i.test(lower)) aggFunc = 'count';
    else if (/min|minimum/i.test(lower)) aggFunc = 'min';
    else if (/max|maximum|peak/i.test(lower)) aggFunc = 'max';

    const generatedChart = buildChartForSpec(rows, schemas, {
      type: chartType,
      title: `${mDisplayName} by ${dDisplayName}`,
      xField: dCol,
      yField: mCol,
      agg: aggFunc,
      why: `Visual representation of ${mDisplayName.toLowerCase()} grouped by ${dDisplayName.toLowerCase()}.`
    });

    if (generatedChart && generatedChart.data && generatedChart.data.length > 0) {
      const topItem = generatedChart.data[0];
      const totalAgg = generatedChart.data.reduce((acc, d) => acc + (typeof d.value === 'number' ? d.value : 0), 0);

      const tableData = {
        headers: [dDisplayName, `Aggregated ${mDisplayName}`, 'Share %'],
        rows: generatedChart.data.slice(0, 10).map((d: any) => {
          const share = totalAgg > 0 ? ((d.value / totalAgg) * 100).toFixed(1) : '—';
          return [d.name, formatMetricValue(d.value, mSchema?.unitMetadata), `${share}%`];
        })
      };

      return {
        id: `turn-${Date.now()}`,
        who: 'assistant',
        text: `### 📊 Visual Breakdown: ${mDisplayName} by ${dDisplayName}\n\nHere is the interactive **${chartType.replace('_', ' ')}** visualization for **${mDisplayName}** grouped across **${dDisplayName}**.\n\n• **Leading Segment:** **${topItem.name}** with **${formatMetricValue(topItem.value, mSchema?.unitMetadata)}** (${totalAgg > 0 ? ((topItem.value / totalAgg) * 100).toFixed(1) : '—'}% share).\n• **Total Aggregated Volume:** **${formatMetricValue(totalAgg, mSchema?.unitMetadata)}** across ${generatedChart.data.length} distinct segments.`,
        timestamp,
        chart: generatedChart,
        tableData,
        calculationExplanation: `Deterministic aggregation: ${aggFunc.toUpperCase()}(${mCol}) grouped by ${dCol} across ${rows.length.toLocaleString()} verified rows.`,
        provenance: {
          toolName: 'build_dynamic_chart',
          sourceColumns: [mCol, dCol],
          sampleSize: rows.length,
          aggregation: aggFunc
        }
      };
    }
  }

  // -------------------------------------------------------------------------
  // 4. Ranking & Top-N Query (e.g. "which segment generated most revenue")
  // -------------------------------------------------------------------------
  if (/top|highest|most|best|rank|leader|worst|lowest|which/i.test(lower) && !/average|mean|avg|correlation/i.test(lower)) {
    const targetMetric = schemas.find(s => (s.physicalType === 'number' || s.logicalType.startsWith('measure')) && (lower.includes(s.technicalName.toLowerCase()) || lower.includes(s.displayName.toLowerCase()) || lower.includes(s.technicalName.replace(/_hz|_usd|_pct|_c/gi, '').toLowerCase())))?.technicalName || primaryMetric;
    
    const targetDim = schemas.find(s => {
      const baseName = s.technicalName.toLowerCase().replace(/_id|_key|_code|_name/g, '');
      return (lower.includes(s.technicalName.toLowerCase()) || lower.includes(s.displayName.toLowerCase()) || (baseName.length >= 3 && lower.includes(baseName)));
    })?.technicalName || schemas.find(s => s.physicalType === 'string' || s.semanticRole === 'entity' || s.logicalType.startsWith('dimension'))?.technicalName || primaryDim;

    const rankRes = executeDataWhizTool('rank', { metric: targetMetric, dimension: targetDim, limit: 5 }, context);
    if (rankRes.validationStatus !== 'INVALID' && rankRes.data?.length > 0) {
      const top = rankRes.data[0];
      const mName = context.humanFriendlyNames[targetMetric] || targetMetric;
      const dName = context.humanFriendlyNames[targetDim] || targetDim;
      const metricSchema = schemas.find(s => s.technicalName === targetMetric);

      const chart: DynamicChartSpec = {
        id: `chart-rank-${Date.now()}`,
        title: `Top ${dName} by ${mName}`,
        why: `Pareto ranking of top contributors for ${mName.toLowerCase()}.`,
        type: 'horizontal_bar',
        xField: targetDim,
        yField: targetMetric,
        unit: metricSchema?.unit,
        unitMetadata: metricSchema?.unitMetadata,
        isSourceDerivedDimension: true,
        hasMeaningfulLabels: true,
        data: rankRes.data.map((r: any) => ({ name: r.entity, value: r.value }))
      };

      const tableData = {
        headers: ['Rank', dName, `Total ${mName}`, 'Share %'],
        rows: rankRes.data.map((r: any) => [`#${r.rank}`, r.entity, formatMetricValue(r.value, metricSchema?.unitMetadata), `${r.sharePct}%`])
      };

      return {
        id: `turn-${Date.now()}`,
        who: 'assistant',
        text: `### 🏆 Top ${dName} Ranking\n\n**${top.entity}** generated the highest **${mName.toLowerCase()}** at **${formatMetricValue(top.value, metricSchema?.unitMetadata)}**, representing **${top.sharePct}%** of the total aggregate volume.`,
        timestamp,
        chart,
        tableData,
        calculationExplanation: `Deterministic Pareto ranking: SUM(${targetMetric}) grouped by ${targetDim}.`,
        provenance: {
          toolName: 'rank',
          sourceColumns: [targetMetric, targetDim],
          sampleSize: rows.length,
          aggregation: 'sum'
        }
      };
    }
  }

  // -------------------------------------------------------------------------
  // 5. Comparison Query (e.g. "compare A vs B" or "Europe vs North")
  // -------------------------------------------------------------------------
  if (/compare|vs|versus|difference|between/i.test(lower) && !/correlation|scatter/i.test(lower)) {
    const targetMetric = schemas.find(s => s.physicalType === 'number' && (lower.includes(s.technicalName.toLowerCase()) || lower.includes(s.displayName.toLowerCase())))?.technicalName || primaryMetric;
    const targetDim = schemas.find(s => s.logicalType.startsWith('dimension') && (lower.includes(s.technicalName.toLowerCase()) || lower.includes(s.displayName.toLowerCase())))?.technicalName || primaryDim;

    const uniqueVals = Array.from(new Set(rows.map(r => String(r[targetDim] ?? '')))).filter(Boolean);
    const mentioned = uniqueVals.filter(v => lower.includes(v.toLowerCase()));

    if (mentioned.length >= 2) {
      const compRes = executeDataWhizTool('compare', { metric: targetMetric, dimension: targetDim, cohortA: mentioned[0], cohortB: mentioned[1] }, context);
      if (compRes.validationStatus !== 'INVALID') {
        const mName = context.humanFriendlyNames[targetMetric] || targetMetric;
        const metricSchema = schemas.find(s => s.technicalName === targetMetric);
        const d = compRes.data;
        const isPos = d.difference >= 0;

        return {
          id: `turn-${Date.now()}`,
          who: 'assistant',
          text: `### ⚖️ Comparison: **${mentioned[0]}** vs **${mentioned[1]}**\n\n- **${mentioned[0]}**: Total ${mName} = **${formatMetricValue(d.cohortA.sum, metricSchema?.unitMetadata)}** (Avg: ${formatMetricValue(d.cohortA.avg, metricSchema?.unitMetadata)})\n- **${mentioned[1]}**: Total ${mName} = **${formatMetricValue(d.cohortB.sum, metricSchema?.unitMetadata)}** (Avg: ${formatMetricValue(d.cohortB.avg, metricSchema?.unitMetadata)})\n\n**Net Variance:** ${mentioned[0]} is **${isPos ? '+' : ''}${formatMetricValue(d.difference, metricSchema?.unitMetadata)}** (${isPos ? '+' : ''}${d.percentageDelta}%) relative to ${mentioned[1]}.`,
          timestamp,
          calculationExplanation: `Deterministic cohort comparison between '${mentioned[0]}' and '${mentioned[1]}' across ${targetMetric}.`,
          provenance: {
            toolName: 'compare',
            sourceColumns: [targetMetric, targetDim],
            sampleSize: rows.length
          }
        };
      }
    }
  }

  // -------------------------------------------------------------------------
  // 6. Forecasting & Predictive Query
  // -------------------------------------------------------------------------
  if (/forecast|predict|project|future|outlook/i.test(lower)) {
    if (!context.capabilities.time_series_forecasting?.supported || !timeInfo) {
      return {
        id: `turn-${Date.now()}`,
        who: 'assistant',
        text: `### ⚠️ Forecasting Unsupported\n\nTime-series forecasting cannot be performed on this dataset because: **${context.capabilities.time_series_forecasting?.reason || 'Insufficient chronological observation periods.'}**`,
        timestamp,
        calculationExplanation: 'Capability validation rejected time-series forecasting prerequisite check.'
      };
    }

    const fcRes = executeDataWhizTool('forecast', { metric: primaryMetric, dateColumn: timeInfo.column, horizon: 6 }, context);
    if (fcRes.validationStatus !== 'INVALID' && fcRes.data) {
      return {
        id: `turn-${Date.now()}`,
        who: 'assistant',
        text: `### 📈 Predictive Forecast Projections\n\n${fcRes.data.summary}`,
        timestamp,
        chart: fcRes.data.chartSpec,
        calculationExplanation: 'Linear trend regression with 80% empirical prediction intervals.',
        provenance: {
          toolName: 'forecast',
          sourceColumns: [primaryMetric, timeInfo.column],
          sampleSize: rows.length
        }
      };
    }
  }

  // -------------------------------------------------------------------------
  // 7. Anomaly & Outlier Query
  // -------------------------------------------------------------------------
  if (/anomaly|outlier|unusual|spike|irregular/i.test(lower)) {
    const anomRes = executeDataWhizTool('anomaly_detection', { metric: primaryMetric }, context);
    if (anomRes.validationStatus !== 'INVALID' && anomRes.data) {
      const mName = context.humanFriendlyNames[primaryMetric] || primaryMetric;
      const metricSchema = schemas.find(s => s.technicalName === primaryMetric);
      return {
        id: `turn-${Date.now()}`,
        who: 'assistant',
        text: `### 🔍 Anomaly Detection Report\n\nEvaluated **${mName}** using IQR outlier boundaries: Found **${anomRes.data.anomaliesCount}** statistical outlier point(s) exceeding valid range [${formatMetricValue(anomRes.data.lowerBound, metricSchema?.unitMetadata)}, ${formatMetricValue(anomRes.data.upperBound, metricSchema?.unitMetadata)}].`,
        timestamp,
        calculationExplanation: 'Tukey IQR (1.5x) statistical boundary outlier detection.',
        provenance: {
          toolName: 'anomaly_detection',
          sourceColumns: [primaryMetric],
          sampleSize: rows.length
        }
      };
    }
  }

  // -------------------------------------------------------------------------
  // 8. Correlation & Relationship Query
  // -------------------------------------------------------------------------
  if (/correlation|correlated|correlate|relationship|associate|related|linear|scatter/i.test(lower)) {
    const numSchemas = schemas.filter(s => s.physicalType === 'number' || s.logicalType.startsWith('measure'));
    const matchedMeasures = numSchemas.filter(s => {
      const tech = s.technicalName.toLowerCase();
      const disp = s.displayName.toLowerCase();
      const base = tech.replace(/_hz|_usd|_eur|_pct|_c|_kg/gi, '');
      return lower.includes(tech) || lower.includes(disp) || (base.length >= 3 && lower.includes(base));
    });

    const metricA = matchedMeasures[0]?.technicalName || context.measures[0]?.technicalName;
    const metricB = matchedMeasures[1]?.technicalName || (context.measures.length > 1 ? context.measures[1]?.technicalName : undefined);

    if (metricA && metricB && metricA !== metricB) {
      const corrRes = executeDataWhizTool('correlation', { metricA, metricB }, context);
      if (corrRes.validationStatus !== 'INVALID') {
        const nameA = context.humanFriendlyNames[metricA] || metricA;
        const nameB = context.humanFriendlyNames[metricB] || metricB;
        const r = corrRes.data.coefficient;
        const direction = r >= 0 ? 'positive' : 'negative / inverse';

        return {
          id: `turn-${Date.now()}`,
          who: 'assistant',
          text: `### 📈 Bivariate Correlation Analysis\n\n**${nameA}** and **${nameB}** exhibit a **${direction} correlation of r = ${r}** across ${corrRes.data.sampleSize} observations.\n\n*(Note: Correlation denotes mathematical co-variation, not causal direction.)*`,
          timestamp,
          calculationExplanation: `Bivariate Pearson correlation calculation between ${metricA} and ${metricB}.`,
          provenance: {
            toolName: 'correlation',
            sourceColumns: [metricA, metricB],
            sampleSize: corrRes.data.sampleSize
          }
        };
      }
    }
  }

  // -------------------------------------------------------------------------
  // 9. Grounded Field & Aggregation Resolver
  // -------------------------------------------------------------------------
  const numSchemas = schemas.filter(s => s.physicalType === 'number' || s.logicalType.startsWith('measure'));
  const matchedField = numSchemas.find(s => lower.includes(s.technicalName.toLowerCase()) || lower.includes(s.displayName.toLowerCase())) ||
    schemas.find(s => s.technicalName === primaryMetric);

  const targetColName = matchedField?.technicalName || primaryMetric;
  const targetSchema = schemas.find(s => s.technicalName === targetColName);

  let reqAgg = 'sum';
  if (/average|mean|avg|typical/i.test(lower)) reqAgg = 'avg';
  else if (/min|minimum|lowest|bottom/i.test(lower)) reqAgg = 'min';
  else if (/max|maximum|highest|peak/i.test(lower)) reqAgg = 'max';
  else if (/count|total records|number of/i.test(lower)) reqAgg = 'count';

  const aggRes = executeDataWhizTool('aggregate', { metric: targetColName, aggFunction: reqAgg }, context);
  const mName = context.humanFriendlyNames[targetColName] || targetColName;
  const appliedAgg = aggRes.aggregation || reqAgg;
  const aggTitle = appliedAgg === 'avg' || appliedAgg === 'mean' ? 'Average' : appliedAgg === 'min' ? 'Minimum' : appliedAgg === 'max' ? 'Maximum' : appliedAgg === 'count' ? 'Count' : 'Total';

  return {
    id: `turn-${Date.now()}`,
    who: 'assistant',
    text: `### 📊 Analytical Summary\n\n**${aggTitle} ${mName}** across the dataset is **${formatMetricValue(aggRes.data.value, targetSchema?.unitMetadata)}** (calculated over ${aggRes.data.count || rows.length} records).`,
    timestamp,
    calculationExplanation: `Deterministic calculation: ${appliedAgg.toUpperCase()}(${targetColName}) across all validated rows.`,
    provenance: {
      toolName: 'aggregate',
      sourceColumns: [targetColName],
      sampleSize: rows.length,
      aggregation: appliedAgg
    }
  };
}

export const answerAskDataQuery = processAskQuery;
