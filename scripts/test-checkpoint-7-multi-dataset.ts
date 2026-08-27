import { runFullAnalysisPipeline } from '../lib/pipeline';

function runCheckpoint7BrokenDatasetsTests() {
  console.log('================================================================');
  console.log('  CHECKPOINT 7 BROKEN / DIFFICULT DATASETS REGRESSION SUITE     ');
  console.log('================================================================\n');

  let passedCount = 0;

  // ---------------------------------------------------------------------------
  // EDGE CASE 1: SINGLE-ROW DATASET
  // ---------------------------------------------------------------------------
  console.log('>>> [1/5] Testing 1-Row Dataset (Minimal Observation)...');
  const csv1 = `id,score,status\n1,100,ACTIVE`;
  const res1 = runFullAnalysisPipeline({ csvContent: csv1, fileName: 'single_row.csv' });
  console.log(`  Quality Score: ${res1.context.qualityReport.overallScore}/100, Usable Visuals: ${res1.dashboard.spec?.overview.heroVisuals.length}`);
  if (!res1.dashboard || !res1.context || res1.context.cleanedRows.length !== 1) {
    throw new Error('Edge Case 1 Failed: Pipeline failed to handle single-row dataset!');
  }
  console.log('  ✅ Edge Case 1 Passed.\n');
  passedCount++;

  // ---------------------------------------------------------------------------
  // EDGE CASE 2: SINGLE-COLUMN NUMERIC DATASET
  // ---------------------------------------------------------------------------
  console.log('>>> [2/5] Testing Single-Column Numeric Dataset...');
  const csv2 = `measurement\n10.5\n20.1\n15.4\n30.2\n25.8`;
  const res2 = runFullAnalysisPipeline({ csvContent: csv2, fileName: 'single_col_num.csv' });
  console.log(`  Archetype: ${res2.understandingReport.archetype}, KPIs: ${res2.dashboard.spec?.overview.kpis.length}`);
  console.log(`  Measures:`, res2.understandingReport.keyMeasures, `Dimensions:`, res2.understandingReport.keyDimensions);
  if (res2.context.measures.length !== 1 || res2.context.dimensions.length !== 0) {
    throw new Error(`Edge Case 2 Failed: Expected 1 measure, 0 dimensions. Got ${res2.context.measures.length} measures and ${res2.context.dimensions.length} dimensions.`);
  }
  console.log('  ✅ Edge Case 2 Passed.\n');
  passedCount++;

  // ---------------------------------------------------------------------------
  // EDGE CASE 3: ALL-IDENTIFIER DATASET (UUIDs, IDs ONLY)
  // ---------------------------------------------------------------------------
  console.log('>>> [3/5] Testing All-Identifier Dataset (Zero Measures)...');
  const csv3 = `user_uuid,session_guid\n550e8400-e29b-41d4-a716-446655440000,a1b2c3d4-e5f6-7890-abcd-ef1234567890\n6ba7b810-9dad-11d1-80b4-00c04fd430c8,b2c3d4e5-f6a7-8901-bcde-f12345678901`;
  const res3 = runFullAnalysisPipeline({ csvContent: csv3, fileName: 'identifiers_only.csv' });
  console.log(`  Identified Usable Measures: ${res3.context.measures.length}, Quality: ${res3.context.qualityReport.overallScore}/100`);
  if (res3.context.measures.length !== 0) {
    throw new Error('Edge Case 3 Failed: All-identifier dataset should have zero numeric measures!');
  }
  console.log('  ✅ Edge Case 3 Passed.\n');
  passedCount++;

  // ---------------------------------------------------------------------------
  // EDGE CASE 4: HEAVY MISSINGNESS & NULL CORRUPTED DATASET
  // ---------------------------------------------------------------------------
  console.log('>>> [4/5] Testing 80% Missingness / Null-Corrupted Dataset...');
  const csv4 = `col_a,col_b,col_c\n10,,\n,20,\n,,\n40,50,60\n,,`;
  const res4 = runFullAnalysisPipeline({ csvContent: csv4, fileName: 'heavy_nulls.csv' });
  console.log(`  Quality Score: ${res4.context.qualityReport.overallScore}/100, Issues: ${res4.context.qualityReport.issues.length}`);
  if (res4.context.qualityReport.overallScore > 90) {
    throw new Error('Edge Case 4 Failed: Quality gate should penalize heavy null corruption!');
  }
  console.log('  ✅ Edge Case 4 Passed.\n');
  passedCount++;

  // ---------------------------------------------------------------------------
  // EDGE CASE 5: CONSTANT / ZERO-VARIANCE COLUMNS
  // ---------------------------------------------------------------------------
  console.log('>>> [5/5] Testing Constant & Zero-Variance Dataset...');
  const csv5 = `country,status,currency,fixed_val\nUS,ACTIVE,USD,100\nUS,ACTIVE,USD,100\nUS,ACTIVE,USD,100\nUS,ACTIVE,USD,100`;
  const res5 = runFullAnalysisPipeline({ csvContent: csv5, fileName: 'constant_cols.csv' });
  console.log(`  Excluded Columns from Analytical Plans:`, res5.understandingReport.unsupportedAnalyses);
  if (!res5.understandingReport.unsupportedAnalyses.length) {
    throw new Error('Edge Case 5 Failed: Constant columns should produce unsupported analysis warnings!');
  }
  console.log('  ✅ Edge Case 5 Passed.\n');
  passedCount++;

  console.log('================================================================');
  console.log(`  CHECKPOINT 7 BROKEN / DIFFICULT DATASETS SUITE PASSED (${passedCount}/5)`);
  console.log('================================================================');
}

runCheckpoint7BrokenDatasetsTests();
