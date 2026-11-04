import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  GoogleAuthProvider,
  onAuthStateChanged,
  User,
  signOut,
  setPersistence,
  browserLocalPersistence,
} from 'firebase/auth';
import {
  getFirestore,
  doc,
  collection,
  setDoc,
  deleteDoc,
  getDoc,
  getDocs,
  onSnapshot,
  getDocFromServer,
  writeBatch,
  serverTimestamp,
  runTransaction,
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import { CreditCard, Transaction } from '../types';

// Resolve configuration: Merge import.meta.env (Vercel / Production env vars) with fallback to firebase-applet-config.json
const rawConfig = (typeof firebaseConfig !== 'undefined' ? firebaseConfig : {}) as Record<string, any>;

export const firebaseAppConfig = {
  projectId: import.meta.env?.VITE_FIREBASE_PROJECT_ID || rawConfig.projectId || 'gen-lang-client-0967357802',
  appId: import.meta.env?.VITE_FIREBASE_APP_ID || rawConfig.appId || '1:881575334440:web:67cdc6d318f546a5f15b1d',
  apiKey: import.meta.env?.VITE_FIREBASE_API_KEY || rawConfig.apiKey || 'AIzaSyAONglDA2Jss3-PCn4NKXeFFwg9XA8w6z8',
  authDomain: import.meta.env?.VITE_FIREBASE_AUTH_DOMAIN || rawConfig.authDomain || 'gen-lang-client-0967357802.firebaseapp.com',
  firestoreDatabaseId:
    import.meta.env?.VITE_FIREBASE_FIRESTORE_DATABASE_ID ||
    import.meta.env?.VITE_FIRESTORE_DATABASE_ID ||
    rawConfig.firestoreDatabaseId ||
    'ai-studio-creditcardrecord-d130ca53-bac9-4d31-b18a-c5ec1ec9582c',
  storageBucket: import.meta.env?.VITE_FIREBASE_STORAGE_BUCKET || rawConfig.storageBucket || 'gen-lang-client-0967357802.firebasestorage.app',
  messagingSenderId: import.meta.env?.VITE_FIREBASE_MESSAGING_SENDER_ID || rawConfig.messagingSenderId || '881575334440',
  measurementId: import.meta.env?.VITE_FIREBASE_MEASUREMENT_ID || rawConfig.measurementId || '',
  oAuthClientId: import.meta.env?.VITE_FIREBASE_OAUTH_CLIENT_ID || rawConfig.oAuthClientId || '881575334440-qhocurg4d54pla931n5gcccqv8a7b9bv.apps.googleusercontent.com',
};

// 1. Initialize Firebase App and Services
export const app = getApps().length > 0 ? getApp() : initializeApp(firebaseAppConfig);
export const auth = getAuth(app);

// Explicitly configure browserLocalPersistence to survive iOS Safari & Android mobile browser reloads
if (typeof window !== 'undefined') {
  setPersistence(auth, browserLocalPersistence).catch((err) => {
    console.warn('Set persistence warning:', err);
  });
}

// Initialize Firestore using custom databaseId if configured, or default
export const db = firebaseAppConfig.firestoreDatabaseId
  ? getFirestore(app, firebaseAppConfig.firestoreDatabaseId)
  : getFirestore(app);

// Google Auth Provider with account selection prompt
const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: 'select_account',
});
googleProvider.addScope('email');
googleProvider.addScope('profile');

// 2. Validate Connection to Firestore safely (Mandatory per Skill guidelines)
export async function testConnection() {
  try {
    if (auth.currentUser) {
      await getDocFromServer(doc(db, 'test', 'connection'));
    }
  } catch (error: any) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('Firebase client is offline.');
    }
  }
}
testConnection();

// Mask email for safe privacy-compliant diagnostic logging (e.g. m***e@gmail.com)
export const maskEmail = (email?: string | null): string | null => {
  if (!email) return null;
  const parts = email.split('@');
  if (parts.length !== 2) return '***';
  const name = parts[0];
  const domain = parts[1];
  if (name.length <= 2) return `${name[0]}***@${domain}`;
  return `${name[0]}***${name[name.length - 1]}@${domain}`;
};

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
  const errCode = (error as any)?.code || 'unknown';
  const errMsg = error instanceof Error ? error.message : String(error);
  const errInfo: FirestoreErrorInfo = {
    error: errMsg,
    operationType,
    path,
    authInfo: {
      userId: auth.currentUser?.uid,
      email: maskEmail(auth.currentUser?.email),
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: maskEmail(provider.email),
        })) || [],
    },
  };
  console.error(`Firestore Error [${errCode}]: `, JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export interface SystemDiagnosticSummary {
  projectId: string;
  authDomain: string;
  firestoreDatabaseId: string;
  currentHostname: string;
  origin: string;
  authState: 'authenticated' | 'unauthenticated' | 'loading';
  authenticatedUid: string | null;
  authenticatedEmailMasked: string | null;
  isVercel: boolean;
  isAiStudio: boolean;
  timestamp: string;
}

export const getSystemDiagnosticSummary = (
  currentUser?: User | null,
  isAuthLoading = false
): SystemDiagnosticSummary => {
  const hostname = typeof window !== 'undefined' ? window.location.hostname : 'unknown';
  const origin = typeof window !== 'undefined' ? window.location.origin : 'unknown';
  const isVercel = hostname.includes('vercel.app');
  const isAiStudio = hostname.includes('run.app') || hostname.includes('google');

  return {
    projectId: firebaseAppConfig.projectId,
    authDomain: firebaseAppConfig.authDomain,
    firestoreDatabaseId: firebaseAppConfig.firestoreDatabaseId,
    currentHostname: hostname,
    origin,
    authState: isAuthLoading ? 'loading' : currentUser ? 'authenticated' : 'unauthenticated',
    authenticatedUid: currentUser?.uid || null,
    authenticatedEmailMasked: maskEmail(currentUser?.email),
    isVercel,
    isAiStudio,
    timestamp: new Date().toISOString(),
  };
};

if (typeof window !== 'undefined') {
  (window as any).__cardpulse_system_diagnostics = getSystemDiagnosticSummary;
}

// 4. Browser Environment Detection & Mobile Diagnostic Logging
export interface BrowserEnv {
  isMobile: boolean;
  isInAppBrowser: boolean;
  inAppBrowserName?: string;
  isIOS: boolean;
  isAndroid: boolean;
}

export type AuthDiagnosticMilestone =
  | 'Login Started'
  | 'Redirect Initiated'
  | 'Redirect Returned'
  | 'Redirect Result Received'
  | 'Auth State Changed'
  | 'User UID Confirmed'
  | 'Firestore User Data Loaded'
  | 'Auth Error Code';

export interface AuthDiagnosticEvent {
  timestamp: string;
  milestone: AuthDiagnosticMilestone;
  details?: Record<string, any>;
}

const REDIRECT_PENDING_KEY = 'cardpulse_auth_redirect_pending';
const REDIRECT_TIME_KEY = 'cardpulse_auth_redirect_time';
const DIAGNOSTICS_STORAGE_KEY = 'cardpulse_auth_diagnostics';

// Diagnostic Logger: Logs sanitized milestones without any token or secret
export const logAuthDiagnostic = (
  milestone: AuthDiagnosticMilestone,
  details?: Record<string, any>
) => {
  const timestamp = new Date().toISOString();
  // Strictly filter out any credentials, tokens, or private secrets
  const safeDetails: Record<string, any> = {};
  if (details && typeof details === 'object') {
    Object.keys(details).forEach((key) => {
      const lower = key.toLowerCase();
      if (
        lower.includes('token') ||
        lower.includes('secret') ||
        lower.includes('credential') ||
        lower.includes('password')
      ) {
        safeDetails[key] = '[REDACTED]';
      } else {
        safeDetails[key] = details[key];
      }
    });
  }

  console.log(`[Auth Diagnostic] [${timestamp}] ${milestone}`, safeDetails);

  if (typeof window !== 'undefined') {
    try {
      const raw = sessionStorage.getItem(DIAGNOSTICS_STORAGE_KEY);
      const list: AuthDiagnosticEvent[] = raw ? JSON.parse(raw) : [];
      list.push({ timestamp, milestone, details: safeDetails });
      sessionStorage.setItem(DIAGNOSTICS_STORAGE_KEY, JSON.stringify(list.slice(-30)));
    } catch {
      // ignore storage limitations
    }
  }
};

export const getAuthDiagnostics = (): AuthDiagnosticEvent[] => {
  if (typeof window === 'undefined') return [];
  try {
    const raw = sessionStorage.getItem(DIAGNOSTICS_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

if (typeof window !== 'undefined') {
  (window as any).__cardpulse_get_auth_diagnostics = getAuthDiagnostics;
}

// Dual-Storage Redirect State Helpers (survives iOS Safari / WebKit cross-site navigation)
export const isRedirectLoginPending = (): boolean => {
  if (typeof window === 'undefined') return false;
  try {
    const pendingSession = sessionStorage.getItem(REDIRECT_PENDING_KEY) === 'true';
    const pendingLocal = localStorage.getItem(REDIRECT_PENDING_KEY) === 'true';
    const timeStr = localStorage.getItem(REDIRECT_TIME_KEY) || sessionStorage.getItem(REDIRECT_TIME_KEY);

    if (pendingSession || pendingLocal) {
      if (timeStr) {
        const elapsed = Date.now() - parseInt(timeStr, 10);
        // Expire after 10 minutes to prevent stale stuck states
        if (elapsed > 10 * 60 * 1000) {
          clearRedirectLoginFlag();
          return false;
        }
      }
      return true;
    }
    return false;
  } catch {
    return false;
  }
};

export const setRedirectLoginFlag = () => {
  if (typeof window === 'undefined') return;
  try {
    const now = Date.now().toString();
    sessionStorage.setItem(REDIRECT_PENDING_KEY, 'true');
    sessionStorage.setItem(REDIRECT_TIME_KEY, now);
    localStorage.setItem(REDIRECT_PENDING_KEY, 'true');
    localStorage.setItem(REDIRECT_TIME_KEY, now);
  } catch (e) {
    console.warn('Failed to set redirect flag in storage:', e);
  }
};

export const clearRedirectLoginFlag = () => {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.removeItem(REDIRECT_PENDING_KEY);
    sessionStorage.removeItem(REDIRECT_TIME_KEY);
    localStorage.removeItem(REDIRECT_PENDING_KEY);
    localStorage.removeItem(REDIRECT_TIME_KEY);
  } catch (e) {
    console.warn('Failed to clear redirect flag from storage:', e);
  }
};

export const detectBrowserEnv = (): BrowserEnv => {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return { isMobile: false, isInAppBrowser: false, isIOS: false, isAndroid: false };
  }
  const ua = navigator.userAgent || '';
  const isIPadOS =
    typeof navigator !== 'undefined' &&
    navigator.platform === 'MacIntel' &&
    (navigator.maxTouchPoints || 0) > 1;
  const isIOS = (/iPad|iPhone|iPod/.test(ua) || isIPadOS) && !(window as any).MSStream;
  const isAndroid = /Android/i.test(ua);
  const isMobile = isIOS || isAndroid || /webOS|BlackBerry|IEMobile|Opera Mini/i.test(ua);

  let isInAppBrowser = false;
  let inAppBrowserName: string | undefined;

  if (/Line\//i.test(ua)) {
    isInAppBrowser = true;
    inAppBrowserName = 'LINE';
  } else if (/FBAN|FBAV/i.test(ua)) {
    isInAppBrowser = true;
    inAppBrowserName = 'Facebook';
  } else if (/Instagram/i.test(ua)) {
    isInAppBrowser = true;
    inAppBrowserName = 'Instagram';
  } else if (/MicroMessenger/i.test(ua)) {
    isInAppBrowser = true;
    inAppBrowserName = 'WeChat';
  } else if (/Twitter|TwitterAndroid|TwitterforiPhone/i.test(ua)) {
    isInAppBrowser = true;
    inAppBrowserName = 'Twitter/X';
  } else if (/TikTok/i.test(ua)) {
    isInAppBrowser = true;
    inAppBrowserName = 'TikTok';
  }

  return { isMobile, isInAppBrowser, inAppBrowserName, isIOS, isAndroid };
};

// Error Message Mapping with dynamic domain resolution
export const getAuthErrorMessage = (error: any): string => {
  const code = error?.code || '';
  const currentDomain = typeof window !== 'undefined' ? window.location.hostname : '';
  const isVercel = currentDomain.includes('vercel.app');

  switch (code) {
    case 'auth/popup-blocked':
      return 'เบราว์เซอร์บล็อกหน้าต่าง Pop-up กำลังเปลี่ยนไปใช้การเข้าสู่ระบบแบบเต็มหน้าจอ...';
    case 'auth/popup-closed-by-user':
    case 'auth/cancelled-popup-request':
      return 'ยกเลิกการเข้าสู่ระบบแล้ว';
    case 'auth/unauthorized-domain':
      return isVercel || currentDomain.includes('jodna')
        ? `โดเมน "${currentDomain || 'jodna.vercel.app'}" ยังไม่ได้รับอนุญาตใน Firebase Console โปรดไปที่ Firebase Console (Project: ${firebaseAppConfig.projectId}) > Authentication > Settings > Authorized domains แล้วเพิ่มโดเมน "${currentDomain || 'jodna.vercel.app'}" เพื่อเปิดใช้งาน Google Sign-in`
        : `โดเมน "${currentDomain || 'ปัจจุบัน'}" ยังไม่ได้รับอนุญาตใน Firebase Console โปรดไปที่ Firebase Console (Project: ${firebaseAppConfig.projectId}) > Authentication > Settings > Authorized domains แล้วเพิ่มโดเมน "${currentDomain}"`;
    case 'auth/configuration-not-found':
      return `ไม่พบการตั้งค่า Identity Platform สำหรับโดเมน "${currentDomain}" โปรดตรวจสอบ Authorized domains ใน Firebase Console (Project: ${firebaseAppConfig.projectId})`;
    case 'permission-denied':
    case 'auth/permission-denied':
      return 'ไม่มีสิทธิ์เข้าถึงข้อมูล (Permission Denied 403) โปรดตรวจสอบว่าเข้าสู่ระบบด้วยบัญชี Google ที่ถูกต้อง';
    case 'auth/operation-not-allowed':
      return 'ระบบ Google Sign-in ยังไม่เปิดใช้งานใน Firebase Console โปรดเปิดใช้งาน Google Provider ในเมนู Authentication Settings';
    case 'auth/network-request-failed':
      return 'ไม่สามารถเชื่อมต่อเครือข่ายได้ โปรดตรวจสอบสัญญาณอินเทอร์เน็ตแล้วลองใหม่อีกครั้ง';
    case 'auth/user-disabled':
      return 'บัญชีผู้ใช้นี้ถูกระงับการใช้งาน โปรดติดต่อผู้ดูแลระบบ';
    case 'auth/disallowed_useragent':
      return 'Google ไม่อนุญาตให้ล็อกอินผ่านเบราว์เซอร์ภายในแอปเพื่อความปลอดภัย โปรดกดที่เมนู (•••) แล้วเลือก "เปิดใน Safari" หรือ "เปิดใน Chrome"';
    default:
      return error?.message || 'เกิดข้อผิดพลาดในการเข้าสู่ระบบด้วย Google';
  }
};

// Concurrency Mutex to prevent duplicate rapid clicks or race conditions
let isLoginInProgress = false;

// Primary Login Function (Desktop: Popup, Mobile/Fallback: Redirect)
export const loginWithGoogle = async (): Promise<{ user: User | null; redirectInitiated?: boolean }> => {
  if (isLoginInProgress) {
    logAuthDiagnostic('Login Started', { status: 'rejected_already_in_progress' });
    return { user: null, redirectInitiated: isRedirectLoginPending() };
  }

  isLoginInProgress = true;
  let redirectInitiated = false;

  try {
    const env = detectBrowserEnv();

    logAuthDiagnostic('Login Started', {
      platform: env.isIOS ? 'iOS' : env.isAndroid ? 'Android' : 'Desktop',
      isMobile: env.isMobile,
      isInAppBrowser: env.isInAppBrowser,
      inAppBrowserName: env.inAppBrowserName,
      flow: env.isMobile ? 'Redirect' : 'Popup',
      currentOrigin: typeof window !== 'undefined' ? window.location.origin : '',
    });

    // If in-app browser is detected, throw actionable error for user
    if (env.isInAppBrowser) {
      const err = new Error(
        `ตรวจพบการใช้งานผ่าน ${env.inAppBrowserName || 'In-app'} Browser ซึ่ง Google ไม่อนุญาตให้ล็อกอินเพื่อความปลอดภัย โปรดเปิดด้วย Safari หรือ Chrome`
      );
      (err as any).code = 'auth/disallowed_useragent';
      logAuthDiagnostic('Auth Error Code', {
        code: 'auth/disallowed_useragent',
        message: err.message,
      });
      throw err;
    }

    // Mobile browsers (iOS Safari, Android Chrome, iPadOS): Always use signInWithRedirect
    if (env.isMobile) {
      try {
        setRedirectLoginFlag();
        redirectInitiated = true;
        logAuthDiagnostic('Redirect Initiated', {
          provider: 'google.com',
          currentOrigin: typeof window !== 'undefined' ? window.location.origin : '',
          currentPath: typeof window !== 'undefined' ? window.location.pathname : '',
          browserEnv: env,
        });
        await signInWithRedirect(auth, googleProvider);
        return { user: null, redirectInitiated: true };
      } catch (redirectErr: any) {
        redirectInitiated = false;
        clearRedirectLoginFlag();
        logAuthDiagnostic('Auth Error Code', {
          code: redirectErr?.code,
          message: redirectErr?.message,
        });
        throw new Error(getAuthErrorMessage(redirectErr));
      }
    }

    // Desktop browsers: Prefer signInWithPopup, with fallback to Redirect if popup is blocked
    try {
      const result = await signInWithPopup(auth, googleProvider);
      if (result && result.user) {
        logAuthDiagnostic('User UID Confirmed', {
          uid: result.user.uid,
          email: result.user.email,
          flow: 'Popup',
        });
      }
      return { user: result.user };
    } catch (error: any) {
      if (
        error?.code === 'auth/popup-closed-by-user' ||
        error?.code === 'auth/cancelled-popup-request'
      ) {
        logAuthDiagnostic('Auth Error Code', {
          code: error.code,
          message: 'Popup cancelled or closed by user',
        });
        return { user: null };
      }

      // Popup was blocked on Desktop -> Automatic Fallback to signInWithRedirect
      if (error?.code === 'auth/popup-blocked') {
        logAuthDiagnostic('Auth Error Code', {
          code: 'auth/popup-blocked',
          fallback: 'signInWithRedirect',
        });
        try {
          setRedirectLoginFlag();
          redirectInitiated = true;
          logAuthDiagnostic('Redirect Initiated', {
            provider: 'google.com',
            reason: 'popup-blocked-fallback',
          });
          await signInWithRedirect(auth, googleProvider);
          return { user: null, redirectInitiated: true };
        } catch (redirectErr: any) {
          redirectInitiated = false;
          clearRedirectLoginFlag();
          logAuthDiagnostic('Auth Error Code', {
            code: redirectErr?.code,
            message: redirectErr?.message,
          });
          throw new Error(getAuthErrorMessage(redirectErr));
        }
      }

      logAuthDiagnostic('Auth Error Code', {
        code: error?.code,
        message: error?.message,
      });
      console.error('Login error:', error);
      throw new Error(getAuthErrorMessage(error));
    }
  } finally {
    // If redirect was initiated, keep lock active while browser unloads to Google.
    // If popup completed or error occurred, release mutex so user can retry.
    if (!redirectInitiated) {
      isLoginInProgress = false;
    }
  }
};

// Check for redirect result on app startup with race safety and timeout safeguard
export const checkRedirectLoginResult = async (): Promise<User | null> => {
  const pending = isRedirectLoginPending();
  if (pending) {
    logAuthDiagnostic('Redirect Returned', {
      pending: true,
      currentOrigin: typeof window !== 'undefined' ? window.location.origin : '',
      currentHref: typeof window !== 'undefined' ? window.location.href : '',
    });
  }

  try {
    // 1. Wait for Firebase Auth persistence ready state if available (up to 4s)
    if (typeof (auth as any).authStateReady === 'function') {
      try {
        await Promise.race([
          (auth as any).authStateReady(),
          new Promise((resolve) => setTimeout(resolve, 4000)),
        ]);
      } catch (readyErr) {
        console.warn('authStateReady notice:', readyErr);
      }
    }

    // 2. If auth.currentUser is already populated on mount, return immediately
    if (auth.currentUser) {
      clearRedirectLoginFlag();
      isLoginInProgress = false;
      logAuthDiagnostic('Redirect Result Received', {
        resolvedVia: 'auth.currentUser',
        uid: auth.currentUser.uid,
        email: auth.currentUser.email,
      });
      return auth.currentUser;
    }

    // 3. Wrap getRedirectResult with an 8-second safety timeout so UI never hangs permanently
    const redirectPromise = getRedirectResult(auth);
    const timeoutPromise = new Promise<null>((resolve) =>
      setTimeout(() => resolve(null), 8000)
    );

    const result = await Promise.race([redirectPromise, timeoutPromise]);

    if (result && result.user) {
      clearRedirectLoginFlag();
      isLoginInProgress = false;
      logAuthDiagnostic('Redirect Result Received', {
        resolvedVia: 'getRedirectResult',
        uid: result.user.uid,
        email: result.user.email,
      });
      logAuthDiagnostic('User UID Confirmed', {
        uid: result.user.uid,
        email: result.user.email,
        flow: 'Redirect',
      });
      return result.user;
    }

    // 4. If getRedirectResult returned null, check auth.currentUser once more
    if (pending) {
      clearRedirectLoginFlag();
      isLoginInProgress = false;
      const lateUser = auth.currentUser as User | null;
      if (lateUser) {
        logAuthDiagnostic('Redirect Result Received', {
          resolvedVia: 'auth.currentUserAfterRace',
          uid: lateUser.uid,
          email: lateUser.email,
        });
        return lateUser;
      }
      logAuthDiagnostic('Redirect Result Received', {
        hasUser: false,
        pendingWasSet: true,
      });
    }

    return null;
  } catch (error: any) {
    clearRedirectLoginFlag();
    isLoginInProgress = false;
    logAuthDiagnostic('Auth Error Code', {
      source: 'getRedirectResult',
      code: error?.code,
      message: error?.message,
    });
    logAuthDiagnostic('Redirect Result Received', {
      error: true,
      code: error?.code,
      message: error?.message,
    });
    console.error('Redirect result error:', error);
    throw new Error(getAuthErrorMessage(error));
  }
};

export const logoutUser = async (): Promise<void> => {
  isLoginInProgress = false;
  clearRedirectLoginFlag();
  logAuthDiagnostic('Auth State Changed', { action: 'logout' });
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
  isMigrated?: boolean;
  migrationVersion?: number;
  migratedAt?: any;
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
    if (data.isMigrated !== undefined) sanitized.isMigrated = data.isMigrated;
    if (data.migrationVersion !== undefined) sanitized.migrationVersion = data.migrationVersion;

    await setDoc(docRef, sanitized, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
};

// 6. Credit Cards Synchronization with Order and Optimistic Concurrency
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
        const item = d.data() as any;
        cards.push({
          id: item.id || d.id,
          name: item.name,
          bank: item.bank,
          last4: item.last4 || '',
          creditLimit: item.creditLimit || 0,
          billingCutoffDay: Number(item.billingCutoffDay),
          paymentDueDay: Number(item.paymentDueDay),
          colorGradient: item.colorGradient || '',
          accentColor: item.accentColor || '',
          cardType: item.cardType,
          status: item.status || 'active',
          orderIndex: item.orderIndex !== undefined ? Number(item.orderIndex) : undefined,
          version: typeof item.version === 'number' ? item.version : 1,
          updatedAt: item.updatedAt?.toDate ? item.updatedAt.toDate().toISOString() : item.updatedAt || undefined,
        });
      });
      // Sort by orderIndex so order is strictly maintained across devices
      cards.sort((a, b) => {
        const orderA = a.orderIndex !== undefined ? a.orderIndex : 9999;
        const orderB = b.orderIndex !== undefined ? b.orderIndex : 9999;
        return orderA - orderB;
      });
      callback(cards);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
    }
  );
};

export const saveUserCardToFirestore = async (
  userId: string,
  card: CreditCard,
  expectedVersion?: number
): Promise<{ success: boolean; version: number }> => {
  const path = `users/${userId}/cards/${card.id}`;
  try {
    const docRef = doc(db, 'users', userId, 'cards', card.id);
    let newVersion = 1;

    await runTransaction(db, async (txn) => {
      const existingSnap = await txn.get(docRef);
      if (existingSnap.exists()) {
        const existingData = existingSnap.data();
        const currentVer = typeof existingData.version === 'number' ? existingData.version : 1;
        // Optimistic concurrency check: If server version is greater than client's expected version
        if (expectedVersion !== undefined && currentVer > expectedVersion) {
          const conflictErr = new Error(`CONFLICT_DETECTED: Card "${card.name}" was modified by another session (v${currentVer} > v${expectedVersion})`);
          (conflictErr as any).code = 'DATA_CONFLICT';
          (conflictErr as any).serverData = existingData;
          throw conflictErr;
        }
        newVersion = currentVer + 1;
      } else {
        newVersion = 1;
      }

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
        orderIndex: card.orderIndex !== undefined ? Number(card.orderIndex) : 0,
        version: newVersion,
        updatedAt: serverTimestamp(),
      };
      if (card.cardType) payload.cardType = card.cardType;
      if (!existingSnap.exists()) {
        payload.createdAt = serverTimestamp();
      }

      txn.set(docRef, payload, { merge: true });
    });

    return { success: true, version: newVersion };
  } catch (error: any) {
    if (error?.code === 'DATA_CONFLICT') {
      throw error;
    }
    handleFirestoreError(error, OperationType.WRITE, path);
  }
};

export const saveCardOrderToFirestore = async (
  userId: string,
  cards: CreditCard[]
) => {
  const path = `users/${userId}/cards`;
  try {
    const batch = writeBatch(db);
    cards.forEach((card, index) => {
      const cardRef = doc(db, 'users', userId, 'cards', card.id);
      batch.update(cardRef, {
        orderIndex: index,
        updatedAt: serverTimestamp(),
      });
    });
    await batch.commit();
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

// 7. Transactions Synchronization with Optimistic Concurrency
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
          version: typeof item.version === 'number' ? item.version : 1,
          createdAt: item.createdAt?.toDate ? item.createdAt.toDate().toISOString() : item.createdAt || new Date().toISOString(),
          updatedAt: item.updatedAt?.toDate ? item.updatedAt.toDate().toISOString() : item.updatedAt || undefined,
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
  tx: Transaction,
  expectedVersion?: number
): Promise<{ success: boolean; version: number }> => {
  const path = `users/${userId}/transactions/${tx.id}`;
  try {
    const docRef = doc(db, 'users', userId, 'transactions', tx.id);
    let newVersion = 1;

    await runTransaction(db, async (txn) => {
      const existingSnap = await txn.get(docRef);
      if (existingSnap.exists()) {
        const existingData = existingSnap.data();
        const currentVer = typeof existingData.version === 'number' ? existingData.version : 1;
        // Optimistic concurrency check
        if (expectedVersion !== undefined && currentVer > expectedVersion) {
          const conflictErr = new Error(`CONFLICT_DETECTED: Transaction "${tx.title}" was modified by another session (v${currentVer} > v${expectedVersion})`);
          (conflictErr as any).code = 'DATA_CONFLICT';
          (conflictErr as any).serverData = existingData;
          throw conflictErr;
        }
        newVersion = currentVer + 1;
      } else {
        newVersion = 1;
      }

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
        version: newVersion,
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
      if (!existingSnap.exists()) {
        payload.createdAt = serverTimestamp();
      }

      txn.set(docRef, payload, { merge: true });
    });

    return { success: true, version: newVersion };
  } catch (error: any) {
    if (error?.code === 'DATA_CONFLICT') {
      throw error;
    }
    handleFirestoreError(error, OperationType.WRITE, path);
  }
};

export const saveBatchTransactionsToFirestore = async (
  userId: string,
  transactions: Transaction[]
): Promise<{ success: boolean; updatedCount: number }> => {
  if (transactions.length === 0) return { success: true, updatedCount: 0 };

  // 1. Strict UID Validation
  if (!userId || typeof userId !== 'string' || userId.trim() === '') {
    throw new Error('Unauthorized: Missing or invalid UID for batch update');
  }
  if (auth.currentUser && auth.currentUser.uid !== userId) {
    throw new Error(`Unauthorized: UID mismatch (expected ${auth.currentUser.uid}, got ${userId})`);
  }

  const path = `users/${userId}/transactions`;

  try {
    // 2. Execute under Firestore runTransaction to ensure atomic OCC version check and commit
    await runTransaction(db, async (txn) => {
      // Step A: Read Phase - Read all documents and verify optimistic concurrency versions
      const planOperations: {
        docRef: any;
        tx: Transaction;
        newVersion: number;
        existingData: any;
      }[] = [];

      for (const tx of transactions) {
        const docRef = doc(db, 'users', userId, 'transactions', tx.id);
        const snap = await txn.get(docRef);

        let newVersion = 1;
        let existingData: any = null;

        if (snap.exists()) {
          existingData = snap.data();
          const currentVer = typeof existingData.version === 'number' ? existingData.version : 1;
          const expectedVer = tx.version !== undefined ? tx.version : 1;

          // Optimistic Concurrency Check: If current server version is greater than base version, conflict!
          if (currentVer > expectedVer) {
            const conflictErr = new Error(
              `DATA_CONFLICT: Transaction "${tx.title}" (งวดที่ ${tx.currentInstallment || 1}) was modified by another session (v${currentVer} > v${expectedVer})`
            );
            (conflictErr as any).code = 'DATA_CONFLICT';
            (conflictErr as any).conflictingTxId = tx.id;
            (conflictErr as any).serverData = existingData;
            (conflictErr as any).localData = tx;
            throw conflictErr;
          }
          newVersion = currentVer + 1;
        } else {
          newVersion = 1;
        }

        planOperations.push({ docRef, tx, newVersion, existingData });
      }

      // Step B: Write Phase - All OCC checks succeeded; write all items atomically!
      for (const { docRef, tx, newVersion, existingData } of planOperations) {
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
          version: newVersion,
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
        if (!existingData) {
          payload.createdAt = serverTimestamp();
        }

        txn.set(docRef, payload, { merge: true });
      }
    });

    return { success: true, updatedCount: transactions.length };
  } catch (error: any) {
    if (error?.code === 'DATA_CONFLICT') {
      throw error;
    }
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

// 8. Robust Initial Migration conforming to Task 1 & Task 3
export interface MigrationResult {
  status: 'already_migrated' | 'migrated_real_data' | 'initialized_empty';
  cloudCardCount: number;
  cloudTxCount: number;
}

export const checkAndMigrateUserData = async (
  userId: string,
  localCards: CreditCard[],
  localTransactions: Transaction[],
  localPreferences: Partial<UserPreferencesPayload>,
  hasRealLocalData: boolean
): Promise<MigrationResult> => {
  const userRef = doc(db, 'users', userId);
  const cardsCol = collection(db, 'users', userId, 'cards');
  const txsCol = collection(db, 'users', userId, 'transactions');

  // 1. Fetch current status from Cloud
  const [userSnap, cardsSnap, txsSnap] = await Promise.all([
    getDoc(userRef),
    getDocs(cardsCol),
    getDocs(txsCol),
  ]);

  const isCloudMigrated = userSnap.exists() && userSnap.data()?.isMigrated === true;
  const hasCloudCards = !cardsSnap.empty;
  const hasCloudTxs = !txsSnap.empty;

  // If Cloud is already migrated or already has data, Cloud is authoritative
  if (isCloudMigrated || hasCloudCards || hasCloudTxs) {
    if (!isCloudMigrated) {
      await setDoc(
        userRef,
        { userId, isMigrated: true, migrationVersion: 1, migratedAt: serverTimestamp() },
        { merge: true }
      );
    }
    return {
      status: 'already_migrated',
      cloudCardCount: cardsSnap.size,
      cloudTxCount: txsSnap.size,
    };
  }

  // 2. Cloud is empty and not migrated yet
  if (hasRealLocalData && localCards.length > 0) {
    // Write cards batch
    const cardBatch = writeBatch(db);
    localCards.forEach((c, idx) => {
      const cRef = doc(db, 'users', userId, 'cards', c.id);
      cardBatch.set(cRef, {
        id: c.id,
        userId,
        name: c.name,
        bank: c.bank,
        last4: c.last4 || '',
        creditLimit: c.creditLimit || 0,
        billingCutoffDay: Number(c.billingCutoffDay),
        paymentDueDay: Number(c.paymentDueDay),
        colorGradient: c.colorGradient || '',
        accentColor: c.accentColor || '',
        status: c.status || 'active',
        orderIndex: c.orderIndex !== undefined ? c.orderIndex : idx,
        version: 1,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    });
    await cardBatch.commit();

    // Write transactions in batches
    const chunkSize = 400;
    for (let i = 0; i < localTransactions.length; i += chunkSize) {
      const chunk = localTransactions.slice(i, i + chunkSize);
      const txBatch = writeBatch(db);
      chunk.forEach((t) => {
        const tRef = doc(db, 'users', userId, 'transactions', t.id);
        const payload: Record<string, any> = {
          id: t.id,
          userId,
          cardId: t.cardId,
          date: t.date,
          title: t.title,
          category: t.category,
          amount: Number(t.amount),
          billingCycleMonth: t.billingCycleMonth,
          isPaid: !!t.isPaid,
          version: 1,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        };
        if (t.isInstallment !== undefined) payload.isInstallment = t.isInstallment;
        if (t.totalInstallments !== undefined) payload.totalInstallments = Number(t.totalInstallments);
        if (t.currentInstallment !== undefined) payload.currentInstallment = Number(t.currentInstallment);
        if (t.monthlyInstallmentAmount !== undefined) payload.monthlyInstallmentAmount = Number(t.monthlyInstallmentAmount);
        if (t.installmentGroupId) payload.installmentGroupId = t.installmentGroupId;
        if (t.note) payload.note = t.note;
        if (t.tags && Array.isArray(t.tags)) payload.tags = t.tags.slice(0, 10);
        if (t.paidDate) payload.paidDate = t.paidDate;

        txBatch.set(tRef, payload, { merge: true });
      });
      await txBatch.commit();
    }

    // Set User Document with isMigrated = true ONLY AFTER all subcollections successfully commit
    await setDoc(
      userRef,
      {
        userId,
        isMigrated: true,
        migrationVersion: 1,
        migratedAt: serverTimestamp(),
        brandName: localPreferences.brandName || 'CardPulse',
        brandLogo: localPreferences.brandLogo || null,
        brandTagline: localPreferences.brandTagline || 'ระบบติดตามและจัดการค่าบัตรเครดิต',
        bgImage: localPreferences.bgImage || null,
        bgOpacity: localPreferences.bgOpacity !== undefined ? localPreferences.bgOpacity : 0.7,
        bgBlur: localPreferences.bgBlur !== undefined ? localPreferences.bgBlur : 4,
        bgPosition: localPreferences.bgPosition || null,
        updatedAt: serverTimestamp(),
        createdAt: serverTimestamp(),
      },
      { merge: true }
    );

    return {
      status: 'migrated_real_data',
      cloudCardCount: localCards.length,
      cloudTxCount: localTransactions.length,
    };
  } else {
    // Local has only default demo data or empty -> Do NOT push demo data to cloud!
    // Initialize cloud with empty collections and mark isMigrated: true
    await setDoc(
      userRef,
      {
        userId,
        isMigrated: true,
        migrationVersion: 1,
        migratedAt: serverTimestamp(),
        brandName: localPreferences.brandName || 'CardPulse',
        brandLogo: localPreferences.brandLogo || null,
        brandTagline: localPreferences.brandTagline || 'ระบบติดตามและจัดการค่าบัตรเครดิต',
        bgImage: localPreferences.bgImage || null,
        bgOpacity: localPreferences.bgOpacity !== undefined ? localPreferences.bgOpacity : 0.7,
        bgBlur: localPreferences.bgBlur !== undefined ? localPreferences.bgBlur : 4,
        bgPosition: localPreferences.bgPosition || null,
        updatedAt: serverTimestamp(),
        createdAt: serverTimestamp(),
      },
      { merge: true }
    );

    return {
      status: 'initialized_empty',
      cloudCardCount: 0,
      cloudTxCount: 0,
    };
  }
};

/**
 * Production Clean Start:
 * Safely purges only the specified user's cards and transactions from Cloud Firestore
 * and resets their preferences to clean defaults.
 */
export const cleanStartUserCloudData = async (
  userId: string
): Promise<{ deletedCards: number; deletedTxs: number }> => {
  const cardsCol = collection(db, 'users', userId, 'cards');
  const txsCol = collection(db, 'users', userId, 'transactions');
  const userRef = doc(db, 'users', userId);

  const [cardsSnap, txsSnap] = await Promise.all([
    getDocs(cardsCol),
    getDocs(txsCol),
  ]);

  // Batch delete cards in chunks of 400
  const cardBatches: Promise<void>[] = [];
  const cardDocs = cardsSnap.docs;
  for (let i = 0; i < cardDocs.length; i += 400) {
    const batch = writeBatch(db);
    cardDocs.slice(i, i + 400).forEach((d) => batch.delete(d.ref));
    cardBatches.push(batch.commit());
  }
  await Promise.all(cardBatches);

  // Batch delete transactions in chunks of 400
  const txBatches: Promise<void>[] = [];
  const txDocs = txsSnap.docs;
  for (let i = 0; i < txDocs.length; i += 400) {
    const batch = writeBatch(db);
    txDocs.slice(i, i + 400).forEach((d) => batch.delete(d.ref));
    txBatches.push(batch.commit());
  }
  await Promise.all(txBatches);

  // Reset user document to clean production defaults
  await setDoc(userRef, {
    userId,
    isMigrated: true,
    migrationVersion: 1,
    migratedAt: serverTimestamp(),
    brandName: 'CardPulse',
    brandTagline: 'ระบบติดตามและจัดการค่าบัตรเครดิต',
    brandLogo: null,
    bgImage: null,
    bgOpacity: 0.7,
    bgBlur: 4,
    bgPosition: null,
    updatedAt: serverTimestamp(),
  });

  return { deletedCards: cardDocs.length, deletedTxs: txDocs.length };
};

