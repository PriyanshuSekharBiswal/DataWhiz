'use client';

import React, { useState } from 'react';
import { Newspaper, ExternalLink, Sparkles, RefreshCw, TrendingUp, AlertCircle, ArrowUpRight, Globe, Radio, Zap } from 'lucide-react';
import { TavilyArticle } from '@/lib/services/tavilyService';

interface MarketNewsViewProps {
  newsItems: TavilyArticle[];
  domainName: string;
  kpiSummary: { label: string; value: string }[];
  liveInsights: string[];
  isLoading: boolean;
  onRefreshNews?: () => void;
  onAskAI?: (query: string) => void;
}

const SOURCE_COLORS = [
  'bg-cyan-100 text-cyan-800 border-cyan-300',
  'bg-emerald-100 text-emerald-800 border-emerald-300',
  'bg-purple-100 text-purple-800 border-purple-300',
  'bg-amber-100 text-amber-800 border-amber-300',
  'bg-rose-100 text-rose-800 border-rose-300',
  'bg-indigo-100 text-indigo-800 border-indigo-300'
];

export const MarketNewsView: React.FC<MarketNewsViewProps> = ({
  newsItems,
  domainName,
  kpiSummary,
  liveInsights,
  isLoading,
  onRefreshNews,
  onAskAI
}) => {
  return (
    <div className="flex flex-col gap-8 max-w-7xl mx-auto w-full animate-rise">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Radio className="w-4 h-4 text-teal-500 animate-pulse" />
            <span className="font-mono text-xs uppercase tracking-wider text-teal-700 font-extrabold">
              Live Tavily Web Search &amp; Neural Cross-Reading
            </span>
          </div>
          <h2 className="font-sans text-2xl sm:text-3xl font-extrabold bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 bg-clip-text text-transparent m-0">
            Market Context &amp; Industry Wire
          </h2>
          <p className="text-sm text-slate-600 mt-1.5 m-0 font-sans font-medium">
            Real-time industry developments cross-referenced against your DataWhiz ledger to explain macroeconomic trends and demand shifts.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="range-chip">
            DOMAIN: {domainName.toUpperCase()}
          </div>
          {onRefreshNews && (
            <button
              onClick={onRefreshNews}
              disabled={isLoading}
              className="btn btn-secondary text-xs flex items-center gap-1.5 font-bold shadow-xs cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh News
            </button>
          )}
        </div>
      </div>

      {/* High-Contrast Dataset Context Bar */}
      {kpiSummary.length > 0 && (
        <div className="bg-gradient-to-r from-[#060D1E] via-[#0A142F] to-[#0D1E4A] text-white p-5 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border border-cyan-500/30 shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-48 h-48 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

          <div className="flex items-center gap-3.5 relative z-10">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-cyan-400 to-blue-600 text-white flex items-center justify-center font-sans font-extrabold text-xl shadow-lg shadow-cyan-500/30 flex-none">
              AI
            </div>
            <div>
              <div className="font-sans font-bold text-base text-white flex items-center gap-2">
                Active Dataset Baseline: {domainName}
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              </div>
              <div className="text-xs text-slate-300 font-sans font-medium">
                Gemini LLM cross-analyzes incoming market news against these key ledger totals:
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 flex-wrap relative z-10">
            {kpiSummary.map((kpi, idx) => (
              <div key={idx} className="bg-slate-900/90 px-4 py-2 rounded-xl border border-cyan-500/30 font-mono text-xs shadow-md">
                <span className="text-slate-400 text-[10px] block uppercase font-bold">{kpi.label}</span>
                <span className="font-extrabold text-cyan-300 text-sm">{kpi.value}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Executive Market Marginalia & Synthesis */}
      {liveInsights.length > 0 && (
        <section className="bg-white/95 backdrop-blur-md border border-slate-200 rounded-2xl p-6 flex flex-col gap-4 relative overflow-hidden shadow-md">
          <div className="absolute top-0 left-0 bottom-0 w-1.5 bg-gradient-to-b from-cyan-400 via-sky-500 to-indigo-600" />
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-sky-600" />
            <h3 className="font-sans text-lg font-bold text-slate-900 m-0">
              AI Cross-Read Synthesis: Real-World News ↔ Dataset Impact
            </h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {liveInsights.map((insight, idx) => (
              <div key={idx} className="callout bg-gradient-to-r from-sky-50/80 via-indigo-50/60 to-purple-50/80 border border-sky-200/80 text-xs py-3.5 px-4 rounded-xl text-slate-800 shadow-2xs">
                <span className="text-sm flex-none">💡</span>
                <span className="leading-relaxed font-semibold">
                  <b className="text-indigo-900 font-extrabold">Insight #{idx + 1}:</b> {insight}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* News Articles Grid */}
      <section className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h3 className="font-sans text-xl font-bold text-slate-900 m-0 flex items-center gap-2">
            <Newspaper className="w-5 h-5 text-sky-600" />
            Live Industry Articles ({newsItems.length})
          </h3>
          <span className="text-xs text-slate-500 font-mono font-bold">
            Powered by Tavily Search API
          </span>
        </div>

        {newsItems.length === 0 && !isLoading && (
          <div className="p-10 text-center bg-white rounded-2xl border border-slate-200 text-slate-500">
            No live news articles loaded yet. Click &quot;Refresh News&quot; above to search the live web.
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {newsItems.map((item, idx) => {
            const sourceColor = SOURCE_COLORS[idx % SOURCE_COLORS.length];

            return (
              <article
                key={idx}
                className="bg-white rounded-2xl border border-slate-200/90 p-5 flex flex-col justify-between gap-4 hover:shadow-xl hover:border-sky-400 transition-all duration-300 group shadow-sm"
              >
                <div>
                  <div className="flex items-center justify-between text-[11px] font-mono mb-2.5 pb-2 border-b border-slate-100">
                    <span className={`font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-md border ${sourceColor}`}>
                      {item.source}
                    </span>
                    <span className="text-slate-500 font-semibold">{item.date}</span>
                  </div>

                  <h4 className="font-sans text-[16px] font-bold text-slate-900 group-hover:text-sky-600 transition-colors leading-snug m-0 line-clamp-2">
                    {item.headline}
                  </h4>

                  <p className="text-xs text-slate-600 mt-2 mb-0 leading-relaxed line-clamp-3 font-medium">
                    {item.summary}
                  </p>
                </div>

                <div className="flex flex-col gap-2 pt-3 border-t border-slate-100">
                  {onAskAI && (
                    <button
                      onClick={() => onAskAI(`Analyze the impact of this headline on our numbers: "${item.headline}"`)}
                      className="w-full text-xs py-2 px-3 bg-gradient-to-r from-sky-50 to-indigo-50 hover:from-sky-500 hover:to-indigo-600 text-sky-700 hover:text-white rounded-xl transition-all flex items-center justify-center gap-1.5 font-bold cursor-pointer border border-sky-200 hover:border-transparent shadow-2xs"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      Analyze Impact on Ledger
                    </button>
                  )}

                  <a
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs font-bold text-slate-500 hover:text-sky-600 flex items-center justify-between transition-colors pt-1"
                  >
                    <span>Read full source article</span>
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </a>
                </div>
              </article>
            );
          })}
        </div>
      </section>
    </div>
  );
};
