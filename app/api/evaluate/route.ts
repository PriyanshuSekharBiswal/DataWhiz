import { NextResponse } from 'next/server';
import { runEvaluationSuite } from '@/lib/ai/evaluation/evalSuite';
import { exportFineTuningDatasetJSONL } from '@/lib/ai/training/fineTuningPrep';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const evalReport = await runEvaluationSuite();
    const fineTuningJsonl = exportFineTuningDatasetJSONL();

    return NextResponse.json({
      success: true,
      evaluation: evalReport,
      fineTuningReadySamples: fineTuningJsonl.split('\n').filter(Boolean).length
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}
