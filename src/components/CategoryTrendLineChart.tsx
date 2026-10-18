import React, { useState, useMemo } from 'react';
import { Transaction, TransactionCategory } from '../types';
import {
  CATEGORY_INFO,
  formatThaiCurrency,
  formatThaiMonth,
} from '../utils/cardUtils';
import {
  TrendingUp,
  TrendingDown,
  LineChart as LineChartIcon,
  Check,
  Utensils,
  ShoppingBag,
  Receipt,
  ShoppingCart,
  Car,
  Plane,
  Film,
  Heart,
  Globe,
  MoreHorizontal,
  Info,
  Maximize2,
  Minimize2,
} from 'lucide-react';

interface CategoryTrendLineChartProps {
  transactions: Transaction[];
  trends: {
    month: string;
    monthLabel: string;
    totalSpent: number;
  }[];
  onSelectMonth?: (month: string) => void;
}

export const CATEGORY_EN_LABELS: Record<TransactionCategory, string> = {
  food: 'Dining',
  shopping: 'Shopping',
  bills: 'Bills',
  supermarket: 'Groceries',
  transport: 'Transport',
  travel: 'Travel',
  entertainment: 'Entertainment',
  health: 'Health',
  online: 'Online',
  other: 'Other',
};

// Map icon strings to Lucide components
const getCategoryIconComponent = (cat: TransactionCategory) => {
  switch (cat) {
    case 'food':
      return Utensils;
    case 'shopping':
      return ShoppingBag;
    case 'bills':
      return Receipt;
    case 'supermarket':
      return ShoppingCart;
    case 'transport':
      return Car;
    case 'travel':
      return Plane;
    case 'entertainment':
      return Film;
    case 'health':
      return Heart;
    case 'online':
      return Globe;
    default:
      return MoreHorizontal;
  }
};

export const CategoryTrendLineChart: React.FC<CategoryTrendLineChartProps> = ({
  transactions,
  trends,
  onSelectMonth,
}) => {
  // Primary default active categories prominently highlighting Dining, Shopping, Bills
  const [selectedCategories, setSelectedCategories] = useState<TransactionCategory[]>([
    'food',
    'shopping',
    'bills',
    'supermarket',
  ]);
  const [focusedCategory, setFocusedCategory] = useState<TransactionCategory | null>(null);
  const [hoveredMonthIndex, setHoveredMonthIndex] = useState<number | null>(null);
  const [smoothCurve, setSmoothCurve] = useState<boolean>(true);

  // Compute monthly spending for each category
  const monthlyCategoryData = useMemo(() => {
    return trends.map((trendItem, idx) => {
      const monthTxs = transactions.filter((t) => t.billingCycleMonth === trendItem.month);
      const catTotals: Record<TransactionCategory, number> = {
        food: 0,
        shopping: 0,
        bills: 0,
        supermarket: 0,
        transport: 0,
        travel: 0,
        entertainment: 0,
        health: 0,
        online: 0,
        other: 0,
      };

      monthTxs.forEach((t) => {
        const charge =
          t.isInstallment && t.monthlyInstallmentAmount
            ? t.monthlyInstallmentAmount
            : t.amount;
        if (catTotals[t.category] !== undefined) {
          catTotals[t.category] += charge;
        } else {
          catTotals.other += charge;
        }
      });

      return {
        month: trendItem.month,
        monthLabel: trendItem.monthLabel,
        totalSpent: trendItem.totalSpent,
        categories: catTotals,
      };
    });
  }, [transactions, trends]);

  // Aggregate totals across all periods to identify categories with data
  const categoryAggregates = useMemo(() => {
    const totals: Record<TransactionCategory, { total: number; count: number }> = {
      food: { total: 0, count: 0 },
      shopping: { total: 0, count: 0 },
      bills: { total: 0, count: 0 },
      supermarket: { total: 0, count: 0 },
      transport: { total: 0, count: 0 },
      travel: { total: 0, count: 0 },
      entertainment: { total: 0, count: 0 },
      health: { total: 0, count: 0 },
      online: { total: 0, count: 0 },
      other: { total: 0, count: 0 },
    };

    transactions.forEach((t) => {
      const charge =
        t.isInstallment && t.monthlyInstallmentAmount
          ? t.monthlyInstallmentAmount
          : t.amount;
      if (totals[t.category]) {
        totals[t.category].total += charge;
        totals[t.category].count += 1;
      }
    });

    return totals;
  }, [transactions]);

  // Sorted list of all categories that have spending
  const activeCategoriesWithSpending = useMemo(() => {
    return (Object.keys(categoryAggregates) as TransactionCategory[]).sort((a, b) => {
      // Prioritize food, shopping, bills first if equal or high, then by total
      const priority: Record<string, number> = { food: 3, shopping: 2, bills: 1 };
      const priorityA = priority[a] || 0;
      const priorityB = priority[b] || 0;
      if (categoryAggregates[b].total !== categoryAggregates[a].total) {
        return categoryAggregates[b].total - categoryAggregates[a].total;
      }
      return priorityB - priorityA;
    });
  }, [categoryAggregates]);

  // Toggle category on/off
  const toggleCategory = (cat: TransactionCategory) => {
    setSelectedCategories((prev) => {
      if (prev.includes(cat)) {
        if (prev.length === 1) return prev; // Keep at least one
        return prev.filter((c) => c !== cat);
      } else {
        return [...prev, cat];
      }
    });
  };

  const selectOnlyCategory = (cat: TransactionCategory) => {
    setSelectedCategories([cat]);
    setFocusedCategory(cat);
  };

  const selectCoreThree = () => {
    setSelectedCategories(['food', 'shopping', 'bills']);
    setFocusedCategory(null);
  };

  const selectAllWithData = () => {
    const withData = activeCategoriesWithSpending.filter(
      (cat) => categoryAggregates[cat].total > 0
    );
    setSelectedCategories(withData.length > 0 ? withData : ['food', 'shopping', 'bills']);
    setFocusedCategory(null);
  };

  // Dimensions for SVG chart
  const svgWidth = 720;
  const svgHeight = 260;
  const paddingLeft = 65;
  const paddingRight = 35;
  const paddingTop = 25;
  const paddingBottom = 45;

  const chartWidth = svgWidth - paddingLeft - paddingRight;
  const chartHeight = svgHeight - paddingTop - paddingBottom;

  // Find max value among selected categories for Y-axis scale
  const maxSelectedValue = useMemo(() => {
    let max = 0;
    monthlyCategoryData.forEach((m) => {
      selectedCategories.forEach((cat) => {
        if (m.categories[cat] > max) {
          max = m.categories[cat];
        }
      });
    });
    // Round up nicely to nearest 2k, 5k, or 10k
    if (max <= 5000) return Math.max(5000, Math.ceil(max / 1000) * 1000);
    if (max <= 20000) return Math.ceil(max / 2500) * 2500;
    return Math.ceil(max / 5000) * 5000 || 10000;
  }, [monthlyCategoryData, selectedCategories]);

  // Generate Y scale ticks (4 intervals)
  const yTicks = useMemo(() => {
    const steps = 4;
    const ticks = [];
    for (let i = 0; i <= steps; i++) {
      ticks.push(Math.round((maxSelectedValue / steps) * i));
    }
    return ticks;
  }, [maxSelectedValue]);

  // Coordinate mapping functions
  const getX = (index: number) => {
    if (monthlyCategoryData.length <= 1) return paddingLeft + chartWidth / 2;
    return paddingLeft + (index / (monthlyCategoryData.length - 1)) * chartWidth;
  };

  const getY = (val: number) => {
    const ratio = Math.min(1, Math.max(0, val / maxSelectedValue));
    return paddingTop + chartHeight - ratio * chartHeight;
  };

  // Build SVG path strings (smooth bezier or linear)
  const generateCategoryPath = (cat: TransactionCategory) => {
    const points = monthlyCategoryData.map((m, idx) => ({
      x: getX(idx),
      y: getY(m.categories[cat]),
    }));

    if (points.length === 0) return '';
    if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;

    if (!smoothCurve || points.length === 2) {
      return points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');
    }

    // Cubic bezier curve calculation
    let d = `M ${points[0].x.toFixed(1)} ${points[0].y.toFixed(1)}`;
    for (let i = 0; i < points.length - 1; i++) {
      const p0 = i > 0 ? points[i - 1] : points[i];
      const p1 = points[i];
      const p2 = points[i + 1];
      const p3 = i < points.length - 2 ? points[i + 2] : p2;

      const cp1x = p1.x + (p2.x - p0.x) / 6;
      const cp1y = p1.y + (p2.y - p0.y) / 6;
      const cp2x = p2.x - (p3.x - p1.x) / 6;
      const cp2y = p2.y - (p3.y - p1.y) / 6;

      d += ` C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
    }
    return d;
  };

  // Generate Area Fill Path under the focused or single selected category
  const generateAreaPath = (cat: TransactionCategory) => {
    const linePath = generateCategoryPath(cat);
    if (!linePath) return '';
    const lastX = getX(monthlyCategoryData.length - 1);
    const firstX = getX(0);
    const bottomY = paddingTop + chartHeight;
    return `${linePath} L ${lastX.toFixed(1)} ${bottomY} L ${firstX.toFixed(1)} ${bottomY} Z`;
  };

  // Calculate Month-over-Month changes for the latest month vs previous month
  const categoryMoM = useMemo<Partial<Record<
    TransactionCategory,
    {
      latestAmount: number;
      prevAmount: number;
      delta: number;
      percentage: number | null;
    }
  >>>(() => {
    const result: Partial<Record<
      TransactionCategory,
      {
        latestAmount: number;
        prevAmount: number;
        delta: number;
        percentage: number | null;
      }
    >> = {};

    if (monthlyCategoryData.length < 2) return result;
    const latest = monthlyCategoryData[monthlyCategoryData.length - 1];
    const prev = monthlyCategoryData[monthlyCategoryData.length - 2];

    (Object.keys(CATEGORY_INFO) as TransactionCategory[]).forEach((cat) => {
      const latestVal = latest.categories[cat] || 0;
      const prevVal = prev.categories[cat] || 0;
      const delta = latestVal - prevVal;
      let pct: number | null = null;
      if (prevVal > 0) {
        pct = Math.round(((latestVal - prevVal) / prevVal) * 100);
      } else if (prevVal === 0 && latestVal > 0) {
        pct = 100;
      } else if (prevVal === 0 && latestVal === 0) {
        pct = 0;
      }
      result[cat] = {
        latestAmount: latestVal,
        prevAmount: prevVal,
        delta,
        percentage: pct,
      };
    });

    return result;
  }, [monthlyCategoryData]);

  // When hovering on SVG, handle mouse coordinate
  const handleSvgMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clientX = e.clientX - rect.left;
    const svgRelativeX = (clientX / rect.width) * svgWidth;

    if (svgRelativeX < paddingLeft || svgRelativeX > paddingLeft + chartWidth) {
      setHoveredMonthIndex(null);
      return;
    }

    // Find nearest month index
    let nearestIndex = 0;
    let minDistance = Infinity;
    monthlyCategoryData.forEach((_, idx) => {
      const x = getX(idx);
      const dist = Math.abs(x - svgRelativeX);
      if (dist < minDistance) {
        minDistance = dist;
        nearestIndex = idx;
      }
    });

    setHoveredMonthIndex(nearestIndex);
  };

  const activeHoverMonth =
    hoveredMonthIndex !== null ? monthlyCategoryData[hoveredMonthIndex] : null;

  return (
    <div className="p-5 rounded-2xl bg-slate-900/90 border border-indigo-500/20 shadow-xl space-y-5">
      {/* Chart Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-pink-500/20 text-pink-400 border border-pink-500/30">
              <LineChartIcon className="w-4 h-4" />
            </div>
            <h3 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
              แนวโน้มยอดใช้จ่ายแยกตามหมวดหมู่ (Category MoM Trends)
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-pink-500/10 text-pink-300 border border-pink-500/20">
                Line Chart
              </span>
            </h3>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            เปรียบเทียบการเปลี่ยนแปลงยอดใช้จ่ายเดือนต่อเดือน (Month-over-Month) เช่น อาหาร (Dining), ช้อปปิ้ง (Shopping), บิล & สาธารณูปโภค (Bills)
          </p>
        </div>

        {/* Quick presets and curve switcher */}
        <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
          <button
            type="button"
            onClick={selectCoreThree}
            className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 transition cursor-pointer"
            title="เลือกเฉพาะ 3 หมวดหมู่หลัก (Dining, Shopping, Bills)"
          >
            Dining, Shopping & Bills
          </button>
          <button
            type="button"
            onClick={selectAllWithData}
            className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 transition cursor-pointer"
            title="แสดงทุกหมวดหมู่ที่มียอดใช้จ่าย"
          >
            ทุกหมวดหมู่
          </button>
          <button
            type="button"
            onClick={() => setSmoothCurve(!smoothCurve)}
            className={`px-2 py-1 text-xs font-medium rounded-lg border transition cursor-pointer ${
              smoothCurve
                ? 'bg-indigo-600/30 text-indigo-300 border-indigo-500/40'
                : 'bg-slate-800/80 text-slate-400 border-slate-700'
            }`}
            title="สลับรูปแบบเส้นโค้งมน / เส้นตรง"
          >
            {smoothCurve ? 'เส้นโค้งมน' : 'เส้นตรง'}
          </button>
        </div>
      </div>

      {/* Category Selection Filter Pills / Legend */}
      <div className="flex flex-wrap items-center gap-2 pt-1 pb-1 border-b border-slate-800/80">
        <span className="text-[11px] font-medium text-slate-400 mr-1 flex items-center gap-1">
          <span>เลือกหมวดหมู่ที่ต้องการดูกราฟ:</span>
        </span>
        {activeCategoriesWithSpending.map((cat) => {
          const info = CATEGORY_INFO[cat];
          const isSelected = selectedCategories.includes(cat);
          const isFocused = focusedCategory === cat;
          const Icon = getCategoryIconComponent(cat);
          const enLabel = CATEGORY_EN_LABELS[cat];
          const totalSpent = categoryAggregates[cat].total;

          return (
            <div key={cat} className="inline-flex items-center group">
              <button
                type="button"
                onClick={() => toggleCategory(cat)}
                onMouseEnter={() => isSelected && setFocusedCategory(cat)}
                onMouseLeave={() => setFocusedCategory(null)}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-medium transition cursor-pointer border ${
                  isSelected
                    ? 'border-transparent text-white shadow-sm'
                    : 'bg-slate-800/50 border-slate-800 text-slate-400 opacity-60 hover:opacity-100 hover:border-slate-700'
                }`}
                style={{
                  backgroundColor: isSelected ? `${info.hexColor}25` : undefined,
                  borderColor: isSelected ? `${info.hexColor}80` : undefined,
                }}
                title={`คลิกเพื่อเปิด/ปิดกราฟ ${info.label} (${enLabel})`}
              >
                <span
                  className="w-2.5 h-2.5 rounded-full flex-shrink-0 transition-transform group-hover:scale-125"
                  style={{ backgroundColor: info.hexColor }}
                />
                <Icon className="w-3.5 h-3.5" style={{ color: info.hexColor }} />
                <span>{info.label.split(' ')[0]}</span>
                <span className="text-[10px] text-slate-300 font-mono">({enLabel})</span>
                {isSelected && (
                  <Check className="w-3 h-3 text-emerald-400 ml-0.5" />
                )}
              </button>
              {/* Quick Solo button */}
              {isSelected && selectedCategories.length > 1 && (
                <button
                  type="button"
                  onClick={() => selectOnlyCategory(cat)}
                  className="hidden group-hover:inline-flex p-1 -ml-1 text-[9px] text-slate-400 hover:text-white cursor-pointer"
                  title="ดูเฉพาะหมวดหมู่นี้เท่านั้น"
                >
                  <Maximize2 className="w-2.5 h-2.5" />
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Interactive SVG Line Chart */}
      <div className="relative bg-slate-950/60 rounded-xl p-3 border border-slate-800/90 overflow-hidden">
        {/* Hovered Month Floating Tooltip */}
        {activeHoverMonth && hoveredMonthIndex !== null && (
          <div
            className="absolute top-4 z-20 pointer-events-none transition-all duration-150 p-3 rounded-xl bg-slate-900/95 border border-slate-700 shadow-2xl backdrop-blur-md text-xs min-w-[210px]"
            style={{
              left: `${Math.min(
                Math.max(10, (getX(hoveredMonthIndex) / svgWidth) * 100),
                70
              )}%`,
            }}
          >
            <div className="flex items-center justify-between pb-1.5 mb-1.5 border-b border-slate-800">
              <span className="font-bold text-white text-[13px]">
                {formatThaiMonth(activeHoverMonth.month)}
              </span>
              <span className="text-[10px] text-indigo-300 bg-indigo-500/10 px-1.5 py-0.5 rounded border border-indigo-500/20">
                รวม {formatThaiCurrency(activeHoverMonth.totalSpent)}
              </span>
            </div>

            <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
              {selectedCategories.map((cat) => {
                const info = CATEGORY_INFO[cat];
                const amount = activeHoverMonth.categories[cat] || 0;
                const enLabel = CATEGORY_EN_LABELS[cat];

                // Previous month amount for MoM comparison in tooltip
                const prevMonth =
                  hoveredMonthIndex > 0
                    ? monthlyCategoryData[hoveredMonthIndex - 1]
                    : null;
                const prevAmount = prevMonth ? prevMonth.categories[cat] || 0 : null;
                const delta = prevAmount !== null ? amount - prevAmount : 0;
                const pct =
                  prevAmount && prevAmount > 0
                    ? Math.round(((amount - prevAmount) / prevAmount) * 100)
                    : null;

                return (
                  <div
                    key={cat}
                    className={`flex items-center justify-between py-0.5 px-1 rounded transition ${
                      focusedCategory === cat ? 'bg-slate-800' : ''
                    }`}
                  >
                    <div className="flex items-center gap-1.5 truncate mr-2">
                      <span
                        className="w-2 h-2 rounded-full flex-shrink-0"
                        style={{ backgroundColor: info.hexColor }}
                      />
                      <span className="text-slate-200 truncate">
                        {info.label.split(' ')[0]} ({enLabel})
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <span className="font-semibold text-white">
                        {formatThaiCurrency(amount)}
                      </span>
                      {pct !== null ? (
                        <span
                          className={`text-[9px] font-semibold flex items-center ${
                            pct > 0
                              ? 'text-rose-400'
                              : pct < 0
                              ? 'text-emerald-400'
                              : 'text-slate-400'
                          }`}
                        >
                          {pct > 0 ? `+${pct}%` : `${pct}%`}
                        </span>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
            {onSelectMonth && (
              <div className="mt-2 pt-1 border-t border-slate-800/80 text-[10px] text-center text-slate-400">
                คลิกที่จุดเพื่อเจาะลึกรอบบิลนี้
              </div>
            )}
          </div>
        )}

        <svg
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          className="w-full h-auto max-h-[300px] cursor-crosshair overflow-visible select-none"
          onMouseMove={handleSvgMouseMove}
          onMouseLeave={() => setHoveredMonthIndex(null)}
        >
          <defs>
            {/* Gradients for category lines */}
            {selectedCategories.map((cat) => {
              const info = CATEGORY_INFO[cat];
              return (
                <linearGradient
                  key={`area-grad-${cat}`}
                  id={`area-grad-${cat}`}
                  x1="0%"
                  y1="0%"
                  x2="0%"
                  y2="100%"
                >
                  <stop offset="0%" stopColor={info.hexColor} stopOpacity="0.35" />
                  <stop offset="70%" stopColor={info.hexColor} stopOpacity="0.08" />
                  <stop offset="100%" stopColor={info.hexColor} stopOpacity="0" />
                </linearGradient>
              );
            })}
          </defs>

          {/* Horizontal Grid lines and Y-axis values */}
          {yTicks.map((val, idx) => {
            const y = getY(val);
            return (
              <g key={`ytick-${val}-${idx}`}>
                <line
                  x1={paddingLeft}
                  y1={y}
                  x2={paddingLeft + chartWidth}
                  y2={y}
                  stroke="#334155"
                  strokeWidth="1"
                  strokeDasharray={idx === 0 ? 'none' : '3 3'}
                  strokeOpacity={idx === 0 ? '0.6' : '0.35'}
                />
                <text
                  x={paddingLeft - 10}
                  y={y + 4}
                  textAnchor="end"
                  fontSize="10"
                  fill="#94a3b8"
                  fontFamily="sans-serif"
                >
                  {val >= 1000 ? `${Math.round(val / 1000)}k` : val}
                </text>
              </g>
            );
          })}

          {/* Vertical Guides for each Month */}
          {monthlyCategoryData.map((m, idx) => {
            const x = getX(idx);
            const isHovered = hoveredMonthIndex === idx;

            return (
              <g key={`xtick-${m.month}`}>
                {/* Column highlight line when hovered */}
                {isHovered && (
                  <line
                    x1={x}
                    y1={paddingTop}
                    x2={x}
                    y2={paddingTop + chartHeight}
                    stroke="#6366f1"
                    strokeWidth="1.5"
                    strokeDasharray="4 2"
                    strokeOpacity="0.9"
                  />
                )}

                {/* X-axis tick & label */}
                <text
                  x={x}
                  y={paddingTop + chartHeight + 20}
                  textAnchor="middle"
                  fontSize="11"
                  fontWeight={isHovered ? 'bold' : 'normal'}
                  fill={isHovered ? '#ffffff' : '#94a3b8'}
                  className="cursor-pointer transition-colors"
                  onClick={() => onSelectMonth && onSelectMonth(m.month)}
                >
                  {m.monthLabel}
                </text>
              </g>
            );
          })}

          {/* Render Area Fills if focusedCategory or only 1 category selected */}
          {selectedCategories.map((cat) => {
            const isFocused = focusedCategory === cat;
            const isOnly = selectedCategories.length === 1;
            if (!isFocused && !isOnly) return null;

            const areaD = generateAreaPath(cat);
            return (
              <path
                key={`area-${cat}`}
                d={areaD}
                fill={`url(#area-grad-${cat})`}
                className="transition-opacity duration-300 pointer-events-none"
              />
            );
          })}

          {/* Render Category Lines */}
          {selectedCategories.map((cat) => {
            const info = CATEGORY_INFO[cat];
            const pathD = generateCategoryPath(cat);
            const isFocused = focusedCategory === cat;
            const isDimmed = focusedCategory !== null && !isFocused;

            return (
              <g
                key={`line-group-${cat}`}
                className="transition-opacity duration-200"
                opacity={isDimmed ? 0.2 : 1}
              >
                {/* Background thicker glow line */}
                {isFocused && (
                  <path
                    d={pathD}
                    fill="none"
                    stroke={info.hexColor}
                    strokeWidth="6"
                    strokeOpacity="0.25"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                )}

                {/* Main colored line */}
                <path
                  d={pathD}
                  fill="none"
                  stroke={info.hexColor}
                  strokeWidth={isFocused ? '3.5' : '2.5'}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="transition-all duration-200"
                />

                {/* Circular Data Points for each Month */}
                {monthlyCategoryData.map((m, idx) => {
                  const x = getX(idx);
                  const y = getY(m.categories[cat]);
                  const isHovered = hoveredMonthIndex === idx;

                  return (
                    <g
                      key={`point-${cat}-${m.month}`}
                      className="cursor-pointer group"
                      onClick={() => onSelectMonth && onSelectMonth(m.month)}
                    >
                      {/* Outer pulse circle when hovered */}
                      {(isHovered || isFocused) && (
                        <circle
                          cx={x}
                          cy={y}
                          r={isHovered ? 7 : 5}
                          fill={info.hexColor}
                          fillOpacity={0.3}
                        />
                      )}

                      {/* Main Point Circle */}
                      <circle
                        cx={x}
                        cy={y}
                        r={isHovered ? 4.5 : 3.5}
                        fill="#0f172a"
                        stroke={info.hexColor}
                        strokeWidth={isHovered ? '2.5' : '2'}
                        className="transition-all duration-150"
                      />
                    </g>
                  );
                })}
              </g>
            );
          })}
        </svg>
      </div>

      {/* Month-over-Month (MoM) Trend Summary Cards for Primary Categories */}
      <div className="space-y-3">
        <div className="flex items-center justify-between text-xs text-slate-400">
          <span className="font-semibold text-slate-300 flex items-center gap-1.5">
            <Info className="w-3.5 h-3.5 text-indigo-400" />
            สรุปการเปลี่ยนแปลงเทียบเดือนก่อน (MoM Delta Analysis):
          </span>
          <span>
            {monthlyCategoryData.length >= 2
              ? `เทียบ ${monthlyCategoryData[monthlyCategoryData.length - 1]?.monthLabel} กับ ${monthlyCategoryData[monthlyCategoryData.length - 2]?.monthLabel}`
              : 'ข้อมูลเดือนล่าสุด'}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {selectedCategories.slice(0, 6).map((cat) => {
            const info = CATEGORY_INFO[cat];
            const mom = categoryMoM[cat];
            const Icon = getCategoryIconComponent(cat);
            const enLabel = CATEGORY_EN_LABELS[cat];
            const latestAmount = mom ? mom.latestAmount : 0;
            const prevAmount = mom ? mom.prevAmount : 0;
            const pct = mom ? mom.percentage : null;

            return (
              <div
                key={`card-${cat}`}
                onMouseEnter={() => setFocusedCategory(cat)}
                onMouseLeave={() => setFocusedCategory(null)}
                className={`p-3.5 rounded-xl border transition-all duration-200 cursor-pointer ${
                  focusedCategory === cat
                    ? 'bg-slate-800 border-indigo-500/80 shadow-lg scale-[1.01]'
                    : 'bg-slate-900/80 border-slate-800 hover:border-slate-700'
                }`}
                onClick={() => selectOnlyCategory(cat)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div
                      className="p-1.5 rounded-lg flex items-center justify-center"
                      style={{
                        backgroundColor: `${info.hexColor}20`,
                        color: info.hexColor,
                      }}
                    >
                      <Icon className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="font-bold text-white text-xs flex items-center gap-1">
                        <span>{info.label.split(' ')[0]}</span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          ({enLabel})
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-400">
                        {info.label}
                      </div>
                    </div>
                  </div>

                  {/* MoM % Badge */}
                  {pct !== null ? (
                    <div
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold ${
                        pct > 0
                          ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                          : pct < 0
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : 'bg-slate-800 text-slate-400'
                      }`}
                      title={pct > 0 ? 'ใช้จ่ายเพิ่มขึ้น' : pct < 0 ? 'ประหยัดขึ้น' : 'คงที่'}
                    >
                      {pct > 0 ? (
                        <>
                          <TrendingUp className="w-3 h-3 text-rose-400" />
                          +{pct}%
                        </>
                      ) : pct < 0 ? (
                        <>
                          <TrendingDown className="w-3 h-3 text-emerald-400" />
                          {pct}%
                        </>
                      ) : (
                        '0%'
                      )}
                    </div>
                  ) : (
                    <span className="text-[11px] text-slate-500">-</span>
                  )}
                </div>

                {/* Amount Details */}
                <div className="mt-3 flex items-baseline justify-between">
                  <div>
                    <span className="text-[10px] text-slate-400 block">ยอดเดือนล่าสุด</span>
                    <span className="text-base font-bold text-white">
                      {formatThaiCurrency(latestAmount)}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 block">เดือนก่อนหน้า</span>
                    <span className="text-xs font-semibold text-slate-300">
                      {formatThaiCurrency(prevAmount)}
                    </span>
                  </div>
                </div>

                {/* Mini trend bar */}
                <div className="mt-2.5 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px] text-slate-400">
                  <span>
                    ส่วนต่าง:{' '}
                    <span
                      className={
                        mom && mom.delta > 0
                          ? 'text-rose-300 font-medium'
                          : mom && mom.delta < 0
                          ? 'text-emerald-300 font-medium'
                          : 'text-slate-400'
                      }
                    >
                      {mom && mom.delta > 0
                        ? `+${formatThaiCurrency(mom.delta)}`
                        : mom && mom.delta < 0
                        ? formatThaiCurrency(mom.delta)
                        : '0 บาท'}
                    </span>
                  </span>
                  <span className="text-indigo-400 group-hover:underline">คลิกเพื่อดูกราฟเดี่ยว</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
