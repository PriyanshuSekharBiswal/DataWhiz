import { detectDatasetSchema } from '../lib/schema/schemaDetector';
import { profileDataset } from '../lib/profiling/dataProfiler';
import { enrichSchemaWithSemantics } from '../lib/semantics/columnHumanizer';
import { detectBusinessDomain, buildBusinessGlossary } from '../lib/semantics/domainDetector';
import { detectQualityIssuesAndClean } from '../lib/quality/qualityEngine';
import { detectCapabilities } from '../lib/capabilities/capabilityDetector';
import { buildDatasetContext } from '../lib/context/datasetContextBuilder';
import { buildDatasetUnderstandingReport } from '../lib/context/datasetUnderstandingEngine';
import { buildDashboardStory } from '../lib/dashboard/dashboardStoryEngine';

function runMultiDatasetCheckpoint4Tests() {
  console.log('================================================================');
  console.log('  CHECKPOINT 4 MULTI-DATASET REGRESSION SUITE (4 DATASETS)      ');
  console.log('================================================================\n');

  let passedCount = 0;

  // ---------------------------------------------------------------------------
  // DATASET 1: SENSOR TELEMETRY (NO CURRENCY EVIDENCE -> NO '€' SYMBOL)
  // ---------------------------------------------------------------------------
  console.log('>>> [1/4] Testing Chart Quality & Currency Exclusion on Sensor Telemetry...');
  const sensorRows = [
    { machine: 'Turbine-1', pressure_psi: 120.5, temp_c: 85.0 },
    { machine: 'Turbine-1', pressure_psi: 125.0, temp_c: 87.2 },
    { machine: 'Turbine-2', pressure_psi: 190.0, temp_c: 110.5 },
    { machine: 'Turbine-2', pressure_psi: 195.5, temp_c: 112.0 }
  ];
  const sCols = Object.keys(sensorRows[0]);
  const sSchema = enrichSchemaWithSemantics(detectDatasetSchema(sCols, sensorRows));
  const sProfiles = profileDataset(sSchema, sensorRows);
  const sCaps = detectCapabilities(sSchema, sProfiles, sensorRows.length);
  const sCtx = buildDatasetContext({
    sourceMetadata: { sourceType: 'csv', fileName: 'sensor.csv', fileSize: 300, mimeType: 'text/csv', rowCount: 4, colCount: 3, hasHeader: true, warnings: [], status: 'valid' },
    schema: sSchema,
    profiles: sProfiles,
    domain: detectBusinessDomain(sSchema),
    glossary: [],
    relationships: [],
    qualityReport: detectQualityIssuesAndClean(sSchema, sProfiles, sensorRows).report,
    capabilities: sCaps,
    rawSample: sensorRows,
    cleanedRows: sensorRows
  });
  sCtx.understandingReport = buildDatasetUnderstandingReport(sCtx);
  const sSpec = buildDashboardStory(sCtx);

  console.log(`  KPIs:`, sSpec.overview.kpis.map(k => `${k.label}: ${k.value}`));
  console.log(`  Hero Visuals:`, sSpec.overview.heroVisuals.map(v => `${v.title} [x: ${v.xField}, y: ${v.yField}]`));

  const hasEUR = sSpec.overview.kpis.some(k => String(k.value).includes('€'));
  if (hasEUR) {
    throw new Error('Dataset 1 Failed: Sensor pressure dataset must NOT use € currency prefix in KPIs!');
  }
  console.log('  ✅ Dataset 1 (Sensor Telemetry) Verified.\n');
  passedCount++;

  // ---------------------------------------------------------------------------
  // DATASET 2: ZERO ARRAY INDEX LABELS (X-AXIS MUST CARRY REAL CATEGORY LABELS)
  // ---------------------------------------------------------------------------
  console.log('>>> [2/4] Testing Real Categorical Labels on X-Axis...');
  const catRows = [
    { department: 'Engineering', count: 45 },
    { department: 'Design', count: 18 },
    { department: 'Operations', count: 29 }
  ];
  const cCols = Object.keys(catRows[0]);
  const cSchema = enrichSchemaWithSemantics(detectDatasetSchema(cCols, catRows));
  const cProfiles = profileDataset(cSchema, catRows);
  const cCaps = detectCapabilities(cSchema, cProfiles, catRows.length);
  const cCtx = buildDatasetContext({
    sourceMetadata: { sourceType: 'csv', fileName: 'dept.csv', fileSize: 300, mimeType: 'text/csv', rowCount: 3, colCount: 2, hasHeader: true, warnings: [], status: 'valid' },
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
  const cSpec = buildDashboardStory(cCtx);

  const heroChart = cSpec.overview.heroVisuals[0];
  console.log(`  Hero Chart Data Points:`, heroChart?.data?.map(d => d.name));

  const hasNumericIndex = heroChart?.data?.some(d => typeof d.name === 'number' || d.name === '0' || d.name === '1' || d.name === '2');
  if (hasNumericIndex) {
    throw new Error('Dataset 2 Failed: Chart labels must carry real category names, not array indexes!');
  }
  console.log('  ✅ Dataset 2 (Real Categorical Labels) Verified.\n');
  passedCount++;

  // ---------------------------------------------------------------------------
  // DATASET 3: TIME-SERIES CHRONOLOGICAL GRAIN LABELS
  // ---------------------------------------------------------------------------
  console.log('>>> [3/4] Testing Chronological Line Chart Alignment...');
  const timeRows = [
    { week_date: '2024-01-01', load_units: 500 },
    { week_date: '2024-01-08', load_units: 550 },
    { week_date: '2024-01-15', load_units: 530 },
    { week_date: '2024-01-22', load_units: 600 }
  ];
  const tCols = Object.keys(timeRows[0]);
  const tSchema = enrichSchemaWithSemantics(detectDatasetSchema(tCols, timeRows));
  const tProfiles = profileDataset(tSchema, timeRows);
  const tCaps = detectCapabilities(tSchema, tProfiles, timeRows.length);
  const tCtx = buildDatasetContext({
    sourceMetadata: { sourceType: 'csv', fileName: 'weekly.csv', fileSize: 300, mimeType: 'text/csv', rowCount: 4, colCount: 2, hasHeader: true, warnings: [], status: 'valid' },
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
  const tSpec = buildDashboardStory(tCtx);

  const trendChart = tSpec.overview.heroVisuals.find(v => v.type === 'line');
  console.log(`  Trend Chart Type: ${trendChart?.type}, X-Field: ${trendChart?.xField}`);

  if (!trendChart || trendChart.xField !== 'week_date') {
    throw new Error('Dataset 3 Failed: Longitudinal dataset must generate line chart mapped to week_date!');
  }
  console.log('  ✅ Dataset 3 (Chronological Line Chart) Verified.\n');
  passedCount++;

  // ---------------------------------------------------------------------------
  // DATASET 4: VERIFY DASHBOARDSPEC STORY SECTIONS
  // ---------------------------------------------------------------------------
  console.log('>>> [4/4] Testing Story Section Composition...');
  console.log(`  Dashboard Sections (${sSpec.sections.length}):`, sSpec.sections.map(s => `[${s.sectionType}] ${s.title}`));
  if (sSpec.sections.length === 0) {
    throw new Error('Dataset 4 Failed: DashboardSpec has zero sections!');
  }
  console.log('  ✅ Dataset 4 (Story Section Composition) Verified.\n');
  passedCount++;

  console.log('================================================================');
  console.log(`  CHECKPOINT 4 MULTI-DATASET REGRESSION SUITE PASSED (${passedCount}/4)`);
  console.log('================================================================');
}

runMultiDatasetCheckpoint4Tests();
