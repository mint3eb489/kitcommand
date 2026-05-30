/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from 'react';
import { Commission } from '../types.ts';
import { Pencil, ClipboardList, RefreshCw, Trash2, Calendar, Check, X } from 'lucide-react';

interface CommissionCardProps {
  commission: Commission;
  onResolve: (id: string, status: 'sold' | 'lost') => void;
  onReopen: (id: string) => void;
  onDelete: (id: string) => void;
  onEditPrice: (id: string, currentPrice: number) => void;
  onEditDate: (id: string, currentResolvedAt: string) => void;
  onEditNote: (id: string) => void;
  onUpdateField: (id: string, field: string, value: any) => void;
  onCycleBauart: (id: string, currentType: 'bestand' | 'neubau' | 'kleinauftrag') => void;
}

export const CommissionCard: React.FC<CommissionCardProps> = ({
  commission,
  onResolve,
  onReopen,
  onDelete,
  onEditPrice,
  onEditDate,
  onEditNote,
  onUpdateField,
  onCycleBauart,
}) => {
  // Swipe State
  const [translateX, setTranslateX] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);
  const touchStart = useRef({ x: 0, y: 0 });
  const animating = useRef(false);

  // Note inline editing state
  const [isEditingNote, setIsEditingNote] = useState(false);
  const [tempNoteText, setTempNoteText] = useState(commission.note || '');

  const threshold = 80;

  // Swipe Action Calculations
  const isSoldOrLost = commission.status === 'sold' || commission.status === 'lost';
  const rightActionText = isSoldOrLost ? 'Zurück' : 'Verkauft';
  const rightActionColor = isSoldOrLost ? 'text-slate-500' : 'text-emerald-500';

  const leftActionText = commission.status === 'open' ? 'Absagen' : 'Löschen';
  const leftActionColor = 'text-red-500';

  // Touch Event Handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    if (animating.current) return;
    touchStart.current = {
      x: e.touches[0].clientX,
      y: e.touches[0].clientY,
    };
    setIsSwiping(false);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (animating.current) return;
    const diffX = e.touches[0].clientX - touchStart.current.x;
    const diffY = e.touches[0].clientY - touchStart.current.y;

    // Block horizontally sliding if vertical scroll is dominant
    if (!isSwiping && Math.abs(diffY) > Math.abs(diffX) && Math.abs(diffY) > 5) {
      return;
    }

    if (Math.abs(diffX) > 10) {
      setIsSwiping(true);
      setTranslateX(diffX);
    }
  };

  const handleTouchEnd = () => {
    if (animating.current) return;
    animating.current = true;

    if (translateX > threshold) {
      // Swipe Right (Triggers Left Action visual, which is "Right-Slide" to resolve)
      if (commission.status === 'open') {
        onResolve(commission.id, 'sold');
      } else {
        onReopen(commission.id);
      }
      // Animate back
      smoothReset();
    } else if (translateX < -threshold) {
      // Swipe Left (Triggers Right Action visual, which is "Left-Slide" to trash/cancel)
      if (commission.status === 'open') {
        onResolve(commission.id, 'lost');
      } else {
        onDelete(commission.id);
      }
      // Animate back
      smoothReset();
    } else {
      smoothReset();
    }
  };

  const smoothReset = () => {
    setTranslateX(0);
    setIsSwiping(false);
    setTimeout(() => {
      animating.current = false;
    }, 200);
  };

  // Helper Calculations
  const formatter = new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' });
  
  // Date and old days
  const referenceDateStr = commission.lastContactAt || commission.createdAt;
  const daysOld = Math.floor((Date.now() - new Date(referenceDateStr).getTime()) / (1000 * 3600 * 24));
  const isUrgent = daysOld >= 14;
  
  const contactBadgeClass = isUrgent 
    ? "text-orange-600 dark:text-orange-400 bg-orange-500/10 hover:bg-orange-500/20" 
    : "text-slate-500 bg-slate-200 dark:bg-zinc-800 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-zinc-700";
    
  const contactText = daysOld === 0 ? 'Heute Kontakt' : `Vor ${daysOld} Tag${daysOld !== 1 ? 'en' : ''}`;

  const type = commission.bauart || (commission.isNeubau ? 'neubau' : 'bestand');
  
  const typeBadgeConfig = {
    'bestand': { text: 'Bestand', colorClass: 'text-slate-500 bg-slate-200 dark:bg-zinc-800 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-zinc-700' },
    'neubau': { text: 'Neubau', colorClass: 'text-blue-600 dark:text-blue-400 bg-blue-500/10 hover:bg-blue-500/20' },
    'kleinauftrag': { text: 'Kleinauftrag', colorClass: 'text-purple-600 dark:text-purple-400 bg-purple-500/10 hover:bg-purple-500/20' }
  };
  const badgeConf = typeBadgeConfig[type] || typeBadgeConfig['bestand'];

  const hasNote = commission.note && commission.note.trim() !== '';
  const showTooltip = hasNote || isEditingNote;
  const noteIconColor = hasNote 
    ? 'text-blue-500 bg-blue-500/10 hover:bg-blue-500/20' 
    : 'text-slate-400 hover:text-blue-500 hover:bg-slate-100 dark:hover:bg-zinc-800';

  const showVorab = type === 'neubau' || commission.needsVorab;

  // Process checklist steps
  let checkedCount = 0;
  let totalCheckboxes = 4;
  let percent = 0;

  if (type !== 'kleinauftrag') {
    if (showVorab) {
      totalCheckboxes = 6;
      checkedCount = [
        commission.vorabPlan,
        commission.vorabAb,
        commission.aufmass,
        commission.installationsplan,
        commission.abVerschickt,
        commission.bestellt
      ].filter(Boolean).length;
    } else {
      totalCheckboxes = 4;
      checkedCount = [
        commission.aufmass,
        commission.installationsplan,
        commission.abVerschickt,
        commission.bestellt
      ].filter(Boolean).length;
    }
    percent = Math.round((checkedCount / totalCheckboxes) * 100);
  }

  const renderCheckbox = (field: keyof Commission, label: string) => {
    const isChecked = !!commission[field];
    const textClass = isChecked ? 'text-slate-400 dark:text-zinc-650 line-through' : 'text-slate-700 dark:text-zinc-300';
    const bgClass = isChecked ? 'bg-slate-50 dark:bg-zinc-950/40' : 'hover:bg-slate-50 dark:hover:bg-zinc-800/30';

    return (
      <label className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-all active:scale-[0.98] ${bgClass} border border-transparent ${isChecked ? '' : 'hover:border-slate-200 dark:hover:border-zinc-800'}`}>
        <input
          type="checkbox"
          className="custom-checkbox rounded shadow-inner"
          checked={isChecked}
          onChange={(e) => onUpdateField(commission.id, field, e.target.checked)}
        />
        <span className={`text-xs font-bold ${textClass} transition-colors`}>{label}</span>
      </label>
    );
  };

  const resolveDateStr = commission.resolvedAt || commission.createdAt;
  const displayDate = new Date(resolveDateStr).toLocaleDateString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });

  const getGlowAndBorder = () => {
    // Standard subtle hover border for all cards instead of high-contrast colored borders
    const hoverBorder = 'hover:border-slate-350 dark:hover:border-zinc-700';

    switch (commission.status) {
      case 'sold':
        return {
          glowColor: 'bg-emerald-500/22 dark:bg-emerald-400/18',
          hoverBorder,
        };
      case 'lost':
        return {
          glowColor: 'bg-red-500/18 dark:bg-red-500/14',
          hoverBorder,
        };
      default: // 'open'
        return {
          glowColor: 'bg-slate-300/40 dark:bg-zinc-700/35',
          hoverBorder,
        };
    }
  };

  const { glowColor, hoverBorder } = getGlowAndBorder();

  // Dynamic swipe background color based on direction and state
  const swipeBg = translateX > 20 
    ? (isSoldOrLost ? 'bg-slate-250 dark:bg-zinc-800' : 'bg-emerald-500/15 dark:bg-emerald-500/10')
    : translateX < -20 
      ? 'bg-red-500/15 dark:bg-red-500/10'
      : 'bg-slate-100 dark:bg-zinc-900/40';

  return (
    <div className="relative overflow-hidden rounded-xl group touch-pan-y">
      {/* Swipe background indicators */}
      <div className={`absolute inset-0 flex justify-between items-center px-6 rounded-xl transition-all duration-300 ${swipeBg}`}>
        <div
          className={`font-black tracking-widest text-[10px] uppercase flex items-center gap-2 -ml-4 transition-all ${rightActionColor}`}
          style={{
            opacity: translateX > 20 ? Math.min(translateX / threshold, 1) : 0,
            transform: `translateX(${translateX > 20 ? Math.min(translateX / 4, 10) : 0}px)`,
          }}
        >
          <Check className="w-4 h-4" />
          {rightActionText}
        </div>
        <div
          className={`font-black tracking-widest text-[10px] uppercase flex items-center gap-2 -mr-4 transition-all ${leftActionColor}`}
          style={{
            opacity: translateX < -20 ? Math.min(Math.abs(translateX) / threshold, 1) : 0,
            transform: `translateX(${translateX < -20 ? -Math.min(Math.abs(translateX) / 4, 10) : 0}px)`,
          }}
        >
          {leftActionText}
          <X className="w-4 h-4" />
        </div>
      </div>

      {/* Main card body with translation and fine ambient hover glow */}
      <div
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        className={`relative bg-white dark:bg-zinc-900 p-4 rounded-xl border border-slate-200 dark:border-zinc-800 transition-all duration-300 ease-out will-change-transform shadow-sm hover:shadow-md hover:-translate-y-0.5 flex flex-col gap-4 group/card overflow-hidden ${hoverBorder}`}
        style={{
          transform: `translateX(${translateX}px)`,
        }}
      >
        {/* Soft Ambient Background Glow under content */}
        <div className={`absolute -right-16 -top-16 w-56 h-56 rounded-full blur-3xl pointer-events-none opacity-0 group-hover/card:opacity-100 transition-opacity duration-500 ${glowColor}`} />

        {commission.status === 'open' ? (
          // OPEN OFFERS LAYOUT
          <>
            <div className="flex justify-between items-start">
              <div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <h3 className="font-bold text-sm text-slate-800 dark:text-slate-100 break-all">
                    {commission.name}
                  </h3>
                  <button
                    onClick={() => onEditPrice(commission.id, commission.price)}
                    className="text-slate-400 hover:text-blue-500 transition-colors p-1 rounded hover:bg-slate-100 dark:hover:bg-zinc-800 cursor-pointer"
                    title="Name und Preis anpassen"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                </div>
                {commission.createdByEmail && (
                  <p className="text-[8px] font-black uppercase tracking-wider text-slate-400 dark:text-zinc-500 mt-1 select-none">
                    Mitarbeiter: <span className="font-mono text-slate-500 dark:text-zinc-400 lowercase font-bold">{commission.createdByEmail}</span>
                  </p>
                )}
                <div className="flex items-center gap-1.5 mt-1">
                  <p className="font-sans text-blue-700 dark:text-blue-300 font-bold text-[14px] tracking-tight tabular-nums mr-1 select-all">
                    {formatter.format(commission.price)}
                  </p>
                  <div className="inline-block group/note-tooltip">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setTempNoteText(commission.note || '');
                        setIsEditingNote(true);
                      }}
                      className={`${noteIconColor} group/note-btn relative overflow-visible transition-all duration-200 hover:scale-115 active:scale-90 p-1 rounded cursor-pointer`}
                      title=""
                    >
                      <ClipboardList className={`w-3.5 h-3.5 transition-all duration-200 group-hover/note-btn:rotate-6 group-hover/note-btn:-translate-y-0.5 ${hasNote ? 'fill-blue-500/20' : ''}`} />
                      {hasNote && (
                        <span className="absolute -top-0.5 -right-0.5 flex h-1.5 w-1.5 select-none pointer-events-none">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-blue-500"></span>
                        </span>
                      )}
                    </button>
                    {showTooltip && (
                      <div 
                        className={
                          isEditingNote 
                            ? "absolute inset-2 p-3 bg-white dark:bg-zinc-950 rounded-xl border-2 border-blue-500 dark:border-blue-500 shadow-xl opacity-100 scale-100 pointer-events-auto z-50 text-left flex flex-col"
                            : "absolute inset-2 p-3 bg-white/98 dark:bg-zinc-950/98 rounded-xl border border-slate-200/80 dark:border-zinc-800 shadow-xl opacity-0 scale-95 pointer-events-none group-hover/note-tooltip:opacity-100 group-hover/note-tooltip:scale-100 group-hover/note-tooltip:pointer-events-auto transition-all duration-200 z-50 text-left flex flex-col backdrop-blur-md"
                        }
                      >
                        <div className="text-[9px] font-black uppercase tracking-widest text-blue-500 dark:text-blue-400 mb-1.5 flex items-center justify-between border-b border-slate-100 dark:border-zinc-900 pb-1.5 shrink-0 select-none">
                          <div className="flex items-center gap-1.5">
                            <ClipboardList className="w-3 h-3" />
                            <span>Eingetragene Notiz</span>
                          </div>
                          {isEditingNote && (
                            <span className="text-[7.5px] text-slate-400 dark:text-zinc-500 normal-case tracking-normal">
                              strg + enter zum Speichern
                            </span>
                          )}
                        </div>

                        {isEditingNote ? (
                          <div className="flex-1 flex flex-col gap-1.5 min-h-0">
                            <textarea
                              autoFocus
                              value={tempNoteText}
                              onChange={(e) => setTempNoteText(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                                  onUpdateField(commission.id, 'note', tempNoteText);
                                  setIsEditingNote(false);
                                }
                                if (e.key === 'Escape') {
                                  setIsEditingNote(false);
                                }
                              }}
                              placeholder="Schreibe eine Notiz..."
                              className="w-full flex-1 p-2 text-xs font-sans font-semibold text-slate-800 dark:text-zinc-200 bg-slate-50 dark:bg-zinc-950 border border-slate-200/80 dark:border-zinc-800 rounded-lg focus:outline-hidden focus:border-blue-500 resize-none min-h-[50px] overflow-y-auto"
                            />
                            <div className="flex justify-end gap-1.5 shrink-0">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setIsEditingNote(false);
                                }}
                                className="px-2 py-1 text-[9px] font-black uppercase tracking-widest text-slate-500 hover:bg-slate-100 dark:hover:bg-zinc-900 rounded-lg cursor-pointer"
                              >
                                Abbrechen
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onUpdateField(commission.id, 'note', tempNoteText);
                                  setIsEditingNote(false);
                                }}
                                className="px-2.5 py-1 text-[9px] font-black uppercase tracking-widest bg-blue-500 hover:bg-blue-600 text-white rounded-lg shadow-sm cursor-pointer"
                              >
                                Speichern
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div 
                            onClick={(e) => {
                              e.stopPropagation();
                              setTempNoteText(commission.note || '');
                              setIsEditingNote(true);
                            }}
                            className="overflow-y-auto flex-1 pr-1 text-[11px] text-slate-700 dark:text-zinc-350 leading-relaxed font-semibold font-sans break-words whitespace-pre-wrap select-text scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-zinc-800 cursor-pointer hover:bg-slate-100 dark:hover:bg-zinc-850 p-1.5 rounded-lg transition-all"
                          >
                            {commission.note}
                          </div>
                        )}

                        {!isEditingNote && (
                          <div className="text-[7.5px] font-black uppercase tracking-widest text-slate-400 mt-1.5 select-none text-right shrink-0">
                            Klicken zum Bearbeiten
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                  <button
                    onClick={() => onUpdateField(commission.id, 'lastContactAt', new Date().toISOString())}
                    className={`text-[9px] font-black ${contactBadgeClass} px-2 py-0.5 rounded uppercase tracking-widest inline-flex items-center gap-1 transition-colors cursor-pointer`}
                    title="Kontakt aktualisieren (Timer auf 0 setzen)"
                  >
                    {contactText}
                    <RefreshCw className="w-2.5 h-2.5 opacity-70" />
                  </button>
                  <button
                    onClick={() => onCycleBauart(commission.id, type)}
                    className={`text-[9px] font-black ${badgeConf.colorClass} px-2 py-0.5 rounded uppercase tracking-widest inline-block transition-colors cursor-pointer`}
                    title="Bauart ändern"
                  >
                    {badgeConf.text}
                  </button>
                </div>
              </div>

              <button
                onClick={() => onDelete(commission.id)}
                className="text-slate-300 hover:text-red-500 transition-colors w-8 h-8 flex items-center justify-center rounded-full hover:bg-red-500/10 font-bold active:scale-90 opacity-0 group-hover:opacity-100 -mr-2 -mt-2 cursor-pointer"
                title="Löschen"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex gap-2 mt-4 pt-3 border-t border-slate-200/60 dark:border-zinc-800">
              <button
                onClick={() => onResolve(commission.id, 'sold')}
                className="flex-1 py-1.5 rounded-lg font-extrabold text-[9px] sm:text-[10px] uppercase tracking-wider bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500 hover:text-white transition-all duration-200 flex items-center justify-center gap-1 cursor-pointer active:scale-95"
              >
                <Check className="w-3.5 h-3.5" />
                Verkauft
              </button>
              <button
                onClick={() => onResolve(commission.id, 'lost')}
                className="flex-1 py-1.5 rounded-lg font-extrabold text-[9px] sm:text-[10px] uppercase tracking-wider bg-red-500/10 text-red-600 dark:text-red-400 hover:bg-red-500 hover:text-white transition-all duration-200 flex items-center justify-center gap-1 cursor-pointer active:scale-95"
              >
                <X className="w-3.5 h-3.5" />
                Absagen
              </button>
            </div>
          </>
        ) : (
          // SOLD OR LOST LAYOUT
          <>
            <div className="mb-3 border-b border-slate-200/60 dark:border-zinc-800 pb-3 flex justify-between items-start">
              <div>
                <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                  <h3 className="font-bold text-sm text-slate-800 dark:text-slate-100">
                    {commission.name}
                  </h3>
                  <button
                    onClick={() => onEditPrice(commission.id, commission.price)}
                    className="text-slate-400 hover:text-blue-500 transition-colors p-1 rounded hover:bg-slate-100 dark:hover:bg-zinc-800 cursor-pointer"
                    title="Name und Preis anpassen"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                </div>
                {commission.createdByEmail && (
                  <p className="text-[8px] font-black uppercase tracking-wider text-slate-400 dark:text-zinc-500 mb-2 select-none">
                    Mitarbeiter: <span className="font-mono text-slate-500 dark:text-zinc-400 lowercase font-bold">{commission.createdByEmail}</span>
                  </p>
                )}
                <div className="grid grid-cols-[auto_1fr] items-center gap-x-2.5 gap-y-1.5 mt-1.5">
                  {/* Row 1: Preis badge and Note button */}
                  <div className="flex items-center">
                    <span
                      className={`text-[12.5px] font-extrabold px-2.5 py-0.5 rounded-md tracking-normal tabular-nums font-sans border inline-block select-all min-w-[95px] text-center ${
                        commission.status === 'sold'
                          ? 'text-emerald-800 dark:text-emerald-300 bg-emerald-500/12 border-emerald-500/30'
                          : 'text-red-800 dark:text-red-350 bg-red-500/12 border-red-500/30'
                      }`}
                    >
                      {formatter.format(commission.price)}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="inline-block group/note-tooltip">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setTempNoteText(commission.note || '');
                          setIsEditingNote(true);
                        }}
                        className={`${noteIconColor} group/note-btn relative overflow-visible transition-all duration-200 hover:scale-115 active:scale-90 p-1 rounded cursor-pointer flex items-center justify-center`}
                        title=""
                      >
                        <ClipboardList className={`w-3.5 h-3.5 transition-all duration-200 group-hover/note-btn:rotate-6 group-hover/note-btn:-translate-y-0.5 ${hasNote ? 'fill-blue-500/20' : ''}`} />
                        {hasNote && (
                          <span className="absolute top-0 right-0 flex h-1.5 w-1.5 select-none pointer-events-none">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-blue-500"></span>
                          </span>
                        )}
                      </button>
                      {showTooltip && (
                        <div 
                          className={
                            isEditingNote 
                              ? "absolute inset-2 p-3 bg-white dark:bg-zinc-950 rounded-xl border-2 border-blue-500 dark:border-blue-500 shadow-xl opacity-100 scale-100 pointer-events-auto z-50 text-left flex flex-col"
                              : "absolute inset-2 p-3 bg-white/98 dark:bg-zinc-950/98 rounded-xl border border-slate-200/80 dark:border-zinc-800 shadow-xl opacity-0 scale-95 pointer-events-none group-hover/note-tooltip:opacity-100 group-hover/note-tooltip:scale-100 group-hover/note-tooltip:pointer-events-auto transition-all duration-200 z-50 text-left flex flex-col backdrop-blur-md"
                          }
                        >
                          <div className="text-[9px] font-black uppercase tracking-widest text-blue-500 dark:text-blue-400 mb-1.5 flex items-center justify-between border-b border-slate-100 dark:border-zinc-900 pb-1.5 shrink-0 select-none">
                            <div className="flex items-center gap-1.5">
                              <ClipboardList className="w-3 h-3" />
                              <span>Eingetragene Notiz</span>
                            </div>
                            {isEditingNote && (
                              <span className="text-[7.5px] text-slate-400 dark:text-zinc-500 normal-case tracking-normal">
                                strg + enter zum Speichern
                              </span>
                            )}
                          </div>

                          {isEditingNote ? (
                            <div className="flex-1 flex flex-col gap-1.5 min-h-0">
                              <textarea
                                autoFocus
                                value={tempNoteText}
                                onChange={(e) => setTempNoteText(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                                    onUpdateField(commission.id, 'note', tempNoteText);
                                    setIsEditingNote(false);
                                  }
                                  if (e.key === 'Escape') {
                                    setIsEditingNote(false);
                                  }
                                }}
                                placeholder="Schreibe eine Notiz..."
                                className="w-full flex-1 p-2 text-xs font-sans font-semibold text-slate-800 dark:text-zinc-200 bg-slate-50 dark:bg-zinc-950 border border-slate-200/80 dark:border-zinc-800 rounded-lg focus:outline-hidden focus:border-blue-500 resize-none min-h-[50px] overflow-y-auto"
                              />
                              <div className="flex justify-end gap-1.5 shrink-0">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setIsEditingNote(false);
                                  }}
                                  className="px-2 py-1 text-[9px] font-black uppercase tracking-widest text-slate-500 hover:bg-slate-100 dark:hover:bg-zinc-900 rounded-lg cursor-pointer"
                                >
                                  Abbrechen
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onUpdateField(commission.id, 'note', tempNoteText);
                                    setIsEditingNote(false);
                                  }}
                                  className="px-2.5 py-1 text-[9px] font-black uppercase tracking-widest bg-blue-500 hover:bg-blue-600 text-white rounded-lg shadow-sm cursor-pointer"
                                >
                                  Speichern
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div 
                              onClick={(e) => {
                                e.stopPropagation();
                                setTempNoteText(commission.note || '');
                                setIsEditingNote(true);
                              }}
                              className="overflow-y-auto flex-1 pr-1 text-[11px] text-slate-700 dark:text-zinc-350 leading-relaxed font-semibold font-sans break-words whitespace-pre-wrap select-text scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-zinc-800 cursor-pointer hover:bg-slate-100 dark:hover:bg-zinc-850 p-1.5 rounded-lg transition-all"
                            >
                              {commission.note}
                            </div>
                          )}

                          {!isEditingNote && (
                            <div className="text-[7.5px] font-black uppercase tracking-widest text-slate-400 mt-1.5 select-none text-right shrink-0">
                              Klicken zum Bearbeiten
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => onCycleBauart(commission.id, type)}
                      className={`text-[9px] font-black ${badgeConf.colorClass} px-2 py-0.5 rounded uppercase tracking-widest transition-colors cursor-pointer`}
                      title="Bauart ändern"
                    >
                      {badgeConf.text}
                    </button>
                  </div>

                  {/* Row 2: Datum badge and Calendar button */}
                  <div className="flex items-center">
                    <span className="text-xs font-bold text-slate-800 dark:text-zinc-200 bg-slate-100 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 px-2.5 py-0.5 rounded-md tracking-normal inline-block tabular-nums font-sans min-w-[95px] text-center select-none">
                      {displayDate}
                    </span>
                  </div>
                  <div className="flex items-center">
                    <button
                      onClick={() => onEditDate(commission.id, resolveDateStr)}
                      className="text-slate-400 hover:text-blue-500 transition-colors p-1 rounded hover:bg-slate-100 dark:hover:bg-zinc-800 cursor-pointer flex items-center justify-center"
                      title="Buchungsdatum anpassen"
                    >
                      <Calendar className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>

              {commission.status === 'lost' && (
                <button
                  onClick={() => onDelete(commission.id)}
                  className="text-slate-300 hover:text-red-500 transition-colors w-8 h-8 flex items-center justify-center rounded-full hover:bg-red-500/10 font-bold active:scale-90 opacity-0 group-hover:opacity-100 -mr-2 -mt-2 cursor-pointer"
                  title="Löschen"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>

            {commission.status === 'sold' && (
              <>
                {type === 'kleinauftrag' ? (
                  <div className="mt-2 flex justify-end">
                    <button
                      onClick={() => onUpdateField(commission.id, 'bestellt', !commission.bestellt)}
                      className="bg-slate-100 hover:bg-blue-600 hover:text-white dark:bg-zinc-800 hover:dark:bg-blue-600 text-slate-700 dark:text-zinc-300 py-2 px-4 rounded-xl font-bold text-[10px] tracking-widest uppercase transition-all shadow-sm cursor-pointer"
                    >
                      {commission.bestellt ? 'Aus Ablage holen' : 'In Ablage verschieben'}
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="mt-3 flex justify-between items-center px-1 border-b border-slate-200/60 dark:border-zinc-800 pb-2 mb-2">
                      <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">
                        Prozess-Schritte
                      </span>
                      {type === 'bestand' && (
                        <button
                          onClick={() => onUpdateField(commission.id, 'needsVorab', !commission.needsVorab)}
                          className="text-[9px] font-bold text-blue-500 hover:text-blue-600 uppercase tracking-widest transition-colors flex items-center gap-1 cursor-pointer"
                        >
                          {showVorab ? 'Standard-Ablauf' : '+ Vorab-Planung'}
                        </button>
                      )}
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {showVorab ? (
                        <>
                          {renderCheckbox('vorabPlan', 'Vorab-Installationsplan')}
                          {renderCheckbox('vorabAb', 'Vorab-Auftragsbestätigung')}
                          {renderCheckbox('aufmass', 'Aufmaß')}
                          {renderCheckbox('installationsplan', 'Finaler Installationsplan')}
                          {renderCheckbox('abVerschickt', 'Finale Auftragsbestätigung')}
                          {renderCheckbox('bestellt', 'Bestellung')}
                        </>
                      ) : (
                        <>
                          {renderCheckbox('aufmass', 'Aufmaß')}
                          {renderCheckbox('installationsplan', 'Installationsplan')}
                          {renderCheckbox('abVerschickt', 'Auftragsbestätigung')}
                          {renderCheckbox('bestellt', 'Bestellung')}
                        </>
                      )}
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-200/60 dark:border-zinc-800">
                      <div className="flex justify-between items-center mb-1.5">
                        <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">
                          Fortschritt
                        </span>
                        <span
                          className={`text-[9px] font-black uppercase tracking-widest font-mono-tabular ${
                            percent === 100 ? 'text-emerald-500' : 'text-blue-500'
                          }`}
                        >
                          {percent}%
                        </span>
                      </div>
                      <div className="w-full bg-slate-100 dark:bg-zinc-950 h-1.5 rounded-full overflow-hidden">
                        <div
                          className={`h-full transition-all duration-500 ease-out ${
                            percent === 100 ? 'bg-emerald-500' : 'bg-blue-500'
                          }`}
                          style={{ width: `${percent}%` }}
                        ></div>
                      </div>
                    </div>
                  </>
                )}
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
};
