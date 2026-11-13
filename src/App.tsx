/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  CreditCard,
  Transaction,
  CardDueStatus,
  MonthlyStats,
} from './types';
import {
  INITIAL_DEMO_CARDS,
  INITIAL_DEMO_TRANSACTIONS,
  calculateCardDueStatus,
  calculateMonthlyStats,
  formatThaiCurrency,
  formatThaiMonth,
  generateInstallmentSeries,
  autoPopulateMissingInstallments,
  isFutureInstallmentHidden,
  getTransactionBillingCycleMonth,
  calculateCardCutoffAlertStatus,
} from './utils/cardUtils';

import { Header } from './components/Header';
import { DueAlertBanner } from './components/DueAlertBanner';
import { CardSlider } from './components/CardSlider';
import { MonthlySummary } from './components/MonthlySummary';
import { TransactionList } from './components/TransactionList';
import { TransactionModal } from './components/TransactionModal';
import { CardModal } from './components/CardModal';
import { ConfirmModal } from './components/ConfirmModal';
import { HistoricalDashboard } from './components/HistoricalDashboard';
import { InstallmentPlansModal } from './components/InstallmentPlansModal';
import { BackgroundModal, BackgroundPosition } from './components/BackgroundModal';
import { ExportCsvModal } from './components/ExportCsvModal';
import { BrandCustomizationModal } from './components/BrandCustomizationModal';
import { ConflictModal } from './components/ConflictModal';
import { DiagnosticsModal } from './components/DiagnosticsModal';
import { CreditCard as CardIcon, BarChart3, Loader2 } from 'lucide-react';
import { useAuth } from './context/AuthContext';
import {
  logAuthDiagnostic,
  subscribeUserCards,
  saveUserCardToFirestore,
  saveCardOrderToFirestore,
  deleteUserCardFromFirestore,
  subscribeUserTransactions,
  saveUserTransactionToFirestore,
  saveBatchTransactionsToFirestore,
  deleteUserTransactionFromFirestore,
  subscribeUserProfile,
  saveUserProfileToFirestore,
  checkAndMigrateUserData,
  cleanStartUserCloudData,
  firebaseAppConfig,
} from './services/firebase';
import {
  enqueueOperation,
  processSyncQueue,
  subscribeSyncQueue,
  resolveConflict,
  clearSyncQueue,
  loadSyncQueue,
  saveSyncQueue,
  SyncOperation,
  SyncStats,
} from './services/syncQueue';
import { SyncState } from './components/Header';

const STORAGE_KEY_CARDS = 'cardpulse_cards_v1';
const STORAGE_KEY_TXS = 'cardpulse_transactions_v1';
const STORAGE_KEY_BG_IMAGE = 'cardpulse_bg_image_v1';
const STORAGE_KEY_BG_OPACITY = 'cardpulse_bg_opacity_v1';
const STORAGE_KEY_BG_BLUR = 'cardpulse_bg_blur_v1';
const STORAGE_KEY_BG_POSITION = 'cardpulse_bg_position_v1';
const STORAGE_KEY_BRAND_NAME = 'cardpulse_brand_name_v1';
const STORAGE_KEY_BRAND_LOGO = 'cardpulse_brand_logo_v1';
const STORAGE_KEY_BRAND_TAGLINE = 'cardpulse_brand_tagline_v1';
const STORAGE_KEY_PRODUCTION_CLEAN = 'cardpulse_production_clean_v2';

// Production Clean Start: One-time purge of demo sample data from LocalStorage
if (typeof window !== 'undefined') {
  try {
    if (!localStorage.getItem(STORAGE_KEY_PRODUCTION_CLEAN)) {
      localStorage.removeItem(STORAGE_KEY_CARDS);
      localStorage.removeItem(STORAGE_KEY_TXS);
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && (k.startsWith('cardpulse_sync_queue_') || k.startsWith('cardpulse_sync_lock_'))) {
          localStorage.removeItem(k);
        }
      }
      localStorage.setItem(STORAGE_KEY_PRODUCTION_CLEAN, 'true');
    }
  } catch {}
}

export default function App() {
  // App data state: Clean production start with empty arrays
  const [cards, setCards] = useState<CreditCard[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_CARDS);
      if (!saved) return [];
      const parsed = JSON.parse(saved);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  });

  const [transactions, setTransactions] = useState<Transaction[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_TXS);
      if (!saved) return [];
      const parsed = JSON.parse(saved);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  });

  // UI state
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'tracker' | 'dashboard'>('tracker');

  // Background Customization State (Stored in localStorage)
  const [bgImage, setBgImage] = useState<string | null>(() => {
    return localStorage.getItem(STORAGE_KEY_BG_IMAGE) || null;
  });
  const [bgOpacity, setBgOpacity] = useState<number>(() => {
    const val = localStorage.getItem(STORAGE_KEY_BG_OPACITY);
    return val !== null ? parseFloat(val) : 0.7;
  });
  const [bgBlur, setBgBlur] = useState<number>(() => {
    const val = localStorage.getItem(STORAGE_KEY_BG_BLUR);
    return val !== null ? parseFloat(val) : 4;
  });
  const [bgPosition, setBgPosition] = useState<BackgroundPosition | null>(() => {
    try {
      const val = localStorage.getItem(STORAGE_KEY_BG_POSITION);
      return val ? JSON.parse(val) : null;
    } catch {
      return null;
    }
  });

  // Brand customization state
  const [brandName, setBrandName] = useState<string>(() => {
    return localStorage.getItem(STORAGE_KEY_BRAND_NAME) || 'CardPulse';
  });
  const [brandLogo, setBrandLogo] = useState<string | null>(() => {
    return localStorage.getItem(STORAGE_KEY_BRAND_LOGO) || null;
  });
  const [brandTagline, setBrandTagline] = useState<string>(() => {
    return localStorage.getItem(STORAGE_KEY_BRAND_TAGLINE) || 'ระบบติดตามและจัดการค่าบัตรเครดิต';
  });

  // Modals state
  const [isNewTxModalOpen, setIsNewTxModalOpen] = useState(false);
  const [editingTx, setEditingTx] = useState<Transaction | null>(null);
  const [isCardModalOpen, setIsCardModalOpen] = useState(false);
  const [editingCard, setEditingCard] = useState<CreditCard | null>(null);
  const [isBgModalOpen, setIsBgModalOpen] = useState(false);
  const [isInstallmentModalOpen, setIsInstallmentModalOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isBrandModalOpen, setIsBrandModalOpen] = useState(false);
  const [isDiagnosticsModalOpen, setIsDiagnosticsModalOpen] = useState(false);

  // Confirmation Modal state
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    detail?: string;
    confirmLabel?: string;
    secondaryAction?: { label: string; onClick: () => void };
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });

  // Toast feedback state
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((prev) => (prev === msg ? null : prev));
    }, 4000);
  }, []);

  // Calculate current active month: default to current real-world month (YYYY-MM)
  const [currentMonth, setCurrentMonth] = useState<string>(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  // Firebase Auth (Single Source of Truth via AuthContext) and Cloud Sync state
  const {
    user: currentUser,
    loading: isAuthLoading,
    setSyncStatus,
    signInWithGoogle,
    logout,
  } = useAuth();
  const prevUserUidRef = useRef<string | null>(null);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [isCloudDataReady, setIsCloudDataReady] = useState<boolean>(false);

  // Phase 3: Offline & Network Detection state (Task 4 & Task 6)
  const [isOnline, setIsOnline] = useState<boolean>(() =>
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [syncStats, setSyncStats] = useState<SyncStats>({
    pendingCount: 0,
    conflictCount: 0,
    failedCount: 0,
    isProcessing: false,
  });
  const [conflicts, setConflicts] = useState<SyncOperation[]>([]);
  const [isConflictModalOpen, setIsConflictModalOpen] = useState<boolean>(false);

  // Task 6: Compute discrete sync state
  const syncState = useMemo<SyncState>(() => {
    if (!isOnline) return 'pending';
    if (syncStats.isProcessing || isSyncing) return 'syncing';
    if (syncStats.conflictCount > 0) return 'conflict';
    if (syncStats.failedCount > 0) return 'failed';
    if (syncStats.pendingCount > 0) return 'pending';
    // Must never show synced before cloud confirms (Task 1 & Task 6)
    if (currentUser && isCloudDataReady) return 'synced';
    return 'pending';
  }, [isOnline, syncStats, isSyncing, currentUser, isCloudDataReady]);

  // Helper: Detect whether local state contains customized user data or untouched demo data
  const checkIfRealUserData = useCallback(
    (currentCards: CreditCard[], currentTxs: Transaction[]): boolean => {
      // If system is empty, it is a clean production slate, not custom data to migrate
      if (currentCards.length === 0 && currentTxs.length === 0) {
        return false;
      }

      const demoCardIds = new Set(['card-1', 'card-2', 'card-3']);
      const hasCustomCards = currentCards.some((c) => !demoCardIds.has(c.id));
      if (hasCustomCards || currentCards.length !== INITIAL_DEMO_CARDS.length) {
        return true;
      }

      // Check if demo card attributes were customized
      const isCardModified = currentCards.some((c) => {
        const initial = INITIAL_DEMO_CARDS.find((d) => d.id === c.id);
        if (!initial) return true;
        return (
          c.name !== initial.name ||
          c.last4 !== initial.last4 ||
          c.creditLimit !== initial.creditLimit ||
          c.billingCutoffDay !== initial.billingCutoffDay ||
          c.paymentDueDay !== initial.paymentDueDay
        );
      });
      if (isCardModified) return true;

      // Check if transactions are custom (not part of initial demo transactions)
      const hasCustomTxs = currentTxs.some(
        (t) =>
          !t.id.startsWith('tx-1') &&
          !t.id.startsWith('tx-2') &&
          !t.id.startsWith('tx-3') &&
          !t.id.startsWith('tx-2025')
      );
      if (hasCustomTxs) return true;

      return false;
    },
    []
  );

  // 1. React to authenticated user changes (pre-populate scoped cache on login; clean UI on explicit logout)
  useEffect(() => {
    if (currentUser) {
      prevUserUidRef.current = currentUser.uid;
      // Pre-populate cards and transactions from scoped LocalStorage if state is currently empty
      try {
        const scopedCardsKey = `${STORAGE_KEY_CARDS}_${currentUser.uid}`;
        const cachedCards = localStorage.getItem(scopedCardsKey);
        if (cachedCards) {
          const parsed = JSON.parse(cachedCards);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setCards((prev) => (prev.length === 0 ? parsed : prev));
          }
        }
        const cachedTxs = localStorage.getItem(`${STORAGE_KEY_TXS}_${currentUser.uid}`);
        if (cachedTxs) {
          const parsedTxs = JSON.parse(cachedTxs);
          if (Array.isArray(parsedTxs) && parsedTxs.length > 0) {
            setTransactions((prev) => (prev.length === 0 ? parsedTxs : prev));
          }
        }
      } catch {}
    } else if (prevUserUidRef.current !== null) {
      // Transitioned from signed-in -> signed-out: reset in-memory UI state cleanly
      // Scoped LocalStorage caches and cardpulse_sync_queue_{uid} remain intact!
      prevUserUidRef.current = null;
      setIsCloudDataReady(false);
      setCards([]);
      setTransactions([]);
      setBrandName('CardPulse');
      setBrandLogo(null);
      setBrandTagline('ระบบติดตามและจัดการค่าบัตรเครดิต');
      setBgImage(null);
      setBgOpacity(0.7);
      setBgBlur(4);
      setBgPosition(null);
      setSelectedCardId(null);
      try {
        localStorage.removeItem(STORAGE_KEY_CARDS);
        localStorage.removeItem(STORAGE_KEY_TXS);
      } catch {}
    }
  }, [currentUser]);

  // 2. Bridge Jodna syncState & network state into AuthContext.syncStatus for UserAuthButton
  useEffect(() => {
    if (!currentUser) {
      setSyncStatus(isOnline ? 'local' : 'offline');
      return;
    }
    if (!isOnline) {
      setSyncStatus('offline');
    } else if (syncState === 'syncing') {
      setSyncStatus('saving');
    } else if (syncState === 'failed' || syncState === 'conflict') {
      setSyncStatus('error');
    } else if (syncState === 'synced') {
      setSyncStatus('synced');
    } else {
      setSyncStatus('saving');
    }
  }, [currentUser, isOnline, syncState, setSyncStatus]);

  // Task 4: Network Status & Automatic Sync on Reconnection
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      showToast('สัญญาณอินเทอร์เน็ตกลับมาแล้ว กำลังตรวจสอบและซิงก์ข้อมูลคลาวด์...');
      if (currentUser) {
        processSyncQueue(currentUser.uid, {
          onConflict: () => {
            setIsConflictModalOpen(true);
            showToast('ตรวจพบข้อมูลขัดแย้งกับคลาวด์ โปรดตรวจสอบ');
          },
        });
      }
    };
    const handleOffline = () => {
      setIsOnline(false);
      showToast('คุณอยู่ในโหมดออฟไลน์ ข้อมูลที่บันทึกจะถูกเก็บในเครื่องและซิงก์อัตโนมัติเมื่อออนไลน์');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    const handleQuotaExceeded = () => {
      showToast('⚠️ พื้นที่จัดเก็บข้อมูลบนอุปกรณ์เต็ม ข้อมูลยังปลอดภัยในหน่วยความจำแต่ไม่สามารถบันทึกลงแคชได้');
    };
    window.addEventListener('cardpulse:storage_quota_exceeded', handleQuotaExceeded);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('cardpulse:storage_quota_exceeded', handleQuotaExceeded);
    };
  }, [currentUser, showToast]);

  // Task 2: Subscribe to per-UID Offline Sync Queue
  useEffect(() => {
    if (!currentUser) {
      setSyncStats({ pendingCount: 0, conflictCount: 0, failedCount: 0, isProcessing: false });
      setConflicts([]);
      return;
    }

    const unsub = subscribeSyncQueue(currentUser.uid, (ops, stats) => {
      setSyncStats(stats);
      setConflicts(ops.filter((o) => o.status === 'conflict'));
    });

    return () => unsub();
  }, [currentUser]);

  // Manual trigger for sync
  const handleTriggerSync = useCallback(async () => {
    if (!currentUser) {
      showToast('กรุณาเข้าสู่ระบบเพื่อเชื่อมต่อคลาวด์');
      return;
    }
    if (!isOnline) {
      showToast('อุปกรณ์ยังออฟไลน์อยู่ ระบบจะซิงก์อัตโนมัติเมื่อเชื่อมต่ออินเทอร์เน็ต');
      return;
    }
    showToast('กำลังซิงก์ข้อมูลขึ้น Cloud Firestore...');
    const res = await processSyncQueue(currentUser.uid, {
      onConflict: () => {
        setIsConflictModalOpen(true);
      },
    });
    if (res.conflicts > 0) {
      setIsConflictModalOpen(true);
      showToast(`ตรวจพบข้อมูลขัดแย้ง ${res.conflicts} รายการ โปรดเลือกเวอร์ชันที่ต้องการเก็บไว้`);
    } else if (res.failed > 0) {
      showToast(`ซิงก์ไม่สำเร็จ ${res.failed} รายการ จะลองใหม่อัตโนมัติ`);
    } else if (res.succeeded > 0) {
      showToast(`ซิงก์ข้อมูลขึ้นคลาวด์สำเร็จแล้ว (${res.succeeded} รายการ)`);
    } else {
      showToast('ข้อมูลทั้งหมดบนเครื่องตรงกับคลาวด์แล้ว');
    }
  }, [currentUser, isOnline, showToast]);

  // Task 3: Resolve Conflict handler
  const handleResolveConflict = async (opId: string, resolution: 'keep_local' | 'keep_server') => {
    if (!currentUser) return;
    try {
      await resolveConflict(currentUser.uid, opId, resolution);
      showToast(
        resolution === 'keep_local'
          ? 'เลือกใช้ข้อมูลบนเครื่องและเขียนทับคลาวด์เรียบร้อยแล้ว'
          : 'เลือกใช้ข้อมูลบนคลาวด์และยกเลิกการแก้ไขบนเครื่องแล้ว'
      );
      if (conflicts.length <= 1) {
        setIsConflictModalOpen(false);
      }
    } catch (err: any) {
      showToast(err.message || 'เกิดข้อผิดพลาดในการแก้ปัญหาข้อขัดแย้ง');
    }
  };

  // Sync with Firestore when user is authenticated (Tasks 1, 2, 3)
  useEffect(() => {
    if (!currentUser) {
      setIsCloudDataReady(false);
      setIsSyncing(false);
      return;
    }

    let isMounted = true;
    setIsSyncing(true);
    setIsCloudDataReady(false);

    let unsubCards: (() => void) | null = null;
    let unsubTxs: (() => void) | null = null;
    let unsubProfile: (() => void) | null = null;

    const setupSync = async () => {
      try {
        // Task 1: Check and perform Initial Migration BEFORE starting real-time sync
        try {
          const isReal = checkIfRealUserData(cards, transactions);
          const migrationResult = await checkAndMigrateUserData(
            currentUser.uid,
            cards,
            transactions,
            { brandName, brandLogo, brandTagline, bgImage, bgOpacity, bgBlur, bgPosition },
            isReal
          );

          if (!isMounted) return;

          if (migrationResult.status === 'migrated_real_data') {
            showToast(`นำเข้าข้อมูลจากเครื่องของคุณขึ้นสู่คลาวด์เรียบร้อยแล้ว (${migrationResult.cloudCardCount} บัตร)`);
          }
        } catch (migErr) {
          console.warn('[CardPulse Sync] Non-fatal initial migration check notice:', migErr);
        }

        let cardsReceived = false;
        let txsReceived = false;
        let profileReceived = false;
        let latestCardsCount = 0;
        let latestTxsCount = 0;
        let loggedDataLoaded = false;

        const checkAllReady = () => {
          if (cardsReceived && txsReceived && profileReceived && isMounted) {
            setIsCloudDataReady(true);
            setIsSyncing(false);
            if (!loggedDataLoaded) {
              loggedDataLoaded = true;
              logAuthDiagnostic('Firestore User Data Loaded', {
                uid: currentUser.uid,
                cardCount: latestCardsCount,
                txCount: latestTxsCount,
              });
            }
          }
        };

        // Task 2: Subscribe to Cards with Empty Array support and offline queue preservation
        unsubCards = subscribeUserCards(currentUser.uid, (cloudCards) => {
          if (!isMounted) return;
          latestCardsCount = cloudCards.length;
          const pendingOps = loadSyncQueue(currentUser.uid).filter(
            (op) =>
              (op.status === 'pending' || op.status === 'in_progress') &&
              op.entityType === 'card'
          );
          if (pendingOps.length > 0) {
            const pendingMap = new Map(pendingOps.map((o) => [o.documentId, o]));
            const merged = cloudCards
              .filter((c) => {
                const op = pendingMap.get(c.id);
                return !(op && op.operationType === 'delete');
              })
              .map((c) => {
                const op = pendingMap.get(c.id);
                if (op && (op.operationType === 'update' || op.operationType === 'create')) {
                  return { ...c, ...op.payload };
                }
                return c;
              });
            pendingOps.forEach((op) => {
              if (
                op.operationType === 'create' &&
                op.payload &&
                !merged.some((m) => m.id === op.documentId)
              ) {
                merged.push(op.payload);
              }
            });
            setCards(merged);
          } else {
            setCards(cloudCards);
          }
          cardsReceived = true;
          checkAllReady();
        });

        // Task 2: Subscribe to Transactions with Empty Array support and offline queue preservation
        unsubTxs = subscribeUserTransactions(currentUser.uid, (cloudTxs) => {
          if (!isMounted) return;
          latestTxsCount = cloudTxs.length;
          const pendingOps = loadSyncQueue(currentUser.uid).filter(
            (op) =>
              (op.status === 'pending' || op.status === 'in_progress') &&
              op.entityType === 'transaction'
          );
          if (pendingOps.length > 0) {
            const pendingMap = new Map(pendingOps.map((o) => [o.documentId, o]));
            const merged = cloudTxs
              .filter((tx) => {
                const op = pendingMap.get(tx.id);
                return !(op && op.operationType === 'delete');
              })
              .map((tx) => {
                const op = pendingMap.get(tx.id);
                if (op && (op.operationType === 'update' || op.operationType === 'create')) {
                  return { ...tx, ...op.payload };
                }
                return tx;
              });
            pendingOps.forEach((op) => {
              if (
                op.operationType === 'create' &&
                op.payload &&
                !merged.some((m) => m.id === op.documentId)
              ) {
                merged.unshift(op.payload);
              }
            });
            setTransactions(merged);
          } else {
            setTransactions(cloudTxs);
          }
          txsReceived = true;
          checkAllReady();
        });

        // Task 3: Subscribe to User Profile
        unsubProfile = subscribeUserProfile(currentUser.uid, (profile) => {
          if (!isMounted) return;
          if (profile) {
            if (profile.brandName) setBrandName(profile.brandName);
            if (profile.brandLogo !== undefined) setBrandLogo(profile.brandLogo);
            if (profile.brandTagline) setBrandTagline(profile.brandTagline);
            if (profile.bgImage !== undefined) setBgImage(profile.bgImage);
            if (profile.bgOpacity !== undefined) setBgOpacity(profile.bgOpacity);
            if (profile.bgBlur !== undefined) setBgBlur(profile.bgBlur);
            if (profile.bgPosition) setBgPosition(profile.bgPosition);
          }
          profileReceived = true;
          checkAllReady();
        });
      } catch (err) {
        console.error('Error during initial cloud setup:', err);
        if (isMounted) {
          setIsSyncing(false);
          showToast('เกิดข้อผิดพลาดในการเชื่อมต่อคลาวด์ กำลังทำงานในโหมดออฟไลน์');
        }
      }
    };

    setupSync();

    return () => {
      isMounted = false;
      if (unsubCards) unsubCards();
      if (unsubTxs) unsubTxs();
      if (unsubProfile) unsubProfile();
    };
  }, [currentUser]);

  // Auth Handlers delegating directly to AuthContext (JodnaOT reference flow)
  const handleLogin = async () => {
    try {
      await signInWithGoogle('auto');
    } catch (err: any) {
      if (err?.message) {
        showToast(err.message);
      }
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      showToast('ออกจากระบบเรียบร้อยแล้ว');
    } catch (err: any) {
      showToast(err?.message || 'เกิดข้อผิดพลาดในการออกจากระบบ');
    }
  };

  // Task 3 & 4: Save to localStorage safely - prevent transient empty state from overwriting local storage!
  useEffect(() => {
    if (currentUser && !isCloudDataReady) return;
    const scopedKey = currentUser ? `${STORAGE_KEY_CARDS}_${currentUser.uid}` : STORAGE_KEY_CARDS;
    localStorage.setItem(scopedKey, JSON.stringify(cards));
    localStorage.setItem(STORAGE_KEY_CARDS, JSON.stringify(cards));
  }, [cards, currentUser, isCloudDataReady]);

  useEffect(() => {
    if (currentUser && !isCloudDataReady) return;
    const scopedKey = currentUser ? `${STORAGE_KEY_TXS}_${currentUser.uid}` : STORAGE_KEY_TXS;
    localStorage.setItem(scopedKey, JSON.stringify(transactions));
    localStorage.setItem(STORAGE_KEY_TXS, JSON.stringify(transactions));
  }, [transactions, currentUser, isCloudDataReady]);

  // Handle saving background settings
  const handleSaveBackground = (
    newBg: string | null,
    newOpacity: number,
    newBlur: number,
    newPosition?: BackgroundPosition | null
  ) => {
    setBgImage(newBg);
    setBgOpacity(newOpacity);
    setBgBlur(newBlur);
    setBgPosition(newPosition || null);

    if (newBg) {
      localStorage.setItem(STORAGE_KEY_BG_IMAGE, newBg);
    } else {
      localStorage.removeItem(STORAGE_KEY_BG_IMAGE);
    }
    localStorage.setItem(STORAGE_KEY_BG_OPACITY, String(newOpacity));
    localStorage.setItem(STORAGE_KEY_BG_BLUR, String(newBlur));
    if (newPosition) {
      localStorage.setItem(STORAGE_KEY_BG_POSITION, JSON.stringify(newPosition));
    } else {
      localStorage.removeItem(STORAGE_KEY_BG_POSITION);
    }

    const bgPayload = {
      bgImage: newBg,
      bgOpacity: newOpacity,
      bgBlur: newBlur,
      bgPosition: newPosition,
    };

    if (currentUser) {
      if (isOnline && isCloudDataReady) {
        saveUserProfileToFirestore(currentUser.uid, bgPayload).catch(() => {
          enqueueOperation(currentUser.uid, {
            entityType: 'profile',
            documentId: 'profile',
            operationType: 'update',
            payload: bgPayload,
          });
        });
      } else {
        enqueueOperation(currentUser.uid, {
          entityType: 'profile',
          documentId: 'profile',
          operationType: 'update',
          payload: bgPayload,
        });
      }
    }

    showToast(newBg ? 'บันทึกภาพพื้นหลังเรียบร้อยแล้ว' : 'รีเซ็ตภาพพื้นหลังเป็นค่าเริ่มต้นแล้ว');
  };

  // Handle saving brand name, logo, and tagline
  const handleSaveBrand = (
    newName: string,
    newLogo: string | null,
    newTagline: string
  ) => {
    setBrandName(newName);
    setBrandLogo(newLogo);
    setBrandTagline(newTagline);

    localStorage.setItem(STORAGE_KEY_BRAND_NAME, newName);
    if (newLogo) {
      localStorage.setItem(STORAGE_KEY_BRAND_LOGO, newLogo);
    } else {
      localStorage.removeItem(STORAGE_KEY_BRAND_LOGO);
    }
    localStorage.setItem(STORAGE_KEY_BRAND_TAGLINE, newTagline);

    const brandPayload = {
      brandName: newName,
      brandLogo: newLogo,
      brandTagline: newTagline,
    };

    if (currentUser) {
      if (isOnline && isCloudDataReady) {
        saveUserProfileToFirestore(currentUser.uid, brandPayload).catch(() => {
          enqueueOperation(currentUser.uid, {
            entityType: 'profile',
            documentId: 'profile',
            operationType: 'update',
            payload: brandPayload,
          });
        });
      } else {
        enqueueOperation(currentUser.uid, {
          entityType: 'profile',
          documentId: 'profile',
          operationType: 'update',
          payload: brandPayload,
        });
      }
    }

    showToast('บันทึกการตั้งค่าชื่อแบรนด์และโลโก้เรียบร้อยแล้ว');
  };

  // Derive available months from transactions + cards
  const availableMonths = useMemo(() => {
    const months = new Set<string>();
    const now = new Date();
    const thisMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    months.add(thisMonthStr);

    transactions.forEach((tx) => {
      const m = getTransactionBillingCycleMonth(tx, cards);
      months.add(m);
    });

    return Array.from(months).sort().reverse();
  }, [transactions, cards]);

  // Past and current months for Historical Analytics Dashboard (Task 1: Strictly excludes future cycles)
  const historicalPastMonths = useMemo(() => {
    const now = new Date();
    const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    return availableMonths.filter((m) => m <= currentMonthStr);
  }, [availableMonths]);

  // Compute due status for each card
  const dueStatuses: CardDueStatus[] = useMemo(() => {
    return cards.map((card) => calculateCardDueStatus(card, transactions, new Date()));
  }, [cards, transactions]);

  // Urgent cards count (includes cards with urgent due dates + 3-day cutoff alerts)
  const urgentDueCount = useMemo(() => {
    const dueCount = dueStatuses.filter(
      (s) => !s.isPaid && (s.severity === 'overdue' || s.severity === 'critical')
    ).length;
    const cutoffCount = cards.filter(
      (c) => calculateCardCutoffAlertStatus(c).isNearCutoff
    ).length;
    return dueCount + cutoffCount;
  }, [dueStatuses, cards]);

  // Compute monthly stats for current selected month (calculated from each card's cutoff cycle)
  const monthlyStats: MonthlyStats = useMemo(() => {
    return calculateMonthlyStats(transactions, currentMonth, cards);
  }, [transactions, currentMonth, cards]);

  // Active installment stats for current month
  const activeInstallments = useMemo(() => {
    return transactions.filter(
      (t) =>
        t.isInstallment &&
        (getTransactionBillingCycleMonth(t, cards) === currentMonth ||
          t.billingCycleMonth === currentMonth)
    );
  }, [transactions, cards, currentMonth]);

  const installmentCount = activeInstallments.length;
  const totalInstallmentMonthly = activeInstallments.reduce(
    (sum, t) => sum + (t.monthlyInstallmentAmount || t.amount),
    0
  );

  // Add / Edit Transaction
  const handleSaveTransaction = (
    txData: Omit<Transaction, 'id' | 'createdAt'> & { id?: string; installmentGroupId?: string },
    options?: { autoGenerateRemaining?: boolean; updateEntireSeries?: boolean }
  ) => {
    let updatedTxs: Transaction[];
    if (txData.id) {
      // Edit
      if (txData.isInstallment && options?.updateEntireSeries && txData.installmentGroupId) {
        // Update all transactions in this installment plan
        updatedTxs = transactions.map((t) => {
          if (t.installmentGroupId === txData.installmentGroupId) {
            const updatedItem: Transaction = {
              ...t,
              title: txData.title,
              cardId: txData.cardId,
              category: txData.category,
              tags: txData.tags,
              amount: txData.amount,
              totalInstallments: txData.totalInstallments,
              monthlyInstallmentAmount: txData.monthlyInstallmentAmount,
            };
            syncOrQueueTransaction(updatedItem, 'update');
            return updatedItem;
          }
          return t.id === txData.id ? { ...t, ...txData } : t;
        });
        showToast('อัปเดตข้อมูลแผนผ่อนชำระทุกงวดเรียบร้อยแล้ว');
      } else {
        updatedTxs = transactions.map((t) => {
          if (t.id === txData.id) {
            const updatedItem: Transaction = { ...t, ...txData };
            syncOrQueueTransaction(updatedItem, 'update');
            return updatedItem;
          }
          return t;
        });
        showToast('แก้ไขข้อมูลรายการใช้จ่ายเรียบร้อยแล้ว');
      }
    } else {
      // New Transaction
      if (txData.isInstallment && options?.autoGenerateRemaining) {
        const fullSeries = generateInstallmentSeries(txData, true);
        updatedTxs = [...transactions, ...fullSeries];
        fullSeries.forEach((item) => {
          syncOrQueueTransaction(item, 'create');
        });
        showToast(
          `บันทึกรายการผ่อนชำระและสร้างครบ ${fullSeries.length} งวดล่วงหน้าเรียบร้อยแล้ว`
        );
      } else {
        const newTx: Transaction = {
          ...txData,
          id: 'tx-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7),
          createdAt: new Date().toISOString(),
          version: 1,
        };
        updatedTxs = [newTx, ...transactions];
        syncOrQueueTransaction(newTx, 'create');
        showToast('บันทึกรายการใช้จ่ายใหม่เรียบร้อยแล้ว');
      }
    }

    setTransactions(updatedTxs);
  };

  // Helpers for Offline Sync Queue of Transactions (Phase 3 Tasks 1, 2, 3)
  const syncOrQueueTransaction = useCallback(
    (tx: Transaction, opType: 'create' | 'update') => {
      if (!currentUser) return;
      if (isOnline && isCloudDataReady) {
        saveUserTransactionToFirestore(
          currentUser.uid,
          tx,
          opType === 'update' ? tx.version : undefined
        ).catch((err: any) => {
          if (err?.code === 'DATA_CONFLICT') {
            enqueueOperation(currentUser.uid, {
              entityType: 'transaction',
              documentId: tx.id,
              operationType: opType,
              payload: tx,
              baseVersion: tx.version || 1,
            });
            setIsConflictModalOpen(true);
            showToast(`ตรวจพบข้อมูลรายการ "${tx.title}" ขัดแย้งกับคลาวด์`);
          } else {
            enqueueOperation(currentUser.uid, {
              entityType: 'transaction',
              documentId: tx.id,
              operationType: opType,
              payload: tx,
              baseVersion: tx.version || 1,
            });
          }
        });
      } else {
        enqueueOperation(currentUser.uid, {
          entityType: 'transaction',
          documentId: tx.id,
          operationType: opType,
          payload: tx,
          baseVersion: tx.version || 1,
        });
      }
    },
    [currentUser, isOnline, isCloudDataReady, showToast]
  );

  const deleteOrQueueTransaction = useCallback(
    (txId: string) => {
      if (!currentUser) return;
      if (isOnline && isCloudDataReady) {
        deleteUserTransactionFromFirestore(currentUser.uid, txId).catch(() => {
          enqueueOperation(currentUser.uid, {
            entityType: 'transaction',
            documentId: txId,
            operationType: 'delete',
            payload: null,
          });
        });
      } else {
        enqueueOperation(currentUser.uid, {
          entityType: 'transaction',
          documentId: txId,
          operationType: 'delete',
          payload: null,
        });
      }
    },
    [currentUser, isOnline, isCloudDataReady]
  );

  // Toggle Transaction Paid status
  const handleTogglePaid = (txId: string) => {
    const updated = transactions.map((t) => {
      if (t.id === txId) {
        const item = { ...t, isPaid: !t.isPaid };
        syncOrQueueTransaction(item, 'update');
        return item;
      }
      return t;
    });
    setTransactions(updated);
  };

  // Mark all transactions of a card in a cycle as paid
  const handleMarkCardPaid = (cardId: string, cycleMonth: string) => {
    const card = cards.find((c) => c.id === cardId);
    const todayStr = new Date().toISOString().split('T')[0];
    const updated = transactions.map((t) => {
      const txCycle = getTransactionBillingCycleMonth(t, cards);
      if (t.cardId === cardId && (txCycle === cycleMonth || t.billingCycleMonth === cycleMonth)) {
        const item = { ...t, isPaid: true, paidDate: todayStr };
        syncOrQueueTransaction(item, 'update');
        return item;
      }
      return t;
    });

    setTransactions(updated);
    showToast(`บันทึกชำระยอดรอบบิล ${formatThaiMonth(cycleMonth)} ของ ${card?.name || 'บัตร'} เรียบร้อยแล้ว`);
  };

  // Unmark all transactions of a card in a cycle
  const handleUnmarkCardPaid = (cardId: string, cycleMonth: string) => {
    const card = cards.find((c) => c.id === cardId);
    const updated = transactions.map((t) => {
      const txCycle = getTransactionBillingCycleMonth(t, cards);
      if (t.cardId === cardId && (txCycle === cycleMonth || t.billingCycleMonth === cycleMonth)) {
        const item = { ...t, isPaid: false, paidDate: undefined };
        syncOrQueueTransaction(item, 'update');
        return item;
      }
      return t;
    });

    setTransactions(updated);
    showToast(`ยกเลิกสถานะชำระรอบบิล ${formatThaiMonth(cycleMonth)} ของ ${card?.name || 'บัตร'} แล้ว`);
  };

  // Mark all transactions across all cards for the entire month as paid
  const handleMarkMonthPaid = (cycleMonth: string) => {
    const todayStr = new Date().toISOString().split('T')[0];
    let affectedCount = 0;
    const updated = transactions.map((t) => {
      const txCycle = getTransactionBillingCycleMonth(t, cards);
      if ((txCycle === cycleMonth || t.billingCycleMonth === cycleMonth) && !isFutureInstallmentHidden(t, cards)) {
        if (!t.isPaid) affectedCount++;
        const item = { ...t, isPaid: true, paidDate: todayStr };
        syncOrQueueTransaction(item, 'update');
        return item;
      }
      return t;
    });

    setTransactions(updated);
    showToast(`บันทึกชำระยอดรอบเดือน ${formatThaiMonth(cycleMonth)} ครบทุกบัตรเรียบร้อยแล้ว (${affectedCount} รายการ)`);
  };

  // Unmark all transactions for the entire month
  const handleUnmarkMonthPaid = (cycleMonth: string) => {
    const updated = transactions.map((t) => {
      const txCycle = getTransactionBillingCycleMonth(t, cards);
      if (txCycle === cycleMonth || t.billingCycleMonth === cycleMonth) {
        const item = { ...t, isPaid: false, paidDate: undefined };
        syncOrQueueTransaction(item, 'update');
        return item;
      }
      return t;
    });

    setTransactions(updated);
    showToast(`ยกเลิกสถานะชำระรอบเดือน ${formatThaiMonth(cycleMonth)} ทุกรายการแล้ว`);
  };

  // Delete Transaction with Confirmation Modal
  const handleDeleteTransaction = (tx: Transaction) => {
    const isPlan = tx.isInstallment && Boolean(tx.installmentGroupId);
    const planGroup = isPlan
      ? transactions.filter((t) => t.installmentGroupId === tx.installmentGroupId)
      : [];
    const groupCount = planGroup.length;

    setConfirmDialog({
      isOpen: true,
      title: isPlan ? 'ยืนยันการลบรายการผ่อนชำระ' : 'ยืนยันการลบรายการใช้จ่าย',
      message: isPlan
        ? `คุณต้องการลบรายการผ่อนชำระ "${tx.title}" (งวดที่ ${tx.currentInstallment || 1}/${tx.totalInstallments || 1}) ใช่หรือไม่? แผนนี้มีทั้งหมด ${groupCount} งวดในระบบ`
        : `คุณต้องการลบรายการ "${tx.title}" ยอดเงิน ${formatThaiCurrency(tx.amount)} ใช่หรือไม่?`,
      detail: isPlan
        ? `สามารถเลือกลบเฉพาะงวดนี้ หรือลบทุกงวดในแผนผ่อนชำระนี้ออกจากระบบได้`
        : `รายการนี้จะถูกลบออกจากระบบอย่างถาวร`,
      confirmLabel: isPlan && groupCount > 1 ? `ลบทุกงวดในแผน (${groupCount} งวด)` : 'ลบรายการนี้',
      secondaryAction:
        isPlan && groupCount > 1
          ? {
              label: `ลบเฉพาะงวดนี้ (งวด ${tx.currentInstallment || 1})`,
              onClick: () => {
                const updated = transactions.filter((t) => t.id !== tx.id);
                setTransactions(updated);
                deleteOrQueueTransaction(tx.id);
                showToast(`ลบเฉพาะงวดที่ ${tx.currentInstallment || 1} เรียบร้อยแล้ว`);
                setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
              },
            }
          : undefined,
      onConfirm: () => {
        const updated =
          isPlan && groupCount > 1
            ? transactions.filter((t) => t.installmentGroupId !== tx.installmentGroupId)
            : transactions.filter((t) => t.id !== tx.id);
        setTransactions(updated);
        if (isPlan && groupCount > 1) {
          planGroup.forEach((p) => {
            deleteOrQueueTransaction(p.id);
          });
        } else {
          deleteOrQueueTransaction(tx.id);
        }
        showToast(
          isPlan && groupCount > 1
            ? `ลบแผนผ่อนชำระครบทั้ง ${groupCount} งวดเรียบร้อยแล้ว`
            : 'ลบรายการใช้จ่ายเรียบร้อยแล้ว'
        );
        setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
      },
    });
  };

  // Task 2: Update individual installment schedule item
  const handleUpdateInstallment = (updatedTx: Transaction) => {
    setTransactions((prev) => {
      const next = prev.map((t) => (t.id === updatedTx.id ? updatedTx : t));
      syncOrQueueTransaction(updatedTx, 'update');
      return next;
    });
    showToast(
      `อัปเดตงวดที่ ${updatedTx.currentInstallment || 1} เป็นรอบ ${formatThaiMonth(
        updatedTx.billingCycleMonth
      )} เรียบร้อยแล้ว`
    );
  };

  // Task 2 & 3: Update multiple installment schedule items in the same plan with cascading shift
  const handleUpdateInstallments = async (updatedTxs: Transaction[]) => {
    if (updatedTxs.length === 0) return;

    // 1. Update React state immediately
    const updatedMap = new Map(updatedTxs.map((tx) => [tx.id, tx]));
    setTransactions((prev) => prev.map((t) => updatedMap.get(t.id) || t));

    // 2. Synchronize to Firestore or Offline Queue
    if (currentUser) {
      if (isOnline && isCloudDataReady) {
        try {
          await saveBatchTransactionsToFirestore(currentUser.uid, updatedTxs);
        } catch (err: any) {
          if (err?.code === 'DATA_CONFLICT') {
            console.warn('Batch firestore save encountered OCC DATA_CONFLICT:', err);
            updatedTxs.forEach((tx) => {
              enqueueOperation(currentUser.uid, {
                entityType: 'transaction',
                documentId: tx.id,
                operationType: 'update',
                payload: tx,
                baseVersion: tx.version || 1,
              });
            });
            const queue = loadSyncQueue(currentUser.uid);
            const targetOp = queue.find(
              (q) => q.documentId === (err.conflictingTxId || updatedTxs[0].id)
            );
            if (targetOp) {
              targetOp.status = 'conflict';
              targetOp.conflictServerData = err.serverData;
              targetOp.lastError = err.message;
              saveSyncQueue(currentUser.uid, queue);
            }
            setIsConflictModalOpen(true);
            showToast('ตรวจพบข้อมูลแผนผ่อนชำระขัดแย้งกับคลาวด์ โปรดตรวจสอบ');
            return;
          }

          console.warn('Batch firestore save failed, enqueuing to offline sync queue:', err);
          updatedTxs.forEach((tx) => {
            enqueueOperation(currentUser.uid, {
              entityType: 'transaction',
              documentId: tx.id,
              operationType: 'update',
              payload: tx,
              baseVersion: tx.version || 1,
            });
          });
          showToast('บันทึกในเครื่องแล้ว และเพิ่มลงคิวรอซิงก์');
          return;
        }
      } else {
        // Offline
        updatedTxs.forEach((tx) => {
          enqueueOperation(currentUser.uid, {
            entityType: 'transaction',
            documentId: tx.id,
            operationType: 'update',
            payload: tx,
            baseVersion: tx.version || 1,
          });
        });
      }
    }

    const firstItem = updatedTxs[0];
    showToast(
      updatedTxs.length > 1
        ? `อัปเดตและปรับรอบบิลผ่อนชำระต่อเนื่อง ${updatedTxs.length} งวดเรียบร้อยแล้ว`
        : `อัปเดตงวดที่ ${firstItem.currentInstallment || 1} เป็นรอบ ${formatThaiMonth(
            firstItem.billingCycleMonth
          )} เรียบร้อยแล้ว`
    );
  };

  // Add / Edit Card (Conforming to Phase 3 Tasks 1, 2, 3)
  const handleSaveCard = (cardData: Omit<CreditCard, 'id'> & { id?: string }) => {
    let updatedCards: CreditCard[];
    let targetCard: CreditCard;
    const isEditing = Boolean(cardData.id);

    if (isEditing) {
      // Edit
      targetCard = { ...cardData } as CreditCard;
      updatedCards = cards.map((c) =>
        c.id === cardData.id ? ({ ...c, ...cardData } as CreditCard) : c
      );
      showToast('แก้ไขข้อมูลบัตรเครดิตเรียบร้อยแล้ว');
    } else {
      // New
      targetCard = {
        ...cardData,
        id: 'card-' + Date.now(),
        orderIndex: cards.length,
        version: 1,
      };
      updatedCards = [...cards, targetCard];
      showToast('เพิ่มบัตรเครดิตใหม่เรียบร้อยแล้ว');
    }

    setCards(updatedCards);

    // Save to Firestore or Sync Queue
    if (currentUser) {
      if (isOnline && isCloudDataReady) {
        saveUserCardToFirestore(
          currentUser.uid,
          targetCard,
          isEditing ? targetCard.version : undefined
        ).catch((err: any) => {
          if (err?.code === 'DATA_CONFLICT') {
            enqueueOperation(currentUser.uid, {
              entityType: 'card',
              documentId: targetCard.id,
              operationType: isEditing ? 'update' : 'create',
              payload: targetCard,
              baseVersion: targetCard.version || 1,
            });
            setIsConflictModalOpen(true);
            showToast('ตรวจพบข้อมูลบัตรขัดแย้งกับคลาวด์ โปรดตรวจสอบ');
          } else {
            // Network failure or offline -> enqueue operation
            enqueueOperation(currentUser.uid, {
              entityType: 'card',
              documentId: targetCard.id,
              operationType: isEditing ? 'update' : 'create',
              payload: targetCard,
              baseVersion: targetCard.version || 1,
            });
            showToast('บันทึกในเครื่องแล้ว และเพิ่มลงคิวรอซิงก์');
          }
        });
      } else {
        // Device is offline or cloud not ready
        enqueueOperation(currentUser.uid, {
          entityType: 'card',
          documentId: targetCard.id,
          operationType: isEditing ? 'update' : 'create',
          payload: targetCard,
          baseVersion: targetCard.version || 1,
        });
        showToast('บันทึกในเครื่องเรียบร้อยแล้ว (จะซิงก์อัตโนมัติเมื่อออนไลน์)');
      }
    }
  };

  // Delete Card with Confirmation Modal (Phase 3 Offline Sync Queue)
  const handleDeleteCard = (card: CreditCard) => {
    const txCount = transactions.filter((t) => t.cardId === card.id).length;
    setConfirmDialog({
      isOpen: true,
      title: 'ยืนยันการลบบัตรเครดิต',
      message: `คุณต้องการลบบัตร "${card.name} (•••• ${card.last4})"${
        txCount > 0 ? ` พร้อมรายการใช้จ่ายที่ผูกอยู่ ${txCount} รายการ` : ''
      } ใช่หรือไม่?`,
      detail: 'ข้อมูลบัตรนี้และรายการที่เกี่ยวข้องจะถูกลบออกจากระบบ',
      confirmLabel: 'ยืนยันลบบัตร',
      onConfirm: () => {
        const updatedCards = cards.filter((c) => c.id !== card.id);
        const relatedTxs = transactions.filter((t) => t.cardId === card.id);
        const updatedTxs = transactions.filter((t) => t.cardId !== card.id);
        setCards(updatedCards);
        setTransactions(updatedTxs);
        if (selectedCardId === card.id) setSelectedCardId(null);

        if (currentUser) {
          if (isOnline && isCloudDataReady) {
            deleteUserCardFromFirestore(currentUser.uid, card.id).catch(() => {
              enqueueOperation(currentUser.uid, {
                entityType: 'card',
                documentId: card.id,
                operationType: 'delete',
                payload: null,
              });
            });
            relatedTxs.forEach((t) => {
              deleteUserTransactionFromFirestore(currentUser.uid, t.id).catch(() => {
                enqueueOperation(currentUser.uid, {
                  entityType: 'transaction',
                  documentId: t.id,
                  operationType: 'delete',
                  payload: null,
                });
              });
            });
          } else {
            // Offline
            enqueueOperation(currentUser.uid, {
              entityType: 'card',
              documentId: card.id,
              operationType: 'delete',
              payload: null,
            });
            relatedTxs.forEach((t) => {
              enqueueOperation(currentUser.uid, {
                entityType: 'transaction',
                documentId: t.id,
                operationType: 'delete',
                payload: null,
              });
            });
          }
        }
        showToast(`ลบบัตร ${card.name} เรียบร้อยแล้ว`);
        setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
      },
    });
  };

  // Task 5: Reorder Cards with Firestore sync
  const handleReorderCards = (newCards: CreditCard[]) => {
    const cardsWithOrder = newCards.map((c, idx) => ({ ...c, orderIndex: idx }));
    setCards(cardsWithOrder);
    localStorage.setItem(STORAGE_KEY_CARDS, JSON.stringify(cardsWithOrder));
    if (currentUser && isCloudDataReady) {
      saveCardOrderToFirestore(currentUser.uid, cardsWithOrder).catch((err) => {
        console.error('Failed to sync card order to Firestore:', err);
      });
    }
    showToast('จัดลำดับบัตรเครดิตเรียบร้อยแล้ว');
  };

  // Production Clean Start Handler (Purges test/demo data on Cloud and Local for clean start)
  const handleCleanStart = () => {
    setConfirmDialog({
      isOpen: true,
      title: 'เริ่มต้นใช้งานจริง (Production Clean Start)',
      message: 'คุณต้องการล้างข้อมูลบัตรเครดิต รายการใช้จ่าย และข้อมูลตัวอย่างทั้งหมด เพื่อเริ่มต้นบันทึกข้อมูลจริงตั้งแต่ศูนย์ ใช่หรือไม่?',
      detail: currentUser
        ? `ระบบจะล้างข้อมูลบน Cloud Firestore ของบัญชี (${currentUser.email || currentUser.uid}) และข้อมูลในเครื่องนี้อย่างถาวร`
        : 'ระบบจะล้างข้อมูลแคชและข้อมูลตัวอย่างในเครื่องนี้อย่างถาวร',
      confirmLabel: 'ยืนยันล้างข้อมูลเริ่มใหม่',
      onConfirm: async () => {
        try {
          if (currentUser) {
            showToast('กำลังล้างข้อมูลบน Cloud Firestore...');
            const res = await cleanStartUserCloudData(currentUser.uid);
            clearSyncQueue(currentUser.uid);
            showToast(`ล้างข้อมูลบนคลาวด์สำเร็จ (ลบ ${res.deletedCards} บัตร, ${res.deletedTxs} รายการ)`);
          }

          // Clear local states
          setCards([]);
          setTransactions([]);
          setSelectedCardId(null);

          // Clear local storage
          localStorage.removeItem(STORAGE_KEY_CARDS);
          localStorage.removeItem(STORAGE_KEY_TXS);
          if (currentUser) {
            localStorage.removeItem(`cardpulse_sync_queue_${currentUser.uid}`);
            localStorage.removeItem(`cardpulse_sync_lock_${currentUser.uid}`);
          }
          localStorage.setItem(STORAGE_KEY_PRODUCTION_CLEAN, 'true');

          showToast('CardPulse ว่างพร้อมสำหรับการบันทึกข้อมูลจริงตั้งแต่ศูนย์เรียบร้อยแล้ว');
          setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
        } catch (err: any) {
          console.error('Clean start failed:', err);
          showToast(err.message || 'เกิดข้อผิดพลาดในการล้างข้อมูล');
          setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
        }
      },
    });
  };

  return (
    <div
      className="min-h-screen text-slate-100 flex flex-col font-sans antialiased selection:bg-indigo-500 selection:text-white relative bg-[#0b0f19] bg-fixed bg-cover transition-all duration-300"
      style={
        bgImage
          ? {
              backgroundImage: `url(${bgImage})`,
              backgroundPosition: bgPosition ? `${bgPosition.x}% ${bgPosition.y}%` : 'center center',
              backgroundSize: bgPosition && bgPosition.zoom > 1 ? `${bgPosition.zoom * 100}%` : 'cover',
            }
          : undefined
      }
    >
      {/* Background Dimming & Blur Overlay for high readability */}
      {bgImage && (
        <div
          className="fixed inset-0 pointer-events-none transition-all duration-300 z-0"
          style={{
            backgroundColor: `rgba(11, 15, 25, ${bgOpacity})`,
            backdropFilter: bgBlur > 0 ? `blur(${bgBlur}px)` : 'none',
          }}
        />
      )}

      {/* Main Content Wrapper (Relative to sit above background overlay) */}
      <div className="relative z-10 flex flex-col min-h-screen">
      {/* Toast Alert */}
      {toastMessage && (
        <aside
          aria-live="polite"
          className="fixed bottom-5 right-5 z-50 bg-slate-800 text-white px-4 py-3 rounded-2xl shadow-2xl border border-indigo-500/50 flex items-center gap-3 animate-in slide-in-from-bottom duration-200"
        >
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shrink-0 animate-ping" />
          <span className="text-sm font-medium">{toastMessage}</span>
          <button
            type="button"
            onClick={() => setToastMessage(null)}
            className="text-slate-400 hover:text-white text-xs ml-2 cursor-pointer"
          >
            ✕
          </button>
        </aside>
      )}

      {/* Mobile & Redirect Return Auth Processing Sticky Banner */}
      {isAuthLoading && (
        <aside
          aria-live="polite"
          className="bg-indigo-600/95 text-white text-xs font-semibold py-2.5 px-4 text-center flex items-center justify-center gap-2 sticky top-0 z-50 shadow-lg backdrop-blur border-b border-indigo-400/30"
        >
          <Loader2 className="w-4 h-4 animate-spin text-white shrink-0" />
          <span>กำลังตรวจสอบสถานะการเข้าสู่ระบบกับ Google กรุณารอสักครู่...</span>
        </aside>
      )}

      {/* Header */}
      <Header
        brandName={brandName}
        brandLogo={brandLogo}
        brandTagline={brandTagline}
        onOpenBrandModal={() => setIsBrandModalOpen(true)}
        onOpenNewTxModal={() => {
          setEditingTx(null);
          setIsNewTxModalOpen(true);
        }}
        onOpenCardManageModal={() => {
          setEditingCard(null);
          setIsCardModalOpen(true);
        }}
        onOpenBackgroundModal={() => setIsBgModalOpen(true)}
        onOpenExportModal={() => setIsExportModalOpen(true)}
        hasCustomBg={Boolean(bgImage)}
        urgentDueCount={urgentDueCount}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        currentUser={currentUser}
        onLogin={handleLogin}
        onLogout={handleLogout}
        isSyncing={isSyncing}
        isAuthLoading={isAuthLoading}
        isOnline={isOnline}
        syncState={syncState}
        pendingCount={syncStats.pendingCount}
        conflictCount={syncStats.conflictCount}
        onTriggerSync={handleTriggerSync}
        onOpenConflictModal={() => setIsConflictModalOpen(true)}
        onOpenDiagnosticsModal={() => setIsDiagnosticsModalOpen(true)}
        onCleanStart={handleCleanStart}
      />

      {/* Mobile Tab Bar */}
      <div className="lg:hidden flex items-center justify-center p-2.5 bg-slate-900 border-b border-slate-800">
        <div className="flex items-center p-1 bg-slate-950/90 border border-slate-800 rounded-xl w-full max-w-sm">
          <button
            type="button"
            onClick={() => setActiveTab('tracker')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition cursor-pointer ${
              activeTab === 'tracker'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <CardIcon className="w-3.5 h-3.5" />
            <span>ภาพรวม & บันทึก</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('dashboard')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition cursor-pointer ${
              activeTab === 'dashboard'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span>แดชบอร์ดย้อนหลัง</span>
          </button>
        </div>
      </div>

      {/* Main Content Dashboard */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-5 sm:space-y-6">
        {activeTab === 'dashboard' ? (
          /* Historical Analytics Dashboard View */
          <HistoricalDashboard
            transactions={transactions}
            cards={cards}
            allMonths={historicalPastMonths}
            onSelectMonthToInspect={(m) => {
              setCurrentMonth(m);
              setActiveTab('tracker');
              showToast(`เปิดดูรายการรอบบิล ${formatThaiMonth(m)}`);
            }}
          />
        ) : (
          /* Live Tracker View */
          <>
            {/* 1. Due Date Alert Banner */}
            <section aria-label="Due Alerts">
              <DueAlertBanner
                dueStatuses={dueStatuses}
                cards={cards}
                onMarkCardPaid={handleMarkCardPaid}
              />
            </section>

            {/* 2. Visual Credit Cards Section */}
            <section aria-label="Credit Cards Overview">
              {currentUser && !isCloudDataReady && cards.length === 0 ? (
                <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-8 sm:p-12 text-center flex flex-col items-center justify-center gap-3">
                  <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" />
                  <p className="text-sm font-semibold text-white">กำลังโหลดข้อมูลบัตรเครดิตของคุณจากคลาวด์...</p>
                  <p className="text-xs text-slate-400">กำลังเชื่อมต่อฐานข้อมูล Firestore ({firebaseAppConfig.projectId})</p>
                </div>
              ) : (
                <CardSlider
                  cards={cards}
                  dueStatuses={dueStatuses}
                  selectedCardId={selectedCardId}
                  onSelectCard={(id) => setSelectedCardId(id)}
                  onOpenAddCard={() => {
                    setEditingCard(null);
                    setIsCardModalOpen(true);
                  }}
                  onOpenEditCard={(card) => {
                    setEditingCard(card);
                    setIsCardModalOpen(true);
                  }}
                  onDeleteCard={handleDeleteCard}
                  onReorderCards={handleReorderCards}
                />
              )}
            </section>

            {/* 3. Monthly Cycle Summary & Analytics */}
            <section aria-label="Monthly Expense Summary">
              <MonthlySummary
                stats={monthlyStats}
                cards={cards}
                currentMonth={currentMonth}
                availableMonths={availableMonths}
                onChangeMonth={(m: string) => setCurrentMonth(m)}
                onMarkMonthPaid={handleMarkMonthPaid}
                onUnmarkMonthPaid={handleUnmarkMonthPaid}
                onMarkCardPaid={handleMarkCardPaid}
                onUnmarkCardPaid={handleUnmarkCardPaid}
                transactions={transactions}
                installmentCount={installmentCount}
                totalInstallmentMonthly={totalInstallmentMonthly}
                onOpenInstallmentModal={() => setIsInstallmentModalOpen(true)}
              />
            </section>

            {/* 4. Transactions List & Filter */}
            <section aria-label="Transaction Records">
              <TransactionList
                transactions={transactions}
                cards={cards}
                selectedCardId={selectedCardId}
                availableMonths={availableMonths}
                currentMonth={currentMonth}
                onTogglePaid={handleTogglePaid}
                onEditTransaction={(tx) => {
                  setEditingTx(tx);
                  setIsNewTxModalOpen(true);
                }}
                onDeleteTransaction={handleDeleteTransaction}
                onOpenNewTxModal={() => {
                  setEditingTx(null);
                  setIsNewTxModalOpen(true);
                }}
                onOpenInstallmentModal={() => setIsInstallmentModalOpen(true)}
              />
            </section>
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 bg-slate-950/60 py-6 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p>© 2026 {brandName} • {brandTagline}</p>
          <p className="text-slate-500">ระบบติดตามการใช้จ่ายและบริหารจัดการบัตรเครดิต</p>
        </div>
      </footer>

      {/* Modals */}
      <TransactionModal
        isOpen={isNewTxModalOpen}
        initialData={editingTx}
        cards={cards}
        existingTransactions={transactions}
        onClose={() => {
          setIsNewTxModalOpen(false);
          setEditingTx(null);
        }}
        onSave={handleSaveTransaction}
      />

      <CardModal
        isOpen={isCardModalOpen}
        initialCard={editingCard}
        onClose={() => {
          setIsCardModalOpen(false);
          setEditingCard(null);
        }}
        onSave={handleSaveCard}
      />

      <ExportCsvModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        transactions={transactions}
        cards={cards}
        availableMonths={availableMonths}
        currentSelectedMonth={currentMonth}
        brandName={brandName}
        brandLogo={brandLogo}
        brandTagline={brandTagline}
      />

      <BrandCustomizationModal
        isOpen={isBrandModalOpen}
        onClose={() => setIsBrandModalOpen(false)}
        brandName={brandName}
        brandLogo={brandLogo}
        brandTagline={brandTagline}
        onSaveBrand={handleSaveBrand}
      />

      <InstallmentPlansModal
        isOpen={isInstallmentModalOpen}
        onClose={() => setIsInstallmentModalOpen(false)}
        transactions={transactions}
        cards={cards}
        onSelectMonth={(m) => {
          setCurrentMonth(m);
          setActiveTab('tracker');
          showToast(`เปิดดูรายการรอบบิล ${formatThaiMonth(m)}`);
        }}
        onTogglePaid={handleTogglePaid}
        onOpenNewTxModal={() => {
          setEditingTx(null);
          setIsNewTxModalOpen(true);
        }}
        onUpdateInstallment={handleUpdateInstallment}
        onUpdateInstallments={handleUpdateInstallments}
      />

      <ConfirmModal
        isOpen={confirmDialog.isOpen}
        title={confirmDialog.title}
        message={confirmDialog.message}
        detail={confirmDialog.detail}
        confirmLabel={confirmDialog.confirmLabel}
        secondaryAction={confirmDialog.secondaryAction}
        onConfirm={confirmDialog.onConfirm}
        onCancel={() => setConfirmDialog((prev) => ({ ...prev, isOpen: false }))}
      />

      {/* Custom Background Modal with interactive framing, zoom, pan */}
      <BackgroundModal
        isOpen={isBgModalOpen}
        onClose={() => setIsBgModalOpen(false)}
        currentBgImage={bgImage}
        currentOpacity={bgOpacity}
        currentBlur={bgBlur}
        currentPosition={bgPosition}
        onSaveBackground={handleSaveBackground}
      />

      {/* Task 3 & 6: Conflict Resolution Modal */}
      <ConflictModal
        isOpen={isConflictModalOpen}
        onClose={() => setIsConflictModalOpen(false)}
        conflicts={conflicts}
        onResolve={handleResolveConflict}
      />

      {/* Cloud & System Diagnostics Modal */}
      <DiagnosticsModal
        isOpen={isDiagnosticsModalOpen}
        onClose={() => setIsDiagnosticsModalOpen(false)}
        currentUser={currentUser}
        cardsCount={cards.length}
        txsCount={transactions.length}
        isCloudDataReady={isCloudDataReady}
        isSyncing={isSyncing}
        isOnline={isOnline}
      />
      </div>
    </div>
  );
}
