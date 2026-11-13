import React, { useState } from 'react';
import { CreditCard, CardDueStatus } from '../types';
import {
  formatThaiCurrency,
  calculateCardCutoffAlertStatus,
} from '../utils/cardUtils';
import {
  Plus,
  Calendar,
  Clock,
  Wifi,
  Edit2,
  Trash2,
  CheckCircle2,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  Bell,
  CreditCard as CardIcon,
} from 'lucide-react';
import { ReorderCardsModal } from './ReorderCardsModal';

interface CardSliderProps {
  cards: CreditCard[];
  dueStatuses: CardDueStatus[];
  selectedCardId: string | null;
  onSelectCard: (cardId: string | null) => void;
  onOpenAddCard: () => void;
  onOpenEditCard: (card: CreditCard) => void;
  onDeleteCard: (card: CreditCard) => void;
  onReorderCards?: (newCards: CreditCard[]) => void;
}

export const CardSlider: React.FC<CardSliderProps> = ({
  cards,
  dueStatuses,
  selectedCardId,
  onSelectCard,
  onOpenAddCard,
  onOpenEditCard,
  onDeleteCard,
  onReorderCards,
}) => {
  const [isReorderModalOpen, setIsReorderModalOpen] = useState(false);

  // Quick move card left/right
  const handleQuickMove = (cardIndex: number, direction: -1 | 1, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!onReorderCards) return;
    const targetIndex = cardIndex + direction;
    if (targetIndex < 0 || targetIndex >= cards.length) return;
    const next = [...cards];
    const temp = next[cardIndex];
    next[cardIndex] = next[targetIndex];
    next[targetIndex] = temp;
    onReorderCards(next);
  };

  return (
    <div className="space-y-2.5">
      {/* Header Bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">บัตรเครดิตของฉัน</h2>
          <span className="text-xs text-slate-400">({cards.length} ใบ)</span>
          {selectedCardId && (
            <button
              onClick={() => onSelectCard(null)}
              className="text-xs text-indigo-400 hover:text-indigo-300 underline ml-2 cursor-pointer"
            >
              ดูบัตรทั้งหมด
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Reorder Button */}
          {cards.length > 1 && onReorderCards && (
            <button
              type="button"
              onClick={() => setIsReorderModalOpen(true)}
              className="text-xs font-semibold px-2.5 py-1.5 rounded-xl bg-slate-850 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700/80 transition flex items-center gap-1.5 cursor-pointer shadow-sm"
              title="จัดลำดับบัตรเครดิต"
            >
              <ArrowUpDown className="w-3.5 h-3.5 text-indigo-400" />
              <span className="hidden sm:inline">จัดลำดับบัตร</span>
            </button>
          )}

          {/* Add Card Button */}
          <button
            type="button"
            onClick={onOpenAddCard}
            className="text-xs font-semibold px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-indigo-400 hover:text-indigo-300 border border-slate-700 transition flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>เพิ่มบัตรเครดิต</span>
          </button>
        </div>
      </div>

      {/* Cards Grid or Empty State */}
      {cards.length === 0 ? (
        <div className="p-8 sm:p-12 text-center rounded-2xl bg-slate-900/40 border border-dashed border-slate-700/80">
          <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center mx-auto mb-3 text-indigo-400">
            <CardIcon className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-white tracking-tight">ยังไม่มีบัตรเครดิตในระบบ</h3>
          <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto leading-relaxed">
            เริ่มต้นใช้งาน CardPulse โดยการเพิ่มบัตรเครดิตใบแรกของคุณ เพื่อติดตามวันตัดรอบบิล วันครบกำหนดชำระ และคำนวณยอดใช้จ่ายอัตโนมัติ
          </p>
          <button
            type="button"
            onClick={onOpenAddCard}
            className="mt-4 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/30 transition cursor-pointer inline-flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>เพิ่มบัตรเครดิตใบแรก</span>
          </button>
        </div>
      ) : (
        <div className="flex flex-wrap justify-center sm:justify-start gap-2.5">
        {cards.map((card, idx) => {
          const status = dueStatuses.find((s) => s.card.id === card.id);
          const cutoffAlert = calculateCardCutoffAlertStatus(card);
          const isSelected = selectedCardId === card.id;
          const cycleSpend = status?.cycleAmount || 0;
          const limitUsedPct = Math.min(100, Math.round((cycleSpend / card.creditLimit) * 100));
          const isTailwind = card.colorGradient && card.colorGradient.startsWith('from-');

          return (
            <div
              key={card.id}
              onClick={() => onSelectCard(isSelected ? null : card.id)}
              className={`group relative w-[65%] min-w-[222px] max-w-[258px] sm:w-[238px] lg:w-[256px] rounded-xl p-2.5 cursor-pointer transition-all duration-200 border overflow-hidden ${
                isSelected
                  ? 'ring-2 ring-indigo-500 border-indigo-500 shadow-lg shadow-indigo-950/60 scale-[1.01]'
                  : cutoffAlert.isNearCutoff
                  ? 'border-amber-500/50 shadow-md shadow-amber-950/30 hover:border-amber-400'
                  : 'border-slate-800/80 hover:border-slate-700 hover:shadow-md hover:shadow-black/40'
              } ${isTailwind ? `bg-gradient-to-br ${card.colorGradient}` : 'bg-slate-900'}`}
              style={!isTailwind && card.colorGradient ? { background: card.colorGradient } : undefined}
            >
              {/* Subtle metallic gloss overlay */}
              <div className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/5 to-transparent pointer-events-none" />

              {/* Card Header: Bank & Card Type (65% Proportional Scale) */}
              <div className="relative flex items-center justify-between gap-1.5 mb-1.5">
                <div className="min-w-0">
                  <span className="text-[8.5px] font-semibold tracking-wider uppercase text-slate-300/90 block truncate leading-tight">
                    {card.bank}
                  </span>
                  <h3 className="text-xs font-bold text-white tracking-tight truncate drop-shadow-sm leading-snug">
                    {card.name}
                  </h3>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {cutoffAlert.isNearCutoff && (
                    <div
                      className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-amber-400 text-slate-950 font-bold text-[8.5px] shadow-sm border border-amber-300 shrink-0 tabular-nums"
                      title={`แจ้งเตือน: ${cutoffAlert.label} (ตัดรอบบิลทุกวันที่ ${card.billingCutoffDay})`}
                    >
                      <Bell className="w-2.5 h-2.5 fill-slate-950 shrink-0" />
                      <span className="font-extrabold tracking-tight whitespace-nowrap">
                        {cutoffAlert.daysUntilCutoff === 0 ? 'วันนี้' : `${cutoffAlert.daysUntilCutoff} วัน`}
                      </span>
                    </div>
                  )}
                  <Wifi className="w-3 h-3 text-slate-300/70 rotate-90 shrink-0" />
                  <span className="text-[9.5px] font-black tracking-wider text-white/95 bg-white/10 px-1.5 py-0.5 rounded backdrop-blur-sm border border-white/10 shrink-0">
                    {card.cardType || 'VISA'}
                  </span>
                </div>
              </div>

              {/* EMV Chip & Masked Digits (65% Proportional Scale) */}
              <div className="relative flex items-center justify-between my-1">
                <div className="w-6 h-4 rounded bg-gradient-to-tr from-amber-300 via-amber-400 to-amber-500 shadow-sm border border-amber-200/50 flex flex-col justify-around p-0.5 shrink-0">
                  <div className="h-[1px] bg-amber-700/50 rounded-full" />
                  <div className="h-[1px] bg-amber-700/50 rounded-full" />
                </div>
                <div className="font-mono text-[10.5px] tracking-wider text-slate-200/95 font-semibold whitespace-nowrap tabular-nums">
                  •••• •••• •••• {card.last4}
                </div>
              </div>

              {/* 3-Column Billing Info Strip (65% Proportional Scale) */}
              <div className="relative grid grid-cols-3 gap-0.5 my-1 p-1.5 rounded-lg bg-black/35 backdrop-blur-sm border border-white/5 text-[9.5px]">
                {/* 1. วันตัดรอบบิล */}
                <div className="min-w-0 pr-0.5">
                  <span className="text-[8px] text-slate-400 block truncate leading-tight">วันตัดรอบ</span>
                  <span className={`font-medium flex items-center gap-0.5 truncate mt-0.5 text-[9.5px] tabular-nums ${cutoffAlert.isNearCutoff ? 'text-amber-300 font-bold' : 'text-slate-200'}`}>
                    <Calendar className={`w-2.5 h-2.5 shrink-0 ${cutoffAlert.isNearCutoff ? 'text-amber-400' : 'text-slate-400'}`} />
                    <span className="truncate">วันที่ {card.billingCutoffDay}</span>
                  </span>
                </div>

                {/* 2. ครบกำหนดชำระ */}
                <div className="min-w-0 px-1 border-x border-white/5">
                  <span className="text-[8px] text-rose-300/90 block truncate leading-tight">ครบกำหนด</span>
                  <span className="font-medium text-rose-300 flex items-center gap-0.5 truncate mt-0.5 text-[9.5px] tabular-nums">
                    <Clock className="w-2.5 h-2.5 text-rose-400 shrink-0" />
                    <span className="truncate">วันที่ {card.paymentDueDay}</span>
                  </span>
                </div>

                {/* 3. นับถอยหลัง / สถานะชำระ */}
                <div className="min-w-0 pl-1 flex flex-col justify-center">
                  <span className="text-[8px] text-slate-400 block truncate leading-tight">สถานะ</span>
                  <div className="mt-0.5 min-w-0">
                    {status ? (
                      <span
                        className={`text-[8.5px] font-semibold px-1 py-0.5 rounded inline-flex items-center gap-0.5 max-w-full truncate tabular-nums ${
                          status.isPaid
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                            : status.severity === 'overdue'
                            ? 'bg-rose-500/30 text-rose-200 border border-rose-500/40'
                            : status.severity === 'critical'
                            ? 'bg-amber-500/25 text-amber-200 border border-amber-500/35'
                            : 'bg-white/10 text-slate-200 border border-white/10'
                        }`}
                      >
                        {status.isPaid ? (
                          <>
                            <CheckCircle2 className="w-2.5 h-2.5 text-emerald-400 shrink-0" />
                            <span className="truncate">ชำระแล้ว</span>
                          </>
                        ) : (
                          <>
                            <Clock className="w-2.5 h-2.5 shrink-0" />
                            <span className="truncate">
                              {status.daysRemaining < 0
                                ? `เลย ${Math.abs(status.daysRemaining)} ว.`
                                : status.daysRemaining === 0
                                ? 'วันนี้'
                                : `อีก ${status.daysRemaining} ว.`}
                            </span>
                          </>
                        )}
                      </span>
                    ) : (
                      <span className="text-[9px] text-slate-500">-</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Spend & Limit Progress (65% Proportional Scale) */}
              <div className="relative space-y-0.5 mt-1">
                <div className="flex items-center justify-between gap-1 text-[10px]">
                  <span className="text-[9.5px] text-slate-400 truncate">ยอดรอบนี้</span>
                  <span className="font-bold text-white text-[11px] tabular-nums whitespace-nowrap">
                    {formatThaiCurrency(cycleSpend)}
                  </span>
                </div>
                <div className="w-full bg-black/40 rounded-full h-1 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${
                      limitUsedPct > 80
                        ? 'bg-rose-500'
                        : limitUsedPct > 50
                        ? 'bg-amber-400'
                        : 'bg-emerald-400'
                    }`}
                    style={{ width: `${limitUsedPct}%` }}
                  />
                </div>
                <div className="flex items-center justify-between gap-1 text-[8.5px] text-slate-400 tabular-nums">
                  <span className="whitespace-nowrap">ใช้ {limitUsedPct}%</span>
                  <span className="truncate text-right">วงเงิน {formatThaiCurrency(card.creditLimit)}</span>
                </div>
              </div>

              {/* Selected Card Action Controls (Compact) */}
              {isSelected && (
                <div className="relative flex items-center justify-between gap-1 mt-1.5 pt-1.5 border-t border-white/15 animate-in fade-in duration-150">
                  <div className="flex items-center shrink-0">
                    {onReorderCards && cards.length > 1 && (
                      <div className="flex items-center gap-0.5 bg-black/30 rounded-md p-0.5 border border-white/10">
                        <button
                          type="button"
                          disabled={idx === 0}
                          onClick={(e) => handleQuickMove(idx, -1, e)}
                          className="p-0.5 rounded text-slate-300 hover:text-white hover:bg-white/10 disabled:opacity-25 transition cursor-pointer"
                          title="เลื่อนไปซ้าย (ก่อนหน้า)"
                        >
                          <ChevronLeft className="w-3 h-3" />
                        </button>
                        <span className="text-[9px] text-slate-400 font-mono px-0.5 tabular-nums">
                          #{idx + 1}
                        </span>
                        <button
                          type="button"
                          disabled={idx === cards.length - 1}
                          onClick={(e) => handleQuickMove(idx, 1, e)}
                          className="p-0.5 rounded text-slate-300 hover:text-white hover:bg-white/10 disabled:opacity-25 transition cursor-pointer"
                          title="เลื่อนไปขวา (ถัดไป)"
                        >
                          <ChevronRight className="w-3 h-3" />
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenEditCard(card);
                      }}
                      className="px-1.5 py-0.5 rounded-md bg-white/15 hover:bg-white/25 text-white text-[10px] font-medium border border-white/20 transition flex items-center gap-0.5 whitespace-nowrap cursor-pointer"
                      title="แก้ไขข้อมูลบัตร"
                    >
                      <Edit2 className="w-2.5 h-2.5 text-indigo-300 shrink-0" />
                      <span>แก้ไข</span>
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteCard(card);
                      }}
                      className="px-1.5 py-0.5 rounded-md bg-rose-500/20 hover:bg-rose-500/35 text-rose-200 text-[10px] font-medium border border-rose-500/30 transition flex items-center gap-0.5 whitespace-nowrap cursor-pointer"
                      title="ลบบัตรนี้"
                    >
                      <Trash2 className="w-2.5 h-2.5 text-rose-300 shrink-0" />
                      <span>ลบ</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
        </div>
      )}

      {/* Card Reordering Modal */}
      {onReorderCards && (
        <ReorderCardsModal
          isOpen={isReorderModalOpen}
          cards={cards}
          onClose={() => setIsReorderModalOpen(false)}
          onSave={onReorderCards}
        />
      )}
    </div>
  );
};
