import { detectDatasetSchema } from '../lib/schema/schemaDetector';
import { profileDataset } from '../lib/profiling/dataProfiler';
import { enrichSchemaWithSemantics } from '../lib/semantics/columnHumanizer';
import { detectBusinessDomain, buildBusinessGlossary } from '../lib/semantics/domainDetector';
import { detectQualityIssuesAndClean } from '../lib/quality/qualityEngine';
import { detectCapabilities } from '../lib/capabilities/capabilityDetector';
import { buildDatasetContext } from '../lib/context/datasetContextBuilder';
import { buildDatasetUnderstandingReport } from '../lib/context/datasetUnderstandingEngine';
import { buildDashboardStory } from '../lib/dashboard/dashboardStoryEngine';

function runMultiDatasetCheckpoint5Tests() {
  console.log('================================================================');
  console.log('  CHECKPOINT 5 MULTI-DATASET REGRESSION SUITE (4 DATASETS)      ');
  console.log('================================================================\n');

  let passedCount = 0;

  // ---------------------------------------------------------------------------
  // DATASET 1: NON-TEMPORAL DATASET -> ZERO TEMPORAL TABS IN NAVIGATION
  // ---------------------------------------------------------------------------
  console.log('>>> [1/4] Testing Non-Temporal Navigation Tabs...');
  const nonTimeRows = [
    { department: 'Design', count: 12, rating: 4.5 },
    { department: 'Engineering', count: 40, rating: 4.8 },
    { department: 'Marketing', count: 20, rating: 4.2 }
  ];
  const ntCols = Object.keys(nonTimeRows[0]);
  const ntSchema = enrichSchemaWithSemantics(detectDatasetSchema(ntCols, nonTimeRows));
  const ntProfiles = profileDataset(ntSchema, nonTimeRows);
  const ntCaps = detectCapabilities(ntSchema, ntProfiles, nonTimeRows.length);
  const ntCtx = buildDatasetContext({
    sourceMetadata: { sourceType: 'csv', fileName: 'nontime.csv', fileSize: 300, mimeType: 'text/csv', rowCount: 3, colCount: 3, hasHeader: true, warnings: [], status: 'valid' },
    schema: ntSchema,
    profiles: ntProfiles,
    domain: detectBusinessDomain(ntSchema),
    glossary: [],
    relationships: [],
    qualityReport: detectQualityIssuesAndClean(ntSchema, ntProfiles, nonTimeRows).report,
    capabilities: ntCaps,
    rawSample: nonTimeRows,
    cleanedRows: nonTimeRows
  });
  ntCtx.understandingReport = buildDatasetUnderstandingReport(ntCtx);
  const ntSpec = buildDashboardStory(ntCtx);

  console.log(`  Navigation Tabs (${ntSpec.tabs.length}):`, ntSpec.tabs.map(t => `${t.label} (id: ${t.id})`));

  const forbiddenTemporalTabs = ['daily', 'weekly', 'weekday', 'monthly', 'yearly', 'forecast'];
  const hasForbiddenTabs = ntSpec.tabs.some(t => forbiddenTemporalTabs.includes(t.id));

  if (hasForbiddenTabs) {
    throw new Error('Dataset 1 Failed: Non-temporal dataset must NOT have any temporal navigation tabs!');
  }
  console.log('  ✅ Dataset 1 (Non-Temporal Navigation) Verified.\n');
  passedCount++;

  // ---------------------------------------------------------------------------
  // DATASET 2: WEEKLY DATASET -> ZERO DAILY/WEEKDAY TABS
  // ---------------------------------------------------------------------------
  console.log('>>> [2/4] Testing Weekly Dataset Navigation Tabs...');
  const weeklyRows = [
    { week_date: '2024-01-01', volume: 100 },
    { week_date: '2024-01-08', volume: 120 },
    { week_date: '2024-01-15', volume: 140 },
    { week_date: '2024-01-22', volume: 160 },
    { week_date: '2024-01-29', volume: 180 },
    { week_date: '2024-02-05', volume: 200 }
  ];
  const wCols = Object.keys(weeklyRows[0]);
  const wSchema = enrichSchemaWithSemantics(detectDatasetSchema(wCols, weeklyRows));
  const wProfiles = profileDataset(wSchema, weeklyRows);
  const wCaps = detectCapabilities(wSchema, wProfiles, weeklyRows.length);
  const wCtx = buildDatasetContext({
    sourceMetadata: { sourceType: 'csv', fileName: 'weekly.csv', fileSize: 300, mimeType: 'text/csv', rowCount: 6, colCount: 2, hasHeader: true, warnings: [], status: 'valid' },
    schema: wSchema,
    profiles: wProfiles,
    domain: detectBusinessDomain(wSchema),
    glossary: [],
    relationships: [],
    qualityReport: detectQualityIssuesAndClean(wSchema, wProfiles, weeklyRows).report,
    capabilities: wCaps,
    rawSample: weeklyRows,
    cleanedRows: weeklyRows
  });
  wCtx.understandingReport = buildDatasetUnderstandingReport(wCtx);
  const wSpec = buildDashboardStory(wCtx);

  console.log(`  Weekly Navigation Tabs (${wSpec.tabs.length}):`, wSpec.tabs.map(t => `${t.label} (id: ${t.id})`));

  if (wSpec.tabs.some(t => t.id === 'daily' || t.id === 'weekday')) {
    throw new Error('Dataset 2 Failed: Weekly dataset must NOT generate daily or weekday tabs!');
  }
  console.log('  ✅ Dataset 2 (Weekly Navigation) Verified.\n');
  passedCount++;

  // ---------------------------------------------------------------------------
  // DATASET 3: SUPERVISED CLASSIFICATION DATASET -> RISK / COHORT TAB
  // ---------------------------------------------------------------------------
  console.log('>>> [3/4] Testing Classification Dataset Navigation Tabs...');
  const churnRows = [
    { cust: 'C1', churn_flag: 1, tier: 'Basic' },
    { cust: 'C2', churn_flag: 0, tier: 'Premium' },
    { cust: 'C3', churn_flag: 1, tier: 'Basic' },
    { cust: 'C4', churn_flag: 0, tier: 'Premium' }
  ];
  const chCols = Object.keys(churnRows[0]);
  const chSchema = enrichSchemaWithSemantics(detectDatasetSchema(chCols, churnRows));
  const chProfiles = profileDataset(chSchema, churnRows);
  const chCaps = detectCapabilities(chSchema, chProfiles, churnRows.length);
  const chCtx = buildDatasetContext({
    sourceMetadata: { sourceType: 'csv', fileName: 'churn.csv', fileSize: 300, mimeType: 'text/csv', rowCount: 4, colCount: 3, hasHeader: true, warnings: [], status: 'valid' },
    schema: chSchema,
    profiles: chProfiles,
    domain: detectBusinessDomain(chSchema),
    glossary: [],
    relationships: [],
    qualityReport: detectQualityIssuesAndClean(chSchema, chProfiles, churnRows).report,
    capabilities: chCaps,
    rawSample: churnRows,
    cleanedRows: churnRows
  });
  chCtx.understandingReport = buildDatasetUnderstandingReport(chCtx);
  const chSpec = buildDashboardStory(chCtx);

  console.log(`  Classification Navigation Tabs (${chSpec.tabs.length}):`, chSpec.tabs.map(t => `${t.label} (id: ${t.id})`));

  const hasCohortTab = chSpec.tabs.some(t => t.id === 'target-cohorts' || t.id === 'risk_classification');
  if (!hasCohortTab) {
    throw new Error('Dataset 3 Failed: Supervised dataset must include a Target Cohorts tab in navigation!');
  }
  console.log('  ✅ Dataset 3 (Classification Navigation) Verified.\n');
  passedCount++;

  // ---------------------------------------------------------------------------
  // DATASET 4: MARKETING MEDIA ATTRIBUTION DATASET -> MARKETING MEDIA TAB
  // ---------------------------------------------------------------------------
  console.log('>>> [4/4] Testing Marketing MMM Dataset Navigation Tabs...');
  const mmmRows = [
    { tv_spend: 1000, google_spend: 500, sales_conversions: 80 },
    { tv_spend: 1200, google_spend: 600, sales_conversions: 95 }
  ];
  const mCols = Object.keys(mmmRows[0]);
  const mSchema = enrichSchemaWithSemantics(detectDatasetSchema(mCols, mmmRows));
  const mProfiles = profileDataset(mSchema, mmmRows);
  const mCaps = detectCapabilities(mSchema, mProfiles, mmmRows.length);
  const mCtx = buildDatasetContext({
    sourceMetadata: { sourceType: 'csv', fileName: 'mmm.csv', fileSize: 300, mimeType: 'text/csv', rowCount: 2, colCount: 3, hasHeader: true, warnings: [], status: 'valid' },
    schema: mSchema,
    profiles: mProfiles,
    domain: detectBusinessDomain(mSchema),
    glossary: [],
    relationships: [],
    qualityReport: detectQualityIssuesAndClean(mSchema, mProfiles, mmmRows).report,
    capabilities: mCaps,
    rawSample: mmmRows,
    cleanedRows: mmmRows
  });
  mCtx.understandingReport = buildDatasetUnderstandingReport(mCtx);
  const mSpec = buildDashboardStory(mCtx);

  console.log(`  Marketing Navigation Tabs (${mSpec.tabs.length}):`, mSpec.tabs.map(t => `${t.label} (id: ${t.id})`));

  const hasMediaTab = mSpec.tabs.some(t => t.id === 'marketing-media');
  if (!hasMediaTab) {
    throw new Error('Dataset 4 Failed: Marketing media dataset must include marketing-media tab!');
  }
  console.log('  ✅ Dataset 4 (Marketing Navigation) Verified.\n');
  passedCount++;

  console.log('================================================================');
  console.log(`  CHECKPOINT 5 MULTI-DATASET REGRESSION SUITE PASSED (${passedCount}/4)`);
  console.log('================================================================');
}

runMultiDatasetCheckpoint5Tests();
