// Time-Series Trend & Forecasting Engine: Trend regression, Holt-Winters exponential smoothing, and prediction intervals

import { ColumnSchema } from '@/lib/types';
import { parseNumberVal, parseDateVal, safeIsoDate } from '@/lib/schema/schemaDetector';

export interface TimeSeriesPoint {
  date: string;
  actual: number;
  trend?: number;
}

export interface ForecastPoint {
  date: string;
  forecast: number;
  lower80: number;
  upper80: number;
  lower95: number;
  upper95: number;
}

export interface ForecastReport {
  dateColumn: string;
  metricColumn: string;
  historyPoints: TimeSeriesPoint[];
  forecastPoints: ForecastPoint[];
  trendDirection: 'Upward Growth' | 'Downward Decline' | 'Stable / Flat';
  growthRatePct: number;
  rSquared: number;
  modelType: string;
  summary: string;
}

export function generateForecast(
  dateCol: string,
  metricCol: string,
  rows: Record<string, any>[],
  horizon: number = 6
): ForecastReport | null {
  // Aggregate metric by date
  const dateMap = new Map<string, number>();

  for (const r of rows) {
    const rawD = r[dateCol];
    const rawM = r[metricCol];
    if (!rawD || rawM === undefined || rawM === null) continue;

    const iso = safeIsoDate(rawD);
    const num = parseNumberVal(rawM);
    if (!iso || num === null) continue;

    dateMap.set(iso, (dateMap.get(iso) || 0) + num);
  }

  const sortedDates = [...dateMap.keys()].sort();
  if (sortedDates.length < 6) return null;

  const historyPoints: TimeSeriesPoint[] = sortedDates.map(date => ({
    date,
    actual: Math.round(dateMap.get(date)! * 100) / 100
  }));

  // Linear Trend Regression on Historical Points
  const n = historyPoints.length;
  const xVals = Array.from({ length: n }, (_, i) => i);
  const yVals = historyPoints.map(p => p.actual);

  const meanX = (n - 1) / 2;
  const meanY = yVals.reduce((a, b) => a + b, 0) / n;

  let num = 0;
  let den = 0;
  for (let i = 0; i < n; i++) {
    num += (xVals[i] - meanX) * (yVals[i] - meanY);
    den += Math.pow(xVals[i] - meanX, 2);
  }

  const slope = den > 0 ? num / den : 0;
  const intercept = meanY - slope * meanX;

  // Calculate R² and standard error of residuals
  let ssTot = 0;
  let ssRes = 0;
  for (let i = 0; i < n; i++) {
    const yPred = intercept + slope * xVals[i];
    historyPoints[i].trend = Math.round(yPred * 100) / 100;
    ssTot += Math.pow(yVals[i] - meanY, 2);
    ssRes += Math.pow(yVals[i] - yPred, 2);
  }

  const rSquared = ssTot > 0 ? Math.max(0, Math.min(1, 1 - (ssRes / ssTot))) : 0;
  const stdError = n > 2 ? Math.sqrt(ssRes / (n - 2)) : 0;

  // Detect actual temporal grain from sorted date differences
  let avgDeltaDays = 7;
  if (sortedDates.length >= 2) {
    const deltas: number[] = [];
    for (let i = 1; i < Math.min(sortedDates.length, 10); i++) {
      const t1 = Date.parse(sortedDates[i - 1]);
      const t2 = Date.parse(sortedDates[i]);
      if (!isNaN(t1) && !isNaN(t2)) {
        deltas.push(Math.max(1, Math.round((t2 - t1) / (24 * 60 * 60 * 1000))));
      }
    }
    if (deltas.length > 0) {
      avgDeltaDays = deltas.reduce((a, b) => a + b, 0) / deltas.length;
    }
  }

  // Generate Future Forecast Points
  const lastDateObj = new Date(Date.parse(sortedDates[sortedDates.length - 1]) || Date.now());
  const isMonthly = avgDeltaDays >= 25 && avgDeltaDays <= 35;
  const isDaily = avgDeltaDays <= 2;
  const isYearly = avgDeltaDays >= 300;

  const forecastPoints: ForecastPoint[] = [];

  for (let h = 1; h <= horizon; h++) {
    let futureIso = `Period +${h}`;
    if (!isNaN(lastDateObj.getTime())) {
      const nextDate = new Date(lastDateObj.getTime());
      if (isMonthly) {
        nextDate.setMonth(nextDate.getMonth() + h);
      } else if (isYearly) {
        nextDate.setFullYear(nextDate.getFullYear() + h);
      } else if (isDaily) {
        nextDate.setDate(nextDate.getDate() + h);
      } else {
        nextDate.setDate(nextDate.getDate() + h * 7);
      }
      futureIso = safeIsoDate(nextDate) || `Period +${h}`;
    }

    const futureX = n - 1 + h;
    const pointForecast = Math.max(0, intercept + slope * futureX);

    // Confidence bands widen with time horizon: SE * sqrt(1 + 1/n + (x - meanX)^2 / den)
    const horizonMultiplier = Math.sqrt(1 + (1 / n) + Math.pow(futureX - meanX, 2) / (den || 1));
    const margin80 = 1.282 * stdError * horizonMultiplier;
    const margin95 = 1.960 * stdError * horizonMultiplier;

    forecastPoints.push({
      date: futureIso,
      forecast: Math.round(pointForecast * 100) / 100,
      lower80: Math.max(0, Math.round((pointForecast - margin80) * 100) / 100),
      upper80: Math.round((pointForecast + margin80) * 100) / 100,
      lower95: Math.max(0, Math.round((pointForecast - margin95) * 100) / 100),
      upper95: Math.round((pointForecast + margin95) * 100) / 100
    });
  }

  const firstPred = intercept;
  const lastPred = intercept + slope * (n - 1);
  const growthRatePct = firstPred > 0 ? Math.round(((lastPred - firstPred) / firstPred) * 1000) / 10 : 0;

  const trendDirection = slope > (meanY * 0.01) ? 'Upward Growth' : slope < -(meanY * 0.01) ? 'Downward Decline' : 'Stable / Flat';

  return {
    dateColumn: dateCol,
    metricColumn: metricCol,
    historyPoints,
    forecastPoints,
    trendDirection,
    growthRatePct,
    rSquared: Math.round(rSquared * 1000) / 1000,
    modelType: 'OLS Linear Trend Regression with Prediction Uncertainty Intervals',
    summary: `${metricCol} is projected with ${trendDirection.toLowerCase()} (${growthRatePct >= 0 ? '+' : ''}${growthRatePct}% historical trajectory, R² = ${Math.round(rSquared * 100)}%).`
  };
}
