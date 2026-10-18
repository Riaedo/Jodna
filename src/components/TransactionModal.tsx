import React, { useState, useEffect, useMemo } from 'react';
import { Transaction, CreditCard, TransactionCategory } from '../types';
import {
  CATEGORY_INFO,
  PRESET_TAGS,
  calculateBillingCycle,
  getFrequentlyUsedTitlesFromHistory,
  FrequentUserItem,
} from '../utils/cardUtils';
import {
  X,
  Layers,
  Calendar,
  Tag,
  Plus,
  CreditCard as CardIcon,
  Clock,
} from 'lucide-react';

interface TransactionModalProps {
  isOpen: boolean;
  initialData?: Transaction | null;
  cards: CreditCard[];
  existingTransactions?: Transaction[];
  onClose: () => void;
  onSave: (
    txData: Omit<Transaction, 'id' | 'createdAt'> & { id?: string; installmentGroupId?: string },
    options?: { autoGenerateRemaining?: boolean; updateEntireSeries?: boolean }
  ) => void;
}

export const TransactionModal: React.FC<TransactionModalProps> = ({
  isOpen,
  initialData,
  cards,
  existingTransactions = [],
  onClose,
  onSave,
}) => {
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState<string>('');
  const [cardId, setCardId] = useState<string>(cards[0]?.id || '');
  const [category, setCategory] = useState<TransactionCategory>('food');
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [tags, setTags] = useState<string[]>([]);
  const [newTagInput, setNewTagInput] = useState('');
  const [isInstallment, setIsInstallment] = useState(false);
  const [totalInstallments, setTotalInstallments] = useState<number | string>(10);
  const [currentInstallment, setCurrentInstallment] = useState<number | string>(1);
  const [autoGenerateRemaining, setAutoGenerateRemaining] = useState(true);
  const [updateEntireSeries, setUpdateEntireSeries] = useState(false);
  const [note, setNote] = useState('');
  const [isPaid, setIsPaid] = useState(false);

  useEffect(() => {
    if (initialData) {
      setTitle(initialData.title);
      setAmount(initialData.amount.toString());
      setCardId(initialData.cardId);
      setCategory(initialData.category);
      setDate(initialData.date);
      setTags(initialData.tags || []);
      setNewTagInput('');
      setIsInstallment(initialData.isInstallment || false);
      setTotalInstallments(initialData.totalInstallments || 10);
      setCurrentInstallment(initialData.currentInstallment || 1);
      setAutoGenerateRemaining(false);
      setUpdateEntireSeries(false);
      setNote(initialData.note || '');
      setIsPaid(initialData.isPaid || false);
    } else {
      setTitle('');
      setAmount('');
      setCardId(cards[0]?.id || '');
      setCategory('food');
      setDate(new Date().toISOString().split('T')[0]);
      setTags([]);
      setNewTagInput('');
      setIsInstallment(false);
      setTotalInstallments(10);
      setCurrentInstallment(1);
      setAutoGenerateRemaining(true);
      setUpdateEntireSeries(false);
      setNote('');
      setIsPaid(false);
    }
  }, [initialData, isOpen, cards]);

  const selectedCard = cards.find((c) => c.id === cardId);
  const numAmount = parseFloat(amount) || 0;

  const parsedTotal = typeof totalInstallments === 'number'
    ? totalInstallments
    : parseInt(totalInstallments || '0', 10);
  const effectiveTotal = Math.max(1, parsedTotal || 1);

  const parsedCurrent = typeof currentInstallment === 'number'
    ? currentInstallment
    : parseInt(currentInstallment || '0', 10);
  const effectiveCurrent = Math.max(1, Math.min(parsedCurrent || 1, effectiveTotal));

  const monthlyInstallment = isInstallment && effectiveTotal > 0
    ? Math.round((numAmount / effectiveTotal) * 100) / 100
    : numAmount;

  // Compute billing cycle
  const billingCycleMonth = selectedCard
    ? calculateBillingCycle(date, selectedCard.billingCutoffDay)
    : date.slice(0, 7);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || numAmount <= 0 || !cardId) return;

    onSave(
      {
        id: initialData?.id,
        installmentGroupId: initialData?.installmentGroupId,
        title: title.trim(),
        amount: numAmount,
        cardId,
        category,
        tags: tags.length > 0 ? tags : undefined,
        date,
        billingCycleMonth,
        isInstallment,
        totalInstallments: isInstallment ? effectiveTotal : undefined,
        currentInstallment: isInstallment ? effectiveCurrent : undefined,
        monthlyInstallmentAmount: isInstallment ? monthlyInstallment : undefined,
        note: note.trim() || undefined,
        isPaid,
      },
      {
        autoGenerateRemaining: isInstallment ? autoGenerateRemaining : false,
        updateEntireSeries: isInstallment && Boolean(initialData?.installmentGroupId) ? updateEntireSeries : false,
      }
    );
    onClose();
  };

  const handleToggleTag = (tagText: string) => {
    if (tags.includes(tagText)) {
      setTags(tags.filter((t) => t !== tagText));
    } else {
      setTags([...tags, tagText]);
    }
  };

  const handleAddCustomTag = (e: React.KeyboardEvent | React.MouseEvent) => {
    if ('key' in e && e.key !== 'Enter') return;
    e.preventDefault();
    const trimmed = newTagInput.trim().replace(/^#/, '');
    if (trimmed && !tags.includes(trimmed)) {
      setTags([...tags, trimmed]);
      setNewTagInput('');
    }
  };

  // User's frequent titles from past transaction history ONLY (excluding installments, max 8 items)
  const historyFrequentItems = useMemo(() => {
    return getFrequentlyUsedTitlesFromHistory(existingTransactions, 8);
  }, [existingTransactions]);

  // Datalist options for native autocomplete from history ONLY
  const allDatalistOptions = useMemo(() => {
    return historyFrequentItems.map((h) => h.title);
  }, [historyFrequentItems]);

  const handleSelectHistoryItem = (item: FrequentUserItem) => {
    setTitle(item.title);
    if (item.category) {
      setCategory(item.category);
    }
    if (item.tags && item.tags.length > 0) {
      setTags((prev) => {
        const merged = new Set([...prev, ...item.tags!]);
        return Array.from(merged);
      });
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl max-w-lg w-full p-6 shadow-2xl text-slate-100 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <CardIcon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white tracking-tight">
                {initialData ? 'แก้ไขรายการใช้จ่าย' : 'บันทึกรายการใช้จ่ายบัตรเครดิต'}
              </h3>
              <p className="text-xs text-slate-400">
                รอบบิลจะถูกคำนวณอัตโนมัติตามวันตัดรอบของบัตร
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {/* Title with Frequently Used Items Selector from History ONLY */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-semibold text-slate-300">
                ชื่อรายการ / ร้านค้า / วัตถุประสงค์ <span className="text-rose-400">*</span>
              </label>
            </div>

            <input
              type="text"
              required
              list="frequent-expense-history"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="เช่น 7-Eleven, Tops Market, เติมน้ำมัน, Shopee"
              className="w-full px-3.5 py-2.5 bg-slate-800/80 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition"
            />
            <datalist id="frequent-expense-history">
              {allDatalistOptions.map((opt) => (
                <option key={opt} value={opt} />
              ))}
            </datalist>

            {/* Quick-select chips: Derived ONLY from transaction history */}
            {historyFrequentItems.length > 0 ? (
              <div className="mt-2 space-y-1.5">
                <div className="flex items-center justify-between text-[11px] text-slate-400">
                  <span className="flex items-center gap-1.5 text-slate-300 font-medium">
                    <Clock className="w-3 h-3 text-amber-400" />
                    <span>รายการที่ใช้บ่อยจากประวัติ:</span>
                  </span>
                  <span className="text-[10px] text-slate-400">คลิกเพื่อเลือกทันที</span>
                </div>

                <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pr-0.5">
                  {historyFrequentItems.map((item) => {
                    const isMatched = title.trim().toLowerCase() === item.title.toLowerCase();
                    const itemCatInfo = item.category ? CATEGORY_INFO[item.category] : null;
                    return (
                      <button
                        key={item.title}
                        type="button"
                        onClick={() => handleSelectHistoryItem(item)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition flex items-center gap-1.5 cursor-pointer ${
                          isMatched
                            ? 'bg-indigo-600/30 border-indigo-500 text-white shadow-sm ring-1 ring-indigo-500/50'
                            : 'bg-slate-800/80 border-slate-700/70 text-slate-300 hover:bg-slate-700 hover:text-white hover:border-slate-600'
                        }`}
                      >
                        {itemCatInfo && (
                          <span
                            className="w-2 h-2 rounded-full shrink-0 shadow-sm"
                            style={{ backgroundColor: itemCatInfo.hexColor }}
                          />
                        )}
                        <span className="truncate max-w-[170px]">{item.title}</span>
                        {item.count > 1 && (
                          <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-700 text-amber-300/90 font-mono">
                            {item.count} ครั้ง
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : (
              <p className="mt-1.5 text-[11px] text-slate-500 flex items-center gap-1">
                <Clock className="w-3 h-3 text-slate-500 shrink-0" />
                <span>จะแสดงรายการที่ใช้บ่อยจากประวัติการใช้จ่ายของคุณที่นี่โดยอัตโนมัติ</span>
              </p>
            )}
          </div>

          {/* Amount & Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                จำนวนเงิน (บาท) <span className="text-rose-400">*</span>
              </label>
              <input
                type="number"
                step="any"
                min="0.01"
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="w-full px-3.5 py-2.5 bg-slate-800/80 border border-slate-700 rounded-xl text-sm font-semibold text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                วันที่ทำรายการ <span className="text-rose-400">*</span>
              </label>
              <div className="relative">
                <input
                  type="date"
                  required
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-800/80 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-indigo-500 transition cursor-pointer"
                />
              </div>
            </div>
          </div>

          {/* Card Selection */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              เลือกบัตรเครดิตที่ใช้ <span className="text-rose-400">*</span>
            </label>
            <select
              value={cardId}
              onChange={(e) => setCardId(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-800/80 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-indigo-500 transition cursor-pointer"
            >
              {cards.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.bank} •••• {c.last4}) - ตัดรอบวันที่ {c.billingCutoffDay}
                </option>
              ))}
            </select>
            {selectedCard && (
              <p className="text-[11px] text-indigo-300/80 mt-1">
                รอบบิลคำนวณได้: {billingCycleMonth} (ตัดรอบทุกวันที่ {selectedCard.billingCutoffDay}, กำหนดชำระวันที่ {selectedCard.paymentDueDay})
              </p>
            )}
          </div>

          {/* Category */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              หมวดหมู่ค่าใช้จ่าย
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {(Object.keys(CATEGORY_INFO) as TransactionCategory[]).map((cat) => {
                const info = CATEGORY_INFO[cat];
                const isSelected = category === cat;
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setCategory(cat)}
                    className={`p-2 rounded-xl text-xs font-medium border text-left transition flex items-center gap-2 cursor-pointer ${
                      isSelected
                        ? 'bg-indigo-600/20 border-indigo-500 text-white shadow-sm ring-1 ring-indigo-500/50'
                        : 'bg-slate-800/50 border-slate-700/60 text-slate-300 hover:text-white hover:bg-slate-800'
                    }`}
                  >
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0 shadow-sm"
                      style={{ backgroundColor: info.hexColor }}
                    />
                    <span className="truncate">{info.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Category Tagging System */}
          <div className="space-y-2 p-3.5 rounded-xl bg-slate-800/40 border border-slate-700/60">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-indigo-400" />
                <span>แท็กกำกับรายการ (Category Tags)</span>
              </label>
              <span className="text-[11px] text-slate-400">เลือกได้หลายแท็ก</span>
            </div>

            {/* Selected Tags Display */}
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-1 pb-1">
                {tags.map((tagItem) => (
                  <span
                    key={tagItem}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-indigo-500/20 text-indigo-300 border border-indigo-500/30"
                  >
                    <span>#{tagItem}</span>
                    <button
                      type="button"
                      onClick={() => handleToggleTag(tagItem)}
                      className="p-0.5 hover:text-white rounded transition cursor-pointer"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}

            {/* Preset Tags Suggestions */}
            <div className="flex flex-wrap gap-1.5 pt-1">
              {PRESET_TAGS.map((preset) => {
                const isSelected = tags.includes(preset);
                return (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => handleToggleTag(preset)}
                    className={`px-2 py-0.5 rounded-md text-[11px] font-medium transition cursor-pointer border ${
                      isSelected
                        ? 'bg-indigo-600 border-indigo-500 text-white shadow-sm'
                        : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-slate-200 hover:bg-slate-750'
                    }`}
                  >
                    #{preset}
                  </button>
                );
              })}
            </div>

            {/* Custom Tag Input */}
            <div className="flex items-center gap-2 pt-1.5">
              <input
                type="text"
                value={newTagInput}
                onChange={(e) => setNewTagInput(e.target.value)}
                onKeyDown={handleAddCustomTag}
                placeholder="พิมพ์แท็กใหม่ เช่น ท่องเที่ยวญี่ปุ่น, ของแต่งบ้าน..."
                className="flex-1 px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition"
              />
              <button
                type="button"
                onClick={handleAddCustomTag}
                disabled={!newTagInput.trim()}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-700 hover:bg-slate-600 disabled:opacity-40 text-slate-200 transition flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                เพิ่ม
              </button>
            </div>
          </div>

          {/* Installment Options */}
          <div className="p-3.5 rounded-xl bg-slate-800/50 border border-slate-700/60 space-y-3">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={isInstallment}
                onChange={(e) => setIsInstallment(e.target.checked)}
                className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 bg-slate-700 border-slate-600"
              />
              <span className="text-xs font-semibold text-slate-200 flex items-center gap-1">
                <Layers className="w-3.5 h-3.5 text-amber-400" />
                ผ่อนชำระ 0% / รายเดือน
              </span>
            </label>

            {isInstallment && (
              <div className="space-y-3 pt-2 border-t border-slate-700/50">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Total Installments - Free input with quick presets */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-[11px] font-semibold text-slate-300">
                        จำนวนงวดทั้งหมด (เดือน) <span className="text-rose-400">*</span>
                      </label>
                      <span className="text-[10px] text-amber-400/90 font-medium">
                        ใส่อิสระได้ทุกเดือน
                      </span>
                    </div>
                    <div className="relative">
                      <input
                        type="number"
                        min="1"
                        max="240"
                        value={totalInstallments}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val === '') {
                            setTotalInstallments('');
                          } else {
                            const num = parseInt(val, 10);
                            if (!isNaN(num)) {
                              setTotalInstallments(Math.max(1, num));
                              if (Number(currentInstallment) > num) {
                                setCurrentInstallment(num);
                              }
                            }
                          }
                        }}
                        onBlur={() => {
                          if (!totalInstallments || Number(totalInstallments) < 1) {
                            setTotalInstallments(1);
                          }
                        }}
                        placeholder="เช่น 3, 6, 10, 18, 36..."
                        className="w-full px-3 py-2 pr-12 bg-slate-800 border border-slate-700 rounded-xl text-sm font-semibold text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-slate-400 pointer-events-none">
                        เดือน
                      </span>
                    </div>

                    {/* Quick presets */}
                    <div className="flex items-center gap-1.5 flex-wrap mt-2">
                      <span className="text-[10px] text-slate-400">ปุ่มลัด:</span>
                      {[3, 4, 6, 10, 12, 18, 24, 36].map((m) => (
                        <button
                          key={m}
                          type="button"
                          onClick={() => {
                            setTotalInstallments(m);
                            if (Number(currentInstallment) > m) {
                              setCurrentInstallment(m);
                            }
                          }}
                          className={`px-2 py-0.5 rounded text-[11px] font-medium transition cursor-pointer border ${
                            Number(totalInstallments) === m
                              ? 'bg-amber-500/20 border-amber-500 text-amber-300 font-bold'
                              : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white hover:bg-slate-700'
                          }`}
                        >
                          {m} ด.
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Current Installment */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-[11px] font-semibold text-slate-300">
                        งวดปัจจุบัน <span className="text-rose-400">*</span>
                      </label>
                      <span className="text-[10px] text-slate-400">
                        เริ่มต้นงวดที่
                      </span>
                    </div>
                    <div className="relative">
                      <input
                        type="number"
                        min="1"
                        max={effectiveTotal}
                        value={currentInstallment}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val === '') {
                            setCurrentInstallment('');
                          } else {
                            const num = parseInt(val, 10);
                            if (!isNaN(num)) {
                              setCurrentInstallment(Math.max(1, Math.min(num, effectiveTotal)));
                            }
                          }
                        }}
                        onBlur={() => {
                          if (!currentInstallment || Number(currentInstallment) < 1) {
                            setCurrentInstallment(1);
                          }
                        }}
                        className="w-full px-3 py-2 pr-16 bg-slate-800 border border-slate-700 rounded-xl text-sm font-semibold text-white focus:outline-none focus:border-indigo-500 transition"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-slate-400 pointer-events-none">
                        / {effectiveTotal} งวด
                      </span>
                    </div>

                    {/* Quick current installment presets */}
                    <div className="flex items-center gap-1.5 flex-wrap mt-2">
                      <span className="text-[10px] text-slate-400">เริ่มต้นที่:</span>
                      {[1, 2, 3].filter((n) => n <= effectiveTotal).map((inst) => (
                        <button
                          key={inst}
                          type="button"
                          onClick={() => setCurrentInstallment(inst)}
                          className={`px-2 py-0.5 rounded text-[11px] font-medium transition cursor-pointer border ${
                            Number(currentInstallment) === inst
                              ? 'bg-indigo-500/20 border-indigo-500 text-indigo-300 font-bold'
                              : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white hover:bg-slate-750'
                          }`}
                        >
                          งวด {inst}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="text-xs text-amber-300/90 font-medium bg-amber-500/10 p-2.5 rounded-xl border border-amber-500/20 flex flex-wrap items-center justify-between gap-2">
                  <span>
                    ยอดเรียกเก็บต่องวด: <strong className="text-white text-sm">{monthlyInstallment.toLocaleString('th-TH')} บาท</strong>
                  </span>
                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-semibold border border-amber-500/30">
                    งวดที่ {effectiveCurrent} จากทั้งหมด {effectiveTotal} งวด
                  </span>
                </div>

                {!initialData ? (
                  <div className="pt-2 border-t border-slate-700/50 space-y-1">
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={autoGenerateRemaining}
                        onChange={(e) => setAutoGenerateRemaining(e.target.checked)}
                        className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 bg-slate-700 border-slate-600 cursor-pointer"
                      />
                      <span className="text-xs font-semibold text-indigo-300">
                        ให้รายการผ่อนชำระ ปรากฏในรอบบิลถัดไปโดยอัตโนมัติ
                      </span>
                    </label>
                    {autoGenerateRemaining && (
                      <p className="text-[11px] text-slate-400 pl-6 leading-relaxed">
                        ระบบจะสร้างรายการยอดละ {monthlyInstallment.toLocaleString('th-TH')} บาท บันทึกลงในรอบบิลถัดไปจนครบงวดที่ {effectiveTotal} อัตโนมัติ
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="pt-2 border-t border-slate-700/50 space-y-2">
                    {initialData.installmentGroupId && (
                      <label className="flex items-center gap-2 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={updateEntireSeries}
                          onChange={(e) => setUpdateEntireSeries(e.target.checked)}
                          className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 bg-slate-700 border-slate-600 cursor-pointer"
                        />
                        <span className="text-xs font-semibold text-indigo-300">
                          อัปเดตข้อมูลทุกงวดในแผนนี้ ({effectiveTotal} งวด)
                        </span>
                      </label>
                    )}
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={autoGenerateRemaining}
                        onChange={(e) => setAutoGenerateRemaining(e.target.checked)}
                        className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 bg-slate-700 border-slate-600 cursor-pointer"
                      />
                      <span className="text-xs font-semibold text-amber-300">
                        สร้างงวดถัดไปที่ยังไม่มีในระบบให้ครบ {effectiveTotal} งวดอัตโนมัติ
                      </span>
                    </label>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Note */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              หมายเหตุเพิ่มเติม (ถ้ามี)
            </label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="เช่น มี cash back 1%, ใช้คะแนนแลกส่วนลด, สลิปเก็บในกระเป๋า"
              className="w-full px-3.5 py-2.5 bg-slate-800/80 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition"
            />
          </div>

          {/* Payment Status Checkbox */}
          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="isPaidCheckbox"
              checked={isPaid}
              onChange={(e) => setIsPaid(e.target.checked)}
              className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 bg-slate-700 border-slate-600 cursor-pointer"
            />
            <label htmlFor="isPaidCheckbox" className="text-xs text-slate-300 cursor-pointer">
              ทำเครื่องหมายว่าชำระยอดรายการนี้แล้ว
            </label>
          </div>

          {/* Action Buttons */}
          <div className="mt-6 flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-sm font-medium text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl text-sm font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/30 transition cursor-pointer"
            >
              {initialData ? 'บันทึกการแก้ไข' : 'บันทึกรายการ'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
