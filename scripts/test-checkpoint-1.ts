import { detectDatasetSchema } from '../lib/schema/schemaDetector';
import { profileDataset } from '../lib/profiling/dataProfiler';
import { enrichSchemaWithSemantics } from '../lib/semantics/columnHumanizer';
import { detectBusinessDomain, buildBusinessGlossary } from '../lib/semantics/domainDetector';
import { detectQualityIssuesAndClean } from '../lib/quality/qualityEngine';
import { detectCapabilities } from '../lib/capabilities/capabilityDetector';
import { buildDatasetContext } from '../lib/context/datasetContextBuilder';
import { buildDatasetUnderstandingReport } from '../lib/context/datasetUnderstandingEngine';
import { inferTargetCandidates } from '../lib/semantics/targetInference';

function runCheckpoint1Tests() {
  console.log('================================================================');
  console.log('  CHECKPOINT 1: SEMANTIC INTELLIGENCE & DATASET UNDERSTANDING   ');
  console.log('================================================================\n');

  // DATASET 1: Industrial IoT Sensor Telemetry
  console.log('--- TEST 1: Industrial IoT & Sensor Telemetry ---');
  const iotRows = [
    { device_id: 'DEV-101', timestamp: '2025-01-01 00:00:00', temperature_c: 72.4, pressure_kpa: 101.3, vibration_hz: 14.2, defect_flag: 0 },
    { device_id: 'DEV-101', timestamp: '2025-01-01 01:00:00', temperature_c: 73.1, pressure_kpa: 102.0, vibration_hz: 15.0, defect_flag: 0 },
    { device_id: 'DEV-102', timestamp: '2025-01-01 00:00:00', temperature_c: 98.6, pressure_kpa: 140.5, vibration_hz: 48.9, defect_flag: 1 },
    { device_id: 'DEV-102', timestamp: '2025-01-01 01:00:00', temperature_c: 99.2, pressure_kpa: 142.1, vibration_hz: 52.1, defect_flag: 1 },
    { device_id: 'DEV-103', timestamp: '2025-01-01 00:00:00', temperature_c: 71.0, pressure_kpa: 100.8, vibration_hz: 13.5, defect_flag: 0 },
    { device_id: 'DEV-103', timestamp: '2025-01-01 01:00:00', temperature_c: 70.8, pressure_kpa: 101.0, vibration_hz: 13.2, defect_flag: 0 },
    { device_id: 'DEV-104', timestamp: '2025-01-01 00:00:00', temperature_c: 74.5, pressure_kpa: 103.2, vibration_hz: 16.1, defect_flag: 0 },
    { device_id: 'DEV-104', timestamp: '2025-01-01 01:00:00', temperature_c: 75.0, pressure_kpa: 103.8, vibration_hz: 16.4, defect_flag: 0 }
  ];
  const iotCols = Object.keys(iotRows[0]);
  const iotSchema = detectDatasetSchema(iotCols, iotRows);
  const iotEnriched = enrichSchemaWithSemantics(iotSchema);
  const iotProfiles = profileDataset(iotEnriched, iotRows);
  const iotTargets = inferTargetCandidates(iotEnriched, iotProfiles, iotRows);

  console.log('Target Candidates:', iotTargets.map(t => `${t.column} (${t.taskType}, conf: ${t.confidence}, usable: ${t.usable})`));
  if (!iotTargets.some(t => t.column === 'defect_flag' && t.taskType === 'binary_classification')) {
    throw new Error('IoT Test Failed: defect_flag was not recognized as binary classification target!');
  }
  console.log('✅ IoT Target inference verified.\n');

  // DATASET 2: SaaS Customer Retention & Churn
  console.log('--- TEST 2: SaaS Customer Retention & Subscription ---');
  const saasRows = [
    { account_id: 'ACC-001', tenure_mths: 12, monthly_fee_usd: 49.99, contract_type: 'Month-to-Month', support_calls_cnt: 2, churn: 'Yes' },
    { account_id: 'ACC-002', tenure_mths: 36, monthly_fee_usd: 89.99, contract_type: 'Two-Year', support_calls_cnt: 0, churn: 'No' },
    { account_id: 'ACC-003', tenure_mths: 6, monthly_fee_usd: 49.99, contract_type: 'Month-to-Month', support_calls_cnt: 5, churn: 'Yes' },
    { account_id: 'ACC-004', tenure_mths: 48, monthly_fee_usd: 119.99, contract_type: 'Two-Year', support_calls_cnt: 1, churn: 'No' },
    { account_id: 'ACC-005', tenure_mths: 24, monthly_fee_usd: 79.99, contract_type: 'One-Year', support_calls_cnt: 1, churn: 'No' }
  ];
  const saasCols = Object.keys(saasRows[0]);
  const saasSchema = detectDatasetSchema(saasCols, saasRows);
  const saasEnriched = enrichSchemaWithSemantics(saasSchema);
  const saasProfiles = profileDataset(saasEnriched, saasRows);
  const saasDomain = detectBusinessDomain(saasEnriched);
  const saasGlossary = buildBusinessGlossary(saasEnriched, saasDomain);
  const saasClean = detectQualityIssuesAndClean(saasEnriched, saasProfiles, saasRows);
  const saasCaps = detectCapabilities(saasEnriched, saasProfiles, saasClean.cleanedRows.length);

  const saasContext = buildDatasetContext({
    sourceMetadata: { sourceType: 'csv', fileName: 'saas_churn.csv', fileSize: 1024, mimeType: 'text/csv', rowCount: 5, colCount: 6, hasHeader: true, warnings: [], status: 'valid' },
    schema: saasEnriched,
    profiles: saasProfiles,
    domain: saasDomain,
    glossary: saasGlossary,
    relationships: [],
    qualityReport: saasClean.report,
    capabilities: saasCaps,
    rawSample: saasRows,
    cleanedRows: saasClean.cleanedRows
  });

  const saasReport = buildDatasetUnderstandingReport(saasContext);
  console.log('Archetype:', saasReport.archetype);
  console.log('Primary Outcome:', saasReport.primaryOutcome);
  console.log('Primary Entity:', saasReport.primaryEntity);
  console.log('Unsupported Analyses:', saasReport.unsupportedAnalyses);

  if (saasReport.archetype !== 'customer_churn') {
    throw new Error('SaaS Test Failed: Did not infer customer_churn archetype!');
  }
  if (!saasReport.unsupportedAnalyses.some(u => u.analysis.includes('Forecasting'))) {
    throw new Error('SaaS Test Failed: Should explicitly report time series forecasting as unsupported on cross-sectional churn data!');
  }
  console.log('✅ SaaS Churn understanding report verified.\n');

  // DATASET 3: Cryptic Marketing Attribution
  console.log('--- TEST 3: Cryptic Advertising Ledger ---');
  const adCols = ['week_date', 'dtv_srh_pmx_tot_xxx_clk', 'dtv_dig_ctv_tot_prm_imp', 'sales'];
  const adRows = [
    { week_date: '2024-01-01', dtv_srh_pmx_tot_xxx_clk: 1200, dtv_dig_ctv_tot_prm_imp: 45000, sales: 18500 },
    { week_date: '2024-01-08', dtv_srh_pmx_tot_xxx_clk: 1450, dtv_dig_ctv_tot_prm_imp: 52000, sales: 21000 },
    { week_date: '2024-01-15', dtv_srh_pmx_tot_xxx_clk: 1300, dtv_dig_ctv_tot_prm_imp: 48000, sales: 19800 },
    { week_date: '2024-01-22', dtv_srh_pmx_tot_xxx_clk: 1600, dtv_dig_ctv_tot_prm_imp: 61000, sales: 24200 },
    { week_date: '2024-01-29', dtv_srh_pmx_tot_xxx_clk: 1520, dtv_dig_ctv_tot_prm_imp: 59000, sales: 23100 },
    { week_date: '2024-02-05', dtv_srh_pmx_tot_xxx_clk: 1400, dtv_dig_ctv_tot_prm_imp: 53000, sales: 20900 }
  ];
  const adSchema = detectDatasetSchema(adCols, adRows);
  const adEnriched = enrichSchemaWithSemantics(adSchema);
  console.log('Enriched Ad Columns:');
  adEnriched.forEach(c => console.log(`- ${c.technicalName} -> '${c.displayName}' (${c.semanticRole}, ${c.logicalType})`));

  const clkCol = adEnriched.find(c => c.technicalName === 'dtv_srh_pmx_tot_xxx_clk');
  if (!clkCol?.displayName.includes('Performance Max') || !clkCol?.displayName.includes('Clicks')) {
    throw new Error('Ad Test Failed: Cryptic column was not correctly decoded!');
  }
  console.log('✅ Cryptic column decoding verified.\n');

  console.log('================================================================');
  console.log('  CHECKPOINT 1 TESTS PASSED!                                    ');
  console.log('================================================================');
}

runCheckpoint1Tests();
