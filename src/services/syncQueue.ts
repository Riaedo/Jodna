/**
 * Offline Sync Queue & Conflict Resolution Manager
 * Conforms to Phase 3 Tasks 2, 3, and 4
 */

import { doc, runTransaction, deleteDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db, auth } from './firebase';

export type SyncEntityType = 'card' | 'transaction' | 'profile';
export type SyncOperationType = 'create' | 'update' | 'delete';
export type SyncOperationStatus = 'pending' | 'in_progress' | 'failed' | 'completed' | 'conflict';

export interface SyncOperation {
  operationId: string;
  uid: string;
  entityType: SyncEntityType;
  documentId: string;
  operationType: SyncOperationType;
  payload: any;
  baseVersion: number;
  createdAt: number;
  retryCount: number;
  status: SyncOperationStatus;
  lastError?: string;
  conflictServerData?: any;
  nextRetryAt?: number;
  conflictResolutionAttempts?: number;
}

export interface SyncStats {
  pendingCount: number;
  conflictCount: number;
  failedCount: number;
  isProcessing: boolean;
  lastSyncTime?: number;
}

export interface SyncLockData {
  ownerId: string;
  acquiredAt: number;
  heartbeatAt: number;
  ttlMs: number;
}

const STORAGE_PREFIX = 'cardpulse_sync_queue_';
const LOCK_PREFIX = 'cardpulse_sync_lock_';

export function getStorageKey(uid: string): string {
  return `${STORAGE_PREFIX}${uid}`;
}

export function getLockKey(uid: string): string {
  return `${LOCK_PREFIX}${uid}`;
}

/**
 * Dynamic Tab/Session ID per browser tab
 */
export function getTabId(): string {
  if (typeof window === 'undefined') return 'server';
  if ((window as any).__cardpulse_tab_id) {
    return (window as any).__cardpulse_tab_id;
  }
  const newId = `tab_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  (window as any).__cardpulse_tab_id = newId;
  return newId;
}

export const TAB_ID = getTabId();

/**
 * Read current lock data from LocalStorage
 */
export function getLockData(uid: string): SyncLockData | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(getLockKey(uid));
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/**
 * Multi-tab concurrency lock with Owner ID & Heartbeat
 * Default TTL: 15 seconds
 */
export function acquireSyncLock(uid: string, ttlMs = 15000): boolean {
  if (typeof window === 'undefined') return true;
  try {
    const key = getLockKey(uid);
    const now = Date.now();
    const existing = getLockData(uid);
    const currentTabId = getTabId();

    if (existing) {
      // Check if lock is currently active (heartbeat is fresh)
      const isAlive = now - existing.heartbeatAt < (existing.ttlMs || ttlMs);
      if (isAlive && existing.ownerId !== currentTabId) {
        // Another tab is actively holding the lock
        return false;
      }
    }
    const newLock: SyncLockData = {
      ownerId: currentTabId,
      acquiredAt: existing && existing.ownerId === currentTabId ? existing.acquiredAt : now,
      heartbeatAt: now,
      ttlMs,
    };
    localStorage.setItem(key, JSON.stringify(newLock));
    return true;
  } catch {
    return true;
  }
}

/**
 * Renew lock heartbeat while processing queue
 */
export function renewSyncLock(uid: string): boolean {
  if (typeof window === 'undefined') return true;
  try {
    const key = getLockKey(uid);
    const existing = getLockData(uid);
    const currentTabId = getTabId();
    if (!existing || existing.ownerId !== currentTabId) {
      // Lock was lost or taken by another tab
      return false;
    }
    existing.heartbeatAt = Date.now();
    localStorage.setItem(key, JSON.stringify(existing));
    return true;
  } catch {
    return false;
  }
}

/**
 * Verify whether current tab is still the registered lock owner
 */
export function isCurrentTabLockOwner(uid: string): boolean {
  if (typeof window === 'undefined') return true;
  const lock = getLockData(uid);
  if (!lock) return false;
  const now = Date.now();
  const currentTabId = getTabId();
  return lock.ownerId === currentTabId && now - lock.heartbeatAt < (lock.ttlMs || 15000);
}

/**
 * Release lock ONLY if current tab is the verified owner
 */
export function releaseSyncLock(uid: string): void {
  if (typeof window === 'undefined') return;
  try {
    const key = getLockKey(uid);
    const existing = getLockData(uid);
    const currentTabId = getTabId();
    if (existing && existing.ownerId === currentTabId) {
      localStorage.removeItem(key);
    }
  } catch {}
}

// In-memory queue cache and subscribers
const subscribers = new Map<string, Set<(ops: SyncOperation[], stats: SyncStats) => void>>();
const memoryQueues = new Map<string, SyncOperation[]>();
let isProcessingQueue = false;

/**
 * Load queue for a specific UID.
 * Automatically recovers orphaned 'in_progress' operations if tab previously crashed.
 * Resilient against JSON parsing errors and retains memory fallback.
 */
export function loadSyncQueue(uid: string): SyncOperation[] {
  if (!uid) return [];
  try {
    const raw = localStorage.getItem(getStorageKey(uid));
    if (raw) {
      const ops: SyncOperation[] = JSON.parse(raw);
      if (Array.isArray(ops)) {
        let hasOrphans = false;
        for (const op of ops) {
          if (op.status === 'in_progress') {
            op.status = 'pending';
            hasOrphans = true;
          }
        }
        if (hasOrphans) {
          try {
            localStorage.setItem(getStorageKey(uid), JSON.stringify(ops));
          } catch {}
        }
        memoryQueues.set(uid, ops);
        return ops;
      }
    }
  } catch (err) {
    console.error(`[SyncQueue] Failed to parse local storage queue for user ${uid}:`, err);
    const mem = memoryQueues.get(uid);
    if (mem && mem.length > 0) {
      console.warn(`[SyncQueue] Restored ${mem.length} operations from in-memory fallback for user ${uid}.`);
      return mem;
    }
  }
  const mem = memoryQueues.get(uid);
  return mem ? [...mem] : [];
}

/**
 * Save queue to LocalStorage for a specific UID.
 * Guards against QuotaExceededError, dispatches event, and preserves in-memory state.
 * NEVER deletes or empties pending queue on quota failure!
 */
export function saveSyncQueue(uid: string, queue: SyncOperation[]): boolean {
  if (!uid) return false;
  // Always update in-memory fallback first
  memoryQueues.set(uid, [...queue]);
  notifySubscribers(uid);

  try {
    localStorage.setItem(getStorageKey(uid), JSON.stringify(queue));
    return true;
  } catch (err: any) {
    console.error(`[SyncQueue] LocalStorage write failed for user ${uid}:`, err);
    const isQuotaError =
      err?.name === 'QuotaExceededError' ||
      err?.name === 'NS_ERROR_DOM_QUOTA_REACHED' ||
      err?.code === 22 ||
      err?.number === -2147024882;

    if (isQuotaError && typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('cardpulse:storage_quota_exceeded', {
          detail: {
            uid,
            error: err,
            queueLength: queue.length,
          },
        })
      );
    }
    // Return false indicating disk persistence failed, but data remains safe in memory
    return false;
  }
}

/**
 * Clear queue from memory and local storage (e.g. on user logout / reset)
 */
export function clearSyncQueue(uid: string): void {
  if (!uid) return;
  memoryQueues.delete(uid);
  try {
    localStorage.removeItem(getStorageKey(uid));
  } catch {}
  notifySubscribers(uid);
}

/**
 * Compute current stats for a UID
 */
export function getSyncStats(uid: string): SyncStats {
  const queue = loadSyncQueue(uid);
  return {
    pendingCount: queue.filter((q) => q.status === 'pending' || q.status === 'in_progress').length,
    conflictCount: queue.filter((q) => q.status === 'conflict').length,
    failedCount: queue.filter((q) => q.status === 'failed').length,
    isProcessing: isProcessingQueue,
  };
}

/**
 * Subscribe to queue changes for a UID
 */
export function subscribeSyncQueue(
  uid: string,
  callback: (ops: SyncOperation[], stats: SyncStats) => void
): () => void {
  if (!subscribers.has(uid)) {
    subscribers.set(uid, new Set());
  }
  subscribers.get(uid)!.add(callback);

  // Initial push
  const current = loadSyncQueue(uid);
  callback(current, getSyncStats(uid));

  return () => {
    const subs = subscribers.get(uid);
    if (subs) {
      subs.delete(callback);
      if (subs.size === 0) subscribers.delete(uid);
    }
  };
}

function notifySubscribers(uid: string): void {
  const subs = subscribers.get(uid);
  if (!subs) return;
  const current = loadSyncQueue(uid);
  const stats = getSyncStats(uid);
  subs.forEach((cb) => {
    try {
      cb(current, stats);
    } catch (e) {
      console.error('Error in sync queue subscriber:', e);
    }
  });
}

/**
 * Task 2: Add or Merge an operation into the pending queue with deduplication
 */
export function enqueueOperation(
  uid: string,
  params: {
    entityType: SyncEntityType;
    documentId: string;
    operationType: SyncOperationType;
    payload: any;
    baseVersion?: number;
  }
): SyncOperation {
  const queue = loadSyncQueue(uid);
  const now = Date.now();

  const existingIndex = queue.findIndex(
    (item) =>
      item.entityType === params.entityType &&
      item.documentId === params.documentId &&
      item.status !== 'completed'
  );

  let targetOp: SyncOperation;

  if (existingIndex >= 0) {
    const prev = queue[existingIndex];

    if (params.operationType === 'delete') {
      if (prev.operationType === 'create') {
        // Document was created locally while offline and then deleted before ever reaching cloud -> discard both!
        queue.splice(existingIndex, 1);
        saveSyncQueue(uid, queue);
        return {
          operationId: `op_cancelled_${now}`,
          uid,
          entityType: params.entityType,
          documentId: params.documentId,
          operationType: 'delete',
          payload: null,
          baseVersion: params.baseVersion || 1,
          createdAt: now,
          retryCount: 0,
          status: 'completed',
        };
      }
      // If previous was an update, change to delete operation
      prev.operationType = 'delete';
      prev.payload = params.payload;
      prev.status = 'pending';
      prev.retryCount = 0;
      prev.lastError = undefined;
      targetOp = prev;
    } else {
      // It's an update on top of previous create or update
      prev.payload = { ...prev.payload, ...params.payload };
      prev.status = 'pending';
      prev.retryCount = 0;
      prev.lastError = undefined;
      // Retain original baseVersion so conflict check verifies against the actual base state
      targetOp = prev;
    }
  } else {
    // New queue item
    targetOp = {
      operationId: `op_${now}_${Math.random().toString(36).substring(2, 9)}`,
      uid,
      entityType: params.entityType,
      documentId: params.documentId,
      operationType: params.operationType,
      payload: params.payload,
      baseVersion: params.baseVersion || 1,
      createdAt: now,
      retryCount: 0,
      status: 'pending',
    };
    queue.push(targetOp);
  }

  saveSyncQueue(uid, queue);
  return targetOp;
}

/**
 * Task 3 & 4: Process the Sync Queue
 * Verifies authentication, checks versions, handles conflicts, and retries with backoff
 */
export async function processSyncQueue(
  uid: string,
  callbacks?: {
    onConflict?: (op: SyncOperation, serverData: any) => void;
    onSuccess?: (op: SyncOperation) => void;
    onError?: (op: SyncOperation, error: any) => void;
  }
): Promise<{
  processed: number;
  succeeded: number;
  conflicts: number;
  failed: number;
}> {
  // Guard 1: Verify current authenticated user matches queue UID
  if (!auth.currentUser || auth.currentUser.uid !== uid) {
    return { processed: 0, succeeded: 0, conflicts: 0, failed: 0 };
  }

  // Guard 2: Prevent concurrent execution of the queue (intra-tab)
  if (isProcessingQueue) {
    return { processed: 0, succeeded: 0, conflicts: 0, failed: 0 };
  }

  // Guard 3: Cross-tab lock to prevent race conditions across multiple open tabs
  if (!acquireSyncLock(uid)) {
    return { processed: 0, succeeded: 0, conflicts: 0, failed: 0 };
  }

  // Guard 4: Check network connectivity
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    releaseSyncLock(uid);
    return { processed: 0, succeeded: 0, conflicts: 0, failed: 0 };
  }

  isProcessingQueue = true;
  notifySubscribers(uid);

  let processed = 0;
  let succeeded = 0;
  let conflicts = 0;
  let failed = 0;
  let heartbeatTimer: any = null;

  try {
    // Start Heartbeat interval to renew lock every 4 seconds during active sync
    heartbeatTimer = setInterval(() => {
      const renewed = renewSyncLock(uid);
      if (!renewed) {
        console.warn(`[SyncQueue] Tab ${TAB_ID} lost lock during sync for user ${uid}.`);
      }
    }, 4000);

    const queue = loadSyncQueue(uid);
    const now = Date.now();
    const activeOps = queue.filter(
      (op) =>
        (op.status === 'pending' || op.status === 'failed') &&
        (!op.nextRetryAt || now >= op.nextRetryAt)
    );

    for (const op of activeOps) {
      // Re-verify auth on each step
      if (!auth.currentUser || auth.currentUser.uid !== uid) break;

      // Lock Guard: Verify this tab still legitimately owns the lock
      if (!isCurrentTabLockOwner(uid)) {
        console.warn(`[SyncQueue] Tab ${TAB_ID} is no longer lock owner. Halting queue processing safely.`);
        break;
      }

      op.status = 'in_progress';
      saveSyncQueue(uid, queue);

      try {
        await executeOperation(uid, op);

        // Success: mark completed and remove from queue
        op.status = 'completed';
        op.nextRetryAt = undefined;
        op.conflictResolutionAttempts = 0;
        succeeded++;
        processed++;
        if (callbacks?.onSuccess) callbacks.onSuccess(op);
      } catch (err: any) {
        processed++;
        if (err?.code === 'DATA_CONFLICT') {
          // Task 3: Conflict Detected! Do not overwrite, mark conflict, keep queue
          op.status = 'conflict';
          op.lastError = err.message;
          op.conflictServerData = err.serverData;
          op.nextRetryAt = undefined;
          conflicts++;
          if (callbacks?.onConflict) callbacks.onConflict(op, err.serverData);
        } else {
          // Network / Transient failure
          op.status = 'failed';
          op.retryCount += 1;
          op.lastError = err?.message || String(err);
          // Exponential backoff: 2s, 4s, 8s, up to 30s max
          const backoffDelay = Math.min(30000, 1000 * Math.pow(2, op.retryCount));
          op.nextRetryAt = Date.now() + backoffDelay;
          failed++;
          if (callbacks?.onError) callbacks.onError(op, err);

          // If network / offline error, pause processing rest of queue
          const isNetworkError =
            (typeof navigator !== 'undefined' && !navigator.onLine) ||
            err?.code === 'unavailable' ||
            err?.code === 'failed-precondition' ||
            err?.code === 'deadline-exceeded' ||
            (err?.message && /offline|network|fetch|timeout/i.test(err.message));

          if (isNetworkError) {
            break;
          }
        }
      }

      saveSyncQueue(uid, queue);
    }

    // Clean up completed operations
    const cleaned = queue.filter((q) => q.status !== 'completed');
    saveSyncQueue(uid, cleaned);
  } finally {
    if (heartbeatTimer) clearInterval(heartbeatTimer);
    isProcessingQueue = false;
    releaseSyncLock(uid);
    notifySubscribers(uid);
  }

  return { processed, succeeded, conflicts, failed };
}

/**
 * Execute a single operation against Firestore with optimistic concurrency check
 */
async function executeOperation(uid: string, op: SyncOperation): Promise<void> {
  const { entityType, documentId, operationType, payload, baseVersion } = op;

  if (entityType === 'card') {
    const docRef = doc(db, 'users', uid, 'cards', documentId);

    if (operationType === 'delete') {
      await runTransaction(db, async (txn) => {
        const snap = await txn.get(docRef);
        if (snap.exists()) {
          txn.delete(docRef);
        }
      });
      return;
    }

    await runTransaction(db, async (txn) => {
      const snap = await txn.get(docRef);
      let newVersion = 1;

      if (snap.exists()) {
        const serverData = snap.data();
        const serverVersion = typeof serverData.version === 'number' ? serverData.version : 1;

        if (operationType === 'create' && serverVersion >= baseVersion) {
          const conflictErr = new Error(
            `ตรวจพบข้อมูลขัดแย้ง: บัตร "${payload.name || documentId}" มีอยู่แล้วบนเซิร์ฟเวอร์ (เวอร์ชันคลาวด์ v${serverVersion})`
          );
          (conflictErr as any).code = 'DATA_CONFLICT';
          (conflictErr as any).serverData = serverData;
          throw conflictErr;
        }

        // Conflict check: if server version differs from offline baseVersion
        if (serverVersion > baseVersion) {
          const conflictErr = new Error(
            `ตรวจพบข้อมูลขัดแย้ง: บัตร "${payload.name || documentId}" ถูกแก้ไขบนเซิร์ฟเวอร์ก่อนหน้านี้ (เวอร์ชันคลาวด์ v${serverVersion} > v${baseVersion})`
          );
          (conflictErr as any).code = 'DATA_CONFLICT';
          (conflictErr as any).serverData = serverData;
          throw conflictErr;
        } else if (serverVersion === baseVersion) {
          // Expected match
          newVersion = serverVersion + 1;
        } else {
          // serverVersion < baseVersion: anomaly handling, preserve monotonicity
          console.warn(`[SyncQueue] Card version anomaly for ${documentId}: server v${serverVersion} < base v${baseVersion}. Advancing to v${baseVersion + 1}.`);
          newVersion = baseVersion + 1;
        }
      } else {
        // Document does not exist on Cloud
        if (operationType === 'update') {
          // Deleted on Cloud remotely by another device!
          const conflictErr = new Error(
            `ตรวจพบข้อมูลขัดแย้ง: บัตร "${payload.name || documentId}" ถูกลบบนเซิร์ฟเวอร์โดยอุปกรณ์อื่นแล้ว`
          );
          (conflictErr as any).code = 'DATA_CONFLICT';
          (conflictErr as any).serverData = { deleted: true, version: baseVersion };
          throw conflictErr;
        }
        newVersion = 1;
      }

      const cardPayload: Record<string, any> = {
        id: documentId,
        userId: uid,
        name: payload.name,
        bank: payload.bank,
        last4: payload.last4 || '',
        creditLimit: Number(payload.creditLimit || 0),
        billingCutoffDay: Number(payload.billingCutoffDay),
        paymentDueDay: Number(payload.paymentDueDay),
        colorGradient: payload.colorGradient || '',
        accentColor: payload.accentColor || '',
        status: payload.status || 'active',
        orderIndex: payload.orderIndex !== undefined ? Number(payload.orderIndex) : 0,
        version: newVersion,
        updatedAt: serverTimestamp(),
      };
      if (payload.cardType) cardPayload.cardType = payload.cardType;
      if (!snap.exists()) {
        cardPayload.createdAt = serverTimestamp();
      }

      txn.set(docRef, cardPayload, { merge: true });
    });
  } else if (entityType === 'transaction') {
    const docRef = doc(db, 'users', uid, 'transactions', documentId);

    if (operationType === 'delete') {
      await runTransaction(db, async (txn) => {
        const snap = await txn.get(docRef);
        if (snap.exists()) {
          txn.delete(docRef);
        }
      });
      return;
    }

    await runTransaction(db, async (txn) => {
      const snap = await txn.get(docRef);
      let newVersion = 1;

      if (snap.exists()) {
        const serverData = snap.data();
        const serverVersion = typeof serverData.version === 'number' ? serverData.version : 1;

        if (operationType === 'create' && serverVersion >= baseVersion) {
          const conflictErr = new Error(
            `ตรวจพบข้อมูลขัดแย้ง: รายการ "${payload.title || documentId}" มีอยู่แล้วบนเซิร์ฟเวอร์ (เวอร์ชันคลาวด์ v${serverVersion})`
          );
          (conflictErr as any).code = 'DATA_CONFLICT';
          (conflictErr as any).serverData = serverData;
          throw conflictErr;
        }

        if (serverVersion > baseVersion) {
          const conflictErr = new Error(
            `ตรวจพบข้อมูลขัดแย้ง: รายการ "${payload.title || documentId}" ถูกแก้ไขบนเซิร์ฟเวอร์ก่อนหน้านี้ (เวอร์ชันคลาวด์ v${serverVersion} > v${baseVersion})`
          );
          (conflictErr as any).code = 'DATA_CONFLICT';
          (conflictErr as any).serverData = serverData;
          throw conflictErr;
        } else if (serverVersion === baseVersion) {
          newVersion = serverVersion + 1;
        } else {
          console.warn(`[SyncQueue] Transaction version anomaly for ${documentId}: server v${serverVersion} < base v${baseVersion}. Advancing to v${baseVersion + 1}.`);
          newVersion = baseVersion + 1;
        }
      } else {
        if (operationType === 'update') {
          const conflictErr = new Error(
            `ตรวจพบข้อมูลขัดแย้ง: รายการ "${payload.title || documentId}" ถูกลบบนเซิร์ฟเวอร์โดยอุปกรณ์อื่นแล้ว`
          );
          (conflictErr as any).code = 'DATA_CONFLICT';
          (conflictErr as any).serverData = { deleted: true, version: baseVersion };
          throw conflictErr;
        }
        newVersion = 1;
      }

      const txPayload: Record<string, any> = {
        id: documentId,
        userId: uid,
        cardId: payload.cardId,
        date: payload.date,
        title: payload.title,
        category: payload.category,
        amount: Number(payload.amount),
        billingCycleMonth: payload.billingCycleMonth,
        isPaid: !!payload.isPaid,
        version: newVersion,
        updatedAt: serverTimestamp(),
      };
      if (payload.isInstallment !== undefined) txPayload.isInstallment = payload.isInstallment;
      if (payload.totalInstallments !== undefined) txPayload.totalInstallments = Number(payload.totalInstallments);
      if (payload.currentInstallment !== undefined) txPayload.currentInstallment = Number(payload.currentInstallment);
      if (payload.monthlyInstallmentAmount !== undefined) txPayload.monthlyInstallmentAmount = Number(payload.monthlyInstallmentAmount);
      if (payload.installmentGroupId) txPayload.installmentGroupId = payload.installmentGroupId;
      if (payload.note) txPayload.note = payload.note;
      if (payload.tags && Array.isArray(payload.tags)) txPayload.tags = payload.tags.slice(0, 10);
      if (payload.paidDate) txPayload.paidDate = payload.paidDate;
      if (!snap.exists()) {
        txPayload.createdAt = serverTimestamp();
      }

      txn.set(docRef, txPayload, { merge: true });
    });
  } else if (entityType === 'profile') {
    const userRef = doc(db, 'users', uid);
    const sanitized: Record<string, any> = {
      userId: uid,
      updatedAt: serverTimestamp(),
    };
    if (payload.brandName !== undefined) sanitized.brandName = payload.brandName;
    if (payload.brandLogo !== undefined) sanitized.brandLogo = payload.brandLogo;
    if (payload.brandTagline !== undefined) sanitized.brandTagline = payload.brandTagline;
    if (payload.bgImage !== undefined) sanitized.bgImage = payload.bgImage;
    if (payload.bgOpacity !== undefined) sanitized.bgOpacity = payload.bgOpacity;
    if (payload.bgBlur !== undefined) sanitized.bgBlur = payload.bgBlur;
    if (payload.bgPosition !== undefined) sanitized.bgPosition = payload.bgPosition;

    await setDoc(userRef, sanitized, { merge: true });
  }
}

/**
 * Task 3: Resolve Conflict
 * User can choose 'keep_local' (overwrites server with incremented version) or 'keep_server' (discards local op)
 */
export async function resolveConflict(
  uid: string,
  operationId: string,
  resolution: 'keep_local' | 'keep_server'
): Promise<void> {
  const queue = loadSyncQueue(uid);
  const index = queue.findIndex((op) => op.operationId === operationId);
  if (index < 0) return;

  const op = queue[index];

  if (resolution === 'keep_server') {
    // Discard local operation ONLY - other operations in queue remain completely intact
    queue.splice(index, 1);
    saveSyncQueue(uid, queue);
    return;
  }

  // keep_local: force write with latest server version as new baseVersion
  if (op.conflictServerData?.deleted) {
    // Document was deleted on server: re-create it locally
    op.operationType = 'create';
    op.baseVersion = 0;
  } else if (op.conflictServerData && typeof op.conflictServerData.version === 'number') {
    op.baseVersion = op.conflictServerData.version;
  } else {
    op.baseVersion = op.baseVersion + 1;
  }

  // Prevent infinite conflict loop (max 3 consecutive user resolution attempts)
  const attempts = (op.conflictResolutionAttempts || 0) + 1;
  op.conflictResolutionAttempts = attempts;

  if (attempts > 3) {
    op.status = 'conflict';
    op.lastError = 'ตรวจพบข้อมูลขัดแย้งซ้ำซ้อนเกิน 3 ครั้ง โปรดรีเฟรชหรือตรวจสอบข้อมูลบนคลาวด์';
    saveSyncQueue(uid, queue);
    return;
  }

  op.status = 'pending';
  op.lastError = undefined;
  op.conflictServerData = undefined;
  saveSyncQueue(uid, queue);

  // Trigger sync
  await processSyncQueue(uid);
}
