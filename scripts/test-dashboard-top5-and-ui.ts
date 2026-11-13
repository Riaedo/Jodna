import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { CreditCard, Transaction } from '../src/types';
import { getTopFrequentItemsForBillingCycle } from '../src/utils/cardUtils';

const sampleCards: CreditCard[] = [
  {
    id: 'card-1',
    name: 'KBank Passion',
    bank: 'KBank',
    last4: '4892',
    creditLimit: 100000,
    billingCutoffDay: 15,
    paymentDueDay: 5,
    colorGradient: 'from-emerald-900 to-teal-800',
    accentColor: '#10b981',
    cardType: 'VISA',
  },
  {
    id: 'card-2',
    name: 'SCB Beyond',
    bank: 'SCB',
    last4: '1944',
    creditLimit: 150000,
    billingCutoffDay: 20,
    paymentDueDay: 10,
    colorGradient: 'from-purple-900 to-indigo-900',
    accentColor: '#8b5cf6',
    cardType: 'Mastercard',
  },
];

const makeTx = (overrides: Partial<Transaction>): Transaction => ({
  id: `tx-${Math.random().toString(36).slice(2, 8)}`,
  cardId: 'card-1',
  date: '2026-10-05',
  title: 'Coffee',
  category: 'food',
  amount: 120,
  billingCycleMonth: '2026-10',
  createdAt: '2026-10-05T09:00:00.000Z',
  ...overrides,
});

console.log('====================================================');
console.log('RUNNING DASHBOARD UI & TOP 5 ANALYTICS TEST SUITE');
console.log('====================================================');

// Test 1: Strict billing cycle isolation & cutoff calculation
console.log('\n--- Test 1: Billing Cycle Separation & Top 5 Ranking ---');
const txs: Transaction[] = [
  // 2026-10 items (card-1 cutoff 15: dates <= Oct 15 are 2026-10; Sep 16..Sep 30 are also 2026-10)
  makeTx({ date: '2026-09-20', title: 'Starbucks Coffee', amount: 150 }),
  makeTx({ date: '2026-10-02', title: '  starbucks coffee  ', amount: 160 }),
  makeTx({ date: '2026-10-05', title: 'Starbucks   Coffee', amount: 140 }),
  makeTx({ date: '2026-10-10', title: 'Starbucks Coffee', amount: 155 }), // count = 4 (100%)

  makeTx({ date: '2026-10-03', title: 'GrabFood', amount: 250 }),
  makeTx({ date: '2026-10-06', title: 'GrabFood', amount: 220 }),
  makeTx({ date: '2026-10-09', title: 'GrabFood', amount: 210 }), // count = 3 (75%)

  makeTx({ date: '2026-10-04', title: '7-Eleven', amount: 90 }),
  makeTx({ date: '2026-10-12', title: '7-Eleven', amount: 110 }), // count = 2 (50%)

  makeTx({ date: '2026-10-08', title: 'PTT Station', amount: 1000 }),
  makeTx({ date: '2026-10-14', title: 'PTT Station', amount: 800 }), // count = 2 (lower totalAmount than BTS? wait 1800 > 500)

  makeTx({ date: '2026-10-11', title: 'BTS Skytrain', amount: 500 }), // count = 1 (25%)
  makeTx({ date: '2026-10-13', title: 'Netflix', amount: 419 }), // count = 1 (excluded as #6)

  // Should fall into 2026-11 (after cutoff 15 for card-1!)
  makeTx({ date: '2026-10-20', title: 'Future Oct20 Purchase', billingCycleMonth: '2026-11', amount: 300 }),
  makeTx({ date: '2026-10-21', title: 'Future Oct20 Purchase', billingCycleMonth: '2026-11', amount: 300 }),
  makeTx({ date: '2026-10-22', title: 'Future Oct20 Purchase', billingCycleMonth: '2026-11', amount: 300 }),
  makeTx({ date: '2026-10-23', title: 'Future Oct20 Purchase', billingCycleMonth: '2026-11', amount: 300 }),
  makeTx({ date: '2026-10-24', title: 'Future Oct20 Purchase', billingCycleMonth: '2026-11', amount: 300 }),

  // Installment in future cycle 2026-12
  makeTx({
    date: '2026-12-08',
    title: 'iPhone Installment',
    billingCycleMonth: '2026-12',
    isInstallment: true,
    totalInstallments: 10,
    currentInstallment: 3,
    monthlyInstallmentAmount: 4290,
    amount: 42900,
  }),

  // Invalid records that must be excluded
  makeTx({ date: '2026-10-07', title: '   ', amount: 100 }),
  makeTx({ date: '2026-10-07', title: 'Invalid Negative', amount: -50 }),
];

const snapshotBefore = JSON.stringify(txs);
const topOct = getTopFrequentItemsForBillingCycle(txs, sampleCards, '2026-10', 5);

assert.strictEqual(JSON.stringify(txs), snapshotBefore, 'Source transactions must not be mutated');
assert.strictEqual(topOct.length, 5, 'Should cap strictly at Top 5');
assert.strictEqual(topOct[0].rank, 1);
assert.strictEqual(topOct[0].title, 'Starbucks Coffee');
assert.strictEqual(topOct[0].count, 4);
assert.strictEqual(topOct[0].percentage, 100);

assert.strictEqual(topOct[1].rank, 2);
assert.strictEqual(topOct[1].title, 'GrabFood');
assert.strictEqual(topOct[1].count, 3);
assert.strictEqual(topOct[1].percentage, 75);

assert.strictEqual(topOct[2].title, 'PTT Station');
assert.strictEqual(topOct[2].count, 2);
assert.strictEqual(topOct[2].percentage, 50);

assert.strictEqual(topOct[3].title, '7-Eleven');
assert.strictEqual(topOct[3].count, 2);
assert.strictEqual(topOct[3].percentage, 50);

assert.strictEqual(topOct[4].title, 'BTS Skytrain');
assert.strictEqual(topOct[4].count, 1);
assert.strictEqual(topOct[4].percentage, 25);

assert.ok(
  !topOct.some((i) => i.title === 'Future Oct20 Purchase' || i.title === 'iPhone Installment'),
  'Must never mix future cycle items into 2026-10'
);
console.log('✅ PASS: Top 5 calculation, normalization, proportional %, and strict cycle isolation verified');

// Test 2: Explicit future cycle inspection & <5 items handling
console.log('\n--- Test 2: Fewer than 5 Items & Explicit Cycle Selection ---');
const topNov = getTopFrequentItemsForBillingCycle(txs, sampleCards, '2026-11', 5);
assert.strictEqual(topNov.length, 1);
assert.strictEqual(topNov[0].title, 'Future Oct20 Purchase');
assert.strictEqual(topNov[0].count, 5);
assert.strictEqual(topNov[0].percentage, 100);

const topDec = getTopFrequentItemsForBillingCycle(txs, sampleCards, '2026-12', 5);
assert.strictEqual(topDec.length, 1);
assert.strictEqual(topDec[0].title, 'iPhone Installment');
console.log('✅ PASS: <5 items and explicit future cycle selection handled cleanly');

// Test 3: Empty billing cycle state
console.log('\n--- Test 3: Empty Billing Cycle State ---');
const topEmpty = getTopFrequentItemsForBillingCycle(txs, sampleCards, '2025-01', 5);
assert.deepStrictEqual(topEmpty, []);
console.log('✅ PASS: Empty cycle returns [] for empty state rendering');

// Test 4: Dynamic add / edit / delete update
console.log('\n--- Test 4: Dynamic Add / Edit / Delete Updates ---');
const addedTx = makeTx({ id: 'new-grab-1', date: '2026-10-14', title: 'GrabFood', amount: 300 });
const addedTx2 = makeTx({ id: 'new-grab-2', date: '2026-10-15', title: 'GrabFood', amount: 300 });
const afterAdd = getTopFrequentItemsForBillingCycle([...txs, addedTx, addedTx2], sampleCards, '2026-10', 5);
assert.strictEqual(afterAdd[0].title, 'GrabFood');
assert.strictEqual(afterAdd[0].count, 5);
assert.strictEqual(afterAdd[0].percentage, 100);
assert.strictEqual(afterAdd[1].title, 'Starbucks Coffee');
assert.strictEqual(afterAdd[1].percentage, 80); // round(4/5 * 100)

const afterDelete = getTopFrequentItemsForBillingCycle(
  txs.filter((t) => !t.title.toLowerCase().includes('starbucks')),
  sampleCards,
  '2026-10',
  5
);
assert.strictEqual(afterDelete[0].title, 'GrabFood');
assert.strictEqual(afterDelete[0].percentage, 100);
console.log('✅ PASS: Dynamic add and delete recalculates Top 5 immediately');

// Test 5: Component source verification (UI requirements & Firebase config untouched)
console.log('\n--- Test 5: UI Component & Firebase Integrity Verification ---');
const cardSliderSrc = fs.readFileSync(path.resolve('src/components/CardSlider.tsx'), 'utf8');
assert.ok(cardSliderSrc.includes('w-[65%]'), 'CardSlider must scale cards to 65% width on mobile');
assert.ok(cardSliderSrc.includes('sm:w-[238px] lg:w-[256px]'), 'CardSlider must enforce 65% proportional width on tablet/desktop');

const dueBannerSrc = fs.readFileSync(path.resolve('src/components/DueAlertBanner.tsx'), 'utf8');
assert.ok(dueBannerSrc.includes('p-3 sm:p-3.5'), 'DueAlertBanner must use compact padding');
assert.ok(dueBannerSrc.includes('ชำระแล้ว'), 'DueAlertBanner must preserve quick-pay action');

const monthlySummarySrc = fs.readFileSync(path.resolve('src/components/MonthlySummary.tsx'), 'utf8');
assert.ok(monthlySummarySrc.includes('Top 5 รายการที่ใช้บ่อย'), 'MonthlySummary must render Top 5 รายการที่ใช้บ่อย title');
assert.ok(
  monthlySummarySrc.includes('ยังไม่มีข้อมูลรายการในรอบบิลนี้'),
  'MonthlySummary must include required empty state message'
);

const firebaseSrc = fs.readFileSync(path.resolve('src/services/firebase.ts'), 'utf8');
assert.ok(firebaseSrc.includes('gen-lang-client-0967357802'), 'Jodna Firebase Project ID must remain unchanged');
assert.ok(
  firebaseSrc.includes('ai-studio-creditcardrecord-d130ca53-bac9-4d31-b18a-c5ec1ec9582c'),
  'Jodna Firestore database ID must remain unchanged'
);
console.log('✅ PASS: UI components and Firebase configuration verified intact');

console.log('\n🎉 ALL DASHBOARD UI & TOP 5 ANALYTICS TESTS PASSED!');
