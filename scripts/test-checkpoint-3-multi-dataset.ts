import { detectDatasetSchema } from '../lib/schema/schemaDetector';
import { profileDataset } from '../lib/profiling/dataProfiler';
import { enrichSchemaWithSemantics } from '../lib/semantics/columnHumanizer';
import { detectBusinessDomain, buildBusinessGlossary } from '../lib/semantics/domainDetector';
import { detectQualityIssuesAndClean } from '../lib/quality/qualityEngine';
import { detectCapabilities } from '../lib/capabilities/capabilityDetector';
import { buildDatasetContext } from '../lib/context/datasetContextBuilder';
import { buildDatasetUnderstandingReport } from '../lib/context/datasetUnderstandingEngine';
import { executeDataWhizTool } from '../lib/ai/tools/toolRegistry';
import { extractVerifiedFindings } from '../lib/findings/findingsEngine';
import { synthesizeObservations } from '../lib/observations/observationEngine';

function runMultiDatasetCheckpoint3Tests() {
  console.log('================================================================');
  console.log('  CHECKPOINT 3 MULTI-DATASET REGRESSION SUITE (4 DATASETS)      ');
  console.log('================================================================\n');

  let passedCount = 0;

  // ---------------------------------------------------------------------------
  // DATASET 1: NON-TEMPORAL CATEGORICAL COMPARISONS & AGGREGATIONS
  // ---------------------------------------------------------------------------
  console.log('>>> [1/4] Testing Non-Temporal Categorical Tools...');
  const catRows = [
    { segment: 'Tier-A', volume: 500, quality_score: 9.2 },
    { segment: 'Tier-A', volume: 700, quality_score: 9.5 },
    { segment: 'Tier-B', volume: 300, quality_score: 8.1 },
    { segment: 'Tier-B', volume: 400, quality_score: 8.4 },
    { segment: 'Tier-C', volume: 100, quality_score: 7.0 }
  ];
  const cCols = Object.keys(catRows[0]);
  const cSchema = enrichSchemaWithSemantics(detectDatasetSchema(cCols, catRows));
  const cProfiles = profileDataset(cSchema, catRows);
  const cCaps = detectCapabilities(cSchema, cProfiles, catRows.length);
  const cCtx = buildDatasetContext({
    sourceMetadata: { sourceType: 'csv', fileName: 'cat.csv', fileSize: 300, mimeType: 'text/csv', rowCount: 5, colCount: 3, hasHeader: true, warnings: [], status: 'valid' },
    schema: cSchema,
    profiles: cProfiles,
    domain: detectBusinessDomain(cSchema),
    glossary: [],
    relationships: [],
    qualityReport: detectQualityIssuesAndClean(cSchema, cProfiles, catRows).report,
    capabilities: cCaps,
    rawSample: catRows,
    cleanedRows: catRows
  });
  cCtx.understandingReport = buildDatasetUnderstandingReport(cCtx);

  const agg = executeDataWhizTool('aggregate', { metric: 'volume', aggFunction: 'sum' }, cCtx);
  const rank = executeDataWhizTool('rank', { metric: 'volume', dimension: 'segment', limit: 3 }, cCtx);
  const comp = executeDataWhizTool('compare', { metric: 'volume', dimension: 'segment', cohortA: 'Tier-A', cohortB: 'Tier-B' }, cCtx);

  console.log(`  Sum Volume: ${agg.data.value}, Top Segment: ${rank.data[0].entity} (${rank.data[0].sharePct}%)`);
  console.log(`  Tier-A vs Tier-B Delta: +${comp.data.difference} (+${comp.data.percentageDelta}%)`);

  if (agg.data.value !== 2000 || rank.data[0].entity !== 'Tier-A' || comp.data.difference !== 500) {
    throw new Error('Dataset 1 Failed: Deterministic tools returned incorrect values!');
  }
  console.log('  ✅ Dataset 1 (Non-Temporal Tools) Verified.\n');
  passedCount++;

  // ---------------------------------------------------------------------------
  // DATASET 2: LONGITUDINAL PERIOD DELTAS & EXPONENTIAL SMOOTHING FORECAST
  // ---------------------------------------------------------------------------
  console.log('>>> [2/4] Testing Longitudinal Period Compare & Forecast Tools...');
  const timeRows = [
    { period: '2024-01-01', metric: 100 },
    { period: '2024-01-08', metric: 120 },
    { period: '2024-01-15', metric: 110 },
    { period: '2024-01-22', metric: 140 },
    { period: '2024-01-29', metric: 160 },
    { period: '2024-02-05', metric: 180 }
  ];
  const tCols = Object.keys(timeRows[0]);
  const tSchema = enrichSchemaWithSemantics(detectDatasetSchema(tCols, timeRows));
  const tProfiles = profileDataset(tSchema, timeRows);
  const tCaps = detectCapabilities(tSchema, tProfiles, timeRows.length);
  const tCtx = buildDatasetContext({
    sourceMetadata: { sourceType: 'csv', fileName: 'time.csv', fileSize: 300, mimeType: 'text/csv', rowCount: 6, colCount: 2, hasHeader: true, warnings: [], status: 'valid' },
    schema: tSchema,
    profiles: tProfiles,
    domain: detectBusinessDomain(tSchema),
    glossary: [],
    relationships: [],
    qualityReport: detectQualityIssuesAndClean(tSchema, tProfiles, timeRows).report,
    capabilities: tCaps,
    rawSample: timeRows,
    cleanedRows: timeRows
  });
  tCtx.understandingReport = buildDatasetUnderstandingReport(tCtx);

  const pComp = executeDataWhizTool('period_compare', { metric: 'metric', timeField: 'period' }, tCtx);
  const fc = executeDataWhizTool('forecast', { metric: 'metric', dateColumn: 'period', horizon: 4 }, tCtx);

  console.log(`  Period Deltas (${pComp.data.deltas.length}): Latest=${pComp.data.deltas[pComp.data.deltas.length - 1].percentageChange}%`);
  console.log(`  Forecast Status: ${fc.validationStatus}, Horizon Points: ${fc.data?.forecastPoints?.length}`);

  if (pComp.validationStatus === 'INVALID' || fc.validationStatus === 'INVALID' || !fc.data?.forecastPoints?.length) {
    throw new Error('Dataset 2 Failed: Period compare or forecast failed validation!');
  }
  console.log('  ✅ Dataset 2 (Longitudinal Tools) Verified.\n');
  passedCount++;

  // ---------------------------------------------------------------------------
  // DATASET 3: SUPERVISED COHORT RISK FREQUENCIES
  // ---------------------------------------------------------------------------
  console.log('>>> [3/4] Testing Classification & Cohort Risk Tools...');
  const riskRows = [
    { segment: 'Contract', is_defect: 0 },
    { segment: 'Contract', is_defect: 0 },
    { segment: 'Monthly', is_defect: 1 },
    { segment: 'Monthly', is_defect: 1 },
    { segment: 'Monthly', is_defect: 0 }
  ];
  const rCols = Object.keys(riskRows[0]);
  const rSchema = enrichSchemaWithSemantics(detectDatasetSchema(rCols, riskRows));
  const rProfiles = profileDataset(rSchema, riskRows);
  const rCaps = detectCapabilities(rSchema, rProfiles, riskRows.length);
  const rCtx = buildDatasetContext({
    sourceMetadata: { sourceType: 'csv', fileName: 'risk.csv', fileSize: 300, mimeType: 'text/csv', rowCount: 5, colCount: 2, hasHeader: true, warnings: [], status: 'valid' },
    schema: rSchema,
    profiles: rProfiles,
    domain: detectBusinessDomain(rSchema),
    glossary: [],
    relationships: [],
    qualityReport: detectQualityIssuesAndClean(rSchema, rProfiles, riskRows).report,
    capabilities: rCaps,
    rawSample: riskRows,
    cleanedRows: riskRows
  });
  rCtx.understandingReport = buildDatasetUnderstandingReport(rCtx);

  const clRes = executeDataWhizTool('classification', { target: 'is_defect' }, rCtx);
  console.log(`  Overall Event Rate: ${clRes.data.overallChurnRate}%, High Risk Cohorts: ${clRes.data.highRiskCohorts.length}`);
  if (clRes.data.overallChurnRate !== 40 || clRes.data.highRiskCohorts[0]?.category !== 'Monthly') {
    throw new Error('Dataset 3 Failed: Classification tool did not identify Monthly as high risk cohort!');
  }
  console.log('  ✅ Dataset 3 (Classification Tool) Verified.\n');
  passedCount++;

  // ---------------------------------------------------------------------------
  // DATASET 4: RANKED FINDINGS & SEPARATION OF FACT / INTERPRETATION / HYPOTHESIS
  // ---------------------------------------------------------------------------
  console.log('>>> [4/4] Testing Ranked Findings & Fact/Interpretation Separation...');
  const findings = extractVerifiedFindings(cCtx);
  const observations = synthesizeObservations(findings, cCtx);

  console.log(`  Extracted ${findings.length} findings, ${observations.length} observations.`);
  observations.forEach(obs => {
    console.log(`  - Title: ${obs.title}`);
    console.log(`    FACT: ${obs.fact}`);
    console.log(`    INTERPRETATION: ${obs.interpretation}`);
    console.log(`    HYPOTHESIS: ${obs.hypothesis}`);
  });

  if (!observations[0].fact || !observations[0].interpretation || !observations[0].hypothesis) {
    throw new Error('Dataset 4 Failed: Observation must have explicit fact, interpretation, and hypothesis!');
  }
  console.log('  ✅ Dataset 4 (Findings & Observations) Verified.\n');
  passedCount++;

  console.log('================================================================');
  console.log(`  CHECKPOINT 3 MULTI-DATASET REGRESSION SUITE PASSED (${passedCount}/4)`);
  console.log('================================================================');
}

runMultiDatasetCheckpoint3Tests();
