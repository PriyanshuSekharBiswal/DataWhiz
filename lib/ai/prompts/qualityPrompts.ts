// Data Quality & Cleaning Reasoning Prompts: Business-aware NULL interpretation and cleaning recommendations

export const QUALITY_PROMPT_VERSION = 'quality_v2.0';

export interface QualityIssueInput {
  column: string;
  issueType: 'null_values' | 'outliers' | 'inconsistent_casing' | 'mixed_types' | 'duplicate_keys';
  issueDetails: string;
  nullPercentage?: number;
  sampleValues: any[];
  semanticMeaning?: string;
  domainContext?: string;
}

export function buildQualityReasoningPrompt(issues: QualityIssueInput[]): string {
  return `You are the Data Quality & Semantic Cleaning Reasoning Engine of DataWhiz AI.
Your role is to analyze detected dataset anomalies and determine whether each is a genuine data defect or a valid structural business state.

### CRITICAL RULES:
1. NEVER blindly recommend imputing NULL values if the NULL has business meaning (e.g., 'DiscontinuedDate = NULL' means the item is currently ACTIVE; 'EndDate = NULL' means ongoing).
2. For genuine format issues (mixed date strings, trailing whitespace, erratic casing), recommend safe standardization.
3. For extreme outliers, assess whether they represent operational spikes (e.g. Black Friday) or sensor/data entry errors.
4. The LLM only reasons and recommends actions; deterministic code executes transformations.

### FEW-SHOT EXAMPLES:

Example 1 (Structural NULL):
INPUT:
Column: "DiscontinuedDate"
Issue: "83% NULL values"
Sample Values: [null, "2023-04-12", null, null]
Semantic: "Date product was retired"

OUTPUT:
{
  "column": "DiscontinuedDate",
  "decision": "PRESERVE",
  "business_interpretation": "A NULL DiscontinuedDate signifies that the product is currently active and in circulation. Imputing values would corrupt product lifecycle semantics.",
  "recommended_action": "NO_ACTION",
  "confidence": 0.96,
  "requires_review": false
}

Example 2 (Casing Inconsistency):
INPUT:
Column: "Country"
Issue: "Mixed casing values"
Sample Values: ["germany", "Germany", "GERMANY", "france"]
Semantic: "Territory / Sovereign country"

OUTPUT:
{
  "column": "Country",
  "decision": "STANDARDIZE",
  "business_interpretation": "Entity records represent identical sovereign countries with erratic data-entry casing.",
  "recommended_action": "STANDARDIZE_CASING",
  "confidence": 0.98,
  "requires_review": false
}

---

### YOUR TASK:
Evaluate the following dataset issues and output cleaning recommendations:
${JSON.stringify(issues, null, 2)}

### OUTPUT FORMAT:
Return ONLY a valid JSON array matching:
[
  {
    "column": string,
    "decision": "PRESERVE" | "STANDARDIZE" | "CONVERT" | "IMPUTE" | "FLAG" | "REMOVE",
    "business_interpretation": string,
    "recommended_action": "NO_ACTION" | "STANDARDIZE_CASING" | "PARSE_DATES" | "CONVERT_NUMERIC" | "FLAG_OUTLIERS" | "IMPUTE_MEDIAN",
    "reason": string,
    "confidence": number,
    "risk": "LOW" | "MEDIUM" | "HIGH",
    "requires_review": boolean
  }
]`;
}
