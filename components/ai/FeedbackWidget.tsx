'use client';

import React, { useState } from 'react';
import { recordInsightFeedback } from '@/lib/ai/feedback/feedbackStore';
import { ThumbsUp, ThumbsDown, Check } from 'lucide-react';

interface FeedbackWidgetProps {
  insightId: string;
  type: 'OBSERVATION' | 'RECOMMENDATION' | 'ASK_DATA';
}

export const FeedbackWidget: React.FC<FeedbackWidgetProps> = ({ insightId, type }) => {
  const [voted, setVoted] = useState<'UP' | 'DOWN' | null>(null);

  const handleVote = (rating: 'THUMBS_UP' | 'THUMBS_DOWN') => {
    setVoted(rating === 'THUMBS_UP' ? 'UP' : 'DOWN');
    recordInsightFeedback({
      insightId,
      type,
      rating,
      timestamp: new Date().toISOString()
    });
  };

  if (voted) {
    return (
      <div className="inline-flex items-center gap-1.5 text-[11px] font-mono text-[#059669] bg-[#DCFCE7] px-2 py-0.5 rounded-md">
        <Check className="w-3 h-3" /> Feedback noted
      </div>
    );
  }

  return (
    <div className="inline-flex items-center gap-1.5 bg-[#F8FAFC] border border-[#E2E8F0] px-2 py-0.5 rounded-md text-[11px] text-[#64748B]">
      <span className="font-sans text-[10px] text-[#94A3B8]">Helpful?</span>
      <button
        onClick={() => handleVote('THUMBS_UP')}
        className="hover:text-[#0284C7] p-0.5 rounded transition-colors"
        title="Yes, accurate insight"
      >
        <ThumbsUp className="w-3 h-3" />
      </button>
      <button
        onClick={() => handleVote('THUMBS_DOWN')}
        className="hover:text-[#BE123C] p-0.5 rounded transition-colors"
        title="Needs improvement"
      >
        <ThumbsDown className="w-3 h-3" />
      </button>
    </div>
  );
};
