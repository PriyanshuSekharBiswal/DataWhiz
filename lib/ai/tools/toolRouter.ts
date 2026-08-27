// Tool Router: Central Dispatcher for Trusted Analytical Execution and Code Analyst Fallback
// Routes validated AnalysisTasks through authoritative primitives and attaches calculation provenance

import { AnalysisTask, AnalysisResult, DatasetContext, AnalysisPlan } from '@/lib/types';
import { executeDataWhizTool, DATAWHIZ_TOOLS } from './toolRegistry';
import { executeControlledCodeAnalyst } from '@/lib/codeAnalyst/codeAnalystInterface';
import { validateAnalysisResult } from '@/lib/analytics/validation';

/**
 * Executes a single AnalysisTask through the appropriate trusted tool or controlled fallback.
 */
export function routeAndExecuteTask(
  task: AnalysisTask,
  context: DatasetContext
): AnalysisResult {
  const startTime = Date.now();
  const primaryTool = task.requiredTools[0] || 'aggregate';

  // Check if a registered trusted tool supports this task
  const toolDef = DATAWHIZ_TOOLS.find(t => t.name === primaryTool);

  let result: AnalysisResult;

  if (toolDef) {
    // Build parameters for the tool from task metadata
    const params: Record<string, any> = {
      ...(task.filters ? { filters: task.filters } : {})
    };

    if (task.measures && task.measures.length > 0) params.metric = task.measures[0];
    if (task.dimensions && task.dimensions.length > 0) params.dimension = task.dimensions[0];
    if (task.target) params.target = task.target;
    if (task.timeField) params.timeField = task.timeField;
    if (task.aggregation) params.aggFunction = task.aggregation;

    // Specific tool parameter mappings
    if (primaryTool === 'correlation' && task.measures && task.measures.length >= 2) {
      params.metricA = task.measures[0];
      params.metricB = task.measures[1];
    } else if (primaryTool === 'forecast') {
      params.dateColumn = task.timeField || context.primaryDateColumn;
      params.metric = (task.measures && task.measures.length > 0 ? task.measures[0] : undefined) || context.primaryMetricColumn;
      params.horizon = context.userIntent?.forecastHorizon || 6;
    } else if (primaryTool === 'classification') {
      params.target = task.target || context.primaryTargetColumn;
    }

    result = executeDataWhizTool(primaryTool, params, context);
  } else {
    // Escape-hatch: Route to Controlled Code Analyst Fallback
    const codeExecution = executeControlledCodeAnalyst(
      {
        taskId: task.id,
        language: 'typescript',
        code: `// Autonomous Code Analyst for task ${task.id}`,
        expectedOutputSchema: {},
        rationale: task.rationale
      },
      context
    );

    result = {
      taskId: task.id,
      tool: 'code_analyst',
      sourceColumns: task.requiredColumns,
      sampleSize: context.cleanedRows.length,
      data: codeExecution.data || null,
      warnings: codeExecution.error ? [codeExecution.error] : [],
      validationStatus: codeExecution.success ? 'VALID' : 'INVALID',
      validationReason: codeExecution.error,
      provenance: {
        executedAt: new Date().toISOString(),
        engine: 'Controlled Code Analyst Fallback',
        durationMs: codeExecution.executionDurationMs
      }
    };
  }

  // Validate analytical result correctness
  const valReport = validateAnalysisResult(
    result.tool,
    result.data,
    result.sourceColumns,
    result.sampleSize
  );
  if (valReport.status === 'INVALID') {
    result.validationStatus = 'INVALID';
    result.validationReason = valReport.reason || 'Analytical validation failed';
  }

  return result;
}

/**
 * Executes an entire Authoritative AnalysisPlan and returns an array of validated AnalysisResults.
 */
export function executeAnalysisPlan(
  plan: AnalysisPlan,
  context: DatasetContext
): AnalysisResult[] {
  const results: AnalysisResult[] = [];

  for (const task of plan.tasks) {
    if (task.status === 'SKIPPED' || task.priority === 'NOT_SUPPORTED') {
      continue;
    }

    task.status = 'EXECUTING';
    const res = routeAndExecuteTask(task, context);
    task.status = res.validationStatus === 'INVALID' ? 'SKIPPED' : 'COMPLETED';
    results.push(res);
  }

  return results;
}
