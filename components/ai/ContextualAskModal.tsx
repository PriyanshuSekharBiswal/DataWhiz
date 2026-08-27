'use client';

import React, { useState } from 'react';
import { AskDataTurn } from '@/lib/types';
import { Sparkles, X, Send } from 'lucide-react';
import { ChartFigure } from '@/components/charts/ChartFigure';

interface ContextualAskModalProps {
  isOpen: boolean;
  onClose: () => void;
  contextSubject: string;
  initialQuery?: string;
  onAsk: (query: string) => Promise<AskDataTurn> | AskDataTurn;
}

export const ContextualAskModal: React.FC<ContextualAskModalProps> = ({
  isOpen,
  onClose,
  contextSubject,
  initialQuery = '',
  onAsk
}) => {
  const [query, setQuery] = useState(initialQuery);
  const [answer, setAnswer] = useState<AskDataTurn | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  const handleAsk = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim() || isLoading) return;
    setIsLoading(true);
    try {
      const res = await onAsk(query.trim());
      setAnswer(res);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
      <div className="bg-[var(--color-surface)] border-2 border-[var(--color-accent)] w-full max-w-2xl p-6 shadow-2xl flex flex-col gap-4">
        {/* Modal Header */}
        <div className="flex items-center justify-between gap-4 pb-3 border-b-2 border-[var(--color-divider)]">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-[var(--color-accent)]" />
            <div>
              <h3 className="font-extrabold text-lg text-[var(--color-text)] m-0">
                Contextual AI Analyst
              </h3>
              <span className="text-[11px] text-[var(--color-neutral-600)]">
                Focus: <strong>{contextSubject}</strong>
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-[var(--color-neutral-600)] hover:text-[var(--color-text)] p-1"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Input Form */}
        <form onSubmit={handleAsk} className="flex gap-2">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={`Ask anything regarding ${contextSubject}...`}
            className="input text-sm flex-1 font-medium"
            autoFocus
          />
          <button
            type="submit"
            disabled={!query.trim() || isLoading}
            className="btn btn-primary px-4 flex items-center gap-1 text-xs"
          >
            <Send className="w-3.5 h-3.5" />
            Ask AI
          </button>
        </form>

        {/* Result Container */}
        {isLoading ? (
          <div className="p-8 text-center text-xs text-[var(--color-neutral-600)] flex items-center justify-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[var(--color-accent)] animate-ping" />
            Running verified mathematical computation…
          </div>
        ) : answer ? (
          <div className="p-4 bg-[var(--color-bg)] border border-[var(--color-divider-subtle)] flex flex-col gap-3 max-h-[400px] overflow-y-auto">
            <p className="text-xs leading-relaxed text-[var(--color-text)] m-0 whitespace-pre-wrap">
              {answer.text}
            </p>

            {answer.chart && (
              <div className="mt-2">
                <ChartFigure spec={answer.chart} />
              </div>
            )}

            {answer.calculationExplanation && (
              <div className="text-[10px] text-[var(--color-neutral-600)] pt-2 border-t border-[var(--color-divider-subtle)] italic">
                Math lineage: {answer.calculationExplanation}
              </div>
            )}
          </div>
        ) : (
          <div className="p-4 text-center text-xs text-[var(--color-neutral-500)] italic">
            Enter your question above to query this specific component.
          </div>
        )}
      </div>
    </div>
  );
};
