// Measurement & Unit Intelligence Engine: Detects measurement family, units, symbols, and formatting metadata

import { MeasurementType, UnitMetadata, PhysicalType } from '@/lib/types';
import { detectCurrency, CurrencyInference } from '@/lib/currency/currencyEngine';

export interface MeasurementInference {
  measurementType: MeasurementType;
  unitMetadata: UnitMetadata;
  confidence: number;
  evidence: string[];
}

/**
 * Infer full measurement family and unit metadata from column name, physical type, and sample values
 */
export function inferMeasurement(
  colName: string,
  physicalType: PhysicalType,
  sampleValues: (string | number | boolean | null)[] = [],
  isIdOrKey: boolean = false
): MeasurementInference {
  const colLower = colName.toLowerCase().replace(/[\s.-]+/g, '_');
  const evidence: string[] = [];

  // 1. Check Identifier
  if (isIdOrKey || /^(id|uuid|guid|pk|fk|code|key|identifier|seq|hash|ssn|phone|zip|postal|pin)$/i.test(colLower) || /_id$|_key$|_code$|_pk$|_fk$/i.test(colLower)) {
    evidence.push(`Identifier naming pattern ('${colName}')`);
    return {
      measurementType: 'identifier',
      unitMetadata: { measurementType: 'identifier' },
      confidence: 0.98,
      evidence
    };
  }

  // 2. Physical Non-numbers (strings/dates/booleans)
  if (physicalType === 'date') {
    return {
      measurementType: 'unknown',
      unitMetadata: { measurementType: 'unknown', displayFormat: 'YYYY-MM-DD' },
      confidence: 0.95,
      evidence: ['Temporal timestamp attribute']
    };
  }

  if (physicalType === 'string' || physicalType === 'boolean') {
    return {
      measurementType: 'unitless',
      unitMetadata: { measurementType: 'unitless' },
      confidence: 0.90,
      evidence: ['Categorical or discrete attribute']
    };
  }

  // 3. Physical Mass / Weight (e.g. tonnes, kg, grams, lbs, metric_tons)
  if (/(^|_)(tonne|tonnes|metric_ton|metric_tons|kg|kilogram|kilograms|lbs|pound|pounds|gram|grams|oz|ounces)(_|$)/i.test(colLower)) {
    let unitSymbol = 'kg';
    let unitName = 'Kilograms';
    if (/tonne/i.test(colLower)) { unitSymbol = 'tonnes'; unitName = 'Metric Tonnes'; }
    else if (/lbs|pound/i.test(colLower)) { unitSymbol = 'lbs'; unitName = 'Pounds'; }
    else if (/gram/i.test(colLower) && !/kilogram/i.test(colLower)) { unitSymbol = 'g'; unitName = 'Grams'; }

    evidence.push(`Physical mass/weight unit detected in column signature: '${unitName}'`);
    return {
      measurementType: 'mass',
      unitMetadata: {
        measurementType: 'mass',
        unitName,
        unitSymbol
      },
      confidence: 0.96,
      evidence
    };
  }

  // 4. Physical Volume (e.g. litres, gallons, ml, m3, barrels)
  if (/(^|_)(litre|litres|liter|liters|gallon|gallons|ml|milliliters|m3|cubic_meter|cubic_meters|bbl|barrels)(_|$)/i.test(colLower)) {
    let unitSymbol = 'L';
    let unitName = 'Litres';
    if (/gallon/i.test(colLower)) { unitSymbol = 'gal'; unitName = 'Gallons'; }
    else if (/m3|cubic/i.test(colLower)) { unitSymbol = 'm³'; unitName = 'Cubic Meters'; }
    else if (/bbl|barrel/i.test(colLower)) { unitSymbol = 'bbl'; unitName = 'Barrels'; }

    evidence.push(`Physical volume unit detected: '${unitName}'`);
    return {
      measurementType: 'volume',
      unitMetadata: {
        measurementType: 'volume',
        unitName,
        unitSymbol
      },
      confidence: 0.95,
      evidence
    };
  }

  // 5. Temperature (e.g. temp_c, temp_f, celsius, fahrenheit, kelvin)
  if (/(^|_)(temp|temperature|deg_c|deg_f|celsius|fahrenheit|kelvin)(_|$)/i.test(colLower)) {
    const isF = /_f$|fahrenheit/i.test(colLower);
    const unitSymbol = isF ? '°F' : '°C';
    const unitName = isF ? 'Fahrenheit' : 'Celsius';

    evidence.push(`Temperature measurement detected: '${unitName}'`);
    return {
      measurementType: 'temperature',
      unitMetadata: {
        measurementType: 'temperature',
        unitName,
        unitSymbol
      },
      confidence: 0.95,
      evidence
    };
  }

  // 6. Distance / Length (e.g. km, miles, meters, feet, cm, mm)
  if (/(^|_)(km|kilometer|kilometers|mile|miles|meter|meters|feet|foot|ft|cm|mm)(_|$)/i.test(colLower)) {
    let unitSymbol = 'km';
    let unitName = 'Kilometers';
    if (/mile/i.test(colLower)) { unitSymbol = 'mi'; unitName = 'Miles'; }
    else if (/meter/i.test(colLower)) { unitSymbol = 'm'; unitName = 'Meters'; }
    else if (/feet|foot|ft/i.test(colLower)) { unitSymbol = 'ft'; unitName = 'Feet'; }

    evidence.push(`Distance/length unit detected: '${unitName}'`);
    return {
      measurementType: 'distance',
      unitMetadata: {
        measurementType: 'distance',
        unitName,
        unitSymbol
      },
      confidence: 0.94,
      evidence
    };
  }

  // 7. Duration / Time Span (e.g. seconds, minutes, hours, days, weeks, months, years, tenure, latency, cycletime)
  if (/(^|_)(duration|tenure|latency|cycletime|cycle_time|sec|seconds|min|minutes|hr|hrs|hours|days|weeks|months|mths|years|yrs)(_|$)/i.test(colLower)) {
    let unitSymbol = 'units';
    let unitName = 'Time Span';
    if (/month|mths/i.test(colLower)) { unitSymbol = 'mo'; unitName = 'Months'; }
    else if (/year|yrs/i.test(colLower)) { unitSymbol = 'yr'; unitName = 'Years'; }
    else if (/day/i.test(colLower)) { unitSymbol = 'days'; unitName = 'Days'; }
    else if (/hour|hr/i.test(colLower)) { unitSymbol = 'hrs'; unitName = 'Hours'; }
    else if (/min/i.test(colLower)) { unitSymbol = 'min'; unitName = 'Minutes'; }
    else if (/sec/i.test(colLower)) { unitSymbol = 's'; unitName = 'Seconds'; }

    evidence.push(`Duration/time span measurement detected: '${unitName}'`);
    return {
      measurementType: 'duration',
      unitMetadata: {
        measurementType: 'duration',
        unitName,
        unitSymbol
      },
      confidence: 0.92,
      evidence
    };
  }

  // 8. Percentage / Rate / Ratio
  const isPercentageName = /(pct|percent|percentage|margin_pct|discount_pct|churn_rate|share_pct|growth_pct|roas_pct|ctr_pct)/i.test(colLower) || /%/i.test(colName);
  const isRatioName = /(ratio|current_ratio|quick_ratio|debt_to_equity|pe_ratio|roas|roi|cpc|cpm|cpa|ctr|multiplier|index)/i.test(colLower);

  if (isPercentageName) {
    // Check if scale is 0 to 1 or 0 to 100 based on sample values
    const numSamples = sampleValues.map(v => typeof v === 'number' ? v : parseFloat(String(v))).filter(v => isFinite(v));
    const maxVal = numSamples.length ? Math.max(...numSamples) : 50;
    const percentageScale = maxVal <= 1.05 && maxVal > 0 ? '0_to_1' : '0_to_100';

    evidence.push(`Percentage measurement detected (scale: ${percentageScale})`);
    return {
      measurementType: 'percentage',
      unitMetadata: {
        measurementType: 'percentage',
        unitName: 'Percentage',
        unitSymbol: '%',
        percentageScale
      },
      confidence: 0.95,
      evidence
    };
  }

  if (isRatioName) {
    evidence.push(`Dimensionless ratio / efficiency metric detected ('${colName}')`);
    return {
      measurementType: 'ratio',
      unitMetadata: {
        measurementType: 'ratio',
        unitName: 'Ratio'
      },
      confidence: 0.92,
      evidence
    };
  }

  // 9. Currency Detection via Currency Engine
  const currencyInf: CurrencyInference = detectCurrency(colName, sampleValues);
  if (currencyInf.currencyCode !== 'none') {
    evidence.push(...currencyInf.evidence);
    return {
      measurementType: 'currency',
      unitMetadata: {
        measurementType: 'currency',
        currencyCode: currencyInf.currencyCode,
        unitSymbol: currencyInf.symbol,
        unitName: currencyInf.currencyCode !== 'unspecified' ? currencyInf.currencyCode : undefined
      },
      confidence: currencyInf.confidence,
      evidence
    };
  }

  // 10. Counts / Quantities (e.g. units, quantity, count, clicks, impressions, visits, views)
  if (/(^|_)(count|orders|qty|quantity|units|clicks|impressions|views|visits|records|items|calls|cases|batches)(_|$)/i.test(colLower)) {
    let unitSymbol = 'units';
    let unitName = 'Count';
    if (/click/i.test(colLower)) { unitSymbol = 'clicks'; unitName = 'Clicks'; }
    else if (/impression/i.test(colLower)) { unitSymbol = 'imp'; unitName = 'Impressions'; }
    else if (/order/i.test(colLower)) { unitSymbol = 'orders'; unitName = 'Orders'; }

    evidence.push(`Discrete integer count/quantity detected ('${unitName}')`);
    return {
      measurementType: 'count',
      unitMetadata: {
        measurementType: 'count',
        unitName,
        unitSymbol
      },
      confidence: 0.92,
      evidence
    };
  }

  // 11. General Continuous Numeric Quantity
  if (physicalType === 'number') {
    evidence.push('Continuous numeric metric with unassigned physical unit');
    return {
      measurementType: 'quantity',
      unitMetadata: {
        measurementType: 'quantity'
      },
      confidence: 0.75,
      evidence
    };
  }

  return {
    measurementType: 'unknown',
    unitMetadata: { measurementType: 'unknown' },
    confidence: 0.60,
    evidence: ['Unclassified attribute measurement']
  };
}
