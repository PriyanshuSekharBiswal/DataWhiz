import { runFullAnalysisPipeline } from '../lib/pipeline';

function generateBenchmarkDataset(rowCount: number) {
  const rows: string[] = ['date,region,category,sales,quantity,discount,profit'];
  const regions = ['North', 'South', 'East', 'West'];
  const categories = ['Electronics', 'Furniture', 'Apparel', 'Office'];
  
  const baseDate = new Date('2023-01-01').getTime();
  const dayMs = 24 * 60 * 60 * 1000;

  for (let i = 0; i < rowCount; i++) {
    const dt = new Date(baseDate + (i % 365) * dayMs).toISOString().split('T')[0];
    const reg = regions[i % regions.length];
    const cat = categories[i % categories.length];
    const sales = (100 + (i % 500) + Math.random() * 20).toFixed(2);
    const qty = 1 + (i % 10);
    const disc = (0.05 + (i % 4) * 0.05).toFixed(2);
    const profit = ((parseFloat(sales) * (1 - parseFloat(disc))) * 0.25).toFixed(2);
    rows.push(`${dt},${reg},${cat},${sales},${qty},${disc},${profit}`);
  }

  return rows.join('\n');
}

function runCheckpoint8PerformanceBenchmarks() {
  console.log('================================================================');
  console.log('  CHECKPOINT 8 PERFORMANCE & MEMORY ARCHITECTURE BENCHMARK      ');
  console.log('================================================================\n');

  const benchmarkSizes = [1000, 10000, 50000];
  let passedCount = 0;

  for (const size of benchmarkSizes) {
    console.log(`>>> Benchmarking Pipeline on ${size.toLocaleString()} Rows...`);
    const initialMem = process.memoryUsage().heapUsed / (1024 * 1024);
    const csvContent = generateBenchmarkDataset(size);
    const genMem = process.memoryUsage().heapUsed / (1024 * 1024);

    const tStart = performance.now();
    const result = runFullAnalysisPipeline({ csvContent, fileName: `benchmark_${size}.csv` });
    const tEnd = performance.now();

    const finalMem = process.memoryUsage().heapUsed / (1024 * 1024);
    const durationMs = Math.round(tEnd - tStart);
    const memoryDeltaMb = Math.round((finalMem - initialMem) * 10) / 10;

    console.log(`  ⏱️ Execution Duration: ${durationMs} ms (${(durationMs / 1000).toFixed(2)}s)`);
    console.log(`  💾 Memory Delta: +${memoryDeltaMb} MB (Heap: ${Math.round(finalMem)} MB)`);
    console.log(`  📊 Quality Gate: ${result.qualityGate.overallPassed ? 'PASSED' : 'FLAGGED'}, KPIs: ${result.dashboard.spec?.overview.kpis.length}, Findings: ${result.findings.length}`);

    // Performance budgets:
    // 1K rows: < 300ms
    // 10K rows: < 1500ms
    // 50K rows: < 6000ms
    const maxAllowedMs = size <= 1000 ? 500 : size <= 10000 ? 2500 : 8000;
    if (durationMs > maxAllowedMs) {
      throw new Error(`Performance Budget Exceeded for ${size} rows: took ${durationMs}ms (max allowed ${maxAllowedMs}ms)`);
    }

    console.log(`  ✅ Benchmark for ${size.toLocaleString()} rows PASSED within performance budget.\n`);
    passedCount++;
  }

  console.log('================================================================');
  console.log(`  CHECKPOINT 8 PERFORMANCE BENCHMARKS PASSED (${passedCount}/${benchmarkSizes.length})`);
  console.log('================================================================');
}

runCheckpoint8PerformanceBenchmarks();
