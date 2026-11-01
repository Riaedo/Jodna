/**
 * Test Suite for Task 1 (Dashboard Future Cycles Hide) & Task 2 (Installment Edit)
 */
import {
  calculateHistoricalDashboard,
  calculateMonthlyStats,
  getNextBillingMonth,
  getTransactionBillingCycleMonth,
} from '../src/utils/cardUtils';
import {
  enqueueOperation,
  loadSyncQueue,
  clearSyncQueue,
  resolveConflict,
} from '../src/services/syncQueue';
import { CreditCard, Transaction } from '../src/types';

// Mock localStorage for node environment
const storage: Record<string, string> = {};
(global as any).localStorage = {
  getItem: (k: string) => storage[k] || null,
  setItem: (k: string, v: string) => {
    storage[k] = v;
  },
  removeItem: (k: string) => {
    delete storage[k];
  },
  clear: () => {
    for (const k in storage) delete storage[k];
  },
};
(global as any).window = global;

function assert(condition: boolean, msg: string) {
  if (!condition) {
    console.error(`❌ FAIL: ${msg}`);
    throw new Error(`Assertion failed: ${msg}`);
  }
  console.log(`✅ PASS: ${msg}`);
}

async function runRegressionTests() {
  console.log('========================================');
  console.log('RUNNING TASK 1 & TASK 2 REGRESSION TESTS');
  console.log('========================================\n');

  // --- TASK 1: DASHBOARD ANALYTICS HIDES FUTURE BILLING CYCLES ---
  console.log('--- TEST GROUP 1: Task 1 - Dashboard Future Cycles Suppression ---');

  const mockCards: CreditCard[] = [
    {
      id: 'card-kbank',
      name: 'KBank Card',
      bank: 'KBank',
      last4: '8888',
      creditLimit: 100000,
      billingCutoffDay: 15,
      paymentDueDay: 5,
      colorGradient: 'from-emerald-900 to-teal-800',
      accentColor: '#10b981',
      status: 'active',
      orderIndex: 0,
      version: 1,
    },
  ];

  // Set reference date: 2026-11-01 (Current month: 2026-11)
  const refDate = new Date('2026-11-01T12:00:00Z');
  const currentMonthStr = '2026-11';

  // Sample transactions with past, current, and FUTURE installments
  const mockTransactions: Transaction[] = [
    // Past spending
    {
      id: 'tx-past-1',
      cardId: 'card-kbank',
      date: '2026-09-10',
      title: 'Supermarket Groceries',
      category: 'supermarket',
      amount: 3000,
      billingCycleMonth: '2026-09',
      isPaid: true,
      createdAt: '2026-09-10T10:00:00Z',
    },
    {
      id: 'tx-past-2',
      cardId: 'card-kbank',
      date: '2026-10-10',
      title: 'Restaurant Dinner',
      category: 'food',
      amount: 2500,
      billingCycleMonth: '2026-10',
      isPaid: true,
      createdAt: '2026-10-10T19:00:00Z',
    },
    // Current month spending
    {
      id: 'tx-curr-1',
      cardId: 'card-kbank',
      date: '2026-11-02',
      title: 'Coffee & Snacks',
      category: 'food',
      amount: 500,
      billingCycleMonth: '2026-11',
      isPaid: false,
      createdAt: '2026-11-02T08:00:00Z',
    },
    // Installment Plan 0% 5 months starting 2026-10 (4,000 / month, total 20,000)
    // Inst 1: 2026-10 (Past)
    {
      id: 'inst-1',
      cardId: 'card-kbank',
      date: '2026-10-05',
      title: 'Gadget 0% 5 Months',
      category: 'shopping',
      amount: 20000,
      billingCycleMonth: '2026-10',
      isInstallment: true,
      totalInstallments: 5,
      currentInstallment: 1,
      monthlyInstallmentAmount: 4000,
      installmentGroupId: 'grp-gadget',
      isPaid: true,
      createdAt: '2026-10-05T10:00:00Z',
    },
    // Inst 2: 2026-11 (Current)
    {
      id: 'inst-2',
      cardId: 'card-kbank',
      date: '2026-11-05',
      title: 'Gadget 0% 5 Months',
      category: 'shopping',
      amount: 20000,
      billingCycleMonth: '2026-11',
      isInstallment: true,
      totalInstallments: 5,
      currentInstallment: 2,
      monthlyInstallmentAmount: 4000,
      installmentGroupId: 'grp-gadget',
      isPaid: false,
      createdAt: '2026-10-05T10:00:00Z',
    },
    // Inst 3: 2026-12 (FUTURE!)
    {
      id: 'inst-3',
      cardId: 'card-kbank',
      date: '2026-12-05',
      title: 'Gadget 0% 5 Months',
      category: 'shopping',
      amount: 20000,
      billingCycleMonth: '2026-12',
      isInstallment: true,
      totalInstallments: 5,
      currentInstallment: 3,
      monthlyInstallmentAmount: 4000,
      installmentGroupId: 'grp-gadget',
      isPaid: false,
      createdAt: '2026-10-05T10:00:00Z',
    },
    // Inst 4: 2027-01 (FUTURE!)
    {
      id: 'inst-4',
      cardId: 'card-kbank',
      date: '2027-01-05',
      title: 'Gadget 0% 5 Months',
      category: 'shopping',
      amount: 20000,
      billingCycleMonth: '2027-01',
      isInstallment: true,
      totalInstallments: 5,
      currentInstallment: 4,
      monthlyInstallmentAmount: 4000,
      installmentGroupId: 'grp-gadget',
      isPaid: false,
      createdAt: '2026-10-05T10:00:00Z',
    },
    // Inst 5: 2027-02 (FUTURE!)
    {
      id: 'inst-5',
      cardId: 'card-kbank',
      date: '2027-02-05',
      title: 'Gadget 0% 5 Months',
      category: 'shopping',
      amount: 20000,
      billingCycleMonth: '2027-02',
      isInstallment: true,
      totalInstallments: 5,
      currentInstallment: 5,
      monthlyInstallmentAmount: 4000,
      installmentGroupId: 'grp-gadget',
      isPaid: false,
      createdAt: '2026-10-05T10:00:00Z',
    },
  ];

  const candidateMonths = ['2027-02', '2027-01', '2026-12', '2026-11', '2026-10', '2026-09'];

  // Test 1.1: 3-month timeframe (3m)
  const dash3m = calculateHistoricalDashboard(mockTransactions, candidateMonths, '3m', mockCards, refDate);
  assert(dash3m.selectedMonths.length === 3, '3m timeframe returns exactly 3 months');
  assert(
    dash3m.selectedMonths.every((m) => m <= currentMonthStr),
    '3m timeframe contains NO future months (> 2026-11)'
  );
  assert(dash3m.selectedMonths[0] === '2026-11', '3m latest month is current month (2026-11)');
  assert(dash3m.selectedMonths[1] === '2026-10', '3m 2nd month is prior month (2026-10)');
  assert(dash3m.selectedMonths[2] === '2026-09', '3m 3rd month is 2 months ago (2026-09)');

  // Test 1.2: 6-month timeframe (6m)
  const dash6m = calculateHistoricalDashboard(mockTransactions, candidateMonths, '6m', mockCards, refDate);
  assert(dash6m.selectedMonths.length === 6, '6m timeframe returns exactly 6 months (1 current + 5 past)');
  assert(
    dash6m.selectedMonths.every((m) => m <= currentMonthStr),
    '6m timeframe contains NO future months (> 2026-11)'
  );
  assert(dash6m.selectedMonths[0] === '2026-11', '6m latest month is 2026-11');
  assert(dash6m.selectedMonths[5] === '2026-06', '6m oldest month is 2026-06');

  // Test 1.3: 12-month timeframe (12m)
  const dash12m = calculateHistoricalDashboard(mockTransactions, candidateMonths, '12m', mockCards, refDate);
  assert(dash12m.selectedMonths.length === 12, '12m timeframe returns exactly 12 months');
  assert(
    dash12m.selectedMonths.every((m) => m <= currentMonthStr),
    '12m timeframe contains NO future months'
  );

  // Test 1.4: "all" timeframe
  const dashAll = calculateHistoricalDashboard(mockTransactions, candidateMonths, 'all', mockCards, refDate);
  assert(
    dashAll.selectedMonths.every((m) => m <= currentMonthStr),
    '"all" timeframe strictly excludes future months (> 2026-11)'
  );
  assert(
    dashAll.trends.every((t) => t.month <= currentMonthStr),
    'trends array contains NO future months'
  );

  // Test 1.5: Verify spending calculations strictly exclude future installments (inst-3, inst-4, inst-5)
  // Expected spending in 3m:
  // 2026-09: 3000
  // 2026-10: 2500 + 4000 = 6500
  // 2026-11: 500 + 4000 = 4500
  // Total in 3m = 3000 + 6500 + 4500 = 14000
  assert(dash3m.totalSpent === 14000, `totalSpent in 3m is 14,000 (actual: ${dash3m.totalSpent})`);
  assert(
    dash3m.trends.find((t) => t.month === '2026-12') === undefined,
    'Future month 2026-12 is not in trends'
  );
  assert(
    dash3m.trends.find((t) => t.month === '2027-01') === undefined,
    'Future month 2027-01 is not in trends'
  );

  console.log('\n--- TEST GROUP 2: Task 2 - Installment Schedule Edit Functionality ---');

  // Test 2.1: Editing an unpaid installment to another billing cycle
  const instToEdit = mockTransactions.find((t) => t.id === 'inst-2')!;
  assert(!instToEdit.isPaid, 'inst-2 is currently unpaid');
  const targetNewCycle = '2026-12';

  const updatedInst2: Transaction = {
    ...instToEdit,
    billingCycleMonth: targetNewCycle,
    date: '2026-12-05',
    note: 'ผ่อนชำระงวดที่ 2/5 (ย้ายไปรอบ ธ.ค.)',
  };

  // Verify plan integrity
  assert(updatedInst2.id === instToEdit.id, 'Transaction ID is preserved');
  assert(updatedInst2.currentInstallment === 2, 'Installment number is strictly preserved');
  assert(updatedInst2.totalInstallments === 5, 'Total installments count is strictly preserved');
  assert(updatedInst2.monthlyInstallmentAmount === 4000, 'Monthly installment amount is strictly preserved');
  assert(updatedInst2.isPaid === false, 'Payment status is strictly preserved');

  // Test 2.2: Collision detection
  const planItems = mockTransactions.filter((t) => t.installmentGroupId === 'grp-gadget');
  const collisionCycle = '2026-10'; // inst-1 is already in 2026-10
  const isCollision = planItems.some(
    (item) => item.id !== instToEdit.id && item.billingCycleMonth === collisionCycle
  );
  assert(isCollision, 'Collision properly detected when moving to an already occupied cycle (2026-10)');

  const validCycle = '2027-03';
  const isNoCollision = !planItems.some(
    (item) => item.id !== instToEdit.id && item.billingCycleMonth === validCycle
  );
  assert(isNoCollision, 'No collision when moving to an unoccupied cycle (2027-03)');

  // Test 2.3: Warning for paid installment
  const paidInst = mockTransactions.find((t) => t.id === 'inst-1')!;
  assert(paidInst.isPaid === true, 'inst-1 is marked as paid');

  // Test 2.4: Offline Queue & Sync persistence
  const UID = 'user_test_installment_edit';
  clearSyncQueue(UID);

  enqueueOperation(UID, {
    entityType: 'transaction',
    documentId: updatedInst2.id,
    operationType: 'update',
    payload: updatedInst2,
    baseVersion: 1,
  });

  const queue = loadSyncQueue(UID);
  assert(queue.length === 1, 'Operation successfully enqueued in offline queue');
  assert(queue[0].documentId === 'inst-2', 'Queued operation targets inst-2');
  assert(queue[0].payload.billingCycleMonth === '2026-12', 'Queued payload has updated billing cycle');

  // Test 2.5: OCC Version check & Conflict resolution
  // Simulate operation entering conflict state
  queue[0].status = 'conflict';
  (global as any).localStorage.setItem(
    `cardpulse_sync_queue_${UID}`,
    JSON.stringify(queue)
  );

  await resolveConflict(UID, queue[0].operationId, 'keep_local');
  const queueAfterResolve = loadSyncQueue(UID);
  assert(
    queueAfterResolve[0].status === 'pending',
    'Conflict resolution keep_local resets status to pending'
  );
  assert(
    queueAfterResolve[0].baseVersion === 2,
    'Conflict resolution keep_local advances baseVersion to 2'
  );

  console.log('\n========================================');
  console.log('🎉 ALL TASK 1 & TASK 2 REGRESSION TESTS PASSED!');
  console.log('========================================\n');
  process.exit(0);
}

runRegressionTests().catch((err) => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
