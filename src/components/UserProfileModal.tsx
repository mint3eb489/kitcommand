/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { 
  X, LogOut, Palette, Check, User, Target, 
  Compass, Trophy, Sparkles, Star, ShieldAlert,
  Calendar, TrendingUp, Award, BarChart2, Briefcase, Settings, PieChart
} from 'lucide-react';
import { Commission } from '../types.ts';
import { User as FirebaseUser } from 'firebase/auth';
import { DonutChart } from './DonutChart.tsx';
import { motion, AnimatePresence } from 'motion/react';

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: FirebaseUser | null;
  currentUserDisplayName: string;
  onLogout: () => void;
  yearlyTargets?: Record<string, number>;
  annualTarget: number;
  theme: string;
  onChangeTheme: (theme: any) => void;
  commissions: Commission[];
  isAdmin: boolean;
  selectedColleague?: string;
  teammates?: { email: string; name: string; isActive: boolean }[];
  targetProfileEmail?: string | null;
}

export const UserProfileModal: React.FC<UserProfileModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  currentUserDisplayName,
  onLogout,
  yearlyTargets,
  annualTarget,
  theme,
  onChangeTheme,
  commissions,
  isAdmin,
  selectedColleague,
  teammates,
  targetProfileEmail,
}) => {
  const [editedName, setEditedName] = useState('');
  const [savedSuccess, setSavedSuccess] = useState(false);
  
  // Custom Tab State for Profile Modal
  const [activeProfileTab, setActiveProfileTab] = useState<'stats' | 'settings'>('stats');

  // Starttab settings
  const [startTab, setStartTab] = useState<'open' | 'sold' | 'ausarbeitung' | 'stats' | 'admin'>('open');
  const [perspectiveSetting, setPerspectiveSetting] = useState<'all' | 'own'>('all');

  // Personal statistics filter state
  const [statsYear, setStatsYear] = useState<string>(new Date().getFullYear().toString());
  const [statsMonth, setStatsMonth] = useState<string>('all');
  const [showRemaining, setShowRemaining] = useState<boolean>(false);

  useEffect(() => {
    if (isOpen) {
      setEditedName(localStorage.getItem('kk_custom_display_name') || '');
      setStartTab((localStorage.getItem('kk_default_tab') || 'open') as any);
      setPerspectiveSetting((localStorage.getItem('kk_default_colleague_perspective') || 'all') as any);
      setSavedSuccess(false);
    }
  }, [isOpen]);

  // Formatter for Currency
  const formatter = useMemo(() => new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  }), []);

  // Determine all available years dynamically from the commissions data
  const availableYears = useMemo(() => {
    const years = new Set<number>();
    const currentY = new Date().getFullYear();
    years.add(currentY);
    commissions.forEach((c) => {
      const dateStr = c.resolvedAt || c.createdAt;
      if (dateStr) {
        const year = new Date(dateStr).getFullYear();
        if (year) years.add(year);
      }
    });
    return Array.from(years).sort((a, b) => b - a);
  }, [commissions]);


  const currentYear = new Date().getFullYear().toString();
  const currentYearForTarget = statsYear === 'all' ? currentYear : statsYear;

  const activeProfileEmail = useMemo(() => {
    if (isAdmin && targetProfileEmail) {
      return targetProfileEmail.toLowerCase().trim();
    }
    return currentUser?.email?.toLowerCase().trim() || '';
  }, [isAdmin, targetProfileEmail, currentUser?.email]);

  const activeProfileName = useMemo(() => {
    const emailToUse = (isAdmin && targetProfileEmail) 
      ? targetProfileEmail.toLowerCase().trim()
      : '';

    if (isAdmin && emailToUse) {
      const conf = teammates?.find(t => t.email.toLowerCase().trim() === emailToUse);
      if (conf && conf.name.trim()) {
        return conf.name;
      }
      const prefix = emailToUse.split('@')[0];
      return prefix.charAt(0).toUpperCase() + prefix.slice(1);
    }
    return currentUserDisplayName;
  }, [isAdmin, targetProfileEmail, teammates, currentUserDisplayName]);

  // Filter ONLY commissions belonging to the active profile (based on email match and admin filters)
  const personalCommissions = useMemo(() => {
    if (!activeProfileEmail) return [];
    
    // Check if the target profile email belongs to an Admin
    const adminEmailsList = ['belmonte@fs-kuechen.de', 'belmonte.enrico@gmail.com', 'demo@fs-kuechen.de'];
    const targetEmailLower = activeProfileEmail.toLowerCase().trim();
    const isTargetAdmin = adminEmailsList.includes(targetEmailLower);

    if (isTargetAdmin) {
      // Unowned (legacy) documents or admin owned documents are visible under admin selection
      return commissions.filter((c) => {
        const creatorEmail = (c.createdByEmail || '').toLowerCase().trim();
        return !creatorEmail || adminEmailsList.includes(creatorEmail);
      });
    }

    return commissions.filter((c) => (c.createdByEmail || '').toLowerCase().trim() === targetEmailLower);
  }, [commissions, activeProfileEmail]);

  // 1. Target Agreement (Zielvereinbarung) calculated dynamically based on target year or personal assignment
  const userTarget = yearlyTargets?.[`${activeProfileEmail}_${currentYearForTarget}`] ?? yearlyTargets?.[currentYearForTarget] ?? annualTarget ?? 1500000;

  // 2. Strongest sales month calculated for the user dynamically
  const bestMonthInfo = personalCommissions.length > 0 ? (() => {
    const userSoldThisYear = personalCommissions.filter(c => {
      if (c.status !== 'sold') return false;
      const dateStr = c.resolvedAt || c.createdAt;
      if (!dateStr) return false;
      return new Date(dateStr).getFullYear().toString() === currentYearForTarget;
    });

    if (userSoldThisYear.length === 0) return null;

    const monthRevenues = Array(12).fill(0);
    const monthCounts = Array(12).fill(0);

    userSoldThisYear.forEach(c => {
      const dateStr = c.resolvedAt || c.createdAt;
      if (dateStr) {
        const d = new Date(dateStr);
        const m = d.getMonth();
        monthRevenues[m] += c.price || 0;
        monthCounts[m] += 1;
      }
    });

    let maxRev = -1;
    let bestMonthIdx = -1;
    for (let i = 0; i < 12; i++) {
      if (monthRevenues[i] > maxRev) {
        maxRev = monthRevenues[i];
        bestMonthIdx = i;
      }
    }

    if (bestMonthIdx === -1 || maxRev === 0) return null;

    const monthNames = [
      'Januar', 'Februar', 'März', 'April', 'Mai', 'Juni',
      'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'
    ];

    return {
      monthName: monthNames[bestMonthIdx],
      revenue: maxRev,
      count: monthCounts[bestMonthIdx],
    };
  })() : null;

  // 3. Complete personal statistics calculations (revenue tracker, closing rate, average value, donut charts)
  const personalStats = useMemo(() => {
    let annualRevenue = 0;

    // Open pipeline structure (ignoring statsMonth filter)
    let openNeubau = 0;
    let openBestand = 0;
    let openKlein = 0;

    personalCommissions.forEach((c) => {
      const targetDateStr = c.resolvedAt || c.createdAt;
      
      // Annual revenue for the target tracker
      if (c.status === 'sold' && targetDateStr) {
        const date = new Date(targetDateStr);
        if (statsYear === 'all' || date.getFullYear().toString() === statsYear) {
          annualRevenue += c.price || 0;
        }
      }

      // Open pipeline totals
      if (c.status === 'open') {
        const type = c.bauart || (c.isNeubau ? 'neubau' : 'bestand');
        if (type === 'neubau') openNeubau++;
        else if (type === 'kleinauftrag') openKlein++;
        else openBestand++;
      }
    });

    // Filtered data respects both statsYear and statsMonth filters for closing rate, total order value etc.
    const filteredData = personalCommissions.filter((c) => {
      if (c.status === 'open') return false;
      const targetDateStr = c.resolvedAt || c.createdAt;
      if (!targetDateStr) return false;
      const date = new Date(targetDateStr);

      if (statsYear !== 'all' && date.getFullYear().toString() !== statsYear) return false;
      if (statsMonth !== 'all' && (date.getMonth() + 1).toString() !== statsMonth) return false;

      return true;
    });

    let revenue = 0;
    let qualifiedSoldCount = 0;
    let qualifiedLostCount = 0;
    let qualifiedRevenue = 0;

    let soldNeubau = 0;
    let soldBestand = 0;
    let soldKlein = 0;

    filteredData.forEach((c) => {
      const type = c.bauart || (c.isNeubau ? 'neubau' : 'bestand');
      const isKlein = type === 'kleinauftrag';
      const price = c.price || 0;

      if (c.status === 'sold') {
        revenue += price;
        
        if (type === 'neubau') soldNeubau++;
        else if (type === 'kleinauftrag') soldKlein++;
        else soldBestand++;

        if (!isKlein) {
          qualifiedSoldCount++;
          qualifiedRevenue += price;
        }
      } else if (c.status === 'lost') {
        if (!isKlein) {
          qualifiedLostCount++;
        }
      }
    });

    const totalQualified = qualifiedSoldCount + qualifiedLostCount;
    const winRate = totalQualified > 0 ? (qualifiedSoldCount / totalQualified) * 105 : 0; // Wait, let's keep it safe 100% cap
    const winRateCorrected = totalQualified > 0 ? (qualifiedSoldCount / totalQualified) * 100 : 0;
    const avgValue = qualifiedSoldCount > 0 ? qualifiedRevenue / qualifiedSoldCount : 0;

    // Percentages for Sold Structure Donut Chart
    const totalSoldDonut = soldNeubau + soldBestand + soldKlein;
    const pctNeubau = totalSoldDonut > 0 ? (soldNeubau / totalSoldDonut) * 100 : 0;
    const pctBestand = totalSoldDonut > 0 ? (soldBestand / totalSoldDonut) * 100 : 0;
    const pctKlein = totalSoldDonut > 0 ? (soldKlein / totalSoldDonut) * 100 : 0;

    // Percentages for Open Structure Donut Chart
    const totalOpenDonut = openNeubau + openBestand + openKlein;
    const pctOpenNeubau = totalOpenDonut > 0 ? (openNeubau / totalOpenDonut) * 100 : 0;
    const pctOpenBestand = totalOpenDonut > 0 ? (openBestand / totalOpenDonut) * 100 : 0;
    const pctOpenKlein = totalOpenDonut > 0 ? (openKlein / totalOpenDonut) * 100 : 0;

    return {
      annualRevenue,
      revenue,
      qualifiedSoldCount,
      qualifiedLostCount,
      winRate: winRateCorrected,
      avgValue,
      donutSold: {
        total: totalSoldDonut,
        neubau: soldNeubau,
        bestand: soldBestand,
        klein: soldKlein,
        pctNeubau,
        pctBestand,
        pctKlein,
      },
      donutOpen: {
        total: totalOpenDonut,
        neubau: openNeubau,
        bestand: openBestand,
        klein: openKlein,
        pctNeubau: pctOpenNeubau,
        pctBestand: pctOpenBestand,
        pctKlein: pctOpenKlein,
        pctOpenNeubau,
        pctOpenBestand,
        pctOpenKlein,
      },
    };
  }, [personalCommissions, statsYear, statsMonth]);

  const rawTargetPercent = (personalStats.annualRevenue / (userTarget || 1500000)) * 100;
  const targetPercent = Math.min(rawTargetPercent, 100);

  const handleSaveDisplayName = () => {
    const trimmed = editedName.trim();
    if (trimmed) {
      localStorage.setItem('kk_custom_display_name', trimmed);
    } else {
      localStorage.removeItem('kk_custom_display_name');
    }
    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
    }, 2000);
    
    window.dispatchEvent(new Event('storage_custom_name_changed'));
  };

  const handleSaveStartTab = (tab: any) => {
    setStartTab(tab);
    localStorage.setItem('kk_default_tab', tab);
  };

  // Theme choices from prior spec
  const themes = [
    { id: 'light', name: 'Light Mode', colors: { bg: '#faf8f5', accent: '#2563eb', border: '#e7dfd1' } },
    { id: 'dark', name: 'Dark Mode', colors: { bg: '#09090b', accent: '#3b82f6', border: '#27272a' } },
    { id: 'sage', name: 'Sage Botanical', colors: { bg: '#F1F3F0', accent: '#2C3531', border: '#8A9A86' } },
    { id: 'ocean', name: 'Deep Ocean', colors: { bg: '#0B132B', accent: '#EDF2F4', border: '#4EA8DE' } },
    { id: 'wood', name: 'Vintage Terracotta', colors: { bg: '#FBF7F4', accent: '#3E2723', border: '#795548' } },
  ];

  if (!isOpen || !currentUser) return null;

  return (
    <div id="profile-modal-backdrop" className="fixed inset-0 bg-black/60 backdrop-blur-md z-[200] flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-y-auto">
      <div 
        id="profile-modal-card" 
        className="bg-white dark:bg-zinc-900 border-t sm:border border-slate-200 dark:border-zinc-800 max-w-md sm:max-w-4xl w-full rounded-t-[2.5rem] sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col sm:my-auto max-h-[95vh] sm:max-h-[90vh]"
      >
        {/* Header styling */}
        <div className="relative bg-gradient-to-r from-blue-50 to-indigo-50/50 dark:from-zinc-950 dark:to-zinc-900 p-6 border-b border-slate-200/50 dark:border-zinc-800/80 flex items-center justify-between">
          <div className="flex items-center gap-3 text-left">
            <div className="w-10 h-10 rounded-full bg-blue-600/10 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400 flex items-center justify-center font-bold">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-black tracking-tight text-slate-800 dark:text-slate-100 flex items-center gap-1.5 leading-none">
                {activeProfileName}
              </h2>
              <span className="text-[10px] text-slate-400 dark:text-zinc-500 font-mono mt-0.5 block truncate max-w-[220px]">
                {activeProfileEmail}
              </span>
            </div>
          </div>
          
          <button 
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-slate-400 hover:text-slate-600 dark:text-zinc-500 dark:hover:text-zinc-300 flex items-center justify-center cursor-pointer transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Dynamic Dual Tab Selector Custom Header */}
        <div className="flex border-b border-slate-200/60 dark:border-zinc-850 bg-slate-50/40 dark:bg-zinc-950/20 select-none px-4">
          <button
            onClick={() => setActiveProfileTab('stats')}
            className={`py-3.5 px-4 text-xs font-black uppercase tracking-wider relative flex items-center gap-2 transition-all cursor-pointer ${
              activeProfileTab === 'stats'
                ? 'text-blue-600 dark:text-blue-400 font-extrabold'
                : 'text-slate-400 hover:text-slate-600 dark:text-zinc-550 dark:hover:text-zinc-300'
            }`}
          >
            <BarChart2 className="w-4 h-4" />
            Persönliche Statistiken
            {activeProfileTab === 'stats' && (
              <motion.div 
                layoutId="active-profile-tab-indicator" 
                className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 dark:bg-blue-400 rounded-full"
              />
            )}
          </button>
          <button
            onClick={() => setActiveProfileTab('settings')}
            className={`py-3.5 px-4 text-xs font-black uppercase tracking-wider relative flex items-center gap-2 transition-all cursor-pointer ${
              activeProfileTab === 'settings'
                ? 'text-blue-600 dark:text-blue-400 font-extrabold'
                : 'text-slate-400 hover:text-slate-600 dark:text-zinc-550 dark:hover:text-zinc-300'
            }`}
          >
            <Settings className="w-4 h-4" />
            Einstellungen & Themes
            {activeProfileTab === 'settings' && (
              <motion.div 
                layoutId="active-profile-tab-indicator" 
                className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 dark:bg-blue-400 rounded-full"
              />
            )}
          </button>
        </div>

        {/* Content scrolling container */}
        <div className="p-6 overflow-y-auto flex-1 max-h-[66vh]">
          
          {/* TAB 1: PERSÖNLICHE STATISTIKEN */}
          {activeProfileTab === 'stats' && (
            <div className="space-y-6">
              
              {/* Filter Row */}
              <div className="flex flex-row justify-between items-center gap-2 border-b border-slate-200/60 dark:border-zinc-800/80 pb-3">
                <div className="flex items-center gap-2 text-left">
                  <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
                    <TrendingUp className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-black uppercase tracking-wider text-slate-705 dark:text-slate-200 leading-none">
                      {activeProfileEmail === currentUser?.email?.toLowerCase().trim() ? 'Eigene Erfolgsbilanz' : 'Mitarbeiter Erfolgsbilanz'}
                    </h3>
                    <span className="text-[10px] text-slate-400 dark:text-zinc-500 block mt-0.5 font-mono">
                      {activeProfileEmail === currentUser?.email?.toLowerCase().trim() ? 'Nur deine eigenen Abschlüsse' : `Abschlüsse von ${activeProfileName}`}
                    </span>
                  </div>
                </div>
                
                <div className="flex gap-1.5 items-center shrink-0">
                  <select
                    value={statsYear}
                    onChange={(e) => setStatsYear(e.target.value)}
                    className="input-field text-[10px] py-1.5 px-2 bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-805 text-slate-800 dark:text-zinc-100 shadow-3xs !w-auto"
                  >
                    <option value="all">Alle Jahre</option>
                    {availableYears.map((y) => (
                      <option key={y} value={y.toString()}>{y}</option>
                    ))}
                  </select>

                  <select
                    value={statsMonth}
                    onChange={(e) => setStatsMonth(e.target.value)}
                    className="input-field text-[10px] py-1.5 px-2 bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-805 text-slate-800 dark:text-zinc-100 shadow-3xs !w-auto"
                  >
                    <option value="all">Ganzes Jahr</option>
                    <option value="1">Januar</option>
                    <option value="2">Februar</option>
                    <option value="3">März</option>
                    <option value="4">April</option>
                    <option value="5">Mai</option>
                    <option value="6">Juni</option>
                    <option value="7">Juli</option>
                    <option value="8">August</option>
                    <option value="9">September</option>
                    <option value="10">Oktober</option>
                    <option value="11">November</option>
                    <option value="12">Dezember</option>
                  </select>
                </div>
              </div>

              {/* Grid 1: Ring Tracker on left, KPI grid cards on right */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-stretch">
                
                {/* Left Block: Circular Interactive Progress Ring (Ziel-Tracker) */}
                <div className="md:col-span-12 lg:col-span-5 bg-zinc-50 dark:bg-zinc-950/40 border border-slate-200/80 dark:border-zinc-800/80 rounded-3xl p-5 relative overflow-hidden flex flex-col items-center justify-between text-center group shadow-2xs">
                  {/* Glowing dynamic visual elements */}
                  <div className="absolute -right-16 -top-16 w-32 h-32 bg-blue-500/5 dark:bg-blue-400/5 rounded-full blur-2xl pointer-events-none group-hover:scale-110 transition-transform duration-500" />
                  
                  <div className="w-full flex items-center justify-between mb-3 text-left">
                    <div className="flex items-center gap-1.5">
                      <Target className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                      <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-zinc-500">
                        Zielvereinbarung
                      </span>
                    </div>
                    <span className="text-[9px] font-black text-slate-400 dark:text-zinc-500 bg-white dark:bg-zinc-900 py-0.5 px-1.5 rounded-lg border border-slate-100 dark:border-zinc-800/80 font-mono">
                      {currentYearForTarget}
                    </span>
                  </div>

                  <div className="my-1 shrink-0 flex items-center justify-center">
                    <div 
                      onClick={() => setShowRemaining(prev => !prev)}
                      className="relative w-36 h-36 flex items-center justify-center cursor-pointer select-none group/circle"
                      title="Klicken, um zwischen Erreicht und Verbleibend zu wechseln"
                    >
                      {rawTargetPercent >= 100 && (
                        <div className="absolute inset-0 bg-emerald-500/10 dark:bg-emerald-400/10 rounded-full animate-ping pointer-events-none duration-1000 opacity-20" />
                      )}
                      <div className="absolute inset-0 bg-blue-500/5 dark:bg-blue-400/5 rounded-full blur-xl opacity-0 group-hover/circle:opacity-100 transition-opacity duration-300 pointer-events-none" />
                      
                      <svg className="w-full h-full transform -rotate-90 p-1 filter drop-shadow-xs">
                        {/* Underlay base Ring track */}
                        <circle
                          cx="72"
                          cy="72"
                          r="58"
                          className="stroke-slate-200 dark:stroke-zinc-800/95 fill-transparent"
                          strokeWidth="8"
                        />
                        {/* Foreground active Ring */}
                        <motion.circle
                          cx="72"
                          cy="72"
                          r="58"
                          className={`fill-transparent ${
                            rawTargetPercent >= 100 
                              ? 'stroke-emerald-500 dark:stroke-emerald-400' 
                              : 'stroke-blue-600 dark:stroke-blue-500'
                          }`}
                          strokeWidth="8"
                          strokeLinecap="round"
                          initial={{ strokeDasharray: 364.4, strokeDashoffset: 364.4 }}
                          animate={{ strokeDashoffset: 364.4 - (targetPercent / 100) * 364.4 }}
                          transition={{ duration: 1.2, ease: 'easeOut' }}
                        />
                      </svg>

                      {/* Info inside circle */}
                      <div className="absolute flex flex-col items-center justify-center">
                        <AnimatePresence mode="wait">
                          <motion.div
                            key={showRemaining ? 'remaining' : 'achieved'}
                            initial={{ opacity: 0, scale: 0.9, y: 3 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: -3 }}
                            transition={{ duration: 0.2 }}
                            className="flex flex-col items-center justify-center text-center"
                          >
                            <span className="text-2.5xl font-black text-slate-800 dark:text-zinc-150 tracking-tight leading-none font-mono">
                              {showRemaining 
                                ? `${Math.max(0, 100 - rawTargetPercent).toFixed(1).replace('.', ',')}%`
                                : `${rawTargetPercent.toFixed(1).replace('.', ',')}%`}
                            </span>
                            <span className="text-[8px] font-extrabold text-slate-450 dark:text-zinc-500 uppercase tracking-widest mt-1">
                              {showRemaining ? 'Noch' : 'Erreicht'}
                            </span>
                          </motion.div>
                        </AnimatePresence>
                      </div>
                    </div>
                  </div>

                  {/* Ring detailed footer metrics */}
                  <div className="w-full grid grid-cols-2 gap-2 mt-4 text-left">
                    <div className="p-2.5 bg-white dark:bg-zinc-900 border border-slate-100 dark:border-zinc-800/80 rounded-xl shadow-3xs">
                      <span className="block text-[8px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wider mb-0.5">
                        {activeProfileEmail === currentUser?.email?.toLowerCase().trim() ? 'Dein Ziel' : 'Zielvorgabe'}
                      </span>
                      <span className="font-sans font-black text-[11px] sm:text-xs text-slate-700 dark:text-zinc-300 tracking-tight">{formatter.format(userTarget)}</span>
                    </div>
                    <div className="p-2.5 bg-white dark:bg-zinc-900 border border-slate-100 dark:border-zinc-800/80 rounded-xl shadow-3xs">
                      <span className="block text-[8px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wider mb-0.5">Erreicht (Jahr)</span>
                      <span className="font-sans font-black text-[11px] sm:text-xs text-blue-600 dark:text-blue-400 tracking-tight">{formatter.format(personalStats.annualRevenue)}</span>
                    </div>
                  </div>
                </div>

                {/* Right Block: Personal KPI Grid Cards */}
                <div className="md:col-span-12 lg:col-span-7 flex flex-col justify-between gap-4">
                  {/* Period Revenue Block */}
                  <div className="bg-zinc-50 dark:bg-zinc-950/40 rounded-2xl p-4 border border-slate-200/80 dark:border-zinc-800/80 hover:border-blue-500/20 dark:hover:border-blue-500/20 transition-all duration-300 relative overflow-hidden group shadow-2xs text-center flex-1 flex flex-col justify-center min-h-[96px]">
                    <div className="absolute -right-16 -top-16 w-32 h-32 bg-blue-500/10 rounded-full blur-2xl pointer-events-none" />
                    <p className="text-[9px] font-black text-blue-500 uppercase tracking-widest mb-1.5 relative z-10">Umsatz (ausgewählter Zeitraum)</p>
                    <p className="text-3xl font-black text-blue-500 tracking-tighter select-none relative z-10 leading-none py-1 font-sans">{formatter.format(personalStats.revenue)}</p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 flex-1">
                    {/* Closing Rate (Abschlussquote) */}
                    <div className="bg-zinc-50 dark:bg-zinc-950/40 rounded-2xl p-4 border border-slate-200/80 dark:border-zinc-800/80 relative overflow-hidden group shadow-2xs text-center flex flex-col justify-center min-h-[88px]">
                      <div className="absolute -right-12 -top-12 w-24 h-24 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />
                      <p className="text-[8px] sm:text-[9px] font-black text-amber-500 dark:text-amber-450 uppercase tracking-widest mb-1 relative z-10">Abschlussquote</p>
                      <p className="text-2xl font-black text-amber-500 dark:text-amber-450 tracking-tight select-none relative z-10 font-sans">{personalStats.winRate.toFixed(1).replace('.', ',')} %</p>
                    </div>

                    {/* Average Ticket Value (Ø Auftragswert) */}
                    <div className="bg-zinc-50 dark:bg-zinc-950/40 rounded-2xl p-4 border border-slate-200/80 dark:border-zinc-800/80 relative overflow-hidden group shadow-2xs text-center flex flex-col justify-center min-h-[88px]">
                      <div className="absolute -right-12 -top-12 w-24 h-24 bg-purple-500/10 rounded-full blur-2xl pointer-events-none" />
                      <p className="text-[8px] sm:text-[9px] font-black text-purple-500 uppercase tracking-widest mb-1 relative z-10">Ø Auftragswert</p>
                      <p className="text-lg sm:text-xl font-black text-purple-500 tracking-tight select-none relative z-10 font-sans">{formatter.format(personalStats.avgValue)}</p>
                    </div>
                  </div>

                  {/* Secondary Metrics count row */}
                  <div className="grid grid-cols-2 gap-4 flex-1">
                    {/* Solid units */}
                    <div className="bg-zinc-50 dark:bg-zinc-950/40 rounded-2xl p-3 border border-slate-200/80 dark:border-zinc-800/80 text-center flex flex-col justify-center shadow-3xs">
                      <p className="text-[8.5px] font-bold text-emerald-500 uppercase tracking-wider mb-0.5">Erfolgreich Verkauft</p>
                      <p className="text-lg font-black text-emerald-500 font-sans">{personalStats.donutSold.total} x</p>
                    </div>
                    {/* Non-buying units */}
                    <div className="bg-zinc-50 dark:bg-zinc-950/40 rounded-2xl p-3 border border-slate-200/80 dark:border-zinc-800/80 text-center flex flex-col justify-center shadow-3xs">
                      <p className="text-[8.5px] font-bold text-red-500 uppercase tracking-wider mb-0.5">Nicht Verkauft (Verloren)</p>
                      <p className="text-lg font-black text-red-500 font-sans">{personalStats.qualifiedLostCount} x</p>
                    </div>
                  </div>
                </div>

              </div>

              {/* Grid 2: Structure donuts side by side */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                
                {/* Sold Structure Donut */}
                <div className="bg-zinc-50 dark:bg-zinc-950/45 rounded-3xl p-5 border border-slate-200/80 dark:border-zinc-800/80 flex flex-col sm:flex-row items-center gap-5 justify-between relative overflow-hidden group shadow-2xs text-left">
                  <div className="w-full sm:w-1/2 flex flex-col">
                    <h4 className="text-[9px] font-black uppercase tracking-wider text-slate-400 dark:text-zinc-500 mb-3 flex items-center gap-1 leading-none">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                      Struktur (Verkauft)
                    </h4>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between p-1.5 rounded-lg bg-white dark:bg-zinc-900 border border-slate-100 dark:border-zinc-850 shadow-3xs text-[10.5px]">
                        <span className="font-semibold text-slate-600 dark:text-zinc-400">Neubau</span>
                        <div className="flex items-center gap-2 font-black text-slate-800 dark:text-zinc-200 font-mono">
                          <span className="text-slate-400 text-[9.5px] font-normal">{personalStats.donutSold.neubau}x</span>
                          <span>{Math.round(personalStats.donutSold.pctNeubau)}%</span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between p-1.5 rounded-lg bg-white dark:bg-zinc-900 border border-slate-100 dark:border-zinc-850 shadow-3xs text-[10.5px]">
                        <span className="font-semibold text-slate-600 dark:text-zinc-400">Bestand</span>
                        <div className="flex items-center gap-2 font-black text-slate-800 dark:text-zinc-200 font-mono">
                          <span className="text-slate-400 text-[9.5px] font-normal">{personalStats.donutSold.bestand}x</span>
                          <span>{Math.round(personalStats.donutSold.pctBestand)}%</span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between p-1.5 rounded-lg bg-white dark:bg-zinc-900 border border-slate-100 dark:border-zinc-850 shadow-3xs text-[10.5px]">
                        <span className="font-semibold text-slate-600 dark:text-zinc-400">Kleinauftrag</span>
                        <div className="flex items-center gap-2 font-black text-slate-800 dark:text-zinc-200 font-mono">
                          <span className="text-slate-400 text-[9.5px] font-normal">{personalStats.donutSold.klein}x</span>
                          <span>{Math.round(personalStats.donutSold.pctKlein)}%</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex justify-center shrink-0">
                    <DonutChart
                      total={personalStats.donutSold.total}
                      segments={[
                        { value: personalStats.donutSold.pctNeubau, color: '#3b82f6' },
                        { value: personalStats.donutSold.pctBestand, color: '#94a3b8' },
                        { value: personalStats.donutSold.pctKlein, color: '#a855f7' },
                      ]}
                    />
                  </div>
                </div>

                {/* Open Structure Donut */}
                <div className="bg-zinc-50 dark:bg-zinc-950/45 rounded-3xl p-5 border border-slate-200/80 dark:border-zinc-800/80 flex flex-col sm:flex-row items-center gap-5 justify-between relative overflow-hidden group shadow-2xs text-left">
                  <div className="w-full sm:w-1/2 flex flex-col">
                    <h4 className="text-[9px] font-black uppercase tracking-wider text-slate-400 dark:text-zinc-500 mb-3 flex items-center gap-1 leading-none">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                      Struktur (Offen)
                    </h4>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between p-1.5 rounded-lg bg-white dark:bg-zinc-900 border border-slate-100 dark:border-zinc-850 shadow-3xs text-[10.5px]">
                        <span className="font-semibold text-slate-600 dark:text-zinc-400">Neubau</span>
                        <div className="flex items-center gap-2 font-black text-slate-800 dark:text-zinc-200 font-mono">
                          <span className="text-slate-400 text-[9.5px] font-normal">{personalStats.donutOpen.neubau}x</span>
                          <span>{Math.round(personalStats.donutOpen.pctOpenNeubau)}%</span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between p-1.5 rounded-lg bg-white dark:bg-zinc-900 border border-slate-100 dark:border-zinc-850 shadow-3xs text-[10.5px]">
                        <span className="font-semibold text-slate-600 dark:text-zinc-400">Bestand</span>
                        <div className="flex items-center gap-2 font-black text-slate-800 dark:text-zinc-200 font-mono">
                          <span className="text-slate-400 text-[9.5px] font-normal">{personalStats.donutOpen.bestand}x</span>
                          <span>{Math.round(personalStats.donutOpen.pctOpenBestand)}%</span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between p-1.5 rounded-lg bg-white dark:bg-zinc-900 border border-slate-100 dark:border-zinc-850 shadow-3xs text-[10.5px]">
                        <span className="font-semibold text-slate-600 dark:text-zinc-400">Kleinauftrag</span>
                        <div className="flex items-center gap-2 font-black text-slate-800 dark:text-zinc-200 font-mono">
                          <span className="text-slate-400 text-[9.5px] font-normal">{personalStats.donutOpen.klein}x</span>
                          <span>{Math.round(personalStats.donutOpen.pctOpenKlein)}%</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex justify-center shrink-0">
                    <DonutChart
                      total={personalStats.donutOpen.total}
                      segments={[
                        { value: personalStats.donutOpen.pctOpenNeubau, color: '#3b82f6' },
                        { value: personalStats.donutOpen.pctOpenBestand, color: '#94a3b8' },
                        { value: personalStats.donutOpen.pctOpenKlein, color: '#a855f7' },
                      ]}
                    />
                  </div>
                </div>

              </div>

              {/* Best Month Trophy Banner under stats */}
              {bestMonthInfo && (
                <div className="bg-gradient-to-r from-amber-500/5 to-yellow-500/5 dark:from-amber-500/5 dark:to-yellow-500/4 p-4 border border-amber-500/20 rounded-2xl relative overflow-hidden group text-left">
                  <div className="absolute top-0 right-0 p-3 opacity-20 dark:opacity-10 group-hover:rotate-12 transition-transform select-none">
                    <Trophy className="w-16 h-16 text-amber-500 animate-pulse" />
                  </div>
                  
                  <div className="flex items-center gap-2 mb-2 relative z-10">
                    <Sparkles className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                    <h3 className="text-[10px] font-black uppercase tracking-wider text-amber-700 dark:text-amber-450 leading-none">
                      Dein Spitzenmonat ({statsYear === 'all' ? currentYear : statsYear})
                    </h3>
                  </div>
                  
                  <div className="mt-1 relative z-10 select-none">
                    <p className="text-xs font-bold text-slate-700 dark:text-zinc-300">
                      Bester Monat:{' '}
                      <span className="text-amber-600 dark:text-amber-400 text-sm font-black italic">
                        {bestMonthInfo.monthName}
                      </span>
                    </p>
                    <div className="flex items-baseline gap-1 mt-0.5 font-mono">
                      <span className="text-lg font-black text-slate-800 dark:text-zinc-100 leading-none">
                        {formatter.format(bestMonthInfo.revenue)}
                      </span>
                      <span className="text-[10px] text-slate-400 dark:text-zinc-500 font-sans font-medium">
                        ({bestMonthInfo.count} {bestMonthInfo.count === 1 ? 'Küchen-Abschluss' : 'Küchen-Abschlüsse'})
                      </span>
                    </div>
                  </div>
                </div>
              )}

            </div>
          )}

          {/* TAB 2: EINSTELLUNGEN & DESIGN */}
          {activeProfileTab === 'settings' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 items-start text-left">
              
              {/* Left Column Settings */}
              <div className="space-y-6">
                
                {activeProfileEmail === currentUser?.email?.toLowerCase().trim() ? (
                  <>
                    {/* Section 1: Name Customization */}
                    <div className="space-y-2 bg-slate-50/20 dark:bg-zinc-950/20 p-4 rounded-2xl border border-slate-200/50 dark:border-zinc-850">
                      <label className="text-[10px] font-black text-slate-450 dark:text-zinc-400 uppercase tracking-widest pl-1 block">
                        Eigenes Namenskürzel / Anzeigename
                      </label>
                      <div className="flex gap-2.5 pt-1">
                        <input 
                          type="text"
                          value={editedName}
                          onChange={(e) => setEditedName(e.target.value)}
                          placeholder={currentUserDisplayName}
                          className="input-field text-sm font-semibold bg-white dark:bg-zinc-950 text-slate-850 dark:text-zinc-100 placeholder-slate-400 dark:placeholder-zinc-650 border border-slate-200 dark:border-zinc-850/80 rounded-xl focus:ring-2 focus:ring-blue-500/30 transition-all"
                        />
                        <button
                          id="profile-save-displayname-btn"
                          onClick={handleSaveDisplayName}
                          className="bg-blue-600 hover:bg-blue-700 text-white px-4 rounded-xl font-bold text-[10px] uppercase tracking-widest shadow-md shadow-blue-500/10 active:scale-95 transition-all text-center shrink-0 cursor-pointer"
                        >
                          {savedSuccess ? 'Gesichert!' : 'Sichern'}
                        </button>
                      </div>
                      <p className="text-[9px] text-slate-400 dark:text-zinc-550 pl-1 leading-relaxed">
                        Dadurch änderst du deinen Namen lokal im App-Dashboard. Falls der Administrator Enrico deinen Namen permanent im System pflegt, wird dieser bei Abwesenheit überschrieben.
                      </p>
                    </div>

                    {/* Section 2: Default Start Tab */}
                    <div className="space-y-2.5 bg-slate-50/20 dark:bg-zinc-950/20 p-4 rounded-2xl border border-slate-200/50 dark:border-zinc-850">
                      <div className="flex items-center gap-1.5 pl-1">
                        <Compass className="w-3.5 h-3.5 text-slate-400" />
                        <label className="text-[10px] font-black text-slate-450 dark:text-zinc-400 uppercase tracking-widest block">
                          Standard Starttab
                        </label>
                      </div>
                      <div id="standard-starttab-container" className="grid grid-cols-2 gap-2 pt-1.5">
                        {(['open', 'sold', 'ausarbeitung', 'stats'] as const).map((tab) => {
                          if (tab === 'ausarbeitung' && !isAdmin && currentUser?.email?.toLowerCase().trim() !== 'belmonte@fs-kuechen.de') {
                            return null;
                          }

                          const labels: Record<string, string> = {
                            open: 'Offen',
                            sold: 'Verkauft',
                            ausarbeitung: 'Ausarbeitung',
                            stats: 'Statistik',
                          };

                          const isSelected = startTab === tab;

                          return (
                            <button
                              key={tab}
                              onClick={() => handleSaveStartTab(tab)}
                              className={`py-2 px-3 rounded-xl text-xs font-bold uppercase tracking-wider text-center active:scale-95 transition-all border cursor-pointer ${
                                isSelected 
                                  ? 'bg-blue-600 border-blue-600 text-white shadow-xs' 
                                  : 'bg-slate-50 border-slate-200 dark:bg-zinc-950 dark:border-zinc-800 text-slate-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-850'
                              }`}
                            >
                              {labels[tab]}
                            </button>
                          );
                        })}
                      </div>
                      <p className="text-[9px] text-slate-400 dark:text-zinc-550 pl-1 leading-normal">
                        Bestimmt, auf welchem Reiter die App standardmäßig startet, wenn du die Web-Anwendung neu lädst.
                      </p>
                    </div>
                  </>
                ) : (
                  <div className="bg-slate-50/50 dark:bg-zinc-950/40 p-5 rounded-2xl border border-slate-200/50 dark:border-zinc-800/80 text-center text-slate-500 dark:text-zinc-400 space-y-2">
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-zinc-300">Fremdes Mitarbeiterprofil</p>
                    <p className="text-[10px] leading-relaxed">
                      Lokale Einstellungen wie Anzeigename oder Standard-Starttab können nur im eigenen Mitarbeiterprofil editiert werden.
                    </p>
                  </div>
                )}

                {/* Section 3: Admin perspective settings (Admins only) */}
                {isAdmin && (
                  <div className="space-y-2 bg-slate-50/20 dark:bg-zinc-950/20 p-4 rounded-2xl border border-slate-200/50 dark:border-zinc-850">
                    <div className="flex items-center gap-1.5 pl-1">
                      <Compass className="w-3.5 h-3.5 text-slate-400" />
                      <label className="text-[10px] font-black text-slate-450 dark:text-zinc-400 uppercase tracking-widest block">
                        Standard-Perspektive
                      </label>
                    </div>
                    <div className="grid grid-cols-2 gap-2 pt-1.5">
                      <button
                        onClick={() => {
                          localStorage.setItem('kk_default_colleague_perspective', 'all');
                          window.dispatchEvent(new Event('storage_perspective_changed'));
                          setPerspectiveSetting('all');
                        }}
                        className={`py-2 px-3 rounded-xl text-xs font-bold uppercase tracking-wider text-center active:scale-95 transition-all border cursor-pointer ${
                          perspectiveSetting === 'all'
                            ? 'bg-blue-600 border-blue-600 text-white shadow-xs'
                            : 'bg-slate-50 border-slate-200 dark:bg-zinc-950 dark:border-zinc-800 text-slate-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-850'
                        }`}
                      >
                        Gesamtes Team
                      </button>
                      <button
                        onClick={() => {
                          localStorage.setItem('kk_default_colleague_perspective', 'own');
                          window.dispatchEvent(new Event('storage_perspective_changed'));
                          setPerspectiveSetting('own');
                        }}
                        className={`py-2 px-3 rounded-xl text-xs font-bold uppercase tracking-wider text-center active:scale-95 transition-all border cursor-pointer ${
                          perspectiveSetting === 'own'
                            ? 'bg-blue-600 border-blue-600 text-white shadow-xs'
                            : 'bg-slate-50 border-slate-200 dark:bg-zinc-950 dark:border-zinc-800 text-slate-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-850'
                        }`}
                      >
                        Eigener Filter
                      </button>
                    </div>
                    <p className="text-[9px] text-slate-400 dark:text-zinc-550 pl-1 leading-relaxed">
                      Als Administrator stellst du hier ein, ob standardmäßig das gesamte Küchen-Kopf-Team oder dein eigenes Dashboard nach dem Login fokussiert ist.
                    </p>
                  </div>
                )}
              </div>

              {/* Right Column Settings (Theme Selector) */}
              <div className="space-y-4">
                <div className="space-y-2 bg-slate-50/20 dark:bg-zinc-950/20 p-4 rounded-2xl border border-slate-200/50 dark:border-zinc-850">
                  <div className="flex items-center gap-1.5 pl-1 mb-2">
                    <Palette className="w-3.5 h-3.5 text-slate-400" />
                    <label className="text-[10px] font-black text-slate-450 dark:text-zinc-400 uppercase tracking-widest block">
                      Design & Farbschema wählen
                    </label>
                  </div>
                  
                  <div className="grid grid-cols-1 gap-2 pt-1 select-none">
                    {themes.map((t) => {
                      const isSelected = theme === t.id;
                      return (
                        <button
                          key={t.id}
                          onClick={() => onChangeTheme(t.id)}
                          className={`flex items-center justify-between p-3 rounded-2xl border active:scale-98 transition-all cursor-pointer ${
                            isSelected 
                              ? 'border-blue-500 bg-blue-500/10 dark:border-blue-400 dark:bg-blue-950/30 text-blue-700 dark:text-blue-400 font-black shadow-xs' 
                              : 'border-slate-250/50 bg-white/40 dark:border-zinc-805 dark:bg-zinc-900/45 hover:bg-slate-100/70 dark:hover:bg-zinc-850'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div 
                              className="theme-preview-box w-8 h-8 rounded-xl flex items-center justify-center shadow-inner overflow-hidden border border-slate-200/30 dark:border-zinc-800"
                              style={{ 
                                '--preview-bg': t.colors.bg, 
                                '--preview-border': t.colors.border 
                              } as React.CSSProperties}
                            >
                              <div 
                                className="theme-preview-dot w-3.5 h-3.5 rounded-full" 
                                style={{ 
                                  '--preview-accent': t.colors.accent 
                                } as React.CSSProperties}
                              />
                            </div>
                            <span className="text-xs font-black text-slate-700 dark:text-zinc-255 uppercase tracking-wider">
                              {t.name}
                            </span>
                          </div>

                          {isSelected && (
                            <div className="w-5 h-5 rounded-full bg-blue-500 text-white flex items-center justify-center">
                              <Check className="w-3 h-3 stroke-[3]" />
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

            </div>
          )}

        </div> {/* End of content scrolling container */}

        {/* Modal Footer containing the centrally wanted dynamic LOGOUT action */}
        <div className="p-5 border-t border-slate-205/60 dark:border-zinc-800/80 bg-slate-50 dark:bg-zinc-950 flex flex-col items-stretch">
          <button
            onClick={() => {
              onLogout();
              onClose();
            }}
            className="w-full py-3 px-4 bg-red-600 hover:bg-red-700 text-white rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 shadow-md shadow-red-600/15 active:scale-95 transition-all text-center cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            Abmelden (Logout)
          </button>
        </div>

      </div>
    </div>
  );
};
