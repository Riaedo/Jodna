import React, { useState, useMemo } from 'react';
import { Transaction, CreditCard, TransactionCategory } from '../types';
import {
  formatThaiCurrency,
  formatThaiDate,
  formatThaiMonth,
  CATEGORY_INFO,
  isFutureInstallmentHidden,
  getTransactionBillingCycleMonth,
} from '../utils/cardUtils';
import {
  Search,
  Filter,
  Calendar,
  CheckCircle2,
  Clock,
  Layers,
  Edit2,
  Trash2,
  CreditCard as CardIcon,
  Plus,
  Utensils,
  ShoppingBag,
  ShoppingCart,
  Car,
  Receipt,
  Plane,
  Film,
  Heart,
  Globe,
  MoreHorizontal,
} from 'lucide-react';

interface TransactionListProps {
  transactions: Transaction[];
  cards: CreditCard[];
  selectedCardId: string | null;
  availableMonths?: string[];
  currentMonth?: string;
  onTogglePaid: (transactionId: string) => void;
  onEditTransaction: (tx: Transaction) => void;
  onDeleteTransaction: (tx: Transaction) => void;
  onOpenNewTxModal: () => void;
  onOpenInstallmentModal?: () => void;
}

export const TransactionList: React.FC<TransactionListProps> = ({
  transactions,
  cards,
  selectedCardId,
  availableMonths,
  currentMonth,
  onTogglePaid,
  onEditTransaction,
  onDeleteTransaction,
  onOpenNewTxModal,
  onOpenInstallmentModal,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [monthFilter, setMonthFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [tagFilter, setTagFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('pending');
  const [cardFilter, setCardFilter] = useState<string>(selectedCardId || 'all');

  // Filter out future installments that belong to cycles after current month and haven't passed cutoff date
  // Rule: Hide from main credit card spending list; only displayed in the all-installments table
  const visibleTransactions = useMemo(() => {
    return transactions.filter((tx) => !isFutureInstallmentHidden(tx, cards));
  }, [transactions, cards]);

  // Collect all unique months across visible transactions and availableMonths
  const allAvailableMonths = useMemo(() => {
    const set = new Set<string>();
    if (availableMonths) {
      availableMonths.forEach((m) => set.add(m));
    }
    visibleTransactions.forEach((tx) => {
      if (tx.billingCycleMonth) set.add(tx.billingCycleMonth);
      if (tx.date) set.add(tx.date.slice(0, 7));
    });
    return Array.from(set).sort().reverse();
  }, [visibleTransactions, availableMonths]);

  // Collect all unique tags across visible transactions
  const allAvailableTags = useMemo(() => {
    const set = new Set<string>();
    visibleTransactions.forEach((tx) => {
      tx.tags?.forEach((t) => set.add(t));
    });
    return Array.from(set).sort();
  }, [visibleTransactions]);

  // Sync card filter if selectedCardId changes
  React.useEffect(() => {
    if (selectedCardId) {
      setCardFilter(selectedCardId);
    }
  }, [selectedCardId]);

  const cardMap = useMemo(() => new Map(cards.map((c) => [c.id, c])), [cards]);

  const filteredTransactions = useMemo(() => {
    return visibleTransactions
      .filter((tx) => {
        // Month & Year filter (calculated from card's cutoff cycle)
        if (monthFilter !== 'all') {
          const txCycle = getTransactionBillingCycleMonth(tx, cards);
          const matchCycle = txCycle === monthFilter || tx.billingCycleMonth === monthFilter;
          const matchDateMonth = tx.date && tx.date.startsWith(monthFilter);
          if (!matchCycle && !matchDateMonth) return false;
        }

        // Search query
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchTitle = tx.title.toLowerCase().includes(q);
          const matchNote = tx.note?.toLowerCase().includes(q) || false;
          const matchAmount = tx.amount.toString().includes(q);
          const matchTags = tx.tags?.some((t) => t.toLowerCase().includes(q)) || false;
          if (!matchTitle && !matchNote && !matchAmount && !matchTags) return false;
        }

        // Card filter
        if (cardFilter !== 'all' && tx.cardId !== cardFilter) {
          return false;
        }

        // Category filter
        if (categoryFilter !== 'all' && tx.category !== categoryFilter) {
          return false;
        }

        // Tag filter
        if (tagFilter !== 'all') {
          if (!tx.tags || !tx.tags.includes(tagFilter)) return false;
        }

        // Status filter
        if (statusFilter === 'paid' && !tx.isPaid) return false;
        if (statusFilter === 'pending' && tx.isPaid) return false;
        if (statusFilter === 'installment' && !tx.isInstallment) return false;

        return true;
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [visibleTransactions, monthFilter, searchQuery, cardFilter, categoryFilter, tagFilter, statusFilter]);

  const renderCategoryIcon = (category: TransactionCategory) => {
    switch (category) {
      case 'food':
        return <Utensils className="w-4 h-4 text-amber-400" />;
      case 'shopping':
        return <ShoppingBag className="w-4 h-4 text-pink-400" />;
      case 'supermarket':
        return <ShoppingCart className="w-4 h-4 text-emerald-400" />;
      case 'transport':
        return <Car className="w-4 h-4 text-blue-400" />;
      case 'bills':
        return <Receipt className="w-4 h-4 text-purple-400" />;
      case 'travel':
        return <Plane className="w-4 h-4 text-cyan-400" />;
      case 'entertainment':
        return <Film className="w-4 h-4 text-red-400" />;
      case 'health':
        return <Heart className="w-4 h-4 text-rose-400" />;
      case 'online':
        return <Globe className="w-4 h-4 text-indigo-400" />;
      default:
        return <MoreHorizontal className="w-4 h-4 text-slate-400" />;
    }
  };

  return (
    <div className="space-y-4">
      {/* Header and Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-lg font-bold text-white tracking-tight">รายการใช้จ่ายบัตรเครดิต</h2>
            <span
              className={`px-2.5 py-0.5 text-[11px] font-semibold rounded-full border ${
                statusFilter === 'pending'
                  ? 'bg-rose-500/15 text-rose-300 border-rose-500/30'
                  : statusFilter === 'paid'
                  ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                  : statusFilter === 'installment'
                  ? 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                  : 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30'
              }`}
            >
              {statusFilter === 'pending'
                ? 'สถานะ: รอชำระ'
                : statusFilter === 'paid'
                ? 'สถานะ: ชำระแล้ว'
                : statusFilter === 'installment'
                ? 'สถานะ: ผ่อนชำระ 0%'
                : 'สถานะ: ทั้งหมด'}
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            พบ {filteredTransactions.length} รายการ (จากทั้งหมด {visibleTransactions.length} รายการ)
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          {onOpenInstallmentModal && (
            <button
              type="button"
              onClick={onOpenInstallmentModal}
              className="text-xs font-semibold px-3 py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 transition flex items-center gap-1.5 cursor-pointer shadow-sm"
              title="ดูตารางผ่อนชำระทุกงวดของทุกแผน"
            >
              <Layers className="w-3.5 h-3.5 text-amber-400" />
              <span>ตารางผ่อนชำระทุกงวด</span>
            </button>
          )}

          <button
            type="button"
            onClick={onOpenNewTxModal}
            className="text-xs font-semibold px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/20 transition flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            เพิ่มรายการ
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-3 rounded-2xl bg-slate-900/80 border border-slate-800/80 space-y-2.5">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2.5">
          {/* Search Input */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ค้นหารายการ, ร้านค้า, โน้ต..."
              className="w-full pl-9 pr-3 py-2 bg-slate-800/70 border border-slate-700/60 rounded-xl text-xs text-slate-200 placeholder-slate-400 focus:outline-none focus:border-indigo-500 transition"
            />
          </div>

          {/* Month & Year Filter (Prompt Requirement: ฟิลเตอร์เลือกเดือนปี) */}
          <div className="relative">
            <select
              value={monthFilter}
              onChange={(e) => setMonthFilter(e.target.value)}
              className="w-full px-3 py-2 bg-slate-800/70 border border-slate-700/60 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-indigo-500 transition cursor-pointer"
            >
              <option value="all">ทุกเดือน/ปี (รอบบิล)</option>
              {allAvailableMonths.map((m) => (
                <option key={m} value={m}>
                  รอบ {formatThaiMonth(m)}
                </option>
              ))}
            </select>
          </div>

          {/* Card Filter */}
          <div className="relative">
            <select
              value={cardFilter}
              onChange={(e) => setCardFilter(e.target.value)}
              className="w-full px-3 py-2 bg-slate-800/70 border border-slate-700/60 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-indigo-500 transition cursor-pointer"
            >
              <option value="all">ทุกบัตรเครดิต</option>
              {cards.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} (•••• {c.last4})
                </option>
              ))}
            </select>
          </div>

          {/* Category Filter */}
          <div className="relative">
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full px-3 py-2 bg-slate-800/70 border border-slate-700/60 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-indigo-500 transition cursor-pointer"
            >
              <option value="all">ทุกหมวดหมู่</option>
              {Object.entries(CATEGORY_INFO).map(([key, info]) => (
                <option key={key} value={key}>
                  {info.label}
                </option>
              ))}
            </select>
          </div>

          {/* Tag Filter */}
          <div className="relative">
            <select
              value={tagFilter}
              onChange={(e) => setTagFilter(e.target.value)}
              className="w-full px-3 py-2 bg-slate-800/70 border border-slate-700/60 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-indigo-500 transition cursor-pointer"
            >
              <option value="all">ทุกแท็ก (Tags)</option>
              {allAvailableTags.map((tag) => (
                <option key={tag} value={tag}>
                  #{tag}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div className="relative">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 bg-slate-800/70 border border-slate-700/60 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-indigo-500 transition cursor-pointer"
            >
              <option value="all">สถานะทั้งหมด</option>
              <option value="pending">รอชำระ (ยังไม่จ่าย)</option>
              <option value="paid">ชำระแล้ว</option>
              <option value="installment">เฉพาะรายการผ่อนชำระ (0% Installments)</option>
            </select>
          </div>
        </div>

        {/* Clear Filters Indicator */}
        {(monthFilter !== 'all' ||
          cardFilter !== 'all' ||
          categoryFilter !== 'all' ||
          tagFilter !== 'all' ||
          statusFilter !== 'all' ||
          searchQuery.trim() !== '') && (
          <div className="flex items-center justify-between text-xs pt-1 px-1 border-t border-slate-800/60 text-slate-400">
            <span className="flex items-center gap-1.5 flex-wrap">
              <Filter className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
              <span>
                กำลังกรอง: พบ <strong>{filteredTransactions.length}</strong> รายการ
                {statusFilter === 'pending' && ' • รอชำระ'}
                {statusFilter === 'paid' && ' • ชำระแล้ว'}
                {statusFilter === 'installment' && ' • รายการผ่อน 0%'}
                {monthFilter !== 'all' && ` • รอบ ${formatThaiMonth(monthFilter)}`}
                {cardFilter !== 'all' && ` • ${cardMap.get(cardFilter)?.name || 'บัตร'}`}
                {tagFilter !== 'all' && ` • #${tagFilter}`}
              </span>
            </span>
            <button
              type="button"
              onClick={() => {
                setMonthFilter('all');
                setCardFilter('all');
                setCategoryFilter('all');
                setTagFilter('all');
                setStatusFilter('all');
                setSearchQuery('');
              }}
              className="text-xs text-indigo-400 hover:text-indigo-300 underline cursor-pointer shrink-0"
            >
              แสดงทั้งหมด
            </button>
          </div>
        )}
      </div>

      {/* Transactions List */}
      {filteredTransactions.length === 0 ? (
        <div className="p-12 text-center rounded-2xl bg-slate-900/40 border border-slate-800">
          <CardIcon className="w-10 h-10 text-slate-600 mx-auto mb-3" />
          <h3 className="text-sm font-semibold text-slate-300">
            {statusFilter === 'pending'
              ? 'ไม่พบรายการที่รอชำระ (ชำระแล้วทั้งหมด หรือยังไม่มีรายการ)'
              : 'ไม่พบรายการใช้จ่าย'}
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            {statusFilter === 'pending'
              ? 'คุณสามารถคลิกดูรายการที่ชำระแล้ว หรือเปลี่ยนตัวกรองเพื่อดูรายการอื่นๆ'
              : 'ลองปรับเปลี่ยนตัวกรอง หรือเพิ่มรายการใช้จ่ายบัตรเครดิตใหม่'}
          </p>
          <div className="flex items-center justify-center gap-2 mt-4 flex-wrap">
            {statusFilter === 'pending' && (
              <button
                type="button"
                onClick={() => setStatusFilter('all')}
                className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition cursor-pointer"
              >
                ดูรายการทั้งหมด (รวมที่ชำระแล้ว)
              </button>
            )}
            <button
              type="button"
              onClick={onOpenNewTxModal}
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition cursor-pointer"
            >
              เพิ่มรายการ
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredTransactions.map((tx) => {
            const card = cardMap.get(tx.cardId);
            const catInfo = CATEGORY_INFO[tx.category] || CATEGORY_INFO.other;
            const chargeAmount = tx.isInstallment && tx.monthlyInstallmentAmount
              ? tx.monthlyInstallmentAmount
              : tx.amount;

            return (
              <div
                key={tx.id}
                className="group p-3.5 sm:p-4 rounded-2xl bg-slate-900/80 hover:bg-slate-900 border border-slate-800/80 hover:border-slate-700 transition flex items-center justify-between gap-3"
              >
                {/* Left: Icon, Details */}
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={`w-10 h-10 rounded-xl ${catInfo.bg} flex items-center justify-center shrink-0 border border-white/5`}
                  >
                    {renderCategoryIcon(tx.category)}
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="text-sm font-semibold text-white truncate max-w-[200px] sm:max-w-md">
                        {tx.title}
                      </h4>
                      {tx.isInstallment && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onOpenInstallmentModal?.();
                          }}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-amber-500/10 text-amber-300 border border-amber-500/20 hover:bg-amber-500/25 transition cursor-pointer"
                          title="คลิกเพื่อดูตารางผ่อนชำระทุกงวด"
                        >
                          <Layers className="w-3 h-3 text-amber-400" />
                          <span>ผ่อน {tx.totalInstallments} ด. (งวด {tx.currentInstallment || 1})</span>
                        </button>
                      )}
                    </div>

                    <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5 flex-wrap">
                      <span>{formatThaiDate(tx.date)}</span>
                      <span>•</span>
                      {card && (
                        <span className="font-medium text-slate-300">
                          {card.name} (•••• {card.last4})
                        </span>
                      )}
                      <span>•</span>
                      <span className="inline-flex items-center gap-1.5 text-slate-400">
                        <span
                          className="w-1.5 h-1.5 rounded-full shrink-0 shadow-sm"
                          style={{ backgroundColor: catInfo.hexColor }}
                        />
                        <span>{catInfo.label}</span>
                      </span>
                      {tx.note && (
                        <>
                          <span>•</span>
                          <span className="text-slate-400 italic truncate max-w-[150px]">
                            {tx.note}
                          </span>
                        </>
                      )}
                    </div>

                    {/* Tag badges */}
                    {tx.tags && tx.tags.length > 0 && (
                      <div className="flex items-center gap-1.5 flex-wrap mt-1.5">
                        {tx.tags.map((tg) => (
                          <button
                            key={tg}
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setTagFilter(tagFilter === tg ? 'all' : tg);
                            }}
                            className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-medium border transition cursor-pointer ${
                              tagFilter === tg
                                ? 'bg-indigo-600 border-indigo-500 text-white'
                                : 'bg-slate-800/80 border-slate-700/60 text-indigo-300 hover:border-indigo-500'
                            }`}
                            title={`กรองเฉพาะแท็ก #${tg}`}
                          >
                            #{tg}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Right: Amount & Status & Actions */}
                <div className="flex items-center gap-3 shrink-0">
                  <div className="text-right">
                    <div className="text-base sm:text-lg font-bold text-white tracking-tight">
                      {formatThaiCurrency(chargeAmount)}
                    </div>
                    {tx.isInstallment && (
                      <div className="text-[10px] text-slate-400">
                        ยอดเต็ม {formatThaiCurrency(tx.amount)}
                      </div>
                    )}
                  </div>

                  {/* Toggle Paid Button */}
                  <button
                    type="button"
                    onClick={() => onTogglePaid(tx.id)}
                    className={`px-2.5 py-1.5 rounded-xl text-xs font-medium border transition flex items-center gap-1 cursor-pointer ${
                      tx.isPaid
                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20'
                        : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
                    }`}
                    title={tx.isPaid ? 'คลิกเพื่อเปลี่ยนเป็นยังไม่ชำระ' : 'คลิกเพื่อเปลี่ยนเป็นชำระแล้ว'}
                  >
                    {tx.isPaid ? (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="hidden sm:inline">ชำระแล้ว</span>
                      </>
                    ) : (
                      <>
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        <span className="hidden sm:inline">รอชำระ</span>
                      </>
                    )}
                  </button>

                  {/* Actions (Edit / Delete) */}
                  <div className="flex items-center gap-1 opacity-70 group-hover:opacity-100 transition">
                    <button
                      type="button"
                      onClick={() => onEditTransaction(tx)}
                      className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition cursor-pointer"
                      title="แก้ไข"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onDeleteTransaction(tx)}
                      className="p-1.5 text-slate-400 hover:text-rose-400 rounded-lg hover:bg-slate-800 transition cursor-pointer"
                      title="ลบรายการ"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
