import React, { useState, useRef, useEffect } from 'react';
import { User } from 'firebase/auth';
import { GoogleSheetInfo } from '../types';
import { GoogleSignInButton } from './GoogleSignInButton';
import {
  CreditCard as CardIcon,
  FileSpreadsheet,
  RefreshCw,
  ExternalLink,
  Plus,
  LogOut,
  Bell,
  CheckCircle2,
  BarChart3,
  Image as ImageIcon,
  Menu,
  X,
  Settings,
  ChevronRight,
  User as UserIcon,
  LogIn,
  ChevronDown,
} from 'lucide-react';

interface HeaderProps {
  user: User | null;
  isLoggingIn: boolean;
  onLogin: () => void;
  onLogout: () => void;
  sheetInfo: GoogleSheetInfo | null;
  isSyncing: boolean;
  onSyncWithSheets: () => void;
  onOpenSheetModal: () => void;
  onOpenNewTxModal: () => void;
  onOpenCardManageModal: () => void;
  onOpenBackgroundModal?: () => void;
  hasCustomBg?: boolean;
  urgentDueCount: number;
  activeTab: 'tracker' | 'dashboard';
  onTabChange: (tab: 'tracker' | 'dashboard') => void;
}

export const Header: React.FC<HeaderProps> = ({
  user,
  isLoggingIn,
  onLogin,
  onLogout,
  sheetInfo,
  isSyncing,
  onSyncWithSheets,
  onOpenSheetModal,
  onOpenNewTxModal,
  onOpenCardManageModal,
  onOpenBackgroundModal,
  hasCustomBg,
  urgentDueCount,
  activeTab,
  onTabChange,
}) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isAccountOpen, setIsAccountOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const accountRef = useRef<HTMLDivElement>(null);

  // Close menus when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
      if (accountRef.current && !accountRef.current.contains(event.target as Node)) {
        setIsAccountOpen(false);
      }
    };
    if (isMenuOpen || isAccountOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isMenuOpen, isAccountOpen]);

  return (
    <header className="sticky top-0 z-40 bg-slate-900/90 backdrop-blur-md border-b border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-20">
          {/* Account Login Function & Profile Display (Replaced CardPulse title) */}
          <div className="relative" ref={accountRef}>
            {user ? (
              // Case A: User Logged In - Show Account Profile with Photo ID & Name
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsAccountOpen(!isAccountOpen)}
                  className={`flex items-center gap-2.5 p-1.5 sm:p-2 pr-2.5 sm:pr-3.5 rounded-2xl border transition-all duration-200 cursor-pointer group text-left ${
                    isAccountOpen
                      ? 'bg-indigo-600/20 border-indigo-500 shadow-md ring-1 ring-indigo-500/40'
                      : 'bg-slate-800/60 hover:bg-slate-800 border-slate-700/70 hover:border-indigo-500/50'
                  }`}
                  title="คลิกเพื่อดูข้อมูลบัญชีผู้ใช้ หรือออกจากระบบ"
                >
                  {/* Account Photo ID */}
                  <div className="relative shrink-0">
                    {user.photoURL ? (
                      <img
                        src={user.photoURL}
                        alt={user.displayName || 'Account Photo ID'}
                        className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl object-cover border-2 border-indigo-400 shadow-md ring-2 ring-indigo-500/20 group-hover:scale-105 transition"
                      />
                    ) : (
                      <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-gradient-to-tr from-indigo-600 via-violet-600 to-cyan-500 flex items-center justify-center font-bold text-white text-sm border-2 border-indigo-400 shadow-md group-hover:scale-105 transition">
                        {user.displayName
                          ? user.displayName.slice(0, 2).toUpperCase()
                          : (user.email ? user.email.slice(0, 2).toUpperCase() : 'ID')}
                      </div>
                    )}
                    {/* Active Status Dot */}
                    <span
                      className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-500 border-2 border-slate-900 shadow-sm"
                      title="เข้าสู่ระบบอยู่"
                    />
                  </div>

                  {/* Account Name & Details */}
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-xs sm:text-sm font-bold text-white tracking-tight truncate max-w-[110px] sm:max-w-[170px] group-hover:text-indigo-200 transition">
                        {user.displayName || user.email?.split('@')[0] || 'บัญชีของฉัน'}
                      </span>
                      <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 shrink-0">
                        บัญชี ID
                      </span>
                      <ChevronDown
                        className={`w-3.5 h-3.5 text-slate-400 group-hover:text-white transition duration-200 ${
                          isAccountOpen ? 'rotate-180 text-indigo-400' : ''
                        }`}
                      />
                    </div>

                    <div className="flex items-center gap-1.5 text-[10px] sm:text-[11px] text-slate-400 mt-0.5">
                      <span className="truncate max-w-[120px] sm:max-w-[160px]">
                        {user.email || 'Google Account'}
                      </span>
                      {urgentDueCount > 0 && (
                        <span className="flex items-center gap-0.5 px-1.5 py-0.2 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30 text-[9px] shrink-0 font-medium animate-pulse">
                          <Bell className="w-2.5 h-2.5" />
                          {urgentDueCount}
                        </span>
                      )}
                    </div>
                  </div>
                </button>

                {/* Account Details Dropdown */}
                {isAccountOpen && (
                  <div className="absolute left-0 top-full mt-2 w-72 sm:w-80 bg-slate-900/95 border border-slate-700 rounded-2xl shadow-2xl shadow-black/80 p-4 space-y-3.5 backdrop-blur-md z-50 animate-in fade-in zoom-in-95 duration-150">
                    {/* Account Profile Header */}
                    <div className="flex items-center gap-3 pb-3 border-b border-slate-800">
                      <div className="relative shrink-0">
                        {user.photoURL ? (
                          <img
                            src={user.photoURL}
                            alt="Profile"
                            className="w-12 h-12 rounded-xl object-cover border-2 border-indigo-400 shadow-lg"
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-indigo-600 to-cyan-500 flex items-center justify-center font-bold text-white text-base">
                            {user.displayName ? user.displayName.slice(0, 2).toUpperCase() : 'ID'}
                          </div>
                        )}
                        <span className="absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-slate-900" />
                      </div>
                      <div className="min-w-0">
                        <span className="text-sm font-bold text-white block truncate">
                          {user.displayName || 'บัญชีผู้ใช้งาน'}
                        </span>
                        <span className="text-xs text-slate-400 block truncate font-mono">
                          {user.email}
                        </span>
                        <span className="inline-flex items-center gap-1 text-[10px] text-emerald-400 mt-1 font-medium bg-emerald-500/10 px-1.5 py-0.2 rounded">
                          <CheckCircle2 className="w-3 h-3" /> เข้าสู่ระบบสำเร็จ
                        </span>
                      </div>
                    </div>

                    {/* Google Sheets Sync Status */}
                    <div className="p-2.5 rounded-xl bg-slate-800/60 border border-slate-700/50 space-y-1.5 text-xs">
                      <div className="flex items-center justify-between text-slate-300">
                        <span className="font-semibold flex items-center gap-1.5 text-[11px]">
                          <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Google Sheets Sync</span>
                        </span>
                        <span className="text-[10px] text-emerald-400 font-medium">เชื่อมต่ออยู่</span>
                      </div>
                      <div className="text-[10px] text-slate-400 truncate font-mono bg-slate-900/80 px-2 py-1 rounded border border-slate-800">
                        {sheetInfo?.title || 'CardPulse Credit Card Tracker'}
                      </div>
                    </div>

                    {/* Quick Sync & Logout Actions */}
                    <div className="flex items-center gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => {
                          setIsAccountOpen(false);
                          onSyncWithSheets();
                        }}
                        disabled={isSyncing}
                        className="flex-1 py-2 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer disabled:opacity-50"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                        <span>{isSyncing ? 'กำลังซิงค์...' : 'ซิงค์ข้อมูล'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setIsAccountOpen(false);
                          onLogout();
                        }}
                        className="py-2 px-3 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-300 text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer"
                        title="ออกจากระบบ"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                        <span>ออก</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              // Case B: User NOT Logged In - Render Login Account Function directly in title position!
              <button
                type="button"
                onClick={onLogin}
                disabled={isLoggingIn}
                className="flex items-center gap-2.5 p-1.5 sm:p-2 pr-3.5 sm:pr-4 rounded-2xl bg-gradient-to-r from-indigo-950/80 via-slate-900 to-slate-900 border border-indigo-500/40 hover:border-indigo-400 hover:shadow-lg hover:shadow-indigo-500/20 transition-all duration-200 cursor-pointer group text-left"
                title="คลิกเพื่อเข้าสู่ระบบบัญชี Google"
              >
                {/* Login Icon / Avatar Placeholder */}
                <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-cyan-500 flex items-center justify-center text-white shrink-0 shadow-md group-hover:scale-105 transition">
                  {isLoggingIn ? (
                    <RefreshCw className="w-5 h-5 animate-spin" />
                  ) : (
                    <UserIcon className="w-5 h-5" />
                  )}
                </div>

                {/* Login Title & Subtext */}
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs sm:text-sm font-bold text-white group-hover:text-indigo-300 transition flex items-center gap-1">
                      เข้าสู่ระบบ (Login Account)
                      <LogIn className="w-3.5 h-3.5 text-indigo-400 group-hover:translate-x-0.5 transition" />
                    </span>
                    {urgentDueCount > 0 && (
                      <span className="flex items-center gap-0.5 px-1.5 py-0.2 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30 text-[9px] font-medium shrink-0">
                        <Bell className="w-2.5 h-2.5" />
                        {urgentDueCount}
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] sm:text-[11px] text-slate-400 group-hover:text-slate-300 transition truncate">
                    {isLoggingIn ? 'กำลังเชื่อมต่อ Google...' : 'เชื่อมต่อบัญชี Google & ซิงค์ชีต'}
                  </p>
                </div>
              </button>
            )}
          </div>

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

          {/* Right Action Controls: Compact Button + Hamburger Menu */}
          <div className="flex items-center gap-2" ref={menuRef}>
            {/* Quick Add Expense Button (Reduced by 60% in size as requested) */}
            <button
              type="button"
              onClick={onOpenNewTxModal}
              className="px-2.5 py-1.5 sm:px-3 sm:py-1.5 rounded-lg text-xs font-semibold bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-400 hover:to-indigo-500 text-white shadow-md shadow-indigo-600/25 flex items-center gap-1 transition active:scale-95 cursor-pointer shrink-0"
              title="บันทึกรายการใช้จ่ายใหม่"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>บันทึกรายจ่าย</span>
            </button>

            {/* Hamburger Button (Next to Add Expense Button) */}
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

                {/* Badge indicator if background or google is active */}
                {(hasCustomBg || user) && (
                  <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-slate-900" />
                )}
              </button>

              {/* Hamburger Dropdown Menu containing Google Sheets & Wallpaper settings */}
              {isMenuOpen && (
                <div className="absolute right-0 top-full mt-2 w-72 sm:w-80 bg-slate-900/95 border border-slate-700/90 rounded-2xl shadow-2xl shadow-black/70 p-3 space-y-2.5 backdrop-blur-md z-50 animate-in fade-in zoom-in-95 duration-150">
                  {/* Menu Header */}
                  <div className="flex items-center justify-between pb-2 border-b border-slate-800 px-1">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-white">
                      <Settings className="w-3.5 h-3.5 text-indigo-400" />
                      <span>เมนูและการตั้งค่า</span>
                    </div>
                    <span className="text-[10px] text-slate-400">CardPulse Menu</span>
                  </div>

                  {/* 1. Change Background Wallpaper Item */}
                  <div>
                    <button
                      type="button"
                      onClick={() => {
                        setIsMenuOpen(false);
                        onOpenBackgroundModal && onOpenBackgroundModal();
                      }}
                      className="w-full flex items-center justify-between p-2.5 rounded-xl bg-slate-800/60 hover:bg-slate-800 border border-slate-700/50 hover:border-slate-600 transition text-left cursor-pointer group"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400 group-hover:scale-105 transition">
                          <ImageIcon className="w-4 h-4" />
                        </div>
                        <div>
                          <span className="text-xs font-semibold text-white block">
                            เปลี่ยนภาพพื้นหลัง
                          </span>
                          <span className="text-[10px] text-slate-400">
                            อัปโหลดรูปภาพและปรับกรอบภาพตามต้องการ
                          </span>
                        </div>
                      </div>
                      {hasCustomBg ? (
                        <span className="px-1.5 py-0.5 rounded-md text-[10px] font-semibold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                          เปิดใช้งาน
                        </span>
                      ) : (
                        <ChevronRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-slate-300" />
                      )}
                    </button>
                  </div>

                  {/* 2. Credit Card Management Item */}
                  <div>
                    <button
                      type="button"
                      onClick={() => {
                        setIsMenuOpen(false);
                        onOpenCardManageModal();
                      }}
                      className="w-full flex items-center justify-between p-2.5 rounded-xl bg-slate-800/60 hover:bg-slate-800 border border-slate-700/50 hover:border-slate-600 transition text-left cursor-pointer group"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400 group-hover:scale-105 transition">
                          <CardIcon className="w-4 h-4" />
                        </div>
                        <div>
                          <span className="text-xs font-semibold text-white block">
                            จัดการบัตรเครดิต
                          </span>
                          <span className="text-[10px] text-slate-400">
                            เพิ่ม/แก้ไขบัตร, วันตัดรอบ & วันครบกำหนด
                          </span>
                        </div>
                      </div>
                      <ChevronRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-slate-300" />
                    </button>
                  </div>

                  {/* 2. Google Sheets Integration Section */}
                  <div className="p-2.5 rounded-xl bg-slate-800/60 border border-slate-700/50 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="p-1 rounded bg-emerald-500/10 text-emerald-400">
                          <FileSpreadsheet className="w-3.5 h-3.5" />
                        </div>
                        <span className="text-xs font-semibold text-white">
                          การเชื่อมต่อ Google Sheets
                        </span>
                      </div>
                      {user && (
                        <span className="flex items-center gap-1 text-[10px] font-medium text-emerald-400">
                          <CheckCircle2 className="w-3 h-3" /> เชื่อมต่อแล้ว
                        </span>
                      )}
                    </div>

                    {user ? (
                      <div className="space-y-2 pt-0.5">
                        <div className="text-[11px] text-slate-300 truncate font-mono bg-slate-900/90 px-2 py-1 rounded border border-slate-800">
                          {sheetInfo?.title || 'เชื่อมต่อ Google Sheets แล้ว'}
                        </div>

                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              onSyncWithSheets();
                            }}
                            disabled={isSyncing}
                            className="flex-1 py-1.5 px-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-medium flex items-center justify-center gap-1 transition cursor-pointer disabled:opacity-50"
                          >
                            <RefreshCw className={`w-3 h-3 ${isSyncing ? 'animate-spin' : ''}`} />
                            <span>{isSyncing ? 'กำลังบันทึก...' : 'ซิงค์ข้อมูล'}</span>
                          </button>

                          {sheetInfo?.spreadsheetUrl && (
                            <a
                              href={sheetInfo.spreadsheetUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="p-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-200 transition"
                              title="เปิดสเปรดชีตใน Google Sheets"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                          )}

                          <button
                            type="button"
                            onClick={() => {
                              setIsMenuOpen(false);
                              onOpenSheetModal();
                            }}
                            className="py-1.5 px-2.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-200 transition text-[11px] font-medium cursor-pointer"
                            title="ตั้งค่า Google Sheet"
                          >
                            ตั้งค่า
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-1.5">
                        <p className="text-[10px] text-slate-400">
                          ซิงค์และสำรองข้อมูลรายจ่ายของคุณลง Google Sheets อัตโนมัติ
                        </p>
                        <GoogleSignInButton
                          onClick={() => {
                            setIsMenuOpen(false);
                            onLogin();
                          }}
                          isLoading={isLoggingIn}
                          text="เชื่อมต่อ Google Sheets"
                        />
                      </div>
                    )}
                  </div>

                  {/* 3. User Profile & Logout (If Signed in) */}
                  {user && (
                    <div className="pt-2 border-t border-slate-800 flex items-center justify-between px-1">
                      <div className="flex items-center gap-2 min-w-0">
                        {user.photoURL ? (
                          <img
                            src={user.photoURL}
                            alt="User"
                            className="w-7 h-7 rounded-full object-cover border border-slate-700 shrink-0"
                          />
                        ) : (
                          <div className="w-7 h-7 rounded-full bg-indigo-600 flex items-center justify-center text-[10px] font-bold text-white shrink-0">
                            {user.email ? user.email.slice(0, 2).toUpperCase() : 'U'}
                          </div>
                        )}
                        <div className="min-w-0">
                          <span className="text-xs font-semibold text-white block truncate max-w-[140px]">
                            {user.displayName || user.email?.split('@')[0]}
                          </span>
                          <span className="text-[10px] text-slate-400 block truncate max-w-[140px]">
                            {user.email}
                          </span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          setIsMenuOpen(false);
                          onLogout();
                        }}
                        className="py-1 px-2 text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 rounded-lg text-xs flex items-center gap-1 transition cursor-pointer"
                        title="ออกจากระบบ"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                        <span className="text-[11px]">ออก</span>
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
