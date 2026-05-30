/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { X, Trash2, Calendar, Pencil, FileText } from 'lucide-react';

// ==========================================
// 1. EDIT PRICE MODAL
// ==========================================
interface EditPriceModalProps {
  id: string | null;
  currentName: string;
  currentPrice: number;
  onClose: () => void;
  onSave: (id: string, newName: string, newPrice: number) => Promise<void>;
}

export const EditPriceModal: React.FC<EditPriceModalProps> = ({
  id,
  currentName,
  currentPrice,
  onClose,
  onSave,
}) => {
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (id !== null) {
      setName(currentName || '');
      setPrice(currentPrice.toString().replace('.', ','));
    }
  }, [id, currentName, currentPrice]);

  if (id === null) return null;

  const handleSave = async () => {
    if (saving) return;
    setSaving(true);
    const parsed = parseFloat(price.replace(',', '.')) || 0;
    try {
      await onSave(id, name.trim(), parsed);
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
      <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 p-8 max-w-sm w-full rounded-2xl shadow-2xl modal-fade border-blue-500/50">
        <div className="text-center mb-6">
          <h2 className="text-xl font-black tracking-tight text-slate-800 dark:text-slate-100">
            Kommission bearbeiten
          </h2>
        </div>
        <div className="flex flex-col gap-4 mb-6">
          <div className="flex flex-col gap-1.5 text-left">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">
              Kunde / Kommissions-Nr.
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="input-field text-sm bg-transparent dark:text-white"
              placeholder="Name der Kommission"
            />
          </div>
          <div className="flex flex-col gap-1.5 text-left">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">
              Kaufpreis
            </label>
            <div className="relative">
              <input
                type="text"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                inputMode="decimal"
                className="input-field text-sm font-mono text-left pl-3 pr-8 bg-transparent dark:text-white"
                placeholder="Neuer Kaufpreis"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold font-sans">
                €
              </span>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 pb-1">
          <button
            onClick={onClose}
            className="py-3 rounded-xl font-bold text-xs uppercase tracking-widest bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-slate-300 active:scale-95 transition-transform cursor-pointer"
          >
            Abbrechen
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="py-3 rounded-xl font-bold text-xs uppercase tracking-widest bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-600/20 active:scale-95 transition-transform cursor-pointer disabled:opacity-50"
          >
            {saving ? 'Speichert...' : 'Speichern'}
          </button>
        </div>
      </div>
    </div>
  );
};

// ==========================================
// 2. EDIT DATE MODAL
// ==========================================
interface EditDateModalProps {
  id: string | null;
  currentResolvedAt: string;
  onClose: () => void;
  onSave: (id: string, newDateStr: string) => Promise<void>;
}

export const EditDateModal: React.FC<EditDateModalProps> = ({
  id,
  currentResolvedAt,
  onClose,
  onSave,
}) => {
  const [date, setDate] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (id !== null) {
      if (currentResolvedAt) {
        setDate(currentResolvedAt.split('T')[0]);
      } else {
        setDate(new Date().toISOString().split('T')[0]);
      }
    }
  }, [id, currentResolvedAt]);

  if (id === null) return null;

  const handleSave = async () => {
    if (saving || !date) return;
    setSaving(true);
    try {
      const newIsoDate = new Date(date).toISOString();
      await onSave(id, newIsoDate);
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
      <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 p-8 max-w-sm w-full rounded-2xl shadow-2xl modal-fade border-emerald-500/50">
        <div className="text-center mb-6">
          <h2 className="text-xl font-black tracking-tight text-slate-800 dark:text-slate-100">
            Abschlussdatum ändern
          </h2>
          <p className="text-xs text-slate-500 mt-2 font-medium">
            Bestimmt, in welchem Monat/Jahr der Umsatz in der Statistik gebucht wird.
          </p>
        </div>
        <div className="relative mb-6">
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="input-field text-sm text-center bg-transparent dark:text-white"
          />
        </div>
        <div className="grid grid-cols-2 gap-3 pb-1">
          <button
            onClick={onClose}
            className="py-3 rounded-xl font-bold text-xs uppercase tracking-widest bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-slate-300 active:scale-95 transition-transform cursor-pointer"
          >
            Abbrechen
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="py-3 rounded-xl font-bold text-xs uppercase tracking-widest bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg shadow-emerald-500/20 active:scale-95 transition-transform cursor-pointer disabled:opacity-50"
          >
            {saving ? 'Speichert...' : 'Speichern'}
          </button>
        </div>
      </div>
    </div>
  );
};

// ==========================================
// 3. EDIT NOTE MODAL
// ==========================================
interface EditNoteModalProps {
  id: string | null;
  currentNote: string;
  onClose: () => void;
  onSave: (id: string, newNoteText: string) => Promise<void>;
}

export const EditNoteModal: React.FC<EditNoteModalProps> = ({
  id,
  currentNote,
  onClose,
  onSave,
}) => {
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (id !== null) {
      setNote(currentNote || '');
    }
  }, [id, currentNote]);

  if (id === null) return null;

  const handleSave = async () => {
    if (saving) return;
    setSaving(true);
    try {
      await onSave(id, note.trim());
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
      <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-805 p-8 max-w-sm w-full rounded-2xl shadow-2xl modal-fade border-blue-500/50">
        <div className="text-center mb-6">
          <h2 className="text-xl font-black tracking-tight text-slate-800 dark:text-slate-100">
            Notiz zur Kommission
          </h2>
        </div>
        <div className="mb-6">
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={4}
            className="input-field text-sm w-full resize-none leading-relaxed bg-transparent dark:text-white"
            placeholder="z. B. Wartet auf Fliesenleger, Küche ist von Nolte, meldet sich in KW 15..."
          />
        </div>
        <div className="grid grid-cols-2 gap-3 pb-1">
          <button
            onClick={onClose}
            className="py-3 rounded-xl font-bold text-xs uppercase tracking-widest bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-slate-300 active:scale-95 transition-transform cursor-pointer"
          >
            Schließen
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="py-3 rounded-xl font-bold text-xs uppercase tracking-widest bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-600/20 active:scale-95 transition-transform cursor-pointer disabled:opacity-50"
          >
            {saving ? 'Speichert...' : 'Speichern'}
          </button>
        </div>
      </div>
    </div>
  );
};

// ==========================================
// 4. CONFIRM DELETE MODAL
// ==========================================
interface ConfirmDeleteModalProps {
  id: string | null;
  onClose: () => void;
  onConfirm: (id: string) => Promise<void>;
}

export const ConfirmDeleteModal: React.FC<ConfirmDeleteModalProps> = ({
  id,
  onClose,
  onConfirm,
}) => {
  const [deleting, setDeleting] = useState(false);

  if (id === null) return null;

  const handleConfirm = async () => {
    if (deleting) return;
    setDeleting(true);
    try {
      await onConfirm(id);
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
      <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 p-8 max-w-sm w-full rounded-2xl shadow-2xl modal-fade border-orange-500/50">
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-orange-500/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Trash2 className="w-8 h-8 text-orange-500" />
          </div>
          <h2 className="text-xl font-black tracking-tight text-slate-800 dark:text-slate-100">
            Wirklich löschen?
          </h2>
          <p className="text-xs text-slate-500 mt-2 font-medium">
            Diese Aktion kann nicht rückgängig gemacht werden. Die Kommission verschwindet auch aus der Statistik.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-3 pb-1">
          <button
            onClick={onClose}
            className="py-3 rounded-xl font-bold text-xs uppercase tracking-widest bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-slate-300 active:scale-95 transition-transform cursor-pointer"
          >
            Abbrechen
          </button>
          <button
            onClick={handleConfirm}
            disabled={deleting}
            className="py-3 rounded-xl font-bold text-xs uppercase tracking-widest bg-red-500 hover:bg-red-650 text-white shadow-lg shadow-red-500/20 active:scale-95 transition-transform cursor-pointer disabled:opacity-50"
          >
            {deleting ? 'Löscht...' : 'Löschen'}
          </button>
        </div>
      </div>
    </div>
  );
};
