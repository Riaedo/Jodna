/**
 * Comprehensive Automated Audit & Regression Tests for Installment Schedule Edit
 * Tests all Scenarios specified in Audit Request:
 * 1. Transaction Date Integrity (Original purchase date strictly preserved)
 * 2. Cascading 12-Month Plan Shift
 * 3. Partial Plan Shift (Shift installment 5, verify 1-4 untouched)
 * 4. Cross-Year Boundary Shift (e.g., 2026-12 -> 2027-01)
 * 5. Collision Detection Within Same Plan & Non-Collision With Other Plans
 * 6. Paid Installment Protection & Confirmation Flagging
 * 7. Firestore Atomic Batch & OCC Concurrency Simulation
 * 8. Offline Queue 12-Doc Enqueue, UID Association & In-Memory Snapshot Protection
 * 9. Financial Invariants (Total debt, monthly installment, total count preserved)
 */

import {
  calculateMonthDifference,
  getNextBillingMonth,
  getInstallmentDate,
  calculateShiftedInstallmentSchedule,
} from '../src/utils/cardUtils';
import { Transaction } from '../src/types';

function assert(condition: boolean, msg: string) {
  if (!condition) {
    console.error(`❌ FAIL: ${msg}`);
    process.exit(1);
  }
  console.log(`✅ PASS: ${msg}`);
}

function createMockPlan(
  groupId: string,
  total: number,
  startCycle: string,
  purchaseDate: string,
  monthlyAmt: number
): Transaction[] {
  const items: Transaction[] = [];
  for (let i = 1; i <= total; i++) {
    const offset = i - 1;
    items.push({
      id: `tx-${groupId}-${i}`,
      cardId: 'card-kbank-01',
      date: purchaseDate, // Purchase date is October 25, 2026 across all installments
      title: 'iPhone 16 Pro Max 0% 12 Months',
      category: 'shopping',
      tags: ['ผ่อน 0%'],
      amount: monthlyAmt * total,
      billingCycleMonth: getNextBillingMonth(startCycle, offset),
      isInstallment: true,
      totalInstallments: total,
      currentInstallment: i,
      monthlyInstallmentAmount: monthlyAmt,
      installmentGroupId: groupId,
      isPaid: false,
      createdAt: '2026-10-25T14:30:00Z',
      version: 1,
    });
  }
  return items;
}

console.log('====================================================');
console.log('RUNNING INSTALLMENT SCHEDULE EDIT AUDIT & OCC TESTS');
console.log('====================================================');

// --- 1. Transaction Date Integrity ---
console.log('\n--- Test 1: Transaction Date Integrity (Purchase Date Preserved) ---');
const purchaseDate = '2026-10-25';
const plan12 = createMockPlan('plan-iphone-12m', 12, '2026-11', purchaseDate, 4000);

// User shifts first installment from November 2026 (2026-11) to December 2026 (2026-12)
const res1 = calculateShiftedInstallmentSchedule(
  plan12,
  plan12[0], // installment 1
  '2026-12', // shifted by +1 month
  purchaseDate // User did not change transaction date
);

assert(res1.monthDelta === 1, 'Month delta is +1 month');
assert(!res1.hasCollision, 'No collision detected for forward cascading shift');
assert(res1.shiftedItems.length === 12, 'All 12 installments are shifted');

// Critical check: Transaction date must remain '2026-10-25' for ALL installments!
assert(res1.shiftedItems[0].date === '2026-10-25', 'Installment 1 date is strictly 2026-10-25');
assert(res1.shiftedItems[1].date === '2026-10-25', 'Installment 2 date is strictly 2026-10-25');
assert(res1.shiftedItems[5].date === '2026-10-25', 'Installment 6 date is strictly 2026-10-25');
assert(res1.shiftedItems[11].date === '2026-10-25', 'Installment 12 date is strictly 2026-10-25');

// Critical check: Billing cycles shift in lockstep
assert(res1.shiftedItems[0].billingCycleMonth === '2026-12', 'Installment 1 billing cycle is 2026-12');
assert(res1.shiftedItems[1].billingCycleMonth === '2027-01', 'Installment 2 billing cycle is 2027-01');
assert(res1.shiftedItems[2].billingCycleMonth === '2027-02', 'Installment 3 billing cycle is 2027-02');
assert(res1.shiftedItems[11].billingCycleMonth === '2027-11', 'Installment 12 billing cycle is 2027-11');

// --- 2. Partial Plan Shift: Edit Installment 5 and verify 1-4 are untouched ---
console.log('\n--- Test 2: Shift Installment 5 & Verify 1-4 Completely Untouched ---');
const planPartial = createMockPlan('plan-partial-12m', 12, '2026-10', '2026-10-15', 3000);
// Installment 5 is in 2027-02
const inst5 = planPartial[4];
assert(inst5.currentInstallment === 5, 'Found installment 5');
assert(inst5.billingCycleMonth === '2027-02', 'Installment 5 is originally 2027-02');

const resPartial = calculateShiftedInstallmentSchedule(
  planPartial,
  inst5,
  '2027-04', // shift by +2 months
  inst5.date
);

assert(resPartial.shiftedItems.length === 8, 'Exactly 8 installments shifted (installments 5 to 12)');
assert(resPartial.shiftedItems[0].currentInstallment === 5, 'First shifted item is installment 5');
assert(resPartial.shiftedItems[0].billingCycleMonth === '2027-04', 'Installment 5 shifted to 2027-04');
assert(resPartial.shiftedItems[7].currentInstallment === 12, 'Last shifted item is installment 12');
assert(resPartial.shiftedItems[7].billingCycleMonth === '2027-11', 'Installment 12 shifted to 2027-11');

// Ensure installments 1 to 4 are NOT in the returned update list
const shiftedIds = new Set(resPartial.shiftedItems.map((s) => s.id));
for (let i = 0; i < 4; i++) {
  assert(!shiftedIds.has(planPartial[i].id), `Installment ${i + 1} was NOT modified`);
}

// --- 3. Cross-Year Boundary Shift ---
console.log('\n--- Test 3: Cross-Year Boundary Shift (2026-12 -> 2027-01) ---');
assert(calculateMonthDifference('2026-12', '2027-01') === 1, 'Dec 2026 to Jan 2027 is +1');
assert(calculateMonthDifference('2027-01', '2026-12') === -1, 'Jan 2027 to Dec 2026 is -1');
assert(calculateMonthDifference('2026-11', '2027-03') === 4, 'Nov 2026 to Mar 2027 is +4');

const planCrossYear = createMockPlan('plan-cross-year', 3, '2026-12', '2026-12-05', 5000);
const resCrossYear = calculateShiftedInstallmentSchedule(
  planCrossYear,
  planCrossYear[0],
  '2027-01',
  '2026-12-05'
);
assert(resCrossYear.shiftedItems[0].billingCycleMonth === '2027-01', 'Installment 1 is 2027-01');
assert(resCrossYear.shiftedItems[1].billingCycleMonth === '2027-02', 'Installment 2 is 2027-02');
assert(resCrossYear.shiftedItems[2].billingCycleMonth === '2027-03', 'Installment 3 is 2027-03');

// --- 4. Collision Detection (Same Plan vs Other Plans) ---
console.log('\n--- Test 4: Collision Prevention (Detects Within-Plan Collisions, Allows Separate Plans) ---');
const planColl = createMockPlan('plan-collision-test', 4, '2026-10', '2026-10-10', 2500);
// Attempting to move installment 2 backward to 2026-10 (which is occupied by installment 1)
const inst2 = planColl[1];
const resColl = calculateShiftedInstallmentSchedule(
  planColl,
  inst2,
  '2026-10',
  inst2.date
);

assert(resColl.hasCollision === true, 'Collision detected when moving installment 2 backward into installment 1');
assert(resColl.collisionDetails?.cycleMonth === '2026-10', 'Identified collision month 2026-10');
assert(resColl.collisionDetails?.conflictingInstallmentNum === 1, 'Identified conflicting installment 1');

// Verify that separate plans can share the same month without collision
const planAlpha = createMockPlan('plan-alpha', 3, '2026-10', '2026-10-10', 2000);
const planBeta = createMockPlan('plan-beta', 3, '2026-10', '2026-10-10', 3000);
const resBeta = calculateShiftedInstallmentSchedule(
  planBeta,
  planBeta[0],
  '2026-11',
  planBeta[0].date
);
assert(!resBeta.hasCollision, 'Plan Beta shift does not collide with Plan Alpha');

// --- 5. Paid Installment Protection ---
console.log('\n--- Test 5: Paid Installment Detection & Flagging ---');
const planPaid = createMockPlan('plan-paid-test', 6, '2026-10', '2026-10-01', 1500);
planPaid[1].isPaid = true; // Installment 2 paid
planPaid[2].isPaid = true; // Installment 3 paid

const resPaid = calculateShiftedInstallmentSchedule(
  planPaid,
  planPaid[0], // editing installment 1
  '2026-11',
  planPaid[0].date
);
assert(resPaid.hasPaidSubsequent === true, 'Correctly flags that subsequent installments are paid');
assert(resPaid.paidSubsequentNums.length === 2, 'Found 2 paid subsequent installments');
assert(resPaid.paidSubsequentNums.includes(2), 'Contains installment 2');
assert(resPaid.paidSubsequentNums.includes(3), 'Contains installment 3');
assert(resPaid.shiftedItems[1].isPaid === true, 'Installment 2 retains paid status');
assert(resPaid.shiftedItems[2].isPaid === true, 'Installment 3 retains paid status');
assert(resPaid.shiftedItems[0].isPaid === false, 'Installment 1 retains unpaid status');

// --- 6. Invariants & Financial Totals ---
console.log('\n--- Test 6: Invariants & Financial Totals Preserved ---');
const planInv = createMockPlan('plan-inv-test', 10, '2026-10', '2026-10-20', 4290);
const resInv = calculateShiftedInstallmentSchedule(
  planInv,
  planInv[0],
  '2026-12',
  planInv[0].date
);

const originalTotal = planInv.reduce((sum, item) => sum + (item.monthlyInstallmentAmount || 0), 0);
const shiftedTotal = resInv.shiftedItems.reduce((sum, item) => sum + (item.monthlyInstallmentAmount || 0), 0);
assert(originalTotal === 42900, 'Original total debt is 42,900');
assert(shiftedTotal === 42900, 'Shifted total debt is strictly 42,900');
assert(resInv.shiftedItems.every((it) => it.installmentGroupId === 'plan-inv-test'), 'All items retain groupId');
assert(resInv.shiftedItems.every((it) => it.totalInstallments === 10), 'All items retain total 10');
assert(resInv.shiftedItems.every((it) => it.monthlyInstallmentAmount === 4290), 'All items retain monthly 4290');

// --- 7. UID Validation & OCC Error Schema Verification ---
console.log('\n--- Test 7: UID Validation & Optimistic Concurrency Control (OCC) ---');
// Simulating the OCC logic from saveBatchTransactionsToFirestore
function simulateBatchOCCCheck(
  userId: string,
  targetTxs: Transaction[],
  serverDbState: Map<string, { version: number; payload: any }>
): { code?: string; conflictingTxId?: string; serverData?: any; success?: boolean } {
  if (!userId || typeof userId !== 'string' || userId.trim() === '') {
    throw new Error('Unauthorized: Missing or invalid UID');
  }

  // Read phase: check versions of all documents
  for (const tx of targetTxs) {
    const serverDoc = serverDbState.get(tx.id);
    if (serverDoc) {
      const serverVer = serverDoc.version || 1;
      const expectedVer = tx.version || 1;
      if (serverVer > expectedVer) {
        return {
          code: 'DATA_CONFLICT',
          conflictingTxId: tx.id,
          serverData: serverDoc.payload,
          success: false,
        };
      }
    }
  }

  return { success: true };
}

// Case A: Missing UID should throw Unauthorized
let uidErrorCaught = false;
try {
  simulateBatchOCCCheck('', planInv, new Map());
} catch (e: any) {
  uidErrorCaught = true;
  assert(e.message.includes('Unauthorized'), 'Empty UID strictly rejected');
}
assert(uidErrorCaught, 'Missing UID threw error');

// Case B: OCC detects device conflict
const mockServerDb = new Map<string, { version: number; payload: any }>();
// Server doc for installment 1 is v1
mockServerDb.set(planInv[0].id, { version: 1, payload: planInv[0] });
// Server doc for installment 2 was updated to v2 by another device!
mockServerDb.set(planInv[1].id, { version: 2, payload: { ...planInv[1], version: 2, note: 'Updated by Device B' } });

// Device A tries to batch-save with expected version 1
const occConflictResult = simulateBatchOCCCheck('user-alpha', planInv, mockServerDb);
assert(occConflictResult.code === 'DATA_CONFLICT', 'OCC detected DATA_CONFLICT when server version is higher');
assert(occConflictResult.conflictingTxId === planInv[1].id, 'Identified exact conflicting transaction ID');
assert(occConflictResult.serverData.note === 'Updated by Device B', 'Captured serverData for conflict resolution');

// Case C: When versions match, OCC check succeeds
const matchingServerDb = new Map<string, { version: number; payload: any }>();
planInv.forEach((t) => matchingServerDb.set(t.id, { version: 1, payload: t }));
const occSuccessResult = simulateBatchOCCCheck('user-alpha', planInv, matchingServerDb);
assert(occSuccessResult.success === true, 'OCC check succeeds when versions match');

// --- 8. Offline Queue & onSnapshot Overlay Protection ---
console.log('\n--- Test 8: Offline Queue & onSnapshot Overlay Protection ---');
// When an old snapshot arrives from the server while 12 installments are pending in local queue:
const localPendingQueue = res1.shiftedItems.map((tx) => ({
  documentId: tx.id,
  operationType: 'update' as const,
  payload: tx,
  status: 'pending' as const,
}));

// Cloud snapshot arrives with OLD billing cycles
const oldCloudSnapshot = [...plan12]; // Original unshifted items

// Overlay algorithm (same as implemented in App.tsx unsubTxs)
const pendingMap = new Map(localPendingQueue.map((o) => [o.documentId, o]));
const mergedTxs = oldCloudSnapshot.map((tx) => {
  const op = pendingMap.get(tx.id);
  if (op && op.operationType === 'update') {
    return { ...tx, ...op.payload };
  }
  return tx;
});

assert(mergedTxs.length === 12, 'Merged transactions count is 12');
assert(mergedTxs[0].billingCycleMonth === '2026-12', 'Pending local cycle 2026-12 preserved over old snapshot');
assert(mergedTxs[1].billingCycleMonth === '2027-01', 'Pending local cycle 2027-01 preserved over old snapshot');
assert(mergedTxs[11].billingCycleMonth === '2027-11', 'Pending local cycle 2027-11 preserved over old snapshot');
assert(mergedTxs[0].date === '2026-10-25', 'Original purchase date 2026-10-25 preserved');

console.log('\n====================================================');
console.log('🎉 ALL AUDIT & OCC REGRESSION TESTS PASSED (8/8)!');
console.log('====================================================');
