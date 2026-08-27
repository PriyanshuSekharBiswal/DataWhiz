// Specialized Analytics Engine: Tailored analytical modeling for Marketing MMM, Churn, and Manufacturing Quality

import {
  DatasetContext,
  DatasetUnderstandingReport,
  SpecializedAnalysisResult,
  MediaChannelDriver
} from '@/lib/types';
import { parseNumberVal } from '@/lib/schema/schemaDetector';
import { decodeCrypticColumn } from '@/lib/semantics/crypticDecoder';
import { evaluateClassification } from './classificationEngine';

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

export function runSpecializedAnalysis(
  context: DatasetContext,
  report: DatasetUnderstandingReport
): SpecializedAnalysisResult {
  const archetype = report.archetype;
  const rows = context.cleanedRows;
  const numRows = rows.length;

  if (archetype === 'marketing_media_mix') {
    const targetMetric = report.primaryOutcome || 'sales';
    const explanatoryCols = report.explanatoryVariables;

    const salesVals = rows.map(r => parseNumberVal(r[targetMetric]) || 0);
    const totalSales = salesVals.reduce((a, b) => a + b, 0);
    const avgWeeklySales = totalSales / Math.max(1, numRows);

    // Analyze Media Drivers
    const mediaDrivers: MediaChannelDriver[] = [];
    let grossAllMediaVolume = 0;

    for (const col of explanatoryCols) {
      const vals = rows.map(r => parseNumberVal(r[col]) || 0);
      const totalVol = vals.reduce((a, b) => a + b, 0);
      grossAllMediaVolume += totalVol;

      const corr = computePearsonCorrelation(vals, salesVals);
      const decoded = decodeCrypticColumn(col);

      let elasticityCategory: MediaChannelDriver['elasticityCategory'] = 'Low / Saturated';
      if (corr >= 0.45) elasticityCategory = 'High Driver';
      else if (corr >= 0.20) elasticityCategory = 'Moderate Driver';
      else if (corr < 0) elasticityCategory = 'Negative / Inverse';

      mediaDrivers.push({
        channelCode: col,
        displayName: decoded.decodedName,
        channelFamily: decoded.channelFamily || 'Digital Media',
        unit: decoded.unit,
        totalVolume: totalVol,
        volumeSharePct: 0, // Will compute below
        correlationWithSales: corr,
        elasticityCategory,
        avgWeeklyVolume: totalVol / Math.max(1, numRows)
      });
    }

    // Compute volume shares
    for (const d of mediaDrivers) {
      d.volumeSharePct = grossAllMediaVolume > 0
        ? Math.round((d.totalVolume / grossAllMediaVolume) * 1000) / 10
        : 0;
    }

    // Sort by correlation descending, then volume
    mediaDrivers.sort((a, b) => b.correlationWithSales - a.correlationWithSales);

    // Channel Family Aggregations
    const familyMap = new Map<string, number>();
    for (const d of mediaDrivers) {
      familyMap.set(d.channelFamily, (familyMap.get(d.channelFamily) || 0) + d.totalVolume);
    }
    const topChannelFamilyShare = Array.from(familyMap.entries()).map(([family, volume]) => ({
      family,
      volume,
      sharePct: grossAllMediaVolume > 0 ? Math.round((volume / grossAllMediaVolume) * 1000) / 10 : 0
    })).sort((a, b) => b.volume - a.volume);

    // Search vs Social Comparison
    const searchDrivers = mediaDrivers.filter(d => /search|srh/i.test(d.channelFamily) || /srh/i.test(d.channelCode));
    const socialDrivers = mediaDrivers.filter(d => /social|soc/i.test(d.channelFamily) || /soc/i.test(d.channelCode));

    const searchVolume = searchDrivers.reduce((a, b) => a + b.totalVolume, 0);
    const socialVolume = socialDrivers.reduce((a, b) => a + b.totalVolume, 0);
    const searchCorr = searchDrivers.length > 0 ? searchDrivers[0].correlationWithSales : 0;
    const socialCorr = socialDrivers.length > 0 ? socialDrivers[0].correlationWithSales : 0;

    // Efficiency Rankings
    const efficiencyRankings = mediaDrivers.slice(0, 5).map((d, i) => ({
      channel: d.displayName,
      score: Math.round((d.correlationWithSales * 0.6 + Math.min(1, d.totalVolume / 1000000) * 0.4) * 100),
      rationale: `Rank #${i + 1}: r=${d.correlationWithSales} correlation with ${targetMetric}, delivering ${(d.totalVolume).toLocaleString()} ${d.unit}.`
    }));

    return {
      archetype,
      marketingMmm: {
        targetMetric,
        totalSales,
        avgWeeklySales,
        mediaDrivers,
        topChannelFamilyShare,
        searchVsSocialComparison: {
          searchVolume,
          socialVolume,
          searchCorr,
          socialCorr
        },
        efficiencyRankings
      }
    };
  }

  // Churn classification
  if (archetype === 'customer_churn') {
    const churnCol = context.schema.find(s => /churn/i.test(s.technicalName))?.technicalName || 'Churn';
    const classReport = evaluateClassification(churnCol, context.schema, rows);

    return {
      archetype,
      churnClassification: {
        targetMetric: churnCol,
        overallChurnRate: classReport?.baselineRate || 0,
        highRiskCohorts: classReport?.highRiskCohorts || [],
        topRiskDrivers: (classReport?.drivers || []).map(d => ({
          feature: d.feature,
          importanceScore: d.importance,
          direction: d.highRiskCondition
        }))
      }
    };
  }

  return {
    archetype
  };
}
