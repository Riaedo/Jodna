/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { User } from 'firebase/auth';
import {
  CreditCard,
  Transaction,
  TransactionCategory,
  GoogleSheetInfo,
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
import { initAuth, googleSignIn, logout, getAccessToken } from './services/auth';
import {
  findExistingTrackerSheet,
  createTrackerSpreadsheet,
  syncAllDataToGoogleSheet,
} from './services/sheets';

import { Header } from './components/Header';
import { DueAlertBanner } from './components/DueAlertBanner';
import { CardSlider } from './components/CardSlider';
import { MonthlySummary } from './components/MonthlySummary';
import { TransactionList } from './components/TransactionList';
import { TransactionModal } from './components/TransactionModal';
import { CardModal } from './components/CardModal';
import { GoogleSheetModal } from './components/GoogleSheetModal';
import { ConfirmModal } from './components/ConfirmModal';
import { HistoricalDashboard } from './components/HistoricalDashboard';
import { InstallmentPlansModal } from './components/InstallmentPlansModal';
import { BackgroundModal } from './components/BackgroundModal';
import { CreditCard as CardIcon, BarChart3 } from 'lucide-react';

const STORAGE_KEY_CARDS = 'cardpulse_cards_v1';
const STORAGE_KEY_TXS = 'cardpulse_transactions_v1';
const STORAGE_KEY_SHEET = 'cardpulse_sheet_v1';
const STORAGE_KEY_BG_IMAGE = 'cardpulse_bg_image_v1';
const STORAGE_KEY_BG_OPACITY = 'cardpulse_bg_opacity_v1';
const STORAGE_KEY_BG_BLUR = 'cardpulse_bg_blur_v1';
const STORAGE_KEY_BG_POSITION = 'cardpulse_bg_position_v1';

export default function App() {
  // Auth state
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // App data state
  const [cards, setCards] = useState<CreditCard[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_CARDS);
      return saved ? JSON.parse(saved) : INITIAL_DEMO_CARDS;
    } catch {
      return INITIAL_DEMO_CARDS;
    }
  });

  const [transactions, setTransactions] = useState<Transaction[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_TXS);
      if (!saved) return INITIAL_DEMO_TRANSACTIONS;
      const parsed: Transaction[] = JSON.parse(saved);
      // Ensure 2025 demo transactions are present so YoY comparison chart is populated
      const has2025 = parsed.some((t) => t.billingCycleMonth?.startsWith('2025') || t.date?.startsWith('2025'));
      if (!has2025) {
        const demo2025 = INITIAL_DEMO_TRANSACTIONS.filter((t) => t.billingCycleMonth?.startsWith('2025'));
        return [...parsed, ...demo2025];
      }
      return parsed;
    } catch {
      return INITIAL_DEMO_TRANSACTIONS;
    }
  });

  const [sheetInfo, setSheetInfo] = useState<GoogleSheetInfo | null>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_SHEET);
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  // UI state
  const [activeTab, setActiveTab] = useState<'tracker' | 'dashboard'>('tracker');
  const [isSyncing, setIsSyncing] = useState(false);
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<TransactionCategory | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Modals state
  const [isNewTxModalOpen, setIsNewTxModalOpen] = useState(false);
  const [editingTx, setEditingTx] = useState<Transaction | null>(null);
  const [isCardModalOpen, setIsCardModalOpen] = useState(false);
  const [editingCard, setEditingCard] = useState<CreditCard | null>(null);
  const [isSheetModalOpen, setIsSheetModalOpen] = useState(false);
  const [isInstallmentModalOpen, setIsInstallmentModalOpen] = useState(false);
  const [isBgModalOpen, setIsBgModalOpen] = useState(false);

  // Custom Background State
  const [bgImage, setBgImage] = useState<string | null>(() => {
    try {
      return localStorage.getItem(STORAGE_KEY_BG_IMAGE);
    } catch {
      return null;
    }
  });

  const [bgOpacity, setBgOpacity] = useState<number>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_BG_OPACITY);
      return saved ? Number(saved) : 65;
    } catch {
      return 65;
    }
  });

  const [bgBlur, setBgBlur] = useState<number>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_BG_BLUR);
      return saved ? Number(saved) : 4;
    } catch {
      return 4;
    }
  });

  const [bgPosition, setBgPosition] = useState<{ x: number; y: number; zoom: number } | null>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_BG_POSITION);
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const handleSaveBackground = (
    newBg: string | null,
    newOpacity: number,
    newBlur: number,
    newPosition?: { x: number; y: number; zoom: number } | null
  ) => {
    setBgImage(newBg);
    setBgOpacity(newOpacity);
    setBgBlur(newBlur);
    setBgPosition(newPosition || null);
    try {
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
      showToast(newBg ? 'อัปเดตภาพพื้นหลังเรียบร้อยแล้ว' : 'คืนค่าภาพพื้นหลังเริ่มต้นแล้ว');
    } catch (e) {
      console.warn('LocalStorage warning saving background:', e);
      showToast('บันทึกรูปภาพพื้นหลังในระบบแล้ว');
    }
  };

  // Destructive Confirmation Dialog
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    detail?: string;
    confirmLabel?: string;
    secondaryAction?: {
      label: string;
      onClick: () => void;
    };
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });

  // Ensure all installment series appear in subsequent cycles on initial load
  useEffect(() => {
    const { updatedTransactions, addedCount } = autoPopulateMissingInstallments(transactions);
    if (addedCount > 0) {
      setTransactions(updatedTransactions);
      console.log(`Auto-generated ${addedCount} upcoming installment transactions`);
    }
  }, []);

  // Save to LocalStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_CARDS, JSON.stringify(cards));
  }, [cards]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_TXS, JSON.stringify(transactions));
  }, [transactions]);

  useEffect(() => {
    if (sheetInfo) {
      localStorage.setItem(STORAGE_KEY_SHEET, JSON.stringify(sheetInfo));
    }
  }, [sheetInfo]);

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  }, []);

  // Compute available months from transactions or default to current month
  // Future installments waiting for cutoff do not pollute tracker months
  const availableMonths = useMemo(() => {
    const current = new Date();
    const currentMonthStr = `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, '0')}`;
    const monthsSet = new Set<string>([currentMonthStr]);

    transactions.forEach((t) => {
      if (t.billingCycleMonth && !isFutureInstallmentHidden(t, cards)) {
        monthsSet.add(t.billingCycleMonth);
      }
    });

    return Array.from(monthsSet).sort().reverse();
  }, [transactions, cards]);

  const [currentMonth, setCurrentMonth] = useState<string>(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  // Ensure currentMonth is valid in availableMonths
  useEffect(() => {
    if (!availableMonths.includes(currentMonth) && availableMonths.length > 0) {
      setCurrentMonth(availableMonths[0]);
    }
  }, [availableMonths, currentMonth]);

  // Compute Due Statuses for each card
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

  // Installments in current month
  const { installmentCount, totalInstallmentMonthly } = useMemo(() => {
    const monthTxs = transactions.filter((t) => {
      if (!t.isInstallment) return false;
      if (isFutureInstallmentHidden(t, cards)) return false;
      return getTransactionBillingCycleMonth(t, cards) === currentMonth;
    });
    const total = monthTxs.reduce(
      (sum, t) => sum + (t.monthlyInstallmentAmount || t.amount),
      0
    );
    return { installmentCount: monthTxs.length, totalInstallmentMonthly: total };
  }, [transactions, currentMonth, cards]);

  // Helper to sync to Google Sheets
  const triggerSheetSync = useCallback(
    async (token: string, targetSheet: GoogleSheetInfo, currentCards: CreditCard[], currentTxs: Transaction[]) => {
      try {
        setIsSyncing(true);
        const allSummaries = availableMonths.map((m) => calculateMonthlyStats(currentTxs, m, currentCards));
        await syncAllDataToGoogleSheet(token, targetSheet.spreadsheetId, currentCards, currentTxs, allSummaries);
        setSheetInfo((prev) =>
          prev ? { ...prev, lastSyncedAt: new Date().toISOString() } : null
        );
        showToast('ซิงค์ข้อมูลกับ Google Sheets เรียบร้อยแล้ว');
      } catch (err: any) {
        console.error('Failed to sync to sheets:', err);
        showToast('การซิงค์กับ Google Sheets ไม่สำเร็จ: ' + (err.message || 'Error'));
      } finally {
        setIsSyncing(false);
      }
    },
    [availableMonths, showToast]
  );

  // Initialize Auth
  useEffect(() => {
    const unsubscribe = initAuth(
      async (authUser, token) => {
        setUser(authUser);
        setAccessToken(token);

        // Check if spreadsheet already exists, otherwise create
        try {
          let sheet = sheetInfo;
          if (!sheet) {
            sheet = await findExistingTrackerSheet(token);
            if (!sheet) {
              sheet = await createTrackerSpreadsheet(token);
            }
            setSheetInfo(sheet);
          }
          await triggerSheetSync(token, sheet, cards, transactions);
        } catch (e) {
          console.error('Error during auto sheet init:', e);
        }
      },
      () => {
        setUser(null);
        setAccessToken(null);
      }
    );
    return () => unsubscribe();
  }, []);

  // Handle Google Login
  const handleLogin = async () => {
    try {
      setIsLoggingIn(true);
      const res = await googleSignIn();
      if (res) {
        setUser(res.user);
        setAccessToken(res.accessToken);

        // Find or create sheet
        let sheet = await findExistingTrackerSheet(res.accessToken);
        if (!sheet) {
          sheet = await createTrackerSpreadsheet(res.accessToken);
        }
        setSheetInfo(sheet);
        await triggerSheetSync(res.accessToken, sheet, cards, transactions);
        showToast('เชื่อมต่อ Google Sheets สำเร็จ! บันทึกข้อมูลเรียบร้อยแล้ว');
      }
    } catch (err: any) {
      if (
        err?.code === 'auth/popup-closed-by-user' ||
        err?.code === 'auth/cancelled-popup-request'
      ) {
        return;
      }
      console.warn('Login warning:', err?.message || err);
      showToast('เข้าสู่ระบบไม่สำเร็จ: ' + (err.message || 'โปรดลองใหม่อีกครั้ง'));
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    setUser(null);
    setAccessToken(null);
    showToast('ออกจากระบบแล้ว');
  };

  // Create fresh spreadsheet on demand
  const handleCreateNewSheet = async () => {
    const token = accessToken || (await getAccessToken());
    if (!token) {
      handleLogin();
      return;
    }
    try {
      setIsSyncing(true);
      const sheet = await createTrackerSpreadsheet(token);
      setSheetInfo(sheet);
      await triggerSheetSync(token, sheet, cards, transactions);
      showToast('สร้าง Google Sheet ใหม่และเชื่อมต่อเรียบร้อยแล้ว!');
    } catch (err: any) {
      console.warn('Sheet creation warning:', err);
      showToast('สร้างชีตไม่สำเร็จ: ' + err.message);
    } finally {
      setIsSyncing(false);
    }
  };

  // Manual sync button
  const handleManualSync = async () => {
    const token = accessToken || (await getAccessToken());
    if (!token || !sheetInfo) {
      handleLogin();
      return;
    }
    await triggerSheetSync(token, sheetInfo, cards, transactions);
  };

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
            return {
              ...t,
              title: txData.title,
              cardId: txData.cardId,
              category: txData.category,
              tags: txData.tags,
              amount: txData.amount,
              totalInstallments: txData.totalInstallments,
              monthlyInstallmentAmount: txData.monthlyInstallmentAmount,
            };
          }
          return t.id === txData.id ? { ...t, ...txData } : t;
        });
        showToast('อัปเดตข้อมูลแผนผ่อนชำระทุกงวดเรียบร้อยแล้ว');
      } else {
        updatedTxs = transactions.map((t) =>
          t.id === txData.id
            ? {
                ...t,
                ...txData,
              }
            : t
        );
        showToast('แก้ไขรายการใช้จ่ายเรียบร้อยแล้ว');
      }

      // If user also requested autoGenerateRemaining for this plan
      if (txData.isInstallment && options?.autoGenerateRemaining) {
        const { updatedTransactions, addedCount } = autoPopulateMissingInstallments(updatedTxs);
        if (addedCount > 0) {
          updatedTxs = updatedTransactions;
          showToast(`สร้างรายการรอบบิลถัดไปอัตโนมัติเพิ่ม ${addedCount} งวด`);
        }
      }
    } else {
      // New Transaction
      if (txData.isInstallment) {
        const autoGen = options?.autoGenerateRemaining !== false;
        const series = generateInstallmentSeries(txData, autoGen);
        updatedTxs = [...series, ...transactions];
        if (series.length > 1) {
          showToast(`บันทึกรายการและสร้างรอบบิลถัดไปอัตโนมัติครบ ${series.length} งวดแล้ว`);
        } else {
          showToast('บันทึกรายการผ่อนชำระเรียบร้อยแล้ว');
        }
      } else {
        const newTx: Transaction = {
          ...txData,
          id: 'tx-' + Date.now(),
          createdAt: new Date().toISOString(),
        };
        updatedTxs = [newTx, ...transactions];
        showToast('บันทึกรายการใช้จ่ายใหม่เรียบร้อยแล้ว');
      }
    }

    setTransactions(updatedTxs);

    // Auto-sync to Google Sheets if connected
    if (accessToken && sheetInfo) {
      triggerSheetSync(accessToken, sheetInfo, cards, updatedTxs);
    }
  };

  // Toggle Transaction Paid status
  const handleTogglePaid = (txId: string) => {
    const updated = transactions.map((t) =>
      t.id === txId ? { ...t, isPaid: !t.isPaid } : t
    );
    setTransactions(updated);
    if (accessToken && sheetInfo) {
      triggerSheetSync(accessToken, sheetInfo, cards, updated);
    }
  };

  // Mark all transactions of a card in a cycle as paid
  const handleMarkCardPaid = (cardId: string, cycleMonth: string) => {
    const card = cards.find((c) => c.id === cardId);
    const todayStr = new Date().toISOString().split('T')[0];
    const updated = transactions.map((t) => {
      const txCycle = getTransactionBillingCycleMonth(t, cards);
      if (t.cardId === cardId && (txCycle === cycleMonth || t.billingCycleMonth === cycleMonth)) {
        return { ...t, isPaid: true, paidDate: todayStr };
      }
      return t;
    });

    setTransactions(updated);
    showToast(`บันทึกชำระยอดรอบบิล ${formatThaiMonth(cycleMonth)} ของ ${card?.name || 'บัตร'} เรียบร้อยแล้ว`);

    if (accessToken && sheetInfo) {
      triggerSheetSync(accessToken, sheetInfo, cards, updated);
    }
  };

  // Unmark all transactions of a card in a cycle
  const handleUnmarkCardPaid = (cardId: string, cycleMonth: string) => {
    const card = cards.find((c) => c.id === cardId);
    const updated = transactions.map((t) => {
      const txCycle = getTransactionBillingCycleMonth(t, cards);
      if (t.cardId === cardId && (txCycle === cycleMonth || t.billingCycleMonth === cycleMonth)) {
        return { ...t, isPaid: false, paidDate: undefined };
      }
      return t;
    });

    setTransactions(updated);
    showToast(`ยกเลิกสถานะชำระรอบบิล ${formatThaiMonth(cycleMonth)} ของ ${card?.name || 'บัตร'} แล้ว`);

    if (accessToken && sheetInfo) {
      triggerSheetSync(accessToken, sheetInfo, cards, updated);
    }
  };

  // Mark all transactions across all cards for the entire month as paid (Requirement 2)
  const handleMarkMonthPaid = (cycleMonth: string) => {
    const todayStr = new Date().toISOString().split('T')[0];
    let affectedCount = 0;
    const updated = transactions.map((t) => {
      const txCycle = getTransactionBillingCycleMonth(t, cards);
      if ((txCycle === cycleMonth || t.billingCycleMonth === cycleMonth) && !isFutureInstallmentHidden(t, cards)) {
        if (!t.isPaid) affectedCount++;
        return { ...t, isPaid: true, paidDate: todayStr };
      }
      return t;
    });

    setTransactions(updated);
    showToast(`บันทึกชำระยอดรอบเดือน ${formatThaiMonth(cycleMonth)} ครบทุกบัตรเรียบร้อยแล้ว (${affectedCount} รายการ)`);

    if (accessToken && sheetInfo) {
      triggerSheetSync(accessToken, sheetInfo, cards, updated);
    }
  };

  // Unmark all transactions for the entire month
  const handleUnmarkMonthPaid = (cycleMonth: string) => {
    const updated = transactions.map((t) => {
      const txCycle = getTransactionBillingCycleMonth(t, cards);
      if (txCycle === cycleMonth || t.billingCycleMonth === cycleMonth) {
        return { ...t, isPaid: false, paidDate: undefined };
      }
      return t;
    });

    setTransactions(updated);
    showToast(`ยกเลิกสถานะชำระรอบเดือน ${formatThaiMonth(cycleMonth)} ทุกรายการแล้ว`);

    if (accessToken && sheetInfo) {
      triggerSheetSync(accessToken, sheetInfo, cards, updated);
    }
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
        ? `สามารถเลือกลบเฉพาะงวดนี้ หรือลบทุกงวดในแผนผ่อนชำระนี้ออกจากระบบและ Google Sheets ได้`
        : `การดำเนินการนี้จะอัปเดตและลบรายการออกจาก Google Sheets ด้วย`,
      confirmLabel: isPlan && groupCount > 1 ? `ลบทุกงวดในแผน (${groupCount} งวด)` : 'ลบรายการนี้',
      secondaryAction:
        isPlan && groupCount > 1
          ? {
              label: `ลบเฉพาะงวดนี้ (งวด ${tx.currentInstallment || 1})`,
              onClick: () => {
                const updated = transactions.filter((t) => t.id !== tx.id);
                setTransactions(updated);
                showToast(`ลบเฉพาะงวดที่ ${tx.currentInstallment || 1} เรียบร้อยแล้ว`);
                setConfirmDialog((prev) => ({ ...prev, isOpen: false }));

                if (accessToken && sheetInfo) {
                  triggerSheetSync(accessToken, sheetInfo, cards, updated);
                }
              },
            }
          : undefined,
      onConfirm: () => {
        const updated =
          isPlan && groupCount > 1
            ? transactions.filter((t) => t.installmentGroupId !== tx.installmentGroupId)
            : transactions.filter((t) => t.id !== tx.id);
        setTransactions(updated);
        showToast(
          isPlan && groupCount > 1
            ? `ลบแผนผ่อนชำระครบทั้ง ${groupCount} งวดเรียบร้อยแล้ว`
            : 'ลบรายการใช้จ่ายเรียบร้อยแล้ว'
        );
        setConfirmDialog((prev) => ({ ...prev, isOpen: false }));

        if (accessToken && sheetInfo) {
          triggerSheetSync(accessToken, sheetInfo, cards, updated);
        }
      },
    });
  };

  // Add / Edit Card
  const handleSaveCard = (cardData: Omit<CreditCard, 'id'> & { id?: string }) => {
    let updatedCards: CreditCard[];
    if (cardData.id) {
      // Edit
      updatedCards = cards.map((c) =>
        c.id === cardData.id ? ({ ...c, ...cardData } as CreditCard) : c
      );
      showToast('แก้ไขข้อมูลบัตรเครดิตเรียบร้อยแล้ว');
    } else {
      // New
      const newCard: CreditCard = {
        ...cardData,
        id: 'card-' + Date.now(),
      };
      updatedCards = [...cards, newCard];
      showToast('เพิ่มบัตรเครดิตใหม่เรียบร้อยแล้ว');
    }

    setCards(updatedCards);

    if (accessToken && sheetInfo) {
      triggerSheetSync(accessToken, sheetInfo, updatedCards, transactions);
    }
  };

  // Delete Card with Confirmation Modal
  const handleDeleteCard = (card: CreditCard) => {
    const txCount = transactions.filter((t) => t.cardId === card.id).length;
    setConfirmDialog({
      isOpen: true,
      title: 'ยืนยันการลบบัตรเครดิต',
      message: `คุณต้องการลบบัตร "${card.name} (•••• ${card.last4})"${
        txCount > 0 ? ` พร้อมรายการใช้จ่ายที่ผูกอยู่ ${txCount} รายการ` : ''
      } ใช่หรือไม่?`,
      detail: 'ข้อมูลบัตรนี้จะถูกลบออกจากระบบและ Google Sheets',
      confirmLabel: 'ยืนยันลบบัตร',
      onConfirm: () => {
        const updatedCards = cards.filter((c) => c.id !== card.id);
        const updatedTxs = transactions.filter((t) => t.cardId !== card.id);
        setCards(updatedCards);
        setTransactions(updatedTxs);
        if (selectedCardId === card.id) setSelectedCardId(null);
        showToast(`ลบบัตร ${card.name} เรียบร้อยแล้ว`);
        setConfirmDialog((prev) => ({ ...prev, isOpen: false }));

        if (accessToken && sheetInfo) {
          triggerSheetSync(accessToken, sheetInfo, updatedCards, updatedTxs);
        }
      },
    });
  };

  // Reorder Cards
  const handleReorderCards = (newCards: CreditCard[]) => {
    setCards(newCards);
    localStorage.setItem(STORAGE_KEY_CARDS, JSON.stringify(newCards));
    showToast('จัดลำดับบัตรเครดิตเรียบร้อยแล้ว');
    if (accessToken && sheetInfo) {
      triggerSheetSync(accessToken, sheetInfo, newCards, transactions);
    }
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
      {/* Background Dimming & Blur Overlay Layer */}
      {bgImage && (
        <div
          className="fixed inset-0 pointer-events-none transition-all duration-300 z-0"
          style={{
            backgroundColor: `rgba(11, 15, 25, ${bgOpacity / 100})`,
            backdropFilter: bgBlur > 0 ? `blur(${bgBlur}px)` : undefined,
          }}
        />
      )}

      {/* Main app body */}
      <div className="relative z-10 flex flex-col min-h-screen">
        {/* Toast Notification */}
        {toastMessage && (
          <div className="fixed bottom-6 right-6 z-50 p-4 rounded-2xl bg-slate-800/95 border border-indigo-500/40 text-slate-100 text-sm shadow-2xl shadow-black/60 flex items-center gap-3 backdrop-blur-md animate-in slide-in-from-bottom-5">
            <div className="w-2 h-2 rounded-full bg-indigo-400 animate-ping" />
            <span>{toastMessage}</span>
          </div>
        )}

      {/* Top Header */}
      <Header
        user={user}
        isLoggingIn={isLoggingIn}
        onLogin={handleLogin}
        onLogout={handleLogout}
        sheetInfo={sheetInfo}
        isSyncing={isSyncing}
        onSyncWithSheets={handleManualSync}
        onOpenSheetModal={() => setIsSheetModalOpen(true)}
        onOpenNewTxModal={() => {
          setEditingTx(null);
          setIsNewTxModalOpen(true);
        }}
        onOpenCardManageModal={() => {
          setEditingCard(null);
          setIsCardModalOpen(true);
        }}
        onOpenBackgroundModal={() => setIsBgModalOpen(true)}
        hasCustomBg={Boolean(bgImage)}
        urgentDueCount={urgentDueCount}
        activeTab={activeTab}
        onTabChange={setActiveTab}
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
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-8">
        {activeTab === 'dashboard' ? (
          /* Historical Analytics Dashboard View */
          <HistoricalDashboard
            transactions={transactions}
            cards={cards}
            allMonths={availableMonths}
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
            </section>

            {/* 3. Monthly Spending Summary */}
            <section aria-label="Monthly Spending Summary">
              <MonthlySummary
                currentMonth={currentMonth}
                availableMonths={availableMonths}
                onChangeMonth={(m) => setCurrentMonth(m)}
                stats={monthlyStats}
                cards={cards}
                transactions={transactions}
                installmentCount={installmentCount}
                totalInstallmentMonthly={totalInstallmentMonthly}
                selectedCategory={selectedCategory}
                onSelectCategory={setSelectedCategory}
                onOpenInstallmentModal={() => setIsInstallmentModalOpen(true)}
                onMarkMonthPaid={handleMarkMonthPaid}
                onUnmarkMonthPaid={handleUnmarkMonthPaid}
                onMarkCardPaid={handleMarkCardPaid}
                onUnmarkCardPaid={handleUnmarkCardPaid}
              />
            </section>

            {/* 4. Transactions List */}
            <section aria-label="Transactions List">
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
          <p>© 2026 CardPulse • ระบบติดตามค่าใช้จ่ายบัตรเครดิตและแจ้งเตือนครบกำหนดชำระ</p>
          <div className="flex items-center gap-4 text-slate-400">
            <span>บันทึกข้อมูลแบบเรียลไทม์ใน Google Sheets</span>
            {sheetInfo?.spreadsheetUrl && (
              <a
                href={sheetInfo.spreadsheetUrl}
                target="_blank"
                rel="noreferrer"
                className="text-indigo-400 hover:text-indigo-300 underline"
              >
                เปิดสเปรดชีต ↗
              </a>
            )}
          </div>
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

      <GoogleSheetModal
        isOpen={isSheetModalOpen}
        onClose={() => setIsSheetModalOpen(false)}
        sheetInfo={sheetInfo}
        isSyncing={isSyncing}
        onSync={handleManualSync}
        onCreateNewSheet={handleCreateNewSheet}
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
      </div>
    </div>
  );
}
