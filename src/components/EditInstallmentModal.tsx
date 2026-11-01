import React, { useState, useEffect, useMemo } from 'react';
import { Transaction, CreditCard } from '../types';
import {
  formatThaiCurrency,
  formatThaiMonth,
  getNextBillingMonth,
  getInstallmentDate,
  calculateBillingCycle,
  calculateMonthDifference,
  calculateShiftedInstallmentSchedule,
  ShiftScheduleResult,
} from '../utils/cardUtils';
import {
  X,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Layers,
  CreditCard as CardIcon,
  Save,
  ArrowRight,
  Sparkles,
  Info,
  CalendarDays,
} from 'lucide-react';

interface EditInstallmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  installment: Transaction | null;
  allPlanItems: Transaction[];
  cards: CreditCard[];
  onSave: (shiftedItems: Transaction[]) => void;
}

export const EditInstallmentModal: React.FC<EditInstallmentModalProps> = ({
  isOpen,
  onClose,
  installment,
  allPlanItems,
  cards,
  onSave,
}) => {
  // Safe initial values
  const defaultCycle =
    installment?.billingCycleMonth || (installment?.date ? installment.date.slice(0, 7) : '');
  const defaultDate = installment?.date || '';

  // Form states - ALWAYS declared unconditionally at top of component for React 19
  const [selectedCycle, setSelectedCycle] = useState<string>(defaultCycle);
  const [selectedDate, setSelectedDate] = useState<string>(defaultDate);
  const [note, setNote] = useState<string>(installment?.note || '');
  const [confirmedPaidMove, setConfirmedPaidMove] = useState<boolean>(false);
  const [confirmedPaidSubsequentMove, setConfirmedPaidSubsequentMove] = useState<boolean>(false);
  const [showSchedulePreview, setShowSchedulePreview] = useState<boolean>(true);

  // Sync state if installment prop changes
  useEffect(() => {
    if (installment) {
      setSelectedCycle(
        installment.billingCycleMonth || (installment.date ? installment.date.slice(0, 7) : '')
      );
      setSelectedDate(installment.date || '');
      setNote(installment.note || '');
      setConfirmedPaidMove(false);
      setConfirmedPaidSubsequentMove(false);
      setShowSchedulePreview(true);
    }
  }, [installment]);

  // Generate selectable list of candidate billing months (-12 to +36 months)
  const candidateMonths = useMemo(() => {
    if (!installment) return [];
    const list: string[] = [];
    const base =
      installment.billingCycleMonth || (installment.date ? installment.date.slice(0, 7) : '');
    if (!base) return [];

    for (let offset = -12; offset <= 36; offset++) {
      list.push(getNextBillingMonth(base, offset));
    }
    if (selectedCycle && !list.includes(selectedCycle)) {
      list.push(selectedCycle);
      list.sort();
    }
    return list;
  }, [installment, selectedCycle]);

  // Shift Schedule calculation & collision checking
  const shiftResult: ShiftScheduleResult | null = useMemo(() => {
    if (!installment || !selectedCycle) return null;
    return calculateShiftedInstallmentSchedule(
      allPlanItems,
      installment,
      selectedCycle,
      selectedDate,
      note
    );
  }, [allPlanItems, installment, selectedCycle, selectedDate, note]);

  // Early return ONLY AFTER all hooks have executed
  if (!isOpen || !installment) return null;

  const card = cards.find((c) => c.id === installment.cardId);
  const currentInst = installment.currentInstallment || 1;
  const totalInst = installment.totalInstallments || 1;
  const monthlyAmt =
    installment.monthlyInstallmentAmount ||
    Math.round((installment.amount / totalInst) * 100) / 100;

  const isPaid = Boolean(installment.isPaid);
  const hasPaidSubsequent = Boolean(shiftResult?.hasPaidSubsequent);
  const hasCollision = Boolean(shiftResult?.hasCollision);
  const monthDelta = shiftResult?.monthDelta || 0;

  // Validation:
  // 1. No collision within same plan
  // 2. If current installment is paid, must confirm
  // 3. If any subsequent installment is paid, must confirm
  const canSubmit =
    !hasCollision &&
    (!isPaid || confirmedPaidMove) &&
    (!hasPaidSubsequent || confirmedPaidSubsequentMove);

  // Auto-calculate billing cycle from transaction date based on card's cutoff day
  const handleAutoCalculateCycleFromDate = () => {
    if (!selectedDate || !card?.billingCutoffDay) return;
    const computedCycle = calculateBillingCycle(selectedDate, card.billingCutoffDay);
    setSelectedCycle(computedCycle);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit || !shiftResult) return;
    onSave(shiftResult.shiftedItems);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-150">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl max-w-lg w-full p-5 sm:p-6 shadow-2xl text-slate-100 max-h-[90vh] overflow-y-auto space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between pb-3.5 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-white tracking-tight">
                แก้ไขรอบบิลงวดผ่อนชำระ
              </h3>
              <p className="text-xs text-slate-400">
                งวดที่ {currentInst} จาก {totalInst} งวด • {installment.title}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Plan & Amount Summary Card */}
        <div className="p-4 rounded-xl bg-slate-800/60 border border-slate-700/60 space-y-2.5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-400">บัตรเครดิต:</span>
            <span className="font-semibold text-white flex items-center gap-1.5">
              <CardIcon className="w-3.5 h-3.5 text-indigo-400" />
              {card ? `${card.name} (•••• ${card.last4})` : 'ไม่ระบุบัตร'}
            </span>
          </div>

          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-400">งวดที่เลือกแก้ไข:</span>
            <span className="font-semibold text-indigo-300">
              งวดที่ {currentInst} / {totalInst} (คงที่)
            </span>
          </div>

          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-400">ยอดผ่อนต่องวด:</span>
            <span className="text-sm font-bold text-white">
              {formatThaiCurrency(monthlyAmt)}
            </span>
          </div>

          <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-700/60">
            <span className="text-slate-400">สถานะงวดที่ {currentInst}:</span>
            {isPaid ? (
              <span className="px-2 py-0.5 rounded-md bg-emerald-500/15 text-emerald-300 font-semibold border border-emerald-500/30 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-emerald-400" /> ชำระแล้ว
              </span>
            ) : (
              <span className="px-2 py-0.5 rounded-md bg-slate-700 text-slate-300 font-medium flex items-center gap-1">
                <Clock className="w-3 h-3 text-slate-400" /> รอชำระ
              </span>
            )}
          </div>
        </div>

        {/* Warning if Current Item is Already Paid */}
        {isPaid && (
          <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs space-y-2">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <strong className="font-semibold">แจ้งเตือน: งวดที่ {currentInst} ได้รับการชำระเงินแล้ว</strong>
                <p className="text-[11px] text-amber-200/80 mt-0.5 leading-relaxed">
                  การย้ายรอบบิลจะส่งผลต่อยอดที่ชำระแล้วของรอบเดิมและรอบใหม่ โปรดตรวจสอบก่อนยืนยัน
                </p>
              </div>
            </div>

            <label className="flex items-center gap-2 pt-1 border-t border-amber-500/20 text-xs cursor-pointer select-none">
              <input
                type="checkbox"
                checked={confirmedPaidMove}
                onChange={(e) => setConfirmedPaidMove(e.target.checked)}
                className="rounded border-amber-400 text-amber-500 focus:ring-amber-400 cursor-pointer"
              />
              <span className="text-amber-100 font-medium">
                ฉันรับทราบและยืนยันการย้ายรอบบิลของงวดนี้
              </span>
            </label>
          </div>
        )}

        {/* Warning if Subsequent Items are Already Paid */}
        {hasPaidSubsequent && shiftResult && (
          <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs space-y-2">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <strong className="font-semibold">
                  แจ้งเตือน: แผนนี้มีงวดถัดไปที่ชำระเงินแล้ว ({shiftResult.paidSubsequentNums.map((n) => `งวดที่ ${n}`).join(', ')})
                </strong>
                <p className="text-[11px] text-amber-200/80 mt-0.5 leading-relaxed">
                  เนื่องจากงวดถัดไปจะถูกเลื่อนตาม Month Delta ({monthDelta > 0 ? `+${monthDelta}` : monthDelta} เดือน) ส่งผลให้รอบบิลของงวดที่ชำระแล้วเหล่านี้ขยับตามไปด้วย
                </p>
              </div>
            </div>

            <label className="flex items-center gap-2 pt-1 border-t border-amber-500/20 text-xs cursor-pointer select-none">
              <input
                type="checkbox"
                checked={confirmedPaidSubsequentMove}
                onChange={(e) => setConfirmedPaidSubsequentMove(e.target.checked)}
                className="rounded border-amber-400 text-amber-500 focus:ring-amber-400 cursor-pointer"
              />
              <span className="text-amber-100 font-medium">
                ยืนยันการเลื่อนรอบบิลงวดถัดไปที่ชำระเงินแล้ว
              </span>
            </label>
          </div>
        )}

        {/* Collision Warning (Within Same Plan) */}
        {hasCollision && shiftResult?.collisionDetails && (
          <div className="p-3.5 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-200 text-xs flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <div>
              <strong className="font-semibold">ไม่สามารถย้ายไปยังรอบบิลนี้ได้ (รอบบิลชนกันในแผน)</strong>
              <p className="text-[11px] text-rose-200/90 mt-1 leading-relaxed">
                รอบบิล {formatThaiMonth(shiftResult.collisionDetails.cycleMonth)} ({shiftResult.collisionDetails.cycleMonth}) ชนกับงวดที่ {shiftResult.collisionDetails.conflictingInstallmentNum} ของแผนเดียวกัน กรุณาเลือกรอบบิลอื่นเพื่อไม่ให้เกิดงวดซ้ำซ้อน
              </p>
            </div>
          </div>
        )}

        {/* Form Controls */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Billing Cycle Month Selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center justify-between">
              <span>รอบบิลที่ต้องการย้ายไป (Billing Cycle)</span>
              <span className="text-[11px] text-indigo-400 font-medium">
                {formatThaiMonth(selectedCycle)} ({selectedCycle})
              </span>
            </label>
            <div className="relative">
              <select
                value={selectedCycle}
                onChange={(e) => setSelectedCycle(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs sm:text-sm focus:outline-none focus:border-indigo-500 transition cursor-pointer appearance-none"
              >
                {candidateMonths.map((m) => (
                  <option key={m} value={m}>
                    รอบ {formatThaiMonth(m)} ({m})
                  </option>
                ))}
              </select>
              <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                <Calendar className="w-4 h-4" />
              </div>
            </div>
          </div>

          {/* Transaction Date Input with Auto-Cycle Sync Button */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-semibold text-slate-300">
                วันที่ของรายการ (Transaction Date)
              </label>

              {card?.billingCutoffDay && (
                <button
                  type="button"
                  onClick={handleAutoCalculateCycleFromDate}
                  className="text-[11px] text-indigo-400 hover:text-indigo-300 flex items-center gap-1 transition cursor-pointer"
                  title={`คำนวณรอบบิลจากวันที่ตัดรอบของบัตร (${card.name} ตัดรอบวันที่ ${card.billingCutoffDay})`}
                >
                  <Sparkles className="w-3 h-3 text-indigo-400" />
                  <span>คำนวณรอบบิลตามวันตัดรอบ (วันที่ {card.billingCutoffDay})</span>
                </button>
              )}
            </div>

            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              required
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs sm:text-sm focus:outline-none focus:border-indigo-500 transition"
            />
            <p className="text-[11px] text-slate-400 mt-1">
              * คุณสามารถกำหนดวันที่และรอบบิลแยกจากกันได้อย่างอิสระตามเงื่อนไขของบัตร
            </p>
          </div>

          {/* Note Input */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              บันทึกช่วยจำ (Note)
            </label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={`ผ่อนชำระงวดที่ ${currentInst}/${totalInst}`}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs sm:text-sm focus:outline-none focus:border-indigo-500 transition"
            />
          </div>

          {/* Cascading Shift Schedule Preview */}
          {shiftResult && shiftResult.shiftedItems.length > 0 && (
            <div className="p-3.5 rounded-xl bg-slate-800/40 border border-slate-700/60 space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-indigo-300">
                  <CalendarDays className="w-3.5 h-3.5" />
                  <span>
                    การเลื่อนรอบบิลอัตโนมัติ ({shiftResult.shiftedItems.length} งวดในแผน)
                  </span>
                </div>
                <span className="text-[11px] px-2 py-0.5 rounded-md bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 font-mono">
                  {monthDelta === 0 ? 'ไม่เปลี่ยนรอบบิล' : monthDelta > 0 ? `เลื่อนไปข้างหน้า +${monthDelta} เดือน` : `เลื่อนถอยหลัง ${monthDelta} เดือน`}
                </span>
              </div>

              {monthDelta !== 0 && (
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  เมื่อย้ายงวดที่ {currentInst} ระบบจะปรับรอบบิลของงวดถัดไปทั้งหมดในแผนนี้ตาม Month Delta อัตโนมัติ โดยไม่กระทบยอดเงินหรือจำนวนงวด
                </p>
              )}

              {/* Collapsible/Scrollable Schedule Preview */}
              <div className="max-h-36 overflow-y-auto space-y-1.5 pr-1">
                {shiftResult.shiftedItems.map((item) => {
                  const instNum = item.currentInstallment || 1;
                  const originalItem = allPlanItems.find((p) => p.id === item.id);
                  const isCurrent = item.id === installment.id;

                  return (
                    <div
                      key={item.id}
                      className={`flex items-center justify-between text-xs px-2.5 py-1.5 rounded-lg border ${
                        isCurrent
                          ? 'bg-indigo-600/15 border-indigo-500/40 text-white font-medium'
                          : 'bg-slate-900/40 border-slate-800 text-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-indigo-300">งวด {instNum}/{totalInst}</span>
                        {isCurrent && (
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-indigo-500/20 text-indigo-200">
                            งวดที่แก้ไข
                          </span>
                        )}
                        {item.isPaid && (
                          <span className="text-[10px] px-1 py-0.2 rounded bg-emerald-500/20 text-emerald-300">
                            ชำระแล้ว
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5 text-[11px]">
                        {originalItem && originalItem.billingCycleMonth !== item.billingCycleMonth ? (
                          <>
                            <span className="text-slate-400 line-through">
                              {formatThaiMonth(originalItem.billingCycleMonth)}
                            </span>
                            <ArrowRight className="w-3 h-3 text-indigo-400" />
                            <span className="text-amber-300 font-semibold">
                              {formatThaiMonth(item.billingCycleMonth)}
                            </span>
                          </>
                        ) : (
                          <span className="text-slate-300">{formatThaiMonth(item.billingCycleMonth)}</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 transition cursor-pointer"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              disabled={!canSubmit}
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:hover:bg-indigo-600 text-white shadow-lg shadow-indigo-600/30 transition flex items-center gap-1.5 cursor-pointer"
            >
              <Save className="w-3.5 h-3.5" />
              <span>
                บันทึกการแก้ไข {shiftResult && shiftResult.shiftedItems.length > 1 ? `(${shiftResult.shiftedItems.length} งวด)` : ''}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
