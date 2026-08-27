'use client';

import React, { useState, useRef } from 'react';
import Image from 'next/image';
import {
  Upload,
  Sparkles,
  CheckCircle2,
  ArrowRight,
  Zap,
  ShoppingCart,
  Cloud,
  Pill,
  Megaphone,
  Database,
  BarChart,
  Layers
} from 'lucide-react';
import { BENCHMARK_DATASETS } from '@/lib/sample-data';

interface UploadWorkspaceProps {
  onDataLoaded: (data: {
    csvContent?: string;
    excelBuffer?: ArrayBuffer;
    fileName: string;
    prompt?: string;
  }) => void;
  isProcessing: boolean;
  pipelineStep: number;
}

const PIPELINE_STAGES = [
  'Detecting file MIME & format (CSV / XLSX)',
  'Ingesting tabular records & resolving encoding',
  'Inferring physical types & logical semantic roles',
  'Deep profiling: distributions, skewness & outliers',
  'Humanizing technical & cryptic column codes',
  'Auditing quality anomalies & safe standardization',
  'Evaluating analytical capabilities & modeling fit',
  'Computing mathematical statistics & forecasts',
  'Synthesizing insights & generating dynamic dashboard'
];

// Benchmark dataset colorful themes
const BENCHMARK_THEMES: Record<string, {
  border: string;
  hoverBorder: string;
  tagClass: string;
  icon: any;
  iconBg: string;
  gradientBg: string;
}> = {
  ecommerce_eu: {
    border: 'border-cyan-200',
    hoverBorder: 'hover:border-cyan-400 hover:shadow-cyan-500/20',
    tagClass: 'bg-cyan-100 text-cyan-800 border-cyan-300',
    icon: ShoppingCart,
    iconBg: 'bg-cyan-500/15 text-cyan-700',
    gradientBg: 'from-cyan-500/5 via-sky-500/5 to-transparent'
  },
  saas_subscription: {
    border: 'border-emerald-200',
    hoverBorder: 'hover:border-emerald-400 hover:shadow-emerald-500/20',
    tagClass: 'bg-emerald-100 text-emerald-800 border-emerald-300',
    icon: Cloud,
    iconBg: 'bg-emerald-500/15 text-emerald-700',
    gradientBg: 'from-emerald-500/5 via-teal-500/5 to-transparent'
  },
  pharma_sales: {
    border: 'border-purple-200',
    hoverBorder: 'hover:border-purple-400 hover:shadow-purple-500/20',
    tagClass: 'bg-purple-100 text-purple-800 border-purple-300',
    icon: Pill,
    iconBg: 'bg-purple-500/15 text-purple-700',
    gradientBg: 'from-purple-500/5 via-indigo-500/5 to-transparent'
  },
  marketing_media_mix: {
    border: 'border-amber-200',
    hoverBorder: 'hover:border-amber-400 hover:shadow-amber-500/20',
    tagClass: 'bg-amber-100 text-amber-800 border-amber-300',
    icon: Megaphone,
    iconBg: 'bg-amber-500/15 text-amber-700',
    gradientBg: 'from-amber-500/5 via-orange-500/5 to-transparent'
  }
};

export const UploadWorkspace: React.FC<UploadWorkspaceProps> = ({
  onDataLoaded,
  isProcessing,
  pipelineStep
}) => {
  const [dragActive, setDragActive] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [uploadStatusText, setUploadStatusText] = useState('Parsing dataset…');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') setDragActive(true);
    else if (e.type === 'dragleave') setDragActive(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleFile = (file: File) => {
    setUploadStatusText(`Reading ${file.name}…`);
    const isExcel = file.name.endsWith('.xlsx') || file.name.endsWith('.xls');

    if (isExcel) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const buffer = e.target?.result as ArrayBuffer;
        if (buffer) {
          onDataLoaded({ excelBuffer: buffer, fileName: file.name, prompt });
        }
      };
      reader.readAsArrayBuffer(file);
    } else {
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target?.result as string;
        if (text) {
          onDataLoaded({ csvContent: text, fileName: file.name, prompt });
        }
      };
      reader.readAsText(file);
    }
  };

  const handleBenchmarkClick = (dataset: typeof BENCHMARK_DATASETS[0]) => {
    setUploadStatusText(`Loading ${dataset.name}…`);
    onDataLoaded({
      csvContent: dataset.csvContent,
      fileName: dataset.fileName,
      prompt: prompt || dataset.suggestedQuestions[0]
    });
  };

  if (isProcessing) {
    return (
      <div className="w-full max-w-lg p-6 sm:p-8 panel flex flex-col gap-5 text-center shadow-2xl animate-rise border border-sky-300 bg-white/95 backdrop-blur-xl relative overflow-hidden rounded-2xl mx-auto my-auto">
        <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-cyan-400 via-blue-600 to-purple-600 animate-pulse" />

        <div className="flex items-center justify-center gap-3 mt-1">
          <div className="relative w-[52px] h-auto flex-none flex items-center p-1 bg-sky-50 rounded-xl border border-sky-200">
            <Image
              src="/logo.png"
              alt="DataWhiz Logo"
              width={52}
              height={20}
              className="object-contain animate-pulse w-[52px] h-auto"
              priority
            />
          </div>
          <div className="text-left">
            <h2 className="font-sans text-xl font-bold bg-gradient-to-r from-sky-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent m-0 leading-tight">
              DataWhiz AI Engine
            </h2>
            <p className="text-xs text-cyan-700 m-0 font-mono font-bold flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-500 animate-ping" />
              {uploadStatusText}
            </p>
          </div>
        </div>

        {/* Multi-color glowing progress bar */}
        <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden border border-slate-200 p-0.5 shadow-inner">
          <div
            className="bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-600 h-full transition-all duration-300 rounded-full shadow-[0_0_12px_rgba(6,182,212,0.6)]"
            style={{ width: `${Math.min(100, Math.max(15, Math.round(((pipelineStep + 1) / PIPELINE_STAGES.length) * 100)))}%` }}
          />
        </div>

        <div className="flex flex-col gap-2 text-left border border-slate-200 bg-slate-50/80 p-4 rounded-xl max-h-[300px] overflow-y-auto shadow-inner">
          {PIPELINE_STAGES.map((stage, idx) => {
            const isCompleted = idx < pipelineStep;
            const isCurrent = idx === pipelineStep;

            return (
              <div
                key={idx}
                className={`flex items-center gap-2 text-[12px] font-mono transition-all ${
                  isCompleted
                    ? 'text-emerald-700 font-semibold'
                    : isCurrent
                    ? 'text-indigo-900 font-bold bg-gradient-to-r from-sky-100 to-indigo-100 px-2.5 py-1 rounded-md border border-sky-300'
                    : 'text-slate-400 opacity-50'
                }`}
              >
                {isCompleted ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-none" />
                ) : isCurrent ? (
                  <span className="w-3.5 h-3.5 rounded-full bg-indigo-600 animate-ping flex-none ring-2 ring-indigo-400" />
                ) : (
                  <span className="w-3.5 h-3.5 rounded-full border border-slate-300 flex-none" />
                )}
                <span>Stage {idx + 1}: {stage}</span>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-5xl flex flex-col gap-6 sm:gap-7 animate-rise mx-auto">
      {/* Brand Header with Gradient Title */}
      <div className="text-center flex flex-col items-center gap-2">
        <div className="flex items-center gap-3.5">
          <div className="relative w-[68px] h-auto flex-none p-1.5 bg-white rounded-2xl border border-sky-200 shadow-md flex items-center">
            <Image
              src="/logo.png"
              alt="DataWhiz Logo"
              width={68}
              height={26}
              className="object-contain w-[68px] h-auto"
              priority
            />
          </div>
          <div className="text-left">
            <h1 className="font-sans text-3xl sm:text-4xl font-extrabold bg-gradient-to-r from-cyan-600 via-blue-600 to-purple-600 bg-clip-text text-transparent m-0 tracking-tight leading-none">
              DataWhiz AI
            </h1>
            <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-sky-600 font-extrabold flex items-center gap-1 mt-0.5">
              <Sparkles className="w-3 h-3 text-cyan-500" />
              Autonomous Analytics &amp; Market Intelligence
            </span>
          </div>
        </div>
        <p className="text-xs sm:text-sm text-slate-600 max-w-xl m-0 leading-relaxed font-sans font-medium">
          Instant semantic profiling, intelligent cleaning, predictive forecasting, and real-time Tavily market intelligence.
        </p>
      </div>

      {/* Main Upload Dropzone */}
      <div
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`panel p-6 sm:p-8 text-center cursor-pointer transition-all border-2 border-dashed flex flex-col items-center gap-3.5 bg-gradient-to-b from-white/95 to-sky-50/50 backdrop-blur-xl shadow-md rounded-2xl ${
          dragActive
            ? 'border-cyan-500 bg-cyan-50/80 scale-[1.01] shadow-2xl ring-4 ring-cyan-400/30'
            : 'border-slate-300 hover:border-sky-500 hover:bg-sky-50/30 hover:shadow-xl'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,.xlsx,.xls,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
          onChange={(e) => {
            if (e.target.files && e.target.files[0]) {
              handleFile(e.target.files[0]);
              e.target.value = '';
            }
          }}
          className="hidden"
        />

        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-cyan-400 via-sky-500 to-indigo-600 text-white flex items-center justify-center shadow-lg shadow-sky-500/30 group-hover:scale-110 transition-transform">
          <Upload className="w-6 h-6" />
        </div>

        <div>
          <h3 className="font-sans font-bold text-xl sm:text-2xl text-[#0A1128] m-0">
            Upload CSV or Excel Dataset
          </h3>
          <p className="text-xs text-slate-500 mt-1.5 mb-0 font-mono font-medium">
            Drag &amp; drop files here, or click to browse from your computer
          </p>
        </div>

        <button
          type="button"
          className="btn btn-primary text-xs px-7 py-2.5 shadow-lg font-extrabold mt-1 cursor-pointer"
          onClick={(e) => {
            e.stopPropagation();
            fileInputRef.current?.click();
          }}
        >
          Select File to Analyze
        </button>
      </div>

      {/* Benchmark Datasets Section */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between px-1">
          <span className="font-mono text-xs uppercase tracking-wider bg-gradient-to-r from-sky-600 to-purple-600 bg-clip-text text-transparent font-extrabold flex items-center gap-1.5">
            <Zap className="w-4 h-4 text-amber-500" />
            Or Explore 4 Built-In Benchmark Datasets
          </span>
          <span className="text-[11px] text-slate-400 font-mono font-bold">
            1-Click Instant Demo
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {BENCHMARK_DATASETS.map((ds) => {
            const theme = BENCHMARK_THEMES[ds.id] || BENCHMARK_THEMES.ecommerce_eu;
            const IconComp = theme.icon;

            return (
              <div
                key={ds.id}
                onClick={() => handleBenchmarkClick(ds)}
                className={`group cursor-pointer flex flex-col justify-between gap-3 transition-all duration-300 bg-gradient-to-b ${theme.gradientBg} bg-white hover:shadow-xl p-4 rounded-2xl border ${theme.border} ${theme.hoverBorder} hover:-translate-y-1`}
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-500">
                      {ds.category}
                    </span>
                    <div className={`w-6 h-6 rounded-lg flex items-center justify-center ${theme.iconBg}`}>
                      <IconComp className="w-3.5 h-3.5" />
                    </div>
                  </div>

                  <h4 className="font-sans font-bold text-[15px] text-[#0A1128] group-hover:text-sky-600 transition-colors mt-0 mb-1 leading-snug">
                    {ds.name}
                  </h4>
                  <p className="text-[11.5px] text-slate-600 leading-relaxed m-0 line-clamp-2">
                    {ds.description}
                  </p>
                </div>

                <div className="flex items-center justify-between pt-2.5 border-t border-slate-100">
                  <span className={`text-[10px] font-mono font-bold py-0.5 px-2 rounded-full border ${theme.tagClass}`}>
                    {ds.tags[0]}
                  </span>
                  <div className="w-7 h-7 rounded-full bg-slate-100 group-hover:bg-gradient-to-r group-hover:from-sky-500 group-hover:to-indigo-600 flex items-center justify-center transition-all shadow-xs">
                    <ArrowRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-white group-hover:translate-x-0.5 transition-all" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
