'use client';

import React, { useState, useMemo } from 'react';
import { ColumnSchema } from '@/lib/types';
import { Search, Download, ArrowUpDown, ArrowUp, ArrowDown, Table, Layers } from 'lucide-react';

interface DataTableExplorerProps {
  schemas: ColumnSchema[];
  rows: Record<string, any>[];
  fileName: string;
}

export const DataTableExplorer: React.FC<DataTableExplorerProps> = ({
  schemas,
  rows,
  fileName
}) => {
  const [viewMode, setViewMode] = useState<'business' | 'technical'>('business');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortCol, setSortCol] = useState<string>('');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 15;

  const filteredRows = useMemo(() => {
    if (!searchQuery.trim()) return rows;
    const q = searchQuery.toLowerCase().trim();
    const colKeys = schemas.map(s => s.technicalName);
    const results: Record<string, any>[] = [];

    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      let matched = false;
      for (let c = 0; c < colKeys.length; c++) {
        const val = r[colKeys[c]];
        if (val !== undefined && val !== null && String(val).toLowerCase().includes(q)) {
          matched = true;
          break;
        }
      }
      if (matched) {
        results.push(r);
        if (results.length >= 5000) break;
      }
    }
    return results;
  }, [rows, schemas, searchQuery]);

  const sortedRows = useMemo(() => {
    if (!sortCol) return filteredRows;
    return [...filteredRows].sort((a, b) => {
      const va = a[sortCol];
      const vb = b[sortCol];
      if (va === vb) return 0;
      if (va === null || va === undefined) return 1;
      if (vb === null || vb === undefined) return -1;

      const na = typeof va === 'number' ? va : parseFloat(va);
      const nb = typeof vb === 'number' ? vb : parseFloat(vb);
      if (!isNaN(na) && !isNaN(nb)) {
        return sortDir === 'asc' ? na - nb : nb - na;
      }
      return sortDir === 'asc'
        ? String(va).localeCompare(String(vb))
        : String(vb).localeCompare(String(va));
    });
  }, [filteredRows, sortCol, sortDir]);

  const totalPages = Math.max(1, Math.ceil(sortedRows.length / pageSize));
  const currentRows = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedRows.slice(start, start + pageSize);
  }, [sortedRows, currentPage, pageSize]);

  const handleSort = (colName: string) => {
    if (sortCol === colName) {
      setSortDir(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortCol(colName);
      setSortDir('asc');
    }
    setCurrentPage(1);
  };

  const handleExportCSV = () => {
    const cols = schemas.map(s => viewMode === 'business' ? s.displayName : s.technicalName);
    const techCols = schemas.map(s => s.technicalName);
    const csvLines = [
      cols.map(c => `"${c.replace(/"/g, '""')}"`).join(','),
      ...rows.map(r =>
        techCols.map(tc => {
          const val = String(r[tc] ?? '');
          return `"${val.replace(/"/g, '""')}"`;
        }).join(',')
      )
    ];

    const blob = new Blob([csvLines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cleaned_${fileName.replace(/\.[^/.]+$/, '')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const formatCellValue = (val: any, schema: ColumnSchema) => {
    if (val === undefined || val === null || val === '') {
      return <span className="text-slate-400 italic">null</span>;
    }
    const colLower = schema.technicalName.toLowerCase();
    const isIdOrKey = schema.logicalType === 'identifier' || colLower.includes('id') || colLower.includes('key') || colLower.includes('code') || colLower.includes('year') || colLower.includes('date');

    if (typeof val === 'number') {
      if (isIdOrKey) return String(val);
      return val.toLocaleString(undefined, { maximumFractionDigits: 2 });
    }
    return String(val);
  };

  return (
    <div className="flex flex-col gap-6 w-full max-w-7xl mx-auto animate-rise">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Table className="w-4 h-4 text-indigo-600" />
            <span className="font-mono text-xs uppercase tracking-wider text-indigo-700 font-extrabold">
              Tabular Record Explorer &amp; Inspection
            </span>
          </div>
          <h2 className="font-sans text-2xl sm:text-3xl font-extrabold bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 bg-clip-text text-transparent m-0">
            Interactive Data Explorer
          </h2>
          <p className="text-sm text-slate-600 mt-1.5 m-0 font-sans font-medium">
            Search, sort, and inspect cleaned records. Toggle between Humanized Business View and Technical View.
          </p>
        </div>

        {/* View Mode Toggle & CSV Export */}
        <div className="flex items-center gap-3 flex-none">
          <div className="pill-toggle flex-none">
            <button
              onClick={() => setViewMode('business')}
              className={viewMode === 'business' ? 'active' : ''}
            >
              Business View
            </button>
            <button
              onClick={() => setViewMode('technical')}
              className={viewMode === 'technical' ? 'active' : ''}
            >
              Technical View
            </button>
          </div>

          <button
            onClick={handleExportCSV}
            className="btn btn-primary text-xs flex items-center gap-1.5 shadow-lg shadow-sky-500/25 font-bold flex-none cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            Export CSV
          </button>
        </div>
      </div>

      {/* Table Container */}
      <div className="panel bg-white/95 backdrop-blur-md border border-slate-200 shadow-md flex flex-col gap-4 p-6 rounded-2xl">
        {/* Search Bar */}
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="relative flex-1 max-w-md">
            <input
              type="search"
              placeholder="Search across all columns and rows…"
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
              className="input text-xs pl-10 pr-4 py-2.5 border-slate-300 focus:border-sky-500 font-semibold"
            />
            <Search className="w-4 h-4 text-sky-600 absolute left-3.5 top-3" />
          </div>

          <span className="text-xs font-mono font-bold text-slate-500 bg-slate-100 px-3 py-1 rounded-full border border-slate-200">
            Showing {currentRows.length ? (currentPage - 1) * pageSize + 1 : 0}–{(currentPage - 1) * pageSize + currentRows.length} of {sortedRows.length.toLocaleString()} records
          </span>
        </div>

        {/* Table with Clear Spacing & Borders */}
        <div className="overflow-x-auto border border-slate-200 rounded-xl bg-white shadow-inner">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="bg-gradient-to-r from-slate-50 to-sky-50/60 border-b border-slate-200">
                <th className="py-3.5 px-4 text-center font-mono font-bold text-sky-700 uppercase text-[11px] w-14 whitespace-nowrap">
                  #
                </th>
                {schemas.map((schema) => {
                  const isSorted = sortCol === schema.technicalName;
                  const label = viewMode === 'business' ? schema.displayName : schema.technicalName;
                  const isNumeric = schema.physicalType === 'number' || schema.logicalType.startsWith('measure');

                  return (
                    <th
                      key={schema.technicalName}
                      onClick={() => handleSort(schema.technicalName)}
                      className={`py-3.5 px-4 font-mono font-bold text-[11px] uppercase tracking-wider cursor-pointer select-none transition-colors hover:text-sky-600 hover:bg-sky-50/50 whitespace-nowrap ${
                        isSorted ? 'text-sky-700 bg-sky-100/60' : 'text-slate-600'
                      } ${isNumeric ? 'text-right' : 'text-left'}`}
                      title={`Physical: ${schema.physicalType} | Semantic: ${schema.semanticRole}`}
                    >
                      <div className={`flex items-center gap-1.5 ${isNumeric ? 'justify-end' : 'justify-start'}`}>
                        <span>{label}</span>
                        {isSorted ? (
                          sortDir === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-sky-600" /> : <ArrowDown className="w-3.5 h-3.5 text-sky-600" />
                        ) : (
                          <ArrowUpDown className="w-3.5 h-3.5 opacity-30" />
                        )}
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {currentRows.length > 0 ? (
                currentRows.map((row, rowIdx) => (
                  <tr key={rowIdx} className="hover:bg-sky-50/40 transition-colors">
                    <td className="py-3 px-4 font-mono text-center text-slate-400 text-[11px] whitespace-nowrap bg-slate-50/50">
                      {(currentPage - 1) * pageSize + rowIdx + 1}
                    </td>
                    {schemas.map((schema) => {
                      const val = row[schema.technicalName];
                      const isNumeric = schema.physicalType === 'number' || schema.logicalType.startsWith('measure');
                      const isDate = schema.physicalType === 'date' || schema.logicalType === 'date';

                      return (
                        <td
                          key={schema.technicalName}
                          className={`py-3 px-4 font-mono text-[12px] whitespace-nowrap ${
                            isNumeric
                              ? 'text-right font-bold text-slate-900'
                              : isDate
                              ? 'text-sky-700 font-semibold'
                              : 'text-slate-800'
                          }`}
                        >
                          {formatCellValue(val, schema)}
                        </td>
                      );
                    })}
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={schemas.length + 1} className="p-10 text-center text-slate-500 font-sans font-medium">
                    No matching records found for &quot;{searchQuery}&quot;.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <div className="flex items-center justify-between pt-2 text-xs text-slate-600 font-mono font-bold">
          <span>Page {currentPage} of {totalPages}</span>
          <div className="flex items-center gap-2">
            <button
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage(p => p - 1)}
              className="btn btn-secondary text-xs px-4 py-2 font-bold cursor-pointer disabled:opacity-40"
            >
              ← Prev
            </button>
            <button
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage(p => p + 1)}
              className="btn btn-secondary text-xs px-4 py-2 font-bold cursor-pointer disabled:opacity-40"
            >
              Next →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
