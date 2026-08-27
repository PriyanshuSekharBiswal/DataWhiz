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

function runCheckpoint2Tests() {
  console.log('================================================================');
  console.log('  CHECKPOINT 2: CAPABILITY + QUESTION DISCOVERY + PLANNER       ');
  console.log('================================================================\n');

  // TEST 1: Customer Churn (Cross-sectional)
  console.log('--- TEST 1: Customer Churn Dataset ---');
  const churnRows = [
    { customer_id: 'C-01', tenure_mths: 12, monthly_fee: 49.99, contract: 'Month-to-Month', churn: 'Yes' },
    { customer_id: 'C-02', tenure_mths: 36, monthly_fee: 89.99, contract: 'Two-Year', churn: 'No' },
    { customer_id: 'C-03', tenure_mths: 6, monthly_fee: 49.99, contract: 'Month-to-Month', churn: 'Yes' },
    { customer_id: 'C-04', tenure_mths: 48, monthly_fee: 119.99, contract: 'Two-Year', churn: 'No' },
    { customer_id: 'C-05', tenure_mths: 24, monthly_fee: 79.99, contract: 'One-Year', churn: 'No' },
    { customer_id: 'C-06', tenure_mths: 4, monthly_fee: 55.00, contract: 'Month-to-Month', churn: 'Yes' },
    { customer_id: 'C-07', tenure_mths: 60, monthly_fee: 99.00, contract: 'Two-Year', churn: 'No' },
    { customer_id: 'C-08', tenure_mths: 18, monthly_fee: 65.00, contract: 'One-Year', churn: 'No' }
  ];
  const churnCols = Object.keys(churnRows[0]);
  const churnSchema = enrichSchemaWithSemantics(detectDatasetSchema(churnCols, churnRows));
  const churnProfiles = profileDataset(churnSchema, churnRows);
  const churnCaps = detectCapabilities(churnSchema, churnProfiles, churnRows.length);
  const churnContext = buildDatasetContext({
    sourceMetadata: { sourceType: 'csv', fileName: 'churn.csv', fileSize: 1024, mimeType: 'text/csv', rowCount: churnRows.length, colCount: churnCols.length, hasHeader: true, warnings: [], status: 'valid' },
    schema: churnSchema,
    profiles: churnProfiles,
    domain: detectBusinessDomain(churnSchema),
    glossary: buildBusinessGlossary(churnSchema, detectBusinessDomain(churnSchema)),
    relationships: [],
    qualityReport: detectQualityIssuesAndClean(churnSchema, churnProfiles, churnRows).report,
    capabilities: churnCaps,
    rawSample: churnRows,
    cleanedRows: churnRows
  });

  const churnReport = buildDatasetUnderstandingReport(churnContext);
  churnContext.understandingReport = churnReport;
  const churnQuestions = discoverBusinessQuestions(churnContext, churnReport);
  churnContext.businessQuestions = churnQuestions;
  const churnPlan = planAnalysis(churnContext, churnCaps, { mode: 'auto' });

  console.log(`Discovered ${churnQuestions.length} questions.`);
  churnQuestions.forEach(q => console.log(`  [${q.category}] ${q.question} (supported: ${q.supported})`));
  console.log(`\nGenerated Plan: ${churnPlan.planSummary}`);
  console.log(`High Priority Tasks (${churnPlan.highPriorityTasks.length}):`, churnPlan.highPriorityTasks.map(t => `${t.title} [tools: ${t.requiredTools.join(',')}]`));
  console.log(`Skipped Tasks (${churnPlan.skippedTasks.length}):`, churnPlan.skippedTasks.map(s => `${s.category}: ${s.reason.slice(0, 50)}...`));

  if (!churnCaps.classification_churn.supported) {
    throw new Error('Test Failed: Supervised classification should be supported for churn dataset!');
  }
  if (churnCaps.time_series_forecasting.supported) {
    throw new Error('Test Failed: Forecasting must NOT be supported for non-temporal churn data!');
  }
  console.log('✅ Churn dataset capabilities, questions, and plan verified.\n');

  // TEST 2: Multi-Year Longitudinal Retail Ledger
  console.log('--- TEST 2: Multi-Year Retail Ledger ---');
  const retailRows = [
    { date: '2023-01-01', region: 'Europe', category: 'Electronics', revenue: 45000 },
    { date: '2023-02-01', region: 'Europe', category: 'Electronics', revenue: 48000 },
    { date: '2023-03-01', region: 'Europe', category: 'Electronics', revenue: 52000 },
    { date: '2023-04-01', region: 'Europe', category: 'Electronics', revenue: 51000 },
    { date: '2023-05-01', region: 'Europe', category: 'Electronics', revenue: 58000 },
    { date: '2023-06-01', region: 'Europe', category: 'Electronics', revenue: 62000 },
    { date: '2023-07-01', region: 'Europe', category: 'Electronics', revenue: 64000 },
    { date: '2023-08-01', region: 'Europe', category: 'Electronics', revenue: 67000 }
  ];
  const retailCols = Object.keys(retailRows[0]);
  const retailSchema = enrichSchemaWithSemantics(detectDatasetSchema(retailCols, retailRows));
  const retailProfiles = profileDataset(retailSchema, retailRows);
  const retailCaps = detectCapabilities(retailSchema, retailProfiles, retailRows.length);
  const retailContext = buildDatasetContext({
    sourceMetadata: { sourceType: 'csv', fileName: 'retail.csv', fileSize: 1024, mimeType: 'text/csv', rowCount: retailRows.length, colCount: retailCols.length, hasHeader: true, warnings: [], status: 'valid' },
    schema: retailSchema,
    profiles: retailProfiles,
    domain: detectBusinessDomain(retailSchema),
    glossary: buildBusinessGlossary(retailSchema, detectBusinessDomain(retailSchema)),
    relationships: [],
    qualityReport: detectQualityIssuesAndClean(retailSchema, retailProfiles, retailRows).report,
    capabilities: retailCaps,
    rawSample: retailRows,
    cleanedRows: retailRows
  });

  const retailReport = buildDatasetUnderstandingReport(retailContext);
  retailContext.understandingReport = retailReport;
  const retailQuestions = discoverBusinessQuestions(retailContext, retailReport);
  retailContext.businessQuestions = retailQuestions;
  const retailPlan = planAnalysis(retailContext, retailCaps, { mode: 'auto' });

  if (!retailCaps.time_series_forecasting.supported) {
    throw new Error('Test Failed: Forecasting should be supported for 8-period longitudinal retail dataset!');
  }
  if (!retailPlan.tasks.some(t => t.analysisType === 'time_series_forecasting')) {
    throw new Error('Test Failed: Analysis plan must include time_series_forecasting for longitudinal dataset!');
  }
  console.log('✅ Retail longitudinal capabilities, questions, and plan verified.\n');

  console.log('================================================================');
  console.log('  CHECKPOINT 2 TESTS PASSED!                                    ');
  console.log('================================================================');
}

runCheckpoint2Tests();
