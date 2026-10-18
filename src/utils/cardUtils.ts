import {
  CreditCard,
  Transaction,
  CardDueStatus,
  CardCutoffAlertStatus,
  MonthlyStats,
  TransactionCategory,
  CardMonthlyBillingDetail,
} from '../types';

export const CATEGORY_INFO: Record<
  TransactionCategory,
  { label: string; icon: string; color: string; bg: string; hexColor: string }
> = {
  food: { label: 'อาหาร & เครื่องดื่ม', icon: 'Utensils', color: 'text-amber-400', bg: 'bg-amber-400/10', hexColor: '#fbbf24' },
  shopping: { label: 'ช้อปปิ้ง & สินค้า', icon: 'ShoppingBag', color: 'text-pink-400', bg: 'bg-pink-400/10', hexColor: '#f472b6' },
  supermarket: { label: 'ซูเปอร์มาร์เก็ต & ของสด', icon: 'ShoppingCart', color: 'text-emerald-400', bg: 'bg-emerald-400/10', hexColor: '#34d399' },
  transport: { label: 'เดินทาง & น้ำมัน', icon: 'Car', color: 'text-blue-400', bg: 'bg-blue-400/10', hexColor: '#60a5fa' },
  bills: { label: 'บิล & สาธารณูปโภค', icon: 'Receipt', color: 'text-purple-400', bg: 'bg-purple-400/10', hexColor: '#c084fc' },
  travel: { label: 'ท่องเที่ยว & ที่พัก', icon: 'Plane', color: 'text-cyan-400', bg: 'bg-cyan-400/10', hexColor: '#22d3ee' },
  entertainment: { label: 'บันเทิง & สตรีมมิ่ง', icon: 'Film', color: 'text-red-400', bg: 'bg-red-400/10', hexColor: '#f87171' },
  health: { label: 'สุขภาพ & ความงาม', icon: 'Heart', color: 'text-rose-400', bg: 'bg-rose-400/10', hexColor: '#fb7185' },
  online: { label: 'บริการออนไลน์ & ซอฟต์แวร์', icon: 'Globe', color: 'text-indigo-400', bg: 'bg-indigo-400/10', hexColor: '#818cf8' },
  other: { label: 'อื่นๆ ทั่วไป', icon: 'MoreHorizontal', color: 'text-slate-400', bg: 'bg-slate-400/10', hexColor: '#94a3b8' },
};

export const PRESET_TAGS = [
  'จำเป็น (Essential)',
  'ฟุ่มเฟือย (Discretionary)',
  'งาน/ธุรกิจ (Work)',
  'ครอบครัว (Family)',
  'ลดหย่อนภาษี (Tax)',
  'ของขวัญ (Gift)',
  'Cashback',
];

export const PRESET_CARDS: Omit<CreditCard, 'id' | 'last4'>[] = [
  {
    name: 'KBank Passion Card',
    bank: 'กสิกรไทย (KBank)',
    creditLimit: 120000,
    billingCutoffDay: 15,
    paymentDueDay: 5,
    colorGradient: 'from-emerald-900 via-emerald-700 to-teal-800',
    accentColor: '#10b981',
    cardType: 'VISA',
  },
  {
    name: 'SCB CardX Beyond',
    bank: 'ไทยพาณิชย์ (SCB)',
    creditLimit: 150000,
    billingCutoffDay: 20,
    paymentDueDay: 10,
    colorGradient: 'from-purple-950 via-purple-800 to-indigo-900',
    accentColor: '#8b5cf6',
    cardType: 'Mastercard',
  },
  {
    name: 'Krungsri First Choice Visa',
    bank: 'กรุงศรีอยุธยา (Krungsri)',
    creditLimit: 80000,
    billingCutoffDay: 25,
    paymentDueDay: 15,
    colorGradient: 'from-amber-900 via-amber-700 to-yellow-800',
    accentColor: '#f59e0b',
    cardType: 'VISA',
  },
  {
    name: 'KTC Platinum',
    bank: 'เคทีซี (KTC)',
    creditLimit: 100000,
    billingCutoffDay: 10,
    paymentDueDay: 28,
    colorGradient: 'from-slate-900 via-cyan-950 to-blue-900',
    accentColor: '#06b6d4',
    cardType: 'VISA',
  },
];

export const INITIAL_DEMO_CARDS: CreditCard[] = [
  {
    id: 'card-1',
    name: 'KBank Passion Card',
    bank: 'กสิกรไทย (KBank)',
    last4: '4892',
    creditLimit: 120000,
    billingCutoffDay: 15,
    paymentDueDay: 5,
    colorGradient: 'from-emerald-950 via-teal-900 to-emerald-800',
    accentColor: '#10b981',
    cardType: 'VISA',
    status: 'active',
  },
  {
    id: 'card-2',
    name: 'SCB CardX Beyond',
    bank: 'ไทยพาณิชย์ (SCB)',
    last4: '1944',
    creditLimit: 150000,
    billingCutoffDay: 20,
    paymentDueDay: 10,
    colorGradient: 'from-purple-950 via-violet-900 to-indigo-950',
    accentColor: '#8b5cf6',
    cardType: 'Mastercard',
    status: 'active',
  },
  {
    id: 'card-3',
    name: 'KTC Platinum Visa',
    bank: 'เคทีซี (KTC)',
    last4: '7721',
    creditLimit: 100000,
    billingCutoffDay: 10,
    paymentDueDay: 28,
    colorGradient: 'from-slate-900 via-sky-950 to-blue-950',
    accentColor: '#0ea5e9',
    cardType: 'VISA',
    status: 'active',
  },
];

export const INITIAL_DEMO_TRANSACTIONS: Transaction[] = [
  // October 2026 (Current)
  {
    id: 'tx-1',
    cardId: 'card-1',
    date: '2026-10-02',
    title: 'Gourmet Market - เอ็มควอเทียร์',
    category: 'supermarket',
    tags: ['จำเป็น (Essential)', 'ครอบครัว (Family)'],
    amount: 2450,
    billingCycleMonth: '2026-10',
    isInstallment: false,
    isPaid: false,
    createdAt: '2026-10-02T14:20:00Z',
    note: 'ซื้อของสดและของใช้ในบ้าน',
  },
  {
    id: 'tx-2',
    cardId: 'card-1',
    date: '2026-10-05',
    title: 'เติมน้ำมัน PTT Station',
    category: 'transport',
    tags: ['จำเป็น (Essential)', 'งาน/ธุรกิจ (Work)'],
    amount: 1500,
    billingCycleMonth: '2026-10',
    isInstallment: false,
    isPaid: false,
    createdAt: '2026-10-05T09:12:00Z',
  },
  {
    id: 'tx-3-inst-1',
    cardId: 'card-2',
    date: '2026-10-08',
    title: 'Apple Store - iPhone ผ่อน 0%',
    category: 'shopping',
    tags: ['ผ่อน 0%', 'งาน/ธุรกิจ (Work)'],
    amount: 42900,
    billingCycleMonth: '2026-10',
    isInstallment: true,
    totalInstallments: 10,
    currentInstallment: 1,
    monthlyInstallmentAmount: 4290,
    installmentGroupId: 'inst-grp-demo-iphone',
    isPaid: false,
    createdAt: '2026-10-08T18:30:00Z',
    note: 'ผ่อนชำระ 0% 10 เดือน ยอดงวดละ 4,290 บาท (งวดที่ 1/10)',
  },
  {
    id: 'tx-3-inst-2',
    cardId: 'card-2',
    date: '2026-11-08',
    title: 'Apple Store - iPhone ผ่อน 0%',
    category: 'shopping',
    tags: ['ผ่อน 0%', 'งาน/ธุรกิจ (Work)'],
    amount: 42900,
    billingCycleMonth: '2026-11',
    isInstallment: true,
    totalInstallments: 10,
    currentInstallment: 2,
    monthlyInstallmentAmount: 4290,
    installmentGroupId: 'inst-grp-demo-iphone',
    isPaid: false,
    createdAt: '2026-10-08T18:30:00Z',
    note: 'ผ่อนชำระ 0% 10 เดือน ยอดงวดละ 4,290 บาท (งวดที่ 2/10)',
  },
  {
    id: 'tx-3-inst-3',
    cardId: 'card-2',
    date: '2026-12-08',
    title: 'Apple Store - iPhone ผ่อน 0%',
    category: 'shopping',
    tags: ['ผ่อน 0%', 'งาน/ธุรกิจ (Work)'],
    amount: 42900,
    billingCycleMonth: '2026-12',
    isInstallment: true,
    totalInstallments: 10,
    currentInstallment: 3,
    monthlyInstallmentAmount: 4290,
    installmentGroupId: 'inst-grp-demo-iphone',
    isPaid: false,
    createdAt: '2026-10-08T18:30:00Z',
    note: 'ผ่อนชำระ 0% 10 เดือน ยอดงวดละ 4,290 บาท (งวดที่ 3/10)',
  },
  {
    id: 'tx-3-inst-4',
    cardId: 'card-2',
    date: '2027-01-08',
    title: 'Apple Store - iPhone ผ่อน 0%',
    category: 'shopping',
    tags: ['ผ่อน 0%', 'งาน/ธุรกิจ (Work)'],
    amount: 42900,
    billingCycleMonth: '2027-01',
    isInstallment: true,
    totalInstallments: 10,
    currentInstallment: 4,
    monthlyInstallmentAmount: 4290,
    installmentGroupId: 'inst-grp-demo-iphone',
    isPaid: false,
    createdAt: '2026-10-08T18:30:00Z',
    note: 'ผ่อนชำระ 0% 10 เดือน ยอดงวดละ 4,290 บาท (งวดที่ 4/10)',
  },
  {
    id: 'tx-3-inst-5',
    cardId: 'card-2',
    date: '2027-02-08',
    title: 'Apple Store - iPhone ผ่อน 0%',
    category: 'shopping',
    tags: ['ผ่อน 0%', 'งาน/ธุรกิจ (Work)'],
    amount: 42900,
    billingCycleMonth: '2027-02',
    isInstallment: true,
    totalInstallments: 10,
    currentInstallment: 5,
    monthlyInstallmentAmount: 4290,
    installmentGroupId: 'inst-grp-demo-iphone',
    isPaid: false,
    createdAt: '2026-10-08T18:30:00Z',
    note: 'ผ่อนชำระ 0% 10 เดือน ยอดงวดละ 4,290 บาท (งวดที่ 5/10)',
  },
  {
    id: 'tx-3-inst-6',
    cardId: 'card-2',
    date: '2027-03-08',
    title: 'Apple Store - iPhone ผ่อน 0%',
    category: 'shopping',
    tags: ['ผ่อน 0%', 'งาน/ธุรกิจ (Work)'],
    amount: 42900,
    billingCycleMonth: '2027-03',
    isInstallment: true,
    totalInstallments: 10,
    currentInstallment: 6,
    monthlyInstallmentAmount: 4290,
    installmentGroupId: 'inst-grp-demo-iphone',
    isPaid: false,
    createdAt: '2026-10-08T18:30:00Z',
    note: 'ผ่อนชำระ 0% 10 เดือน ยอดงวดละ 4,290 บาท (งวดที่ 6/10)',
  },
  {
    id: 'tx-3-inst-7',
    cardId: 'card-2',
    date: '2027-04-08',
    title: 'Apple Store - iPhone ผ่อน 0%',
    category: 'shopping',
    tags: ['ผ่อน 0%', 'งาน/ธุรกิจ (Work)'],
    amount: 42900,
    billingCycleMonth: '2027-04',
    isInstallment: true,
    totalInstallments: 10,
    currentInstallment: 7,
    monthlyInstallmentAmount: 4290,
    installmentGroupId: 'inst-grp-demo-iphone',
    isPaid: false,
    createdAt: '2026-10-08T18:30:00Z',
    note: 'ผ่อนชำระ 0% 10 เดือน ยอดงวดละ 4,290 บาท (งวดที่ 7/10)',
  },
  {
    id: 'tx-3-inst-8',
    cardId: 'card-2',
    date: '2027-05-08',
    title: 'Apple Store - iPhone ผ่อน 0%',
    category: 'shopping',
    tags: ['ผ่อน 0%', 'งาน/ธุรกิจ (Work)'],
    amount: 42900,
    billingCycleMonth: '2027-05',
    isInstallment: true,
    totalInstallments: 10,
    currentInstallment: 8,
    monthlyInstallmentAmount: 4290,
    installmentGroupId: 'inst-grp-demo-iphone',
    isPaid: false,
    createdAt: '2026-10-08T18:30:00Z',
    note: 'ผ่อนชำระ 0% 10 เดือน ยอดงวดละ 4,290 บาท (งวดที่ 8/10)',
  },
  {
    id: 'tx-3-inst-9',
    cardId: 'card-2',
    date: '2027-06-08',
    title: 'Apple Store - iPhone ผ่อน 0%',
    category: 'shopping',
    tags: ['ผ่อน 0%', 'งาน/ธุรกิจ (Work)'],
    amount: 42900,
    billingCycleMonth: '2027-06',
    isInstallment: true,
    totalInstallments: 10,
    currentInstallment: 9,
    monthlyInstallmentAmount: 4290,
    installmentGroupId: 'inst-grp-demo-iphone',
    isPaid: false,
    createdAt: '2026-10-08T18:30:00Z',
    note: 'ผ่อนชำระ 0% 10 เดือน ยอดงวดละ 4,290 บาท (งวดที่ 9/10)',
  },
  {
    id: 'tx-3-inst-10',
    cardId: 'card-2',
    date: '2027-07-08',
    title: 'Apple Store - iPhone ผ่อน 0%',
    category: 'shopping',
    tags: ['ผ่อน 0%', 'งาน/ธุรกิจ (Work)'],
    amount: 42900,
    billingCycleMonth: '2027-07',
    isInstallment: true,
    totalInstallments: 10,
    currentInstallment: 10,
    monthlyInstallmentAmount: 4290,
    installmentGroupId: 'inst-grp-demo-iphone',
    isPaid: false,
    createdAt: '2026-10-08T18:30:00Z',
    note: 'ผ่อนชำระ 0% 10 เดือน ยอดงวดละ 4,290 บาท (งวดที่ 10/10)',
  },
  {
    id: 'tx-4',
    cardId: 'card-2',
    date: '2026-10-10',
    title: 'Mo-Mo-Paradise Central World',
    category: 'food',
    tags: ['ฟุ่มเฟือย (Discretionary)', 'ครอบครัว (Family)'],
    amount: 1780,
    billingCycleMonth: '2026-10',
    isInstallment: false,
    isPaid: false,
    createdAt: '2026-10-10T19:45:00Z',
  },
  {
    id: 'tx-5',
    cardId: 'card-3',
    date: '2026-09-28',
    title: 'ค่าไฟฟ้า MEA',
    category: 'bills',
    tags: ['จำเป็น (Essential)'],
    amount: 3250,
    billingCycleMonth: '2026-10',
    isPaid: false,
    createdAt: '2026-09-28T11:00:00Z',
  },
  {
    id: 'tx-6',
    cardId: 'card-3',
    date: '2026-10-11',
    title: 'Netflix & Spotify Family',
    category: 'entertainment',
    tags: ['ครอบครัว (Family)'],
    amount: 628,
    billingCycleMonth: '2026-10',
    isPaid: false,
    createdAt: '2026-10-11T08:00:00Z',
  },

  // September 2026 (Past Month 1)
  {
    id: 'tx-sep-1',
    cardId: 'card-1',
    date: '2026-09-04',
    title: 'Uniqlo Central Rama 9',
    category: 'shopping',
    amount: 3890,
    billingCycleMonth: '2026-09',
    isPaid: true,
    createdAt: '2026-09-04T13:10:00Z',
  },
  {
    id: 'tx-sep-2',
    cardId: 'card-1',
    date: '2026-09-12',
    title: 'Starbucks Coffee & Roastery',
    category: 'food',
    amount: 640,
    billingCycleMonth: '2026-09',
    isPaid: true,
    createdAt: '2026-09-12T09:30:00Z',
  },
  {
    id: 'tx-sep-3',
    cardId: 'card-2',
    date: '2026-09-18',
    title: 'ตั๋วเครื่องบิน Thai Airways ไปเชียงใหม่',
    category: 'travel',
    amount: 7850,
    billingCycleMonth: '2026-09',
    isPaid: true,
    createdAt: '2026-09-18T16:00:00Z',
  },
  {
    id: 'tx-sep-4',
    cardId: 'card-3',
    date: '2026-09-05',
    title: 'ค่าบริการอินเทอร์เน็ต True Gigatex',
    category: 'bills',
    amount: 1068,
    billingCycleMonth: '2026-09',
    isPaid: true,
    createdAt: '2026-09-05T10:00:00Z',
  },
  {
    id: 'tx-sep-5',
    cardId: 'card-2',
    date: '2026-09-22',
    title: 'Shabu Shushi Haidilao',
    category: 'food',
    amount: 2490,
    billingCycleMonth: '2026-09',
    isPaid: true,
    createdAt: '2026-09-22T20:15:00Z',
  },

  // August 2026 (Past Month 2)
  {
    id: 'tx-aug-1',
    cardId: 'card-1',
    date: '2026-08-08',
    title: 'Villa Market อารีย์',
    category: 'supermarket',
    amount: 3200,
    billingCycleMonth: '2026-08',
    isPaid: true,
    createdAt: '2026-08-08T11:40:00Z',
  },
  {
    id: 'tx-aug-2',
    cardId: 'card-2',
    date: '2026-08-14',
    title: 'โรงแรม Sala Bang Pa-in พักผ่อนวันแม่',
    category: 'travel',
    amount: 9200,
    billingCycleMonth: '2026-08',
    isPaid: true,
    createdAt: '2026-08-14T15:00:00Z',
  },
  {
    id: 'tx-aug-3',
    cardId: 'card-3',
    date: '2026-08-20',
    title: 'ตรวจสุขภาพประจำปี รพ.กรุงเทพ',
    category: 'health',
    amount: 5500,
    billingCycleMonth: '2026-08',
    isPaid: true,
    createdAt: '2026-08-20T10:00:00Z',
  },
  {
    id: 'tx-aug-4',
    cardId: 'card-1',
    date: '2026-08-25',
    title: 'เติมน้ำมัน Shell V-Power',
    category: 'transport',
    amount: 1800,
    billingCycleMonth: '2026-08',
    isPaid: true,
    createdAt: '2026-08-25T08:30:00Z',
  },

  // July 2026 (Past Month 3)
  {
    id: 'tx-jul-1',
    cardId: 'card-1',
    date: '2026-07-07',
    title: 'ซื้อสินค้าเทศบาล 7.7 Shopee',
    category: 'shopping',
    amount: 4500,
    billingCycleMonth: '2026-07',
    isPaid: true,
    createdAt: '2026-07-07T00:15:00Z',
  },
  {
    id: 'tx-jul-2',
    cardId: 'card-2',
    date: '2026-07-15',
    title: 'Din Tai Fung เซ็นทรัลเอ็มบาสซี',
    category: 'food',
    amount: 2150,
    billingCycleMonth: '2026-07',
    isPaid: true,
    createdAt: '2026-07-15T19:00:00Z',
  },
  {
    id: 'tx-jul-3',
    cardId: 'card-3',
    date: '2026-07-22',
    title: 'ค่าสมาชิก Cloud & ChatGPT Plus',
    category: 'online',
    amount: 1550,
    billingCycleMonth: '2026-07',
    isPaid: true,
    createdAt: '2026-07-22T08:45:00Z',
  },

  // June 2026 (Past Month 4)
  {
    id: 'tx-jun-1',
    cardId: 'card-1',
    date: '2026-06-10',
    title: 'Big C Extra รัชดาภิเษก',
    category: 'supermarket',
    amount: 3100,
    billingCycleMonth: '2026-06',
    isPaid: true,
    createdAt: '2026-06-10T14:30:00Z',
  },
  {
    id: 'tx-jun-2',
    cardId: 'card-2',
    date: '2026-06-18',
    title: 'IKEA บางนา ซื้อโต๊ะทำงานและเก้าอี้',
    category: 'shopping',
    amount: 11400,
    billingCycleMonth: '2026-06',
    isPaid: true,
    createdAt: '2026-06-18T16:20:00Z',
  },
  {
    id: 'tx-jun-3',
    cardId: 'card-3',
    date: '2026-06-25',
    title: 'ค่าบริการประกันรถยนต์ วิริยะประกันภัย',
    category: 'bills',
    amount: 14800,
    billingCycleMonth: '2026-06',
    isPaid: true,
    createdAt: '2026-06-25T11:00:00Z',
  },

  // May 2026 (Past Month 5)
  {
    id: 'tx-may-1',
    cardId: 'card-1',
    date: '2026-05-02',
    title: 'Fuji Japanese Restaurant',
    category: 'food',
    amount: 1890,
    billingCycleMonth: '2026-05',
    isPaid: true,
    createdAt: '2026-05-02T18:40:00Z',
  },
  {
    id: 'tx-may-2',
    cardId: 'card-2',
    date: '2026-05-15',
    title: 'ตั๋วชมภาพยนตร์ IMAX Paragon Cineplex',
    category: 'entertainment',
    amount: 980,
    billingCycleMonth: '2026-05',
    isPaid: true,
    createdAt: '2026-05-15T19:30:00Z',
  },
  {
    id: 'tx-may-3',
    cardId: 'card-3',
    date: '2026-05-24',
    title: 'เติมน้ำมัน Caltex Techron',
    category: 'transport',
    amount: 1600,
    billingCycleMonth: '2026-05',
    isPaid: true,
    createdAt: '2026-05-24T09:00:00Z',
  },

  // 2025 Historical Transactions for Year-over-Year Comparison
  {
    id: 'tx-2025-jan',
    cardId: 'card-1',
    date: '2025-01-10',
    title: 'ซื้อของขวัญปีใหม่ Central Chidlom',
    category: 'shopping',
    amount: 14500,
    billingCycleMonth: '2025-01',
    isPaid: true,
    createdAt: '2025-01-10T12:00:00Z',
  },
  {
    id: 'tx-2025-feb',
    cardId: 'card-2',
    date: '2025-02-14',
    title: 'ดินเนอร์วันวาเลนไทน์ Vertigo Banyan Tree',
    category: 'food',
    amount: 12800,
    billingCycleMonth: '2025-02',
    isPaid: true,
    createdAt: '2025-02-14T20:00:00Z',
  },
  {
    id: 'tx-2025-mar',
    cardId: 'card-3',
    date: '2025-03-20',
    title: 'อุปกรณ์กีฬา Decathlon',
    category: 'shopping',
    amount: 15400,
    billingCycleMonth: '2025-03',
    isPaid: true,
    createdAt: '2025-03-20T15:30:00Z',
  },
  {
    id: 'tx-2025-apr',
    cardId: 'card-2',
    date: '2025-04-12',
    title: 'ตั๋วเครื่องบินและที่พักสงกรานต์ภูเก็ต',
    category: 'travel',
    amount: 22600,
    billingCycleMonth: '2025-04',
    isPaid: true,
    createdAt: '2025-04-12T10:00:00Z',
  },
  {
    id: 'tx-2025-may',
    cardId: 'card-1',
    date: '2025-05-18',
    title: 'Gourmet Market & ร้านอาหารญี่ปุ่น',
    category: 'supermarket',
    amount: 18900,
    billingCycleMonth: '2025-05',
    isPaid: true,
    createdAt: '2025-05-18T17:00:00Z',
  },
  {
    id: 'tx-2025-jun',
    cardId: 'card-3',
    date: '2025-06-22',
    title: 'เครื่องใช้ไฟฟ้า Power Buy',
    category: 'shopping',
    amount: 23500,
    billingCycleMonth: '2025-06',
    isPaid: true,
    createdAt: '2025-06-22T14:00:00Z',
  },
  {
    id: 'tx-2025-jul',
    cardId: 'card-2',
    date: '2025-07-16',
    title: 'ค่าบริการคลาวด์และโปรแกรมทำงาน',
    category: 'online',
    amount: 16800,
    billingCycleMonth: '2025-07',
    isPaid: true,
    createdAt: '2025-07-16T11:00:00Z',
  },
  {
    id: 'tx-2025-aug',
    cardId: 'card-1',
    date: '2025-08-11',
    title: 'พาคุณแม่ทานอาหารวันแม่',
    category: 'food',
    amount: 21200,
    billingCycleMonth: '2025-08',
    isPaid: true,
    createdAt: '2025-08-11T19:00:00Z',
  },
  {
    id: 'tx-2025-sep',
    cardId: 'card-3',
    date: '2025-09-15',
    title: 'บิลสาธารณูปโภคและอินเทอร์เน็ต True',
    category: 'bills',
    amount: 17400,
    billingCycleMonth: '2025-09',
    isPaid: true,
    createdAt: '2025-09-15T09:30:00Z',
  },
  {
    id: 'tx-2025-oct',
    cardId: 'card-2',
    date: '2025-10-14',
    title: 'คอมพิวเตอร์และจอมอนิเตอร์ Banana IT',
    category: 'shopping',
    amount: 24800,
    billingCycleMonth: '2025-10',
    isPaid: true,
    createdAt: '2025-10-14T16:00:00Z',
  },
  {
    id: 'tx-2025-nov',
    cardId: 'card-1',
    date: '2025-11-20',
    title: 'ช้อปปิ้งโปร 11.11 สินค้าอิเล็กทรอนิกส์',
    category: 'shopping',
    amount: 19800,
    billingCycleMonth: '2025-11',
    isPaid: true,
    createdAt: '2025-11-20T13:00:00Z',
  },
  {
    id: 'tx-2025-dec',
    cardId: 'card-2',
    date: '2025-12-28',
    title: 'ท่องเที่ยวพักผ่อนส่งท้ายปีเก่า เขาใหญ่',
    category: 'travel',
    amount: 28500,
    billingCycleMonth: '2025-12',
    isPaid: true,
    createdAt: '2025-12-28T18:00:00Z',
  },
];

/**
 * Calculates billing cycle month (YYYY-MM) for a transaction date based on card's cut-off day.
 * If transaction day <= cut-off day, it belongs to the current month's statement.
 * If transaction day > cut-off day, it belongs to next month's statement.
 */
export const calculateBillingCycle = (dateStr: string, cutoffDay: number): string => {
  const parts = dateStr.split('-');
  let year = parseInt(parts[0], 10);
  let month = parseInt(parts[1], 10);
  const day = parseInt(parts[2], 10);

  if (day > cutoffDay) {
    month += 1;
    if (month > 12) {
      month = 1;
      year += 1;
    }
  }

  return `${year}-${String(month).padStart(2, '0')}`;
};

/**
 * Resolves the billing cycle month (YYYY-MM) for a transaction.
 * If cards are provided, calculates dynamically based on card's billing cut-off day.
 */
export const getTransactionBillingCycleMonth = (
  tx: Transaction,
  cards?: CreditCard[]
): string => {
  if (tx.isInstallment && tx.billingCycleMonth) {
    return tx.billingCycleMonth;
  }
  if (cards && tx.cardId && tx.date) {
    const card = cards.find((c) => c.id === tx.cardId);
    if (card?.billingCutoffDay) {
      return calculateBillingCycle(tx.date, card.billingCutoffDay);
    }
  }
  return tx.billingCycleMonth || (tx.date ? tx.date.slice(0, 7) : '');
};

/**
 * Calculates next billing cycle month given a start cycle (YYYY-MM) and offset number of months.
 */
export const getNextBillingMonth = (monthStr: string, offsetMonths: number = 1): string => {
  const parts = monthStr.split('-');
  let year = parseInt(parts[0], 10);
  let month = parseInt(parts[1], 10) + offsetMonths;

  while (month > 12) {
    month -= 12;
    year += 1;
  }
  while (month < 1) {
    month += 12;
    year -= 1;
  }

  return `${year}-${String(month).padStart(2, '0')}`;
};

/**
 * Calculates the transaction date for a future installment month.
 * Keeps the same day-of-month, clamped to the maximum days in that target month.
 */
export const getInstallmentDate = (startDateStr: string, offsetMonths: number): string => {
  const [startYear, startMonth, startDay] = startDateStr.split('-').map(Number);
  let targetYear = startYear;
  let targetMonth = startMonth + offsetMonths;

  while (targetMonth > 12) {
    targetMonth -= 12;
    targetYear += 1;
  }

  const daysInMonth = new Date(targetYear, targetMonth, 0).getDate();
  const targetDay = Math.min(startDay, daysInMonth);

  return `${targetYear}-${String(targetMonth).padStart(2, '0')}-${String(targetDay).padStart(2, '0')}`;
};

/**
 * Generates an array of installment transactions for subsequent billing cycles.
 */
export const generateInstallmentSeries = (
  baseTx: Omit<Transaction, 'id' | 'createdAt'> & { id?: string },
  generateRemaining: boolean = true
): Transaction[] => {
  if (!baseTx.isInstallment || !baseTx.totalInstallments || !baseTx.monthlyInstallmentAmount) {
    return [
      {
        ...baseTx,
        id: baseTx.id || 'tx-' + Date.now(),
        createdAt: new Date().toISOString(),
      } as Transaction,
    ];
  }

  const total = baseTx.totalInstallments;
  const current = baseTx.currentInstallment || 1;
  const groupId = baseTx.installmentGroupId || 'inst-grp-' + Date.now();
  const baseNote = baseTx.note ? baseTx.note.replace(/\s*\(งวดที่.*?\)/, '').trim() : '';

  if (!generateRemaining) {
    return [
      {
        ...baseTx,
        id: baseTx.id || 'tx-' + Date.now(),
        installmentGroupId: groupId,
        createdAt: new Date().toISOString(),
      } as Transaction,
    ];
  }

  const series: Transaction[] = [];

  for (let instNum = current; instNum <= total; instNum++) {
    const offset = instNum - current;
    const targetCycle = getNextBillingMonth(baseTx.billingCycleMonth, offset);
    const targetDate = getInstallmentDate(baseTx.date, offset);
    const noteText = baseNote
      ? `${baseNote} (งวดที่ ${instNum}/${total})`
      : `ผ่อนชำระงวดที่ ${instNum}/${total}`;

    series.push({
      ...baseTx,
      id: offset === 0 && baseTx.id ? baseTx.id : `tx-${groupId}-${instNum}`,
      currentInstallment: instNum,
      billingCycleMonth: targetCycle,
      date: targetDate,
      installmentGroupId: groupId,
      isPaid: offset === 0 ? Boolean(baseTx.isPaid) : false,
      note: noteText,
      createdAt: new Date().toISOString(),
    });
  }

  return series;
};

/**
 * Checks existing transactions and generates any missing installments for subsequent billing cycles.
 * Ensures existing installment plans automatically appear across all future billing months.
 */
export const autoPopulateMissingInstallments = (
  transactions: Transaction[]
): { updatedTransactions: Transaction[]; addedCount: number } => {
  const newlyCreated: Transaction[] = [];

  // Group transactions by plan
  const groupedPlans = new Map<string, Transaction[]>();

  transactions.forEach((t) => {
    if (t.isInstallment && t.totalInstallments && t.totalInstallments > 1) {
      const key =
        t.installmentGroupId ||
        `plan-${t.cardId}-${t.title.replace(/\s+/g, '')}-${t.totalInstallments}`;
      const list = groupedPlans.get(key) || [];
      list.push(t);
      groupedPlans.set(key, list);
    }
  });

  groupedPlans.forEach((planTxs, key) => {
    const existingInstNums = new Set(planTxs.map((t) => t.currentInstallment || 1));
    const sorted = [...planTxs].sort(
      (a, b) => (a.currentInstallment || 1) - (b.currentInstallment || 1)
    );
    const refTx = sorted[0];
    const total = refTx.totalInstallments || 1;
    const monthlyAmt =
      refTx.monthlyInstallmentAmount ||
      Math.round((refTx.amount / total) * 100) / 100;
    const groupId = refTx.installmentGroupId || key;
    const baseNote = refTx.note ? refTx.note.replace(/\s*\(งวดที่.*?\)/, '').trim() : '';

    for (let inst = 1; inst <= total; inst++) {
      if (!existingInstNums.has(inst)) {
        const offset = inst - (refTx.currentInstallment || 1);
        const targetCycle = getNextBillingMonth(refTx.billingCycleMonth, offset);
        const targetDate = getInstallmentDate(refTx.date, offset);

        const newInstTx: Transaction = {
          id: `tx-${groupId}-${inst}`,
          cardId: refTx.cardId,
          date: targetDate,
          title: refTx.title,
          category: refTx.category,
          tags: refTx.tags ? [...refTx.tags] : ['ผ่อน 0%'],
          amount: refTx.amount,
          billingCycleMonth: targetCycle,
          isInstallment: true,
          totalInstallments: total,
          currentInstallment: inst,
          monthlyInstallmentAmount: monthlyAmt,
          installmentGroupId: groupId,
          note: baseNote
            ? `${baseNote} (งวดที่ ${inst}/${total})`
            : `ผ่อนชำระงวดที่ ${inst}/${total}`,
          isPaid: false,
          createdAt: new Date().toISOString(),
        };

        newlyCreated.push(newInstTx);
      }
    }
  });

  if (newlyCreated.length === 0) {
    return { updatedTransactions: transactions, addedCount: 0 };
  }

  return {
    updatedTransactions: [...transactions, ...newlyCreated],
    addedCount: newlyCreated.length,
  };
};

/**
 * Computes due status for a given card based on today's date.
 */
export const calculateCardDueStatus = (
  card: CreditCard,
  transactions: Transaction[],
  referenceDate: Date = new Date()
): CardDueStatus => {
  const refYear = referenceDate.getFullYear();
  const refMonth = referenceDate.getMonth(); // 0-indexed
  const refDay = referenceDate.getDate();

  // Find next due date:
  // Usually if paymentDueDay < billingCutoffDay, due date is in the next month relative to cut-off.
  // e.g., cut-off 15 Oct -> due 5 Nov
  // e.g., cut-off 10 Oct -> due 28 Oct
  let targetYear = refYear;
  let targetMonth = refMonth;

  // Let's create tentative due date in current month
  let tentativeDueDate = new Date(targetYear, targetMonth, card.paymentDueDay);

  // If tentative date has already passed in current month, look at next month's due date
  // or if today is past due date by more than a few days, find the active upcoming cycle
  const diffDaysFromTentative = Math.round(
    (tentativeDueDate.getTime() - referenceDate.getTime()) / (1000 * 60 * 60 * 24)
  );

  let activeDueDate = tentativeDueDate;
  if (diffDaysFromTentative < -1) {
    // Current month's due date already passed yesterday or earlier, target next month
    let nextMonth = targetMonth + 1;
    let nextYear = targetYear;
    if (nextMonth > 11) {
      nextMonth = 0;
      nextYear += 1;
    }
    activeDueDate = new Date(nextYear, nextMonth, card.paymentDueDay);
  }

  const daysRemaining = Math.ceil(
    (activeDueDate.getTime() - referenceDate.getTime()) / (1000 * 60 * 60 * 24)
  );

  // Cut-off date corresponding to this due cycle
  let cutoffMonth = activeDueDate.getMonth();
  let cutoffYear = activeDueDate.getFullYear();
  if (card.paymentDueDay < card.billingCutoffDay) {
    // Cut-off was in previous month
    cutoffMonth -= 1;
    if (cutoffMonth < 0) {
      cutoffMonth = 11;
      cutoffYear -= 1;
    }
  }
  const cutoffDate = new Date(cutoffYear, cutoffMonth, card.billingCutoffDay);

  // Cycle month string: e.g. YYYY-MM
  const cycleMonthStr = `${cutoffYear}-${String(cutoffMonth + 1).padStart(2, '0')}`;

  // Calculate pending amount for this card in this cycle
  const cardTxs = transactions.filter(
    (t) => t.cardId === card.id && t.billingCycleMonth === cycleMonthStr
  );

  const cycleAmount = cardTxs.reduce((sum, t) => {
    const val = t.isInstallment && t.monthlyInstallmentAmount ? t.monthlyInstallmentAmount : t.amount;
    return sum + val;
  }, 0);

  const isPaid = cardTxs.length > 0 && cardTxs.every((t) => t.isPaid);

  let severity: CardDueStatus['severity'] = 'normal';
  if (isPaid && cycleAmount > 0) {
    severity = 'paid';
  } else if (daysRemaining < 0) {
    severity = 'overdue';
  } else if (daysRemaining <= 3) {
    severity = 'critical';
  } else if (daysRemaining <= 7) {
    severity = 'warning';
  } else {
    severity = 'normal';
  }

  const formatIsoDate = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

  return {
    card,
    nextDueDate: formatIsoDate(activeDueDate),
    cutoffDate: formatIsoDate(cutoffDate),
    daysRemaining,
    severity,
    cycleAmount,
    isPaid,
    cycleMonth: cycleMonthStr,
  };
};

/**
 * Calculates whether a card is within 3 days before its billing cut-off day (0 to 3 days).
 * Returns status, days remaining until cutoff, and formatted alert message.
 */
export const calculateCardCutoffAlertStatus = (
  card: CreditCard,
  referenceDate: Date = new Date()
): CardCutoffAlertStatus => {
  const refYear = referenceDate.getFullYear();
  const refMonth = referenceDate.getMonth();
  const refDay = referenceDate.getDate();

  // Reference date at start of day (midnight)
  const todayZero = new Date(refYear, refMonth, refDay, 0, 0, 0, 0);

  // Check cut-off date in current month:
  const daysInCurrentMonth = new Date(refYear, refMonth + 1, 0).getDate();
  const actualCutoffDayThisMonth = Math.min(card.billingCutoffDay, daysInCurrentMonth);
  let cutoffDate = new Date(refYear, refMonth, actualCutoffDayThisMonth, 0, 0, 0, 0);

  // If this month's cutoff date has already passed, target next month's cutoff:
  if (cutoffDate.getTime() < todayZero.getTime()) {
    const nextMonth = refMonth + 1;
    const nextYear = nextMonth > 11 ? refYear + 1 : refYear;
    const normalizedMonth = nextMonth % 12;
    const daysInNextMonth = new Date(nextYear, normalizedMonth + 1, 0).getDate();
    const actualCutoffDayNextMonth = Math.min(card.billingCutoffDay, daysInNextMonth);
    cutoffDate = new Date(nextYear, normalizedMonth, actualCutoffDayNextMonth, 0, 0, 0, 0);
  }

  // Calculate difference in whole calendar days:
  const diffMs = cutoffDate.getTime() - todayZero.getTime();
  const daysUntilCutoff = Math.round(diffMs / (1000 * 60 * 60 * 24));

  // Alert condition: 0 to 3 days before cutoff (แจ้งเตือนล่วงหน้า 3 วันก่อนถึงวันตัดรอบบิล)
  const isNearCutoff = daysUntilCutoff >= 0 && daysUntilCutoff <= 3;

  let label = '';
  if (daysUntilCutoff === 0) {
    label = 'ตัดรอบบิลวันนี้!';
  } else if (daysUntilCutoff === 1) {
    label = 'ตัดรอบพรุ่งนี้ (อีก 1 วัน)';
  } else if (daysUntilCutoff === 2) {
    label = 'อีก 2 วันตัดรอบบิล';
  } else if (daysUntilCutoff === 3) {
    label = 'อีก 3 วันตัดรอบบิล';
  } else {
    label = `อีก ${daysUntilCutoff} วันตัดรอบ`;
  }

  const cutoffDateStr = `${cutoffDate.getFullYear()}-${String(cutoffDate.getMonth() + 1).padStart(2, '0')}-${String(cutoffDate.getDate()).padStart(2, '0')}`;

  return {
    cardId: card.id,
    isNearCutoff,
    daysUntilCutoff,
    cutoffDate,
    cutoffDateStr,
    label,
  };
};

/**
 * Computes a map of cardId -> CardCutoffAlertStatus for all cards
 */
export const calculateAllCardsCutoffAlerts = (
  cards: CreditCard[],
  referenceDate: Date = new Date()
): Map<string, CardCutoffAlertStatus> => {
  const map = new Map<string, CardCutoffAlertStatus>();
  cards.forEach((card) => {
    map.set(card.id, calculateCardCutoffAlertStatus(card, referenceDate));
  });
  return map;
};

export const formatThaiCurrency = (amount: number): string => {
  return new Intl.NumberFormat('th-TH', {
    style: 'currency',
    currency: 'THB',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
};

export const formatThaiDate = (dateStr: string): string => {
  if (!dateStr) return '';
  const [year, month, day] = dateStr.split('-');
  const thaiYear = parseInt(year, 10) + 543;
  const monthNames = [
    'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
    'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.',
  ];
  const mIndex = parseInt(month, 10) - 1;
  return `${parseInt(day, 10)} ${monthNames[mIndex] || month} ${thaiYear}`;
};

export const formatThaiMonth = (monthStr: string): string => {
  if (!monthStr) return '';
  const [year, month] = monthStr.split('-');
  const thaiYear = parseInt(year, 10) + 543;
  const fullMonths = [
    'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
    'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม',
  ];
  const mIndex = parseInt(month, 10) - 1;
  return `${fullMonths[mIndex] || month} ${thaiYear}`;
};

export const calculateMonthlyStats = (
  transactions: Transaction[],
  monthStr: string,
  cards?: CreditCard[]
): MonthlyStats => {
  const filtered = transactions.filter((t) => {
    if (cards && isFutureInstallmentHidden(t, cards)) return false;
    const txCycle = cards ? getTransactionBillingCycleMonth(t, cards) : t.billingCycleMonth;
    return txCycle === monthStr;
  });

  let totalSpent = 0;
  let totalPaid = 0;
  let totalPending = 0;
  const categoryBreakdown: { [category in TransactionCategory]?: number } = {};
  const cardBreakdown: { [cardId: string]: number } = {};

  filtered.forEach((t) => {
    const charge = t.isInstallment && t.monthlyInstallmentAmount ? t.monthlyInstallmentAmount : t.amount;
    totalSpent += charge;

    if (t.isPaid) {
      totalPaid += charge;
    } else {
      totalPending += charge;
    }

    categoryBreakdown[t.category] = (categoryBreakdown[t.category] || 0) + charge;
    cardBreakdown[t.cardId] = (cardBreakdown[t.cardId] || 0) + charge;
  });

  return {
    month: monthStr,
    totalSpent,
    totalDue: totalPending,
    totalPaid,
    totalPending,
    categoryBreakdown,
    cardBreakdown,
  };
};

export interface HistoricalTrendItem {
  month: string;
  monthLabel: string;
  totalSpent: number;
  totalPaid: number;
  totalPending: number;
  txCount: number;
  installmentAmount: number;
}

export interface HistoricalDashboardData {
  timeframe: '3m' | '6m' | '12m' | 'all';
  selectedMonths: string[];
  trends: HistoricalTrendItem[];
  totalSpent: number;
  totalPaid: number;
  totalPending: number;
  avgMonthlySpent: number;
  highestMonth: { month: string; amount: number } | null;
  lowestMonth: { month: string; amount: number } | null;
  topCategories: { category: TransactionCategory; amount: number; percentage: number }[];
  cardSpending: { cardId: string; amount: number; percentage: number }[];
  momGrowth: number | null; // % change between latest 2 months
  totalTxCount: number;
}

export const calculateHistoricalDashboard = (
  transactions: Transaction[],
  allMonths: string[], // sorted descending e.g. ["2026-10", "2026-09", ...]
  timeframe: '3m' | '6m' | '12m' | 'all',
  cards?: CreditCard[]
): HistoricalDashboardData => {
  let targetMonths: string[];
  if (timeframe === '3m') {
    targetMonths = allMonths.slice(0, 3);
  } else if (timeframe === '6m') {
    targetMonths = allMonths.slice(0, 6);
  } else if (timeframe === '12m') {
    targetMonths = allMonths.slice(0, 12);
  } else {
    targetMonths = [...allMonths];
  }

  // Reverse so trends are chronological (older -> newer) for bar/trend visualization
  const chronologicalMonths = [...targetMonths].reverse();

  let totalSpent = 0;
  let totalPaid = 0;
  let totalPending = 0;
  let totalTxCount = 0;
  const categoryTotals: { [cat in TransactionCategory]?: number } = {};
  const cardTotals: { [cardId: string]: number } = {};

  const trends: HistoricalTrendItem[] = chronologicalMonths.map((m) => {
    const monthTxs = transactions.filter((t) => {
      if (cards && isFutureInstallmentHidden(t, cards)) return false;
      const txCycle = cards ? getTransactionBillingCycleMonth(t, cards) : t.billingCycleMonth;
      return txCycle === m;
    });
    let mSpent = 0;
    let mPaid = 0;
    let mPending = 0;
    let mInstallment = 0;

    monthTxs.forEach((t) => {
      const charge = t.isInstallment && t.monthlyInstallmentAmount ? t.monthlyInstallmentAmount : t.amount;
      mSpent += charge;
      if (t.isPaid) {
        mPaid += charge;
      } else {
        mPending += charge;
      }
      if (t.isInstallment) {
        mInstallment += charge;
      }

      categoryTotals[t.category] = (categoryTotals[t.category] || 0) + charge;
      cardTotals[t.cardId] = (cardTotals[t.cardId] || 0) + charge;
    });

    totalSpent += mSpent;
    totalPaid += mPaid;
    totalPending += mPending;
    totalTxCount += monthTxs.length;

    const [year, month] = m.split('-');
    const thaiShortMonths = [
      'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
      'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.',
    ];
    const monthLabel = `${thaiShortMonths[parseInt(month, 10) - 1]} '${(parseInt(year, 10) + 543).toString().slice(-2)}`;

    return {
      month: m,
      monthLabel,
      totalSpent: mSpent,
      totalPaid: mPaid,
      totalPending: mPending,
      txCount: monthTxs.length,
      installmentAmount: mInstallment,
    };
  });

  const activeMonthCount = Math.max(1, targetMonths.length);
  const avgMonthlySpent = Math.round(totalSpent / activeMonthCount);

  // Highest and lowest spending months
  let highestMonth: { month: string; amount: number } | null = null;
  let lowestMonth: { month: string; amount: number } | null = null;

  trends.forEach((item) => {
    if (!highestMonth || item.totalSpent > highestMonth.amount) {
      highestMonth = { month: item.month, amount: item.totalSpent };
    }
    if (!lowestMonth || (item.totalSpent > 0 && item.totalSpent < lowestMonth.amount)) {
      lowestMonth = { month: item.month, amount: item.totalSpent };
    }
  });

  // Top categories sorted
  const topCategories = (Object.keys(categoryTotals) as TransactionCategory[])
    .map((cat) => ({
      category: cat,
      amount: categoryTotals[cat] || 0,
      percentage: totalSpent > 0 ? Math.round(((categoryTotals[cat] || 0) / totalSpent) * 100) : 0,
    }))
    .filter((c) => c.amount > 0)
    .sort((a, b) => b.amount - a.amount);

  // Card spending sorted
  const cardSpending = Object.keys(cardTotals)
    .map((cId) => ({
      cardId: cId,
      amount: cardTotals[cId] || 0,
      percentage: totalSpent > 0 ? Math.round(((cardTotals[cId] || 0) / totalSpent) * 100) : 0,
    }))
    .sort((a, b) => b.amount - a.amount);

  // Month-over-month change for latest 2 months in targetMonths
  let momGrowth: number | null = null;
  if (targetMonths.length >= 2) {
    const latestMonth = targetMonths[0]; // e.g. 2026-10
    const prevMonth = targetMonths[1]; // e.g. 2026-09
    const latestSpent = trends.find((t) => t.month === latestMonth)?.totalSpent || 0;
    const prevSpent = trends.find((t) => t.month === prevMonth)?.totalSpent || 0;
    if (prevSpent > 0) {
      momGrowth = Math.round(((latestSpent - prevSpent) / prevSpent) * 100);
    }
  }

  return {
    timeframe,
    selectedMonths: targetMonths,
    trends,
    totalSpent,
    totalPaid,
    totalPending,
    avgMonthlySpent,
    highestMonth,
    lowestMonth,
    topCategories,
    cardSpending,
    momGrowth,
    totalTxCount,
  };
};

/**
 * Common everyday expense presets for quick entry
 */
export interface FrequentExpensePreset {
  title: string;
  category: TransactionCategory;
  defaultTag?: string;
  group: 'convenience' | 'food' | 'transport' | 'shopping' | 'bills' | 'health' | 'entertainment';
  groupLabel: string;
}

export const FREQUENT_EXPENSE_PRESETS: FrequentExpensePreset[] = [
  // ร้านสะดวกซื้อ / ซูเปอร์มาร์เก็ต
  { title: '7-Eleven', category: 'supermarket', defaultTag: 'จำเป็น (Essential)', group: 'convenience', groupLabel: 'ซูเปอร์ & มินิมาร์ท' },
  { title: 'Tops Supermarket', category: 'supermarket', defaultTag: 'ของใช้ (Groceries)', group: 'convenience', groupLabel: 'ซูเปอร์ & มินิมาร์ท' },
  { title: 'Lotus\'s / Go Fresh', category: 'supermarket', defaultTag: 'ของใช้ (Groceries)', group: 'convenience', groupLabel: 'ซูเปอร์ & มินิมาร์ท' },
  { title: 'Big C Supercenter', category: 'supermarket', defaultTag: 'ของใช้ (Groceries)', group: 'convenience', groupLabel: 'ซูเปอร์ & มินิมาร์ท' },
  { title: 'Gourmet Market', category: 'supermarket', defaultTag: 'ของใช้ (Groceries)', group: 'convenience', groupLabel: 'ซูเปอร์ & มินิมาร์ท' },
  { title: 'CJ MORE / Express', category: 'supermarket', defaultTag: 'จำเป็น (Essential)', group: 'convenience', groupLabel: 'ซูเปอร์ & มินิมาร์ท' },

  // อาหาร & เครื่องดื่ม
  { title: 'Grab Food / Lineman', category: 'food', defaultTag: 'อาหาร (Dining)', group: 'food', groupLabel: 'อาหาร & เครื่องดื่ม' },
  { title: 'Starbucks / ชา กาแฟ', category: 'food', defaultTag: 'อาหาร (Dining)', group: 'food', groupLabel: 'อาหาร & เครื่องดื่ม' },
  { title: 'ทานอาหารนอกบ้าน / ร้านอาหาร', category: 'food', defaultTag: 'ครอบครัว (Family)', group: 'food', groupLabel: 'อาหาร & เครื่องดื่ม' },
  { title: 'สุกี้ตี๋น้อย / บุฟเฟต์ ชาบู', category: 'food', defaultTag: 'ฟุ่มเฟือย (Discretionary)', group: 'food', groupLabel: 'อาหาร & เครื่องดื่ม' },
  { title: 'MK Restaurants', category: 'food', defaultTag: 'ครอบครัว (Family)', group: 'food', groupLabel: 'อาหาร & เครื่องดื่ม' },
  { title: 'ข้าวกลางวัน / ฟู้ดคอร์ท', category: 'food', defaultTag: 'จำเป็น (Essential)', group: 'food', groupLabel: 'อาหาร & เครื่องดื่ม' },

  // ยานพาหนะ & เดินทาง
  { title: 'เติมน้ำมัน PTT Station', category: 'transport', defaultTag: 'จำเป็น (Essential)', group: 'transport', groupLabel: 'เดินทาง & น้ำมัน' },
  { title: 'เติมน้ำมัน บางจาก / Shell', category: 'transport', defaultTag: 'จำเป็น (Essential)', group: 'transport', groupLabel: 'เดินทาง & น้ำมัน' },
  { title: 'ทางด่วน Easy Pass / M-Flow', category: 'transport', defaultTag: 'จำเป็น (Essential)', group: 'transport', groupLabel: 'เดินทาง & น้ำมัน' },
  { title: 'รถไฟฟ้า BTS / MRT', category: 'transport', defaultTag: 'จำเป็น (Essential)', group: 'transport', groupLabel: 'เดินทาง & น้ำมัน' },
  { title: 'Grab Car / Taxi', category: 'transport', defaultTag: 'งาน/ธุรกิจ (Work)', group: 'transport', groupLabel: 'เดินทาง & น้ำมัน' },

  // บิล & ค่าใช้จ่ายประจำ
  { title: 'ค่าไฟฟ้านครหลวง / กฟภ.', category: 'bills', defaultTag: 'จำเป็น (Essential)', group: 'bills', groupLabel: 'บิล & ค่าใช้จ่ายประจำ' },
  { title: 'ค่าน้ำประปา', category: 'bills', defaultTag: 'จำเป็น (Essential)', group: 'bills', groupLabel: 'บิล & ค่าใช้จ่ายประจำ' },
  { title: 'ค่าเน็ตบ้าน / มือถือ (AIS/TRUE)', category: 'bills', defaultTag: 'จำเป็น (Essential)', group: 'bills', groupLabel: 'บิล & ค่าใช้จ่ายประจำ' },
  { title: 'ค่าเบี้ยประกันชีวิต / สุขภาพ', category: 'bills', defaultTag: 'ลดหย่อนภาษี (Tax)', group: 'bills', groupLabel: 'บิล & ค่าใช้จ่ายประจำ' },
  { title: 'ค่าส่วนกลางคอนโด / หมู่บ้าน', category: 'bills', defaultTag: 'จำเป็น (Essential)', group: 'bills', groupLabel: 'บิล & ค่าใช้จ่ายประจำ' },

  // ช้อปปิ้ง & สินค้า
  { title: 'Shopee', category: 'shopping', defaultTag: 'ช้อปปิ้ง (Shopping)', group: 'shopping', groupLabel: 'ช้อปปิ้ง & สินค้า' },
  { title: 'Lazada', category: 'shopping', defaultTag: 'ช้อปปิ้ง (Shopping)', group: 'shopping', groupLabel: 'ช้อปปิ้ง & สินค้า' },
  { title: 'Uniqlo', category: 'shopping', defaultTag: 'ช้อปปิ้ง (Shopping)', group: 'shopping', groupLabel: 'ช้อปปิ้ง & สินค้า' },
  { title: 'IKEA / HomePro', category: 'shopping', defaultTag: 'ครอบครัว (Family)', group: 'shopping', groupLabel: 'ช้อปปิ้ง & สินค้า' },
  { title: 'Apple Store / Gadgets', category: 'shopping', defaultTag: 'งาน/ธุรกิจ (Work)', group: 'shopping', groupLabel: 'ช้อปปิ้ง & สินค้า' },

  // บันเทิง & สตรีมมิ่ง
  { title: 'Netflix', category: 'entertainment', defaultTag: 'ฟุ่มเฟือย (Discretionary)', group: 'entertainment', groupLabel: 'บันเทิง & บริการ' },
  { title: 'YouTube Premium', category: 'entertainment', defaultTag: 'ฟุ่มเฟือย (Discretionary)', group: 'entertainment', groupLabel: 'บันเทิง & บริการ' },
  { title: 'Spotify / Apple Music', category: 'entertainment', defaultTag: 'ฟุ่มเฟือย (Discretionary)', group: 'entertainment', groupLabel: 'บันเทิง & บริการ' },
  { title: 'Major Cineplex / ตั๋วหนัง', category: 'entertainment', defaultTag: 'ฟุ่มเฟือย (Discretionary)', group: 'entertainment', groupLabel: 'บันเทิง & บริการ' },

  // สุขภาพ & ยา
  { title: 'Watson / Boots', category: 'health', defaultTag: 'สุขภาพ (Health)', group: 'health', groupLabel: 'สุขภาพ & ความงาม' },
  { title: 'ค่ายา / ร้านขายยา', category: 'health', defaultTag: 'จำเป็น (Essential)', group: 'health', groupLabel: 'สุขภาพ & ความงาม' },
  { title: 'ตรวจสุขภาพ / คลินิก / โรงพยาบาล', category: 'health', defaultTag: 'สุขภาพ (Health)', group: 'health', groupLabel: 'สุขภาพ & ความงาม' },
];

export interface FrequentUserItem {
  title: string;
  category: TransactionCategory;
  count: number;
  tags?: string[];
}

/**
 * Extracts top frequently used titles from existing transactions
 */
export const getFrequentlyUsedTitlesFromHistory = (
  transactions: Transaction[],
  limit: number = 8
): FrequentUserItem[] => {
  const map = new Map<
    string,
    { title: string; count: number; category: TransactionCategory; tags?: string[]; lastDate: string }
  >();

  // Sort chronologically so later transactions keep the most up-to-date category/tags
  const sorted = [...transactions].sort((a, b) => (a.date || '').localeCompare(b.date || ''));

  sorted.forEach((tx) => {
    // Exclude installment transactions completely (รายการผ่อนไม่นับรวมและไม่โชว์ให้เลือก)
    if (
      tx.isInstallment ||
      (tx.totalInstallments && tx.totalInstallments > 1) ||
      tx.installmentGroupId ||
      tx.title.includes('(งวดที่') ||
      /\(งวดที่.*?\)/.test(tx.title)
    ) {
      return;
    }

    const cleanTitle = tx.title.trim();
    if (!cleanTitle) return;
    const lowerKey = cleanTitle.toLowerCase();
    const existing = map.get(lowerKey);
    if (existing) {
      existing.count += 1;
      existing.title = cleanTitle;
      existing.category = tx.category;
      if (tx.tags && tx.tags.length > 0) {
        existing.tags = tx.tags;
      }
      existing.lastDate = tx.date || existing.lastDate;
    } else {
      map.set(lowerKey, {
        title: cleanTitle,
        count: 1,
        category: tx.category,
        tags: tx.tags,
        lastDate: tx.date || '',
      });
    }
  });

  return Array.from(map.values())
    .map((data) => ({
      title: data.title,
      category: data.category,
      count: data.count,
      tags: data.tags,
    }))
    .sort((a, b) => {
      if (b.count !== a.count) {
        return b.count - a.count;
      }
      return a.title.localeCompare(b.title);
    })
    .slice(0, limit);
};

/**
 * Determines whether an installment transaction is for a cycle after the current month
 * and has not yet reached that cycle's statement cut-off date.
 *
 * Rules:
 * 1. Non-installment transactions are never hidden.
 * 2. If it is an installment:
 *    - Check if its billingCycleMonth is strictly after the current month.
 *    - If cycle > currentMonth: check if today has passed the card's cutoff date for that cycle.
 *    - If today <= cutoff date, it is HIDDEN from the credit card spending list (TransactionList).
 *    - Once today > cutoff date, it is revealed in the list.
 * 3. In the all-installments table (InstallmentPlansModal), it is always displayed.
 */
export const isFutureInstallmentHidden = (
  tx: Transaction,
  cards: CreditCard[],
  referenceDate: Date = new Date()
): boolean => {
  if (!tx.isInstallment) return false;

  const refYear = referenceDate.getFullYear();
  const refMonth = referenceDate.getMonth() + 1; // 1-12
  const currentMonthStr = `${refYear}-${String(refMonth).padStart(2, '0')}`;

  const cycleMonth = tx.billingCycleMonth || (tx.date ? tx.date.slice(0, 7) : currentMonthStr);

  // If this installment belongs to current month or past months, it is not a future installment
  if (cycleMonth <= currentMonthStr) {
    return false;
  }

  // Find the corresponding card to get the statement cut-off day
  const card = cards.find((c) => c.id === tx.cardId);
  const cutoffDay = card ? card.billingCutoffDay : 15;

  const [cycleYearStr, cycleMonthNumStr] = cycleMonth.split('-');
  const cycleYear = parseInt(cycleYearStr, 10);
  const cycleMonthNum = parseInt(cycleMonthNumStr, 10);

  // Days in that cycle month
  const daysInCycleMonth = new Date(cycleYear, cycleMonthNum, 0).getDate();
  const actualCutoffDay = Math.min(cutoffDay, daysInCycleMonth);

  // Statement cut-off timestamp for that specific cycle (end of that day: 23:59:59.999)
  const cutoffTimestamp = new Date(
    cycleYear,
    cycleMonthNum - 1,
    actualCutoffDay,
    23,
    59,
    59,
    999
  ).getTime();

  // If today is past that cycle's statement cut-off, it is no longer hidden
  return referenceDate.getTime() <= cutoffTimestamp;
};

/**
 * Computes exact statement cycle start, cut-off end, and payment due dates for a given card and cycle month.
 */
export const getCardBillingCyclePeriod = (
  card: CreditCard,
  cycleMonthStr: string
): {
  startDateStr: string;
  endDateStr: string;
  periodLabel: string;
  dueDateStr: string;
  dueDateLabel: string;
  cutoffDayLabel: string;
} => {
  const [yearStr, monthStr] = cycleMonthStr.split('-');
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10); // 1-12

  // Cut-off date in target month (cycle month)
  const daysInTargetMonth = new Date(year, month, 0).getDate();
  const actualCutoffDay = Math.min(card.billingCutoffDay, daysInTargetMonth);
  const endDate = new Date(year, month - 1, actualCutoffDay);

  // Previous month cut-off date
  let prevYear = year;
  let prevMonth = month - 1;
  if (prevMonth < 1) {
    prevMonth = 12;
    prevYear -= 1;
  }
  const daysInPrevMonth = new Date(prevYear, prevMonth, 0).getDate();
  const actualPrevCutoffDay = Math.min(card.billingCutoffDay, daysInPrevMonth);
  const prevCutoffDate = new Date(prevYear, prevMonth - 1, actualPrevCutoffDay);

  // Cycle start date is 1 day after previous month's cut-off
  const startDate = new Date(prevCutoffDate);
  startDate.setDate(startDate.getDate() + 1);

  // Payment due date:
  // If paymentDueDay < billingCutoffDay: due in next month relative to cycle cut-off month
  // Else: due in same month
  let dueYear = year;
  let dueMonth = month;
  if (card.paymentDueDay < card.billingCutoffDay) {
    dueMonth += 1;
    if (dueMonth > 12) {
      dueMonth = 1;
      dueYear += 1;
    }
  }
  const daysInDueMonth = new Date(dueYear, dueMonth, 0).getDate();
  const actualDueDay = Math.min(card.paymentDueDay, daysInDueMonth);
  const dueDate = new Date(dueYear, dueMonth - 1, actualDueDay);

  const pad = (n: number) => String(n).padStart(2, '0');
  const toIso = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

  const startDateStr = toIso(startDate);
  const endDateStr = toIso(endDate);
  const dueDateStr = toIso(dueDate);

  const thaiShortMonths = [
    'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
    'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.',
  ];
  const thaiShortYear = (y: number) => (y + 543).toString().slice(-2);

  const startLabel = `${startDate.getDate()} ${thaiShortMonths[startDate.getMonth()]}`;
  const endLabel = `${endDate.getDate()} ${thaiShortMonths[endDate.getMonth()]} '${thaiShortYear(endDate.getFullYear())}`;
  const periodLabel = `${startLabel} - ${endLabel}`;
  const dueDateLabel = `${dueDate.getDate()} ${thaiShortMonths[dueDate.getMonth()]} '${thaiShortYear(dueDate.getFullYear())}`;
  const cutoffDayLabel = `ตัดรอบทุกวันที่ ${card.billingCutoffDay}`;

  return {
    startDateStr,
    endDateStr,
    periodLabel,
    dueDateStr,
    dueDateLabel,
    cutoffDayLabel,
  };
};

/**
 * Calculates per-card spending and payment details for a specific monthly billing cycle.
 * Incorporates each card's individual cut-off date and due date, aggregating into the month.
 */
export const getMonthlyCardBillingDetails = (
  cards: CreditCard[],
  transactions: Transaction[],
  cycleMonth: string
): CardMonthlyBillingDetail[] => {
  return cards.map((card) => {
    const cyclePeriod = getCardBillingCyclePeriod(card, cycleMonth);

    // Filter transactions for this card that fall into this billing cycle and are not hidden
    const cardTxs = transactions.filter((t) => {
      if (t.cardId !== card.id) return false;
      if (isFutureInstallmentHidden(t, cards)) return false;
      const txCycle = getTransactionBillingCycleMonth(t, cards);
      return txCycle === cycleMonth;
    });

    let totalSpent = 0;
    let totalPaid = 0;
    let totalPending = 0;
    let installmentCount = 0;
    let installmentAmount = 0;

    cardTxs.forEach((t) => {
      const charge = t.isInstallment && t.monthlyInstallmentAmount
        ? t.monthlyInstallmentAmount
        : t.amount;
      totalSpent += charge;

      if (t.isPaid) {
        totalPaid += charge;
      } else {
        totalPending += charge;
      }

      if (t.isInstallment) {
        installmentCount += 1;
        installmentAmount += charge;
      }
    });

    const isPaid = cardTxs.length > 0 ? cardTxs.every((t) => t.isPaid) : true;

    return {
      card,
      cycleMonth,
      cyclePeriod,
      totalSpent,
      totalPaid,
      totalPending,
      txCount: cardTxs.length,
      installmentCount,
      installmentAmount,
      isPaid,
      transactions: cardTxs,
    };
  });
};


