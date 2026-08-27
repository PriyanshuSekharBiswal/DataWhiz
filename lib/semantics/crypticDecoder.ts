// Cryptic Variable Decoder Engine: Translates technical column tokens into business concepts with explicit uncertainty tracking

import { CrypticInterpretation } from '@/lib/types';

interface TokenRule {
  token: string;
  meaning: string;
  category: 'channel' | 'media_type' | 'metric_type' | 'qualifier' | 'sub_type';
}

const TOKEN_DICTIONARY: TokenRule[] = [
  // Channel / Source prefixes
  { token: 'dtv', meaning: 'Media & Advertising', category: 'channel' },
  { token: 'dig', meaning: 'Digital', category: 'channel' },
  { token: 'srh', meaning: 'Search Ads', category: 'channel' },
  { token: 'soc', meaning: 'Social Media', category: 'channel' },
  { token: 'ctv', meaning: 'Connected TV', category: 'channel' },
  { token: 'olv', meaning: 'Online Video', category: 'channel' },
  { token: 'dis', meaning: 'Display Ads', category: 'channel' },
  { token: 'ooh', meaning: 'Out of Home (OOH)', category: 'channel' },
  { token: 'oem', meaning: 'OEM / Partner', category: 'channel' },
  { token: 'aud', meaning: 'Digital Audio', category: 'channel' },
  { token: 'eml', meaning: 'Email Marketing', category: 'channel' },
  { token: 'ntv', meaning: 'Native Ads', category: 'channel' },
  { token: 'dmt', meaning: 'Direct Mail / Marketing', category: 'channel' },
  { token: 'dml', meaning: 'Direct Mail', category: 'channel' },
  { token: 'afi', meaning: 'Affiliate Marketing', category: 'channel' },
  { token: 'spt', meaning: 'Sports / Sponsorship', category: 'channel' },
  { token: 'ent', meaning: 'Entertainment', category: 'channel' },
  { token: 'new', meaning: 'News / Publishers', category: 'channel' },

  // Sub-types / Targeting
  { token: 'brd', meaning: 'Branded Keywords', category: 'sub_type' },
  { token: 'nrd', meaning: 'Non-Branded Keywords', category: 'sub_type' },
  { token: 'pmx', meaning: 'Performance Max', category: 'sub_type' },
  { token: 'prm', meaning: 'Premium Inventory', category: 'sub_type' },
  { token: 'stm', meaning: 'Standard Inventory', category: 'sub_type' },
  { token: 'alt', meaning: 'Alternative Channel', category: 'sub_type' },
  { token: 'mkt', meaning: 'Marketing Campaign', category: 'sub_type' },

  // Qualifiers
  { token: 'tot', meaning: 'Total', category: 'qualifier' },
  { token: 'all', meaning: 'All Segments', category: 'qualifier' },
  { token: 'avg', meaning: 'Average', category: 'qualifier' },

  // Metric Units
  { token: 'imp', meaning: 'Impressions', category: 'metric_type' },
  { token: 'clk', meaning: 'Clicks', category: 'metric_type' },
  { token: 'vol', meaning: 'Volume', category: 'metric_type' },
  { token: 'grp', meaning: 'Gross Rating Points (GRP)', category: 'metric_type' },
  { token: 'spd', meaning: 'Spend ($)', category: 'metric_type' },
  { token: 'cst', meaning: 'Cost ($)', category: 'metric_type' },
  { token: 'rev', meaning: 'Revenue ($)', category: 'metric_type' },
  { token: 'ctr', meaning: 'Click-Through Rate (%)', category: 'metric_type' },
  { token: 'cpc', meaning: 'Cost Per Click ($)', category: 'metric_type' },
  { token: 'cpm', meaning: 'Cost Per Mille ($)', category: 'metric_type' },
  { token: 'cpa', meaning: 'Cost Per Acquisition ($)', category: 'metric_type' }
];

export function decodeCrypticColumn(technicalName: string): CrypticInterpretation {
  const clean = technicalName.toLowerCase().replace(/[\s.-]+/g, '_');
  const tokens = clean.split('_').filter(t => t && t !== 'xxx');

  const matchedTokens: TokenRule[] = [];
  let channelFamily = '';
  let mediaType = '';
  let subType = '';
  let unit: CrypticInterpretation['unit'] = 'unknown';

  for (const t of tokens) {
    const match = TOKEN_DICTIONARY.find(d => d.token === t);
    if (match) {
      matchedTokens.push(match);
      if (match.category === 'channel') {
        if (!channelFamily) channelFamily = match.meaning;
        else mediaType = match.meaning;
      }
      if (match.category === 'sub_type' && !subType) {
        subType = match.meaning;
      }
      if (match.category === 'metric_type') {
        if (t === 'imp') unit = 'impressions';
        else if (t === 'clk') unit = 'clicks';
        else if (t === 'grp') unit = 'grp';
        else if (t === 'vol') unit = 'volume';
        else if (t === 'spd' || t === 'cst' || t === 'rev' || t === 'cpc' || t === 'cpm' || t === 'cpa') unit = 'currency';
        else if (t === 'ctr') unit = 'percentage';
      }
    }
  }

  // Calculate token match ratio
  const matchRatio = tokens.length > 0 ? matchedTokens.length / tokens.length : 0;
  const isHighConfidence = matchRatio >= 0.5 && matchedTokens.length >= 2;
  const confidence = Math.min(0.98, Math.round((0.4 + matchRatio * 0.55) * 100) / 100);

  // Construct readable display name
  let decodedName = '';
  if (channelFamily) {
    const parts = [channelFamily];
    if (mediaType && mediaType !== channelFamily) parts.push(mediaType);
    if (subType) parts.push(subType);
    const metricToken = matchedTokens.find(m => m.category === 'metric_type');
    if (metricToken) parts.push(metricToken.meaning);
    decodedName = parts.join(' — ');
  } else if (matchedTokens.length > 0) {
    decodedName = matchedTokens.map(m => m.meaning).join(' ');
  } else {
    decodedName = technicalName
      .replace(/_/g, ' ')
      .replace(/\b\w/g, c => c.toUpperCase());
  }

  return {
    technicalName,
    decodedName,
    channelFamily: channelFamily || undefined,
    mediaType: mediaType || undefined,
    subType: subType || undefined,
    unit,
    confidence: isHighConfidence ? confidence : 0.55,
    evidence: matchedTokens.length > 0
      ? `Tokens matched: [${matchedTokens.map(m => `${m.token}->${m.meaning}`).join(', ')}]`
      : 'No standard domain token matches found in dictionary.',
    uncertainFlag: !isHighConfidence
  };
}

export function decodeDatasetCrypticColumns(columns: string[]): Record<string, CrypticInterpretation> {
  const result: Record<string, CrypticInterpretation> = {};
  for (const c of columns) {
    result[c] = decodeCrypticColumn(c);
  }
  return result;
}
