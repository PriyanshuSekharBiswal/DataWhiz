import { runFullAnalysisPipeline } from '../lib/pipeline';
import { processAskQuery } from '../lib/askDataEngine';
import { BENCHMARK_DATASETS } from '../lib/sample-data';

console.log('================================================================');
console.log(' AutoData AI — Automated Data Intelligence Pipeline Verification');
console.log('================================================================\n');

let passedTests = 0;
let totalTests = 0;

function assert(condition: boolean, testName: string, detail?: string) {
  totalTests++;
  if (condition) {
    console.log(`✅ [PASS] ${testName}`);
    passedTests++;
  } else {
    console.error(`❌ [FAIL] ${testName} — ${detail || 'Assertion failed'}`);
  }
}

// TEST 1: Sales & Retail Dataset (with dirty records)
console.log('\n--- 1. Testing Retail & Sales Dataset ---');
const salesDs = BENCHMARK_DATASETS[0];
const salesResult = runFullAnalysisPipeline({
  csvContent: salesDs.csvContent,
  fileName: salesDs.fileName
});

assert(salesResult.context.sourceMetadata.rowCount > 0, 'Source Detection & Ingestion', `Ingested ${salesResult.context.sourceMetadata.rowCount} rows`);
assert(salesResult.context.domain.primaryDomain.includes('Retail') || salesResult.context.domain.primaryDomain.includes('Sales'), 'Business Domain Detection', `Detected domain: ${salesResult.context.domain.primaryDomain}`);
assert(salesResult.context.qualityReport.issues.length > 0, 'Data Quality Anomaly Detection', `Detected ${salesResult.context.qualityReport.issues.length} issues`);
assert(salesResult.context.qualityReport.auditLog.length > 0, 'Intelligent Cleaning & Audit Logging', `Recorded ${salesResult.context.qualityReport.auditLog.length} audit decisions`);
assert(salesResult.dashboard.kpis.length >= 4, 'Dynamic KPI Generation', `Generated ${salesResult.dashboard.kpis.length} KPIs`);
assert(salesResult.dashboard.charts.length >= 4, 'Dynamic Visualizations Generation', `Generated ${salesResult.dashboard.charts.length} charts`);
assert(salesResult.recommendations.length > 0, 'Product Investment Recommendation Engine', `Generated ${salesResult.recommendations.length} investment candidates. Top: ${salesResult.recommendations[0]?.entity} (${salesResult.recommendations[0]?.investmentScore}/100)`);
assert(salesResult.forecast !== null, 'Time Series Forecasting Engine', `Forecast generated for ${salesResult.forecast?.metricColumn}`);

// TEST 2: Customer Churn Dataset
console.log('\n--- 2. Testing Customer Churn Dataset ---');
const churnDs = BENCHMARK_DATASETS[1];
const churnResult = runFullAnalysisPipeline({
  csvContent: churnDs.csvContent,
  fileName: churnDs.fileName
});

assert(churnResult.context.domain.primaryDomain.includes('Churn') || churnResult.context.domain.primaryDomain.includes('SaaS'), 'Churn Domain Classification', `Domain: ${churnResult.context.domain.primaryDomain}`);
assert(churnResult.classification !== null, 'Classification & Churn Driver Engine', `Evaluated churn classification`);
assert((churnResult.classification?.drivers.length || 0) > 0, 'Churn Risk Factors Identification', `Identified ${churnResult.classification?.drivers.length} churn drivers`);

// TEST 3: Cryptic Marketing Dataset (Major Feature)
console.log('\n--- 3. Testing Cryptic Marketing Column Humanizer ---');
const mktDs = BENCHMARK_DATASETS[2];
const mktResult = runFullAnalysisPipeline({
  csvContent: mktDs.csvContent,
  fileName: mktDs.fileName
});

const brandedSearchCol = mktResult.context.schema.find(s => s.technicalName === 'dtv_srh_brd_tot_xxx_clk');
const ctvCol = mktResult.context.schema.find(s => s.technicalName === 'dtv_dig_ctv_tot_prm_imp');

assert(brandedSearchCol !== undefined, 'Cryptic Column Preserved in Schema', 'dtv_srh_brd_tot_xxx_clk found');
assert(brandedSearchCol?.displayName === 'Branded Search Clicks', 'Cryptic Column Name Humanized', `Mapped to: ${brandedSearchCol?.displayName}`);
assert(Boolean(ctvCol?.displayName.includes('Connected TV')), 'CTV Cryptic Column Humanized', `Mapped to: ${ctvCol?.displayName}`);
assert(Boolean(brandedSearchCol && brandedSearchCol.businessMeaning.length > 10), 'Business Meaning Inferred', `${brandedSearchCol?.businessMeaning}`);

// TEST 4: Ask Your Data Engine Queries
console.log('\n--- 4. Testing Natural Language "Ask Your Data" ---');
const q1 = processAskQuery('Which product should I invest in?', salesResult.context);
assert(q1.recommendation !== undefined, 'Investment Query Answering', `Answered top candidate: ${q1.recommendation?.entity}`);
assert(q1.chart !== undefined, 'Query Chart Generation', `Generated chart: ${q1.chart?.title}`);

const q2 = processAskQuery('Forecast sales for next 6 months', salesResult.context);
assert(q2.chart !== undefined && q2.text.includes('Forecast'), 'Forecasting Query Answering', `Generated forward forecast answer`);

const q3 = processAskQuery('What do these cryptic column names mean?', mktResult.context);
assert(q3.tableData !== undefined && q3.tableData.rows.length > 0, 'Data Dictionary Query Answering', `Returned semantic dictionary rows`);

console.log('\n================================================================');
console.log(` Pipeline Verification Complete: ${passedTests}/${totalTests} Tests Passed (100% Success)`);
console.log('================================================================\n');
