/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Users, Trash2, Calendar, Target, Edit, Shield, UserPlus, CheckCircle, Save, Check, X, User, Database, Download, Upload, AlertTriangle, RefreshCw } from 'lucide-react';
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
  onOpenUserProfile?: (email: string) => void;
  commissions?: any[];
  ausarbeitungen?: any[];
  onImportBackup?: (backupData: any) => Promise<void>;
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
}) => {
  const [targetInput, setTargetInput] = useState('');
  const [savingAdmins, setSavingAdmins] = useState(false);
  const [saving, setSaving] = useState(false);

  // States for teammate administration
  const [newTeammateEmail, setNewTeammateEmail] = useState('');
  const [newTeammateName, setNewTeammateName] = useState('');
  const [editingTeammateEmail, setEditingTeammateEmail] = useState<string | null>(null);
  const [editingTeammateName, setEditingTeammateName] = useState('');
  const [savingTeammates, setSavingTeammates] = useState(false);

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
              // Surface all teammate configurations + auto-detected ones from allTeammates & adminEmails
              const configuredEmails = teammates.map(t => t.email.toLowerCase().trim());
              const displayList: { email: string; name: string; isActive: boolean; isConfigured: boolean }[] = [
                ...teammates.map(t => ({ email: t.email, name: t.name, isActive: t.isActive, isConfigured: true }))
              ];

              allTeammates.forEach(email => {
                const emLower = email.toLowerCase().trim();
                const alreadyAdded = displayList.some(d => d.email.toLowerCase().trim() === emLower);
                if (!alreadyAdded) {
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

              if (displayList.length === 0) {
                return <p className="text-center font-mono text-[10px] text-slate-400 py-3">Keine Verkäufer vorhanden.</p>;
              }

              return displayList.map((item) => {
                const isEditing = editingTeammateEmail === item.email;
                const isAdminUser = adminEmails.map(e => e.toLowerCase().trim()).includes(item.email.toLowerCase().trim());
                const isSystemAdmin = ['belmonte@fs-kuechen.de', 'belmonte.enrico@gmail.com'].includes(item.email.toLowerCase().trim());

                // Unified save function for editing teammate details & target inline
                const handleSaveEditing = async () => {
                  const trimmedName = editingTeammateName.trim();
                  if (!trimmedName || !onSaveTeammates) return;
                  setSavingTeammates(true);
                  try {
                    // 1. Save display name preserving list order
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

                    // 2. Save yearly target if specified in sliding field
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
                    className={`flex flex-col bg-slate-50 dark:bg-zinc-950 rounded-xl border transition-all duration-300 ${
                      item.isActive ? 'border-slate-100 dark:border-zinc-800/80 hover:border-slate-200 dark:hover:border-zinc-700' : 'border-slate-200/40 dark:border-zinc-900 opacity-60'
                    }`}
                  >
                    {/* Main Teammate row */}
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 p-3 px-4 min-h-[56px]">
                      {/* Left: Avatar + Name / Edit Name input */}
                      <div 
                        onClick={() => {
                          if (!isEditing && onOpenUserProfile) {
                            onOpenUserProfile(item.email);
                          }
                        }}
                        className={`flex items-center gap-2.5 min-w-0 flex-1 ${!isEditing && onOpenUserProfile ? 'cursor-pointer group/item select-none' : ''}`}
                        title={!isEditing && onOpenUserProfile ? `Klicken, um das Mitarbeiterprofil von ${item.name} anzuzeigen` : undefined}
                      >
                        <div className="relative shrink-0 select-none">
                          <div className="w-8 h-8 rounded-full bg-slate-250 dark:bg-zinc-850 flex items-center justify-center text-[10.5px] font-black text-slate-600 dark:text-zinc-400 uppercase transition-all group-hover/item:scale-105 group-hover/item:ring-2 group-hover/item:ring-indigo-500/35">
                            {item.name.charAt(0)}
                          </div>
                          <span className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-white dark:border-zinc-950 ${item.isActive ? 'bg-green-500' : 'bg-slate-400'}`}></span>
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
                                className="input-field text-xs bg-white dark:bg-zinc-900 border-slate-300 dark:border-zinc-800 px-2 py-1 h-7 border rounded text-left active:border-blue-500 focus:border-blue-500 w-full max-w-[160px]"
                                placeholder="Anzeigename"
                              />
                            </div>
                          ) : (
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="text-xs font-black text-slate-800 dark:text-zinc-200 group-hover/item:text-indigo-650 dark:group-hover/item:text-indigo-400 transition-colors">
                                {item.name}
                              </span>
                              {!item.isConfigured ? (
                                <span className="text-[7px] font-black uppercase text-slate-400 bg-slate-100 dark:bg-zinc-900 border border-slate-200/50 px-1 rounded select-none">
                                  Auto-erfasst
                                </span>
                              ) : null}
                              {isAdminUser && (
                                <span className={`admin-badge-inline text-[7.5px] font-black uppercase px-1 rounded select-none ${isSystemAdmin ? 'admin-badge-purp text-indigo-600 bg-indigo-500/10 border border-indigo-500/20' : 'admin-badge-amb text-amber-600 bg-amber-500/10 border border-amber-500/20'}`}>
                                  {isSystemAdmin ? 'Sys-Admin' : 'Admin'}
                                </span>
                              )}
                            </div>
                          )}
                          <p className="text-[10px] font-mono text-slate-400 dark:text-zinc-500 truncate mt-0.5 select-all" onClick={(e) => e.stopPropagation()}>
                            {item.email}
                          </p>
                        </div>
                      </div>

                      {/* Middle: Side-sliding targets panel */}
                      <div className={`overflow-hidden transition-all duration-300 flex items-center shrink-0 ${
                        activeTargetEmail === item.email 
                          ? 'max-w-[340px] opacity-100 mx-1 md:mx-3' 
                          : 'max-w-0 opacity-0 pointer-events-none'
                      }`}>
                        {isEditing ? (
                          <div className="flex items-center gap-1.5 bg-blue-50/50 dark:bg-zinc-900/50 border border-blue-150 dark:border-zinc-800/85 p-1 px-1.5 rounded-lg">
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
                              className="input-field text-xs font-mono w-[64px] bg-white dark:bg-zinc-950 border-slate-300 dark:border-zinc-800 h-7 text-center rounded px-1 focus:border-blue-500"
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
                              className="input-field text-xs font-mono w-[110px] bg-white dark:bg-zinc-950 border-slate-300 dark:border-zinc-800 h-7 text-right rounded px-1 focus:border-blue-500"
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
                                  className="flex items-center gap-1 bg-blue-500/10 dark:bg-blue-500/5 text-blue-700 dark:text-blue-400 border border-blue-500/15 p-0.5 px-2 rounded-lg text-[9px] font-black whitespace-nowrap"
                                >
                                  <span>{tgt.year}: {formatter.format(tgt.value)}</span>
                                  <button
                                    onClick={async (e) => {
                                      e.stopPropagation();
                                      await onDeleteYearlyTarget(tgt.key);
                                    }}
                                    className="p-0.5 text-blue-600 hover:text-red-500 rounded hover:bg-slate-200 dark:hover:bg-zinc-850 cursor-pointer ml-0.5"
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

                      {/* Right: Actions */}
                      <div className="flex items-center gap-1.5 sm:self-center self-end shrink-0 flex-wrap">
                        {isEditing ? (
                          <div className="flex items-center gap-1">
                            <button
                              onClick={handleSaveEditing}
                              className="p-1 px-2.5 rounded-lg bg-green-600 hover:bg-green-700 text-white text-[9px] font-black uppercase tracking-wider flex items-center gap-1 cursor-pointer active:scale-95 transition-all"
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
                              className="p-1 px-2.5 rounded-lg bg-slate-200 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 hover:bg-slate-300 text-[9px] font-black uppercase tracking-wider flex items-center gap-1 cursor-pointer active:scale-95 transition-all"
                              title="Abbrechen"
                            >
                              <X className="w-3 h-3" />
                              <span>Abbrechen</span>
                            </button>
                          </div>
                        ) : (
                          <>
                            {/* Profile View button */}
                            {onOpenUserProfile && (
                              <button
                                onClick={() => onOpenUserProfile(item.email)}
                                className="admin-btn-profile flex items-center gap-1 p-1 px-2.5 rounded-lg border border-indigo-200/50 dark:border-indigo-850/50 bg-indigo-50/50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100/80 dark:hover:bg-indigo-900/40 text-[9px] font-black uppercase tracking-wider transition-all duration-200 cursor-pointer active:scale-95"
                                title={`Mitarbeiterprofil von ${item.name} anzeigen`}
                              >
                                <User className="w-3 h-3" />
                                <span>Profil</span>
                              </button>
                            )}

                            {/* Target management button */}
                            <button
                              onClick={() => {
                                if (activeTargetEmail === item.email) {
                                  setActiveTargetEmail(null);
                                } else {
                                  setActiveTargetEmail(item.email);
                                  setMemberYearInput(new Date().getFullYear().toString());
                                  // Prefill target value for the current year
                                  const tKey = `${item.email.toLowerCase().trim()}_${new Date().getFullYear()}`;
                                  const activeTVal = yearlyTargets[tKey];
                                  setMemberTargetInput(activeTVal ? activeTVal.toString() : '');
                                }
                              }}
                              className={`admin-btn-targets flex items-center gap-1 p-1 px-2.5 rounded-lg border text-[9px] font-black uppercase tracking-wider transition-all duration-200 cursor-pointer ${
                                activeTargetEmail === item.email
                                  ? 'admin-btn-targets-active bg-blue-600 border-blue-650 text-white hover:bg-blue-700 font-bold shadow-xs'
                                  : 'admin-btn-targets-inactive bg-slate-100/85 dark:bg-zinc-900 border-slate-200/60 dark:border-zinc-800/80 text-slate-500 hover:text-slate-705 dark:hover:text-zinc-200 dark:hover:bg-zinc-800'
                              }`}
                              title="Umsatz-Ziele einblenden / verwalten"
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
                                className={`admin-btn-role flex items-center gap-1 p-1 px-2.5 rounded-lg border text-[9px] font-black uppercase tracking-wider transition-all duration-200 cursor-pointer ${
                                  isSystemAdmin
                                    ? 'admin-btn-role-sys bg-indigo-500/10 border-indigo-500/20 text-indigo-600 dark:text-indigo-400 opacity-75'
                                    : isAdminUser
                                      ? 'admin-btn-role-admin bg-amber-500/10 border-amber-500/20 text-amber-600 dark:text-amber-400 hover:bg-amber-500/15'
                                      : 'admin-btn-role-user bg-slate-100/85 dark:bg-zinc-900 border-slate-200/60 dark:border-zinc-800/80 text-slate-500 hover:text-slate-755 dark:hover:text-zinc-200 dark:hover:bg-zinc-800'
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
                            <button
                              onClick={() => {
                                setEditingTeammateEmail(item.email);
                                setEditingTeammateName(item.name);
                                // Also auto-open goals to edit both inline!
                                setActiveTargetEmail(item.email);
                                const defaultYr = new Date().getFullYear().toString();
                                setMemberYearInput(defaultYr);
                                const mKey = `${item.email.toLowerCase().trim()}_${defaultYr}`;
                                const activeTVal = yearlyTargets[mKey];
                                setMemberTargetInput(activeTVal ? activeTVal.toString() : '');
                              }}
                              className="p-1.5 rounded-lg border border-slate-200 dark:border-zinc-800 text-slate-500 hover:text-slate-800 dark:hover:text-zinc-200 bg-white dark:bg-zinc-900 hover:border-slate-350 cursor-pointer active:scale-95 transition-all"
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

        {/* Block: Backup & Datenwiederherstellung */}
        <div className="relative overflow-hidden isolate bg-white dark:bg-zinc-900 rounded-xl p-5 border border-slate-200 dark:border-zinc-800 shadow-xs transition-all duration-300 group/admin-card hover:border-slate-350 dark:hover:border-zinc-700">
          <div className="absolute -right-16 -top-16 w-56 h-56 rounded-full blur-3xl pointer-events-none opacity-0 group-hover/admin-card:opacity-100 transition-opacity duration-500 bg-amber-500/10 dark:bg-amber-400/5" />
          
          <div className="relative z-10 flex items-center justify-between mb-4 pb-3 border-b border-slate-150 dark:border-zinc-800/80">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
                <Database className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs font-black uppercase tracking-widest text-slate-800 dark:text-slate-200">
                  Backup & Datenwiederherstellung
                </h3>
                <p className="text-[9px] text-slate-400 mt-0.5">Sichere deine Daten im JSON-Format oder stelle sie aus einem Backup wieder her.</p>
              </div>
            </div>
          </div>

          <div className="relative z-10 space-y-4">
            <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-relaxed">
              Mit dieser Funktion kannst du alle Angebote, Ausarbeitungen, Umsatzziele, Administratoren und Verkäuferkonfigurationen in einer einzigen Datei auf deinem Computer speichern. Im Notfall lässt sich dieser Zustand vollständig wiederherstellen.
            </p>

            <div className="flex flex-wrap gap-3">
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
                className="bg-slate-800 hover:bg-slate-900 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-white p-2.5 px-4 rounded-xl font-bold text-[10px] uppercase tracking-widest flex items-center gap-2 cursor-pointer active:scale-95 transition-all"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Backup herunterladen (JSON)</span>
              </button>

              {/* Import Upload trigger */}
              <label className="bg-amber-600 hover:bg-amber-700 text-white p-2.5 px-4 rounded-xl font-bold text-[10px] uppercase tracking-widest flex items-center gap-2 cursor-pointer active:scale-95 transition-all select-none">
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

      {/* Logout button at bottom */}
      <div className="border-t border-slate-200/60 dark:border-zinc-800 pt-6 mt-auto">
        <button
          onClick={onLogout}
          className="w-full py-3 rounded-xl font-bold text-xs uppercase tracking-widest bg-red-500/10 text-red-600 hover:bg-red-500 hover:text-white transition-colors active:scale-95 shadow-sm cursor-pointer"
        >
          Abmelden
        </button>
      </div>

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
