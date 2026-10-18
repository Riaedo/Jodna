import React, { useMemo } from 'react';
import { MonthlyStats, CreditCard, Transaction, TransactionCategory } from '../types';
import {
  formatThaiCurrency,
  formatThaiMonth,
  getMonthlyCardBillingDetails,
} from '../utils/cardUtils';
import { CategoryPieChart } from './CategoryPieChart';
import {
  Wallet,
  Clock,
  CheckCircle2,
  PieChart,
  Layers,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  Calendar,
  CreditCard as CardIcon,
  Check,
  Undo2,
  Info,
} from 'lucide-react';

interface MonthlySummaryProps {
  currentMonth: string; // YYYY-MM
  availableMonths: string[];
  onChangeMonth: (month: string) => void;
  stats: MonthlyStats;
  cards: CreditCard[];
  transactions: Transaction[];
  installmentCount: number;
  totalInstallmentMonthly: number;
  selectedCategory?: TransactionCategory | null;
  onSelectCategory?: (category: TransactionCategory | null) => void;
  onOpenInstallmentModal?: () => void;
  onMarkMonthPaid?: (cycleMonth: string) => void;
  onUnmarkMonthPaid?: (cycleMonth: string) => void;
  onMarkCardPaid?: (cardId: string, cycleMonth: string) => void;
  onUnmarkCardPaid?: (cardId: string, cycleMonth: string) => void;
}

export const MonthlySummary: React.FC<MonthlySummaryProps> = ({
  currentMonth,
  availableMonths,
  onChangeMonth,
  stats,
  cards,
  transactions,
  installmentCount,
  totalInstallmentMonthly,
  selectedCategory,
  onSelectCategory,
  onOpenInstallmentModal,
  onMarkMonthPaid,
  onUnmarkMonthPaid,
  onMarkCardPaid,
  onUnmarkCardPaid,
}) => {
  // Compute detailed per-card billing breakdown based on each card's cutoff day
  const cardBillingDetails = useMemo(() => {
    return getMonthlyCardBillingDetails(cards, transactions, currentMonth);
  }, [cards, transactions, currentMonth]);

  // Month navigation
  const currentIndex = availableMonths.indexOf(currentMonth);
  const handlePrevMonth = () => {
    if (currentIndex < availableMonths.length - 1) {
      onChangeMonth(availableMonths[currentIndex + 1]);
    }
  };
  const handleNextMonth = () => {
    if (currentIndex > 0) {
      onChangeMonth(availableMonths[currentIndex - 1]);
    }
  };

  const isAllMonthPaid = stats.totalSpent > 0 && stats.totalPending === 0;

  return (
    <div className="space-y-4">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 shrink-0">
            <PieChart className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-lg font-bold text-white tracking-tight">สรุปยอดใช้จ่ายรายเดือน</h2>
              <span className="px-2 py-0.5 text-[11px] font-medium rounded-full bg-indigo-500/15 text-indigo-300 border border-indigo-500/25">
                คำนวณตามวันตัดรอบบิล
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              รวมยอดตามรอบบิลของแต่ละบัตรเครดิต ประจำรอบเดือน {formatThaiMonth(currentMonth)}
            </p>
          </div>
        </div>

        {/* Action Buttons: Month Picker & "Mark as Paid for this Month" */}
        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
          {/* Quick Pay Month Button */}
          {stats.totalPending > 0 && onMarkMonthPaid && (
            <button
              type="button"
              onClick={() => onMarkMonthPaid(currentMonth)}
              className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-md shadow-emerald-950/40 border border-emerald-400/30 transition-all active:scale-95 cursor-pointer"
              title="บันทึกว่าจ่ายยอดรอบเดือนนี้แล้วทั้งหมด"
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-200" />
              <span>จ่ายแล้วในรอบนี้ ({formatThaiCurrency(stats.totalPending)})</span>
            </button>
          )}

          {isAllMonthPaid && onUnmarkMonthPaid && (
            <div className="flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/25 px-2.5 py-1.5 rounded-xl">
              <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span className="text-xs font-semibold text-emerald-300">ชำระครบแล้ว</span>
              <button
                type="button"
                onClick={() => onUnmarkMonthPaid(currentMonth)}
                className="text-[10px] text-slate-400 hover:text-rose-400 hover:underline ml-1 cursor-pointer"
                title="ยกเลิกสถานะชำระแล้วของเดือนนี้"
              >
                (ยกเลิก)
              </button>
            </div>
          )}

          {/* Month Picker Control */}
          <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 rounded-xl p-1">
            <button
              type="button"
              onClick={handlePrevMonth}
              disabled={currentIndex >= availableMonths.length - 1}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 disabled:opacity-30 disabled:hover:bg-transparent transition cursor-pointer"
              title="เดือนก่อนหน้า"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <select
              value={currentMonth}
              onChange={(e) => onChangeMonth(e.target.value)}
              className="bg-transparent text-sm font-semibold text-slate-200 focus:outline-none px-2 py-1 cursor-pointer"
            >
              {availableMonths.map((m) => (
                <option key={m} value={m} className="bg-slate-900 text-slate-200">
                  {formatThaiMonth(m)}
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={handleNextMonth}
              disabled={currentIndex <= 0}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 disabled:opacity-30 disabled:hover:bg-transparent transition cursor-pointer"
              title="เดือนถัดไป"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Billing Cycle Calculation Explanation Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-2.5 p-3 rounded-xl bg-slate-900/70 border border-indigo-500/20 text-xs text-slate-300 backdrop-blur-sm">
        <div className="flex items-start md:items-center gap-2">
          <Calendar className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5 md:mt-0" />
          <span>
            <strong className="text-white font-semibold">การคำนวณรอบบิล:</strong> คำนวณจากวันตัดรอบบิลของแต่ละบัตร ({cards.length} ใบ) แล้วนำมารวมเป็นยอดเรียกเก็บประจำรอบเดือน {formatThaiMonth(currentMonth)}
          </span>
        </div>
        <div className="flex items-center gap-2 text-[11px] text-slate-400 pl-6 md:pl-0">
          <Info className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
          <span>ยอดตรงตามใบแจ้งหนี้จริงของแต่ละธนาคาร</span>
        </div>
      </div>

      {/* 4 Stat Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Total Spend */}
        <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800/80 hover:border-slate-700 transition">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium">ยอดใช้จ่ายรวม</span>
            <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-400">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-bold text-white tracking-tight">
            {formatThaiCurrency(stats.totalSpent)}
          </div>
          <div className="mt-2 flex items-center gap-1 text-[11px] text-slate-400">
            <TrendingUp className="w-3 h-3 text-indigo-400" />
            <span>รอบบิล {formatThaiMonth(currentMonth)}</span>
          </div>
        </div>

        {/* Due / Pending */}
        <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800/80 hover:border-slate-700 transition relative overflow-hidden group">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium">ยอดที่ต้องชำระ (ค้างจ่าย)</span>
            <div className="p-1.5 rounded-lg bg-rose-500/10 text-rose-400">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-bold text-rose-300 tracking-tight">
            {formatThaiCurrency(stats.totalPending)}
          </div>
          <div className="mt-2 flex items-center justify-between gap-1 text-[11px]">
            {stats.totalPending === 0 ? (
              <span className="text-emerald-400 flex items-center gap-1 font-medium">
                <CheckCircle2 className="w-3.5 h-3.5" /> ชำระครบแล้ว
              </span>
            ) : (
              <>
                <span className="text-slate-400">รอการชำระเงิน</span>
                {onMarkMonthPaid && (
                  <button
                    type="button"
                    onClick={() => onMarkMonthPaid(currentMonth)}
                    className="text-emerald-400 hover:text-emerald-300 hover:underline font-semibold flex items-center gap-0.5 cursor-pointer"
                  >
                    จ่ายแล้ว <ChevronRight className="w-3 h-3" />
                  </button>
                )}
              </>
            )}
          </div>
        </div>

        {/* Paid Amount */}
        <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800/80 hover:border-slate-700 transition">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium">ชำระแล้ว</span>
            <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-bold text-emerald-400 tracking-tight">
            {formatThaiCurrency(stats.totalPaid)}
          </div>
          <div className="mt-2 text-[11px] text-slate-400">
            {stats.totalSpent > 0
              ? `ชำระแล้ว ${Math.round((stats.totalPaid / stats.totalSpent) * 100)}%`
              : 'ยังไม่มียอด'}
          </div>
        </div>

        {/* Installments in this month */}
        <div
          onClick={onOpenInstallmentModal}
          className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800/80 hover:border-amber-500/40 hover:bg-slate-900/90 transition cursor-pointer group"
          title="คลิกเพื่อดูตารางผ่อนชำระทุกรอบบิล"
        >
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium group-hover:text-amber-300 transition">
              ผ่อนชำระ 0% รอบนี้
            </span>
            <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400 group-hover:bg-amber-500/20 transition">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-bold text-amber-300 tracking-tight">
            {formatThaiCurrency(totalInstallmentMonthly)}
          </div>
          <div className="mt-2 text-[11px] text-slate-400 flex items-center justify-between">
            <span>{installmentCount} รายการผ่อน</span>
            {onOpenInstallmentModal && (
              <span className="text-amber-400/90 hover:underline flex items-center gap-0.5 text-[10px] font-medium">
                ดูตารางผ่อนทุกงวด <ChevronRight className="w-3 h-3" />
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Visual Breakdowns: Category & Card Share with Billing Cycles in Balanced Horizontal Layout */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-4 items-stretch">
        {/* Category Pie Chart Summary (5 cols on large screens, balanced height) */}
        <div className="lg:col-span-5 flex flex-col">
          <CategoryPieChart
            categoryBreakdown={stats.categoryBreakdown}
            totalSpent={stats.totalSpent}
            selectedCategory={selectedCategory}
            onSelectCategory={onSelectCategory}
            title="สัดส่วนค่าใช้จ่ายตามหมวดหมู่"
            subtitle={`รอบบิล ${formatThaiMonth(currentMonth)}`}
          />
        </div>

        {/* Card Breakdown with Billing Cycles & Individual "จ่ายแล้ว" Buttons (7 cols on large screens) */}
        <div className="lg:col-span-7 p-5 rounded-2xl bg-slate-900/80 border border-slate-800/80 flex flex-col justify-between h-full">
          <div>
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <CardIcon className="w-4 h-4 text-indigo-400" />
                <span>ยอดใช้จ่ายแยกตามรอบตัดบิลแต่ละบัตร</span>
              </h3>
              <span className="text-xs font-medium text-slate-400">
                {cards.length} บัตร
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mb-3.5">
              คำนวณจากวันตัดรอบบิลของแต่ละบัตร แล้วนำมารวมในรอบเดือน {formatThaiMonth(currentMonth)}
            </p>

            {/* 2-column horizontal grid for cards so height balances with the pie chart */}
            <div className={`grid gap-2.5 ${cardBillingDetails.length > 1 ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1'}`}>
              {cardBillingDetails.map((detail, index) => {
                const { card, totalSpent, totalPending, installmentAmount, isPaid, cyclePeriod } = detail;
                const pct = stats.totalSpent > 0 ? Math.round((totalSpent / stats.totalSpent) * 100) : 0;
                // If odd number of cards and this is the last one, span 2 columns on sm screens
                const isOddLast = cardBillingDetails.length % 2 === 1 && index === cardBillingDetails.length - 1;

                return (
                  <div
                    key={card.id}
                    className={`p-3 rounded-xl bg-slate-800/50 border border-slate-700/60 hover:border-slate-600 transition flex flex-col justify-between gap-2 ${
                      isOddLast ? 'sm:col-span-2' : ''
                    }`}
                  >
                    {/* Card Title & Amount */}
                    <div className="flex items-start justify-between gap-1.5">
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-semibold text-white text-xs truncate max-w-[140px]" title={card.name}>
                            {card.name}
                          </span>
                          <span className="text-slate-400 text-[11px] shrink-0">(•••• {card.last4})</span>
                        </div>
                        <div className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5 flex-wrap">
                          <span className="text-indigo-300 font-medium bg-indigo-500/10 px-1.5 py-0.2 rounded text-[10px]">
                            {cyclePeriod.cutoffDayLabel}
                          </span>
                          <span className="text-slate-300 truncate">{cyclePeriod.periodLabel}</span>
                        </div>
                      </div>

                      {/* Amount & Percentage */}
                      <div className="text-right shrink-0">
                        <div className="font-bold text-white text-xs sm:text-sm">
                          {formatThaiCurrency(totalSpent)}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {pct}% ของยอดรวม
                        </div>
                      </div>
                    </div>

                    {/* Due Date & Installment info */}
                    <div className="flex flex-wrap items-center justify-between text-[10px] pt-1 border-t border-slate-800/80 gap-1">
                      <div className="text-slate-400 flex items-center gap-1 truncate">
                        <span>ครบกำหนด:</span>
                        <span className="text-amber-300 font-medium">{cyclePeriod.dueDateLabel}</span>
                      </div>

                      {/* Payment Status & Quick "จ่ายแล้ว" Action Button for this card */}
                      <div className="flex items-center gap-1.5 shrink-0">
                        {totalSpent === 0 ? (
                          <span className="text-slate-500 text-[10px] italic">ไม่มีรายการ</span>
                        ) : !isPaid && totalPending > 0 ? (
                          <div className="flex items-center gap-1">
                            <span className="text-rose-400 font-semibold text-[10px]">
                              ค้าง {formatThaiCurrency(totalPending)}
                            </span>
                            {onMarkCardPaid && (
                              <button
                                type="button"
                                onClick={() => onMarkCardPaid(card.id, currentMonth)}
                                className="px-2 py-0.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-medium flex items-center gap-1 shadow-sm transition active:scale-95 cursor-pointer"
                                title={`บันทึกว่าจ่ายยอดรอบนี้ของ ${card.name} แล้ว`}
                              >
                                <CheckCircle2 className="w-3 h-3 text-emerald-200" />
                                <span>จ่ายแล้ว</span>
                              </button>
                            )}
                          </div>
                        ) : (
                          <div className="flex items-center gap-1">
                            <span className="px-1.5 py-0.5 rounded-md bg-emerald-500/15 text-emerald-300 text-[10px] font-semibold flex items-center gap-0.5 border border-emerald-500/30">
                              <Check className="w-3 h-3 text-emerald-400" /> ชำระแล้ว
                            </span>
                            {onUnmarkCardPaid && (
                              <button
                                type="button"
                                onClick={() => onUnmarkCardPaid(card.id, currentMonth)}
                                className="text-[10px] text-slate-500 hover:text-rose-400 hover:underline cursor-pointer ml-0.5"
                                title="ยกเลิกสถานะชำระแล้วของบัตรนี้"
                              >
                                ยกเลิก
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full bg-slate-800 rounded-full h-1 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-cyan-400"
                        style={{ width: `${Math.min(100, pct)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Bottom Summary Note */}
          <div className="mt-3 pt-2.5 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
            <span>รวมทุกรอบบิลบัตรเครดิต</span>
            <span className="font-semibold text-slate-200">
              ยอดสุทธิ: {formatThaiCurrency(stats.totalSpent)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
