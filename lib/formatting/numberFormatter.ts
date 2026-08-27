// Universal Number & Metric Formatter: Formats numbers strictly aligned with semantic unit metadata

import { UnitMetadata, MeasurementType, CurrencyCode } from '@/lib/types';
import { getCurrencySymbol } from '@/lib/currency/currencyEngine';

export interface FormatOptions {
  compact?: boolean;
  precision?: number;
  showUnitSymbol?: boolean;
}

export function formatMetricValue(
  val: number | null | undefined,
  metadata?: UnitMetadata | string,
  options: FormatOptions = {}
): string {
  if (val === null || val === undefined || !isFinite(val)) {
    return '—';
  }

  const { compact = true, precision = 1, showUnitSymbol = true } = options;

  let unitMeta: UnitMetadata | undefined = undefined;
  if (typeof metadata === 'string') {
    // If a simple string was passed (like 'currency' or 'percentage')
    if (metadata.includes('currency') || metadata === '€' || metadata === '$' || metadata === '₹') {
      const code: CurrencyCode = metadata === '€' ? 'EUR' : metadata === '$' ? 'USD' : metadata === '₹' ? 'INR' : 'unspecified';
      unitMeta = { measurementType: 'currency', currencyCode: code, unitSymbol: getCurrencySymbol(code) };
    } else if (metadata.includes('percent') || metadata === '%') {
      unitMeta = { measurementType: 'percentage', unitSymbol: '%' };
    } else {
      unitMeta = { measurementType: 'quantity', unitSymbol: metadata };
    }
  } else {
    unitMeta = metadata;
  }

  const mType: MeasurementType = unitMeta?.measurementType || 'quantity';
  const sym = showUnitSymbol ? (unitMeta?.unitSymbol || getCurrencySymbol(unitMeta?.currencyCode) || '') : '';
  const isINR = unitMeta?.currencyCode === 'INR';

  // 1. Percentage Formatting
  if (mType === 'percentage') {
    const displayVal = unitMeta?.percentageScale === '0_to_1' ? val * 100 : val;
    return `${displayVal.toFixed(precision)}%`;
  }

  // 2. Ratio Formatting (dimensionless)
  if (mType === 'ratio') {
    return val.toLocaleString(undefined, {
      minimumFractionDigits: Math.min(2, precision),
      maximumFractionDigits: Math.max(2, precision)
    });
  }

  // 3. Temperature Formatting (e.g. 88.4°C)
  if (mType === 'temperature') {
    return `${val.toFixed(precision)}${sym || '°C'}`;
  }

  // 4. Physical Mass, Volume, Distance, Duration with suffix symbol
  if (mType === 'mass' || mType === 'volume' || mType === 'distance' || mType === 'duration' || mType === 'rate') {
    const formattedNum = formatMagnitude(val, compact, precision, isINR);
    return sym ? `${formattedNum} ${sym}` : formattedNum;
  }

  // 5. Currency Formatting (prefix symbol if available, no arbitrary symbol if unspecified)
  if (mType === 'currency') {
    const formattedNum = formatMagnitude(val, compact, precision, isINR);
    return sym ? `${sym}${formattedNum}` : formattedNum;
  }

  // 6. Counts & General Quantities
  return formatMagnitude(val, compact, precision, isINR);
}

/**
 * Format numerical magnitude with standard compact metric suffixes
 */
function formatMagnitude(
  v: number,
  compact: boolean,
  precision: number,
  useIndianNotation: boolean = false
): string {
  const abs = Math.abs(v);

  if (!compact || abs < 1000) {
    return v.toLocaleString(undefined, {
      maximumFractionDigits: Math.abs(v) < 10 ? 2 : precision
    });
  }

  if (useIndianNotation) {
    if (abs >= 1e7) {
      const cr = v / 1e7;
      return `${cr.toFixed(precision).replace(/\.0+$/, '')} Cr`;
    }
    if (abs >= 1e5) {
      const l = v / 1e5;
      return `${l.toFixed(precision).replace(/\.0+$/, '')} L`;
    }
    if (abs >= 1e3) {
      const k = v / 1e3;
      return `${k.toFixed(precision).replace(/\.0+$/, '')}k`;
    }
  } else {
    if (abs >= 1e9) {
      const b = v / 1e9;
      return `${b.toFixed(precision).replace(/\.0+$/, '')}B`;
    }
    if (abs >= 1e6) {
      const m = v / 1e6;
      return `${m.toFixed(precision).replace(/\.0+$/, '')}M`;
    }
    if (abs >= 1e3) {
      const k = v / 1e3;
      return `${k.toFixed(precision).replace(/\.0+$/, '')}k`;
    }
  }

  return v.toLocaleString(undefined, { maximumFractionDigits: precision });
}
