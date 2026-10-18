import React, { useState, useEffect } from 'react';
import { CreditCard } from '../types';
import {
  X,
  ArrowUp,
  ArrowDown,
  GripVertical,
  Check,
  RotateCcw,
  Sparkles,
  ArrowUpDown,
} from 'lucide-react';

interface ReorderCardsModalProps {
  isOpen: boolean;
  cards: CreditCard[];
  onClose: () => void;
  onSave: (reorderedCards: CreditCard[]) => void;
}

export const ReorderCardsModal: React.FC<ReorderCardsModalProps> = ({
  isOpen,
  cards,
  onClose,
  onSave,
}) => {
  const [orderedList, setOrderedList] = useState<CreditCard[]>(cards);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  useEffect(() => {
    if (isOpen) {
      setOrderedList([...cards]);
    }
  }, [isOpen, cards]);

  if (!isOpen) return null;

  const moveUp = (index: number) => {
    if (index === 0) return;
    const next = [...orderedList];
    const temp = next[index];
    next[index] = next[index - 1];
    next[index - 1] = temp;
    setOrderedList(next);
  };

  const moveDown = (index: number) => {
    if (index === orderedList.length - 1) return;
    const next = [...orderedList];
    const temp = next[index];
    next[index] = next[index + 1];
    next[index + 1] = temp;
    setOrderedList(next);
  };

  const moveToTop = (index: number) => {
    if (index === 0) return;
    const next = [...orderedList];
    const [item] = next.splice(index, 1);
    next.unshift(item);
    setOrderedList(next);
  };

  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (draggedIndex === null || draggedIndex === index) return;

    const next = [...orderedList];
    const [draggedItem] = next.splice(draggedIndex, 1);
    next.splice(index, 0, draggedItem);
    setDraggedIndex(index);
    setOrderedList(next);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  const handleReset = () => {
    setOrderedList([...cards]);
  };

  const handleSave = () => {
    onSave(orderedList);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-150">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl max-w-md w-full p-5 shadow-2xl text-slate-100 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-3.5 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <ArrowUpDown className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white tracking-tight">
                จัดลำดับบัตรเครดิต
              </h3>
              <p className="text-xs text-slate-400">
                ลากเพื่อสลับตำแหน่ง หรือใช้ปุ่มลูกศรเลื่อนขึ้น-ลง
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

        {/* Tip */}
        <div className="mt-3 p-2.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-xs text-indigo-300 flex items-center gap-2 shrink-0">
          <Sparkles className="w-4 h-4 text-indigo-400 shrink-0" />
          <span>บัตรลำดับที่ 1 จะแสดงเป็นใบแรกสุดในแถบภาพรวม</span>
        </div>

        {/* Card List */}
        <div className="my-3 space-y-2 overflow-y-auto pr-1 flex-1">
          {orderedList.map((card, idx) => {
            const isTailwind = card.colorGradient?.startsWith('from-');
            const isDragging = draggedIndex === idx;

            return (
              <div
                key={card.id}
                draggable
                onDragStart={(e) => handleDragStart(e, idx)}
                onDragOver={(e) => handleDragOver(e, idx)}
                onDragEnd={handleDragEnd}
                className={`p-2.5 rounded-xl border transition-all flex items-center gap-2.5 select-none ${
                  isDragging
                    ? 'border-indigo-500 bg-indigo-950/40 shadow-lg scale-[1.02] opacity-80'
                    : 'border-slate-800 bg-slate-800/50 hover:bg-slate-800 hover:border-slate-700'
                }`}
              >
                {/* Grip Handle */}
                <div
                  className="p-1 text-slate-500 hover:text-slate-300 cursor-grab active:cursor-grabbing"
                  title="คลิกลากเพื่อย้ายตำแหน่ง"
                >
                  <GripVertical className="w-4 h-4" />
                </div>

                {/* Index Badge */}
                <span className="w-6 h-6 rounded-lg bg-slate-900 border border-slate-700 text-xs font-bold font-mono text-slate-300 flex items-center justify-center shrink-0">
                  {idx + 1}
                </span>

                {/* Card Mini Swatch Preview */}
                <div
                  className={`w-7 h-5 rounded-md shadow-sm border border-white/20 shrink-0 ${
                    isTailwind ? `bg-gradient-to-r ${card.colorGradient}` : ''
                  }`}
                  style={!isTailwind && card.colorGradient ? { background: card.colorGradient } : undefined}
                />

                {/* Card Info */}
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-bold text-white truncate">
                    {card.name}
                  </div>
                  <div className="text-[11px] text-slate-400 truncate flex items-center gap-1.5">
                    <span>{card.bank}</span>
                    <span>•</span>
                    <span className="font-mono">•••• {card.last4}</span>
                    <span>•</span>
                    <span className="text-[10px] text-slate-300 font-semibold bg-black/40 px-1 py-0.2 rounded">
                      {card.cardType || 'VISA'}
                    </span>
                  </div>
                </div>

                {/* Move Controls */}
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => moveUp(idx)}
                    disabled={idx === 0}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700 disabled:opacity-20 disabled:hover:bg-transparent transition cursor-pointer"
                    title="เลื่อนขึ้น"
                  >
                    <ArrowUp className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => moveDown(idx)}
                    disabled={idx === orderedList.length - 1}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700 disabled:opacity-20 disabled:hover:bg-transparent transition cursor-pointer"
                    title="เลื่อนลง"
                  >
                    <ArrowDown className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer Actions */}
        <div className="pt-3 border-t border-slate-800 flex items-center justify-between shrink-0">
          <button
            type="button"
            onClick={handleReset}
            className="text-xs text-slate-400 hover:text-slate-200 flex items-center gap-1 transition cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>คืนค่าเดิม</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
            >
              ยกเลิก
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/30 transition flex items-center gap-1.5 cursor-pointer"
            >
              <Check className="w-3.5 h-3.5" />
              <span>บันทึกลำดับ</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
