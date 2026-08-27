import { SALES_CSV_RAW } from './salesDataset';
import { CHURN_CSV_RAW } from './churnDataset';
import { MULTI_TABLE_RELATIONAL } from './multiTableDataset';
import { CRYPTIC_MARKETING_CSV_RAW } from './crypticMarketingDataset';

export interface BenchmarkDatasetMeta {
  id: string;
  name: string;
  category: string;
  description: string;
  fileName: string;
  csvContent: string;
  icon: string;
  tags: string[];
  suggestedQuestions: string[];
}

export const BENCHMARK_DATASETS: BenchmarkDatasetMeta[] = [
  {
    id: 'sales-retail',
    name: 'Retail & E-Commerce Sales',
    category: 'Sales & Inventory',
    description: '45 transactional records with dirty mixed date formats, duplicates, currency strings, and multi-category pricing.',
    fileName: 'sales_transactions_dirty.csv',
    csvContent: SALES_CSV_RAW,
    icon: 'ShoppingBag',
    tags: ['Sales', 'Dirty Data', 'Forecasting', 'Pricing'],
    suggestedQuestions: [
      'Which product should I invest in?',
      'Forecast sales for the next 6 months',
      'What are the strongest revenue drivers?',
      'Identify data quality issues in this dataset'
    ]
  },
  {
    id: 'customer-churn',
    name: 'Telco Customer Churn & Retention',
    category: 'Customer Intelligence',
    description: '40 customer accounts with contract tenure, monthly fees, streaming services, and binary churn status.',
    fileName: 'customer_churn_profile.csv',
    csvContent: CHURN_CSV_RAW,
    icon: 'Users',
    tags: ['Classification', 'Churn Risk', 'Customer Retention'],
    suggestedQuestions: [
      'What factors are driving customer churn?',
      'Compare churn rates by contract type',
      'Which customer segments have the highest risk?',
      'Predict churn probability for month-to-month contracts'
    ]
  },
  {
    id: 'cryptic-marketing',
    name: 'Cryptic Multi-Channel Performance',
    category: 'Digital Marketing & Ads',
    description: 'Technical ad impressions and clicks across CTV, OLV, Display, and Branded Search with cryptic column codes.',
    fileName: 'dtv_digital_perf_raw.csv',
    csvContent: CRYPTIC_MARKETING_CSV_RAW,
    icon: 'BarChart2',
    tags: ['Cryptic Names', 'Marketing Mix', 'Attribution', 'Correlation'],
    suggestedQuestions: [
      'What do these cryptic column names mean?',
      'Which marketing channels drive the most sales?',
      'What is the correlation between search clicks and sales?',
      'Forecast marketing impressions for next month'
    ]
  },
  {
    id: 'multi-table-orders',
    name: 'Relational Orders & Products',
    category: 'Relational Database',
    description: 'Relational order records joined with customer and product catalog dimensions across geographies.',
    fileName: 'ecommerce_relational_orders.csv',
    csvContent: MULTI_TABLE_RELATIONAL.Orders,
    icon: 'Database',
    tags: ['Multi-Table', 'Foreign Keys', 'Fulfillment'],
    suggestedQuestions: [
      'Detect table relationships and foreign keys',
      'What is the average order value by region?',
      'Which products have highest reorder rate?'
    ]
  }
];

export { SALES_CSV_RAW, CHURN_CSV_RAW, MULTI_TABLE_RELATIONAL, CRYPTIC_MARKETING_CSV_RAW };
