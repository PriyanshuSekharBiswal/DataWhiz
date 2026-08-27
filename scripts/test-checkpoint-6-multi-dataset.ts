import { detectDatasetSchema } from '../lib/schema/schemaDetector';
import { profileDataset } from '../lib/profiling/dataProfiler';
import { enrichSchemaWithSemantics } from '../lib/semantics/columnHumanizer';
import { detectBusinessDomain, buildBusinessGlossary } from '../lib/semantics/domainDetector';
import { detectQualityIssuesAndClean } from '../lib/quality/qualityEngine';
import { detectCapabilities } from '../lib/capabilities/capabilityDetector';
import { buildDatasetContext } from '../lib/context/datasetContextBuilder';
import { buildDatasetUnderstandingReport } from '../lib/context/datasetUnderstandingEngine';
import { answerAskDataQuery } from '../lib/askDataEngine';

async function runCheckpoint6AgentTests() {
  console.log('================================================================');
  console.log('  CHECKPOINT 6 ASK YOUR DATA AGENT REGRESSION SUITE (6 QUERIES)  ');
  console.log('================================================================\n');

  let passedCount = 0;

  const datasetRows = [
    { machine_id: 'Turbine-01', vibration_hz: 52.4, temp_c: 75.0, status: 'Normal' },
    { machine_id: 'Turbine-01', vibration_hz: 54.1, temp_c: 76.5, status: 'Normal' },
    { machine_id: 'Turbine-02', vibration_hz: 92.0, temp_c: 98.4, status: 'Critical' },
    { machine_id: 'Turbine-02', vibration_hz: 96.5, temp_c: 101.2, status: 'Critical' },
    { machine_id: 'Turbine-03', vibration_hz: 48.0, temp_c: 70.2, status: 'Normal' }
  ];
  const cols = Object.keys(datasetRows[0]);
  const schema = enrichSchemaWithSemantics(detectDatasetSchema(cols, datasetRows));
  const profiles = profileDataset(schema, datasetRows);
  const caps = detectCapabilities(schema, profiles, datasetRows.length);
  const context = buildDatasetContext({
    sourceMetadata: { sourceType: 'csv', fileName: 'turbines.csv', fileSize: 500, mimeType: 'text/csv', rowCount: 5, colCount: 4, hasHeader: true, warnings: [], status: 'valid' },
    schema,
    profiles,
    domain: detectBusinessDomain(schema),
    glossary: buildBusinessGlossary(schema, detectBusinessDomain(schema)),
    relationships: [],
    qualityReport: detectQualityIssuesAndClean(schema, profiles, datasetRows).report,
    capabilities: caps,
    rawSample: datasetRows,
    cleanedRows: datasetRows
  });
  context.understandingReport = buildDatasetUnderstandingReport(context);

  // ---------------------------------------------------------------------------
  // QUERY 1: RANKING QUESTION
  // ---------------------------------------------------------------------------
  console.log('>>> [1/6] Testing Ranking Query: "Which machine has highest vibration?"...');
  const res1 = await answerAskDataQuery('Which machine has the highest vibration?', context);
  console.log(`  Answer: ${res1.text}`);
  console.log(`  Provenance Tool: ${res1.provenance?.toolName}`);
  if (!res1.text.includes('Turbine-02') || res1.provenance?.toolName !== 'rank') {
    throw new Error('Query 1 Failed: Ranking tool must identify Turbine-02 as highest vibration!');
  }
  console.log('  ✅ Query 1 Passed.\n');
  passedCount++;

  // ---------------------------------------------------------------------------
  // QUERY 2: CORRELATION QUESTION
  // ---------------------------------------------------------------------------
  console.log('>>> [2/6] Testing Correlation Query: "Is temperature correlated with vibration?"...');
  const res2 = await answerAskDataQuery('Is temperature correlated with vibration?', context);
  console.log(`  Answer: ${res2.text}`);
  console.log(`  Provenance Tool: ${res2.provenance?.toolName}`);
  if (!res2.text.toLowerCase().includes('correlation') || res2.provenance?.toolName !== 'correlation') {
    throw new Error('Query 2 Failed: Correlation tool must calculate correlation between temp and vibration!');
  }
  console.log('  ✅ Query 2 Passed.\n');
  passedCount++;

  // ---------------------------------------------------------------------------
  // QUERY 3: DEFINITION QUESTION
  // ---------------------------------------------------------------------------
  console.log('>>> [3/6] Testing Definition Query: "What is vibration_hz?"...');
  const res3 = await answerAskDataQuery('What is vibration_hz?', context);
  console.log(`  Answer: ${res3.text}`);
  console.log(`  Provenance Tool: ${res3.provenance?.toolName}`);
  const isDictTool = res3.provenance?.toolName === 'resolve_semantic_column' || res3.provenance?.toolName === 'get_data_dictionary';
  if (!res3.text.toLowerCase().includes('vibration') || !isDictTool) {
    throw new Error('Query 3 Failed: Definition query must return schema dictionary definition!');
  }
  console.log('  ✅ Query 3 Passed.\n');
  passedCount++;

  // ---------------------------------------------------------------------------
  // QUERY 4: AGGREGATE QUESTION
  // ---------------------------------------------------------------------------
  console.log('>>> [4/6] Testing Aggregate Query: "What is the average temperature?"...');
  const res4 = await answerAskDataQuery('What is the average temperature across all machines?', context);
  console.log(`  Answer: ${res4.text}`);
  console.log(`  Provenance Tool: ${res4.provenance?.toolName}`);
  if (res4.provenance?.toolName !== 'aggregate') {
    throw new Error('Query 4 Failed: Aggregate query must execute aggregate tool!');
  }
  console.log('  ✅ Query 4 Passed.\n');
  passedCount++;

  // ---------------------------------------------------------------------------
  // QUERY 5: ANOMALY QUESTION
  // ---------------------------------------------------------------------------
  console.log('>>> [5/6] Testing Anomaly Query: "Are there any outliers in vibration?"...');
  const res5 = await answerAskDataQuery('Are there any outliers or anomalies in vibration?', context);
  console.log(`  Answer: ${res5.text}`);
  console.log(`  Provenance Tool: ${res5.provenance?.toolName}`);
  if (res5.provenance?.toolName !== 'anomaly_detection') {
    throw new Error('Query 5 Failed: Anomaly query must execute anomaly_detection tool!');
  }
  console.log('  ✅ Query 5 Passed.\n');
  passedCount++;

  // ---------------------------------------------------------------------------
  // QUERY 6: HONEST REFUSAL ON UNANSWERABLE QUESTION
  // ---------------------------------------------------------------------------
  console.log('>>> [6/6] Testing Unanswerable Query: "What will Apple stock price be in 2030?"...');
  const res6 = await answerAskDataQuery('What will the stock price of Apple be in 2030?', context);
  console.log(`  Answer: ${res6.text}`);
  console.log(`  Tool: ${res6.provenance?.toolName}`);
  const hasRefusal = res6.text.toLowerCase().includes('does not contain') || res6.text.toLowerCase().includes('limitation') || res6.text.toLowerCase().includes('rejected');
  if (!hasRefusal || res6.provenance?.toolName !== 'unsupported_query') {
    throw new Error('Query 6 Failed: Agent must honestly state dataset does not contain required data!');
  }
  console.log('  ✅ Query 6 Passed.\n');
  passedCount++;

  console.log('================================================================');
  console.log(`  CHECKPOINT 6 ASK YOUR DATA REGRESSION SUITE PASSED (${passedCount}/6)`);
  console.log('================================================================');
}

runCheckpoint6AgentTests();
