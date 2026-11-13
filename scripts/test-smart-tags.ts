import assert from 'node:assert';
import { Transaction } from '../src/types';
import {
  cleanTagName,
  getTagComparisonKey,
  hasTagCaseInsensitive,
  normalizeUniqueTags,
  getFrequentTagsFromHistory,
} from '../src/utils/cardUtils';
import { enqueueOperation, loadSyncQueue, clearSyncQueue } from '../src/services/syncQueue';

// Mock browser globals for syncQueue test
const store: Record<string, string> = {};
(globalThis as any).localStorage = {
  getItem: (k: string) => store[k] || null,
  setItem: (k: string, v: string) => {
    store[k] = String(v);
  },
  removeItem: (k: string) => {
    delete store[k];
  },
  clear: () => {
    Object.keys(store).forEach((k) => delete store[k]);
  },
};

const makeTx = (overrides: Partial<Transaction>): Transaction => ({
  id: `tx-${Math.random().toString(36).slice(2, 8)}`,
  cardId: 'card-1',
  date: '2026-11-01',
  title: 'Test Item',
  category: 'food',
  amount: 100,
  billingCycleMonth: '2026-11',
  createdAt: '2026-11-01T10:00:00.000Z',
  ...overrides,
});

console.log('====================================================');
console.log('RUNNING SMART TAG SUGGESTIONS TEST SUITE');
console.log('====================================================');

// Test 1: Empty history -> Zero fake or predefined tags
console.log('\n--- Test 1: Zero Fake or Predefined Tags ---');
assert.deepStrictEqual(getFrequentTagsFromHistory([]), []);
assert.deepStrictEqual(
  getFrequentTagsFromHistory([makeTx({ tags: undefined }), makeTx({ tags: [] })]),
  []
);
console.log('✅ PASS: Empty history yields zero fake or predefined tags');

// Test 2: Frequency ranking & Top 10 cap
console.log('\n--- Test 2: Frequency Ranking & Top 10 Cap ---');
const txs12Tags: Transaction[] = [];
for (let i = 1; i <= 12; i++) {
  for (let repeat = 0; repeat < i; repeat++) {
    txs12Tags.push(
      makeTx({
        date: `2026-11-${String(Math.min(28, i)).padStart(2, '0')}`,
        createdAt: `2026-11-01T10:00:00.000Z`,
        tags: [`Tag${i}`],
      })
    );
  }
}
const top10 = getFrequentTagsFromHistory(txs12Tags, 10);
assert.strictEqual(top10.length, 10, 'Should return at most 10 tags');
assert.strictEqual(top10[0].tag, 'Tag12');
assert.strictEqual(top10[0].count, 12);
assert.strictEqual(top10[9].tag, 'Tag3');
assert.strictEqual(top10[9].count, 3);
assert.ok(!top10.some((t) => t.tag === 'Tag1' || t.tag === 'Tag2'));
console.log('✅ PASS: Ranked strictly by frequency and capped at top 10');

// Test 3: Recency tie-breaker when frequencies are equal
console.log('\n--- Test 3: Recently Used Tie-Breaker ---');
const tieTxs: Transaction[] = [
  makeTx({ date: '2026-10-01', createdAt: '2026-10-01T10:00:00.000Z', tags: ['OldTag'] }),
  makeTx({ date: '2026-11-12', createdAt: '2026-11-12T10:00:00.000Z', tags: ['RecentTag'] }),
  makeTx({
    date: '2026-09-15',
    createdAt: '2026-09-15T10:00:00.000Z',
    updatedAt: '2026-11-13T06:50:00.000Z',
    tags: ['EditedTodayTag'],
  }),
];
const tieRanked = getFrequentTagsFromHistory(tieTxs, 10);
assert.strictEqual(tieRanked[0].tag, 'EditedTodayTag');
assert.strictEqual(tieRanked[1].tag, 'RecentTag');
assert.strictEqual(tieRanked[2].tag, 'OldTag');
console.log('✅ PASS: Equal frequency tags ranked by most recent usage');

// Test 4: Uppercase/lowercase consistency, trimming, and historical record preservation
console.log('\n--- Test 4: Case-Insensitive Grouping & Historical Record Preservation ---');
const historicalTxs: Transaction[] = [
  makeTx({ tags: ['  #Work  ', 'work', 'Travel'] }),
  makeTx({ tags: ['Work', '  FOOD  '] }),
  makeTx({ tags: ['Work', 'travel'] }),
];
const originalSnapshot = JSON.stringify(historicalTxs);
const grouped = getFrequentTagsFromHistory(historicalTxs, 10);

// 'Work' appeared in 3 separate records (1st tx deduplicated within same tx!)
const workEntry = grouped.find((g) => getTagComparisonKey(g.tag) === 'work');
assert.ok(workEntry);
assert.strictEqual(workEntry.count, 3, 'Same-tx duplicates count once per record');
assert.strictEqual(workEntry.tag, 'Work', 'Canonical most-frequent casing preserved');
assert.strictEqual(
  JSON.stringify(historicalTxs),
  originalSnapshot,
  'Historical transaction records remain 100% untouched'
);
console.log('✅ PASS: Case variations grouped consistently & historical records untouched');

// Test 5: Tag Selection, Deselection, Trimming, and Duplicate Prevention
console.log('\n--- Test 5: Selection, Deselection & Duplicate Prevention ---');
assert.strictEqual(cleanTagName('   #Coffee   Shop  '), 'Coffee Shop');
assert.strictEqual(hasTagCaseInsensitive(['Work', 'Food'], '  work '), true);
assert.strictEqual(hasTagCaseInsensitive(['Work', 'Food'], 'Travel'), false);

const lookup = new Map<string, string>([
  ['work', 'Work'],
  ['cashback', 'Cashback'],
]);
const deduped = normalizeUniqueTags(
  ['  work ', 'WORK', '#cashback', 'Cashback', '  Japan Trip  '],
  lookup,
  10
);
assert.deepStrictEqual(deduped, ['Work', 'Cashback', 'Japan Trip']);

// Simulate saving a new tag and seeing suggestions update automatically
const afterSaveTxs = [
  ...historicalTxs,
  makeTx({ date: '2026-11-13', createdAt: '2026-11-13T07:00:00.000Z', tags: ['Japan Trip'] }),
];
const updatedSuggestions = getFrequentTagsFromHistory(afterSaveTxs, 10);
assert.ok(updatedSuggestions.some((s) => s.tag === 'Japan Trip' && s.count === 1));
console.log('✅ PASS: Duplicates prevented, spaces trimmed, and suggestions update after save');

// Test 6: Max 10 tags per transaction (Firestore rules compatibility)
console.log('\n--- Test 6: Max 10 Tags Guard & Offline Sync Queue Compatibility ---');
const manyTags = Array.from({ length: 15 }, (_, idx) => `T${idx + 1}`);
const capped = normalizeUniqueTags(manyTags, undefined, 10);
assert.strictEqual(capped.length, 10);

const testUid = 'uid-smart-tag-test';
clearSyncQueue(testUid);
const queuedOp = enqueueOperation(testUid, {
  entityType: 'transaction',
  documentId: 'tx-offline-tag-1',
  operationType: 'create',
  payload: {
    id: 'tx-offline-tag-1',
    cardId: 'card-1',
    date: '2026-11-13',
    title: 'Offline Coffee',
    category: 'food',
    amount: 120,
    billingCycleMonth: '2026-11',
    tags: capped,
  },
  baseVersion: 1,
});
assert.strictEqual(queuedOp.status, 'pending');
const loadedQueue = loadSyncQueue(testUid);
assert.strictEqual(loadedQueue.length, 1);
assert.deepStrictEqual(loadedQueue[0].payload.tags, capped);
clearSyncQueue(testUid);
console.log('✅ PASS: Max 10 tags enforced & Offline Sync Queue preserves tags cleanly');

console.log('\n====================================================');
console.log('🎉 ALL SMART TAG SUGGESTION TESTS PASSED (6/6)!');
console.log('====================================================');
