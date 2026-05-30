/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { X } from 'lucide-react';

interface AddCommissionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (name: string, price: number, bauart: 'bestand' | 'neubau' | 'kleinauftrag') => Promise<void>;
}

export const AddCommissionModal: React.FC<AddCommissionModalProps> = ({
  isOpen,
  onClose,
  onSave,
}) => {
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [bauart, setBauart] = useState<'bestand' | 'neubau' | 'kleinauftrag'>('bestand');
  const [saving, setSaving] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving) return;
    setSaving(true);

    const parsedPrice = parseFloat(price.replace(',', '.')) || 0;

    try {
      await onSave(name.trim(), parsedPrice, bauart);
      setName('');
      setPrice('');
      setBauart('bestand');
      onClose();
    } catch (err) {
      console.error('Failed to create commission:', err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
      <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-805 p-6 md:p-8 max-w-sm w-full rounded-2xl shadow-2xl modal-fade border-blue-500/50 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>
        <h2 className="text-xl font-black tracking-tight text-slate-800 dark:text-slate-100 mb-6">
          Neue Kommission
        </h2>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Kunde / Kommissions-Nr."
            required
            className="input-field text-sm bg-transparent dark:text-white"
          />
          <div className="relative">
            <input
              type="text"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="Kaufpreis"
              required
              inputMode="decimal"
              className="input-field text-sm font-mono text-left pl-3 pr-8 bg-transparent dark:text-white"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">
              €
            </span>
          </div>

          {/* Bauart Toggle */}
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-zinc-950 p-1 rounded-xl w-full shadow-inner mt-2">
            <label className="flex-1 relative cursor-pointer">
              <input
                type="radio"
                name="bauart_form"
                value="bestand"
                checked={bauart === 'bestand'}
                onChange={() => setBauart('bestand')}
                className="peer sr-only"
              />
              <div className="px-2 py-2.5 rounded-lg text-[10px] sm:text-xs font-bold uppercase tracking-widest text-slate-400 hover:bg-white dark:hover:bg-zinc-900 peer-checked:bg-blue-600 peer-checked:text-white transition-all text-center select-none">
                Bestand
              </div>
            </label>
            <label className="flex-1 relative cursor-pointer">
              <input
                type="radio"
                name="bauart_form"
                value="neubau"
                checked={bauart === 'neubau'}
                onChange={() => setBauart('neubau')}
                className="peer sr-only"
              />
              <div className="px-2 py-2.5 rounded-lg text-[10px] sm:text-xs font-bold uppercase tracking-widest text-slate-400 hover:bg-white dark:hover:bg-zinc-900 peer-checked:bg-blue-600 peer-checked:text-white transition-all text-center select-none">
                Neubau
              </div>
            </label>
            <label className="flex-1 relative cursor-pointer">
              <input
                type="radio"
                name="bauart_form"
                value="kleinauftrag"
                checked={bauart === 'kleinauftrag'}
                onChange={() => setBauart('kleinauftrag')}
                className="peer sr-only"
              />
              <div
                className="px-2 py-2.5 rounded-lg text-[10px] sm:text-xs font-bold uppercase tracking-widest text-slate-400 hover:bg-white dark:hover:bg-zinc-900 peer-checked:bg-purple-600 peer-checked:text-white transition-all text-center select-none"
                title="Zählt zum Umsatz, aber nicht in die Abschlussquote"
              >
                Kleinauf.
              </div>
            </label>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="bg-blue-600 hover:bg-blue-700 text-white py-3.5 rounded-xl font-bold text-xs uppercase tracking-widest shadow-lg shadow-blue-600/20 active:scale-95 transition-all w-full mt-4 cursor-pointer disabled:opacity-50"
          >
            {saving ? 'Speichert...' : 'Speichern'}
          </button>
        </form>
      </div>
    </div>
  );
};
