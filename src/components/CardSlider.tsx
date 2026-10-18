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

      {/* Cards Grid: Width unchanged, Height reduced by ~20% */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
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
              className={`group relative rounded-2xl p-3.5 sm:p-4 cursor-pointer transition-all duration-200 border overflow-hidden ${
                isSelected
                  ? 'ring-2 ring-indigo-500 border-indigo-500 shadow-xl shadow-indigo-950/60 scale-[1.01]'
                  : cutoffAlert.isNearCutoff
                  ? 'border-amber-500/50 shadow-md shadow-amber-950/30 hover:border-amber-400'
                  : 'border-slate-800/80 hover:border-slate-700 hover:shadow-lg hover:shadow-black/40'
              } ${isTailwind ? `bg-gradient-to-br ${card.colorGradient}` : 'bg-slate-900'}`}
              style={!isTailwind && card.colorGradient ? { background: card.colorGradient } : undefined}
            >
              {/* Subtle metallic gloss overlay */}
              <div className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/5 to-transparent pointer-events-none" />

              {/* Card Header: Bank & Card Type (Compact vertical spacing) */}
              <div className="relative flex items-center justify-between mb-2">
                <div className="min-w-0 pr-2">
                  <span className="text-[10px] font-semibold tracking-wider uppercase text-slate-300/90 block truncate">
                    {card.bank}
                  </span>
                  <h3 className="text-sm sm:text-base font-bold text-white tracking-tight truncate drop-shadow-sm">
                    {card.name}
                  </h3>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  {/* Notification Bell Icon for 3 days before cutoff */}
                  {cutoffAlert.isNearCutoff && (
                    <div
                      className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-400 text-slate-950 font-bold text-[10px] shadow-lg shadow-amber-500/40 border border-amber-300 animate-pulse shrink-0"
                      title={`แจ้งเตือน: ${cutoffAlert.label} (ตัดรอบบิลทุกวันที่ ${card.billingCutoffDay})`}
                    >
                      <Bell className="w-3 h-3 fill-slate-950 shrink-0" />
                      <span className="font-extrabold tracking-tight">
                        {cutoffAlert.daysUntilCutoff === 0 ? 'ตัดรอบวันนี้' : `ตัดรอบอีก ${cutoffAlert.daysUntilCutoff} วัน`}
                      </span>
                    </div>
                  )}
                  <Wifi className="w-3.5 h-3.5 text-slate-300/70 rotate-90" />
                  <span className="text-[11px] font-black tracking-wider text-white/95 bg-white/10 px-2 py-0.5 rounded-md backdrop-blur-sm border border-white/10 shadow-sm">
                    {card.cardType || 'VISA'}
                  </span>
                </div>
              </div>

              {/* EMV Chip & Masked Digits (Slimmer compact height) */}
              <div className="relative flex items-center justify-between my-1.5">
                <div className="w-8 h-5.5 rounded-md bg-gradient-to-tr from-amber-300 via-amber-400 to-amber-500 shadow-sm border border-amber-200/50 flex flex-col justify-around p-0.5 shrink-0">
                  <div className="h-0.5 bg-amber-700/50 rounded-full" />
                  <div className="h-0.5 bg-amber-700/50 rounded-full" />
                </div>
                <div className="font-mono text-xs sm:text-sm tracking-widest text-slate-200/95 font-semibold">
                  •••• •••• •••• {card.last4}
                </div>
              </div>

              {/* Requirement #2: วันตัดรอบบิล, ครบกำหนดชำระ, และ วันนับถอยหลัง อยู่ในแถวเดียวกัน! */}
              <div className="relative grid grid-cols-3 gap-1 my-1.5 p-2 rounded-xl bg-black/35 backdrop-blur-sm border border-white/5 text-[11px]">
                {/* 1. วันตัดรอบบิล พร้อมไอคอนกระดิ่งแจ้งเตือนล่วงหน้า 3 วัน */}
                <div className="min-w-0 pr-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] text-slate-400 block truncate">วันตัดรอบ</span>
                    {cutoffAlert.isNearCutoff && (
                      <span className="inline-flex items-center gap-0.5 text-[9px] font-bold text-amber-300 animate-pulse">
                        <Bell className="w-2.5 h-2.5 fill-amber-300 shrink-0" />
                        <span>{cutoffAlert.daysUntilCutoff === 0 ? 'วันนี้' : `${cutoffAlert.daysUntilCutoff} วัน`}</span>
                      </span>
                    )}
                  </div>
                  <span className={`font-medium flex items-center gap-1 truncate mt-0.5 text-[11px] ${cutoffAlert.isNearCutoff ? 'text-amber-300 font-bold' : 'text-slate-200'}`}>
                    <Calendar className={`w-2.5 h-2.5 shrink-0 ${cutoffAlert.isNearCutoff ? 'text-amber-400' : 'text-slate-400'}`} />
                    <span className="truncate">วันที่ {card.billingCutoffDay}</span>
                  </span>
                </div>

                {/* 2. ครบกำหนดชำระ */}
                <div className="min-w-0 px-1 border-x border-white/5">
                  <span className="text-[9px] text-rose-300/90 block truncate">ครบกำหนด</span>
                  <span className="font-medium text-rose-300 flex items-center gap-1 truncate mt-0.5 text-[11px]">
                    <Clock className="w-2.5 h-2.5 text-rose-400 shrink-0" />
                    <span className="truncate">วันที่ {card.paymentDueDay}</span>
                  </span>
                </div>

                {/* 3. นับถอยหลัง / สถานะชำระ (ย้ายมาอยู่ในแถวเดียวกันตามคำขอ!) */}
                <div className="min-w-0 pl-1 flex flex-col justify-center">
                  <span className="text-[9px] text-slate-400 block truncate">นับถอยหลัง</span>
                  <div className="mt-0.5">
                    {status ? (
                      <span
                        className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-md inline-flex items-center gap-1 max-w-full truncate ${
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
                                ? `เลย ${Math.abs(status.daysRemaining)} วัน`
                                : status.daysRemaining === 0
                                ? 'ครบวันนี้'
                                : `อีก ${status.daysRemaining} วัน`}
                            </span>
                          </>
                        )}
                      </span>
                    ) : (
                      <span className="text-[10px] text-slate-500">-</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Spend & Limit Progress (Compact) */}
              <div className="relative space-y-1 mt-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[11px] text-slate-400">ยอดรอบนี้:</span>
                  <span className="font-bold text-white text-xs">{formatThaiCurrency(cycleSpend)}</span>
                </div>
                <div className="w-full bg-black/40 rounded-full h-1.5 overflow-hidden">
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
                <div className="flex items-center justify-between text-[10px] text-slate-400">
                  <span>ใช้วงเงิน {limitUsedPct}%</span>
                  <span>วงเงิน {formatThaiCurrency(card.creditLimit)}</span>
                </div>
              </div>

              {/* Requirement #3: ปุ่ม แก้ไข และ ลบ ให้ซ่อนไว้ โดยให้โชว์เฉพาะตอนกดที่บัตรนั้นๆ (isSelected) */}
              {isSelected && (
                <div className="relative flex items-center justify-between mt-2 pt-2 border-t border-white/15 animate-in fade-in duration-150">
                  {/* Reorder arrows on selected card */}
                  <div className="flex items-center gap-1">
                    {onReorderCards && cards.length > 1 && (
                      <div className="flex items-center gap-0.5 bg-black/30 rounded-lg p-0.5 border border-white/10">
                        <button
                          type="button"
                          disabled={idx === 0}
                          onClick={(e) => handleQuickMove(idx, -1, e)}
                          className="p-1 rounded text-slate-300 hover:text-white hover:bg-white/10 disabled:opacity-25 transition cursor-pointer"
                          title="เลื่อนไปซ้าย (ก่อนหน้า)"
                        >
                          <ChevronLeft className="w-3.5 h-3.5" />
                        </button>
                        <span className="text-[10px] text-slate-400 font-mono px-1">
                          #{idx + 1}
                        </span>
                        <button
                          type="button"
                          disabled={idx === cards.length - 1}
                          onClick={(e) => handleQuickMove(idx, 1, e)}
                          className="p-1 rounded text-slate-300 hover:text-white hover:bg-white/10 disabled:opacity-25 transition cursor-pointer"
                          title="เลื่อนไปขวา (ถัดไป)"
                        >
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Edit and Delete Buttons (Only visible when card is selected!) */}
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenEditCard(card);
                      }}
                      className="px-2 py-1 rounded-lg bg-white/15 hover:bg-white/25 text-white text-xs font-medium border border-white/20 transition flex items-center gap-1 cursor-pointer shadow-sm"
                      title="แก้ไขข้อมูลบัตร"
                    >
                      <Edit2 className="w-3 h-3 text-indigo-300" />
                      <span>แก้ไข</span>
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteCard(card);
                      }}
                      className="px-2 py-1 rounded-lg bg-rose-500/20 hover:bg-rose-500/35 text-rose-200 text-xs font-medium border border-rose-500/30 transition flex items-center gap-1 cursor-pointer shadow-sm"
                      title="ลบบัตรนี้"
                    >
                      <Trash2 className="w-3 h-3 text-rose-300" />
                      <span>ลบ</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

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
