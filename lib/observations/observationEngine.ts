// AI Observation Engine: Synthesizes validated findings into executive narrative observations
// Strictly separates FACT vs INTERPRETATION vs HYPOTHESIS

import { Finding, AIObservation, DatasetContext } from '@/lib/types';

export function synthesizeObservations(
  findings: Finding[],
  context: DatasetContext
): AIObservation[] {
  const observations: AIObservation[] = [];

  for (const f of findings) {
    if (f.type === 'growth' || f.type === 'decline') {
      const isGrowth = f.type === 'growth';
      const fact = `${f.metric} ${isGrowth ? 'increased' : 'decreased'} by ${Math.abs(f.percentageChange || 0)}% (current: ${typeof f.value === 'number' ? f.value.toLocaleString() : f.value} vs prior: ${typeof f.comparisonValue === 'number' ? f.comparisonValue.toLocaleString() : f.comparisonValue}).`;
      const interpretation = `The sequential trajectory reflects ${isGrowth ? 'operational expansion and positive momentum' : 'periodic contraction relative to historical baseline'}.`;
      const hypothesis = isGrowth ? 'Momentum may be sustained if volume drivers remain consistent across active segments.' : 'Contraction may warrant review of underlying segment drivers or seasonal shifts.';

      observations.push({
        id: `obs-${f.id}`,
        findingId: f.id,
        title: `${f.metric} ${isGrowth ? 'Growth Trajectory' : 'Contraction Alert'}`,
        text: `${fact} ${interpretation}`,
        fact,
        interpretation,
        hypothesis,
        supportingMetrics: [
          { label: 'Current Value', value: typeof f.value === 'number' ? f.value.toLocaleString() : f.value },
          { label: 'Prior Benchmark', value: typeof f.comparisonValue === 'number' ? f.comparisonValue.toLocaleString() : String(f.comparisonValue || '—') },
          { label: 'Delta', value: `${isGrowth ? '+' : ''}${f.percentageChange}%` }
        ],
        impactLevel: isGrowth ? 'positive' : 'negative',
        confidenceNote: 'Calculated directly from deterministic chronological aggregation.'
      });
    } else if (f.type === 'concentration') {
      const fact = `'${f.dimension}' contributes ${f.percentageChange}% of total aggregate ${f.metric.toLowerCase()} (${typeof f.value === 'number' ? f.value.toLocaleString() : f.value}).`;
      const interpretation = `High categorical concentration indicates that '${f.dimension}' serves as the primary operational anchor.`;
      const hypothesis = 'Heavy dependency on a single segment introduces concentration risk if market conditions shift.';

      observations.push({
        id: `obs-${f.id}`,
        findingId: f.id,
        title: `Categorical Concentration: ${f.dimension || 'Leading Entity'}`,
        text: `${fact} ${interpretation}`,
        fact,
        interpretation,
        hypothesis,
        supportingMetrics: [
          { label: 'Anchor Entity', value: f.dimension || 'Leading Group' },
          { label: 'Volume Share', value: `${f.percentageChange}%` },
          { label: 'Aggregate Value', value: typeof f.value === 'number' ? f.value.toLocaleString() : f.value }
        ],
        impactLevel: 'neutral',
        confidenceNote: 'Exact cross-tabulation across all validated rows.'
      });
    } else if (f.type === 'segmentation') {
      const targetCand = context.targetCandidates?.find(t => t.column.toLowerCase() === f.metric.toLowerCase() || context.humanFriendlyNames[t.column] === f.metric);
      const isUnfavorable = targetCand?.polarity === 'unfavorable';
      const isFavorable = targetCand?.polarity === 'favorable';
      const obsTitle = isUnfavorable ? `High-Risk Segment: ${f.dimension}` : isFavorable ? `High-Performance Segment: ${f.dimension}` : `Key Segment Cohort: ${f.dimension}`;
      const impactLevel = isUnfavorable ? 'critical' : isFavorable ? 'positive' : 'neutral';

      const fact = `'${f.dimension}' exhibits an event rate of ${f.value}% for ${f.metric}.`;
      const interpretation = isUnfavorable
        ? `This cohort significantly exceeds dataset baseline event probability, introducing risk.`
        : isFavorable
        ? `This cohort significantly exceeds dataset baseline event probability, reflecting superior operational performance.`
        : `This cohort exhibits distinct behavioral divergence relative to baseline.`;
      const hypothesis = isUnfavorable
        ? 'Targeted retention or operational interventions in this group may mitigate downside.'
        : isFavorable
        ? 'Best practices from this segment may be replicated across other cohorts.'
        : 'Segment-specific factors should be evaluated for operational optimization.';

      observations.push({
        id: `obs-${f.id}`,
        findingId: f.id,
        title: obsTitle,
        text: `${fact} ${interpretation}`,
        fact,
        interpretation,
        hypothesis,
        supportingMetrics: [
          { label: isUnfavorable ? 'Risk Cohort' : isFavorable ? 'High-Performance Cohort' : 'Segment Cohort', value: f.dimension || 'Target Segment' },
          { label: 'Event Rate', value: `${f.value}%` }
        ],
        impactLevel,
        confidenceNote: 'Derived from supervised frequency rate distribution.'
      });
    } else if (f.type === 'correlation') {
      const fact = `${f.metric} shows a correlation coefficient of r = ${f.value}.`;
      const interpretation = `Statistical association indicates synchronous variation between these metrics.`;
      const hypothesis = 'Correlation denotes linear association; underlying causal mechanisms should be tested experimentally.';

      observations.push({
        id: `obs-${f.id}`,
        findingId: f.id,
        title: `Correlation Analysis: ${f.metric}`,
        text: `${fact} ${interpretation}`,
        fact,
        interpretation,
        hypothesis,
        supportingMetrics: [
          { label: 'Pair', value: f.metric },
          { label: 'Pearson r', value: String(f.value) }
        ],
        impactLevel: 'neutral',
        confidenceNote: 'Bivariate Pearson correlation across paired records.'
      });
    } else if (f.type === 'anomaly') {
      const fact = `Identified ${f.value} outlier observations in ${f.metric}.`;
      const interpretation = `These data points fall beyond the 1.5x IQR statistical threshold.`;
      const hypothesis = 'Outliers may represent exceptional operational events or localized measurement spikes.';

      observations.push({
        id: `obs-${f.id}`,
        findingId: f.id,
        title: `Anomaly Alert: ${f.metric}`,
        text: `${fact} ${interpretation}`,
        fact,
        interpretation,
        hypothesis,
        supportingMetrics: [
          { label: 'Metric', value: f.metric },
          { label: 'Outlier Count', value: f.value }
        ],
        impactLevel: 'neutral',
        confidenceNote: 'Tukey IQR outlier boundary detection.'
      });
    }
  }

  return observations;
}
