import fs from 'fs';
import { runFullAnalysisPipeline } from '../lib/pipeline';

function runMasterIntelligenceTests() {
  console.log('============================================================');
  console.log('DATAWHIZ AI — MASTER DATA INTELLIGENCE BENCHMARK SUITE');
  console.log('============================================================\n');

  let allPassed = true;
  function assert(name: string, condition: boolean, details: string) {
    if (condition) {
      console.log(`  ✅ [PASSED] ${name}: ${details}`);
    } else {
      console.error(`  ❌ [FAILED] ${name}: ${details}`);
      allPassed = false;
    }
  }

  // ============================================================
  // TEST CASE 1: Marketing / Media Mix Dataset (random_ads.xlsx)
  // ============================================================
  console.log('--- TEST CASE 1: Marketing Media Mix Dataset (random_ads.xlsx) ---');
  const adsPath = '/Users/priyanshubiswal/Downloads/random_ads.xlsx';
  if (!fs.existsSync(adsPath)) {
    console.error(`File not found: ${adsPath}`);
    process.exit(1);
  }

  const adsBuffer = fs.readFileSync(adsPath);
  const adsArrayBuffer = adsBuffer.buffer.slice(adsBuffer.byteOffset, adsBuffer.byteOffset + adsBuffer.byteLength);

  const adsResult = runFullAnalysisPipeline({
    excelBuffer: adsArrayBuffer,
    fileName: 'random_ads.xlsx'
  });

  const adsUnderstanding = adsResult.understandingReport;
  const adsMmm = adsResult.specializedAnalysis.marketingMmm;

  assert(
    'Archetype Detection',
    adsUnderstanding.archetype === 'marketing_media_mix',
    `Identified archetype '${adsUnderstanding.archetype}' (confidence: ${adsUnderstanding.archetypeConfidence})`
  );

  assert(
    'Time Grain Accuracy',
    adsUnderstanding.timeDimension?.grain === 'weekly',
    `Correctly identified grain '${adsUnderstanding.timeDimension?.grain}' (${adsUnderstanding.timeDimension?.totalPeriods} weekly periods, start: ${adsUnderstanding.timeDimension?.startDate}, end: ${adsUnderstanding.timeDimension?.endDate})`
  );

  assert(
    'Cryptic Column Decoding',
    Boolean(adsResult.context.crypticInterpretations && Object.keys(adsResult.context.crypticInterpretations).length >= 15),
    `Decoded ${Object.keys(adsResult.context.crypticInterpretations || {}).length} cryptic variables (e.g. dtv_srh_brd_tot_xxx_clk -> '${adsResult.context.crypticInterpretations?.['dtv_srh_brd_tot_xxx_clk']?.decodedName}')`
  );

  const aovDerivedInAds = adsResult.dashboard.derivedMetrics.find(d => d.name === 'average_order_value');
  assert(
    'No Fabricated AOV',
    !aovDerivedInAds,
    `Verified AOV derived metric is OMITTED because order-level identifiers do not exist in weekly aggregated campaign data.`
  );

  assert(
    'Media Drivers & Elasticity',
    Boolean(adsMmm && adsMmm.mediaDrivers.length >= 10 && adsMmm.mediaDrivers[0].correlationWithSales !== undefined),
    `Computed ${adsMmm?.mediaDrivers.length} media channel drivers (Top driver: '${adsMmm?.mediaDrivers[0].displayName}' with correlation r = ${adsMmm?.mediaDrivers[0].correlationWithSales})`
  );

  assert(
    'Search vs Social Analysis',
    Boolean(adsMmm?.searchVsSocialComparison && adsMmm.searchVsSocialComparison.searchVolume > 0),
    `Search Ad Clicks: ${Math.round(adsMmm?.searchVsSocialComparison?.searchVolume || 0).toLocaleString()} (r = ${adsMmm?.searchVsSocialComparison?.searchCorr}), Social Impressions: ${Math.round(adsMmm?.searchVsSocialComparison?.socialVolume || 0).toLocaleString()} (r = ${adsMmm?.searchVsSocialComparison?.socialCorr})`
  );

  assert(
    'Quality Gate Approval',
    adsResult.qualityGate.overallPassed,
    `Quality Gate passed without blocking errors.`
  );

  console.log('\n--- TEST CASE 2: Multi-Sheet Star-Schema (Pharmacy_data.xlsx) ---');
  const pharmacyPath = '/Users/priyanshubiswal/Downloads/Pharmacy_data.xlsx';
  if (fs.existsSync(pharmacyPath)) {
    const pBuf = fs.readFileSync(pharmacyPath);
    const pAb = pBuf.buffer.slice(pBuf.byteOffset, pBuf.byteOffset + pBuf.byteLength);

    const pResult = runFullAnalysisPipeline({
      excelBuffer: pAb,
      fileName: 'Pharmacy_data.xlsx'
    });

    assert(
      'Star-Schema Left Join',
      pResult.context.cleanedRows.length === 62139,
      `FactSales preserved 62,139 rows joined with 3 dimension tables.`
    );

    const revKpi = pResult.dashboard.kpis.find(k => /revenue/i.test(k.label));
    assert(
      'Total Revenue KPI',
      Boolean(revKpi && Math.abs(revKpi.rawValue - 8633977.31) < 100),
      `Total Revenue: ${revKpi?.value} (€8,633,977.31)`
    );

    const marginPct = pResult.dashboard.derivedMetrics.find(d => d.name === 'gross_margin_percentage');
    assert(
      'Gross Margin %',
      Boolean(marginPct && Math.abs(marginPct.value - 28.04) < 0.2),
      `Gross Margin %: ${marginPct?.formattedValue} (~28.0%)`
    );

    const aovDerived = pResult.dashboard.derivedMetrics.find(d => d.name === 'average_order_value');
    assert(
      'AOV Derived Correctly',
      Boolean(aovDerived && Math.abs(aovDerived.value - 138.95) < 0.2),
      `Average Order Value: ${aovDerived?.formattedValue} (€138.95) based on 62,139 orders.`
    );
  }

  console.log('\n--- TEST CASE 3: Customer Churn Dataset (WA_Fn-UseC_-Telco-Customer-Churn.csv) ---');
  const churnPath = '/Users/priyanshubiswal/Downloads/WA_Fn-UseC_-Telco-Customer-Churn.csv';
  if (fs.existsSync(churnPath)) {
    const churnCSV = fs.readFileSync(churnPath, 'utf8');
    const churnResult = runFullAnalysisPipeline({
      csvContent: churnCSV,
      fileName: 'WA_Fn-UseC_-Telco-Customer-Churn.csv'
    });

    assert(
      'Churn Archetype',
      churnResult.understandingReport.archetype === 'customer_churn',
      `Identified archetype '${churnResult.understandingReport.archetype}'`
    );

    assert(
      'Churn Rate',
      Boolean(churnResult.specializedAnalysis.churnClassification && churnResult.specializedAnalysis.churnClassification.overallChurnRate > 20),
      `Calculated baseline churn rate: ${churnResult.specializedAnalysis.churnClassification?.overallChurnRate}%`
    );
  }

  console.log('\n============================================================');
  if (allPassed) {
    console.log('🎉 ALL MASTER DATA INTELLIGENCE BENCHMARKS PASSED SUCCESSFULLY!');
  } else {
    console.error('❌ SOME BENCHMARKS FAILED.');
    process.exit(1);
  }
  console.log('============================================================\n');
}

runMasterIntelligenceTests();
