// Master Senior Analyst Intelligence Truthful Regression Benchmark Suite
// Validates Requirements A through L with mathematical grounding and zero tolerance for fabricated defaults

import { runFullAnalysisPipeline } from '../lib/pipeline';
import { processAskQuery } from '../lib/askDataEngine';
import { isAggregationAllowed, computeSafeAggregation } from '../lib/analytics/aggregationEngine';
import { detectCurrency } from '../lib/currency/currencyEngine';
import { inferMeasurement } from '../lib/units/measurementEngine';

function runRegressionSuite() {
  console.log('================================================================');
  console.log('  DATAWHIZ SENIOR ANALYST INTELLIGENCE REGRESSION BENCHMARK      ');
  console.log('================================================================\n');

  let totalTests = 0;
  let passedTests = 0;

  function assert(testId: string, testName: string, condition: boolean, details: string) {
    totalTests++;
    if (condition) {
      passedTests++;
      console.log(`  ✅ [PASSED] [${testId}] ${testName}: ${details}`);
    } else {
      console.error(`  ❌ [FAILED] [${testId}] ${testName}: ${details}`);
    }
  }

  // =========================================================================
  // TEST A: Unknown Currency (No invented €, $, ₹)
  // =========================================================================
  console.log('\n--- TEST A: Unknown Currency Handling ---');
  const unknownCurrencyCSV = `account_id,monthly_fee,tenure_months,customer_segment
ACC-001,45.50,12,Enterprise
ACC-002,65.00,24,SMB
ACC-003,50.25,6,Enterprise
ACC-004,80.00,18,SMB`;

  const resA = runFullAnalysisPipeline({
    csvContent: unknownCurrencyCSV,
    fileName: 'unspecified_currency_accounts.csv'
  });

  const feeSchemaA = resA.context.schema.find(s => s.technicalName === 'monthly_fee');
  const feeCurrencyA = detectCurrency('monthly_fee', [45.5, 65.0, 50.25, 80.0]);
  const primaryKpiA = resA.dashboard.spec?.overview.kpis[0];

  assert('TEST-A1', 'Currency Detection', feeCurrencyA.currencyCode === 'unspecified', `Inferred currencyCode: '${feeCurrencyA.currencyCode}' (No invented symbol)`);
  assert('TEST-A2', 'No Hardcoded Euro in KPI', !primaryKpiA?.value.includes('€') && !primaryKpiA?.value.includes('₹'), `Primary KPI formatted value: '${primaryKpiA?.value}' (No arbitrary € or ₹ invented)`);
  assert('TEST-A3', 'Measurement Semantics', feeSchemaA?.measurementType === 'currency', `Identified measurementType: '${feeSchemaA?.measurementType}' with unspecified currency`);

  // =========================================================================
  // TEST B: Explicit EUR Verification
  // =========================================================================
  console.log('\n--- TEST B: Explicit EUR Currency Verification ---');
  const explicitEurCSV = `product_code,revenue_eur,units_sold
PROD-01,1500.00,10
PROD-02,2500.00,20
PROD-03,3200.00,15`;

  const resB = runFullAnalysisPipeline({
    csvContent: explicitEurCSV,
    fileName: 'european_sales.csv'
  });

  const revSchemaB = resB.context.schema.find(s => s.technicalName === 'revenue_eur');
  const primaryKpiB = resB.dashboard.spec?.overview.kpis[0];

  assert('TEST-B1', 'Explicit EUR Detection', revSchemaB?.unitMetadata?.currencyCode === 'EUR', `Verified currencyCode: '${revSchemaB?.unitMetadata?.currencyCode}'`);
  assert('TEST-B2', 'Euro Symbol Preserved', primaryKpiB?.value.includes('€') === true, `Formatted KPI contains €: '${primaryKpiB?.value}'`);

  // =========================================================================
  // TEST C: Physical Quantity (Tonnes / Kilograms)
  // =========================================================================
  console.log('\n--- TEST C: Physical Quantity & Mass Measurement ---');
  const massCSV = `commodity,sales_quantity_tonnes,transport_cost_usd
Iron Ore,50000.5,120000
Bauxite,32000.0,85000
Copper Concentrate,12000.0,95000`;

  const resC = runFullAnalysisPipeline({
    csvContent: massCSV,
    fileName: 'bulk_commodities.csv'
  });

  const massSchemaC = resC.context.schema.find(s => s.technicalName === 'sales_quantity_tonnes');
  assert('TEST-C1', 'Mass Measurement Detection', massSchemaC?.measurementType === 'mass', `Identified measurementType: '${massSchemaC?.measurementType}', unit: '${massSchemaC?.unitMetadata?.unitName}'`);
  assert('TEST-C2', 'Mass Unit Suffix', massSchemaC?.unitMetadata?.unitSymbol === 'tonnes', `Unit symbol: '${massSchemaC?.unitMetadata?.unitSymbol}' (Never currency)`);

  // =========================================================================
  // TEST D: Ratio Semantics (SUM Forbidden)
  // =========================================================================
  console.log('\n--- TEST D: Ratio Semantics & Aggregation Protection ---');
  const ratioCSV = `company_ticker,current_ratio,debt_to_equity
AAPL,1.45,1.80
MSFT,1.75,0.45
GOOG,2.10,0.10
AMZN,1.05,0.70`;

  const resD = runFullAnalysisPipeline({
    csvContent: ratioCSV,
    fileName: 'financial_ratios.csv'
  });

  const ratioSchemaD = resD.context.schema.find(s => s.technicalName === 'current_ratio');
  const sumCheckD = isAggregationAllowed('sum', ratioSchemaD);
  const avgCheckD = isAggregationAllowed('mean', ratioSchemaD);
  const safeCalcD = computeSafeAggregation([1.45, 1.75, 2.10, 1.05], 'sum', ratioSchemaD);

  assert('TEST-D1', 'Ratio Classification', ratioSchemaD?.measurementType === 'ratio', `Classified as ratio: '${ratioSchemaD?.measurementType}'`);
  assert('TEST-D2', 'SUM Forbidden on Ratio', sumCheckD.allowed === false, `SUM is rejected: ${sumCheckD.reason}`);
  assert('TEST-D3', 'MEAN Allowed on Ratio', avgCheckD.allowed === true, `MEAN is allowed`);
  assert('TEST-D4', 'Safe Aggregation Fallback', safeCalcD.appliedAggregation === 'mean' && Math.abs(safeCalcD.value - 1.59) < 0.05, `Safe calculation adjusted to mean: ${safeCalcD.value}`);

  // =========================================================================
  // TEST E: Temperature Semantics (SUM Forbidden)
  // =========================================================================
  console.log('\n--- TEST E: Temperature Intensive Measurement ---');
  const tempCSV = `machine_id,engine_temp_c,vibration_hz
M-01,88.4,12.5
M-02,92.1,14.0
M-03,85.0,11.2
M-04,96.5,18.2`;

  const resE = runFullAnalysisPipeline({
    csvContent: tempCSV,
    fileName: 'machine_telemetry.csv'
  });

  const tempSchemaE = resE.context.schema.find(s => s.technicalName === 'engine_temp_c');
  const sumCheckE = isAggregationAllowed('sum', tempSchemaE);

  assert('TEST-E1', 'Temperature Measurement Family', tempSchemaE?.measurementType === 'temperature', `Identified measurementType: '${tempSchemaE?.measurementType}'`);
  assert('TEST-E2', 'SUM Forbidden on Temperature', sumCheckE.allowed === false, `SUM is forbidden: ${sumCheckE.reason}`);
  assert('TEST-E3', 'Temperature Unit Symbol', tempSchemaE?.unitMetadata?.unitSymbol === '°C', `Unit symbol: '${tempSchemaE?.unitMetadata?.unitSymbol}'`);

  // =========================================================================
  // TEST F: Identifier & DateKey Column Non-Promotion
  // =========================================================================
  console.log('\n--- TEST F: Identifier & Key Column Non-Promotion ---');
  const keyCSV = `DateKey,customer_id,transaction_amount
20240101,CUST-9901,150.0
20240102,CUST-9902,220.0
20240103,CUST-9903,180.0
20240104,CUST-9904,310.0`;

  const resF = runFullAnalysisPipeline({
    csvContent: keyCSV,
    fileName: 'transactions_keyed.csv'
  });

  const dateKeySchemaF = resF.context.schema.find(s => s.technicalName === 'DateKey');
  const idSchemaF = resF.context.schema.find(s => s.technicalName === 'customer_id');
  const isDateKeyTarget = resF.context.targetCandidates?.some(t => t.column === 'DateKey');

  assert('TEST-F1', 'DateKey Identifier Role', dateKeySchemaF?.logicalType === 'identifier', `DateKey identified as identifier (not measure)`);
  assert('TEST-F2', 'Customer ID Identifier Role', idSchemaF?.logicalType === 'identifier', `customer_id identified as identifier`);
  assert('TEST-F3', 'Not Promoted to Prediction Target', !isDateKeyTarget, `DateKey is excluded from target candidates`);

  // =========================================================================
  // TEST G: Categorical Labels (No 0,1,2,3 Index Fallbacks)
  // =========================================================================
  console.log('\n--- TEST G: Categorical Labels on Visualization Figures ---');
  const catCSV = `material,production_tonnes
Steel,4500
Coal,8200
Copper,1800
Aluminum,3100`;

  const resG = runFullAnalysisPipeline({
    csvContent: catCSV,
    fileName: 'production_materials.csv'
  });

  const chartsG = resG.dashboard.charts;
  const barChartG = chartsG.find(c => c.type === 'bar' || c.type === 'pie');
  const labelsG = barChartG?.data.map(d => d.name) || [];

  assert('TEST-G1', 'Chart Generated', Boolean(barChartG), `Bar/Pie chart constructed: '${barChartG?.title}'`);
  assert('TEST-G2', 'Source Derived Labels', labelsG.includes('Coal') && labelsG.includes('Steel'), `Chart labels contain true categories: [${labelsG.join(', ')}] (No 0, 1, 2, 3 fallback)`);

  // =========================================================================
  // TEST H: Ask Your Data Grounded Field & Aggregation Resolver
  // =========================================================================
  console.log('\n--- TEST H: Ask Your Data Aggregation & Field Resolver ---');
  const yieldCSV = `batch_code,crop_yield_kg,fertilizer_applied
BATCH-A,450.0,50
BATCH-B,520.0,60
BATCH-C,480.0,55
BATCH-D,550.0,65`;

  const resH = runFullAnalysisPipeline({
    csvContent: yieldCSV,
    fileName: 'agricultural_batches.csv'
  });

  const askAvg = processAskQuery('What is the average crop yield?', resH.context);
  assert('TEST-H1', 'Average Calculation Tool', askAvg.provenance?.toolName === 'aggregate', `Executed tool: '${askAvg.provenance?.toolName}'`);
  assert('TEST-H2', 'Average Aggregation Resolved', askAvg.provenance?.aggregation === 'avg' || askAvg.provenance?.aggregation === 'mean', `Resolved aggregation: '${askAvg.provenance?.aggregation}'`);
  assert('TEST-H3', 'Correct Mathematical Mean', askAvg.text.includes('500') === true, `Answer includes correct average (500 kg): '${askAvg.text}'`);

  // =========================================================================
  // TEST I: Correlation Analysis (X vs Y, Never X vs X)
  // =========================================================================
  console.log('\n--- TEST I: Correlation Bivariate Pairs ---');
  const askCorr = processAskQuery('What is the correlation between crop yield and fertilizer?', resH.context);
  assert('TEST-I1', 'Correlation Tool Executed', askCorr.provenance?.toolName === 'correlation', `Executed correlation tool: '${askCorr.provenance?.toolName}'`);
  assert('TEST-I2', 'Distinct Column Pair', askCorr.provenance?.sourceColumns[0] !== askCorr.provenance?.sourceColumns[1], `Correlated distinct pair: ${askCorr.provenance?.sourceColumns.join(' ↔ ')}`);

  // =========================================================================
  // TEST J: Time & Forecasting Capability Validation
  // =========================================================================
  console.log('\n--- TEST J: Time & Forecasting Capability Gates ---');
  const noDateCSV = `store_id,footfall,sales_amount
S-1,120,4500
S-2,150,5500
S-3,180,6800`;

  const resJNoDate = runFullAnalysisPipeline({
    csvContent: noDateCSV,
    fileName: 'cross_sectional_stores.csv'
  });

  assert('TEST-J1', 'Forecasting Unsupported on Zero Dates', resJNoDate.context.capabilities.time_series_forecasting.supported === false, `Forecasting correctly unsupported: ${resJNoDate.context.capabilities.time_series_forecasting.reason}`);

  const validTimeCSV = `log_date,daily_active_users
2024-01-01,1000
2024-01-02,1050
2024-01-03,1100
2024-01-04,1080
2024-01-05,1150
2024-01-06,1200
2024-01-07,1250
2024-01-08,1300`;

  const resJTime = runFullAnalysisPipeline({
    csvContent: validTimeCSV,
    fileName: 'daily_active_users.csv'
  });

  assert('TEST-J2', 'Forecasting Supported on 8-period Daily Series', resJTime.context.capabilities.time_series_forecasting.supported === true, `Forecasting supported on 8 periods`);

  // =========================================================================
  // TEST K: Unsupported Module Clean Pruning
  // =========================================================================
  console.log('\n--- TEST K: Unsupported Capability Clean Pruning ---');
  assert('TEST-K1', 'Geographic Breakdown Pruned When No Geo Columns', resJTime.context.capabilities.geographic_breakdown.supported === false, `Geographic breakdown cleanly unsupported`);
  assert('TEST-K2', 'Analysis Plan Skips Unsupported', resJTime.plan.skippedTasks.some(s => s.category === 'geographic_breakdown'), `Analysis Plan records skipped task with explicit reason`);

  // =========================================================================
  // TEST L: Binary Outcome Semantics & Polarity (Delivered = 1 != Risk)
  // =========================================================================
  console.log('\n--- TEST L: Binary Outcome Polarity & Favorable Outcomes ---');
  const deliveryCSV = `carrier,dispatch_date,payload_kg,delivered_status
Carrier-Alpha,2024-01-01,1200,1
Carrier-Alpha,2024-01-08,1400,1
Carrier-Beta,2024-01-01,1100,0
Carrier-Beta,2024-01-08,1300,0
Carrier-Gamma,2024-01-01,900,1
Carrier-Gamma,2024-01-08,950,1`;

  const resL = runFullAnalysisPipeline({
    csvContent: deliveryCSV,
    fileName: 'logistics_deliveries.csv'
  });

  const delTargetL = resL.context.targetCandidates?.find(t => t.column === 'delivered_status');
  const segFindingL = resL.findings.find(f => f.type === 'segmentation');
  const segObsL = resL.observations.find(o => o.findingId === segFindingL?.id);

  assert('TEST-L1', 'Favorable Polarity Detection', delTargetL?.polarity === 'favorable', `Target polarity: '${delTargetL?.polarity}' (Recognized as positive outcome)`);
  assert('TEST-L2', 'No High-Risk Labeling for Delivery Success', !segFindingL?.statement.includes('High-risk') && !segObsL?.title.includes('High-Risk'), `Finding statement: '${segFindingL?.statement}', Observation: '${segObsL?.title}' (Accurately labeled without false risk alert)`);

  // =========================================================================
  // TEST M: Unfamiliar Synthetic Schema (No Hardcoded Domain Templates)
  // =========================================================================
  console.log('\n--- TEST M: Unfamiliar Synthetic Schema Reasoning ---');
  const unfamiliarCSV = `batch_uid,col_alpha,param_x9,status_flag
B-101,45.2,120,0
B-102,52.8,135,1
B-103,48.1,110,0
B-104,61.0,150,1
B-105,58.4,140,1
B-106,64.2,160,0`;

  const resM = runFullAnalysisPipeline({
    csvContent: unfamiliarCSV,
    fileName: 'unfamiliar_synthetic_experiment.csv'
  });

  const alphaSchemaM = resM.context.schema.find(s => s.technicalName === 'col_alpha');
  const planTasksM = resM.plan.tasks;
  const primaryKpiM = resM.dashboard.spec?.overview.kpis[0];

  assert('TEST-M1', 'No Fabricated Domain Archetype', resM.understandingReport.archetype === 'general_tabular', `Assigned archetype: '${resM.understandingReport.archetype}' (No forced retail/churn/MMM template)`);
  assert('TEST-M2', 'No Fabricated Currency on Cryptic Metrics', !primaryKpiM?.value.includes('€') && !primaryKpiM?.value.includes('$'), `Primary KPI formatted value: '${primaryKpiM?.value}' (No invented currency)`);
  assert('TEST-M3', 'Dynamic Analysis Tasks Planned', planTasksM.length >= 3, `Planned ${planTasksM.length} validated analytical tasks dynamically`);
  assert('TEST-M4', 'No Meaningless Index Axes', !resM.dashboard.charts.some(c => c.data.every((d, i) => d.name === String(i))), `Generated charts contain genuine source values without 0,1,2,3 index axes`);

  console.log('\n================================================================');
  console.log(`  BENCHMARK RESULTS: ${passedTests} / ${totalTests} TESTS PASSED (${Math.round((passedTests / totalTests) * 100)}%)`);
  console.log('================================================================\n');

  if (passedTests === totalTests) {
    console.log('🎉 ALL SENIOR ANALYST INTELLIGENCE BENCHMARKS PASSED PERFECTLY!');
  } else {
    console.error('❌ SOME TESTS FAILED.');
    process.exit(1);
  }
}

runRegressionSuite();
