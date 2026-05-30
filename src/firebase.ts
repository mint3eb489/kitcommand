/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, collection, CollectionReference, DocumentData } from 'firebase/firestore';
import { OperationType, FirestoreErrorInfo } from './types.ts';

// Default configuration from user template
const myConfig = {
  apiKey: "AIzaSyCAoHre4UD7u88JyGvyPYzrfm50OsMOrZ8",
  authDomain: "lithoscalepro.firebaseapp.com",
  projectId: "lithoscalepro",
  storageBucket: "lithoscalepro.firebasestorage.app",
  messagingSenderId: "1090400345045",
  appId: "1:1090400345045:web:fd1cc58fd1e620a9127b5c"
};

// Direct check for platform-injected firebase config or fallback
let activeConfig = myConfig;
const win = window as any;

if (typeof win.__firebase_config !== 'undefined') {
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
  const isStudioEnv = typeof win.__firebase_config !== 'undefined';

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
