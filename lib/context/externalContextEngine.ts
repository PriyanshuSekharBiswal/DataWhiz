// External Context Engine: Optional Extension Point for Industry News & Macroeconomic Context
// Strictly maintains separation between uploaded dataset truth and external reference data

import { DatasetUnderstandingReport, DatasetContext } from '@/lib/types';

export interface ExternalArticle {
  title: string;
  source: string;
  url?: string;
  publishedAt?: string;
  snippet: string;
  relevanceScore: number;
}

export interface ExternalContextResult {
  hasExternalContext: boolean;
  query: string;
  domain: string;
  articles: ExternalArticle[];
  status: 'AVAILABLE' | 'NO_MATCH' | 'DISABLED';
  provenance: {
    source: string;
    retrievedAt: string;
    notice: string;
  };
}

/**
 * Builds external context queries based on authoritative DatasetUnderstandingReport
 * without contaminating or mutating core dataset observations.
 */
export function queryExternalContext(
  context: DatasetContext,
  report: DatasetUnderstandingReport
): ExternalContextResult {
  const domain = report.primaryDomain || 'General Business';
  const query = `${domain} market trends and benchmark statistics`;

  return {
    hasExternalContext: false,
    query,
    domain,
    articles: [],
    status: 'NO_MATCH',
    provenance: {
      source: 'DataWhiz External Market Gateway',
      retrievedAt: new Date().toISOString(),
      notice: 'External context is maintained independently of verified dataset calculations.'
    }
  };
}
