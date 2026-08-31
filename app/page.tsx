'use client';

import React, { useState, useMemo, useRef, useEffect } from 'react';
import { runFullAnalysisPipeline, PipelineExecutionResult } from '@/lib/pipeline';
import { processAskQuery, buildChartForSpec } from '@/lib/askDataEngine';
import {
  fetchAiPlan,
  fetchLiveNews,
  fetchCrossReadInsights,
  fetchAiStatNotes,
  fetchAiAskResponse
} from '@/lib/services/clientApi';
import { AskDataTurn, DynamicChartSpec } from '@/lib/types';
import { generateDashboard } from '@/lib/dashboard/dashboardGenerator';
import { safeIsoDate } from '@/lib/schema/schemaDetector';
import { Sidebar } from '@/components/navigation/Sidebar';
import { UploadWorkspace } from '@/components/upload/UploadWorkspace';
import { KpiGrid } from '@/components/kpi/KpiCard';
import { ChartFigure } from '@/components/charts/ChartFigure';
import { AskDataChat } from '@/components/ai/AskDataChat';
import { DataDictionaryView } from '@/components/dictionary/DataDictionaryView';
import { DataQualityView } from '@/components/quality/DataQualityView';
import { StatisticsView } from '@/components/statistics/StatisticsView';
import { DataTableExplorer } from '@/components/tables/DataTableExplorer';
import { InsightsDecisionsView } from '@/components/insights/InsightsDecisionsView';
import { MarketNewsView } from '@/components/news/MarketNewsView';
import { ContextualAskModal } from '@/components/ai/ContextualAskModal';
import { GenericSectionRenderer } from '@/components/dashboard/GenericSectionRenderer';
import {
  DayWiseView,
  WeeklyView,
  WeekdayView,
  MonthlyView,
  YearlyView,
  ProductsView,
  CategoryView,
  LocationsView,
  RegionsView,
  ForecastView,
  TargetCohortsView,
  MarketingMediaView
} from '@/components/views/DomainViews';
import { MessageSquare, TrendingUp, Sparkles, Filter, RotateCcw, AlertTriangle, ChevronDown, ChevronUp, Trash2, Zap } from 'lucide-react';

export default function AutoDataAiPlatform() {
  const [pipelineResult, setPipelineResult] = useState<PipelineExecutionResult | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [pipelineStep, setPipelineStep] = useState(0);
  const [pipelineError, setPipelineError] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState('overview');
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [period, setPeriod] = useState<string>('all');

  // Live Tavily News & Gemini Insights
  const [newsItems, setNewsItems] = useState<any[]>([]);
  const [liveInsights, setLiveInsights] = useState<string[]>([]);
  const [isNewsLoading, setIsNewsLoading] = useState(false);

  // Chat & Ask Your Data (Unified Global Drawer)
  const [chatTurns, setChatTurns] = useState<AskDataTurn[]>([]);
  const [pinnedCharts, setPinnedCharts] = useState<DynamicChartSpec[]>([]);
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [isChatDrawerOpen, setIsChatDrawerOpen] = useState(true);
  const [bottomChatQuery, setBottomChatQuery] = useState('');
  const chatScrollRef = useRef<HTMLDivElement>(null);

  // Contextual Ask Modal
  const [contextModal, setContextModal] = useState<{
    isOpen: boolean;
    subject: string;
    initialQuery: string;
  }>({
    isOpen: false,
    subject: '',
    initialQuery: ''
  });

  // Auto-scroll chat drawer on new response
  useEffect(() => {
    if (chatTurns.length > 0 && chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [chatTurns, isChatLoading]);

  // Non-blocking Pipeline Execution
  const handleDataLoaded = (data: { csvContent?: string; excelBuffer?: ArrayBuffer; fileName: string; prompt?: string }) => {
    setIsProcessing(true);
    setPipelineError(null);
    setPipelineStep(1);

    setTimeout(() => {
      try {
        setPipelineStep(4);
        const result = runFullAnalysisPipeline(data);
        setPipelineStep(8);

        setPipelineResult(result);
        setActiveTab('overview');
        setFilters({});
        setPeriod('all');
        setChatTurns([]);
        setPinnedCharts([]);
        setIsProcessing(false);

        // Asynchronously fetch live news via Tavily
        const domain = result.context.domain.primaryDomain;
        setIsNewsLoading(true);
        fetchLiveNews(domain)
          .then(items => {
            setNewsItems(items || []);
            setIsNewsLoading(false);

            if (items && items.length > 0) {
              const kpiSummary = result.dashboard.kpis.map(k => `${k.label}: ${k.value}`).join(', ');
              fetchCrossReadInsights(domain, items.slice(0, 3), kpiSummary, result.dashboard.kpis)
                .then(insights => setLiveInsights(insights || []))
                .catch(() => {});
            }
          })
          .catch(() => setIsNewsLoading(false));

        // Fetch AI Planning narrative
        const profileSummary = result.context.schema.map(s => `${s.displayName} (${s.technicalName})`).join(', ');
        fetchAiPlan(profileSummary, data.fileName, result.context.domain.primaryDomain, result.context.capabilities, data.prompt)
          .then(plan => {
            if (plan && plan.planSummary) {
              result.dashboard.confidenceNote = plan.planSummary;
              setPipelineResult({ ...result });
            }
          })
          .catch(() => {});

      } catch (err: any) {
        console.error('[Pipeline Execution Error]', err);
        setPipelineError(err.message || 'Failed to process dataset. Please verify format.');
        setIsProcessing(false);
      }
    }, 50);
  };

  const handleRefreshNews = () => {
    if (!pipelineResult) return;
    const domain = pipelineResult.context.domain.primaryDomain;
    setIsNewsLoading(true);
    fetchLiveNews(domain)
      .then(items => {
        setNewsItems(items || []);
        setIsNewsLoading(false);
        if (items && items.length > 0) {
          const kpiSummary = pipelineResult.dashboard.kpis.map(k => `${k.label}: ${k.value}`).join(', ');
          fetchCrossReadInsights(domain, items.slice(0, 3), kpiSummary, pipelineResult.dashboard.kpis)
            .then(insights => setLiveInsights(insights || []))
            .catch(() => {});
        }
      })
      .catch(() => setIsNewsLoading(false));
  };

  const schemas = pipelineResult?.context.schema || [];
  const rawRows = pipelineResult?.context.cleanedRows || [];
  const dateCol = pipelineResult?.context.primaryDateColumn;

  // Extract filterable dimensions (cardinality between 2 and 25)
  const baseFilterableCols = useMemo(() => {
    if (!schemas.length || !rawRows.length) return [];
    return schemas
      .filter(s => {
        if (s.physicalType === 'date' || s.semanticRole === 'primary_key' || s.semanticRole === 'timestamp') return false;
        return s.logicalType.startsWith('dimension') || s.physicalType === 'string' || s.logicalType.startsWith('target') || s.semanticRole === 'category' || s.semanticRole === 'boolean' || s.semanticRole === 'target_variable';
      })
      .map(s => {
        const set = new Set<string>();
        const stride = rawRows.length > 10000 ? Math.ceil(rawRows.length / 5000) : 1;
        for (let i = 0; i < rawRows.length; i += stride) {
          const rawVal = rawRows[i][s.technicalName];
          if (rawVal !== undefined && rawVal !== null && rawVal !== '') {
            set.add(String(rawVal).trim());
            if (set.size > 25) break;
          }
        }
        return {
          name: s.technicalName,
          displayName: s.displayName,
          options: Array.from(set).sort()
        };
      })
      .filter(f => f.options.length >= 2 && f.options.length <= 25)
      .slice(0, 4);
  }, [schemas, rawRows]);

  const filterableCols = useMemo(() => {
    return baseFilterableCols.map(f => ({
      ...f,
      selected: filters[f.name] || ''
    }));
  }, [baseFilterableCols, filters]);

  // Scoped Rows with Zero-Allocation Fast Path (<2ms execution on 100k+ rows)
  const scopedRows = useMemo(() => {
    if (!rawRows.length) return [];
    const hasActiveFilters = Object.keys(filters).some(k => Boolean(filters[k]));
    const hasActivePeriod = period !== 'all' && Boolean(dateCol);

    if (!hasActiveFilters && !hasActivePeriod) {
      return rawRows;
    }

    const activeFilterEntries = Object.entries(filters).filter(([_, v]) => Boolean(v));
    let matched: Record<string, any>[] = [];

    if (activeFilterEntries.length > 0) {
      for (let i = 0; i < rawRows.length; i++) {
        const r = rawRows[i];
        let pass = true;
        for (let j = 0; j < activeFilterEntries.length; j++) {
          const [col, val] = activeFilterEntries[j];
          if (String(r[col] ?? '').trim() !== val) {
            pass = false;
            break;
          }
        }
        if (pass) matched.push(r);
      }
    } else {
      matched = rawRows.slice();
    }

    if (hasActivePeriod && dateCol && matched.length > 0) {
      const dateSet = new Set<string>();
      for (let i = 0; i < matched.length; i++) {
        const rawDate = matched[i][dateCol];
        const d = safeIsoDate(rawDate) || String(rawDate ?? '').trim();
        if (d) dateSet.add(d);
      }
      const sortedDates = Array.from(dateSet).sort();
      const nPeriods = period === 'last1' ? 1 : period === 'last4' ? 4 : 8;
      const keepDates = new Set(sortedDates.slice(-nPeriods));
      return matched.filter(r => {
        const rawDate = r[dateCol];
        const d = safeIsoDate(rawDate) || String(rawDate ?? '').trim();
        return keepDates.has(d);
      });
    }

    return matched;
  }, [rawRows, filters, period, dateCol]);

  // Dynamically recomputed dashboard when filters or time period change
  const dynamicDashboard = useMemo(() => {
    if (!pipelineResult) return null;
    const hasActiveFilters = Object.keys(filters).some(k => Boolean(filters[k]));
    const hasActivePeriod = period !== 'all';

    if (!hasActiveFilters && !hasActivePeriod && scopedRows.length === rawRows.length) {
      return pipelineResult.dashboard;
    }

    try {
      return generateDashboard({
        ...pipelineResult.context,
        cleanedRows: scopedRows
      });
    } catch (err) {
      console.warn('[Dynamic Dashboard Recalculation]', err);
      return pipelineResult.dashboard;
    }
  }, [pipelineResult, scopedRows, rawRows, filters, period]);

  // If no dataset loaded, show Upload Workspace
  if (!pipelineResult) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex flex-col justify-between p-4 sm:p-6 overflow-y-auto">
        <div className="flex-1 flex items-center justify-center py-2 sm:py-4">
          <UploadWorkspace
            onDataLoaded={handleDataLoaded}
            isProcessing={isProcessing}
            pipelineStep={pipelineStep}
          />
        </div>
        <footer className="flex-none py-2.5 px-4 text-center text-[11.5px] text-[#64748B] border border-[#E2E8F0] bg-white rounded-xl max-w-5xl mx-auto w-full shadow-2xs">
          DataWhiz AI Platform &copy; 2026 &bull; Real Deterministic Analytics &bull; LLM Structured Intelligence
        </footer>
      </div>
    );
  }

  const { context, dashboard: initialDashboard, findings, observations, recommendations, statistics, forecast } = pipelineResult;
  const dashboard = dynamicDashboard || initialDashboard;

  // Ask Data Message Handler with Deterministic Verification + Deep AI Synthesis
  const handleSendMessage = async (query: string) => {
    if (!context || !query.trim()) return;

    const userTurn: AskDataTurn = {
      id: `u-${Date.now()}`,
      who: 'user',
      text: query.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setChatTurns(prev => [...prev, userTurn]);
    setIsChatLoading(true);
    setIsChatDrawerOpen(true);

    try {
      // 1. Run deterministic local intelligence engine (supports graph requests, ranking, comparisons, anomaly, correlation, glossary)
      const responseTurn = processAskQuery(query.trim(), context);

      // 2. Fetch AI synthesis from LLM with full context
      const profileText = schemas.map(s => `• ${s.displayName} (${s.technicalName}): ${s.logicalType}, ${s.businessMeaning}`).join('\n');
      const kpisText = dashboard.kpis.map(k => `${k.label}: ${k.value} (${k.note || ''})`).join(', ');
      const history = chatTurns.slice(-4).map(c => ({ role: c.who === 'user' ? 'user' : 'assistant', content: c.text }));
      const sampleData = (context.cleanedRows || []).slice(0, 3);

      const aiResult = await fetchAiAskResponse(query.trim(), profileText, history, {
        domain: context.domain?.primaryDomain,
        kpisText,
        sampleData
      });

      if (aiResult) {
        // If LLM specified a chartSpec and local turn doesn't already have one
        if (aiResult.chartSpec && !responseTurn.chart) {
          const generatedChart = buildChartForSpec(context.cleanedRows, schemas, aiResult.chartSpec);
          if (generatedChart) {
            responseTurn.chart = generatedChart;
          }
        }

        // If LLM provided an insightful response
        if (aiResult.text && !aiResult.text.includes('has been processed against the verified data context') && !aiResult.text.includes('direct executive answer citing verified figures')) {
          responseTurn.text = aiResult.text;
        }
      }

      setChatTurns(prev => [...prev, responseTurn]);
    } catch (err) {
      console.error('[Ask Data Error]', err);
    } finally {
      setIsChatLoading(false);
    }
  };

  const handleBottomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!bottomChatQuery.trim()) return;
    handleSendMessage(bottomChatQuery.trim());
    setBottomChatQuery('');
  };

  const handlePinChart = (chart: DynamicChartSpec) => {
    setPinnedCharts(prev => {
      if (prev.some(c => c.id === chart.id)) return prev;
      return [...prev, chart];
    });
  };

  const handleOpenContextAsk = (subject: string, initialQuery: string = '') => {
    setContextModal({
      isOpen: true,
      subject,
      initialQuery
    });
  };

  return (
    <div className="flex h-screen overflow-hidden bg-[#F8FAFC]">
      {/* Sidebar Navigation */}
      <Sidebar
        tabs={dashboard.tabs}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        domain={context.domain}
        onResetData={() => setPipelineResult(null)}
        newsItems={newsItems}
        isLoadingNews={isNewsLoading}
      />

      {/* Main Workspace Column */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        {/* Top Sticky Header */}
        <header className="flex-none p-3.5 px-6 bg-white/85 backdrop-blur-md border-b border-slate-200/80 flex flex-wrap items-center justify-between gap-4 z-10 shadow-2xs">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-[11px] font-mono font-extrabold uppercase tracking-wider bg-gradient-to-r from-sky-600 to-indigo-600 bg-clip-text text-transparent flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-sky-50 border border-sky-200 shadow-2xs">
              <Filter className="w-3.5 h-3.5 text-sky-600" />
              FILTERS:
            </span>

            {/* Time Period Filter */}
            {dateCol && (
              <div className="flex items-center gap-1 bg-slate-100/90 p-1 rounded-xl border border-slate-200 shadow-2xs">
                {['all', 'last1', 'last4', 'last8'].map((p) => (
                  <button
                    key={p}
                    onClick={() => setPeriod(p)}
                    className={`px-3 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                      period === p
                        ? 'bg-gradient-to-r from-sky-500 via-blue-600 to-indigo-600 text-white shadow-xs'
                        : 'text-slate-600 hover:text-[#0A1128] hover:bg-white'
                    }`}
                  >
                    {p === 'all' ? 'All Time' : p === 'last1' ? 'Latest' : p === 'last4' ? 'Last 4' : 'Last 8'}
                  </button>
                ))}
              </div>
            )}

            {/* Categorical Dimension Dropdowns */}
            {filterableCols.map((f) => (
              <select
                key={f.name}
                value={f.selected}
                onChange={(e) => setFilters(prev => ({ ...prev, [f.name]: e.target.value }))}
                className="select text-xs py-1.5 px-3 bg-white/90 border-slate-300 rounded-lg font-semibold text-[#0A1128] focus:border-sky-500 focus:ring-2 focus:ring-sky-400/20 max-w-[165px] shadow-2xs cursor-pointer"
              >
                <option value="">All {f.displayName}s</option>
                {f.options.map(opt => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
            ))}

            {(Object.keys(filters).some(k => Boolean(filters[k])) || period !== 'all') && (
              <button
                onClick={() => { setFilters({}); setPeriod('all'); }}
                className="text-xs text-sky-600 hover:text-sky-800 hover:underline flex items-center gap-1 font-bold ml-1 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Reset Filters
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono font-extrabold text-sky-800 bg-gradient-to-r from-sky-50 to-indigo-50 px-3 py-1 rounded-lg border border-sky-200 shadow-2xs flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              {scopedRows.length.toLocaleString()} ROWS IN SCOPE
            </span>
          </div>
        </header>

        {/* Scrollable Main Analytical Viewport */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 pb-36">
          {/* VIEW 1: EXECUTIVE OVERVIEW TAB */}
          {activeTab === 'overview' && (
            <section className="flex flex-col gap-8 max-w-7xl mx-auto w-full">
              {/* Dynamic Colorful KPI Cards */}
              <KpiGrid kpis={dashboard.kpis} onAskAI={(label) => handleOpenContextAsk(label, `Explain calculation lineage and movement for ${label}`)} />

              {/* Verified Visual Intelligence Figures */}
              <div className="flex flex-col gap-6">
                {pinnedCharts.length > 0 && (
                  <div className="flex flex-col gap-4 p-5 bg-gradient-to-r from-sky-50/90 via-indigo-50/80 to-purple-50/90 border border-sky-200 rounded-2xl shadow-sm">
                    <h3 className="font-sans text-lg font-bold text-indigo-950 flex items-center gap-2 m-0">
                      <Sparkles className="w-4 h-4 text-sky-600" />
                      Custom Pinned Inquiry Figures ({pinnedCharts.length})
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {pinnedCharts.map((chart) => (
                        <ChartFigure key={chart.id} spec={chart} />
                      ))}
                    </div>
                  </div>
                )}

                {/* Level 1 & 2 Hero Full-Width Visualizations */}
                {dashboard.charts.filter(c => c.layoutSpan === 'full').map((chart) => (
                  <div key={chart.id} className="w-full">
                    <ChartFigure spec={chart} />
                  </div>
                ))}

                {/* Level 3 Categorical & Geographic Figures (2 Columns) */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {dashboard.charts.filter(c => c.layoutSpan !== 'full').map((chart) => (
                    <ChartFigure key={chart.id} spec={chart} />
                  ))}
                </div>
              </div>

              {/* Grounded Findings & Cross-Read Insights */}
              <div className="p-6 bg-white/95 backdrop-blur-md rounded-2xl border border-slate-200/90 shadow-md flex flex-col gap-4 relative overflow-hidden group">
                <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-cyan-400 via-indigo-500 to-pink-500" />

                <div className="flex items-center justify-between flex-wrap gap-2">
                  <h3 className="font-sans text-lg sm:text-xl font-bold bg-gradient-to-r from-sky-700 via-indigo-700 to-purple-700 bg-clip-text text-transparent flex items-center gap-2 m-0">
                    <Sparkles className="w-5 h-5 text-sky-600" />
                    Dataset Analytical Narrative &amp; Executive Synthesis
                  </h3>
                  <span className="text-[11px] font-mono text-white bg-gradient-to-r from-sky-500 via-blue-600 to-indigo-600 px-3 py-1 rounded-full font-bold shadow-xs">
                    {dashboard.confidenceNote}
                  </span>
                </div>

                <p className="text-sm text-slate-700 leading-relaxed font-sans m-0 font-medium">
                  {dashboard.summary}
                </p>

                {liveInsights.length > 0 && (
                  <div className="flex flex-col gap-2.5 pt-3 border-t border-slate-100">
                    <span className="text-xs font-mono font-extrabold text-sky-700 uppercase flex items-center gap-1.5">
                      <Zap className="w-3.5 h-3.5 text-amber-500" />
                      Live Market &amp; Operational Context:
                    </span>
                    {liveInsights.map((obs, idx) => (
                      <div key={idx} className="text-xs text-slate-700 flex items-start gap-2.5 bg-gradient-to-r from-sky-50/80 via-indigo-50/60 to-purple-50/80 p-3.5 rounded-xl border border-sky-200/80 shadow-2xs font-medium">
                        <span className="text-sm flex-none">💡</span>
                        <span><b className="text-indigo-900 font-bold">Cross-Read Impact:</b> {obs}</span>
                      </div>
                    ))}
                  </div>
                )}

                {newsItems.length > 0 && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 pt-3 border-t border-slate-100">
                    {newsItems.slice(0, 2).map((article, idx) => (
                      <div key={idx} className="p-4 bg-gradient-to-br from-slate-50 to-sky-50/40 rounded-xl border border-slate-200 hover:border-sky-300 transition-all flex flex-col justify-between gap-2.5 shadow-2xs hover:shadow-sm">
                        <div>
                          <div className="flex items-center justify-between text-[10.5px] font-mono mb-1.5">
                            <span className="font-extrabold uppercase bg-cyan-100 text-cyan-800 border border-cyan-300 px-2 py-0.5 rounded-md">{article.source}</span>
                            <span className="text-slate-500 font-semibold">{article.date}</span>
                          </div>
                          <h4 className="font-sans text-[14px] font-bold text-[#0A1128] m-0 line-clamp-2 leading-snug">
                            {article.headline}
                          </h4>
                          <p className="text-xs text-slate-600 line-clamp-2 mt-1.5 mb-0 leading-relaxed font-medium">
                            {article.summary}
                          </p>
                        </div>
                        <a
                          href={article.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[11.5px] font-bold text-sky-600 hover:text-sky-800 hover:underline flex items-center gap-1 mt-1"
                        >
                          Read Source ↗
                        </a>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </section>
          )}

          {/* DYNAMIC SECTION RENDERER FOR SPEC-DRIVEN TABS */}
          {dashboard.spec?.sections.map((section) => {
            if (section.id === activeTab || section.sectionType === activeTab) {
              return (
                <div key={section.id} className="max-w-7xl mx-auto w-full">
                  <GenericSectionRenderer
                    section={section}
                    context={context}
                    onAskAI={(q) => handleOpenContextAsk(section.title, q)}
                  />
                </div>
              );
            }
            return null;
          })}

          {activeTab === 'marketing-media' && (
            <MarketingMediaView
              rows={scopedRows}
              schemas={schemas}
              specializedAnalysis={pipelineResult?.specializedAnalysis}
              onAskAI={(q) => handleOpenContextAsk('Media Attribution', q)}
            />
          )}

          {/* VIEW 1.5: TARGET COHORTS TAB */}
          {activeTab === 'target-cohorts' && (
            <TargetCohortsView
              rows={scopedRows}
              schemas={schemas}
              onAskAI={(q) => handleOpenContextAsk('Target Risk & Cohort Analysis', q)}
            />
          )}

          {/* VIEW 2: DAY-WISE TAB */}
          {activeTab === 'daily' && (
            <DayWiseView
              rows={scopedRows}
              schemas={schemas}
              onAskAI={(q) => handleOpenContextAsk('Time Trends', q)}
            />
          )}

          {/* VIEW 2.5: WEEK-WISE TAB */}
          {activeTab === 'weekly' && (
            <WeeklyView
              rows={scopedRows}
              schemas={schemas}
              onAskAI={(q) => handleOpenContextAsk('Weekly Sales', q)}
            />
          )}

          {/* VIEW 3: WEEKDAY PATTERN TAB */}
          {activeTab === 'weekday' && (
            <WeekdayView
              rows={scopedRows}
              schemas={schemas}
              onAskAI={(q) => handleOpenContextAsk('Weekday Pattern', q)}
            />
          )}

          {/* VIEW 3.2: MONTHLY TAB */}
          {activeTab === 'monthly' && (
            <MonthlyView
              rows={scopedRows}
              schemas={schemas}
              onAskAI={(q) => handleOpenContextAsk('Monthly Performance', q)}
            />
          )}

          {/* VIEW 3.5: YEARLY TAB */}
          {activeTab === 'yearly' && (
            <YearlyView
              rows={scopedRows}
              schemas={schemas}
              onAskAI={(q) => handleOpenContextAsk('Yearly Trends', q)}
            />
          )}

          {/* VIEW 4: PRODUCTS & CATALOG TAB */}
          {activeTab === 'products' && (
            <ProductsView
              rows={scopedRows}
              schemas={schemas}
              onAskAI={(q) => handleOpenContextAsk('Product Performance', q)}
            />
          )}

          {/* VIEW 4.2: CATEGORY TAB */}
          {activeTab === 'category' && (
            <CategoryView
              rows={scopedRows}
              schemas={schemas}
              onAskAI={(q) => handleOpenContextAsk('Category Revenue', q)}
            />
          )}

          {/* VIEW 4.5: LOCATIONS TAB */}
          {activeTab === 'locations' && (
            <LocationsView
              rows={scopedRows}
              schemas={schemas}
              onAskAI={(q) => handleOpenContextAsk('Location Performance', q)}
            />
          )}

          {/* VIEW 4.8: REGIONS TAB */}
          {activeTab === 'region' && (
            <RegionsView
              rows={scopedRows}
              schemas={schemas}
              onAskAI={(q) => handleOpenContextAsk('Regional Analysis', q)}
            />
          )}

          {/* VIEW 5: FORECAST TAB */}
          {activeTab === 'forecast' && (
            <ForecastView
              rows={scopedRows}
              schemas={schemas}
              forecast={forecast}
              onAskAI={(q) => handleOpenContextAsk('Forecast Projection', q)}
            />
          )}

          {/* VIEW 6: AI INSIGHTS & DECISIONS */}
          {activeTab === 'insights' && (
            <div className="max-w-7xl mx-auto w-full">
              <InsightsDecisionsView
                observations={observations}
                recommendations={recommendations}
                findings={findings}
                onAskAI={(q) => handleOpenContextAsk('Investment Intelligence', q)}
              />
            </div>
          )}

          {/* VIEW 6.5: MARKET & INDUSTRY NEWS TAB */}
          {activeTab === 'news' && (
            <MarketNewsView
              newsItems={newsItems}
              domainName={context.domain.primaryDomain}
              kpiSummary={dashboard.kpis.slice(0, 4).map(k => ({ label: k.label, value: k.value }))}
              liveInsights={liveInsights}
              isLoading={isNewsLoading}
              onRefreshNews={handleRefreshNews}
              onAskAI={(q) => handleSendMessage(q)}
            />
          )}

          {/* VIEW 7: STATISTICS HUB */}
          {activeTab === 'statistics' && (
            <div className="max-w-7xl mx-auto w-full">
              <StatisticsView report={statistics} />
            </div>
          )}

          {/* VIEW 8: DATA QUALITY & AUDIT */}
          {activeTab === 'quality' && (
            <div className="max-w-7xl mx-auto w-full">
              <DataQualityView report={context.qualityReport} />
            </div>
          )}

          {/* VIEW 9: DATA DICTIONARY */}
          {activeTab === 'dictionary' && (
            <div className="max-w-7xl mx-auto w-full">
              <DataDictionaryView
                schemas={context.schema}
                glossary={context.glossary || []}
              />
            </div>
          )}

          {/* VIEW 10: DATA EXPLORER */}
          {activeTab === 'explorer' && (
            <div className="max-w-7xl mx-auto w-full">
              <DataTableExplorer
                schemas={context.schema}
                rows={scopedRows}
                fileName={context.sourceMetadata.fileName}
              />
            </div>
          )}
        </main>

        {/* Global Expandable Conversational AI Intelligence Panel (Visible on ALL tabs) */}
        {chatTurns.length > 0 && (
          <div className="flex-none bg-white/95 backdrop-blur-xl border-t border-cyan-500/30 shadow-2xl z-30 flex flex-col transition-all duration-300">
            {/* Drawer Control Header */}
            <div className="px-6 py-3 bg-gradient-to-r from-[#060D1E] via-[#0A142F] to-[#050B18] text-white flex items-center justify-between border-b border-cyan-500/20 shadow-md">
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded-md bg-cyan-500/20 border border-cyan-400/40 flex items-center justify-center">
                  <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                </div>
                <span className="font-mono text-xs font-extrabold uppercase tracking-wider bg-gradient-to-r from-cyan-300 to-sky-100 bg-clip-text text-transparent">
                  DataWhiz Conversational AI Intelligence ({chatTurns.length} exchanges)
                </span>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setChatTurns([])}
                  className="text-xs text-slate-400 hover:text-rose-400 flex items-center gap-1 cursor-pointer transition-colors font-semibold"
                  title="Clear Chat History"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Clear
                </button>
                <button
                  onClick={() => setIsChatDrawerOpen(!isChatDrawerOpen)}
                  className="text-xs text-cyan-300 hover:text-white flex items-center gap-1 font-bold cursor-pointer bg-slate-800/80 px-2.5 py-1 rounded-md border border-cyan-500/30 transition-all hover:bg-slate-700"
                >
                  {isChatDrawerOpen ? (
                    <>
                      <ChevronDown className="w-4 h-4" />
                      Minimize
                    </>
                  ) : (
                    <>
                      <ChevronUp className="w-4 h-4" />
                      Expand Response ({chatTurns.length})
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Expandable Chat Body */}
            {isChatDrawerOpen && (
              <div
                ref={chatScrollRef}
                className="max-h-[380px] overflow-y-auto p-4 md:p-6 bg-gradient-to-b from-slate-50/90 to-sky-50/50 border-b border-slate-200"
              >
                <div className="max-w-5xl mx-auto w-full">
                  <AskDataChat
                    chatTurns={chatTurns}
                    onSendMessage={handleSendMessage}
                    onPinChart={handlePinChart}
                    isLoading={isChatLoading}
                    suggestions={dashboard.suggestedQuestions}
                    hideInput={true}
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* Fixed Bottom Conversational Query Dock (Always sticks to bottom) */}
        <footer className="flex-none p-3 px-6 bg-white/90 backdrop-blur-xl border-t border-slate-200/90 shadow-2xl z-20">
          <div className="flex flex-col gap-2 max-w-7xl mx-auto w-full">
            {dashboard.suggestedQuestions.length > 0 && chatTurns.length === 0 && (
              <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
                <span className="text-[10.5px] font-mono font-extrabold uppercase tracking-wider text-sky-700 flex-none flex items-center gap-1">
                  <Zap className="w-3 h-3 text-amber-500" />
                  Quick Inquiries:
                </span>
                {dashboard.suggestedQuestions.map((q, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSendMessage(q)}
                    className="text-[11.5px] px-3.5 py-1 bg-gradient-to-r from-sky-50 to-indigo-50/70 border border-sky-200/90 text-sky-950 hover:border-sky-400 hover:from-sky-100 hover:to-indigo-100 hover:shadow-xs rounded-full whitespace-nowrap transition-all font-bold cursor-pointer"
                  >
                    {q}
                  </button>
                ))}
              </div>
            )}

            <form onSubmit={handleBottomSubmit} className="flex gap-2.5">
              <input
                type="text"
                value={bottomChatQuery}
                onChange={(e) => setBottomChatQuery(e.target.value)}
                placeholder="Ask anything about your data (e.g. 'What does dtv_srh_pmx_tot_xxx_clk mean?' or 'Which product should I invest in?')..."
                className="input text-xs flex-1 font-semibold bg-slate-50/80 border-slate-300 focus:border-sky-500 focus:bg-white focus:ring-2 focus:ring-sky-400/20 shadow-inner"
              />
              <button
                type="submit"
                disabled={!bottomChatQuery.trim() || isChatLoading}
                className="btn btn-primary text-xs px-6 flex items-center gap-1.5 font-extrabold shadow-lg shadow-sky-500/25 cursor-pointer disabled:opacity-50"
              >
                <Sparkles className="w-3.5 h-3.5" />
                Ask Data
              </button>
            </form>
          </div>
        </footer>
      </div>

      {/* Contextual Ask AI Modal */}
      <ContextualAskModal
        isOpen={contextModal.isOpen}
        onClose={() => setContextModal(prev => ({ ...prev, isOpen: false }))}
        contextSubject={contextModal.subject}
        initialQuery={contextModal.initialQuery}
        onAsk={(q) => processAskQuery(q, context)}
      />
    </div>
  );
}
