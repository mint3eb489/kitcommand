/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { 
  User, Target, 
  Trophy, Sparkles, Star, ShieldAlert,
  Calendar, TrendingUp, Award, BarChart2, Briefcase, PieChart,
  ArrowLeft, CheckCircle2, ChevronRight
} from 'lucide-react';
import { Commission } from '../types.ts';
import { User as FirebaseUser } from 'firebase/auth';
import { DonutChart } from './DonutChart.tsx';
import { motion, AnimatePresence } from 'motion/react';

export interface PersonalStatsTabProps {
  currentUser: FirebaseUser | null;
  currentUserDisplayName: string;
  onLogout?: () => void;
  yearlyTargets?: Record<string, number>;
  annualTarget: number;
  theme?: string;
  commissions: Commission[];
  isAdmin: boolean;
  selectedColleague?: string;
  teammates?: { email: string; name: string; isActive: boolean }[];
  targetProfileEmail?: string | null;
  onBackToAdmin?: () => void;
  onClose?: () => void;
}

export const PersonalStatsTab: React.FC<PersonalStatsTabProps> = ({
  currentUser,
  currentUserDisplayName,
  onLogout,
  yearlyTargets,
  annualTarget,
  theme = 'light',
  commissions,
  isAdmin,
  teammates,
  targetProfileEmail,
  onBackToAdmin,
  onClose,
}) => {
  // Filter state for Personal Statistics
  const [statsYear, setStatsYear] = useState<string>(new Date().getFullYear().toString());
  const [statsMonth, setStatsMonth] = useState<string>('all');
  const [showRemaining, setShowRemaining] = useState<boolean>(false);

  const currentYear = new Date().getFullYear().toString();
  const currentYearForTarget = statsYear === 'all' ? currentYear : statsYear;

  const isOwnProfile = useMemo(() => {
    const currentEmail = currentUser?.email?.toLowerCase().trim() || '';
    if (!targetProfileEmail) return true;
    return targetProfileEmail.toLowerCase().trim() === currentEmail;
  }, [currentUser?.email, targetProfileEmail]);

  // Currency Formatter
  const formatter = useMemo(() => new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  }), []);

  // Determine all available years dynamically from commissions data
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

  // Filter ONLY commissions belonging to the active profile
  const personalCommissions = useMemo(() => {
    if (!activeProfileEmail) return [];
    
    const adminEmailsList = ['belmonte@fs-kuechen.de', 'belmonte.enrico@gmail.com', 'demo@fs-kuechen.de'];
    const targetEmailLower = activeProfileEmail.toLowerCase().trim();
    const isTargetAdmin = adminEmailsList.includes(targetEmailLower);

    if (isTargetAdmin) {
      return commissions.filter((c) => {
        const creatorEmail = (c.createdByEmail || '').toLowerCase().trim();
        return !creatorEmail || adminEmailsList.includes(creatorEmail);
      });
    }

    return commissions.filter((c) => (c.createdByEmail || '').toLowerCase().trim() === targetEmailLower);
  }, [commissions, activeProfileEmail]);

  // 1. Target Agreement
  const userTarget = yearlyTargets?.[`${activeProfileEmail}_${currentYearForTarget}`] ?? yearlyTargets?.[currentYearForTarget] ?? annualTarget ?? 1500000;

  // 2. Strongest sales month
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

  // 3. Complete personal statistics calculations
  const personalStats = useMemo(() => {
    let annualRevenue = 0;

    let openNeubau = 0;
    let openBestand = 0;
    let openKlein = 0;

    personalCommissions.forEach((c) => {
      const targetDateStr = c.resolvedAt || c.createdAt;
      
      if (c.status === 'sold' && targetDateStr) {
        const date = new Date(targetDateStr);
        if (statsYear === 'all' || date.getFullYear().toString() === statsYear) {
          annualRevenue += c.price || 0;
        }
      }

      if (c.status === 'open') {
        const type = c.bauart || (c.isNeubau ? 'neubau' : 'bestand');
        if (type === 'neubau') openNeubau++;
        else if (type === 'kleinauftrag') openKlein++;
        else openBestand++;
      }
    });

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
    const winRateCorrected = totalQualified > 0 ? (qualifiedSoldCount / totalQualified) * 100 : 0;
    const avgValue = qualifiedSoldCount > 0 ? qualifiedRevenue / qualifiedSoldCount : 0;

    const totalSoldDonut = soldNeubau + soldBestand + soldKlein;
    const pctNeubau = totalSoldDonut > 0 ? (soldNeubau / totalSoldDonut) * 100 : 0;
    const pctBestand = totalSoldDonut > 0 ? (soldBestand / totalSoldDonut) * 100 : 0;
    const pctKlein = totalSoldDonut > 0 ? (soldKlein / totalSoldDonut) * 100 : 0;

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

  // Theme-aware styles
  const themeStyles = useMemo(() => {
    switch (theme) {
      case 'sage':
        return {
          textColor: 'text-[#2C3531] dark:text-[#EAECE9]',
          primaryText: 'text-[#2C3531] dark:text-[#EAECE9]',
          accentText: 'text-[#2C3531] dark:text-[#EAECE9]',
          accentBg: 'bg-[#2C3531] dark:bg-[#EAECE9]',
          headerIconBg: 'bg-[#8A9A86]/20 text-[#2C3531] dark:text-[#E1E8DE]',
          cardRevenue: {
            bg: 'bg-[#EBF1ED] border-[#8A9A86]/40 dark:bg-[#1E2722]/80 dark:border-[#8A9A86]/20',
            glow: 'bg-[#8A9A86]/10',
            text: 'text-[#2C3531] dark:text-[#D1E8E2]',
            lbl: 'text-[#627067] dark:text-[#8A9A86]',
          },
          cardWinRate: {
            bg: 'bg-[#F2EDDF] border-[#C3B299]/40 dark:bg-[#252219]/80 dark:border-[#C3B299]/20',
            glow: 'bg-[#C3B299]/10',
            text: 'text-[#8C6D2C] dark:text-[#E8CD97]',
            lbl: 'text-[#7C705D] dark:text-[#C3B299]',
          },
          cardAvgValue: {
            bg: 'bg-[#E6F0EE] border-[#7F9E9B]/40 dark:bg-[#1C2625]/80 dark:border-[#7F9E9B]/20',
            glow: 'bg-[#7F9E9B]/10',
            text: 'text-[#2A6559] dark:text-[#9FD4C9]',
            lbl: 'text-[#5E7875] dark:text-[#7F9E9B]',
          },
          cardCountSold: {
            bg: 'bg-[#E6F3EA] border-[#8AC9A4]/40 dark:bg-[#1B2920]/80 dark:border-[#8AC9A4]/20',
            text: 'text-[#2D7A41] dark:text-[#A1DBB2]',
            lbl: 'text-[#2D7A41] dark:text-[#A1DBB2]',
          },
          cardCountLost: {
            bg: 'bg-[#FCEDEB] border-[#EDB2AC]/40 dark:bg-[#2D1D1C]/80 dark:border-[#EDB2AC]/20',
            text: 'text-[#C93324] dark:text-[#F3B0AA]',
            lbl: 'text-[#C93324] dark:text-[#F3B0AA]',
          },
          donutColors: ['#2C3531', '#8A9A86', '#C1CEBE'],
          ringStroke: 'stroke-[#2C3531] dark:stroke-[#8A9A86]',
          ringTrackBg: 'bg-[#F9FBF7] border-[#8A9A86]/30 dark:bg-[#181D1A]/80 dark:border-[#8A9A86]/10',
          ringBadge: 'text-[#2C3531] bg-[#F1F3F0] dark:bg-[#1E2522] border-[#8A9A86]/30',
          ringText: 'text-[#2C3531] dark:text-[#D1E8E2]',
          trophyBanner: 'from-[#2C3531]/5 to-[#8A9A86]/5 border-[#8A9A86]/30 text-[#2C3531] dark:text-[#D1E8E2]',
          trophyValue: 'text-[#2C3531] dark:text-[#D1E8E2]',
        };
      case 'wood':
        return {
          textColor: 'text-[#3E2723] dark:text-[#FBF7F4]',
          primaryText: 'text-[#3E2723] dark:text-[#FBF7F4]',
          accentText: 'text-[#3E2723] dark:text-[#FBF7F4]',
          accentBg: 'bg-[#3E2723] dark:bg-[#FBF7F4]',
          headerIconBg: 'bg-[#795548]/20 text-[#3E2723] dark:text-[#E8DCCF]',
          cardRevenue: {
            bg: 'bg-[#F5EFE6] border-[#A1887F]/40 dark:bg-[#261E1B]/80 dark:border-[#A1887F]/20',
            glow: 'bg-[#795548]/10',
            text: 'text-[#3E2723] dark:text-[#E8DCCF]',
            lbl: 'text-[#6D4C41] dark:text-[#A1887F]',
          },
          cardWinRate: {
            bg: 'bg-[#FFF3E0] border-[#FFB74D]/40 dark:bg-[#2C2114]/80 dark:border-[#FFB74D]/20',
            glow: 'bg-[#FF9800]/10',
            text: 'text-[#E65100] dark:text-[#FFCC80]',
            lbl: 'text-[#BF360C] dark:text-[#FFB74D]',
          },
          cardAvgValue: {
            bg: 'bg-[#EFEBE9] border-[#8D6E63]/40 dark:bg-[#201A18]/80 dark:border-[#8D6E63]/20',
            glow: 'bg-[#6D4C41]/10',
            text: 'text-[#4E342E] dark:text-[#D7CCC8]',
            lbl: 'text-[#5D4037] dark:text-[#8D6E63]',
          },
          cardCountSold: {
            bg: 'bg-[#E8F5E9] border-[#81C784]/40 dark:bg-[#1A261C]/80 dark:border-[#81C784]/20',
            text: 'text-[#1B5E20] dark:text-[#A5D6A7]',
            lbl: 'text-[#2E7D32] dark:text-[#81C784]',
          },
          cardCountLost: {
            bg: 'bg-[#FFEBEE] border-[#E57373]/40 dark:bg-[#2C1919]/80 dark:border-[#E57373]/20',
            text: 'text-[#B71C1C] dark:text-[#EF9A9A]',
            lbl: 'text-[#C62828] dark:text-[#E57373]',
          },
          donutColors: ['#3E2723', '#795548', '#BCAAA4'],
          ringStroke: 'stroke-[#3E2723] dark:stroke-[#A1887F]',
          ringTrackBg: 'bg-[#FBF7F4] border-[#8D6E63]/30 dark:bg-[#1D1715]/80 dark:border-[#8D6E63]/10',
          ringBadge: 'text-[#3E2723] bg-[#EFEBE9] dark:bg-[#271E1C] border-[#8D6E63]/30',
          ringText: 'text-[#3E2723] dark:text-[#E8DCCF]',
          trophyBanner: 'from-[#3E2723]/5 to-[#795548]/5 border-[#795548]/30 text-[#3E2723] dark:text-[#E8DCCF]',
          trophyValue: 'text-[#3E2723] dark:text-[#E8DCCF]',
        };
      case 'ocean':
        return {
          textColor: 'text-[#0B132B] dark:text-[#EDF2F4]',
          primaryText: 'text-[#0B132B] dark:text-[#EDF2F4]',
          accentText: 'text-[#0B132B] dark:text-[#EDF2F4]',
          accentBg: 'bg-[#0B132B] dark:bg-[#EDF2F4]',
          headerIconBg: 'bg-[#4EA8DE]/20 text-[#0B132B] dark:text-[#90E0EF]',
          cardRevenue: {
            bg: 'bg-[#EBF2F7] border-[#4EA8DE]/40 dark:bg-[#111C24]/80 dark:border-[#4EA8DE]/20',
            glow: 'bg-[#4EA8DE]/10',
            text: 'text-[#0B132B] dark:text-[#90E0EF]',
            lbl: 'text-[#2B4C6F] dark:text-[#64B5F6]',
          },
          cardWinRate: {
            bg: 'bg-[#E8F4F8] border-[#00B4D8]/40 dark:bg-[#0D2229]/80 dark:border-[#00B4D8]/20',
            glow: 'bg-[#0077B6]/10',
            text: 'text-[#0077B6] dark:text-[#90E0EF]',
            lbl: 'text-[#023E8A] dark:text-[#48CAE4]',
          },
          cardAvgValue: {
            bg: 'bg-[#EEF1F6] border-[#5C677D]/40 dark:bg-[#151A21]/80 dark:border-[#5C677D]/20',
            glow: 'bg-[#4F5D75]/10',
            text: 'text-[#1D2D44] dark:text-[#BAC7D5]',
            lbl: 'text-[#33415C] dark:text-[#7D8597]',
          },
          cardCountSold: {
            bg: 'bg-[#E6F4EA] border-[#81C784]/40 dark:bg-[#132216]/80 dark:border-[#81C784]/20',
            text: 'text-[#1B5E20] dark:text-[#81C784]',
            lbl: 'text-[#2E7D32] dark:text-[#81C784]',
          },
          cardCountLost: {
            bg: 'bg-[#FCE8E6] border-[#E57373]/40 dark:bg-[#251313]/80 dark:border-[#E57373]/20',
            text: 'text-[#C5221F] dark:text-[#E57373]',
            lbl: 'text-[#D93025] dark:text-[#E57373]',
          },
          donutColors: ['#0B132B', '#1C2541', '#4EA8DE'],
          ringStroke: 'stroke-[#0B132B] dark:stroke-[#4EA8DE]',
          ringTrackBg: 'bg-[#F4F7FA] border-[#4EA8DE]/30 dark:bg-[#0C121E]/80 dark:border-[#4EA8DE]/10',
          ringBadge: 'text-[#0B132B] bg-[#E1EAF2] dark:bg-[#131D2E] border-[#4EA8DE]/30',
          ringText: 'text-[#0B132B] dark:text-[#90E0EF]',
          trophyBanner: 'from-[#0B132B]/5 to-[#4EA8DE]/5 border-[#4EA8DE]/30 text-[#0B132B] dark:text-[#90E0EF]',
          trophyValue: 'text-[#0B132B] dark:text-[#90E0EF]',
        };
      default:
        // Light / Dark
        return {
          textColor: 'text-slate-800 dark:text-zinc-100',
          primaryText: 'text-slate-900 dark:text-white',
          accentText: 'text-blue-600 dark:text-blue-400',
          accentBg: 'bg-blue-600 dark:bg-blue-500',
          headerIconBg: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
          cardRevenue: {
            bg: 'bg-blue-500/5 border-blue-500/15 dark:bg-blue-950/20 dark:border-blue-500/20',
            glow: 'bg-blue-500/10',
            text: 'text-blue-600 dark:text-blue-400',
            lbl: 'text-blue-500/80 dark:text-blue-400/80',
          },
          cardWinRate: {
            bg: 'bg-amber-500/5 border-amber-500/15 dark:bg-amber-950/20 dark:border-amber-500/20',
            glow: 'bg-amber-500/10',
            text: 'text-amber-600 dark:text-amber-400',
            lbl: 'text-amber-500/80 dark:text-amber-400/80',
          },
          cardAvgValue: {
            bg: 'bg-indigo-500/5 border-indigo-500/15 dark:bg-indigo-950/20 dark:border-indigo-500/20',
            glow: 'bg-indigo-500/10',
            text: 'text-indigo-600 dark:text-indigo-400',
            lbl: 'text-indigo-500/80 dark:text-indigo-400/80',
          },
          cardCountSold: {
            bg: 'bg-emerald-500/5 border-emerald-500/15 dark:bg-emerald-950/20 dark:border-emerald-500/20',
            text: 'text-emerald-600 dark:text-emerald-400',
            lbl: 'text-emerald-600/80 dark:text-emerald-400/80',
          },
          cardCountLost: {
            bg: 'bg-rose-500/5 border-rose-500/15 dark:bg-rose-950/20 dark:border-rose-500/20',
            text: 'text-rose-600 dark:text-rose-400',
            lbl: 'text-rose-600/80 dark:text-rose-400/80',
          },
          donutColors: ['#2563eb', '#93c5fd', '#dbeafe'],
          ringStroke: 'stroke-blue-600 dark:stroke-blue-500',
          ringTrackBg: 'bg-slate-50 border-slate-200/60 dark:bg-zinc-950/50 dark:border-zinc-800/60',
          ringBadge: 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 border-blue-200/50 dark:border-blue-800/40',
          ringText: 'text-slate-900 dark:text-white',
          trophyBanner: 'from-amber-500/10 to-amber-500/5 border-amber-500/20 text-amber-700 dark:text-amber-300',
          trophyValue: 'text-amber-600 dark:text-amber-400',
        };
    }
  }, [theme]);

  return (
    <div id="tab-personal-stats" className="flex flex-col min-h-[500px] space-y-6 text-left">
      
      {/* Optionaler kompakter Rücksprung nur wenn Admin ein anderes Teammitglied prüft */}
      {!isOwnProfile && onBackToAdmin && (
        <div className="flex items-center justify-between p-3 px-4 rounded-xl bg-amber-500/10 border border-amber-500/25 text-amber-800 dark:text-amber-200">
          <div className="flex items-center gap-2">
            <span className="text-xs font-black uppercase tracking-wider">Mitarbeiter-Ansicht: {activeProfileName}</span>
            <span className="text-[11px] font-mono opacity-75">({activeProfileEmail})</span>
          </div>
          <button
            onClick={onBackToAdmin}
            className="py-1.5 px-3 bg-white dark:bg-zinc-800 hover:bg-slate-50 dark:hover:bg-zinc-700 text-slate-800 dark:text-zinc-200 rounded-lg font-bold text-xs flex items-center gap-1.5 transition-all shadow-xs active:scale-95 cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Mitarbeiter</span>
          </button>
        </div>
      )}

      {/* Filter Row: Zeitraum & Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800 shadow-xs">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 shrink-0">
            <TrendingUp className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-zinc-200 leading-none">
              {activeProfileEmail === currentUser?.email?.toLowerCase().trim() ? 'Eigene Erfolgsbilanz' : 'Mitarbeiter Erfolgsbilanz'}
            </h3>
            <span className="text-[10px] text-slate-400 dark:text-zinc-500 block mt-0.5">
              {statsYear === 'all' ? 'Alle aufgezeichneten Jahre' : `Jahr ${statsYear}`} {statsMonth !== 'all' && ` • Monat ${statsMonth}`}
            </span>
          </div>
        </div>

        {/* Dropdowns */}
        <div className="flex gap-2 items-center self-end sm:self-center">
          <select
            value={statsYear}
            onChange={(e) => setStatsYear(e.target.value)}
            className="input-field text-xs py-2 px-3 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 text-slate-800 dark:text-zinc-100 rounded-xl shadow-xs font-bold cursor-pointer"
          >
            <option value="all">Alle Jahre</option>
            {availableYears.map((y) => (
              <option key={y} value={y.toString()}>{y}</option>
            ))}
          </select>

          <select
            value={statsMonth}
            onChange={(e) => setStatsMonth(e.target.value)}
            className="input-field text-xs py-2 px-3 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 text-slate-800 dark:text-zinc-100 rounded-xl shadow-xs font-bold cursor-pointer"
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

      {/* 5 Key Metric Cards (Responsive Grid) */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3.5">
        {/* Card 1: Revenue in selected period */}
        <div className={`col-span-2 sm:col-span-1 p-4 rounded-2xl border ${themeStyles.cardRevenue.bg} relative overflow-hidden flex flex-col justify-between shadow-xs transition-all hover:scale-[1.01]`}>
          <div className="flex items-center justify-between mb-2">
            <span className={`text-[10px] font-black uppercase tracking-wider ${themeStyles.cardRevenue.lbl}`}>
              {statsMonth === 'all' ? 'Umsatz (Verkauft)' : 'Monatsumsatz'}
            </span>
            <Award className={`w-4 h-4 ${themeStyles.cardRevenue.text} opacity-70`} />
          </div>
          <div className={`text-xl sm:text-2xl font-black font-mono tracking-tight ${themeStyles.cardRevenue.text}`}>
            {formatter.format(personalStats.revenue)}
          </div>
          <span className="text-[9px] text-slate-400 dark:text-zinc-500 mt-1 font-mono">
            {personalStats.qualifiedSoldCount} Küchen abgeschlossen
          </span>
        </div>

        {/* Card 2: Closing Rate (Win Rate) */}
        <div className={`p-4 rounded-2xl border ${themeStyles.cardWinRate.bg} relative overflow-hidden flex flex-col justify-between shadow-xs transition-all hover:scale-[1.01]`}>
          <div className="flex items-center justify-between mb-2">
            <span className={`text-[10px] font-black uppercase tracking-wider ${themeStyles.cardWinRate.lbl}`}>
              Abschlussquote
            </span>
            <Target className={`w-4 h-4 ${themeStyles.cardWinRate.text} opacity-70`} />
          </div>
          <div className={`text-xl sm:text-2xl font-black font-mono tracking-tight ${themeStyles.cardWinRate.text}`}>
            {personalStats.winRate.toFixed(1)}%
          </div>
          <span className="text-[9px] text-slate-400 dark:text-zinc-500 mt-1">
            Quote nach {personalStats.qualifiedSoldCount + personalStats.qualifiedLostCount} Angeboten
          </span>
        </div>

        {/* Card 3: Avg Order Value */}
        <div className={`p-4 rounded-2xl border ${themeStyles.cardAvgValue.bg} relative overflow-hidden flex flex-col justify-between shadow-xs transition-all hover:scale-[1.01]`}>
          <div className="flex items-center justify-between mb-2">
            <span className={`text-[10px] font-black uppercase tracking-wider ${themeStyles.cardAvgValue.lbl}`}>
              Ø Auftragswert
            </span>
            <Briefcase className={`w-4 h-4 ${themeStyles.cardAvgValue.text} opacity-70`} />
          </div>
          <div className={`text-xl sm:text-2xl font-black font-mono tracking-tight ${themeStyles.cardAvgValue.text}`}>
            {formatter.format(personalStats.avgValue)}
          </div>
          <span className="text-[9px] text-slate-400 dark:text-zinc-500 mt-1 font-mono">
            Durchschnitt je Küche
          </span>
        </div>

        {/* Card 4: Count Sold */}
        <div className={`p-4 rounded-2xl border ${themeStyles.cardCountSold.bg} relative overflow-hidden flex flex-col justify-between shadow-xs transition-all hover:scale-[1.01]`}>
          <div className="flex items-center justify-between mb-2">
            <span className={`text-[10px] font-black uppercase tracking-wider ${themeStyles.cardCountSold.lbl}`}>
              Küchen Verkauft
            </span>
            <CheckCircle2 className={`w-4 h-4 ${themeStyles.cardCountSold.text} opacity-70`} />
          </div>
          <div className={`text-xl sm:text-2xl font-black font-mono tracking-tight ${themeStyles.cardCountSold.text}`}>
            {personalStats.qualifiedSoldCount}
          </div>
          <span className="text-[9px] text-slate-400 dark:text-zinc-500 mt-1 font-mono">
            Erfolgreiche Aufträge
          </span>
        </div>

        {/* Card 5: Count Lost */}
        <div className={`p-4 rounded-2xl border ${themeStyles.cardCountLost.bg} relative overflow-hidden flex flex-col justify-between shadow-xs transition-all hover:scale-[1.01]`}>
          <div className="flex items-center justify-between mb-2">
            <span className={`text-[10px] font-black uppercase tracking-wider ${themeStyles.cardCountLost.lbl}`}>
              Nicht Beauftragt
            </span>
            <ShieldAlert className={`w-4 h-4 ${themeStyles.cardCountLost.text} opacity-70`} />
          </div>
          <div className={`text-xl sm:text-2xl font-black font-mono tracking-tight ${themeStyles.cardCountLost.text}`}>
            {personalStats.qualifiedLostCount}
          </div>
          <span className="text-[9px] text-slate-400 dark:text-zinc-500 mt-1 font-mono">
            Verlorene Angebote
          </span>
        </div>
      </div>

      {/* Visual Analysis Section: Donut Charts & Target Progress */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        
        {/* Left: Donut Charts for Sold & Open structure */}
        <div className="lg:col-span-6 p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800 shadow-xs flex flex-col justify-between">
          <div className="flex items-center gap-2 mb-4 border-b border-slate-100 dark:border-zinc-800/80 pb-3">
            <PieChart className="w-4 h-4 text-slate-400" />
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-zinc-200">
              Auftrags- & Pipeline-Struktur
            </h4>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Donut 1: Sold Breakdown */}
            <div className="flex flex-col items-center justify-center p-3 rounded-xl bg-slate-50/60 dark:bg-zinc-950/40 border border-slate-100 dark:border-zinc-800/60">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">
                Verkaufte Küchen
              </span>
              <div className="w-28 h-28 my-1">
                <DonutChart 
                  neubau={personalStats.donutSold.neubau}
                  bestand={personalStats.donutSold.bestand}
                  klein={personalStats.donutSold.klein}
                  total={personalStats.donutSold.total}
                />
              </div>
              <div className="w-full mt-3 space-y-1.5 text-[10px] font-bold">
                <div className="flex items-center justify-between text-slate-700 dark:text-zinc-300">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                    <span>Neubau</span>
                  </div>
                  <span className="font-mono">{personalStats.donutSold.neubau} ({personalStats.donutSold.pctNeubau.toFixed(0)}%)</span>
                </div>
                <div className="flex items-center justify-between text-slate-700 dark:text-zinc-300">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
                    <span>Bestand</span>
                  </div>
                  <span className="font-mono">{personalStats.donutSold.bestand} ({personalStats.donutSold.pctBestand.toFixed(0)}%)</span>
                </div>
                <div className="flex items-center justify-between text-slate-700 dark:text-zinc-300">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                    <span>Kleinauftrag</span>
                  </div>
                  <span className="font-mono">{personalStats.donutSold.klein} ({personalStats.donutSold.pctKlein.toFixed(0)}%)</span>
                </div>
              </div>
            </div>

            {/* Donut 2: Open Pipeline Breakdown */}
            <div className="flex flex-col items-center justify-center p-3 rounded-xl bg-slate-50/60 dark:bg-zinc-950/40 border border-slate-100 dark:border-zinc-800/60">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">
                Offene Angebote
              </span>
              <div className="w-28 h-28 my-1">
                <DonutChart 
                  neubau={personalStats.donutOpen.neubau}
                  bestand={personalStats.donutOpen.bestand}
                  klein={personalStats.donutOpen.klein}
                  total={personalStats.donutOpen.total}
                />
              </div>
              <div className="w-full mt-3 space-y-1.5 text-[10px] font-bold">
                <div className="flex items-center justify-between text-slate-700 dark:text-zinc-300">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                    <span>Neubau</span>
                  </div>
                  <span className="font-mono">{personalStats.donutOpen.neubau} ({personalStats.donutOpen.pctNeubau.toFixed(0)}%)</span>
                </div>
                <div className="flex items-center justify-between text-slate-700 dark:text-zinc-300">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
                    <span>Bestand</span>
                  </div>
                  <span className="font-mono">{personalStats.donutOpen.bestand} ({personalStats.donutOpen.pctBestand.toFixed(0)}%)</span>
                </div>
                <div className="flex items-center justify-between text-slate-700 dark:text-zinc-300">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                    <span>Kleinauftrag</span>
                  </div>
                  <span className="font-mono">{personalStats.donutOpen.klein} ({personalStats.donutOpen.pctKlein.toFixed(0)}%)</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Annual Target Progress Ring */}
        <div className="lg:col-span-6 p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4 border-b border-slate-100 dark:border-zinc-800/80 pb-3">
            <div className="flex items-center gap-2">
              <Target className="w-4 h-4 text-slate-400" />
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-zinc-200">
                Jahresziel-Fortschritt ({currentYearForTarget})
              </h4>
            </div>
            <button
              onClick={() => setShowRemaining(!showRemaining)}
              className="text-[10px] font-bold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
            >
              {showRemaining ? 'Zeige Prozent' : 'Zeige Restbetrag'}
            </button>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-6 my-auto py-2">
            {/* SVG Circular Progress Ring */}
            <div className="relative w-36 h-36 flex items-center justify-center shrink-0">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                <circle
                  cx="50"
                  cy="50"
                  r="42"
                  className="stroke-slate-100 dark:stroke-zinc-800"
                  strokeWidth="9"
                  fill="transparent"
                />
                <motion.circle
                  cx="50"
                  cy="50"
                  r="42"
                  className={themeStyles.ringStroke}
                  strokeWidth="9"
                  strokeDasharray={263.89}
                  initial={{ strokeDashoffset: 263.89 }}
                  animate={{ strokeDashoffset: 263.89 - (263.89 * targetPercent) / 100 }}
                  transition={{ duration: 1.2, ease: 'easeOut' }}
                  strokeLinecap="round"
                  fill="transparent"
                />
              </svg>
              
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                {showRemaining ? (
                  <>
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Rest</span>
                    <span className="text-xs sm:text-sm font-black font-mono text-slate-800 dark:text-zinc-100">
                      {formatter.format(Math.max(0, userTarget - personalStats.annualRevenue))}
                    </span>
                  </>
                ) : (
                  <>
                    <span className="text-xl sm:text-2xl font-black font-mono tracking-tight text-slate-900 dark:text-white">
                      {targetPercent.toFixed(0)}%
                    </span>
                    <span className="text-[9px] font-bold uppercase tracking-widest text-slate-400">
                      Erreicht
                    </span>
                  </>
                )}
              </div>
            </div>

            {/* Target Details Legend */}
            <div className="space-y-2.5 text-xs text-left w-full sm:w-auto">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Zielvereinbarung</span>
                <span className="text-base font-black font-mono text-slate-800 dark:text-zinc-100">
                  {formatter.format(userTarget)}
                </span>
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Bereits realisiert</span>
                <span className="text-base font-black font-mono text-emerald-600 dark:text-emerald-400">
                  {formatter.format(personalStats.annualRevenue)}
                </span>
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Noch offen zum Ziel</span>
                <span className="text-sm font-black font-mono text-slate-500 dark:text-zinc-400">
                  {formatter.format(Math.max(0, userTarget - personalStats.annualRevenue))}
                </span>
              </div>
            </div>
          </div>

          {/* Trophy status if reached */}
          <AnimatePresence>
            {targetPercent >= 100 && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="mt-3 p-3 rounded-xl bg-gradient-to-r from-amber-500/15 to-amber-500/5 border border-amber-500/30 flex items-center gap-2.5 text-amber-700 dark:text-amber-300"
              >
                <Trophy className="w-5 h-5 text-amber-500 shrink-0" />
                <span className="text-xs font-black">
                  Herzlichen Glückwunsch! Das Jahresumsatzziel für {currentYearForTarget} wurde erfolgreich erreicht!
                </span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Best Month Banner */}
      {bestMonthInfo && (
        <div className={`p-4 rounded-2xl border bg-gradient-to-r ${themeStyles.trophyBanner} flex items-center justify-between gap-4 shadow-xs`}>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-400 shrink-0">
              <Trophy className="w-5 h-5 stroke-[2.25]" />
            </div>
            <div>
              <p className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-zinc-100">
                Stärkster Verkaufsmonat {currentYearForTarget}: <span className="text-amber-600 dark:text-amber-400">{bestMonthInfo.monthName}</span>
              </p>
              <p className="text-[11px] text-slate-500 dark:text-zinc-400 mt-0.5 font-mono">
                {formatter.format(bestMonthInfo.revenue)} Umsatz bei {bestMonthInfo.count} {bestMonthInfo.count === 1 ? 'Küchen-Abschluss' : 'Küchen-Abschlüssen'}
              </p>
            </div>
          </div>
          <span className="hidden sm:inline-block text-xs font-black font-mono px-3 py-1.5 rounded-xl bg-white/70 dark:bg-zinc-800/70 text-slate-700 dark:text-zinc-200 border border-slate-200/50 dark:border-zinc-700/50">
            Jahres-Rekord
          </span>
        </div>
      )}

    </div>
  );
};
