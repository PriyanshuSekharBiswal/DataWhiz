// Code Analyst Interface: Controlled Escape-Hatch for Custom Analytical Tasks
// Implements strict static code validation, sandbox boundary checks, and safe execution interface

import { AnalysisTask, AnalysisResult, DatasetContext } from '@/lib/types';

export interface CodeAnalystProposal {
  taskId: string;
  language: 'javascript' | 'typescript' | 'python';
  code: string;
  expectedOutputSchema: Record<string, string>;
  rationale: string;
}

export interface CodeSafetyValidation {
  isSafe: boolean;
  violations: string[];
  restrictedTokensDetected: string[];
}

const FORBIDDEN_CODE_PATTERNS = [
  /\b(eval|Function|exec|spawn|fork)\b/,
  /\b(process|child_process|fs|net|http|https|tls|dgram|cluster)\b/,
  /\b(window|document|localStorage|sessionStorage|indexedDB)\b/,
  /\b(fetch|XMLHttpRequest|WebSocket|importScripts)\b/,
  /\b(__dirname|__filename|global|globalThis)\b/,
  /\b(process\.env|API_KEY|SECRET|TOKEN|PASSWORD)\b/i,
  /\b(require\s*\(|import\s+.*\s+from)\b/
];

/**
 * Static validation of generated analytical code before execution.
 * Blocks any attempt to access system APIs, networks, secrets, or unbounded processes.
 */
export function validateCodeSafety(code: string): CodeSafetyValidation {
  const violations: string[] = [];
  const restrictedTokensDetected: string[] = [];

  for (const pattern of FORBIDDEN_CODE_PATTERNS) {
    if (pattern.test(code)) {
      const match = code.match(pattern);
      const token = match ? match[0] : pattern.source;
      restrictedTokensDetected.push(token);
      violations.push(`Restricted security token detected: '${token}' violates sandboxed execution policy.`);
    }
  }

  return {
    isSafe: violations.length === 0,
    violations,
    restrictedTokensDetected
  };
}

export interface CodeAnalystExecutionResult {
  success: boolean;
  data?: any;
  error?: string;
  executionDurationMs: number;
  sandboxed: boolean;
}

/**
 * Controlled Code Analyst Runner Interface.
 * In production environments without external isolated container sandboxes,
 * safely reports runtime execution unavailability rather than executing unrestricted in-process.
 */
export function executeControlledCodeAnalyst(
  proposal: CodeAnalystProposal,
  context: DatasetContext
): CodeAnalystExecutionResult {
  const startTime = Date.now();
  const safety = validateCodeSafety(proposal.code);

  if (!safety.isSafe) {
    return {
      success: false,
      error: `Code safety validation failed: ${safety.violations.join('; ')}`,
      executionDurationMs: Date.now() - startTime,
      sandboxed: false
    };
  }

  // Without an isolated external runner, refuse in-process execution for safety
  return {
    success: false,
    error: 'Controlled Code Analyst execution requires an isolated external sandbox environment. Fallback to trusted analytical primitives.',
    executionDurationMs: Date.now() - startTime,
    sandboxed: false
  };
}
