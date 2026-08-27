import { runFullAnalysisPipeline } from '../lib/pipeline';
import { processAskQuery } from '../lib/askDataEngine';

function runSeniorAnalystGoldenTest() {
  console.log('================================================================');
  console.log('  CHECKPOINT 6: SENIOR ANALYST GOLDEN END-TO-END TEST           ');
  console.log('================================================================\n');

  // Unfamiliar Dataset: Fleet Logistics Delivery & Vehicle Telemetry (Zero sales/pharmacy keywords)
  const logisticsCSV = `vehicle_code,dispatch_date,payload_kg,fuel_litres,engine_temp_c,delivered_status
FLEET-A1,2024-01-01,1200.5,45.2,88.4,1
FLEET-A1,2024-01-08,1350.0,48.0,89.1,1
FLEET-B2,2024-01-01,2400.0,82.5,96.5,0
FLEET-B2,2024-01-08,2550.0,86.0,98.2,0
FLEET-C3,2024-01-01,850.0,32.0,82.0,1
FLEET-C3,2024-01-08,920.0,34.5,83.1,1
FLEET-A1,2024-01-15,1400.0,49.2,88.9,1
FLEET-A1,2024-01-22,1450.0,51.0,90.2,1
FLEET-B2,2024-01-15,2600.0,88.0,99.4,0
FLEET-B2,2024-01-22,2700.0,91.5,101.1,0
FLEET-C3,2024-01-15,900.0,33.0,82.5,1
FLEET-C3,2024-01-22,950.0,35.0,83.8,1
FLEET-A1,2024-01-29,1500.0,52.5,91.0,1
FLEET-B2,2024-01-29,2800.0,94.0,102.5,0
FLEET-C3,2024-01-29,980.0,36.0,84.2,1
FLEET-A1,2024-02-05,1550.0,54.0,91.8,1
FLEET-B2,2024-02-05,2850.0,95.5,103.0,0
FLEET-C3,2024-02-05,1000.0,37.0,84.9,1`;

  console.log('1. Executing Full Master Pipeline on Unseen Fleet Logistics CSV...');
  const result = runFullAnalysisPipeline({
    csvContent: logisticsCSV,
    fileName: 'fleet_logistics_telemetry.csv',
    prompt: 'Analyze fleet delivery efficiency and engine thermal risks'
  });

  const { context, plan, understandingReport, businessQuestions, findings, observations, dashboard } = result;

  console.log('\n--- 2. Dataset Understanding & Semantics ---');
  console.log(`Summary: ${understandingReport.datasetSummary}`);
  console.log(`Primary Outcome: ${understandingReport.primaryOutcome}`);
  console.log(`Primary Entity: ${understandingReport.primaryEntity}`);
  console.log(`Time Dimension: ${understandingReport.timeDimension?.column} (${understandingReport.timeDimension?.grain}, ${understandingReport.timeDimension?.totalPeriods} periods)`);
  console.log(`Target Candidate:`, context.targetCandidates?.map(t => `${t.column} (${t.taskType}, conf: ${t.confidence})`));

  if (!context.targetCandidates?.some(t => t.column === 'delivered_status' && t.taskType === 'binary_classification')) {
    throw new Error('Golden Test Failed: delivered_status was not identified as binary classification target candidate!');
  }

  console.log('\n--- 3. Capability Validation & Analysis Plan ---');
  console.log(`Plan Summary: ${plan.planSummary}`);
  console.log(`Executable Tasks (${plan.tasks.length}):`, plan.tasks.map(t => `${t.title} [priority: ${t.priority}]`));
  console.log(`Pruned/Skipped (${plan.skippedTasks.length}):`, plan.skippedTasks.map(s => `${s.category}`));

  if (!context.capabilities.time_series_forecasting.supported) {
    throw new Error('Golden Test Failed: 6-period weekly time-series should support forecasting!');
  }
  if (!context.capabilities.classification_churn.supported) {
    throw new Error('Golden Test Failed: Supervised binary classification should be supported for delivered_status!');
  }

  console.log('\n--- 4. Verified Findings & Observations ---');
  console.log(`Generated ${findings.length} findings:`);
  findings.forEach((f, idx) => console.log(`  [Finding ${idx + 1}] (${f.type}) ${f.statement}`));

  console.log(`Generated ${observations.length} observations:`);
  observations.forEach((obs, idx) => {
    console.log(`  [Obs ${idx + 1}] ${obs.title}`);
    console.log(`    FACT: ${obs.fact}`);
    console.log(`    INTERPRETATION: ${obs.interpretation}`);
  });

  console.log('\n--- 5. Dashboard Specification ---');
  console.log(`Dashboard Title: ${dashboard.spec?.title}`);
  console.log(`Overview KPIs:`, dashboard.spec?.overview.kpis.map(k => `${k.label}: ${k.value}`));
  console.log(`Hero Visuals:`, dashboard.spec?.overview.heroVisuals.map(v => `${v.title} (${v.type})`));
  console.log(`Sections:`, dashboard.spec?.sections.map(s => `${s.title} [${s.sectionType}]`));

  if (!dashboard.spec || dashboard.spec.overview.kpis.length === 0) {
    throw new Error('Golden Test Failed: DashboardSpec is missing or has zero KPIs!');
  }

  console.log('\n--- 6. Ask Your Data Agent on Unseen Questions ---');
  const q1 = processAskQuery('Which vehicle carried the highest payload?', context);
  console.log(`Query: 'Which vehicle carried the highest payload?'`);
  console.log(`Answer:\n${q1.text}`);
  console.log(`Provenance:`, q1.provenance);

  if (!q1.provenance || q1.provenance.toolName !== 'rank') {
    throw new Error('Golden Test Failed: Expected rank tool provenance for vehicle payload ranking!');
  }

  const q2 = processAskQuery('What is the correlation between payload and fuel?', context);
  console.log(`\nQuery: 'What is the correlation between payload and fuel?'`);
  console.log(`Answer:\n${q2.text}`);
  console.log(`Provenance:`, q2.provenance);

  console.log('\n================================================================');
  console.log('  SENIOR ANALYST GOLDEN TEST PASSED COMPLETELY!                 ');
  console.log('================================================================');
}

runSeniorAnalystGoldenTest();
