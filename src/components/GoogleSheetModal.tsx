import React, { useState } from 'react';
import { GoogleSheetInfo } from '../types';
import {
  FileSpreadsheet,
  ExternalLink,
  RefreshCw,
  X,
  CheckCircle2,
  Table,
  Layers,
  Calendar,
  AlertCircle,
  HelpCircle,
} from 'lucide-react';

interface GoogleSheetModalProps {
  isOpen: boolean;
  onClose: () => void;
  sheetInfo: GoogleSheetInfo | null;
  isSyncing: boolean;
  onSync: () => void;
  onCreateNewSheet: () => void;
}

export const GoogleSheetModal: React.FC<GoogleSheetModalProps> = ({
  isOpen,
  onClose,
  sheetInfo,
  isSyncing,
  onSync,
  onCreateNewSheet,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl max-w-lg w-full p-6 shadow-2xl text-slate-100 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white tracking-tight">
                จัดการ Google Sheets
              </h3>
              <p className="text-xs text-slate-400">
                ข้อมูลรายการใช้จ่ายและบัตรเครดิตจะบันทึกลงในสเปรดชีตของคุณอัตโนมัติ
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

        <div className="mt-4 space-y-4">
          {/* Status Box */}
          {sheetInfo ? (
            <div className="p-4 rounded-xl bg-emerald-950/30 border border-emerald-500/30 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                  <div>
                    <h4 className="text-sm font-semibold text-white">{sheetInfo.title}</h4>
                    <p className="text-xs text-slate-400 font-mono mt-0.5 truncate max-w-[220px]">
                      ID: {sheetInfo.spreadsheetId}
                    </p>
                  </div>
                </div>

                <a
                  href={sheetInfo.spreadsheetUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white transition flex items-center gap-1.5 shadow-sm cursor-pointer shrink-0"
                >
                  <span>เปิดดูใน Sheets</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>

              {sheetInfo.lastSyncedAt && (
                <div className="text-[11px] text-emerald-300/80 pt-2 border-t border-emerald-500/20 flex items-center justify-between">
                  <span>ซิงค์ล่าสุด:</span>
                  <span>{new Date(sheetInfo.lastSyncedAt).toLocaleString('th-TH')}</span>
                </div>
              )}
            </div>
          ) : (
            <div className="p-4 rounded-xl bg-amber-950/30 border border-amber-500/30 space-y-2">
              <div className="flex items-center gap-2 text-amber-300">
                <AlertCircle className="w-5 h-5 shrink-0" />
                <h4 className="text-sm font-semibold">ยังไม่มีสเปรดชีตเชื่อมต่อ</h4>
              </div>
              <p className="text-xs text-slate-300">
                คลิกปุ่มด้านล่างเพื่อสร้าง Google Spreadsheet สำหรับระบบบัตรเครดิตนี้ใน Google Drive ของคุณ
              </p>
              <button
                type="button"
                onClick={onCreateNewSheet}
                className="mt-2 w-full py-2.5 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white transition flex items-center justify-center gap-1.5 cursor-pointer shadow-md"
              >
                <FileSpreadsheet className="w-4 h-4" />
                สร้าง Google Sheet บันทึกบัตรเครดิต
              </button>
            </div>
          )}

          {/* Structure Overview */}
          <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-700/50 space-y-3">
            <h4 className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
              <Table className="w-4 h-4 text-indigo-400" />
              <span>โครงสร้างแผ่นงานใน Google Sheets (3 แท็บ):</span>
            </h4>

            <div className="space-y-2 text-xs">
              <div className="p-2.5 rounded-lg bg-slate-800/80 border border-slate-700/60">
                <div className="font-semibold text-indigo-300">1. Transactions (รายการใช้จ่าย)</div>
                <div className="text-[11px] text-slate-400 mt-0.5">
                  บันทึก วันที่, บัตร, รายการ, หมวดหมู่, ยอดเงิน THB, รอบบิล, ผ่อนชำระ, สถานะการชำระ, หมายเหตุ
                </div>
              </div>

              <div className="p-2.5 rounded-lg bg-slate-800/80 border border-slate-700/60">
                <div className="font-semibold text-emerald-300">2. Cards (ข้อมูลบัตรเครดิต)</div>
                <div className="text-[11px] text-slate-400 mt-0.5">
                  บันทึก ชื่อบัตร, ธนาคาร, 4 ตัวท้าย, วงเงิน, วันตัดรอบบิล, วันครบกำหนดชำระ
                </div>
              </div>

              <div className="p-2.5 rounded-lg bg-slate-800/80 border border-slate-700/60">
                <div className="font-semibold text-amber-300">3. Monthly_Summary (สรุปยอดรายเดือน)</div>
                <div className="text-[11px] text-slate-400 mt-0.5">
                  สรุปยอดใช้จ่ายรวมแต่ละรอบเดือน, ยอดที่ต้องชำระ, ยอดที่ชำระแล้ว และค้างชำระ
                </div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="pt-2 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={onCreateNewSheet}
              className="text-xs text-slate-400 hover:text-slate-200 underline cursor-pointer"
            >
              สร้างสเปรดชีตใหม่แทน
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onSync}
                disabled={isSyncing || !sheetInfo}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white disabled:opacity-50 transition flex items-center gap-1.5 cursor-pointer shadow-md"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                {isSyncing ? 'กำลังซิงค์...' : 'ซิงค์ข้อมูลเดี๋ยวนี้'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
