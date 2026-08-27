import { detectDatasetSchema } from '../lib/schema/schemaDetector';
import { profileDataset } from '../lib/profiling/dataProfiler';
import { enrichSchemaWithSemantics } from '../lib/semantics/columnHumanizer';
import { detectBusinessDomain, buildBusinessGlossary } from '../lib/semantics/domainDetector';
import { detectQualityIssuesAndClean } from '../lib/quality/qualityEngine';
import { detectCapabilities } from '../lib/capabilities/capabilityDetector';
import { buildDatasetContext } from '../lib/context/datasetContextBuilder';
import { buildDatasetUnderstandingReport } from '../lib/context/datasetUnderstandingEngine';
import { decodeDatasetCrypticColumns } from '../lib/semantics/crypticDecoder';
import { buildAnalyticalView } from '../lib/relationships/relationshipDetector';

function runMultiDatasetCheckpoint1Tests() {
  console.log('================================================================');
  console.log('  CHECKPOINT 1 MULTI-DATASET REGRESSION SUITE (8 DATASETS)      ');
  console.log('================================================================\n');

  let passedCount = 0;

  // ---------------------------------------------------------------------------
  // DATASET 1: NON-TEMPORAL EMPLOYEE ENGAGEMENT SURVEY (Zero Dates, Likert Scales)
  // ---------------------------------------------------------------------------
  console.log('>>> [1/8] Testing Non-Temporal Employee Engagement Survey...');
  const surveyRows = [
    { emp_id: 'E101', department: 'Engineering', satisfaction_score: 4, tenure_years: 3.5, remote_worker: 'Yes' },
    { emp_id: 'E102', department: 'Engineering', satisfaction_score: 5, tenure_years: 5.0, remote_worker: 'Yes' },
    { emp_id: 'E103', department: 'Sales', satisfaction_score: 2, tenure_years: 1.2, remote_worker: 'No' },
    { emp_id: 'E104', department: 'Sales', satisfaction_score: 3, tenure_years: 2.0, remote_worker: 'No' },
    { emp_id: 'E105', department: 'Marketing', satisfaction_score: 4, tenure_years: 4.1, remote_worker: 'Yes' },
    { emp_id: 'E106', department: 'Marketing', satisfaction_score: 4, tenure_years: 2.8, remote_worker: 'No' }
  ];
  const sCols = Object.keys(surveyRows[0]);
  const sSchema = enrichSchemaWithSemantics(detectDatasetSchema(sCols, surveyRows));
  const sProfiles = profileDataset(sSchema, surveyRows);
  const sCaps = detectCapabilities(sSchema, sProfiles, surveyRows.length);
  const sCtx = buildDatasetContext({
    sourceMetadata: { sourceType: 'csv', fileName: 'survey.csv', fileSize: 500, mimeType: 'text/csv', rowCount: surveyRows.length, colCount: sCols.length, hasHeader: true, warnings: [], status: 'valid' },
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
  const sRep = buildDatasetUnderstandingReport(sCtx);

  console.log(`  Archetype: ${sRep.archetype}`);
  console.log(`  Native Time Grain: ${sCtx.nativeTimeGrain || 'none'}`);
  console.log(`  Time Dimensions: ${sCtx.timeDimensions ? sCtx.timeDimensions.column : 'None (Correct)'}`);
  console.log(`  Primary Measures: ${sCtx.measures.map(m => m.technicalName).join(', ')}`);

  if (sCtx.timeDimensions !== undefined || sCtx.nativeTimeGrain !== 'none') {
    throw new Error('Dataset 1 Failed: Non-temporal survey must have nativeTimeGrain=none and no timeDimensions!');
  }
  if (!sCaps.descriptive_stats.supported || sCaps.time_series_forecasting.supported) {
    throw new Error('Dataset 1 Failed: Should support descriptive stats and reject forecasting!');
  }
  console.log('  ✅ Dataset 1 (Non-Temporal Survey) Verified.\n');
  passedCount++;

  // ---------------------------------------------------------------------------
  // DATASET 2: INDUSTRIAL IOT VIBRATION & THERMAL TELEMETRY (Sensors, No Currency)
  // ---------------------------------------------------------------------------
  console.log('>>> [2/8] Testing Industrial IoT Telemetry (Sensors, No Currency)...');
  const iotRows = [
    { machine_id: 'M01', vibration_hz: 58.2, temp_c: 72.4, rpm: 3200, defect_flag: 0 },
    { machine_id: 'M01', vibration_hz: 61.0, temp_c: 74.1, rpm: 3250, defect_flag: 0 },
    { machine_id: 'M02', vibration_hz: 94.5, temp_c: 96.8, rpm: 3900, defect_flag: 1 },
    { machine_id: 'M02', vibration_hz: 97.2, temp_c: 98.5, rpm: 3950, defect_flag: 1 },
    { machine_id: 'M03', vibration_hz: 54.0, temp_c: 70.1, rpm: 3100, defect_flag: 0 }
  ];
  const iotCols = Object.keys(iotRows[0]);
  const iotSchema = enrichSchemaWithSemantics(detectDatasetSchema(iotCols, iotRows));
  const iotProfiles = profileDataset(iotSchema, iotRows);
  const iotCaps = detectCapabilities(iotSchema, iotProfiles, iotRows.length);
  const iotCtx = buildDatasetContext({
    sourceMetadata: { sourceType: 'csv', fileName: 'iot_telemetry.csv', fileSize: 500, mimeType: 'text/csv', rowCount: iotRows.length, colCount: iotCols.length, hasHeader: true, warnings: [], status: 'valid' },
    schema: iotSchema,
    profiles: iotProfiles,
    domain: detectBusinessDomain(iotSchema),
    glossary: buildBusinessGlossary(iotSchema, detectBusinessDomain(iotSchema)),
    relationships: [],
    qualityReport: detectQualityIssuesAndClean(iotSchema, iotProfiles, iotRows).report,
    capabilities: iotCaps,
    rawSample: iotRows,
    cleanedRows: iotRows
  });
  const iotRep = buildDatasetUnderstandingReport(iotCtx);

  console.log(`  Archetype: ${iotRep.archetype}`);
  console.log(`  Target Candidates:`, iotCtx.targetCandidates?.map(t => `${t.column} (${t.taskType}, conf: ${t.confidence})`));
  const hasFakeCurrency = iotSchema.some(s => s.logicalType === 'measure_currency');
  if (hasFakeCurrency) {
    throw new Error('Dataset 2 Failed: Sensor vibration data must NOT be classified as measure_currency!');
  }
  if (!iotCtx.targetCandidates?.some(t => t.column === 'defect_flag' && t.taskType === 'binary_classification')) {
    throw new Error('Dataset 2 Failed: defect_flag must be identified as binary classification target candidate!');
  }
  console.log('  ✅ Dataset 2 (Industrial IoT Telemetry) Verified.\n');
  passedCount++;

  // ---------------------------------------------------------------------------
  // DATASET 3: WEEKLY LOGISTICS FLEET (Weekly Native Grain)
  // ---------------------------------------------------------------------------
  console.log('>>> [3/8] Testing Weekly Logistics Fleet (Weekly Grain)...');
  const fleetRows = [
    { dispatch_date: '2024-01-01', fleet_id: 'TRK-01', payload_tons: 14.5, fuel_gal: 45 },
    { dispatch_date: '2024-01-08', fleet_id: 'TRK-01', payload_tons: 15.0, fuel_gal: 48 },
    { dispatch_date: '2024-01-15', fleet_id: 'TRK-01', payload_tons: 14.8, fuel_gal: 46 },
    { dispatch_date: '2024-01-22', fleet_id: 'TRK-01', payload_tons: 16.2, fuel_gal: 52 },
    { dispatch_date: '2024-01-29', fleet_id: 'TRK-01', payload_tons: 15.5, fuel_gal: 49 },
    { dispatch_date: '2024-02-05', fleet_id: 'TRK-01', payload_tons: 17.0, fuel_gal: 55 }
  ];
  const fleetCols = Object.keys(fleetRows[0]);
  const fleetSchema = enrichSchemaWithSemantics(detectDatasetSchema(fleetCols, fleetRows));
  const fleetProfiles = profileDataset(fleetSchema, fleetRows);
  const fleetCaps = detectCapabilities(fleetSchema, fleetProfiles, fleetRows.length);
  const fleetCtx = buildDatasetContext({
    sourceMetadata: { sourceType: 'csv', fileName: 'fleet.csv', fileSize: 500, mimeType: 'text/csv', rowCount: fleetRows.length, colCount: fleetCols.length, hasHeader: true, warnings: [], status: 'valid' },
    schema: fleetSchema,
    profiles: fleetProfiles,
    domain: detectBusinessDomain(fleetSchema),
    glossary: buildBusinessGlossary(fleetSchema, detectBusinessDomain(fleetSchema)),
    relationships: [],
    qualityReport: detectQualityIssuesAndClean(fleetSchema, fleetProfiles, fleetRows).report,
    capabilities: fleetCaps,
    rawSample: fleetRows,
    cleanedRows: fleetRows
  });
  const fleetRep = buildDatasetUnderstandingReport(fleetCtx);

  console.log(`  Native Time Grain: ${fleetCtx.nativeTimeGrain}`);
  console.log(`  Time Dimension: ${fleetCtx.timeDimensions?.column} (${fleetCtx.timeDimensions?.totalPeriods} periods)`);
  if (fleetCtx.nativeTimeGrain !== 'weekly') {
    throw new Error(`Dataset 3 Failed: Expected weekly native grain, got ${fleetCtx.nativeTimeGrain}`);
  }
  console.log('  ✅ Dataset 3 (Weekly Logistics Fleet) Verified.\n');
  passedCount++;

  // ---------------------------------------------------------------------------
  // DATASET 4: MONTHLY MACROECONOMIC INDICATORS (Monthly Grain)
  // ---------------------------------------------------------------------------
  console.log('>>> [4/8] Testing Monthly Macroeconomic Indicators (Monthly Grain)...');
  const macroRows = [
    { period_date: '2023-01-01', cpi_index: 102.4, gdp_growth: 2.1, unemp_rate: 3.8 },
    { period_date: '2023-02-01', cpi_index: 103.1, gdp_growth: 2.0, unemp_rate: 3.9 },
    { period_date: '2023-03-01', cpi_index: 103.8, gdp_growth: 2.2, unemp_rate: 3.7 },
    { period_date: '2023-04-01', cpi_index: 104.5, gdp_growth: 2.4, unemp_rate: 3.6 },
    { period_date: '2023-05-01', cpi_index: 105.0, gdp_growth: 2.3, unemp_rate: 3.6 }
  ];
  const macroCols = Object.keys(macroRows[0]);
  const macroSchema = enrichSchemaWithSemantics(detectDatasetSchema(macroCols, macroRows));
  const macroProfiles = profileDataset(macroSchema, macroRows);
  const macroCaps = detectCapabilities(macroSchema, macroProfiles, macroRows.length);
  const macroCtx = buildDatasetContext({
    sourceMetadata: { sourceType: 'csv', fileName: 'macro.csv', fileSize: 500, mimeType: 'text/csv', rowCount: macroRows.length, colCount: macroCols.length, hasHeader: true, warnings: [], status: 'valid' },
    schema: macroSchema,
    profiles: macroProfiles,
    domain: detectBusinessDomain(macroSchema),
    glossary: buildBusinessGlossary(macroSchema, detectBusinessDomain(macroSchema)),
    relationships: [],
    qualityReport: detectQualityIssuesAndClean(macroSchema, macroProfiles, macroRows).report,
    capabilities: macroCaps,
    rawSample: macroRows,
    cleanedRows: macroRows
  });
  console.log(`  Native Time Grain: ${macroCtx.nativeTimeGrain}`);
  if (macroCtx.nativeTimeGrain !== 'monthly') {
    throw new Error(`Dataset 4 Failed: Expected monthly native grain, got ${macroCtx.nativeTimeGrain}`);
  }
  console.log('  ✅ Dataset 4 (Monthly Macroeconomic) Verified.\n');
  passedCount++;

  // ---------------------------------------------------------------------------
  // DATASET 5: MULTI-SHEET STAR SCHEMA (Fact + Dim tables)
  // ---------------------------------------------------------------------------
  console.log('>>> [5/8] Testing Multi-Sheet Star Schema Join & Semantics...');
  const factSheet = {
    tableName: 'FactSales',
    columns: ['sale_id', 'cust_id', 'prod_id', 'sale_amount'],
    schemas: [],
    rows: [
      { sale_id: 1, cust_id: 10, prod_id: 100, sale_amount: 500 },
      { sale_id: 2, cust_id: 20, prod_id: 200, sale_amount: 800 }
    ]
  };
  const dimCust = {
    tableName: 'DimCustomer',
    columns: ['cust_id', 'cust_name', 'country'],
    schemas: [],
    rows: [
      { cust_id: 10, cust_name: 'Acme Corp', country: 'Germany' },
      { cust_id: 20, cust_id_name: 'Beta LLC', country: 'France' }
    ]
  };
  const starView = buildAnalyticalView([factSheet, dimCust]);
  console.log(`  Star-Schema Rows: ${starView.analyticalRows.length}, Columns: ${starView.mergedColumns.length}`);
  if (starView.analyticalRows.length !== 2 || !starView.mergedColumns.includes('country')) {
    throw new Error('Dataset 5 Failed: Star schema join failed to merge dimension columns!');
  }
  console.log('  ✅ Dataset 5 (Multi-Sheet Star Schema) Verified.\n');
  passedCount++;

  // ---------------------------------------------------------------------------
  // DATASET 6: SINGLE NUMERIC ATTRIBUTE EDGE CASE
  // ---------------------------------------------------------------------------
  console.log('>>> [6/8] Testing Single Numeric Attribute Edge Case...');
  const singleRows = [{ score: 10 }, { score: 20 }, { score: 30 }, { score: 40 }];
  const singleCols = ['score'];
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
  const singleRep = buildDatasetUnderstandingReport(singleCtx);
  console.log(`  Primary Outcome: ${singleRep.primaryOutcome}, Capabilities: Descriptive=${singleCaps.descriptive_stats.supported}, Forecast=${singleCaps.time_series_forecasting.supported}`);
  if (!singleCaps.descriptive_stats.supported || singleCaps.time_series_forecasting.supported) {
    throw new Error('Dataset 6 Failed: Single numeric column must support descriptive stats and reject forecast!');
  }
  console.log('  ✅ Dataset 6 (Single Numeric Attribute) Verified.\n');
  passedCount++;

  // ---------------------------------------------------------------------------
  // DATASET 7: CRYPTIC VARIABLE ABBREVIATIONS DECODING
  // ---------------------------------------------------------------------------
  console.log('>>> [7/8] Testing Cryptic Variable Codes & Uncertainty Tracking...');
  const crypticCols = ['dtv_srh_pmx_tot_vol_clk', 'usr_chn_flg', 'acct_bal_amt'];
  const decoded = decodeDatasetCrypticColumns(crypticCols);
  console.log(`  Decoded 'dtv_srh_pmx_tot_vol_clk' -> ${decoded['dtv_srh_pmx_tot_vol_clk']?.decodedName} (${decoded['dtv_srh_pmx_tot_vol_clk']?.unit})`);
  if (!decoded['dtv_srh_pmx_tot_vol_clk'] || decoded['dtv_srh_pmx_tot_vol_clk'].unit !== 'clicks') {
    throw new Error('Dataset 7 Failed: Failed to decode dtv_srh_pmx_tot_vol_clk into clicks!');
  }
  console.log('  ✅ Dataset 7 (Cryptic Codes) Verified.\n');
  passedCount++;

  // ---------------------------------------------------------------------------
  // DATASET 8: DIRTY, CONSTANT COLUMN & HIGH MISSINGNESS DATASET
  // ---------------------------------------------------------------------------
  console.log('>>> [8/8] Testing Dirty, Constant Column & High Missingness...');
  const dirtyRows = [
    { id: '1', status: 'ACTIVE', score: 10, notes: null },
    { id: '2', status: 'ACTIVE', score: null, notes: 'Missing score' },
    { id: '3', status: 'ACTIVE', score: 30, notes: null },
    { id: '4', status: 'ACTIVE', score: 40, notes: null }
  ];
  const dirtyCols = Object.keys(dirtyRows[0]);
  const dirtySchema = enrichSchemaWithSemantics(detectDatasetSchema(dirtyCols, dirtyRows));
  const dirtyProfiles = profileDataset(dirtySchema, dirtyRows);
  const dirtyClean = detectQualityIssuesAndClean(dirtySchema, dirtyProfiles, dirtyRows);
  console.log(`  Quality Score: ${dirtyClean.report.overallScore}/100, Issues: ${dirtyClean.report.issues.length}`);
  const statusProfile = dirtyProfiles.find(p => p.technicalName === 'status');
  console.log(`  'status' unique count: ${statusProfile?.uniqueCount} (Constant column detected)`);
  if (statusProfile?.uniqueCount !== 1) {
    throw new Error("Dataset 8 Failed: 'status' should have uniqueCount=1!");
  }
  console.log('  ✅ Dataset 8 (Dirty & Constant Column) Verified.\n');
  passedCount++;

  console.log('================================================================');
  console.log(`  CHECKPOINT 1 MULTI-DATASET REGRESSION SUITE PASSED (${passedCount}/8)`);
  console.log('================================================================');
}

runMultiDatasetCheckpoint1Tests();
