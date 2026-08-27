'use client';

import React from 'react';
import Image from 'next/image';
import { DashboardTabConfig, DomainInfo } from '@/lib/types';
import {
  Sparkles,
  Newspaper,
  ArrowLeft,
  Radio,
  Zap,
  LayoutDashboard,
  Megaphone,
  Users,
  Calendar,
  Clock,
  LineChart,
  BarChart3,
  TrendingUp,
  Package,
  Layers,
  MapPin,
  Globe,
  Award,
  Sigma,
  ShieldCheck,
  BookOpen,
  Table
} from 'lucide-react';

interface SidebarProps {
  tabs: DashboardTabConfig[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
  domain: DomainInfo;
  onResetData: () => void;
  newsItems?: any[];
  isLoadingNews?: boolean;
}

// Icon and color mapping for each module
function getTabIconAndColor(tabId: string) {
  switch (tabId) {
    case 'overview':
      return { icon: LayoutDashboard, color: 'text-cyan-400', activeGlow: 'from-cyan-500 via-sky-600 to-blue-600' };
    case 'marketing-media':
      return { icon: Megaphone, color: 'text-pink-400', activeGlow: 'from-pink-500 via-rose-600 to-purple-600' };
    case 'target-cohorts':
      return { icon: Users, color: 'text-purple-400', activeGlow: 'from-purple-500 via-indigo-600 to-sky-600' };
    case 'daily':
      return { icon: Clock, color: 'text-sky-400', activeGlow: 'from-sky-500 via-blue-600 to-indigo-600' };
    case 'weekly':
      return { icon: Calendar, color: 'text-blue-400', activeGlow: 'from-blue-500 via-indigo-600 to-purple-600' };
    case 'weekday':
      return { icon: LineChart, color: 'text-indigo-400', activeGlow: 'from-indigo-500 via-purple-600 to-pink-600' };
    case 'monthly':
      return { icon: BarChart3, color: 'text-teal-400', activeGlow: 'from-teal-500 via-emerald-600 to-cyan-600' };
    case 'yearly':
      return { icon: TrendingUp, color: 'text-emerald-400', activeGlow: 'from-emerald-500 via-teal-600 to-sky-600' };
    case 'products':
      return { icon: Package, color: 'text-amber-400', activeGlow: 'from-amber-500 via-orange-600 to-rose-600' };
    case 'category':
      return { icon: Layers, color: 'text-orange-400', activeGlow: 'from-orange-500 via-amber-600 to-purple-600' };
    case 'locations':
      return { icon: MapPin, color: 'text-emerald-400', activeGlow: 'from-emerald-500 via-teal-600 to-blue-600' };
    case 'region':
      return { icon: Globe, color: 'text-cyan-400', activeGlow: 'from-cyan-500 via-blue-600 to-indigo-600' };
    case 'forecast':
      return { icon: Sparkles, color: 'text-violet-400', activeGlow: 'from-violet-500 via-purple-600 to-pink-600' };
    case 'insights':
      return { icon: Award, color: 'text-amber-300', activeGlow: 'from-amber-500 via-orange-600 to-purple-600' };
    case 'news':
      return { icon: Newspaper, color: 'text-teal-300', activeGlow: 'from-teal-500 via-cyan-600 to-blue-600' };
    case 'statistics':
      return { icon: Sigma, color: 'text-purple-400', activeGlow: 'from-purple-500 via-indigo-600 to-sky-600' };
    case 'quality':
      return { icon: ShieldCheck, color: 'text-emerald-400', activeGlow: 'from-emerald-500 via-teal-600 to-sky-600' };
    case 'dictionary':
      return { icon: BookOpen, color: 'text-sky-400', activeGlow: 'from-sky-500 via-blue-600 to-indigo-600' };
    case 'explorer':
      return { icon: Table, color: 'text-indigo-400', activeGlow: 'from-indigo-500 via-purple-600 to-pink-600' };
    default:
      return { icon: LayoutDashboard, color: 'text-cyan-400', activeGlow: 'from-cyan-500 via-blue-600 to-indigo-600' };
  }
}

export const Sidebar: React.FC<SidebarProps> = ({
  tabs,
  activeTab,
  onTabChange,
  domain,
  onResetData,
  newsItems = [],
  isLoadingNews = false
}) => {
  return (
    <aside className="w-[270px] h-full bg-gradient-to-b from-[#060D1E] via-[#0A142F] to-[#050B18] text-[#F8FAFC] p-4 sm:p-5 flex flex-col justify-between gap-4 flex-none select-none border-r border-[#1E293B] shadow-2xl relative overflow-hidden">
      {/* Decorative Ambient Neon Background Glows */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/10 rounded-full blur-2xl pointer-events-none" />
      <div className="absolute bottom-20 left-0 w-36 h-36 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Brand Header with DataWhiz Logo */}
      <div className="flex flex-col gap-2.5 border-b border-slate-800/80 pb-4 relative z-10">
        <div className="flex items-center gap-3">
          <div className="relative w-[52px] h-auto flex-none group flex items-center p-1 rounded-xl bg-white/5 border border-white/10 shadow-inner">
            <Image
              src="/logo.png"
              alt="DataWhiz Logo"
              width={52}
              height={20}
              className="object-contain drop-shadow-[0_0_8px_rgba(6,182,212,0.6)] group-hover:scale-105 transition-transform w-[52px] h-auto"
              priority
            />
          </div>
          <div className="flex flex-col">
            <h1 className="font-sans font-extrabold text-[22px] leading-tight m-0 bg-gradient-to-r from-white via-cyan-100 to-sky-300 bg-clip-text text-transparent tracking-wide">
              DataWhiz
            </h1>
            <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-cyan-400 font-extrabold flex items-center gap-1">
              <Sparkles className="w-2.5 h-2.5 text-cyan-400" />
              AI Intelligence
            </span>
          </div>
        </div>

        {/* Domain Badge */}
        <div className="flex items-center justify-between font-mono text-[10px] tracking-wider text-slate-300 uppercase px-2.5 bg-gradient-to-r from-slate-900/90 to-blue-950/70 py-1.5 rounded-lg border border-cyan-500/30 shadow-xs">
          <div className="flex items-center gap-1.5 truncate">
            <span className="w-2 h-2 rounded-full bg-[#00D2B4] animate-pulse shadow-[0_0_6px_#00D2B4]" />
            <span className="truncate font-bold text-cyan-200">{domain.primaryDomain}</span>
          </div>
          <span className="text-[9px] font-bold text-cyan-400 bg-cyan-950/80 px-1.5 py-0.5 rounded border border-cyan-500/40">
            {Math.round(domain.confidence * 100)}%
          </span>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="flex flex-col gap-1.5 flex-1 overflow-y-auto pr-1 relative z-10">
        <div className="font-mono text-[9.5px] uppercase tracking-[0.18em] text-slate-400 px-3 my-1 flex items-center justify-between font-bold">
          <span className="flex items-center gap-1 text-slate-400">
            <Zap className="w-3 h-3 text-cyan-400" />
            Modules
          </span>
          <span className="text-[9px] text-cyan-400 font-mono bg-cyan-950/60 px-2 py-0.5 rounded-full border border-cyan-800/40 font-bold">
            {tabs.length} Views
          </span>
        </div>

        {tabs.map((t) => {
          const isActive = activeTab === t.id;
          const { icon: TabIcon, color: iconColor, activeGlow } = getTabIconAndColor(t.id);

          return (
            <button
              key={t.id}
              onClick={() => onTabChange(t.id)}
              className={`flex items-center justify-between text-left font-sans text-[13px] py-2.5 px-3 rounded-xl cursor-pointer transition-all duration-200 group relative ${
                isActive
                  ? `bg-gradient-to-r ${activeGlow} text-white font-bold shadow-lg shadow-sky-500/30 border border-white/30 translate-x-1`
                  : 'text-slate-300 hover:bg-white/8 hover:text-white font-medium hover:translate-x-0.5'
              }`}
            >
              <div className="flex items-center gap-2.5 truncate">
                <div
                  className={`w-6 h-6 rounded-lg flex items-center justify-center flex-none transition-all ${
                    isActive
                      ? 'bg-white/20 text-white shadow-xs'
                      : `bg-slate-800/70 ${iconColor} group-hover:bg-slate-700`
                  }`}
                >
                  <TabIcon className="w-3.5 h-3.5" />
                </div>
                <span className="truncate">{t.label}</span>
              </div>

              {t.id === 'news' && (
                <span
                  className={`text-[8.5px] font-mono font-bold px-2 py-0.5 rounded-full ${
                    isActive
                      ? 'bg-white/25 text-white'
                      : 'bg-teal-500/20 text-teal-300 border border-teal-500/40 animate-pulse'
                  }`}
                >
                  LIVE
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Live News Summary & Footer */}
      <div className="flex flex-col gap-2.5 pt-3 border-t border-slate-800/80 text-[11px] text-slate-400 relative z-10">
        {newsItems.length > 0 && (
          <div className="flex flex-col gap-1 bg-gradient-to-br from-slate-900/90 to-blue-950/80 p-2.5 rounded-xl text-[#F8FAFC] border border-cyan-500/20 shadow-inner">
            <div className="font-mono text-[9px] uppercase tracking-wider text-cyan-300 flex items-center justify-between font-bold">
              <span className="flex items-center gap-1.5">
                <Radio className="w-3 h-3 text-[#00D2B4] animate-pulse" />
                Live Market Wire
              </span>
              <span className="text-[8px] text-cyan-400 font-mono bg-cyan-950 px-1 py-0.2 rounded border border-cyan-800">
                TAVILY
              </span>
            </div>
            <span className="text-[11px] font-medium leading-snug line-clamp-2 text-slate-200">
              {newsItems[0]?.headline}
            </span>
          </div>
        )}

        <div className="flex items-center justify-between px-1 pt-1">
          <button
            onClick={onResetData}
            className="text-[11px] font-bold text-cyan-400 hover:text-cyan-200 flex items-center gap-1.5 cursor-pointer bg-slate-900/80 hover:bg-slate-800/90 py-1.5 px-3 rounded-lg border border-cyan-500/30 transition-all w-full justify-center shadow-xs"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Switch Dataset
          </button>
        </div>
      </div>
    </aside>
  );
};
