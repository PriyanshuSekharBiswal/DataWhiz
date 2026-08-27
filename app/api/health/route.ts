import { NextResponse } from 'next/server';
import { llmRouter } from '@/lib/ai/llmRouter';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const health = await llmRouter.healthCheck();
    return NextResponse.json({
      success: true,
      service: 'DataWhiz AI Intelligence Router',
      health
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || 'Health check failed' },
      { status: 500 }
    );
  }
}
