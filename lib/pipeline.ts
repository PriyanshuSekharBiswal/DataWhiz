// AutoData AI — Master End-to-End Orchestration Pipeline

import {
  DatasetContext,
  UserIntent,
  Finding,
  AIObservation,
  InvestmentRecommendation,
  AnalysisPlan,
  TableRelationship,
  DatasetUnderstandingReport,
  BusinessQuestion,
  SpecializedAnalysisResult,
  QualityGateReport
} from '@/lib/types';
import { parseCSVString, parseExcelBuffer } from '@/lib/ingestion/sourceDetector';
import { detectDatasetSchema } from '@/lib/schema/schemaDetector';
import { profileDataset } from '@/lib/profiling/dataProfiler';
import { enrichSchemaWithSemantics } from '@/lib/semantics/columnHumanizer';
import { decodeDatasetCrypticColumns } from '@/lib/semantics/crypticDecoder';
import { detectBusinessDomain, buildBusinessGlossary } from '@/lib/semantics/domainDetector';
import { detectRelationships, buildAnalyticalView } from '@/lib/relationships/relationshipDetector';
import { detectQualityIssuesAndClean } from '@/lib/quality/qualityEngine';
import { detectCapabilities } from '@/lib/capabilities/capabilityDetector';
import { parseUserIntent } from '@/lib/intent/intentParser';
import { planAnalysis } from '@/lib/planner/analysisPlanner';
import { executeAnalysisPlan } from '@/lib/ai/tools/toolRouter';
import { buildDatasetContext } from '@/lib/context/datasetContextBuilder';
import { buildDatasetUnderstandingReport } from '@/lib/context/datasetUnderstandingEngine';
import { discoverBusinessQuestions } from '@/lib/questions/businessQuestionEngine';
import { runSpecializedAnalysis } from '@/lib/analytics/specializedEngines';
import { runMasterQualityGate } from '@/lib/quality/qualityGate';
import { extractVerifiedFindings } from '@/lib/findings/findingsEngine';
import { synthesizeObservations } from '@/lib/observations/observationEngine';
import { evaluateInvestmentPriorities } from '@/lib/analytics/decisionEngine';
import { computeStatistics, StatisticsReport } from '@/lib/analytics/statisticsEngine';
import { generateForecast, ForecastReport } from '@/lib/analytics/forecastingEngine';
import { evaluateClassification, ClassificationReport } from '@/lib/analytics/classificationEngine';
import { generateDashboard, GeneratedDashboard } from '@/lib/dashboard/dashboardGenerator';

export interface PipelineExecutionResult {
  context: DatasetContext;
  intent: UserIntent;
  plan: AnalysisPlan;
  understandingReport: DatasetUnderstandingReport;
  businessQuestions: BusinessQuestion[];
  specializedAnalysis: SpecializedAnalysisResult;
  qualityGate: QualityGateReport;
  dashboard: GeneratedDashboard;
  findings: Finding[];
  observations: AIObservation[];
  recommendations: InvestmentRecommendation[];
  statistics: StatisticsReport;
  forecast: ForecastReport | null;
  classification: ClassificationReport | null;
}

export function runFullAnalysisPipeline(
  sourceInput: { csvContent?: string; excelBuffer?: ArrayBuffer; fileName: string; prompt?: string }
): PipelineExecutionResult {
  // Step 1 & 2: Ingestion & Source Detection
  const ingest = sourceInput.excelBuffer
    ? parseExcelBuffer(sourceInput.excelBuffer, sourceInput.fileName)
    : parseCSVString(sourceInput.csvContent || '', sourceInput.fileName);

  // Multi-table Star-Schema Resolution
  let rawRows = ingest.rows;
  let columns = ingest.columns;
  let relationships: TableRelationship[] = [];

  if (ingest.tables && ingest.tables.length >= 2) {
    const analyticalView = buildAnalyticalView(ingest.tables);
    rawRows = analyticalView.analyticalRows;
    columns = analyticalView.mergedColumns;
    relationships = analyticalView.relationships;
  }

  // Step 3 & 4: Schema Detection & Data Profiling on Analytical View
  const baseSchemas = detectDatasetSchema(columns, rawRows);
  const profiles = profileDataset(baseSchemas, rawRows);

  // Step 5: Semantic Understanding & Column Humanizer & Cryptic Decoding
  const enrichedSchemas = enrichSchemaWithSemantics(baseSchemas);
  const crypticInterpretations = decodeDatasetCrypticColumns(columns);

  // Step 6: Domain Detection & Business Glossary
  const domain = detectBusinessDomain(enrichedSchemas);
  const glossary = buildBusinessGlossary(enrichedSchemas, domain);

  // Step 7: Relationship Detection Fallback (if single table)
  if (!relationships.length) {
    relationships = detectRelationships([
      {
        tableName: sourceInput.fileName.replace(/\.[^/.]+$/, ''),
        columns,
        schemas: enrichedSchemas,
        rows: rawRows
      }
    ]);
  }

  // Step 8 & 9: Data Quality Engine & Safe Intelligent Cleaning
  const { cleanedRows, report: qualityReport } = detectQualityIssuesAndClean(
    enrichedSchemas,
    profiles,
    rawRows
  );

  // Step 10: Evidence-Driven Capability Detection
  const capabilities = detectCapabilities(enrichedSchemas, profiles, cleanedRows.length, cleanedRows);

  // Step 11: Intent Parsing
  const intent = parseUserIntent(sourceInput.prompt || '', enrichedSchemas);

  // Step 12: Central DatasetContext Assembler (Single Source of Truth)
  const context = buildDatasetContext({
    sourceMetadata: ingest.metadata,
    schema: enrichedSchemas,
    profiles,
    domain,
    glossary,
    relationships,
    qualityReport,
    capabilities,
    rawSample: rawRows.slice(0, 500),
    cleanedRows
  });

  context.crypticInterpretations = crypticInterpretations;

  // Step 13: Deep Dataset Understanding Report (14-question core evaluation)
  const understandingReport = buildDatasetUnderstandingReport(context);
  context.understandingReport = understandingReport;
  context.archetype = understandingReport.archetype;

  // Step 14: Business Question Discovery (12-category discovery)
  const businessQuestions = discoverBusinessQuestions(context, understandingReport);
  context.businessQuestions = businessQuestions;

  // Step 15: AI Analysis Planner
  const plan = planAnalysis(context, capabilities, intent);
  context.analysisPlan = plan;

  // Step 16: Execute Authoritative Analysis Plan through Tool Router
  const analysisResults = executeAnalysisPlan(plan, context);

  // Step 17: Specialized Analytics Strategy (if supported)
  const specializedAnalysis = runSpecializedAnalysis(context, understandingReport);
  context.specializedAnalysis = specializedAnalysis;

  // Step 18: Core Analytics Engines & Validation
  const statistics = computeStatistics(enrichedSchemas, profiles, cleanedRows);

  // Forecasting Engine (Only executed when capability is supported and task planned)
  const dateCol = context.primaryDateColumn;
  const metricCol = context.primaryMetricColumn;
  const forecast = (dateCol && metricCol && capabilities.time_series_forecasting.supported)
    ? generateForecast(dateCol, metricCol, cleanedRows, intent.forecastHorizon || 6)
    : null;

  // Classification Engine (Only executed when genuine target exists and capability is supported)
  const targetCol = context.targetCandidates?.find(t => t.usable && t.confidence >= 0.70)?.column ||
    context.primaryTargetColumn;
  const classification = (targetCol && capabilities.classification_churn.supported)
    ? evaluateClassification(targetCol, enrichedSchemas, cleanedRows)
    : null;

  // Decision Intelligence & Investment Scoring (Strictly gated by domain and capability)
  const recommendations = evaluateInvestmentPriorities(enrichedSchemas, cleanedRows, context);

  // Step 19 & 20: Findings & AI Observations
  const findings = extractVerifiedFindings(context);
  const observations = synthesizeObservations(findings, context);

  // Step 21: Dashboard Generator & Spec Assembly
  const dashboard = generateDashboard(context);

  // Step 22: Pre-flight Quality Gate
  const qualityGate = runMasterQualityGate(context);
  context.qualityGate = qualityGate;

  // Attach analytical artifacts directly back onto DatasetContext
  context.userIntent = intent;
  context.analysisPlan = plan;
  context.validatedFindings = findings;
  context.observations = observations;
  context.recommendations = recommendations;
  context.derivedMetrics = dashboard.derivedMetrics;
  context.dashboardQuality = dashboard.qualityCheck;

  return {
    context,
    intent,
    plan,
    understandingReport,
    businessQuestions,
    specializedAnalysis,
    qualityGate,
    dashboard,
    findings,
    observations,
    recommendations,
    statistics,
    forecast,
    classification
  };
}
