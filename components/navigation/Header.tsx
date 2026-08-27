'use client';

import React from 'react';
import { DashboardTabConfig } from '@/lib/types';
import { RefreshCw, Filter, Calendar, RotateCcw } from 'lucide-react';

interface HeaderProps {
  fileName: string;
  rowCount: number;
  colCount: number;
  domainLabel: string;
  scopeNote: string;
  tabs: DashboardTabConfig[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
  onResetData: () => void;
  filterCols?: { name: string; options: string[]; selected: string }[];
  onFilterChange?: (colName: string, value: string) => void;
  period?: string;
  onPeriodChange?: (period: string) => void;
  onResetFilters?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  fileName,
  rowCount,
  colCount,
  domainLabel,
  scopeNote,
  tabs,
  activeTab,
  onTabChange,
  onResetData,
  filterCols = [],
  onFilterChange,
  period = 'all',
  onPeriodChange,
  onResetFilters
}) => {
  return (
    <header className="flex flex-col flex-none px-4 sm:px-6 pt-3 bg-[var(--color-bg)] z-20">
      {/* Top Bar */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <div className="w-[28px] h-[28px] rounded-full bg-gradient-to-br from-[var(--gold)] to-[#a97c22] flex items-center justify-center shadow-inner text-[#153832] font-sans font-black text-base select-none ring-2 ring-[#153832]/30">
            D
          </div>
          <h1 className="font-sans font-bold text-xl tracking-tight text-[var(--pine)] m-0">
            Auto Data AI
          </h1>
          <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-[var(--teal)] hidden md:inline ml-2 pl-2 border-l border-[var(--line)]">
            Intelligence Platform
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onResetData}
            className="btn btn-ghost text-xs flex items-center gap-1.5"
            title="Upload or ingest a new dataset"
          >
            <RefreshCw className="w-3 h-3" />
            New File
          </button>
        </div>
      </div>

      <div className="h-0.5 bg-[var(--color-text)] mt-2" />

      {/* Dataset Metadata Bar */}
      <div className="flex items-baseline gap-4 flex-wrap py-2 text-[11px] uppercase tracking-wider font-semibold text-[var(--color-neutral-700)]">
        <span className="font-bold text-[var(--color-text)]">{fileName}</span>
        <span>{rowCount.toLocaleString()} rows</span>
        <span>{colCount} columns</span>
        <span className="text-[var(--color-accent-700)] font-bold">{domainLabel}</span>
        <span className="text-[var(--color-neutral-500)]">{scopeNote}</span>
      </div>

      <div className="h-0.5 bg-[var(--color-text)]" />

      {/* Navigation Tabs & Filter Bar */}
      <nav className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b-2 border-[var(--color-divider)] pt-1 overflow-x-auto">
        <div className="flex items-center gap-1 flex-nowrap">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => onTabChange(t.id)}
              className={`cursor-pointer bg-transparent border-none py-2 px-3 font-extrabold text-xs tracking-wider uppercase transition-colors whitespace-nowrap border-b-2 -mb-[2px] ${
                activeTab === t.id
                  ? 'border-b-[var(--color-accent)] text-[var(--color-text)] font-extrabold'
                  : 'border-b-transparent text-[var(--color-neutral-600)] hover:text-[var(--color-text)]'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Global Filter Controls & Period Selectors */}
        {(filterCols.length > 0 || onPeriodChange) && (
          <div className="flex items-center gap-3 flex-wrap py-1 text-xs">
            {filterCols.map((fc) => (
              <label key={fc.name} className="flex items-center gap-1.5 uppercase tracking-wider text-[10px] font-bold text-[var(--color-neutral-600)]">
                {fc.name}:
                <select
                  value={fc.selected}
                  onChange={(e) => onFilterChange && onFilterChange(fc.name, e.target.value)}
                  className="input py-0.5 px-2 text-xs w-28 normal-case font-medium"
                >
                  <option value="">All</option>
                  {fc.options.map((opt) => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              </label>
            ))}

            {onPeriodChange && (
              <div className="flex items-center gap-1.5">
                <span className="uppercase tracking-wider text-[10px] font-bold text-[var(--color-neutral-600)]">
                  Period:
                </span>
                <div className="flex gap-[1px]">
                  {[
                    { id: 'all', label: 'All' },
                    { id: 'last1', label: 'Latest' },
                    { id: 'last4', label: 'Last 4' },
                    { id: 'last8', label: 'Last 8' }
                  ].map((p) => (
                    <button
                      key={p.id}
                      onClick={() => onPeriodChange(p.id)}
                      className={`text-[10px] px-2 py-0.5 font-bold uppercase transition-colors ${
                        period === p.id
                          ? 'bg-[var(--color-accent)] text-white'
                          : 'bg-[var(--color-surface)] border border-[var(--color-neutral-400)] text-[var(--color-neutral-700)] hover:bg-[var(--color-surface-hover)]'
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {onResetFilters && (
              <button
                onClick={onResetFilters}
                className="text-[10px] uppercase font-bold text-[var(--color-accent-700)] hover:text-[var(--color-accent)] flex items-center gap-0.5"
                title="Reset all filters"
              >
                <RotateCcw className="w-2.5 h-2.5" />
                Reset
              </button>
            )}
          </div>
        )}
      </nav>
    </header>
  );
};
