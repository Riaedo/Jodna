import React, { useState } from 'react';
import { Transaction, CreditCard } from '../types';
import {
  formatThaiCurrency,
  formatThaiDate,
  formatThaiMonth,
  CATEGORY_INFO,
  isFutureInstallmentHidden,
} from '../utils/cardUtils';
import {
  X,
  Layers,
  Calendar,
  CreditCard as CardIcon,
  CheckCircle2,
  Clock,
  ChevronRight,
  TrendingUp,
  AlertCircle,
  Plus,
  ExternalLink,
} from 'lucide-react';

interface InstallmentPlansModalProps {
  isOpen: boolean;
  onClose: () => void;
  transactions: Transaction[];
  cards: CreditCard[];
  onSelectMonth: (month: string) => void;
  onTogglePaid: (txId: string) => void;
  onOpenNewTxModal?: () => void;
}

export interface InstallmentPlanGroup {
  groupId: string;
  title: string;
  cardId: string;
  category: string;
  totalInstallments: number;
  monthlyAmount: number;
  totalAmount: number;
  paidCount: number;
  remainingCount: number;
  paidAmount: number;
  remainingAmount: number;
  items: Transaction[];
  firstCycleMonth: string;
  lastCycleMonth: string;
}

export const InstallmentPlansModal: React.FC<InstallmentPlansModalProps> = ({
  isOpen,
  onClose,
  transactions,
  cards,
  onSelectMonth,
  onTogglePaid,
  onOpenNewTxModal,
}) => {
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);

  if (!isOpen) return null;

  const cardMap = new Map(cards.map((c) => [c.id, c]));

  // Group all installment transactions
  const planGroupsMap = new Map<string, Transaction[]>();

  transactions.forEach((tx) => {
    if (tx.isInstallment && tx.totalInstallments && tx.totalInstallments > 0) {
      const key = tx.installmentGroupId || `plan-${tx.cardId}-${tx.title}-${tx.totalInstallments}`;
      const list = planGroupsMap.get(key) || [];
      list.push(tx);
      planGroupsMap.set(key, list);
    }
  });

  const planGroups: InstallmentPlanGroup[] = Array.from(planGroupsMap.entries()).map(
    ([groupId, items]) => {
      // Sort items by installment number ascending
      const sorted = [...items].sort(
        (a, b) => (a.currentInstallment || 1) - (b.currentInstallment || 1)
      );
      const sample = sorted[0];
      const totalInstallments = sample.totalInstallments || sorted.length;
      const monthlyAmount =
        sample.monthlyInstallmentAmount ||
        Math.round((sample.amount / totalInstallments) * 100) / 100;
      const totalAmount = sample.amount || monthlyAmount * totalInstallments;

      const paidCount = sorted.filter((t) => t.isPaid).length;
      const remainingCount = Math.max(0, totalInstallments - paidCount);
      const paidAmount = paidCount * monthlyAmount;
      const remainingAmount = remainingCount * monthlyAmount;

      return {
        groupId,
        title: sample.title,
        cardId: sample.cardId,
        category: sample.category,
        totalInstallments,
        monthlyAmount,
        totalAmount,
        paidCount,
        remainingCount,
        paidAmount,
        remainingAmount,
        items: sorted,
        firstCycleMonth: sorted[0]?.billingCycleMonth || '',
        lastCycleMonth: sorted[sorted.length - 1]?.billingCycleMonth || '',
      };
    }
  );

  // Overall statistics
  const totalPlans = planGroups.length;
  const totalRemainingDebt = planGroups.reduce((sum, p) => sum + p.remainingAmount, 0);
  const currentMonthMonthlyBurden = planGroups.reduce((sum, p) => sum + p.monthlyAmount, 0);

  // Selected plan or first
  const activePlan = selectedPlanId
    ? planGroups.find((p) => p.groupId === selectedPlanId) || planGroups[0]
    : planGroups[0];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-150">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl max-w-4xl w-full p-5 sm:p-6 shadow-2xl text-slate-100 max-h-[92vh] flex flex-col">
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-white tracking-tight">
                  ตารางแผนผ่อนชำระทุกรอบบิล
                </h3>
                <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  {totalPlans} แผนที่กำลังผ่อน
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                รายการผ่อนชำระจะปรากฏในรอบบิลถัดไปอัตโนมัติจนครบงวด พร้อมติดตามยอดคงค้าง
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Top Summary Banner */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 my-4 shrink-0">
          <div className="p-3.5 rounded-xl bg-slate-800/60 border border-slate-700/60">
            <div className="text-[11px] text-slate-400 font-medium">ยอดผ่อนคงเหลือทั้งหมด</div>
            <div className="text-lg font-bold text-amber-400 mt-1">
              {formatThaiCurrency(totalRemainingDebt)}
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5">รวมทุกรายการที่ยังไม่ครบงวด</div>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-800/60 border border-slate-700/60">
            <div className="text-[11px] text-slate-400 font-medium">ภาระผ่อนเฉลี่ยต่องวด</div>
            <div className="text-lg font-bold text-white mt-1">
              {formatThaiCurrency(currentMonthMonthlyBurden)}
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5">จาก {totalPlans} รายการผ่อนชำระ</div>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-800/60 border border-slate-700/60 flex items-center justify-between">
            <div>
              <div className="text-[11px] text-slate-400 font-medium">เพิ่มแผนผ่อนใหม่</div>
              <div className="text-xs text-slate-300 mt-1">
                สร้างรายการรอบบิลถัดไปอัตโนมัติ
              </div>
            </div>
            {onOpenNewTxModal && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenNewTxModal();
                }}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                เพิ่ม
              </button>
            )}
          </div>
        </div>

        {/* Modal Body: Left sidebar with plans, Right with schedule table */}
        {planGroups.length === 0 ? (
          <div className="p-12 text-center my-auto rounded-2xl bg-slate-800/30 border border-slate-800">
            <Layers className="w-12 h-12 text-slate-600 mx-auto mb-3" />
            <h4 className="text-sm font-semibold text-slate-300">ยังไม่มีรายการผ่อนชำระ</h4>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              เมื่อคุณบันทึกรายการโดยเลือก 'ผ่อนชำระ 0%' ระบบจะสร้างรายการในรอบบิลถัดไปให้โดยอัตโนมัติ
            </p>
            {onOpenNewTxModal && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenNewTxModal();
                }}
                className="mt-4 px-4 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition cursor-pointer"
              >
                เพิ่มรายการผ่อนรายการแรก
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 flex-1 min-h-0 overflow-hidden">
            {/* Left Column: Plan List */}
            <div className="md:col-span-1 space-y-2 overflow-y-auto pr-1">
              <div className="text-xs font-semibold text-slate-400 mb-2">
                รายการแผนผ่อนทั้งหมด ({planGroups.length})
              </div>
              {planGroups.map((plan) => {
                const card = cardMap.get(plan.cardId);
                const isSelected = activePlan?.groupId === plan.groupId;
                const pct = Math.round((plan.paidCount / plan.totalInstallments) * 100);

                return (
                  <button
                    key={plan.groupId}
                    type="button"
                    onClick={() => setSelectedPlanId(plan.groupId)}
                    className={`w-full text-left p-3 rounded-xl border transition cursor-pointer ${
                      isSelected
                        ? 'bg-indigo-600/20 border-indigo-500 text-white shadow-md'
                        : 'bg-slate-800/40 border-slate-700/60 text-slate-300 hover:bg-slate-800/70 hover:border-slate-600'
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-white truncate max-w-[150px]">
                        {plan.title}
                      </span>
                      <span className="text-amber-400 font-bold">
                        {formatThaiCurrency(plan.monthlyAmount)}/ด.
                      </span>
                    </div>

                    <div className="text-[11px] text-slate-400 mt-1 flex items-center justify-between">
                      <span>{card?.name || 'บัตรเครดิต'}</span>
                      <span>
                        งวด {plan.paidCount}/{plan.totalInstallments}
                      </span>
                    </div>

                    {/* Progress Bar */}
                    <div className="mt-2 w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-amber-500 to-emerald-400 rounded-full transition-all duration-300"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Right Column: Detailed Schedule for Active Plan */}
            {activePlan && (
              <div className="md:col-span-2 flex flex-col bg-slate-800/40 border border-slate-700/60 rounded-xl p-4 overflow-hidden">
                {/* Active Plan Header */}
                <div className="pb-3 border-b border-slate-700/60 flex flex-col sm:flex-row sm:items-center justify-between gap-2 shrink-0">
                  <div>
                    <h4 className="text-base font-bold text-white flex items-center gap-2">
                      {activePlan.title}
                      <span className="text-xs px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-300 border border-amber-500/20 font-medium">
                        ผ่อน {activePlan.totalInstallments} งวด
                      </span>
                    </h4>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {cardMap.get(activePlan.cardId)?.name} (••••{' '}
                      {cardMap.get(activePlan.cardId)?.last4}) • รอบบิล{' '}
                      {formatThaiMonth(activePlan.firstCycleMonth)} ถึง{' '}
                      {formatThaiMonth(activePlan.lastCycleMonth)}
                    </p>
                  </div>

                  <div className="text-right">
                    <div className="text-xs text-slate-400">คงเหลือต้องชำระ</div>
                    <div className="text-sm sm:text-base font-bold text-amber-300">
                      {formatThaiCurrency(activePlan.remainingAmount)}
                    </div>
                  </div>
                </div>

                {/* Schedule Table */}
                <div className="mt-3 overflow-y-auto flex-1 pr-1 space-y-2">
                  <div className="text-xs font-semibold text-slate-300 mb-1 flex items-center justify-between">
                    <span>ตารางรอบบิลทั้งหมด ({activePlan.items.length} งวด)</span>
                    <span className="text-[11px] text-slate-400">
                      คลิกรอบบิลเพื่อข้ามไปยังหน้าสรุปเดือนนั้น
                    </span>
                  </div>

                  {activePlan.items.map((item) => {
                    const instNum = item.currentInstallment || 1;
                    const isPaid = item.isPaid;

                    return (
                      <div
                        key={item.id}
                        className={`p-2.5 rounded-xl border flex items-center justify-between gap-2 transition ${
                          isPaid
                            ? 'bg-emerald-950/20 border-emerald-500/30 text-emerald-200'
                            : 'bg-slate-800/60 border-slate-700/60 text-slate-200'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span
                            className={`w-6 h-6 rounded-lg text-xs font-bold flex items-center justify-center shrink-0 ${
                              isPaid
                                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                : 'bg-slate-700 text-slate-300'
                            }`}
                          >
                            {instNum}
                          </span>

                          <div className="min-w-0">
                            <div className="text-xs font-semibold text-white flex items-center gap-1.5 flex-wrap">
                              <span>รอบ {formatThaiMonth(item.billingCycleMonth)}</span>
                              <span className="text-[10px] text-slate-400 font-normal">
                                ({formatThaiDate(item.date)})
                              </span>
                              {isFutureInstallmentHidden(item, cards) && (
                                <span
                                  className="text-[10px] px-1.5 py-0.5 rounded-md bg-amber-500/15 text-amber-300 border border-amber-500/30 flex items-center gap-1"
                                  title="งวดนี้จะแสดงในรายการใช้จ่ายทั่วไปหลังจากวันตัดบัตรรอบนี้ไปแล้ว"
                                >
                                  <Clock className="w-2.5 h-2.5 text-amber-400" />
                                  <span>รอวันตัดรอบบิล</span>
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-slate-400 truncate">
                              {item.note || `ผ่อนงวดที่ ${instNum}/${activePlan.totalInstallments}`}
                            </div>
                          </div>
                        </div>

                        {/* Amount & Status & Jump Button */}
                        <div className="flex items-center gap-2 shrink-0">
                          <div className="text-right">
                            <div className="text-xs sm:text-sm font-bold text-white">
                              {formatThaiCurrency(
                                item.monthlyInstallmentAmount || activePlan.monthlyAmount
                              )}
                            </div>
                          </div>

                          {/* Quick Toggle Paid */}
                          <button
                            type="button"
                            onClick={() => onTogglePaid(item.id)}
                            className={`px-2 py-1 rounded-lg text-[11px] font-medium border transition cursor-pointer flex items-center gap-1 ${
                              isPaid
                                ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/30'
                                : 'bg-slate-700 border-slate-600 text-slate-300 hover:bg-slate-600'
                            }`}
                          >
                            {isPaid ? (
                              <>
                                <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                                <span>ชำระแล้ว</span>
                              </>
                            ) : (
                              <>
                                <Clock className="w-3 h-3 text-slate-400" />
                                <span>รอชำระ</span>
                              </>
                            )}
                          </button>

                          {/* Jump to Month Button */}
                          <button
                            type="button"
                            onClick={() => {
                              onSelectMonth(item.billingCycleMonth);
                              onClose();
                            }}
                            className="p-1 rounded-lg text-slate-400 hover:text-indigo-300 hover:bg-indigo-950/40 border border-transparent hover:border-indigo-500/30 transition cursor-pointer"
                            title={`ดูสรุปยอดรอบ ${formatThaiMonth(item.billingCycleMonth)}`}
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between shrink-0">
          <div className="text-xs text-slate-400 flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>รอบบิลถัดไปถูกเชื่อมโยงและคำนวณตามวันตัดรอบของบัตรอัตโนมัติ</span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-white transition cursor-pointer"
          >
            ปิดหน้าต่าง
          </button>
        </div>
      </div>
    </div>
  );
};
