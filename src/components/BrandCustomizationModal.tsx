import React, { useState, useRef, useEffect } from 'react';
import {
  X,
  Upload,
  Image as ImageIcon,
  RotateCcw,
  Sparkles,
  CreditCard as CardIcon,
  Check,
  Trash2,
  HelpCircle,
  Eye,
} from 'lucide-react';

interface BrandCustomizationModalProps {
  isOpen: boolean;
  onClose: () => void;
  brandName: string;
  brandLogo: string | null;
  brandTagline: string;
  onSaveBrand: (name: string, logo: string | null, tagline: string) => void;
}

const DEFAULT_BRAND_NAME = 'CardPulse';
const DEFAULT_BRAND_TAGLINE = 'ระบบติดตามและจัดการค่าบัตรเครดิต';

export const BrandCustomizationModal: React.FC<BrandCustomizationModalProps> = ({
  isOpen,
  onClose,
  brandName,
  brandLogo,
  brandTagline,
  onSaveBrand,
}) => {
  const [name, setName] = useState<string>(brandName || DEFAULT_BRAND_NAME);
  const [tagline, setTagline] = useState<string>(brandTagline || DEFAULT_BRAND_TAGLINE);
  const [logo, setLogo] = useState<string | null>(brandLogo);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync state when opened
  useEffect(() => {
    if (isOpen) {
      setName(brandName || DEFAULT_BRAND_NAME);
      setTagline(brandTagline || DEFAULT_BRAND_TAGLINE);
      setLogo(brandLogo);
      setErrorMsg(null);
    }
  }, [isOpen, brandName, brandLogo, brandTagline]);

  if (!isOpen) return null;

  // Handle Logo File Upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    setErrorMsg(null);
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate type
    if (!file.type.startsWith('image/')) {
      setErrorMsg('กรุณาเลือกไฟล์รูปภาพที่ถูกต้อง (PNG, JPG, SVG, WebP)');
      return;
    }

    // Validate size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setErrorMsg('ขนาดไฟล์รูปภาพต้องไม่เกิน 5MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      if (!dataUrl) return;

      // Optimize image if it's a huge raster photo
      const img = new Image();
      img.onload = () => {
        const maxDim = 320;
        let width = img.width;
        let height = img.height;

        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            const optimized = canvas.toDataURL('image/png', 0.95);
            setLogo(optimized);
            return;
          }
        }
        setLogo(dataUrl);
      };
      img.onerror = () => {
        setErrorMsg('ไม่สามารถประมวลผลรูปภาพนี้ได้');
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  };

  const handleResetToDefault = () => {
    setName(DEFAULT_BRAND_NAME);
    setTagline(DEFAULT_BRAND_TAGLINE);
    setLogo(null);
    setErrorMsg(null);
  };

  const handleSave = () => {
    const finalName = name.trim() || DEFAULT_BRAND_NAME;
    const finalTagline = tagline.trim() || DEFAULT_BRAND_TAGLINE;
    onSaveBrand(finalName, logo, finalTagline);
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 overflow-y-auto bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200"
    >
      <div className="relative w-full max-w-xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl shadow-indigo-950/40 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-slate-800 bg-slate-900/90 sticky top-0 z-10 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 shadow-inner">
              <Sparkles className="w-6 h-6 text-indigo-400" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
                ตั้งค่าชื่อแบรนด์และโลโก้
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                ปรับเปลี่ยนชื่อแอป รูปภาพโลโก้ และคำอธิบายใต้ชื่อตามที่คุณต้องการ
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
            title="ปิดหน้าต่าง"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <div className="p-4 sm:p-6 space-y-5 overflow-y-auto max-h-[75vh] custom-scrollbar">
          {/* Error notice */}
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
              <HelpCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* SECTION 1: Live Header Preview */}
          <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span className="flex items-center gap-1.5 font-medium text-slate-300">
                <Eye className="w-3.5 h-3.5 text-indigo-400" />
                ตัวอย่างการแสดงผลบน Header (Live Preview)
              </span>
              <span className="text-[10px] text-slate-500">แสดงผลจริงทันที</span>
            </div>

            {/* Mock Header Bar */}
            <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 flex items-center gap-3 shadow-inner">
              {/* Logo Preview */}
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-indigo-600 via-violet-600 to-cyan-500 p-0.5 shadow-lg shadow-indigo-600/30 flex items-center justify-center shrink-0 overflow-hidden">
                <div className="w-full h-full bg-slate-950/50 rounded-[14px] flex items-center justify-center overflow-hidden">
                  {logo ? (
                    <img
                      src={logo}
                      alt={name}
                      className="w-full h-full object-cover rounded-[14px]"
                    />
                  ) : (
                    <CardIcon className="w-5 h-5 text-white" />
                  )}
                </div>
              </div>

              {/* Title & Tagline Preview */}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-100 to-indigo-200 bg-clip-text text-transparent truncate">
                    {name.trim() || DEFAULT_BRAND_NAME}
                  </h3>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 shrink-0">
                    Tracker
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 font-medium truncate mt-0.5">
                  {tagline.trim() || DEFAULT_BRAND_TAGLINE}
                </p>
              </div>
            </div>
          </div>

          {/* SECTION 2: Logo Image Customization */}
          <div className="p-4 rounded-2xl bg-slate-800/40 border border-slate-700/60 space-y-3.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-white flex items-center gap-1.5">
                <ImageIcon className="w-4 h-4 text-indigo-400" />
                <span>1. รูปภาพโลโก้แบรนด์ (Brand Logo Image)</span>
              </label>
              {logo && (
                <button
                  type="button"
                  onClick={() => setLogo(null)}
                  className="text-[11px] font-medium text-rose-400 hover:text-rose-300 flex items-center gap-1 cursor-pointer transition"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>ใช้ไอคอนบัตรเริ่มต้น</span>
                </button>
              )}
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-4">
              {/* Logo preview thumbnail */}
              <div className="w-20 h-20 rounded-2xl bg-slate-900 border-2 border-indigo-500/40 shadow-xl flex items-center justify-center overflow-hidden shrink-0 relative group">
                {logo ? (
                  <img src={logo} alt="Logo" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-gradient-to-tr from-indigo-600 via-violet-600 to-cyan-500 flex items-center justify-center">
                    <CardIcon className="w-9 h-9 text-white" />
                  </div>
                )}
                {logo && (
                  <button
                    type="button"
                    onClick={() => setLogo(null)}
                    className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-white text-xs font-medium cursor-pointer"
                    title="ลบโลโก้"
                  >
                    ลบ
                  </button>
                )}
              </div>

              {/* Upload trigger */}
              <div className="flex-1 w-full space-y-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/svg+xml"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full py-3 px-4 rounded-xl border border-dashed border-indigo-500/50 hover:border-indigo-400 bg-indigo-600/10 hover:bg-indigo-600/20 text-indigo-200 text-xs font-semibold flex items-center justify-center gap-2 transition cursor-pointer"
                >
                  <Upload className="w-4 h-4 text-indigo-400" />
                  <span>{logo ? 'เปลี่ยนรูปภาพโลโก้ใหม่' : 'อัปโหลดรูปภาพโลโก้'}</span>
                </button>
                <p className="text-[10px] text-slate-400 text-center sm:text-left">
                  แนะนำภาพทรงสี่เหลี่ยมจัตุรัส (Square) หรือโลโก้พื้นหลังโปร่งใส (PNG, SVG, WebP) ขนาดไม่เกิน 5MB
                </p>
              </div>
            </div>
          </div>

          {/* SECTION 3: Brand Name Customization */}
          <div className="p-4 rounded-2xl bg-slate-800/40 border border-slate-700/60 space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-white">
                2. ชื่อแบรนด์ / ชื่อแอปพลิเคชัน (Brand Name)
              </label>
              <button
                type="button"
                onClick={() => setName(DEFAULT_BRAND_NAME)}
                className="text-[11px] text-indigo-400 hover:text-indigo-300 cursor-pointer"
              >
                ค่าเริ่มต้น ({DEFAULT_BRAND_NAME})
              </button>
            </div>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={40}
              placeholder="ระบุชื่อแบรนด์ เช่น CardPulse, My Cards, บัตรของฉัน"
              className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 font-bold tracking-tight"
            />
            <div className="flex justify-between text-[10px] text-slate-500 px-1">
              <span>แสดงเป็นชื่อหลักบนส่วนหัวของแอปและในรายงาน PDF</span>
              <span>{name.length}/40</span>
            </div>
          </div>

          {/* SECTION 4: Tagline / Subtitle Customization */}
          <div className="p-4 rounded-2xl bg-slate-800/40 border border-slate-700/60 space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-white">
                3. ข้อความคำโปรยใต้ชื่อแบรนด์ (Subtitle / Tagline)
              </label>
              <button
                type="button"
                onClick={() => setTagline(DEFAULT_BRAND_TAGLINE)}
                className="text-[11px] text-indigo-400 hover:text-indigo-300 cursor-pointer"
              >
                ค่าเริ่มต้น
              </button>
            </div>
            <input
              type="text"
              value={tagline}
              onChange={(e) => setTagline(e.target.value)}
              maxLength={80}
              placeholder="เช่น ระบบติดตามและจัดการค่าบัตรเครดิต"
              className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
            />
            <div className="flex justify-between text-[10px] text-slate-500 px-1">
              <span>ข้อความคำอธิบายที่จะแสดงใต้ชื่อแบรนด์บน Header</span>
              <span>{tagline.length}/80</span>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 sm:p-5 border-t border-slate-800 bg-slate-900/95 flex items-center justify-between gap-3 sticky bottom-0 z-10 backdrop-blur-md">
          <button
            type="button"
            onClick={handleResetToDefault}
            className="px-3.5 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-800 transition flex items-center gap-1.5 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>คืนค่าเริ่มต้นทั้งหมด</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 transition cursor-pointer"
            >
              ยกเลิก
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold text-white bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 shadow-lg shadow-indigo-600/30 transition flex items-center gap-1.5 cursor-pointer"
            >
              <Check className="w-4 h-4" />
              <span>บันทึกการเปลี่ยนแปลง</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
