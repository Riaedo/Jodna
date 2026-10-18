import React, { useState } from 'react';
import { TransactionCategory } from '../types';
import { CATEGORY_INFO, formatThaiCurrency } from '../utils/cardUtils';
import { PieChart as PieIcon, ChevronDown, ChevronUp } from 'lucide-react';

interface CategoryPieChartProps {
  categoryBreakdown: { [category in TransactionCategory]?: number };
  totalSpent: number;
  selectedCategory?: TransactionCategory | null;
  onSelectCategory?: (category: TransactionCategory | null) => void;
  title?: string;
  subtitle?: string;
}

interface SliceData {
  category: TransactionCategory;
  amount: number;
  percentage: number;
  startAngle: number;
  endAngle: number;
  path: string;
  color: string;
  label: string;
}

export const CategoryPieChart: React.FC<CategoryPieChartProps> = ({
  categoryBreakdown,
  totalSpent,
  selectedCategory = null,
  onSelectCategory,
  title = 'สัดส่วนค่าใช้จ่ายตามหมวดหมู่',
  subtitle,
}) => {
  const [hoveredCategory, setHoveredCategory] = useState<TransactionCategory | null>(null);
  const [showAllCategories, setShowAllCategories] = useState(false);

  // Filter and sort categories with positive spending
  const activeSlices = Object.entries(categoryBreakdown)
    .filter(([_, amount]) => (amount || 0) > 0)
    .sort((a, b) => (b[1] || 0) - (a[1] || 0)) as [TransactionCategory, number][];

  // SVG donut chart geometry (balanced size to place above text)
  const radius = 70;
  const innerRadius = 45;
  const center = 80;

  let cumulativeAngle = -Math.PI / 2; // Start from top (12 o'clock)

  const slices: SliceData[] = activeSlices.map(([cat, amount]) => {
    const fraction = totalSpent > 0 ? amount / totalSpent : 0;
    const angle = fraction * 2 * Math.PI;
    const startAngle = cumulativeAngle;
    const endAngle = cumulativeAngle + angle;
    cumulativeAngle += angle;

    const info = CATEGORY_INFO[cat] || CATEGORY_INFO.other;

    // Calculate arc coordinates
    const x1 = center + radius * Math.cos(startAngle);
    const y1 = center + radius * Math.sin(startAngle);
    const x2 = center + radius * Math.cos(endAngle);
    const y2 = center + radius * Math.sin(endAngle);

    const ix1 = center + innerRadius * Math.cos(endAngle);
    const iy1 = center + innerRadius * Math.sin(endAngle);
    const ix2 = center + innerRadius * Math.cos(startAngle);
    const iy2 = center + innerRadius * Math.sin(startAngle);

    const largeArcFlag = angle > Math.PI ? 1 : 0;

    // SVG path for donut segment
    const path = [
      `M ${x1} ${y1}`,
      `A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2}`,
      `L ${ix1} ${iy1}`,
      `A ${innerRadius} ${innerRadius} 0 ${largeArcFlag} 0 ${ix2} ${iy2}`,
      'Z',
    ].join(' ');

    return {
      category: cat,
      amount,
      percentage: totalSpent > 0 ? Math.round(fraction * 100) : 0,
      startAngle,
      endAngle,
      path,
      color: info.hexColor,
      label: info.label,
    };
  });

  const activeCategory = hoveredCategory || selectedCategory;
  const activeSliceInfo = activeCategory
    ? slices.find((s) => s.category === activeCategory)
    : null;

  const displayedSlices = showAllCategories ? slices : slices.slice(0, 6);

  return (
    <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-3.5 h-full flex flex-col justify-between">
      {/* Header */}
      <div className="flex items-center justify-between pb-1 border-b border-slate-800/60">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
            <PieIcon className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white tracking-tight">{title}</h3>
            {subtitle && <p className="text-[11px] text-slate-400">{subtitle}</p>}
          </div>
        </div>

        {selectedCategory && onSelectCategory && (
          <button
            type="button"
            onClick={() => onSelectCategory(null)}
            className="text-[11px] font-medium text-indigo-400 hover:text-indigo-300 underline cursor-pointer"
          >
            แสดงทั้งหมด
          </button>
        )}
      </div>

      {slices.length === 0 ? (
        <div className="py-12 text-center text-xs text-slate-500 flex-1 flex items-center justify-center">
          ยังไม่มียอดค่าใช้จ่ายในรอบนี้
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-between gap-3">
          {/* Top Section: SVG Pie/Donut Chart centered nicely on TOP */}
          <div className="relative shrink-0 flex items-center justify-center py-1">
            <svg
              width="160"
              height="160"
              viewBox="0 0 160 160"
              className="overflow-visible select-none"
            >
              <defs>
                <filter id="pie-glow" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="3" result="blur" />
                  <feComposite in="SourceGraphic" in2="blur" operator="over" />
                </filter>
              </defs>

              {slices.map((slice) => {
                const isFocused =
                  hoveredCategory === slice.category || selectedCategory === slice.category;
                const isMuted =
                  (hoveredCategory && hoveredCategory !== slice.category) ||
                  (selectedCategory && selectedCategory !== slice.category);

                return (
                  <path
                    key={slice.category}
                    d={slice.path}
                    fill={slice.color}
                    opacity={isMuted ? 0.35 : 1}
                    transform={
                      isFocused
                        ? `scale(1.05) translate(${-(center * 0.05)}, ${-(center * 0.05)})`
                        : undefined
                    }
                    className="transition-all duration-200 cursor-pointer hover:filter"
                    onMouseEnter={() => setHoveredCategory(slice.category)}
                    onMouseLeave={() => setHoveredCategory(null)}
                    onClick={() => {
                      if (onSelectCategory) {
                        onSelectCategory(
                          selectedCategory === slice.category ? null : slice.category
                        );
                      }
                    }}
                  />
                );
              })}
            </svg>

            {/* Center Summary Label inside donut */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center px-2">
              {activeSliceInfo ? (
                <>
                  <span className="text-[10px] text-slate-400 truncate max-w-[76px]">
                    {activeSliceInfo.label.split('&')[0]}
                  </span>
                  <span className="text-base font-bold text-white tracking-tight leading-tight">
                    {activeSliceInfo.percentage}%
                  </span>
                  <span className="text-[10px] text-indigo-300 font-semibold truncate max-w-[78px]">
                    {formatThaiCurrency(activeSliceInfo.amount)}
                  </span>
                </>
              ) : (
                <>
                  <span className="text-[10px] text-slate-400">ยอดรวม</span>
                  <span className="text-sm font-bold text-white tracking-tight leading-tight">
                    {formatThaiCurrency(totalSpent)}
                  </span>
                  <span className="text-[9px] text-slate-500">
                    {slices.length} หมวดหมู่
                  </span>
                </>
              )}
            </div>
          </div>

          {/* Bottom Section: Category Text & Numbers laid out UNDERNEATH the pie chart */}
          <div className="w-full space-y-1.5 pt-1">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 w-full">
              {displayedSlices.map((slice) => {
                const isSelected = selectedCategory === slice.category;
                const isHovered = hoveredCategory === slice.category;

                return (
                  <div
                    key={slice.category}
                    onMouseEnter={() => setHoveredCategory(slice.category)}
                    onMouseLeave={() => setHoveredCategory(null)}
                    onClick={() => {
                      if (onSelectCategory) {
                        onSelectCategory(isSelected ? null : slice.category);
                      }
                    }}
                    className={`flex items-center justify-between p-1.5 px-2 rounded-xl text-xs transition cursor-pointer border ${
                      isSelected || isHovered
                        ? 'bg-slate-800 border-indigo-500/40 text-white shadow-sm'
                        : 'bg-slate-800/40 border-slate-800 hover:border-slate-700 hover:bg-slate-800/70 text-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span
                        className="w-2 h-2 rounded-full shrink-0 shadow-sm"
                        style={{ backgroundColor: slice.color }}
                      />
                      <span className="truncate text-[11px] font-medium" title={slice.label}>
                        {slice.label.split('&')[0]}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0 ml-1">
                      <span className="text-[10px] font-semibold text-slate-400">
                        {slice.percentage}%
                      </span>
                      <span className="font-semibold text-white text-[11px]">
                        {formatThaiCurrency(slice.amount)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {slices.length > 6 && (
              <button
                type="button"
                onClick={() => setShowAllCategories(!showAllCategories)}
                className="w-full text-center text-[10px] text-indigo-400 hover:text-indigo-300 pt-1 flex items-center justify-center gap-1 cursor-pointer"
              >
                <span>
                  {showAllCategories
                    ? 'ย่อหมวดหมู่'
                    : `ดูเพิ่มเติมอีก ${slices.length - 6} หมวดหมู่`}
                </span>
                {showAllCategories ? (
                  <ChevronUp className="w-3 h-3" />
                ) : (
                  <ChevronDown className="w-3 h-3" />
                )}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
