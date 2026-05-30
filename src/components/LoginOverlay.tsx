/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../firebase.ts';
import { Lock } from 'lucide-react';

interface LoginOverlayProps {
  onLoginSuccess?: () => void;
}

export const LoginOverlay: React.FC<LoginOverlayProps> = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (err: any) {
      console.error('Login error:', err);
      if (
        err.code === 'auth/invalid-credential' ||
        err.code === 'auth/user-not-found' ||
        err.code === 'auth/wrong-password'
      ) {
        setError('E-Mail oder Passwort ist falsch.');
      } else if (err.code === 'auth/too-many-requests') {
        setError('Zu viele Versuche. Bitte versuche es später erneut.');
      } else {
        setError('Zugriff verweigert. Bitte überprüfe deine Daten.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      id="login-overlay"
      className="fixed inset-0 z-[300] bg-slate-50 dark:bg-black flex items-center justify-center p-4"
    >
      <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-850 p-8 max-w-sm w-full rounded-2xl shadow-2xl text-center">
        <div className="w-16 h-16 bg-blue-500/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
          <Lock className="w-8 h-8 text-blue-500" />
        </div>
        <h2 className="text-xl font-black tracking-tight text-slate-800 dark:text-slate-100 mb-2">
          Login
        </h2>
        <p className="text-xs text-slate-500 mb-6 font-medium">
          Bitte melde dich an, um KitCommand zu nutzen.
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <input
            type="email"
            id="login-email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="input-field text-sm w-full bg-slate-55/10 bg-transparent dark:text-white"
            placeholder="E-Mail Adresse"
            required
            autoFocus
            disabled={loading}
          />
          <input
            type="password"
            id="login-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="input-field text-sm w-full bg-slate-55/10 bg-transparent dark:text-white"
            placeholder="Passwort"
            required
            disabled={loading}
          />
          {error && (
            <p id="login-error" className="text-xs text-red-500 font-bold text-left">
              {error}
            </p>
          )}
          <button
            type="submit"
            disabled={loading}
            className="bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl font-bold text-xs uppercase tracking-widest shadow-lg shadow-blue-600/20 active:scale-95 transition-all w-full mt-2 cursor-pointer disabled:opacity-50"
          >
            {loading ? 'Prüfe...' : 'Anmelden'}
          </button>
        </form>

        <div className="mt-6 flex justify-center gap-4 text-[10px] text-slate-400 font-medium">
          <a
            href="https://www.fs-kuechen.de/impressum"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-blue-500 transition-colors"
          >
            Impressum
          </a>
          <span>&bull;</span>
          <a
            href="https://www.fs-kuechen.de/datenschutz"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-blue-500 transition-colors"
          >
            Datenschutz
          </a>
        </div>
      </div>
    </div>
  );
};
