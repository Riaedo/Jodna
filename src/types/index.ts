export interface CreditCard {
  id: string;
  name: string; // e.g. KBank Passion, SCB CardX Beyond
  bank: string; // e.g. กสิกรไทย, ไทยพาณิชย์, กรุงศรี, เคทีซี, กรุงเทพ, ทีทีบี, ยูโอบี
  last4: string;
  creditLimit: number;
  billingCutoffDay: number; // 1-31 (วันตัดรอบบิล)
  paymentDueDay: number; // 1-31 (วันครบกำหนดชำระ)
  colorGradient: string; // Tailwind gradient classes or hex
  accentColor: string;
  cardType?: string; // VISA, Mastercard, JCB, UnionPay, AMEX, or custom
  status?: 'active' | 'inactive';
}

export type TransactionCategory =
  | 'food' // อาหาร & เครื่องดื่ม
  | 'shopping' // ช้อปปิ้ง & ของใช้
  | 'supermarket' // ซูเปอร์มาร์เก็ต
  | 'travel' // ท่องเที่ยว & โรงแรม
  | 'transport' // เดินทาง & น้ำมัน
  | 'bills' // บิล & สาธารณูปโภค
  | 'entertainment' // ความบันเทิง & สตรีมมิ่ง
  | 'health' // สุขภาพ & ความงาม
  | 'online' // บริการออนไลน์ & ซอฟต์แวร์
  | 'other'; // อื่นๆ

export interface Transaction {
  id: string;
  cardId: string;
  date: string; // YYYY-MM-DD
  title: string;
  category: TransactionCategory;
  amount: number;
  billingCycleMonth: string; // YYYY-MM (รอบบิลประจำเดือน)
  isInstallment?: boolean;
  totalInstallments?: number; // e.g. 10 งวด
  currentInstallment?: number; // e.g. งวดที่ 1
  monthlyInstallmentAmount?: number;
  installmentGroupId?: string; // Links all installment payments of the same plan
  note?: string;
  tags?: string[]; // Tagging system e.g. ["จำเป็น", "ของขวัญ", "ท่องเที่ยวญี่ปุ่น"]
  isPaid?: boolean;
  paidDate?: string;
  createdAt: string;
}

export type AlertSeverity = 'overdue' | 'critical' | 'warning' | 'normal' | 'paid';

export interface CardDueStatus {
  card: CreditCard;
  nextDueDate: string; // YYYY-MM-DD
  cutoffDate: string; // YYYY-MM-DD
  daysRemaining: number;
  severity: AlertSeverity;
  cycleAmount: number;
  isPaid: boolean;
  cycleMonth: string; // YYYY-MM
}

export interface CardCutoffAlertStatus {
  cardId: string;
  isNearCutoff: boolean; // within 0..3 days before cutoff
  daysUntilCutoff: number; // 0, 1, 2, 3
  cutoffDate: Date;
  cutoffDateStr: string; // YYYY-MM-DD
  label: string; // e.g. "ตัดรอบวันนี้!", "ตัดรอบพรุ่งนี้ (อีก 1 วัน)", "อีก 2 วันตัดรอบบิล", "อีก 3 วันตัดรอบบิล"
}

export interface MonthlyStats {
  month: string; // YYYY-MM
  totalSpent: number;
  totalDue: number;
  totalPaid: number;
  totalPending: number;
  categoryBreakdown: { [category in TransactionCategory]?: number };
  cardBreakdown: { [cardId: string]: number };
}

export interface GoogleSheetInfo {
  spreadsheetId: string;
  spreadsheetUrl: string;
  title: string;
  lastSyncedAt?: string;
}

export interface CardMonthlyBillingDetail {
  card: CreditCard;
  cycleMonth: string; // YYYY-MM
  cyclePeriod: {
    startDateStr: string;
    endDateStr: string;
    periodLabel: string;
    dueDateStr: string;
    dueDateLabel: string;
    cutoffDayLabel: string;
  };
  totalSpent: number;
  totalPaid: number;
  totalPending: number;
  txCount: number;
  installmentCount: number;
  installmentAmount: number;
  isPaid: boolean;
  transactions: Transaction[];
}
