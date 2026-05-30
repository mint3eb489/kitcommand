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
  createdAt: string;
  lastContactAt: string;
  resolvedAt?: string | null;
  note?: string;
  needsVorab?: boolean;
  createdByEmail?: string;
  createdByUid?: string;
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
