'use client';

import React from 'react';
import { StatisticsReport } from '@/lib/analytics/statisticsEngine';
import { Binary, Sigma, Sparkles, BarChart2, Activity, Layers, Database, AlertCircle } from 'lucide-react';

interface StatisticsViewProps {
  report: StatisticsReport;
}

export const StatisticsView: React.FC<StatisticsViewProps> = ({ report }) => {
  return (
    <div className="flex flex-col gap-8 w-full max-w-7xl mx-auto animate-rise">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Sigma className="w-4 h-4 text-purple-600" />
            <span className="font-mono text-xs uppercase tracking-wider text-purple-700 font-extrabold">
              Parametric &amp; Non-Parametric Engine
            </span>
          </div>
          <h2 className="font-sans text-2xl sm:text-3xl font-extrabold bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 bg-clip-text text-transparent m-0">
            Statistics &amp; Data Distribution Hub
          </h2>
          <p className="text-sm text-slate-600 mt-1.5 m-0 font-sans font-medium">
            Descriptive statistics (Mean, Median, Std Dev), IQR dispersion, Pearson bivariate correlations, and mathematical anomaly detection.
          </p>
        </div>
        <div className="range-chip">
          {report.shape.rowCount.toLocaleString()} ROWS · {report.shape.colCount} COLUMNS
        </div>
      </div>

      {/* Shape of Data Cards - 6 Vibrant Chromatic Tiles */}
      <section className="flex flex-col gap-3">
        <h3 className="font-sans text-base text-slate-900 flex items-center gap-2 m-0 font-bold">
          <Binary className="w-4 h-4 text-sky-600" />
          Structural Shape of the Dataset
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-6 gap-3.5">
          <div className="kpi kpi-cyan p-4 flex flex-col justify-between">
            <span className="font-mono text-[10px] font-bold uppercase text-sky-700">Rows in Scope</span>
            <div className="font-sans text-2xl font-extrabold text-[#0A1128] mt-1">{report.shape.rowCount.toLocaleString()}</div>
          </div>

          <div className="kpi kpi-purple p-4 flex flex-col justify-between">
            <span className="font-mono text-[10px] font-bold uppercase text-purple-700">Total Columns</span>
            <div className="font-sans text-2xl font-extrabold text-[#0A1128] mt-1">{report.shape.colCount}</div>
          </div>

          <div className="kpi kpi-blue p-4 flex flex-col justify-between">
            <span className="font-mono text-[10px] font-bold uppercase text-blue-700">Num / Cat / Date</span>
            <div className="font-sans text-lg font-extrabold text-[#0A1128] mt-1">{report.shape.numericCount} / {report.shape.categoricalCount} / {report.shape.dateCount}</div>
          </div>

          <div className="kpi kpi-emerald p-4 flex flex-col justify-between">
            <span className="font-mono text-[10px] font-bold uppercase text-emerald-700">Duplicate Rows</span>
            <div className="font-sans text-2xl font-extrabold text-[#0A1128] mt-1">{report.shape.duplicateRows}</div>
          </div>

          <div className="kpi kpi-amber p-4 flex flex-col justify-between">
            <span className="font-mono text-[10px] font-bold uppercase text-amber-700">Missing Values</span>
            <div className="font-sans text-2xl font-extrabold text-[#0A1128] mt-1">{report.shape.missingCells}</div>
          </div>

          <div className="kpi kpi-rose p-4 flex flex-col justify-between">
            <span className="font-mono text-[10px] font-bold uppercase text-rose-700">Outliers (3σ / IQR)</span>
            <div className="font-sans text-2xl font-extrabold text-[#0A1128] mt-1">{report.outliers.length}</div>
          </div>
        </div>
      </section>

      {/* Statistical Notes */}
      {report.statisticalNotes && report.statisticalNotes.length > 0 && (
        <section className="panel bg-white/95 backdrop-blur-md border border-amber-200 shadow-md flex flex-col gap-3 p-6 rounded-2xl relative overflow-hidden">
          <div className="absolute top-0 left-0 bottom-0 w-1.5 bg-gradient-to-b from-amber-400 to-orange-500" />
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-amber-500" />
            <h3 className="font-sans text-lg font-bold text-slate-900 m-0">
              Key Statistical Observations &amp; Skewness Findings
            </h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {report.statisticalNotes.map((obs, idx) => (
              <div key={idx} className="callout bg-gradient-to-r from-amber-50/80 to-orange-50/50 border border-amber-200/80 text-xs py-3 px-4 m-0 rounded-xl shadow-2xs font-semibold text-slate-700">
                <span className="text-sm flex-none">📊</span>
                <span>{obs}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Descriptive Statistics Table */}
      <section className="panel bg-white/95 backdrop-blur-md border border-slate-200 shadow-md flex flex-col gap-3 p-6 rounded-2xl">
        <h3 className="font-sans text-lg font-bold text-slate-900 flex items-center gap-2 m-0">
          <Sigma className="w-5 h-5 text-purple-600" />
          Descriptive Statistics (Parametric &amp; Non-Parametric)
        </h3>
        <div className="overflow-x-auto border border-slate-200 rounded-xl bg-white shadow-inner">
          <table className="w-full border-collapse text-xs text-left">
            <thead>
              <tr className="bg-gradient-to-r from-slate-50 to-purple-50/60 border-b border-slate-200 font-mono font-bold text-purple-800 uppercase tracking-wider text-[10.5px]">
                <th className="py-3 px-3.5">Column Name</th>
                <th className="py-3 px-3.5 text-right">Count</th>
                <th className="py-3 px-3.5 text-right">Mean (μ)</th>
                <th className="py-3 px-3.5 text-right">Median</th>
                <th className="py-3 px-3.5 text-right">Std Dev (σ)</th>
                <th className="py-3 px-3.5 text-right">Min</th>
                <th className="py-3 px-3.5 text-right">Max</th>
                <th className="py-3 px-3.5 text-right">IQR Spread</th>
                <th className="py-3 px-3.5 text-right">Skewness</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {report.descriptiveTable.map((col) => (
                <tr key={col.column} className="hover:bg-purple-50/30 transition-colors">
                  <td className="py-2.5 px-3.5 font-bold text-slate-900">{col.displayName || col.column}</td>
                  <td className="py-2.5 px-3.5 text-right font-mono text-slate-600">{col.count.toLocaleString()}</td>
                  <td className="py-2.5 px-3.5 text-right font-mono font-bold text-sky-700">{col.mean !== undefined ? col.mean.toLocaleString(undefined, { maximumFractionDigits: 2 }) : '—'}</td>
                  <td className="py-2.5 px-3.5 text-right font-mono font-semibold text-indigo-700">{col.median !== undefined ? col.median.toLocaleString(undefined, { maximumFractionDigits: 2 }) : '—'}</td>
                  <td className="py-2.5 px-3.5 text-right font-mono text-slate-600">{col.std !== undefined ? col.std.toLocaleString(undefined, { maximumFractionDigits: 2 }) : '—'}</td>
                  <td className="py-2.5 px-3.5 text-right font-mono text-slate-500">{col.min !== undefined ? col.min.toLocaleString(undefined, { maximumFractionDigits: 2 }) : '—'}</td>
                  <td className="py-2.5 px-3.5 text-right font-mono text-slate-500">{col.max !== undefined ? col.max.toLocaleString(undefined, { maximumFractionDigits: 2 }) : '—'}</td>
                  <td className="py-2.5 px-3.5 text-right font-mono font-semibold text-purple-700">{col.iqr !== undefined ? col.iqr.toLocaleString(undefined, { maximumFractionDigits: 2 }) : '—'}</td>
                  <td className="py-2.5 px-3.5 text-right font-mono font-bold">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] ${
                      (col.skewness || 0) > 1 || (col.skewness || 0) < -1
                        ? 'bg-rose-100 text-rose-800 border border-rose-200'
                        : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                    }`}>
                      {col.skewness !== undefined ? col.skewness.toFixed(2) : '—'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Pearson Correlation Matrix */}
      {report.correlationMatrix && report.correlationMatrix.topPairs && report.correlationMatrix.topPairs.length > 0 && (
        <section className="panel bg-white/95 backdrop-blur-md border border-slate-200 shadow-md flex flex-col gap-3 p-6 rounded-2xl">
          <h3 className="font-sans text-lg font-bold text-slate-900 flex items-center gap-2 m-0">
            <BarChart2 className="w-5 h-5 text-indigo-600" />
            Bivariate Pearson Correlation Matrix (Linear Relationships)
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {report.correlationMatrix.topPairs.map((corr, idx) => {
              const isPositive = corr.r >= 0;
              const isStrong = Math.abs(corr.r) >= 0.6;

              return (
                <div
                  key={idx}
                  className="p-4 bg-gradient-to-br from-slate-50 to-sky-50/40 border border-slate-200 rounded-xl flex flex-col justify-between gap-2.5 shadow-2xs"
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-900">{corr.nameA || corr.colA} ↔ {corr.nameB || corr.colB}</span>
                    <span className={`font-mono font-extrabold px-2.5 py-0.5 rounded-full text-xs ${
                      isPositive
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                        : 'bg-rose-100 text-rose-800 border border-rose-300'
                    }`}>
                      r = {corr.r >= 0 ? '+' : ''}{corr.r.toFixed(2)}
                    </span>
                  </div>

                  {/* Colorful Progress bar */}
                  <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all shadow-xs"
                      style={{
                        width: `${Math.abs(corr.r) * 100}%`,
                        backgroundColor: isPositive ? '#10B981' : '#F43F5E'
                      }}
                    />
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-500 font-semibold">
                    <span className="capitalize font-bold text-indigo-800">{corr.strength} correlation</span>
                    <span className="font-mono">sample size n = {corr.n}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
};
