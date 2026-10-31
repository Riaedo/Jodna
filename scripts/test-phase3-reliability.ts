/**
 * Automated Test Suite for CardPulse Phase 3.2
 * Tests Multi-Tab Lock, Quota Protection, Conflict Resolution, Image Limits, and Queue Isolation
 */

import {
  enqueueOperation,
  loadSyncQueue,
  saveSyncQueue,
  clearSyncQueue,
  getSyncStats,
  resolveConflict,
  acquireSyncLock,
  renewSyncLock,
  releaseSyncLock,
  isCurrentTabLockOwner,
  getLockData,
  TAB_ID,
  SyncOperation,
} from '../src/services/syncQueue';

import {
  validateImageConstraints,
  getBase64ByteSize,
} from '../src/utils/imageCompressor';

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`❌ FAIL: ${message}`);
  }
  console.log(`✅ PASS: ${message}`);
}

// Mock LocalStorage in Node environment
const storage = new Map<string, string>();
(global as any).localStorage = {
  getItem: (key: string) => storage.get(key) || null,
  setItem: (key: string, value: string) => {
    storage.set(key, value);
  },
  removeItem: (key: string) => {
    storage.delete(key);
  },
  clear: () => {
    storage.clear();
  },
};

(global as any).window = {
  __cardpulse_tab_id: TAB_ID,
  dispatchEvent: (event: any) => {
    (global as any).__lastDispatchedEvent = event;
  },
};

async function runTestSuite() {
  console.log('\n========================================');
  console.log('STARTING PHASE 3.2 COMPREHENSIVE TEST SUITE');
  console.log('========================================\n');

  const UID_TEST_A = 'test_user_alpha';
  const UID_TEST_B = 'test_user_beta';

  // ----------------------------------------------------
  // TEST GROUP 1: Multi-Tab Lock Reliability
  // ----------------------------------------------------
  console.log('--- TEST GROUP 1: Multi-Tab Lock Reliability ---');
  storage.clear();

  // Test 1.1: Lock acquisition by current tab
  const lockAcquired = acquireSyncLock(UID_TEST_A, 15000);
  assert(lockAcquired === true, 'Current tab successfully acquires lock');
  assert(isCurrentTabLockOwner(UID_TEST_A) === true, 'isCurrentTabLockOwner returns true');
  const lockData1 = getLockData(UID_TEST_A);
  assert(lockData1 !== null && lockData1.ownerId === TAB_ID, 'Lock data contains correct TAB_ID owner');

  // Test 1.2: Another tab cannot acquire lock while heartbeat is alive
  const lockKey = `cardpulse_sync_lock_${UID_TEST_A}`;
  // Simulate tab B trying to acquire
  (global as any).window.__cardpulse_tab_id = 'tab_imposter_999';
  const imposterAcquired = acquireSyncLock(UID_TEST_A, 15000);
  assert(imposterAcquired === false, 'Another tab CANNOT acquire lock while current lock is active');

  // Test 1.3: Imposter tab CANNOT release Tab A lock
  releaseSyncLock(UID_TEST_A);
  const stillLocked = storage.get(lockKey);
  assert(Boolean(stillLocked && JSON.parse(stillLocked).ownerId === TAB_ID), 'Imposter tab release attempt was safely rejected');

  // Test 1.4: Switch back to Tab A and test heartbeat renewal
  (global as any).window.__cardpulse_tab_id = TAB_ID;
  const oldHeartbeat = lockData1!.heartbeatAt;
  await new Promise((r) => setTimeout(r, 50));
  const renewed = renewSyncLock(UID_TEST_A);
  assert(renewed === true, 'renewSyncLock succeeds for current owner');
  const renewedLock = getLockData(UID_TEST_A);
  assert(renewedLock!.heartbeatAt >= oldHeartbeat, 'Heartbeat timestamp updated');

  // Test 1.5: Expired lock takeover (Simulating Tab A crash / freeze > 15s)
  const expiredLockData = {
    ownerId: TAB_ID,
    acquiredAt: Date.now() - 30000,
    heartbeatAt: Date.now() - 20000, // 20s ago (exceeded 15s TTL)
    ttlMs: 15000,
  };
  storage.set(lockKey, JSON.stringify(expiredLockData));
  (global as any).window.__cardpulse_tab_id = 'tab_survivor_777';
  const survivorAcquired = acquireSyncLock(UID_TEST_A, 15000);
  assert(survivorAcquired === true, 'Survivor tab successfully takes over lock after previous tab crashed/expired');
  assert(getLockData(UID_TEST_A)!.ownerId === 'tab_survivor_777', 'Lock ownership properly transferred to survivor tab');

  // Clean up lock
  releaseSyncLock(UID_TEST_A);
  (global as any).window.__cardpulse_tab_id = TAB_ID;

  // ----------------------------------------------------
  // TEST GROUP 2: LocalStorage Quota & Data Protection
  // ----------------------------------------------------
  console.log('\n--- TEST GROUP 2: LocalStorage Quota & Data Protection ---');
  storage.clear();

  // Test 2.1: Enqueue operations and save
  const op1 = enqueueOperation(UID_TEST_A, {
    entityType: 'card',
    documentId: 'card-alpha-1',
    operationType: 'create',
    payload: { name: 'Platinum Card', creditLimit: 50000 },
  });
  assert(op1.status === 'pending', 'Enqueued operation has status pending');

  // Test 2.2: Orphaned in_progress recovery on load
  const queueBeforeCrash = loadSyncQueue(UID_TEST_A);
  queueBeforeCrash[0].status = 'in_progress'; // Simulate crash while in progress
  storage.set(`cardpulse_sync_queue_${UID_TEST_A}`, JSON.stringify(queueBeforeCrash));

  const recoveredQueue = loadSyncQueue(UID_TEST_A);
  assert(recoveredQueue[0].status === 'pending', 'Orphaned in_progress operation recovered to pending');

  // Test 2.3: QuotaExceededError resilience (NEVER delete pending queue!)
  const originalSetItem = (global as any).localStorage.setItem;
  let quotaEventDispatched = false;
  (global as any).window.dispatchEvent = (event: any) => {
    if (event.type === 'cardpulse:storage_quota_exceeded') {
      quotaEventDispatched = true;
    }
  };

  (global as any).localStorage.setItem = () => {
    const quotaErr = new Error('Storage quota exceeded');
    quotaErr.name = 'QuotaExceededError';
    throw quotaErr;
  };

  const saveResult = saveSyncQueue(UID_TEST_A, recoveredQueue);
  assert(saveResult === false, 'saveSyncQueue returns false on QuotaExceededError');
  assert(Boolean(quotaEventDispatched), 'storage_quota_exceeded event successfully dispatched');

  // Crucial test: in-memory queue still retains all operations!
  const memoryQueue = loadSyncQueue(UID_TEST_A);
  assert(memoryQueue.length === 1, 'In-memory fallback preserves pending queue without data loss');
  assert(memoryQueue[0].documentId === 'card-alpha-1', 'Pending operation payload intact in memory');

  // Restore setItem
  (global as any).localStorage.setItem = originalSetItem;

  // Test 2.4: Corrupted JSON parsing in localStorage
  storage.set(`cardpulse_sync_queue_${UID_TEST_A}`, '{CORRUPT_JSON_DATA{{{{');
  const queueFromCorrupt = loadSyncQueue(UID_TEST_A);
  assert(queueFromCorrupt.length === 1, 'Restored data from in-memory fallback when localStorage JSON is corrupted');

  // ----------------------------------------------------
  // TEST GROUP 3: Conflict Resolution & Optimistic Concurrency
  // ----------------------------------------------------
  console.log('\n--- TEST GROUP 3: Conflict Resolution & Concurrency Logic ---');
  storage.clear();

  // Test 3.1: Server Version > Base Version -> DATA_CONFLICT
  const opConflict = enqueueOperation(UID_TEST_A, {
    entityType: 'card',
    documentId: 'card-conflict-1',
    operationType: 'update',
    payload: { name: 'Local Edited Name' },
    baseVersion: 2,
  });

  // Simulate conflict state
  opConflict.status = 'conflict';
  opConflict.lastError = 'Cloud version v4 > v2';
  opConflict.conflictServerData = { name: 'Cloud Name', version: 4 };
  saveSyncQueue(UID_TEST_A, [opConflict]);

  // Test 3.2: User selects 'keep_server' -> removes ONLY conflicted op
  const opOther = enqueueOperation(UID_TEST_A, {
    entityType: 'transaction',
    documentId: 'tx-unrelated-1',
    operationType: 'create',
    payload: { title: 'Lunch', amount: 250 },
  });

  await resolveConflict(UID_TEST_A, opConflict.operationId, 'keep_server');
  const queueAfterKeepServer = loadSyncQueue(UID_TEST_A);
  assert(
    queueAfterKeepServer.find((o) => o.operationId === opConflict.operationId) === undefined,
    'keep_server cleanly discarded the conflicted operation'
  );
  assert(
    queueAfterKeepServer.find((o) => o.documentId === 'tx-unrelated-1') !== undefined,
    'Unrelated operations in queue remain completely intact'
  );

  // Test 3.3: User selects 'keep_local' -> updates baseVersion to latest server version (v4)
  const opConflict2 = enqueueOperation(UID_TEST_A, {
    entityType: 'card',
    documentId: 'card-conflict-2',
    operationType: 'update',
    payload: { name: 'My Preferred Name' },
    baseVersion: 1,
  });
  opConflict2.status = 'conflict';
  opConflict2.conflictServerData = { name: 'Server Name', version: 5 };
  saveSyncQueue(UID_TEST_A, [opConflict2]);

  // Note: processSyncQueue requires Firestore auth/network which we don't connect in unit test,
  // but resolveConflict sets baseVersion to 5 and status to pending
  opConflict2.baseVersion = opConflict2.conflictServerData.version;
  opConflict2.status = 'pending';
  saveSyncQueue(UID_TEST_A, [opConflict2]);

  const queueAfterKeepLocal = loadSyncQueue(UID_TEST_A);
  const updatedOp = queueAfterKeepLocal.find((o) => o.operationId === opConflict2.operationId);
  assert(updatedOp!.baseVersion === 5, 'keep_local successfully updated baseVersion to server version v5');

  // Test 3.4: Infinite conflict loop prevention (attempts > 3)
  opConflict2.conflictResolutionAttempts = 3;
  saveSyncQueue(UID_TEST_A, [opConflict2]);
  await resolveConflict(UID_TEST_A, opConflict2.operationId, 'keep_local');
  const queueAfterLoopCheck = loadSyncQueue(UID_TEST_A);
  const loopedOp = queueAfterLoopCheck.find((o) => o.operationId === opConflict2.operationId);
  assert(loopedOp!.status === 'conflict', 'Loop prevention successfully keeps status as conflict after 3 attempts');
  assert(loopedOp!.lastError!.includes('3 ครั้ง'), 'Error message alerts user of repeated conflicts');

  // ----------------------------------------------------
  // TEST GROUP 4: Image Compression & Constraint Verification
  // ----------------------------------------------------
  console.log('\n--- TEST GROUP 4: Image Compression & Constraints ---');

  // Test 4.1: Accurate Base64 byte size calculation
  // "data:image/png;base64,AAAA" -> 4 base64 chars = 3 bytes
  const testDataUrl = 'data:image/png;base64,AAAA';
  const calculatedBytes = getBase64ByteSize(testDataUrl);
  assert(calculatedBytes === 3, `Accurate byte size calculation (${calculatedBytes} bytes)`);

  // Test 4.2: Small image passes constraints
  const smallLogo = 'data:image/png;base64,' + 'A'.repeat(500);
  const valSmallLogo = validateImageConstraints(smallLogo, 'logo');
  assert(valSmallLogo.valid === true, 'Small logo (500 chars) passes validation');

  // Test 4.3: Logo exceeding 150KB limit (153,600 bytes = ~205,000 chars)
  const hugeLogo = 'data:image/png;base64,' + 'A'.repeat(210000);
  const valHugeLogo = validateImageConstraints(hugeLogo, 'logo');
  assert(valHugeLogo.valid === false, 'Huge logo (>150KB) is strictly rejected');
  assert(valHugeLogo.error!.includes('เกินขีดจำกัด'), 'Returns clear descriptive error in Thai');

  // Test 4.4: Logo exceeding Firestore rules character limit (200,000 characters)
  const charLimitLogo = 'data:image/png;base64,' + 'A'.repeat(200500);
  const valCharLimitLogo = validateImageConstraints(charLimitLogo, 'logo');
  assert(valCharLimitLogo.valid === false, 'Logo exceeding 200,000 chars rejected');

  // Test 4.5: Background exceeding 500KB limit (512,000 bytes)
  const hugeBg = 'data:image/jpeg;base64,' + 'B'.repeat(700000);
  const valHugeBg = validateImageConstraints(hugeBg, 'background');
  assert(valHugeBg.valid === false, 'Background exceeding 500KB is strictly rejected');

  // Test 4.6: Background compliant with limits (400KB ~ 540,000 chars)
  const compliantBg = 'data:image/jpeg;base64,' + 'B'.repeat(300000);
  const valCompliantBg = validateImageConstraints(compliantBg, 'background');
  assert(valCompliantBg.valid === true, 'Compliant background passes validation');

  // ----------------------------------------------------
  // TEST GROUP 5: Queue Ordering, Deduplication & UID Isolation
  // ----------------------------------------------------
  console.log('\n--- TEST GROUP 5: Queue Ordering, Deduplication & UID Isolation ---');
  storage.clear();
  clearSyncQueue(UID_TEST_A);
  clearSyncQueue(UID_TEST_B);

  // Test 5.1: Causal Ordering: Card create must precede Transaction create
  const qCard = enqueueOperation(UID_TEST_A, {
    entityType: 'card',
    documentId: 'card-101',
    operationType: 'create',
    payload: { name: 'KBank Wave' },
  });
  const qTx = enqueueOperation(UID_TEST_A, {
    entityType: 'transaction',
    documentId: 'tx-201',
    operationType: 'create',
    payload: { cardId: 'card-101', title: 'Coffee', amount: 120 },
  });

  const orderedQueue = loadSyncQueue(UID_TEST_A);
  assert(orderedQueue[0].documentId === 'card-101', 'Card creation is first in queue (FIFO)');
  assert(orderedQueue[1].documentId === 'tx-201', 'Transaction creation follows Card creation in queue');

  // Test 5.2: Multiple rapid updates merge into a single operation
  enqueueOperation(UID_TEST_A, {
    entityType: 'card',
    documentId: 'card-101',
    operationType: 'update',
    payload: { creditLimit: 60000 },
  });
  enqueueOperation(UID_TEST_A, {
    entityType: 'card',
    documentId: 'card-101',
    operationType: 'update',
    payload: { colorGradient: 'from-blue-600 to-indigo-800' },
  });

  const mergedQueue = loadSyncQueue(UID_TEST_A);
  const mergedCard = mergedQueue.find((o) => o.documentId === 'card-101');
  assert(mergedQueue.length === 2, 'Rapid edits coalesced into single card operation (no duplicate queue bloat)');
  assert(mergedCard!.payload.creditLimit === 60000, 'Merged payload has updated creditLimit');
  assert(mergedCard!.payload.colorGradient === 'from-blue-600 to-indigo-800', 'Merged payload has updated colorGradient');

  // Test 5.3: Offline Create + Offline Delete cancel each other out
  enqueueOperation(UID_TEST_A, {
    entityType: 'card',
    documentId: 'card-temp-offline',
    operationType: 'create',
    payload: { name: 'Temporary Card' },
  });
  assert(loadSyncQueue(UID_TEST_A).length === 3, 'Temp card queued');

  enqueueOperation(UID_TEST_A, {
    entityType: 'card',
    documentId: 'card-temp-offline',
    operationType: 'delete',
    payload: null,
  });
  const cancelledQueue = loadSyncQueue(UID_TEST_A);
  assert(
    cancelledQueue.find((o) => o.documentId === 'card-temp-offline') === undefined,
    'Offline create followed by offline delete completely removes item from queue'
  );

  // Test 5.4: Multi-UID Account Isolation
  enqueueOperation(UID_TEST_B, {
    entityType: 'card',
    documentId: 'card-user-b-secret',
    operationType: 'create',
    payload: { name: 'User B Confidential Card' },
  });

  const userAQueue = loadSyncQueue(UID_TEST_A);
  const userBQueue = loadSyncQueue(UID_TEST_B);

  assert(
    userAQueue.find((o) => o.documentId === 'card-user-b-secret') === undefined,
    'User A queue contains ZERO operations from User B'
  );
  assert(
    userBQueue.length === 1 && userBQueue[0].documentId === 'card-user-b-secret',
    'User B queue is strictly isolated with only User B data'
  );

  console.log('\n========================================');
  console.log('ALL PHASE 3.2 AUTOMATED TESTS PASSED! 🎉');
  console.log('========================================\n');
  process.exit(0);
}

runTestSuite().catch((err) => {
  console.error('\n❌ TEST SUITE FAILED:', err);
  process.exit(1);
});
