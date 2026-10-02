/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { 
  Users, Trash2, Calendar, Target, Edit, Shield, UserPlus, CheckCircle, 
  Save, Check, X, User, Database, Download, Upload, AlertTriangle, 
  RefreshCw, Search, SlidersHorizontal, UserCheck, UserX, Sparkles, 
  ShieldCheck, Mail, Compass, Palette, LogOut 
} from 'lucide-react';
import { TeammateConfig, ThemeType, UserPreferences } from '../types.ts';

interface AdminTabProps {
  annualTarget: number;
  yearlyTargets: Record<string, number>;
  onSaveAnnualTarget: (newTarget: number) => Promise<void>;
  onSaveYearlyTarget: (year: string, newTarget: number) => Promise<void>;
  onDeleteYearlyTarget: (year: string) => Promise<void>;
  onLogout: () => void;
  availableYears: number[];
  allTeammates?: string[];
  adminEmails?: string[];
  onSaveAdminEmails?: (emails: string[]) => Promise<void>;
  teammates?: TeammateConfig[];
  onSaveTeammates?: (teammates: TeammateConfig[]) => Promise<void>;
  onOpenUserProfile?: (email: string) => void;
  commissions?: any[];
  ausarbeitungen?: any[];
  onImportBackup?: (backupData: any) => Promise<void>;
  isAdmin?: boolean;
  currentUser?: any;
  currentUserDisplayName?: string;
  theme?: ThemeType;
  onChangeTheme?: (newTheme: ThemeType) => void;
  userPreferences?: UserPreferences;
  onUpdatePreferences?: (prefs: Partial<UserPreferences>) => Promise<void>;
  isSavingPreferences?: boolean;
}

export const AdminTab: React.FC<AdminTabProps> = ({
  annualTarget,
  yearlyTargets,
  onSaveAnnualTarget,
  onSaveYearlyTarget,
  onDeleteYearlyTarget,
  onLogout,
  availableYears,
  allTeammates = [],
  adminEmails = ['belmonte@fs-kuechen.de', 'belmonte.enrico@gmail.com'],
  onSaveAdminEmails,
  teammates = [],
  onSaveTeammates,
  onOpenUserProfile,
  commissions = [],
  ausarbeitungen = [],
  onImportBackup,
  isAdmin = false,
  currentUser,
  currentUserDisplayName = '',
  theme = 'light',
  onChangeTheme,
  userPreferences,
  onUpdatePreferences,
  isSavingPreferences = false,
}) => {
  // Navigation: Reihenfolge: Einstellungen & Themes vs Mitarbeiter vs Backup
  const [activeSection, setActiveSection] = useState<'settings' | 'employees' | 'backup'>('settings');

  useEffect(() => {
    if (!isAdmin && activeSection !== 'settings') {
      setActiveSection('settings');
    }
  }, [isAdmin, activeSection]);

  // Floating Toast für "In Cloud gesichert" (wird bei Änderung einer Einstellung getriggert)
  const [cloudToast, setCloudToast] = useState<{ visible: boolean; isSaving: boolean }>({
    visible: false,
    isSaving: false,
  });
  const toastTimerRef = useRef<NodeJS.Timeout | null>(null);

  const showCloudPopup = (isSaving = false) => {
    if (toastTimerRef.current) {
      clearTimeout(toastTimerRef.current);
      toastTimerRef.current = null;
    }
    setCloudToast({ visible: true, isSaving });
    if (!isSaving) {
      toastTimerRef.current = setTimeout(() => {
        setCloudToast(prev => ({ ...prev, visible: false }));
      }, 2500);
    }
  };

  const prevSavingRef = useRef(isSavingPreferences);
  useEffect(() => {
    if (isSavingPreferences) {
      showCloudPopup(true);
    } else if (prevSavingRef.current && !isSavingPreferences) {
      showCloudPopup(false);
    }
    prevSavingRef.current = isSavingPreferences;
  }, [isSavingPreferences]);

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) {
        clearTimeout(toastTimerRef.current);
      }
    };
  }, []);

  // Settings & Themes states
  const [editedName, setEditedName] = useState(userPreferences?.customDisplayName ?? localStorage.getItem('kk_custom_display_name') ?? '');
  const [savedNameSuccess, setSavedNameSuccess] = useState(false);
  const [startTab, setStartTab] = useState(userPreferences?.startTab ?? localStorage.getItem('kk_default_tab') ?? 'open');
  const [perspectiveSetting, setPerspectiveSetting] = useState(userPreferences?.defaultPerspective ?? localStorage.getItem('kk_default_colleague_perspective') ?? 'all');

  useEffect(() => {
    if (userPreferences?.customDisplayName !== undefined) {
      setEditedName(userPreferences.customDisplayName);
    }
    if (userPreferences?.startTab) {
      setStartTab(userPreferences.startTab);
    }
    if (userPreferences?.defaultPerspective) {
      setPerspectiveSetting(userPreferences.defaultPerspective);
    }
  }, [userPreferences]);

  const handleSaveDisplayName = async () => {
    const trimmed = editedName.trim();
    showCloudPopup(isSavingPreferences);
    if (onUpdatePreferences) {
      await onUpdatePreferences({ customDisplayName: trimmed });
    } else {
      if (trimmed) {
        localStorage.setItem('kk_custom_display_name', trimmed);
      } else {
        localStorage.removeItem('kk_custom_display_name');
      }
      window.dispatchEvent(new Event('storage_custom_name_changed'));
    }
    showCloudPopup(false);
    setSavedNameSuccess(true);
    setTimeout(() => setSavedNameSuccess(false), 2000);
  };

  const handleSaveStartTab = async (tab: any) => {
    setStartTab(tab);
    showCloudPopup(isSavingPreferences);
    if (onUpdatePreferences) {
      await onUpdatePreferences({ startTab: tab });
    } else {
      localStorage.setItem('kk_default_tab', tab);
    }
    showCloudPopup(false);
  };

  const handleSavePerspective = async (perspective: 'all' | 'own') => {
    setPerspectiveSetting(perspective);
    showCloudPopup(isSavingPreferences);
    if (onUpdatePreferences) {
      await onUpdatePreferences({ defaultPerspective: perspective });
    } else {
      localStorage.setItem('kk_default_colleague_perspective', perspective);
      window.dispatchEvent(new Event('storage_perspective_changed'));
    }
    showCloudPopup(false);
  };

  const handleSelectTheme = (themeId: any) => {
    showCloudPopup(isSavingPreferences);
    if (onChangeTheme) {
      onChangeTheme(themeId);
    }
    if (onUpdatePreferences) {
      onUpdatePreferences({ theme: themeId });
    }
    showCloudPopup(false);
  };

  const themes = [
    { id: 'light', name: 'Light Mode', colors: { bg: '#faf8f5', accent: '#2563eb', border: '#e7dfd1' } },
    { id: 'dark', name: 'Dark Mode', colors: { bg: '#09090b', accent: '#3b82f6', border: '#27272a' } },
    { id: 'sage', name: 'Sage Botanical', colors: { bg: '#F1F3F0', accent: '#2C3531', border: '#8A9A86' } },
    { id: 'ocean', name: 'Deep Ocean', colors: { bg: '#0B132B', accent: '#EDF2F4', border: '#4EA8DE' } },
    { id: 'wood', name: 'Vintage Terracotta', colors: { bg: '#FBF7F4', accent: '#3E2723', border: '#795548' } },
  ];

  const [targetInput, setTargetInput] = useState('');
  const [savingAdmins, setSavingAdmins] = useState(false);
  const [saving, setSaving] = useState(false);

  // States for teammate administration
  const [newTeammateEmail, setNewTeammateEmail] = useState('');
  const [newTeammateName, setNewTeammateName] = useState('');
  const [isAddingTeammate, setIsAddingTeammate] = useState(false);
  const [editingTeammateEmail, setEditingTeammateEmail] = useState<string | null>(null);
  const [editingTeammateName, setEditingTeammateName] = useState('');
  const [savingTeammates, setSavingTeammates] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | 'active' | 'inactive' | 'admin'>('all');

  // States for managing custom teammate targets inside the teammate list
  const [activeTargetEmail, setActiveTargetEmail] = useState<string | null>(null);
  const [memberYearInput, setMemberYearInput] = useState(new Date().getFullYear().toString());
  const [memberTargetInput, setMemberTargetInput] = useState('');

  // States for backup import confirmation
  const [pendingBackup, setPendingBackup] = useState<any | null>(null);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [isRestoring, setIsRestoring] = useState(false);

  // Sync state initially with fallback target value
  useEffect(() => {
    setTargetInput(annualTarget.toString().replace('.', ','));
  }, [annualTarget]);

  const handleSave = async () => {
    if (saving) return;
    setSaving(true);
    
    // Convert e.g., "1.500.000" or "1500000,50" -> Float / Int
    const cleanVal = targetInput.replace(/\./g, '').replace(',', '.');
    const parsed = parseFloat(cleanVal);

    if (!isNaN(parsed) && parsed > 0) {
      try {
        await onSaveAnnualTarget(parsed);
      } catch (err) {
        console.error('Failed to save settings:', err);
      }
    }
    setSaving(false);
  };

  const formatter = new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  });

  return (
    <div id="tab-admin" className="flex flex-col min-h-[500px] space-y-6">
      
      {/* Top Switcher: Einstellungen & Themes, Mitarbeiter, Backup */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-2 border-b border-slate-200/60 dark:border-zinc-800 pb-3">
        {/* 1. Reiter: Einstellungen & Themes (Mobile: Volle Zeile 1; Desktop: 1. Button links) */}
        <button
          onClick={() => setActiveSection('settings')}
          id="tab-btn-user-settings"
          className={`w-full sm:w-auto flex items-center justify-center gap-1.5 sm:gap-2 py-2 px-3 sm:px-3.5 rounded-xl font-black text-xs uppercase tracking-wider transition-all duration-200 cursor-pointer border ${
            activeSection === 'settings'
              ? 'bg-amber-500 text-white border-amber-600 shadow-md ring-2 ring-amber-500/20'
              : 'bg-white dark:bg-zinc-900 text-slate-500 dark:text-zinc-400 border-slate-200 dark:border-zinc-800 hover:text-slate-800 dark:hover:text-zinc-200'
          }`}
        >
          <SlidersHorizontal className="w-4 h-4 shrink-0" />
          <span>Einstellungen & Themes</span>
        </button>

        {/* 2. & 3. Reiter: Mitarbeiter & Backup (Mobile: Zeile darunter zu zweit nebeneinander; Desktop: in derselben Zeile) */}
        {isAdmin && (
          <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center sm:gap-2 w-full sm:w-auto">
            {/* 2. Reiter: Mitarbeiter */}
            <button
              onClick={() => setActiveSection('employees')}
              id="tab-btn-employees"
              className={`w-full sm:w-auto flex items-center justify-center gap-1.5 sm:gap-2 py-2 px-3 sm:px-3.5 rounded-xl font-black text-xs uppercase tracking-wider transition-all duration-200 cursor-pointer border ${
                activeSection === 'employees'
                  ? 'bg-amber-500 text-white border-amber-600 shadow-md ring-2 ring-amber-500/20'
                  : 'bg-white dark:bg-zinc-900 text-slate-500 dark:text-zinc-400 border-slate-200 dark:border-zinc-800 hover:text-slate-800 dark:hover:text-zinc-200'
              }`}
            >
              <Users className="w-4 h-4 shrink-0" />
              <span className="truncate">Mitarbeiter</span>
            </button>

            {/* 3. Reiter: Backup */}
            <button
              onClick={() => setActiveSection('backup')}
              id="tab-btn-backup"
              className={`w-full sm:w-auto flex items-center justify-center gap-1.5 sm:gap-2 py-2 px-3 sm:px-3.5 rounded-xl font-black text-xs uppercase tracking-wider transition-all duration-200 cursor-pointer border ${
                activeSection === 'backup'
                  ? 'bg-amber-500 text-white border-amber-600 shadow-md ring-2 ring-amber-500/20'
                  : 'bg-white dark:bg-zinc-900 text-slate-500 dark:text-zinc-400 border-slate-200 dark:border-zinc-800 hover:text-slate-800 dark:hover:text-zinc-200'
              }`}
            >
              <Database className="w-4 h-4 shrink-0" />
              <span className="truncate">Backup</span>
            </button>
          </div>
        )}
      </div>

      {/* ABSCHNITT 1: MITARBEITER */}
      {activeSection === 'employees' && isAdmin && (
        <div className="space-y-6 flex-1">
          <div className="border-b border-slate-200/60 dark:border-zinc-800 pb-4">
            <h2 className="text-[10px] font-black uppercase tracking-widest text-slate-400">
              Mitarbeiter- & Teamverwaltung
            </h2>
            <p className="text-xs text-slate-500 mt-1">Zentrale Mitarbeiter- und Verkäuferverwaltung sowie Jahresumsatzziele für dein Team.</p>
          </div>
        {/* Block: Standard-Ziel (deutlich verkleinert & kompakt) */}
        <div className="bg-white dark:bg-zinc-900 rounded-2xl p-4 border border-slate-200/80 dark:border-zinc-800 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 shrink-0">
              <Target className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-zinc-100">
                  Standard-Umsatzziel
                </h3>
                <span className="text-[10px] text-slate-400 dark:text-zinc-500 font-mono">
                  (Fallback / Jahr)
                </span>
              </div>
              <p className="text-[10px] text-slate-400 dark:text-zinc-500 mt-0.5">
                Gilt als Ausweichwert, falls für einen Mitarbeiter kein individuelles Jahresumsatzziel hinterlegt ist.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
            <div className="relative">
              <input
                type="text"
                value={targetInput}
                onChange={(e) => setTargetInput(e.target.value)}
                inputMode="decimal"
                className="input-field text-xs font-mono font-bold text-right py-1.5 px-3 pr-7 w-36 bg-slate-50 dark:bg-zinc-950 dark:text-white rounded-xl border border-slate-200 dark:border-zinc-800 focus:border-blue-500"
                placeholder="1.500.000"
              />
              <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 pointer-events-none">€</span>
            </div>
            <button
              onClick={handleSave}
              disabled={saving}
              className="bg-blue-600 hover:bg-blue-700 text-white px-3.5 py-1.5 rounded-xl font-bold text-xs uppercase tracking-wider shadow-xs active:scale-95 transition-all whitespace-nowrap cursor-pointer disabled:opacity-50"
            >
              {saving ? 'Speichert...' : 'Speichern'}
            </button>
          </div>
        </div>


        {/* Team block live members */}
        <div className="bg-white dark:bg-zinc-900 rounded-2xl p-4 sm:p-5 border border-slate-200/80 dark:border-zinc-800 shadow-xs">
          
          {/* Header */}
          <div className="flex items-center justify-between mb-3 pb-3 border-b border-slate-150 dark:border-zinc-800/80">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-gradient-to-br from-indigo-500/15 to-blue-500/15 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
                <Users className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-zinc-100">
                  Mitarbeiter & Verkäufer
                </h3>
                <p className="text-[10px] text-slate-400 dark:text-zinc-500 mt-0.5">
                  Verwaltung aller Team-Accounts, Admin-Rechte und individuellen Jahresumsatzziele.
                </p>
              </div>
            </div>
          </div>

          {/* Zusammenfassung der 4 Kennzahlen in einer kompakten Statuszeile */}
          {(() => {
            const displayListRaw: { email: string; name: string; isActive: boolean; isConfigured: boolean }[] = [
              ...teammates.map(t => ({ email: t.email, name: t.name, isActive: t.isActive, isConfigured: true }))
            ];

            allTeammates.forEach(email => {
              const emLower = email.toLowerCase().trim();
              if (!displayListRaw.some(d => d.email.toLowerCase().trim() === emLower)) {
                const prefix = emLower.split('@')[0];
                const fallbackName = prefix.charAt(0).toUpperCase() + prefix.slice(1);
                displayListRaw.push({ email: emLower, name: fallbackName, isActive: true, isConfigured: false });
              }
            });

            adminEmails.forEach(email => {
              const emLower = email.toLowerCase().trim();
              if (!displayListRaw.some(d => d.email.toLowerCase().trim() === emLower)) {
                const prefix = emLower.split('@')[0];
                const fallbackName = prefix.charAt(0).toUpperCase() + prefix.slice(1);
                displayListRaw.push({ email: emLower, name: fallbackName, isActive: true, isConfigured: false });
              }
            });

            const totalCount = displayListRaw.length;
            const activeCount = displayListRaw.filter(d => d.isActive).length;
            const adminCount = displayListRaw.filter(d => adminEmails.map(e => e.toLowerCase().trim()).includes(d.email.toLowerCase().trim())).length;
            const targetsCount = Object.keys(yearlyTargets).length;

            return (
              <div className="flex flex-wrap items-center justify-between gap-3 p-2.5 px-3.5 rounded-xl bg-slate-50/80 dark:bg-zinc-950/80 border border-slate-200/60 dark:border-zinc-850 mb-3.5">
                <div className="flex items-center gap-3.5 flex-wrap text-xs">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Gesamt:</span>
                    <span className="font-mono font-black text-slate-800 dark:text-zinc-100">{totalCount}</span>
                  </div>
                  <span className="text-slate-300 dark:text-zinc-700 hidden sm:inline">•</span>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0"></span>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Aktiv:</span>
                    <span className="font-mono font-black text-emerald-600 dark:text-emerald-400">{activeCount}</span>
                  </div>
                  <span className="text-slate-300 dark:text-zinc-700 hidden sm:inline">•</span>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0"></span>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Admins:</span>
                    <span className="font-mono font-black text-amber-600 dark:text-amber-400">{adminCount}</span>
                  </div>
                  <span className="text-slate-300 dark:text-zinc-700 hidden sm:inline">•</span>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0"></span>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Individuelle Ziele:</span>
                    <span className="font-mono font-black text-blue-600 dark:text-blue-400">{targetsCount}</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsAddingTeammate(!isAddingTeammate)}
                  className="py-1.5 px-3 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[10px] uppercase tracking-wider flex items-center gap-1.5 transition-all shadow-xs cursor-pointer active:scale-95 ml-auto"
                >
                  <UserPlus className="w-3 h-3" />
                  <span>{isAddingTeammate ? 'Abbrechen' : '+ Mitarbeiter anlegen'}</span>
                </button>
              </div>
            );
          })()}

          {/* Formular zum Anlegen: kompakt und ein-/ausklappbar */}
          {isAddingTeammate && (
            <div className="bg-slate-50/90 dark:bg-zinc-950/90 p-3.5 rounded-xl border border-indigo-500/30 dark:border-indigo-500/20 mb-3.5 space-y-2.5 animate-in fade-in duration-200">
              <div className="flex items-center justify-between">
                <h4 className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest flex items-center gap-1.5">
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>Neues Mitglied anlegen</span>
                </h4>
                <button
                  type="button"
                  onClick={() => setIsAddingTeammate(false)}
                  className="text-slate-400 hover:text-slate-600 text-[10px] font-bold cursor-pointer"
                >
                  Schließen
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto] gap-2.5 items-end">
                <div className="flex flex-col gap-1">
                  <label className="text-[8px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wider">E-Mail Adresse</label>
                  <div className="relative">
                    <Mail className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="email"
                      value={newTeammateEmail}
                      onChange={(e) => setNewTeammateEmail(e.target.value)}
                      className="input-field text-xs font-mono pl-8 h-8 bg-white dark:bg-zinc-900 border-slate-200 dark:border-zinc-800 focus:border-indigo-500 w-full rounded-xl"
                      placeholder="mitarbeiter@fs-kuechen.de"
                    />
                  </div>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[8px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wider">Anzeigename / Alias</label>
                  <input
                    type="text"
                    value={newTeammateName}
                    onChange={(e) => setNewTeammateName(e.target.value)}
                    className="input-field text-xs h-8 bg-white dark:bg-zinc-900 border-slate-200 dark:border-zinc-800 px-3 focus:border-indigo-500 w-full rounded-xl border"
                    placeholder="z. B. Claudio"
                  />
                </div>
                <div className="flex flex-col gap-1 justify-end">
                  <button
                    onClick={async () => {
                      const email = newTeammateEmail.trim().toLowerCase();
                      const name = newTeammateName.trim();
                      if (!email || !email.includes('@') || !name || savingTeammates || !onSaveTeammates) return;
                      setSavingTeammates(true);
                      try {
                        const existing = teammates.filter(t => t.email.toLowerCase().trim() !== email);
                        const updated = [...existing, { email, name, isActive: true }];
                        await onSaveTeammates(updated);
                        setNewTeammateEmail('');
                        setNewTeammateName('');
                        setIsAddingTeammate(false);
                      } catch (err) {
                        console.error(err);
                      } finally {
                        setSavingTeammates(false);
                      }
                    }}
                    disabled={savingTeammates || !newTeammateEmail || !newTeammateName}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white h-8 px-4 rounded-xl font-bold text-[10px] uppercase tracking-wider shadow-sm active:scale-95 transition-all whitespace-nowrap cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5"
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    <span>Hinzufügen</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Search & Filter Toolbar */}
          <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 mb-3">
            {/* Search Input */}
            <div className="relative flex-1 max-w-xs">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Mitarbeiter oder E-Mail suchen..."
                className="input-field text-xs pl-8 pr-7 py-1.5 bg-slate-50/80 dark:bg-zinc-950/80 border-slate-200 dark:border-zinc-800 w-full rounded-xl"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            {/* Filter Tabs */}
            <div className="flex items-center gap-1 bg-slate-100/80 dark:bg-zinc-950 p-1 rounded-xl text-[10px] font-bold self-start sm:self-auto">
              <button
                type="button"
                onClick={() => setRoleFilter('all')}
                className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                  roleFilter === 'all'
                    ? 'bg-white dark:bg-zinc-800 text-slate-800 dark:text-zinc-100 shadow-xs font-black'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-zinc-200'
                }`}
              >
                Alle
              </button>
              <button
                type="button"
                onClick={() => setRoleFilter('active')}
                className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                  roleFilter === 'active'
                    ? 'bg-white dark:bg-zinc-800 text-emerald-600 dark:text-emerald-400 shadow-xs font-black'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-zinc-200'
                }`}
              >
                Aktiv
              </button>
              <button
                type="button"
                onClick={() => setRoleFilter('inactive')}
                className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                  roleFilter === 'inactive'
                    ? 'bg-white dark:bg-zinc-800 text-slate-600 dark:text-zinc-400 shadow-xs font-black'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-zinc-200'
                }`}
              >
                Inaktiv
              </button>
              <button
                type="button"
                onClick={() => setRoleFilter('admin')}
                className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                  roleFilter === 'admin'
                    ? 'bg-white dark:bg-zinc-800 text-amber-600 dark:text-amber-400 shadow-xs font-black'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-zinc-200'
                }`}
              >
                Admins
              </button>
            </div>
          </div>

          {/* List of Teammates */}
          <div className="relative z-10 space-y-2">
            {(() => {
              const displayList: { email: string; name: string; isActive: boolean; isConfigured: boolean }[] = [
                ...teammates.map(t => ({ email: t.email, name: t.name, isActive: t.isActive, isConfigured: true }))
              ];

              allTeammates.forEach(email => {
                const emLower = email.toLowerCase().trim();
                const alreadyAdded = displayList.some(d => d.email.toLowerCase().trim() === emLower);
                if (!alreadyAdded) {
                  const prefix = emLower.split('@')[0];
                  const fallbackName = prefix.charAt(0).toUpperCase() + prefix.slice(1);
                  displayList.push({
                    email: emLower,
                    name: fallbackName,
                    isActive: true,
                    isConfigured: false
                  });
                }
              });

              adminEmails.forEach(email => {
                const emLower = email.toLowerCase().trim();
                const alreadyAdded = displayList.some(d => d.email.toLowerCase().trim() === emLower);
                if (!alreadyAdded) {
                  const prefix = emLower.split('@')[0];
                  const fallbackName = prefix.charAt(0).toUpperCase() + prefix.slice(1);
                  displayList.push({
                    email: emLower,
                    name: fallbackName,
                    isActive: true,
                    isConfigured: false
                  });
                }
              });

              // Apply Search & Filter
              const filteredList = displayList.filter((item) => {
                const q = searchQuery.trim().toLowerCase();
                const matchesQuery = !q || item.name.toLowerCase().includes(q) || item.email.toLowerCase().includes(q);

                const isAdmin = adminEmails.map(e => e.toLowerCase().trim()).includes(item.email.toLowerCase().trim());

                if (!matchesQuery) return false;
                if (roleFilter === 'active' && !item.isActive) return false;
                if (roleFilter === 'inactive' && item.isActive) return false;
                if (roleFilter === 'admin' && !isAdmin) return false;

                return true;
              });

              if (filteredList.length === 0) {
                return (
                  <div className="text-center py-8 bg-slate-50/50 dark:bg-zinc-950/50 rounded-2xl border border-dashed border-slate-200 dark:border-zinc-800">
                    <Users className="w-8 h-8 text-slate-300 dark:text-zinc-700 mx-auto mb-2" />
                    <p className="text-xs font-medium text-slate-500 dark:text-zinc-400">Keine passenden Mitarbeiter gefunden.</p>
                    {searchQuery && (
                      <button
                        onClick={() => setSearchQuery('')}
                        className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline mt-1 cursor-pointer"
                      >
                        Suchfilter zurücksetzen
                      </button>
                    )}
                  </div>
                );
              }

              return filteredList.map((item) => {
                const isEditing = editingTeammateEmail === item.email;
                const isAdminUser = adminEmails.map(e => e.toLowerCase().trim()).includes(item.email.toLowerCase().trim());
                const isSystemAdmin = ['belmonte@fs-kuechen.de', 'belmonte.enrico@gmail.com'].includes(item.email.toLowerCase().trim());

                // Color badge helper for initials avatar
                const getAvatarGradient = (str: string) => {
                  if (isSystemAdmin) return 'from-indigo-600 to-purple-600 text-white';
                  if (isAdminUser) return 'from-amber-500 to-orange-500 text-white';
                  return 'from-blue-500 to-indigo-500 text-white';
                };

                const handleSaveEditing = async () => {
                  const trimmedName = editingTeammateName.trim();
                  if (!trimmedName || !onSaveTeammates) return;
                  setSavingTeammates(true);
                  try {
                    const isAlreadyConfigured = teammates.some(t => t.email.toLowerCase().trim() === item.email.toLowerCase().trim());
                    let updated;
                    if (isAlreadyConfigured) {
                      updated = teammates.map(t => 
                        t.email.toLowerCase().trim() === item.email.toLowerCase().trim()
                          ? { ...t, name: trimmedName, isActive: t.isActive ?? true }
                          : t
                      );
                    } else {
                      updated = [...teammates, { email: item.email.toLowerCase().trim(), name: trimmedName, isActive: item.isActive ?? true }];
                    }
                    await onSaveTeammates(updated);

                    if (activeTargetEmail === item.email) {
                      const yr = memberYearInput.trim();
                      if (yr && !isNaN(parseInt(yr))) {
                        const cleanVal = memberTargetInput.replace(/\./g, '').replace(',', '.');
                        const parsed = parseFloat(cleanVal);
                        const key = `${item.email.toLowerCase().trim()}_${yr}`;

                        const currentTargetExists = yearlyTargets && yearlyTargets[key] !== undefined;

                        if (!isNaN(parsed) && parsed > 0) {
                          await onSaveYearlyTarget(key, parsed);
                        } else if ((memberTargetInput.trim() === '' || parsed === 0) && currentTargetExists) {
                          await onDeleteYearlyTarget(key);
                        }
                      }
                    }

                    setEditingTeammateEmail(null);
                    setActiveTargetEmail(null);
                  } catch (err) {
                    console.error('Unified save error:', err);
                  } finally {
                    setSavingTeammates(false);
                  }
                };

                return (
                  <div 
                    key={item.email}
                    className={`flex flex-col bg-slate-50/90 dark:bg-zinc-950/90 rounded-xl border transition-all duration-300 hover:shadow-xs ${
                      item.isActive 
                        ? 'border-slate-200/80 dark:border-zinc-800/80 hover:border-slate-300 dark:hover:border-zinc-700' 
                        : 'border-slate-200/40 dark:border-zinc-900 opacity-60'
                    }`}
                  >
                    {/* Main Teammate Row */}
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 p-3 px-4 min-h-[56px]">
                      {/* Avatar + Info */}
                      <div 
                        onClick={() => {
                          if (!isEditing && onOpenUserProfile) {
                            onOpenUserProfile(item.email);
                          }
                        }}
                        className={`flex items-center gap-3 min-w-0 flex-1 ${!isEditing && onOpenUserProfile ? 'cursor-pointer group/item select-none' : ''}`}
                        title={!isEditing && onOpenUserProfile ? `Klicken, um das Profil von ${item.name} anzuzeigen` : undefined}
                      >
                        <div className="relative shrink-0 select-none">
                          <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${getAvatarGradient(item.name)} flex items-center justify-center text-xs font-black uppercase shadow-xs transition-all group-hover/item:scale-105`}>
                            {item.name.charAt(0)}
                          </div>
                          <span className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white dark:border-zinc-950 ${item.isActive ? 'bg-emerald-500' : 'bg-slate-400'}`}></span>
                        </div>

                        <div className="min-w-0 flex-1">
                          {isEditing ? (
                            <div className="flex gap-1 items-center mt-0.5" onClick={(e) => e.stopPropagation()}>
                              <input
                                type="text"
                                value={editingTeammateName}
                                onChange={(e) => setEditingTeammateName(e.target.value)}
                                onKeyDown={async (e) => {
                                  if (e.key === 'Enter') {
                                    await handleSaveEditing();
                                  } else if (e.key === 'Escape') {
                                    setEditingTeammateEmail(null);
                                    setActiveTargetEmail(null);
                                  }
                                }}
                                className="input-field text-xs bg-white dark:bg-zinc-900 border-slate-300 dark:border-zinc-800 px-2.5 py-1 h-7 border rounded-lg text-left focus:border-blue-500 w-full max-w-[180px]"
                                placeholder="Anzeigename"
                              />
                            </div>
                          ) : (
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-xs font-black text-slate-800 dark:text-zinc-100 group-hover/item:text-indigo-600 dark:group-hover/item:text-indigo-400 transition-colors">
                                {item.name}
                              </span>
                              
                              {isAdminUser && (
                                <span className={`text-[8px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md select-none border ${
                                  isSystemAdmin 
                                    ? 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20' 
                                    : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
                                }`}>
                                  {isSystemAdmin ? 'Sys-Admin' : 'Admin'}
                                </span>
                              )}

                              {!isAdminUser && (
                                <span className="text-[8px] font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400 bg-slate-200/50 dark:bg-zinc-850 px-2 py-0.5 rounded-md border border-slate-200/60 dark:border-zinc-800 select-none">
                                  Verkäufer
                                </span>
                              )}

                              {!item.isConfigured && (
                                <span className="text-[7.5px] font-bold uppercase tracking-wider text-slate-400 bg-slate-100 dark:bg-zinc-900 border border-slate-200/50 px-1.5 py-0.5 rounded select-none">
                                  Auto-erfasst
                                </span>
                              )}
                            </div>
                          )}
                          <p className="text-[10px] font-mono text-slate-400 dark:text-zinc-500 truncate mt-0.5 select-all" onClick={(e) => e.stopPropagation()}>
                            {item.email}
                          </p>
                        </div>
                      </div>

                      {/* Sliding Targets Drawer / Display */}
                      <div className={`overflow-hidden transition-all duration-300 flex items-center shrink-0 ${
                        activeTargetEmail === item.email 
                          ? 'max-w-[360px] opacity-100 mx-1 md:mx-3' 
                          : 'max-w-0 opacity-0 pointer-events-none'
                      }`}>
                        {isEditing ? (
                          <div className="flex items-center gap-1.5 bg-blue-50/70 dark:bg-zinc-900/70 border border-blue-200 dark:border-zinc-800 p-1.5 px-2 rounded-xl">
                            <span className="text-[9px] font-black uppercase text-blue-600 dark:text-blue-400 select-none">Ziel:</span>
                            <input
                              type="number"
                              min="2020"
                              max="2100"
                              value={memberYearInput}
                              onChange={(e) => setMemberYearInput(e.target.value)}
                              onKeyDown={async (e) => {
                                if (e.key === 'Enter') await handleSaveEditing();
                                else if (e.key === 'Escape') {
                                  setEditingTeammateEmail(null);
                                  setActiveTargetEmail(null);
                                }
                              }}
                              className="input-field text-xs font-mono w-[64px] bg-white dark:bg-zinc-950 border-slate-300 dark:border-zinc-800 h-7 text-center rounded-lg px-1 focus:border-blue-500"
                              placeholder="Jahr"
                            />
                            <input
                              type="text"
                              value={memberTargetInput}
                              onChange={(e) => setMemberTargetInput(e.target.value)}
                              onKeyDown={async (e) => {
                                if (e.key === 'Enter') await handleSaveEditing();
                                else if (e.key === 'Escape') {
                                  setEditingTeammateEmail(null);
                                  setActiveTargetEmail(null);
                                }
                              }}
                              inputMode="decimal"
                              className="input-field text-xs font-mono w-[110px] bg-white dark:bg-zinc-950 border-slate-300 dark:border-zinc-800 h-7 text-right rounded-lg px-1 focus:border-blue-500"
                              placeholder="Umsatz in €"
                            />
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {(() => {
                              const mEmail = item.email.toLowerCase().trim();
                              const mTargets = Object.entries(yearlyTargets)
                                .filter(([key]) => key.startsWith(`${mEmail}_`))
                                .map(([key, val]) => {
                                  const yr = key.substring(mEmail.length + 1);
                                  return { key, year: yr, value: val as number };
                                })
                                .sort((a, b) => b.year.localeCompare(a.year));

                              if (mTargets.length === 0) {
                                return <span className="text-[10px] text-slate-400 dark:text-zinc-500 italic py-1 whitespace-nowrap">Standardziel gilt</span>;
                              }

                              return mTargets.map((tgt) => (
                                <div 
                                  key={tgt.key}
                                  className="flex items-center gap-1 bg-blue-500/10 dark:bg-blue-500/5 text-blue-700 dark:text-blue-400 border border-blue-500/20 p-1 px-2 rounded-lg text-[9px] font-black whitespace-nowrap"
                                >
                                  <span>{tgt.year}: {formatter.format(tgt.value)}</span>
                                  <button
                                    onClick={async (e) => {
                                      e.stopPropagation();
                                      await onDeleteYearlyTarget(tgt.key);
                                    }}
                                    className="p-0.5 text-blue-600 hover:text-red-500 rounded hover:bg-blue-100 dark:hover:bg-zinc-800 cursor-pointer ml-0.5"
                                    title="Dieses Umsatzziel löschen"
                                  >
                                    <X className="w-2.5 h-2.5" />
                                  </button>
                                </div>
                              ));
                            })()}
                          </div>
                        )}
                      </div>

                      {/* Right Actions */}
                      <div className="flex items-center gap-1.5 sm:self-center self-end shrink-0 flex-wrap">
                        {isEditing ? (
                          <div className="flex items-center gap-1">
                            <button
                              onClick={handleSaveEditing}
                              className="p-1.5 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[9px] font-black uppercase tracking-wider flex items-center gap-1 cursor-pointer active:scale-95 transition-all shadow-xs"
                              title="Speichern"
                            >
                              <Check className="w-3 h-3" />
                              <span>Speichern</span>
                            </button>
                            <button
                              onClick={() => {
                                setEditingTeammateEmail(null);
                                setActiveTargetEmail(null);
                              }}
                              className="p-1.5 px-3 rounded-lg bg-slate-200 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 hover:bg-slate-300 text-[9px] font-black uppercase tracking-wider flex items-center gap-1 cursor-pointer active:scale-95 transition-all"
                              title="Abbrechen"
                            >
                              <X className="w-3 h-3" />
                              <span>Abbrechen</span>
                            </button>
                          </div>
                        ) : (
                          <>
                            {/* Target management button */}
                            <button
                              onClick={() => {
                                if (activeTargetEmail === item.email) {
                                  setActiveTargetEmail(null);
                                } else {
                                  setActiveTargetEmail(item.email);
                                  setMemberYearInput(new Date().getFullYear().toString());
                                  const tKey = `${item.email.toLowerCase().trim()}_${new Date().getFullYear()}`;
                                  const activeTVal = yearlyTargets[tKey];
                                  setMemberTargetInput(activeTVal ? activeTVal.toString() : '');
                                }
                              }}
                              className={`flex items-center gap-1 p-1.5 px-2.5 rounded-lg border text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                                activeTargetEmail === item.email
                                  ? 'bg-blue-600 border-blue-600 text-white hover:bg-blue-700 font-bold shadow-xs'
                                  : 'bg-white dark:bg-zinc-900 border-slate-200 dark:border-zinc-800 text-slate-600 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-800'
                              }`}
                              title="Umsatz-Ziele verwalten"
                            >
                              <Target className="w-3 h-3" />
                              <span>Ziele</span>
                            </button>

                            {/* Admin/Role Toggle */}
                            {onSaveAdminEmails && (
                              <button
                                onClick={async () => {
                                  if (savingAdmins || isSystemAdmin) return;
                                  setSavingAdmins(true);
                                  try {
                                    let updatedAdmins;
                                    if (isAdminUser) {
                                      updatedAdmins = adminEmails.filter(e => e.toLowerCase().trim() !== item.email.toLowerCase().trim());
                                    } else {
                                      updatedAdmins = Array.from(new Set([...adminEmails, item.email.toLowerCase().trim()]));
                                    }
                                    await onSaveAdminEmails(updatedAdmins);
                                  } catch (err) {
                                    console.error('Failed to change admin permissions:', err);
                                  } finally {
                                    setSavingAdmins(false);
                                  }
                                }}
                                disabled={savingAdmins || isSystemAdmin}
                                className={`flex items-center gap-1 p-1.5 px-2.5 rounded-lg border text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                                  isSystemAdmin
                                    ? 'bg-purple-500/10 border-purple-500/20 text-purple-600 dark:text-purple-400 opacity-75'
                                    : isAdminUser
                                      ? 'bg-amber-500/10 border-amber-500/20 text-amber-600 dark:text-amber-400 hover:bg-amber-500/20'
                                      : 'bg-white dark:bg-zinc-900 border-slate-200 dark:border-zinc-800 text-slate-500 dark:text-zinc-400 hover:text-slate-800 dark:hover:text-zinc-200 dark:hover:bg-zinc-800'
                                }`}
                                title={
                                  isSystemAdmin
                                    ? 'System-Administrator (Rechte unentziehbar)'
                                    : isAdminUser
                                      ? 'Admin-Rechte entziehen'
                                      : 'Admin-Rechte gewähren'
                                }
                              >
                                <Shield className="w-3 h-3" />
                                <span>{isAdminUser ? (isSystemAdmin ? 'Sys-Admin' : 'Admin') : 'Verkäufer'}</span>
                              </button>
                            )}

                            {/* Active Toggle Button */}
                            {item.isConfigured && (
                              <button
                                onClick={async () => {
                                  if (!onSaveTeammates || savingTeammates) return;
                                  setSavingTeammates(true);
                                  try {
                                    const existing = teammates.filter(t => t.email.toLowerCase().trim() !== item.email.toLowerCase().trim());
                                    const updated = [...existing, { email: item.email.toLowerCase().trim(), name: item.name, isActive: !item.isActive }];
                                    await onSaveTeammates(updated);
                                  } catch (err) {
                                    console.error(err);
                                  } finally {
                                    setSavingTeammates(false);
                                  }
                                }}
                                className={`p-1.5 px-2.5 rounded-lg border text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                                  item.isActive 
                                    ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20' 
                                    : 'bg-zinc-500/10 border-zinc-500/20 text-zinc-500 hover:bg-zinc-200'
                                }`}
                                title={item.isActive ? "Inaktiv schalten" : "Aktiv schalten"}
                              >
                                {item.isActive ? 'Aktiv' : 'Inaktiv'}
                              </button>
                            )}

                            {/* Edit Button */}
                            <button
                              onClick={() => {
                                setEditingTeammateEmail(item.email);
                                setEditingTeammateName(item.name);
                                setActiveTargetEmail(item.email);
                                const defaultYr = new Date().getFullYear().toString();
                                setMemberYearInput(defaultYr);
                                const mKey = `${item.email.toLowerCase().trim()}_${defaultYr}`;
                                const activeTVal = yearlyTargets[mKey];
                                setMemberTargetInput(activeTVal ? activeTVal.toString() : '');
                              }}
                              className="p-1.5 rounded-lg border border-slate-200 dark:border-zinc-800 text-slate-500 hover:text-slate-800 dark:hover:text-zinc-200 bg-white dark:bg-zinc-900 hover:border-slate-300 cursor-pointer active:scale-95 transition-all"
                              title="Anzeigename & Umsatzziel bearbeiten"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </button>

                            {/* Delete Button */}
                            {item.isConfigured && (
                              <button
                                onClick={async () => {
                                  if (!onSaveTeammates || savingTeammates) return;
                                  setSavingTeammates(true);
                                  try {
                                    const updated = teammates.filter(t => t.email.toLowerCase().trim() !== item.email.toLowerCase().trim());
                                    await onSaveTeammates(updated);
                                  } catch (err) {
                                    console.error(err);
                                  } finally {
                                    setSavingTeammates(false);
                                  }
                                }}
                                className="p-1.5 rounded-lg text-red-500 bg-red-500/10 hover:bg-red-500 hover:text-white cursor-pointer active:scale-95 transition-all"
                                title="Aus Verwaltung entfernen"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                );
              });
            })()}
          </div>
        </div>

      </div>
      )}

      {/* ABSCHNITT 2: BACKUP & DATENWIEDERHERSTELLUNG */}
      {activeSection === 'backup' && isAdmin && (
        <div className="space-y-6 flex-1">
          <div className="border-b border-slate-200/60 dark:border-zinc-800 pb-4">
            <h2 className="text-[10px] font-black uppercase tracking-widest text-slate-400">
              Datensicherung & Wiederherstellung
            </h2>
            <p className="text-xs text-slate-500 mt-1">Sichere deinen gesamten Datenbestand oder stelle ihn aus einer JSON-Datei wieder her.</p>
          </div>

          {/* Block: Backup & Datenwiederherstellung */}
          <div className="bg-white dark:bg-zinc-900 rounded-2xl p-4 sm:p-5 border border-slate-200/80 dark:border-zinc-800 shadow-xs">
            
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3 pb-3 border-b border-slate-150 dark:border-zinc-800/80">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 shrink-0">
                  <Database className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-zinc-100">
                    Backup & Datenwiederherstellung
                  </h3>
                  <p className="text-[10px] text-slate-400 dark:text-zinc-500 mt-0.5">
                    Sichere deinen gesamten Datenbestand oder stelle ihn aus einer JSON-Datei wieder her.
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex flex-wrap gap-2.5">
                {/* Export Button */}
                <button
                  onClick={() => {
                    try {
                      const backup = {
                        version: 1,
                        exportedAt: new Date().toISOString(),
                        commissions: commissions || [],
                        ausarbeitungen: ausarbeitungen || [],
                        settings: {
                          annualTarget,
                          yearlyTargets,
                          adminEmails,
                          teammates,
                        }
                      };
                      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      const d = new Date();
                      const dateStr = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
                      a.href = url;
                      a.download = `kitcommand_backup_${dateStr}.json`;
                      document.body.appendChild(a);
                      a.click();
                      document.body.removeChild(a);
                      URL.revokeObjectURL(url);
                    } catch (err) {
                      console.error('Export failed:', err);
                      alert('Export fehlgeschlagen: ' + err);
                    }
                  }}
                  className="theme-backup-download-btn p-2.5 px-4 rounded-xl font-bold text-[10px] uppercase tracking-widest flex items-center gap-2 cursor-pointer active:scale-95 transition-all"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Backup herunterladen (JSON)</span>
                </button>

                {/* Import Upload trigger */}
                <label className="theme-backup-upload-btn p-2.5 px-4 rounded-xl font-bold text-[10px] uppercase tracking-widest flex items-center gap-2 cursor-pointer active:scale-95 transition-all select-none">
                  <Upload className="w-3.5 h-3.5" />
                  <span>Backup einspielen (JSON)</span>
                  <input
                    type="file"
                    accept=".json"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      const reader = new FileReader();
                      reader.onload = async (event) => {
                        try {
                          const parsed = JSON.parse(event.target?.result as string);
                          if (!parsed || (typeof parsed !== 'object')) {
                            throw new Error('Ungültiges Dateiformat. Die Datei muss ein JSON-Objekt sein.');
                          }
                          if (!parsed.commissions || !Array.isArray(parsed.commissions)) {
                            throw new Error('Die Datei enthält keine gültigen Kommissionsdaten.');
                          }
                          setPendingBackup(parsed);
                          setConfirmText('');
                          setIsConfirmOpen(true);
                        } catch (err: any) {
                          alert('Fehler beim Lesen der Backup-Datei: ' + err.message);
                        }
                      };
                      reader.readAsText(file);
                      e.target.value = '';
                    }}
                    className="hidden"
                  />
                </label>
              </div>
            </div>
          </div>

        </div>
      )}

      {/* ABSCHNITT 3: EINSTELLUNGEN & THEMES */}
      {activeSection === 'settings' && (
        <div className="space-y-6 flex-1 text-left">

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
            {/* Left Column: Name & Starttab & Perspective */}
            <div className="space-y-6">
              
              {/* Section 1: Name Customization */}
              <div className="space-y-2.5 bg-white dark:bg-zinc-900 p-5 rounded-2xl border border-slate-200/80 dark:border-zinc-800 shadow-xs">
                <label className="text-[10px] font-black text-slate-450 dark:text-zinc-400 uppercase tracking-widest pl-1 block">
                  Eigenes Namenskürzel / Anzeigename
                </label>
                <div className="flex gap-2.5 pt-1">
                  <input 
                    type="text"
                    value={editedName}
                    onChange={(e) => setEditedName(e.target.value)}
                    placeholder={currentUserDisplayName || 'Dein Anzeigename'}
                    className="input-field text-sm font-semibold bg-slate-50 dark:bg-zinc-950 text-slate-850 dark:text-zinc-100 placeholder-slate-400 dark:placeholder-zinc-650 border border-slate-200 dark:border-zinc-850/80 rounded-xl focus:ring-2 focus:ring-blue-500/30 transition-all flex-1"
                  />
                  <button
                    id="settings-save-displayname-btn"
                    onClick={handleSaveDisplayName}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 rounded-xl font-bold text-[10px] uppercase tracking-widest active:scale-95 transition-all text-center shrink-0 cursor-pointer shadow-md shadow-blue-600/20"
                  >
                    {savedNameSuccess ? 'Gesichert!' : 'Sichern'}
                  </button>
                </div>
                <p className="text-[9px] text-slate-400 dark:text-zinc-550 pl-1 leading-relaxed">
                  Dadurch änderst du deinen Namen im App-Dashboard und in deinen persönlichen Einstellungen.
                </p>
              </div>

              {/* Section 2: Default Start Tab */}
              <div className="space-y-2.5 bg-white dark:bg-zinc-900 p-5 rounded-2xl border border-slate-200/80 dark:border-zinc-800 shadow-xs">
                <div className="flex items-center gap-1.5 pl-1">
                  <Compass className="w-3.5 h-3.5 text-slate-400" />
                  <label className="text-[10px] font-black text-slate-450 dark:text-zinc-400 uppercase tracking-widest block">
                    Standard Starttab
                  </label>
                </div>
                <div id="standard-starttab-container" className="grid grid-cols-2 gap-2 pt-1.5">
                  {(['open', 'sold', 'ausarbeitung', 'stats', 'personal_stats'] as const).map((tab) => {
                    if (tab === 'ausarbeitung' && !isAdmin && currentUser?.email?.toLowerCase().trim() !== 'belmonte@fs-kuechen.de') {
                      return null;
                    }

                    const labels: Record<string, string> = {
                      open: 'Offen',
                      sold: 'Verkauft',
                      ausarbeitung: 'Ausarbeitung',
                      stats: 'Statistik',
                      personal_stats: 'Persönlich',
                    };

                    const isSelected = startTab === tab;

                    return (
                      <button
                        key={tab}
                        onClick={() => handleSaveStartTab(tab)}
                        className={`py-2 px-3 rounded-xl text-xs font-bold uppercase tracking-wider text-center active:scale-95 transition-all border cursor-pointer ${
                          isSelected 
                            ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
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

              {/* Section 3: Admin perspective settings (Admins only) */}
              {isAdmin && (
                <div className="space-y-2 bg-white dark:bg-zinc-900 p-5 rounded-2xl border border-slate-200/80 dark:border-zinc-800 shadow-xs">
                  <div className="flex items-center gap-1.5 pl-1">
                    <Compass className="w-3.5 h-3.5 text-slate-400" />
                    <label className="text-[10px] font-black text-slate-450 dark:text-zinc-400 uppercase tracking-widest block">
                      Standard-Perspektive
                    </label>
                  </div>
                  <div className="grid grid-cols-2 gap-2 pt-1.5">
                    <button
                      onClick={() => handleSavePerspective('all')}
                      className={`py-2 px-3 rounded-xl text-xs font-bold uppercase tracking-wider text-center active:scale-95 transition-all border cursor-pointer ${
                        perspectiveSetting === 'all'
                          ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                          : 'bg-slate-50 border-slate-200 dark:bg-zinc-950 dark:border-zinc-800 text-slate-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-850'
                      }`}
                    >
                      Gesamtes Team
                    </button>
                    <button
                      onClick={() => handleSavePerspective('own')}
                      className={`py-2 px-3 rounded-xl text-xs font-bold uppercase tracking-wider text-center active:scale-95 transition-all border cursor-pointer ${
                        perspectiveSetting === 'own'
                          ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
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

            {/* Right Column: Themes */}
            <div className="space-y-4">
              <div className="space-y-2 bg-white dark:bg-zinc-900 p-5 rounded-2xl border border-slate-200/80 dark:border-zinc-800 shadow-xs">
                <div className="flex items-center gap-1.5 pl-1 mb-2">
                  <Palette className="w-3.5 h-3.5 text-slate-400" />
                  <label className="text-[10px] font-black text-slate-450 dark:text-zinc-400 uppercase tracking-widest block">
                    Design & Farbschema wählen
                  </label>
                </div>
                
                <div className="grid grid-cols-1 gap-2.5 pt-1 select-none">
                  {themes.map((t) => {
                    const isSelected = (theme || 'light') === t.id;
                    return (
                      <button
                        key={t.id}
                        onClick={() => handleSelectTheme(t.id)}
                        className={`flex items-center justify-between p-3.5 rounded-2xl border active:scale-98 transition-all cursor-pointer ${
                          isSelected 
                            ? 'border-blue-500 bg-blue-50/50 dark:border-blue-400 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 font-bold shadow-xs'
                            : 'border-slate-200 bg-slate-50/60 dark:border-zinc-800 dark:bg-zinc-950/60 hover:bg-slate-100/80 dark:hover:bg-zinc-850 text-slate-700 dark:text-zinc-200'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div 
                            className="theme-preview-box w-8 h-8 rounded-xl flex items-center justify-center shadow-inner overflow-hidden border border-slate-200/50 dark:border-zinc-800"
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
                          <span className="text-xs font-black uppercase tracking-wider">
                            {t.name}
                          </span>
                        </div>

                        {isSelected && (
                          <div className="w-5 h-5 rounded-full bg-blue-600 dark:bg-blue-500 text-white flex items-center justify-center">
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

          {/* Logout button at bottom (ONLY in Einstellungen) */}
          <div className="border-t border-slate-200/60 dark:border-zinc-800 pt-6 mt-4">
            <button
              onClick={onLogout}
              className="w-full py-3 rounded-xl font-bold text-xs uppercase tracking-widest bg-red-500/10 text-red-600 hover:bg-red-500 hover:text-white transition-colors active:scale-95 shadow-sm cursor-pointer"
            >
              Abmelden
            </button>
          </div>

        </div>
      )}

      {/* Schwebendes Toast-Pop-Up: In Cloud gesichert (wird bei Änderung einer Einstellung angezeigt) */}
      {cloudToast.visible && activeSection === 'settings' && (
        <div className="fixed bottom-6 right-6 z-50 animate-in fade-in slide-in-from-bottom-3 duration-200 pointer-events-none">
          <div className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-slate-900/90 dark:bg-zinc-850/95 text-white shadow-2xl backdrop-blur-md border border-slate-700/60 dark:border-zinc-700/80 ring-1 ring-black/10">
            {cloudToast.isSaving ? (
              <>
                <Sparkles className="w-3.5 h-3.5 text-blue-400 animate-spin shrink-0" />
                <span className="text-xs font-semibold tracking-wide text-slate-200">
                  Speichere in Cloud...
                </span>
              </>
            ) : (
              <>
                <div className="w-4 h-4 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                  <Check className="w-3 h-3 stroke-[3]" />
                </div>
                <span className="text-xs font-bold tracking-wide text-emerald-300">
                  In Cloud gesichert
                </span>
              </>
            )}
          </div>
        </div>
      )}

      {/* Restore Confirmation Modal */}
      {isConfirmOpen && pendingBackup && (
        <div className="fixed inset-0 bg-black/65 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-805 p-6 md:p-8 max-w-sm w-full rounded-2xl shadow-2xl relative overflow-hidden text-slate-800 dark:text-zinc-200">
            <div className="absolute -right-16 -top-16 w-56 h-56 rounded-full blur-3xl pointer-events-none bg-red-500/8 dark:bg-red-400/5" />
            
            <div className="relative z-10">
              <div className="w-12 h-12 bg-red-500/10 rounded-2xl flex items-center justify-center mb-4">
                <AlertTriangle className="w-6 h-6 text-red-600 dark:text-red-400" />
              </div>
              
              <h3 className="text-sm font-black uppercase tracking-widest text-red-600 dark:text-red-405 mb-2">
                Backup einspielen?
              </h3>
              
              <p className="text-[10px] text-slate-500 dark:text-zinc-400 leading-relaxed mb-4">
                Achtung: Dies überschreibt <strong>alle</strong> aktuellen Angebote, Ausarbeitungen und Systemeinstellungen in deiner Datenbank unwiderruflich! Dieser Vorgang kann nicht rückgängig gemacht werden.
              </p>

              <div className="bg-slate-50 dark:bg-zinc-950 p-4 rounded-xl border border-slate-100 dark:border-zinc-850 space-y-2 mb-5">
                <h4 className="text-[9px] font-black text-slate-400 dark:text-zinc-500 uppercase tracking-widest">
                  Inhalt des hochgeladenen Backups:
                </h4>
                <div className="grid grid-cols-2 gap-2 text-[10px] font-mono">
                  <div className="text-slate-500 dark:text-zinc-400">Angebote:</div>
                  <div className="font-bold text-slate-800 dark:text-zinc-200">
                    {pendingBackup.commissions?.length ?? 0}
                  </div>
                  
                  <div className="text-slate-500 dark:text-zinc-400">Ausarbeitungen:</div>
                  <div className="font-bold text-slate-800 dark:text-zinc-200">
                    {pendingBackup.ausarbeitungen?.length ?? 0}
                  </div>
                  
                  <div className="text-slate-500 dark:text-zinc-400">Standard Umsatzziel:</div>
                  <div className="font-bold text-slate-800 dark:text-zinc-200">
                    {pendingBackup.settings?.annualTarget ? formatter.format(pendingBackup.settings.annualTarget) : '-'}
                  </div>

                  <div className="text-slate-500 dark:text-zinc-400">Exportiert am:</div>
                  <div className="font-bold text-slate-800 dark:text-zinc-200 truncate" title={pendingBackup.exportedAt}>
                    {pendingBackup.exportedAt ? new Date(pendingBackup.exportedAt).toLocaleString('de-DE') : 'Unbekannt'}
                  </div>
                </div>
              </div>

              <div className="space-y-2 mb-6">
                <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 block">
                  Bestätigung erforderlich:
                </label>
                <p className="text-[9px] text-slate-400">
                  Bitte tippe das Wort <span className="font-bold text-slate-800 dark:text-white select-all">WIEDERHERSTELLEN</span> ein, um fortzufahren.
                </p>
                <input
                  type="text"
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  placeholder="WIEDERHERSTELLEN"
                  className="input-field text-xs text-center font-bold tracking-widest bg-slate-50 dark:bg-zinc-950 dark:text-white border-slate-200 dark:border-zinc-850 px-2.5 py-1.5 w-full"
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setIsConfirmOpen(false);
                    setPendingBackup(null);
                  }}
                  disabled={isRestoring}
                  className="flex-1 py-3 rounded-xl font-bold text-[10px] uppercase tracking-widest bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-350 hover:bg-slate-200 dark:hover:bg-zinc-700 cursor-pointer active:scale-95 transition-all text-center"
                >
                  Abbrechen
                </button>
                <button
                  onClick={async () => {
                    if (confirmText !== 'WIEDERHERSTELLEN' || isRestoring || !onImportBackup) return;
                    setIsRestoring(true);
                    try {
                      await onImportBackup(pendingBackup);
                      setIsConfirmOpen(false);
                      setPendingBackup(null);
                      alert('Backup erfolgreich eingespielt!');
                    } catch (err: any) {
                      // Handled in onImportBackup, but close modal as safety
                      setIsConfirmOpen(false);
                      setPendingBackup(null);
                    } finally {
                      setIsRestoring(false);
                    }
                  }}
                  disabled={confirmText !== 'WIEDERHERSTELLEN' || isRestoring}
                  className="flex-1 py-3 rounded-xl font-bold text-[10px] uppercase tracking-widest bg-red-600 hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed text-white shadow-md shadow-red-600/20 cursor-pointer active:scale-95 transition-all text-center flex items-center justify-center gap-2"
                >
                  {isRestoring ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Wird eingespielt...</span>
                    </>
                  ) : (
                    <span>Einspielen</span>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
