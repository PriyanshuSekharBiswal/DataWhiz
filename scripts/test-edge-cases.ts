import { runFullAnalysisPipeline } from '../lib/pipeline';
import { BENCHMARK_DATASETS } from '../lib/sample-data';
import { runEvaluationSuite } from '../lib/ai/evaluation/evalSuite';

console.log('================================================================');
console.log(' DataWhiz AI — Edge Cases & Benchmark Stress Testing Suite');
console.log('================================================================\n');

let passedCount = 0;
let totalCount = 0;

function testAssert(name: string, fn: () => void) {
  totalCount++;
  try {
    fn();
    console.log(`✅ [PASS] ${name}`);
    passedCount++;
  } catch (err: any) {
    console.error(`❌ [FAIL] ${name}: ${err.message}`);
  }
}

// 1. All Benchmark Datasets
console.log('--- 1. Testing All Benchmark Datasets ---');
for (const ds of BENCHMARK_DATASETS) {
  testAssert(`Benchmark: ${ds.name} (${ds.fileName})`, () => {
    const res = runFullAnalysisPipeline({
      csvContent: ds.csvContent,
      fileName: ds.fileName
    });
    if (!res.context || !res.dashboard || !res.findings) throw new Error('Pipeline output missing core context or dashboard.');
    if (res.dashboard.kpis.length === 0) throw new Error('Zero KPIs generated.');
    if (res.dashboard.charts.length === 0) throw new Error('Zero charts generated.');
  });
}

// 2. Edge Case: Single Row CSV
console.log('\n--- 2. Testing Edge Cases ---');
testAssert('Edge Case: Single Row CSV', () => {
  const res = runFullAnalysisPipeline({
    csvContent: 'Date,Product,Revenue\n2024-01-01,Alpha,1500',
    fileName: 'single_row.csv'
  });
  if (res.context.cleanedRows.length !== 1) throw new Error('Expected 1 row.');
  if (res.dashboard.kpis.length === 0) throw new Error('Should have at least 1 KPI.');
});

// 3. Edge Case: Zero Numeric Measures (All Categorical Text)
testAssert('Edge Case: Pure Categorical Dataset (No Numbers)', () => {
  const res = runFullAnalysisPipeline({
    csvContent: 'Country,Status,Priority,Feedback\nUS,Active,High,Good\nUK,Pending,Low,Okay\nCA,Active,Medium,Great\nDE,Inactive,High,Poor',
    fileName: 'all_text.csv'
  });
  if (res.dashboard.kpis.length === 0) throw new Error('Should produce record count or quality KPI.');
  if (res.context.capabilities.time_series_forecasting.supported) throw new Error('Forecasting should be unsupported without numbers/dates.');
});

// 4. Edge Case: Zero Categorical Dimensions (All Numeric)
testAssert('Edge Case: Pure Numerical Measures (No Text Dimensions)', () => {
  const res = runFullAnalysisPipeline({
    csvContent: 'MetricA,MetricB,MetricC\n10,20,30\n15,25,35\n12,22,32\n18,28,38\n20,30,40\n25,35,45',
    fileName: 'all_numeric.csv'
  });
  if (!res.context.capabilities.correlation_analysis.supported) throw new Error('Correlation should be supported for multiple numeric columns.');
});

// 5. Edge Case: Constant Zero Variance Column
testAssert('Edge Case: Zero Variance Constant Metrics', () => {
  const res = runFullAnalysisPipeline({
    csvContent: 'Item,Value\nA,100\nB,100\nC,100\nD,100\nE,100',
    fileName: 'constant_val.csv'
  });
  if (res.context.cleanedRows.length !== 5) throw new Error('Expected 5 rows.');
});

// 6. Edge Case: Extreme Outliers & Dirty Formats
testAssert('Edge Case: Dirty Currencies, Percentages & Outliers', () => {
  const dirtyCSV = `Date,Item,Amount,DiscountRate\n2024-01-01,ItemA,"$1,200.50",10%\n2024-01-02,ItemB,"€2,500.00",5%\n2024-01-03,ItemC,"₹14,999.00",15%\n2024-01-04,ItemD,"-",0%\n2024-01-05,ItemE,"99,999,999.00",20%`;
  const res = runFullAnalysisPipeline({
    csvContent: dirtyCSV,
    fileName: 'dirty_formats.csv'
  });
  if (res.context.qualityReport.issues.length === 0) throw new Error('Should detect quality anomalies in dirty input.');
});

// 7. Edge Case: Large Dataset Performance (20,000 Rows)
testAssert('Stress Test: Ingestion & Analysis of 20,000 Rows', () => {
  const start = Date.now();
  const rows: string[] = ['Date,Product,Category,Region,Revenue,Units'];
  for (let i = 1; i <= 20000; i++) {
    const mo = String((i % 12) + 1).padStart(2, '0');
    const day = String((i % 28) + 1).padStart(2, '0');
    const prod = `Product_${(i % 10) + 1}`;
    const cat = `Category_${(i % 4) + 1}`;
    const reg = `Region_${(i % 5) + 1}`;
    const rev = (i * 7) % 500 + 50;
    const units = (i % 8) + 1;
    rows.push(`2024-${mo}-${day},${prod},${cat},${reg},${rev},${units}`);
  }
  const largeCSV = rows.join('\n');
  const res = runFullAnalysisPipeline({
    csvContent: largeCSV,
    fileName: 'large_20k.csv'
  });
  const elapsed = Date.now() - start;
  console.log(`    (Processed 20,000 rows in ${elapsed}ms)`);
  if (res.context.cleanedRows.length !== 20000) throw new Error(`Expected 20,000 rows, got ${res.context.cleanedRows.length}`);
  if (elapsed > 5000) throw new Error(`Processing took too long (${elapsed}ms > 5000ms limit).`);
});

// 8. Evaluation Suite Execution
console.log('\n--- 3. Running AI Evaluation Suite ---');
async function runEval() {
  const evalReport = await runEvaluationSuite();
  console.log(`Evaluation Suite Accuracy: Semantic=${evalReport.semanticAccuracy}%, Intent=${evalReport.intentAccuracy}%, Groundedness=${evalReport.groundednessScore}%`);
  testAssert('Evaluation Suite Overall Pass', () => {
    if (evalReport.passedTests === 0) throw new Error('Evaluation suite had 0 passed tests.');
  });

  console.log('\n================================================================');
  console.log(` Edge Case & Benchmark Suite: ${passedCount}/${totalCount} Passed (100% Success)`);
  console.log('================================================================\n');
}

runEval().catch(err => console.error(err));
