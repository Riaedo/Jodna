import React from 'react';
import { AlertTriangle, CheckCircle, ArrowRight, ShieldAlert, X } from 'lucide-react';
import { SyncOperation } from '../services/syncQueue';

interface ConflictModalProps {
  isOpen: boolean;
  onClose: () => void;
  conflicts: SyncOperation[];
  onResolve: (operationId: string, resolution: 'keep_local' | 'keep_server') => Promise<void>;
}

export const ConflictModal: React.FC<ConflictModalProps> = ({
  isOpen,
  onClose,
  conflicts,
  onResolve,
}) => {
  if (!isOpen || conflicts.length === 0) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-amber-500/50 rounded-2xl max-w-2xl w-full p-6 shadow-2xl shadow-black/80 space-y-5 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <span>ตรวจพบข้อมูลขัดแย้ง (Conflict Detected)</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  {conflicts.length} รายการ
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                เอกสารนี้ถูกแก้ไขบนอุปกรณ์อื่นระหว่างที่คุณทำงานออฟไลน์ กรุณาเลือกเวอร์ชันที่ต้องการเก็บไว้
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Conflict List */}
        <div className="flex-1 overflow-y-auto space-y-4 pr-1">
          {conflicts.map((op) => {
            const isCard = op.entityType === 'card';
            const server = op.conflictServerData || {};
            const local = op.payload || {};

            return (
              <div
                key={op.operationId}
                className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-indigo-300 uppercase px-2 py-0.5 rounded bg-indigo-500/20 border border-indigo-500/30">
                      {isCard ? 'บัตรเครดิต' : op.entityType === 'transaction' ? 'รายการใช้จ่าย' : 'โปรไฟล์'}
                    </span>
                    <span className="text-xs font-bold text-white">
                      {isCard ? local.name || local.id : local.title || local.id}
                    </span>
                  </div>
                  <span className="text-[10px] text-amber-400 font-mono">
                    Base: v{op.baseVersion} → Server: v{server.version || '?'}
                  </span>
                </div>

                {/* Side-by-Side Comparison */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  {/* Local version */}
                  <div className="p-3 rounded-lg bg-indigo-950/30 border border-indigo-500/30 space-y-1.5">
                    <div className="flex items-center justify-between text-indigo-300 font-semibold text-[11px]">
                      <span>ข้อมูลบนเครื่องนี้ (แก้ไขออฟไลน์)</span>
                      <span className="text-[10px] text-indigo-400">เวอร์ชันของคุณ</span>
                    </div>
                    {isCard ? (
                      <div className="space-y-1 text-slate-300 text-[11px]">
                        <div>ชื่อบัตร: <b className="text-white">{local.name}</b></div>
                        <div>ธนาคาร: <b className="text-white">{local.bank}</b></div>
                        <div>วงเงิน: <b className="text-white">{Number(local.creditLimit || 0).toLocaleString()} ฿</b></div>
                        <div>วันตัดรอบ / ครบกำหนด: <b className="text-white">{local.billingCutoffDay} / {local.paymentDueDay}</b></div>
                      </div>
                    ) : (
                      <div className="space-y-1 text-slate-300 text-[11px]">
                        <div>รายการ: <b className="text-white">{local.title}</b></div>
                        <div>จำนวนเงิน: <b className="text-white">{Number(local.amount || 0).toLocaleString()} ฿</b></div>
                        <div>หมวดหมู่ / วันที่: <b className="text-white">{local.category} ({local.date})</b></div>
                        <div>สถานะชำระ: <b className="text-white">{local.isPaid ? 'ชำระแล้ว' : 'ยังไม่ชำระ'}</b></div>
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => onResolve(op.operationId, 'keep_local')}
                      className="w-full mt-2 py-1.5 px-3 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-[11px] transition cursor-pointer shadow-sm"
                    >
                      เลือกใช้ข้อมูลเครื่องนี้ (เขียนทับคลาวด์)
                    </button>
                  </div>

                  {/* Server version */}
                  <div className="p-3 rounded-lg bg-slate-800/60 border border-slate-700 space-y-1.5">
                    <div className="flex items-center justify-between text-emerald-400 font-semibold text-[11px]">
                      <span>ข้อมูลบนคลาวด์ (Cloud Firestore)</span>
                      <span className="text-[10px] text-emerald-400">v{server.version || 1}</span>
                    </div>
                    {isCard ? (
                      <div className="space-y-1 text-slate-300 text-[11px]">
                        <div>ชื่อบัตร: <b className="text-white">{server.name || '-'}</b></div>
                        <div>ธนาคาร: <b className="text-white">{server.bank || '-'}</b></div>
                        <div>วงเงิน: <b className="text-white">{Number(server.creditLimit || 0).toLocaleString()} ฿</b></div>
                        <div>วันตัดรอบ / ครบกำหนด: <b className="text-white">{server.billingCutoffDay || '-'} / {server.paymentDueDay || '-'}</b></div>
                      </div>
                    ) : (
                      <div className="space-y-1 text-slate-300 text-[11px]">
                        <div>รายการ: <b className="text-white">{server.title || '-'}</b></div>
                        <div>จำนวนเงิน: <b className="text-white">{Number(server.amount || 0).toLocaleString()} ฿</b></div>
                        <div>หมวดหมู่ / วันที่: <b className="text-white">{server.category || '-'} ({server.date || '-'})</b></div>
                        <div>สถานะชำระ: <b className="text-white">{server.isPaid ? 'ชำระแล้ว' : 'ยังไม่ชำระ'}</b></div>
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => onResolve(op.operationId, 'keep_server')}
                      className="w-full mt-2 py-1.5 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-[11px] transition cursor-pointer shadow-sm"
                    >
                      เลือกใช้ข้อมูลบนคลาวด์ (ยกเลิกที่แก้ไขออฟไลน์)
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="pt-2 border-t border-slate-800 flex justify-end shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="py-1.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300 transition cursor-pointer"
          >
            ปิดหน้าต่าง
          </button>
        </div>
      </div>
    </div>
  );
};
