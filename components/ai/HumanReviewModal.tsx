'use client';

import React, { useState } from 'react';
import { ColumnSchema } from '@/lib/types';
import { recordColumnCorrection } from '@/lib/ai/feedback/feedbackStore';
import { Sparkles, Check, Edit2, AlertCircle, X } from 'lucide-react';

interface HumanReviewModalProps {
  schemas: ColumnSchema[];
  isOpen: boolean;
  onClose: () => void;
  onUpdateSchemaName: (techName: string, newDisplayName: string) => void;
}

export const HumanReviewModal: React.FC<HumanReviewModalProps> = ({
  schemas,
  isOpen,
  onClose,
  onUpdateSchemaName
}) => {
  const [editingCol, setEditingCol] = useState<string | null>(null);
  const [tempName, setTempName] = useState('');

  if (!isOpen) return null;

  const lowConfidenceCols = schemas.filter(s => (s.confidence || 1) < 0.85);
  const targetCols = lowConfidenceCols.length > 0 ? lowConfidenceCols : schemas.slice(0, 10);

  const handleSaveEdit = (techName: string) => {
    if (!tempName.trim()) return;
    onUpdateSchemaName(techName, tempName.trim());
    recordColumnCorrection({
      technicalName: techName,
      originalInference: schemas.find(s => s.technicalName === techName)?.displayName || techName,
      userCorrection: tempName.trim(),
      timestamp: new Date().toISOString(),
      status: 'EDITED'
    });
    setEditingCol(null);
    setTempName('');
  };

  const handleAccept = (schema: ColumnSchema) => {
    recordColumnCorrection({
      technicalName: schema.technicalName,
      originalInference: schema.displayName,
      userCorrection: schema.displayName,
      timestamp: new Date().toISOString(),
      status: 'ACCEPTED'
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-white border border-[#E2E8F0] shadow-2xl rounded-2xl max-w-2xl w-full flex flex-col max-h-[85vh] overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-[#E2E8F0] flex items-center justify-between bg-[#F8FAFC]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#E0F2FE] flex items-center justify-center text-[#0284C7]">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-sans font-bold text-lg text-[#0A1128] m-0">
                Human-in-the-Loop Semantic Review
              </h3>
              <p className="text-xs text-[#64748B] mt-0.5 m-0 font-sans">
                Review and refine AI-inferred column interpretations. Corrections feed the continuous learning loop.
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-[#64748B] hover:text-[#0A1128] p-1.5 rounded-lg hover:bg-[#E2E8F0] transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* List of Columns to Review */}
        <div className="p-5 overflow-y-auto flex flex-col gap-4">
          <div className="callout bg-[#F0F9FF] border border-[#BAE6FD] p-3 rounded-xl flex items-start gap-2.5 text-xs text-[#0369A1]">
            <AlertCircle className="w-4 h-4 flex-none mt-0.5 text-[#0284C7]" />
            <span>
              High-confidence inferences (&gt;=85%) are automatically applied. Review any technical abbreviations or rename them to suit your organization's exact naming conventions.
            </span>
          </div>

          <div className="divide-y divide-[#F1F5F9] border border-[#E2E8F0] rounded-xl overflow-hidden bg-white shadow-inner">
            {targetCols.map((col) => {
              const isEditing = editingCol === col.technicalName;
              const confPct = Math.round((col.confidence || 0.9) * 100);

              return (
                <div key={col.technicalName} className="p-4 flex items-center justify-between gap-4 hover:bg-[#F8FAFC] transition-colors">
                  <div className="flex flex-col gap-1 min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs text-[#64748B] bg-[#F1F5F9] px-2 py-0.5 rounded">
                        {col.technicalName}
                      </span>
                      <span className={`badge text-[9px] ${confPct >= 85 ? 'bg-[#DCFCE7] text-[#15803D]' : 'bg-[#FEF3C7] text-[#B45309]'}`}>
                        {confPct}% confidence
                      </span>
                    </div>

                    {isEditing ? (
                      <div className="flex items-center gap-2 mt-2">
                        <input
                          type="text"
                          value={tempName}
                          onChange={(e) => setTempName(e.target.value)}
                          placeholder={col.displayName}
                          className="input text-xs py-1.5 px-3 flex-1 border-[#0284C7] focus:ring-1 focus:ring-[#0284C7]"
                          autoFocus
                        />
                        <button
                          onClick={() => handleSaveEdit(col.technicalName)}
                          className="btn btn-primary text-xs px-3 py-1.5 flex items-center gap-1"
                        >
                          <Check className="w-3.5 h-3.5" /> Save
                        </button>
                        <button
                          onClick={() => setEditingCol(null)}
                          className="btn btn-secondary text-xs px-2.5 py-1.5"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <div className="font-sans font-bold text-sm text-[#0A1128] truncate mt-0.5">
                        {col.displayName}
                      </div>
                    )}

                    <div className="text-xs text-[#64748B] truncate">
                      {col.businessMeaning || 'Mapped via semantic intelligence engine.'}
                    </div>
                  </div>

                  {!isEditing && (
                    <div className="flex items-center gap-2 flex-none">
                      <button
                        onClick={() => {
                          setEditingCol(col.technicalName);
                          setTempName(col.displayName);
                        }}
                        className="btn btn-secondary text-xs px-2.5 py-1.5 flex items-center gap-1.5 text-[#475569] hover:text-[#0A1128]"
                      >
                        <Edit2 className="w-3.5 h-3.5" /> Edit
                      </button>
                      <button
                        onClick={() => handleAccept(col)}
                        className="btn btn-secondary text-xs px-2.5 py-1.5 flex items-center gap-1.5 text-[#15803D] hover:bg-[#DCFCE7]"
                      >
                        <Check className="w-3.5 h-3.5" /> Accept
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[#E2E8F0] flex items-center justify-between bg-[#F8FAFC]">
          <span className="text-xs text-[#64748B] font-mono">
            {targetCols.length} columns displayed for verification
          </span>
          <button onClick={onClose} className="btn btn-primary text-xs px-5 py-2">
            Done Reviewing
          </button>
        </div>
      </div>
    </div>
  );
};
