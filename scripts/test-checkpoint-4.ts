import { detectDatasetSchema } from '../lib/schema/schemaDetector';
import { profileDataset } from '../lib/profiling/dataProfiler';
import { enrichSchemaWithSemantics } from '../lib/semantics/columnHumanizer';
import { detectBusinessDomain, buildBusinessGlossary } from '../lib/semantics/domainDetector';
import { detectQualityIssuesAndClean } from '../lib/quality/qualityEngine';
import { detectCapabilities } from '../lib/capabilities/capabilityDetector';
import { buildDatasetContext } from '../lib/context/datasetContextBuilder';
import { buildDatasetUnderstandingReport } from '../lib/context/datasetUnderstandingEngine';
import { discoverBusinessQuestions } from '../lib/questions/businessQuestionEngine';
import { planAnalysis } from '../lib/planner/analysisPlanner';
import { extractVerifiedFindings } from '../lib/findings/findingsEngine';
import { buildDashboardStory } from '../lib/dashboard/dashboardStoryEngine';

function runCheckpoint4Tests() {
  console.log('================================================================');
  console.log('  CHECKPOINT 4: VISUALIZATION + DASHBOARDSPEC + STORY ENGINE    ');
  console.log('================================================================\n');

  // TEST 1: Manufacturing / IoT Telemetry
  console.log('--- TEST 1: Industrial Machine Sensors ---');
  const mfgRows = [
    { machine_id: 'M-01', cycle_time_s: 45.2, defect_count: 2, temperature: 68.5 },
    { machine_id: 'M-01', cycle_time_s: 46.1, defect_count: 1, temperature: 69.0 },
    { machine_id: 'M-02', cycle_time_s: 72.0, defect_count: 8, temperature: 92.4 },
    { machine_id: 'M-02', cycle_time_s: 74.5, defect_count: 9, temperature: 94.1 },
    { machine_id: 'M-03', cycle_time_s: 43.8, defect_count: 0, temperature: 67.2 },
    { machine_id: 'M-03', cycle_time_s: 44.2, defect_count: 1, temperature: 67.8 }
  ];
  const mfgCols = Object.keys(mfgRows[0]);
  const mfgSchema = enrichSchemaWithSemantics(detectDatasetSchema(mfgCols, mfgRows));
  const mfgProfiles = profileDataset(mfgSchema, mfgRows);
  const mfgCaps = detectCapabilities(mfgSchema, mfgProfiles, mfgRows.length);
  const mfgContext = buildDatasetContext({
    sourceMetadata: { sourceType: 'csv', fileName: 'mfg.csv', fileSize: 1024, mimeType: 'text/csv', rowCount: mfgRows.length, colCount: mfgCols.length, hasHeader: true, warnings: [], status: 'valid' },
    schema: mfgSchema,
    profiles: mfgProfiles,
    domain: detectBusinessDomain(mfgSchema),
    glossary: buildBusinessGlossary(mfgSchema, detectBusinessDomain(mfgSchema)),
    relationships: [],
    qualityReport: detectQualityIssuesAndClean(mfgSchema, mfgProfiles, mfgRows).report,
    capabilities: mfgCaps,
    rawSample: mfgRows,
    cleanedRows: mfgRows
  });
  mfgContext.understandingReport = buildDatasetUnderstandingReport(mfgContext);
  mfgContext.businessQuestions = discoverBusinessQuestions(mfgContext, mfgContext.understandingReport);
  mfgContext.analysisPlan = planAnalysis(mfgContext, mfgCaps, { mode: 'auto' });
  mfgContext.validatedFindings = extractVerifiedFindings(mfgContext);

  const mfgSpec = buildDashboardStory(mfgContext);
  console.log(`Generated DashboardSpec: '${mfgSpec.title}'`);
  console.log(`Overview KPIs (${mfgSpec.overview.kpis.length}):`, mfgSpec.overview.kpis.map(k => `${k.label}: ${k.value}`));
  console.log(`Hero Visuals (${mfgSpec.overview.heroVisuals.length}):`, mfgSpec.overview.heroVisuals.map(v => `${v.title} (${v.type})`));
  console.log(`Dynamic Sections (${mfgSpec.sections.length}):`, mfgSpec.sections.map(s => `${s.title} [${s.sectionType}]`));
  console.log(`Dynamic Navigation Tabs (${mfgSpec.tabs.length}):`, mfgSpec.tabs.map(t => `${t.label} (id: ${t.id})`));

  if (!mfgSpec.overview.kpis.length || !mfgSpec.sections.length) {
    throw new Error('Dashboard Story Engine Failed: Empty KPIs or sections!');
  }
  console.log('✅ Manufacturing DashboardSpec verified.\n');

  // TEST 2: Longitudinal Time-Series Ledger
  console.log('--- TEST 2: Longitudinal Commercial Time Series ---');
  const timeRows = [
    { date: '2024-01-01', region: 'North', revenue: 10000 },
    { date: '2024-01-08', region: 'North', revenue: 12000 },
    { date: '2024-01-15', region: 'North', revenue: 11500 },
    { date: '2024-01-22', region: 'North', revenue: 14000 },
    { date: '2024-01-29', region: 'North', revenue: 15500 },
    { date: '2024-02-05', region: 'North', revenue: 17000 }
  ];
  const timeCols = Object.keys(timeRows[0]);
  const timeSchema = enrichSchemaWithSemantics(detectDatasetSchema(timeCols, timeRows));
  const timeProfiles = profileDataset(timeSchema, timeRows);
  const timeCaps = detectCapabilities(timeSchema, timeProfiles, timeRows.length);
  const timeContext = buildDatasetContext({
    sourceMetadata: { sourceType: 'csv', fileName: 'time.csv', fileSize: 1024, mimeType: 'text/csv', rowCount: timeRows.length, colCount: timeCols.length, hasHeader: true, warnings: [], status: 'valid' },
    schema: timeSchema,
    profiles: timeProfiles,
    domain: detectBusinessDomain(timeSchema),
    glossary: buildBusinessGlossary(timeSchema, detectBusinessDomain(timeSchema)),
    relationships: [],
    qualityReport: detectQualityIssuesAndClean(timeSchema, timeProfiles, timeRows).report,
    capabilities: timeCaps,
    rawSample: timeRows,
    cleanedRows: timeRows
  });
  timeContext.understandingReport = buildDatasetUnderstandingReport(timeContext);
  timeContext.businessQuestions = discoverBusinessQuestions(timeContext, timeContext.understandingReport);
  timeContext.analysisPlan = planAnalysis(timeContext, timeCaps, { mode: 'auto' });
  timeContext.validatedFindings = extractVerifiedFindings(timeContext);

  const timeSpec = buildDashboardStory(timeContext);
  console.log(`Generated Time-Series Spec: '${timeSpec.title}'`);
  console.log(`Overview KPIs:`, timeSpec.overview.kpis.map(k => `${k.label}: ${k.value}`));
  console.log(`Hero Visuals:`, timeSpec.overview.heroVisuals.map(v => `${v.title} [x: ${v.xField}, y: ${v.yField}]`));

  if (!timeSpec.tabs.some(t => t.id === 'forecasting')) {
    throw new Error('Test Failed: Time-series dataset with 6 periods should generate a forecasting section and tab!');
  }
  console.log('✅ Time-series DashboardSpec verified.\n');

  console.log('================================================================');
  console.log('  CHECKPOINT 4 TESTS PASSED!                                    ');
  console.log('================================================================');
}

runCheckpoint4Tests();
