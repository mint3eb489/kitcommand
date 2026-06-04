/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Users, Trash2, Calendar, Target, Edit, Shield, UserPlus, CheckCircle, Save, Check, X } from 'lucide-react';
import { TeammateConfig } from '../types.ts';

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
}) => {
  const [targetInput, setTargetInput] = useState('');
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [savingAdmins, setSavingAdmins] = useState(false);
  const [saving, setSaving] = useState(false);

  // States for teammate administration
  const [newTeammateEmail, setNewTeammateEmail] = useState('');
  const [newTeammateName, setNewTeammateName] = useState('');
  const [editingTeammateEmail, setEditingTeammateEmail] = useState<string | null>(null);
  const [editingTeammateName, setEditingTeammateName] = useState('');
  const [savingTeammates, setSavingTeammates] = useState(false);

  // States for yearly target administration
  const [yearInput, setYearInput] = useState(new Date().getFullYear().toString());
  const [yearlyTargetInput, setYearlyTargetInput] = useState('');
  const [targetUser, setTargetUser] = useState('all');

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
        const key = targetUser === 'all' ? year : `${targetUser.trim().toLowerCase()}_${year}`;
        await onSaveYearlyTarget(key, parsed);
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
        <p className="text-xs text-slate-500 mt-1">Zentrale Einstellungen für dein KitCommand Pro.</p>
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
            Definiere deine Umsatzziele für einzelne Jahre und Benutzer individuell.
          </p>
          
          <div className="relative z-10 grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div className="flex flex-col gap-1.5 sm:col-span-2">
              <label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">
                Benutzer / Verkäufer
              </label>
              <select
                value={targetUser}
                onChange={(e) => setTargetUser(e.target.value)}
                className="input-field text-xs bg-slate-50 dark:bg-zinc-950 dark:text-white border border-slate-200 dark:border-zinc-800 rounded-xl px-3 py-2 outline-none"
              >
                <option value="all" className="font-bold bg-white dark:bg-zinc-900 text-slate-800 dark:text-zinc-100">Standard / Gesamtes Team</option>
                {allTeammates.map((email) => {
                  const emailLower = email.toLowerCase().trim();
                  const isAdminUser = adminEmails.includes(emailLower);
                  const conf = teammates.find(t => t.email.toLowerCase().trim() === emailLower);
                  
                  let displayName = '';
                  if (conf && conf.name.trim()) {
                    displayName = conf.name;
                  } else {
                    const prefix = email.split('@')[0];
                    displayName = prefix.charAt(0).toUpperCase() + prefix.slice(1);
                  }

                  return (
                    <option 
                      key={email} 
                      value={email}
                      className="bg-white dark:bg-zinc-900 text-slate-800 dark:text-zinc-100"
                    >
                      {isAdminUser ? `★ ${displayName} (${email})` : `${displayName} (${email})`}
                    </option>
                  );
                })}
              </select>
            </div>

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
                className="input-field text-sm font-mono text-left bg-slate-50 dark:bg-zinc-950 dark:text-white h-[38px]"
                placeholder="z.B. 2026"
              />
            </div>
            
            <div className="flex flex-col gap-1.5">
              <label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">
                Ziel (€)
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={yearlyTargetInput}
                  onChange={(e) => setYearlyTargetInput(e.target.value)}
                  inputMode="decimal"
                  className="input-field text-sm font-mono text-left bg-slate-50 dark:bg-zinc-950 dark:text-white flex-1 h-[38px]"
                  placeholder="z. B. 1.200.000"
                />
                <button
                  onClick={handleSaveYearly}
                  className="bg-emerald-600 hover:bg-emerald-750 text-white px-4 rounded-xl font-bold text-[10px] uppercase tracking-widest shadow-md shadow-emerald-600/20 active:scale-95 transition-all whitespace-nowrap cursor-pointer h-[38px]"
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
                  .sort((a, b) => {
                    const lastUnderscoreA = a[0].lastIndexOf('_');
                    const yrA = lastUnderscoreA !== -1 ? a[0].substring(lastUnderscoreA + 1) : a[0];
                    const lastUnderscoreB = b[0].lastIndexOf('_');
                    const yrB = lastUnderscoreB !== -1 ? b[0].substring(lastUnderscoreB + 1) : b[0];
                    
                    if (yrB !== yrA) {
                      return yrB.localeCompare(yrA);
                    }
                    return a[0].localeCompare(b[0]);
                  })
                  .map(([key, val]) => {
                    const lastUnderscore = key.lastIndexOf('_');
                    const hasUser = lastUnderscore !== -1;
                    const yr = hasUser ? key.substring(lastUnderscore + 1) : key;
                    const email = hasUser ? key.substring(0, lastUnderscore) : null;
                    
                    let userLabel = 'Standard (Alle)';
                    if (email) {
                      const emailLower = email.toLowerCase().trim();
                      const conf = teammates.find(t => t.email.toLowerCase().trim() === emailLower);
                      if (conf && conf.name.trim()) {
                        userLabel = conf.name;
                      } else {
                        const prefix = email.split('@')[0];
                        userLabel = prefix.charAt(0).toUpperCase() + prefix.slice(1);
                      }
                      userLabel = `${userLabel}`;
                    }

                    return (
                      <div 
                        key={key} 
                        className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50 dark:bg-zinc-950 p-2.5 px-4 rounded-xl border border-slate-100 dark:border-zinc-800/80 hover:border-slate-200 dark:hover:border-zinc-700 transition-colors"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-4">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-xs text-slate-800 dark:text-zinc-200">Jahr {yr}</span>
                            <span className="text-[8px] font-black uppercase text-amber-600 bg-amber-500/10 border border-amber-500/15 px-1.5 py-0.5 rounded select-none">
                              {userLabel}
                            </span>
                          </div>
                          <span className="text-xs font-black font-mono text-blue-600 dark:text-blue-400">
                            {formatter.format(val as number)}
                          </span>
                        </div>
                        <div className="flex gap-2 self-end sm:self-auto">
                          <button
                            onClick={() => {
                              setYearInput(yr);
                              setTargetUser(email || 'all');
                              setYearlyTargetInput(val.toString());
                            }}
                            className="p-1.5 rounded-lg border border-slate-200 dark:border-zinc-800 text-slate-500 hover:text-slate-800 dark:hover:text-zinc-200 bg-white dark:bg-zinc-900 shadow-3xs cursor-pointer active:scale-95 transition-all flex items-center gap-1 text-[9px] uppercase font-bold tracking-wider"
                            title="Umsatzziel bearbeiten"
                          >
                            <Edit className="w-3.5 h-3.5" />
                            <span>Bearbeiten</span>
                          </button>
                          <button
                            onClick={() => onDeleteYearlyTarget(key)}
                            className="p-1.5 rounded-lg text-red-500 bg-red-500/10 hover:bg-red-500 hover:text-white cursor-pointer active:scale-95 transition-all flex items-center gap-1 text-[9px] uppercase font-bold tracking-wider"
                            title="Umsatzziel löschen"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Löschen</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}
        </div>

        {/* Team block live members */}
        <div className="relative overflow-hidden isolate bg-white dark:bg-zinc-900 rounded-xl p-5 border border-slate-200 dark:border-zinc-800 shadow-xs transition-all duration-300 group/admin-card hover:border-slate-350 dark:hover:border-zinc-700">
          <div className="absolute -right-16 -top-16 w-56 h-56 rounded-full blur-3xl pointer-events-none opacity-0 group-hover/admin-card:opacity-100 transition-opacity duration-500 bg-blue-500/10 dark:bg-blue-400/5" />
          
          <div className="relative z-10 flex items-center justify-between mb-4 pb-3 border-b border-slate-150 dark:border-zinc-800/80">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-450">
                <Users className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs font-black uppercase tracking-widest text-slate-800 dark:text-slate-200">
                  Mitarbeiter- & Verkäuferverwaltung
                </h3>
                <p className="text-[9px] text-slate-400 mt-0.5">Definiere, wie Namen in Berichten, Filtern und Dropdown-Menüs angezeigt werden.</p>
              </div>
            </div>
            <span className="bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 text-[9px] px-2 py-0.5 rounded-full font-black">
              {allTeammates.length} Account(s)
            </span>
          </div>

          <p className="relative z-10 text-[10px] text-slate-500 dark:text-slate-400 leading-relaxed mb-4">
            <span className="text-emerald-600 dark:text-emerald-450 font-extrabold">Sicherheit & Firebase-Login:</span> Das Ändern oder Hinzufügen von Namen hier dient rein der visuellen Anzeige im System und hat <strong>keinen Einfluss</strong> auf die Firebase-Login-Passwörter oder Zugänge deines Teams. Es gibt keine Login-Kollision.
          </p>

          {/* Form: Add a new managed teammate */}
          <div className="relative z-10 bg-slate-50 dark:bg-zinc-950 p-4 rounded-xl border border-slate-100 dark:border-zinc-900 mb-5 space-y-3">
            <h4 className="text-[9px] font-black text-slate-400 dark:text-zinc-500 uppercase tracking-widest flex items-center gap-1">
              <UserPlus className="w-3 h-3" /> Verkäufer hinzufügen / benennen
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-[8px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wider">E-Mail Adresse</label>
                <input
                  type="email"
                  value={newTeammateEmail}
                  onChange={(e) => setNewTeammateEmail(e.target.value)}
                  className="input-field text-xs font-mono bg-white dark:bg-zinc-900 border-slate-200 dark:border-zinc-800"
                  placeholder="z.B. kollege@fs-kuechen.de"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[8px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wider">Anzeigename / Alias</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newTeammateName}
                    onChange={(e) => setNewTeammateName(e.target.value)}
                    className="input-field text-xs bg-white dark:bg-zinc-900 border-slate-200 dark:border-zinc-800 flex-1 border px-2.5 py-1"
                    placeholder="z.B. Claudio"
                  />
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
                      } catch (err) {
                        console.error(err);
                      } finally {
                        setSavingTeammates(false);
                      }
                    }}
                    disabled={savingTeammates || !newTeammateEmail || !newTeammateName}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white px-3.5 rounded-xl font-bold text-[10px] uppercase tracking-wider shadow-sm active:scale-95 transition-all whitespace-nowrap cursor-pointer disabled:opacity-50"
                  >
                    Hinzufügen
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* List of Teammates */}
          <div className="relative z-10 space-y-2">
            <h4 className="text-[9px] font-black text-slate-400 dark:text-zinc-500 uppercase tracking-widest select-none mb-2">
              Eingetragene Verkäufer & Teammitglieder
            </h4>
            {(() => {
              // Surface all teammate configurations + auto-detected ones from allTeammates
              const configuredEmails = teammates.map(t => t.email.toLowerCase().trim());
              const displayList: { email: string; name: string; isActive: boolean; isConfigured: boolean }[] = [
                ...teammates.map(t => ({ email: t.email, name: t.name, isActive: t.isActive, isConfigured: true }))
              ];

              allTeammates.forEach(email => {
                const emLower = email.toLowerCase().trim();
                if (!configuredEmails.includes(emLower)) {
                  // Fallback name
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

              if (displayList.length === 0) {
                return <p className="text-center font-mono text-[10px] text-slate-400 py-3">Keine Verkäufer vorhanden.</p>;
              }

              return displayList.map((item) => {
                const isEditing = editingTeammateEmail === item.email;
                const isAdminUser = adminEmails.includes(item.email.toLowerCase());

                return (
                  <div 
                    key={item.email}
                    className={`flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 bg-slate-50 dark:bg-zinc-950 p-3 px-4 rounded-xl border transition-all duration-300 ${
                      item.isActive ? 'border-slate-100 dark:border-zinc-800/80 hover:border-slate-200 dark:hover:border-zinc-700' : 'border-slate-200/40 dark:border-zinc-900 opacity-60'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <div className="relative shrink-0 select-none">
                        <div className="w-8 h-8 rounded-full bg-slate-250 dark:bg-zinc-850 flex items-center justify-center text-[10.5px] font-black text-slate-600 dark:text-zinc-400 uppercase">
                          {item.name.charAt(0)}
                        </div>
                        <span className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-white dark:border-zinc-950 ${item.isActive ? 'bg-green-500' : 'bg-slate-400'}`}></span>
                      </div>

                      <div className="min-w-0 flex-1">
                        {isEditing ? (
                          <div className="flex gap-1 items-center mt-0.5">
                            <input
                              type="text"
                              value={editingTeammateName}
                              onChange={(e) => setEditingTeammateName(e.target.value)}
                              className="input-field text-xs bg-white dark:bg-zinc-900 border-slate-300 dark:border-zinc-800 px-2 py-1 h-7 border rounded text-left"
                              placeholder="Anzeigename"
                              onKeyDown={async (e) => {
                                if (e.key === 'Enter') {
                                  const trimmedName = editingTeammateName.trim();
                                  if (!trimmedName || !onSaveTeammates) return;
                                  setSavingTeammates(true);
                                  try {
                                    const existing = teammates.filter(t => t.email.toLowerCase().trim() !== item.email);
                                    const updated = [...existing, { email: item.email, name: trimmedName, isActive: item.isActive }];
                                    await onSaveTeammates(updated);
                                    setEditingTeammateEmail(null);
                                  } catch (err) {
                                    console.error(err);
                                  } finally {
                                    setSavingTeammates(false);
                                  }
                                } else if (e.key === 'Escape') {
                                  setEditingTeammateEmail(null);
                                }
                              }}
                            />
                            <button
                              onClick={async () => {
                                const trimmedName = editingTeammateName.trim();
                                if (!trimmedName || !onSaveTeammates) return;
                                setSavingTeammates(true);
                                try {
                                  const existing = teammates.filter(t => t.email.toLowerCase().trim() !== item.email);
                                  const updated = [...existing, { email: item.email, name: trimmedName, isActive: item.isActive }];
                                  await onSaveTeammates(updated);
                                  setEditingTeammateEmail(null);
                                } catch (err) {
                                  console.error(err);
                                } finally {
                                  setSavingTeammates(false);
                                }
                              }}
                              className="p-1 text-green-600 hover:bg-green-500/10 rounded cursor-pointer"
                              title="Speichern"
                            >
                              <Check className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => setEditingTeammateEmail(null)}
                              className="p-1 text-red-500 hover:bg-red-500/10 rounded cursor-pointer"
                              title="Abbrechen"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-xs font-black text-slate-800 dark:text-zinc-200">
                              {item.name}
                            </span>
                            {!item.isConfigured ? (
                              <span className="text-[7px] font-black uppercase text-slate-400 bg-slate-100 dark:bg-zinc-900 border border-slate-200/50 px-1 rounded select-none">
                                Auto-erfasst
                              </span>
                            ) : null}
                            {isAdminUser && (
                              <span className="text-[7.5px] font-black uppercase text-amber-600 bg-amber-500/10 border border-amber-500/20 px-1 rounded select-none">
                                Admin
                              </span>
                            )}
                          </div>
                        )}
                        <p className="text-[10px] font-mono text-slate-400 dark:text-zinc-500 truncate mt-0.5 select-all">
                          {item.email}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 sm:self-center self-end shrink-0">
                      {/* Active Toggle Button */}
                      {item.isConfigured && (
                        <button
                          onClick={async () => {
                            if (!onSaveTeammates || savingTeammates) return;
                            setSavingTeammates(true);
                            try {
                              const existing = teammates.filter(t => t.email.toLowerCase().trim() !== item.email);
                              const updated = [...existing, { email: item.email, name: item.name, isActive: !item.isActive }];
                              await onSaveTeammates(updated);
                            } catch (err) {
                              console.error(err);
                            } finally {
                              setSavingTeammates(false);
                            }
                          }}
                          className={`p-1 px-2.5 rounded-lg border text-[9px] font-black uppercase tracking-wider transition-all duration-200 cursor-pointer ${
                            item.isActive 
                              ? 'bg-green-500/10 border-green-500/20 text-green-600 dark:text-green-400 hover:bg-green-500/20' 
                              : 'bg-zinc-500/10 border-zinc-500/20 text-zinc-500 hover:bg-zinc-200'
                          }`}
                          title={item.isActive ? "Inaktiv schalten" : "Aktiv schalten"}
                        >
                          {item.isActive ? 'Aktiv' : 'Inaktiv'}
                        </button>
                      )}

                      {/* Edit Button */}
                      {!isEditing && (
                        <button
                          onClick={() => {
                            setEditingTeammateEmail(item.email);
                            setEditingTeammateName(item.name);
                          }}
                          className="p-1.5 rounded-lg border border-slate-200 dark:border-zinc-800 text-slate-500 hover:text-slate-800 dark:hover:text-zinc-200 bg-white dark:bg-zinc-900 hover:border-slate-350 cursor-pointer active:scale-95 transition-all"
                          title="Anzeigenamen anpassen"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                      )}

                      {/* Delete configured teammate button */}
                      {item.isConfigured && (
                        <button
                          onClick={async () => {
                            if (!onSaveTeammates || savingTeammates) return;
                            setSavingTeammates(true);
                            try {
                              const updated = teammates.filter(t => t.email.toLowerCase().trim() !== item.email);
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
                    </div>
                  </div>
                );
              });
            })()}
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
