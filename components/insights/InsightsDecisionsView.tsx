'use client';

import React from 'react';
import { AIObservation, InvestmentRecommendation, Finding } from '@/lib/types';
import { TrendingUp, Sparkles, AlertCircle, ArrowUpRight, Award, ShieldAlert, Zap, CheckCircle2, TrendingDown } from 'lucide-react';
import { FeedbackWidget } from '@/components/ai/FeedbackWidget';

interface InsightsDecisionsViewProps {
  observations: AIObservation[];
  recommendations: InvestmentRecommendation[];
  findings: Finding[];
  onAskAI?: (query: string) => void;
}

const RANK_MEDALS = [
  { rankClass: 'from-amber-400 to-yellow-600 text-white', borderClass: 'border-amber-400 ring-2 ring-amber-400/30', badge: 'bg-amber-100 text-amber-900 border-amber-300' },
  { rankClass: 'from-slate-400 to-slate-600 text-white', borderClass: 'border-slate-300 ring-2 ring-slate-300/30', badge: 'bg-slate-100 text-slate-900 border-slate-300' },
  { rankClass: 'from-amber-600 to-orange-700 text-white', borderClass: 'border-orange-300 ring-2 ring-orange-300/30', badge: 'bg-orange-100 text-orange-900 border-orange-300' }
];

export const InsightsDecisionsView: React.FC<InsightsDecisionsViewProps> = ({
  observations,
  recommendations,
  findings,
  onAskAI
}) => {
  return (
    <div className="flex flex-col gap-8 w-full max-w-7xl mx-auto animate-rise">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Award className="w-4 h-4 text-amber-500" />
            <span className="font-mono text-xs uppercase tracking-wider text-amber-700 font-extrabold">
              Strategic Prioritization Matrix
            </span>
          </div>
          <h2 className="font-sans text-2xl sm:text-3xl font-extrabold bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 bg-clip-text text-transparent m-0">
            Decision Intelligence &amp; Strategic Opportunities
          </h2>
          <p className="text-sm text-slate-600 mt-1.5 m-0 font-sans font-medium">
            Multi-factor investment scoring, executive AI qualitative observations, and verified quantitative proof.
          </p>
        </div>
      </div>

      {/* 1. Multi-Factor Investment Recommendations */}
      {recommendations.length > 0 && (
        <section className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h3 className="font-sans text-lg text-slate-900 flex items-center gap-2 m-0 font-bold">
              <Sparkles className="w-5 h-5 text-amber-500" />
              Strategic Investment Prioritization Matrix
            </h3>
            <span className="font-mono text-xs font-bold text-slate-500 bg-slate-100 px-3 py-1 rounded-full border border-slate-200">
              Multi-Factor Score (0–100)
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {recommendations.map((rec, idx) => {
              const medal = RANK_MEDALS[idx] || {
                rankClass: 'from-indigo-500 to-purple-600 text-white',
                borderClass: 'border-slate-200',
                badge: 'bg-indigo-50 text-indigo-800 border-indigo-200'
              };

              return (
                <div
                  key={rec.entity || idx}
                  className={`panel group relative overflow-hidden flex flex-col justify-between gap-4 border-2 ${medal.borderClass} hover:border-sky-500 hover:shadow-xl transition-all duration-300 bg-gradient-to-b from-white to-slate-50/50 p-6 rounded-2xl shadow-md`}
                >
                  <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-amber-400 via-sky-500 to-purple-600 opacity-80" />

                  <div>
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className={`badge text-[11px] font-extrabold px-2.5 py-0.5 shadow-2xs ${medal.badge}`}>
                        Rank #{idx + 1} · {rec.recommendation}
                      </span>
                      <div className="flex items-baseline gap-1">
                        <span className="font-sans text-3xl font-extrabold bg-gradient-to-r from-sky-600 to-indigo-600 bg-clip-text text-transparent">
                          {rec.investmentScore}
                        </span>
                        <span className="text-[11px] font-mono text-slate-400 font-bold">/100</span>
                      </div>
                    </div>

                    <h4 className="font-sans text-xl font-bold text-[#0A1128] m-0 group-hover:text-sky-600 transition-colors">
                      {rec.entity}
                    </h4>

                    <p className="text-xs text-slate-600 leading-relaxed mt-2 mb-0 font-medium">
                      {rec.evidence || (rec.reasons && rec.reasons[0]) || 'Strong growth trajectory and resilient demand volume.'}
                    </p>
                  </div>

                  {/* Metric Breakdown Progress */}
                  {rec.scoreBreakdown && (
                    <div className="flex flex-col gap-2.5 pt-3 border-t border-slate-100">
                      <div>
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className="text-slate-600 font-semibold">Growth Velocity</span>
                          <span className="font-mono font-bold text-emerald-700">{rec.scoreBreakdown.growthScore}/100</span>
                        </div>
                        <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                          <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${rec.scoreBreakdown.growthScore}%` }} />
                        </div>
                      </div>

                      <div>
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className="text-slate-600 font-semibold">Margin Health</span>
                          <span className="font-mono font-bold text-indigo-700">{rec.scoreBreakdown.marginScore}/100</span>
                        </div>
                        <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                          <div className="bg-indigo-500 h-full rounded-full" style={{ width: `${rec.scoreBreakdown.marginScore}%` }} />
                        </div>
                      </div>

                      <div>
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className="text-slate-600 font-semibold">Stability Index</span>
                          <span className="font-mono font-bold text-cyan-700">{rec.scoreBreakdown.trendScore}/100</span>
                        </div>
                        <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                          <div className="bg-cyan-500 h-full rounded-full" style={{ width: `${rec.scoreBreakdown.trendScore}%` }} />
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-3 border-t border-slate-100 gap-2">
                    <FeedbackWidget insightId={`rec-${rec.entity || idx}`} type="RECOMMENDATION" />
                    {onAskAI && (
                      <button
                        onClick={() => onAskAI(`Explain why ${rec.entity} was ranked #${idx + 1}`)}
                        className="text-xs py-1.5 px-3 rounded-full font-bold bg-gradient-to-r from-sky-50 to-indigo-50 hover:from-sky-500 hover:to-indigo-600 text-sky-700 hover:text-white border border-sky-200 hover:border-transparent transition-all flex items-center gap-1.5 shadow-2xs cursor-pointer"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        Deep Dive
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* 2. Executive AI Observations */}
      {observations.length > 0 && (
        <section className="panel bg-white/95 backdrop-blur-md border border-slate-200 shadow-md flex flex-col gap-4 p-6 rounded-2xl relative overflow-hidden">
          <div className="absolute top-0 left-0 bottom-0 w-1.5 bg-gradient-to-b from-amber-400 via-rose-500 to-purple-600" />

          <div className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-amber-500" />
            <h3 className="font-sans text-lg sm:text-xl font-bold text-slate-900 m-0">
              Executive AI Observations &amp; Critical Signals
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {observations.map((obs) => {
              const isPositive = obs.impactLevel === 'positive';
              const isCritical = obs.impactLevel === 'critical';

              return (
                <div
                  key={obs.id}
                  className={`p-5 rounded-2xl border flex flex-col justify-between gap-3 shadow-2xs transition-all hover:shadow-md ${
                    isPositive
                      ? 'bg-gradient-to-br from-emerald-50/70 to-teal-50/40 border-emerald-200'
                      : isCritical
                      ? 'bg-gradient-to-br from-rose-50/70 to-pink-50/40 border-rose-200'
                      : 'bg-gradient-to-br from-sky-50/70 to-indigo-50/40 border-sky-200'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className={`badge text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full ${
                        isPositive
                          ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                          : isCritical
                          ? 'bg-rose-100 text-rose-800 border-rose-300'
                          : 'bg-sky-100 text-sky-800 border-sky-300'
                      }`}>
                        {obs.impactLevel} Impact
                      </span>
                      <span className="font-mono text-[10.5px] text-slate-500 font-semibold">
                        {obs.confidenceNote}
                      </span>
                    </div>

                    <h4 className="font-sans text-base font-bold text-slate-900 m-0">
                      {obs.title}
                    </h4>

                    <p className="text-xs text-slate-700 mt-2 mb-0 leading-relaxed font-medium">
                      {obs.text}
                    </p>
                  </div>

                  <div className="flex items-center justify-between pt-2.5 border-t border-black/5">
                    {obs.supportingMetrics && obs.supportingMetrics.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5">
                        {obs.supportingMetrics.map((m, i) => (
                          <span key={i} className="badge text-[10.5px] font-mono bg-white/90 shadow-2xs">
                            {m.label}: <b className="text-slate-900">{m.value}</b>
                          </span>
                        ))}
                      </div>
                    ) : <div />}
                    <FeedbackWidget insightId={obs.id} type="OBSERVATION" />
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* 3. Mathematically Verified Findings Table */}
      {findings.length > 0 && (
        <section className="panel bg-white/95 backdrop-blur-md border border-slate-200 shadow-md flex flex-col gap-3 p-6 rounded-2xl">
          <h3 className="font-sans text-lg font-bold text-slate-900 flex items-center gap-2 m-0">
            <TrendingUp className="w-5 h-5 text-sky-600" />
            Verified Mathematical Findings
          </h3>
          <div className="overflow-x-auto border border-slate-200 rounded-xl bg-white shadow-inner">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="bg-gradient-to-r from-slate-50 to-sky-50 border-b border-slate-200">
                  <th className="py-3.5 px-4 font-mono font-bold text-sky-700 text-[11px] uppercase tracking-wider whitespace-nowrap">Finding Type</th>
                  <th className="py-3.5 px-4 font-mono font-bold text-sky-700 text-[11px] uppercase tracking-wider whitespace-nowrap">Metric / Dimension</th>
                  <th className="py-3.5 px-4 font-mono font-bold text-sky-700 text-[11px] uppercase tracking-wider text-right whitespace-nowrap">Computed Value</th>
                  <th className="py-3.5 px-4 font-mono font-bold text-sky-700 text-[11px] uppercase tracking-wider text-right whitespace-nowrap">Change / Lift</th>
                  <th className="py-3.5 px-4 font-mono font-bold text-sky-700 text-[11px] uppercase tracking-wider whitespace-nowrap">Evidence &amp; Statistical Context</th>
                  <th className="py-3.5 px-4 font-mono font-bold text-sky-700 text-[11px] uppercase tracking-wider text-right whitespace-nowrap">Confidence</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {findings.map((f, i) => (
                  <tr key={i} className="hover:bg-sky-50/50 transition-colors">
                    <td className="py-3 px-4 font-sans font-bold text-xs text-[#0A1128] whitespace-nowrap">
                      <span className="badge font-mono text-[10px] bg-sky-50 text-sky-800 border-sky-200">{f.type}</span>
                    </td>
                    <td className="py-3 px-4 text-xs text-slate-800 whitespace-nowrap font-bold">{f.metric} {f.dimension ? `(${f.dimension})` : ''}</td>
                    <td className="py-3 px-4 text-right font-mono font-extrabold text-xs text-slate-900 whitespace-nowrap">{typeof f.value === 'number' ? f.value.toLocaleString() : f.value}</td>
                    <td className="py-3 px-4 text-right font-mono font-extrabold text-xs text-emerald-700 whitespace-nowrap">
                      {f.percentageChange !== undefined ? `${f.percentageChange >= 0 ? '+' : ''}${f.percentageChange.toFixed(1)}%` : '—'}
                    </td>
                    <td className="py-3 px-4 text-xs text-slate-600 font-medium">{f.evidence}</td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-xs text-sky-600 whitespace-nowrap">{f.confidence}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
};
