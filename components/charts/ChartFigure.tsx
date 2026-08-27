'use client';

import React, { useEffect, useRef, useState, useMemo } from 'react';
import { DynamicChartSpec } from '@/lib/types';
import { Sparkles, BarChart2, TrendingUp, PieChart as PieIcon, LineChart } from 'lucide-react';
import {
  Chart as ChartJS,
  registerables,
  ChartConfiguration
} from 'chart.js';
import { formatMetricValue } from '@/lib/formatting/numberFormatter';

// Register all Chart.js controllers, elements, scales, and plugins
ChartJS.register(...registerables);

interface ChartFigureProps {
  spec: DynamicChartSpec;
  onAskAI?: (chartTitle: string) => void;
  onDrillDown?: (category: string) => void;
  height?: number;
  horizontal?: boolean;
}

const CHROMATIC_PALETTE = [
  '#0284C7', // Electric Cobalt
  '#06B6D4', // Cyber Cyan
  '#8B5CF6', // Vivid Purple
  '#10B981', // Radiant Emerald
  '#F59E0B', // Warm Amber
  '#EC4899', // Vivid Pink
  '#6366F1', // Electric Indigo
  '#14B8A6', // Bright Teal
  '#F43F5E', // Neon Coral
  '#3B82F6', // Ocean Blue
  '#EA580C', // Bright Orange
  '#84CC16'  // Electric Lime
];

// Compute moving average
function computeMovingAvg(arr: number[], windowSize: number = 7): number[] {
  const result: number[] = [];
  for (let i = 0; i < arr.length; i++) {
    const start = Math.max(0, i - windowSize + 1);
    const subset = arr.slice(start, i + 1);
    result.push(subset.reduce((a, b) => a + b, 0) / subset.length);
  }
  return result;
}

// Compute linear OLS trend line
function computeLinearTrend(arr: number[]): number[] {
  const n = arr.length;
  if (n <= 1) return arr;
  const xs = arr.map((_, i) => i);
  const meanX = xs.reduce((a, b) => a + b, 0) / n;
  const meanY = arr.reduce((a, b) => a + b, 0) / n;
  let num = 0, den = 0;
  for (let i = 0; i < n; i++) {
    num += (xs[i] - meanX) * (arr[i] - meanY);
    den += (xs[i] - meanX) ** 2;
  }
  const slope = den !== 0 ? num / den : 0;
  const intercept = meanY - slope * meanX;
  return xs.map(x => Math.round((slope * x + intercept) * 100) / 100);
}

export const ChartFigure: React.FC<ChartFigureProps> = ({
  spec,
  onAskAI,
  onDrillDown,
  height = 300,
  horizontal = false
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartInstance = useRef<ChartJS | null>(null);
  const [topLimit, setTopLimit] = useState<number | 'all'>(8);

  const isScatter = spec.type === 'scatter';
  const isPie = spec.type === 'pie' || spec.type === 'donut';
  const isLine = spec.type === 'line' || spec.type === 'area';
  const isHorizontalBar = spec.type === 'horizontal_bar' || horizontal || (spec.type === 'bar' && (spec.id.includes('ranking') || spec.id.includes('geo') || spec.id.includes('country')));
  const isBar = spec.type === 'bar' || isHorizontalBar;

  const displayData = useMemo(() => {
    if (!spec.data || spec.data.length === 0) return [];
    if (isScatter) return spec.data;
    if (topLimit === 'all' || spec.data.length <= topLimit || (spec.type !== 'bar' && spec.type !== 'horizontal_bar')) {
      return spec.data;
    }
    return spec.data.slice(0, topLimit);
  }, [spec.data, topLimit, spec.type, isScatter]);

  // Check if labels are accidental index fallbacks (0, 1, 2, 3...) on categorical charts
  const hasIndexFallback = useMemo(() => {
    if (isScatter || isLine) return false;
    if (!displayData || displayData.length === 0) return false;
    const labels = displayData.map(d => String(d.name || d.label || ''));
    return labels.every((l, idx) => l === String(idx));
  }, [displayData, isScatter, isLine]);

  useEffect(() => {
    if (!canvasRef.current || !displayData || displayData.length === 0 || hasIndexFallback) return;

    if (chartInstance.current) {
      chartInstance.current.destroy();
      chartInstance.current = null;
    }

    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;

    // Create Vibrant Multi-stop Area Gradient
    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, 'rgba(6, 182, 212, 0.35)');
    gradient.addColorStop(0.4, 'rgba(59, 130, 246, 0.18)');
    gradient.addColorStop(0.8, 'rgba(139, 92, 246, 0.08)');
    gradient.addColorStop(1, 'rgba(139, 92, 246, 0.00)');

    // Create Vertical Bar Gradient
    const barGradient = ctx.createLinearGradient(0, 0, 0, height);
    barGradient.addColorStop(0, '#06B6D4');
    barGradient.addColorStop(0.5, '#2563EB');
    barGradient.addColorStop(1, '#4F46E5');

    // Create Horizontal Bar Gradient
    const hBarGradient = ctx.createLinearGradient(0, 0, 400, 0);
    hBarGradient.addColorStop(0, '#2563EB');
    hBarGradient.addColorStop(0.6, '#06B6D4');
    hBarGradient.addColorStop(1, '#00D2B4');

    const labels = displayData.map(d => String(d.name || d.label || ''));
    const rawValues = displayData.map(d => typeof d.value === 'number' ? d.value : parseFloat(d.value) || 0);

    let config: ChartConfiguration;

    if (isScatter) {
      const scatterPoints = displayData.map(d => ({
        x: d.xVal !== undefined ? d.xVal : parseFloat(d.name) || 0,
        y: d.value
      }));

      config = {
        type: 'scatter',
        data: {
          datasets: [
            {
              label: spec.title,
              data: scatterPoints,
              backgroundColor: 'rgba(6, 182, 212, 0.75)',
              borderColor: '#0284C7',
              borderWidth: 2,
              pointRadius: 6,
              pointHoverRadius: 9,
              pointHoverBackgroundColor: '#8B5CF6',
              pointHoverBorderColor: '#FFFFFF',
              pointHoverBorderWidth: 2
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            tooltip: {
              backgroundColor: 'rgba(10, 20, 47, 0.96)',
              titleColor: '#38BDF8',
              bodyColor: '#FFFFFF',
              borderColor: 'rgba(6, 182, 212, 0.6)',
              borderWidth: 1.5,
              padding: 12,
              cornerRadius: 12,
              boxPadding: 4,
              callbacks: {
                label: (c: any) => ` X: ${formatMetricValue(c.parsed.x, spec.unitMetadata)}, Y: ${formatMetricValue(c.parsed.y, spec.unitMetadata)}`
              }
            }
          },
          scales: {
            x: {
              grid: { color: 'rgba(226, 232, 240, 0.6)' },
              ticks: { color: '#64748B', font: { family: "'JetBrains Mono', monospace", size: 10 } }
            },
            y: {
              grid: { color: 'rgba(226, 232, 240, 0.6)' },
              ticks: { color: '#64748B', font: { family: "'JetBrains Mono', monospace", size: 10 }, callback: (v: any) => formatMetricValue(v, spec.unitMetadata) }
            }
          }
        }
      };
    } else if (isLine) {
      let datasets: any[] = [];

      if (spec.multiDatasets && spec.multiDatasets.length > 0) {
        datasets = spec.multiDatasets.map((ds, idx) => ({
          label: ds.label,
          data: ds.data,
          borderColor: ds.color || CHROMATIC_PALETTE[idx % CHROMATIC_PALETTE.length],
          backgroundColor: ds.backgroundColor || (ds.fill ? 'rgba(6, 182, 212, 0.12)' : 'transparent'),
          borderWidth: 3,
          pointRadius: ds.pointRadius !== undefined ? ds.pointRadius : (ds.data.length > 25 ? 0 : 4),
          pointHoverRadius: 7,
          pointBackgroundColor: ds.color || CHROMATIC_PALETTE[idx % CHROMATIC_PALETTE.length],
          pointBorderColor: '#FFFFFF',
          pointBorderWidth: 2,
          borderDash: ds.borderDash,
          tension: 0.35,
          fill: ds.fill || false
        }));
      } else {
        const isTimeSeries = labels.length >= 8;
        const maData = isTimeSeries ? computeMovingAvg(rawValues, Math.min(30, Math.max(3, Math.floor(rawValues.length / 5)))) : null;
        const trendData = isTimeSeries ? computeLinearTrend(rawValues) : null;

        datasets = [
          {
            label: 'Actual Observed',
            data: rawValues,
            borderColor: '#0284C7',
            backgroundColor: gradient,
            borderWidth: 2.5,
            pointRadius: rawValues.length > 25 ? 0 : 4,
            pointHoverRadius: 7,
            pointBackgroundColor: '#06B6D4',
            pointBorderColor: '#FFFFFF',
            pointBorderWidth: 2,
            tension: 0.3,
            fill: true
          }
        ];

        if (maData) {
          datasets.push({
            label: 'Moving Avg',
            data: maData,
            borderColor: '#F59E0B',
            borderWidth: 3,
            pointRadius: 0,
            pointHoverRadius: 6,
            tension: 0.4,
            fill: false
          });
        }

        if (trendData) {
          datasets.push({
            label: 'Linear Trend',
            data: trendData,
            borderColor: '#EF4444',
            borderWidth: 2,
            borderDash: [6, 6],
            pointRadius: 0,
            fill: false
          });
        }
      }

      config = {
        type: 'line',
        data: { labels, datasets },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          interaction: { mode: 'index', intersect: false },
          plugins: {
            legend: {
              display: datasets.length > 1,
              position: 'top',
              align: 'end',
              labels: { boxWidth: 12, font: { family: 'inherit', size: 11, weight: 'bold' }, color: '#475569' }
            },
            tooltip: {
              backgroundColor: 'rgba(10, 20, 47, 0.96)',
              titleColor: '#38BDF8',
              bodyColor: '#FFFFFF',
              borderColor: 'rgba(6, 182, 212, 0.6)',
              borderWidth: 1.5,
              padding: 12,
              cornerRadius: 12,
              callbacks: {
                label: (c: any) => ` ${c.dataset.label}: ${formatMetricValue(c.parsed.y, spec.unitMetadata)}`
              }
            }
          },
          scales: {
            x: {
              grid: { color: 'rgba(226, 232, 240, 0.6)' },
              ticks: { color: '#64748B', font: { family: "'JetBrains Mono', monospace", size: 10 }, maxRotation: 45 }
            },
            y: {
              grid: { color: 'rgba(226, 232, 240, 0.6)' },
              ticks: { color: '#64748B', font: { family: "'JetBrains Mono', monospace", size: 10 }, callback: (v: any) => formatMetricValue(v, spec.unitMetadata) }
            }
          }
        }
      };
    } else if (isPie) {
      config = {
        type: 'doughnut',
        data: {
          labels,
          datasets: [
            {
              data: rawValues,
              backgroundColor: CHROMATIC_PALETTE.slice(0, labels.length),
              borderColor: '#FFFFFF',
              borderWidth: 3,
              hoverOffset: 8
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: 'right',
              labels: {
                boxWidth: 14,
                font: { family: 'inherit', size: 11.5, weight: 'bold' },
                color: '#334155',
                padding: 14
              }
            },
            tooltip: {
              backgroundColor: 'rgba(10, 20, 47, 0.96)',
              titleColor: '#38BDF8',
              bodyColor: '#FFFFFF',
              borderColor: 'rgba(6, 182, 212, 0.6)',
              borderWidth: 1.5,
              padding: 12,
              cornerRadius: 12,
              callbacks: {
                label: (c: any) => {
                  const total = (c.dataset.data as number[]).reduce((a, b) => a + b, 0);
                  const val = c.parsed;
                  const pct = total > 0 ? ((val / total) * 100).toFixed(1) : '0';
                  return ` ${c.label}: ${formatMetricValue(val, spec.unitMetadata)} (${pct}%)`;
                }
              }
            }
          }
        }
      };
    } else {
      // Bar & Horizontal Bar Charts
      config = {
        type: 'bar',
        data: {
          labels,
          datasets: [
            {
              label: spec.title,
              data: rawValues,
              backgroundColor: isHorizontalBar ? hBarGradient : barGradient,
              borderColor: isHorizontalBar ? '#00D2B4' : '#2563EB',
              borderWidth: 1.5,
              borderRadius: 6,
              hoverBackgroundColor: '#8B5CF6'
            }
          ]
        },
        options: {
          indexAxis: isHorizontalBar ? 'y' : 'x',
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            tooltip: {
              backgroundColor: 'rgba(10, 20, 47, 0.96)',
              titleColor: '#38BDF8',
              bodyColor: '#FFFFFF',
              borderColor: 'rgba(6, 182, 212, 0.6)',
              borderWidth: 1.5,
              padding: 12,
              cornerRadius: 12,
              callbacks: {
                label: (c: any) => {
                  const val = isHorizontalBar ? c.parsed.x : c.parsed.y;
                  return ` ${c.label}: ${formatMetricValue(val, spec.unitMetadata)}`;
                }
              }
            }
          },
          scales: {
            x: {
              grid: { color: 'rgba(226, 232, 240, 0.6)' },
              ticks: {
                color: '#64748B',
                font: { family: "'JetBrains Mono', monospace", size: 10 },
                callback: isHorizontalBar ? (v: any) => formatMetricValue(v, spec.unitMetadata) : undefined,
                maxRotation: isHorizontalBar ? 0 : 35
              }
            },
            y: {
              grid: { color: 'rgba(226, 232, 240, 0.6)' },
              ticks: {
                color: '#64748B',
                font: { family: "'JetBrains Mono', monospace", size: 10 },
                callback: !isHorizontalBar ? (v: any) => formatMetricValue(v, spec.unitMetadata) : undefined
              }
            }
          }
        }
      };
    }

    chartInstance.current = new ChartJS(ctx, config);

    return () => {
      if (chartInstance.current) {
        chartInstance.current.destroy();
        chartInstance.current = null;
      }
    };
  }, [displayData, isScatter, isLine, isPie, isHorizontalBar, isBar, height, spec.multiDatasets, spec.title, spec.unitMetadata, hasIndexFallback]);

  if (hasIndexFallback) {
    return null;
  }

  return (
    <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs flex flex-col justify-between relative group hover:shadow-md transition-all">
      {/* Figure Header */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex flex-col gap-0.5">
          <div className="flex items-center gap-2">
            <span className="p-1 rounded-md bg-sky-50 text-sky-700 border border-sky-200 shadow-2xs">
              {isLine ? <TrendingUp className="w-3.5 h-3.5" /> : isPie ? <PieIcon className="w-3.5 h-3.5" /> : <BarChart2 className="w-3.5 h-3.5" />}
            </span>
            <h3 className="font-sans text-base font-bold text-[#0A1128] tracking-tight m-0">
              {spec.title}
            </h3>
          </div>
          {spec.why && (
            <p className="text-xs text-slate-500 font-sans m-0 line-clamp-2 mt-1">
              {spec.why}
            </p>
          )}
        </div>

        <div className="flex items-center gap-1.5 flex-none">
          {/* Top-N filter toggle for bar charts */}
          {isBar && spec.data && spec.data.length > 5 && (
            <div className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-0.5 text-[10px] font-mono font-bold">
              <button
                onClick={() => setTopLimit(5)}
                className={`px-2 py-0.5 rounded-md transition-all ${topLimit === 5 ? 'bg-white text-sky-700 shadow-xs' : 'text-slate-500 hover:text-slate-800'}`}
              >
                Top 5
              </button>
              <button
                onClick={() => setTopLimit(8)}
                className={`px-2 py-0.5 rounded-md transition-all ${topLimit === 8 ? 'bg-white text-sky-700 shadow-xs' : 'text-slate-500 hover:text-slate-800'}`}
              >
                Top 8
              </button>
              <button
                onClick={() => setTopLimit('all')}
                className={`px-2 py-0.5 rounded-md transition-all ${topLimit === 'all' ? 'bg-white text-sky-700 shadow-xs' : 'text-slate-500 hover:text-slate-800'}`}
              >
                All
              </button>
            </div>
          )}

          {onAskAI && (
            <button
              onClick={() => onAskAI(spec.title)}
              className="opacity-0 group-hover:opacity-100 text-[10px] px-2.5 py-1 rounded-full transition-all flex items-center gap-1 font-bold border border-sky-300 bg-sky-50 text-sky-800 hover:bg-sky-600 hover:text-white shadow-2xs cursor-pointer"
              title={`Ask AI to interpret ${spec.title}`}
            >
              <Sparkles className="w-2.5 h-2.5" />
              Ask AI
            </button>
          )}
        </div>
      </div>

      {/* Main Canvas Area */}
      <div className="relative w-full" style={{ height: `${height}px` }}>
        <canvas ref={canvasRef} />
      </div>

      {/* Callout Footer */}
      {spec.calloutText && (
        <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px] font-sans text-slate-600">
          <span className="line-clamp-1">{spec.calloutText}</span>
        </div>
      )}
    </div>
  );
};
