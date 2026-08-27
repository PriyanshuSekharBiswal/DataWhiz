// Client API helper for LLM planning, Tavily news, and Gemini insights

export async function fetchAiPlan(
  profileText: string,
  fileName: string,
  domain?: string,
  capabilities?: any,
  userGoal?: string
) {
  try {
    const res = await fetch('/api/plan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ profileText, fileName, domain, capabilities, userGoal })
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.success ? data.plan : null;
  } catch (e) {
    console.error('Failed to fetch AI plan:', e);
    return null;
  }
}

export async function fetchLiveNews(domain: string) {
  try {
    const res = await fetch('/api/news', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ domain })
    });
    if (!res.ok) return [];
    const data = await res.json();
    return data.success ? data.items : [];
  } catch (e) {
    console.error('Failed to fetch live news:', e);
    return [];
  }
}

export async function fetchCrossReadInsights(domain: string, news: any[], profileText: string, kpis: any[]) {
  try {
    const res = await fetch('/api/insights', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ domain, news, profileText, kpis })
    });
    if (!res.ok) return [];
    const data = await res.json();
    return data.success ? data.observations : [];
  } catch (e) {
    console.error('Failed to fetch cross-read insights:', e);
    return [];
  }
}

export async function fetchAiStatNotes(params: any) {
  try {
    const res = await fetch('/api/stat-notes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params)
    });
    if (!res.ok) return [];
    const data = await res.json();
    return data.success ? data.observations : [];
  } catch (e) {
    console.error('Failed to fetch AI stat notes:', e);
    return [];
  }
}

export async function fetchAiAskResponse(question: string, profileText: string, history: any[]) {
  try {
    const res = await fetch('/api/ask', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question, profileText, history })
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.success ? data.result : null;
  } catch (e) {
    console.error('Failed to fetch AI ask response:', e);
    return null;
  }
}
