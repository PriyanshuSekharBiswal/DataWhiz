// Quality Gate Engine: Pre-flight validation gate verifying analytical integrity before visualization

import { DatasetContext, QualityGateReport } from '@/lib/types';

export function runMasterQualityGate(context: DatasetContext): QualityGateReport {
  const blockingErrors: string[] = [];
  const warnings: string[] = [];

  const schemas = context.schema;
  const profiles = context.profiles;
  const rows = context.cleanedRows;
  const understanding = context.understandingReport;

  // 1. Data Understanding Check
  let dataUnderstandingPassed = true;
  if (!context.primaryMetricColumn) {
    blockingErrors.push('Primary metric could not be determined from schema and profiles.');
    dataUnderstandingPassed = false;
  }
  if (context.primaryMetricColumn && /datekey|id$/i.test(context.primaryMetricColumn)) {
    blockingErrors.push(`Primary metric '${context.primaryMetricColumn}' appears to be an identifier/foreign key.`);
    dataUnderstandingPassed = false;
  }

  // 2. Analysis Calculation Check
  let analysisPassed = true;
  for (const p of profiles) {
    if (p.numeric) {
      if (isNaN(p.numeric.mean) || isNaN(p.numeric.std)) {
        blockingErrors.push(`Column '${p.technicalName}' produced NaN moments in statistical profiling.`);
        analysisPassed = false;
      }
    }
  }

  // 3. Visualization Check
  let visualizationPassed = true;
  if (rows.length === 0) {
    blockingErrors.push('Cleaned dataset has 0 rows; cannot generate visualizations.');
    visualizationPassed = false;
  }

  // 4. Dashboard & Derived Metric Integrity Check
  let dashboardPassed = true;
  const hasOrderSemantics = schemas.some(s => /salesid|orderid|transaction/i.test(s.technicalName));
  const hasAovDerived = context.derivedMetrics?.some(d => d.name === 'average_order_value');

  if (hasAovDerived && !hasOrderSemantics && understanding?.archetype === 'marketing_media_mix') {
    warnings.push('AOV derived metric was flagged as unsupported for Marketing MMM dataset and suppressed.');
  }

  const overallPassed = blockingErrors.length === 0;

  return {
    dataUnderstandingPassed,
    analysisPassed,
    visualizationPassed,
    dashboardPassed,
    overallPassed,
    blockingErrors,
    warnings
  };
}
