/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth, getActiveFirebaseInfo } from '../firebase.ts';
import { Lock, Database, ShieldAlert, Eye, EyeOff } from 'lucide-react';

interface LoginOverlayProps {
  onLoginSuccess?: () => void;
}

export const LoginOverlay: React.FC<LoginOverlayProps> = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const fbInfo = getActiveFirebaseInfo();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (err: any) {
      console.error('Login error:', err);
      const errCode = err?.code || '';
      if (
        errCode === 'auth/invalid-credential' ||
        errCode === 'auth/user-not-found' ||
        errCode === 'auth/wrong-password'
      ) {
        setError('E-Mail oder Passwort ist falsch.');
      } else if (errCode === 'auth/too-many-requests') {
        setError('Zu viele Versuche wegen wiederholter Fehlanmeldungen. Bitte versuche es später erneut.');
      } else if (errCode === 'auth/unauthorized-domain') {
        setError(`Domain nicht autorisiert (${errCode}). Diese Domain muss in deiner Firebase-Konsole unter "Authentication -> Settings -> Authorized domains" eingetragen sein.`);
      } else if (errCode === 'auth/network-request-failed') {
        setError(`Netzwerkfehler (${errCode}). Bitte überprüfe deine Internetverbindung.`);
      } else if (errCode === 'auth/configuration-not-found') {
        setError(`Firebase Auth Konfiguration fehlt oder ist ungültig (${errCode}).`);
      } else {
        setError(`Anmeldefehler: ${err.message || errCode || 'Unbekanntes Problem'}. Bitte überprüfe deine Daten und dein Firebase-Projekt.`);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleToggleSandbox = () => {
    if (fbInfo.bypassSandbox) {
      localStorage.removeItem('bypass_sandbox');
    } else {
      localStorage.setItem('bypass_sandbox', 'true');
    }
    window.location.reload();
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
          <div className="relative w-full">
            <input
              type={showPassword ? 'text' : 'password'}
              id="login-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input-field text-sm w-full bg-slate-55/10 bg-transparent pr-11 dark:text-white"
              placeholder="Passwort"
              required
              disabled={loading}
            />
            <button
              type="button"
              tabIndex={-1}
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>

          {error && (
            <div id="login-error" className="p-3 rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/30 text-left flex gap-2">
              <ShieldAlert className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
              <p className="text-xs text-red-650 dark:text-red-400 font-medium leading-relaxed">
                {error}
              </p>
            </div>
          )}
          <button
            type="submit"
            disabled={loading}
            className="bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl font-bold text-xs uppercase tracking-widest shadow-lg shadow-blue-600/20 active:scale-95 transition-all w-full mt-2 cursor-pointer disabled:opacity-50"
          >
            {loading ? 'Prüfe/Lade...' : 'Anmelden'}
          </button>
        </form>

        {/* Info über das aktive Firebase Projekt & Sandbox Umschalter */}
        {fbInfo.hasStudioInjected && (
          <div className="mt-8 pt-4 border-t border-slate-150 dark:border-zinc-800 text-left">
            <div className="flex items-center gap-1.5 text-slate-400 dark:text-zinc-500 mb-2">
              <Database className="w-3.5 h-3.5" />
              <span className="text-[10px] font-bold uppercase tracking-wider">Verbindung & Umgebung</span>
            </div>
            
            {fbInfo.isSandbox ? (
              <div className="bg-amber-500/5 dark:bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 text-[11px] leading-relaxed text-slate-600 dark:text-zinc-400">
                <p className="font-medium text-amber-850 dark:text-amber-400 mb-1.5">
                  ⚠️ AI Studio-Vorschau aktiv
                </p>
                Melde dich mit deinen Vorschaudaten an. Möchtest du deine echten Live-Aufträge aus deinem eigenen Firebase-Projekt laden?
                <button
                  type="button"
                  onClick={handleToggleSandbox}
                  className="mt-2 text-blue-600 dark:text-blue-400 font-bold hover:underline cursor-pointer flex items-center gap-1"
                >
                  👉 Zu echten Live-Daten wechseln
                </button>
              </div>
            ) : (
              <div className="bg-emerald-500/5 dark:bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3 text-[11px] leading-relaxed text-slate-600 dark:text-zinc-400">
                <p className="font-medium text-emerald-850 dark:text-emerald-400 mb-1.5 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  Ganzheitlicher Live-Modus aktiv
                </p>
                Du bist direkt mit deinem produktiven System verbunden:
                <div className="mt-1 font-mono text-slate-500 dark:text-zinc-500 font-bold select-all bg-slate-100 dark:bg-zinc-950 p-1 rounded text-[10px]">
                  ID: {fbInfo.projectId}
                </div>
                <button
                  type="button"
                  onClick={handleToggleSandbox}
                  className="mt-2 text-slate-500 dark:text-zinc-400 font-bold hover:underline cursor-pointer"
                >
                  &larr; Zurück zur AI Studio Sandbox wechseln
                </button>
              </div>
            )}
          </div>
        )}

        {/* Standard-Anzeige falls außerhalb von AI Studio (z.B. nach Hosting-Deployment) */}
        {!fbInfo.hasStudioInjected && (
          <div className="mt-6 pt-4 border-t border-slate-150 dark:border-zinc-800 flex justify-between items-center text-[10px] text-slate-400 dark:text-zinc-500 font-mono">
            <span>Projekt-ID:</span>
            <span className="font-bold select-all">{fbInfo.projectId}</span>
          </div>
        )}

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
