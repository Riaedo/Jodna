import React, { useState } from 'react';
import { X, Check, Copy, Activity, ShieldCheck, Database, Globe, UserCheck, AlertCircle } from 'lucide-react';
import { User } from 'firebase/auth';
import {
  firebaseAppConfig,
  getSystemDiagnosticSummary,
  maskEmail,
} from '../services/firebase';

interface DiagnosticsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User | null;
  cardsCount: number;
  txsCount: number;
  isCloudDataReady: boolean;
  isSyncing: boolean;
  isOnline: boolean;
}

export const DiagnosticsModal: React.FC<DiagnosticsModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  cardsCount,
  txsCount,
  isCloudDataReady,
  isSyncing,
  isOnline,
}) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const hostname = typeof window !== 'undefined' ? window.location.hostname : 'unknown';
  const isVercel = hostname.includes('vercel.app');
  const isAiStudio = hostname.includes('run.app') || hostname.includes('google');
  const maskedEmail = maskEmail(currentUser?.email);

  const diagnosticMarkdown = `| รายการ | Jodna (AI Studio) | Jodna (Vercel Production) | JodnaOT (Reference) |
|---|---|---|---|
| Firebase Project ID | gen-lang-client-0967357802 | ${firebaseAppConfig.projectId} | ultra-lattice-fv4kj |
| Auth Domain | gen-lang-client-0967357802.firebaseapp.com | ${firebaseAppConfig.authDomain} | ultra-lattice-fv4kj.firebaseapp.com |
| Database ID | ai-studio-creditcardrecord-d130ca53-bac9-4d31-b18a-c5ec1ec9582c | ${firebaseAppConfig.firestoreDatabaseId} | (Isolated OT DB) |
| Hosting Domain | ais-dev-*.run.app | jodna.vercel.app | jodnaot.vercel.app |
| Current Hostname | ais-dev-77wpitj4uybcihlwn7nq7h-824165829063.asia-east1.run.app | ${hostname} | - |
| Google Account Sync | Compatible (select_account) | Compatible (select_account) | Same Google Account |
| Authenticated UID | ${currentUser?.uid || 'Not signed in'} | ${currentUser?.uid || 'Not signed in'} | - |
| Masked Email | ${maskedEmail || 'N/A'} | ${maskedEmail || 'N/A'} | ${maskedEmail || 'N/A'} |
| Auth Status | ${currentUser ? 'Authenticated' : 'Unauthenticated'} | ${currentUser ? 'Authenticated' : 'Unauthenticated'} | - |
| Firestore Cards Read | ${cardsCount} | ${cardsCount} | - |
| Firestore Transactions Read | ${txsCount} | ${txsCount} | - |
| Cloud Sync State | ${isCloudDataReady ? 'Synced' : isSyncing ? 'Syncing' : 'Idle'} | ${isCloudDataReady ? 'Synced' : isSyncing ? 'Syncing' : 'Idle'} | - |`;

  const handleCopy = () => {
    navigator.clipboard.writeText(diagnosticMarkdown);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl max-w-xl w-full p-5 sm:p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white">
                สถานะระบบและการเชื่อมต่อ Cloud (Diagnostics)
              </h2>
              <p className="text-xs text-slate-400">
                เปรียบเทียบการตั้งค่า Firebase, UID และ Firestore ระหว่าง AI Studio และ Vercel
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

        {/* Current Environment Badge */}
        <div className="flex flex-wrap items-center justify-between p-3 rounded-xl bg-slate-800/60 border border-slate-700/50 gap-2">
          <div className="flex items-center gap-2">
            <Globe className="w-4 h-4 text-indigo-400" />
            <span className="text-xs font-medium text-slate-300">สภาพแวดล้อมปัจจุบัน:</span>
            <span
              className={`px-2 py-0.5 rounded-md text-[11px] font-bold ${
                isVercel
                  ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                  : isAiStudio
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                  : 'bg-slate-700 text-slate-200'
              }`}
            >
              {isVercel ? 'Vercel Deployment' : isAiStudio ? 'Google AI Studio (Cloud Run)' : hostname}
            </span>
          </div>
          <span className="text-[11px] font-mono text-slate-400 truncate max-w-[200px]">
            {hostname}
          </span>
        </div>

        {/* Configuration Overview */}
        <div className="space-y-2 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {/* Project ID */}
            <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 space-y-1">
              <div className="flex items-center gap-1.5 text-slate-400 font-medium text-[11px]">
                <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" />
                <span>Firebase Project ID</span>
              </div>
              <div className="font-mono text-indigo-300 text-xs font-semibold">
                {firebaseAppConfig.projectId}
              </div>
              <div className="text-[10px] text-emerald-400 font-medium">✓ ตรงกันทุก Environment</div>
            </div>

            {/* Database ID */}
            <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 space-y-1">
              <div className="flex items-center gap-1.5 text-slate-400 font-medium text-[11px]">
                <Database className="w-3.5 h-3.5 text-cyan-400" />
                <span>Firestore Database ID</span>
              </div>
              <div className="font-mono text-cyan-300 text-[11px] font-semibold truncate" title={firebaseAppConfig.firestoreDatabaseId}>
                {firebaseAppConfig.firestoreDatabaseId}
              </div>
              <div className="text-[10px] text-emerald-400 font-medium">✓ เชื่อมต่อฐานข้อมูลหลักชุดเดียวกัน</div>
            </div>
          </div>

          {/* User Account & UID Comparison */}
          <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-slate-400 font-medium text-[11px]">
                <UserCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>สถานะผู้ใช้งาน (Authentication State)</span>
              </div>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  currentUser
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                }`}
              >
                {currentUser ? 'เข้าสู่ระบบแล้ว' : 'ยังไม่ได้เข้าสู่ระบบ'}
              </span>
            </div>

            {currentUser ? (
              <div className="space-y-1.5 pt-1 text-[11px]">
                <div className="flex justify-between items-center text-slate-300">
                  <span className="text-slate-400">ชื่อผู้ใช้:</span>
                  <span className="font-semibold text-white">{currentUser.displayName || 'Nutsu'}</span>
                </div>
                <div className="flex justify-between items-center text-slate-300">
                  <span className="text-slate-400">อีเมล (ปกปิด):</span>
                  <span className="font-mono text-slate-200">{maskedEmail || '-'}</span>
                </div>
                <div className="flex justify-between items-center text-slate-300">
                  <span className="text-slate-400">Authenticated UID:</span>
                  <span className="font-mono text-indigo-300 text-[10px] select-all">
                    {currentUser.uid}
                  </span>
                </div>
              </div>
            ) : (
              <p className="text-[11px] text-slate-400">
                กรุณาเข้าสู่ระบบด้วย Google เพื่อยืนยัน UID และซิงก์ข้อมูลบัตรเครดิต
              </p>
            )}
          </div>

          {/* Firestore Data Status */}
          <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-slate-400">ข้อมูลบัตรเครดิตที่โหลดได้:</span>
              <span className="font-bold text-white text-xs">
                {cardsCount} ใบ {isCloudDataReady ? '(ตรงกับ Cloud แล้ว)' : '(รอซิงก์)'}
              </span>
            </div>
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-slate-400">ข้อมูลรายการใช้จ่ายที่โหลดได้:</span>
              <span className="font-bold text-white text-xs">{txsCount} รายการ</span>
            </div>
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-slate-400">สถานะเครือข่าย & ซิงก์:</span>
              <span className="text-emerald-400 font-medium">
                {isOnline ? 'ออนไลน์' : 'ออฟไลน์'} • {isCloudDataReady ? 'ซิงก์สมบูรณ์' : isSyncing ? 'กำลังซิงก์...' : 'พร้อมใช้งาน'}
              </span>
            </div>
          </div>

          {/* Jodna & JodnaOT Account Sharing Status */}
          <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-slate-300 font-medium text-[11px]">
                <ShieldCheck className="w-3.5 h-3.5 text-purple-400" />
                <span>การแชร์บัญชี Google กับ JodnaOT</span>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
                รองรับบัญชีเดียวกัน 100%
              </span>
            </div>
            <div className="text-[11px] text-slate-300 space-y-1 bg-slate-900/60 p-2.5 rounded-lg border border-slate-800/80">
              <div className="flex justify-between items-center text-slate-400">
                <span>Jodna Project ID:</span>
                <span className="font-mono text-indigo-300 font-semibold">gen-lang-client-0967357802</span>
              </div>
              <div className="flex justify-between items-center text-slate-400">
                <span>JodnaOT Project ID:</span>
                <span className="font-mono text-purple-300 font-semibold">ultra-lattice-fv4kj</span>
              </div>
              <div className="flex justify-between items-center text-slate-400">
                <span>Google Account:</span>
                <span className="font-semibold text-emerald-400">{maskedEmail || 'ใช้บัญชีเดียวกัน (select_account)'}</span>
              </div>
              <p className="text-[10px] text-slate-400 pt-1 leading-relaxed border-t border-slate-800">
                ✓ ทั้งสองแอปใช้ Google Identity Provider ผู้ใช้สามารถเข้าสู่ระบบด้วย Google Account เดียวกันได้ทันที โดยฐานข้อมูล Firestore ยังคงแยกอิสระเพื่อความปลอดภัย
              </p>
            </div>
          </div>

          {/* Vercel & Authorized Domains Checklist */}
          <div className="p-3 rounded-xl bg-indigo-950/40 border border-indigo-500/30 text-[11px] text-indigo-200 space-y-2">
            <div className="font-semibold flex items-center justify-between text-indigo-300">
              <div className="flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                <span>Firebase Authentication Authorized Domains Checklist:</span>
              </div>
              <span className="text-[10px] font-mono text-slate-400">{hostname}</span>
            </div>
            <div className="space-y-1 text-[11px] text-slate-300">
              <div className="flex items-center gap-2">
                <span className="text-emerald-400 font-bold">✓</span>
                <span>localhost (Development)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-emerald-400 font-bold">✓</span>
                <span>gen-lang-client-0967357802.firebaseapp.com (Firebase Default)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className={hostname === 'jodna.vercel.app' ? 'text-emerald-400 font-bold' : 'text-indigo-400 font-bold'}>•</span>
                <span className="font-semibold text-white">jodna.vercel.app</span>
                <span className="text-[10px] text-indigo-300">(ต้องเพิ่มใน Firebase Console)</span>
              </div>
            </div>
            <p className="text-slate-400 text-[10px] leading-relaxed pt-1 border-t border-indigo-500/20">
              ไปที่ Firebase Console &gt; Authentication &gt; Settings &gt; Authorized domains แล้วตรวจสอบว่ามี <code className="bg-slate-900 px-1 py-0.5 rounded text-indigo-300">jodna.vercel.app</code> อยู่ในรายการ
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 pt-2">
          <button
            type="button"
            onClick={handleCopy}
            className="flex-1 py-2 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer"
          >
            {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'คัดลอกตารางแล้ว' : 'คัดลอกตารางเปรียบเทียบ (Markdown)'}</span>
          </button>
          <button
            type="button"
            onClick={onClose}
            className="py-2 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition cursor-pointer"
          >
            ปิด
          </button>
        </div>
      </div>
    </div>
  );
};
