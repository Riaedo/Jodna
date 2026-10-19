import { Transaction, CreditCard, TransactionCategory } from '../types';
import { CATEGORY_INFO, getTransactionBillingCycleMonth } from './cardUtils';

export interface CsvExportColumnOption {
  id: string;
  label: string;
  description: string;
  defaultSelected: boolean;
}

export const CSV_COLUMNS: CsvExportColumnOption[] = [
  { id: 'date', label: 'วันที่ทำรายการ', description: 'YYYY-MM-DD', defaultSelected: true },
  { id: 'title', label: 'ชื่อรายการ', description: 'รายละเอียดการใช้จ่าย', defaultSelected: true },
  { id: 'amount', label: 'จำนวนเงิน (บาท)', description: 'ตัวเลขยอดใช้จ่าย', defaultSelected: true },
  { id: 'cardName', label: 'บัตรเครดิต', description: 'ชื่อบัตรที่ใช้รูด', defaultSelected: true },
  { id: 'bank', label: 'ธนาคาร', description: 'ธนาคารผู้ออกบัตร', defaultSelected: true },
  { id: 'last4', label: 'เลขท้าย 4 ตัว', description: '•••• 1234', defaultSelected: true },
  { id: 'category', label: 'หมวดหมู่', description: 'อาหาร, ช้อปปิ้ง ฯลฯ', defaultSelected: true },
  { id: 'billingCycle', label: 'รอบบิล', description: 'รอบเดือนที่เรียกเก็บ (YYYY-MM)', defaultSelected: true },
  { id: 'status', label: 'สถานะชำระ', description: 'รอชำระ / ชำระแล้ว', defaultSelected: true },
  { id: 'paidDate', label: 'วันที่ชำระเงิน', description: 'วันที่กดชำระแล้ว', defaultSelected: false },
  { id: 'type', label: 'ประเภทรายการ', description: 'รายการปกติ / ผ่อนชำระ', defaultSelected: true },
  { id: 'installmentInfo', label: 'งวดผ่อนชำระ', description: 'เช่น งวดที่ 2/10', defaultSelected: true },
  { id: 'installmentMonthly', label: 'ยอดผ่อนต่อเดือน', description: 'ยอดจ่ายต่องวด', defaultSelected: false },
  { id: 'note', label: 'หมายเหตุ', description: 'บันทึกเพิ่มเติม', defaultSelected: true },
];

export interface CsvExportFilterOptions {
  dateMode: 'all' | 'cycle' | 'custom';
  selectedCycleMonth?: string; // YYYY-MM
  startDate?: string; // YYYY-MM-DD
  endDate?: string; // YYYY-MM-DD
  cardId?: string; // 'all' or cardId
  status?: 'all' | 'pending' | 'paid' | 'installment';
  category?: 'all' | TransactionCategory;
  selectedColumns: string[]; // list of column ids
  includeSummaryRow?: boolean;
}

/**
 * Filter transactions based on user export criteria
 */
export const filterTransactionsForExport = (
  transactions: Transaction[],
  cards: CreditCard[],
  options: CsvExportFilterOptions
): Transaction[] => {
  const cardMap = new Map<string, CreditCard>(cards.map((c) => [c.id, c]));

  return transactions.filter((tx) => {
    // 1. Date Mode Filter
    if (options.dateMode === 'cycle' && options.selectedCycleMonth) {
      const cycle = getTransactionBillingCycleMonth(tx, cards);
      if (cycle !== options.selectedCycleMonth) return false;
    } else if (options.dateMode === 'custom') {
      if (options.startDate && tx.date < options.startDate) return false;
      if (options.endDate && tx.date > options.endDate) return false;
    }

    // 2. Card Filter
    if (options.cardId && options.cardId !== 'all') {
      if (tx.cardId !== options.cardId) return false;
    }

    // 3. Status Filter
    if (options.status && options.status !== 'all') {
      if (options.status === 'pending' && tx.isPaid) return false;
      if (options.status === 'paid' && !tx.isPaid) return false;
      if (options.status === 'installment' && !tx.isInstallment) return false;
    }

    // 4. Category Filter
    if (options.category && options.category !== 'all') {
      if (tx.category !== options.category) return false;
    }

    return true;
  });
};

/**
 * Escape a single cell for standard CSV (RFC 4180)
 */
const escapeCsvCell = (value: unknown): string => {
  if (value === null || value === undefined) return '""';
  const str = String(value);
  // If string contains quotes, comma, or newlines, wrap in quotes and escape internal quotes
  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return `"${str}"`;
};

/**
 * Generate CSV string from transactions and options
 */
export const generateCsvContent = (
  transactions: Transaction[],
  cards: CreditCard[],
  options: CsvExportFilterOptions
): { csvString: string; rowCount: number; totalAmount: number } => {
  const cardMap = new Map<string, CreditCard>(cards.map((c) => [c.id, c]));
  const filtered = filterTransactionsForExport(transactions, cards, options);

  // Sort descending by date
  filtered.sort((a, b) => b.date.localeCompare(a.date));

  const activeColumns = CSV_COLUMNS.filter((col) =>
    options.selectedColumns.includes(col.id)
  );

  // Header row
  const headerRow = activeColumns.map((col) => escapeCsvCell(col.label)).join(',');

  let totalAmount = 0;

  // Data rows
  const dataRows = filtered.map((tx) => {
    const card = cardMap.get(tx.cardId);
    totalAmount += tx.amount;

    return activeColumns
      .map((col) => {
        switch (col.id) {
          case 'date':
            return escapeCsvCell(tx.date);
          case 'title':
            return escapeCsvCell(tx.title);
          case 'amount':
            return escapeCsvCell(tx.amount.toFixed(2));
          case 'cardName':
            return escapeCsvCell(card ? card.name : tx.cardId);
          case 'bank':
            return escapeCsvCell(card ? card.bank : '-');
          case 'last4':
            return escapeCsvCell(card ? card.last4 : '-');
          case 'category': {
            const cat = CATEGORY_INFO[tx.category];
            return escapeCsvCell(cat ? cat.label : tx.category);
          }
          case 'billingCycle': {
            const cycle = getTransactionBillingCycleMonth(tx, cards);
            return escapeCsvCell(cycle);
          }
          case 'status':
            return escapeCsvCell(tx.isPaid ? 'ชำระแล้ว' : 'รอชำระ');
          case 'paidDate':
            return escapeCsvCell(tx.paidDate ? tx.paidDate.split('T')[0] : '-');
          case 'type':
            return escapeCsvCell(tx.isInstallment ? 'ผ่อนชำระ' : 'รายการปกติ');
          case 'installmentInfo':
            if (tx.isInstallment && tx.totalInstallments) {
              return escapeCsvCell(
                `งวดที่ ${tx.currentInstallment || 1}/${tx.totalInstallments}`
              );
            }
            return escapeCsvCell('-');
          case 'installmentMonthly':
            if (tx.isInstallment && tx.monthlyInstallmentAmount) {
              return escapeCsvCell(tx.monthlyInstallmentAmount.toFixed(2));
            }
            return escapeCsvCell('-');
          case 'note':
            return escapeCsvCell(tx.note || '');
          default:
            return escapeCsvCell('');
        }
      })
      .join(',');
  });

  const allLines = [headerRow, ...dataRows];

  // Optional summary row at the bottom
  if (options.includeSummaryRow && filtered.length > 0) {
    const summaryRow = activeColumns
      .map((col, idx) => {
        if (idx === 0) return escapeCsvCell('สรุปยอดรวมทั้งสิ้น');
        if (col.id === 'amount') return escapeCsvCell(totalAmount.toFixed(2));
        if (col.id === 'title') return escapeCsvCell(`จำนวนทั้งหมด ${filtered.length} รายการ`);
        return escapeCsvCell('');
      })
      .join(',');
    allLines.push(summaryRow);
  }

  // Prepend UTF-8 BOM so Microsoft Excel opens Thai characters properly
  const csvString = '\uFEFF' + allLines.join('\r\n');

  return {
    csvString,
    rowCount: filtered.length,
    totalAmount,
  };
};

/**
 * Triggers a download of the CSV file in the browser
 */
export const downloadCsvFile = (csvContent: string, fileName?: string) => {
  const defaultName = `CardPulse_Expenses_${new Date().toISOString().split('T')[0]}.csv`;
  const name = fileName || defaultName;

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', name);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};
