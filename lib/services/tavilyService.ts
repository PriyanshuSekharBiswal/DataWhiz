// Tavily Search Service: Fetches live real-time industry developments and news

export interface TavilyArticle {
  headline: string;
  source: string;
  date: string;
  summary: string;
  url: string;
}

export async function fetchTavilyNews(domain: string): Promise<TavilyArticle[]> {
  const apiKey = process.env.TAVILY_API_KEY || '';
  if (!apiKey) {
    console.warn('[Tavily Service] No TAVILY_API_KEY provided.');
    return [];
  }

  try {
    const query = `${domain} industry trends, market developments, and news`;
    const response = await fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        api_key: apiKey,
        query,
        search_depth: 'basic',
        include_answer: true,
        max_results: 5
      })
    });

    if (!response.ok) {
      console.error(`[Tavily Service Error] HTTP ${response.status}`);
      return [];
    }

    const data = await response.json();
    const results = (data.results || []) as any[];

    return results.map(r => {
      let domainName = 'Industry Source';
      try {
        domainName = new URL(r.url).hostname.replace(/^www\./, '');
      } catch {
        // Fallback
      }

      return {
        headline: r.title || 'Market Development',
        source: domainName,
        date: r.published_date ? r.published_date.slice(0, 10) : new Date().toISOString().slice(0, 7),
        summary: r.content ? r.content.slice(0, 180) + '…' : 'Recent market update.',
        url: r.url || `https://www.google.com/search?q=${encodeURIComponent(r.title || domain)}`
      };
    });
  } catch (error: any) {
    console.error('[Tavily Service Exception]', error?.message || error);
    return [];
  }
}
