'use client';

import React from 'react';
import { KpiCardData } from '@/lib/types';
import {
  Sparkles,
  TrendingUp,
  TrendingDown,
  Info,
  Activity,
  DollarSign,
  ShoppingCart,
  Users,
  Target,
  BarChart3,
  Layers,
  Zap
} from 'lucide-react';

interface KpiCardProps {
  kpi: KpiCardData;
  index?: number;
  onAskAI?: (label: string) => void;
  onClick?: () => void;
}

const KPI_COLOR_THEMES = [
  {
    themeClass: 'kpi-cyan',
    iconBg: 'bg-gradient-to-br from-cyan-500/20 to-sky-500/20 text-cyan-700 border-cyan-300',
    accentText: 'text-sky-600',
    sparkleColor: 'text-cyan-500',
    askHoverBg: 'hover:bg-cyan-600',
    askBorder: 'border-cyan-300 bg-cyan-50 text-cyan-800',
    icon: Activity
  },
  {
    themeClass: 'kpi-emerald',
    iconBg: 'bg-gradient-to-br from-emerald-500/20 to-teal-500/20 text-emerald-700 border-emerald-300',
    accentText: 'text-emerald-600',
    sparkleColor: 'text-emerald-500',
    askHoverBg: 'hover:bg-emerald-600',
    askBorder: 'border-emerald-300 bg-emerald-50 text-emerald-800',
    icon: DollarSign
  },
  {
    themeClass: 'kpi-purple',
    iconBg: 'bg-gradient-to-br from-purple-500/20 to-indigo-500/20 text-purple-700 border-purple-300',
    accentText: 'text-purple-600',
    sparkleColor: 'text-purple-500',
    askHoverBg: 'hover:bg-purple-600',
    askBorder: 'border-purple-300 bg-purple-50 text-purple-800',
    icon: Target
  },
  {
    themeClass: 'kpi-amber',
    iconBg: 'bg-gradient-to-br from-amber-500/20 to-orange-500/20 text-amber-700 border-amber-300',
    accentText: 'text-amber-600',
    sparkleColor: 'text-amber-500',
    askHoverBg: 'hover:bg-amber-600',
    askBorder: 'border-amber-300 bg-amber-50 text-amber-800',
    icon: Zap
  },
  {
    themeClass: 'kpi-rose',
    iconBg: 'bg-gradient-to-br from-rose-500/20 to-pink-500/20 text-rose-700 border-rose-300',
    accentText: 'text-rose-600',
    sparkleColor: 'text-rose-500',
    askHoverBg: 'hover:bg-rose-600',
    askBorder: 'border-rose-300 bg-rose-50 text-rose-800',
    icon: BarChart3
  },
  {
    themeClass: 'kpi-blue',
    iconBg: 'bg-gradient-to-br from-blue-500/20 to-indigo-500/20 text-blue-700 border-blue-300',
    accentText: 'text-blue-600',
    sparkleColor: 'text-blue-500',
    askHoverBg: 'hover:bg-blue-600',
    askBorder: 'border-blue-300 bg-blue-50 text-blue-800',
    icon: ShoppingCart
  }
];

export const KpiCard: React.FC<KpiCardProps> = ({ kpi, index = 0, onAskAI, onClick }) => {
  const isUp = kpi.isPositive !== false;
  const theme = KPI_COLOR_THEMES[index % KPI_COLOR_THEMES.length];
  const IconComponent = theme.icon;

  return (
    <div
      className={`kpi ${theme.themeClass} group cursor-pointer flex flex-col justify-between`}
      onClick={onClick}
    >
      {/* Card Header with Label & Icon */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className={`w-7 h-7 rounded-lg border flex items-center justify-center shadow-xs ${theme.iconBg}`}>
            <IconComponent className="w-4 h-4" />
          </div>
          <div className="flex items-center gap-1.5">
            <span className="font-mono text-[11px] font-bold tracking-wide uppercase text-[#0A1128]">
              {kpi.label}
            </span>
            {kpi.how && (
              <span
                title={kpi.how}
                className="flex-none text-[10px] w-4 h-4 border border-sky-200 inline-flex items-center justify-center text-sky-600 cursor-help rounded-full bg-sky-50 hover:bg-sky-100 transition-colors"
                onClick={(e) => e.stopPropagation()}
              >
                <Info className="w-2.5 h-2.5" />
              </span>
            )}
          </div>
        </div>

        {onAskAI && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onAskAI(`Explain how ${kpi.label} is performing`);
            }}
            className={`opacity-0 group-hover:opacity-100 text-[10.5px] px-2.5 py-1 rounded-full transition-all flex items-center gap-1 font-bold border shadow-xs cursor-pointer ${theme.askBorder} ${theme.askHoverBg} hover:text-white`}
            title={`Ask AI about ${kpi.label}`}
          >
            <Sparkles className="w-2.5 h-2.5" />
            Ask AI
          </button>
        )}
      </div>

      {/* Main Metric Value */}
      <div className="my-2.5 font-sans text-[32px] sm:text-[34px] text-[#0A1128] font-bold tracking-tight leading-none">
        {kpi.value}
      </div>

      {/* Card Footer with Trend Delta & Note */}
      <div className="flex items-center justify-between text-xs pt-2.5 border-t border-black/5">
        {kpi.delta ? (
          <span
            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold shadow-2xs ${
              isUp
                ? 'bg-emerald-100/90 text-emerald-800 border border-emerald-300'
                : 'bg-rose-100/90 text-rose-800 border border-rose-300'
            }`}
          >
            {isUp ? <TrendingUp className="w-3 h-3 text-emerald-600" /> : <TrendingDown className="w-3 h-3 text-rose-600" />}
            {kpi.delta}
          </span>
        ) : (
          <span className="text-[11.5px] text-[#475569] font-medium flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-sky-500 inline-block" />
            {kpi.note || 'Active Metric'}
          </span>
        )}

        {kpi.delta && kpi.note && (
          <span className="text-[10.5px] text-[#64748B] font-mono truncate max-w-[130px]" title={kpi.note}>
            {kpi.note}
          </span>
        )}
      </div>
    </div>
  );
};

interface KpiGridProps {
  kpis: KpiCardData[];
  onAskAI?: (metricLabel: string) => void;
  onKpiClick?: (kpi: KpiCardData) => void;
}

export const KpiGrid: React.FC<KpiGridProps> = ({ kpis, onAskAI, onKpiClick }) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {kpis.map((kpi, index) => (
        <KpiCard
          key={kpi.id || index}
          kpi={kpi}
          index={index}
          onAskAI={onAskAI}
          onClick={() => onKpiClick && onKpiClick(kpi)}
        />
      ))}
    </div>
  );
};
