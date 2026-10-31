import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  onAuthStateChanged,
  User,
  signOut,
} from 'firebase/auth';
import {
  getFirestore,
  doc,
  collection,
  setDoc,
  deleteDoc,
  onSnapshot,
  getDocFromServer,
  writeBatch,
  serverTimestamp,
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import { CreditCard, Transaction } from '../types';

// 1. Initialize Firebase App and Services
export const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(app);

// Initialize Firestore using custom databaseId if configured, or default
export const db = firebaseConfig.firestoreDatabaseId
  ? getFirestore(app, firebaseConfig.firestoreDatabaseId)
  : getFirestore(app);

// Google Auth Provider for popup login
const googleProvider = new GoogleAuthProvider();

// 2. Validate Connection to Firestore on startup (Mandatory per Skill guidelines)
export async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error('Please check your Firebase configuration.');
    }
  }
}
testConnection();

// 3. Error Handling conforming to FirestoreErrorInfo
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// 4. Authentication Functions
export const loginWithGoogle = async (): Promise<User | null> => {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  } catch (error: any) {
    if (
      error?.code === 'auth/popup-closed-by-user' ||
      error?.code === 'auth/cancelled-popup-request'
    ) {
      return null;
    }
    if (error?.code === 'auth/popup-blocked') {
      throw new Error('เบราว์เซอร์บล็อกหน้าต่าง Pop-up โปรดอนุญาต Pop-up แล้วลองใหม่อีกครั้ง');
    }
    console.error('Login error:', error);
    throw error;
  }
};

export const logoutUser = async (): Promise<void> => {
  await signOut(auth);
};

export const subscribeAuth = (callback: (user: User | null) => void) => {
  return onAuthStateChanged(auth, callback);
};

// 5. User Profile / Settings
export interface UserPreferencesPayload {
  userId: string;
  brandName?: string;
  brandLogo?: string | null;
  brandTagline?: string;
  bgImage?: string | null;
  bgOpacity?: number;
  bgBlur?: number;
  bgPosition?: any;
}

export const subscribeUserProfile = (
  userId: string,
  callback: (data: UserPreferencesPayload | null) => void
) => {
  const path = `users/${userId}`;
  return onSnapshot(
    doc(db, 'users', userId),
    (snapshot) => {
      if (snapshot.exists()) {
        callback(snapshot.data() as UserPreferencesPayload);
      } else {
        callback(null);
      }
    },
    (error) => {
      handleFirestoreError(error, OperationType.GET, path);
    }
  );
};

export const saveUserProfileToFirestore = async (
  userId: string,
  data: Partial<UserPreferencesPayload>
) => {
  const path = `users/${userId}`;
  try {
    const docRef = doc(db, 'users', userId);
    // Sanitize undefined fields
    const sanitized: Record<string, any> = {
      userId,
      updatedAt: serverTimestamp(),
    };
    if (data.brandName !== undefined) sanitized.brandName = data.brandName;
    if (data.brandLogo !== undefined) sanitized.brandLogo = data.brandLogo;
    if (data.brandTagline !== undefined) sanitized.brandTagline = data.brandTagline;
    if (data.bgImage !== undefined) sanitized.bgImage = data.bgImage;
    if (data.bgOpacity !== undefined) sanitized.bgOpacity = data.bgOpacity;
    if (data.bgBlur !== undefined) sanitized.bgBlur = data.bgBlur;
    if (data.bgPosition !== undefined) sanitized.bgPosition = data.bgPosition;

    await setDoc(docRef, sanitized, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
};

// 6. Credit Cards Synchronization
export const subscribeUserCards = (
  userId: string,
  callback: (cards: CreditCard[]) => void
) => {
  const path = `users/${userId}/cards`;
  return onSnapshot(
    collection(db, 'users', userId, 'cards'),
    (snapshot) => {
      const cards: CreditCard[] = [];
      snapshot.forEach((d) => {
        const item = d.data() as CreditCard;
        cards.push({
          id: item.id || d.id,
          name: item.name,
          bank: item.bank,
          last4: item.last4,
          creditLimit: item.creditLimit,
          billingCutoffDay: item.billingCutoffDay,
          paymentDueDay: item.paymentDueDay,
          colorGradient: item.colorGradient,
          accentColor: item.accentColor,
          cardType: item.cardType,
          status: item.status,
        });
      });
      callback(cards);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
    }
  );
};

export const saveUserCardToFirestore = async (userId: string, card: CreditCard) => {
  const path = `users/${userId}/cards/${card.id}`;
  try {
    const docRef = doc(db, 'users', userId, 'cards', card.id);
    const payload: Record<string, any> = {
      id: card.id,
      userId,
      name: card.name,
      bank: card.bank,
      last4: card.last4 || '',
      creditLimit: card.creditLimit || 0,
      billingCutoffDay: Number(card.billingCutoffDay),
      paymentDueDay: Number(card.paymentDueDay),
      colorGradient: card.colorGradient || '',
      accentColor: card.accentColor || '',
      status: card.status || 'active',
      updatedAt: serverTimestamp(),
    };
    if (card.cardType) payload.cardType = card.cardType;
    await setDoc(docRef, payload, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
};

export const deleteUserCardFromFirestore = async (userId: string, cardId: string) => {
  const path = `users/${userId}/cards/${cardId}`;
  try {
    await deleteDoc(doc(db, 'users', userId, 'cards', cardId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
};

// 7. Transactions Synchronization
export const subscribeUserTransactions = (
  userId: string,
  callback: (transactions: Transaction[]) => void
) => {
  const path = `users/${userId}/transactions`;
  return onSnapshot(
    collection(db, 'users', userId, 'transactions'),
    (snapshot) => {
      const txs: Transaction[] = [];
      snapshot.forEach((d) => {
        const item = d.data() as any;
        txs.push({
          id: item.id || d.id,
          cardId: item.cardId,
          date: item.date,
          title: item.title,
          category: item.category,
          amount: Number(item.amount),
          billingCycleMonth: item.billingCycleMonth,
          isInstallment: !!item.isInstallment,
          totalInstallments: item.totalInstallments ? Number(item.totalInstallments) : undefined,
          currentInstallment: item.currentInstallment ? Number(item.currentInstallment) : undefined,
          monthlyInstallmentAmount: item.monthlyInstallmentAmount
            ? Number(item.monthlyInstallmentAmount)
            : undefined,
          installmentGroupId: item.installmentGroupId,
          note: item.note || '',
          tags: item.tags || [],
          isPaid: !!item.isPaid,
          paidDate: item.paidDate || undefined,
          createdAt: item.createdAt?.toDate ? item.createdAt.toDate().toISOString() : item.createdAt || new Date().toISOString(),
        });
      });
      callback(txs);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
    }
  );
};

export const saveUserTransactionToFirestore = async (
  userId: string,
  tx: Transaction
) => {
  const path = `users/${userId}/transactions/${tx.id}`;
  try {
    const docRef = doc(db, 'users', userId, 'transactions', tx.id);
    const payload: Record<string, any> = {
      id: tx.id,
      userId,
      cardId: tx.cardId,
      date: tx.date,
      title: tx.title,
      category: tx.category,
      amount: Number(tx.amount),
      billingCycleMonth: tx.billingCycleMonth,
      isPaid: !!tx.isPaid,
      updatedAt: serverTimestamp(),
    };

    if (tx.isInstallment !== undefined) payload.isInstallment = tx.isInstallment;
    if (tx.totalInstallments !== undefined) payload.totalInstallments = Number(tx.totalInstallments);
    if (tx.currentInstallment !== undefined) payload.currentInstallment = Number(tx.currentInstallment);
    if (tx.monthlyInstallmentAmount !== undefined) payload.monthlyInstallmentAmount = Number(tx.monthlyInstallmentAmount);
    if (tx.installmentGroupId) payload.installmentGroupId = tx.installmentGroupId;
    if (tx.note) payload.note = tx.note;
    if (tx.tags && Array.isArray(tx.tags)) payload.tags = tx.tags.slice(0, 10);
    if (tx.paidDate) payload.paidDate = tx.paidDate;

    await setDoc(docRef, payload, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
};

export const deleteUserTransactionFromFirestore = async (
  userId: string,
  transactionId: string
) => {
  const path = `users/${userId}/transactions/${transactionId}`;
  try {
    await deleteDoc(doc(db, 'users', userId, 'transactions', transactionId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
};

// Batch seed or sync local data to Firebase upon first login
export const syncInitialDataToCloud = async (
  userId: string,
  cards: CreditCard[],
  transactions: Transaction[]
) => {
  const path = `users/${userId}`;
  try {
    // Write user doc
    await setDoc(
      doc(db, 'users', userId),
      {
        userId,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );

    // Write cards in batches (max 500 ops)
    const cardBatch = writeBatch(db);
    cards.forEach((card) => {
      const cRef = doc(db, 'users', userId, 'cards', card.id);
      cardBatch.set(cRef, {
        id: card.id,
        userId,
        name: card.name,
        bank: card.bank,
        last4: card.last4 || '',
        creditLimit: card.creditLimit || 0,
        billingCutoffDay: Number(card.billingCutoffDay),
        paymentDueDay: Number(card.paymentDueDay),
        colorGradient: card.colorGradient || '',
        accentColor: card.accentColor || '',
        status: card.status || 'active',
        updatedAt: serverTimestamp(),
      });
    });
    await cardBatch.commit();

    // Write transactions in batches
    const chunkSize = 400;
    for (let i = 0; i < transactions.length; i += chunkSize) {
      const chunk = transactions.slice(i, i + chunkSize);
      const txBatch = writeBatch(db);
      chunk.forEach((tx) => {
        const tRef = doc(db, 'users', userId, 'transactions', tx.id);
        const payload: Record<string, any> = {
          id: tx.id,
          userId,
          cardId: tx.cardId,
          date: tx.date,
          title: tx.title,
          category: tx.category,
          amount: Number(tx.amount),
          billingCycleMonth: tx.billingCycleMonth,
          isPaid: !!tx.isPaid,
          updatedAt: serverTimestamp(),
        };
        if (tx.isInstallment !== undefined) payload.isInstallment = tx.isInstallment;
        if (tx.totalInstallments !== undefined) payload.totalInstallments = Number(tx.totalInstallments);
        if (tx.currentInstallment !== undefined) payload.currentInstallment = Number(tx.currentInstallment);
        if (tx.monthlyInstallmentAmount !== undefined) payload.monthlyInstallmentAmount = Number(tx.monthlyInstallmentAmount);
        if (tx.installmentGroupId) payload.installmentGroupId = tx.installmentGroupId;
        if (tx.note) payload.note = tx.note;
        if (tx.tags && Array.isArray(tx.tags)) payload.tags = tx.tags.slice(0, 10);
        if (tx.paidDate) payload.paidDate = tx.paidDate;

        txBatch.set(tRef, payload, { merge: true });
      });
      await txBatch.commit();
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
};
