// Domain & Entity Prompts: Grounded inference for business domain, physical entities, and analytical target metrics

export const DOMAIN_PROMPT_VERSION = 'domain_v2.0';

export interface DomainPromptInput {
  columns: { name: string; type: string; sampleValues: any[] }[];
  rowCount: number;
  fileName?: string;
}

export function buildDomainDetectionPrompt(input: DomainPromptInput): string {
  return `You are the Business Domain & Entity Detection Engine of DataWhiz AI.
Analyze the dataset schema, column names, sample values, and metadata to infer:
1. The Primary Business Domain (e.g., retail, healthcare, marketing, telecom, finance, logistics, HR, e-commerce).
2. Physical Entities represented in the data (e.g., Customer, Product, Pharmacy, Store, Campaign, Order, Patient, Supplier).
3. Candidate Analytical Target variables (e.g. Sales for forecasting, Churn for classification, Defect for quality).

### FEW-SHOT EXAMPLES:

Example 1:
INPUT:
Columns: [
  { name: "Pharmacy", sampleValues: ["City Health Pharma", "St Jude Disp"] },
  { name: "Product_Name", sampleValues: ["Amoxicillin 500mg", "Paracetamol 650mg"] },
  { name: "Daily_Revenue", sampleValues: [1420.5, 980.0] },
  { name: "Prescription_Date", sampleValues: ["2024-01-15", "2024-01-16"] }
]

OUTPUT:
{
  "primary_domain": "Healthcare / Pharmacy Retail",
  "confidence": 0.96,
  "evidence": ["Presence of pharmaceutical product names like Amoxicillin", "Pharmacy entity column", "Daily transaction revenues"],
  "alternative_domains": ["Retail & E-commerce"],
  "entities": [
    { "entity_name": "Pharmacy Location", "related_columns": ["Pharmacy"], "confidence": 0.95 },
    { "entity_name": "Pharmaceutical Product", "related_columns": ["Product_Name"], "confidence": 0.98 }
  ],
  "candidate_targets": [
    { "column": "Daily_Revenue", "task_type": "forecasting", "confidence": 0.94, "evidence": "Continuous numerical monetary metric over time" }
  ]
}

---

### YOUR TASK:
Evaluate the following dataset profile:
File: ${input.fileName || 'Uploaded Dataset'}
Total Rows: ${input.rowCount}
Columns:
${JSON.stringify(input.columns, null, 2)}

### OUTPUT FORMAT:
Return ONLY a valid JSON object matching:
{
  "primary_domain": string,
  "confidence": number,
  "evidence": string[],
  "alternative_domains": string[],
  "entities": [
    { "entity_name": string, "related_columns": string[], "confidence": number }
  ],
  "candidate_targets": [
    { "column": string, "task_type": "forecasting" | "classification" | "regression" | "anomaly_detection", "confidence": number, "evidence": string }
  ]
}`;
}
