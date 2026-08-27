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

function runCheckpoint3Tests() {
  console.log('================================================================');
  console.log('  CHECKPOINT 3: ANALYTICS TOOLS + VALIDATION + FINDINGS         ');
  console.log('================================================================\n');

  const rows = [
    { order_date: '2024-01-01', region: 'North', category: 'Tech', revenue: 10000, units: 100 },
    { order_date: '2024-01-02', region: 'North', category: 'Supplies', revenue: 5000, units: 50 },
    { order_date: '2024-01-03', region: 'South', category: 'Tech', revenue: 15000, units: 120 },
    { order_date: '2024-01-04', region: 'South', category: 'Supplies', revenue: 4000, units: 40 },
    { order_date: '2024-01-05', region: 'East', category: 'Tech', revenue: 12000, units: 90 },
    { order_date: '2024-01-06', region: 'East', category: 'Supplies', revenue: 6000, units: 60 },
    { order_date: '2024-01-07', region: 'North', category: 'Tech', revenue: 25000, units: 200 },
    { order_date: '2024-01-08', region: 'South', category: 'Tech', revenue: 18000, units: 140 }
  ];
  const cols = Object.keys(rows[0]);
  const schema = enrichSchemaWithSemantics(detectDatasetSchema(cols, rows));
  const profiles = profileDataset(schema, rows);
  const caps = detectCapabilities(schema, profiles, rows.length);
  const context = buildDatasetContext({
    sourceMetadata: { sourceType: 'csv', fileName: 'sales.csv', fileSize: 1024, mimeType: 'text/csv', rowCount: rows.length, colCount: cols.length, hasHeader: true, warnings: [], status: 'valid' },
    schema,
    profiles,
    domain: detectBusinessDomain(schema),
    glossary: buildBusinessGlossary(schema, detectBusinessDomain(schema)),
    relationships: [],
    qualityReport: detectQualityIssuesAndClean(schema, profiles, rows).report,
    capabilities: caps,
    rawSample: rows,
    cleanedRows: rows
  });
  context.understandingReport = buildDatasetUnderstandingReport(context);

  console.log('--- 1. Testing Deterministic Analytical Tools ---');
  
  // Tool 1: Aggregate
  const aggRes = executeDataWhizTool('aggregate', { metric: 'revenue', aggFunction: 'sum' }, context);
  console.log(`Aggregate (Sum Revenue):`, aggRes.data.value, `[Status: ${aggRes.validationStatus}] [Duration: ${aggRes.provenance.durationMs}ms]`);
  if (aggRes.data.value !== 95000 || aggRes.validationStatus !== 'VALID') {
    throw new Error(`Aggregate Tool Failed: Expected 95000, got ${aggRes.data.value}`);
  }

  // Tool 2: Group
  const groupRes = executeDataWhizTool('group', { metric: 'revenue', dimension: 'region', aggFunction: 'sum' }, context);
  console.log(`Group (Revenue by Region):`, groupRes.data);
  if (!Array.isArray(groupRes.data) || groupRes.data.length !== 3) {
    throw new Error('Group Tool Failed: Expected 3 regions');
  }

  // Tool 3: Rank
  const rankRes = executeDataWhizTool('rank', { metric: 'revenue', dimension: 'category', limit: 2 }, context);
  console.log(`Rank (Top Categories):`, rankRes.data);
  if (rankRes.data[0].entity !== 'Tech' || rankRes.data[0].value !== 80000) {
    throw new Error('Rank Tool Failed: Tech should be top category with 80000 revenue');
  }

  // Tool 4: Compare
  const compRes = executeDataWhizTool('compare', { metric: 'revenue', dimension: 'category', cohortA: 'Tech', cohortB: 'Supplies' }, context);
  console.log(`Compare (Tech vs Supplies):`, compRes.data);
  if (compRes.data.difference !== 65000) {
    throw new Error('Compare Tool Failed: Difference should be 65000');
  }

  // Tool 5: Correlation
  const corrRes = executeDataWhizTool('correlation', { metricA: 'revenue', metricB: 'units' }, context);
  console.log(`Correlation (Revenue vs Units):`, corrRes.data);
  if (corrRes.data.coefficient <= 0.8) {
    throw new Error('Correlation Tool Failed: Expected strong positive correlation between revenue and units');
  }

  console.log('✅ All deterministic analytical tools verified with provenance.\n');

  console.log('--- 2. Testing Finding Generation & Ranking ---');
  const findings = extractVerifiedFindings(context);
  console.log(`Extracted ${findings.length} verified findings:`);
  findings.forEach((f, idx) => {
    console.log(`  [Finding ${idx + 1}] (${f.type}, mag: ${f.magnitude}): ${f.statement}`);
    console.log(`    Evidence: ${f.evidence}`);
  });

  if (findings.length === 0) {
    throw new Error('Findings Engine Failed: No findings generated!');
  }
  console.log('✅ Findings generation & ranking verified.\n');

  console.log('--- 3. Testing Observation Synthesis (Fact vs Interpretation vs Hypothesis) ---');
  const observations = synthesizeObservations(findings, context);
  console.log(`Synthesized ${observations.length} observations:`);
  observations.forEach((obs, idx) => {
    console.log(`  [Obs ${idx + 1}] ${obs.title}`);
    console.log(`    FACT: ${obs.fact}`);
    console.log(`    INTERPRETATION: ${obs.interpretation}`);
    console.log(`    HYPOTHESIS: ${obs.hypothesis}`);
  });

  if (!observations[0].fact || !observations[0].interpretation) {
    throw new Error('Observation Synthesis Failed: Must have explicit fact and interpretation!');
  }
  console.log('✅ Observations verified with fact/interpretation/hypothesis separation.\n');

  console.log('================================================================');
  console.log('  CHECKPOINT 3 TESTS PASSED!                                    ');
  console.log('================================================================');
}

runCheckpoint3Tests();
