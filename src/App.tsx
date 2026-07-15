/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useMemo } from 'react';
import { onAuthStateChanged, signOut, User } from 'firebase/auth';
import { onSnapshot, addDoc, updateDoc, doc, deleteDoc, setDoc, deleteField } from 'firebase/firestore';
import { auth, getDbCollectionRef, getAusarbeitungenCollectionRef, handleFirestoreError, isUserAdmin, ADMIN_EMAILS } from './firebase.ts';
import { Commission, OperationType, Ausarbeitung, TeammateConfig } from './types.ts';
import { normalizeYear } from './utils/date.ts';
import { LoginOverlay } from './components/LoginOverlay.tsx';
import { CommissionCard } from './components/CommissionCard.tsx';
import { StatsTab } from './components/StatsTab.tsx';
import { AdminTab } from './components/AdminTab.tsx';
import { AddCommissionModal } from './components/AddCommissionModal.tsx';
import { AusarbeitungenTab } from './components/AusarbeitungenTab.tsx';
import { UserProfileModal } from './components/UserProfileModal.tsx';
import {
  EditPriceModal,
  EditDateModal,
  EditNoteModal,
  ConfirmDeleteModal,
} from './components/EditModals.tsx';
import { Search, Plus, Clipboard, ChevronDown, CheckCircle, Flame, X, TrendingUp, Sparkles, Settings, LayoutGrid, LayoutList, User as UserIcon } from 'lucide-react';

const INITIAL_DEMO_COMMISSIONS: Commission[] = [
  // 5 running offers (status: 'open', bestellt: false)
  {
    id: 'demo-open-1',
    name: 'Müller-Bruchsal / EFH Neubau',
    price: 18500,
    status: 'open',
    bauart: 'neubau',
    isNeubau: true,
    vorabPlan: true,
    vorabAb: false,
    aufmass: true,
    installationsplan: false,
    abVerschickt: false,
    bestellt: false,
    createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    lastContactAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    note: 'Küche mit Kochinsel, wartet auf finale Elektroplanfreigabe.',
    createdByEmail: 'gast@fs-kuechen.de',
    createdByUid: 'demo-guest-uid'
  },
  {
    id: 'demo-open-2',
    name: 'Schmidt-Ettlingen / Küche Umbau',
    price: 12400,
    status: 'open',
    bauart: 'bestand',
    isNeubau: false,
    vorabPlan: false,
    vorabAb: false,
    aufmass: false,
    installationsplan: false,
    abVerschickt: false,
    bestellt: false,
    createdAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(),
    lastContactAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    note: 'Altbausanierung. Aufmaß erfolgt nach Demontage der Altküche.',
    createdByEmail: 'gast@fs-kuechen.de',
    createdByUid: 'demo-guest-uid'
  },
  {
    id: 'demo-open-3',
    name: 'Bauer-Karlsruhe / Einliegerwohnung',
    price: 6800,
    status: 'open',
    bauart: 'kleinauftrag',
    isNeubau: false,
    vorabPlan: false,
    vorabAb: false,
    aufmass: true,
    installationsplan: true,
    abVerschickt: false,
    bestellt: false,
    createdAt: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000).toISOString(),
    lastContactAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
    note: 'Kompakte Küchenzeile. Geräte komplett von Siemens.',
    createdByEmail: 'gast@fs-kuechen.de',
    createdByUid: 'demo-guest-uid'
  },
  {
    id: 'demo-open-4',
    name: 'Wagner-Stutensee / Zeilenküche',
    price: 9200,
    status: 'open',
    bauart: 'bestand',
    isNeubau: false,
    vorabPlan: true,
    vorabAb: true,
    aufmass: false,
    installationsplan: false,
    abVerschickt: false,
    bestellt: false,
    createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    lastContactAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    note: 'Nolte Küche in Lacklaminat weiß matt. Granitarbeitsplatte gewünscht.',
    createdByEmail: 'gast@fs-kuechen.de',
    createdByUid: 'demo-guest-uid'
  },
  {
    id: 'demo-open-5',
    name: 'Hoffmann-Pforzheim / Penthouse',
    price: 32500,
    status: 'open',
    bauart: 'neubau',
    isNeubau: true,
    vorabPlan: false,
    vorabAb: false,
    aufmass: false,
    installationsplan: false,
    abVerschickt: false,
    bestellt: false,
    createdAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
    lastContactAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    note: 'Premium Designküche mit Next125 Fronten, Bora Kochfeld und Miele Geräten.',
    createdByEmail: 'gast@fs-kuechen.de',
    createdByUid: 'demo-guest-uid'
  },

  // 5 in bearbeitung (status: 'sold', bestellt: false)
  {
    id: 'demo-sold-1',
    name: 'Fischer-Karlsdorf / Zeile + Block',
    price: 15300,
    status: 'sold',
    bauart: 'bestand',
    isNeubau: false,
    vorabPlan: true,
    vorabAb: true,
    aufmass: true,
    installationsplan: true,
    abVerschickt: true,
    bestellt: false,
    createdAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(),
    lastContactAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    resolvedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
    note: 'Installationspläne verschickt. Kunde prüft die Maße.',
    createdByEmail: 'gast@fs-kuechen.de',
    createdByUid: 'demo-guest-uid'
  },
  {
    id: 'demo-sold-2',
    name: 'Weber-Bruchsal / L-Küche Landhaus',
    price: 14200,
    status: 'sold',
    bauart: 'bestand',
    isNeubau: false,
    vorabPlan: true,
    vorabAb: false,
    aufmass: true,
    installationsplan: false,
    abVerschickt: false,
    bestellt: false,
    createdAt: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000).toISOString(),
    lastContactAt: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000).toISOString(),
    resolvedAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
    note: 'Landhausküche barrierefrei. Aufmaß ist erledigt.',
    createdByEmail: 'gast@fs-kuechen.de',
    createdByUid: 'demo-guest-uid'
  },
  {
    id: 'demo-sold-3',
    name: 'Becker-Karlsruhe / StudentenWG',
    price: 5200,
    status: 'sold',
    bauart: 'kleinauftrag',
    isNeubau: false,
    vorabPlan: false,
    vorabAb: false,
    aufmass: true,
    installationsplan: false,
    abVerschickt: false,
    bestellt: false,
    createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    lastContactAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    resolvedAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(),
    note: 'Lieferung und Montage im August geplant.',
    createdByEmail: 'gast@fs-kuechen.de',
    createdByUid: 'demo-guest-uid'
  },
  {
    id: 'demo-sold-4',
    name: 'Klein-Rastatt / Loft Küche',
    price: 21900,
    status: 'sold',
    bauart: 'bestand',
    isNeubau: false,
    vorabPlan: true,
    vorabAb: true,
    aufmass: true,
    installationsplan: true,
    abVerschickt: true,
    bestellt: false,
    createdAt: new Date(Date.now() - 18 * 24 * 60 * 60 * 1000).toISOString(),
    lastContactAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    resolvedAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(),
    note: 'Inkl. Sideboard im Esszimmer. Elektrogeräte komplett von Bosch.',
    createdByEmail: 'gast@fs-kuechen.de',
    createdByUid: 'demo-guest-uid'
  },
  {
    id: 'demo-sold-5',
    name: 'Schulz-Linkenheim / Hausumbau',
    price: 17800,
    status: 'sold',
    bauart: 'neubau',
    isNeubau: true,
    vorabPlan: true,
    vorabAb: false,
    aufmass: false,
    installationsplan: true,
    abVerschickt: false,
    bestellt: false,
    createdAt: new Date(Date.now() - 40 * 24 * 60 * 60 * 1000).toISOString(),
    lastContactAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
    resolvedAt: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000).toISOString(),
    note: 'Wanddurchbruch geplant. Installationspläne freigegeben.',
    createdByEmail: 'gast@fs-kuechen.de',
    createdByUid: 'demo-guest-uid'
  },

  // 10 bestellte Kommissionen (status: 'sold', bestellt: true)
  {
    id: 'demo-archived-1',
    name: 'Hartmann-Ettlingen / Küche + HWR',
    price: 24500,
    status: 'sold',
    bauart: 'bestand',
    isNeubau: false,
    vorabPlan: true,
    vorabAb: true,
    aufmass: true,
    installationsplan: true,
    abVerschickt: true,
    bestellt: true,
    bestelltAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
    deliveryKw: '38',
    deliveryYear: '2026',
    createdAt: new Date(Date.now() - 50 * 24 * 60 * 60 * 1000).toISOString(),
    lastContactAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
    resolvedAt: new Date(Date.now() - 35 * 24 * 60 * 60 * 1000).toISOString(),
    note: 'Bestellt bei Schüller. HWR-Möbel ebenfalls enthalten.',
    createdByEmail: 'gast@fs-kuechen.de',
    createdByUid: 'demo-guest-uid'
  },
  {
    id: 'demo-archived-2',
    name: 'Lang-Stuttgart / Penthouse',
    price: 38200,
    status: 'sold',
    bauart: 'neubau',
    isNeubau: true,
    vorabPlan: true,
    vorabAb: true,
    aufmass: true,
    installationsplan: true,
    abVerschickt: true,
    bestellt: true,
    bestelltAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
    deliveryKw: '42',
    deliveryYear: '2026',
    createdAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(),
    lastContactAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
    resolvedAt: new Date(Date.now() - 40 * 24 * 60 * 60 * 1000).toISOString(),
    note: 'Nobilia XL Arbeitshöhe, Quooker Flex PRO3, Neff Backofen mit Slide&Hide.',
    createdByEmail: 'gast@fs-kuechen.de',
    createdByUid: 'demo-guest-uid'
  },
  {
    id: 'demo-archived-3',
    name: 'Jung-Eggenstein / Zeilenküche',
    price: 8900,
    status: 'sold',
    bauart: 'bestand',
    isNeubau: false,
    vorabPlan: true,
    vorabAb: true,
    aufmass: true,
    installationsplan: true,
    abVerschickt: true,
    bestellt: true,
    bestelltAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    deliveryKw: '34',
    deliveryYear: '2026',
    createdAt: new Date(Date.now() - 22 * 24 * 60 * 60 * 1000).toISOString(),
    lastContactAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    resolvedAt: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000).toISOString(),
    note: 'Inkl. Blanco Spüle und Mülltrennsystem.',
    createdByEmail: 'gast@fs-kuechen.de',
    createdByUid: 'demo-guest-uid'
  },
  {
    id: 'demo-archived-4',
    name: 'Vogel-Wörth / Neubau DHH',
    price: 19105,
    status: 'sold',
    bauart: 'neubau',
    isNeubau: true,
    vorabPlan: true,
    vorabAb: true,
    aufmass: true,
    installationsplan: true,
    abVerschickt: true,
    bestellt: true,
    bestelltAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
    deliveryKw: '40',
    deliveryYear: '2026',
    createdAt: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString(),
    lastContactAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
    resolvedAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    note: 'Bora GP4 Kochfeld, Arbeitsplatte Schichtstoff Eiche Sierra.',
    createdByEmail: 'gast@fs-kuechen.de',
    createdByUid: 'demo-guest-uid'
  },
  {
    id: 'demo-archived-5',
    name: 'Kranz-Karlsruhe / Austausch Geräte',
    price: 4300,
    status: 'sold',
    bauart: 'kleinauftrag',
    isNeubau: false,
    vorabPlan: false,
    vorabAb: false,
    aufmass: true,
    installationsplan: false,
    abVerschickt: true,
    bestellt: true,
    bestelltAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    deliveryKw: '31',
    deliveryYear: '2026',
    createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
    lastContactAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    resolvedAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(),
    note: 'Ausbau Altgeräte und Montage Miele Dampfgarer & Geschirrspüler.',
    createdByEmail: 'gast@fs-kuechen.de',
    createdByUid: 'demo-guest-uid'
  },
  {
    id: 'demo-archived-6',
    name: 'Huber-Landau / L-Form grifflos',
    price: 16500,
    status: 'sold',
    bauart: 'bestand',
    isNeubau: false,
    vorabPlan: true,
    vorabAb: true,
    aufmass: true,
    installationsplan: true,
    abVerschickt: true,
    bestellt: true,
    bestelltAt: new Date(Date.now() - 22 * 24 * 60 * 60 * 1000).toISOString(),
    deliveryKw: '36',
    deliveryYear: '2026',
    createdAt: new Date(Date.now() - 55 * 24 * 60 * 60 * 1000).toISOString(),
    lastContactAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(),
    resolvedAt: new Date(Date.now() - 42 * 24 * 60 * 60 * 1000).toISOString(),
    note: 'Schüller Fenix Anti-Fingerprint Fronten in Onyxschwarz.',
    createdByEmail: 'gast@fs-kuechen.de',
    createdByUid: 'demo-guest-uid'
  },
  {
    id: 'demo-archived-7',
    name: 'Zimmermann-Durlach / EFH Neubau',
    price: 27900,
    status: 'sold',
    bauart: 'neubau',
    isNeubau: true,
    vorabPlan: true,
    vorabAb: true,
    aufmass: true,
    installationsplan: true,
    abVerschickt: true,
    bestellt: true,
    bestelltAt: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000).toISOString(),
    deliveryKw: '44',
    deliveryYear: '2026',
    createdAt: new Date(Date.now() - 70 * 24 * 60 * 60 * 1000).toISOString(),
    lastContactAt: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000).toISOString(),
    resolvedAt: new Date(Date.now() - 50 * 24 * 60 * 60 * 1000).toISOString(),
    note: 'Insel-Esse, Keramik-Arbeitsplatte, Miele Komplettausstattung.',
    createdByEmail: 'gast@fs-kuechen.de',
    createdByUid: 'demo-guest-uid'
  },
  {
    id: 'demo-archived-8',
    name: 'Neu-Karlsruhe / Single Küche',
    price: 7500,
    status: 'sold',
    bauart: 'bestand',
    isNeubau: false,
    vorabPlan: true,
    vorabAb: true,
    aufmass: true,
    installationsplan: true,
    abVerschickt: true,
    bestellt: true,
    bestelltAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(),
    deliveryKw: '33',
    deliveryYear: '2026',
    createdAt: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000).toISOString(),
    lastContactAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(),
    resolvedAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
    note: 'Nobilia Speed in Sand. Küchenzeile 3,20 Meter breit.',
    createdByEmail: 'gast@fs-kuechen.de',
    createdByUid: 'demo-guest-uid'
  },
  {
    id: 'demo-archived-9',
    name: 'Graf-Rheinstetten / Massivholzküche',
    price: 34000,
    status: 'sold',
    bauart: 'bestand',
    isNeubau: false,
    vorabPlan: true,
    vorabAb: true,
    aufmass: true,
    installationsplan: true,
    abVerschickt: true,
    bestellt: true,
    bestelltAt: new Date(Date.now() - 18 * 24 * 60 * 60 * 1000).toISOString(),
    deliveryKw: '41',
    deliveryYear: '2026',
    createdAt: new Date(Date.now() - 80 * 24 * 60 * 60 * 1000).toISOString(),
    lastContactAt: new Date(Date.now() - 18 * 24 * 60 * 60 * 1000).toISOString(),
    resolvedAt: new Date(Date.now() - 55 * 24 * 60 * 60 * 1000).toISOString(),
    note: 'Team7 Küche in Erle massiv. Bora Classic Flex Induktion.',
    createdByEmail: 'gast@fs-kuechen.de',
    createdByUid: 'demo-guest-uid'
  },
  {
    id: 'demo-archived-10',
    name: 'Werner-Malsch / Modernisierung',
    price: 11400,
    status: 'sold',
    bauart: 'bestand',
    isNeubau: false,
    vorabPlan: true,
    vorabAb: true,
    aufmass: true,
    installationsplan: true,
    abVerschickt: true,
    bestellt: true,
    bestelltAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
    deliveryKw: '35',
    deliveryYear: '2026',
    createdAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(),
    lastContactAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
    resolvedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
    note: 'Arbeitsplattenaustausch in Naturstein + neue Blanco Einbauspüle.',
    createdByEmail: 'gast@fs-kuechen.de',
    createdByUid: 'demo-guest-uid'
  }
];

const INITIAL_DEMO_AUSARBEITUNGEN: Ausarbeitung[] = [
  {
    id: 'demo-aus-1',
    customerName: 'Klaus-Philipp / Neubau',
    colleagueName: 'Frau Müller',
    orderNumber: 'AB-2026-987',
    price: 13500,
    orderedAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    createdAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
    createdByEmail: 'gast@fs-kuechen.de',
    createdByUid: 'demo-guest-uid',
    note: 'Arbeitsplattenmaß ist noch unsicher.',
    deliveryKw: '36',
    deliveryYear: '2026',
    city: 'Rottenburg'
  },
  {
    id: 'demo-aus-2',
    customerName: 'Maier-Kandel / Musterhaus',
    colleagueName: 'Herr Weber',
    orderNumber: 'AB-2026-1024',
    price: 21000,
    orderedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
    createdByEmail: 'gast@fs-kuechen.de',
    createdByUid: 'demo-guest-uid',
    note: 'Inklusive Glasrückwand.',
    deliveryKw: '40',
    deliveryYear: '2026',
    city: 'Meßkirch'
  }
];

export default function App() {
  // Auth & General States
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    if (sessionStorage.getItem('kk_is_demo_mode') === 'true') {
      return {
        uid: 'demo-guest-uid',
        email: 'gast@fs-kuechen.de',
        displayName: 'Gast-Tester',
        isAnonymous: false,
        emailVerified: true
      } as any;
    }
    return null;
  });
  const [authChecked, setAuthChecked] = useState(false);
  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [annualTarget, setAnnualTarget] = useState(1500000);
  const [yearlyTargets, setYearlyTargets] = useState<Record<string, number>>({});
  const [adminEmails, setAdminEmails] = useState<string[]>(['belmonte@fs-kuechen.de', 'belmonte.enrico@gmail.com']);
  const [teammateConfigs, setTeammateConfigs] = useState<TeammateConfig[]>([]);
  const [syncStatus, setSyncStatus] = useState<'connecting' | 'synced' | 'error'>('connecting');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // App Layout States
  const [activeTab, setActiveTab] = useState<'open' | 'sold' | 'ausarbeitung' | 'stats' | 'admin'>('open');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedColleague, setSelectedColleague] = useState<string>('all');
  
  // View Modes: Detailed vs Compact representation
  const [viewMode, setViewMode] = useState<'detailed' | 'compact'>(() => {
    return (localStorage.getItem('commission_view_mode') as 'detailed' | 'compact') || 'detailed';
  });

  const handleToggleViewMode = () => {
    const next = viewMode === 'detailed' ? 'compact' : 'detailed';
    setViewMode(next);
    localStorage.setItem('commission_view_mode', next);
  };
  
  // Theme type definition and modern state setup 
  type ThemeType = 'light' | 'dark' | 'sage' | 'ocean' | 'wood';
  const [theme, setTheme] = useState<ThemeType>('light');
  const [isSearchActive, setIsSearchActive] = useState(false);
  const [isHeaderSearchOpen, setIsHeaderSearchOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [targetProfileEmail, setTargetProfileEmail] = useState<string | null>(null);
  const [customLocalName, setCustomLocalName] = useState<string | null>(null);

  // General state for colleague-ordered kitchens (Ausarbeitungen)
  const [ausarbeitungen, setAusarbeitungen] = useState<Ausarbeitung[]>([]);

  // Collapse Accordion toggles
  const [openSection, setOpenSection] = useState(true);
  const [soldActiveSection, setSoldActiveSection] = useState(true);
  const [soldArchiveSection, setSoldArchiveSection] = useState(false);
  const [lostSection, setLostSection] = useState(false);

  // Modal states
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editPriceId, setEditPriceId] = useState<string | null>(null);
  const [editDateId, setEditDateId] = useState<string | null>(null);
  const [editNoteId, setEditNoteId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Support custom local name sync
  useEffect(() => {
    setCustomLocalName(localStorage.getItem('kk_custom_display_name'));
    const handleNameSync = () => {
      setCustomLocalName(localStorage.getItem('kk_custom_display_name'));
    };
    window.addEventListener('storage_custom_name_changed', handleNameSync);
    return () => window.removeEventListener('storage_custom_name_changed', handleNameSync);
  }, []);

  const applyThemeClasses = (t: ThemeType) => {
    document.documentElement.classList.remove('dark', 'theme-sage', 'theme-ocean', 'theme-wood');
    if (t === 'dark') {
      document.documentElement.classList.add('dark');
    } else if (t === 'sage') {
      document.documentElement.classList.add('theme-sage');
    } else if (t === 'ocean') {
      document.documentElement.classList.add('theme-ocean', 'dark');
    } else if (t === 'wood') {
      document.documentElement.classList.add('theme-wood');
    }
  };

  // Sync Theme Choice initially
  useEffect(() => {
    let cached = localStorage.getItem('kk_theme') as any;
    if (cached === 'emerald') {
      cached = 'sage';
      localStorage.setItem('kk_theme', 'sage');
    }
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    let initialTheme: ThemeType = (cached || 'light') as ThemeType;
    if (!localStorage.getItem('kk_theme')) {
      initialTheme = prefersDark ? 'dark' : 'light';
    }
    setTheme(initialTheme);
    applyThemeClasses(initialTheme);
  }, []);

  const toggleTheme = () => {
    const nextTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(nextTheme);
    localStorage.setItem('kk_theme', nextTheme);
    applyThemeClasses(nextTheme);
  };

  // Auth Listener
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      if (user) {
        // Enforce kicking out anonymous sessions in live sandbox environments if needed
        if (user.isAnonymous && typeof (window as any).__firebase_config === 'undefined') {
          signOut(auth);
          return;
        }
        setCurrentUser(user);
      } else {
        if (sessionStorage.getItem('kk_is_demo_mode') !== 'true') {
          setCurrentUser(null);
          setCommissions([]);
        } else {
          setCurrentUser({
            uid: 'demo-guest-uid',
            email: 'gast@fs-kuechen.de',
            displayName: 'Gast-Tester',
            isAnonymous: false,
            emailVerified: true
          } as any);
        }
      }
      setAuthChecked(true);
    });
    return () => unsub();
  }, []);

  // Real-Time Data Listeners (Triggers once authenticated)
  useEffect(() => {
    if (!currentUser) return;

    if (sessionStorage.getItem('kk_is_demo_mode') === 'true') {
      // Seed & load demo commissions instead of firestore
      const stored = sessionStorage.getItem('kk_demo_commissions');
      if (stored) {
        try {
          setCommissions(JSON.parse(stored));
        } catch (e) {
          setCommissions(INITIAL_DEMO_COMMISSIONS);
          sessionStorage.setItem('kk_demo_commissions', JSON.stringify(INITIAL_DEMO_COMMISSIONS));
        }
      } else {
        setCommissions(INITIAL_DEMO_COMMISSIONS);
        sessionStorage.setItem('kk_demo_commissions', JSON.stringify(INITIAL_DEMO_COMMISSIONS));
      }

      // Seed & load demo ausarbeitungen
      const storedAus = sessionStorage.getItem('kk_demo_ausarbeitungen');
      if (storedAus) {
        try {
          setAusarbeitungen(JSON.parse(storedAus));
        } catch (e) {
          setAusarbeitungen(INITIAL_DEMO_AUSARBEITUNGEN);
          sessionStorage.setItem('kk_demo_ausarbeitungen', JSON.stringify(INITIAL_DEMO_AUSARBEITUNGEN));
        }
      } else {
        setAusarbeitungen(INITIAL_DEMO_AUSARBEITUNGEN);
        sessionStorage.setItem('kk_demo_ausarbeitungen', JSON.stringify(INITIAL_DEMO_AUSARBEITUNGEN));
      }

      // Load demo targets and teammates
      const storedTeammates = sessionStorage.getItem('kk_demo_teammates');
      if (storedTeammates) {
        try {
          setTeammateConfigs(JSON.parse(storedTeammates));
        } catch (e) {}
      } else {
        const defaultTeammates = [
          { email: 'gast@fs-kuechen.de', name: 'Gast-Tester', isActive: true }
        ];
        setTeammateConfigs(defaultTeammates);
        sessionStorage.setItem('kk_demo_teammates', JSON.stringify(defaultTeammates));
      }

      const storedYearlyTargets = sessionStorage.getItem('kk_demo_yearly_targets');
      if (storedYearlyTargets) {
        try {
          setYearlyTargets(JSON.parse(storedYearlyTargets));
        } catch (e) {}
      }

      const storedAdminEmails = sessionStorage.getItem('kk_demo_admin_emails');
      if (storedAdminEmails) {
        try {
          setAdminEmails(JSON.parse(storedAdminEmails));
        } catch (e) {}
      } else {
        setAdminEmails(['gast@fs-kuechen.de', 'belmonte@fs-kuechen.de', 'belmonte.enrico@gmail.com']);
      }

      const storedAnnualTarget = sessionStorage.getItem('kk_demo_annual_target');
      if (storedAnnualTarget) {
        setAnnualTarget(parseInt(storedAnnualTarget) || 1500000);
      }

      setSyncStatus('synced');
      return;
    }

    setSyncStatus('connecting');
    const colRef = getDbCollectionRef();

    // 1. Settings Snapshot
    const settingsDocRef = doc(colRef, '_system_settings_');
    const unsubSettings = onSnapshot(
      settingsDocRef,
      (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (data.annualTarget) {
            setAnnualTarget(data.annualTarget);
          }
          if (data.yearlyTargets) {
            setYearlyTargets(data.yearlyTargets);
          } else {
            setYearlyTargets({});
          }
          if (data.adminEmails) {
            setAdminEmails(Array.from(new Set([
              'belmonte@fs-kuechen.de',
              'belmonte.enrico@gmail.com',
              ...data.adminEmails.map((e: string) => e.toLowerCase().trim())
            ])));
          } else {
            setAdminEmails(['belmonte@fs-kuechen.de', 'belmonte.enrico@gmail.com']);
          }
          if (data.teammates) {
            setTeammateConfigs(data.teammates);
          } else {
            setTeammateConfigs([]);
          }
        }
      },
      (error) => {
        console.error('Settings Firestore-Error:', error);
      }
    );

    // 2. Commissions Snapshot
    const unsubCommissions = onSnapshot(
      colRef,
      (snapshot) => {
        const loadedCommissions = snapshot.docs
          .filter((doc) => doc.id !== '_system_settings_')
          .map((doc) => {
            const data = doc.data();
            return {
              id: doc.id,
              ...data,
            } as Commission;
          });

        // Trigger dynamic migration: tag blank or gmail accounts under 'belmonte@fs-kuechen.de'
        loadedCommissions.forEach(async (c) => {
          const emailLower = (c.createdByEmail || '').toLowerCase().trim();
          if (!emailLower || emailLower === 'belmonte.enrico@gmail.com') {
            try {
              const docRef = doc(colRef, c.id);
              await updateDoc(docRef, {
                createdByEmail: 'belmonte@fs-kuechen.de'
              });
            } catch (err) {
              console.error('Migration error for commission item:', c.id, err);
            }
          }
        });

        setCommissions(loadedCommissions);
        setSyncStatus('synced');
      },
      (error) => {
        console.error('Commissions Firestore-Error:', error);
        setSyncStatus('error');
        setErrorMessage(error.message);
        try {
          handleFirestoreError(error, OperationType.LIST, colRef.path);
        } catch (e) {
          // Handled inside handleFirestoreError
        }
      }
    );

    // 3. Ausarbeitungen Snapshot
    const ausRef = getAusarbeitungenCollectionRef();
    const unsubAus = onSnapshot(
      ausRef,
      (snapshot) => {
        const loaded = snapshot.docs.map((doc) => {
          const data = doc.data();
          return {
            id: doc.id,
            ...data,
          } as Ausarbeitung;
        });
        setAusarbeitungen(loaded);
      },
      (error) => {
        console.error('Ausarbeitungen Firestore-Error:', error);
      }
    );

    return () => {
      unsubSettings();
      unsubCommissions();
      unsubAus();
    };
  }, [currentUser]);

  // Save annual Umsatzziel to Firestore settings document
  const handleSaveAnnualTarget = async (newTarget: number) => {
    if (sessionStorage.getItem('kk_is_demo_mode') === 'true') {
      setAnnualTarget(newTarget);
      sessionStorage.setItem('kk_demo_annual_target', newTarget.toString());
      return;
    }
    if (!currentUser) return;
    const colRef = getDbCollectionRef();
    const settingsDocRef = doc(colRef, '_system_settings_');
    try {
      setSyncStatus('connecting');
      setAnnualTarget(newTarget);
      await setDoc(settingsDocRef, { annualTarget: newTarget }, { merge: true });
      setSyncStatus('synced');
    } catch (error) {
      console.error(error);
      setErrorMessage('Umsatzziel konnte nicht gespeichert werden.');
      try {
        handleFirestoreError(error, OperationType.WRITE, settingsDocRef.path);
      } catch (e) {}
    }
  };

  // Save yearly target mapping to Firestore settings document
  const handleSaveYearlyTarget = async (year: string, newTarget: number) => {
    if (sessionStorage.getItem('kk_is_demo_mode') === 'true') {
      const updatedTargets = {
        ...yearlyTargets,
        [year]: newTarget,
      };
      setYearlyTargets(updatedTargets);
      sessionStorage.setItem('kk_demo_yearly_targets', JSON.stringify(updatedTargets));
      return;
    }
    if (!currentUser) return;
    const colRef = getDbCollectionRef();
    const settingsDocRef = doc(colRef, '_system_settings_');
    try {
      setSyncStatus('connecting');
      const updatedTargets = {
        ...yearlyTargets,
        [year]: newTarget,
      };
      setYearlyTargets(updatedTargets);
      await setDoc(settingsDocRef, { yearlyTargets: updatedTargets }, { merge: true });
      setSyncStatus('synced');
    } catch (error) {
      console.error(error);
      setErrorMessage(`Umsatzziel für ${year} konnte nicht gespeichert werden.`);
      try {
        handleFirestoreError(error, OperationType.WRITE, settingsDocRef.path);
      } catch (e) {}
    }
  };

  // Remove yearly target from Firestore settings document
  const handleDeleteYearlyTarget = async (year: string) => {
    if (sessionStorage.getItem('kk_is_demo_mode') === 'true') {
      const updatedTargets = { ...yearlyTargets };
      delete updatedTargets[year];
      setYearlyTargets(updatedTargets);
      sessionStorage.setItem('kk_demo_yearly_targets', JSON.stringify(updatedTargets));
      return;
    }
    if (!currentUser) return;
    const colRef = getDbCollectionRef();
    const settingsDocRef = doc(colRef, '_system_settings_');
    try {
      setSyncStatus('connecting');
      const updatedTargets = { ...yearlyTargets };
      delete updatedTargets[year];
      setYearlyTargets(updatedTargets);
      // Use updateDoc with deleteField to precisely delete only the target key without affecting teammates or adminEmails
      await updateDoc(settingsDocRef, {
        [`yearlyTargets.${year}`]: deleteField()
      });
      setSyncStatus('synced');
    } catch (error) {
      console.error(error);
      setErrorMessage(`Umsatzziel für ${year} konnte nicht gelöscht werden.`);
    }
  };

  // Update dynamic admin emails list in Firestore
  const handleSaveAdminEmails = async (emails: string[]) => {
    const cleaned = Array.from(new Set(
      emails
        .map(e => e.trim().toLowerCase())
        .filter(e => e.length > 5) // simple validation
    ));
    if (sessionStorage.getItem('kk_is_demo_mode') === 'true') {
      setAdminEmails(cleaned);
      sessionStorage.setItem('kk_demo_admin_emails', JSON.stringify(cleaned));
      return;
    }
    if (!currentUser) return;
    const colRef = getDbCollectionRef();
    const settingsDocRef = doc(colRef, '_system_settings_');
    try {
      setSyncStatus('connecting');
      setAdminEmails(cleaned);
      await setDoc(settingsDocRef, { adminEmails: cleaned }, { merge: true });
      setSyncStatus('synced');
    } catch (error) {
      console.error(error);
      setErrorMessage('Mitarbeiterrechte konnten nicht gespeichert werden.');
      try {
        handleFirestoreError(error, OperationType.WRITE, settingsDocRef.path);
      } catch (e) {}
    }
  };

  // Update dynamic managed teammates list in Firestore settings
  const handleSaveTeammates = async (updatedTeammates: TeammateConfig[]) => {
    if (sessionStorage.getItem('kk_is_demo_mode') === 'true') {
      setTeammateConfigs(updatedTeammates);
      sessionStorage.setItem('kk_demo_teammates', JSON.stringify(updatedTeammates));
      return;
    }
    if (!currentUser) return;
    const colRef = getDbCollectionRef();
    const settingsDocRef = doc(colRef, '_system_settings_');
    try {
      setSyncStatus('connecting');
      setTeammateConfigs(updatedTeammates);
      await setDoc(settingsDocRef, { teammates: updatedTeammates }, { merge: true });
      setSyncStatus('synced');
    } catch (error) {
      console.error(error);
      setErrorMessage('Mitarbeiterliste konnte nicht gespeichert werden.');
      try {
        handleFirestoreError(error, OperationType.WRITE, settingsDocRef.path);
      } catch (e) {}
    }
  };

  // Import backup data and restore database state (client-side restore)
  const handleImportBackup = async (backupData: any) => {
    if (sessionStorage.getItem('kk_is_demo_mode') === 'true') {
      // In demo mode, just update sessionStorage and state
      if (backupData.commissions) {
        setCommissions(backupData.commissions);
        sessionStorage.setItem('kk_demo_commissions', JSON.stringify(backupData.commissions));
      }
      if (backupData.ausarbeitungen) {
        setAusarbeitungen(backupData.ausarbeitungen);
        sessionStorage.setItem('kk_demo_ausarbeitungen', JSON.stringify(backupData.ausarbeitungen));
      }
      if (backupData.settings) {
        const { annualTarget, yearlyTargets, adminEmails, teammates } = backupData.settings;
        if (annualTarget !== undefined) {
          setAnnualTarget(annualTarget);
          sessionStorage.setItem('kk_demo_annual_target', annualTarget.toString());
        }
        if (yearlyTargets !== undefined) {
          setYearlyTargets(yearlyTargets);
          sessionStorage.setItem('kk_demo_yearly_targets', JSON.stringify(yearlyTargets));
        }
        if (adminEmails !== undefined) {
          setAdminEmails(adminEmails);
          sessionStorage.setItem('kk_demo_admin_emails', JSON.stringify(adminEmails));
        }
        if (teammates !== undefined) {
          setTeammateConfigs(teammates);
          sessionStorage.setItem('kk_demo_teammates', JSON.stringify(teammates));
        }
      }
      return;
    }

    if (!currentUser) return;

    setSyncStatus('connecting');
    try {
      // 1. Restore system settings document
      const colRef = getDbCollectionRef();
      const settingsDocRef = doc(colRef, '_system_settings_');
      
      const settingsToSave: any = {};
      if (backupData.settings) {
        const { annualTarget, yearlyTargets, adminEmails, teammates } = backupData.settings;
        if (annualTarget !== undefined) settingsToSave.annualTarget = annualTarget;
        if (yearlyTargets !== undefined) settingsToSave.yearlyTargets = yearlyTargets;
        if (adminEmails !== undefined) settingsToSave.adminEmails = adminEmails;
        if (teammates !== undefined) settingsToSave.teammates = teammates;
      }
      
      if (Object.keys(settingsToSave).length > 0) {
        await setDoc(settingsDocRef, settingsToSave, { merge: true });
      }

      // 2. Delete current commissions in Firestore (except the _system_settings_ doc itself)
      for (const c of commissions) {
        if (c.id !== '_system_settings_') {
          await deleteDoc(doc(colRef, c.id));
        }
      }

      // 3. Write new commissions from backup
      if (backupData.commissions && Array.isArray(backupData.commissions)) {
        for (const c of backupData.commissions) {
          const { id, ...data } = c;
          await setDoc(doc(colRef, id), data);
        }
      }

      // 4. Delete current ausarbeitungen
      const ausRef = getAusarbeitungenCollectionRef();
      for (const a of ausarbeitungen) {
        await deleteDoc(doc(ausRef, a.id));
      }

      // 5. Write new ausarbeitungen from backup
      if (backupData.ausarbeitungen && Array.isArray(backupData.ausarbeitungen)) {
        for (const a of backupData.ausarbeitungen) {
          const { id, ...data } = a;
          await setDoc(doc(ausRef, id), data);
        }
      }

      setSyncStatus('synced');
    } catch (error) {
      console.error('Failed to import backup:', error);
      setSyncStatus('error');
      setErrorMessage('Das Einspielen des Backups ist fehlgeschlagen.');
      throw error;
    }
  };

  // Add a new Commission entry
  const handleAddCommission = async (
    name: string,
    price: number,
    bauart: 'bestand' | 'neubau' | 'kleinauftrag',
    city?: string,
    orderNumber?: string
  ) => {
    if (sessionStorage.getItem('kk_is_demo_mode') === 'true') {
      const newComm: Commission = {
        id: 'demo-new-' + Date.now(),
        name,
        price,
        status: 'open',
        bauart,
        isNeubau: bauart === 'neubau',
        vorabPlan: false,
        vorabAb: false,
        installationsplan: false,
        abVerschickt: false,
        aufmass: false,
        bestellt: false,
        bestelltAt: null,
        createdAt: new Date().toISOString(),
        lastContactAt: new Date().toISOString(),
        needsVorab: false,
        note: '',
        createdByEmail: 'gast@fs-kuechen.de',
        createdByUid: 'demo-guest-uid',
        city: city || '',
        orderNumber: orderNumber || '',
      };
      setCommissions((prev) => {
        const next = [newComm, ...prev];
        sessionStorage.setItem('kk_demo_commissions', JSON.stringify(next));
        return next;
      });
      return;
    }

    if (!currentUser) return;
    const colRef = getDbCollectionRef();
    const newComm = {
      name,
      price,
      status: 'open',
      bauart,
      isNeubau: bauart === 'neubau',
      vorabPlan: false,
      vorabAb: false,
      installationsplan: false,
      abVerschickt: false,
      aufmass: false,
      bestellt: false,
      bestelltAt: null,
      createdAt: new Date().toISOString(),
      lastContactAt: new Date().toISOString(),
      needsVorab: false,
      note: '',
      createdByEmail: (currentUser.email?.toLowerCase() === 'belmonte.enrico@gmail.com') ? 'belmonte@fs-kuechen.de' : (currentUser.email?.toLowerCase() || ''),
      createdByUid: currentUser.uid,
      city: city || '',
      orderNumber: orderNumber || '',
    };

    try {
      setSyncStatus('connecting');
      await addDoc(colRef, newComm);
      setSyncStatus('synced');
    } catch (error) {
      console.error(error);
      setErrorMessage('Kommission konnte nicht hinzugefügt werden.');
      try {
        handleFirestoreError(error, OperationType.CREATE, colRef.path);
      } catch (e) {}
    }
  };

  // Update field generic handler
  const handleUpdateField = async (id: string, field: string, value: any) => {
    const commObj = commissions.find((c) => c.id === id);

    if (sessionStorage.getItem('kk_is_demo_mode') === 'true') {
      setCommissions((prev) => {
        const next = prev.map((c) => {
          if (c.id === id) {
            const updates: any = {
              ...c,
              [field]: value,
              lastContactAt: new Date().toISOString(),
            };
            if (field === 'bestellt') {
              updates.bestelltAt = value ? new Date().toISOString() : null;
            }
            return updates;
          }
          return c;
        });
        sessionStorage.setItem('kk_demo_commissions', JSON.stringify(next));
        return next;
      });
      return;
    }

    if (!currentUser) return;
    const colRef = getDbCollectionRef();
    const docRef = doc(colRef, id);
    try {
      const updates: any = {
        [field]: value,
        lastContactAt: new Date().toISOString(),
      };
      if (field === 'bestellt') {
        updates.bestelltAt = value ? new Date().toISOString() : null;
      }
      await updateDoc(docRef, updates);
    } catch (error) {
      console.error(error);
      setErrorMessage('Änderung konnte nicht übertragen werden.');
      try {
        handleFirestoreError(error, OperationType.UPDATE, docRef.path);
      } catch (e) {}
    }
  };

  // Update both name and price generic handler
  const handleUpdateNameAndPrice = async (id: string, newName: string, newPrice: number) => {
    if (sessionStorage.getItem('kk_is_demo_mode') === 'true') {
      setCommissions((prev) => {
        const next = prev.map((c) => {
          if (c.id === id) {
            return {
              ...c,
              name: newName,
              price: newPrice,
              lastContactAt: new Date().toISOString(),
            };
          }
          return c;
        });
        sessionStorage.setItem('kk_demo_commissions', JSON.stringify(next));
        return next;
      });
      return;
    }

    if (!currentUser) return;
    const colRef = getDbCollectionRef();
    const docRef = doc(colRef, id);
    try {
      await updateDoc(docRef, {
        name: newName,
        price: newPrice,
        lastContactAt: new Date().toISOString(),
      });
    } catch (error) {
      console.error(error);
      setErrorMessage('Name/Preis konnte nicht aktualisiert werden.');
      try {
        handleFirestoreError(error, OperationType.UPDATE, docRef.path);
      } catch (e) {}
    }
  };

  // Cycle construction style types (Bestand -> Neubau -> Kleinauftrag -> Bestand)
  const handleCycleBauart = async (id: string, currentType: 'bestand' | 'neubau' | 'kleinauftrag') => {
    const cycleMap: Record<string, 'bestand' | 'neubau' | 'kleinauftrag'> = {
      bestand: 'neubau',
      neubau: 'kleinauftrag',
      kleinauftrag: 'bestand',
    };
    const nextType = cycleMap[currentType] || 'bestand';
    await handleUpdateField(id, 'bauart', nextType);
  };

  // Mark commission as sold or lost
  const handleResolveCommission = async (id: string, status: 'sold' | 'lost') => {
    if (sessionStorage.getItem('kk_is_demo_mode') === 'true') {
      setCommissions((prev) => {
        const next = prev.map((c) => {
          if (c.id === id) {
            return {
              ...c,
              status,
              resolvedAt: new Date().toISOString(),
              lastContactAt: new Date().toISOString(),
            };
          }
          return c;
        });
        sessionStorage.setItem('kk_demo_commissions', JSON.stringify(next));
        return next;
      });
      return;
    }

    if (!currentUser) return;
    const colRef = getDbCollectionRef();
    const docRef = doc(colRef, id);
    try {
      await updateDoc(docRef, {
        status,
        resolvedAt: new Date().toISOString(),
        lastContactAt: new Date().toISOString(),
      });
    } catch (error) {
      console.error(error);
      setErrorMessage('Statusänderung fehlgeschlagen.');
      try {
        handleFirestoreError(error, OperationType.UPDATE, docRef.path);
      } catch (e) {}
    }
  };

  // Re-open a solved commission
  const handleReopenCommission = async (id: string) => {
    if (sessionStorage.getItem('kk_is_demo_mode') === 'true') {
      setCommissions((prev) => {
        const next = prev.map((c) => {
          if (c.id === id) {
            return {
              ...c,
              status: 'open',
              resolvedAt: null,
              lastContactAt: new Date().toISOString(),
            };
          }
          return c;
        });
        sessionStorage.setItem('kk_demo_commissions', JSON.stringify(next));
        return next;
      });
      return;
    }

    if (!currentUser) return;
    const colRef = getDbCollectionRef();
    const docRef = doc(colRef, id);
    try {
      await updateDoc(docRef, {
        status: 'open',
        resolvedAt: null,
        lastContactAt: new Date().toISOString(),
      });
    } catch (error) {
      console.error(error);
      setErrorMessage('Angebot konnte nicht wieder geöffnet werden.');
      try {
        handleFirestoreError(error, OperationType.UPDATE, docRef.path);
      } catch (e) {}
    }
  };

  // Delete commission entry
  const handleDeleteCommission = async (id: string) => {
    if (sessionStorage.getItem('kk_is_demo_mode') === 'true') {
      setCommissions((prev) => {
        const next = prev.filter((c) => c.id !== id);
        sessionStorage.setItem('kk_demo_commissions', JSON.stringify(next));
        return next;
      });
      return;
    }

    if (!currentUser) return;
    const colRef = getDbCollectionRef();
    const docRef = doc(colRef, id);
    try {
      setSyncStatus('connecting');
      await deleteDoc(docRef);
      setSyncStatus('synced');
    } catch (error) {
      console.error(error);
      setErrorMessage('Kommission konnte nicht gelöscht werden.');
      try {
        handleFirestoreError(error, OperationType.DELETE, docRef.path);
      } catch (e) {}
    }
  };

  // Add a new Ausarbeitung entry
  const handleAddAusarbeitung = async (data: {
    customerName: string;
    colleagueName: string;
    orderNumber: string;
    price: number;
    orderedAt: string;
    note: string;
    deliveryKw?: string;
    deliveryYear?: string;
    city?: string;
  }) => {
    if (sessionStorage.getItem('kk_is_demo_mode') === 'true') {
      const newAus = {
        id: 'demo-aus-new-' + Date.now(),
        ...data,
        createdAt: new Date().toISOString(),
        createdByEmail: 'gast@fs-kuechen.de',
        createdByUid: 'demo-guest-uid',
      };
      setAusarbeitungen((prev) => {
        const next = [newAus, ...prev];
        sessionStorage.setItem('kk_demo_ausarbeitungen', JSON.stringify(next));
        return next;
      });
      return;
    }

    if (!currentUser) return;
    const colRef = getAusarbeitungenCollectionRef();
    const newAus = {
      ...data,
      createdAt: new Date().toISOString(),
      createdByEmail: (currentUser.email?.toLowerCase() === 'belmonte.enrico@gmail.com') ? 'belmonte@fs-kuechen.de' : (currentUser.email?.toLowerCase() || ''),
      createdByUid: currentUser.uid,
    };
    try {
      setSyncStatus('connecting');
      await addDoc(colRef, newAus);
      setSyncStatus('synced');
    } catch (error) {
      console.error(error);
      setErrorMessage('Ausarbeitung konnte nicht gespeichert werden.');
    }
  };

  // Update fields of an Ausarbeitung entry
  const handleUpdateAusarbeitung = async (id: string, fields: Partial<Ausarbeitung>) => {
    if (sessionStorage.getItem('kk_is_demo_mode') === 'true') {
      setAusarbeitungen((prev) => {
        const next = prev.map((a) => {
          if (a.id === id) {
            return {
              ...a,
              ...fields,
            };
          }
          return a;
        });
        sessionStorage.setItem('kk_demo_ausarbeitungen', JSON.stringify(next));
        return next;
      });
      return;
    }

    if (!currentUser) return;
    const colRef = getAusarbeitungenCollectionRef();
    const docRef = doc(colRef, id);
    try {
      setSyncStatus('connecting');
      await updateDoc(docRef, fields);
      setSyncStatus('synced');
    } catch (error) {
      console.error(error);
      setErrorMessage('Änderung konnte nicht gespeichert werden.');
    }
  };

  // Delete an Ausarbeitung entry
  const handleDeleteAusarbeitung = async (id: string) => {
    if (sessionStorage.getItem('kk_is_demo_mode') === 'true') {
      setAusarbeitungen((prev) => {
        const next = prev.filter((a) => a.id !== id);
        sessionStorage.setItem('kk_demo_ausarbeitungen', JSON.stringify(next));
        return next;
      });
      return;
    }

    if (!currentUser) return;
    const colRef = getAusarbeitungenCollectionRef();
    const docRef = doc(colRef, id);
    try {
      setSyncStatus('connecting');
      await deleteDoc(docRef);
      setSyncStatus('synced');
    } catch (error) {
      console.error(error);
      setErrorMessage('Ausarbeitung konnte nicht gelöscht werden.');
    }
  };

  // Sign out
  const handleLogout = async () => {
    if (sessionStorage.getItem('kk_is_demo_mode') === 'true') {
      sessionStorage.removeItem('kk_is_demo_mode');
      sessionStorage.removeItem('kk_demo_commissions');
      sessionStorage.removeItem('kk_demo_ausarbeitungen');
      setCurrentUser(null);
      setCommissions([]);
      setAusarbeitungen([]);
      setActiveTab('open');
      return;
    }

    try {
      await signOut(auth);
      setActiveTab('open');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  // Get current active note for note editor modal
  const activeNoteText = useMemo(() => {
    if (!editNoteId) return '';
    const found = commissions.find((c) => c.id === editNoteId);
    return found?.note || '';
  }, [editNoteId, commissions]);

  // Get current active name for price/name editor modal
  const activeNameValue = useMemo(() => {
    if (!editPriceId) return '';
    const found = commissions.find((c) => c.id === editPriceId);
    return found?.name || '';
  }, [editPriceId, commissions]);

  // Get current active price for price editor modal
  const activePriceValue = useMemo(() => {
    if (!editPriceId) return 0;
    const found = commissions.find((c) => c.id === editPriceId);
    return found?.price || 0;
  }, [editPriceId, commissions]);

  // Get current active solvedAt for date editor modal
  const activeDateValue = useMemo(() => {
    if (!editDateId) return '';
    const found = commissions.find((c) => c.id === editDateId);
    return found?.resolvedAt || found?.createdAt || '';
  }, [editDateId, commissions]);

  // Check if current user is admin
  const isAdmin = useMemo(() => {
    const email = currentUser?.email?.toLowerCase();
    return email ? adminEmails.includes(email) || email === 'belmonte.enrico@gmail.com' : false;
  }, [currentUser, adminEmails]);

  // Extract all distinct teammate emails currently existing in database or registered as teammates in admin area
  const allTeammates = useMemo(() => {
    const emails = new Set<string>();
    commissions.forEach((c) => {
      if (c.createdByEmail) {
        emails.add(c.createdByEmail.toLowerCase().trim());
      }
    });
    // Add all registered teammate emails from teammateConfigs so they show up even if they have no commissions booked yet
    teammateConfigs.forEach((t) => {
      if (t.email) {
        emails.add(t.email.toLowerCase().trim());
      }
    });
    // Ensure admin emails or current user's email is present
    if (currentUser?.email) {
      const email = (currentUser.email.toLowerCase() === 'belmonte.enrico@gmail.com') ? 'belmonte@fs-kuechen.de' : currentUser.email.toLowerCase();
      emails.add(email);
    }
    return Array.from(emails).sort();
  }, [commissions, currentUser, teammateConfigs]);

  // Filter commissions based on who entered them and selected filter perspective (for Admin)
  const filteredCommissions = useMemo(() => {
    if (!currentUser) return [];
    
    const rawEmail = currentUser.email?.toLowerCase();
    const email = (rawEmail === 'belmonte.enrico@gmail.com') ? 'belmonte@fs-kuechen.de' : rawEmail;
    const isUserAdmin = email ? adminEmails.includes(email) || adminEmails.includes(rawEmail) : false;

    if (isUserAdmin) {
      if (selectedColleague === 'all') {
        return commissions;
      } else {
        const selectedLower = selectedColleague.toLowerCase().trim();
        return commissions.filter((c) => {
          const creatorEmail = (c.createdByEmail || '').toLowerCase().trim();
          
          if (selectedLower === 'admin' || adminEmails.map(e => e.toLowerCase().trim()).includes(selectedLower)) {
            // Unowned (legacy) documents or admin owned documents are visible under admin selection
            return !creatorEmail || adminEmails.map(e => e.toLowerCase().trim()).includes(creatorEmail);
          }
          
          return creatorEmail === selectedLower;
        });
      }
    } else {
      // Non-admin coworkers: ONLY see records they created!
      return commissions.filter((c) => {
        const creatorEmail = (c.createdByEmail || '').toLowerCase().trim();
        return creatorEmail === email || (email === 'belmonte@fs-kuechen.de' && (creatorEmail === 'belmonte.enrico@gmail.com' || !creatorEmail));
      });
    }
  }, [commissions, currentUser, selectedColleague, adminEmails]);

  // Check if current logged-in user is Enrico (belmonte@fs-kuechen.de or belmonte.enrico@gmail.com)
  const isEnrico = useMemo(() => {
    const rawEmail = currentUser?.email?.toLowerCase();
    const isDemo = sessionStorage.getItem('kk_is_demo_mode') === 'true';
    return rawEmail === 'belmonte.enrico@gmail.com' || rawEmail === 'belmonte@fs-kuechen.de' || isDemo;
  }, [currentUser]);

  // Listen to standard perspective changes or initial login to decide default perspective
  useEffect(() => {
    const applyDefaultPerspective = () => {
      if (currentUser && isAdmin) {
        const defaultPerspectiveSetting = localStorage.getItem('kk_default_colleague_perspective') || 'all';
        if (defaultPerspectiveSetting === 'own') {
          const email = currentUser.email?.toLowerCase();
          const resolvedEmail = (email === 'belmonte.enrico@gmail.com') ? 'belmonte@fs-kuechen.de' : email;
          setSelectedColleague(resolvedEmail || 'all');
        } else {
          setSelectedColleague('all');
        }
      } else {
        setSelectedColleague('all');
      }
    };

    applyDefaultPerspective();

    window.addEventListener('storage_perspective_changed', applyDefaultPerspective);
    return () => {
      window.removeEventListener('storage_perspective_changed', applyDefaultPerspective);
    };
  }, [currentUser, isAdmin]);

  // Resolve user display name from custom local modifications or database configs or email prefix fallback
  const currentUserDisplayName = useMemo(() => {
    if (customLocalName && customLocalName.trim()) {
      return customLocalName.trim();
    }
    if (!currentUser?.email) return '';
    const emailLower = currentUser.email.toLowerCase().trim();
    const conf = teammateConfigs.find(t => t.email.toLowerCase().trim() === emailLower);
    if (conf && conf.name.trim()) {
      return conf.name;
    }
    const prefix = currentUser.email.split('@')[0];
    return prefix.charAt(0).toUpperCase() + prefix.slice(1);
  }, [currentUser, teammateConfigs, customLocalName]);

  // Safety routing: Reset activeTab to 'open' if user is not Enrico but on 'ausarbeitung' tab
  useEffect(() => {
    if (authChecked && currentUser && !isEnrico && activeTab === 'ausarbeitung') {
      setActiveTab('open');
    }
  }, [isEnrico, activeTab, currentUser, authChecked]);

  // Custom starting-tab route dispatcher based on user selections
  useEffect(() => {
    if (authChecked && currentUser) {
      const savedDefaultTab = localStorage.getItem('kk_default_tab');
      if (savedDefaultTab && ['open', 'sold', 'ausarbeitung', 'stats', 'admin'].includes(savedDefaultTab)) {
        // Enforce safety restrictions
        if (savedDefaultTab === 'ausarbeitung' && !isEnrico && !isAdmin) {
          setActiveTab('open');
        } else if (savedDefaultTab === 'admin' && !isAdmin) {
          setActiveTab('open');
        } else {
          setActiveTab(savedDefaultTab as any);
        }
      }
    }
  }, [currentUser, authChecked, isEnrico, isAdmin]);



  // Filter Ausarbeitungen: only Enrico sees this data in general or in stats
  const filteredAusarbeitungen = useMemo(() => {
    if (!currentUser) return [];
    
    const rawEmail = currentUser.email?.toLowerCase();
    const email = (rawEmail === 'belmonte.enrico@gmail.com') ? 'belmonte@fs-kuechen.de' : rawEmail;
    const isDemo = sessionStorage.getItem('kk_is_demo_mode') === 'true';
    
    // Only belmonte@fs-kuechen.de or gast@fs-kuechen.de in demo mode works with Ausarbeitungen
    if (email !== 'belmonte@fs-kuechen.de' && email !== 'gast@fs-kuechen.de' && !isDemo) {
      return [];
    }

    // Filter by selectedColleague dropdown perspective if Enrico wants to view another colleague's stats
    if (selectedColleague !== 'all') {
      const selectedLower = selectedColleague.toLowerCase().trim();
      const config = teammateConfigs.find((t) => t.email.toLowerCase().trim() === selectedLower);
      const colleagueNameStr = config ? config.name.toLowerCase().trim() : '';

      return ausarbeitungen.filter((a) => {
        const creatorEmail = (a.createdByEmail || '').toLowerCase().trim();
        const collName = (a.colleagueName || '').toLowerCase().trim();

        const matchesEmail = creatorEmail === selectedLower || 
          (selectedLower === 'belmonte@fs-kuechen.de' && creatorEmail === 'belmonte.enrico@gmail.com') ||
          (selectedLower === 'belmonte.enrico@gmail.com' && creatorEmail === 'belmonte@fs-kuechen.de');
        
        const matchesName = colleagueNameStr && collName.includes(colleagueNameStr);

        return matchesEmail || matchesName;
      });
    }
    return ausarbeitungen;
  }, [ausarbeitungen, currentUser, selectedColleague, teammateConfigs]);

  // Dynamic but robust city suggestions with local region postal codes defaults
  const citySuggestions = useMemo(() => {
    const existing = new Set<string>();
    
    // Default Baden-Württemberg cities & surrounding regions near FS Küchen (Stuttgart/Ludwigsburg/Waiblingen)
    const defaults = [
      '70173 Stuttgart',
      '71638 Ludwigsburg',
      '71332 Waiblingen',
      '71522 Backnang',
      '74072 Heilbronn',
      '71364 Winnenden',
      '73614 Schorndorf',
      '73033 Göppingen',
      '71229 Leonberg',
      '73728 Esslingen am Neckar',
      '71032 Böblingen',
      '71063 Sindelfingen',
      '72622 Nürtingen',
      '70794 Filderstadt',
      '71083 Herrenberg',
      '73230 Kirchheim unter Teck',
      '74321 Bietigheim-Bissingen',
      '71384 Weinstadt',
      '74172 Neckarsulm',
      '72070 Tübingen',
      '72764 Reutlingen',
      '71691 Freiberg am Neckar',
      '71679 Asperg',
      '71696 Möglingen',
      '71701 Grüglingen',
      '71711 Murr',
      '71723 Großbottwar',
      '71540 Murrhardt',
      '71546 Aspach',
      '71554 Weissach im Tal',
      '71116 Gärtringen',
      '71263 Weil der Stadt',
      '71272 Renningen',
      '71277 Rutesheim',
      '71287 Weissach',
      '71563 Affalterbach',
      '71573 Allmersbach',
      '71706 Markgröningen',
      '71717 Beilstein',
      '71735 Eberdingen',
      '71739 Oberriexingen',
      '74348 Lauffen am Neckar',
      '74354 Besigheim',
      '74357 Bönnigheim',
      '74360 Ilsfeld',
      '74369 Löchgau',
      '74379 Ingersheim',
      '74385 Pleidelsheim',
      '74388 Talheim',
      '74395 Mundelsheim',
      '74397 Pfaffenhofen',
      '74405 Gaildorf',
      '74417 Gschwend'
    ];
    
    defaults.forEach(d => existing.add(d));

    // Dynamic suggestions from current commissions
    commissions.forEach(c => {
      if (c.city && c.city.trim()) {
        existing.add(c.city.trim());
      }
    });

    // Dynamic suggestions from current ausarbeitungen
    ausarbeitungen.forEach(a => {
      if (a.city && a.city.trim()) {
        existing.add(a.city.trim());
      }
    });

    return Array.from(existing).sort();
  }, [commissions, ausarbeitungen]);

  // Filter commissions based on Search term
  const sortedAndFilteredCommissions = useMemo(() => {
    let result = [...filteredCommissions].sort(
      (a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
    );

    if (searchTerm.trim()) {
      const match = searchTerm.toLowerCase();
      result = result.filter((c) => c.name.toLowerCase().includes(match));
    }

    return result;
  }, [filteredCommissions, searchTerm]);

  // Tab category classifications
  const openItems = useMemo(() => {
    return sortedAndFilteredCommissions.filter((c) => c.status === 'open');
  }, [sortedAndFilteredCommissions]);

  const activeSoldItems = useMemo(() => {
    return sortedAndFilteredCommissions.filter((c) => c.status === 'sold' && !c.bestellt);
  }, [sortedAndFilteredCommissions]);

  const archivedItems = useMemo(() => {
    return sortedAndFilteredCommissions.filter((c) => c.status === 'sold' && c.bestellt);
  }, [sortedAndFilteredCommissions]);

  const lostItems = useMemo(() => {
    return sortedAndFilteredCommissions.filter((c) => c.status === 'lost');
  }, [sortedAndFilteredCommissions]);

  // Currency Formatter
  const currencyFormatter = new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR',
  });

  const openItemsSum = useMemo(() => {
    return openItems.reduce((acc, c) => acc + (c.price || 0), 0);
  }, [openItems]);

  const activeSoldItemsSum = useMemo(() => {
    return activeSoldItems.reduce((acc, c) => acc + (c.price || 0), 0);
  }, [activeSoldItems]);

  // Dynamically extract list of years containing commission dates + current year + custom year targets + ausarbeitungen
  const availableYears = useMemo(() => {
    const years = new Set<number>();
    
    // 1. Commission resolved/created years and delivery years
    filteredCommissions.forEach((c) => {
      const targetDateStr = c.resolvedAt || c.createdAt;
      if (targetDateStr) {
        const y = new Date(targetDateStr).getFullYear();
        if (!isNaN(y)) years.add(y);
      }
      if (c.deliveryYear) {
        const y = parseInt(normalizeYear(c.deliveryYear), 10);
        if (!isNaN(y)) years.add(y);
      }
    });

    // 2. Ausarbeitungen delivery, ordered, or created years
    filteredAusarbeitungen.forEach((a) => {
      if (a.deliveryYear) {
        const y = parseInt(normalizeYear(a.deliveryYear), 10);
        if (!isNaN(y)) years.add(y);
      }
      const targetDateStr = a.orderedAt || a.createdAt;
      if (targetDateStr) {
        const y = new Date(targetDateStr).getFullYear();
        if (!isNaN(y)) years.add(y);
      }
    });

    // 3. Current year
    years.add(new Date().getFullYear());
    
    // 4. Also include any years that already have custom targets
    if (yearlyTargets) {
      Object.keys(yearlyTargets).forEach((key) => {
        const parts = key.split('_');
        const yearPart = parts[parts.length - 1];
        const parsed = parseInt(yearPart);
        if (!isNaN(parsed)) {
          years.add(parsed);
        }
      });
    }
    
    return Array.from(years).sort((a, b) => b - a);
  }, [filteredCommissions, filteredAusarbeitungen, yearlyTargets]);

  const greetingText = useMemo(() => {
    const hour = new Date().getHours();
    let greeting = 'Hallo';
    if (hour >= 5 && hour < 12) {
      greeting = 'Guten Morgen';
    } else if (hour >= 12 && hour < 18) {
      greeting = 'Hallo';
    } else {
      greeting = 'Schönen Abend';
    }
    const namePart = (currentUserDisplayName || '').split(' ')[0];
    return namePart ? `${greeting}, ${namePart}` : greeting;
  }, [currentUserDisplayName]);

  if (!authChecked) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-black text-slate-900 dark:text-slate-100 flex flex-col items-center justify-center p-4">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-xs uppercase font-bold tracking-widest text-slate-400">Verbinde...</p>
        </div>
      </div>
    );
  }

  const handleTriggerDemoMode = () => {
    sessionStorage.setItem('kk_is_demo_mode', 'true');
    sessionStorage.setItem('kk_demo_commissions', JSON.stringify(INITIAL_DEMO_COMMISSIONS));
    sessionStorage.setItem('kk_demo_ausarbeitungen', JSON.stringify(INITIAL_DEMO_AUSARBEITUNGEN));
    setCurrentUser({
      uid: 'demo-guest-uid',
      email: 'gast@fs-kuechen.de',
      displayName: 'Gast-Tester',
      isAnonymous: false,
      emailVerified: true
    } as any);
    setCommissions(INITIAL_DEMO_COMMISSIONS);
    setAusarbeitungen(INITIAL_DEMO_AUSARBEITUNGEN);
  };

  if (!currentUser) {
    return <LoginOverlay onDemoLogin={handleTriggerDemoMode} />;
  }

  return (
    <div className="p-3 bg-slate-50 dark:bg-black text-slate-900 dark:text-slate-100 min-h-screen flex flex-col pt-[calc(1.25rem+env(safe-area-inset-top))] md:p-8 md:pt-8 transition-colors duration-300">
      
      {/* Floating Action Button (FAB) - On desktop and tablet */}
      <button
        onClick={() => setIsAddOpen(true)}
        className="hidden md:flex fixed z-40 theme-add-btn w-14 h-14 rounded-full items-center justify-center active:scale-92 transition-all group bottom-8 right-8 cursor-pointer"
        id="desktop-fab-add"
      >
        <Plus className="w-6 h-6 transform group-hover:rotate-90 transition-transform duration-300" />
      </button>

      {/* Main Container */}
      <div className="max-w-4xl mx-auto w-full flex-1 pt-4 lg:pt-0">
        
        {/* Dynamic header / upper controls - unified elegant layout */}
        <div id="unified-app-header" className="flex flex-col md:grid md:grid-cols-5 md:gap-8 items-center md:items-end justify-between mb-8 md:mb-10 mt-2 relative select-none">
          
          {/* Left Side: App Logo & Name, User Profile, italic Time-Of-Day greeting */}
          <div className="flex flex-col items-center md:items-start text-center md:text-left md:col-span-2 w-full gap-2.5">
            <div className="flex items-center gap-3.5">
              <button
                id="app-logo-theme-toggle"
                onClick={toggleTheme}
                className="w-13 h-13 md:w-14 md:h-14 bg-white dark:bg-zinc-900 border border-blue-500/80 dark:border-blue-400/80 rounded-xl flex items-center justify-center shadow-xs shrink-0 cursor-pointer active:scale-95 transition-all text-blue-600 dark:text-blue-450 hover:bg-blue-50/50 dark:hover:bg-blue-950/20 hover:border-blue-600 dark:hover:border-blue-300 group relative overflow-hidden"
                title="Wechsle Theme"
              >
                {/* Dynamic Image Logo */}
                <div className="absolute inset-0 flex items-center justify-center p-1.5 z-10 select-none pointer-events-none">
                  <img
                    src={theme === 'dark' ? '/icon-dark.png' : '/icon-light.png'}
                    alt="KitCommand Logo"
                    className="w-full h-full object-contain rounded-lg group-hover:scale-105 transition-transform duration-300"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                </div>

                {/* Symmetrical Vector Emblem */}
                <div className="relative flex items-center justify-center z-0">
                  <TrendingUp className="w-5 h-5 md:w-6 md:h-6 stroke-[2.25] text-blue-600 dark:text-blue-400 group-hover:scale-110 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 transition-all duration-300 ease-out" />
                  <Sparkles className="w-3.5 h-3.5 absolute -top-2.5 -right-2.5 text-amber-500 fill-amber-500/30 opacity-60 group-hover:opacity-100 group-hover:scale-110 group-hover:rotate-12 transition-all duration-300" />
                </div>
              </button>
              
              <div>
                <h1 className="text-2xl md:text-3xl font-black flex items-center tracking-tighter">
                  KitCommand{' '}
                  <span className="inline-flex items-center border border-amber-500 text-amber-500 rounded px-1.5 py-0.5 text-[0.45em] font-black ml-2 transform translateY(-1px)">
                    Pro
                  </span>
                </h1>
              </div>
            </div>

            {/* Profile Row with names and badges under App Name */}
            {currentUser?.email && (
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-1.5 md:gap-2 select-none mt-1 w-full">
                 {/* Two-row Interactive Profile Button with Icon & Hover effect */}
                <button 
                  onClick={() => setIsProfileOpen(true)}
                  title="Mitarbeiterprofil ansehen"
                  id="header-user-profile-btn"
                  className="flex items-center gap-2 bg-white/90 dark:bg-zinc-900/90 hover:bg-slate-50 dark:hover:bg-zinc-850 px-2.5 md:px-3 rounded-lg md:rounded-xl border border-slate-200/60 dark:border-zinc-800/80 shadow-xs hover:border-slate-300 dark:hover:border-zinc-700 cursor-pointer active:scale-95 transition-all duration-200 text-left h-[38px] md:h-[48px] shrink-0 w-fit"
                >
                  {/* Elegant circular user icon with background badge */}
                  <div className="w-7 h-7 md:w-[34px] md:h-[34px] rounded-lg bg-blue-500/10 dark:bg-blue-500/15 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 user-icon-wrapper">
                    <UserIcon className="w-3.5 h-3.5 md:w-4.5 md:h-4.5 stroke-[2.5]" />
                  </div>
                  
                  {/* Text Column with Label and Dynamic User Display Name */}
                  <div className="flex flex-col min-w-0 leading-tight">
                    <span className="text-[7px] md:text-[8px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-widest block leading-none mb-0.5 select-none profile-label">
                      Benutzerprofil
                    </span>
                    <div className="flex items-center gap-1 md:gap-1.5 whitespace-nowrap">
                      <span className="text-[10px] md:text-[11px] font-black text-slate-800 dark:text-zinc-200 truncate max-w-[140px] xs:max-w-[190px] md:max-w-none profile-name">
                        {currentUserDisplayName}
                      </span>
                      {sessionStorage.getItem('kk_is_demo_mode') === 'true' && (
                        <span className="bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 text-[7px] md:text-[8px] px-1 md:px-1.5 py-0.5 font-bold rounded uppercase tracking-wider shrink-0 flex items-center gap-0.5 profile-badge">
                          <Sparkles className="w-1.5 h-1.5 text-blue-500 shrink-0" />
                          Demo
                        </span>
                      )}
                      {isEnrico ? (
                        <span className="profile-badge profile-badge-purp font-black select-none shrink-0 uppercase tracking-wider text-[7.5px] px-1 py-0.5 rounded border">
                          Sys-Admin
                        </span>
                      ) : isAdmin ? (
                        <span className="profile-badge profile-badge-amb font-black select-none shrink-0 uppercase tracking-wider text-[7.5px] px-1 py-0.5 rounded border">
                          Admin
                        </span>
                      ) : (
                        <span className="profile-badge profile-badge-blu font-black select-none shrink-0 uppercase tracking-wider text-[7.5px] px-1 py-0.5 rounded border">
                          Verkäufer
                        </span>
                      )}
                    </div>
                  </div>
                </button>
                
                {/* Symmetrical Partner-Badge for Database Sync Status */}
                <div 
                  id="header-sync-status-btn"
                  className="flex items-center justify-center gap-1.5 md:gap-2 bg-white/90 dark:bg-zinc-900/90 px-2.5 md:px-3 rounded-lg md:rounded-xl border border-slate-200/60 dark:border-zinc-800/80 shadow-xs h-[38px] md:h-[48px] shrink-0"
                  title={syncStatus === 'synced' ? 'Echtzeit-Verbindung mit der Cloud is aktiv' : 'Verbinde mit Cloud-Datenbank...'}
                >
                  <div
                    className={`w-1.5 h-1.5 md:w-2 md:h-2 rounded-full ring-2 md:ring-4 shrink-0 transition-all ${
                      syncStatus === 'synced' 
                        ? 'bg-green-500 ring-green-500/20' 
                        : 'bg-blue-500 ring-blue-500/25 animate-pulse'
                    }`}
                  ></div>
                  <span className="text-[10px] md:text-[11px] font-black text-slate-700 dark:text-zinc-350 select-none status-text">
                    {syncStatus === 'connecting' ? 'Cloud Sync' : syncStatus === 'synced' ? 'Live' : 'Sync'}
                  </span>
                </div>
              </div>
            )}

            {/* Clean & elegant uppercase greeting */}
            <div className="text-lg md:text-xl font-sans uppercase tracking-widest text-slate-600 dark:text-zinc-400 leading-none select-none font-medium mt-1.5">
              {greetingText}...
            </div>
          </div>

          {/* Right Side: Tab Navigation (Suche + Tabs) */}
          <div className="w-full md:col-span-3">
            {/* STICKY NAV ISLAND (Suche + Tabs) */}
            <div 
              id="sticky-nav-island"
              className="fixed left-0 right-0 bottom-0 z-50 md:relative md:bottom-auto md:left-auto md:right-auto max-w-md mx-auto md:ml-auto md:mr-0 md:mb-0 select-none w-full"
            >
              <div className="bg-white/95 dark:bg-zinc-900/95 backdrop-blur-xl rounded-t-3xl md:rounded-xl border-t md:border border-slate-200/50 dark:border-zinc-800/50 shadow-[0_-15px_30px_-5px_rgba(0,0,0,0.15)] dark:shadow-[0_-15px_30px_-5px_rgba(0,0,0,0.6)] md:shadow-lg flex flex-col gap-2 p-4 pt-3 pb-[calc(1rem+env(safe-area-inset-bottom))] md:p-2.5 md:pb-2.5">
                
                {/* Mobile controls */}
                <div className="flex md:hidden flex-1 items-center justify-between gap-2">
                  {/* Left: Perspektive Selection permanently visible if admin */}
                  {isAdmin ? (
                    <div className="flex-1 min-w-0 flex items-center gap-1.5 px-2 py-1.5 bg-slate-100/50 dark:bg-zinc-950/60 rounded-xl border border-slate-200/40 dark:border-zinc-850">
                      <span className="text-[9px] font-black uppercase text-slate-400 dark:text-zinc-500 pl-0.5 tracking-wider select-none shrink-0">Perspektive:</span>
                      <select
                        value={selectedColleague}
                        onChange={(e) => setSelectedColleague(e.target.value)}
                        className="bg-transparent text-[11px] font-bold text-slate-755 dark:text-zinc-200 border-none outline-none cursor-pointer flex-1 py-0.5 min-w-0"
                      >
                        <option value="all" className="bg-white dark:bg-zinc-900 text-slate-800 dark:text-zinc-100 font-bold">Gesamtes Team</option>
                        {allTeammates.map((email) => {
                          const emailLower = email.toLowerCase().trim();
                          const isAdminUser = adminEmails.includes(emailLower);
                          const conf = teammateConfigs.find(t => t.email.toLowerCase().trim() === emailLower);
                          
                          let displayName = '';
                          if (conf && conf.name.trim()) {
                            displayName = conf.name;
                          } else {
                            const prefix = email.split('@')[0];
                            displayName = prefix.charAt(0).toUpperCase() + prefix.slice(1);
                          }

                          if (conf && !conf.isActive) {
                            displayName = `[Inaktiv] ${displayName}`;
                          }

                          return (
                            <option 
                              key={email} 
                              value={email}
                              className="bg-white dark:bg-zinc-900 text-slate-800 dark:text-zinc-100"
                            >
                              {isAdminUser ? `★ ${displayName}` : displayName}
                            </option>
                          );
                        })}
                      </select>
                    </div>
                  ) : (
                    <div className="flex-1 text-left text-[11px] text-slate-400 dark:text-zinc-500 font-black uppercase tracking-widest pl-2">
                      Mein Verkaufsraum
                    </div>
                  )}

                  {/* Buttons right-aligned: Add trigger & Admin Zahnrad */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    {/* Svelte compact add button right in mobile bar */}
                    <button
                      onClick={() => setIsAddOpen(true)}
                      className="w-9 h-9 theme-add-btn rounded-xl flex items-center justify-center active:scale-90 transition-all cursor-pointer"
                      title="Auftrag hinzufügen"
                      id="mobile-nav-add"
                    >
                      <Plus className="w-5 h-5 animate-pulse" />
                    </button>

                    {/* Settings/Admin Zahnrad button if admin */}
                    {isAdmin && (
                      <button
                        onClick={() => {
                          setActiveTab(activeTab === 'admin' ? 'open' : 'admin');
                        }}
                        className={`w-9 h-9 rounded-xl flex items-center justify-center border transition-all duration-300 active:scale-95 cursor-pointer shadow-xs ${
                          activeTab === 'admin'
                            ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/45 ring-2 ring-amber-500/20'
                            : 'bg-slate-100/50 dark:bg-zinc-950/60 text-slate-500 dark:text-zinc-400 border-slate-200/45 dark:border-zinc-850 hover:text-slate-800 dark:hover:text-zinc-200'
                        }`}
                        title="Admin-Bereich"
                      >
                        <Settings className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              
              {/* Desktop Only / Perspective & Admin select row */}
              <div className="hidden md:flex flex-col gap-2 transition-all duration-300">
                {isAdmin && (
                  <div className="flex items-center gap-2">
                    <div className="flex-1 min-w-0 flex items-center gap-2 px-2.5 py-1.5 bg-slate-100/50 dark:bg-zinc-950/60 rounded-xl border border-slate-200/40 dark:border-zinc-850">
                      <span className="text-[9px] font-black uppercase text-slate-400 dark:text-zinc-500 pl-0.5 tracking-wider select-none shrink-0">Perspektive:</span>
                      <select
                        value={selectedColleague}
                        onChange={(e) => setSelectedColleague(e.target.value)}
                        className="bg-transparent text-xs font-bold text-slate-700 dark:text-zinc-200 border-none outline-none cursor-pointer flex-1 py-0.5 min-w-0"
                      >
                        <option value="all" className="bg-white dark:bg-zinc-900 text-slate-800 dark:text-zinc-100 font-bold">Gesamtes Team</option>
                        {allTeammates.map((email) => {
                          const emailLower = email.toLowerCase().trim();
                          const isAdminUser = adminEmails.includes(emailLower);
                          const conf = teammateConfigs.find(t => t.email.toLowerCase().trim() === emailLower);
                          
                          let displayName = '';
                          if (conf && conf.name.trim()) {
                            displayName = conf.name;
                          } else {
                            const prefix = email.split('@')[0];
                            displayName = prefix.charAt(0).toUpperCase() + prefix.slice(1);
                          }

                          if (conf && !conf.isActive) {
                            displayName = `[Inaktiv] ${displayName}`;
                          }

                          return (
                            <option 
                              key={email} 
                              value={email}
                              className="bg-white dark:bg-zinc-900 text-slate-800 dark:text-zinc-100"
                            >
                              {isAdminUser ? `★ ${displayName}` : displayName}
                            </option>
                          );
                        })}
                      </select>
                    </div>

                    {/* Settings gear built right next to it */}
                    <button
                      onClick={() => {
                        setActiveTab(activeTab === 'admin' ? 'open' : 'admin');
                      }}
                      className={`w-9 h-9 shrink-0 rounded-xl flex items-center justify-center border transition-all duration-300 active:scale-95 cursor-pointer shadow-xs ${
                        activeTab === 'admin'
                          ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/45 ring-2 ring-amber-500/20'
                          : 'bg-white dark:bg-zinc-900 text-slate-500 dark:text-zinc-400 border-slate-200 dark:border-zinc-800/80 hover:border-slate-350 dark:hover:border-zinc-700 hover:text-slate-800 dark:hover:text-zinc-200'
                      }`}
                      title="Admin-Bereich öffnen (Zahnrad)"
                    >
                      <Settings className={`w-4 h-4 ${activeTab === 'admin' ? 'animate-spin' : 'hover:rotate-45'}`} style={activeTab === 'admin' ? { animationDuration: '8s' } : undefined} />
                    </button>
                  </div>
                )}
              </div>

              {/* High-quality tabs row - ALWAYS visible on both Mobile and Desktop, styled beautifully */}
              <div id="app-navigation-tabs" className={`grid ${isEnrico ? 'grid-cols-4' : 'grid-cols-3'} gap-1 bg-slate-100/80 dark:bg-zinc-950 p-1 rounded-xl`}>
                <button
                  onClick={() => setActiveTab('open')}
                  className={`py-2 px-2 rounded-lg text-center text-[11px] sm:text-xs font-sans font-black uppercase tracking-wider transition-all duration-200 cursor-pointer ${
                    activeTab === 'open'
                      ? 'bg-white dark:bg-zinc-800 text-blue-600 dark:text-blue-400 shadow-[0_2px_8px_rgba(0,0,0,0.08)] font-black is-active-tab'
                      : 'text-slate-500 dark:text-zinc-400 hover:text-slate-800 dark:hover:text-zinc-200 font-bold'
                  }`}
                >
                  Offen
                </button>
                <button
                  onClick={() => setActiveTab('sold')}
                  className={`py-2 px-2 rounded-lg text-center text-[11px] sm:text-xs font-sans font-black uppercase tracking-wider transition-all duration-200 cursor-pointer ${
                    activeTab === 'sold'
                      ? 'bg-white dark:bg-zinc-800 text-blue-600 dark:text-blue-400 shadow-[0_2px_8px_rgba(0,0,0,0.08)] font-black is-active-tab'
                      : 'text-slate-500 dark:text-zinc-400 hover:text-slate-800 dark:hover:text-zinc-200 font-bold'
                  }`}
                >
                  Verkauft
                </button>
                {isEnrico && (
                  <button
                    onClick={() => setActiveTab('ausarbeitung')}
                    className={`py-2 px-2 rounded-lg text-center text-[11px] sm:text-xs font-sans font-black uppercase tracking-wider transition-all duration-200 cursor-pointer ${
                      activeTab === 'ausarbeitung'
                        ? 'bg-white dark:bg-zinc-800 text-blue-600 dark:text-blue-400 shadow-[0_2px_8px_rgba(0,0,0,0.08)] font-black is-active-tab'
                        : 'text-slate-500 dark:text-zinc-400 hover:text-slate-800 dark:hover:text-zinc-200 font-bold'
                    }`}
                    title="Ausarbeitungen dokumentieren"
                  >
                    Ausarbeit.
                  </button>
                )}
                <button
                  onClick={() => setActiveTab('stats')}
                  className={`py-2 px-2 rounded-lg text-center text-[11px] sm:text-xs font-sans font-black uppercase tracking-wider transition-all duration-200 cursor-pointer ${
                    activeTab === 'stats'
                      ? 'bg-white dark:bg-zinc-800 text-blue-600 dark:text-blue-400 shadow-[0_2px_8px_rgba(0,0,0,0.08)] font-black is-active-tab'
                      : 'text-slate-500 dark:text-zinc-400 hover:text-slate-800 dark:hover:text-zinc-200 font-bold'
                  }`}
                >
                  Statistik
                </button>
              </div>

          </div>
        </div>
      </div>
    </div>

        {/* Scrollable contents zone */}
        <main className="pb-[calc(11.5rem+env(safe-area-inset-bottom))] md:pb-24 mt-2 md:mt-0">
          
          {/* TAB: OPEN OFFERS */}
          {activeTab === 'open' && (
            <section id="tab-open" className="flex flex-col min-h-[500px]">
              <div
                className="mb-4 pb-3 flex justify-between items-center cursor-pointer group"
                onClick={() => setOpenSection(!openSection)}
              >
                <div className="flex items-center gap-2">
                  <ChevronDown
                    className={`w-4 h-4 text-slate-400 transition-transform duration-300 group-hover:text-blue-500 ${
                      openSection ? '' : '-rotate-90'
                    }`}
                  />
                  <h2 className="text-[10px] font-black uppercase tracking-widest text-slate-400 group-hover:text-blue-500 transition-colors">
                    Laufende Angebote
                  </h2>
                </div>
                <div className="flex items-center gap-2">
                  {/* Search Input sliding open to the left */}
                  <div className={`overflow-hidden transition-all duration-300 flex items-center ${isHeaderSearchOpen ? 'w-32 sm:w-44 opacity-100 mr-1' : 'w-0 opacity-0 pointer-events-none'}`}>
                    <input
                      type="text"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      placeholder="Suchen..."
                      className="app-search-input"
                      onClick={(e) => e.stopPropagation()}
                      autoFocus={isHeaderSearchOpen}
                    />
                  </div>

                  {/* Search trigger Lupe button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsHeaderSearchOpen(!isHeaderSearchOpen);
                      if (isHeaderSearchOpen) {
                        setSearchTerm('');
                      }
                    }}
                    className={`app-toggle-btn ${
                      isHeaderSearchOpen 
                        ? 'app-toggle-btn-active'
                        : 'app-toggle-btn-inactive'
                    }`}
                    title="Suche umschalten"
                  >
                    <Search className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleToggleViewMode();
                    }}
                    className="app-toggle-btn app-toggle-btn-inactive"
                    title={viewMode === 'compact' ? "Detailansicht aktivieren" : "Kompaktansicht aktivieren"}
                  >
                    {viewMode === 'compact' ? <LayoutGrid className="w-3.5 h-3.5" /> : <LayoutList className="w-3.5 h-3.5" />}
                  </button>
                  <span className="theme-tab-sum-badge text-[10px] font-mono font-bold px-2 py-1 rounded-md">
                    {currencyFormatter.format(openItemsSum)}
                  </span>
                  <span className="theme-tab-count-badge text-[10px] font-mono font-bold px-2 py-1 rounded-md">
                    {openItems.length}
                  </span>
                </div>
              </div>

              {openSection && (
                <div id="open-list" className="grid grid-cols-1 sm:grid-cols-2 gap-4 transition-all duration-300">
                  {openItems.length === 0 ? (
                    <div className="col-span-1 sm:col-span-2 flex flex-col items-center justify-center p-8 text-slate-400 dark:text-zinc-650 text-center">
                      <CheckCircle className="w-12 h-12 mb-3 opacity-40 text-slate-350" />
                      <p className="font-bold text-sm">Keine offenen Angebote.</p>
                    </div>
                  ) : (
                    openItems.map((comm) => (
                      <CommissionCard
                        key={comm.id}
                        commission={comm}
                        onResolve={handleResolveCommission}
                        onReopen={handleReopenCommission}
                        onDelete={setDeleteId}
                        onEditPrice={(id, price) => {
                          setEditPriceId(id);
                        }}
                        onEditDate={(id, date) => {
                          setEditDateId(id);
                        }}
                        onEditNote={setEditNoteId}
                        onUpdateField={handleUpdateField}
                        onCycleBauart={handleCycleBauart}
                        teammateConfigs={teammateConfigs}
                        viewMode={viewMode}
                        citySuggestions={citySuggestions}
                      />
                    ))
                  )}
                </div>
              )}
            </section>
          )}

          {/* TAB: SOLD OFFERS */}
          {activeTab === 'sold' && (
            <section id="tab-sold" className="flex flex-col min-h-[500px]">
              
              {/* Active in preparation */}
              <div
                className="mb-5 pb-3 flex justify-between items-center cursor-pointer group"
                onClick={() => setSoldActiveSection(!soldActiveSection)}
              >
                <div className="flex items-center gap-2">
                  <ChevronDown
                    id="in-bearbeitung-section-chevron"
                    className={`w-4 h-4 transition-transform duration-300 ${
                      soldActiveSection ? '' : '-rotate-90'
                    }`}
                  />
                  <h2 id="in-bearbeitung-section-title" className="text-[10px] font-black uppercase tracking-widest">
                    In Bearbeitung
                  </h2>
                </div>
                <div className="flex items-center gap-2">
                  {/* Search Input sliding open to the left */}
                  <div className={`overflow-hidden transition-all duration-300 flex items-center ${isHeaderSearchOpen ? 'w-32 sm:w-44 opacity-100 mr-1' : 'w-0 opacity-0 pointer-events-none'}`}>
                    <input
                      type="text"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      placeholder="Suchen..."
                      className="app-search-input"
                      onClick={(e) => e.stopPropagation()}
                      autoFocus={isHeaderSearchOpen}
                    />
                  </div>

                  {/* Search trigger Lupe button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsHeaderSearchOpen(!isHeaderSearchOpen);
                      if (isHeaderSearchOpen) {
                        setSearchTerm('');
                      }
                    }}
                    className={`app-toggle-btn ${
                      isHeaderSearchOpen 
                        ? 'app-toggle-btn-active'
                        : 'app-toggle-btn-inactive'
                    }`}
                    title="Suche umschalten"
                  >
                    <Search className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleToggleViewMode();
                    }}
                    className="app-toggle-btn app-toggle-btn-inactive"
                    title={viewMode === 'compact' ? "Detailansicht aktivieren" : "Kompaktansicht aktivieren"}
                  >
                    {viewMode === 'compact' ? <LayoutGrid className="w-3.5 h-3.5" /> : <LayoutList className="w-3.5 h-3.5" />}
                  </button>
                  <span id="in-bearbeitung-section-sum" className="theme-tab-sum-badge text-[10px] font-mono font-bold px-2 py-1 rounded-md">
                    {currencyFormatter.format(activeSoldItemsSum)}
                  </span>
                  <span id="in-bearbeitung-section-badge" className="theme-tab-count-badge text-[10px] font-mono font-bold px-2 py-1 rounded-md">
                    {activeSoldItems.length}
                  </span>
                </div>
              </div>

              {soldActiveSection && (
                <div id="sold-active-list" className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8 transition-all duration-300">
                  {activeSoldItems.length === 0 ? (
                    <div className="col-span-1 sm:col-span-2 flex flex-col items-center justify-center p-8 text-slate-400 dark:text-zinc-650 text-center">
                      <Flame className="w-12 h-12 mb-3 opacity-40" style={{ color: 'var(--theme-in-bearbeitung-color)' }} />
                      <p className="font-bold text-sm">Aktuell keine Küchen in Bearbeitung.</p>
                    </div>
                  ) : (
                    activeSoldItems.map((comm) => (
                      <CommissionCard
                        key={comm.id}
                        commission={comm}
                        onResolve={handleResolveCommission}
                        onReopen={handleReopenCommission}
                        onDelete={setDeleteId}
                        onEditPrice={setEditPriceId}
                        onEditDate={setEditDateId}
                        onEditNote={setEditNoteId}
                        onUpdateField={handleUpdateField}
                        onCycleBauart={handleCycleBauart}
                        teammateConfigs={teammateConfigs}
                        viewMode={viewMode}
                        citySuggestions={citySuggestions}
                      />
                    ))
                  )}
                </div>
              )}

              {/* Archive segment */}
              <div
                className="mb-5 pb-3 flex justify-between items-center cursor-pointer group"
                onClick={() => setSoldArchiveSection(!soldArchiveSection)}
              >
                <div className="flex items-center gap-2">
                  <ChevronDown
                    className={`w-4 h-4 text-slate-400 transition-transform duration-300 group-hover:text-blue-500 ${
                      soldArchiveSection ? '' : '-rotate-90'
                    }`}
                  />
                  <h2 className="text-[10px] font-black uppercase tracking-widest text-slate-400 group-hover:text-blue-500 transition-colors">
                    Ablage (Bestellt)
                  </h2>
                </div>
                <div className="flex items-center gap-2">
                  {/* Search Input sliding open to the left */}
                  <div className={`overflow-hidden transition-all duration-300 flex items-center ${isHeaderSearchOpen ? 'w-32 sm:w-44 opacity-100 mr-1' : 'w-0 opacity-0 pointer-events-none'}`}>
                    <input
                      type="text"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      placeholder="Suchen..."
                      className="app-search-input"
                      onClick={(e) => e.stopPropagation()}
                      autoFocus={isHeaderSearchOpen}
                    />
                  </div>

                  {/* Search trigger Lupe button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsHeaderSearchOpen(!isHeaderSearchOpen);
                      if (isHeaderSearchOpen) {
                        setSearchTerm('');
                      }
                    }}
                    className={`app-toggle-btn ${
                      isHeaderSearchOpen 
                        ? 'app-toggle-btn-active'
                        : 'app-toggle-btn-inactive'
                    }`}
                    title="Suche umschalten"
                  >
                    <Search className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleToggleViewMode();
                    }}
                    className="app-toggle-btn app-toggle-btn-inactive"
                    title={viewMode === 'compact' ? "Detailansicht aktivieren" : "Kompaktansicht aktivieren"}
                  >
                    {viewMode === 'compact' ? <LayoutGrid className="w-3.5 h-3.5" /> : <LayoutList className="w-3.5 h-3.5" />}
                  </button>
                  <span className="theme-tab-count-badge text-[10px] font-mono font-bold px-2 py-1 rounded-md">
                    {archivedItems.length}
                  </span>
                </div>
              </div>

              {soldArchiveSection && (
                <div id="sold-archive-list" className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8 transition-all duration-300">
                  {archivedItems.length === 0 ? (
                    <div className="col-span-1 sm:col-span-2 flex flex-col items-center justify-center p-8 text-slate-400 dark:text-zinc-650 text-center">
                      <CheckCircle className="w-12 h-12 mb-3 opacity-40 text-slate-350" />
                      <p className="font-bold text-sm">Noch keine Küchen fertig bestellt.</p>
                    </div>
                  ) : (
                    archivedItems.map((comm) => (
                      <CommissionCard
                        key={comm.id}
                        commission={comm}
                        onResolve={handleResolveCommission}
                        onReopen={handleReopenCommission}
                        onDelete={setDeleteId}
                        onEditPrice={setEditPriceId}
                        onEditDate={setEditDateId}
                        onEditNote={setEditNoteId}
                        onUpdateField={handleUpdateField}
                        onCycleBauart={handleCycleBauart}
                        teammateConfigs={teammateConfigs}
                        viewMode={viewMode}
                        citySuggestions={citySuggestions}
                      />
                    ))
                  )}
                </div>
              )}

              {/* Lost Offers Section */}
              <div
                className="mb-5 pb-3 flex justify-between items-center cursor-pointer group"
                onClick={() => setLostSection(!lostSection)}
              >
                <div className="flex items-center gap-2">
                  <ChevronDown
                    className={`w-4 h-4 text-red-500 transition-transform duration-300 group-hover:text-red-450 ${
                      lostSection ? '' : '-rotate-90'
                    }`}
                  />
                  <h2 className="text-[10px] font-black uppercase tracking-widest text-red-500 group-hover:text-red-450 transition-colors">
                    Abgesagt (Nicht Verkauft)
                  </h2>
                </div>
                <div className="flex items-center gap-2">
                  {/* Search Input sliding open to the left */}
                  <div className={`overflow-hidden transition-all duration-300 flex items-center ${isHeaderSearchOpen ? 'w-32 sm:w-44 opacity-100 mr-1' : 'w-0 opacity-0 pointer-events-none'}`}>
                    <input
                      type="text"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      placeholder="Suchen..."
                      className="app-search-input"
                      onClick={(e) => e.stopPropagation()}
                      autoFocus={isHeaderSearchOpen}
                    />
                  </div>

                  {/* Search trigger Lupe button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsHeaderSearchOpen(!isHeaderSearchOpen);
                      if (isHeaderSearchOpen) {
                        setSearchTerm('');
                      }
                    }}
                    className={`app-toggle-btn ${
                      isHeaderSearchOpen 
                        ? 'app-toggle-btn-active'
                        : 'app-toggle-btn-inactive'
                    }`}
                    title="Suche umschalten"
                  >
                    <Search className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleToggleViewMode();
                    }}
                    className="app-toggle-btn app-toggle-btn-inactive"
                    title={viewMode === 'compact' ? "Detailansicht aktivieren" : "Kompaktansicht aktivieren"}
                  >
                    {viewMode === 'compact' ? <LayoutGrid className="w-3.5 h-3.5" /> : <LayoutList className="w-3.5 h-3.5" />}
                  </button>
                  <span className="text-[10px] font-mono font-bold bg-red-500/10 text-red-500 px-2 py-1 rounded-md">
                    {lostItems.length}
                  </span>
                </div>
              </div>

              {lostSection && (
                <div id="lost-list" className="grid grid-cols-1 sm:grid-cols-2 gap-4 transition-all duration-300">
                  {lostItems.length === 0 ? (
                    <div className="col-span-1 sm:col-span-2 flex flex-col items-center justify-center p-8 text-slate-400 dark:text-zinc-650 text-center">
                      <X className="w-12 h-12 mb-3 opacity-40 text-red-500/70" />
                      <p className="font-bold text-sm">Keine abgesagten Aufträge.</p>
                    </div>
                  ) : (
                    lostItems.map((comm) => (
                      <CommissionCard
                        key={comm.id}
                        commission={comm}
                        onResolve={handleResolveCommission}
                        onReopen={handleReopenCommission}
                        onDelete={setDeleteId}
                        onEditPrice={setEditPriceId}
                        onEditDate={setEditDateId}
                        onEditNote={setEditNoteId}
                        onUpdateField={handleUpdateField}
                        onCycleBauart={handleCycleBauart}
                        teammateConfigs={teammateConfigs}
                        viewMode={viewMode}
                        citySuggestions={citySuggestions}
                      />
                    ))
                  )}
                </div>
              )}
            </section>
          )}

          {/* TAB: AUSARBEITUNGEN */}
          {activeTab === 'ausarbeitung' && isEnrico && (
            <AusarbeitungenTab
              items={filteredAusarbeitungen}
              onAdd={handleAddAusarbeitung}
              onUpdate={handleUpdateAusarbeitung}
              onDelete={handleDeleteAusarbeitung}
              currentUserEmail={currentUser?.email || undefined}
              theme={theme}
              citySuggestions={citySuggestions}
            />
          )}

          {/* TAB: STATISTICS */}
          {activeTab === 'stats' && (
            <StatsTab
              commissions={filteredCommissions}
              annualTarget={annualTarget}
              yearlyTargets={yearlyTargets}
              availableYears={availableYears}
              ausarbeitungen={filteredAusarbeitungen}
              currentUserEmail={currentUser?.email || undefined}
              selectedColleague={selectedColleague}
              theme={theme}
            />
          )}

          {/* TAB: ADMIN */}
          {activeTab === 'admin' && (
            <AdminTab
              annualTarget={annualTarget}
              yearlyTargets={yearlyTargets}
              onSaveAnnualTarget={handleSaveAnnualTarget}
              onSaveYearlyTarget={handleSaveYearlyTarget}
              onDeleteYearlyTarget={handleDeleteYearlyTarget}
              onLogout={handleLogout}
              availableYears={availableYears}
              allTeammates={allTeammates}
              adminEmails={adminEmails}
              onSaveAdminEmails={handleSaveAdminEmails}
              teammates={teammateConfigs}
              onSaveTeammates={handleSaveTeammates}
              onOpenUserProfile={(email) => {
                setTargetProfileEmail(email);
                setIsProfileOpen(true);
              }}
              commissions={commissions}
              ausarbeitungen={ausarbeitungen}
              onImportBackup={handleImportBackup}
            />
          )}

        </main>
      </div>

      {/* Trigger Dialog Modals */}
      <AddCommissionModal
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        onSave={handleAddCommission}
        citySuggestions={citySuggestions}
      />

      <EditPriceModal
        id={editPriceId}
        currentName={activeNameValue}
        currentPrice={activePriceValue}
        onClose={() => setEditPriceId(null)}
        onSave={async (id, newName, newPrice) => {
          await handleUpdateNameAndPrice(id, newName, newPrice);
        }}
        onDelete={setDeleteId}
      />

      <EditDateModal
        id={editDateId}
        currentResolvedAt={activeDateValue}
        onClose={() => setEditDateId(null)}
        onSave={async (id, isoDateStr) => {
          await handleUpdateField(id, 'resolvedAt', isoDateStr);
        }}
      />

      <EditNoteModal
        id={editNoteId}
        currentNote={activeNoteText}
        onClose={() => setEditNoteId(null)}
        onSave={async (id, text) => {
          await handleUpdateField(id, 'note', text);
        }}
      />

      <ConfirmDeleteModal
        id={deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={async (id) => {
          await handleDeleteCommission(id);
        }}
      />

      <UserProfileModal
        isOpen={isProfileOpen}
        onClose={() => {
          setIsProfileOpen(false);
          setTargetProfileEmail(null);
        }}
        currentUser={currentUser}
        currentUserDisplayName={currentUserDisplayName || ''}
        onLogout={handleLogout}
        yearlyTargets={yearlyTargets}
        annualTarget={annualTarget}
        theme={theme}
        onChangeTheme={(newTheme) => {
          setTheme(newTheme);
          localStorage.setItem('kk_theme', newTheme);
          applyThemeClasses(newTheme);
        }}
        commissions={commissions}
        isAdmin={isAdmin}
        selectedColleague={selectedColleague}
        teammates={teammateConfigs}
        targetProfileEmail={targetProfileEmail}
      />

      {/* Error Toast Dialog Overlay */}
      {errorMessage && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[250] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-805 p-8 max-w-sm w-full rounded-2xl shadow-2xl modal-fade border-red-500/50">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-red-500/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <X className="w-8 h-8 text-red-500" />
              </div>
              <h2 className="text-xl font-black tracking-tight text-red-500">Fehler</h2>
              <p className="text-xs text-slate-500 dark:text-zinc-400 mt-2 font-medium">{errorMessage}</p>
            </div>
            <button
              onClick={() => setErrorMessage(null)}
              className="w-full py-3 rounded-xl font-bold text-xs uppercase tracking-widest bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 hover:dark:bg-zinc-700 text-slate-600 dark:text-slate-300 active:scale-95 transition-transform cursor-pointer"
            >
              Schließen
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
