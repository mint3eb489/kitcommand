/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { Commission } from '../types.ts';
import { DonutChart } from './DonutChart.tsx';
import { motion, AnimatePresence } from 'motion/react';
import { Target, TrendingUp, Sparkles, Trophy, Flame, Calendar } from 'lucide-react';

interface StatsTabProps {
  commissions: Commission[];
  annualTarget: number;
  yearlyTargets?: Record<string, number>;
  availableYears: number[];
}

export const StatsTab: React.FC<StatsTabProps> = ({
  commissions,
  annualTarget,
  yearlyTargets,
  availableYears,
}) => {
  const [filterYear, setFilterYear] = useState<string>(new Date().getFullYear().toString());
  const [filterMonth, setFilterMonth] = useState<string>('all');
  const [showRemaining, setShowRemaining] = useState<boolean>(false);

  // Get target value for the currently filtered year, falling back to legacy/global target
  const currentYearTarget = useMemo(() => {
    if (filterYear === 'all') {
      // Sum or fallback
      return annualTarget || 1500000;
    }
    return yearlyTargets?.[filterYear] ?? annualTarget ?? 1500000;
  }, [filterYear, yearlyTargets, annualTarget]);

  // Saisonalitäts-Daten berechnen (unabhängig von filterMonth, aber abhängig von filterYear)
  const monthlySeasonality = useMemo(() => {
    const dataset = Array.from({ length: 12 }, (_, i) => ({
      monthIndex: i + 1,
      name: ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'][i],
      fullName: ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'][i],
      revenue: 0,
      soldCount: 0,
      lostCount: 0,
      openCount: 0,
    }));

    commissions.forEach((c) => {
      const dateStr = c.resolvedAt || c.createdAt;
      if (!dateStr) return;
      const date = new Date(dateStr);
      const yearStr = date.getFullYear().toString();
      
      if (filterYear !== 'all' && yearStr !== filterYear) return;

      const monthIndex = date.getMonth(); // 0 to 11
      if (monthIndex >= 0 && monthIndex < 12) {
        const item = dataset[monthIndex];
        if (c.status === 'sold') {
          item.revenue += c.price || 0;
          item.soldCount += 1;
        } else if (c.status === 'lost') {
          item.lostCount += 1;
        } else if (c.status === 'open') {
          item.openCount += 1;
        }
      }
    });

    const maxRevenue = Math.max(...dataset.map((d) => d.revenue), 10000);

    return {
      dataset,
      maxRevenue,
    };
  }, [commissions, filterYear]);

  // Calculations for Monats-Filter and Jahres-Ziel (ignoring Monats-Filter)
  const stats = useMemo(() => {
    let annualRevenue = 0;

    // Open pipeline structure (Always calculated across all open items, ignoring filters)
    let openNeubau = 0;
    let openBestand = 0;
    let openKlein = 0;

    commissions.forEach((c) => {
      const targetDateStr = c.resolvedAt || c.createdAt;
      
      // Calculate annual revenue for target tracker (ignores monthly filters, only checks year)
      if (c.status === 'sold' && targetDateStr) {
        const date = new Date(targetDateStr);
        if (filterYear === 'all' || date.getFullYear().toString() === filterYear) {
          annualRevenue += c.price || 0;
        }
      }

      // Track open pipeline structures
      if (c.status === 'open') {
        const type = c.bauart || (c.isNeubau ? 'neubau' : 'bestand');
        if (type === 'neubau') openNeubau++;
        else if (type === 'kleinauftrag') openKlein++;
        else openBestand++;
      }
    });

    // Filtered data for general KPIs (respects both Year and Month filters)
    const filteredData = commissions.filter((c) => {
      if (c.status === 'open') return false;
      const targetDateStr = c.resolvedAt || c.createdAt;
      if (!targetDateStr) return false;
      const date = new Date(targetDateStr);

      if (filterYear !== 'all' && date.getFullYear().toString() !== filterYear) return false;
      if (filterMonth !== 'all' && (date.getMonth() + 1).toString() !== filterMonth) return false;

      return true;
    });

    let revenue = 0;
    let qualifiedSoldCount = 0;
    let qualifiedLostCount = 0;
    let qualifiedRevenue = 0;

    // Sold structure counts
    let soldNeubau = 0;
    let soldBestand = 0;
    let soldKlein = 0;

    filteredData.forEach((c) => {
      const type = c.bauart || (c.isNeubau ? 'neubau' : 'bestand');
      const isKlein = type === 'kleinauftrag';
      const price = c.price || 0;

      if (c.status === 'sold') {
        revenue += price;
        
        // Sold structures
        if (type === 'neubau') soldNeubau++;
        else if (type === 'kleinauftrag') soldKlein++;
        else soldBestand++;

        // Non-kleinauftrag counts as qualified for Win rates & order values
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
    const winRate = totalQualified > 0 ? (qualifiedSoldCount / totalQualified) * 100 : 0;
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
      winRate,
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
      },
    };
  }, [commissions, filterYear, filterMonth]);

  const formatter = new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  });

  const rawTargetPercent = (stats.annualRevenue / (currentYearTarget || 1500000)) * 100;
  const targetPercent = Math.min(rawTargetPercent, 100);
  const remainingValue = Math.max(0, currentYearTarget - stats.annualRevenue);

  return (
    <div id="tab-stats" className="flex flex-col min-h-[500px]">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4 border-b border-slate-200/60 dark:border-zinc-800 pb-4">
        <h2 className="text-[10px] font-black uppercase tracking-widest text-slate-400">
          Umsatz & Abschluss
        </h2>

        <div className="flex gap-2 w-full sm:w-auto">
          <select
            id="filter-year"
            value={filterYear}
            onChange={(e) => setFilterYear(e.target.value)}
            className="input-field text-xs py-2 px-3 !w-auto bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-slate-800 dark:text-zinc-100 shadow-sm"
          >
            <option value="all">Alle Jahre</option>
            {availableYears.map((y) => (
              <option key={y} value={y.toString()}>
                {y}
              </option>
            ))}
          </select>

          <select
            id="filter-month"
            value={filterMonth}
            onChange={(e) => setFilterMonth(e.target.value)}
            className="input-field text-xs py-2 px-3 !w-auto bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-slate-800 dark:text-zinc-100 shadow-sm"
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

      {/* GAMIFICATION: JAHRESZIEL REIMAGINED WITH A HIGH-FIDELITY INTERACTIVE PROGRESS CIRCLE */}
      <div 
        id="jahresziel-container"
        className="mb-8 bg-zinc-50 dark:bg-zinc-900/40 rounded-3xl p-6 border border-slate-200/80 dark:border-zinc-800/80 relative overflow-hidden isolate shadow-xs hover:border-slate-300 dark:hover:border-zinc-700 transition-all duration-300 group"
      >
        {/* Subtle background gradient glow effect */}
        <div className="absolute -right-20 -top-20 w-64 h-64 bg-blue-500/10 dark:bg-blue-400/10 rounded-full blur-3xl pointer-events-none group-hover:bg-blue-500/20 dark:group-hover:bg-blue-400/20 transition-colors duration-500" />
        <div className="absolute -left-20 -bottom-20 w-64 h-64 bg-amber-500/10 dark:bg-amber-400/10 rounded-full blur-3xl pointer-events-none group-hover:bg-amber-500/20 dark:group-hover:bg-amber-400/20 transition-colors duration-500" />

        <div className="flex flex-col md:flex-row items-center justify-between gap-6 relative z-10">
          
          {/* Left Block: Content & Target Info */}
          <div className="flex-1 w-full space-y-4">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-blue-500/10 dark:bg-blue-400/10 text-blue-600 dark:text-blue-400">
                <Target className="w-5 h-5 stroke-[2]" />
              </div>
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-zinc-500">
                  Umsatzziel Tracker
                </span>
                <span className="block text-xs font-semibold text-slate-600 dark:text-zinc-400">
                  {filterYear === 'all' ? 'Gesamtübersicht' : `Zieljahr ${filterYear}`}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-1">
              <div className="p-3.5 bg-white dark:bg-zinc-900 border border-slate-100 dark:border-zinc-800 rounded-2xl shadow-2xs">
                <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 dark:text-zinc-500 mb-0.5">
                  Dein Umsatzziel
                </p>
                <p className="text-lg md:text-xl font-black text-slate-800 dark:text-slate-100 tracking-tight font-sans select-none break-all">
                  {formatter.format(currentYearTarget)}
                </p>
              </div>

              <div className="p-3.5 bg-white dark:bg-zinc-900 border border-slate-100 dark:border-zinc-800 rounded-2xl shadow-2xs">
                <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 dark:text-zinc-500 mb-0.5">
                  Aktueller Umsatz
                </p>
                <p className="text-lg md:text-xl font-black text-blue-600 dark:text-blue-400 tracking-tight font-sans select-none break-all">
                  {formatter.format(stats.annualRevenue)}
                </p>
              </div>
            </div>

            {/* Motivational message badge based on percentage */}
            <div className="flex items-center gap-2 text-xs font-medium text-slate-600 dark:text-zinc-300 py-1 px-1 bg-slate-100/50 dark:bg-zinc-900/60 rounded-xl border border-slate-150 dark:border-zinc-850 pr-3.5 select-none md:max-w-max">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-white dark:bg-zinc-800 shadow-3xs text-sm border border-slate-200/50 dark:border-zinc-700/50">
                {rawTargetPercent >= 100 ? '🏆' : rawTargetPercent >= 75 ? '🎯' : rawTargetPercent >= 40 ? '⚡' : rawTargetPercent >= 10 ? '📈' : '🚀'}
              </span>
              <span className="truncate">
                {rawTargetPercent >= 100 
                  ? 'Hervorragende Leistung! Ziel übertroffen! 🎉' 
                  : rawTargetPercent >= 75 
                    ? 'Der Endspurt läuft. Das Ziel ist greifbar nah!' 
                    : rawTargetPercent >= 40 
                      ? 'Fast die Hälfte geschafft. Hervorragender Weg!' 
                      : rawTargetPercent >= 10 
                        ? 'Konstantes Wachstum führt zum Erfolg. Weiter so!' 
                        : 'Aller Anfang ist gemacht! Packen wir\'s an!'}
              </span>
            </div>
          </div>

          {/* Right Block: Circular Interactive Progress Ring */}
          <div className="flex flex-col items-center justify-center shrink-0 w-full md:w-auto">
            <div 
              id="progress-circle-interactive"
              onClick={() => setShowRemaining(prev => !prev)}
              className="relative w-36 h-36 flex items-center justify-center shrink-0 cursor-pointer select-none group/circle"
              title="Klicken, um zwischen Erreicht und Verbleibend zu wechseln"
            >
              {/* Pulsing light rings around the circle depending on achievement */}
              {rawTargetPercent >= 100 && (
                <div className="absolute inset-0 bg-emerald-500/10 dark:bg-emerald-400/10 rounded-full animate-ping pointer-events-none duration-1000 opacity-30" />
              )}
              {/* Outer soft glow of the current hover highlight */}
              <div className="absolute inset-0 bg-blue-500/10 dark:bg-blue-400/10 rounded-full blur-xl opacity-0 group-hover/circle:opacity-100 transition-opacity duration-300" />
              
              <svg className="w-full h-full transform -rotate-90 p-1 filter drop-shadow-xs">
                {/* Background Ring Track */}
                <circle
                  cx="72"
                  cy="72"
                  r="58"
                  className="stroke-slate-200 dark:stroke-zinc-800/95 fill-transparent"
                  strokeWidth="8"
                />
                
                {/* Foreground Active Ring Path with transition */}
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
                  transition={{ duration: 1.5, ease: 'easeOut' }}
                />
              </svg>

              {/* Central Text Panel inside SVG Circle */}
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
                    <span className="text-2xl font-black text-slate-800 dark:text-zinc-150 tracking-tight leading-none">
                      {showRemaining 
                        ? `${Math.max(0, 100 - rawTargetPercent).toFixed(1).replace('.', ',')}%`
                        : `${rawTargetPercent.toFixed(1).replace('.', ',')}%`}
                    </span>
                    <span className="text-[9px] font-extrabold text-slate-400 dark:text-zinc-500 uppercase tracking-widest mt-1">
                      {showRemaining ? 'Noch' : 'Erreicht'}
                    </span>
                  </motion.div>
                </AnimatePresence>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        {/* Card 1: Umsatz (Verkauft) */}
        <div className="col-span-2 bg-zinc-50 dark:bg-zinc-900/40 rounded-3xl p-6 border border-slate-200/80 dark:border-zinc-800/80 hover:border-blue-500/30 dark:hover:border-blue-500/30 transition-all duration-300 relative overflow-hidden isolate group text-center shadow-xs">
          <div className="absolute -right-20 -top-20 w-64 h-64 bg-blue-500/15 rounded-full blur-3xl pointer-events-none group-hover:bg-blue-500/20 dark:group-hover:bg-blue-500/20 transition-colors duration-500" />
          <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest mb-2 relative z-10">
            Umsatz (Verkauft)
          </p>
          <p id="stat-revenue" className="text-3xl md:text-4xl font-black text-blue-500 tracking-tighter select-none relative z-10 leading-none py-1">
            {formatter.format(stats.revenue)}
          </p>
        </div>

        {/* Card 2: Abschlussquote */}
        <div className="bg-zinc-50 dark:bg-zinc-900/40 rounded-3xl p-5 border border-slate-200/80 dark:border-zinc-800/80 hover:border-amber-500/30 dark:hover:border-amber-500/30 transition-all duration-300 relative overflow-hidden isolate group text-center shadow-xs">
          <div className="absolute -right-16 -top-16 w-48 h-48 bg-amber-500/15 rounded-full blur-3xl pointer-events-none group-hover:bg-amber-500/20 dark:group-hover:bg-amber-500/20 transition-colors duration-500" />
          <p className="text-[9px] font-black text-amber-500 dark:text-amber-450 uppercase tracking-widest mb-1 relative z-10">
            Abschlussquote
          </p>
          <p id="stat-winrate" className="text-2xl font-black text-amber-500 dark:text-amber-450 tracking-tighter select-none relative z-10">
            {stats.winRate.toFixed(1).replace('.', ',')} %
          </p>
        </div>

        {/* Card 3: Verkauft */}
        <div className="bg-zinc-50 dark:bg-zinc-900/40 rounded-3xl p-5 border border-slate-200/80 dark:border-zinc-800/80 hover:border-emerald-500/30 dark:hover:border-emerald-500/30 transition-all duration-300 relative overflow-hidden isolate group text-center shadow-xs">
          <div className="absolute -right-16 -top-16 w-48 h-48 bg-emerald-500/15 rounded-full blur-3xl pointer-events-none group-hover:bg-emerald-500/20 dark:group-hover:bg-emerald-500/20 transition-colors duration-500" />
          <p className="text-[9px] font-black text-emerald-500 uppercase tracking-widest mb-1 relative z-10">
            Verkauft
          </p>
          <p id="stat-sold-count" className="text-2xl font-black text-emerald-500 tracking-tighter select-none relative z-10">
            {stats.qualifiedSoldCount}
          </p>
        </div>

        {/* Card 4: Ø Auftrags-Wert */}
        <div className="bg-zinc-50 dark:bg-zinc-900/40 rounded-3xl p-5 border border-slate-200/80 dark:border-zinc-800/80 hover:border-purple-500/30 dark:hover:border-purple-500/30 transition-all duration-300 relative overflow-hidden isolate group text-center shadow-xs">
          <div className="absolute -right-16 -top-16 w-48 h-48 bg-purple-500/15 rounded-full blur-3xl pointer-events-none group-hover:bg-purple-500/20 dark:group-hover:bg-purple-500/20 transition-colors duration-500" />
          <p className="text-[9px] font-black text-purple-500 uppercase tracking-widest mb-1 relative z-10">
            Ø Auftrags-Wert
          </p>
          <p id="stat-avg-value" className="text-2xl font-black text-purple-500 tracking-tighter select-none relative z-10">
            {formatter.format(stats.avgValue)}
          </p>
        </div>

        {/* Card 5: Nicht Verkauft */}
        <div className="bg-zinc-50 dark:bg-zinc-900/40 rounded-3xl p-5 border border-slate-200/80 dark:border-zinc-800/80 hover:border-red-500/30 dark:hover:border-red-500/30 transition-all duration-300 relative overflow-hidden isolate group text-center shadow-xs">
          <div className="absolute -right-16 -top-16 w-48 h-48 bg-red-500/15 rounded-full blur-3xl pointer-events-none group-hover:bg-red-500/20 dark:group-hover:bg-red-500/20 transition-colors duration-500" />
          <p className="text-[9px] font-black text-red-500 uppercase tracking-widest mb-1 relative z-10">
            Nicht Verkauft
          </p>
          <p id="stat-lost-count" className="text-2xl font-black text-red-500 tracking-tighter select-none relative z-10">
            {stats.qualifiedLostCount}
          </p>
        </div>
      </div>

      {/* MONATS- & SAISONALITÄTS-TREND */}
      <div
        id="seasonality-trend-container"
        className="mb-8 bg-zinc-50 dark:bg-zinc-900/40 rounded-3xl p-6 border border-slate-200/80 dark:border-zinc-800/80 relative overflow-hidden isolate shadow-xs hover:border-slate-300 dark:hover:border-zinc-700 transition-all duration-300 group/trend"
      >
        {/* Soft background ambient glows */}
        <div className="absolute -right-20 -bottom-20 w-64 h-64 bg-indigo-500/5 dark:bg-indigo-400/5 rounded-full blur-3xl pointer-events-none group-hover/trend:bg-indigo-500/10 dark:group-hover/trend:bg-indigo-400/10 transition-colors duration-500" />
        <div className="absolute -left-20 -top-20 w-64 h-64 bg-blue-500/5 dark:bg-blue-400/5 rounded-full blur-3xl pointer-events-none group-hover/trend:bg-blue-500/10 dark:group-hover/trend:bg-blue-400/10 transition-colors duration-500" />

        <div className="relative z-10 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-indigo-500/10 dark:bg-indigo-400/10 text-indigo-600 dark:text-indigo-400">
                <Calendar className="w-5 h-5 stroke-[2]" />
              </div>
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-zinc-500">
                  Monats- & Saisonalitäts-Trend
                </span>
                <span className="block text-xs font-semibold text-slate-600 dark:text-zinc-400">
                  Verteilung über die Monate & Jahre
                </span>
              </div>
            </div>
            
            {/* Quick Helper Badge */}
            <div className="text-[10px] text-slate-400 dark:text-zinc-550 font-semibold bg-white dark:bg-zinc-900 p-1.5 px-3 rounded-xl border border-slate-200/60 dark:border-zinc-800/80 select-none shadow-3xs">
              💡 Tipp: Tippe einen Monat an, um zu filtern
            </div>
          </div>

          {/* Interactive Chart Area */}
          <div className="pt-2 pb-1 overflow-x-auto scrollbar-none">
            <div className="h-44 flex items-end justify-between gap-1 sm:gap-2.5 md:gap-4 select-none min-w-[280px]">
              {monthlySeasonality.dataset.map((item) => {
                const isSelected = filterMonth === item.monthIndex.toString();
                const isAnySelected = filterMonth !== 'all';
                const heightPercent = item.revenue > 0 ? (item.revenue / monthlySeasonality.maxRevenue) * 100 : 0;
                
                // Active bar has vibrant color; other bars have muted color if another bar is selected
                const barColorClass = isSelected
                  ? 'bg-gradient-to-t from-blue-600 to-indigo-550 shadow-[0_4px_14px_rgba(59,130,246,0.35)] dark:shadow-[0_4px_14px_rgba(59,130,246,0.2)]'
                  : isAnySelected
                    ? 'bg-slate-200/50 dark:bg-zinc-800/30 opacity-30 hover:opacity-60'
                    : 'bg-gradient-to-t from-blue-400/80 to-indigo-400/80 dark:from-blue-500/60 dark:to-indigo-500/60 hover:from-blue-500 hover:to-indigo-500 hover:shadow-[0_4px_12px_rgba(59,130,246,0.15)]';

                return (
                  <div
                    key={item.monthIndex}
                    onClick={() => {
                      if (isSelected) {
                        setFilterMonth('all');
                      } else {
                        setFilterMonth(item.monthIndex.toString());
                      }
                    }}
                    className={`flex-1 flex flex-col items-center h-full group/bar cursor-pointer transition-all duration-300 ${isSelected ? 'scale-[1.03]' : 'hover:-translate-y-1'}`}
                  >
                    {/* Tooltip on bar hover (Standard and touch feedback) */}
                    <div className="absolute bottom-[105%] opacity-0 scale-95 group-hover/bar:opacity-100 group-hover/bar:scale-100 transition-all duration-200 pointer-events-none z-30 bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 p-3 rounded-xl shadow-xl flex flex-col gap-1 items-start text-left min-w-[140px]">
                      <p className="text-xs font-black text-slate-800 dark:text-zinc-100 leading-none mb-1">
                        {item.fullName} {filterYear !== 'all' ? filterYear : ''}
                      </p>
                      <div className="flex items-center justify-between w-full gap-2 text-[10px]">
                        <span className="text-slate-400">Umsatz:</span>
                        <span className="font-bold text-slate-800 dark:text-zinc-250">{formatter.format(item.revenue)}</span>
                      </div>
                      <div className="flex items-center justify-between w-full gap-2 text-[10px] border-t border-slate-100 dark:border-zinc-900 pt-1 mt-1">
                        <span className="text-slate-400">Geschlossen (Soll):</span>
                        <span className="font-mono font-bold text-emerald-500">{item.soldCount}x</span>
                      </div>
                      {item.lostCount > 0 && (
                        <div className="flex items-center justify-between w-full gap-2 text-[10px]">
                          <span className="text-slate-400">Nicht Verkauft:</span>
                          <span className="font-mono font-bold text-red-500">{item.lostCount}x</span>
                        </div>
                      )}
                      {item.openCount > 0 && (
                        <div className="flex items-center justify-between w-full gap-2 text-[10px]">
                          <span className="text-slate-400">Offen Pipeline:</span>
                          <span className="font-mono font-bold text-blue-500">{item.openCount}x</span>
                        </div>
                      )}
                    </div>

                    {/* Bar visual track */}
                    <div className="w-full bg-slate-100/50 dark:bg-zinc-950 rounded-xl relative flex-1 flex items-end p-0.5 border border-slate-200/30 dark:border-zinc-900/40">
                      {/* Interactive internal bar */}
                      <motion.div
                        className={`w-full rounded-lg transition-all duration-300 ${barColorClass}`}
                        style={{ height: `${heightPercent || 2}%`, minHeight: '6px' }}
                        initial={{ scaleY: 0 }}
                        animate={{ scaleY: 1 }}
                        transition={{ duration: 0.8, ease: 'easeOut' }}
                      />
                    </div>

                    {/* Month Label */}
                    <span className={`text-[9px] font-black uppercase tracking-wider mt-2 transition-colors ${isSelected ? 'text-blue-600 dark:text-blue-400 font-extrabold' : 'text-slate-400 dark:text-zinc-500'}`}>
                      {item.name}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Saisonalität Summary / Active Focus Info */}
          <div className="bg-white dark:bg-zinc-900/95 border border-slate-200/60 dark:border-zinc-800/80 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-3xs">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-indigo-500/10 dark:bg-indigo-400/10 flex items-center justify-center text-indigo-500">
                <TrendingUp className="w-4 h-4" />
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-1">
                  {filterMonth === 'all' ? 'Aktive Auswertung' : `Fokus Monat: ${['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'][parseInt(filterMonth) - 1]}`}
                </p>
                <p className="text-xs font-bold text-slate-600 dark:text-zinc-300">
                  {filterMonth === 'all' 
                    ? 'Gesamtsaisonales Bild des selektierten Jahres.' 
                    : `Gefiltert auf ${['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'][parseInt(filterMonth) - 1]} ${filterYear !== 'all' ? filterYear : ''}.`}
                </p>
              </div>
            </div>

            <div className="flex gap-4 items-center justify-end shrink-0">
              <div className="text-left sm:text-right bg-slate-50 dark:bg-zinc-950/40 p-2 pl-3.5 pr-3.5 rounded-xl border border-slate-200/50 dark:border-zinc-800/60 shadow-3xs">
                <span className="text-[9px] font-bold text-slate-450 dark:text-zinc-500 uppercase tracking-widest block leading-none mb-1.5">
                  {filterMonth === 'all' ? 'Gesamtumsatz' : 'Monatsumsatz'}
                </span>
                <span className="font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-350 text-base sm:text-lg md:text-xl block leading-none">
                  {formatter.format(
                    filterMonth === 'all' 
                      ? stats.revenue 
                      : (monthlySeasonality.dataset[parseInt(filterMonth) - 1]?.revenue || 0)
                  )}
                </span>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* GAMIFICATION: SOLD ORDER STRUCTURE */}
      <div 
        id="order-structure-sold-container"
        className="mb-6 bg-zinc-50 dark:bg-zinc-900/40 rounded-3xl p-6 border border-slate-200/80 dark:border-zinc-800/80 flex flex-col sm:flex-row items-center gap-8 justify-between relative overflow-hidden isolate shadow-xs hover:border-slate-300 dark:hover:border-zinc-700 transition-all duration-300 group"
      >
        <div className="absolute -right-20 -top-20 w-64 h-64 bg-emerald-500/8 dark:bg-emerald-400/8 rounded-full blur-3xl pointer-events-none group-hover:bg-emerald-500/15 dark:group-hover:bg-emerald-400/15 transition-colors duration-500" />
        
        <div className="w-full sm:w-1/2 flex flex-col relative z-10">
          <h3 className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-zinc-500 mb-4 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
            Auftrags-Struktur (Verkauft)
          </h3>
          <div className="space-y-3">
            {/* Neubau */}
            <div className="flex items-center justify-between p-2 rounded-xl bg-white dark:bg-zinc-900 border border-slate-100 dark:border-zinc-800/80 shadow-3xs hover:bg-slate-50 dark:hover:bg-zinc-850 transition-colors duration-200">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-blue-500 shadow-xs"></div>
                <span className="text-xs font-bold text-slate-700 dark:text-zinc-300">Neubau</span>
              </div>
              <div className="flex items-center gap-3">
                <span id="legend-neubau-count" className="text-xs font-medium text-slate-400">
                  {stats.donutSold.neubau}x
                </span>
                <span id="legend-neubau-pct" className="text-xs font-bold text-slate-800 dark:text-slate-150 w-9 text-right tabular-nums">
                  {Math.round(stats.donutSold.pctNeubau)}%
                </span>
              </div>
            </div>
            {/* Bestand */}
            <div className="flex items-center justify-between p-2 rounded-xl bg-white dark:bg-zinc-900 border border-slate-100 dark:border-zinc-800/80 shadow-3xs hover:bg-slate-50 dark:hover:bg-zinc-850 transition-colors duration-200">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-slate-400 shadow-xs"></div>
                <span className="text-xs font-bold text-slate-700 dark:text-zinc-300">Bestand</span>
              </div>
              <div className="flex items-center gap-3">
                <span id="legend-bestand-count" className="text-xs font-medium text-slate-400">
                  {stats.donutSold.bestand}x
                </span>
                <span id="legend-bestand-pct" className="text-xs font-bold text-slate-800 dark:text-slate-150 w-9 text-right tabular-nums">
                  {Math.round(stats.donutSold.pctBestand)}%
                </span>
              </div>
            </div>
            {/* Kleinauftrag */}
            <div className="flex items-center justify-between p-2 rounded-xl bg-white dark:bg-zinc-900 border border-slate-100 dark:border-zinc-800/80 shadow-3xs hover:bg-slate-50 dark:hover:bg-zinc-850 transition-colors duration-200">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-purple-500 shadow-xs"></div>
                <span className="text-xs font-bold text-slate-700 dark:text-zinc-300">Kleinauftrag</span>
              </div>
              <div className="flex items-center gap-3">
                <span id="legend-klein-count" className="text-xs font-medium text-slate-400">
                  {stats.donutSold.klein}x
                </span>
                <span id="legend-klein-pct" className="text-xs font-bold text-slate-800 dark:text-slate-150 w-9 text-right tabular-nums">
                  {Math.round(stats.donutSold.pctKlein)}%
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="relative flex justify-center w-full sm:w-1/2 relative z-10">
          <DonutChart
            total={stats.donutSold.total}
            segments={[
              { value: stats.donutSold.pctNeubau, color: '#3b82f6' },
              { value: stats.donutSold.pctBestand, color: '#94a3b8' },
              { value: stats.donutSold.pctKlein, color: '#a855f7' },
            ]}
          />
        </div>
      </div>

      {/* PIPELINE: OPEN ORDER STRUCTURE */}
      <div 
        id="order-structure-open-container"
        className="mb-8 bg-zinc-50 dark:bg-zinc-900/40 rounded-3xl p-6 border border-slate-200/80 dark:border-zinc-800/80 flex flex-col sm:flex-row items-center gap-8 justify-between relative overflow-hidden isolate shadow-xs hover:border-slate-300 dark:hover:border-zinc-700 transition-all duration-300 group"
      >
        <div className="absolute -right-20 -top-20 w-64 h-64 bg-blue-500/8 dark:bg-blue-400/8 rounded-full blur-3xl pointer-events-none group-hover:bg-blue-500/15 dark:group-hover:bg-blue-400/15 transition-colors duration-500" />
        
        <div className="w-full sm:w-1/2 flex flex-col relative z-10">
          <h3 className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-zinc-500 mb-4 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
            Auftrags-Struktur (Offen)
          </h3>
          <div className="space-y-3">
            {/* Neubau */}
            <div className="flex items-center justify-between p-2 rounded-xl bg-white dark:bg-zinc-900 border border-slate-100 dark:border-zinc-800/80 shadow-3xs hover:bg-slate-50 dark:hover:bg-zinc-850 transition-colors duration-200">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-blue-500 shadow-xs"></div>
                <span className="text-xs font-bold text-slate-700 dark:text-zinc-300">Neubau</span>
              </div>
              <div className="flex items-center gap-3">
                <span id="legend-open-neubau-count" className="text-xs font-medium text-slate-400">
                  {stats.donutOpen.neubau}x
                </span>
                <span id="legend-open-neubau-pct" className="text-xs font-bold text-slate-800 dark:text-slate-150 w-9 text-right tabular-nums">
                  {Math.round(stats.donutOpen.pctNeubau)}%
                </span>
              </div>
            </div>
            {/* Bestand */}
            <div className="flex items-center justify-between p-2 rounded-xl bg-white dark:bg-zinc-900 border border-slate-100 dark:border-zinc-800/80 shadow-3xs hover:bg-slate-50 dark:hover:bg-zinc-850 transition-colors duration-200">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-slate-400 shadow-xs"></div>
                <span className="text-xs font-bold text-slate-700 dark:text-zinc-300">Bestand</span>
              </div>
              <div className="flex items-center gap-3">
                <span id="legend-open-bestand-count" className="text-xs font-medium text-slate-400">
                  {stats.donutOpen.bestand}x
                </span>
                <span id="legend-open-bestand-pct" className="text-xs font-bold text-slate-800 dark:text-slate-150 w-9 text-right tabular-nums">
                  {Math.round(stats.donutOpen.pctBestand)}%
                </span>
              </div>
            </div>
            {/* Kleinauftrag */}
            <div className="flex items-center justify-between p-2 rounded-xl bg-white dark:bg-zinc-900 border border-slate-100 dark:border-zinc-800/80 shadow-3xs hover:bg-slate-50 dark:hover:bg-zinc-850 transition-colors duration-200">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-purple-500 shadow-xs"></div>
                <span className="text-xs font-bold text-slate-700 dark:text-zinc-300">Kleinauftrag</span>
              </div>
              <div className="flex items-center gap-3">
                <span id="legend-open-klein-count" className="text-xs font-medium text-slate-400">
                  {stats.donutOpen.klein}x
                </span>
                <span id="legend-open-klein-pct" className="text-xs font-bold text-slate-800 dark:text-slate-150 w-9 text-right tabular-nums">
                  {Math.round(stats.donutOpen.pctKlein)}%
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="relative flex justify-center w-full sm:w-1/2 relative z-10">
          <DonutChart
            total={stats.donutOpen.total}
            segments={[
              { value: stats.donutOpen.pctNeubau, color: '#3b82f6' },
              { value: stats.donutOpen.pctBestand, color: '#94a3b8' },
              { value: stats.donutOpen.pctKlein, color: '#a855f7' },
            ]}
          />
        </div>
      </div>

      <p className="text-xs text-slate-400 text-center italic mt-auto pt-4 border-t border-slate-200 dark:border-zinc-800">
        Die Abschlussquote berechnet sich aus allen endgültig abgeschlossenen Angeboten (Verkauft vs. Nicht Verkauft) im gewählten Zeitraum.
        <br />
        <br />
        <strong>Kleinaufträge</strong> sind von Quote, Stückzahl und Durchschnittswert ausgeschlossen, zählen aber regulär zum Gesamtumsatz.
      </p>
    </div>
  );
};
