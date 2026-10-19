import React, { useState, useMemo, useRef } from 'react';
import { Transaction, CreditCard, TransactionCategory } from '../types';
import {
  formatThaiCurrency,
  formatThaiMonth,
  formatThaiDate,
  CATEGORY_INFO,
  getTransactionBillingCycleMonth,
} from '../utils/cardUtils';
import {
  CSV_COLUMNS,
  CsvExportFilterOptions,
  generateCsvContent,
  downloadCsvFile,
  filterTransactionsForExport,
} from '../utils/csvExport';
import { downloadElementAsPdf, printElement } from '../utils/pdfExport';
import {
  X,
  Download,
  Copy,
  Check,
  FileSpreadsheet,
  FileText,
  Calendar,
  Filter,
  Columns,
  Layers,
  AlertCircle,
  Table,
  Printer,
  Sparkles,
  CreditCard as CardIcon,
  Clock,
  CheckCircle2,
  Loader2,
} from 'lucide-react';

interface ExportCsvModalProps {
  isOpen: boolean;
  onClose: () => void;
  transactions: Transaction[];
  cards: CreditCard[];
  availableMonths: string[];
  currentSelectedMonth?: string;
  brandName?: string;
  brandLogo?: string | null;
  brandTagline?: string;
}

export const ExportCsvModal: React.FC<ExportCsvModalProps> = ({
  isOpen,
  onClose,
  transactions,
  cards,
  availableMonths,
  currentSelectedMonth,
  brandName = 'CardPulse',
  brandLogo = null,
  brandTagline = 'ระบบติดตามและจัดการค่าบัตรเครดิต',
}) => {
  // Export format: 'pdf' or 'csv'
  const [exportFormat, setExportFormat] = useState<'pdf' | 'csv'>('pdf');

  // 1. Date selection
  const [dateMode, setDateMode] = useState<'all' | 'cycle' | 'custom'>(
    currentSelectedMonth ? 'cycle' : 'all'
  );
  const [selectedCycleMonth, setSelectedCycleMonth] = useState<string>(
    currentSelectedMonth || (availableMonths[0] ?? new Date().toISOString().slice(0, 7))
  );
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  // 2. Filters
  const [selectedCardId, setSelectedCardId] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<'all' | 'pending' | 'paid' | 'installment'>('all');
  const [selectedCategory, setSelectedCategory] = useState<'all' | TransactionCategory>('all');

  // 3. Column selection for CSV
  const [selectedColumns, setSelectedColumns] = useState<string[]>(() =>
    CSV_COLUMNS.filter((c) => c.defaultSelected).map((c) => c.id)
  );

  // 4. Options
  const [includeSummaryRow, setIncludeSummaryRow] = useState<boolean>(true);
  const [copied, setCopied] = useState<boolean>(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState<boolean>(false);

  // Ref to the printable PDF template
  const pdfTemplateRef = useRef<HTMLDivElement>(null);

  // Column toggle helpers
  const handleToggleColumn = (colId: string) => {
    if (selectedColumns.includes(colId)) {
      if (selectedColumns.length > 1) {
        setSelectedColumns(selectedColumns.filter((id) => id !== colId));
      }
    } else {
      setSelectedColumns([...selectedColumns, colId]);
    }
  };

  const handleSelectAllColumns = () => {
    setSelectedColumns(CSV_COLUMNS.map((c) => c.id));
  };

  const handleSelectDefaultColumns = () => {
    setSelectedColumns(CSV_COLUMNS.filter((c) => c.defaultSelected).map((c) => c.id));
  };

  // Compile export options
  const filterOptions: CsvExportFilterOptions = useMemo(
    () => ({
      dateMode,
      selectedCycleMonth,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      cardId: selectedCardId,
      status: selectedStatus,
      category: selectedCategory,
      selectedColumns,
      includeSummaryRow,
    }),
    [
      dateMode,
      selectedCycleMonth,
      startDate,
      endDate,
      selectedCardId,
      selectedStatus,
      selectedCategory,
      selectedColumns,
      includeSummaryRow,
    ]
  );

  // Filtered transactions for both PDF and CSV
  const filteredTxs = useMemo(() => {
    if (!isOpen) return [];
    const list = filterTransactionsForExport(transactions, cards, filterOptions);
    return list.sort((a, b) => b.date.localeCompare(a.date));
  }, [isOpen, transactions, cards, filterOptions]);

  // Statistics for the filtered set
  const stats = useMemo(() => {
    let total = 0;
    let paid = 0;
    let pending = 0;
    let installmentTotal = 0;

    filteredTxs.forEach((t) => {
      total += t.amount;
      if (t.isPaid) paid += t.amount;
      else pending += t.amount;
      if (t.isInstallment) installmentTotal += t.amount;
    });

    return { total, paid, pending, installmentTotal, count: filteredTxs.length };
  }, [filteredTxs]);

  // CSV content generation
  const { csvString } = useMemo(() => {
    if (!isOpen || exportFormat !== 'csv') return { csvString: '' };
    return generateCsvContent(transactions, cards, filterOptions);
  }, [isOpen, exportFormat, transactions, cards, filterOptions]);

  // Suggested file names
  const baseFileTitle = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    if (dateMode === 'cycle' && selectedCycleMonth) {
      return `${brandName.replace(/\s+/g, '_')}_Statement_${selectedCycleMonth}`;
    }
    if (dateMode === 'custom' && startDate && endDate) {
      return `${brandName.replace(/\s+/g, '_')}_Statement_${startDate}_to_${endDate}`;
    }
    return `${brandName.replace(/\s+/g, '_')}_Statement_All_${today}`;
  }, [dateMode, selectedCycleMonth, startDate, endDate, brandName]);

  const handleDownloadCsv = () => {
    downloadCsvFile(csvString, `${baseFileTitle}.csv`);
    onClose();
  };

  const handleCopyCsv = async () => {
    try {
      await navigator.clipboard.writeText(csvString);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (e) {
      console.error('Failed to copy CSV:', e);
    }
  };

  const handleDownloadPdf = async () => {
    if (!pdfTemplateRef.current) return;
    try {
      setIsGeneratingPdf(true);
      await downloadElementAsPdf(pdfTemplateRef.current, `${baseFileTitle}.pdf`);
      onClose();
    } catch (e) {
      console.error('PDF export failed:', e);
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handlePrintPdf = () => {
    if (!pdfTemplateRef.current) return;
    printElement(pdfTemplateRef.current, `${brandName} - รายงานสรุปรายการใช้จ่ายบัตรเครดิต`);
  };

  if (!isOpen) return null;

  // Selected period label for display
  const periodLabel =
    dateMode === 'cycle'
      ? `รอบบิลเดือน ${formatThaiMonth(selectedCycleMonth)}`
      : dateMode === 'custom' && startDate && endDate
      ? `ระหว่าง ${formatThaiDate(startDate)} ถึง ${formatThaiDate(endDate)}`
      : 'ข้อมูลทุกช่วงเวลา (All Time)';

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 overflow-y-auto bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200"
    >
      <div className="relative w-full max-w-4xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl shadow-indigo-950/40 overflow-hidden flex flex-col max-h-[94vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-800/80 bg-slate-900/95 sticky top-0 z-20 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 shadow-inner">
              {exportFormat === 'pdf' ? (
                <FileText className="w-6 h-6 text-indigo-400" />
              ) : (
                <FileSpreadsheet className="w-6 h-6 text-indigo-400" />
              )}
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white tracking-tight flex items-center gap-2">
                <span>ส่งออกข้อมูล (Export Data)</span>
                <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full bg-indigo-500/15 text-indigo-300 border border-indigo-500/30">
                  {exportFormat === 'pdf' ? 'PDF Statement Report' : 'CSV for Excel'}
                </span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                เลือกรูปแบบเอกสาร กำหนดช่วงเวลา และข้อมูลที่ต้องการส่งออก
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
            title="ปิดหน้าต่าง"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Format Switcher Tabs */}
        <div className="bg-slate-950/90 border-b border-slate-800 px-4 sm:px-6 py-2.5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={() => setExportFormat('pdf')}
              className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition border cursor-pointer ${
                exportFormat === 'pdf'
                  ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white border-indigo-500 shadow-md shadow-indigo-600/30'
                  : 'bg-slate-900/80 text-slate-400 hover:text-white border-slate-800 hover:bg-slate-800'
              }`}
            >
              <FileText className="w-4 h-4 text-indigo-300" />
              <span>1. เอกสารสรุป PDF (สวยงาม ดูง่าย)</span>
            </button>

            <button
              type="button"
              onClick={() => setExportFormat('csv')}
              className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition border cursor-pointer ${
                exportFormat === 'csv'
                  ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white border-emerald-500 shadow-md shadow-emerald-600/30'
                  : 'bg-slate-900/80 text-slate-400 hover:text-white border-slate-800 hover:bg-slate-800'
              }`}
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-300" />
              <span>2. ไฟล์ CSV (Excel / ชีต)</span>
            </button>
          </div>

          <span className="hidden md:inline-block text-[11px] text-slate-400">
            {exportFormat === 'pdf'
              ? 'เทมเพลตรายงานพร้อมพิมพ์ / บันทึกเป็น PDF'
              : 'ไฟล์ข้อมูลดิบพร้อมเปิดใน Microsoft Excel ภาษาไทยไม่เพี้ยน'}
          </span>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-4 sm:p-6 space-y-6 overflow-y-auto custom-scrollbar flex-1">
          {/* SECTION 1: เลือกช่วงเวลา (Date & Billing Cycle Selection) */}
          <div className="p-4 rounded-2xl bg-slate-800/40 border border-slate-700/60 space-y-3.5">
            <div className="flex items-center gap-2 text-white font-semibold text-xs sm:text-sm">
              <Calendar className="w-4 h-4 text-indigo-400" />
              <span>กำหนดช่วงเวลาของข้อมูล (Date Period)</span>
            </div>

            {/* Mode selection pills */}
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setDateMode('all')}
                className={`py-2 px-3 rounded-xl text-xs font-semibold transition border cursor-pointer ${
                  dateMode === 'all'
                    ? 'bg-indigo-600 text-white border-indigo-500 shadow-md shadow-indigo-600/30'
                    : 'bg-slate-900/60 text-slate-300 border-slate-700 hover:bg-slate-800'
                }`}
              >
                ทุกช่วงเวลา (ทั้งหมด)
              </button>
              <button
                type="button"
                onClick={() => setDateMode('cycle')}
                className={`py-2 px-3 rounded-xl text-xs font-semibold transition border cursor-pointer ${
                  dateMode === 'cycle'
                    ? 'bg-indigo-600 text-white border-indigo-500 shadow-md shadow-indigo-600/30'
                    : 'bg-slate-900/60 text-slate-300 border-slate-700 hover:bg-slate-800'
                }`}
              >
                ตามรอบบิล / เดือน
              </button>
              <button
                type="button"
                onClick={() => setDateMode('custom')}
                className={`py-2 px-3 rounded-xl text-xs font-semibold transition border cursor-pointer ${
                  dateMode === 'custom'
                    ? 'bg-indigo-600 text-white border-indigo-500 shadow-md shadow-indigo-600/30'
                    : 'bg-slate-900/60 text-slate-300 border-slate-700 hover:bg-slate-800'
                }`}
              >
                กำหนดช่วงวันที่เอง
              </button>
            </div>

            {/* Contextual controls based on dateMode */}
            {dateMode === 'cycle' && (
              <div className="pt-2 flex flex-col sm:flex-row sm:items-center gap-2">
                <label className="text-xs text-slate-300 font-medium whitespace-nowrap">
                  เลือกรอบบิล:
                </label>
                <select
                  value={selectedCycleMonth}
                  onChange={(e) => setSelectedCycleMonth(e.target.value)}
                  className="w-full sm:w-auto flex-1 px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs sm:text-sm text-white focus:outline-none focus:border-indigo-500"
                >
                  {availableMonths.map((m) => (
                    <option key={m} value={m}>
                      รอบบิล {formatThaiMonth(m)} ({m})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {dateMode === 'custom' && (
              <div className="pt-2 grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">ตั้งแต่วันที่</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">ถึงวันที่</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>
            )}
          </div>

          {/* SECTION 2: ตัวกรองบัตร สถานะ และหมวดหมู่ */}
          <div className="p-4 rounded-2xl bg-slate-800/40 border border-slate-700/60 space-y-3.5">
            <div className="flex items-center gap-2 text-white font-semibold text-xs sm:text-sm">
              <Filter className="w-4 h-4 text-indigo-400" />
              <span>ตัวกรองรายการ (Filters)</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* บัตรเครดิต */}
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">บัตรเครดิต</label>
                <select
                  value={selectedCardId}
                  onChange={(e) => setSelectedCardId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500 truncate"
                >
                  <option value="all">💳 ทุกบัตรเครดิต ({cards.length} ใบ)</option>
                  {cards.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.bank} •••• {c.last4})
                    </option>
                  ))}
                </select>
              </div>

              {/* สถานะ */}
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">สถานะชำระ</label>
                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value as any)}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                >
                  <option value="all">ทุกสถานะ</option>
                  <option value="pending">⏳ เฉพาะรอชำระ</option>
                  <option value="paid">✓ เฉพาะชำระแล้ว</option>
                  <option value="installment">🔄 เฉพาะรายการผ่อนชำระ</option>
                </select>
              </div>

              {/* หมวดหมู่ */}
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">หมวดหมู่</label>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value as any)}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                >
                  <option value="all">ทุกหมวดหมู่</option>
                  {Object.entries(CATEGORY_INFO).map(([key, info]) => (
                    <option key={key} value={key}>
                      {info.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* IF FORMAT === 'CSV' -> Show Column Selection */}
          {exportFormat === 'csv' && (
            <div className="p-4 rounded-2xl bg-slate-800/40 border border-slate-700/60 space-y-3.5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-white font-semibold text-xs sm:text-sm">
                  <Columns className="w-4 h-4 text-indigo-400" />
                  <span>เลือกคอลัมน์ข้อมูลที่ต้องการ (CSV Columns)</span>
                  <span className="text-[11px] text-indigo-300 font-normal">
                    ({selectedColumns.length}/{CSV_COLUMNS.length} คอลัมน์)
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleSelectAllColumns}
                    className="text-[11px] font-medium text-indigo-400 hover:text-indigo-300 underline cursor-pointer"
                  >
                    เลือกทั้งหมด
                  </button>
                  <span className="text-slate-600">•</span>
                  <button
                    type="button"
                    onClick={handleSelectDefaultColumns}
                    className="text-[11px] font-medium text-slate-400 hover:text-slate-300 underline cursor-pointer"
                  >
                    ค่าเริ่มต้น
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 pt-1">
                {CSV_COLUMNS.map((col) => {
                  const isChecked = selectedColumns.includes(col.id);
                  return (
                    <label
                      key={col.id}
                      className={`flex items-start gap-2 p-2 rounded-xl border transition cursor-pointer select-none ${
                        isChecked
                          ? 'bg-indigo-950/40 border-indigo-500/50 text-white'
                          : 'bg-slate-900/60 border-slate-700/60 text-slate-400 hover:border-slate-600'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => handleToggleColumn(col.id)}
                        className="mt-0.5 rounded border-slate-700 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                      />
                      <div className="min-w-0">
                        <span className="text-xs font-medium block truncate leading-tight">
                          {col.label}
                        </span>
                        <span className="text-[10px] text-slate-500 block truncate">
                          {col.description}
                        </span>
                      </div>
                    </label>
                  );
                })}
              </div>

              {/* Include summary row toggle */}
              <div className="pt-2 border-t border-slate-700/50 flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-300 select-none">
                  <input
                    type="checkbox"
                    checked={includeSummaryRow}
                    onChange={(e) => setIncludeSummaryRow(e.target.checked)}
                    className="rounded border-slate-700 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                  />
                  <span>เพิ่มแถวสรุปยอดรวมท้ายตาราง (Summary Total Row)</span>
                </label>
                <span className="text-[11px] text-slate-500">
                  ฝัง UTF-8 BOM รองรับภาษาไทยใน Microsoft Excel
                </span>
              </div>
            </div>
          )}

          {/* IF FORMAT === 'PDF' -> RENDER STUNNING LIVE PDF TEMPLATE PREVIEW */}
          {exportFormat === 'pdf' ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-slate-300 px-1">
                <div className="flex items-center gap-1.5 font-semibold text-white">
                  <Sparkles className="w-4 h-4 text-indigo-400" />
                  <span>ตัวอย่างเทมเพลตรายงาน PDF (PDF Document Preview)</span>
                </div>
                <span className="text-[11px] text-indigo-300">
                  ขนาดเอกสารมาตรฐาน A4 • ตกแต่งสวยงามพร้อมใช้งาน
                </span>
              </div>

              {/* PDF Container (White Paper Style) */}
              <div className="p-2 sm:p-4 rounded-2xl bg-slate-950 border border-slate-800 overflow-x-auto">
                <div
                  ref={pdfTemplateRef}
                  className="w-full min-w-[700px] max-w-[850px] mx-auto bg-white text-slate-800 p-8 sm:p-10 rounded-xl shadow-2xl space-y-6 font-sans text-left"
                  style={{ fontFamily: "'Prompt', -apple-system, sans-serif" }}
                >
                  {/* PDF Document Header */}
                  <div className="flex items-start justify-between border-b-2 border-indigo-600 pb-5">
                    {/* Brand Info */}
                    <div className="flex items-center gap-3.5">
                      <div className="w-13 h-13 rounded-2xl bg-gradient-to-tr from-indigo-600 to-violet-600 p-0.5 shadow-md flex items-center justify-center shrink-0 overflow-hidden">
                        <div className="w-full h-full bg-slate-900 rounded-[14px] flex items-center justify-center overflow-hidden">
                          {brandLogo ? (
                            <img
                              src={brandLogo}
                              alt={brandName}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <CardIcon className="w-6 h-6 text-white" />
                          )}
                        </div>
                      </div>
                      <div>
                        <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight leading-none">
                          {brandName}
                        </h1>
                        <p className="text-xs font-medium text-slate-500 mt-1">
                          {brandTagline}
                        </p>
                      </div>
                    </div>

                    {/* Report Title & Metadata */}
                    <div className="text-right">
                      <div className="inline-block px-3 py-1 bg-indigo-50 border border-indigo-200 text-indigo-800 text-xs font-bold rounded-lg uppercase tracking-wider">
                        รายงานสรุปค่าบัตรเครดิต
                      </div>
                      <p className="text-xs text-slate-500 font-medium mt-1.5">
                        วันที่ออกรายงาน: {formatThaiDate(new Date().toISOString().split('T')[0])}
                      </p>
                      <p className="text-[11px] font-semibold text-indigo-600 mt-0.5">
                        ช่วงเวลา: {periodLabel}
                      </p>
                    </div>
                  </div>

                  {/* Summary Metric Cards */}
                  <div className="grid grid-cols-4 gap-3">
                    <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-left">
                      <span className="text-[11px] font-semibold text-slate-500 block">
                        ยอดรวมทั้งสิ้น
                      </span>
                      <span className="text-lg font-black text-slate-900 mt-0.5 block truncate">
                        {formatThaiCurrency(stats.total)}
                      </span>
                      <span className="text-[10px] text-slate-400 mt-0.5 block">
                        ทั้งหมด {stats.count} รายการ
                      </span>
                    </div>

                    <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-left">
                      <span className="text-[11px] font-semibold text-emerald-700 block">
                        ยอดที่ชำระแล้ว
                      </span>
                      <span className="text-lg font-black text-emerald-800 mt-0.5 block truncate">
                        {formatThaiCurrency(stats.paid)}
                      </span>
                      <span className="text-[10px] text-emerald-600 mt-0.5 block">
                        ชำระเรียบร้อย
                      </span>
                    </div>

                    <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-left">
                      <span className="text-[11px] font-semibold text-amber-700 block">
                        ยอดที่รอชำระ
                      </span>
                      <span className="text-lg font-black text-amber-800 mt-0.5 block truncate">
                        {formatThaiCurrency(stats.pending)}
                      </span>
                      <span className="text-[10px] text-amber-600 mt-0.5 block">
                        รอบบิลปัจจุบัน
                      </span>
                    </div>

                    <div className="p-3.5 rounded-xl bg-purple-50 border border-purple-200 text-left">
                      <span className="text-[11px] font-semibold text-purple-700 block">
                        ยอดรายการผ่อน
                      </span>
                      <span className="text-lg font-black text-purple-800 mt-0.5 block truncate">
                        {formatThaiCurrency(stats.installmentTotal)}
                      </span>
                      <span className="text-[10px] text-purple-600 mt-0.5 block">
                        รวมทุกงวดในรอบนี้
                      </span>
                    </div>
                  </div>

                  {/* Filter Note */}
                  <div className="px-3.5 py-2 rounded-lg bg-slate-100 border border-slate-200 text-[11px] text-slate-600 flex items-center justify-between">
                    <div>
                      <strong className="text-slate-800">เงื่อนไขรายงาน:</strong>{' '}
                      {selectedCardId === 'all'
                        ? 'ทุกบัตรเครดิต'
                        : `บัตร: ${cards.find((c) => c.id === selectedCardId)?.name || selectedCardId}`}{' '}
                      • สถานะ:{' '}
                      {selectedStatus === 'all'
                        ? 'ทุกสถานะ'
                        : selectedStatus === 'pending'
                        ? 'รอชำระ'
                        : selectedStatus === 'paid'
                        ? 'ชำระแล้ว'
                        : 'รายการผ่อน'}{' '}
                      • หมวดหมู่:{' '}
                      {selectedCategory === 'all'
                        ? 'ทุกหมวด'
                        : CATEGORY_INFO[selectedCategory]?.label || selectedCategory}
                    </div>
                    <span className="text-slate-500 font-medium shrink-0">
                      รวม {stats.count} แถว
                    </span>
                  </div>

                  {/* Main Transactions Table */}
                  <div className="border border-slate-300 rounded-lg overflow-hidden">
                    <table className="w-full text-xs text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-900 text-white font-semibold border-b border-slate-900">
                          <th className="py-2.5 px-3 w-10 text-center">#</th>
                          <th className="py-2.5 px-3 w-24">วันที่</th>
                          <th className="py-2.5 px-3">รายการใช้จ่าย</th>
                          <th className="py-2.5 px-3 w-32">บัตรเครดิต</th>
                          <th className="py-2.5 px-3 w-28">หมวดหมู่</th>
                          <th className="py-2.5 px-3 w-20 text-center">สถานะ</th>
                          <th className="py-2.5 px-3 w-28 text-right">จำนวนเงิน</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {filteredTxs.length === 0 ? (
                          <tr>
                            <td colSpan={7} className="py-8 text-center text-slate-400">
                              ไม่มีข้อมูลรายการใช้จ่ายที่ตรงกับเงื่อนไขที่เลือก
                            </td>
                          </tr>
                        ) : (
                          filteredTxs.map((tx, idx) => {
                            const card = cards.find((c) => c.id === tx.cardId);
                            const cat = CATEGORY_INFO[tx.category];
                            return (
                              <tr
                                key={tx.id}
                                className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/70'}
                              >
                                <td className="py-2 px-3 text-center text-slate-400 font-mono text-[11px]">
                                  {idx + 1}
                                </td>
                                <td className="py-2 px-3 text-slate-600 font-mono text-[11px]">
                                  {tx.date}
                                </td>
                                <td className="py-2 px-3">
                                  <div className="font-semibold text-slate-900">{tx.title}</div>
                                  {tx.isInstallment && tx.totalInstallments && (
                                    <span className="text-[10px] text-purple-700 bg-purple-100 px-1.5 py-0.2 rounded font-medium inline-block mt-0.5">
                                      ผ่อนงวดที่ {tx.currentInstallment || 1}/{tx.totalInstallments}
                                    </span>
                                  )}
                                  {tx.note && (
                                    <span className="text-[10px] text-slate-400 block truncate max-w-[200px]">
                                      {tx.note}
                                    </span>
                                  )}
                                </td>
                                <td className="py-2 px-3 text-slate-700">
                                  <div className="font-medium text-slate-900 truncate max-w-[130px]">
                                    {card ? card.name : '-'}
                                  </div>
                                  <div className="text-[10px] text-slate-400">
                                    {card ? `${card.bank} •••• ${card.last4}` : ''}
                                  </div>
                                </td>
                                <td className="py-2 px-3 text-slate-600">
                                  <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 font-medium text-[10px] border border-slate-200">
                                    {cat ? cat.label : tx.category}
                                  </span>
                                </td>
                                <td className="py-2 px-3 text-center">
                                  {tx.isPaid ? (
                                    <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                                      ชำระแล้ว
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-bold">
                                      รอชำระ
                                    </span>
                                  )}
                                </td>
                                <td className="py-2 px-3 text-right font-bold text-slate-900 font-mono text-xs">
                                  {formatThaiCurrency(tx.amount)}
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                      {filteredTxs.length > 0 && (
                        <tfoot>
                          <tr className="bg-slate-100 border-t-2 border-slate-300 font-bold text-slate-900 text-xs">
                            <td colSpan={4} className="py-3 px-3 text-left">
                              สรุปยอดรวมทั้งสิ้น ({filteredTxs.length} รายการ)
                            </td>
                            <td colSpan={2} className="py-3 px-3 text-right text-slate-600 text-[11px]">
                              รอชำระ: {formatThaiCurrency(stats.pending)}
                            </td>
                            <td className="py-3 px-3 text-right text-indigo-700 font-extrabold text-sm font-mono">
                              {formatThaiCurrency(stats.total)}
                            </td>
                          </tr>
                        </tfoot>
                      )}
                    </table>
                  </div>

                  {/* Document Footer */}
                  <div className="pt-4 border-t border-slate-200 flex items-center justify-between text-[11px] text-slate-400">
                    <p>
                      เอกสารสรุปรายการใช้จ่ายบัตรเครดิตส่วนบุคคล • จัดทำโดย {brandName}
                    </p>
                    <p>
                      พิมพ์เมื่อ {new Date().toLocaleString('th-TH')}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* CSV Preview Section */
            <div className="p-4 rounded-2xl bg-gradient-to-br from-indigo-950/30 via-slate-900 to-slate-900 border border-indigo-500/30 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-white font-semibold text-xs sm:text-sm">
                  <Table className="w-4 h-4 text-emerald-400" />
                  <span>พรีวิวข้อมูล CSV สำหรับ Excel / Google Sheets</span>
                </div>
                <span className="text-[11px] font-mono text-slate-400 truncate max-w-[220px]">
                  {baseFileTitle}.csv
                </span>
              </div>

              {/* Metrics cards */}
              <div className="grid grid-cols-3 gap-2.5">
                <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/60 text-center">
                  <span className="text-[11px] text-slate-400 block">จำนวนรายการ</span>
                  <span className="text-base sm:text-lg font-bold text-white mt-0.5 block">
                    {stats.count} รายการ
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/60 text-center">
                  <span className="text-[11px] text-slate-400 block">ยอดเงินรวม</span>
                  <span className="text-base sm:text-lg font-bold text-emerald-400 mt-0.5 block truncate">
                    {formatThaiCurrency(stats.total)}
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/60 text-center">
                  <span className="text-[11px] text-slate-400 block">คอลัมน์ข้อมูล</span>
                  <span className="text-base sm:text-lg font-bold text-indigo-300 mt-0.5 block">
                    {selectedColumns.length} คอลัมน์
                  </span>
                </div>
              </div>

              {stats.count === 0 ? (
                <div className="p-4 text-center text-slate-400 text-xs flex items-center justify-center gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-400" />
                  <span>ไม่มีรายการใช้จ่ายที่ตรงกับเงื่อนไขที่เลือก กรุณาปรับเปลี่ยนตัวกรอง</span>
                </div>
              ) : (
                <div className="space-y-1.5 pt-1">
                  <span className="text-[11px] text-slate-400 block">
                    ตัวอย่าง 3 รายการแรกที่จะส่งออกลงไฟล์ CSV:
                  </span>
                  <div className="space-y-1">
                    {filteredTxs.slice(0, 3).map((tx) => (
                      <div
                        key={tx.id}
                        className="flex items-center justify-between text-xs px-2.5 py-1.5 rounded-lg bg-slate-800/40 border border-slate-700/40 text-slate-300"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-[11px] text-slate-500 font-mono shrink-0">
                            {tx.date}
                          </span>
                          <span className="font-medium text-white truncate max-w-[140px] sm:max-w-[200px]">
                            {tx.title}
                          </span>
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-700/60 text-slate-300 shrink-0">
                            {CATEGORY_INFO[tx.category]?.label || tx.category}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="font-semibold text-slate-200">
                            {formatThaiCurrency(tx.amount)}
                          </span>
                          <span
                            className={`text-[10px] px-1.5 py-0.2 rounded font-medium ${
                              tx.isPaid
                                ? 'bg-emerald-500/20 text-emerald-300'
                                : 'bg-amber-500/20 text-amber-300'
                            }`}
                          >
                            {tx.isPaid ? 'ชำระแล้ว' : 'รอชำระ'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Actions Footer */}
        <div className="p-4 sm:p-5 border-t border-slate-800 bg-slate-900/95 flex flex-col sm:flex-row items-center justify-between gap-3 sticky bottom-0 z-20 backdrop-blur-md">
          <div className="text-xs text-slate-400 flex items-center gap-1.5 self-start sm:self-auto">
            <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
            <span>พร้อมส่งออก {stats.count} รายการ ({formatThaiCurrency(stats.total)})</span>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 transition cursor-pointer"
            >
              ยกเลิก
            </button>

            {exportFormat === 'pdf' ? (
              <>
                <button
                  type="button"
                  onClick={handlePrintPdf}
                  disabled={stats.count === 0}
                  className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-200 bg-slate-800 hover:bg-slate-700 border border-slate-600 transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-40"
                  title="เปิดหน้าต่างสั่งพิมพ์ของเบราว์เซอร์หรือบันทึกเป็น PDF"
                >
                  <Printer className="w-4 h-4 text-indigo-300" />
                  <span>พิมพ์ / บันทึก</span>
                </button>

                <button
                  type="button"
                  onClick={handleDownloadPdf}
                  disabled={stats.count === 0 || isGeneratingPdf}
                  className="flex-1 sm:flex-none px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold text-white bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 shadow-lg shadow-indigo-600/30 transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-40"
                >
                  {isGeneratingPdf ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>กำลังสร้าง PDF...</span>
                    </>
                  ) : (
                    <>
                      <Download className="w-4 h-4" />
                      <span>ดาวน์โหลด PDF (.pdf)</span>
                    </>
                  )}
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={handleCopyCsv}
                  disabled={stats.count === 0}
                  className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl text-xs font-semibold text-indigo-300 bg-indigo-950/60 hover:bg-indigo-900/80 border border-indigo-500/40 transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-40"
                  title="คัดลอกข้อมูล CSV ทั้งหมดลงคลิปบอร์ด"
                >
                  {copied ? (
                    <>
                      <Check className="w-4 h-4 text-emerald-400" />
                      <span className="text-emerald-300">คัดลอกแล้ว!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      <span>คัดลอก CSV</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={handleDownloadCsv}
                  disabled={stats.count === 0}
                  className="flex-1 sm:flex-none px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 shadow-lg shadow-emerald-600/30 transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-40"
                >
                  <Download className="w-4 h-4" />
                  <span>ดาวน์โหลดไฟล์ CSV</span>
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
