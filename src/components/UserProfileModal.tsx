/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { 
  X, LogOut, Palette, Check, User, Target, 
  Compass, Trophy, Sparkles, Star, ShieldAlert
} from 'lucide-react';
import { Commission } from '../types.ts';
import { User as FirebaseUser } from 'firebase/auth';

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
}) => {
  const [editedName, setEditedName] = useState('');
  const [savedSuccess, setSavedSuccess] = useState(false);
  
  // Starttab logic
  const [startTab, setStartTab] = useState<'open' | 'sold' | 'ausarbeitung' | 'stats' | 'admin'>('open');

  useEffect(() => {
    if (isOpen) {
      setEditedName(localStorage.getItem('kk_custom_display_name') || '');
      setStartTab((localStorage.getItem('kk_default_tab') || 'open') as any);
      setSavedSuccess(false);
    }
  }, [isOpen]);

  if (!isOpen || !currentUser) return null;

  const currentYear = new Date().getFullYear().toString();

  // 1. Zielvereinbarung calculated dynamically
  const userTarget = yearlyTargets?.[`${currentUser.email?.toLowerCase().trim()}_${currentYear}`] ?? yearlyTargets?.[currentYear] ?? annualTarget;

  const formattedTarget = new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  }).format(userTarget);

  // 2. Best sales month of this year
  const bestMonthInfo = commissions.length > 0 && currentUser.email ? (() => {
    const userEmail = currentUser.email.toLowerCase().trim();
    const userSoldThisYear = commissions.filter(c => {
      if (c.status !== 'sold') return false;
      const createdBy = (c.createdByEmail || '').toLowerCase().trim();
      return createdBy === userEmail;
    });

    if (userSoldThisYear.length === 0) return null;

    const monthRevenues = Array(12).fill(0);
    const monthCounts = Array(12).fill(0);

    userSoldThisYear.forEach(c => {
      const dateStr = c.resolvedAt || c.createdAt;
      if (dateStr) {
        const d = new Date(dateStr);
        if (d.getFullYear().toString() === currentYear) {
          const m = d.getMonth();
          monthRevenues[m] += c.price || 0;
          monthCounts[m] += 1;
        }
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
    
    // Simple page dispatch to let App.tsx know display name might have changed
    window.dispatchEvent(new Event('storage_custom_name_changed'));
  };

  const handleSaveStartTab = (tab: any) => {
    setStartTab(tab);
    localStorage.setItem('kk_default_tab', tab);
  };

  // Luxury / Aesthetic Theme Options
  const themes = [
    { id: 'light', name: 'Light Mode', colors: { bg: '#faf8f5', accent: '#2563eb', border: '#e7dfd1' } },
    { id: 'dark', name: 'Dark Mode', colors: { bg: '#09090b', accent: '#3b82f6', border: '#27272a' } },
    { id: 'sage', name: 'Sage Botanical', colors: { bg: '#F1F3F0', accent: '#2C3531', border: '#8A9A86' } },
    { id: 'ocean', name: 'Deep Ocean', colors: { bg: '#0B132B', accent: '#EDF2F4', border: '#4EA8DE' } },
    { id: 'wood', name: 'Vintage Terracotta', colors: { bg: '#FBF7F4', accent: '#3E2723', border: '#795548' } },
  ];

  return (
    <div id="profile-modal-backdrop" className="fixed inset-0 bg-black/60 backdrop-blur-md z-[200] flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-y-auto">
      <div 
        id="profile-modal-card" 
        className="bg-white dark:bg-zinc-900 border-t sm:border border-slate-200 dark:border-zinc-800 max-w-md w-full rounded-t-[2.5rem] sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col sm:my-auto max-h-[92vh] sm:max-h-[85vh]"
      >
        {/* Header styling */}
        <div className="relative bg-gradient-to-r from-blue-50 to-indigo-50/50 dark:from-zinc-950 dark:to-zinc-900 p-6 border-b border-slate-200/50 dark:border-zinc-800/80 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-600/10 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400 flex items-center justify-center font-bold">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-black tracking-tight text-slate-800 dark:text-slate-100 flex items-center gap-1.5 leading-none">
                Mitarbeiterprofil
              </h2>
              <span className="text-[10px] text-slate-400 dark:text-zinc-500 font-mono mt-0.5 block truncate max-w-[220px]">
                {currentUser.email}
              </span>
            </div>
          </div>
          
          <button 
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-slate-500 dark:text-zinc-400 flex items-center justify-center cursor-pointer transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content scrolling container */}
        <div className="p-5 space-y-5 overflow-y-auto max-h-[70vh] text-left">
          
          {/* Section 1: Target Agreements (Zielvereinbarung) */}
          <div className="bg-slate-50/80 dark:bg-zinc-950/60 p-4 border border-slate-200/50 dark:border-zinc-850 rounded-2xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-3 opacity-10 dark:opacity-5 group-hover:scale-110 transition-transform">
              <Target className="w-16 h-16 text-blue-600 dark:text-blue-400" />
            </div>
            
            <div className="flex items-center gap-2 mb-2">
              <Target className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <h3 className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-zinc-400">
                Umsatz-Zielvereinbarung {currentYear}
              </h3>
            </div>
            
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-black tracking-tight text-blue-600 dark:text-blue-400">
                {formattedTarget}
              </span>
              <span className="text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-widest">
                {yearlyTargets?.[`${currentUser.email?.toLowerCase().trim()}_${currentYear}`] ? 'Persönliches Ziel' : 'Standardziel'}
              </span>
            </div>
            <p className="text-[10px] text-slate-400 dark:text-zinc-500 mt-1.5 leading-relaxed">
              Dieses Ziel wird dir von deinem Administrator Enrico zugewiesen und dient zur Berechnung deiner Fortschritts-Meilensteine.
            </p>
          </div>

          {/* Section 2: Best sales month this year */}
          <div className="bg-gradient-to-r from-amber-500/5 to-yellow-500/5 dark:from-amber-500/5 dark:to-yellow-500/4 p-4 border border-amber-500/20 rounded-2xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-3 opacity-20 dark:opacity-10 group-hover:rotate-12 transition-transform">
              <Trophy className="w-16 h-16 text-amber-500" />
            </div>
            
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              <h3 className="text-[10px] font-black uppercase tracking-wider text-amber-700 dark:text-amber-400">
                Dein stärkster Verkaufsmonat {currentYear}
              </h3>
            </div>
            
            {bestMonthInfo ? (
              <div className="mt-1">
                <p className="text-xs font-bold text-slate-700 dark:text-zinc-300">
                  Spitzenmonat:{' '}
                  <span className="text-amber-600 dark:text-amber-400 text-sm font-black">
                    {bestMonthInfo.monthName}
                  </span>
                </p>
                <div className="flex items-baseline gap-1 mt-0.5">
                  <span className="text-lg font-black text-slate-800 dark:text-zinc-100">
                    {new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(bestMonthInfo.revenue)}
                  </span>
                  <span className="text-[10px] text-slate-400 dark:text-zinc-500">
                    ({bestMonthInfo.count} {bestMonthInfo.count === 1 ? 'Küche' : 'Küchen'})
                  </span>
                </div>
              </div>
            ) : (
              <div className="mt-1">
                <p className="text-xs font-bold text-slate-500 dark:text-zinc-400">
                  Noch keine Verkäufe im Jahr {currentYear} erfasst.
                </p>
                <p className="text-[9px] text-slate-400 dark:text-zinc-500 mt-1">
                  Lass uns den ersten Abschluss machen! Motiviert bleiben! 🚀
                </p>
              </div>
            )}
          </div>

          {/* Section 3: Name Customization */}
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-slate-400 dark:text-zinc-400 uppercase tracking-widest pl-1 block">
              Eigener Anzeigename
            </label>
            <div className="flex gap-2">
              <input 
                type="text"
                value={editedName}
                onChange={(e) => setEditedName(e.target.value)}
                placeholder={currentUserDisplayName}
                className="input-field text-sm font-bold bg-white/50 dark:bg-zinc-950 text-slate-800 dark:text-zinc-100 placeholder-slate-400 dark:placeholder-zinc-500 border border-slate-200 dark:border-zinc-850/80 rounded-xl focus:ring-2 focus:ring-blue-500/30 transition-all"
              />
              <button
                id="profile-save-displayname-btn"
                onClick={handleSaveDisplayName}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 rounded-xl font-bold text-[10px] uppercase tracking-widest shadow-md shadow-blue-500/10 active:scale-95 transition-all text-center shrink-0 cursor-pointer"
              >
                {savedSuccess ? 'Gesichert!' : 'Sichern'}
              </button>
            </div>
            <p className="text-[9.5px] text-slate-400 dark:text-zinc-500 pl-1 leading-relaxed">
              Dadurch änderst du deinen Namen lokal in deinem App-Dashboard. Falls Enrico deinen Namen permanent im System pflegt, wird dieser bei Abwesenheit überschrieben.
            </p>
          </div>

          {/* Section 4: Start Tab */}
          <div className="space-y-2">
            <div className="flex items-center gap-1.5 pl-1">
              <Compass className="w-3.5 h-3.5 text-slate-400" />
              <label className="text-[10px] font-bold text-slate-400 dark:text-zinc-400 uppercase tracking-widest block">
                Standard Starttab
              </label>
            </div>
            <div id="standard-starttab-container" className="grid grid-cols-2 xs:grid-cols-3 sm:grid-cols-4 gap-2">
              {(['open', 'sold', 'ausarbeitung', 'stats', 'admin'] as const).map((tab) => {
                if (tab === 'ausarbeitung' && !isAdmin && currentUser?.email?.toLowerCase().trim() !== 'belmonte@fs-kuechen.de') {
                  return null;
                }
                if (tab === 'admin' && !isAdmin) {
                  return null;
                }

                const labels: Record<string, string> = {
                  open: 'Offen',
                  sold: 'Verkauft',
                  ausarbeitung: 'Ausarb.',
                  stats: 'Statistik',
                  admin: 'Admin',
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
          </div>

          {/* Section 5: Beautiful Theme Picker */}
          <div className="space-y-2">
            <div className="flex items-center gap-1.5 pl-1">
              <Palette className="w-3.5 h-3.5 text-slate-400" />
              <label className="text-[10px] font-bold text-slate-400 dark:text-zinc-400 uppercase tracking-widest block">
                Design & Farbschema wählen
              </label>
            </div>
            
            <div className="grid grid-cols-1 gap-2">
              {themes.map((t) => {
                const isSelected = theme === t.id;
                return (
                  <button
                    key={t.id}
                    onClick={() => onChangeTheme(t.id)}
                    className={`flex items-center justify-between p-3 rounded-2xl border active:scale-98 transition-all cursor-pointer ${
                      isSelected 
                        ? 'border-blue-500 bg-blue-500/10 dark:border-blue-400 dark:bg-blue-950/30 text-blue-700 dark:text-blue-400 font-bold' 
                        : 'border-slate-200 bg-white dark:border-zinc-800 dark:bg-zinc-900/60 hover:bg-slate-50 dark:hover:bg-zinc-850'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div 
                        className="theme-preview-box w-8 h-8 rounded-xl flex items-center justify-center shadow-inner overflow-hidden"
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
                      <span className="text-xs font-black text-slate-700 dark:text-zinc-200 uppercase tracking-widest">
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

        {/* Modal Footer containing the centrally wanted dynamic LOGOUT action */}
        <div className="p-5 border-t border-slate-200/50 dark:border-zinc-800/80 bg-slate-50 dark:bg-zinc-950 flex flex-col items-stretch">
          <button
            onClick={() => {
              onLogout();
              onClose();
            }}
            className="w-full py-3 px-4 bg-red-600 hover:bg-red-700 text-white rounded-2xl font-bold text-xs uppercase tracking-widest flex items-center justify-center gap-2 shadow-md shadow-red-600/15 active:scale-95 transition-all text-center cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            Abmelden (Logout)
          </button>
        </div>

      </div>
    </div>
  );
};
