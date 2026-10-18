import React, { useState } from 'react';
import { CreditCard, Transaction } from '../types';
import {
  calculateHistoricalDashboard,
  formatThaiCurrency,
  formatThaiMonth,
  CATEGORY_INFO,
} from '../utils/cardUtils';
import {
  TrendingUp,
  TrendingDown,
  Calendar,
  Layers,
  ArrowUpRight,
  CreditCard as CardIcon,
  CheckCircle2,
  Clock,
  ChevronRight,
  Filter,
  BarChart3,
  Award,
  Sparkles,
  PieChart,
} from 'lucide-react';
import { CategoryTrendLineChart } from './CategoryTrendLineChart';
import { YearOverYearTrendChart } from './YearOverYearTrendChart';

interface HistoricalDashboardProps {
  transactions: Transaction[];
  cards: CreditCard[];
  allMonths: string[];
  onSelectMonthToInspect: (month: string) => void;
}

export const HistoricalDashboard: React.FC<HistoricalDashboardProps> = ({
  transactions,
  cards,
  allMonths,
  onSelectMonthToInspect,
}) => {
  const [timeframe, setTimeframe] = useState<'3m' | '6m' | '12m' | 'all'>('6m');
  const [hoveredTrendMonth, setHoveredTrendMonth] = useState<string | null>(null);

  const cardMap = React.useMemo(() => new Map(cards.map((c) => [c.id, c])), [cards]);

  const data = React.useMemo(() => {
    return calculateHistoricalDashboard(transactions, allMonths, timeframe, cards);
  }, [transactions, allMonths, timeframe, cards]);

  // Max spend across trends for chart scaling
  const maxTrendSpend = Math.max(
    ...data.trends.map((t) => t.totalSpent),
    10000
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Dashboard Top Header & Timeframe Switcher */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 border border-indigo-500/20 shadow-xl shadow-indigo-950/20">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
              <BarChart3 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
                แดชบอร์ดวิเคราะห์ประวัติย้อนหลัง
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                  Analytics
                </span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                ติดตามแนวโน้มยอดใช้จ่ายย้อนหลัง สัดส่วนหมวดหมู่ และพฤติกรรมการใช้บัตรเครดิต
              </p>
            </div>
          </div>
        </div>

        {/* Timeframe Filter Buttons */}
        <div className="flex items-center gap-1.5 bg-slate-900/90 p-1 rounded-xl border border-slate-700/80 self-start md:self-auto">
          <button
            type="button"
            onClick={() => setTimeframe('3m')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
              timeframe === '3m'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            ย้อนหลัง 3 เดือน
          </button>
          <button
            type="button"
            onClick={() => setTimeframe('6m')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
              timeframe === '6m'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            ย้อนหลัง 6 เดือน
          </button>
          <button
            type="button"
            onClick={() => setTimeframe('12m')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
              timeframe === '12m'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            ย้อนหลัง 1 ปี (12 ด.)
          </button>
          <button
            type="button"
            onClick={() => setTimeframe('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
              timeframe === 'all'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            ทั้งหมด
          </button>
        </div>
      </div>

      {/* 4 Executive Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Historical Spend */}
        <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 hover:border-slate-700 transition">
          <span className="text-xs font-medium text-slate-400 block mb-1">
            ยอดใช้จ่ายสะสม ({data.selectedMonths.length} เดือน)
          </span>
          <div className="text-2xl font-bold text-white tracking-tight">
            {formatThaiCurrency(data.totalSpent)}
          </div>
          <div className="mt-2 text-[11px] text-slate-400 flex items-center justify-between">
            <span>จำนวน {data.totalTxCount} รายการ</span>
            <span className="text-emerald-400 font-medium">
              ชำระแล้ว {data.totalSpent > 0 ? Math.round((data.totalPaid / data.totalSpent) * 100) : 0}%
            </span>
          </div>
        </div>

        {/* Average Monthly Spend */}
        <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 hover:border-slate-700 transition">
          <span className="text-xs font-medium text-slate-400 block mb-1">
            ยอดใช้จ่ายเฉลี่ยต่อเดือน
          </span>
          <div className="text-2xl font-bold text-indigo-300 tracking-tight">
            {formatThaiCurrency(data.avgMonthlySpent)}
          </div>
          <div className="mt-2 text-[11px] text-slate-400 flex items-center gap-1">
            <span>คำนวณจากช่วง {data.selectedMonths.length} เดือนที่เลือก</span>
          </div>
        </div>

        {/* Peak Spending Month */}
        <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 hover:border-slate-700 transition">
          <span className="text-xs font-medium text-slate-400 block mb-1">
            เดือนที่มียอดใช้จ่ายสูงสุด
          </span>
          <div className="text-2xl font-bold text-amber-300 tracking-tight">
            {data.highestMonth ? formatThaiCurrency(data.highestMonth.amount) : '0 บาท'}
          </div>
          <div className="mt-2 text-[11px] text-amber-400 flex items-center gap-1">
            <Award className="w-3.5 h-3.5" />
            <span>
              {data.highestMonth ? formatThaiMonth(data.highestMonth.month) : '-'}
            </span>
          </div>
        </div>

        {/* MoM Change (Latest vs Prior) */}
        <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 hover:border-slate-700 transition">
          <span className="text-xs font-medium text-slate-400 block mb-1">
            เทียบยอดเดือนก่อนหน้า (MoM)
          </span>
          <div className="flex items-baseline gap-2">
            {data.momGrowth !== null ? (
              <div
                className={`text-2xl font-bold tracking-tight flex items-center gap-1 ${
                  data.momGrowth > 0
                    ? 'text-rose-400'
                    : data.momGrowth < 0
                    ? 'text-emerald-400'
                    : 'text-slate-200'
                }`}
              >
                {data.momGrowth > 0 ? (
                  <>
                    <TrendingUp className="w-5 h-5 text-rose-400" />
                    +{data.momGrowth}%
                  </>
                ) : data.momGrowth < 0 ? (
                  <>
                    <TrendingDown className="w-5 h-5 text-emerald-400" />
                    {data.momGrowth}%
                  </>
                ) : (
                  '0%'
                )}
              </div>
            ) : (
              <div className="text-2xl font-bold text-slate-400">-</div>
            )}
          </div>
          <div className="mt-2 text-[11px] text-slate-400">
            {data.momGrowth !== null && data.momGrowth > 0
              ? 'ใช้จ่ายเพิ่มขึ้นจากเดือนก่อน'
              : data.momGrowth !== null && data.momGrowth < 0
              ? 'ประหยัดขึ้นเมื่อเทียบกับเดือนก่อน'
              : 'ยอดใช้จ่ายใกล้เคียงเดิม'}
          </div>
        </div>
      </div>

      {/* Main Historical Trend Chart (Interactive Bar Visualization) */}
      <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-indigo-400" />
              <span>แนวโน้มยอดใช้จ่ายรายเดือนย้อนหลัง ({data.trends.length} เดือน)</span>
            </h3>
            <p className="text-xs text-slate-400">
              คลิกที่แท่งกราฟของเดือนใดก็ได้ เพื่อเปิดดูรายการใช้จ่ายแบบละเอียด
            </p>
          </div>

          <div className="flex items-center gap-4 text-xs">
            <span className="flex items-center gap-1.5 text-slate-300">
              <span className="w-3 h-3 rounded-sm bg-gradient-to-t from-indigo-600 to-indigo-400" />
              ยอดใช้จ่ายรวม
            </span>
            <span className="flex items-center gap-1.5 text-slate-300">
              <span className="w-3 h-3 rounded-sm bg-amber-400" />
              ยอดผ่อนชำระ
            </span>
          </div>
        </div>

        {/* Visual Bar Chart */}
        <div className="pt-6 pb-2">
          <div className="h-56 flex items-end justify-between gap-2 sm:gap-4 px-2 border-b border-slate-800">
            {data.trends.map((item) => {
              const heightPct = Math.max(8, Math.round((item.totalSpent / maxTrendSpend) * 100));
              const installmentPct =
                item.totalSpent > 0
                  ? Math.round((item.installmentAmount / item.totalSpent) * 100)
                  : 0;
              const isHovered = hoveredTrendMonth === item.month;

              return (
                <div
                  key={item.month}
                  onMouseEnter={() => setHoveredTrendMonth(item.month)}
                  onMouseLeave={() => setHoveredTrendMonth(null)}
                  onClick={() => onSelectMonthToInspect(item.month)}
                  className="group relative flex-1 flex flex-col items-center cursor-pointer h-full justify-end"
                >
                  {/* Tooltip on hover */}
                  {isHovered && (
                    <div className="absolute -top-16 z-20 px-3 py-1.5 rounded-xl bg-slate-800 border border-slate-700 text-xs shadow-xl text-center pointer-events-none whitespace-nowrap animate-in fade-in zoom-in-95">
                      <div className="font-semibold text-white">{formatThaiMonth(item.month)}</div>
                      <div className="text-indigo-300 font-bold">
                        {formatThaiCurrency(item.totalSpent)}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        {item.txCount} รายการ • คลิกเพื่อดู
                      </div>
                    </div>
                  )}

                  {/* Top amount label */}
                  <span
                    className={`text-[10px] font-semibold mb-1 transition ${
                      isHovered ? 'text-indigo-300 scale-110' : 'text-slate-400 group-hover:text-white'
                    }`}
                  >
                    {Math.round(item.totalSpent / 1000)}k
                  </span>

                  {/* The Bar */}
                  <div
                    className={`w-full max-w-[48px] rounded-t-xl transition-all duration-300 overflow-hidden relative ${
                      isHovered
                        ? 'ring-2 ring-indigo-400 brightness-110 shadow-lg shadow-indigo-500/20'
                        : 'hover:brightness-105'
                    } bg-gradient-to-t from-indigo-700 via-indigo-600 to-indigo-500`}
                    style={{ height: `${heightPct}%` }}
                  >
                    {/* Installment slice */}
                    {installmentPct > 0 && (
                      <div
                        className="w-full bg-amber-400/90 absolute bottom-0 left-0"
                        style={{ height: `${installmentPct}%` }}
                        title={`ผ่อนชำระ ${formatThaiCurrency(item.installmentAmount)}`}
                      />
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* X Axis Labels */}
          <div className="flex items-center justify-between gap-2 sm:gap-4 px-2 mt-2">
            {data.trends.map((item) => (
              <button
                key={item.month}
                type="button"
                onClick={() => onSelectMonthToInspect(item.month)}
                className="flex-1 text-center text-xs font-medium text-slate-400 hover:text-indigo-300 transition truncate cursor-pointer"
                title={`คลิกเพื่อดูรายการรอบบิล ${formatThaiMonth(item.month)}`}
              >
                {item.monthLabel}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Visual Breakdown by Category Month-over-Month Line Chart */}
      <CategoryTrendLineChart
        transactions={transactions}
        trends={data.trends}
        onSelectMonth={onSelectMonthToInspect}
      />

      {/* Year-over-Year (YoY) Multi-Year Total Monthly Expenditures Line Chart (Powered by Recharts) */}
      <YearOverYearTrendChart
        transactions={transactions}
        cards={cards}
        onSelectMonth={onSelectMonthToInspect}
      />

      {/* Dual Breakdown Section: Top Categories & Card Usage */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Historical Category Breakdown */}
        <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <PieChart className="w-4 h-4 text-indigo-400" />
              <span>หมวดหมู่ที่มีค่าใช้จ่ายสูงสุดช่วงย้อนหลัง</span>
            </h3>
            <span className="text-xs text-slate-400">
              {data.topCategories.length} หมวดหมู่
            </span>
          </div>

          <div className="space-y-3">
            {data.topCategories.slice(0, 6).map((item) => {
              const info = CATEGORY_INFO[item.category] || CATEGORY_INFO.other;

              return (
                <div key={item.category} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-300 flex items-center gap-2 font-medium">
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0 shadow-sm"
                        style={{ backgroundColor: info.hexColor }}
                      />
                      {info.label}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-slate-400">{item.percentage}%</span>
                      <span className="font-semibold text-white">
                        {formatThaiCurrency(item.amount)}
                      </span>
                    </div>
                  </div>
                  <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-300"
                      style={{ width: `${item.percentage}%`, backgroundColor: info.hexColor }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Historical Card Usage */}
        <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <CardIcon className="w-4 h-4 text-emerald-400" />
              <span>การใช้งานแต่ละบัตรเครดิตช่วงย้อนหลัง</span>
            </h3>
            <span className="text-xs text-slate-400">
              {data.cardSpending.length} บัตร
            </span>
          </div>

          <div className="space-y-3">
            {data.cardSpending.map((item) => {
              const card = cardMap.get(item.cardId);

              return (
                <div
                  key={item.cardId}
                  className="p-3 rounded-xl bg-slate-800/40 border border-slate-700/60 space-y-2"
                >
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-4 rounded bg-slate-700 flex items-center justify-center text-[9px] font-bold text-slate-200">
                        {card?.cardType || 'CARD'}
                      </div>
                      <span className="font-medium text-white">{card?.name || 'บัตรเครดิต'}</span>
                      <span className="text-slate-400 font-mono text-[11px]">
                        (•••• {card?.last4})
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-slate-400">{item.percentage}%</span>
                      <span className="font-semibold text-white">
                        {formatThaiCurrency(item.amount)}
                      </span>
                    </div>
                  </div>
                  <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-300"
                      style={{ width: `${item.percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Historical Statements Audit Table */}
      <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-white tracking-tight flex items-center gap-2">
              <Calendar className="w-4 h-4 text-indigo-400" />
              <span>ตารางสรุปประวัติรอบบิลย้อนหลัง</span>
            </h3>
            <p className="text-xs text-slate-400">
              ตรวจสอบยอดแต่ละเดือน สถานะการชำระ และคลิกเพื่อเจาะลึกรายการ
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300 border-collapse">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 font-semibold uppercase tracking-wider">
                <th className="py-3 px-3">รอบเดือน</th>
                <th className="py-3 px-3">จำนวนรายการ</th>
                <th className="py-3 px-3">ยอดใช้จ่ายรวม</th>
                <th className="py-3 px-3">ยอดผ่อนชำระ</th>
                <th className="py-3 px-3">ชำระแล้ว</th>
                <th className="py-3 px-3">ค้างชำระ</th>
                <th className="py-3 px-3">สถานะ</th>
                <th className="py-3 px-3 text-right">การจัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-medium">
              {data.trends.slice().reverse().map((row) => (
                <tr
                  key={row.month}
                  className="hover:bg-slate-800/40 transition group"
                >
                  <td className="py-3 px-3 font-semibold text-white flex items-center gap-2">
                    <Calendar className="w-3.5 h-3.5 text-indigo-400" />
                    <span>{formatThaiMonth(row.month)}</span>
                  </td>
                  <td className="py-3 px-3 text-slate-300">{row.txCount} รายการ</td>
                  <td className="py-3 px-3 font-bold text-white">
                    {formatThaiCurrency(row.totalSpent)}
                  </td>
                  <td className="py-3 px-3 text-amber-300">
                    {row.installmentAmount > 0
                      ? formatThaiCurrency(row.installmentAmount)
                      : '-'}
                  </td>
                  <td className="py-3 px-3 text-emerald-400">
                    {formatThaiCurrency(row.totalPaid)}
                  </td>
                  <td className="py-3 px-3 text-rose-300">
                    {row.totalPending > 0 ? formatThaiCurrency(row.totalPending) : '-'}
                  </td>
                  <td className="py-3 px-3">
                    {row.totalPending === 0 && row.totalSpent > 0 ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        <CheckCircle2 className="w-3 h-3" /> ชำระครบแล้ว
                      </span>
                    ) : row.totalPending > 0 ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-500/10 text-rose-300 border border-rose-500/20">
                        <Clock className="w-3 h-3" /> รอชำระ
                      </span>
                    ) : (
                      <span className="text-slate-500 text-[10px]">-</span>
                    )}
                  </td>
                  <td className="py-3 px-3 text-right">
                    <button
                      type="button"
                      onClick={() => onSelectMonthToInspect(row.month)}
                      className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-slate-800 group-hover:bg-indigo-600 text-slate-300 group-hover:text-white transition flex items-center gap-1 ml-auto cursor-pointer"
                    >
                      <span>ดูรายการ</span>
                      <ChevronRight className="w-3 h-3" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
