// Semantic Prompts: Few-shot grounded prompts for column meaning, human-friendly naming, and technical abbreviation decoding

export const SEMANTIC_PROMPT_VERSION = 'semantic_v2.0';

export interface SemanticPromptInput {
  columns: {
    technicalName: string;
    physicalType: string;
    sampleValues: any[];
    uniqueCount: number;
    nullCount: number;
  }[];
  datasetClues?: string[];
}

export function buildSemanticUnderstandingPrompt(input: SemanticPromptInput): string {
  return `You are the Semantic Understanding Engine of DataWhiz AI.
Your job is to examine technical column names, sample values, and statistical profiles, and infer their human-friendly business name, detailed business meaning, and semantic role.

### FEW-SHOT EXAMPLES:

Example 1:
INPUT:
Column: "dtv_dig_aud_xxx_all_imp"
Physical Type: "number"
Sample Values: [12400, 45200, 18900, 92000]
Context: Digital advertising dataset

OUTPUT:
{
  "column": "dtv_dig_aud_xxx_all_imp",
  "display_name": "Digital TV Audience Impressions",
  "meaning": "Total audience impression volume delivered across digital TV channels",
  "semantic_role": "measure",
  "domain": "marketing",
  "confidence": 0.92,
  "evidence": ["'dtv' prefix indicates Digital TV", "'imp' abbreviation represents impressions", "numeric integer distribution"]
}

Example 2:
INPUT:
Column: "cust_tenure_mths"
Physical Type: "number"
Sample Values: [12, 24, 60, 3, 1]

OUTPUT:
{
  "column": "cust_tenure_mths",
  "display_name": "Customer Tenure (Months)",
  "meaning": "Duration of customer account relationship measured in months",
  "semantic_role": "dimension_ordinal",
  "domain": "telecom_or_subscription",
  "confidence": 0.95,
  "evidence": ["'cust' indicates customer", "'mths' indicates month duration"]
}

Example 3 (Ambiguous Column):
INPUT:
Column: "flg_x9"
Physical Type: "number"
Sample Values: [0, 1, 0, 0]

OUTPUT:
{
  "column": "flg_x9",
  "display_name": "Flag X9",
  "meaning": "Binary indicator flag with unmapped business attribute",
  "semantic_role": "target_binary",
  "domain": "general",
  "confidence": 0.45,
  "evidence": ["binary 0/1 values", "cryptic code 'x9' lacks semantic dictionary match"]
}

---

### YOUR TASK:
Analyze the following columns and produce a JSON array of column interpretations:

Columns to evaluate:
${JSON.stringify(input.columns, null, 2)}

${input.datasetClues?.length ? `Dataset context clues: ${input.datasetClues.join(', ')}` : ''}

### OUTPUT FORMAT:
Return ONLY a JSON array matching:
[
  {
    "technical_name": string,
    "display_name": string,
    "meaning": string,
    "semantic_role": "measure" | "dimension" | "timestamp" | "target_binary" | "identifier",
    "domain": string,
    "confidence": number (between 0.0 and 1.0),
    "evidence": string[]
  }
]`;
}
