/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, collection, CollectionReference, DocumentData } from 'firebase/firestore';
import { OperationType, FirestoreErrorInfo } from './types.ts';

// Default configuration from user template
// HINWEIS: Ersetze diese Werte durch deine tatsächlichen Werte für "kitcommand-74650" aus deiner Firebase-Konsole!
// (Projekt-Einstellungen -> Allgemein -> Deine Apps -> Web-App)
const metaEnv = (import.meta as any).env || {};
const myConfig = {
  apiKey: metaEnv.VITE_FIREBASE_API_KEY || "AIzaSyCAoHre4UD7u88JyGvyPYzrfm50OsMOrZ8",
  authDomain: metaEnv.VITE_FIREBASE_AUTH_DOMAIN || "lithoscalepro.firebaseapp.com", // oder "kitcommand-74650.firebaseapp.com"
  projectId: metaEnv.VITE_FIREBASE_PROJECT_ID || "lithoscalepro", // oder "kitcommand-74650"
  storageBucket: metaEnv.VITE_FIREBASE_STORAGE_BUCKET || "lithoscalepro.firebasestorage.app", // oder "kitcommand-74650.firebasestorage.app"
  messagingSenderId: metaEnv.VITE_FIREBASE_MESSAGING_SENDER_ID || "1090400345045",
  appId: metaEnv.VITE_FIREBASE_APP_ID || "1:1090400345045:web:fd1cc58fd1e620a9127b5c"
};

const win = window as any;

// Überprüfe, ob der Benutzer die Sandbox in der AI Studio-Umgebung explizit umgehen möchte,
// um seine echten Daten aus der produktiven Firebase-Datenbank zu laden.
const bypassSandbox = localStorage.getItem('bypass_sandbox') === 'true';

// Direct check for platform-injected firebase config or fallback
let activeConfig = myConfig;
const isStudioInjected = typeof win.__firebase_config !== 'undefined';

if (isStudioInjected && !bypassSandbox) {
  try {
    if (typeof win.__firebase_config === 'string') {
      activeConfig = JSON.parse(win.__firebase_config);
    } else {
      activeConfig = win.__firebase_config;
    }
  } catch (e) {
    console.error("Failed to parse __firebase_config from window:", e);
  }
}

const app = initializeApp(activeConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

// Hilfsfunktionen für die UI, um den aktiven Status anzuzeigen
export function getActiveFirebaseInfo() {
  return {
    projectId: activeConfig.projectId,
    isSandbox: isStudioInjected && !bypassSandbox,
    hasStudioInjected: isStudioInjected,
    bypassSandbox
  };
}

export const ADMIN_EMAILS = [
  'belmonte@fs-kuechen.de',
  'belmonte.enrico@gmail.com'
];

export function isUserAdmin(email: string | null | undefined): boolean {
  if (!email) return false;
  return ADMIN_EMAILS.includes(email.toLowerCase());
}

/**
 * Returns the proper Firestore collection reference.
 * Sandboxes under 'artifacts/<appId>/kuechen_commissions' in AI Studio env,
 * or drops back to shared root collection 'kuechen_commissions' for standard/live sites.
 * This guarantees that all historical data is immediately visible.
 */
export function getDbCollectionRef(): CollectionReference<DocumentData, DocumentData> {
  const isStudioEnv = isStudioInjected && !bypassSandbox;

  if (isStudioEnv) {
    const appId = typeof win.__app_id !== 'undefined' ? win.__app_id : '27f298b5-15e3-41c7-b5db-50041df42451';
    return collection(db, 'artifacts', appId, 'kuechen_commissions');
  } else {
    // Shared live/production root collection.
    // By pointing back here, we restore 100% of the active sales data immediately!
    return collection(db, 'kuechen_commissions');
  }
}

/**
 * Standardized Firestore error logging, matching FirestoreErrorInfo constraints.
 */
export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}
