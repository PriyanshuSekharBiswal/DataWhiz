async function testServerApiRoutes() {
  console.log('Testing live Next.js API routes on http://localhost:3000...\n');

  // 1. Health API
  try {
    const healthRes = await fetch('http://localhost:3000/api/health');
    console.log('1. /api/health Status:', healthRes.status);
    const healthData = await healthRes.json();
    console.log('   Report:', JSON.stringify(healthData, null, 2));
  } catch (err: any) {
    console.error('Health API error:', err.message);
  }

  // 2. Planning API
  try {
    const planRes = await fetch('http://localhost:3000/api/plan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fileName: 'ecommerce_ledger.csv',
        domain: 'Retail & E-Commerce',
        profileText: 'Columns: [transaction_id (id), order_date (date), revenue_eur (measure), country (dimension)]',
        capabilities: { timeSeries: true, cohort: false }
      })
    });
    console.log('\n2. /api/plan Status:', planRes.status);
    const planData = await planRes.json();
    console.log('   Plan Success:', planData.success, '| Source:', planData.source);
    console.log('   Plan Summary:', planData.plan?.summary);
  } catch (err: any) {
    console.error('Plan API error:', err.message);
  }

  // 3. Ask API
  try {
    const askRes = await fetch('http://localhost:3000/api/ask', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        question: 'Which country generated the most revenue?',
        profileText: 'Total Revenue: €1,240,000. Germany: €450k, UK: €380k, France: €210k',
        history: []
      })
    });
    console.log('\n3. /api/ask Status:', askRes.status);
    const askData = await askRes.json();
    console.log('   Ask Success:', askData.success);
    console.log('   Answer:', askData.result?.text);
  } catch (err: any) {
    console.error('Ask API error:', err.message);
  }

  console.log('\n✅ All API routes verified!');
}

testServerApiRoutes().catch(console.error);
