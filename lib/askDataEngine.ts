// Ask Your Data Engine: Agentic Tool-Grounded Analytics, Multi-Step Execution & Verified Narrative Synthesis

import { DatasetContext, AskDataTurn, DynamicChartSpec, ColumnSchema } from '@/lib/types';
import { executeDataWhizTool } from '@/lib/ai/tools/toolRegistry';
import { parseUserIntent } from '@/lib/intent/intentParser';
import { evaluateInvestmentPriorities } from '@/lib/analytics/decisionEngine';
import { humanizeColumnName } from '@/lib/semantics/columnHumanizer';
import { parseNumberVal } from '@/lib/schema/schemaDetector';
import { formatMetricValue } from '@/lib/formatting/numberFormatter';

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
    !/forecast|trend|total|average|avg|mean|sum|rank|top|highest|compare|versus|vs|anomal|predict|outlier/i.test(lower)
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
  // 3. Ranking & Top-N Query (e.g. "which segment generated most revenue")
  // -------------------------------------------------------------------------
  if (/top|highest|most|best|rank|leader|worst|lowest|which/i.test(lower) && !/average|mean|avg|correlation/i.test(lower)) {
    const targetMetric = schemas.find(s => (s.physicalType === 'number' || s.logicalType.startsWith('measure')) && (lower.includes(s.technicalName.toLowerCase()) || lower.includes(s.displayName.toLowerCase()) || lower.includes(s.technicalName.replace(/_hz|_usd|_pct|_c/gi, '').toLowerCase())))?.technicalName || primaryMetric;
    
    // Find matching dimension by checking exact name, token without _id/_code, or fallback to first categorical/entity column
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
  // 4. Comparison Query (e.g. "compare A vs B" or "Europe vs North")
  // -------------------------------------------------------------------------
  if (/compare|vs|versus|difference|between/i.test(lower) && !/correlation|scatter/i.test(lower)) {
    const targetMetric = schemas.find(s => s.physicalType === 'number' && (lower.includes(s.technicalName.toLowerCase()) || lower.includes(s.displayName.toLowerCase())))?.technicalName || primaryMetric;
    const targetDim = schemas.find(s => s.logicalType.startsWith('dimension') && (lower.includes(s.technicalName.toLowerCase()) || lower.includes(s.displayName.toLowerCase())))?.technicalName || primaryDim;

    // Find mentioned category values
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
  // 5. Forecasting & Predictive Query
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
  // 6. Anomaly & Outlier Query
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
  // 7. Correlation & Relationship Query
  // -------------------------------------------------------------------------
  if (/correlation|relationship|associate|related|linear|scatter/i.test(lower)) {
    const numSchemas = schemas.filter(s => s.physicalType === 'number' || s.logicalType.startsWith('measure'));
    const matchedMeasures = numSchemas.filter(s => lower.includes(s.technicalName.toLowerCase()) || lower.includes(s.displayName.toLowerCase()));

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
  // 8. Grounded Field & Aggregation Resolver
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
