'use client';

import React from 'react';
import { DataQualityReport } from '@/lib/types';
import { ShieldCheck, AlertTriangle, CheckCircle, FileText, CheckCircle2, AlertOctagon } from 'lucide-react';

interface DataQualityViewProps {
  report: DataQualityReport;
}

export const DataQualityView: React.FC<DataQualityViewProps> = ({ report }) => {
  const isHealthy = report.overallScore >= 80;

  return (
    <div className="flex flex-col gap-8 w-full max-w-7xl mx-auto animate-rise">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span className="font-mono text-xs uppercase tracking-wider text-emerald-700 font-extrabold">
              Automated Data Hygiene &amp; Standardization
            </span>
          </div>
          <h2 className="font-sans text-2xl sm:text-3xl font-extrabold bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 bg-clip-text text-transparent m-0">
            Data Quality &amp; Transformation Lineage
          </h2>
          <p className="text-sm text-slate-600 mt-1.5 m-0 font-sans font-medium">
            Autonomous anomaly diagnosis, safe deterministic cleaning, and 100% reproducible audit trail.
          </p>
        </div>

        {/* Health Score Pill */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-3.5 p-3.5 px-6 bg-gradient-to-r from-white to-emerald-50/70 border border-emerald-300 rounded-2xl shadow-md">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-600 text-white flex items-center justify-center shadow-sm">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <span className="block text-[10.5px] font-mono font-extrabold uppercase tracking-wider text-slate-500">
                Health Score
              </span>
              <div className="flex items-baseline gap-1">
                <span className="font-sans font-extrabold text-3xl text-emerald-700">
                  {report.overallScore}
                </span>
                <span className="font-mono text-xs text-slate-400 font-bold">/100</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 4 Chromatic Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="kpi kpi-cyan p-5 flex flex-col justify-between">
          <span className="font-mono text-[10.5px] font-bold uppercase tracking-wider text-sky-700">
            Total Input Rows
          </span>
          <div className="font-sans font-bold text-3xl text-[#0A1128] my-1.5">
            {report.totalRows.toLocaleString()}
          </div>
          <span className="text-[11px] text-slate-500 font-mono font-medium">
            {report.totalColumns} dimensions identified
          </span>
        </div>

        <div className="kpi kpi-emerald p-5 flex flex-col justify-between">
          <span className="font-mono text-[10.5px] font-bold uppercase tracking-wider text-emerald-700">
            Cleaned Rows
          </span>
          <div className="font-sans font-bold text-3xl text-emerald-700 my-1.5">
            {report.cleanRows.toLocaleString()}
          </div>
          <span className="text-[11px] text-emerald-600 font-mono font-bold flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" />
            100% verified schema
          </span>
        </div>

        <div className="kpi kpi-amber p-5 flex flex-col justify-between">
          <span className="font-mono text-[10.5px] font-bold uppercase tracking-wider text-amber-700">
            Detected Anomalies
          </span>
          <div className="font-sans font-bold text-3xl text-amber-700 my-1.5">
            {report.issues.length}
          </div>
          <span className="text-[11px] text-slate-500 font-mono font-medium">
            edge cases addressed
          </span>
        </div>

        <div className="kpi kpi-purple p-5 flex flex-col justify-between">
          <span className="font-mono text-[10.5px] font-bold uppercase tracking-wider text-purple-700">
            Standardization Actions
          </span>
          <div className="font-sans font-bold text-3xl text-purple-700 my-1.5">
            {report.auditLog.length}
          </div>
          <span className="text-[11px] text-slate-500 font-mono font-medium">
            logged transformations
          </span>
        </div>
      </div>

      {/* Detected Issues List */}
      <div className="flex flex-col gap-4">
        <h3 className="font-sans font-bold text-xl text-[#0A1128] flex items-center gap-2 m-0">
          <AlertTriangle className="w-5 h-5 text-amber-500" />
          Detected Data Quality Anomalies
        </h3>

        {report.issues.length === 0 ? (
          <div className="p-6 bg-emerald-50/70 border border-emerald-200 rounded-2xl text-center text-sm font-semibold text-emerald-800 flex items-center justify-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            No critical data quality issues identified. Dataset is clean and ready.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {report.issues.map((issue, idx) => {
              const isHigh = issue.severity === 'high';

              return (
                <div
                  key={idx}
                  className={`p-5 rounded-2xl border flex flex-col gap-2.5 shadow-2xs transition-all hover:shadow-md ${
                    isHigh
                      ? 'bg-gradient-to-br from-rose-50/80 to-pink-50/40 border-rose-200'
                      : 'bg-gradient-to-br from-amber-50/80 to-yellow-50/40 border-amber-200'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono font-bold text-sm text-[#0A1128]">
                      {issue.column}
                    </span>
                    <span className={`badge text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full ${
                      isHigh ? 'bg-rose-100 text-rose-800 border-rose-300' : 'bg-amber-100 text-amber-800 border-amber-300'
                    }`}>
                      {issue.issueType.replace(/_/g, ' ')}
                    </span>
                  </div>
                  <p className="text-xs text-slate-700 m-0 leading-relaxed font-medium">
                    {issue.description}
                  </p>
                  <div className="mt-1 pt-2.5 border-t border-black/5 flex items-center justify-between text-[11px] font-mono">
                    <span className="text-slate-500">
                      Affected: <strong className="text-slate-900">{issue.affectedRows} rows ({issue.affectedPercentage}%)</strong>
                    </span>
                    <span className="text-sky-700 font-bold bg-white px-2 py-0.5 rounded-md border border-slate-200 shadow-2xs">
                      ↳ {issue.suggestedAction}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Cleaning Audit Log Table */}
      <div className="flex flex-col gap-4">
        <h3 className="font-sans font-bold text-xl text-[#0A1128] flex items-center gap-2 m-0">
          <FileText className="w-5 h-5 text-sky-600" />
          Cleaning Audit Trail (Full Reproducibility &amp; Lineage)
        </h3>

        <div className="overflow-x-auto border border-slate-200 rounded-2xl bg-white shadow-md">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="bg-gradient-to-r from-slate-50 to-sky-50/60 border-b border-slate-200">
                <th className="py-3.5 px-4 font-mono font-bold text-sky-700 text-[11px] uppercase tracking-wider whitespace-nowrap">Column</th>
                <th className="py-3.5 px-4 font-mono font-bold text-sky-700 text-[11px] uppercase tracking-wider whitespace-nowrap">Issue Type</th>
                <th className="py-3.5 px-4 font-mono font-bold text-sky-700 text-[11px] uppercase tracking-wider whitespace-nowrap">Action Applied</th>
                <th className="py-3.5 px-4 font-mono font-bold text-sky-700 text-[11px] uppercase tracking-wider whitespace-nowrap">Reason</th>
                <th className="py-3.5 px-4 font-mono font-bold text-sky-700 text-[11px] uppercase tracking-wider text-center whitespace-nowrap">Rows Affected</th>
                <th className="py-3.5 px-4 font-mono font-bold text-sky-700 text-[11px] uppercase tracking-wider whitespace-nowrap">Before State</th>
                <th className="py-3.5 px-4 font-mono font-bold text-sky-700 text-[11px] uppercase tracking-wider whitespace-nowrap">After State</th>
                <th className="py-3.5 px-4 font-mono font-bold text-sky-700 text-[11px] uppercase tracking-wider text-right whitespace-nowrap">Confidence</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {report.auditLog.map((audit) => (
                <tr key={audit.id} className="hover:bg-sky-50/40 transition-colors">
                  <td className="py-3 px-4 font-mono font-bold text-xs text-slate-900 whitespace-nowrap">
                    {audit.column}
                  </td>
                  <td className="py-3 px-4 whitespace-nowrap">
                    <span className="badge text-[10px] bg-slate-100 text-slate-700 border-slate-300">
                      {audit.issueType.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-xs font-bold text-indigo-900 whitespace-nowrap">
                    {audit.actionTaken}
                  </td>
                  <td className="py-3 px-4 text-xs text-slate-600 max-w-xs font-medium">
                    {audit.reason}
                  </td>
                  <td className="py-3 px-4 text-xs font-mono font-bold text-center text-slate-900 whitespace-nowrap">
                    {audit.rowsAffected.toLocaleString()}
                  </td>
                  <td className="py-3 px-4 text-xs font-mono text-slate-500 whitespace-nowrap">
                    {audit.beforeSummary}
                  </td>
                  <td className="py-3 px-4 text-xs font-mono text-emerald-700 font-bold whitespace-nowrap">
                    {audit.afterSummary}
                  </td>
                  <td className="py-3 px-4 text-xs font-mono font-bold text-sky-600 text-right whitespace-nowrap">
                    {Math.round(audit.confidence * 100)}%
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
