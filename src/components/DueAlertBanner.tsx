import React, { useState, useMemo } from 'react';
import type { CardDueStatus, CreditCard } from '../types';
import {
  formatThaiCurrency,
  formatThaiDate,
  formatThaiMonth,
  calculateCardCutoffAlertStatus,
} from '../utils/cardUtils';
import {
  AlertTriangle,
  Clock,
  CheckCircle2,
  BellRing,
  CreditCard as CardIcon,
  Check,
  ChevronRight,
  ShieldAlert,
  Bell,
} from 'lucide-react';

interface DueAlertBannerProps {
  dueStatuses: CardDueStatus[];
  cards?: CreditCard[];
  onMarkCardPaid: (cardId: string, cycleMonth: string) => void;
}

export const DueAlertBanner: React.FC<DueAlertBannerProps> = ({
  dueStatuses,
  cards,
  onMarkCardPaid,
}) => {
  const [notificationPermission, setNotificationPermission] = useState<
    NotificationPermission | 'unsupported'
  >(typeof window !== 'undefined' && 'Notification' in window ? Notification.permission : 'unsupported');
  const [testNotificationSent, setTestNotificationSent] = useState(false);

  // Filter urgent cards: overdue, critical (<=3 days), warning (<=7 days)
  const urgentCards = dueStatuses.filter(
    (s) => !s.isPaid && (s.severity === 'overdue' || s.severity === 'critical' || s.severity === 'warning')
  );

  // Calculate cards nearing cutoff (0 to 3 days before billing cycle cutoff)
  const cutoffAlerts = useMemo(() => {
    if (!cards || cards.length === 0) return [];
    return cards
      .map((c) => ({ card: c, alert: calculateCardCutoffAlertStatus(c) }))
      .filter((item) => item.alert.isNearCutoff);
  }, [cards]);

  const requestBrowserNotification = async () => {
    if (!('Notification' in window)) return;
    try {
      const perm = await Notification.requestPermission();
      setNotificationPermission(perm);
      if (perm === 'granted') {
        const urgent = urgentCards[0];
        let msg = '';
        if (urgent) {
          msg = `เตือนกำหนดชำระ: ${urgent.card.name} ยอด ${formatThaiCurrency(urgent.cycleAmount)} ครบกำหนด ${formatThaiDate(urgent.nextDueDate)}`;
        } else if (cutoffAlerts.length > 0) {
          msg = `เตือนวันตัดรอบบิล: ${cutoffAlerts[0].card.name} (${cutoffAlerts[0].alert.label})`;
        } else {
          msg = 'เปิดระบบแจ้งเตือนกำหนดชำระและวันตัดรอบบิลเรียบร้อยแล้ว!';
        }
        new Notification('💳 CardPulse Alert', {
          body: msg,
          icon: '/favicon.ico',
        });
        setTestNotificationSent(true);
        setTimeout(() => setTestNotificationSent(false), 5000);
      }
    } catch (e) {
      console.error(e);
    }
  };

  if (dueStatuses.length === 0 && (!cards || cards.length === 0)) return null;

  return (
    <div className="space-y-3">
      {/* If there are urgent cards, show prominent warning banner */}
      {urgentCards.length > 0 ? (
        <div className="relative overflow-hidden rounded-2xl border border-rose-500/30 bg-gradient-to-r from-rose-950/70 via-slate-900 to-amber-950/50 p-5 shadow-xl shadow-rose-950/20 backdrop-blur-sm">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-rose-500/20">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-rose-500/20 text-rose-400 border border-rose-500/30 shrink-0">
                <BellRing className="w-6 h-6 animate-bounce" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-bold text-white tracking-tight">
                    แจ้งเตือนกำหนดชำระบัตรเครดิต ({urgentCards.length} ใบที่ต้องชำระเร็วๆ นี้)
                  </h2>
                  <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30">
                    ใกล้ถึงกำหนด
                  </span>
                </div>
                <p className="text-xs text-slate-300 mt-0.5">
                  โปรดตรวจสอบยอดชำระและวันครบกำหนด เพื่อหลีกเลี่ยงดอกเบี้ยและค่าธรรมเนียม
                </p>
              </div>
            </div>

            {/* Notification permission button */}
            <div className="flex items-center gap-2">
              {notificationPermission !== 'granted' && notificationPermission !== 'unsupported' && (
                <button
                  type="button"
                  onClick={requestBrowserNotification}
                  className="px-3 py-1.5 rounded-xl text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center gap-1.5 transition cursor-pointer"
                >
                  <BellRing className="w-3.5 h-3.5 text-amber-400" />
                  เปิดการแจ้งเตือนบนเบราว์เซอร์
                </button>
              )}
              {testNotificationSent && (
                <span className="text-xs text-emerald-400 flex items-center gap-1">
                  <Check className="w-3.5 h-3.5" /> ส่งแจ้งเตือนทดสอบแล้ว
                </span>
              )}
            </div>
          </div>

          {/* Cards List in Alert */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 mt-4">
            {urgentCards.map((status) => {
              const isOverdue = status.severity === 'overdue';
              const isCritical = status.severity === 'critical';

              return (
                <div
                  key={status.card.id}
                  className={`p-4 rounded-xl border transition-all ${
                    isOverdue
                      ? 'bg-rose-950/50 border-rose-500/50 hover:border-rose-400'
                      : isCritical
                      ? 'bg-amber-950/40 border-amber-500/40 hover:border-amber-400'
                      : 'bg-slate-900/80 border-slate-700/80 hover:border-slate-600'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center text-slate-300 shrink-0">
                        <CardIcon className="w-4 h-4 text-indigo-400" />
                      </div>
                      <div>
                        <h3 className="text-sm font-semibold text-white truncate max-w-[150px]">
                          {status.card.name}
                        </h3>
                        <p className="text-[11px] text-slate-400">
                          {status.card.bank} •••• {status.card.last4}
                        </p>
                      </div>
                    </div>

                    {/* Status Badge */}
                    <div className="text-right">
                      {isOverdue ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-rose-500 text-white animate-pulse">
                          <ShieldAlert className="w-3 h-3" />
                          เลยกำหนด {Math.abs(status.daysRemaining)} วัน
                        </span>
                      ) : isCritical ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                          <Clock className="w-3 h-3" />
                          เหลืออีก {status.daysRemaining} วัน
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-slate-800 text-slate-300 border border-slate-700">
                          <Clock className="w-3 h-3" />
                          เหลืออีก {status.daysRemaining} วัน
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="mt-3 pt-3 border-t border-slate-800/80 flex items-baseline justify-between">
                    <div>
                      <p className="text-[11px] text-slate-400">ยอดที่ต้องชำระรอบนี้</p>
                      <p className="text-lg font-bold text-white tracking-tight">
                        {formatThaiCurrency(status.cycleAmount)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-[11px] text-slate-400">ครบกำหนดชำระ</p>
                      <p className="text-xs font-semibold text-rose-300">
                        {formatThaiDate(status.nextDueDate)}
                      </p>
                    </div>
                  </div>

                  {/* Quick Mark as Paid Button */}
                  <div className="mt-3 pt-2 flex items-center justify-between gap-2">
                    <span className="text-[10px] text-slate-400 truncate">
                      รอบบิล: {formatThaiMonth(status.cycleMonth)}
                    </span>
                    <button
                      type="button"
                      onClick={() => onMarkCardPaid(status.card.id, status.cycleMonth)}
                      className="px-3 py-1.5 rounded-lg text-xs font-medium bg-emerald-600/20 hover:bg-emerald-600 text-emerald-300 hover:text-white border border-emerald-500/30 transition flex items-center gap-1 cursor-pointer"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      ชำระแล้ว
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* If all cards are in good standing, show positive status pill */
        <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-slate-300">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-semibold text-white">
                สถานะการชำระปกติทุกบัตร
              </p>
              <p className="text-xs text-slate-400">
                ไม่มีบัตรรอชำระด่วนภายใน 7 วันนี้ (บัตรทั้งหมดได้รับการดูแลตรงเวลา)
              </p>
            </div>
          </div>
          {notificationPermission !== 'granted' && notificationPermission !== 'unsupported' && (
            <button
              type="button"
              onClick={requestBrowserNotification}
              className="px-3 py-1.5 rounded-xl text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 flex items-center gap-1.5 transition self-start sm:self-auto cursor-pointer"
            >
              <BellRing className="w-3.5 h-3.5 text-indigo-400" />
              เปิดเตือนบนเบราว์เซอร์
            </button>
          )}
        </div>
      )}

      {/* 3-Day Billing Cutoff Alerts Banner */}
      {cutoffAlerts.length > 0 && (
        <div className="relative overflow-hidden rounded-2xl border border-amber-500/40 bg-gradient-to-r from-amber-950/70 via-slate-900 to-amber-950/40 p-4 sm:p-5 shadow-xl shadow-amber-950/20 backdrop-blur-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-amber-500/20">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-amber-400 text-slate-950 font-bold shadow-lg shadow-amber-500/30 shrink-0 animate-pulse">
                <Bell className="w-5 h-5 fill-slate-950" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm sm:text-base font-bold text-white tracking-tight">
                    แจ้งเตือนล่วงหน้า 3 วันก่อนถึงวันตัดรอบบิล ({cutoffAlerts.length} ใบ)
                  </h3>
                  <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-amber-400 text-slate-950">
                    ใกล้ตัดรอบ
                  </span>
                </div>
                <p className="text-xs text-amber-200/90 mt-0.5">
                  ระบบแสดงไอคอนกระดิ่งแจ้งเตือนบนหน้าบัตรแล้ว • รายการใช้จ่ายหลังจากวันตัดรอบจะถูกยกยอดไปรอบบิลถัดไป
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mt-3">
            {cutoffAlerts.map(({ card, alert }) => (
              <div
                key={card.id}
                className="p-3 rounded-xl bg-slate-900/90 border border-amber-500/30 flex items-center justify-between gap-3 shadow-md"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-amber-400/15 text-amber-300 border border-amber-400/30 flex items-center justify-center shrink-0">
                    <CardIcon className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-xs sm:text-sm font-semibold text-white truncate">
                      {card.name}
                    </h4>
                    <p className="text-[11px] text-slate-400 truncate">
                      {card.bank} •••• {card.last4}
                    </p>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-400 text-slate-950 shadow-sm animate-pulse">
                    <Bell className="w-3 h-3 fill-slate-950 shrink-0" />
                    <span>{alert.daysUntilCutoff === 0 ? 'ตัดรอบวันนี้' : `อีก ${alert.daysUntilCutoff} วัน`}</span>
                  </span>
                  <p className="text-[10px] text-amber-300 font-medium mt-1">
                    ตัดรอบวันที่ {card.billingCutoffDay}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
