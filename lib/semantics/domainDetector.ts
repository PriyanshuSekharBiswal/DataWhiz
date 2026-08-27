// Business Domain Detection Engine: Identifies business domain, entities, and confidence

import { DomainInfo, ColumnSchema, BusinessGlossaryNode } from '@/lib/types';

interface DomainPattern {
  name: string;
  keywords: string[];
  entityKeywords: string[];
  weight: number;
}

const DOMAIN_PATTERNS: DomainPattern[] = [
  {
    name: 'Retail & E-Commerce',
    keywords: ['product', 'sku', 'price', 'quantity', 'revenue', 'order', 'category', 'discount', 'store', 'retail', 'sales', 'cart', 'customer'],
    entityKeywords: ['Product', 'Order', 'Store', 'Customer', 'Category'],
    weight: 1.0
  },
  {
    name: 'SaaS & Customer Retention',
    keywords: ['churn', 'tenure', 'contract', 'monthlycharges', 'totalcharges', 'subscription', 'mrr', 'arr', 'plan', 'renewal', 'techsupport'],
    entityKeywords: ['Subscriber', 'Contract', 'Subscription', 'Service'],
    weight: 1.2
  },
  {
    name: 'Digital Marketing & Advertising',
    keywords: ['imp', 'clk', 'impressions', 'clicks', 'ctr', 'cpc', 'cpm', 'dtv', 'srh', 'campaign', 'channel', 'segment', 'creative', 'attribution'],
    entityKeywords: ['Campaign', 'Channel', 'Audience', 'Creative'],
    weight: 1.2
  },
  {
    name: 'International Trade & Logistics',
    keywords: ['commodity', 'tariff', 'partner_country', 'flow', 'export', 'import', 'tonnes', 'shipping', 'customs', 'freight'],
    entityKeywords: ['Country', 'Commodity', 'TradeFlow', 'Shipment'],
    weight: 1.1
  },
  {
    name: 'Financial Services & Banking',
    keywords: ['balance', 'credit', 'debit', 'loan', 'interest', 'portfolio', 'asset', 'liability', 'transaction', 'account'],
    entityKeywords: ['Account', 'Transaction', 'Portfolio', 'Loan'],
    weight: 1.0
  }
];

export function detectBusinessDomain(schemas: ColumnSchema[]): DomainInfo {
  const colNames = schemas.map(s => s.technicalName.toLowerCase().replace(/[\s_-]+/g, ''));
  const scores: { domain: string; score: number; matchedKeywords: string[]; entities: string[] }[] = [];

  for (const domain of DOMAIN_PATTERNS) {
    let matchCount = 0;
    const matchedKeywords: string[] = [];

    for (const kw of domain.keywords) {
      if (colNames.some(c => c.includes(kw))) {
        matchCount++;
        matchedKeywords.push(kw);
      }
    }

    const score = matchCount * domain.weight;
    scores.push({
      domain: domain.name,
      score,
      matchedKeywords,
      entities: domain.entityKeywords.filter(e => colNames.some(c => c.includes(e.toLowerCase())))
    });
  }

  scores.sort((a, b) => b.score - a.score);
  const best = scores[0];

  if (!best || best.score === 0) {
    return {
      primaryDomain: 'General Tabular Analytics',
      confidence: 0.60,
      evidence: ['No specific domain-specific keywords identified. Applying general statistical and exploratory analytical framework.'],
      alternativeDomains: [],
      detectedEntities: ['Record', 'Entity']
    };
  }

  const confidence = Math.min(0.98, Math.max(0.65, 0.5 + (best.score / 6) * 0.45));
  const evidence = best.matchedKeywords.map(kw => `Identified domain signal in column signatures matching '${kw}'.`);

  const alternativeDomains = scores
    .slice(1, 3)
    .filter(s => s.score > 0)
    .map(s => ({ domain: s.domain, confidence: Math.round((s.score / (best.score || 1)) * 0.7 * 100) / 100 }));

  return {
    primaryDomain: best.domain,
    confidence: Math.round(confidence * 100) / 100,
    evidence,
    alternativeDomains,
    detectedEntities: best.entities.length > 0 ? best.entities : ['Entity']
  };
}

export function buildBusinessGlossary(schemas: ColumnSchema[], domain: DomainInfo): BusinessGlossaryNode[] {
  const nodes: BusinessGlossaryNode[] = [];

  if (domain.primaryDomain.includes('Marketing')) {
    nodes.push({
      category: 'Digital Media Channels',
      description: 'Multi-channel digital and televised advertising media formats.',
      columns: schemas.filter(s => s.technicalName.includes('dtv_dig') || s.technicalName.includes('imp')).map(s => s.displayName),
      subcategories: [
        {
          category: 'Connected TV & Video',
          description: 'High-impact television streaming and online video impressions.',
          columns: schemas.filter(s => s.technicalName.includes('ctv') || s.technicalName.includes('olv')).map(s => s.displayName)
        },
        {
          category: 'Display & OEM Placements',
          description: 'Banner advertisements and native device home screen inventory.',
          columns: schemas.filter(s => s.technicalName.includes('dis') || s.technicalName.includes('oem')).map(s => s.displayName)
        }
      ]
    });
    nodes.push({
      category: 'Search Engine Marketing',
      description: 'Paid search keyword acquisition campaigns.',
      columns: schemas.filter(s => s.technicalName.includes('srh') || s.technicalName.includes('clk')).map(s => s.displayName),
      subcategories: [
        {
          category: 'Branded vs Generic Search',
          description: 'Click traffic segmented by direct brand intent versus broad generic discovery.',
          columns: schemas.filter(s => s.technicalName.includes('brd') || s.technicalName.includes('gen')).map(s => s.displayName)
        }
      ]
    });
  } else if (domain.primaryDomain.includes('Retail') || domain.primaryDomain.includes('Sales')) {
    nodes.push({
      category: 'Financial Performance',
      description: 'Core top-line monetary exchange metrics.',
      columns: schemas.filter(s => ['Revenue', 'Price', 'Discount', 'sales', 'value_usd'].some(k => s.technicalName.toLowerCase().includes(k.toLowerCase()))).map(s => s.displayName)
    });
    nodes.push({
      category: 'Catalog & Inventory',
      description: 'Product hierarchical attributes and order volumes.',
      columns: schemas.filter(s => ['Product', 'Category', 'Quantity', 'units_sold'].some(k => s.technicalName.toLowerCase().includes(k.toLowerCase()))).map(s => s.displayName)
    });
    nodes.push({
      category: 'Geographic & Fulfillment',
      description: 'Regional delivery and market segmentation.',
      columns: schemas.filter(s => ['Region', 'City', 'State', 'Location', 'store'].some(k => s.technicalName.toLowerCase().includes(k.toLowerCase()))).map(s => s.displayName)
    });
  } else if (domain.primaryDomain.includes('Churn') || domain.primaryDomain.includes('SaaS')) {
    nodes.push({
      category: 'Customer Account Profile',
      description: 'Tenure, demographic, and account lifecycle measures.',
      columns: schemas.filter(s => ['CustomerID', 'Gender', 'SeniorCitizen', 'Tenure'].some(k => s.technicalName.toLowerCase().includes(k.toLowerCase()))).map(s => s.displayName)
    });
    nodes.push({
      category: 'Subscription & Billing',
      description: 'Recurring charges, contract commitments, and payment options.',
      columns: schemas.filter(s => ['Contract', 'PaymentMethod', 'MonthlyCharges', 'TotalCharges'].some(k => s.technicalName.toLowerCase().includes(k.toLowerCase()))).map(s => s.displayName)
    });
    nodes.push({
      category: 'Retention Target',
      description: 'Outcome metric indicating service cancellation or continued retention.',
      columns: schemas.filter(s => s.technicalName.toLowerCase().includes('churn')).map(s => s.displayName)
    });
  } else {
    nodes.push({
      category: 'Dimensions',
      description: 'Categorical and temporal segmentation fields.',
      columns: schemas.filter(s => s.logicalType.startsWith('dimension') || s.logicalType === 'date').map(s => s.displayName)
    });
    nodes.push({
      category: 'Measures & Metrics',
      description: 'Quantitative numerical columns evaluated for aggregations.',
      columns: schemas.filter(s => s.logicalType.startsWith('measure')).map(s => s.displayName)
    });
  }

  return nodes;
}
