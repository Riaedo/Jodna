/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
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
import { CreditCard as CardIcon, BarChart3 } from 'lucide-react';

const STORAGE_KEY_CARDS = 'cardpulse_cards_v1';
const STORAGE_KEY_TXS = 'cardpulse_transactions_v1';
const STORAGE_KEY_BG_IMAGE = 'cardpulse_bg_image_v1';
const STORAGE_KEY_BG_OPACITY = 'cardpulse_bg_opacity_v1';
const STORAGE_KEY_BG_BLUR = 'cardpulse_bg_blur_v1';
const STORAGE_KEY_BG_POSITION = 'cardpulse_bg_position_v1';
const STORAGE_KEY_BRAND_NAME = 'cardpulse_brand_name_v1';
const STORAGE_KEY_BRAND_LOGO = 'cardpulse_brand_logo_v1';
const STORAGE_KEY_BRAND_TAGLINE = 'cardpulse_brand_tagline_v1';

export default function App() {
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

  // Save to localStorage when state changes
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_CARDS, JSON.stringify(cards));
  }, [cards]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_TXS, JSON.stringify(transactions));
  }, [transactions]);

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
        showToast('แก้ไขข้อมูลรายการใช้จ่ายเรียบร้อยแล้ว');
      }
    } else {
      // New Transaction
      if (txData.isInstallment && options?.autoGenerateRemaining) {
        const fullSeries = generateInstallmentSeries(txData, true);
        updatedTxs = [...transactions, ...fullSeries];
        showToast(
          `บันทึกรายการผ่อนชำระและสร้างครบ ${fullSeries.length} งวดล่วงหน้าเรียบร้อยแล้ว`
        );
      } else {
        const newTx: Transaction = {
          ...txData,
          id: 'tx-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7),
          createdAt: new Date().toISOString(),
        };
        updatedTxs = [newTx, ...transactions];
        showToast('บันทึกรายการใช้จ่ายใหม่เรียบร้อยแล้ว');
      }
    }

    setTransactions(updatedTxs);
  };

  // Toggle Transaction Paid status
  const handleTogglePaid = (txId: string) => {
    const updated = transactions.map((t) =>
      t.id === txId ? { ...t, isPaid: !t.isPaid } : t
    );
    setTransactions(updated);
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
  };

  // Mark all transactions across all cards for the entire month as paid
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
        showToast(
          isPlan && groupCount > 1
            ? `ลบแผนผ่อนชำระครบทั้ง ${groupCount} งวดเรียบร้อยแล้ว`
            : 'ลบรายการใช้จ่ายเรียบร้อยแล้ว'
        );
        setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
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
      detail: 'ข้อมูลบัตรนี้และรายการที่เกี่ยวข้องจะถูกลบออกจากระบบ',
      confirmLabel: 'ยืนยันลบบัตร',
      onConfirm: () => {
        const updatedCards = cards.filter((c) => c.id !== card.id);
        const updatedTxs = transactions.filter((t) => t.cardId !== card.id);
        setCards(updatedCards);
        setTransactions(updatedTxs);
        if (selectedCardId === card.id) setSelectedCardId(null);
        showToast(`ลบบัตร ${card.name} เรียบร้อยแล้ว`);
        setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
      },
    });
  };

  // Reorder Cards
  const handleReorderCards = (newCards: CreditCard[]) => {
    setCards(newCards);
    localStorage.setItem(STORAGE_KEY_CARDS, JSON.stringify(newCards));
    showToast('จัดลำดับบัตรเครดิตเรียบร้อยแล้ว');
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
