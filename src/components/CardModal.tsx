import React, { useState, useEffect } from 'react';
import { CreditCard } from '../types';
import { PRESET_CARDS } from '../utils/cardUtils';
import {
  X,
  CreditCard as CardIcon,
  Sparkles,
  Palette,
  Edit3,
  Check,
  Plus,
  Wifi,
  RotateCcw,
  Sliders,
} from 'lucide-react';

interface CardModalProps {
  isOpen: boolean;
  initialCard?: CreditCard | null;
  onClose: () => void;
  onSave: (cardData: Omit<CreditCard, 'id'> & { id?: string }) => void;
}

export interface GradientPreset {
  label: string;
  value: string;
  accent: string;
  category?: string;
}

export const GRADIENT_PRESETS: GradientPreset[] = [
  { label: 'เขียวมรกต (KBank)', value: 'from-emerald-950 via-teal-900 to-emerald-800', accent: '#10b981', category: 'ธนาคาร' },
  { label: 'ม่วงเข้ม (SCB)', value: 'from-purple-950 via-violet-900 to-indigo-950', accent: '#8b5cf6', category: 'ธนาคาร' },
  { label: 'ฟ้าคราม (KTC/BBL)', value: 'from-slate-900 via-sky-950 to-blue-950', accent: '#0ea5e9', category: 'ธนาคาร' },
  { label: 'ทองอำพัน (Krungsri)', value: 'from-amber-950 via-amber-800 to-yellow-900', accent: '#f59e0b', category: 'ธนาคาร' },
  { label: 'แดงไวน์ (TTB/Citi)', value: 'from-rose-950 via-red-900 to-rose-950', accent: '#f43f5e', category: 'ธนาคาร' },
  { label: 'ดำหรูหรา (Black / Platinum)', value: 'from-slate-950 via-zinc-900 to-slate-900', accent: '#64748b', category: 'พรีเมียม' },
  { label: 'น้ำเงินรอยัล (Royal Navy)', value: 'from-blue-950 via-indigo-950 to-slate-950', accent: '#3b82f6', category: 'พรีเมียม' },
  { label: 'โรสโกลด์ (Rose Gold)', value: 'from-stone-900 via-rose-950 to-pink-950', accent: '#f472b6', category: 'พรีเมียม' },
  { label: 'ไซเบอร์นีออน (Cyber Neon)', value: 'from-slate-950 via-teal-950 to-cyan-950', accent: '#06b6d4', category: 'โมเดิร์น' },
  { label: 'คาร์บอนคอปเปอร์ (Carbon Copper)', value: 'from-zinc-950 via-stone-900 to-amber-950', accent: '#d97706', category: 'โมเดิร์น' },
];

const DEFAULT_CARD_TYPES = ['VISA', 'Mastercard', 'JCB', 'UnionPay', 'AMEX', 'PromptCard', 'Diners Club'];

const CUSTOM_COLOR_PALETTES = [
  { name: 'ทองหรูหรา (Gold Noir)', from: '#1a1405', via: '#45300d', to: '#1f1604', accent: '#eab308' },
  { name: 'เขียวนีออน (Emerald Glow)', from: '#022c22', via: '#065f46', to: '#064e3b', accent: '#10b981' },
  { name: 'ม่วงลาเวนเดอร์ (Deep Violet)', from: '#1e113a', via: '#4c1d95', to: '#2e1065', accent: '#a855f7' },
  { name: 'น้ำเงินแซฟไฟร์ (Ocean Blue)', from: '#082f49', via: '#0369a1', to: '#0c4a6e', accent: '#38bdf8' },
  { name: 'แดงทับทิม (Ruby Wine)', from: '#3b0716', via: '#881337', to: '#4c0519', accent: '#fb7185' },
  { name: 'ไทเทเนียมกราไฟต์ (Titanium)', from: '#09090b', via: '#27272a', to: '#18181b', accent: '#a1a1aa' },
];

export const CardModal: React.FC<CardModalProps> = ({
  isOpen,
  initialCard,
  onClose,
  onSave,
}) => {
  const [name, setName] = useState('');
  const [bank, setBank] = useState('');
  const [last4, setLast4] = useState('');
  const [creditLimit, setCreditLimit] = useState('100000');
  const [billingCutoffDay, setBillingCutoffDay] = useState(15);
  const [paymentDueDay, setPaymentDueDay] = useState(5);
  const [colorGradient, setColorGradient] = useState(GRADIENT_PRESETS[0].value);
  const [accentColor, setAccentColor] = useState(GRADIENT_PRESETS[0].accent);
  const [cardType, setCardType] = useState('VISA');

  // Custom Theme Editor State
  const [themeTab, setThemeTab] = useState<'presets' | 'custom'>('presets');
  const [customFromColor, setCustomFromColor] = useState('#0f172a');
  const [customViaColor, setCustomViaColor] = useState('#1e1b4b');
  const [customToColor, setCustomToColor] = useState('#020617');
  const [customAccent, setCustomAccent] = useState('#6366f1');
  const [customDirection, setCustomDirection] = useState<'135deg' | '90deg' | '180deg' | 'circle'>('135deg');

  // Card Type Editing State
  const [isEditingCardType, setIsEditingCardType] = useState(false);
  const [availableCardTypes, setAvailableCardTypes] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('custom_card_types');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // ignore
    }
    return DEFAULT_CARD_TYPES;
  });
  const [newCardTypeInput, setNewCardTypeInput] = useState('');

  useEffect(() => {
    if (initialCard) {
      setName(initialCard.name);
      setBank(initialCard.bank);
      setLast4(initialCard.last4);
      setCreditLimit(initialCard.creditLimit.toString());
      setBillingCutoffDay(initialCard.billingCutoffDay);
      setPaymentDueDay(initialCard.paymentDueDay);
      setColorGradient(initialCard.colorGradient);
      setAccentColor(initialCard.accentColor);
      setCardType(initialCard.cardType || 'VISA');

      // Check if current card uses custom gradient (CSS gradient)
      if (initialCard.colorGradient && !initialCard.colorGradient.startsWith('from-')) {
        setThemeTab('custom');
      } else {
        setThemeTab('presets');
      }
    } else {
      setName('');
      setBank('');
      setLast4('');
      setCreditLimit('100000');
      setBillingCutoffDay(15);
      setPaymentDueDay(5);
      setColorGradient(GRADIENT_PRESETS[0].value);
      setAccentColor(GRADIENT_PRESETS[0].accent);
      setCardType('VISA');
      setThemeTab('presets');
      setIsEditingCardType(false);
    }
  }, [initialCard, isOpen]);

  // Compute CSS gradient string for custom theme
  const generateCustomGradient = (
    from: string,
    via: string,
    to: string,
    dir: '135deg' | '90deg' | '180deg' | 'circle'
  ) => {
    if (dir === 'circle') {
      return `radial-gradient(circle at top right, ${via} 0%, ${from} 55%, ${to} 100%)`;
    }
    return `linear-gradient(${dir}, ${from} 0%, ${via} 50%, ${to} 100%)`;
  };

  const applyCustomColors = (
    from = customFromColor,
    via = customViaColor,
    to = customToColor,
    accent = customAccent,
    dir = customDirection
  ) => {
    const cssGradient = generateCustomGradient(from, via, to, dir);
    setColorGradient(cssGradient);
    setAccentColor(accent);
  };

  const handleCustomPaletteSelect = (palette: typeof CUSTOM_COLOR_PALETTES[0]) => {
    setCustomFromColor(palette.from);
    setCustomViaColor(palette.via);
    setCustomToColor(palette.to);
    setCustomAccent(palette.accent);
    applyCustomColors(palette.from, palette.via, palette.to, palette.accent, customDirection);
  };

  const handleAddCustomCardType = () => {
    const trimmed = newCardTypeInput.trim();
    if (!trimmed) return;
    if (!availableCardTypes.includes(trimmed)) {
      const updated = [...availableCardTypes, trimmed];
      setAvailableCardTypes(updated);
      localStorage.setItem('custom_card_types', JSON.stringify(updated));
    }
    setCardType(trimmed);
    setNewCardTypeInput('');
  };

  const handleDeleteCardType = (typeToDelete: string) => {
    const updated = availableCardTypes.filter((t) => t !== typeToDelete);
    setAvailableCardTypes(updated);
    localStorage.setItem('custom_card_types', JSON.stringify(updated));
    if (cardType === typeToDelete) {
      setCardType(updated[0] || 'VISA');
    }
  };

  const applyPreset = (preset: typeof PRESET_CARDS[0]) => {
    setName(preset.name);
    setBank(preset.bank);
    setCreditLimit(preset.creditLimit.toString());
    setBillingCutoffDay(preset.billingCutoffDay);
    setPaymentDueDay(preset.paymentDueDay);
    setColorGradient(preset.colorGradient);
    setAccentColor(preset.accentColor);
    setCardType(preset.cardType || 'VISA');
    setThemeTab('presets');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !bank.trim() || !last4.trim()) return;

    onSave({
      id: initialCard?.id,
      name: name.trim(),
      bank: bank.trim(),
      last4: last4.replace(/\D/g, '').slice(0, 4) || '0000',
      creditLimit: parseFloat(creditLimit) || 50000,
      billingCutoffDay: Number(billingCutoffDay) || 15,
      paymentDueDay: Number(paymentDueDay) || 5,
      colorGradient,
      accentColor,
      cardType: cardType.trim() || 'VISA',
      status: 'active',
    });
    onClose();
  };

  if (!isOpen) return null;

  const isTailwindGradient = colorGradient.startsWith('from-');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-150">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl max-w-xl w-full p-5 sm:p-6 shadow-2xl text-slate-100 max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-3.5 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <CardIcon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-white tracking-tight">
                {initialCard ? 'แก้ไขข้อมูลบัตรเครดิต' : 'เพิ่มบัตรเครดิตใบใหม่'}
              </h3>
              <p className="text-xs text-slate-400">
                ปรับแต่งประเภทบัตร ธีมสีหน้าบัตร และกำหนดรอบบิลได้อย่างอิสระ
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

        {/* Live Card Interactive Preview */}
        <div className="mt-4 mb-2">
          <div className="flex items-center justify-between mb-1.5 px-1">
            <span className="text-[11px] font-semibold text-slate-400 flex items-center gap-1.5 uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              พรีวิวหน้าบัตรเครดิตแบบเรียลไทม์ (Live Preview)
            </span>
            <span className="text-[10px] text-slate-500 font-mono">
              ธีม: {isTailwindGradient ? 'Preset' : 'Custom Gradient'}
            </span>
          </div>

          <div
            className={`relative rounded-2xl p-4 sm:p-5 shadow-2xl border border-white/15 overflow-hidden transition-all duration-300 ${
              isTailwindGradient ? `bg-gradient-to-br ${colorGradient}` : ''
            }`}
            style={{
              background: isTailwindGradient ? undefined : colorGradient,
              boxShadow: `0 10px 30px -10px ${accentColor}40`,
            }}
          >
            {/* Metallic Gloss Overlay */}
            <div className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/10 to-transparent pointer-events-none" />

            {/* Accent border glow */}
            <div
              className="absolute top-0 right-0 w-36 h-36 rounded-full blur-2xl opacity-20 pointer-events-none"
              style={{ backgroundColor: accentColor }}
            />

            {/* Top row: Bank & Card Type */}
            <div className="relative flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold tracking-wider uppercase text-slate-300/80 block">
                  {bank || 'ชื่อธนาคาร / ผู้ออกบัตร'}
                </span>
                <h4 className="text-sm sm:text-base font-bold text-white tracking-tight drop-shadow-sm truncate max-w-[200px]">
                  {name || 'ชื่อบัตรเครดิต'}
                </h4>
              </div>
              <div className="flex items-center gap-2">
                <Wifi className="w-4 h-4 text-slate-200/70 rotate-90" />
                <span className="text-xs font-black tracking-wider text-white bg-black/30 backdrop-blur-md px-2.5 py-0.5 rounded-md border border-white/20 shadow-sm">
                  {cardType || 'VISA'}
                </span>
              </div>
            </div>

            {/* Chip & Masked Digits */}
            <div className="relative flex items-center justify-between my-3 sm:my-4">
              <div className="w-10 h-7 rounded-md bg-gradient-to-tr from-amber-300 via-amber-400 to-amber-500 shadow border border-amber-200/50 flex flex-col justify-around p-1">
                <div className="h-0.5 bg-amber-800/40 rounded-full" />
                <div className="h-0.5 bg-amber-800/40 rounded-full" />
              </div>
              <div className="font-mono text-sm sm:text-base tracking-widest text-white/90 font-bold drop-shadow">
                •••• •••• •••• {last4 || '1234'}
              </div>
            </div>

            {/* Bottom info: Billing & Due */}
            <div className="relative flex items-center justify-between text-[11px] text-slate-200/90 pt-1 border-t border-white/10">
              <div>
                <span className="text-[9px] text-slate-300 block">ตัดรอบบิล</span>
                <span className="font-semibold">ทุกวันที่ {billingCutoffDay}</span>
              </div>
              <div className="text-right">
                <span className="text-[9px] text-rose-300 block">กำหนดชำระ</span>
                <span className="font-semibold text-rose-200">ทุกวันที่ {paymentDueDay}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Bank Presets for New Cards */}
        {!initialCard && (
          <div className="mt-3 p-2.5 bg-slate-800/40 rounded-xl border border-slate-700/50">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-300 mb-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>เลือกจากเทมเพลตธนาคารยอดนิยม:</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {PRESET_CARDS.map((p, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => applyPreset(p)}
                  className="px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 hover:border-indigo-500 transition cursor-pointer"
                >
                  {p.name}
                </button>
              ))}
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {/* Card Name & Bank */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                ชื่อบัตร <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="เช่น KBank Passion, SCB Beyond"
                className="w-full px-3.5 py-2.5 bg-slate-800/80 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                ธนาคาร / ผู้ออกบัตร <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                required
                value={bank}
                onChange={(e) => setBank(e.target.value)}
                placeholder="เช่น กสิกรไทย, ไทยพาณิชย์, KTC"
                className="w-full px-3.5 py-2.5 bg-slate-800/80 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition"
              />
            </div>
          </div>

          {/* Last 4 Digits & Credit Limit */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                เลข 4 ตัวท้าย <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                maxLength={4}
                required
                value={last4}
                onChange={(e) => setLast4(e.target.value)}
                placeholder="1234"
                className="w-full px-3.5 py-2.5 bg-slate-800/80 border border-slate-700 rounded-xl text-sm font-mono text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                วงเงินบัตร (บาท)
              </label>
              <input
                type="number"
                min="0"
                value={creditLimit}
                onChange={(e) => setCreditLimit(e.target.value)}
                placeholder="100000"
                className="w-full px-3.5 py-2.5 bg-slate-800/80 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-indigo-500 transition"
              />
            </div>
          </div>

          {/* SECTION 1: ประเภทบัตร (Card Type) with EDIT Option */}
          <div className="p-3.5 rounded-xl bg-slate-800/50 border border-slate-700/60 space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                <span>ประเภทบัตร (Card Type)</span>
                <span className="text-[10px] text-indigo-400 font-mono font-bold bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">
                  {cardType}
                </span>
              </label>
              <button
                type="button"
                onClick={() => setIsEditingCardType(!isEditingCardType)}
                className={`text-xs font-medium px-2.5 py-1 rounded-lg border transition flex items-center gap-1 cursor-pointer ${
                  isEditingCardType
                    ? 'bg-indigo-600/20 text-indigo-300 border-indigo-500/40'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700 hover:text-white'
                }`}
              >
                <Edit3 className="w-3.5 h-3.5 text-indigo-400" />
                <span>{isEditingCardType ? 'เสร็จสิ้นการแก้ไข' : 'แก้ไข / กำหนดเอง'}</span>
              </button>
            </div>

            {/* Quick Card Type Selection Pills */}
            <div className="flex flex-wrap gap-1.5">
              {availableCardTypes.map((type) => {
                const isSelected = cardType === type;
                return (
                  <div key={type} className="flex items-center">
                    <button
                      type="button"
                      onClick={() => setCardType(type)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition flex items-center gap-1 cursor-pointer ${
                        isSelected
                          ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30 ring-1 ring-indigo-400'
                          : 'bg-slate-800/80 hover:bg-slate-700 text-slate-300 border border-slate-700'
                      }`}
                    >
                      {isSelected && <Check className="w-3 h-3 text-indigo-200" />}
                      <span>{type}</span>
                    </button>
                    {isEditingCardType && !DEFAULT_CARD_TYPES.slice(0, 3).includes(type) && (
                      <button
                        type="button"
                        onClick={() => handleDeleteCardType(type)}
                        title={`ลบประเภท ${type}`}
                        className="ml-1 p-1 text-slate-500 hover:text-rose-400 rounded-lg hover:bg-slate-800 transition cursor-pointer"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>

            {/* If in Edit / Custom Mode: Custom Input Field */}
            {isEditingCardType && (
              <div className="pt-2 border-t border-slate-700/60 animate-in fade-in space-y-2">
                <div className="text-[11px] text-slate-400">
                  พิมพ์ประเภทบัตรของคุณเอง หรือเพิ่มเข้าในรายการเลือก:
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={newCardTypeInput}
                    onChange={(e) => setNewCardTypeInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddCustomCardType();
                      }
                    }}
                    placeholder="เช่น AMEX, Platinum, Corporate, Titanium..."
                    className="flex-1 px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                  <button
                    type="button"
                    onClick={handleAddCustomCardType}
                    disabled={!newCardTypeInput.trim()}
                    className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white transition flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    เพิ่มประเภท
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Billing Cycle Day Settings */}
          <div className="p-3.5 rounded-xl bg-slate-800/50 border border-slate-700/60 space-y-3">
            <h4 className="text-xs font-semibold text-slate-200">
              กำหนดรอบบิล & วันชำระ (ใช้สำหรับระบบแจ้งเตือน)
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] text-slate-300 mb-1">
                  วันตัดรอบบิล (Cut-off Day)
                </label>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-400">ทุกวันที่</span>
                  <input
                    type="number"
                    min="1"
                    max="31"
                    required
                    value={billingCutoffDay}
                    onChange={(e) => setBillingCutoffDay(parseInt(e.target.value, 10))}
                    className="w-20 px-2.5 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white text-center font-bold"
                  />
                  <span className="text-xs text-slate-400">ของทุกเดือน</span>
                </div>
              </div>

              <div>
                <label className="block text-[11px] text-rose-300 mb-1">
                  วันครบกำหนดชำระ (Due Day)
                </label>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-400">ทุกวันที่</span>
                  <input
                    type="number"
                    min="1"
                    max="31"
                    required
                    value={paymentDueDay}
                    onChange={(e) => setPaymentDueDay(parseInt(e.target.value, 10))}
                    className="w-20 px-2.5 py-1.5 bg-slate-800 border border-rose-500/40 rounded-lg text-sm text-rose-300 text-center font-bold"
                  />
                  <span className="text-xs text-slate-400">ของทุกเดือน</span>
                </div>
              </div>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              เช่น ตัดรอบบิลทุกวันที่ {billingCutoffDay} รายการใช้จ่ายหลังวันที่ {billingCutoffDay} จะถูกยกยอดไปรอบบิลเดือนถัดไป • ระบบจะแสดง<span className="text-amber-300 font-semibold">ไอคอนกระดิ่งแจ้งเตือนล่วงหน้า 3 วัน</span>ก่อนถึงวันตัดรอบบิลบนหน้าบัตร และแจ้งเตือนกำหนดชำระเมื่อใกล้ถึงวันที่ {paymentDueDay}
            </p>
          </div>

          {/* SECTION 2: ธีมสีหน้าบัตร (Theme Color) with EDIT / CUSTOM Option */}
          <div className="p-3.5 rounded-xl bg-slate-800/50 border border-slate-700/60 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                <Palette className="w-4 h-4 text-indigo-400" />
                <span>ธีมสีหน้าบัตร (Card Face Theme)</span>
              </label>

              {/* Mode Switcher: Presets vs Edit/Custom */}
              <div className="flex items-center bg-slate-800 p-0.5 rounded-xl border border-slate-700 text-xs">
                <button
                  type="button"
                  onClick={() => setThemeTab('presets')}
                  className={`px-3 py-1 rounded-lg font-medium transition cursor-pointer ${
                    themeTab === 'presets'
                      ? 'bg-indigo-600 text-white shadow'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  ธีมสำเร็จรูป
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setThemeTab('custom');
                    applyCustomColors();
                  }}
                  className={`px-3 py-1 rounded-lg font-medium transition flex items-center gap-1.5 cursor-pointer ${
                    themeTab === 'custom'
                      ? 'bg-indigo-600 text-white shadow'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Sliders className="w-3 h-3" />
                  <span>ปรับแต่งสีเอง</span>
                </button>
              </div>
            </div>

            {/* TAB 1: Preset Color Themes */}
            {themeTab === 'presets' ? (
              <div className="space-y-2">
                <div className="grid grid-cols-2 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
                  {GRADIENT_PRESETS.map((p, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        setColorGradient(p.value);
                        setAccentColor(p.accent);
                      }}
                      className={`p-2.5 rounded-xl border text-left transition flex items-center gap-2.5 cursor-pointer ${
                        colorGradient === p.value
                          ? 'border-indigo-500 ring-2 ring-indigo-500/50 bg-slate-800 shadow-md'
                          : 'border-slate-700/60 bg-slate-800/40 hover:bg-slate-800'
                      }`}
                    >
                      <div
                        className={`w-7 h-5 rounded-md bg-gradient-to-r ${p.value} shadow border border-white/20 shrink-0`}
                      />
                      <div className="truncate">
                        <span className="text-xs text-slate-200 block truncate font-medium">
                          {p.label}
                        </span>
                        <span className="text-[10px] text-slate-500 block truncate">
                          {p.category}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
                <div className="text-right">
                  <button
                    type="button"
                    onClick={() => {
                      setThemeTab('custom');
                      applyCustomColors();
                    }}
                    className="text-xs text-indigo-400 hover:text-indigo-300 font-medium underline cursor-pointer"
                  >
                    ต้องการเฉดสีอื่น? คลิกเพื่อปรับแต่งสีเอง (Edit Custom Theme)
                  </button>
                </div>
              </div>
            ) : (
              /* TAB 2: Edit Custom Theme (Color Pickers & Direction) */
              <div className="space-y-3 pt-1 animate-in fade-in">
                {/* Palette Templates */}
                <div>
                  <div className="text-[11px] font-semibold text-slate-300 mb-1.5 flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-amber-400" />
                    <span>ชุดสีเริ่มต้นสำหรับปรับแต่ง:</span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                    {CUSTOM_COLOR_PALETTES.map((pal, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleCustomPaletteSelect(pal)}
                        className="px-2 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700/80 border border-slate-700 text-left flex items-center gap-2 transition cursor-pointer"
                      >
                        <div
                          className="w-4 h-4 rounded-full border border-white/20 shrink-0"
                          style={{
                            background: `linear-gradient(135deg, ${pal.from}, ${pal.via}, ${pal.to})`,
                          }}
                        />
                        <span className="text-[11px] text-slate-300 truncate">{pal.name}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Color Pickers Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-3 rounded-xl bg-slate-900/90 border border-slate-700/80">
                  {/* From Color */}
                  <div>
                    <label className="block text-[11px] text-slate-300 mb-1 font-medium">
                      สีเริ่มต้น (From)
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={customFromColor}
                        onChange={(e) => {
                          setCustomFromColor(e.target.value);
                          applyCustomColors(e.target.value, customViaColor, customToColor, customAccent, customDirection);
                        }}
                        className="w-8 h-8 rounded-lg cursor-pointer bg-transparent border-0 p-0"
                      />
                      <input
                        type="text"
                        value={customFromColor}
                        onChange={(e) => {
                          setCustomFromColor(e.target.value);
                          if (e.target.value.startsWith('#') && e.target.value.length === 7) {
                            applyCustomColors(e.target.value, customViaColor, customToColor, customAccent, customDirection);
                          }
                        }}
                        className="w-18 px-1.5 py-1 bg-slate-800 border border-slate-700 rounded text-[11px] font-mono text-slate-200 uppercase"
                      />
                    </div>
                  </div>

                  {/* Via Color */}
                  <div>
                    <label className="block text-[11px] text-slate-300 mb-1 font-medium">
                      สีกลาง (Via)
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={customViaColor}
                        onChange={(e) => {
                          setCustomViaColor(e.target.value);
                          applyCustomColors(customFromColor, e.target.value, customToColor, customAccent, customDirection);
                        }}
                        className="w-8 h-8 rounded-lg cursor-pointer bg-transparent border-0 p-0"
                      />
                      <input
                        type="text"
                        value={customViaColor}
                        onChange={(e) => {
                          setCustomViaColor(e.target.value);
                          if (e.target.value.startsWith('#') && e.target.value.length === 7) {
                            applyCustomColors(customFromColor, e.target.value, customToColor, customAccent, customDirection);
                          }
                        }}
                        className="w-18 px-1.5 py-1 bg-slate-800 border border-slate-700 rounded text-[11px] font-mono text-slate-200 uppercase"
                      />
                    </div>
                  </div>

                  {/* To Color */}
                  <div>
                    <label className="block text-[11px] text-slate-300 mb-1 font-medium">
                      สีปลายทาง (To)
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={customToColor}
                        onChange={(e) => {
                          setCustomToColor(e.target.value);
                          applyCustomColors(customFromColor, customViaColor, e.target.value, customAccent, customDirection);
                        }}
                        className="w-8 h-8 rounded-lg cursor-pointer bg-transparent border-0 p-0"
                      />
                      <input
                        type="text"
                        value={customToColor}
                        onChange={(e) => {
                          setCustomToColor(e.target.value);
                          if (e.target.value.startsWith('#') && e.target.value.length === 7) {
                            applyCustomColors(customFromColor, customViaColor, e.target.value, customAccent, customDirection);
                          }
                        }}
                        className="w-18 px-1.5 py-1 bg-slate-800 border border-slate-700 rounded text-[11px] font-mono text-slate-200 uppercase"
                      />
                    </div>
                  </div>

                  {/* Accent Highlight Color */}
                  <div>
                    <label className="block text-[11px] text-indigo-300 mb-1 font-medium">
                      สีไฮไลต์ (Accent)
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={customAccent}
                        onChange={(e) => {
                          setCustomAccent(e.target.value);
                          applyCustomColors(customFromColor, customViaColor, customToColor, e.target.value, customDirection);
                        }}
                        className="w-8 h-8 rounded-lg cursor-pointer bg-transparent border-0 p-0"
                      />
                      <input
                        type="text"
                        value={customAccent}
                        onChange={(e) => {
                          setCustomAccent(e.target.value);
                          if (e.target.value.startsWith('#') && e.target.value.length === 7) {
                            applyCustomColors(customFromColor, customViaColor, customToColor, e.target.value, customDirection);
                          }
                        }}
                        className="w-18 px-1.5 py-1 bg-slate-800 border border-slate-700 rounded text-[11px] font-mono text-indigo-300 uppercase"
                      />
                    </div>
                  </div>
                </div>

                {/* Gradient Direction Selector */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-xs">
                  <div className="flex items-center gap-1.5">
                    <span className="text-slate-400">ทิศทาง:</span>
                    <div className="flex gap-1">
                      {[
                        { label: '↘ เฉียงลง', val: '135deg' },
                        { label: '→ แนวนอน', val: '90deg' },
                        { label: '↓ แนวตั้ง', val: '180deg' },
                        { label: '◉ รัศมีวงกลม', val: 'circle' },
                      ].map((d) => (
                        <button
                          key={d.val}
                          type="button"
                          onClick={() => {
                            setCustomDirection(d.val as any);
                            applyCustomColors(customFromColor, customViaColor, customToColor, customAccent, d.val as any);
                          }}
                          className={`px-2 py-1 rounded-lg text-[11px] transition cursor-pointer ${
                            customDirection === d.val
                              ? 'bg-indigo-600 text-white font-semibold'
                              : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                          }`}
                        >
                          {d.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setColorGradient(GRADIENT_PRESETS[0].value);
                      setAccentColor(GRADIENT_PRESETS[0].accent);
                      setThemeTab('presets');
                    }}
                    className="text-[11px] text-slate-400 hover:text-slate-200 flex items-center gap-1 cursor-pointer"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>กลับไปใช้พรีเซ็ต</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="mt-6 flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl text-sm font-medium text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl text-sm font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/30 transition cursor-pointer flex items-center gap-2"
            >
              <CardIcon className="w-4 h-4" />
              <span>{initialCard ? 'บันทึกการแก้ไข' : 'เพิ่มบัตรเครดิต'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
