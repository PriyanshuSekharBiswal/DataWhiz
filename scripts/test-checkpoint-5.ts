import { detectDatasetSchema } from '../lib/schema/schemaDetector';
import { profileDataset } from '../lib/profiling/dataProfiler';
import { enrichSchemaWithSemantics } from '../lib/semantics/columnHumanizer';
import { detectBusinessDomain, buildBusinessGlossary } from '../lib/semantics/domainDetector';
import { detectQualityIssuesAndClean } from '../lib/quality/qualityEngine';
import { detectCapabilities } from '../lib/capabilities/capabilityDetector';
import { buildDatasetContext } from '../lib/context/datasetContextBuilder';
import { buildDatasetUnderstandingReport } from '../lib/context/datasetUnderstandingEngine';
import { processAskQuery } from '../lib/askDataEngine';

function runCheckpoint5Tests() {
  console.log('================================================================');
  console.log('  CHECKPOINT 5: ASK YOUR DATA AGENT & TOOL EXECUTION            ');
  console.log('================================================================\n');

  const rows = [
    { date: '2024-01-01', region: 'North', category: 'Tech', revenue: 10000 },
    { date: '2024-01-08', region: 'North', category: 'Supplies', revenue: 5000 },
    { date: '2024-01-15', region: 'South', category: 'Tech', revenue: 15000 },
    { date: '2024-01-22', region: 'South', category: 'Supplies', revenue: 4000 },
    { date: '2024-01-29', region: 'East', category: 'Tech', revenue: 12000 },
    { date: '2024-02-05', region: 'East', category: 'Supplies', revenue: 6000 }
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

  // Query 1: Column Definition
  console.log('--- Query 1: Column Definition ("What does revenue mean?") ---');
  const turn1 = processAskQuery('What does revenue mean?', context);
  console.log('Answer:\n', turn1.text);
  console.log('Provenance:', turn1.provenance);
  if (!turn1.provenance || turn1.provenance.toolName !== 'resolve_semantic_column') {
    throw new Error('Test Failed: Expected resolve_semantic_column provenance!');
  }
  console.log('✅ Column definition query passed.\n');

  // Query 2: Ranking Query
  console.log('--- Query 2: Ranking Query ("Which region generated the highest revenue?") ---');
  const turn2 = processAskQuery('Which region generated the highest revenue?', context);
  console.log('Answer:\n', turn2.text);
  console.log('Chart:', turn2.chart?.title);
  console.log('Provenance:', turn2.provenance);
  if (!turn2.provenance || turn2.provenance.toolName !== 'rank') {
    throw new Error('Test Failed: Expected rank provenance!');
  }
  console.log('✅ Ranking query passed.\n');

  // Query 3: Comparison Query
  console.log('--- Query 3: Comparison Query ("Compare North vs South") ---');
  const turn3 = processAskQuery('Compare North vs South revenue', context);
  console.log('Answer:\n', turn3.text);
  console.log('Provenance:', turn3.provenance);
  if (!turn3.provenance || turn3.provenance.toolName !== 'compare') {
    throw new Error('Test Failed: Expected compare provenance!');
  }
  console.log('✅ Comparison query passed.\n');

  // Query 4: Forecast Query
  console.log('--- Query 4: Forecast Query ("What is the forecast for next quarter?") ---');
  const turn4 = processAskQuery('What is the forecast for revenue?', context);
  console.log('Answer:\n', turn4.text);
  console.log('Provenance:', turn4.provenance);
  if (!turn4.provenance || turn4.provenance.toolName !== 'forecast') {
    throw new Error('Test Failed: Expected forecast provenance!');
  }
  console.log('✅ Forecast query passed.\n');

  console.log('================================================================');
  console.log('  CHECKPOINT 5 TESTS PASSED!                                    ');
  console.log('================================================================');
}

runCheckpoint5Tests();
