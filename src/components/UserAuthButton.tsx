import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { firebaseAppConfig } from '../services/firebase';
import {
  Cloud,
  CloudOff,
  RefreshCw,
  AlertCircle,
  LogOut,
  ShieldCheck,
  ChevronDown,
  Copy,
  Check,
  ExternalLink,
  Smartphone,
  Monitor,
  X,
} from 'lucide-react';

export const UserAuthButton: React.FC = () => {
  const {
    user,
    loading,
    syncStatus,
    authError,
    clearAuthError,
    signInWithGoogle,
    signInWithGoogleRedirect,
    signInWithGooglePopup,
    logout,
  } = useAuth();

  const [isOpen, setIsOpen] = useState(false);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [copiedText, setCopiedText] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSignInAuto = async () => {
    setIsSigningIn(true);
    try {
      await signInWithGoogle('auto');
    } catch (e) {
      console.error('Sign-in error:', e);
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleSignInRedirect = async () => {
    setIsSigningIn(true);
    try {
      await signInWithGoogleRedirect();
    } catch (e) {
      console.error('Redirect sign-in error:', e);
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleSignInPopup = async () => {
    setIsSigningIn(true);
    try {
      await signInWithGooglePopup();
    } catch (e) {
      console.error('Popup sign-in error:', e);
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await logout();
      setIsOpen(false);
    } catch (e) {
      console.error(e);
    }
  };

  const copyToClipboard = (text: string) => {
    if (navigator?.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedText(true);
      setTimeout(() => setCopiedText(false), 2000);
    }
  };

  if (loading) {
    return (
      <div className="h-8 w-8 rounded-xl bg-slate-800 border border-slate-700 animate-pulse shrink-0" />
    );
  }

  return (
    <>
      {/* Auth Button or User Profile */}
      {!user ? (
        <div className="relative shrink-0 flex items-center gap-1" ref={dropdownRef}>
          <button
            type="button"
            onClick={handleSignInAuto}
            disabled={isSigningIn}
            title="เข้าสู่ระบบด้วย Google เพื่อซิงค์ข้อมูลบน Cloud (Firebase)"
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-800/90 hover:bg-slate-700/90 border border-slate-700 hover:border-indigo-500/60 shadow-sm text-slate-200 hover:text-white text-xs font-bold transition-all active:scale-95 shrink-0 cursor-pointer disabled:opacity-60"
          >
            {isSigningIn ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-indigo-400 shrink-0" />
            ) : (
              <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
            )}
            <span className="hidden sm:inline">เข้าสู่ระบบ</span>
          </button>

          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            className="p-1.5 rounded-xl border border-slate-700 bg-slate-800/90 hover:bg-slate-700/90 text-slate-400 hover:text-white shrink-0 transition cursor-pointer"
            title="ตัวเลือกการเข้าสู่ระบบ (Popup หรือ Redirect)"
            aria-label="ตัวเลือกการเข้าสู่ระบบ"
          >
            <ChevronDown className="w-3.5 h-3.5 shrink-0" />
          </button>

          {isOpen && (
            <div className="absolute right-0 top-full mt-1.5 w-60 max-w-[calc(100vw-1.5rem)] bg-slate-900 rounded-2xl shadow-2xl border border-slate-700/90 p-2 z-50 text-xs backdrop-blur-md">
              <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                เลือกวิธีเข้าสู่ระบบ
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  handleSignInPopup();
                }}
                className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl hover:bg-slate-800 text-left transition-colors cursor-pointer"
              >
                <Monitor className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                <div>
                  <div className="font-bold text-slate-100">แบบหน้าต่างเด้ง (Popup)</div>
                  <div className="text-[10px] text-slate-400">เหมาะสำหรับ PC / เดสก์ท็อป</div>
                </div>
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  handleSignInRedirect();
                }}
                className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl hover:bg-slate-800 text-left transition-colors mt-1 cursor-pointer"
              >
                <Smartphone className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <div>
                  <div className="font-bold text-slate-100">แบบสลับหน้า (Redirect)</div>
                  <div className="text-[10px] text-slate-400">เสถียรที่สุดสำหรับมือถือ / แท็บเล็ต</div>
                </div>
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="relative shrink-0 flex items-center" ref={dropdownRef}>
          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            className="flex items-center gap-1.5 p-1 sm:px-2 sm:py-1 rounded-xl bg-slate-800/90 hover:bg-slate-700/80 border border-slate-700 transition-all text-xs shrink-0 select-none cursor-pointer"
            title={user.displayName || user.email || 'บัญชีผู้ใช้'}
          >
            {user.photoURL ? (
              <img
                src={user.photoURL}
                alt={user.displayName || 'Avatar'}
                className="w-6 h-6 sm:w-7 sm:h-7 min-w-[24px] min-h-[24px] max-w-[28px] max-h-[28px] rounded-lg object-cover ring-1 ring-indigo-500/40 shrink-0 aspect-square"
              />
            ) : (
              <div className="w-6 h-6 sm:w-7 sm:h-7 min-w-[24px] min-h-[24px] rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold text-[10px] shrink-0 aspect-square">
                {(user.displayName?.[0] || user.email?.[0] || 'U').toUpperCase()}
              </div>
            )}

            <div className="hidden md:flex flex-col text-left leading-none min-w-0">
              <span className="font-bold text-[11px] text-slate-100 truncate max-w-[80px]">
                {user.displayName?.split(' ')[0] || 'ผู้ใช้'}
              </span>
              {syncStatus === 'saving' ? (
                <span className="text-[9px] text-indigo-400 font-semibold flex items-center gap-0.5 mt-0.5">
                  <RefreshCw className="w-2.5 h-2.5 animate-spin" />
                  <span>กำลังซิงก์</span>
                </span>
              ) : syncStatus === 'error' ? (
                <span className="text-[9px] text-rose-400 font-semibold flex items-center gap-0.5 mt-0.5">
                  <AlertCircle className="w-2.5 h-2.5" />
                  <span>ข้อผิดพลาด</span>
                </span>
              ) : syncStatus === 'offline' ? (
                <span className="text-[9px] text-amber-400 font-semibold flex items-center gap-0.5 mt-0.5">
                  <CloudOff className="w-2.5 h-2.5" />
                  <span>ออฟไลน์</span>
                </span>
              ) : (
                <span className="text-[9px] text-emerald-400 font-semibold flex items-center gap-0.5 mt-0.5">
                  <Cloud className="w-2.5 h-2.5" />
                  <span>ซิงค์แล้ว</span>
                </span>
              )}
            </div>

            <ChevronDown className="w-3 h-3 text-slate-400 shrink-0" />
          </button>

          {isOpen && (
            <div className="absolute right-0 top-full mt-1.5 w-64 max-w-[calc(100vw-1.5rem)] bg-slate-900/95 rounded-2xl shadow-2xl border border-slate-700/90 p-3 z-50 animate-in fade-in zoom-in-95 duration-150 backdrop-blur-md">
              {/* User info */}
              <div className="flex items-center gap-2.5 pb-2.5 border-b border-slate-800">
                {user.photoURL ? (
                  <img
                    src={user.photoURL}
                    alt={user.displayName || 'Avatar'}
                    className="w-9 h-9 rounded-xl object-cover ring-2 ring-indigo-500/30"
                  />
                ) : (
                  <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold text-sm">
                    {(user.displayName?.[0] || user.email?.[0] || 'U').toUpperCase()}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <h5 className="text-xs font-bold text-white truncate">
                    {user.displayName || 'ผู้ใช้ Google'}
                  </h5>
                  <p className="text-[10px] text-slate-400 truncate">{user.email}</p>
                </div>
              </div>

              {/* Sync status detail */}
              <div className="py-2.5 border-b border-slate-800">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[11px] text-slate-400">สถานะคลาวด์:</span>
                  {syncStatus === 'synced' && (
                    <span className="text-[10px] font-bold text-emerald-400 flex items-center gap-1 bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-700/60">
                      <ShieldCheck className="w-3 h-3" />
                      ซิงค์แบบเรียลไทม์
                    </span>
                  )}
                  {syncStatus === 'saving' && (
                    <span className="text-[10px] font-bold text-indigo-400 flex items-center gap-1 bg-indigo-950/60 px-2 py-0.5 rounded-full border border-indigo-700/60">
                      <RefreshCw className="w-3 h-3 animate-spin" />
                      กำลังบันทึก...
                    </span>
                  )}
                  {syncStatus === 'offline' && (
                    <span className="text-[10px] font-bold text-amber-400 flex items-center gap-1 bg-amber-950/60 px-2 py-0.5 rounded-full border border-amber-700/60">
                      <CloudOff className="w-3 h-3" />
                      โหมดออฟไลน์
                    </span>
                  )}
                  {syncStatus === 'error' && (
                    <span className="text-[10px] font-bold text-rose-400 flex items-center gap-1 bg-rose-950/60 px-2 py-0.5 rounded-full border border-rose-700/60">
                      <AlertCircle className="w-3 h-3" />
                      ข้อผิดพลาด
                    </span>
                  )}
                  {syncStatus === 'local' && (
                    <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1 bg-slate-800 px-2 py-0.5 rounded-full">
                      <CloudOff className="w-3 h-3" />
                      ในเครื่อง
                    </span>
                  )}
                </div>
                <p className="text-[10px] text-slate-400 mt-1.5 leading-relaxed">
                  ข้อมูลบัตรเครดิต รายการใช้จ่าย และการตั้งค่าถูกเข้ารหัสและบันทึกลง Google Firebase อย่างปลอดภัย
                </p>
              </div>

              {/* Sign out button */}
              <button
                type="button"
                onClick={handleSignOut}
                className="w-full mt-2 flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold text-rose-400 hover:bg-rose-950/40 transition-colors cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>ออกจากระบบ</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* Auth Error Diagnostic Modal */}
      {authError && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-slate-900 rounded-3xl max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-700/80">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-rose-950/25">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-rose-900/40 text-rose-400">
                  {authError.code === 'auth/disallowed_useragent' ? (
                    <ExternalLink className="w-5 h-5 text-amber-400" />
                  ) : (
                    <AlertCircle className="w-5 h-5" />
                  )}
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white">แจ้งเตือนการเข้าสู่ระบบ Google</h4>
                  <p className="text-[11px] font-mono text-rose-400">
                    รหัสข้อผิดพลาด: {authError.code}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={clearAuthError}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
                aria-label="ปิด"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-4 text-xs">
              <p className="text-slate-200 leading-relaxed font-medium">{authError.message}</p>

              {/* Special instruction for unauthorized-domain */}
              {authError.code === 'auth/unauthorized-domain' && authError.domain && (
                <div className="p-3.5 rounded-2xl bg-slate-800/80 border border-slate-700 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-slate-300">
                      ชื่อโดเมนของแอปที่คุณต้องเพิ่มใน Firebase:
                    </span>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(authError.domain || '')}
                      className="flex items-center gap-1 text-[11px] font-bold text-indigo-400 hover:underline cursor-pointer"
                    >
                      {copiedText ? (
                        <Check className="w-3 h-3 text-emerald-400" />
                      ) : (
                        <Copy className="w-3 h-3" />
                      )}
                      <span>{copiedText ? 'คัดลอกแล้ว!' : 'คัดลอกชื่อโดเมน'}</span>
                    </button>
                  </div>

                  <div className="p-2 rounded-lg bg-slate-950 font-mono text-[11px] text-indigo-400 select-all break-all border border-slate-800">
                    {authError.domain}
                  </div>

                  <div className="text-[11px] text-slate-400 space-y-1">
                    <p className="font-semibold text-slate-200">วิธีแก้ไขด่วน (ใช้เวลา 1 นาที):</p>
                    <ol className="list-decimal list-inside space-y-0.5">
                      <li>
                        เปิด Firebase Console ไปที่โปรเจกต์{' '}
                        <span className="font-bold text-slate-100">{firebaseAppConfig.projectId}</span>
                      </li>
                      <li>
                        ไปที่เมนู <strong>Authentication</strong> &rarr; แท็บ{' '}
                        <strong>Settings</strong> &rarr; <strong>Authorized domains</strong>
                      </li>
                      <li>
                        กดปุ่ม <strong>Add domain</strong> แล้ววางชื่อโดเมนด้านบนลงไปแล้วกด Save
                      </li>
                    </ol>
                  </div>
                </div>
              )}

              {/* Special instruction for In-App Browser (LINE / Facebook / Instagram) */}
              {authError.code === 'auth/disallowed_useragent' && (
                <div className="p-3.5 rounded-2xl bg-slate-800/80 border border-slate-700 space-y-2.5">
                  <div className="font-semibold text-indigo-300">วิธีเปิดใน Safari หรือ Chrome:</div>
                  <ol className="list-decimal list-inside space-y-1 text-slate-300 text-[11px] leading-relaxed">
                    <li>
                      แตะปุ่มจุดสามจุด <span className="text-white font-bold">(•••)</span> หรือไอคอนแชร์ที่มุมจอ
                    </li>
                    <li>
                      เลือก <span className="text-white font-medium">"เปิดใน Safari"</span> หรือ{' '}
                      <span className="text-white font-medium">"เปิดด้วยเบราว์เซอร์ภายนอก / Chrome"</span>
                    </li>
                    <li>คุณจะสามารถเข้าสู่ระบบและเชื่อมต่อ Firebase ได้อย่างเสถียร 100%</li>
                  </ol>
                </div>
              )}

              {/* Suggestion for popup closed / blocked */}
              {(authError.code === 'auth/popup-closed-by-user' ||
                authError.code === 'auth/popup-blocked' ||
                authError.code === 'auth/cancelled-popup-request') && (
                <div className="p-3.5 rounded-2xl bg-amber-950/30 border border-amber-800/50 text-amber-200 space-y-2">
                  <p className="leading-relaxed">
                    เบราว์เซอร์หรือมือถืออาจบล็อกหน้าต่าง Popup แนะนำให้กดปุ่ม{' '}
                    <strong>"เปลี่ยนหน้าเว็บ (Redirect)"</strong> ด้านล่างเพื่อเข้าสู่ระบบโดยตรง
                  </p>
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div className="p-4 border-t border-slate-800 bg-slate-950/50 flex flex-col sm:flex-row items-center justify-end gap-2">
              {authError.code === 'auth/disallowed_useragent' && typeof window !== 'undefined' && (
                <button
                  type="button"
                  onClick={() => copyToClipboard(window.location.href)}
                  className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-semibold cursor-pointer"
                >
                  {copiedText ? (
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                  <span>{copiedText ? 'คัดลอกลิงก์แล้ว!' : 'คัดลอกลิงก์'}</span>
                </button>
              )}

              <button
                type="button"
                onClick={clearAuthError}
                className="w-full sm:w-auto px-4 py-2 rounded-xl text-slate-300 hover:bg-slate-800 text-xs font-semibold cursor-pointer"
              >
                ปิดหน้าต่าง
              </button>

              {(authError.code === 'auth/popup-closed-by-user' ||
                authError.code === 'auth/popup-blocked' ||
                authError.code === 'auth/cancelled-popup-request') && (
                <button
                  type="button"
                  onClick={() => {
                    clearAuthError();
                    handleSignInRedirect();
                  }}
                  className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md shadow-indigo-600/20 cursor-pointer"
                >
                  <Smartphone className="w-3.5 h-3.5" />
                  <span>เข้าสู่ระบบด้วยวิธีเปลี่ยนหน้าเว็บ (Redirect)</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};
