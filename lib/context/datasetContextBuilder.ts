// Central DatasetContext Builder: Assembles complete authoritative knowledge representation for the dataset

import {
  DatasetContext,
  SourceMetadata,
  ColumnSchema,
  ColumnProfile,
  DomainInfo,
  BusinessGlossaryNode,
  TableRelationship,
  DataQualityReport,
  CapabilityMap,
  UserIntent,
  AnalysisPlan,
  Finding,
  AIObservation,
  InvestmentRecommendation,
  DerivedMetric,
  DashboardQualityCheckResult,
  TargetCandidate,
  TimeDimensionInfo
} from '@/lib/types';
import { inferTargetCandidates } from '@/lib/semantics/targetInference';
import { analyzeTimeGrain } from './datasetUnderstandingEngine';

export interface BuildContextParams {
  id?: string;
  jobId?: string;
  sourceMetadata: SourceMetadata;
  schema: ColumnSchema[];
  profiles: ColumnProfile[];
  domain: DomainInfo;
  glossary: BusinessGlossaryNode[];
  relationships: TableRelationship[];
  qualityReport: DataQualityReport;
  capabilities: CapabilityMap;
  userIntent?: UserIntent;
  analysisPlan?: AnalysisPlan;
  validatedFindings?: Finding[];
  observations?: AIObservation[];
  recommendations?: InvestmentRecommendation[];
  derivedMetrics?: DerivedMetric[];
  dashboardQuality?: DashboardQualityCheckResult;
  rawSample: Record<string, any>[];
  cleanedRows: Record<string, any>[];
}

export function buildDatasetContext(params: BuildContextParams): DatasetContext {
  const dates = params.schema.filter(s => (s.logicalType === 'date' || s.physicalType === 'date' || s.semanticRole === 'timestamp' || s.semanticRole === 'date') && s.logicalType !== 'identifier');
  const measures = params.schema.filter(s => (s.logicalType.startsWith('measure') || (s.physicalType === 'number' && s.semanticRole !== 'timestamp' && s.semanticRole !== 'date')) && s.logicalType !== 'identifier' && !s.isPrimaryKeyCandidate);
  const dimensions = params.schema.filter(s => (s.logicalType.startsWith('dimension') || (s.physicalType === 'string' && s.logicalType !== 'identifier')) && s.logicalType !== 'identifier' && !s.isPrimaryKeyCandidate);
  
  // 1. Target Candidates via centralized inference
  const targetCandidates: TargetCandidate[] = inferTargetCandidates(
    params.schema,
    params.profiles,
    params.cleanedRows,
    params.userIntent
  );

  const candidateTargets = params.schema.filter(s =>
    targetCandidates.some(tc => tc.column === s.technicalName && tc.usable && (tc.taskType === 'binary_classification' || tc.taskType === 'multiclass_classification'))
  );

  const humanFriendlyNames: Record<string, string> = {};
  for (const s of params.schema) {
    humanFriendlyNames[s.technicalName] = s.displayName || s.technicalName;
  }

  // 2. Dynamic Entity Extraction
  const entities = params.domain.detectedEntities && params.domain.detectedEntities.length > 0
    ? params.domain.detectedEntities
    : dimensions.filter(d => !d.interpretationUncertain && d.logicalType === 'dimension_category').slice(0, 3).map(d => d.displayName);

  const defaultIntent: UserIntent = params.userIntent || {
    mode: 'auto',
    timeGrain: 'month',
    forecastHorizon: 6
  };

  // 3. Time Dimension Analysis
  const primaryDateSchema = dates.find(d => d.logicalType === 'date' || d.physicalType === 'date') || dates[0];
  const primaryDate = primaryDateSchema?.technicalName;
  let timeDimensions: TimeDimensionInfo | undefined = undefined;
  let nativeTimeGrain: DatasetContext['nativeTimeGrain'] = 'none';

  if (primaryDate && params.cleanedRows.length > 0) {
    const tAnalysis = analyzeTimeGrain(primaryDate, params.cleanedRows);
    timeDimensions = {
      column: primaryDate,
      grain: tAnalysis.grain,
      startDate: tAnalysis.startDate,
      endDate: tAnalysis.endDate,
      totalPeriods: tAnalysis.totalPeriods,
      gapsDetected: tAnalysis.gapsDetected
    };
    nativeTimeGrain = tAnalysis.grain;
  }

  // 4. Rank Primary Measure: Evaluates variance, distribution, non-null completeness, business weight, and aggregation validity
  const sortedMeasures = [...measures].sort((a, b) => {
    const pA = params.profiles.find(p => p.technicalName === a.technicalName);
    const pB = params.profiles.find(p => p.technicalName === b.technicalName);

    const stdA = pA?.numeric?.std || 0;
    const stdB = pB?.numeric?.std || 0;
    const missingA = pA?.missingPercentage || 0;
    const missingB = pB?.missingPercentage || 0;

    // Penalize intensive measures like temperature or non-additive identifiers
    const addScoreA = a.aggregationBehavior === 'additive' ? 40 : a.measurementType === 'temperature' ? -30 : 10;
    const addScoreB = b.aggregationBehavior === 'additive' ? 40 : b.measurementType === 'temperature' ? -30 : 10;

    const isRevA = /revenue|sales|income|turnover|gmv|amount|spend|charge/i.test(a.technicalName) || a.logicalType === 'measure_currency';
    const isRevB = /revenue|sales|income|turnover|gmv|amount|spend|charge/i.test(b.technicalName) || b.logicalType === 'measure_currency';
    const revBonusA = isRevA ? 45 : 0;
    const revBonusB = isRevB ? 45 : 0;

    // Favor high variance, low missingness, commercial weight, and primary metric role
    const scoreA = (a.semanticRole === 'primary_metric' ? 50 : 0) + revBonusA + addScoreA + (stdA > 0 ? 30 : 0) + (100 - missingA) * 0.2;
    const scoreB = (b.semanticRole === 'primary_metric' ? 50 : 0) + revBonusB + addScoreB + (stdB > 0 ? 30 : 0) + (100 - missingB) * 0.2;

    return scoreB - scoreA;
  });

  // 5. Rank Primary Dimension: Evaluates cardinality (optimal 3-25 unique values), non-null completeness
  const sortedDimensions = [...dimensions].sort((a, b) => {
    const pA = params.profiles.find(p => p.technicalName === a.technicalName);
    const pB = params.profiles.find(p => p.technicalName === b.technicalName);

    const cardA = pA?.categorical?.cardinality || pA?.uniqueCount || 0;
    const cardB = pB?.categorical?.cardinality || pB?.uniqueCount || 0;

    const cardScore = (c: number) => (c >= 3 && c <= 30 ? 40 : c > 30 && c <= 100 ? 20 : 5);
    const scoreA = (a.semanticRole === 'primary_dimension' ? 50 : 0) + cardScore(cardA);
    const scoreB = (b.semanticRole === 'primary_dimension' ? 50 : 0) + cardScore(cardB);

    return scoreB - scoreA;
  });

  // 6. Explicit Uncertainties Collection
  const uncertainties: string[] = [];
  const uncertainCols = params.schema.filter(s => s.interpretationUncertain);
  if (uncertainCols.length > 0) {
    uncertainties.push(`${uncertainCols.length} attribute(s) require semantic review: [${uncertainCols.slice(0, 3).map(c => c.technicalName).join(', ')}].`);
  }
  if (timeDimensions && timeDimensions.gapsDetected.length > 0) {
    uncertainties.push(`Temporal sequence has ${timeDimensions.gapsDetected.length} detected discontinuity gap(s).`);
  }
  if (params.qualityReport.overallScore < 80) {
    uncertainties.push(`Data quality score is ${params.qualityReport.overallScore}/100 with ${params.qualityReport.issues.length} detected issue(s).`);
  }

  const primaryTarget = targetCandidates.find(t => t.usable && t.confidence >= 0.70)?.column;

  return {
    id: params.id || `ds-${Date.now().toString(36)}`,
    jobId: params.jobId || `job-${Math.random().toString(36).substring(2, 9)}`,
    createdAt: new Date().toISOString(),
    source: params.sourceMetadata,
    sourceMetadata: params.sourceMetadata,
    schema: params.schema,
    profiles: params.profiles,
    semanticSchema: params.schema,
    humanFriendlyNames,
    domain: params.domain,
    domainHypotheses: params.domain.alternativeDomains ? [
      { domain: params.domain.primaryDomain, confidence: params.domain.confidence, evidence: params.domain.evidence },
      ...params.domain.alternativeDomains.map(ad => ({ domain: ad.domain, confidence: ad.confidence, evidence: [] }))
    ] : undefined,
    entities,
    measures,
    dimensions,
    dates,
    timeDimensions,
    nativeTimeGrain,
    candidateTargets,
    outcomeCandidates: sortedMeasures,
    targetCandidates,
    glossary: params.glossary,
    businessGlossary: params.glossary,
    relationships: params.relationships,
    dataModel: params.relationships.length ? {
      primaryTable: params.relationships[0].sourceTable,
      dimensionTables: Array.from(new Set(params.relationships.map(r => r.targetTable))),
      relationships: params.relationships
    } : undefined,
    qualityReport: params.qualityReport,
    cleaningHistory: params.qualityReport.auditLog || [],
    tables: params.sourceMetadata.tables,
    capabilities: params.capabilities,
    userIntent: defaultIntent,
    analysisPlan: params.analysisPlan,
    uncertainties,
    validatedFindings: params.validatedFindings,
    observations: params.observations,
    recommendations: params.recommendations,
    derivedMetrics: params.derivedMetrics,
    dashboardQuality: params.dashboardQuality,
    primaryDateColumn: primaryDate,
    primaryMetricColumn: sortedMeasures[0]?.technicalName,
    primaryDimensionColumn: sortedDimensions[0]?.technicalName,
    primaryTargetColumn: primaryTarget,
    rawSample: params.rawSample.slice(0, 50),
    cleanedRows: params.cleanedRows
  };
}
