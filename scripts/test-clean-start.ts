/**
 * Test Clean Production Start
 */
import { calculateMonthlyStats, calculateHistoricalDashboard } from '../src/utils/cardUtils';
import { clearSyncQueue, loadSyncQueue } from '../src/services/syncQueue';

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error(`FAIL: ${msg}`);
  console.log(`✅ PASS: ${msg}`);
}

async function testCleanStart() {
  console.log('Testing Production Clean Start logic...');

  // 1. Calculations with 0 cards and 0 transactions
  const stats = calculateMonthlyStats([], '2026-10', []);
  assert(stats.totalSpent === 0, 'Total spent is 0');
  assert(stats.totalPaid === 0, 'Total paid is 0');
  assert(stats.totalPending === 0, 'Total pending is 0');
  assert(stats.totalDue === 0, 'Total due is 0');

  // 2. Historical dashboard with 0 transactions
  const hist = calculateHistoricalDashboard([], ['2026-10', '2026-09'], '6m', []);
  assert(hist.totalSpent === 0, 'Historical total spent is 0');
  assert(hist.avgMonthlySpent === 0, 'Historical avg monthly spent is 0');
  assert(hist.totalTxCount === 0, 'Historical total tx count is 0');
  assert(hist.highestMonth === null || hist.highestMonth.amount === 0, 'Highest month amount is 0 when empty');

  // 3. Clear queue on UID
  const UID = 'clean_user_test';
  clearSyncQueue(UID);
  const q = loadSyncQueue(UID);
  assert(q.length === 0, 'Queue is cleanly 0');

  console.log('\n🎉 ALL CLEAN START VERIFICATIONS PASSED!\n');
  process.exit(0);
}

testCleanStart();
