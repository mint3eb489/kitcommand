/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Users, Trash2, Calendar, Target, Edit, Shield } from 'lucide-react';

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
}) => {
  const [targetInput, setTargetInput] = useState('');
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [savingAdmins, setSavingAdmins] = useState(false);
  const [saving, setSaving] = useState(false);

  // States for yearly target administration
  const [yearInput, setYearInput] = useState(new Date().getFullYear().toString());
  const [yearlyTargetInput, setYearlyTargetInput] = useState('');

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

  const handleSaveYearly = async () => {
    const year = yearInput.trim();
    if (!year || isNaN(parseInt(year))) return;

    // Convert e.g., "1.200.000" -> number
    const cleanVal = yearlyTargetInput.replace(/\./g, '').replace(',', '.');
    const parsed = parseFloat(cleanVal);

    if (!isNaN(parsed) && parsed > 0) {
      try {
        await onSaveYearlyTarget(year, parsed);
        setYearlyTargetInput('');
      } catch (err) {
        console.error('Failed to save yearly target:', err);
      }
    }
  };

  const formatter = new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  });

  return (
    <div id="tab-admin" className="flex flex-col min-h-[500px] space-y-6">
      <div className="border-b border-slate-200/60 dark:border-zinc-800 pb-4">
        <h2 className="text-[10px] font-black uppercase tracking-widest text-slate-400">
          System & Admin
        </h2>
        <p className="text-xs text-slate-500 mt-1">Zentrale Einstellungen für dein KitCommand.</p>
      </div>

      <div className="space-y-6 flex-1">
        {/* Block: Standard-Ziel (Fallback) */}
        <div className="relative overflow-hidden isolate bg-white dark:bg-zinc-900 rounded-xl p-5 border border-slate-200 dark:border-zinc-800 shadow-xs transition-all duration-300 group/admin-card hover:border-slate-350 dark:hover:border-zinc-700">
          {/* Ambient Glow for Admin */}
          <div className="absolute -right-16 -top-16 w-56 h-56 rounded-full blur-3xl pointer-events-none opacity-0 group-hover/admin-card:opacity-100 transition-opacity duration-500 bg-indigo-500/12 dark:bg-indigo-400/8" />
          
          <div className="relative z-10 flex items-center gap-2 mb-3">
            <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
              <Target className="w-4 h-4" />
            </div>
            <h3 className="text-xs font-black uppercase tracking-widest text-slate-800 dark:text-slate-200">
              Umsatzziel (Standard)
            </h3>
          </div>

          <div className="relative z-10 flex flex-col gap-2">
            <label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">
              Standard-Jahresumsatzziel (€)
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={targetInput}
                onChange={(e) => setTargetInput(e.target.value)}
                inputMode="decimal"
                className="input-field text-sm font-mono text-left bg-slate-50 dark:bg-zinc-950 dark:text-white"
                placeholder="z. B. 1.500.000"
              />
              <button
                onClick={handleSave}
                disabled={saving}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 rounded-xl font-bold text-[10px] uppercase tracking-widest shadow-md shadow-blue-600/20 active:scale-95 transition-all whitespace-nowrap cursor-pointer disabled:opacity-50"
              >
                {saving ? 'Speichert...' : 'Speichern'}
              </button>
            </div>
            <p className="text-[9px] text-slate-400 mt-1">
              Dieses Standard-Ziel gilt als Ausweichwert, falls für ein bestimmtes Jahr kein individuelles Umsatzziel hinterlegt ist.
            </p>
          </div>
        </div>

        {/* Block: Jährliche Ziele hinterlegen */}
        <div className="relative overflow-hidden isolate bg-white dark:bg-zinc-900 rounded-xl p-5 border border-slate-200 dark:border-zinc-800 shadow-xs transition-all duration-300 group/admin-card hover:border-slate-350 dark:hover:border-zinc-700">
          {/* Ambient Glow for Admin */}
          <div className="absolute -right-16 -top-16 w-56 h-56 rounded-full blur-3xl pointer-events-none opacity-0 group-hover/admin-card:opacity-100 transition-opacity duration-500 bg-indigo-500/12 dark:bg-indigo-400/8" />
          
          <div className="relative z-10 flex items-center gap-2 mb-3">
            <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <Calendar className="w-4 h-4" />
            </div>
            <h3 className="text-xs font-black uppercase tracking-widest text-slate-800 dark:text-slate-200">
              Jährliche Umsatzziele
            </h3>
          </div>
          <p className="relative z-10 text-[10px] text-slate-400 mb-4">
            Definiere deine Umsatzziele für einzelne Jahre individuell.
          </p>
          
          <div className="relative z-10 grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">
                Jahr
              </label>
              <input
                type="number"
                min="2020"
                max="2100"
                value={yearInput}
                onChange={(e) => setYearInput(e.target.value)}
                className="input-field text-sm font-mono text-left bg-slate-50 dark:bg-zinc-950 dark:text-white"
                placeholder="z.B. 2026"
              />
            </div>
            
            <div className="flex flex-col gap-1.5 sm:col-span-2">
              <label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">
                Umsatzziel für {yearInput || '...'} (€)
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={yearlyTargetInput}
                  onChange={(e) => setYearlyTargetInput(e.target.value)}
                  inputMode="decimal"
                  className="input-field text-sm font-mono text-left bg-slate-50 dark:bg-zinc-950 dark:text-white flex-1"
                  placeholder="z. B. 1.200.000"
                />
                <button
                  onClick={handleSaveYearly}
                  className="bg-emerald-600 hover:bg-emerald-750 text-white px-4 rounded-xl font-bold text-[10px] uppercase tracking-widest shadow-md shadow-emerald-600/20 active:scale-95 transition-all whitespace-nowrap cursor-pointer"
                >
                  Speichern
                </button>
              </div>
            </div>
          </div>

          {/* List of custom annual budgets */}
          {Object.keys(yearlyTargets || {}).length > 0 && (
            <div className="relative z-10 space-y-2 mt-5 pt-5 border-t border-slate-100 dark:border-zinc-800">
              <h4 className="text-[9px] font-black text-slate-400 dark:text-zinc-500 uppercase tracking-widest mb-3">
                Eingetragene Jahres-Umsatzziele
              </h4>
              <div className="grid grid-cols-1 gap-2">
                {Object.entries(yearlyTargets)
                  .sort((a, b) => b[0].localeCompare(a[0]))
                  .map(([yr, val]) => (
                    <div 
                      key={yr} 
                      className="flex justify-between items-center bg-slate-50 dark:bg-zinc-950 p-2.5 px-4 rounded-xl border border-slate-100 dark:border-zinc-800/80 hover:border-slate-200 dark:hover:border-zinc-700 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <span className="font-bold text-xs text-slate-800 dark:text-zinc-200">Jahr {yr}</span>
                        <span className="text-xs font-extrabold font-mono text-blue-600 dark:text-blue-400">
                          {formatter.format(val as number)}
                        </span>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            setYearInput(yr);
                            setYearlyTargetInput((val as number).toString().replace('.', ','));
                          }}
                          className="p-1.5 rounded-lg border border-slate-200 dark:border-zinc-800 text-slate-500 hover:text-slate-800 dark:hover:text-zinc-200 bg-white dark:bg-zinc-900 shadow-3xs cursor-pointer active:scale-95 transition-all flex items-center gap-1 text-[9px] uppercase font-bold tracking-wider"
                          title="Umsatzziel bearbeiten"
                        >
                          <Edit className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">Bearbeiten</span>
                        </button>
                        <button
                          onClick={() => onDeleteYearlyTarget(yr)}
                          className="p-1.5 rounded-lg text-red-500 bg-red-500/10 hover:bg-red-500 hover:text-white cursor-pointer active:scale-95 transition-all flex items-center gap-1 text-[9px] uppercase font-bold tracking-wider"
                          title="Umsatzziel löschen"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">Löschen</span>
                        </button>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>

        {/* Team block live members */}
        <div className="relative overflow-hidden isolate bg-white dark:bg-zinc-900 rounded-xl p-5 border border-slate-200 dark:border-zinc-800 shadow-xs transition-all duration-300 group/admin-card hover:border-slate-350 dark:hover:border-zinc-700">
          {/* Ambient Glow for Admin */}
          <div className="absolute -right-16 -top-16 w-56 h-56 rounded-full blur-3xl pointer-events-none opacity-0 group-hover/admin-card:opacity-100 transition-opacity duration-500 bg-blue-500/10 dark:bg-blue-400/5" />
          
          <div className="relative z-10 flex items-center justify-between mb-4 pb-3 border-b border-slate-150 dark:border-zinc-800/80">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-450">
                <Users className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs font-black uppercase tracking-widest text-slate-800 dark:text-slate-200">
                  Mitarbeiter- & Team-Verzeichnis
                </h3>
                <p className="text-[9px] text-slate-400 mt-0.5">Übersicht aller im System registrierten Accounts mit Umsatzbeiträgen.</p>
              </div>
            </div>
            <span className="bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 text-[9px] px-2 py-0.5 rounded-full font-black">
              {allTeammates.length} {allTeammates.length === 1 ? 'Benutzer' : 'Benutzer'}
            </span>
          </div>

          <p className="relative z-10 text-[10px] text-slate-500 dark:text-slate-400 leading-relaxed mb-4">
            <span className="text-emerald-600 dark:text-emerald-400 font-extrabold">Aktive Daten-Isolation:</span> Mitarbeiter arbeiten geschützt in ihrem persönlichen Benutzerkonto. Als Administrator hast du vollen Lesezugriff auf alle Aufträge deiner Kollegen über die Perspektiven-Filterleiste unter der Suche.
          </p>

          <div className="relative z-10 space-y-2">
            {allTeammates.map((email) => {
              const isAdminUser = adminEmails.includes(email.toLowerCase());
              return (
                <div 
                  key={email}
                  className="flex items-center justify-between bg-slate-50 dark:bg-zinc-950 p-2.5 px-4 rounded-xl border border-slate-100 dark:border-zinc-800/80 hover:border-slate-200 dark:hover:border-zinc-750 transition-colors"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="relative shrink-0">
                      <div className="w-7 h-7 rounded-full bg-slate-200 dark:bg-zinc-800 flex items-center justify-center text-[10px] font-black text-slate-600 dark:text-zinc-400 uppercase select-none">
                        {email.charAt(0)}
                      </div>
                      <span className="absolute bottom-0 right-0 w-2 h-2 rounded-full bg-green-500 border-2 border-white dark:border-zinc-950"></span>
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-800 dark:text-zinc-200 truncate font-mono">
                        {email}
                      </p>
                      <p className="text-[8px] text-slate-400 uppercase tracking-widest font-black mt-0.5">
                        Status: <span className="text-emerald-500">Live</span>
                      </p>
                    </div>
                  </div>
                  <span className={`text-[8px] sm:text-[9px] font-black uppercase tracking-wider px-2 py-1 rounded-md shrink-0 select-none ${
                    isAdminUser 
                      ? 'bg-amber-500/10 text-amber-600 dark:text-amber-450 border border-amber-500/15' 
                      : 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/15'
                  }`}>
                    {isAdminUser ? 'Admin' : 'Verkäufer'}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Block: Administrator-Rechte verwalten */}
        <div className="relative overflow-hidden isolate bg-white dark:bg-zinc-900 rounded-xl p-5 border border-slate-200 dark:border-zinc-800 shadow-xs transition-all duration-300 group/admin-card hover:border-slate-350 dark:hover:border-zinc-700">
          <div className="absolute -right-16 -top-16 w-56 h-56 rounded-full blur-3xl pointer-events-none opacity-0 group-hover/admin-card:opacity-100 transition-opacity duration-500 bg-amber-500/10 dark:bg-amber-400/5" />
          
          <div className="relative z-10 flex items-center gap-2 mb-3">
            <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <Shield className="w-4 h-4" />
            </div>
            <h3 className="text-xs font-black uppercase tracking-widest text-slate-800 dark:text-slate-200">
              Admin-Rechte verwalten
            </h3>
          </div>
          
          <p className="relative z-10 text-[10px] text-slate-500 dark:text-slate-400 mb-4 leading-relaxed">
            Hinterlege hier die E-Mail-Adressen von Teammitgliedern, die vollen Administrator-Zugriff (alle Statistiken, alle Verkäufe und Einstellungen) erhalten sollen.
          </p>

          <div className="relative z-10 flex gap-2">
            <input
              type="email"
              value={newAdminEmail}
              onChange={(e) => setNewAdminEmail(e.target.value)}
              className="input-field text-sm font-mono text-left bg-slate-50 dark:bg-zinc-950 dark:text-white flex-1"
              placeholder="z. B. kollege@fs-kuechen.de"
            />
            <button
              onClick={async () => {
                const target = newAdminEmail.trim().toLowerCase();
                if (!target || !target.includes('@') || savingAdmins) return;
                setSavingAdmins(true);
                try {
                  const updatedAdmins = Array.from(new Set([...adminEmails, target]));
                  if (onSaveAdminEmails) {
                    await onSaveAdminEmails(updatedAdmins);
                  }
                  setNewAdminEmail('');
                } catch (e) {
                  console.error(e);
                } finally {
                  setSavingAdmins(false);
                }
              }}
              disabled={savingAdmins}
              className="bg-amber-500 hover:bg-amber-600 text-white px-4 rounded-xl font-bold text-[10px] uppercase tracking-widest shadow-md shadow-amber-500/15 cursor-pointer disabled:opacity-50"
            >
              Hinzufügen
            </button>
          </div>

          <div className="relative z-10 space-y-2 mt-5 pt-5 border-t border-slate-100 dark:border-zinc-800">
            <h4 className="text-[9px] font-black text-slate-400 dark:text-zinc-500 uppercase tracking-widest mb-3">
              Aktive Administratoren ({adminEmails.length})
            </h4>
            <div className="grid grid-cols-1 gap-2">
              {adminEmails.map((email) => {
                const isSystemAdmin = ['belmonte@fs-kuechen.de', 'belmonte.enrico@gmail.com'].includes(email.toLowerCase());
                return (
                  <div 
                    key={email}
                    className="flex justify-between items-center bg-slate-50 dark:bg-zinc-950 p-2.5 px-4 rounded-xl border border-slate-100 dark:border-zinc-800/80"
                  >
                    <span className="text-xs font-bold text-slate-800 dark:text-zinc-200 font-mono truncate mr-2">
                      {email}
                    </span>
                    {isSystemAdmin ? (
                      <span className="text-[8px] font-black uppercase text-slate-450 px-2 py-1 select-none">
                        System / Inhaber
                      </span>
                    ) : (
                      <button
                        onClick={async () => {
                          if (savingAdmins) return;
                          setSavingAdmins(true);
                          try {
                            const updatedAdmins = adminEmails.filter(e => e.toLowerCase() !== email.toLowerCase());
                            if (onSaveAdminEmails) {
                              await onSaveAdminEmails(updatedAdmins);
                            }
                          } catch (e) {
                            console.error(e);
                          } finally {
                            setSavingAdmins(false);
                          }
                        }}
                        className="p-1.5 rounded-lg text-red-500 bg-red-500/10 hover:bg-red-500 hover:text-white cursor-pointer active:scale-95 transition-all text-[9px] uppercase font-bold tracking-wider"
                        title="Entziehen"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Logout button at bottom */}
      <div className="border-t border-slate-200/60 dark:border-zinc-800 pt-6 mt-auto">
        <button
          onClick={onLogout}
          className="w-full py-3 rounded-xl font-bold text-xs uppercase tracking-widest bg-red-500/10 text-red-650 hover:bg-red-500 hover:text-white transition-colors active:scale-95 shadow-sm cursor-pointer"
        >
          Abmelden
        </button>
      </div>
    </div>
  );
};
