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
    <div className="space-y-2">
      {/* If there are urgent cards, show compact warning banner */}
      {urgentCards.length > 0 ? (
        <div className="relative overflow-hidden rounded-xl border border-rose-500/30 bg-gradient-to-r from-rose-950/70 via-slate-900 to-amber-950/50 p-3 sm:p-3.5 shadow-lg shadow-rose-950/20 backdrop-blur-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-rose-500/20">
            <div className="flex items-center gap-2 min-w-0">
              <div className="p-1.5 rounded-lg bg-rose-500/20 text-rose-400 border border-rose-500/30 shrink-0">
                <BellRing className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-xs sm:text-sm font-bold text-white tracking-tight">
                    แจ้งเตือนกำหนดชำระบัตรเครดิต ({urgentCards.length} ใบ)
                  </h2>
                  <span className="text-[11px] font-medium text-rose-300">
                    · ใกล้ถึงกำหนด
                  </span>
                </div>
                <p className="text-[11px] text-slate-300 leading-snug truncate">
                  ตรวจสอบยอดชำระและวันครบกำหนด เพื่อหลีกเลี่ยงดอกเบี้ยและค่าธรรมเนียม
                </p>
              </div>
            </div>

            {/* Notification permission button */}
            <div className="flex items-center gap-2 shrink-0">
              {notificationPermission !== 'granted' && notificationPermission !== 'unsupported' && (
                <button
                  type="button"
                  onClick={requestBrowserNotification}
                  className="px-2.5 py-1 rounded-lg text-[11px] font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center gap-1.5 transition whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <BellRing className="w-3 h-3 text-amber-400 shrink-0" />
                  <span>เปิดเตือนบนเบราว์เซอร์</span>
                </button>
              )}
              {testNotificationSent && (
                <span className="text-[11px] text-emerald-400 flex items-center gap-1 whitespace-nowrap">
                  <Check className="w-3 h-3" /> ส่งทดสอบแล้ว
                </span>
              )}
            </div>
          </div>

          {/* Compact Cards List in Alert */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 mt-2.5">
            {urgentCards.map((status) => {
              const isOverdue = status.severity === 'overdue';
              const isCritical = status.severity === 'critical';

              return (
                <div
                  key={status.card.id}
                  className={`p-2.5 sm:p-3 rounded-lg border transition-all ${
                    isOverdue
                      ? 'bg-rose-950/50 border-rose-500/50 hover:border-rose-400'
                      : isCritical
                      ? 'bg-amber-950/40 border-amber-500/40 hover:border-amber-400'
                      : 'bg-slate-900/80 border-slate-700/80 hover:border-slate-600'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-6 h-6 rounded-md bg-slate-800 flex items-center justify-center text-slate-300 shrink-0">
                        <CardIcon className="w-3.5 h-3.5 text-indigo-400" />
                      </div>
                      <div className="min-w-0">
                        <h3 className="text-xs font-semibold text-white truncate">
                          {status.card.name}
                        </h3>
                        <p className="text-[10px] text-slate-400 truncate">
                          {status.card.bank} · •••• {status.card.last4}
                        </p>
                      </div>
                    </div>

                    {/* Compact Status Label */}
                    <div className="text-right shrink-0">
                      {isOverdue ? (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-rose-500 text-white whitespace-nowrap tabular-nums">
                          <ShieldAlert className="w-2.5 h-2.5 shrink-0" />
                          เลย {Math.abs(status.daysRemaining)} วัน
                        </span>
                      ) : isCritical ? (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 whitespace-nowrap tabular-nums">
                          <Clock className="w-2.5 h-2.5 shrink-0" />
                          อีก {status.daysRemaining} วัน
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-medium bg-slate-800 text-slate-300 border border-slate-700 whitespace-nowrap tabular-nums">
                          <Clock className="w-2.5 h-2.5 shrink-0" />
                          อีก {status.daysRemaining} วัน
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="mt-2 pt-2 border-t border-slate-800/80 flex items-baseline justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-[10px] text-slate-400">ยอดที่ต้องชำระ</p>
                      <p className="text-sm font-bold text-white tracking-tight tabular-nums">
                        {formatThaiCurrency(status.cycleAmount)}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-[10px] text-slate-400">ครบกำหนดชำระ</p>
                      <p className="text-[11px] font-semibold text-rose-300 tabular-nums">
                        {formatThaiDate(status.nextDueDate)}
                      </p>
                    </div>
                  </div>

                  {/* Quick Mark as Paid Row */}
                  <div className="mt-1.5 pt-1.5 border-t border-slate-800/40 flex items-center justify-between gap-2">
                    <span className="text-[10px] text-slate-400 truncate">
                      รอบบิล: {formatThaiMonth(status.cycleMonth)}
                    </span>
                    <button
                      type="button"
                      onClick={() => onMarkCardPaid(status.card.id, status.cycleMonth)}
                      className="px-2.5 py-1 rounded-md text-[11px] font-medium bg-emerald-600/20 hover:bg-emerald-600 text-emerald-300 hover:text-white border border-emerald-500/30 transition flex items-center gap-1 whitespace-nowrap shrink-0 cursor-pointer"
                    >
                      <CheckCircle2 className="w-3 h-3 shrink-0" />
                      <span>ชำระแล้ว</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* If all cards are in good standing, show compact positive status bar */
        <div className="px-3 py-2.5 rounded-xl bg-slate-900/60 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-slate-300">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shrink-0">
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <p className="text-xs sm:text-sm font-semibold text-white truncate">
                สถานะการชำระปกติทุกบัตร
              </p>
              <p className="text-[11px] text-slate-400 truncate">
                ไม่มีบัตรรอชำระด่วนภายใน 7 วันนี้ (บัตรทั้งหมดได้รับการดูแลตรงเวลา)
              </p>
            </div>
          </div>
          {notificationPermission !== 'granted' && notificationPermission !== 'unsupported' && (
            <button
              type="button"
              onClick={requestBrowserNotification}
              className="px-2.5 py-1 rounded-lg text-[11px] font-medium bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 flex items-center gap-1.5 transition self-start sm:self-auto whitespace-nowrap shrink-0 cursor-pointer"
            >
              <BellRing className="w-3 h-3 text-indigo-400 shrink-0" />
              <span>เปิดเตือนบนเบราว์เซอร์</span>
            </button>
          )}
        </div>
      )}

      {/* 3-Day Billing Cutoff Alerts Banner (Compact) */}
      {cutoffAlerts.length > 0 && (
        <div className="relative overflow-hidden rounded-xl border border-amber-500/40 bg-gradient-to-r from-amber-950/70 via-slate-900 to-amber-950/40 p-3 sm:p-3.5 shadow-lg shadow-amber-950/20 backdrop-blur-sm">
          <div className="flex items-center justify-between gap-2 pb-2 border-b border-amber-500/20">
            <div className="flex items-center gap-2 min-w-0">
              <div className="p-1.5 rounded-lg bg-amber-400 text-slate-950 shrink-0">
                <Bell className="w-4 h-4 fill-slate-950" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-xs sm:text-sm font-bold text-white tracking-tight">
                    แจ้งเตือนล่วงหน้าก่อนตัดรอบบิล ({cutoffAlerts.length} ใบ)
                  </h3>
                  <span className="text-[11px] font-medium text-amber-300">
                    · ใกล้ตัดรอบ
                  </span>
                </div>
                <p className="text-[11px] text-amber-200/85 truncate">
                  รายการใช้จ่ายหลังวันตัดรอบจะถูกยกยอดไปรอบบิลถัดไป
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 mt-2.5">
            {cutoffAlerts.map(({ card, alert }) => (
              <div
                key={card.id}
                className="p-2.5 rounded-lg bg-slate-900/90 border border-amber-500/30 flex items-center justify-between gap-2"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-6 h-6 rounded-md bg-amber-400/15 text-amber-300 border border-amber-400/30 flex items-center justify-center shrink-0">
                    <CardIcon className="w-3.5 h-3.5" />
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-xs font-semibold text-white truncate">
                      {card.name}
                    </h4>
                    <p className="text-[10px] text-slate-400 truncate">
                      {card.bank} · •••• {card.last4}
                    </p>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-amber-400 text-slate-950 whitespace-nowrap tabular-nums">
                    <Bell className="w-2.5 h-2.5 fill-slate-950 shrink-0" />
                    <span>{alert.daysUntilCutoff === 0 ? 'ตัดรอบวันนี้' : `อีก ${alert.daysUntilCutoff} วัน`}</span>
                  </span>
                  <p className="text-[10px] text-amber-300 font-medium mt-0.5 tabular-nums">
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
