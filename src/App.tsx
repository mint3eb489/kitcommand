/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useMemo } from 'react';
import { onAuthStateChanged, signOut, User } from 'firebase/auth';
import { onSnapshot, addDoc, updateDoc, doc, deleteDoc, setDoc } from 'firebase/firestore';
import { auth, getDbCollectionRef, getAusarbeitungenCollectionRef, handleFirestoreError, isUserAdmin, ADMIN_EMAILS } from './firebase.ts';
import { Commission, OperationType, Ausarbeitung, TeammateConfig } from './types.ts';
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
import { Search, Plus, Clipboard, ChevronDown, CheckCircle, Flame, X, TrendingUp, Sparkles, Settings } from 'lucide-react';

export default function App() {
  // Auth & General States
  const [currentUser, setCurrentUser] = useState<User | null>(null);
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
  
  // Theme type definition and modern state setup 
  type ThemeType = 'light' | 'dark' | 'sage' | 'ocean' | 'wood';
  const [theme, setTheme] = useState<ThemeType>('light');
  const [isSearchActive, setIsSearchActive] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
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
        setCurrentUser(null);
        setCommissions([]);
      }
      setAuthChecked(true);
    });
    return () => unsub();
  }, []);

  // Real-Time Data Listeners (Triggers once authenticated)
  useEffect(() => {
    if (!currentUser) return;

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
    if (!currentUser) return;
    const colRef = getDbCollectionRef();
    const settingsDocRef = doc(colRef, '_system_settings_');
    try {
      setSyncStatus('connecting');
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
    if (!currentUser) return;
    const colRef = getDbCollectionRef();
    const settingsDocRef = doc(colRef, '_system_settings_');
    try {
      setSyncStatus('connecting');
      const updatedTargets = {
        ...yearlyTargets,
        [year]: newTarget,
      };
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
    if (!currentUser) return;
    const colRef = getDbCollectionRef();
    const settingsDocRef = doc(colRef, '_system_settings_');
    try {
      setSyncStatus('connecting');
      const updatedTargets = { ...yearlyTargets };
      delete updatedTargets[year];
      // Save entire settings to remove the deleted key completely
      await setDoc(settingsDocRef, { annualTarget, yearlyTargets: updatedTargets });
      setSyncStatus('synced');
    } catch (error) {
      console.error(error);
      setErrorMessage(`Umsatzziel für ${year} konnte nicht gelöscht werden.`);
    }
  };

  // Update dynamic admin emails list in Firestore
  const handleSaveAdminEmails = async (emails: string[]) => {
    if (!currentUser) return;
    const colRef = getDbCollectionRef();
    const settingsDocRef = doc(colRef, '_system_settings_');
    try {
      setSyncStatus('connecting');
      // Sanitize and clean emails
      const cleaned = Array.from(new Set(
        emails
          .map(e => e.trim().toLowerCase())
          .filter(e => e.length > 5) // simple validation
      ));
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
    if (!currentUser) return;
    const colRef = getDbCollectionRef();
    const settingsDocRef = doc(colRef, '_system_settings_');
    try {
      setSyncStatus('connecting');
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

  // Add a new Commission entry
  const handleAddCommission = async (
    name: string,
    price: number,
    bauart: 'bestand' | 'neubau' | 'kleinauftrag'
  ) => {
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
  }) => {
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

  // Extract all distinct teammate emails currently existing in database
  const allTeammates = useMemo(() => {
    const emails = new Set<string>();
    commissions.forEach((c) => {
      if (c.createdByEmail) {
        emails.add(c.createdByEmail.toLowerCase().trim());
      }
    });
    // Ensure admin emails or current user's email is present
    if (currentUser?.email) {
      const email = (currentUser.email.toLowerCase() === 'belmonte.enrico@gmail.com') ? 'belmonte@fs-kuechen.de' : currentUser.email.toLowerCase();
      emails.add(email);
    }
    return Array.from(emails).sort();
  }, [commissions, currentUser]);

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
    return rawEmail === 'belmonte.enrico@gmail.com' || rawEmail === 'belmonte@fs-kuechen.de';
  }, [currentUser]);

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
    
    // Only belmonte@fs-kuechen.de works with Ausarbeitungen
    if (email !== 'belmonte@fs-kuechen.de') {
      return [];
    }

    // Filter by selectedColleague dropdown perspective if Enrico wants to view another colleague's stats
    if (selectedColleague !== 'all') {
      const selectedLower = selectedColleague.toLowerCase().trim();
      if (selectedLower !== 'belmonte@fs-kuechen.de' && selectedLower !== 'belmonte.enrico@gmail.com') {
        return [];
      }
    }
    return ausarbeitungen;
  }, [ausarbeitungen, currentUser, selectedColleague]);

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

  // Dynamically extract list of years containing commission dates + current year + custom year targets
  const availableYears = useMemo(() => {
    const years = new Set<number>();
    filteredCommissions.forEach((c) => {
      const targetDateStr = c.resolvedAt || c.createdAt;
      if (targetDateStr) {
        years.add(new Date(targetDateStr).getFullYear());
      }
    });
    years.add(new Date().getFullYear());
    
    // Also include any years that already have custom targets
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
  }, [filteredCommissions, yearlyTargets]);

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

  if (!currentUser) {
    return <LoginOverlay />;
  }

  return (
    <div className="p-3 bg-slate-50 dark:bg-black text-slate-900 dark:text-slate-100 min-h-screen flex flex-col pt-[calc(1.25rem+env(safe-area-inset-top))] md:p-8 md:pt-8 transition-colors duration-300">
      
      {/* Dynamic header / upper controls - hidden on mobile, beautiful on desktop/tablet */}
      <div
        id="cloud-status"
        className="hidden md:flex fixed top-[calc(1rem+env(safe-area-inset-top))] right-4 text-[9px] font-bold uppercase tracking-widest z-50 flex-col sm:flex-row items-end sm:items-center gap-1.5 select-none"
      >
        {currentUser?.email && (
          <button 
            onClick={() => setIsProfileOpen(true)}
            title="Mitarbeiterprofil ansehen"
            className="flex items-center gap-1.5 bg-white/95 dark:bg-zinc-900/95 p-1.5 pl-2.5 pr-2.5 rounded-full shadow-[0_4px_12px_rgba(0,0,0,0.05)] border border-slate-200/60 dark:border-zinc-800/80 backdrop-blur-md cursor-pointer hover:bg-slate-50 dark:hover:bg-zinc-850 active:scale-95 transition-all text-left"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0"></span>
            <span className="text-slate-700 dark:text-zinc-300 font-sans text-[10px] font-bold">{currentUserDisplayName}</span>
            {isAdmin && (
              <span className="bg-amber-500/10 text-amber-550 border border-amber-500/20 text-[8px] px-1 py-0 rounded font-black tracking-wider uppercase ml-0.5 animate-pulse">
                Admin
              </span>
            )}
          </button>
        )}
        <div className="flex items-center gap-2 bg-white/95 dark:bg-zinc-900/95 p-2 px-3 rounded-full shadow-[0_4px_12px_rgba(0,0,0,0.05)] border border-slate-200/60 dark:border-zinc-800/80 backdrop-blur-md">
          <span id="status-text" className="text-slate-400">
            {syncStatus === 'connecting' && 'Verbinde...'}
            {syncStatus === 'synced' && 'Live Sync'}
            {syncStatus === 'error' && 'Sync Fehler'}
          </span>
          <div
            id="status-icon"
            className={`w-2 h-2 rounded-full ${
              syncStatus === 'synced' ? 'bg-green-500' : 'bg-blue-500 animate-pulse'
            }`}
          ></div>
        </div>
      </div>

      {/* Floating Action Button (FAB) - On desktop and tablet */}
      <button
        onClick={() => setIsAddOpen(true)}
        className="hidden md:flex fixed z-40 bg-blue-600 text-white w-14 h-14 rounded-full shadow-[0_10px_25px_rgba(37,99,235,0.5)] items-center justify-center hover:bg-blue-700 active:scale-90 transition-all group bottom-8 right-8 cursor-pointer"
      >
        <Plus className="w-6 h-6 transform group-hover:rotate-90 transition-transform duration-300" />
      </button>

      {/* Main Container */}
      <div className="max-w-4xl mx-auto w-full flex-1 pt-4 lg:pt-0">
        
        {/* Header App Identity */}
        <header className="flex flex-col justify-center items-center mb-6 gap-3 mt-2 lg:mt-0 relative">
          <div className="flex items-center gap-4">
            <button
              id="app-logo-theme-toggle"
              onClick={toggleTheme}
              className="w-14 h-14 bg-white dark:bg-zinc-900 border border-blue-500/80 dark:border-blue-400/80 rounded-xl flex items-center justify-center shadow-xs shrink-0 cursor-pointer active:scale-95 transition-all text-blue-600 dark:text-blue-450 hover:bg-blue-50/50 dark:hover:bg-blue-950/20 hover:border-blue-600 dark:hover:border-blue-300 group relative overflow-hidden"
              title="Wechsle Theme / KitCommand dynamic Logo"
            >
              {/* Dynamic Image Logo above vector fallback */}
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

              {/* Symmetrical Vector Emblem behind the image */}
              <div className="relative flex items-center justify-center z-0">
                <TrendingUp className="w-6 h-6 stroke-[2.25] text-blue-600 dark:text-blue-400 group-hover:scale-110 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 transition-all duration-300 ease-out" />
                <Sparkles className="w-3.5 h-3.5 absolute -top-2.5 -right-2.5 text-amber-500 fill-amber-500/30 opacity-60 group-hover:opacity-100 group-hover:scale-110 group-hover:rotate-12 transition-all duration-300" />
              </div>
            </button>
            <div>
              <h1 className="text-3xl font-black flex items-center tracking-tighter select-none">
                KitCommand{' '}
                <span className="inline-flex items-center border border-amber-500 text-amber-500 rounded px-1.5 py-0.5 text-[0.45em] font-black ml-2.5 transform translateY(-1px)">
                  Pro
                </span>
              </h1>
            </div>
          </div>



          {/* Symmetrical secondary information row on Mobile - Extremely clean, avoids collisions */}
          {currentUser?.email && (
            <div className="flex md:hidden items-center justify-center gap-1.5 select-none mt-1">
              <button 
                onClick={() => setIsProfileOpen(true)}
                title="Mitarbeiterprofil ansehen"
                className="flex items-center gap-1 bg-white/95 dark:bg-zinc-900/95 p-1 pl-2.5 pr-2.5 rounded-full border border-slate-200/50 dark:border-zinc-805 shadow-sm leading-none hover:bg-slate-50 dark:hover:bg-zinc-855 cursor-pointer active:scale-95 transition-all text-left"
              >
                <span className="w-1 h-1 rounded-full bg-blue-500 shrink-0"></span>
                <span className="text-slate-705 dark:text-zinc-300 font-sans text-[9px] font-bold max-w-[130px] truncate">
                  {currentUserDisplayName}
                </span>
                {isAdmin && (
                  <span className="bg-amber-500/10 text-amber-600 dark:text-amber-450 text-[7px] px-1 font-bold rounded uppercase tracking-wider ml-0.5">
                    Admin
                  </span>
                )}
              </button>
              
              <div className="flex items-center gap-1.5 bg-white/95 dark:bg-zinc-900/95 p-1 px-2.5 rounded-full border border-slate-200/50 dark:border-zinc-800/80 shadow-sm leading-none">
                <div
                  className={`w-1.5 h-1.5 rounded-full ${
                    syncStatus === 'synced' ? 'bg-green-500' : 'bg-blue-500 animate-pulse'
                  }`}
                ></div>
                <span className="text-slate-400 dark:text-zinc-500 font-bold uppercase tracking-wider text-[8px]">
                  {syncStatus === 'synced' ? 'Live' : 'Sync'}
                </span>
              </div>
            </div>
          )}
        </header>

        {/* STICKY NAV ISLAND (Suche + Tabs) */}
        <div 
          id="sticky-nav-island"
          className="fixed left-0 right-0 bottom-0 z-50 md:sticky md:top-4 md:bottom-auto md:left-auto md:right-auto max-w-md mx-auto md:mb-6 select-none"
        >
          <div className="bg-white/95 dark:bg-zinc-900/95 backdrop-blur-xl rounded-t-3xl md:rounded-xl border-t md:border border-slate-200/50 dark:border-zinc-800/50 shadow-[0_-15px_30px_-5px_rgba(0,0,0,0.15)] dark:shadow-[0_-15px_30px_-5px_rgba(0,0,0,0.6)] md:shadow-lg flex flex-col gap-2 p-4 pt-3 pb-[calc(1rem+env(safe-area-inset-bottom))] md:p-2.5 md:pb-2.5">
            
            {/* Desktop search & Mobile toggleable search */}
            <div className="flex gap-2 items-center">
              {/* On Desktop: Always search field. On Mobile: only if isSearchActive is true */}
              <div className={`relative flex-1 ${isSearchActive ? 'flex' : 'hidden md:flex'}`}>
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="w-4 h-4 text-slate-400" />
                </div>
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-slate-100/50 dark:bg-zinc-950 pb-1.5 pt-2 pl-10 pr-10 text-sm font-bold text-slate-800 dark:text-slate-200 placeholder-slate-400 border-none outline-none focus:ring-2 focus:ring-blue-500 rounded-xl transition-all"
                  placeholder="Kunde / Komm.-Nr. suchen..."
                  autoFocus={isSearchActive}
                />
                {/* Mobile clear / close button inside input */}
                {isSearchActive && (
                  <button 
                    onClick={() => { setSearchTerm(''); setIsSearchActive(false); }}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                    title="Suche schließen"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Mobile controls when search is NOT active */}
              {!isSearchActive && (
                <div className="flex md:hidden flex-1 items-center justify-between gap-2">
                  {/* Left: Perspektive Selection permanently visible if admin */}
                  {isAdmin ? (
                    <div className="flex-1 min-w-0 flex items-center gap-1.5 px-2 py-1.5 bg-slate-100/50 dark:bg-zinc-950/60 rounded-xl border border-slate-200/40 dark:border-zinc-850">
                      <span className="text-[9px] font-black uppercase text-slate-400 dark:text-zinc-500 pl-0.5 tracking-wider select-none shrink-0">Perspektive:</span>
                      <select
                        value={selectedColleague}
                        onChange={(e) => setSelectedColleague(e.target.value)}
                        className="bg-transparent text-[11px] font-bold text-slate-700 dark:text-zinc-200 border-none outline-none cursor-pointer flex-1 py-0.5 min-w-0"
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

                  {/* Buttons right-aligned: Search trigger & Add trigger & Admin Zahnrad */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    {/* Search icon (Lupen-icon) */}
                    <button
                      onClick={() => setIsSearchActive(true)}
                      className="w-9 h-9 bg-slate-100/50 dark:bg-zinc-950 rounded-xl flex items-center justify-center border border-slate-200/40 dark:border-zinc-850 hover:bg-slate-200 dark:hover:bg-zinc-855 text-slate-500 dark:text-zinc-400 active:scale-95 transition-all cursor-pointer"
                      title="Suche öffnen"
                    >
                      <Search className="w-4 h-4" />
                    </button>

                    {/* Svelte compact add button right in mobile bar */}
                    <button
                      onClick={() => setIsAddOpen(true)}
                      className="w-9 h-9 bg-blue-600 hover:bg-blue-750 text-white rounded-xl shadow-md shadow-blue-500/10 flex items-center justify-center active:scale-90 transition-all cursor-pointer"
                      title="Auftrag hinzufügen"
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
              )}
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
            <div id="app-navigation-tabs" className={`grid ${isEnrico ? 'grid-cols-4' : 'grid-cols-3'} sm:flex sm:flex-wrap gap-1 bg-slate-100/80 dark:bg-zinc-950 p-1 rounded-xl`}>
              <button
                onClick={() => setActiveTab('open')}
                className={`py-2 px-2 rounded-lg text-center text-[11px] sm:text-xs font-sans font-black uppercase tracking-wider transition-all duration-200 cursor-pointer ${
                  activeTab === 'open'
                    ? 'bg-white dark:bg-zinc-800 text-blue-600 dark:text-blue-400 shadow-[0_2px_8px_rgba(0,0,0,0.08)] font-black'
                    : 'text-slate-500 dark:text-zinc-400 hover:text-slate-800 dark:hover:text-zinc-200 font-bold'
                }`}
              >
                Offen
              </button>
              <button
                onClick={() => setActiveTab('sold')}
                className={`py-2 px-2 rounded-lg text-center text-[11px] sm:text-xs font-sans font-black uppercase tracking-wider transition-all duration-200 cursor-pointer ${
                  activeTab === 'sold'
                    ? 'bg-white dark:bg-zinc-800 text-blue-600 dark:text-blue-400 shadow-[0_2px_8px_rgba(0,0,0,0.08)] font-black'
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
                      ? 'bg-white dark:bg-zinc-800 text-blue-600 dark:text-blue-400 shadow-[0_2px_8px_rgba(0,0,0,0.08)] font-black'
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
                    ? 'bg-white dark:bg-zinc-800 text-blue-600 dark:text-blue-400 shadow-[0_2px_8px_rgba(0,0,0,0.08)] font-black'
                    : 'text-slate-500 dark:text-zinc-400 hover:text-slate-800 dark:hover:text-zinc-200 font-bold'
                }`}
              >
                Statistik
              </button>
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
                  <span className="text-[10px] font-mono font-bold text-blue-500 bg-blue-500/10 px-2 py-1 rounded-md">
                    {currencyFormatter.format(openItemsSum)}
                  </span>
                  <span className="text-[10px] font-mono font-bold bg-slate-200 dark:bg-zinc-850 text-slate-600 dark:text-slate-400 px-2 py-1 rounded-md">
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
                    className={`w-4 h-4 text-emerald-500 transition-transform duration-300 ${
                      soldActiveSection ? '' : '-rotate-90'
                    }`}
                  />
                  <h2 className="text-[10px] font-black uppercase tracking-widest text-emerald-500">
                    In Bearbeitung
                  </h2>
                </div>
                <span className="text-[10px] font-mono font-bold bg-emerald-500/10 text-emerald-500 px-2 py-1 rounded-md">
                  {activeSoldItems.length}
                </span>
              </div>

              {soldActiveSection && (
                <div id="sold-active-list" className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8 transition-all duration-300">
                  {activeSoldItems.length === 0 ? (
                    <div className="col-span-1 sm:col-span-2 flex flex-col items-center justify-center p-8 text-slate-400 dark:text-zinc-650 text-center">
                      <Flame className="w-12 h-12 mb-3 opacity-40 text-emerald-500/80" />
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
                <span className="text-[10px] font-mono font-bold bg-slate-200 dark:bg-zinc-855 text-slate-600 dark:text-slate-400 px-2 py-1 rounded-md">
                  {archivedItems.length}
                </span>
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
                <span className="text-[10px] font-mono font-bold bg-red-500/10 text-red-500 px-2 py-1 rounded-md">
                  {lostItems.length}
                </span>
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
            />
          )}

        </main>
      </div>

      {/* Trigger Dialog Modals */}
      <AddCommissionModal
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        onSave={handleAddCommission}
      />

      <EditPriceModal
        id={editPriceId}
        currentName={activeNameValue}
        currentPrice={activePriceValue}
        onClose={() => setEditPriceId(null)}
        onSave={async (id, newName, newPrice) => {
          await handleUpdateNameAndPrice(id, newName, newPrice);
        }}
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
        onClose={() => setIsProfileOpen(false)}
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
