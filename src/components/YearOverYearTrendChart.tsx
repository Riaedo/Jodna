import React, { useState, useMemo } from 'react';
import { Transaction, CreditCard } from '../types';
import {
  formatThaiCurrency,
  getTransactionBillingCycleMonth,
  isFutureInstallmentHidden,
} from '../utils/cardUtils';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
} from 'recharts';
import {
  TrendingUp,
  TrendingDown,
  Calendar,
  Layers,
  ArrowUpRight,
  Filter,
  BarChart2,
  Check,
  ChevronDown,
  ChevronUp,
  Sparkles,
} from 'lucide-react';

interface YearOverYearTrendChartProps {
  transactions: Transaction[];
  cards: CreditCard[];
  onSelectMonth?: (month: string) => void;
}

const MONTH_DEFINITIONS = [
  { index: 1, key: '01', short: 'ม.ค.', full: 'มกราคม', en: 'Jan' },
  { index: 2, key: '02', short: 'ก.พ.', full: 'กุมภาพันธ์', en: 'Feb' },
  { index: 3, key: '03', short: 'มี.ค.', full: 'มีนาคม', en: 'Mar' },
  { index: 4, key: '04', short: 'เม.ย.', full: 'เมษายน', en: 'Apr' },
  { index: 5, key: '05', short: 'พ.ค.', full: 'พฤษภาคม', en: 'May' },
  { index: 6, key: '06', short: 'มิ.ย.', full: 'มิถุนายน', en: 'Jun' },
  { index: 7, key: '07', short: 'ก.ค.', full: 'กรกฎาคม', en: 'Jul' },
  { index: 8, key: '08', short: 'ส.ค.', full: 'สิงหาคม', en: 'Aug' },
  { index: 9, key: '09', short: 'ก.ย.', full: 'กันยายน', en: 'Sep' },
  { index: 10, key: '10', short: 'ต.ค.', full: 'ตุลาคม', en: 'Oct' },
  { index: 11, key: '11', short: 'พ.ย.', full: 'พฤศจิกายน', en: 'Nov' },
  { index: 12, key: '12', short: 'ธ.ค.', full: 'ธันวาคม', en: 'Dec' },
];

const YEAR_COLORS: Record<string, { stroke: string; fill: string; bg: string; text: string }> = {
  '2026': { stroke: '#6366f1', fill: '#818cf8', bg: 'bg-indigo-500/10', text: 'text-indigo-400' },
  '2025': { stroke: '#10b981', fill: '#34d399', bg: 'bg-emerald-500/10', text: 'text-emerald-400' },
  '2027': { stroke: '#f59e0b', fill: '#fbbf24', bg: 'bg-amber-500/10', text: 'text-amber-400' },
  '2024': { stroke: '#ec4899', fill: '#f472b6', bg: 'bg-pink-500/10', text: 'text-pink-400' },
  '2023': { stroke: '#06b6d4', fill: '#22d3ee', bg: 'bg-cyan-500/10', text: 'text-cyan-400' },
};

const DEFAULT_COLOR = {
  stroke: '#a855f7',
  fill: '#c084fc',
  bg: 'bg-purple-500/10',
  text: 'text-purple-400',
};

export const YearOverYearTrendChart: React.FC<YearOverYearTrendChartProps> = ({
  transactions,
  cards,
  onSelectMonth,
}) => {
  const [spendTypeFilter, setSpendTypeFilter] = useState<'all' | 'regular' | 'installment'>('all');
  const [showTable, setShowTable] = useState(false);

  // Filter out hidden future installments
  const visibleTxs = useMemo(() => {
    return transactions.filter((t) => !isFutureInstallmentHidden(t, cards));
  }, [transactions, cards]);

  // Aggregate monthly spending by Year & Month
  const { allYears, yearMonthTotals, yearlyTotals } = useMemo(() => {
    const yearSet = new Set<string>();
    const ymMap: Record<string, Record<string, number>> = {};
    const yTotal: Record<string, number> = {};

    visibleTxs.forEach((t) => {
      // Apply spend type filter
      if (spendTypeFilter === 'regular' && t.isInstallment) return;
      if (spendTypeFilter === 'installment' && !t.isInstallment) return;

      const cycle = getTransactionBillingCycleMonth(t, cards);
      if (!cycle || !cycle.includes('-')) return;

      const [year, month] = cycle.split('-');
      yearSet.add(year);

      if (!ymMap[year]) ymMap[year] = {};
      if (!yTotal[year]) yTotal[year] = 0;

      const charge =
        t.isInstallment && t.monthlyInstallmentAmount
          ? t.monthlyInstallmentAmount
          : t.amount;

      ymMap[year][month] = (ymMap[year][month] || 0) + charge;
      yTotal[year] += charge;
    });

    const sortedYears = Array.from(yearSet).sort().reverse();
    return {
      allYears: sortedYears,
      yearMonthTotals: ymMap,
      yearlyTotals: yTotal,
    };
  }, [visibleTxs, cards, spendTypeFilter]);

  // Active selected years to compare (default to top 2-3 years)
  const [selectedYears, setSelectedYears] = useState<string[]>(() => {
    if (allYears.length >= 2) {
      return allYears.slice(0, 2);
    }
    return allYears.length > 0 ? allYears : ['2026', '2025'];
  });

  // Sync selected years if years list changes and selection is empty
  React.useEffect(() => {
    if (allYears.length > 0 && selectedYears.length === 0) {
      setSelectedYears(allYears.slice(0, Math.min(2, allYears.length)));
    }
  }, [allYears, selectedYears.length]);

  const toggleYear = (year: string) => {
    if (selectedYears.includes(year)) {
      if (selectedYears.length > 1) {
        setSelectedYears(selectedYears.filter((y) => y !== year));
      }
    } else {
      setSelectedYears([...selectedYears, year].sort().reverse());
    }
  };

  // Build 12-month data array for Recharts
  const chartData = useMemo(() => {
    return MONTH_DEFINITIONS.map((def) => {
      const entry: Record<string, any> = {
        monthKey: def.key,
        monthName: def.short,
        fullMonth: def.full,
        enMonth: def.en,
      };

      allYears.forEach((year) => {
        const val = yearMonthTotals[year]?.[def.key] || 0;
        entry[year] = val;
      });

      return entry;
    });
  }, [allYears, yearMonthTotals]);

  // Primary year & comparison year for YoY metrics
  const primaryYear = selectedYears[0] || allYears[0] || '2026';
  const compareYear = selectedYears[1] || allYears[1];

  const primaryTotal = yearlyTotals[primaryYear] || 0;
  const compareTotal = compareYear ? yearlyTotals[compareYear] || 0 : null;

  const yoyDiff = compareTotal !== null ? primaryTotal - compareTotal : null;
  const yoyPercent =
    compareTotal !== null && compareTotal > 0
      ? Math.round(((primaryTotal - compareTotal) / compareTotal) * 1000) / 10
      : null;

  // Max value across selected years for reference/scaling
  const maxSpend = useMemo(() => {
    let max = 10000;
    chartData.forEach((d) => {
      selectedYears.forEach((y) => {
        if (d[y] && d[y] > max) max = d[y];
      });
    });
    return max;
  }, [chartData, selectedYears]);

  // Custom Recharts Tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload || !payload.length) return null;

    const monthDef = MONTH_DEFINITIONS.find((m) => m.short === label);
    const monthKey = monthDef?.key || '01';

    const pVal = primaryYear ? yearMonthTotals[primaryYear]?.[monthKey] || 0 : 0;
    const cVal = compareYear ? yearMonthTotals[compareYear]?.[monthKey] || 0 : 0;
    const diff = pVal - cVal;
    const diffPct = cVal > 0 ? Math.round(((pVal - cVal) / cVal) * 100) : null;

    return (
      <div className="p-3.5 rounded-xl bg-slate-900/95 border border-slate-700/80 text-xs shadow-2xl backdrop-blur-md min-w-[210px] space-y-2">
        <div className="flex items-center justify-between pb-1.5 border-b border-slate-800">
          <span className="font-bold text-white text-sm">
            {monthDef?.full} ({monthDef?.en})
          </span>
          <span className="text-[10px] text-slate-400">รอบเดือนที่ {monthDef?.index}</span>
        </div>

        <div className="space-y-1.5">
          {payload.map((item: any) => {
            const year = item.dataKey;
            const colorCfg = YEAR_COLORS[year] || DEFAULT_COLOR;
            const thaiYear = parseInt(year, 10) + 543;
            const val = Number(item.value) || 0;

            return (
              <div
                key={year}
                onClick={() => onSelectMonth && onSelectMonth(`${year}-${monthKey}`)}
                className="flex items-center justify-between gap-3 cursor-pointer hover:bg-slate-800/60 p-1 rounded transition"
                title={`คลิกเพื่อดูรายการรอบบิล ${year}-${monthKey}`}
              >
                <div className="flex items-center gap-2">
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0 shadow-sm"
                    style={{ backgroundColor: colorCfg.stroke }}
                  />
                  <span className="font-medium text-slate-200">
                    ปี {year} (พ.ศ. {thaiYear}):
                  </span>
                </div>
                <span className="font-bold text-white">
                  {val > 0 ? formatThaiCurrency(val) : '0 ฿'}
                </span>
              </div>
            );
          })}
        </div>

        {/* YoY difference row if comparing 2 years */}
        {compareYear && (pVal > 0 || cVal > 0) && (
          <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px]">
            <span className="text-slate-400">
              YoY ({primaryYear} vs {compareYear}):
            </span>
            <span
              className={`font-semibold flex items-center gap-0.5 ${
                diff > 0
                  ? 'text-rose-400'
                  : diff < 0
                  ? 'text-emerald-400'
                  : 'text-slate-300'
              }`}
            >
              {diff > 0 ? '+' : ''}
              {formatThaiCurrency(diff)}
              {diffPct !== null && ` (${diffPct > 0 ? '+' : ''}${diffPct}%)`}
            </span>
          </div>
        )}

        {onSelectMonth && (
          <div className="text-[10px] text-indigo-300 text-center pt-1 italic">
            คลิกที่จุดเพื่อดูรายการในเดือนนี้
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-5">
      {/* Header and Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="p-2 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 shrink-0">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base font-bold text-white tracking-tight">
                  เปรียบเทียบยอดใช้จ่ายรายเดือนปีต่อปี (Year-over-Year)
                </h3>
                <span className="px-2 py-0.5 text-[10px] font-semibold rounded-full bg-indigo-500/15 text-indigo-300 border border-indigo-500/30">
                  Recharts Visual
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                ติดตามแนวโน้มยอดรายจ่ายมกราคม - ธันวาคม เทียบระหว่างปี เพื่อเห็นพฤติกรรมและการเติบโต
              </p>
            </div>
          </div>
        </div>

        {/* Filters: Spending Type & Year Selection */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Spending Type Toggle */}
          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
            <button
              type="button"
              onClick={() => setSpendTypeFilter('all')}
              className={`px-2.5 py-1 rounded-lg font-medium transition cursor-pointer ${
                spendTypeFilter === 'all'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              ยอดรวม
            </button>
            <button
              type="button"
              onClick={() => setSpendTypeFilter('regular')}
              className={`px-2.5 py-1 rounded-lg font-medium transition cursor-pointer ${
                spendTypeFilter === 'regular'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              ยอดปกติ
            </button>
            <button
              type="button"
              onClick={() => setSpendTypeFilter('installment')}
              className={`px-2.5 py-1 rounded-lg font-medium transition cursor-pointer ${
                spendTypeFilter === 'installment'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              เฉพาะผ่อน 0%
            </button>
          </div>

          {/* Year Toggle Chips */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {allYears.map((year) => {
              const isSelected = selectedYears.includes(year);
              const colorCfg = YEAR_COLORS[year] || DEFAULT_COLOR;
              const thaiYear = parseInt(year, 10) + 543;

              return (
                <button
                  key={year}
                  type="button"
                  onClick={() => toggleYear(year)}
                  className={`px-2.5 py-1 rounded-xl text-xs font-semibold flex items-center gap-1.5 border transition cursor-pointer ${
                    isSelected
                      ? 'bg-slate-800 text-white border-slate-600 shadow-sm'
                      : 'bg-slate-900/60 text-slate-500 border-slate-800 hover:text-slate-300'
                  }`}
                  title={`คลิกเพื่อเปิด/ปิดกราฟเส้นปี ${year}`}
                >
                  <span
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{
                      backgroundColor: isSelected ? colorCfg.stroke : '#64748b',
                    }}
                  />
                  <span>
                    ปี {year} ({thaiYear})
                  </span>
                  {isSelected && <Check className="w-3 h-3 text-emerald-400" />}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Metric Cards Summary: YoY Comparison Highlights */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {/* Primary Year Total */}
        <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800">
          <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-1">
            <span
              className="w-2 h-2 rounded-full"
              style={{
                backgroundColor: YEAR_COLORS[primaryYear]?.stroke || '#6366f1',
              }}
            />
            <span>ยอดรวมปี {primaryYear}</span>
          </div>
          <div className="text-xl font-bold text-white tracking-tight">
            {formatThaiCurrency(primaryTotal)}
          </div>
          <div className="text-[10px] text-slate-400 mt-1">
            เฉลี่ย{' '}
            {formatThaiCurrency(
              Math.round(
                primaryTotal /
                  Math.max(
                    1,
                    Object.keys(yearMonthTotals[primaryYear] || {}).length
                  )
              )
            )}
            /ด.
          </div>
        </div>

        {/* Compare Year Total */}
        <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800">
          <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-1">
            <span
              className="w-2 h-2 rounded-full"
              style={{
                backgroundColor: compareYear
                  ? YEAR_COLORS[compareYear]?.stroke || '#10b981'
                  : '#64748b',
              }}
            />
            <span>
              {compareYear ? `ยอดรวมปี ${compareYear}` : 'ไม่มีข้อมูลปีก่อน'}
            </span>
          </div>
          <div className="text-xl font-bold text-slate-200 tracking-tight">
            {compareYear ? formatThaiCurrency(compareTotal || 0) : '-'}
          </div>
          <div className="text-[10px] text-slate-400 mt-1">
            {compareYear
              ? `เฉลี่ย ${formatThaiCurrency(
                  Math.round(
                    (compareTotal || 0) /
                      Math.max(
                        1,
                        Object.keys(yearMonthTotals[compareYear] || {}).length
                      )
                  )
                )}/ด.`
              : 'เลือกปีเพื่อเปรียบเทียบ'}
          </div>
        </div>

        {/* YoY Difference */}
        <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800">
          <span className="text-xs text-slate-400 block mb-1">
            อัตราเปลี่ยนแปลง YoY
          </span>
          <div className="flex items-center gap-1.5">
            {yoyPercent !== null ? (
              <div
                className={`text-xl font-bold tracking-tight flex items-center gap-1 ${
                  yoyPercent > 0
                    ? 'text-rose-400'
                    : yoyPercent < 0
                    ? 'text-emerald-400'
                    : 'text-slate-300'
                }`}
              >
                {yoyPercent > 0 ? (
                  <TrendingUp className="w-4 h-4 text-rose-400" />
                ) : yoyPercent < 0 ? (
                  <TrendingDown className="w-4 h-4 text-emerald-400" />
                ) : null}
                <span>
                  {yoyPercent > 0 ? '+' : ''}
                  {yoyPercent}%
                </span>
              </div>
            ) : (
              <span className="text-xl font-bold text-slate-400">-</span>
            )}
          </div>
          <div className="text-[10px] text-slate-400 mt-1">
            {yoyDiff !== null
              ? `${yoyDiff > 0 ? 'เพิ่มขึ้น' : 'ลดลง'} ${formatThaiCurrency(
                  Math.abs(yoyDiff)
                )}`
              : 'ต้องการข้อมูลอย่างน้อย 2 ปี'}
          </div>
        </div>

        {/* Active Comparison Legend */}
        <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 flex flex-col justify-between">
          <span className="text-xs text-slate-400 block mb-1">เส้นกราฟที่แสดง</span>
          <div className="flex flex-wrap items-center gap-2">
            {selectedYears.map((year) => {
              const colorCfg = YEAR_COLORS[year] || DEFAULT_COLOR;
              return (
                <div key={year} className="flex items-center gap-1.5 text-xs text-slate-200 font-medium">
                  <span
                    className="w-3 h-1 rounded-full"
                    style={{ backgroundColor: colorCfg.stroke }}
                  />
                  <span>ปี {year}</span>
                </div>
              );
            })}
          </div>
          <div className="text-[10px] text-indigo-400 mt-1">
            {spendTypeFilter === 'all'
              ? 'รวมทุกประเภท'
              : spendTypeFilter === 'regular'
              ? 'เฉพาะยอดปกติ'
              : 'เฉพาะผ่อน 0%'}
          </div>
        </div>
      </div>

      {/* Main Recharts Line Chart Container */}
      <div className="w-full h-80 sm:h-96 pt-2">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={chartData}
            margin={{ top: 15, right: 15, left: -10, bottom: 5 }}
            onClick={(state: any) => {
              const active = (state as any)?.activePayload;
              if (active && active[0] && onSelectMonth) {
                const item = active[0];
                const monthKey = item.payload?.monthKey;
                const year = item.dataKey;
                if (year && monthKey) {
                  onSelectMonth(`${year}-${monthKey}`);
                }
              }
            }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.4} vertical={false} />

            <XAxis
              dataKey="monthName"
              stroke="#64748b"
              tick={{ fill: '#94a3b8', fontSize: 12, fontWeight: 500 }}
              axisLine={{ stroke: '#334155' }}
              tickLine={{ stroke: '#334155' }}
            />

            <YAxis
              stroke="#64748b"
              tick={{ fill: '#94a3b8', fontSize: 11 }}
              axisLine={{ stroke: '#334155' }}
              tickLine={{ stroke: '#334155' }}
              tickFormatter={(val) => {
                if (val >= 1000000) return `${(val / 1000000).toFixed(1)}M`;
                if (val >= 1000) return `${Math.round(val / 1000)}k`;
                return `${val}`;
              }}
            />

            <Tooltip content={<CustomTooltip />} />

            <Legend
              verticalAlign="top"
              align="right"
              wrapperStyle={{ paddingBottom: 12 }}
              formatter={(value) => {
                const thaiYear = parseInt(value, 10) + 543;
                return (
                  <span className="text-xs font-semibold text-slate-300">
                    ยอดปี {value} (พ.ศ. {thaiYear})
                  </span>
                );
              }}
            />

            {/* Render lines for all currently selected years */}
            {selectedYears.map((year, idx) => {
              const colorCfg = YEAR_COLORS[year] || DEFAULT_COLOR;
              const isPrimary = idx === 0;

              return (
                <Line
                  key={year}
                  type="monotone"
                  dataKey={year}
                  name={year}
                  stroke={colorCfg.stroke}
                  strokeWidth={isPrimary ? 3 : 2.5}
                  dot={{
                    r: isPrimary ? 4.5 : 3.5,
                    fill: colorCfg.stroke,
                    stroke: '#0f172a',
                    strokeWidth: 2,
                  }}
                  activeDot={{
                    r: 7,
                    fill: colorCfg.stroke,
                    stroke: '#ffffff',
                    strokeWidth: 2,
                  }}
                  connectNulls
                  animationDuration={800}
                />
              );
            })}
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Expandable Month-by-Month YoY Comparison Table */}
      <div className="pt-2 border-t border-slate-800">
        <button
          type="button"
          onClick={() => setShowTable(!showTable)}
          className="flex items-center justify-between w-full text-xs font-semibold text-slate-300 hover:text-white transition py-1 cursor-pointer"
        >
          <span className="flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-indigo-400" />
            ตารางเปรียบเทียบยอด 12 เดือนแบบละเอียด ({selectedYears.join(' vs ')})
          </span>
          <span className="flex items-center gap-1 text-[11px] text-indigo-400">
            {showTable ? 'ซ่อนตาราง' : 'แสดงตาราง'}
            {showTable ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </span>
        </button>

        {showTable && (
          <div className="mt-3 overflow-x-auto rounded-xl border border-slate-800">
            <table className="w-full text-left text-xs text-slate-300 border-collapse">
              <thead>
                <tr className="bg-slate-950/80 border-b border-slate-800 text-slate-400 font-semibold uppercase text-[11px]">
                  <th className="py-2.5 px-3">เดือน</th>
                  {selectedYears.map((year) => (
                    <th key={year} className="py-2.5 px-3 text-right">
                      ปี {year} (พ.ศ. {parseInt(year, 10) + 543})
                    </th>
                  ))}
                  {selectedYears.length >= 2 && (
                    <>
                      <th className="py-2.5 px-3 text-right">ผลต่าง (YoY)</th>
                      <th className="py-2.5 px-3 text-right">% เติบโต</th>
                    </>
                  )}
                  {onSelectMonth && <th className="py-2.5 px-3 text-center">ดูรายการ</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-medium bg-slate-900/40">
                {MONTH_DEFINITIONS.map((def) => {
                  const pAmt = selectedYears[0]
                    ? yearMonthTotals[selectedYears[0]]?.[def.key] || 0
                    : 0;
                  const cAmt = selectedYears[1]
                    ? yearMonthTotals[selectedYears[1]]?.[def.key] || 0
                    : 0;
                  const diff = pAmt - cAmt;
                  const pct = cAmt > 0 ? Math.round(((pAmt - cAmt) / cAmt) * 100) : null;

                  return (
                    <tr key={def.key} className="hover:bg-slate-800/40 transition">
                      <td className="py-2.5 px-3 font-semibold text-white">
                        {def.full} ({def.en})
                      </td>
                      {selectedYears.map((year) => {
                        const amt = yearMonthTotals[year]?.[def.key] || 0;
                        return (
                          <td key={year} className="py-2.5 px-3 text-right font-semibold text-white">
                            {amt > 0 ? formatThaiCurrency(amt) : '-'}
                          </td>
                        );
                      })}
                      {selectedYears.length >= 2 && (
                        <>
                          <td
                            className={`py-2.5 px-3 text-right font-semibold ${
                              diff > 0
                                ? 'text-rose-400'
                                : diff < 0
                                ? 'text-emerald-400'
                                : 'text-slate-400'
                            }`}
                          >
                            {diff !== 0 ? `${diff > 0 ? '+' : ''}${formatThaiCurrency(diff)}` : '-'}
                          </td>
                          <td
                            className={`py-2.5 px-3 text-right font-semibold ${
                              pct !== null && pct > 0
                                ? 'text-rose-400'
                                : pct !== null && pct < 0
                                ? 'text-emerald-400'
                                : 'text-slate-400'
                            }`}
                          >
                            {pct !== null ? `${pct > 0 ? '+' : ''}${pct}%` : '-'}
                          </td>
                        </>
                      )}
                      {onSelectMonth && (
                        <td className="py-2.5 px-3 text-center">
                          <button
                            type="button"
                            onClick={() => onSelectMonth(`${selectedYears[0] || '2026'}-${def.key}`)}
                            className="px-2 py-0.5 rounded text-[11px] bg-slate-800 hover:bg-indigo-600 text-slate-300 hover:text-white transition cursor-pointer"
                          >
                            เปิดดู
                          </button>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
