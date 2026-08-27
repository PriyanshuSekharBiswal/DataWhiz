// Decision Intelligence & Strategic Entity Prioritization Engine
// Multi-factor scoring across growth, volume, margin, and risk for validated commercial entities

import { InvestmentRecommendation, ColumnSchema, DatasetContext } from '@/lib/types';
import { parseNumberVal, safeIsoDate } from '@/lib/schema/schemaDetector';

export function evaluateInvestmentPriorities(
  schemas: ColumnSchema[],
  rows: Record<string, any>[],
  context?: DatasetContext
): InvestmentRecommendation[] {
  // Prerequisite check: Only evaluate when commercial portfolio or product investment capability is supported
  if (context) {
    const isCommercial = context.domain?.primaryDomain?.toLowerCase().includes('commercial') ||
      context.domain?.primaryDomain?.toLowerCase().includes('retail') ||
      context.domain?.primaryDomain?.toLowerCase().includes('sales') ||
      context.archetype === 'commercial_relational' ||
      context.archetype === 'marketing_media_mix';

    const isCapabilitySupported = context.capabilities?.product_investment_scoring?.supported === true;

    if (!isCommercial && !isCapabilitySupported) {
      return [];
    }
  }

  const entityCol = schemas.find(s => s.semanticRole === 'product_attribute' || (s.logicalType.startsWith('dimension') && /product|item|commodity|channel|service|store|sku|category|brand/i.test(s.technicalName)))?.technicalName;
  const revenueCol = schemas.find(s => s.semanticRole === 'primary_metric' && /revenue|sales|income|amount|gmv/i.test(s.technicalName))?.technicalName || schemas.find(s => s.logicalType === 'measure_currency')?.technicalName;
  const quantityCol = schemas.find(s => /quantity|units|volume|clicks|impressions|orders|qty/i.test(s.technicalName) && s.physicalType === 'number')?.technicalName;
  const ratingCol = schemas.find(s => /rating|score|margin|discount|roi|roas/i.test(s.technicalName) && s.physicalType === 'number')?.technicalName;
  const dateCol = schemas.find(s => s.logicalType === 'date' || s.physicalType === 'date' || s.semanticRole === 'timestamp')?.technicalName;

  if (!entityCol || !revenueCol) {
    return [];
  }

  // Group rows by entity
  const entityGroups = new Map<string, Record<string, any>[]>();
  for (const r of rows) {
    const e = String(r[entityCol] ?? '').trim();
    if (!e) continue;
    const list = entityGroups.get(e) || [];
    list.push(r);
    entityGroups.set(e, list);
  }

  const recommendations: InvestmentRecommendation[] = [];
  const entityTotals: { entity: string; revenue: number; quantity: number; avgRating: number; growthPct: number }[] = [];

  for (const [entity, eRows] of entityGroups.entries()) {
    const totalRev = eRows.map(r => parseNumberVal(r[revenueCol]) || 0).reduce((a, b) => a + b, 0);
    const totalQty = quantityCol ? eRows.map(r => parseNumberVal(r[quantityCol]) || 0).reduce((a, b) => a + b, 0) : eRows.length;
    const avgRating = ratingCol ? eRows.map(r => parseNumberVal(r[ratingCol]) || 4.0).reduce((a, b) => a + b, 0) / eRows.length : 4.5;

    // Estimate chronological growth using real dates if available
    let growthPct = 0;
    if (dateCol && eRows.length >= 4) {
      const dateMap = new Map<string, number>();
      for (const r of eRows) {
        const iso = safeIsoDate(r[dateCol]);
        const v = parseNumberVal(r[revenueCol]) || 0;
        if (iso) dateMap.set(iso, (dateMap.get(iso) || 0) + v);
      }
      const sortedDates = [...dateMap.keys()].sort();
      if (sortedDates.length >= 2) {
        const early = dateMap.get(sortedDates[0]) || 0;
        const late = dateMap.get(sortedDates[sortedDates.length - 1]) || 0;
        if (early > 0) growthPct = ((late - early) / early) * 100;
      }
    } else if (eRows.length >= 2) {
      const half = Math.floor(eRows.length / 2);
      const earlyRev = eRows.slice(0, half).map(r => parseNumberVal(r[revenueCol]) || 0).reduce((a, b) => a + b, 0);
      const lateRev = eRows.slice(half).map(r => parseNumberVal(r[revenueCol]) || 0).reduce((a, b) => a + b, 0);
      if (earlyRev > 0) growthPct = ((lateRev - earlyRev) / earlyRev) * 100;
    }

    entityTotals.push({
      entity,
      revenue: totalRev,
      quantity: totalQty,
      avgRating,
      growthPct
    });
  }

  if (!entityTotals.length) return [];

  // Compute maximums for relative scaling
  const maxRev = Math.max(...entityTotals.map(e => e.revenue)) || 1;
  const maxQty = Math.max(...entityTotals.map(e => e.quantity)) || 1;
  const maxGrowth = Math.max(...entityTotals.map(e => Math.max(0, e.growthPct))) || 1;

  // Adaptive Weights calculation:
  const hasDates = Boolean(dateCol);
  const hasRating = Boolean(ratingCol);
  const wRevenue = hasDates ? (hasRating ? 0.35 : 0.45) : (hasRating ? 0.50 : 0.65);
  const wGrowth = hasDates ? (hasRating ? 0.30 : 0.35) : 0.0;
  const wMargin = hasRating ? 0.20 : 0.0;
  const wVolume = hasDates ? (hasRating ? 0.15 : 0.20) : (hasRating ? 0.30 : 0.35);

  for (const item of entityTotals) {
    const revenueScore = (item.revenue / maxRev) * 100;
    const growthScore = Math.max(0, Math.min(100, (item.growthPct / Math.max(10, maxGrowth)) * 100));
    const marginScore = Math.min(100, (item.avgRating / 5.0) * 100);
    const volumeScore = (item.quantity / maxQty) * 100;

    const compositeScore = Math.round(
      revenueScore * wRevenue +
      growthScore * wGrowth +
      marginScore * wMargin +
      volumeScore * wVolume
    );

    let recommendation: InvestmentRecommendation['recommendation'] = 'Hold / Monitor';
    if (compositeScore >= 75) recommendation = 'Strong Buy / Invest';
    else if (compositeScore >= 55) recommendation = 'Moderate Invest';
    else if (compositeScore < 35) recommendation = 'Re-evaluate / Divest';

    const reasons: string[] = [];
    if (hasDates && growthScore > 60) reasons.push(`Exceptional demand acceleration with +${Math.round(item.growthPct)}% growth.`);
    if (revenueScore > 70) reasons.push(`Substantial revenue market share (${Math.round(item.revenue).toLocaleString()}).`);
    if (hasRating && marginScore > 75) reasons.push(`High satisfaction and efficiency score (${Math.round(marginScore)}/100).`);

    const risks: string[] = [];
    if (hasDates && item.growthPct < 0) risks.push(`Volume deceleration (${Math.round(item.growthPct)}% drop).`);
    if (volumeScore < 15) risks.push('Narrow transaction concentration relative to total dataset.');

    recommendations.push({
      entity: item.entity,
      investmentScore: compositeScore,
      recommendation,
      scoreBreakdown: {
        growthScore: Math.round(growthScore),
        marginScore: Math.round(marginScore),
        trendScore: Math.round(revenueScore),
        riskScore: Math.round(100 - volumeScore)
      },
      reasons: reasons.length > 0 ? reasons : ['Consistent baseline commercial performance.'],
      risks: risks.length > 0 ? risks : ['Market saturation and competitor price changes.'],
      evidence: `Total ${Math.round(item.revenue).toLocaleString()} across ${item.quantity.toLocaleString()} units with ${Math.round(item.growthPct)}% velocity.`,
      confidence: 0.92,
      limitations: 'Scoring assumes stationary market distribution and stable unit volume.'
    });
  }

  recommendations.sort((a, b) => b.investmentScore - a.investmentScore);
  return recommendations;
}
