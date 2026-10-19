import React, { useState, useRef, useEffect } from 'react';
import {
  CreditCard as CardIcon,
  FileSpreadsheet,
  Plus,
  Bell,
  BarChart3,
  Image as ImageIcon,
  Menu,
  X,
  Settings,
  ChevronRight,
  Sparkles,
  Edit2,
  FileText,
} from 'lucide-react';

interface HeaderProps {
  brandName?: string;
  brandLogo?: string | null;
  brandTagline?: string;
  onOpenBrandModal?: () => void;
  onOpenNewTxModal: () => void;
  onOpenCardManageModal: () => void;
  onOpenBackgroundModal?: () => void;
  onOpenExportModal: () => void;
  hasCustomBg?: boolean;
  urgentDueCount: number;
  activeTab: 'tracker' | 'dashboard';
  onTabChange: (tab: 'tracker' | 'dashboard') => void;
}

export const Header: React.FC<HeaderProps> = ({
  brandName = 'CardPulse',
  brandLogo = null,
  brandTagline = 'ระบบติดตามและจัดการค่าบัตรเครดิต',
  onOpenBrandModal,
  onOpenNewTxModal,
  onOpenCardManageModal,
  onOpenBackgroundModal,
  onOpenExportModal,
  hasCustomBg,
  urgentDueCount,
  activeTab,
  onTabChange,
}) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close hamburger menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    if (isMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isMenuOpen]);

  return (
    <header className="sticky top-0 z-40 bg-slate-900/90 backdrop-blur-md border-b border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-20">
          {/* Brand Logo, Name & Tagline (Customizable via onOpenBrandModal) */}
          <button
            type="button"
            onClick={onOpenBrandModal}
            className="flex items-center gap-3 group text-left cursor-pointer p-1 -ml-1 rounded-2xl hover:bg-slate-800/50 transition duration-150"
            title="คลิกเพื่อปรับแต่งชื่อแบรนด์ โลโก้ และข้อความคำโปรย"
          >
            {/* Logo Image or Default Icon */}
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-gradient-to-tr from-indigo-600 via-violet-600 to-cyan-500 p-0.5 shadow-lg shadow-indigo-600/30 flex items-center justify-center shrink-0 group-hover:scale-105 transition duration-200 overflow-hidden">
              <div className="w-full h-full bg-slate-950/50 rounded-[14px] flex items-center justify-center overflow-hidden">
                {brandLogo ? (
                  <img
                    src={brandLogo}
                    alt={brandName}
                    className="w-full h-full object-cover rounded-[14px]"
                  />
                ) : (
                  <CardIcon className="w-5 h-5 text-white" />
                )}
              </div>
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-xl font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-100 to-indigo-200 bg-clip-text text-transparent group-hover:text-indigo-200 transition">
                  {brandName}
                </h1>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 hidden xs:inline-block">
                  Tracker
                </span>
                {urgentDueCount > 0 && (
                  <span
                    className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/40 text-[10px] font-bold animate-pulse"
                    title={`มีรายการแจ้งเตือนด่วน ${urgentDueCount} รายการ`}
                  >
                    <Bell className="w-3 h-3 fill-rose-400" />
                    <span>{urgentDueCount}</span>
                  </span>
                )}
                <Edit2 className="w-3 h-3 text-slate-500 opacity-0 group-hover:opacity-100 transition hidden sm:inline-block" />
              </div>
              <p className="text-[11px] text-slate-400 font-medium hidden sm:block truncate max-w-[280px]">
                {brandTagline}
              </p>
            </div>
          </button>

          {/* Navigation Tabs (Center) */}
          <div className="hidden lg:flex items-center p-1 bg-slate-950/70 border border-slate-800 rounded-xl">
            <button
              type="button"
              onClick={() => onTabChange('tracker')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                activeTab === 'tracker'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <CardIcon className="w-3.5 h-3.5" />
              <span>ภาพรวมและบันทึก</span>
            </button>
            <button
              type="button"
              onClick={() => onTabChange('dashboard')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                activeTab === 'dashboard'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span>แดชบอร์ดย้อนหลัง</span>
            </button>
          </div>

          {/* Right Action Controls: Quick Add Expense Button + Hamburger Menu ONLY */}
          <div className="flex items-center gap-2" ref={menuRef}>
            {/* Quick Add Expense Button (Reduced by 60% in size) */}
            <button
              type="button"
              onClick={onOpenNewTxModal}
              className="px-2.5 py-1.5 sm:px-3 sm:py-1.5 rounded-lg text-xs font-semibold bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-400 hover:to-indigo-500 text-white shadow-md shadow-indigo-600/25 flex items-center gap-1 transition active:scale-95 cursor-pointer shrink-0"
              title="บันทึกรายการใช้จ่ายใหม่"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>บันทึกรายจ่าย</span>
            </button>

            {/* Hamburger Button (Export and settings reside ONLY here as requested) */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className={`p-1.5 sm:p-2 rounded-lg border transition flex items-center justify-center cursor-pointer relative ${
                  isMenuOpen
                    ? 'bg-indigo-600 text-white border-indigo-500 shadow-md shadow-indigo-500/20'
                    : 'bg-slate-800/90 hover:bg-slate-700/90 text-slate-300 hover:text-white border-slate-700'
                }`}
                title="เมนูตั้งค่าและบริการ"
                aria-label="เมนูหลัก"
              >
                {isMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}

                {/* Badge indicator if custom background is active */}
                {hasCustomBg && (
                  <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-slate-900" />
                )}
              </button>

              {/* Hamburger Dropdown Menu */}
              {isMenuOpen && (
                <div className="absolute right-0 top-full mt-2 w-72 sm:w-80 bg-slate-900/95 border border-slate-700/90 rounded-2xl shadow-2xl shadow-black/70 p-3 space-y-2 backdrop-blur-md z-50 animate-in fade-in zoom-in-95 duration-150">
                  {/* Menu Header */}
                  <div className="flex items-center justify-between pb-2 border-b border-slate-800 px-1">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-white">
                      <Settings className="w-3.5 h-3.5 text-indigo-400" />
                      <span>เมนูและการตั้งค่า</span>
                    </div>
                    <span className="text-[10px] text-slate-400">{brandName} Menu</span>
                  </div>

                  {/* 1. Export Data (CSV & PDF) - ONLY accessible in hamburger button */}
                  <div>
                    <button
                      type="button"
                      onClick={() => {
                        setIsMenuOpen(false);
                        onOpenExportModal();
                      }}
                      className="w-full flex items-center justify-between p-2.5 rounded-xl bg-slate-800/60 hover:bg-slate-800 border border-slate-700/50 hover:border-emerald-500/40 transition text-left cursor-pointer group"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 group-hover:scale-105 transition shrink-0">
                          <FileSpreadsheet className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <span className="text-xs font-semibold text-white block group-hover:text-emerald-300 transition">
                            ส่งออกข้อมูล (Export CSV / PDF)
                          </span>
                          <span className="text-[10px] text-slate-400 block truncate">
                            ดาวน์โหลดรายงานสรุป PDF หรือไฟล์ CSV สำหรับ Excel
                          </span>
                        </div>
                      </div>
                      <ChevronRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-slate-300 shrink-0" />
                    </button>
                  </div>

                  {/* 2. Brand & Logo Customization */}
                  <div>
                    <button
                      type="button"
                      onClick={() => {
                        setIsMenuOpen(false);
                        onOpenBrandModal && onOpenBrandModal();
                      }}
                      className="w-full flex items-center justify-between p-2.5 rounded-xl bg-slate-800/60 hover:bg-slate-800 border border-slate-700/50 hover:border-violet-500/40 transition text-left cursor-pointer group"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="p-2 rounded-lg bg-violet-500/10 text-violet-400 group-hover:scale-105 transition shrink-0">
                          <Sparkles className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <span className="text-xs font-semibold text-white block group-hover:text-violet-300 transition">
                            ตั้งค่าชื่อแบรนด์และโลโก้
                          </span>
                          <span className="text-[10px] text-slate-400 block truncate">
                            เปลี่ยนชื่อแอป, โลโก้ และคำโปรยใต้ชื่อ
                          </span>
                        </div>
                      </div>
                      <ChevronRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-slate-300 shrink-0" />
                    </button>
                  </div>

                  {/* 3. Change Background Wallpaper Item */}
                  <div>
                    <button
                      type="button"
                      onClick={() => {
                        setIsMenuOpen(false);
                        onOpenBackgroundModal && onOpenBackgroundModal();
                      }}
                      className="w-full flex items-center justify-between p-2.5 rounded-xl bg-slate-800/60 hover:bg-slate-800 border border-slate-700/50 hover:border-indigo-500/40 transition text-left cursor-pointer group"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400 group-hover:scale-105 transition shrink-0">
                          <ImageIcon className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <span className="text-xs font-semibold text-white block">
                            เปลี่ยนภาพพื้นหลัง
                          </span>
                          <span className="text-[10px] text-slate-400 block truncate">
                            อัปโหลดรูปภาพและปรับกรอบพรีวิว
                          </span>
                        </div>
                      </div>
                      {hasCustomBg ? (
                        <span className="px-1.5 py-0.5 rounded-md text-[10px] font-semibold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 shrink-0">
                          เปิดใช้งาน
                        </span>
                      ) : (
                        <ChevronRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-slate-300 shrink-0" />
                      )}
                    </button>
                  </div>

                  {/* 4. Credit Card Management Item */}
                  <div>
                    <button
                      type="button"
                      onClick={() => {
                        setIsMenuOpen(false);
                        onOpenCardManageModal();
                      }}
                      className="w-full flex items-center justify-between p-2.5 rounded-xl bg-slate-800/60 hover:bg-slate-800 border border-slate-700/50 hover:border-indigo-500/40 transition text-left cursor-pointer group"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400 group-hover:scale-105 transition shrink-0">
                          <CardIcon className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <span className="text-xs font-semibold text-white block">
                            จัดการบัตรเครดิต
                          </span>
                          <span className="text-[10px] text-slate-400 block truncate">
                            เพิ่ม/แก้ไขบัตร, วันตัดรอบ & วันครบกำหนด
                          </span>
                        </div>
                      </div>
                      <ChevronRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-slate-300 shrink-0" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
