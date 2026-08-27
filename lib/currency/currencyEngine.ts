// Currency Intelligence Engine: Detects currencies from explicit evidence without defaulting to € or $

import { CurrencyCode } from '@/lib/types';

export interface CurrencyInference {
  currencyCode: CurrencyCode;
  symbol: string;
  confidence: number;
  evidence: string[];
}

const CURRENCY_SYMBOLS: Record<CurrencyCode, string> = {
  USD: '$',
  EUR: '€',
  INR: '₹',
  GBP: '£',
  JPY: '¥',
  CAD: 'CA$',
  AUD: 'A$',
  CHF: 'CHF ',
  CNY: '¥',
  unspecified: '',
  none: ''
};

export function getCurrencySymbol(code?: CurrencyCode): string {
  if (!code || code === 'none' || code === 'unspecified') return '';
  return CURRENCY_SYMBOLS[code] || '';
}

/**
 * Detect currency from column name, sample values, and explicit tokens
 */
export function detectCurrency(
  colName: string,
  sampleValues: (string | number | boolean | null)[] = []
): CurrencyInference {
  const colLower = colName.toLowerCase();
  const evidence: string[] = [];

  // 1. Explicit currency code in column name
  if (/(^|_|\b)(eur|euro|euros)(_|\b|$)/i.test(colLower) || /_eur$/i.test(colLower) || /eur$/i.test(colLower)) {
    evidence.push(`Column name contains explicit EUR indicator ('${colName}')`);
    return { currencyCode: 'EUR', symbol: '€', confidence: 0.98, evidence };
  }

  if (/(^|_|\b)(usd|dollar|dollars)(_|\b|$)/i.test(colLower) || /_usd$/i.test(colLower) || /usd$/i.test(colLower)) {
    evidence.push(`Column name contains explicit USD indicator ('${colName}')`);
    return { currencyCode: 'USD', symbol: '$', confidence: 0.98, evidence };
  }

  if (/(^|_|\b)(inr|rupee|rupees|rs|in_rs)(_|\b|$)/i.test(colLower) || /_inr$/i.test(colLower) || /inr$/i.test(colLower)) {
    evidence.push(`Column name contains explicit INR indicator ('${colName}')`);
    return { currencyCode: 'INR', symbol: '₹', confidence: 0.98, evidence };
  }

  if (/(^|_|\b)(gbp|pound|pounds)(_|\b|$)/i.test(colLower) || /_gbp$/i.test(colLower) || /gbp$/i.test(colLower)) {
    evidence.push(`Column name contains explicit GBP indicator ('${colName}')`);
    return { currencyCode: 'GBP', symbol: '£', confidence: 0.98, evidence };
  }

  if (/(^|_|\b)(jpy|yen)(_|\b|$)/i.test(colLower) || /_jpy$/i.test(colLower) || /jpy$/i.test(colLower)) {
    evidence.push(`Column name contains explicit JPY indicator ('${colName}')`);
    return { currencyCode: 'JPY', symbol: '¥', confidence: 0.98, evidence };
  }

  if (/(^|_|\b)(cad|aud|chf|cny)(_|\b|$)/i.test(colLower)) {
    const code = colLower.match(/(cad|aud|chf|cny)/i)?.[1]?.toUpperCase() as CurrencyCode;
    if (code) {
      evidence.push(`Column name contains explicit ${code} indicator ('${colName}')`);
      return { currencyCode: code, symbol: CURRENCY_SYMBOLS[code] || '', confidence: 0.95, evidence };
    }
  }

  // 2. Sample value string scanning for currency symbols
  let euroSymbolCount = 0;
  let usdSymbolCount = 0;
  let inrSymbolCount = 0;
  let gbpSymbolCount = 0;
  let jpySymbolCount = 0;

  for (const val of sampleValues) {
    if (typeof val === 'string') {
      if (val.includes('€') || /eur/i.test(val)) euroSymbolCount++;
      if (val.includes('$') || /usd/i.test(val)) usdSymbolCount++;
      if (val.includes('₹') || /inr|rs\.?/i.test(val)) inrSymbolCount++;
      if (val.includes('£') || /gbp/i.test(val)) gbpSymbolCount++;
      if (val.includes('¥') || /jpy/i.test(val)) jpySymbolCount++;
    }
  }

  const sampleCount = sampleValues.filter(v => v !== null && v !== undefined).length;
  if (sampleCount > 0) {
    if (euroSymbolCount / sampleCount >= 0.3) {
      evidence.push(`Raw sample values contain Euro currency symbol (€)`);
      return { currencyCode: 'EUR', symbol: '€', confidence: 0.95, evidence };
    }
    if (usdSymbolCount / sampleCount >= 0.3) {
      evidence.push(`Raw sample values contain USD currency symbol ($)`);
      return { currencyCode: 'USD', symbol: '$', confidence: 0.95, evidence };
    }
    if (inrSymbolCount / sampleCount >= 0.3) {
      evidence.push(`Raw sample values contain INR currency symbol (₹)`);
      return { currencyCode: 'INR', symbol: '₹', confidence: 0.95, evidence };
    }
    if (gbpSymbolCount / sampleCount >= 0.3) {
      evidence.push(`Raw sample values contain GBP currency symbol (£)`);
      return { currencyCode: 'GBP', symbol: '£', confidence: 0.95, evidence };
    }
    if (jpySymbolCount / sampleCount >= 0.3) {
      evidence.push(`Raw sample values contain JPY currency symbol (¥)`);
      return { currencyCode: 'JPY', symbol: '¥', confidence: 0.95, evidence };
    }
  }

  // 3. Monetary field candidate without identifiable currency:
  // e.g. "MonthlyCharges", "Revenue", "Cost", "Price", "Salary", "Budget"
  const isMonetaryName = /(revenue|sales|income|turnover|gmv|price|cost|expense|cogs|margin|fee|spend|charge|pay|salary|wage|budget|balance|fare|toll)/i.test(colLower)
    && !/(tonnes|kg|lbs|pct|percent|rate|ratio|margin_pct|count|qty|units|volume)/i.test(colLower);

  if (isMonetaryName) {
    evidence.push(`Monetary naming pattern detected ('${colName}'), but no explicit currency code identified.`);
    return {
      currencyCode: 'unspecified',
      symbol: '',
      confidence: 0.70,
      evidence
    };
  }

  return {
    currencyCode: 'none',
    symbol: '',
    confidence: 0.90,
    evidence: ['Non-monetary attribute']
  };
}
