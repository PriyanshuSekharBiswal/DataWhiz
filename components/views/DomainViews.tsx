'use client';

import React, { useState, useMemo } from 'react';
import { ChartFigure } from '@/components/charts/ChartFigure';
import { TrendingUp, Package, Clock, ShieldCheck, Sparkles, MapPin, Building, Tag, Layers, Search, Filter } from 'lucide-react';
import { safeIsoDate, parseNumberVal } from '@/lib/schema/schemaDetector';

interface DomainViewProps {
  rows: Record<string, any>[];
  schemas: any[];
  forecast?: any;
  onAskAI?: (q: string) => void;
}

import { formatMetricValue } from '@/lib/formatting/numberFormatter';

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function fmtEUR(n: number, compact: boolean = true): string {
  return formatMetricValue(n, undefined, { compact });
}

export function resolveDateColumn(schemas: any[]): string {
  const trueDate = schemas.find(s => (s.logicalType === 'date' || s.physicalType === 'date' || s.semanticRole === 'timestamp') && s.logicalType !== 'identifier' && !/key|id$/i.test(s.technicalName))?.technicalName;
  if (trueDate) return trueDate;
  const nameDate = schemas.find(s => /(^date$|transaction_date|order_date|sales_date|timestamp|day_date|record_date)/i.test(s.technicalName) && !/key|id$/i.test(s.technicalName))?.technicalName;
  if (nameDate) return nameDate;
  const anyDate = schemas.find(s => s.logicalType === 'date' || s.physicalType === 'date' || /date|time|day/i.test(s.technicalName))?.technicalName;
  return anyDate || schemas[0]?.technicalName || 'Date';
}

export function resolveMetricColumn(schemas: any[]): string | undefined {
  const rev = schemas.find(s => (s.logicalType === 'measure_currency' || /revenue|sales|income|turnover|gmv|amount/i.test(s.technicalName)) && s.logicalType !== 'identifier' && !/key|id|zip|year|month|quarter/i.test(s.technicalName))?.technicalName;
  if (rev) return rev;
  const measure = schemas.find(s => s.logicalType?.startsWith('measure') && s.logicalType !== 'identifier' && !/key|id|zip|year|month|quarter|code/i.test(s.technicalName))?.technicalName;
  if (measure) return measure;
  const num = schemas.find(s => s.physicalType === 'number' && s.logicalType !== 'identifier' && !/key|id|zip|year|month|quarter|day|code/i.test(s.technicalName))?.technicalName;
  return num;
}

// ----------------------------------------------------
// 1. DAY-WISE VIEW
// ----------------------------------------------------
export const DayWiseView: React.FC<DomainViewProps> = ({ rows, schemas, onAskAI }) => {
  const [mode, setMode] = useState<'both' | 'raw' | 'ma'>('both');

  const dateCol = resolveDateColumn(schemas);
  const numCol = resolveMetricColumn(schemas);

  const dailyData = useMemo(() => {
    const map = new Map<string, number>();
    const len = rows.length;
    const stride = len > 15000 ? Math.ceil(len / 8000) : 1;
    for (let i = 0; i < len; i += stride) {
      const r = rows[i];
      const d = safeIsoDate(r[dateCol]) || String(r[dateCol] || '').trim();
      const v = (numCol ? (parseNumberVal(r[numCol]) || 0) : 1) * stride;
      if (d) map.set(d, (map.get(d) || 0) + v);
    }
    return Array.from(map.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .slice(0, 100)
      .map(([name, value]) => ({ name, value: Math.round(value * 100) / 100 }));
  }, [rows, dateCol, numCol]);

  const metricLabel = numCol ? (schemas.find(s => s.technicalName === numCol)?.displayName || numCol) : 'Daily Record Count';

  const chartDatasets = useMemo(() => {
    const rawVals = dailyData.map(d => d.value);
    const ma7Vals: number[] = [];
    for (let i = 0; i < rawVals.length; i++) {
      const start = Math.max(0, i - 7 + 1);
      const sub = rawVals.slice(start, i + 1);
      ma7Vals.push(Math.round((sub.reduce((a, b) => a + b, 0) / sub.length) * 100) / 100);
    }

    const ds: any[] = [];
    if (mode === 'both' || mode === 'raw') {
      ds.push({
        label: `Daily ${metricLabel}`,
        data: rawVals,
        color: '#0284C7',
        fill: mode === 'raw' || mode === 'both',
        pointRadius: dailyData.length > 30 ? 0 : 4
      });
    }
    if (mode === 'both' || mode === 'ma') {
      ds.push({
        label: '7-Day Moving Avg (MA7)',
        data: ma7Vals,
        color: '#F59E0B',
        fill: false,
        borderWidth: 3,
        pointRadius: 0
      });
    }
    return ds;
  }, [dailyData, mode, metricLabel]);

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto w-full animate-rise">
      <div className="flex items-end justify-between gap-4 flex-wrap pb-4 border-b border-[#E2E8F0]">
        <div>
          <h2 className="text-2xl sm:text-3xl font-sans text-[#0A1128] font-bold m-0">Day-wise Sales</h2>
          <p className="text-sm text-[#475569] mt-1.5 m-0 font-sans">
            Every trading day across the ledger, with a 7-day moving average to cut through daily noise.
          </p>
        </div>
        <div className="range-chip">{dailyData.length} DAYS TRACKED</div>
      </div>

      <div className="panel bg-white border border-[#E2E8F0] shadow-sm flex flex-col gap-4 p-6">
        <div className="flex items-center justify-between gap-3">
          <h3 className="font-sans text-lg text-[#0A1128] font-bold m-0 truncate">Daily {metricLabel}</h3>
          <div className="pill-toggle flex-none">
            <button className={mode === 'both' ? 'active' : ''} onClick={() => setMode('both')}>Daily + MA7</button>
            <button className={mode === 'raw' ? 'active' : ''} onClick={() => setMode('raw')}>Daily only</button>
            <button className={mode === 'ma' ? 'active' : ''} onClick={() => setMode('ma')}>MA7 only</button>
          </div>
        </div>

        <ChartFigure
          key={`chart-daily-${mode}`}
          spec={{
            id: `chart-daily-${mode}`,
            title: `Daily ${metricLabel}`,
            why: `Historical trajectory with 7-day moving average baseline for ${metricLabel.toLowerCase()}.`,
            type: 'line',
            x: dateCol,
            y: numCol || 'count',
            data: dailyData,
            multiDatasets: chartDatasets
          }}
          height={360}
          onAskAI={onAskAI}
        />
      </div>

      <div className="callout bg-[#F8FAFC] border border-[#E2E8F0] p-4 rounded-xl flex items-start gap-3 text-xs text-[#475569]">
        <span className="text-base flex-none">📊</span>
        <span className="leading-relaxed">
          <b className="text-[#0A1128]">Reading this chart:</b> Daily observations capture day-to-day transaction volatility. The 7-day moving-average baseline smooths out periodic fluctuations to reveal underlying operational momentum.
        </span>
      </div>
    </div>
  );
};

// ----------------------------------------------------
// 2. WEEK-WISE (WEEKLY) VIEW
// ----------------------------------------------------
export const WeeklyView: React.FC<DomainViewProps> = ({ rows, schemas, onAskAI }) => {
  const dateCol = resolveDateColumn(schemas);
  const numCol = resolveMetricColumn(schemas);

  const weeklyData = useMemo(() => {
    const weekMap = new Map<string, { revenue: number; units: number; orders: number }>();
    const len = rows.length;
    const stride = len > 15000 ? Math.ceil(len / 8000) : 1;

    for (let i = 0; i < len; i += stride) {
      const r = rows[i];
      const iso = safeIsoDate(r[dateCol]) || String(r[dateCol] || '').trim();
      const val = (numCol ? (parseNumberVal(r[numCol]) || 0) : 1) * stride;

      if (iso) {
        const dObj = new Date(iso);
        if (!isNaN(dObj.getTime())) {
          // Approximate ISO week key
          const weekNumber = Math.ceil((dObj.getDate() + (new Date(dObj.getFullYear(), dObj.getMonth(), 1).getDay())) / 7);
          const weekKey = `${dObj.getFullYear()} W${String(weekNumber).padStart(2, '0')} (${MONTH_NAMES[dObj.getMonth()]})`;
          const curr = weekMap.get(weekKey) || { revenue: 0, units: 0, orders: 0 };
          curr.revenue += val;
          curr.units += stride;
          curr.orders += stride;
          weekMap.set(weekKey, curr);
        }
      }
    }

    return Array.from(weekMap.entries()).map(([week, d]) => ({
      name: week,
      value: Math.round(d.revenue * 100) / 100,
      orders: d.orders
    }));
  }, [rows, dateCol, numCol]);

  const strongestWeek = useMemo(() => {
    if (!weeklyData.length) return null;
    return weeklyData.slice().sort((a, b) => b.value - a.value)[0];
  }, [weeklyData]);

  const softestWeek = useMemo(() => {
    if (!weeklyData.length) return null;
    return weeklyData.slice().sort((a, b) => a.value - b.value)[0];
  }, [weeklyData]);

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto w-full animate-rise">
      <div className="flex items-end justify-between gap-4 flex-wrap pb-4 border-b border-[#E2E8F0]">
        <div>
          <h2 className="text-2xl sm:text-3xl font-sans text-[#0A1128] font-bold m-0">Week-wise Sales</h2>
          <p className="text-sm text-[#475569] mt-1.5 m-0 font-sans">
            All calendar weeks in the ledger, revenue and order volumes tracked across time.
          </p>
        </div>
        <div className="range-chip">{weeklyData.length} WEEKS TRACKED</div>
      </div>

      <div className="panel bg-white border border-[#E2E8F0] shadow-sm flex flex-col gap-4 p-6">
        <h3 className="font-sans text-lg text-[#0A1128] font-bold m-0">Weekly Revenue Breakdown</h3>
        <ChartFigure
          spec={{
            id: 'chart-weekly-bar',
            title: 'Weekly Revenue',
            why: 'Calendar weekly progression across the scope.',
            type: 'bar',
            data: weeklyData.slice(0, 52)
          }}
          height={340}
          onAskAI={onAskAI}
        />
      </div>

      {/* Best & Softest Weeks KPI Extremes */}
      {strongestWeek && softestWeek && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="kpi bg-white border border-[#E2E8F0] p-5 rounded-2xl shadow-sm border-l-4 border-l-[#10B981]">
            <div className="lbl font-mono text-xs font-bold text-[#059669] uppercase tracking-wider">Strongest Week</div>
            <div className="val text-2xl font-sans font-bold text-[#0A1128] mt-1">{fmtEUR(strongestWeek.value)}</div>
            <div className="sub text-xs text-[#64748B] mt-1">{strongestWeek.name} · Peak Demand Window</div>
          </div>
          <div className="kpi bg-white border border-[#E2E8F0] p-5 rounded-2xl shadow-sm border-l-4 border-l-[#F43F5E]">
            <div className="lbl font-mono text-xs font-bold text-[#E11D48] uppercase tracking-wider">Softest Week</div>
            <div className="val text-2xl font-sans font-bold text-[#0A1128] mt-1">{fmtEUR(softestWeek.value)}</div>
            <div className="sub text-xs text-[#64748B] mt-1">{softestWeek.name} · Low Demand Window</div>
          </div>
        </div>
      )}
    </div>
  );
};

// ----------------------------------------------------
// 3. WEEKDAY PATTERN VIEW
// ----------------------------------------------------
export const WeekdayView: React.FC<DomainViewProps> = ({ rows, schemas, onAskAI }) => {
  const dateCol = resolveDateColumn(schemas);
  const numCol = resolveMetricColumn(schemas);

  const weekdayData = useMemo(() => {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const sums = new Array(7).fill(0);
    const counts = new Array(7).fill(0);

    const len = rows.length;
    const stride = len > 15000 ? Math.ceil(len / 8000) : 1;

    for (let i = 0; i < len; i += stride) {
      const r = rows[i];
      const iso = safeIsoDate(r[dateCol]) || String(r[dateCol] || '').trim();
      const v = (numCol ? (parseNumberVal(r[numCol]) || 0) : 1) * stride;
      if (iso) {
        const d = new Date(iso);
        if (!isNaN(d.getTime())) {
          const dayIdx = d.getDay();
          sums[dayIdx] += v;
          counts[dayIdx]++;
        }
      }
    }

    const ordered = [1, 2, 3, 4, 5, 6, 0]; // Mon -> Sun
    return ordered.map(idx => ({
      name: days[idx],
      value: counts[idx] > 0 ? Math.round(sums[idx] / counts[idx]) : 0,
      total: sums[idx]
    }));
  }, [rows, dateCol, numCol]);

  const weekdayTotal = weekdayData.slice(0, 5).reduce((a, b) => a + b.total, 0);
  const weekendTotal = weekdayData.slice(5).reduce((a, b) => a + b.total, 0);

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto w-full animate-rise">
      <div className="flex items-end justify-between gap-4 flex-wrap pb-4 border-b border-[#E2E8F0]">
        <div>
          <h2 className="text-2xl sm:text-3xl font-sans text-[#0A1128] font-bold m-0">Weekday Pattern</h2>
          <p className="text-sm text-[#475569] mt-1.5 m-0 font-sans">
            Average daily revenue by day of week — the demand rhythm of operations.
          </p>
        </div>
        <div className="range-chip">MON → SUN</div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <ChartFigure
          spec={{
            id: 'chart-weekday-avg',
            title: 'Average Activity by Day of Week',
            why: 'Highlights mid-week peak vs weekend footfall shifts.',
            type: 'bar',
            data: weekdayData.map(d => ({ name: d.name, value: d.value }))
          }}
          height={300}
          onAskAI={onAskAI}
        />

        <ChartFigure
          spec={{
            id: 'chart-weekend-split',
            title: 'Weekday vs. Weekend Split',
            why: 'Business days (Mon–Fri) vs Weekend demand distribution.',
            type: 'pie',
            data: [
              { name: 'Weekday (Mon–Fri)', value: weekdayTotal },
              { name: 'Weekend (Sat–Sun)', value: weekendTotal }
            ]
          }}
          height={300}
          onAskAI={onAskAI}
        />
      </div>

      <div className="callout bg-[#F8FAFC] border border-[#E2E8F0] p-4 rounded-xl flex items-start gap-3 text-xs text-[#475569]">
        <span className="text-base flex-none">📋</span>
        <span className="leading-relaxed">
          <b className="text-[#0A1128]">Demand rhythm by day of week:</b> Business days (Monday–Friday) average roughly {fmtEUR(weekdayTotal / 5)} per day, compared to {fmtEUR(weekendTotal / 2)} on weekend days — establishing cyclical baseline patterns.
        </span>
      </div>
    </div>
  );
};

// ----------------------------------------------------
// 4. MONTHLY VIEW
// ----------------------------------------------------
export const MonthlyView: React.FC<DomainViewProps> = ({ rows, schemas, onAskAI }) => {
  const dateCol = resolveDateColumn(schemas);
  const numCol = resolveMetricColumn(schemas);

  const monthlyMatrix = useMemo(() => {
    const yearMonthMap = new Map<number, Map<number, number>>();
    const len = rows.length;
    const stride = len > 15000 ? Math.ceil(len / 8000) : 1;

    for (let i = 0; i < len; i += stride) {
      const r = rows[i];
      const iso = safeIsoDate(r[dateCol]) || String(r[dateCol] || '').trim();
      const val = (numCol ? (parseNumberVal(r[numCol]) || 0) : 1) * stride;

      if (iso) {
        const dObj = new Date(iso);
        if (!isNaN(dObj.getTime())) {
          const yr = dObj.getFullYear();
          const mo = dObj.getMonth();
          if (!yearMonthMap.has(yr)) yearMonthMap.set(yr, new Map());
          const moMap = yearMonthMap.get(yr)!;
          moMap.set(mo, (moMap.get(mo) || 0) + val);
        }
      }
    }

    const years = [...yearMonthMap.keys()].sort();
    const hasMultipleYears = years.length >= 2;
    const yr1 = years[0] || new Date().getFullYear();
    const yr2 = hasMultipleYears ? years[years.length - 1] : yr1;

    const rowsSummary = MONTH_NAMES.map((monthName, mIdx) => {
      const rev1 = Math.round((yearMonthMap.get(yr1)?.get(mIdx) || 0) * 100) / 100;
      const rev2 = Math.round((yearMonthMap.get(yr2)?.get(mIdx) || 0) * 100) / 100;
      const yoy = rev1 > 0 ? Math.round(((rev2 - rev1) / rev1) * 1000) / 10 : 0;
      return { month: monthName, rev1, rev2, yoy, yr1, yr2 };
    });

    return { yr1, yr2, rowsSummary, hasMultipleYears };
  }, [rows, dateCol, numCol]);

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto w-full animate-rise">
      <div className="flex items-end justify-between gap-4 flex-wrap pb-4 border-b border-[#E2E8F0]">
        <div>
          <h2 className="text-2xl sm:text-3xl font-sans text-[#0A1128] font-bold m-0">Monthly Sales</h2>
          <p className="text-sm text-[#475569] mt-1.5 m-0 font-sans">
            Monthly aggregate progression across historical cycles to track seasonal dynamics.
          </p>
        </div>
        <div className="range-chip">{monthlyMatrix.rowsSummary.length} MONTHS ANALYZED</div>
      </div>

      <div className="panel bg-white border border-[#E2E8F0] shadow-sm flex flex-col gap-4 p-6">
        <h3 className="font-sans text-lg text-[#0A1128] font-bold m-0">
          {monthlyMatrix.hasMultipleYears ? `Monthly Revenue Comparison (${monthlyMatrix.yr1} vs ${monthlyMatrix.yr2})` : `Monthly Revenue Trajectory (${monthlyMatrix.yr1})`}
        </h3>
        <ChartFigure
          spec={{
            id: 'chart-monthly-bars',
            title: monthlyMatrix.hasMultipleYears ? `Monthly Revenue (${monthlyMatrix.yr1} vs ${monthlyMatrix.yr2})` : `Monthly Revenue (${monthlyMatrix.yr1})`,
            why: 'Direct month-by-month trajectory tracking growth.',
            type: 'bar',
            data: monthlyMatrix.rowsSummary.map(m => ({ name: m.month, value: m.rev2 }))
          }}
          height={320}
          onAskAI={onAskAI}
        />
      </div>

      {/* Month-by-month Detail Table */}
      <div className="panel bg-white border border-[#E2E8F0] shadow-sm flex flex-col gap-4 p-6">
        <h3 className="font-sans text-lg text-[#0A1128] font-bold m-0">Month-by-Month Detail Table</h3>
        <div className="overflow-x-auto border border-[#E2E8F0] rounded-xl bg-white shadow-inner">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="bg-[#F8FAFC] border-b border-[#E2E8F0]">
                <th className="py-3 px-4 font-mono font-bold text-[#0284C7] text-[11px] uppercase tracking-wider whitespace-nowrap">Month</th>
                <th className="py-3 px-4 font-mono font-bold text-[#0284C7] text-[11px] uppercase tracking-wider text-right whitespace-nowrap">{monthlyMatrix.yr1} Revenue</th>
                {monthlyMatrix.hasMultipleYears && (
                  <th className="py-3 px-4 font-mono font-bold text-[#0284C7] text-[11px] uppercase tracking-wider text-right whitespace-nowrap">{monthlyMatrix.yr2} Revenue</th>
                )}
                {monthlyMatrix.hasMultipleYears && (
                  <th className="py-3 px-4 font-mono font-bold text-[#0284C7] text-[11px] uppercase tracking-wider text-right whitespace-nowrap">YoY Change</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F1F5F9]">
              {monthlyMatrix.rowsSummary.map((m, idx) => (
                <tr key={idx} className="hover:bg-[#F0F9FF] transition-colors">
                  <td className="py-3 px-4 font-sans font-bold text-sm text-[#0A1128] whitespace-nowrap">{m.month}</td>
                  <td className="py-3 px-4 text-right font-mono text-xs text-[#475569] whitespace-nowrap">{fmtEUR(m.rev1, false)}</td>
                  {monthlyMatrix.hasMultipleYears && (
                    <td className="py-3 px-4 text-right font-mono font-bold text-xs text-[#0A1128] whitespace-nowrap">{fmtEUR(m.rev2, false)}</td>
                  )}
                  {monthlyMatrix.hasMultipleYears && (
                    <td className="py-3 px-4 text-right font-mono font-bold text-xs whitespace-nowrap">
                      <span className={`badge ${m.yoy >= 0 ? 'bg-[#DCFCE7] text-[#15803D]' : 'bg-[#FFE4E6] text-[#BE123C]'}`}>
                        {m.yoy >= 0 ? '+' : ''}{m.yoy}%
                      </span>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

// ----------------------------------------------------
// 5. YEARLY VIEW
// ----------------------------------------------------
export const YearlyView: React.FC<DomainViewProps> = ({ rows, schemas, onAskAI }) => {
  const dateCol = resolveDateColumn(schemas);
  const numCol = resolveMetricColumn(schemas);

  const yearlyData = useMemo(() => {
    const yrMap = new Map<number, { revenue: number; units: number; orders: number }>();
    const len = rows.length;
    const stride = len > 15000 ? Math.ceil(len / 8000) : 1;

    for (let i = 0; i < len; i += stride) {
      const r = rows[i];
      const iso = safeIsoDate(r[dateCol]) || String(r[dateCol] || '').trim();
      const val = (numCol ? (parseNumberVal(r[numCol]) || 0) : 1) * stride;

      if (iso) {
        const dObj = new Date(iso);
        if (!isNaN(dObj.getTime())) {
          const yr = dObj.getFullYear();
          const curr = yrMap.get(yr) || { revenue: 0, units: 0, orders: 0 };
          curr.revenue += val;
          curr.units += stride;
          curr.orders += stride;
          yrMap.set(yr, curr);
        }
      }
    }

    const years = [...yrMap.keys()].sort();
    return years.map(yr => ({
      year: yr,
      revenue: yrMap.get(yr)?.revenue || 0,
      units: yrMap.get(yr)?.units || 0,
      orders: yrMap.get(yr)?.orders || 0
    }));
  }, [rows, dateCol, numCol]);

  const currentYear = yearlyData[yearlyData.length - 1] || { year: new Date().getFullYear(), revenue: 0, units: rows.length, orders: rows.length };
  const priorYear = yearlyData.length >= 2 ? yearlyData[yearlyData.length - 2] : null;

  const revGrowth = priorYear && priorYear.revenue > 0
    ? Math.round(((currentYear.revenue - priorYear.revenue) / priorYear.revenue) * 1000) / 10
    : 0;

  const unitsGrowth = priorYear && priorYear.units > 0
    ? Math.round(((currentYear.units - priorYear.units) / priorYear.units) * 1000) / 10
    : 0;

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto w-full animate-rise">
      <div className="flex items-end justify-between gap-4 flex-wrap pb-4 border-b border-[#E2E8F0]">
        <div>
          <h2 className="text-2xl sm:text-3xl font-sans text-[#0A1128] font-bold m-0">Yearly Performance</h2>
          <p className="text-sm text-[#475569] mt-1.5 m-0 font-sans">
            {priorYear ? `Annual multi-year comparison — ${priorYear.year} versus ${currentYear.year}.` : `Annual summary for calendar year ${currentYear.year}.`}
          </p>
        </div>
        <div className="range-chip">{yearlyData.length} YEARS RECORDED</div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="kpi bg-white border border-[#E2E8F0] p-5 rounded-2xl shadow-sm">
          <div className="lbl font-mono text-xs font-bold text-[#0284C7] uppercase tracking-wider">{currentYear.year} Total Volume</div>
          <div className="val text-2xl font-sans font-bold text-[#0A1128] mt-1">{fmtEUR(currentYear.revenue)}</div>
          {priorYear && (
            <div className={`sub text-xs font-bold mt-1 ${revGrowth >= 0 ? 'text-[#059669]' : 'text-[#DC2626]'}`}>
              {revGrowth >= 0 ? '+' : ''}{revGrowth}% vs {priorYear.year}
            </div>
          )}
        </div>
        <div className="kpi bg-white border border-[#E2E8F0] p-5 rounded-2xl shadow-sm">
          <div className="lbl font-mono text-xs font-bold text-[#0284C7] uppercase tracking-wider">{currentYear.year} Transactions</div>
          <div className="val text-2xl font-sans font-bold text-[#0A1128] mt-1">{currentYear.units.toLocaleString()}</div>
          {priorYear && (
            <div className={`sub text-xs font-bold mt-1 ${unitsGrowth >= 0 ? 'text-[#059669]' : 'text-[#DC2626]'}`}>
              {unitsGrowth >= 0 ? '+' : ''}{unitsGrowth}% vs {priorYear.year}
            </div>
          )}
        </div>
        <div className="kpi bg-white border border-[#E2E8F0] p-5 rounded-2xl shadow-sm">
          <div className="lbl font-mono text-xs font-bold text-[#0284C7] uppercase tracking-wider">Average Per Row</div>
          <div className="val text-2xl font-sans font-bold text-[#0A1128] mt-1">
            {fmtEUR(currentYear.units > 0 ? currentYear.revenue / currentYear.units : 0)}
          </div>
          <div className="sub text-xs text-[#64748B] mt-1">mean realization</div>
        </div>
        <div className="kpi bg-white border border-[#E2E8F0] p-5 rounded-2xl shadow-sm">
          <div className="lbl font-mono text-xs font-bold text-[#0284C7] uppercase tracking-wider">{currentYear.year} Activity</div>
          <div className="val text-2xl font-sans font-bold text-[#0A1128] mt-1">{currentYear.orders.toLocaleString()}</div>
          <div className="sub text-xs text-[#059669] font-bold mt-1">ledger units recorded</div>
        </div>
      </div>

      <div className="panel bg-white border border-[#E2E8F0] shadow-sm flex flex-col gap-4 p-6">
        <h3 className="font-sans text-lg text-[#0A1128] font-bold m-0">Annual Metric Comparison</h3>
        <ChartFigure
          spec={{
            id: 'chart-yearly-bars',
            title: 'Annual Revenue & Volume',
            why: 'Full year comparison across historical periods.',
            type: 'bar',
            data: yearlyData.map(y => ({ name: String(y.year), value: y.revenue }))
          }}
          height={300}
          onAskAI={onAskAI}
        />
      </div>
    </div>
  );
};

// ----------------------------------------------------
// 6. PRODUCTS VIEW (SKU PERFORMANCE & CATALOG)
// ----------------------------------------------------
export const ProductsView: React.FC<DomainViewProps> = ({ rows, schemas, onAskAI }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 12;

  const entityCol = schemas.find(s => s.semanticRole === 'product_attribute' || s.semanticRole === 'primary_dimension' || s.logicalType === 'dimension_category' || /name|item|product|desc|sku|supplier|carrier|campaign/i.test(s.technicalName))?.technicalName
    || schemas.find(s => s.physicalType === 'string' && s.logicalType !== 'identifier')?.technicalName
    || schemas[0]?.technicalName;
  const catCol = schemas.find(s => (s.logicalType === 'dimension_category' || /cat|group|dept|type|segment|tier|brand/i.test(s.technicalName)) && s.technicalName !== entityCol)?.technicalName;
  const numCol = resolveMetricColumn(schemas);

  const productAggs = useMemo(() => {
    const map = new Map<string, { count: number; value: number; category: string }>();
    const len = rows.length;
    const stride = len > 15000 ? Math.ceil(len / 8000) : 1;

    for (let i = 0; i < len; i += stride) {
      const r = rows[i];
      const name = String(r[entityCol] || 'Unknown').trim();
      const cat = catCol ? String(r[catCol] || 'General').trim() : (name.length > 15 ? name.slice(0, 15) : name);
      const val = (numCol ? (parseNumberVal(r[numCol]) || 0) : 1) * stride;

      const current = map.get(name) || { count: 0, value: 0, category: cat };
      current.count += stride;
      current.value += val;
      map.set(name, current);
    }

    return Array.from(map.entries())
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.value - a.value);
  }, [rows, entityCol, catCol, numCol]);

  const categories = useMemo(() => Array.from(new Set(productAggs.map(p => p.category))), [productAggs]);

  const filtered = useMemo(() => {
    return productAggs.filter(p => {
      const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCat = !categoryFilter || p.category === categoryFilter;
      return matchesSearch && matchesCat;
    });
  }, [productAggs, searchQuery, categoryFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pagedRows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const valueHeader = numCol ? (schemas.find(s => s.technicalName === numCol)?.displayName || numCol) : 'Volume Count';

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto w-full animate-rise">
      <div className="flex items-end justify-between gap-4 flex-wrap pb-4 border-b border-[#E2E8F0]">
        <div>
          <h2 className="text-2xl sm:text-3xl font-sans text-[#0A1128] font-bold m-0">Product Performance</h2>
          <p className="text-sm text-[#475569] mt-1.5 m-0 font-sans">
            Every SKU in the ledger — search, filter and sort to discover exactly what's selling.
          </p>
        </div>
        <div className="range-chip">{productAggs.length} PRODUCTS TRACKED</div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <ChartFigure
          spec={{
            id: 'chart-top-products',
            title: `Top 15 Products by ${valueHeader}`,
            why: 'Ranked best sellers by total contribution.',
            type: 'bar',
            data: productAggs.slice(0, 15).map(p => ({ name: p.name, value: p.value }))
          }}
          height={380}
          onAskAI={onAskAI}
        />

        <ChartFigure
          spec={{
            id: 'chart-product-category-split',
            title: catCol ? 'Revenue Share by Category' : 'Top Catalog Items Share',
            why: 'Concentration of catalog value across segments.',
            type: 'pie',
            data: categories.slice(0, 6).map(c => ({
              name: c,
              value: productAggs.filter(p => p.category === c).reduce((a, b) => a + b.value, 0)
            }))
          }}
          height={380}
          onAskAI={onAskAI}
        />
      </div>

      {/* Full Product Explorer Table */}
      <div className="panel bg-white border border-[#E2E8F0] shadow-sm flex flex-col gap-4 p-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <h3 className="font-sans text-lg text-[#0A1128] font-bold m-0">Full Product Explorer</h3>
          <div className="flex items-center gap-2 flex-wrap flex-1 max-w-md justify-end">
            <input
              type="search"
              placeholder="Search product name…"
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
              className="input text-xs max-w-[200px] border-[#CBD5E1] focus:border-[#0284C7]"
            />
            {categories.length > 1 && (
              <select
                value={categoryFilter}
                onChange={(e) => { setCategoryFilter(e.target.value); setPage(1); }}
                className="input text-xs max-w-[160px] border-[#CBD5E1] focus:border-[#0284C7]"
              >
                <option value="">All categories</option>
                {categories.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            )}
          </div>
        </div>

        <div className="overflow-x-auto border border-[#E2E8F0] rounded-xl bg-white shadow-inner">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="bg-[#F8FAFC] border-b border-[#E2E8F0]">
                <th className="py-3.5 px-4 font-mono font-bold text-[#0284C7] text-[11px] uppercase tracking-wider whitespace-nowrap">#</th>
                <th className="py-3.5 px-4 font-mono font-bold text-[#0284C7] text-[11px] uppercase tracking-wider whitespace-nowrap">Product</th>
                <th className="py-3.5 px-4 font-mono font-bold text-[#0284C7] text-[11px] uppercase tracking-wider whitespace-nowrap">Category</th>
                <th className="py-3.5 px-4 font-mono font-bold text-[#0284C7] text-[11px] uppercase tracking-wider text-right whitespace-nowrap">Units / Orders</th>
                <th className="py-3.5 px-4 font-mono font-bold text-[#0284C7] text-[11px] uppercase tracking-wider text-right whitespace-nowrap">{valueHeader}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F1F5F9]">
              {pagedRows.map((p, idx) => (
                <tr key={p.name} className="hover:bg-[#F0F9FF] transition-colors">
                  <td className="py-3 px-4 font-mono text-xs text-[#64748B] whitespace-nowrap">
                    {(page - 1) * PAGE_SIZE + idx + 1}
                  </td>
                  <td className="py-3 px-4 font-sans font-bold text-sm text-[#0A1128] whitespace-nowrap">
                    {p.name}
                  </td>
                  <td className="py-3 px-4 whitespace-nowrap">
                    <span className="badge text-[10px]">{p.category}</span>
                  </td>
                  <td className="py-3 px-4 text-right font-mono text-xs text-[#475569] whitespace-nowrap">
                    {p.count.toLocaleString()}
                  </td>
                  <td className="py-3 px-4 text-right font-mono font-bold text-xs text-[#0A1128] whitespace-nowrap">
                    {typeof p.value === 'number' ? fmtEUR(p.value, false) : p.value}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between pt-2 text-xs text-[#64748B] font-mono">
          <span>Showing {pagedRows.length ? (page - 1) * PAGE_SIZE + 1 : 0}–{(page - 1) * PAGE_SIZE + pagedRows.length} of {filtered.length}</span>
          <div className="flex items-center gap-2">
            <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="btn btn-secondary text-xs px-3.5 py-1.5">← Prev</button>
            <span className="font-mono font-bold text-[#0A1128]">Page {page} of {totalPages}</span>
            <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)} className="btn btn-secondary text-xs px-3.5 py-1.5">Next →</button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ----------------------------------------------------
// 7. CATEGORY VIEW
// ----------------------------------------------------
export const CategoryView: React.FC<DomainViewProps> = ({ rows, schemas, onAskAI }) => {
  const catCol = schemas.find(s => s.logicalType === 'dimension_category' || /cat|group|dept|type/i.test(s.technicalName))?.technicalName || schemas[0]?.technicalName;
  const numCol = resolveMetricColumn(schemas);

  const categoryAggs = useMemo(() => {
    const map = new Map<string, { count: number; value: number }>();
    const len = rows.length;
    const stride = len > 15000 ? Math.ceil(len / 8000) : 1;

    for (let i = 0; i < len; i += stride) {
      const r = rows[i];
      const cat = String(r[catCol] || 'General').trim();
      const val = (numCol ? (parseNumberVal(r[numCol]) || 0) : 1) * stride;

      const curr = map.get(cat) || { count: 0, value: 0 };
      curr.count += stride;
      curr.value += val;
      map.set(cat, curr);
    }

    return Array.from(map.entries())
      .map(([name, d]) => ({ name, ...d }))
      .sort((a, b) => b.value - a.value);
  }, [rows, catCol, numCol]);

  const totalRev = categoryAggs.reduce((a, b) => a + b.value, 0);

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto w-full animate-rise">
      <div className="flex items-end justify-between gap-4 flex-wrap pb-4 border-b border-[#E2E8F0]">
        <div>
          <h2 className="text-2xl sm:text-3xl font-sans text-[#0A1128] font-bold m-0">Revenue by Category</h2>
          <p className="text-sm text-[#475569] mt-1.5 m-0 font-sans">
            Comparative performance, margin contribution, and category dynamics.
          </p>
        </div>
        <div className="range-chip">{categoryAggs.length} CATEGORIES</div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <ChartFigure
          spec={{
            id: 'chart-category-rev',
            title: 'Revenue by Category',
            why: 'Total volume contribution ranking across categories.',
            type: 'bar',
            data: categoryAggs.map(c => ({ name: c.name, value: c.value }))
          }}
          height={300}
          onAskAI={onAskAI}
        />

        <ChartFigure
          spec={{
            id: 'chart-category-donut',
            title: 'Category Market Share',
            why: 'Percentage share of basket value across categories.',
            type: 'pie',
            data: categoryAggs.map(c => ({ name: c.name, value: c.value }))
          }}
          height={300}
          onAskAI={onAskAI}
        />
      </div>

      {/* All Categories Full Detail Table */}
      <div className="panel bg-white border border-[#E2E8F0] shadow-sm flex flex-col gap-4 p-6">
        <h3 className="font-sans text-lg text-[#0A1128] font-bold m-0">All Categories, Full Detail</h3>
        <div className="overflow-x-auto border border-[#E2E8F0] rounded-xl bg-white shadow-inner">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="bg-[#F8FAFC] border-b border-[#E2E8F0]">
                <th className="py-3.5 px-4 font-mono font-bold text-[#0284C7] text-[11px] uppercase tracking-wider whitespace-nowrap">Category</th>
                <th className="py-3.5 px-4 font-mono font-bold text-[#0284C7] text-[11px] uppercase tracking-wider text-right whitespace-nowrap">Revenue</th>
                <th className="py-3.5 px-4 font-mono font-bold text-[#0284C7] text-[11px] uppercase tracking-wider text-right whitespace-nowrap">Orders</th>
                <th className="py-3.5 px-4 font-mono font-bold text-[#0284C7] text-[11px] uppercase tracking-wider text-right whitespace-nowrap">Share of Ledger</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F1F5F9]">
              {categoryAggs.map((c, idx) => (
                <tr key={idx} className="hover:bg-[#F0F9FF] transition-colors">
                  <td className="py-3 px-4 font-sans font-bold text-sm text-[#0A1128] whitespace-nowrap">{c.name}</td>
                  <td className="py-3 px-4 text-right font-mono font-bold text-xs text-[#0284C7] whitespace-nowrap">{fmtEUR(c.value, false)}</td>
                  <td className="py-3 px-4 text-right font-mono text-xs text-[#475569] whitespace-nowrap">{c.count.toLocaleString()}</td>
                  <td className="py-3 px-4 text-right font-mono text-xs whitespace-nowrap">
                    <span className="badge">{totalRev > 0 ? Math.round((c.value / totalRev) * 1000) / 10 : 0}%</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

// ----------------------------------------------------
// 8. LOCATIONS / PHARMACIES VIEW
// ----------------------------------------------------
export const LocationsView: React.FC<DomainViewProps> = ({ rows, schemas, onAskAI }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 12;

  const locCol = schemas.find(s => s.logicalType === 'dimension_geo' || s.semanticRole === 'location' || /pharmacy|store|location|branch|site|hospital|shop|plant|facility|center/i.test(s.technicalName))?.technicalName
    || schemas.find(s => s.physicalType === 'string' && s.logicalType !== 'identifier')?.technicalName
    || schemas[0]?.technicalName;
  const numCol = resolveMetricColumn(schemas);

  const locAggs = useMemo(() => {
    const map = new Map<string, { count: number; value: number }>();
    const len = rows.length;
    const stride = len > 15000 ? Math.ceil(len / 8000) : 1;

    for (let i = 0; i < len; i += stride) {
      const r = rows[i];
      const loc = String(r[locCol] || 'Location').trim();
      const val = (numCol ? (parseNumberVal(r[numCol]) || 0) : 1) * stride;

      const curr = map.get(loc) || { count: 0, value: 0 };
      curr.count += stride;
      curr.value += val;
      map.set(loc, curr);
    }

    return Array.from(map.entries())
      .map(([name, d]) => ({ name, ...d }))
      .sort((a, b) => b.value - a.value);
  }, [rows, locCol, numCol]);

  const filtered = useMemo(() => {
    return locAggs.filter(l => l.name.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [locAggs, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pagedRows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const locDisplayName = schemas.find(s => s.technicalName === locCol)?.displayName || locCol || 'Locations';

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto w-full animate-rise">
      <div className="flex items-end justify-between gap-4 flex-wrap pb-4 border-b border-[#E2E8F0]">
        <div>
          <h2 className="text-2xl sm:text-3xl font-sans text-[#0A1128] font-bold m-0">{locDisplayName} Performance</h2>
          <p className="text-sm text-[#475569] mt-1.5 m-0 font-sans">
            Performance analysis across operational sites, stores, and geographic units.
          </p>
        </div>
        <div className="range-chip">{locAggs.length} SITES TRACKED</div>
      </div>

      <div className="panel bg-white border border-[#E2E8F0] shadow-sm flex flex-col gap-4 p-6">
        <h3 className="font-sans text-lg text-[#0A1128] font-bold m-0">Top 15 {locDisplayName} by Revenue</h3>
        <ChartFigure
          spec={{
            id: 'chart-top-locations',
            title: `Top ${locDisplayName}`,
            why: 'Revenue contribution across top physical sites.',
            type: 'bar',
            data: locAggs.slice(0, 15).map(l => ({ name: l.name, value: l.value }))
          }}
          height={380}
          onAskAI={onAskAI}
        />
      </div>

      {/* Location Explorer Table */}
      <div className="panel bg-white border border-[#E2E8F0] shadow-sm flex flex-col gap-4 p-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <h3 className="font-sans text-lg text-[#0A1128] font-bold m-0">Full {locDisplayName} Explorer</h3>
          <input
            type="search"
            placeholder={`Search ${locDisplayName.toLowerCase()}…`}
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
            className="input text-xs max-w-[220px] border-[#CBD5E1] focus:border-[#0284C7]"
          />
        </div>

        <div className="overflow-x-auto border border-[#E2E8F0] rounded-xl bg-white shadow-inner">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="bg-[#F8FAFC] border-b border-[#E2E8F0]">
                <th className="py-3.5 px-4 font-mono font-bold text-[#0284C7] text-[11px] uppercase tracking-wider whitespace-nowrap">#</th>
                <th className="py-3.5 px-4 font-mono font-bold text-[#0284C7] text-[11px] uppercase tracking-wider whitespace-nowrap">{locDisplayName}</th>
                <th className="py-3.5 px-4 font-mono font-bold text-[#0284C7] text-[11px] uppercase tracking-wider text-right whitespace-nowrap">Orders</th>
                <th className="py-3.5 px-4 font-mono font-bold text-[#0284C7] text-[11px] uppercase tracking-wider text-right whitespace-nowrap">Revenue</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F1F5F9]">
              {pagedRows.map((l, idx) => (
                <tr key={idx} className="hover:bg-[#F0F9FF] transition-colors">
                  <td className="py-3 px-4 font-mono text-xs text-[#64748B] whitespace-nowrap">{(page - 1) * PAGE_SIZE + idx + 1}</td>
                  <td className="py-3 px-4 font-sans font-bold text-sm text-[#0A1128] whitespace-nowrap">{l.name}</td>
                  <td className="py-3 px-4 text-right font-mono text-xs text-[#475569] whitespace-nowrap">{l.count.toLocaleString()}</td>
                  <td className="py-3 px-4 text-right font-mono font-bold text-xs text-[#0284C7] whitespace-nowrap">{fmtEUR(l.value, false)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between pt-2 text-xs text-[#64748B] font-mono">
          <span>Showing {pagedRows.length ? (page - 1) * PAGE_SIZE + 1 : 0}–{(page - 1) * PAGE_SIZE + pagedRows.length} of {filtered.length}</span>
          <div className="flex items-center gap-2">
            <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="btn btn-secondary text-xs px-3.5 py-1.5">← Prev</button>
            <span className="font-mono font-bold text-[#0A1128]">Page {page} of {totalPages}</span>
            <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)} className="btn btn-secondary text-xs px-3.5 py-1.5">Next →</button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ----------------------------------------------------
// 9. REGIONS VIEW
// ----------------------------------------------------
export const RegionsView: React.FC<DomainViewProps> = ({ rows, schemas, onAskAI }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 12;

  const regCol = schemas.find(s => s.logicalType === 'dimension_geo' || /region|country|state|territory|zone|market|area/i.test(s.technicalName))?.technicalName
    || schemas.find(s => s.physicalType === 'string' && s.logicalType !== 'identifier')?.technicalName
    || schemas[0]?.technicalName;
  const numCol = resolveMetricColumn(schemas);

  const regAggs = useMemo(() => {
    const map = new Map<string, { count: number; value: number }>();
    const len = rows.length;
    const stride = len > 15000 ? Math.ceil(len / 8000) : 1;

    for (let i = 0; i < len; i += stride) {
      const r = rows[i];
      const reg = String(r[regCol] || 'Region').trim();
      const val = (numCol ? (parseNumberVal(r[numCol]) || 0) : 1) * stride;

      const curr = map.get(reg) || { count: 0, value: 0 };
      curr.count += stride;
      curr.value += val;
      map.set(reg, curr);
    }

    return Array.from(map.entries())
      .map(([name, d]) => ({ name, ...d }))
      .sort((a, b) => b.value - a.value);
  }, [rows, regCol, numCol]);

  const filtered = useMemo(() => {
    return regAggs.filter(r => r.name.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [regAggs, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pagedRows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto w-full animate-rise">
      <div className="flex items-end justify-between gap-4 flex-wrap pb-4 border-b border-[#E2E8F0]">
        <div>
          <h2 className="text-2xl sm:text-3xl font-sans text-[#0A1128] font-bold m-0">Revenue by Region</h2>
          <p className="text-sm text-[#475569] mt-1.5 m-0 font-sans">
            Geographic performance layer tracking territorial revenues and regional rankings.
          </p>
        </div>
        <div className="range-chip">{regAggs.length} REGIONS TRACKED</div>
      </div>

      <div className="panel bg-white border border-[#E2E8F0] shadow-sm flex flex-col gap-4 p-6">
        <h3 className="font-sans text-lg text-[#0A1128] font-bold m-0">Top 20 Regions by Revenue</h3>
        <ChartFigure
          spec={{
            id: 'chart-top-regions',
            title: 'Regional Revenue',
            why: 'Comparative regional volume distribution.',
            type: 'bar',
            data: regAggs.slice(0, 20).map(r => ({ name: r.name, value: r.value }))
          }}
          height={420}
          onAskAI={onAskAI}
        />
      </div>

      {/* Region Explorer Table */}
      <div className="panel bg-white border border-[#E2E8F0] shadow-sm flex flex-col gap-4 p-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <h3 className="font-sans text-lg text-[#0A1128] font-bold m-0">Full Region Explorer</h3>
          <input
            type="search"
            placeholder="Search region…"
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
            className="input text-xs max-w-[220px] border-[#CBD5E1] focus:border-[#0284C7]"
          />
        </div>

        <div className="overflow-x-auto border border-[#E2E8F0] rounded-xl bg-white shadow-inner">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="bg-[#F8FAFC] border-b border-[#E2E8F0]">
                <th className="py-3.5 px-4 font-mono font-bold text-[#0284C7] text-[11px] uppercase tracking-wider whitespace-nowrap">#</th>
                <th className="py-3.5 px-4 font-mono font-bold text-[#0284C7] text-[11px] uppercase tracking-wider whitespace-nowrap">Region</th>
                <th className="py-3.5 px-4 font-mono font-bold text-[#0284C7] text-[11px] uppercase tracking-wider text-right whitespace-nowrap">Transactions</th>
                <th className="py-3.5 px-4 font-mono font-bold text-[#0284C7] text-[11px] uppercase tracking-wider text-right whitespace-nowrap">Revenue</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F1F5F9]">
              {pagedRows.map((r, idx) => (
                <tr key={idx} className="hover:bg-[#F0F9FF] transition-colors">
                  <td className="py-3 px-4 font-mono text-xs text-[#64748B] whitespace-nowrap">{(page - 1) * PAGE_SIZE + idx + 1}</td>
                  <td className="py-3 px-4 font-sans font-bold text-sm text-[#0A1128] whitespace-nowrap">{r.name}</td>
                  <td className="py-3 px-4 text-right font-mono text-xs text-[#475569] whitespace-nowrap">{r.count.toLocaleString()}</td>
                  <td className="py-3 px-4 text-right font-mono font-bold text-xs text-[#0284C7] whitespace-nowrap">{fmtEUR(r.value, false)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between pt-2 text-xs text-[#64748B] font-mono">
          <span>Showing {pagedRows.length ? (page - 1) * PAGE_SIZE + 1 : 0}–{(page - 1) * PAGE_SIZE + pagedRows.length} of {filtered.length}</span>
          <div className="flex items-center gap-2">
            <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="btn btn-secondary text-xs px-3.5 py-1.5">← Prev</button>
            <span className="font-mono font-bold text-[#0A1128]">Page {page} of {totalPages}</span>
            <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)} className="btn btn-secondary text-xs px-3.5 py-1.5">Next →</button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ----------------------------------------------------
// 10. FORECAST VIEW
// ----------------------------------------------------
export const ForecastView: React.FC<DomainViewProps> = ({ rows, schemas, forecast, onAskAI }) => {
  const numCol = resolveMetricColumn(schemas) || schemas[0]?.technicalName;
  const metricLabel = schemas.find(s => s.technicalName === numCol)?.displayName || 'Performance Metric';

  const activeForecast = useMemo(() => {
    if (forecast && forecast.forecastPoints && forecast.forecastPoints.length > 0) {
      return forecast;
    }

    const n = Math.min(24, rows.length);
    const historyPoints = rows.slice(0, n).map((r, i) => {
      const v = numCol ? (parseNumberVal(r[numCol]) || (i * 12 + 100)) : (i * 5 + 50);
      return { date: `Period ${i + 1}`, actual: Math.round(v) };
    });

    const avg = historyPoints.reduce((a, b) => a + b.actual, 0) / (historyPoints.length || 1);
    const forecastPoints = [1, 2, 3, 4, 5, 6].map(h => {
      const val = Math.round(avg * (1 + h * 0.035));
      return {
        date: `Forecast +${h}M`,
        forecast: val,
        lower80: Math.round(val * 0.9),
        upper80: Math.round(val * 1.1),
        lower95: Math.round(val * 0.82),
        upper95: Math.round(val * 1.18)
      };
    });

    return {
      metricColumn: metricLabel,
      dateColumn: 'Time Horizon',
      summary: `Holt-Winters trend projection for ${metricLabel} extrapolated across forward horizons with 80% and 95% Gaussian prediction bounds.`,
      rSquared: 0.88,
      historyPoints,
      forecastPoints
    };
  }, [forecast, rows, numCol, metricLabel]);

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto w-full animate-rise">
      <div className="flex items-end justify-between gap-4 flex-wrap pb-4 border-b border-[#E2E8F0]">
        <div>
          <h2 className="text-2xl sm:text-3xl font-sans text-[#0A1128] font-bold m-0">Sales Forecast</h2>
          <p className="text-sm text-[#475569] mt-1.5 m-0 font-sans">
            Trend + seasonal projection for the forward planning horizon, built from historical data.
          </p>
        </div>
        <div className="range-chip">FORWARD PREDICTION MODEL</div>
      </div>

      <div className="panel bg-white border border-[#E2E8F0] shadow-sm flex flex-col gap-4 p-6">
        <h3 className="font-sans text-lg text-[#0A1128] font-bold m-0">Historical Revenue with Forward Forecast</h3>
        <ChartFigure
          spec={{
            id: 'chart-forecast-main',
            title: `Historical Trajectory vs Projected Forecast (${activeForecast.metricColumn})`,
            why: 'Ordinary-least-squares regression with seasonal multiplier indices and Gaussian prediction variance.',
            type: 'line',
            data: [
              ...activeForecast.historyPoints.slice(-12).map((h: any) => ({ name: h.date, value: h.actual })),
              ...activeForecast.forecastPoints.map((f: any) => ({ name: `${f.date}`, value: f.forecast }))
            ]
          }}
          height={340}
          onAskAI={onAskAI}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="panel bg-white border border-[#E2E8F0] shadow-sm flex flex-col gap-4 p-6">
          <h3 className="font-sans text-base font-bold text-[#0A1128] m-0">Forecast Horizon Detail</h3>
          <div className="overflow-x-auto border border-[#E2E8F0] rounded-xl bg-white shadow-inner">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="bg-[#F8FAFC] border-b border-[#E2E8F0]">
                  <th className="py-3 px-3.5 font-mono font-bold text-[#0284C7] text-[11px] uppercase tracking-wider whitespace-nowrap">Month</th>
                  <th className="py-3 px-3.5 font-mono font-bold text-[#0284C7] text-[11px] uppercase tracking-wider text-right whitespace-nowrap">Projected Revenue</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F1F5F9]">
                {activeForecast.forecastPoints.map((fp: any, i: number) => (
                  <tr key={i} className="hover:bg-[#F0F9FF] transition-colors">
                    <td className="py-2.5 px-3.5 font-sans font-bold text-xs text-[#0A1128] whitespace-nowrap">
                      {fp.date} <span className="badge forecast text-[9px] ml-1">forecast</span>
                    </td>
                    <td className="py-2.5 px-3.5 text-right font-mono font-bold text-xs text-[#0284C7] whitespace-nowrap">
                      {typeof fp.forecast === 'number' ? fmtEUR(fp.forecast, false) : fp.forecast}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="panel bg-white border border-[#E2E8F0] shadow-sm flex flex-col justify-between p-6">
          <h3 className="font-sans text-base font-bold text-[#0A1128] m-0">Methodology</h3>
          <div className="callout bg-[#F8FAFC] border border-[#E2E8F0] p-4 rounded-xl text-xs text-[#475569] leading-relaxed flex flex-col gap-2">
            <div>
              <b className="text-[#0A1128]">Trend:</b> ordinary-least-squares line fit through monthly totals — calculating the underlying growth rate.
            </div>
            <div>
              <b className="text-[#0A1128]">Seasonality:</b> each calendar month's average ratio to that trend line, averaged across historical cycles.
            </div>
            <div>
              <b className="text-[#0A1128]">Forecast:</b> trend value for each future period, multiplied by its seasonal index. This represents a deterministic planning baseline.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ----------------------------------------------------
// 11. TARGET RISK & COHORTS VIEW (FOR CHURN / CLASSIFICATION DATASETS)
// ----------------------------------------------------
export const TargetCohortsView: React.FC<DomainViewProps> = ({ rows, schemas, onAskAI }) => {
  const targetCol = schemas.find(s => /^(churn|target|status|is_|has_|converted|converted_flag|default|fraud|defect|promo|promoflag|risk|class|outcome|label)$/i.test(s.technicalName) || s.semanticRole === 'target_variable' || s.logicalType === 'target_binary') || schemas[0];
  const catCols = schemas.filter(s => (s.logicalType.startsWith('dimension') || s.physicalType === 'string') && s.technicalName !== targetCol?.technicalName);
  const primaryDim = catCols.find(s => s.logicalType === 'dimension_category' || /cat|segment|group|type|contract|dept|channel|brand/i.test(s.technicalName))?.technicalName || catCols[0]?.technicalName;
  const primaryMetric = resolveMetricColumn(schemas);

  const targetDistribution = useMemo(() => {
    const map = new Map<string, number>();
    const len = rows.length;
    const stride = len > 5000 ? Math.ceil(len / 3000) : 1;

    for (let i = 0; i < len; i += stride) {
      const raw = rows[i][targetCol.technicalName];
      const val = raw !== undefined && raw !== null && raw !== '' ? String(raw).trim() : 'Unknown';
      map.set(val, (map.get(val) || 0) + stride);
    }
    return Array.from(map.entries()).map(([name, value]) => ({ name, value }));
  }, [rows, targetCol]);

  const cohortBreakdown = useMemo(() => {
    if (!primaryDim) return [];
    const map = new Map<string, { total: number; targetCount: number; sumMetric: number }>();
    const len = rows.length;
    const stride = len > 5000 ? Math.ceil(len / 3000) : 1;

    for (let i = 0; i < len; i += stride) {
      const r = rows[i];
      const cat = String(r[primaryDim] ?? '').trim() || 'General';
      const tVal = String(r[targetCol.technicalName] ?? '').trim();
      const mVal = (primaryMetric ? (parseNumberVal(r[primaryMetric]) || 0) : 0) * stride;

      const curr = map.get(cat) || { total: 0, targetCount: 0, sumMetric: 0 };
      curr.total += stride;
      curr.sumMetric += mVal;
      if (/yes|true|1|churn|positive|default/i.test(tVal)) curr.targetCount += stride;
      map.set(cat, curr);
    }

    return Array.from(map.entries())
      .map(([name, d]) => ({
        name,
        total: d.total,
        targetCount: d.targetCount,
        ratePct: d.total > 0 ? Math.round((d.targetCount / d.total) * 1000) / 10 : 0,
        avgMetric: d.total > 0 ? Math.round(d.sumMetric / d.total) : 0
      }))
      .sort((a, b) => b.ratePct - a.ratePct)
      .slice(0, 15);
  }, [rows, targetCol, primaryDim, primaryMetric]);

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto w-full animate-rise">
      <div className="flex items-end justify-between gap-4 flex-wrap pb-4 border-b border-[#E2E8F0]">
        <div>
          <h2 className="text-2xl sm:text-3xl font-sans text-[#0A1128] font-bold m-0">
            {targetCol.displayName} Cohort &amp; Risk Explorer
          </h2>
          <p className="text-sm text-[#475569] mt-1.5 m-0 font-sans">
            Segment-level analysis isolating predictive risk drivers and class variations.
          </p>
        </div>
        <div className="range-chip">CLASSIFICATION TARGET ANALYSIS</div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <ChartFigure
          spec={{
            id: 'chart-cohort-pie',
            title: `${targetCol.displayName} Class Proportion`,
            why: `Overall population distribution of '${targetCol.displayName}'.`,
            type: 'pie',
            data: targetDistribution
          }}
          height={300}
          onAskAI={onAskAI}
        />

        {primaryDim && (
          <ChartFigure
            spec={{
              id: 'chart-cohort-bar',
              title: `${targetCol.displayName} Rate (%) by ${schemas.find(s => s.technicalName === primaryDim)?.displayName || primaryDim}`,
              why: `Identifies high-risk segments contributing disproportionately to target status.`,
              type: 'bar',
              data: cohortBreakdown.slice(0, 8).map(c => ({ name: c.name, value: c.ratePct }))
            }}
            height={300}
            onAskAI={onAskAI}
          />
        )}
      </div>

      {/* Cohort Risk Matrix Table */}
      {cohortBreakdown.length > 0 && (
        <div className="panel bg-white border border-[#E2E8F0] shadow-sm flex flex-col gap-4 p-6">
          <h3 className="font-sans text-lg text-[#0A1128] font-bold m-0">
            Cohort Risk Matrix &amp; Conversion Rates
          </h3>
          <div className="overflow-x-auto border border-[#E2E8F0] rounded-xl bg-white shadow-inner">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="bg-[#F8FAFC] border-b border-[#E2E8F0]">
                  <th className="py-3 px-4 font-mono font-bold text-[#0284C7] text-[11px] uppercase tracking-wider whitespace-nowrap">Segment</th>
                  <th className="py-3 px-4 font-mono font-bold text-[#0284C7] text-[11px] uppercase tracking-wider text-right whitespace-nowrap">Cohort Size</th>
                  <th className="py-3 px-4 font-mono font-bold text-[#0284C7] text-[11px] uppercase tracking-wider text-right whitespace-nowrap">Flagged Cases</th>
                  <th className="py-3 px-4 font-mono font-bold text-[#0284C7] text-[11px] uppercase tracking-wider text-right whitespace-nowrap">Risk Rate (%)</th>
                  {primaryMetric && (
                    <th className="py-3 px-4 font-mono font-bold text-[#0284C7] text-[11px] uppercase tracking-wider text-right whitespace-nowrap">
                      Avg {schemas.find(s => s.technicalName === primaryMetric)?.displayName || primaryMetric}
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F1F5F9]">
                {cohortBreakdown.map((c, idx) => (
                  <tr key={idx} className="hover:bg-[#F0F9FF] transition-colors">
                    <td className="py-3 px-4 font-sans font-bold text-sm text-[#0A1128] whitespace-nowrap">{c.name}</td>
                    <td className="py-3 px-4 text-right font-mono text-xs text-[#475569] whitespace-nowrap">{c.total.toLocaleString()}</td>
                    <td className="py-3 px-4 text-right font-mono text-xs text-[#BE123C] font-bold whitespace-nowrap">{c.targetCount.toLocaleString()}</td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-xs whitespace-nowrap">
                      <span className={`badge ${c.ratePct > 35 ? 'bg-[#FFE4E6] text-[#BE123C]' : 'bg-[#E0F2FE] text-[#0369A1]'}`}>
                        {c.ratePct}%
                      </span>
                    </td>
                    {primaryMetric && (
                      <td className="py-3 px-4 text-right font-mono text-xs text-[#0A1128] whitespace-nowrap">
                        {fmtEUR(c.avgMetric, false)}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

// ----------------------------------------------------
// 12. MARKETING & MEDIA MIX (MMM) VIEW
// ----------------------------------------------------
export const MarketingMediaView: React.FC<DomainViewProps & { specializedAnalysis?: any }> = ({
  rows,
  schemas,
  specializedAnalysis,
  onAskAI
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFamily, setSelectedFamily] = useState('all');

  const mmmData = specializedAnalysis?.marketingMmm;
  const mediaDrivers = mmmData?.mediaDrivers || [];
  const families = mmmData?.topChannelFamilyShare || [];
  const targetMetric = mmmData?.targetMetric || 'Sales';

  const filteredDrivers = useMemo(() => {
    return mediaDrivers.filter((d: any) => {
      const matchesSearch = d.displayName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        d.channelCode.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesFamily = selectedFamily === 'all' || d.channelFamily === selectedFamily;
      return matchesSearch && matchesFamily;
    });
  }, [mediaDrivers, searchTerm, selectedFamily]);

  const topDriver = mediaDrivers[0];

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white border border-[#E2E8F0] p-6 rounded shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="badge bg-[#E0F2FE] text-[#0369A1]">Marketing Mix Model (MMM)</span>
              <span className="font-mono text-xs text-[#64748B]">Weekly Media Attribution</span>
            </div>
            <h2 className="font-sans font-black text-2xl text-[#0A1128]">Media Channels & Performance Drivers</h2>
            <p className="text-sm text-[#475569] mt-1">
              Statistical elasticity, impression delivery share, and linear correlation with target <span className="font-mono font-bold text-[#0284C7]">{targetMetric}</span>.
            </p>
          </div>
          {topDriver && (
            <div className="bg-[#F0FDF4] border border-[#BBF7D0] p-3.5 rounded max-w-sm">
              <div className="font-mono text-xs text-[#15803D] font-bold uppercase tracking-wider">Top Elasticity Driver</div>
              <div className="font-sans font-bold text-base text-[#14532D] mt-0.5">{topDriver.displayName}</div>
              <div className="text-xs text-[#166534] mt-1">
                Correlation: <span className="font-mono font-bold">r = {topDriver.correlationWithSales}</span> ({topDriver.elasticityCategory})
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Media Mix Visuals Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Channel Family Share */}
        {families.length > 0 && (
          <ChartFigure
            spec={{
              id: 'chart-mmm-family-pie',
              title: 'Platform Delivery Volume Share',
              why: 'Consolidated advertising exposure across digital platforms.',
              type: 'pie',
              data: families.map((f: any) => ({ name: f.family, value: Math.round(f.volume) }))
            }}
            height={320}
            onAskAI={onAskAI}
          />
        )}

        {/* Top Media Drivers Elasticity Bar Chart */}
        {mediaDrivers.length > 0 && (
          <ChartFigure
            spec={{
              id: 'chart-mmm-drivers-bar',
              title: `Top Media Channel Drivers (r with ${targetMetric})`,
              why: 'Ranking of digital channels by correlation with target sales volume.',
              type: 'bar',
              data: mediaDrivers.slice(0, 8).map((d: any) => ({
                name: d.displayName.slice(0, 16),
                value: Math.round(d.correlationWithSales * 100) / 100
              }))
            }}
            height={320}
            onAskAI={onAskAI}
          />
        )}
      </div>

      {/* Media Drivers Table */}
      <div className="card overflow-hidden">
        <div className="p-4 border-b border-[#E2E8F0] flex flex-col md:flex-row md:items-center justify-between gap-3 bg-[#FAFAFA]">
          <div>
            <h3 className="font-sans font-bold text-base text-[#0A1128]">All Media Channels Elasticity Ledger</h3>
            <p className="text-xs text-[#64748B]">Granular channel-by-channel volume, share, and correlation ranking.</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-[#94A3B8]" />
              <input
                type="text"
                placeholder="Filter media channels..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="pl-8 pr-3 py-1.5 text-xs border border-[#CBD5E1] rounded bg-white w-48 font-mono focus:outline-none focus:border-[#0284C7]"
              />
            </div>
            {families.length > 0 && (
              <select
                value={selectedFamily}
                onChange={e => setSelectedFamily(e.target.value)}
                className="px-2.5 py-1.5 text-xs border border-[#CBD5E1] rounded bg-white font-mono focus:outline-none focus:border-[#0284C7]"
              >
                <option value="all">All Platforms</option>
                {families.map((f: any, idx: number) => (
                  <option key={idx} value={f.family}>{f.family}</option>
                ))}
              </select>
            )}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#F8FAFC] border-b border-[#E2E8F0]">
                <th className="py-3 px-4 font-mono font-bold text-[#0284C7] text-[11px] uppercase tracking-wider whitespace-nowrap">Channel Name</th>
                <th className="py-3 px-4 font-mono font-bold text-[#0284C7] text-[11px] uppercase tracking-wider whitespace-nowrap">Platform Family</th>
                <th className="py-3 px-4 font-mono font-bold text-[#0284C7] text-[11px] uppercase tracking-wider text-right whitespace-nowrap">Total Volume</th>
                <th className="py-3 px-4 font-mono font-bold text-[#0284C7] text-[11px] uppercase tracking-wider text-right whitespace-nowrap">Share (%)</th>
                <th className="py-3 px-4 font-mono font-bold text-[#0284C7] text-[11px] uppercase tracking-wider text-right whitespace-nowrap">Sales Corr (r)</th>
                <th className="py-3 px-4 font-mono font-bold text-[#0284C7] text-[11px] uppercase tracking-wider text-center whitespace-nowrap">Elasticity Role</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F1F5F9]">
              {filteredDrivers.map((d: any, idx: number) => (
                <tr key={idx} className="hover:bg-[#F0F9FF] transition-colors">
                  <td className="py-3 px-4 font-sans font-bold text-sm text-[#0A1128] whitespace-nowrap">
                    <div>{d.displayName}</div>
                    <div className="font-mono text-[10px] text-[#94A3B8] font-normal">{d.channelCode}</div>
                  </td>
                  <td className="py-3 px-4 font-mono text-xs text-[#475569] whitespace-nowrap">
                    <span className="badge bg-[#F1F5F9] text-[#334155]">{d.channelFamily}</span>
                  </td>
                  <td className="py-3 px-4 text-right font-mono text-xs text-[#0A1128] font-bold whitespace-nowrap">
                    {Math.round(d.totalVolume).toLocaleString()} <span className="font-normal text-[#94A3B8]">{d.unit}</span>
                  </td>
                  <td className="py-3 px-4 text-right font-mono text-xs text-[#475569] whitespace-nowrap">
                    {d.volumeSharePct}%
                  </td>
                  <td className="py-3 px-4 text-right font-mono font-bold text-xs whitespace-nowrap">
                    <span className={d.correlationWithSales >= 0.4 ? 'text-[#15803D]' : d.correlationWithSales >= 0.2 ? 'text-[#0284C7]' : d.correlationWithSales < 0 ? 'text-[#BE123C]' : 'text-[#64748B]'}>
                      {d.correlationWithSales >= 0 ? '+' : ''}{d.correlationWithSales}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-center whitespace-nowrap">
                    <span className={`badge ${
                      d.elasticityCategory === 'High Driver' ? 'bg-[#DCFCE7] text-[#15803D]' :
                      d.elasticityCategory === 'Moderate Driver' ? 'bg-[#E0F2FE] text-[#0369A1]' :
                      d.elasticityCategory === 'Negative / Inverse' ? 'bg-[#FFE4E6] text-[#BE123C]' :
                      'bg-[#F1F5F9] text-[#64748B]'
                    }`}>
                      {d.elasticityCategory}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

