import { buildAnalyticalView } from '../lib/relationships/relationshipDetector';
import { TableSpec } from '../lib/types';

function runMultiSheetStrategyTests() {
  console.log('=== TESTING MULTI-SHEET EXCEL COMBINATION STRATEGIES ===\n');

  // TEST 1: Star-Schema Relational Joining (e.g. Fact + Dimensions)
  console.log('--- TEST 1: Relational Star-Schema Left-Join ---');
  const factTable: TableSpec = {
    tableName: 'FactSales',
    columns: ['SalesID', 'DateKey', 'ProductID', 'Revenue'],
    rows: [
      { SalesID: 1, DateKey: 20240101, ProductID: 'P1', Revenue: 100 },
      { SalesID: 2, DateKey: 20240102, ProductID: 'P2', Revenue: 200 },
      { SalesID: 3, DateKey: 20240101, ProductID: 'P1', Revenue: 150 }
    ]
  };

  const dimProduct: TableSpec = {
    tableName: 'DimProduct',
    columns: ['ProductID', 'ProductName', 'Category'],
    rows: [
      { ProductID: 'P1', ProductName: 'Aspirin', Category: 'Pain Relief' },
      { ProductID: 'P2', ProductName: 'Amoxicillin', Category: 'Antibiotics' }
    ]
  };

  const dimDate: TableSpec = {
    tableName: 'DimDate',
    columns: ['DateKey', 'Date', 'MonthName'],
    rows: [
      { DateKey: 20240101, Date: '2024-01-01', MonthName: 'January' },
      { DateKey: 20240102, Date: '2024-01-02', MonthName: 'January' }
    ]
  };

  const res1 = buildAnalyticalView([factTable, dimProduct, dimDate]);
  console.log(`Result 1 Row Count: ${res1.analyticalRows.length} (expected 3)`);
  console.log(`Result 1 Merged Columns: ${res1.mergedColumns.join(', ')}`);
  console.log(`Result 1 Sample Row:`, res1.analyticalRows[0]);
  const passed1 = res1.analyticalRows.length === 3 &&
    res1.analyticalRows[0].ProductName === 'Aspirin' &&
    res1.analyticalRows[0].MonthName === 'January';
  console.log(`Test 1 Status: ${passed1 ? '✅ PASSED' : '❌ FAILED'}\n`);

  // TEST 2: Homogeneous Partition Union (e.g. 2023_Sales + 2024_Sales)
  console.log('--- TEST 2: Homogeneous Partition Union (Append) ---');
  const sheet2023: TableSpec = {
    tableName: '2023_Sales',
    columns: ['Date', 'Region', 'Revenue'],
    rows: [
      { Date: '2023-01-01', Region: 'North', Revenue: 500 },
      { Date: '2023-02-01', Region: 'South', Revenue: 600 }
    ]
  };

  const sheet2024: TableSpec = {
    tableName: '2024_Sales',
    columns: ['Date', 'Region', 'Revenue'],
    rows: [
      { Date: '2024-01-01', Region: 'North', Revenue: 700 },
      { Date: '2024-02-01', Region: 'South', Revenue: 850 }
    ]
  };

  const res2 = buildAnalyticalView([sheet2023, sheet2024]);
  console.log(`Result 2 Row Count: ${res2.analyticalRows.length} (expected 4)`);
  console.log(`Result 2 Merged Columns: ${res2.mergedColumns.join(', ')}`);
  console.log(`Result 2 Sample Rows:`, res2.analyticalRows);
  const passed2 = res2.analyticalRows.length === 4 &&
    res2.analyticalRows[0].Source_Sheet === '2023_Sales' &&
    res2.analyticalRows[2].Source_Sheet === '2024_Sales';
  console.log(`Test 2 Status: ${passed2 ? '✅ PASSED' : '❌ FAILED'}\n`);

  // TEST 3: Independent / Disjoint Sheets (No key overlap, different schemas)
  console.log('--- TEST 3: Disjoint Independent Sheets ---');
  const sheetTransactions: TableSpec = {
    tableName: 'Transactions',
    columns: ['TxnID', 'Amount', 'CustomerType'],
    rows: [
      { TxnID: 101, Amount: 45, CustomerType: 'Retail' },
      { TxnID: 102, Amount: 90, CustomerType: 'Wholesale' }
    ]
  };

  const sheetStaff: TableSpec = {
    tableName: 'StaffDirectory',
    columns: ['EmpID', 'FullName', 'Department'],
    rows: [
      { EmpID: 'E1', FullName: 'Alice Johnson', Department: 'HR' },
      { EmpID: 'E2', FullName: 'Bob Smith', Department: 'Finance' }
    ]
  };

  const res3 = buildAnalyticalView([sheetTransactions, sheetStaff]);
  console.log(`Result 3 Row Count: ${res3.analyticalRows.length} (expected 2)`);
  console.log(`Result 3 Fact Table: '${res3.factTable}'`);
  console.log(`Result 3 Warnings: ${res3.joinWarnings.join(' | ')}`);
  const passed3 = res3.analyticalRows.length === 2 && res3.factTable === 'Transactions';
  console.log(`Test 3 Status: ${passed3 ? '✅ PASSED' : '❌ FAILED'}\n`);

  if (passed1 && passed2 && passed3) {
    console.log('🎉 ALL 3 MULTI-SHEET COMBINATION STRATEGIES WORKING PERFECTLY!');
  } else {
    console.error('❌ SOME TESTS FAILED.');
    process.exit(1);
  }
}

runMultiSheetStrategyTests();
