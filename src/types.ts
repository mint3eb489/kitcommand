/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Commission {
  id: string;
  name: string;
  price: number;
  status: 'open' | 'sold' | 'lost';
  bauart: 'bestand' | 'neubau' | 'kleinauftrag';
  isNeubau: boolean;
  vorabPlan: boolean;
  vorabAb: boolean;
  aufmass: boolean;
  installationsplan: boolean;
  abVerschickt: boolean;
  bestellt: boolean;
  bestelltAt?: string | null;
  deliveryKw?: string; // e.g. "24" or ""
  deliveryYear?: string; // e.g. "2026" or ""
  createdAt: string;
  lastContactAt: string;
  resolvedAt?: string | null;
  note?: string;
  needsVorab?: boolean;
  createdByEmail?: string;
  createdByUid?: string;
  city?: string;
  orderNumber?: string;
}

export interface SystemSettings {
  annualTarget: number;
  yearlyTargets?: Record<string, number>;
  adminEmails?: string[];
}

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export interface Ausarbeitung {
  id: string;
  customerName: string;
  colleagueName: string;
  orderNumber: string;
  price: number;
  orderedAt: string;
  createdAt: string;
  createdByEmail: string;
  createdByUid: string;
  note?: string;
  deliveryKw?: string;
  deliveryYear?: string;
  city?: string;
}

export interface TeammateConfig {
  email: string;
  name: string;
  isActive: boolean;
}


