// DataWhiz AI — Unified Authoritative Type Definitions

export type PhysicalType = 'string' | 'number' | 'boolean' | 'date' | 'null' | 'mixed' | 'object';

export type LogicalType = 
  | 'identifier'
  | 'date'
  | 'time'
  | 'datetime'
  | 'measure_currency'
  | 'measure_quantity'
  | 'measure_percentage'
  | 'measure_rate'
  | 'measure_count'
  | 'dimension_category'
  | 'dimension_geo'
  | 'dimension_demographic'
  | 'dimension_ordinal'
  | 'target_binary'
  | 'target_continuous'
  | 'free_text'
  | 'code';

export type SemanticRole =
  | 'identifier'
  | 'primary_key'
  | 'foreign_key'
  | 'entity'
  | 'measure'
  | 'primary_metric'
  | 'secondary_metric'
  | 'dimension'
  | 'primary_dimension'
  | 'secondary_dimension'
  | 'date'
  | 'datetime'
  | 'timestamp'
  | 'category'
  | 'ordinal'
  | 'boolean'
  | 'currency'
  | 'percentage'
  | 'rate'
  | 'ratio'
  | 'quantity'
  | 'count'
  | 'duration'
  | 'geographic'
  | 'geographic_entity'
  | 'free_text'
  | 'target_candidate'
  | 'target_variable'
  | 'outcome_candidate'
  | 'marketing_channel'
  | 'marketing_metric'
  | 'customer_attribute'
  | 'product_attribute'
  | 'technical'
  | 'metadata'
  | 'unknown'
  | 'unclassified';

export type MeasurementType =
  | 'currency'
  | 'percentage'
  | 'ratio'
  | 'count'
  | 'mass'
  | 'volume'
  | 'distance'
  | 'area'
  | 'temperature'
  | 'duration'
  | 'rate'
  | 'quantity'
  | 'identifier'
  | 'unitless'
  | 'unknown';

export type CurrencyCode =
  | 'USD'
  | 'EUR'
  | 'INR'
  | 'GBP'
  | 'JPY'
  | 'CAD'
  | 'AUD'
  | 'CHF'
  | 'CNY'
  | 'unspecified'
  | 'none';

export type AggregationBehavior =
  | 'additive'
  | 'semi_additive'
  | 'non_additive'
  | 'snapshot'
  | 'rate'
  | 'ratio'
  | 'percentage'
  | 'average_like'
  | 'unknown';

export type AllowedAggregation =
  | 'sum'
  | 'mean'
  | 'median'
  | 'min'
  | 'max'
  | 'count'
  | 'distinct_count'
  | 'weighted_average'
  | 'latest'
  | 'earliest'
  | 'none';

export type SemanticPolarity = 'favorable' | 'unfavorable' | 'neutral' | 'unknown';

export interface UnitMetadata {
  measurementType: MeasurementType;
  unitName?: string;
  unitSymbol?: string;
  currencyCode?: CurrencyCode;
  percentageScale?: '0_to_1' | '0_to_100';
  displayFormat?: string;
}

export interface TableSpec {
  tableName: string;
  columns: string[];
  rows: Record<string, any>[];
  schemas?: ColumnSchema[];
  primaryKey?: string;
  foreignKeys?: string[];
}

export interface AnalyticalViewResult {
  analyticalRows: Record<string, any>[];
  mergedColumns: string[];
  relationships: TableRelationship[];
  factTable: string;
  dimensionTables: string[];
  joinWarnings: string[];
}

export interface SourceMetadata {
  sourceType: 'csv' | 'xlsx' | 'json' | 'parquet';
  fileName: string;
  fileSize: number;
  mimeType: string;
  sheets?: string[];
  activeSheet?: string;
  tables?: TableSpec[];
  rowCount: number;
  colCount: number;
  delimiter?: string;
  encoding?: string;
  hasHeader: boolean;
  warnings: string[];
  status: 'valid' | 'warning' | 'error';
}

export interface ColumnSchema {
  name: string;
  technicalName: string;
  displayName: string;
  businessMeaning: string;
  physicalType: PhysicalType;
  logicalType: LogicalType;
  semanticRole: SemanticRole;
  confidence: number;
  isNullable: boolean;
  isPrimaryKeyCandidate: boolean;
  isForeignKeyCandidate: boolean;
  isConstant: boolean;
  isHighCardinality: boolean;
  possibleUsage: string[];
  interpretationUncertain: boolean;
  requiresReview?: boolean;
  evidence?: string[];
  alternatives?: string[];
  unit?: string;
  measurementType?: MeasurementType;
  unitMetadata?: UnitMetadata;
  aggregationBehavior?: AggregationBehavior;
  allowedAggregations?: AllowedAggregation[];
  polarity?: SemanticPolarity;
}

export interface NumericProfile {
  min: number;
  max: number;
  mean: number;
  median: number;
  std: number;
  p25: number;
  p75: number;
  p95: number;
  skewness: number;
  kurtosis: number;
  zeroCount: number;
  negativeCount: number;
  outlierCount: number;
  outlierIndices: number[];
  histogram: { binStart: number; binEnd: number; count: number }[];
}

export interface CategoricalProfile {
  cardinality: number;
  topValues: { value: string; count: number; percentage: number }[];
  rareValues: { value: string; count: number }[];
  mode: string;
}

export interface DateProfile {
  minDate: string;
  maxDate: string;
  rangeDays: number;
  detectedGrain: 'day' | 'week' | 'month' | 'quarter' | 'year' | 'mixed';
  gapsDetected: string[];
  distinctDates: number;
  invalidDatesCount: number;
}

export interface ColumnProfile {
  name: string;
  technicalName: string;
  totalCount: number;
  missingCount: number;
  missingPercentage: number;
  uniqueCount: number;
  uniquePercentage: number;
  duplicateCount: number;
  sampleValues: (string | number | boolean | null)[];
  type: 'numeric' | 'categorical' | 'date' | 'boolean' | 'mixed';
  numeric?: NumericProfile;
  categorical?: CategoricalProfile;
  date?: DateProfile;
}

export interface TargetCandidate {
  column: string;
  purpose: string;
  taskType: 'binary_classification' | 'multiclass_classification' | 'regression' | 'forecasting' | 'none';
  confidence: number;
  evidence: string[];
  leakageRisk: 'high' | 'medium' | 'low' | 'none';
  usable: boolean;
  positiveClass?: string;
  polarity?: SemanticPolarity;
  classDistribution?: Record<string, number>;
}

export interface DomainInfo {
  primaryDomain: string; // e.g. "Retail & E-commerce", "SaaS & Subscription", "Industrial Manufacturing", "General Tabular"
  confidence: number;
  evidence: string[];
  alternativeDomains: { domain: string; confidence: number }[];
  detectedEntities: string[];
}

export interface BusinessGlossaryNode {
  category: string;
  description: string;
  columns: string[];
  subcategories?: BusinessGlossaryNode[];
}

export interface TableRelationship {
  sourceTable: string;
  sourceColumn: string;
  targetTable: string;
  targetColumn: string;
  relationshipType: '1:1' | '1:N' | 'N:1' | 'N:M';
  overlapPercentage: number;
  confidence: number;
  referentialIntegrity: boolean;
  joinExplosionRisk: boolean;
  validationNote: string;
}

export type QualityIssueType =
  | 'missing_values'
  | 'duplicate_records'
  | 'mixed_date_formats'
  | 'invalid_dates'
  | 'numeric_as_string'
  | 'inconsistent_casing'
  | 'whitespace_padding'
  | 'impossible_values'
  | 'constant_column'
  | 'high_cardinality_text'
  | 'extreme_outliers';

export interface QualityIssue {
  column: string;
  issueType: QualityIssueType;
  description: string;
  severity: 'low' | 'medium' | 'high';
  affectedRows: number;
  affectedPercentage: number;
  sampleValues: string[];
  suggestedAction: string;
}

export interface AuditRecord {
  id: string;
  column: string;
  issueType: QualityIssueType;
  actionTaken: string;
  reason: string;
  rowsAffected: number;
  beforeSummary: string;
  afterSummary: string;
  confidence: number;
  timestamp: string;
}

export interface DataQualityReport {
  overallScore: number; // 0 to 100
  totalRows: number;
  totalColumns: number;
  cleanRows: number;
  issues: QualityIssue[];
  auditLog: AuditRecord[];
}

export interface CapabilityInfo {
  name: string;
  supported: boolean;
  confidence: number;
  reason: string;
  requirements: string[];
  available_inputs: string[];
  missing_inputs: string[];
  warnings?: string[];
  requiredColumns?: string[];
  missingPrerequisites?: string[];
}

export type CapabilityType =
  | 'eda'
  | 'descriptive_stats'
  | 'distribution'
  | 'comparison'
  | 'trend'
  | 'period_comparison'
  | 'correlation_analysis'
  | 'lag_analysis'
  | 'time_series_forecasting'
  | 'trend_decomposition'
  | 'regression_modeling'
  | 'classification_churn'
  | 'clustering_segmentation'
  | 'anomaly_detection'
  | 'cohort'
  | 'ranking'
  | 'driver_analysis'
  | 'statistical_testing'
  | 'geographic_breakdown'
  | 'product_investment_scoring';

export type CapabilityMap = Record<CapabilityType, CapabilityInfo>;

export interface UserIntent {
  mode: 'auto' | 'requested';
  rawQuery?: string;
  targetMetric?: string;
  targetDimension?: string;
  filters?: Record<string, string>;
  timeGrain?: 'day' | 'week' | 'month' | 'year';
  forecastHorizon?: number;
  requestedAnalyses?: CapabilityType[];
}

export interface DerivedMetric {
  id: string;
  name: string;
  displayName: string;
  formula: string;
  inputs: string[];
  assumptions: string;
  validity: boolean;
  value: number;
  formattedValue: string;
  description: string;
}

export interface DashboardQualityCheckResult {
  score: number; // 0 to 100
  kpiHealth: { validCount: number; issues: string[] };
  figureHealth: { validCount: number; redundantPruned: number; issues: string[] };
  sectionHealth: { activeSections: string[]; omittedSections: string[] };
  groundingHealth: { verifiedClaimsCount: number; unverifiedClaimsCount: number };
  passed: boolean;
}

export interface TimeDimensionInfo {
  column: string;
  grain: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly' | 'mixed';
  startDate: string;
  endDate: string;
  totalPeriods: number;
  gapsDetected: string[];
}

export interface DatasetContext {
  id: string;
  jobId: string;
  createdAt: string;
  source: SourceMetadata;
  sourceMetadata: SourceMetadata;
  tables?: TableSpec[];
  schema: ColumnSchema[];
  profiles: ColumnProfile[];
  semanticSchema: ColumnSchema[];
  humanFriendlyNames: Record<string, string>;
  domain: DomainInfo;
  domainHypotheses?: { domain: string; confidence: number; evidence: string[] }[];
  entities: string[];
  measures: ColumnSchema[];
  dimensions: ColumnSchema[];
  dates: ColumnSchema[];
  timeDimensions?: TimeDimensionInfo;
  nativeTimeGrain?: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly' | 'mixed' | 'none';
  candidateTargets: ColumnSchema[];
  outcomeCandidates?: ColumnSchema[];
  targetCandidates?: TargetCandidate[];
  relationships: TableRelationship[];
  dataModel?: {
    primaryTable: string;
    dimensionTables: string[];
    relationships: TableRelationship[];
  };
  glossary?: BusinessGlossaryNode[];
  businessGlossary?: BusinessGlossaryNode[];
  qualityReport: DataQualityReport;
  cleaningHistory: AuditRecord[];
  capabilities: CapabilityMap;
  userIntent: UserIntent;
  analysisPlan?: AnalysisPlan;
  understandingReport?: DatasetUnderstandingReport;
  archetype?: DatasetArchetype;
  uncertainties?: string[];
  businessQuestions?: BusinessQuestion[];
  specializedAnalysis?: SpecializedAnalysisResult;
  qualityGate?: QualityGateReport;
  crypticInterpretations?: Record<string, CrypticInterpretation>;
  validatedFindings?: Finding[];
  observations?: AIObservation[];
  recommendations?: InvestmentRecommendation[];
  derivedMetrics?: DerivedMetric[];
  dashboardQuality?: DashboardQualityCheckResult;
  primaryDateColumn?: string;
  primaryMetricColumn?: string;
  primaryDimensionColumn?: string;
  primaryTargetColumn?: string;
  rawSample: Record<string, any>[];
  cleanedRows: Record<string, any>[];
}

export type FindingNature = 'FACT' | 'CALCULATED_FINDING' | 'OBSERVATION' | 'HYPOTHESIS' | 'RECOMMENDATION';

export interface Finding {
  id: string;
  statement: string;
  type: 'growth' | 'decline' | 'concentration' | 'correlation' | 'anomaly' | 'forecast' | 'distribution' | 'quality' | 'segmentation' | 'driver' | 'comparison';
  nature?: FindingNature;
  metric: string;
  dimension?: string;
  value: number | string;
  comparisonValue?: number | string;
  percentageChange?: number;
  magnitude?: number;
  evidence: string;
  confidence: 'high' | 'medium' | 'low';
  analysisTaskId?: string;
  statisticalStrength?: number;
  businessRelevance?: number;
  actionability?: number;
  novelty?: number;
  limitations?: string;
  statisticalSignificance?: number; // p-value
}

export interface AIObservation {
  id: string;
  findingId?: string;
  title: string;
  text: string;
  fact?: string;
  interpretation?: string;
  hypothesis?: string;
  supportingMetrics: { label: string; value: string | number }[];
  impactLevel: 'positive' | 'negative' | 'neutral' | 'critical';
  confidenceNote: string;
  chartSpecRef?: string;
}

export interface InvestmentRecommendation {
  entity: string;
  investmentScore: number; // 0 to 100
  recommendation: 'Strong Buy / Invest' | 'Moderate Invest' | 'Hold / Monitor' | 'Re-evaluate / Divest';
  scoreBreakdown: {
    growthScore: number;
    marginScore: number;
    trendScore: number;
    riskScore: number;
  };
  reasons: string[];
  risks: string[];
  evidence: string;
  confidence: number;
  limitations: string;
  suggestedNextStep?: string;
}

export interface ChartPoint {
  x: string | number;
  y: number;
  label?: string;
  group?: string;
  extra?: Record<string, any>;
}

export interface DynamicChartSpec {
  id: string;
  findingId?: string;
  question?: string;
  title: string;
  subtitle?: string;
  why: string;
  reasonForChart?: string;
  type: 'bar' | 'line' | 'pie' | 'donut' | 'area' | 'scatter' | 'heatmap' | 'radar' | 'horizontal_bar' | 'histogram' | 'box';
  x?: string;
  y?: string;
  xField?: string;
  yField?: string;
  xLabel?: string;
  yLabel?: string;
  unit?: string;
  unitMetadata?: UnitMetadata;
  isSourceDerivedDimension?: boolean;
  hasMeaningfulLabels?: boolean;
  indexFallbackDetected?: boolean;
  timeGrain?: string;
  legend?: string;
  tooltipFields?: string[];
  groupBy?: string;
  agg?: 'sum' | 'avg' | 'count' | 'min' | 'max';
  data: any[];
  yMaxLabel?: string;
  yMinLabel?: string;
  forecastPoints?: { x: string; y: number; lower: number; upper: number }[];
  limits?: { label: string; value: number; active: boolean }[];
  layoutSpan?: 'full' | 'half';
  height?: number;
  multiDatasets?: {
    label: string;
    data: number[];
    color?: string;
    backgroundColor?: string;
    borderDash?: number[];
    fill?: boolean;
    pointRadius?: number;
  }[];
  calloutText?: string;
  category?: CapabilityType;
  metric?: string;
  dimension?: string;
  purpose?: string;
  score?: number;
  confidence?: number;
}

export interface KpiCardData {
  id: string;
  label: string;
  value: string;
  rawValue: number;
  role?: 'primary' | 'secondary' | 'diagnostic' | 'derived';
  delta?: string;
  deltaPercent?: number;
  comparisonType?: 'yoy' | 'period' | 'cohort' | 'benchmark' | 'none';
  comparisonPeriodLabel?: string;
  isPositive?: boolean;
  note: string;
  how: string;
  sparkline?: number[];
  columnRef?: string;
  derivedMetricRef?: string;
  confidence?: number;
  importanceScore?: number;
}

export interface DashboardTabConfig {
  id: string;
  label: string;
  icon?: string;
  isDomainSpecific?: boolean;
  sectionType?: string;
}

export interface AskDataTurn {
  id: string;
  who: 'user' | 'assistant';
  text: string;
  timestamp: string;
  chart?: DynamicChartSpec;
  tableData?: { headers: string[]; rows: (string | number)[][] };
  findings?: Finding[];
  observation?: AIObservation;
  recommendation?: InvestmentRecommendation;
  calculationExplanation?: string;
  provenance?: {
    toolName: string;
    sourceColumns: string[];
    sampleSize: number;
    aggregation?: string;
    filters?: Record<string, any>;
  };
  pinned?: boolean;
}

export interface BusinessQuestion {
  id: string;
  category: 'PERFORMANCE' | 'TREND' | 'COMPARISON' | 'DRIVERS' | 'RELATIONSHIPS' | 'CONTRIBUTION' | 'SEGMENTATION' | 'ANOMALY' | 'RISK' | 'OPPORTUNITY' | 'FORECAST' | 'DECISION';
  question: string;
  whyItMatters: string;
  requiredFields: string[];
  analysisType: CapabilityType;
  answerSummary?: string;
  supportedMetric?: string;
  confidence: number;
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  supported: boolean;
  reason?: string;
}

export interface AnalysisTask {
  id: string;
  title: string;
  question?: string;
  purpose?: string;
  analysisType: CapabilityType;
  category: CapabilityType;
  target?: string;
  measures?: string[];
  dimensions?: string[];
  filters?: Record<string, any>;
  timeField?: string;
  timeGrain?: string;
  aggregation?: 'sum' | 'avg' | 'count' | 'min' | 'max';
  requiredTools: string[];
  requiredColumns: string[];
  priority: 'HIGH' | 'MEDIUM' | 'LOW' | 'NOT_SUPPORTED';
  priorityScore: number;
  relevance: number;
  businessValue: number;
  dataSufficiency: number;
  statisticalValidity: number;
  interpretability: number;
  computationalCost: number;
  userIntentMatch: number;
  confidence: number;
  rationale: string;
  status: 'PENDING' | 'EXECUTING' | 'COMPLETED' | 'SKIPPED';
  dependencies?: string[];
  validationRequirements?: string[];
}

export interface AnalysisPlan {
  planSummary: string;
  tasks: AnalysisTask[];
  highPriorityTasks: AnalysisTask[];
  skippedTasks: { category: CapabilityType; reason: string }[];
}

export interface AnalysisResult<T = any> {
  taskId: string;
  tool: string;
  sourceColumns: string[];
  sourceTables?: string[];
  operation?: string;
  filters?: Record<string, any>;
  aggregation?: string;
  timeGrain?: string;
  sampleSize: number;
  data: T;
  diagnostics?: Record<string, any>;
  unitMetadata?: UnitMetadata;
  warnings: string[];
  validationStatus: 'VALID' | 'VALID_WITH_WARNING' | 'INVALID';
  validationReason?: string;
  confidence?: number;
  provenance: {
    executedAt: string;
    engine: string;
    durationMs: number;
  };
}

export type DatasetArchetype =
  | 'marketing_media_mix'
  | 'commercial_relational'
  | 'customer_churn'
  | 'manufacturing_quality'
  | 'financial_time_series'
  | 'general_tabular';

export interface CrypticInterpretation {
  technicalName: string;
  decodedName: string;
  channelFamily?: string;
  mediaType?: string;
  subType?: string;
  unit: 'impressions' | 'clicks' | 'grp' | 'volume' | 'currency' | 'percentage' | 'count' | 'unknown';
  confidence: number;
  evidence: string;
  uncertainFlag: boolean;
}

export interface DatasetUnderstandingReport {
  datasetSummary: string;
  archetype: DatasetArchetype;
  archetypeConfidence: number;
  primaryDomain: string;
  primaryOutcome: string;
  secondaryOutcomes: string[];
  explanatoryVariables: string[];
  primaryEntity: string;
  timeDimension?: TimeDimensionInfo;
  keyDimensions: string[];
  keyMeasures: string[];
  trustworthyInsights: string[];
  uncertaintiesAndRisks: string[];
  recommendedAnalyticalStrategy: string;
  unsupportedAnalyses: { analysis: string; reason: string }[];
  highPriorityQuestions: string[];
}

export interface SpecializedAnalysisResult {
  archetype: DatasetArchetype;
  marketingMmm?: {
    targetMetric: string;
    totalSales: number;
    avgWeeklySales: number;
    mediaDrivers: any[];
    topChannelFamilyShare: { family: string; volume: number; sharePct: number }[];
    searchVsSocialComparison: any;
    efficiencyRankings: any[];
  };
  churnClassification?: {
    targetMetric: string;
    overallChurnRate: number;
    highRiskCohorts: any[];
    topRiskDrivers: any[];
  };
  manufacturingQuality?: {
    defectRate: number;
    topDefectMachines: any[];
    cycleTimeStats: { mean: number; p95: number };
  };
}

export interface QualityGateReport {
  dataUnderstandingPassed: boolean;
  analysisPassed: boolean;
  visualizationPassed: boolean;
  dashboardPassed: boolean;
  overallPassed: boolean;
  blockingErrors: string[];
  warnings: string[];
}

// -------------------------------------------------------------
// Dashboard Specification & Dynamic Section Architecture
// -------------------------------------------------------------

export type DashboardSectionType =
  | 'kpi_group'
  | 'chart'
  | 'chart_grid'
  | 'table'
  | 'narrative'
  | 'findings'
  | 'recommendations'
  | 'statistics'
  | 'forecast'
  | 'model_result'
  | 'data_quality'
  | 'data_dictionary';

export interface DashboardSection {
  id: string;
  title: string;
  subtitle?: string;
  sectionType: DashboardSectionType;
  layoutSpan?: 'full' | 'half' | 'third';
  kpis?: KpiCardData[];
  chart?: DynamicChartSpec;
  charts?: DynamicChartSpec[];
  tableData?: { headers: string[]; rows: (string | number)[][] };
  findings?: Finding[];
  observations?: AIObservation[];
  recommendations?: InvestmentRecommendation[];
  derivedMetrics?: DerivedMetric[];
  metadata?: Record<string, any>;
}

export interface DashboardSpec {
  id: string;
  title: string;
  subtitle: string;
  datasetSummary: string;
  filters: {
    column: string;
    label: string;
    options: string[];
    defaultOption?: string;
  }[];
  overview: {
    kpis: KpiCardData[];
    heroVisuals: DynamicChartSpec[];
    topFindings: Finding[];
    recommendations: InvestmentRecommendation[];
  };
  sections: DashboardSection[];
  tabs: DashboardTabConfig[];
  metadata: {
    generatedAt: string;
    domain: string;
    archetype: string;
    totalRows: number;
    totalColumns: number;
    provenanceEngine: string;
  };
}

export interface GeneratedDashboard {
  summary: string;
  domainLabel: string;
  confidenceNote: string;
  tabs: DashboardTabConfig[];
  kpis: KpiCardData[];
  charts: DynamicChartSpec[];
  suggestedQuestions: string[];
  derivedMetrics: DerivedMetric[];
  qualityCheck: DashboardQualityCheckResult;
  spec?: DashboardSpec;
}

export interface DatasetNarrative {
  overviewText: string;
  primaryDomain: string;
  keyEntities: string[];
  keyMeasures: string[];
  keyDimensions: string[];
  timeCoverage?: string;
  majorOpportunities: string[];
  limitations: string[];
}

export interface ScoredVisualization {
  chart: DynamicChartSpec;
  score: number;
  relevance: number;
  readability: number;
  evidenceStrength: number;
  businessValue: number;
  clutterPenalty: number;
  redundancyPenalty: number;
  priority: 'HERO' | 'PRIMARY' | 'SECONDARY' | 'SUPPORTING';
}

export interface MediaChannelDriver {
  channelCode: string;
  displayName: string;
  channelFamily: string;
  unit: string;
  totalVolume: number;
  volumeSharePct: number;
  correlationWithSales: number;
  elasticityCategory: 'High Driver' | 'Moderate Driver' | 'Low / Saturated' | 'Negative / Inverse';
  avgWeeklyVolume: number;
}
