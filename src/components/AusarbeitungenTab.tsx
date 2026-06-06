import React, { useState, useMemo } from 'react';
import { Ausarbeitung } from '../types.ts';
import { Plus, Trash2, Pencil, Calendar, Hash, Euro, Copy, Check, CheckCircle, Sparkles, X } from 'lucide-react';

interface AusarbeitungenTabProps {
  items: Ausarbeitung[];
  onAdd: (data: { customerName: string; colleagueName: string; orderNumber: string; price: number; orderedAt: string; note: string; deliveryKw?: string; deliveryYear?: string }) => Promise<void>;
  onUpdate: (id: string, fields: Partial<Ausarbeitung>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  currentUserEmail?: string;
  theme?: 'light' | 'dark' | 'sage' | 'ocean' | 'wood';
}

export const AusarbeitungenTab: React.FC<AusarbeitungenTabProps> = ({
  items,
  onAdd,
  onUpdate,
  onDelete,
  currentUserEmail,
  theme,
}) => {
  // Local active filters
  const [filterMonth, setFilterMonth] = useState<string>(() => {
    return (new Date().getMonth() + 1).toString();
  });
  const [filterYear, setFilterYear] = useState<string>(() => {
    return new Date().getFullYear().toString();
  });

  // Form Fields State (Colleague and Note fields are omitted as requested)
  const [newCustomer, setNewCustomer] = useState('');
  const [newOrderNumber, setNewOrderNumber] = useState('');
  const [newPrice, setNewPrice] = useState('');
  const [newDeliveryKw, setNewDeliveryKw] = useState('');
  const [newDeliveryYear, setNewDeliveryYear] = useState('');
  const [newOrderedAt, setNewOrderedAt] = useState(() => {
    return new Date().toISOString().split('T')[0];
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Edit inline state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editCustomer, setEditCustomer] = useState('');
  const [editOrderNumber, setEditOrderNumber] = useState('');
  const [editPrice, setEditPrice] = useState('');
  const [editDeliveryKw, setEditDeliveryKw] = useState('');
  const [editDeliveryYear, setEditDeliveryYear] = useState('');
  const [editOrderedAt, setEditOrderedAt] = useState('');

  // Report copying states
  const [reportCopied, setReportCopied] = useState(false);

  // Determine glow classes based on the active theme
  const getGlowClasses = () => {
    switch (theme) {
      case 'wood': // Vintage Terracotta
        return {
          statsGlow: 'bg-[rgba(121,85,72,0.14)] dark:bg-[rgba(121,85,72,0.18)] group-hover:bg-[rgba(121,85,72,0.28)]',
          itemGlow: 'bg-[#795548]/8 dark:bg-[#795548]/10 group-hover:bg-[#795548]/18 dark:group-hover:bg-[#795548]/20',
        };
      case 'sage': // Sage Botanical
        return {
          statsGlow: 'bg-emerald-600/12 dark:bg-emerald-500/14 group-hover:bg-emerald-600/22',
          itemGlow: 'bg-emerald-600/8 dark:bg-emerald-500/10 group-hover:bg-emerald-600/18 dark:group-hover:bg-emerald-500/20',
        };
      case 'ocean': // Deep Ocean
        return {
          statsGlow: 'bg-blue-500/14 dark:bg-blue-400/16 group-hover:bg-blue-500/24',
          itemGlow: 'bg-blue-500/8 dark:bg-blue-400/10 group-hover:bg-blue-500/18 dark:group-hover:bg-blue-400/20',
        };
      default: // light / dark (default blue/indigo styles)
        return {
          statsGlow: 'bg-indigo-500/12 dark:bg-indigo-400/15 group-hover:bg-indigo-500/22',
          itemGlow: 'bg-blue-500/8 dark:bg-blue-450/8 group-hover:bg-blue-500/15 dark:group-hover:bg-blue-450/15',
        };
    }
  };

  const glowStyles = getGlowClasses();

  // Month names translation helper
  const months = [
    { value: '1', name: 'Januar' },
    { value: '2', name: 'Februar' },
    { value: '3', name: 'März' },
    { value: '4', name: 'April' },
    { value: '5', name: 'Mai' },
    { value: '6', name: 'Juni' },
    { value: '7', name: 'Juli' },
    { value: '8', name: 'August' },
    { value: '9', name: 'September' },
    { value: '10', name: 'Oktober' },
    { value: '11', name: 'November' },
    { value: '12', name: 'Dezember' },
  ];

  // Dynamically extract years available in the list
  const availableYears = useMemo(() => {
    const years = new Set<string>();
    items.forEach((item) => {
      if (item.orderedAt) {
        const yr = new Date(item.orderedAt).getFullYear().toString();
        years.add(yr);
      }
    });
    years.add(new Date().getFullYear().toString());
    return Array.from(years).sort((a, b) => b.localeCompare(a));
  }, [items]);

  // Handle Form Submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustomer.trim() || !newOrderNumber.trim() || !newPrice) {
      return;
    }

    setIsSubmitting(true);
    try {
      await onAdd({
        customerName: newCustomer.trim(),
        colleagueName: '', // Omitted as requested
        orderNumber: newOrderNumber.trim(),
        price: parseFloat(newPrice) || 0,
        orderedAt: newOrderedAt,
        note: '', // Omitted as requested
        deliveryKw: newDeliveryKw.trim(),
        deliveryYear: newDeliveryYear.trim(),
      });
      // Reset input fields
      setNewCustomer('');
      setNewOrderNumber('');
      setNewPrice('');
      setNewDeliveryKw('');
      setNewDeliveryYear('');
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Start Inline Editing
  const startEditing = (item: Ausarbeitung) => {
    setEditingId(item.id);
    setEditCustomer(item.customerName);
    setEditOrderNumber(item.orderNumber);
    setEditPrice(item.price.toString());
    setEditOrderedAt(item.orderedAt || new Date().toISOString().split('T')[0]);
    setEditDeliveryKw(item.deliveryKw || '');
    setEditDeliveryYear(item.deliveryYear || '');
  };

  // Save Inline Edit
  const saveEdit = async (id: string) => {
    if (!editCustomer.trim() || !editOrderNumber.trim() || !editPrice) {
      return;
    }
    try {
      await onUpdate(id, {
        customerName: editCustomer.trim(),
        orderNumber: editOrderNumber.trim(),
        price: parseFloat(editPrice) || 0,
        orderedAt: editOrderedAt,
        deliveryKw: editDeliveryKw.trim(),
        deliveryYear: editDeliveryYear.trim(),
      });
      setEditingId(null);
    } catch (err) {
      console.error(err);
    }
  };

  // Filter items based on months and years selected
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const date = new Date(item.orderedAt);
      const m = (date.getMonth() + 1).toString();
      const y = date.getFullYear().toString();

      const matchesMonth = filterMonth === 'all' || m === filterMonth;
      const matchesYear = filterYear === 'all' || y === filterYear;

      return matchesMonth && matchesYear;
    });
  }, [items, filterMonth, filterYear]);

  // Aggregate stats
  const totalRevenue = useMemo(() => {
    return filteredItems.reduce((sum, item) => sum + (item.price || 0), 0);
  }, [filteredItems]);

  const formatter = new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR',
  });

  // Export Abrechnung content to clipboard
  const handleCopyReport = () => {
    if (filteredItems.length === 0) return;

    let reportText = "";
    filteredItems.forEach((item, index) => {
      const formattedPrice = formatter.format(item.price);
      reportText += `${index + 1}. ${item.customerName} | ${item.orderNumber} | ${formattedPrice}\n`;
    });

    reportText += `Gesamtsumme: ${formatter.format(totalRevenue)}`;

    navigator.clipboard.writeText(reportText);
    setReportCopied(true);
    setTimeout(() => setReportCopied(false), 3000);
  };

  return (
    <div className="flex flex-col gap-6">
      
      {/* Dynamic Header Stats Card and Quick Entry Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-stretch">
        
        {/* Streamlined Stats Card */}
        <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-slate-200/50 dark:border-zinc-800/85 p-5 shadow-3xs flex flex-col justify-between relative overflow-hidden group">
          {/* Subtle Dynamic Background Glow - Characteristic for the App */}
          <div className={`absolute -right-16 -top-16 w-56 h-56 rounded-full blur-3xl pointer-events-none transition-all duration-500 ${glowStyles.statsGlow}`} />
          
          <div className="flex justify-between items-start gap-4">
            <div>
              <span className="text-[10px] font-black uppercase text-slate-400 dark:text-zinc-500 tracking-wider block mb-1 z-10 relative">
                Abrechnung Ausarbeitungen
              </span>
              <h3 className="text-lg font-black tracking-tight text-slate-900 dark:text-zinc-50 leading-tight z-10 relative">
                Gesamtsumme
              </h3>
            </div>
            
            <div className="text-right z-10 relative">
              <span className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-350 block leading-none">
                {formatter.format(totalRevenue)}
              </span>
              <span className="text-[10px] font-mono font-bold text-slate-500 dark:text-zinc-400 mt-1 block">
                {filteredItems.length} {filteredItems.length === 1 ? 'Eintrag' : 'Einträge'}
              </span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mt-4 pt-4 border-t border-slate-100 dark:border-zinc-850/50 z-10 relative">
            {/* Filters */}
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={filterMonth}
                onChange={(e) => setFilterMonth(e.target.value)}
                className="bg-slate-100 dark:bg-zinc-950 text-xs font-bold text-slate-700 dark:text-zinc-200 px-2.5 py-1.5 rounded-xl border border-slate-200/20 dark:border-zinc-850 outline-none cursor-pointer"
              >
                <option value="all">Alle Monate</option>
                {months.map((m) => (
                  <option key={m.value} value={m.value}>{m.name}</option>
                ))}
              </select>

              <select
                value={filterYear}
                onChange={(e) => setFilterYear(e.target.value)}
                className="bg-slate-100 dark:bg-zinc-950 text-xs font-bold text-slate-700 dark:text-zinc-200 px-2.5 py-1.5 rounded-xl border border-slate-200/20 dark:border-zinc-850 outline-none cursor-pointer"
              >
                <option value="all">Alle Jahre</option>
                {availableYears.map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>

            {/* Copy Report Button */}
            <button
              onClick={handleCopyReport}
              disabled={filteredItems.length === 0}
              className={`flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all duration-300 active:scale-95 cursor-pointer select-none min-w-[210px] theme-copy-report-btn ${reportCopied ? 'copied' : ''}`}
            >
              {reportCopied ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  Kopiert!
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  Abrechnung kopieren
                </>
              )}
            </button>
          </div>
        </div>

        {/* Permanent Quick Entry Box (Form Integrated directly) */}
        <form id="schnellerfassung-form" onSubmit={handleSubmit} className="bg-gradient-to-br from-blue-750 to-indigo-700 dark:from-blue-800/90 dark:to-indigo-850/90 rounded-3xl p-5 text-white flex flex-col justify-between shadow-md relative overflow-hidden group">
          {/* Characteristic Accent Glow top-right */}
          <div className="absolute -right-12 -top-12 w-48 h-48 rounded-full blur-3xl pointer-events-none bg-white/10 dark:bg-white/8 transition-all duration-500 group-hover:bg-white/15" />
          
          <div className="flex justify-between items-center mb-3 z-10 relative">
            <div className="flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-amber-300 animate-pulse" />
              <h4 className="text-sm font-black uppercase tracking-wider">Schnellerfassung</h4>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            {/* Customer */}
            <input
              type="text"
              required
              value={newCustomer}
              onChange={(e) => setNewCustomer(e.target.value)}
              placeholder="Kunde / Kommission"
              className="bg-white/10 dark:bg-zinc-950/40 border border-white/15 dark:border-zinc-800 text-white placeholder-white/50 py-1.5 px-3 rounded-xl text-xs outline-none focus:border-white/50 focus:ring-1 focus:ring-white/10"
            />

            {/* Order Number */}
            <input
              type="text"
              required
              value={newOrderNumber}
              onChange={(e) => setNewOrderNumber(e.target.value)}
              placeholder="Auftrags-Nr."
              className="bg-white/10 dark:bg-zinc-950/40 border border-white/15 dark:border-zinc-800 text-white placeholder-white/50 py-1.5 px-3 rounded-xl text-xs outline-none focus:border-white/50 focus:ring-1 focus:ring-white/10"
            />

            {/* Price & KW & Jahr (Side by side) */}
            <div className="flex gap-1.5">
              <input
                type="number"
                step="0.01"
                required
                value={newPrice}
                onChange={(e) => setNewPrice(e.target.value)}
                placeholder="Wert (€)"
                className="bg-white/10 dark:bg-zinc-950/40 border border-white/15 dark:border-zinc-800 text-white placeholder-white/50 py-1.5 px-3 rounded-xl text-xs outline-none focus:border-white/50 focus:ring-1 focus:ring-white/10 flex-1 min-w-0"
              />
              <input
                type="text"
                value={newDeliveryKw}
                onChange={(e) => setNewDeliveryKw(e.target.value)}
                placeholder="KW"
                title="Liefer-Kalenderwoche"
                className="bg-white/10 dark:bg-zinc-950/40 border border-white/15 dark:border-zinc-800 text-white placeholder-white/50 py-1.5 px-1.5 rounded-xl text-xs outline-none focus:border-white/50 focus:ring-1 focus:ring-white/10 w-11 text-center font-bold font-sans"
              />
              <input
                type="text"
                maxLength={4}
                value={newDeliveryYear}
                onChange={(e) => setNewDeliveryYear(e.target.value)}
                placeholder="Jahr"
                title="Lieferjahr"
                className="bg-white/10 dark:bg-zinc-950/40 border border-white/15 dark:border-zinc-800 text-white placeholder-white/50 py-1.5 px-1.5 rounded-xl text-xs outline-none focus:border-white/50 focus:ring-1 focus:ring-white/10 w-14 text-center font-bold font-sans"
              />
            </div>

            {/* Order Date */}
            <input
              type="date"
              required
              value={newOrderedAt}
              onChange={(e) => setNewOrderedAt(e.target.value)}
              className="bg-white/10 dark:bg-zinc-950/40 border border-white/15 dark:border-zinc-800 text-white py-1.5 px-3 rounded-xl text-xs outline-none focus:border-white/50 focus:ring-1 focus:ring-white/10 cursor-pointer text-left scheme-dark"
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-white dark:bg-zinc-100 text-blue-700 dark:text-zinc-900 hover:bg-slate-50 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest mt-4 flex items-center justify-center gap-1.5 transition-all shadow-sm active:scale-[0.98] cursor-pointer disabled:opacity-55"
          >
            <Plus className="w-4 h-4" />
            {isSubmitting ? 'Speichere...' : 'Ausarbeitung eintragen'}
          </button>
        </form>
      </div>

      {/* Main List Section */}
      <div className="flex flex-col gap-3">
        <h3 className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-zinc-500 select-none">
          Dokumentierte Ausarbeitungen ({filteredItems.length})
        </h3>

        {filteredItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 bg-white dark:bg-zinc-900 border border-slate-200/50 dark:border-zinc-850 rounded-2xl text-slate-400 dark:text-zinc-650 text-center">
            <CheckCircle className="w-12 h-12 mb-3 opacity-30 text-indigo-500" />
            <p className="font-bold text-sm text-slate-700 dark:text-zinc-400">Keine Eingegebenen Ausarbeitungen</p>
            <p className="text-xs text-slate-400 dark:text-zinc-500 mt-1 max-w-xs">
              Trage oben rechts Daten ein, um eine Ausarbeitung anzulegen.
            </p>
          </div>
        ) : (
          /* Narrow, compact aspect-square layout to save space on both mobile and desktop views */
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3.5">
            {filteredItems.map((item) => {
              const isEditing = editingId === item.id;

              if (isEditing) {
                return (
                  <div key={item.id} className="bg-slate-50 dark:bg-zinc-950 border-2 border-blue-500 p-3.5 rounded-2xl flex flex-col gap-2 animate-scale-up">
                    <div className="text-[9px] font-black uppercase tracking-wider text-blue-500">
                      Bearbeiten
                    </div>
                    
                    <input
                      type="text"
                      value={editCustomer}
                      onChange={(e) => setEditCustomer(e.target.value)}
                      placeholder="Kunde"
                      className="bg-white dark:bg-zinc-900 text-xs font-bold text-slate-850 dark:text-zinc-100 p-2 rounded-xl border border-slate-250 dark:border-zinc-800 outline-none focus:ring-1 focus:ring-blue-500"
                    />

                    <input
                      type="text"
                      value={editOrderNumber}
                      onChange={(e) => setEditOrderNumber(e.target.value)}
                      placeholder="Auftragsnummer"
                      className="bg-white dark:bg-zinc-900 text-xs font-bold text-slate-850 dark:text-zinc-100 p-2 rounded-xl border border-slate-250 dark:border-zinc-800 outline-none focus:ring-1 focus:ring-blue-500"
                    />

                    <div className="flex gap-1.5 font-sans">
                      <input
                        type="number"
                        step="0.01"
                        value={editPrice}
                        onChange={(e) => setEditPrice(e.target.value)}
                        placeholder="Preis (€)"
                        className="bg-white dark:bg-zinc-900 text-xs font-bold text-slate-850 dark:text-zinc-100 p-2 rounded-xl border border-slate-250 dark:border-zinc-800 outline-none focus:ring-1 focus:ring-blue-500 flex-1 min-w-0"
                      />
                      <input
                        type="text"
                        value={editDeliveryKw}
                        onChange={(e) => setEditDeliveryKw(e.target.value)}
                        placeholder="KW"
                        title="Liefer-Kalenderwoche"
                        className="bg-white dark:bg-zinc-900 text-xs font-bold text-slate-850 dark:text-zinc-100 p-2 rounded-xl border border-slate-250 dark:border-zinc-800 outline-none focus:ring-1 focus:ring-blue-500 w-11 text-center font-bold"
                      />
                      <input
                        type="text"
                        maxLength={4}
                        value={editDeliveryYear}
                        onChange={(e) => setEditDeliveryYear(e.target.value)}
                        placeholder="Jahr"
                        title="Liefer-Jahr"
                        className="bg-white dark:bg-zinc-900 text-xs font-bold text-slate-850 dark:text-zinc-100 p-2 rounded-xl border border-slate-250 dark:border-zinc-800 outline-none focus:ring-1 focus:ring-blue-500 w-14 text-center font-bold"
                      />
                    </div>

                    <input
                      type="date"
                      value={editOrderedAt}
                      onChange={(e) => setEditOrderedAt(e.target.value)}
                      className="bg-white dark:bg-zinc-900 text-xs font-bold text-slate-700 dark:text-zinc-200 p-2 rounded-xl border border-slate-250 dark:border-zinc-800 outline-none"
                    />

                    <div className="flex gap-1.5 mt-1 justify-end">
                      <button
                        onClick={() => setEditingId(null)}
                        className="px-2.5 py-1.5 bg-slate-200 hover:bg-slate-300 dark:bg-zinc-850 dark:hover:bg-zinc-850 text-slate-700 dark:text-zinc-300 rounded-lg text-[9px] font-bold uppercase transition"
                      >
                        Abbrechen
                      </button>
                      <button
                        onClick={() => saveEdit(item.id)}
                        className="px-2.5 py-1.5 bg-blue-600 hover:bg-blue-750 text-white rounded-lg text-[9px] font-bold uppercase transition"
                      >
                        Sichern
                      </button>
                    </div>
                  </div>
                );
              }

              // Pure, compact square card template
              return (
                <div
                  key={item.id}
                  className="relative overflow-hidden group bg-white dark:bg-zinc-900 border border-slate-200/50 dark:border-zinc-805 hover:border-slate-350 dark:hover:border-zinc-700 p-3.5 rounded-2xl flex flex-col justify-between shadow-3xs hover:shadow-xs transition-all duration-300 hover:-translate-y-0.5 aspect-square"
                >
                  {/* Absolute Signature Ambient Glow Effect top right, matching the rest of the application */}
                  <div className={`absolute -right-8 -top-8 w-28 h-28 rounded-full blur-xl pointer-events-none transition-all duration-500 ${glowStyles.itemGlow}`} />

                  {/* Header: Date and Order number */}
                  <div className="flex justify-between items-start gap-1 select-none z-10">
                    <span className="text-[10px] font-bold text-slate-400 dark:text-zinc-500">
                      {formatOrderShortDate(item.orderedAt)}
                    </span>
                    <span className="text-[9px] font-mono font-bold bg-slate-100 dark:bg-zinc-950 text-slate-600 dark:text-zinc-400 px-1.5 py-0.5 rounded-md">
                      #{item.orderNumber}
                    </span>
                  </div>

                  {/* Body Content / Kunde / Commission */}
                  <div className="my-auto py-1 z-10 text-left">
                    <h4 className="font-extrabold text-sm text-slate-900 dark:text-zinc-50 leading-snug tracking-tight line-clamp-2">
                      {item.customerName}
                    </h4>
                  </div>

                  {/* Footer: Price & Quick Action controls (pencil, trash) */}
                  <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-zinc-850 z-10">
                    <div className="flex flex-col items-start leading-none">
                      <span className="text-xs font-black text-blue-600 dark:text-blue-400">
                        {formatter.format(item.price)}
                      </span>
                      {item.deliveryKw && (
                        <span className="text-[8px] font-black uppercase tracking-wider text-slate-400 dark:text-zinc-550 mt-1 select-none">
                          KW {item.deliveryKw}{item.deliveryYear ? ` / ${item.deliveryYear}` : ''}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5 opacity-60 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => startEditing(item)}
                        className="w-6 h-6 flex items-center justify-center rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-zinc-950 dark:hover:bg-zinc-800 text-slate-600 dark:text-zinc-400 transition cursor-pointer"
                        title="Bearbeiten"
                      >
                        <Pencil className="w-2.5 h-2.5" />
                      </button>
                      <button
                        onClick={() => onDelete(item.id)}
                        className="w-6 h-6 flex items-center justify-center rounded-lg bg-red-550/10 hover:bg-red-550/20 text-red-600 dark:text-red-400 transition cursor-pointer"
                        title="Löschen"
                      >
                        <Trash2 className="w-2.5 h-2.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

    </div>
  );
};

// Simple date parser helper for compact card top row
function formatOrderShortDate(isoStr?: string) {
  if (!isoStr) return '';
  try {
    const d = new Date(isoStr);
    return d.toLocaleDateString('de-DE', {
      day: 'numeric',
      month: 'short',
    });
  } catch (e) {
    return isoStr;
  }
}
