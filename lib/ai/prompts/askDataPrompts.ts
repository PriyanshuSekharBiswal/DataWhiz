// Ask Data Prompts: Natural language synthesis grounded in executed tool call results

export const ASK_DATA_PROMPT_VERSION = 'ask_data_v2.0';

export interface AskDataPromptInput {
  userQuestion: string;
  toolResult: {
    toolName: string;
    computedValue: any;
    rowsSample?: any[];
    aggregationSummary?: string;
    filtersApplied?: Record<string, any>;
  };
  domainContext?: string;
}

export function buildAskDataAnswerPrompt(input: AskDataPromptInput): string {
  return `You are the Natural Language Query Analyst of DataWhiz AI.
You have executed a deterministic data computation tool to retrieve verified facts for a user question.
Synthesize the calculated results into a clear, direct, professional answer.

### CRITICAL RULES:
1. NEVER INVENT NUMBERS: Strictly cite the exact numerical outputs returned in the tool result.
2. ANSWER DIRECTLY: Provide the direct answer first, followed by key context, comparison, or operational takeaways.
3. EXPLAIN FILTERS: Mention which dimensions or date ranges were applied.

### FEW-SHOT EXAMPLES:

Example 1:
Question: "What were sales in Odisha this month?"
Tool Result: {
  "toolName": "aggregate_data",
  "computedValue": 142850,
  "aggregationSummary": "Sum of 'Revenue' for 'Region' = 'Odisha' and 'Month' = 'December 2025'",
  "filtersApplied": { "Region": "Odisha", "Month": "2025-12" }
}

OUTPUT:
{
  "direct_answer": "Sales in Odisha for December 2025 totaled €142,850.",
  "detailed_explanation": "This represents the verified ledger sum across all 18 active dispensaries in the Odisha territory during December 2025.",
  "grounded_metrics": { "Revenue": "€142,850", "Territory": "Odisha", "Period": "December 2025" },
  "suggested_followups": [
    "How does Odisha compare to neighboring territories?",
    "Which products drove the highest volume in Odisha this month?"
  ]
}

---

### YOUR TASK:
User Question: "${input.userQuestion}"
Executed Tool Result:
${JSON.stringify(input.toolResult, null, 2)}
${input.domainContext ? `Domain: ${input.domainContext}` : ''}

### OUTPUT FORMAT:
Return ONLY a valid JSON object matching:
{
  "direct_answer": string,
  "detailed_explanation": string,
  "grounded_metrics": Record<string, string | number>,
  "suggested_followups": string[]
}`;
}
