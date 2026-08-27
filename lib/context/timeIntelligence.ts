// Time Intelligence Engine: Authoritative longitudinal profiling, native grain detection, and zero-fabrication temporal modeling

import { TimeDimensionInfo } from '@/lib/types';
import { safeIsoDate } from '@/lib/schema/schemaDetector';

export interface DetailedTimeAnalysis {
  column: string;
  isTemporal: boolean;
  grain: 'intraday' | 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'yearly' | 'irregular' | 'unknown';
  startDate: string;
  endDate: string;
  totalPeriods: number;
  distinctDates: number;
  isMonotonic: boolean;
  hasDuplicates: boolean;
  isRegular: boolean;
  gapsDetected: string[];
  allowedRollups: ('daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly')[];
  confidence: number;
  reasons: string[];
}

/**
 * Perform deep empirical analysis of time-series grain and continuity
 */
export function analyzeTemporalColumn(
  dateColumn: string,
  rows: Record<string, any>[]
): DetailedTimeAnalysis {
  const reasons: string[] = [];
  const parsedDates: { timestamp: number; iso: string; raw: any }[] = [];
  let invalidCount = 0;

  for (const r of rows) {
    const raw = r[dateColumn];
    const iso = safeIsoDate(raw);
    if (iso) {
      const t = new Date(iso).getTime();
      if (!isNaN(t)) {
        parsedDates.push({ timestamp: t, iso, raw });
      } else {
        invalidCount++;
      }
    } else if (raw !== undefined && raw !== null && String(raw).trim() !== '') {
      invalidCount++;
    }
  }

  if (parsedDates.length < 2) {
    return {
      column: dateColumn,
      isTemporal: false,
      grain: 'unknown',
      startDate: '',
      endDate: '',
      totalPeriods: parsedDates.length,
      distinctDates: parsedDates.length,
      isMonotonic: false,
      hasDuplicates: false,
      isRegular: false,
      gapsDetected: [],
      allowedRollups: [],
      confidence: 0,
      reasons: ['Insufficient valid chronological date values (less than 2 valid observations)']
    };
  }

  // Sort timestamps chronologically
  const sortedDates = [...parsedDates].sort((a, b) => a.timestamp - b.timestamp);
  const uniqueTimestamps = Array.from(new Set(sortedDates.map(d => d.timestamp))).sort((a, b) => a - b);

  const startDate = new Date(uniqueTimestamps[0]).toISOString().split('T')[0];
  const endDate = new Date(uniqueTimestamps[uniqueTimestamps.length - 1]).toISOString().split('T')[0];

  const hasDuplicates = parsedDates.length > uniqueTimestamps.length;
  const isMonotonic = parsedDates.every((d, i) => i === 0 || d.timestamp >= parsedDates[i - 1].timestamp);

  // Compute intervals between consecutive unique timestamps in days
  const intervalsDays: number[] = [];
  for (let i = 1; i < uniqueTimestamps.length; i++) {
    const diffDays = (uniqueTimestamps[i] - uniqueTimestamps[i - 1]) / (1000 * 60 * 60 * 24);
    intervalsDays.push(diffDays);
  }

  intervalsDays.sort((a, b) => a - b);
  const medianInterval = intervalsDays[Math.floor(intervalsDays.length / 2)] || 1;

  let grain: DetailedTimeAnalysis['grain'] = 'unknown';
  let allowedRollups: DetailedTimeAnalysis['allowedRollups'] = [];
  let isRegular = true;

  if (medianInterval < 0.8) {
    grain = 'intraday';
    allowedRollups = ['daily', 'weekly', 'monthly', 'quarterly', 'yearly'];
    reasons.push(`Sub-daily observation frequency (median interval ~${(medianInterval * 24).toFixed(1)} hours)`);
  } else if (medianInterval >= 0.8 && medianInterval <= 1.2) {
    grain = 'daily';
    allowedRollups = ['daily', 'weekly', 'monthly', 'quarterly', 'yearly'];
    reasons.push('Daily chronological cadence (~1 day interval)');
  } else if (medianInterval >= 6.0 && medianInterval <= 8.0) {
    grain = 'weekly';
    allowedRollups = ['weekly', 'monthly', 'quarterly', 'yearly'];
    reasons.push('Weekly observation cadence (~7 day interval)');
  } else if (medianInterval >= 13.0 && medianInterval <= 16.0) {
    grain = 'biweekly';
    allowedRollups = ['monthly', 'quarterly', 'yearly'];
    reasons.push('Bi-weekly observation cadence (~14 day interval)');
  } else if (medianInterval >= 26.0 && medianInterval <= 33.0) {
    grain = 'monthly';
    allowedRollups = ['monthly', 'quarterly', 'yearly'];
    reasons.push('Monthly observation cadence (~30 day interval)');
  } else if (medianInterval >= 80.0 && medianInterval <= 100.0) {
    grain = 'quarterly';
    allowedRollups = ['quarterly', 'yearly'];
    reasons.push('Quarterly observation cadence (~90 day interval)');
  } else if (medianInterval >= 350.0 && medianInterval <= 380.0) {
    grain = 'yearly';
    allowedRollups = ['yearly'];
    reasons.push('Annual/yearly observation cadence (~365 day interval)');
  } else {
    grain = 'irregular';
    isRegular = false;
    allowedRollups = [];
    reasons.push(`Irregular non-uniform time cadence (median interval = ${medianInterval.toFixed(1)} days)`);
  }

  // Detect Gaps (more than 2x expected median interval)
  const gapsDetected: string[] = [];
  if (grain !== 'irregular') {
    for (let i = 1; i < uniqueTimestamps.length; i++) {
      const diffDays = (uniqueTimestamps[i] - uniqueTimestamps[i - 1]) / (1000 * 60 * 60 * 24);
      if (diffDays > medianInterval * 2.2) {
        const d1 = new Date(uniqueTimestamps[i - 1]).toISOString().split('T')[0];
        const d2 = new Date(uniqueTimestamps[i]).toISOString().split('T')[0];
        if (gapsDetected.length < 5) {
          gapsDetected.push(`${d1} to ${d2} (${Math.round(diffDays)} days)`);
        }
      }
    }
  }

  const confidence = Math.max(0.4, Math.min(0.98, 1.0 - (invalidCount / (rows.length || 1)) - (gapsDetected.length * 0.05)));

  return {
    column: dateColumn,
    isTemporal: true,
    grain,
    startDate,
    endDate,
    totalPeriods: uniqueTimestamps.length,
    distinctDates: uniqueTimestamps.length,
    isMonotonic,
    hasDuplicates,
    isRegular,
    gapsDetected,
    allowedRollups,
    confidence: Math.round(confidence * 100) / 100,
    reasons
  };
}
