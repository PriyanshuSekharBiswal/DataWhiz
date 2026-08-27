// Feedback & Human-in-the-Loop Review Store: Captures user edits and ratings for training/evaluation

export interface ColumnCorrection {
  technicalName: string;
  originalInference: string;
  userCorrection: string;
  domain?: string;
  timestamp: string;
  status: 'ACCEPTED' | 'EDITED' | 'REJECTED';
}

export interface InsightFeedback {
  insightId: string;
  type: 'OBSERVATION' | 'RECOMMENDATION' | 'ASK_DATA';
  rating: 'THUMBS_UP' | 'THUMBS_DOWN';
  userComment?: string;
  timestamp: string;
}

const columnCorrections: ColumnCorrection[] = [];
const insightFeedbacks: InsightFeedback[] = [];

export function recordColumnCorrection(correction: ColumnCorrection): void {
  columnCorrections.push(correction);
}

export function recordInsightFeedback(feedback: InsightFeedback): void {
  insightFeedbacks.push(feedback);
}

export function getStoredCorrections(): ColumnCorrection[] {
  return [...columnCorrections];
}

export function getStoredFeedbacks(): InsightFeedback[] {
  return [...insightFeedbacks];
}
