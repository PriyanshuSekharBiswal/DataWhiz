'use client';

import React, { useState } from 'react';
import { AskDataTurn, DynamicChartSpec } from '@/lib/types';
import { ChartFigure } from '@/components/charts/ChartFigure';
import { Sparkles, Pin, Check, Zap, Bot, User } from 'lucide-react';

interface AskDataChatProps {
  chatTurns: AskDataTurn[];
  onSendMessage?: (query: string) => void;
  onPinChart?: (chart: DynamicChartSpec) => void;
  isLoading?: boolean;
  suggestions?: string[];
  hideInput?: boolean;
}

export const AskDataChat: React.FC<AskDataChatProps> = ({
  chatTurns,
  onSendMessage,
  onPinChart,
  isLoading = false,
  suggestions = [],
  hideInput = true
}) => {
  const [pinnedMap, setPinnedMap] = useState<Record<string, boolean>>({});

  const handlePin = (turnId: string, chart: DynamicChartSpec) => {
    setPinnedMap(prev => ({ ...prev, [turnId]: true }));
    if (onPinChart) onPinChart(chart);
  };

  return (
    <div className="flex flex-col gap-4 w-full">
      {/* Suggestions Pills */}
      {suggestions.length > 0 && onSendMessage && (
        <div className="flex items-center gap-2 flex-wrap pb-2 border-b border-slate-200">
          <span className="text-[11px] font-mono font-extrabold uppercase tracking-wider text-sky-700 flex items-center gap-1">
            <Zap className="w-3 h-3 text-amber-500" />
            Suggested Inquiries:
          </span>
          {suggestions.map((s, idx) => (
            <button
              key={idx}
              onClick={() => onSendMessage(s)}
              className="text-[12px] px-3 py-1 bg-gradient-to-r from-sky-50 to-indigo-50 border border-sky-200 text-sky-950 hover:border-sky-400 hover:from-sky-100 hover:to-indigo-100 transition-all rounded-full font-bold cursor-pointer shadow-2xs"
            >
              {s}
            </button>
          ))}
        </div>
      )}

      {/* Chat Messages */}
      <div className="flex flex-col gap-4">
        {chatTurns.length === 0 ? (
          <div className="p-8 text-center border border-dashed border-sky-200 bg-gradient-to-b from-white to-sky-50/40 rounded-2xl shadow-inner">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-sky-400 to-indigo-600 text-white flex items-center justify-center mx-auto mb-3 shadow-md">
              <Sparkles className="w-6 h-6" />
            </div>
            <h3 className="font-sans font-bold text-lg text-slate-900 mb-1">
              Ask Anything About Your Data
            </h3>
            <p className="text-xs text-slate-600 max-w-md mx-auto font-medium">
              Ask natural-language questions like "What does dtv_srh_pmx_tot_xxx_clk mean?", "Which product has highest ROI?", or "Forecast revenue for next 6 months".
            </p>
          </div>
        ) : (
          chatTurns.map((turn) => (
            <div
              key={turn.id}
              className={`flex flex-col gap-2 p-5 rounded-2xl transition-all ${
                turn.who === 'user'
                  ? 'bg-gradient-to-r from-sky-600 via-blue-600 to-indigo-600 text-white self-end max-w-2xl shadow-lg shadow-sky-600/20'
                  : 'bg-white border border-slate-200/90 border-l-4 border-l-sky-500 shadow-md w-full'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  {turn.who === 'user' ? (
                    <User className="w-3.5 h-3.5 text-cyan-200" />
                  ) : (
                    <Bot className="w-3.5 h-3.5 text-sky-600" />
                  )}
                  <span className={`text-[11px] font-mono font-extrabold tracking-wider uppercase ${
                    turn.who === 'user' ? 'text-cyan-100' : 'text-sky-700'
                  }`}>
                    {turn.who === 'user' ? 'You' : 'DataWhiz AI'}
                  </span>
                </div>
                <span className={`text-[10px] font-mono ${
                  turn.who === 'user' ? 'text-sky-200' : 'text-slate-400'
                }`}>
                  {turn.timestamp}
                </span>
              </div>

              <div className={`text-[13.5px] leading-relaxed whitespace-pre-wrap font-medium ${
                turn.who === 'user' ? 'text-white' : 'text-[#0A1128]'
              }`}>
                {turn.text}
              </div>

              {/* Render Chart if present */}
              {turn.chart && (
                <div className="mt-3 flex flex-col gap-2">
                  <ChartFigure spec={turn.chart} />
                  <div className="flex justify-end">
                    <button
                      onClick={() => handlePin(turn.id, turn.chart!)}
                      disabled={pinnedMap[turn.id]}
                      className="btn btn-secondary text-xs flex items-center gap-1.5 py-1.5 px-3 rounded-full cursor-pointer font-bold"
                    >
                      {pinnedMap[turn.id] ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                          Pinned to Dashboard
                        </>
                      ) : (
                        <>
                          <Pin className="w-3.5 h-3.5 text-sky-600" />
                          Pin Chart to Dashboard
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}

              {/* Render Table if present */}
              {turn.tableData && (
                <div className="mt-3 overflow-x-auto border border-slate-200 rounded-xl shadow-xs bg-white">
                  <table className="w-full border-collapse text-xs text-left">
                    <thead className="bg-gradient-to-r from-slate-50 to-sky-50 border-b border-slate-200">
                      <tr>
                        {turn.tableData.headers.map((h, i) => (
                          <th key={i} className="py-2.5 px-3 font-mono font-bold text-sky-800 uppercase tracking-wider text-[10px]">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {turn.tableData.rows.map((row, rIdx) => (
                        <tr key={rIdx} className="hover:bg-sky-50/40 transition-colors">
                          {row.map((cell, cIdx) => (
                            <td key={cIdx} className="py-2 px-3 font-mono text-[11.5px] text-slate-800 font-semibold">{cell}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {turn.calculationExplanation && (
                <div className="mt-2 text-[11px] text-sky-800 bg-sky-50/80 border border-sky-200/80 p-2.5 rounded-lg flex items-center gap-2 font-mono font-medium shadow-2xs">
                  <span>📐</span>
                  <span><b>Deterministic Lineage:</b> {turn.calculationExplanation}</span>
                </div>
              )}
            </div>
          ))
        )}

        {isLoading && (
          <div className="flex items-center gap-3 p-4 bg-gradient-to-r from-sky-50 to-indigo-50 border border-sky-200 rounded-2xl text-[13px] font-bold text-sky-800 shadow-sm animate-pulse">
            <span className="w-3 h-3 rounded-full bg-sky-500 animate-ping" />
            Analyzing query with deterministic calculations &amp; neural synthesis…
          </div>
        )}
      </div>
    </div>
  );
};
