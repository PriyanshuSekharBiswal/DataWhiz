'use client';

import React, { useState } from 'react';
import { ColumnSchema, BusinessGlossaryNode } from '@/lib/types';
import { Search, BookOpen, Layers, CheckCircle2, AlertCircle, Sparkles, Tag, Database } from 'lucide-react';
import { HumanReviewModal } from '@/components/ai/HumanReviewModal';

interface DataDictionaryViewProps {
  schemas: ColumnSchema[];
  glossary: BusinessGlossaryNode[];
  onUpdateSchemaName?: (techName: string, newDisplayName: string) => void;
}

function getRoleBadge(role: string) {
  switch (role) {
    case 'primary_measure':
    case 'measure':
      return 'bg-emerald-100 text-emerald-800 border-emerald-300';
    case 'dimension':
    case 'categorical':
      return 'bg-sky-100 text-sky-800 border-sky-300';
    case 'timestamp':
    case 'date':
      return 'bg-purple-100 text-purple-800 border-purple-300';
    case 'primary_key':
    case 'identifier':
      return 'bg-slate-100 text-slate-700 border-slate-300';
    default:
      return 'bg-amber-100 text-amber-800 border-amber-300';
  }
}

export const DataDictionaryView: React.FC<DataDictionaryViewProps> = ({
  schemas,
  glossary,
  onUpdateSchemaName
}) => {
  const [search, setSearch] = useState('');
  const [selectedRole, setSelectedRole] = useState<string>('all');
  const [isReviewOpen, setIsReviewOpen] = useState(false);
  const [localSchemas, setLocalSchemas] = useState(schemas);

  const handleUpdate = (techName: string, newDisplayName: string) => {
    setLocalSchemas(prev => prev.map(s => s.technicalName === techName ? { ...s, displayName: newDisplayName, confidence: 1.0 } : s));
    if (onUpdateSchemaName) onUpdateSchemaName(techName, newDisplayName);
  };

  const filteredSchemas = localSchemas.filter(s => {
    const matchesSearch =
      s.technicalName.toLowerCase().includes(search.toLowerCase()) ||
      s.displayName.toLowerCase().includes(search.toLowerCase()) ||
      s.businessMeaning.toLowerCase().includes(search.toLowerCase());
    const matchesRole = selectedRole === 'all' || s.semanticRole === selectedRole;
    return matchesSearch && matchesRole;
  });

  const roles = Array.from(new Set(localSchemas.map(s => s.semanticRole)));

  return (
    <div className="flex flex-col gap-8 w-full max-w-7xl mx-auto animate-rise">
      {/* Top Header & Search */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <BookOpen className="w-4 h-4 text-sky-600" />
            <span className="font-mono text-xs uppercase tracking-wider text-sky-700 font-extrabold">
              Semantic Schema &amp; Vocabulary Translation
            </span>
          </div>
          <h2 className="font-sans text-2xl sm:text-3xl font-extrabold bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 bg-clip-text text-transparent m-0">
            Automated Data Dictionary &amp; Business Glossary
          </h2>
          <p className="text-sm text-slate-600 mt-1.5 m-0 font-sans font-medium">
            Deciphered technical column codes into natural business nomenclature with AI confidence ratings.
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <button
            onClick={() => setIsReviewOpen(true)}
            className="btn btn-secondary text-xs px-4 py-2 flex items-center gap-1.5 border-sky-300 text-sky-700 hover:bg-sky-50 font-bold shadow-xs"
          >
            <Sparkles className="w-3.5 h-3.5 text-sky-500" /> Review &amp; Edit Names
          </button>

          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3.5 top-1/2 -translate-y-1/2 text-sky-600" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search column names, meaning..."
              className="input pl-9 py-2 text-xs w-64 border-slate-300 focus:border-sky-500 font-semibold"
            />
          </div>

          <select
            value={selectedRole}
            onChange={(e) => setSelectedRole(e.target.value)}
            className="input py-2 text-xs w-48 border-slate-300 focus:border-sky-500 font-semibold cursor-pointer"
          >
            <option value="all">All Semantic Roles</option>
            {roles.map(r => (
              <option key={r} value={r}>{r.replace(/_/g, ' ').toUpperCase()}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Business Glossary Hierarchy */}
      {glossary.length > 0 && (
        <div className="panel bg-white/95 backdrop-blur-md border border-slate-200 shadow-md flex flex-col gap-4 p-6 rounded-2xl">
          <div className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-indigo-600" />
            <h3 className="font-sans text-lg font-bold text-slate-900 m-0">
              Hierarchical Business Concepts &amp; Domain Map
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {glossary.map((node, i) => (
              <div key={i} className="p-4 bg-gradient-to-br from-slate-50 to-sky-50/30 rounded-xl border border-slate-200 flex flex-col gap-2 shadow-2xs">
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-sm text-sky-800">
                    {node.category}
                  </span>
                </div>
                <p className="text-xs text-slate-600 m-0 leading-relaxed font-medium">
                  {node.description}
                </p>
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {node.columns.map((col, cIdx) => (
                    <span key={cIdx} className="badge text-[10px] bg-sky-50 text-sky-800 border-sky-200 shadow-2xs font-semibold">
                      {col}
                    </span>
                  ))}
                </div>

                {node.subcategories && (
                  <div className="pl-3 border-l-2 border-indigo-200 mt-2 flex flex-col gap-2">
                    {node.subcategories.map((sub, sIdx) => (
                      <div key={sIdx} className="flex flex-col gap-1">
                        <span className="font-bold text-xs text-slate-800">
                          ↳ {sub.category}
                        </span>
                        <div className="flex flex-wrap gap-1">
                          {sub.columns.map((sc, scIdx) => (
                            <span key={scIdx} className="badge text-[9.5px] bg-white text-slate-700 border-slate-200 font-mono">
                              {sc}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Column Dictionary Table */}
      <div className="overflow-x-auto border border-slate-200 rounded-2xl bg-white shadow-md">
        <table className="w-full border-collapse text-left">
          <thead>
            <tr className="bg-gradient-to-r from-slate-50 to-sky-50/60 border-b border-slate-200">
              <th className="py-3.5 px-4 font-mono font-bold text-sky-700 text-[11px] uppercase tracking-wider whitespace-nowrap">Human-Friendly Display Name</th>
              <th className="py-3.5 px-4 font-mono font-bold text-sky-700 text-[11px] uppercase tracking-wider whitespace-nowrap">Technical Source Name</th>
              <th className="py-3.5 px-4 font-mono font-bold text-sky-700 text-[11px] uppercase tracking-wider whitespace-nowrap">Semantic Role</th>
              <th className="py-3.5 px-4 font-mono font-bold text-sky-700 text-[11px] uppercase tracking-wider whitespace-nowrap">Logical Type</th>
              <th className="py-3.5 px-4 font-mono font-bold text-sky-700 text-[11px] uppercase tracking-wider whitespace-nowrap">Business Meaning</th>
              <th className="py-3.5 px-4 font-mono font-bold text-sky-700 text-[11px] uppercase tracking-wider whitespace-nowrap">Confidence</th>
              <th className="py-3.5 px-4 font-mono font-bold text-sky-700 text-[11px] uppercase tracking-wider whitespace-nowrap">Usage in Analysis</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredSchemas.map((col, idx) => (
              <tr key={idx} className="hover:bg-sky-50/30 transition-colors">
                <td className="py-3 px-4 font-sans font-bold text-sm text-[#0A1128] whitespace-nowrap">
                  {col.displayName}
                </td>
                <td className="py-3 px-4 font-mono text-xs text-sky-700 whitespace-nowrap font-semibold">
                  {col.technicalName}
                </td>
                <td className="py-3 px-4 whitespace-nowrap">
                  <span className={`badge text-[10px] font-extrabold uppercase ${getRoleBadge(col.semanticRole)}`}>
                    {col.semanticRole.replace(/_/g, ' ')}
                  </span>
                </td>
                <td className="py-3 px-4 text-xs font-mono text-slate-600 whitespace-nowrap font-medium">
                  {col.logicalType}
                </td>
                <td className="py-3 px-4 text-xs text-slate-700 max-w-sm leading-relaxed font-medium">
                  {col.businessMeaning || `Field '${col.displayName}' representing business classification.`}
                </td>
                <td className="py-3 px-4 whitespace-nowrap">
                  <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-[#0A1128]">
                    {col.confidence >= 0.85 ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-amber-500" />
                    )}
                    {Math.round(col.confidence * 100)}%
                  </div>
                </td>
                <td className="py-3 px-4 text-xs font-mono text-slate-500 whitespace-nowrap font-medium">
                  {col.possibleUsage.slice(0, 2).join(', ') || 'Exploratory Analysis'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <HumanReviewModal
        schemas={localSchemas}
        isOpen={isReviewOpen}
        onClose={() => setIsReviewOpen(false)}
        onUpdateSchemaName={handleUpdate}
      />
    </div>
  );
};
