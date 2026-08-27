import { NextRequest, NextResponse } from 'next/server';
import { fetchTavilyNews } from '@/lib/services/tavilyService';

export async function POST(req: NextRequest) {
  try {
    const { domain } = await req.json();
    if (!domain) {
      return NextResponse.json({ success: false, items: [] });
    }

    const items = await fetchTavilyNews(domain);
    return NextResponse.json({ success: true, items });
  } catch (error: any) {
    console.error('[API /api/news Error]', error);
    return NextResponse.json({ success: false, items: [] }, { status: 500 });
  }
}
