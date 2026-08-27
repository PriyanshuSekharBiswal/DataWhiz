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

function runMultiDatasetCheckpoint2Tests() {
  console.log('================================================================');
  console.log('  CHECKPOINT 2 MULTI-DATASET REGRESSION SUITE (5 DATASETS)      ');
  console.log('================================================================\n');

  let passedCount = 0;

  // ---------------------------------------------------------------------------
  // DATASET 1: NON-TEMPORAL CATEGORICAL SURVEY
  // ---------------------------------------------------------------------------
  console.log('>>> [1/5] Testing Non-Temporal Survey Capabilities & Planner...');
  const surveyRows = [
    { respondent_id: 'R1', dept: 'HR', score: 4, satisfaction: 'High' },
    { respondent_id: 'R2', dept: 'HR', score: 5, satisfaction: 'High' },
    { respondent_id: 'R3', dept: 'IT', score: 2, satisfaction: 'Low' },
    { respondent_id: 'R4', dept: 'IT', score: 3, satisfaction: 'Medium' },
    { respondent_id: 'R5', dept: 'IT', score: 1, satisfaction: 'Low' }
  ];
  const sCols = Object.keys(surveyRows[0]);
  const sSchema = enrichSchemaWithSemantics(detectDatasetSchema(sCols, surveyRows));
  const sProfiles = profileDataset(sSchema, surveyRows);
  const sCaps = detectCapabilities(sSchema, sProfiles, surveyRows.length);
  const sCtx = buildDatasetContext({
    sourceMetadata: { sourceType: 'csv', fileName: 'survey.csv', fileSize: 500, mimeType: 'text/csv', rowCount: 5, colCount: 4, hasHeader: true, warnings: [], status: 'valid' },
    schema: sSchema,
    profiles: sProfiles,
    domain: detectBusinessDomain(sSchema),
    glossary: buildBusinessGlossary(sSchema, detectBusinessDomain(sSchema)),
    relationships: [],
    qualityReport: detectQualityIssuesAndClean(sSchema, sProfiles, surveyRows).report,
    capabilities: sCaps,
    rawSample: surveyRows,
    cleanedRows: surveyRows
  });
  sCtx.understandingReport = buildDatasetUnderstandingReport(sCtx);
  const sQuestions = discoverBusinessQuestions(sCtx, sCtx.understandingReport);
  const sPlan = planAnalysis(sCtx, sCaps, { mode: 'auto' });

  console.log(`  Discovered Questions (${sQuestions.length}):`, sQuestions.map(q => `[${q.category}] ${q.question}`));
  console.log(`  Plan Tasks (${sPlan.tasks.length}):`, sPlan.tasks.map(t => `${t.title} [type: ${t.analysisType}]`));
  console.log(`  Skipped Tasks (${sPlan.skippedTasks.length}):`, sPlan.skippedTasks.map(s => `${s.category}`));

  const hasTemporalTask = sPlan.tasks.some(t => t.analysisType === 'trend' || t.analysisType === 'time_series_forecasting');
  if (hasTemporalTask) {
    throw new Error('Dataset 1 Failed: Non-temporal survey must have ZERO temporal tasks in analysis plan!');
  }
  console.log('  ✅ Dataset 1 (Non-Temporal Survey) Verified.\n');
  passedCount++;

  // ---------------------------------------------------------------------------
  // DATASET 2: SUPERVISED CHURN RISK CLASSIFICATION
  // ---------------------------------------------------------------------------
  console.log('>>> [2/5] Testing Supervised Churn Classification Capabilities & Planner...');
  const churnRows = [
    { cust_id: 'C1', tenure_m: 2, monthly_fee: 65.5, contract: 'Month-to-Month', churn_flag: 1 },
    { cust_id: 'C2', tenure_m: 24, monthly_fee: 80.0, contract: 'Two-Year', churn_flag: 0 },
    { cust_id: 'C3', tenure_m: 1, monthly_fee: 70.0, contract: 'Month-to-Month', churn_flag: 1 },
    { cust_id: 'C4', tenure_m: 36, monthly_fee: 95.0, contract: 'Two-Year', churn_flag: 0 },
    { cust_id: 'C5', tenure_m: 3, monthly_fee: 60.0, contract: 'Month-to-Month', churn_flag: 1 },
    { cust_id: 'C6', tenure_m: 48, monthly_fee: 85.0, contract: 'Two-Year', churn_flag: 0 }
  ];
  const cCols = Object.keys(churnRows[0]);
  const cSchema = enrichSchemaWithSemantics(detectDatasetSchema(cCols, churnRows));
  const cProfiles = profileDataset(cSchema, churnRows);
  const cCaps = detectCapabilities(cSchema, cProfiles, churnRows.length);
  const cCtx = buildDatasetContext({
    sourceMetadata: { sourceType: 'csv', fileName: 'churn.csv', fileSize: 500, mimeType: 'text/csv', rowCount: 6, colCount: 5, hasHeader: true, warnings: [], status: 'valid' },
    schema: cSchema,
    profiles: cProfiles,
    domain: detectBusinessDomain(cSchema),
    glossary: buildBusinessGlossary(cSchema, detectBusinessDomain(cSchema)),
    relationships: [],
    qualityReport: detectQualityIssuesAndClean(cSchema, cProfiles, churnRows).report,
    capabilities: cCaps,
    rawSample: churnRows,
    cleanedRows: churnRows
  });
  cCtx.understandingReport = buildDatasetUnderstandingReport(cCtx);
  const cPlan = planAnalysis(cCtx, cCaps, { mode: 'auto' });

  console.log(`  Classification Supported: ${cCaps.classification_churn.supported}`);
  console.log(`  Plan Tasks (${cPlan.tasks.length}):`, cPlan.tasks.map(t => `${t.title} [priority: ${t.priority}]`));

  const hasClassificationTask = cPlan.tasks.some(t => t.analysisType === 'classification_churn');
  if (!cCaps.classification_churn.supported || !hasClassificationTask) {
    throw new Error('Dataset 2 Failed: Churn dataset must support and plan classification_churn task!');
  }
  console.log('  ✅ Dataset 2 (Churn Risk Classification) Verified.\n');
  passedCount++;

  // ---------------------------------------------------------------------------
  // DATASET 3: LONGITUDINAL TIME SERIES
  // ---------------------------------------------------------------------------
  console.log('>>> [3/5] Testing Longitudinal Time Series Capabilities & Planner...');
  const timeRows = [
    { date: '2024-01-01', revenue: 10000, cost: 6000 },
    { date: '2024-01-08', revenue: 12000, cost: 7000 },
    { date: '2024-01-15', revenue: 11000, cost: 6500 },
    { date: '2024-01-22', revenue: 14000, cost: 8000 },
    { date: '2024-01-29', revenue: 15500, cost: 8500 },
    { date: '2024-02-05', revenue: 17000, cost: 9000 }
  ];
  const tCols = Object.keys(timeRows[0]);
  const tSchema = enrichSchemaWithSemantics(detectDatasetSchema(tCols, timeRows));
  const tProfiles = profileDataset(tSchema, timeRows);
  const tCaps = detectCapabilities(tSchema, tProfiles, timeRows.length);
  const tCtx = buildDatasetContext({
    sourceMetadata: { sourceType: 'csv', fileName: 'time.csv', fileSize: 500, mimeType: 'text/csv', rowCount: 6, colCount: 3, hasHeader: true, warnings: [], status: 'valid' },
    schema: tSchema,
    profiles: tProfiles,
    domain: detectBusinessDomain(tSchema),
    glossary: buildBusinessGlossary(tSchema, detectBusinessDomain(tSchema)),
    relationships: [],
    qualityReport: detectQualityIssuesAndClean(tSchema, tProfiles, timeRows).report,
    capabilities: tCaps,
    rawSample: timeRows,
    cleanedRows: timeRows
  });
  tCtx.understandingReport = buildDatasetUnderstandingReport(tCtx);
  const tPlan = planAnalysis(tCtx, tCaps, { mode: 'auto' });

  console.log(`  Forecast Supported: ${tCaps.time_series_forecasting.supported}`);
  console.log(`  Trend Supported: ${tCaps.trend.supported}`);

  if (!tCaps.time_series_forecasting.supported || !tPlan.tasks.some(t => t.analysisType === 'time_series_forecasting')) {
    throw new Error('Dataset 3 Failed: Time-series dataset must support forecasting in capabilities and plan!');
  }
  console.log('  ✅ Dataset 3 (Longitudinal Time Series) Verified.\n');
  passedCount++;

  // ---------------------------------------------------------------------------
  // DATASET 4: SINGLE NUMERIC COLUMN
  // ---------------------------------------------------------------------------
  console.log('>>> [4/5] Testing Single Numeric Column Capabilities & Planner...');
  const singleRows = [{ val: 100 }, { val: 150 }, { val: 200 }, { val: 250 }];
  const singleCols = ['val'];
  const singleSchema = enrichSchemaWithSemantics(detectDatasetSchema(singleCols, singleRows));
  const singleProfiles = profileDataset(singleSchema, singleRows);
  const singleCaps = detectCapabilities(singleSchema, singleProfiles, singleRows.length);
  const singleCtx = buildDatasetContext({
    sourceMetadata: { sourceType: 'csv', fileName: 'single.csv', fileSize: 100, mimeType: 'text/csv', rowCount: 4, colCount: 1, hasHeader: true, warnings: [], status: 'valid' },
    schema: singleSchema,
    profiles: singleProfiles,
    domain: detectBusinessDomain(singleSchema),
    glossary: [],
    relationships: [],
    qualityReport: detectQualityIssuesAndClean(singleSchema, singleProfiles, singleRows).report,
    capabilities: singleCaps,
    rawSample: singleRows,
    cleanedRows: singleRows
  });
  singleCtx.understandingReport = buildDatasetUnderstandingReport(singleCtx);
  const singlePlan = planAnalysis(singleCtx, singleCaps, { mode: 'auto' });

  console.log(`  Plan Tasks (${singlePlan.tasks.length}):`, singlePlan.tasks.map(t => `${t.title} [type: ${t.analysisType}]`));
  if (singlePlan.tasks.some(t => t.analysisType === 'correlation_analysis' || t.analysisType === 'regression_modeling')) {
    throw new Error('Dataset 4 Failed: Single column dataset must NOT plan bivariate correlation or regression!');
  }
  console.log('  ✅ Dataset 4 (Single Numeric Column) Verified.\n');
  passedCount++;

  // ---------------------------------------------------------------------------
  // DATASET 5: WIDE SCIENTIFIC EXPERIMENT (15 Numeric Features, No Target)
  // ---------------------------------------------------------------------------
  console.log('>>> [5/5] Testing Wide Scientific Experiment Dataset...');
  const sciRows = [
    { sample: 'S1', f1: 1.2, f2: 3.4, f3: 5.6, f4: 7.8, f5: 9.0 },
    { sample: 'S2', f1: 2.2, f2: 4.4, f3: 6.6, f4: 8.8, f5: 10.0 },
    { sample: 'S3', f1: 1.5, f2: 3.8, f3: 5.9, f4: 8.0, f5: 9.3 },
    { sample: 'S4', f1: 3.1, f2: 5.2, f3: 7.4, f4: 9.5, f5: 11.2 }
  ];
  const sciCols = Object.keys(sciRows[0]);
  const sciSchema = enrichSchemaWithSemantics(detectDatasetSchema(sciCols, sciRows));
  const sciProfiles = profileDataset(sciSchema, sciRows);
  const sciCaps = detectCapabilities(sciSchema, sciProfiles, sciRows.length);
  const sciCtx = buildDatasetContext({
    sourceMetadata: { sourceType: 'csv', fileName: 'sci.csv', fileSize: 500, mimeType: 'text/csv', rowCount: 4, colCount: 6, hasHeader: true, warnings: [], status: 'valid' },
    schema: sciSchema,
    profiles: sciProfiles,
    domain: detectBusinessDomain(sciSchema),
    glossary: [],
    relationships: [],
    qualityReport: detectQualityIssuesAndClean(sciSchema, sciProfiles, sciRows).report,
    capabilities: sciCaps,
    rawSample: sciRows,
    cleanedRows: sciRows
  });
  sciCtx.understandingReport = buildDatasetUnderstandingReport(sciCtx);
  const sciPlan = planAnalysis(sciCtx, sciCaps, { mode: 'auto' });

  console.log(`  Correlation Supported: ${sciCaps.correlation_analysis.supported}`);
  if (!sciCaps.correlation_analysis.supported || !sciPlan.tasks.some(t => t.analysisType === 'correlation_analysis')) {
    throw new Error('Dataset 5 Failed: Wide numeric experiment must plan correlation analysis!');
  }
  console.log('  ✅ Dataset 5 (Wide Scientific Experiment) Verified.\n');
  passedCount++;

  console.log('================================================================');
  console.log(`  CHECKPOINT 2 MULTI-DATASET REGRESSION SUITE PASSED (${passedCount}/5)`);
  console.log('================================================================');
}

runMultiDatasetCheckpoint2Tests();
