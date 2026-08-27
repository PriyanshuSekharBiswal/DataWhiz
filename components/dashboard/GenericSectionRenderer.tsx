'use client';

import React from 'react';
import { DashboardSection, DatasetContext } from '@/lib/types';
import { ChartFigure } from '@/components/charts/ChartFigure';
import { KpiGrid } from '@/components/kpi/KpiCard';
import { TrendingUp, ShieldAlert, BarChart2, CheckCircle2, BookOpen, Sparkles, AlertCircle } from 'lucide-react';

interface GenericSectionRendererProps {
  section: DashboardSection;
  context: DatasetContext;
  onAskAI?: (query: string) => void;
}

export const GenericSectionRenderer: React.FC<GenericSectionRendererProps> = ({
  section,
  context,
  onAskAI
}) => {
  switch (section.sectionType) {
    case 'kpi_group': {
      if (!section.kpis || section.kpis.length === 0) return null;
      return (
        <div className="flex flex-col gap-4">
          {section.title && (
            <div>
              <h3 className="text-xl font-sans font-bold text-[#0A1128]">{section.title}</h3>
              {section.subtitle && <p className="text-xs text-slate-500">{section.subtitle}</p>}
            </div>
          )}
          <KpiGrid kpis={section.kpis} />
        </div>
      );
    }

    case 'chart': {
      if (!section.chart) return null;
      return (
        <div className="flex flex-col gap-4">
          <ChartFigure spec={section.chart} onAskAI={onAskAI} />
        </div>
      );
    }

    case 'chart_grid': {
      const charts = section.charts || [];
      if (charts.length === 0) return null;
      return (
        <div className="flex flex-col gap-6">
          {section.title && (
            <div>
              <h3 className="text-xl font-sans font-bold text-[#0A1128]">{section.title}</h3>
              {section.subtitle && <p className="text-xs text-slate-500">{section.subtitle}</p>}
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {charts.map(c => (
              <ChartFigure key={c.id} spec={c} onAskAI={onAskAI} />
            ))}
          </div>
        </div>
      );
    }

    case 'forecast': {
      const chart = section.chart;
      const summary = section.metadata?.forecastSummary;
      return (
        <div className="flex flex-col gap-6 animate-rise">
          <div className="flex items-end justify-between gap-4 flex-wrap pb-4 border-b border-slate-200">
            <div>
              <h2 className="text-2xl sm:text-3xl font-sans text-[#0A1128] font-bold m-0 flex items-center gap-2">
                <TrendingUp className="w-7 h-7 text-indigo-600" />
                {section.title || 'Predictive Forward Forecasting'}
              </h2>
              <p className="text-sm text-slate-600 mt-1.5 m-0 font-sans">
                {section.subtitle || 'Autoregressive exponential smoothing projections with 80% confidence intervals.'}
              </p>
            </div>
          </div>

          {chart && <ChartFigure spec={chart} height={400} onAskAI={onAskAI} />}

          {summary && (
            <div className="p-4 bg-indigo-50/80 border border-indigo-200 rounded-xl text-xs text-indigo-950 font-medium">
              <b>Statistical Forecast Summary:</b> {summary}
            </div>
          )}
        </div>
      );
    }

    case 'model_result': {
      const chart = section.chart;
      const classData = section.metadata?.classificationData;
      return (
        <div className="flex flex-col gap-6 animate-rise">
          <div className="flex items-end justify-between gap-4 flex-wrap pb-4 border-b border-slate-200">
            <div>
              <h2 className="text-2xl sm:text-3xl font-sans text-[#0A1128] font-bold m-0 flex items-center gap-2">
                <ShieldAlert className="w-7 h-7 text-amber-600" />
                {section.title || 'Risk Modeling & Segmentation'}
              </h2>
              <p className="text-sm text-slate-600 mt-1.5 m-0 font-sans">
                {section.subtitle || 'Supervised classification and cohort risk profiling.'}
              </p>
            </div>
          </div>

          {chart && <ChartFigure spec={chart} height={380} onAskAI={onAskAI} />}

          {classData?.highRiskCohorts && classData.highRiskCohorts.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {classData.highRiskCohorts.map((cohort: any, idx: number) => (
                <div key={idx} className="p-4 bg-white border border-slate-200 rounded-xl shadow-xs flex flex-col gap-1.5">
                  <span className="text-xs font-mono font-bold text-amber-700 uppercase">High Risk Cohort</span>
                  <h4 className="font-sans text-base font-bold text-[#0A1128] m-0">{cohort.category}</h4>
                  <p className="text-xs text-slate-600 m-0">
                    Event Rate: <b>{cohort.churnRate}%</b> ({cohort.riskMultiplier}x baseline)
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      );
    }

    case 'findings': {
      const findings = section.findings || context.validatedFindings || [];
      if (findings.length === 0) return null;
      return (
        <div className="flex flex-col gap-4">
          <h3 className="text-xl font-sans font-bold text-[#0A1128] flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-indigo-600" />
            Validated Analytical Findings ({findings.length})
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {findings.map((f, idx) => (
              <div key={f.id || idx} className="p-4 bg-white border border-slate-200 rounded-xl shadow-xs flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700 uppercase">
                    {f.type}
                  </span>
                  <span className="text-[11px] font-mono text-emerald-700 font-bold">
                    {f.confidence.toUpperCase()} CONFIDENCE
                  </span>
                </div>
                <p className="text-sm font-semibold text-slate-900 m-0">{f.statement}</p>
                <p className="text-xs text-slate-500 m-0 leading-relaxed font-mono bg-slate-50 p-2 rounded border border-slate-100">
                  {f.evidence}
                </p>
              </div>
            ))}
          </div>
        </div>
      );
    }

    default:
      return null;
  }
};
