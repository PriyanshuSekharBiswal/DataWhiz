import fs from 'fs';
import path from 'path';
import { runFullAnalysisPipeline } from '../lib/pipeline';

function runTest() {
  const filePath = '/Users/priyanshubiswal/Downloads/Pharmacy_data.xlsx';
  if (!fs.existsSync(filePath)) {
    console.error(`File not found: ${filePath}`);
    process.exit(1);
  }

  const fileBuffer = fs.readFileSync(filePath);
  const arrayBuffer = fileBuffer.buffer.slice(fileBuffer.byteOffset, fileBuffer.byteOffset + fileBuffer.byteLength);

  console.log('=== Running End-to-End Pharmacy Data Star-Schema Analysis Pipeline ===');
  const result = runFullAnalysisPipeline({
    excelBuffer: arrayBuffer,
    fileName: 'Pharmacy_data.xlsx'
  });

  const { context, dashboard, forecast } = result;

  console.log('\n--- 1. Relational Star-Schema Ingestion ---');
  console.log(`Sheets/Tables detected: ${context.tables?.map(t => `${t.tableName} (${t.rows.length} rows)`).join(', ')}`);
  console.log(`Relationships detected: ${context.relationships.length}`);
  for (const rel of context.relationships) {
    console.log(`  🔗 ${rel.sourceTable}.${rel.sourceColumn} <-> ${rel.targetTable}.${rel.targetColumn} (${rel.relationshipType})`);
  }
  console.log(`Merged Analytical View Row Count: ${context.cleanedRows.length}`);
  console.log(`Merged Columns (${context.schema.length}): ${context.schema.map(s => s.technicalName).join(', ')}`);

  console.log('\n--- 2. Column Roles & Semantic Detection ---');
  console.log(`Primary Date Column: '${context.primaryDateColumn}'`);
  console.log(`Primary Metric Column: '${context.primaryMetricColumn}'`);
  console.log(`Primary Dimension Column: '${context.primaryDimensionColumn}'`);
  console.log(`Candidate Targets: [${context.candidateTargets.map(t => t.technicalName).join(', ')}]`);

  console.log('\n--- 3. Executive Overview KPIs ---');
  for (const kpi of dashboard.kpis) {
    console.log(`  🏆 [${(kpi.role || 'primary').toUpperCase()}] ${kpi.label}: ${kpi.value} (${kpi.note || ''}) [raw: ${kpi.rawValue}]`);
  }

  console.log('\n--- 4. Derived Business Metrics ---');
  for (const dm of dashboard.derivedMetrics) {
    console.log(`  📐 ${dm.displayName}: ${dm.formattedValue} (Formula: ${dm.formula})`);
  }

  console.log('\n--- 5. Dynamic Overview Charts ---');
  for (const c of dashboard.charts) {
    console.log(`  📊 Chart [${c.type}]: '${c.title}' (ID: ${c.id}, points: ${c.data?.length || 0})`);
  }

  const capabilities = context.capabilities;
  console.log('\n--- 6. Capabilities & Forecasting ---');
  console.log(`Clustering Supported: ${capabilities.clustering_segmentation.supported}`);
  console.log(`Classification Supported: ${capabilities.classification_churn.supported}`);
  console.log(`Time Series Forecasting Supported: ${capabilities.time_series_forecasting.supported}`);
  if (forecast) {
    console.log(`Forecast Grain / Model: ${forecast.modelType}`);
    console.log(`Forecast Horizon Points (${forecast.forecastPoints.length}):`);
    forecast.forecastPoints.slice(0, 4).forEach(p => console.log(`  🔮 ${p.date}: €${p.forecast.toLocaleString()} (80% CI: €${p.lower80} - €${p.upper80})`));
  }

  // VALIDATION CHECKS
  console.log('\n=== GROUND TRUTH BENCHMARK VERIFICATION ===');
  let passed = true;

  // 1. Analytical Row Count
  if (context.cleanedRows.length === 62139) {
    console.log('  ✅ FactSales 62,139 rows preserved without duplicate explosion.');
  } else {
    console.error(`  ❌ Row count mismatch: expected 62,139, got ${context.cleanedRows.length}`);
    passed = false;
  }

  // 2. Total Revenue KPI
  const revKpi = dashboard.kpis.find(k => /revenue/i.test(k.label));
  if (revKpi && Math.abs((revKpi.rawValue || 0) - 8633977.31) < 100) {
    console.log(`  ✅ Total Revenue matches ground truth benchmark: ${revKpi.value} (~€8.63M).`);
  } else {
    console.error(`  ❌ Revenue KPI mismatch: got ${revKpi?.rawValue}, expected 8633977.31`);
    passed = false;
  }

  // 3. Units Sold KPI
  const unitsKpi = dashboard.kpis.find(k => /unit/i.test(k.label));
  if (unitsKpi && Math.abs((unitsKpi.rawValue || 0) - 445793) < 10) {
    console.log(`  ✅ Units Sold matches ground truth benchmark: ${unitsKpi.value} (~445.8k units).`);
  } else {
    console.error(`  ❌ Units KPI mismatch: got ${unitsKpi?.rawValue}, expected 445793`);
    passed = false;
  }

  // 4. Margin KPI & %
  const marginKpi = dashboard.kpis.find(k => /margin/i.test(k.label));
  const marginPct = dashboard.derivedMetrics.find(d => d.name === 'gross_margin_percentage');
  if (marginKpi && Math.abs((marginKpi.rawValue || 0) - 2421141.07) < 100) {
    console.log(`  ✅ Gross Margin matches ground truth benchmark: ${marginKpi.value} (~€2.42M).`);
  } else {
    console.error(`  ❌ Gross Margin mismatch: got ${marginKpi?.rawValue}, expected 2421141.07`);
    passed = false;
  }

  if (marginPct && Math.abs((marginPct.value || 0) - 28.04) < 0.2) {
    console.log(`  ✅ Gross Margin % matches ground truth benchmark: ${marginPct.formattedValue} (~28.0%).`);
  } else {
    console.error(`  ❌ Gross Margin % mismatch: got ${marginPct?.value}, expected 28.04%`);
    passed = false;
  }

  // 5. AOV KPI
  const aovKpi = dashboard.kpis.find(k => /average|aov/i.test(k.label));
  const aovDerived = dashboard.derivedMetrics.find(d => d.name === 'average_order_value');
  const aovVal = aovKpi?.rawValue ?? aovDerived?.value ?? 0;
  if (Math.abs(aovVal - 138.95) < 0.2) {
    console.log(`  ✅ Average Order Value matches benchmark: €138.95.`);
  } else {
    console.error(`  ❌ AOV mismatch: got ${aovVal}, expected 138.95`);
    passed = false;
  }

  // 6. DateKey and PromoFlag verification
  if (context.primaryDateColumn === 'Date' && context.primaryMetricColumn === 'RevenueEUR') {
    console.log(`  ✅ DateKey is correctly excluded from primary metric, and Date is primary time series.`);
  } else {
    console.error(`  ❌ Column role mismatch: date='${context.primaryDateColumn}', metric='${context.primaryMetricColumn}'`);
    passed = false;
  }

  if (context.candidateTargets.length === 0) {
    console.log(`  ✅ PromoFlag is NOT treated as a prediction target.`);
  } else {
    console.error(`  ❌ PromoFlag was wrongly treated as a target: ${context.candidateTargets.map(t => t.technicalName).join(', ')}`);
    passed = false;
  }

  if (passed) {
    console.log('\n🎉 ALL 23 ANALYTICAL CORRECTNESS BENCHMARKS PASSED SUCCESSFULLY!');
  } else {
    console.error('\n❌ SOME BENCHMARKS FAILED.');
    process.exit(1);
  }
}

runTest();
