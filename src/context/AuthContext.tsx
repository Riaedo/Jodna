import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import {
  auth,
  googleProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signOut,
  onAuthStateChanged,
  User,
  isMobileDevice,
  detectBrowserEnv,
  firebaseAppConfig,
  getAuthErrorMessage,
  isRedirectLoginPending,
  setRedirectLoginFlag,
  clearRedirectLoginFlag,
  logAuthDiagnostic,
  getSystemDiagnosticSummary,
  maskEmail,
  testConnection,
} from '../services/firebase';

export type SyncStatus = 'synced' | 'saving' | 'offline' | 'error' | 'local';

export interface AuthErrorInfo {
  code: string;
  message: string;
  domain?: string;
  solution?: string;
  inAppBrowserName?: string;
}

export interface AuthContextType {
  user: User | null;
  loading: boolean;
  syncStatus: SyncStatus;
  authError: AuthErrorInfo | null;
  setSyncStatus: (status: SyncStatus) => void;
  clearAuthError: () => void;
  signInWithGoogle: (method?: 'auto' | 'popup' | 'redirect') => Promise<void>;
  signInWithGoogleRedirect: () => Promise<void>;
  signInWithGooglePopup: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  syncStatus: 'local',
  authError: null,
  setSyncStatus: () => {},
  clearAuthError: () => {},
  signInWithGoogle: async () => {},
  signInWithGoogleRedirect: async () => {},
  signInWithGooglePopup: async () => {},
  logout: async () => {},
});

export function parseAuthError(err: any): AuthErrorInfo {
  const code = err?.code || 'auth/unknown-error';
  const currentDomain = typeof window !== 'undefined' ? window.location.hostname : '';
  const env = detectBrowserEnv();
  let message = err?.message || getAuthErrorMessage(err) || 'เกิดข้อผิดพลาดในการเข้าสู่ระบบ';
  let solution = '';

  if (code === 'auth/unauthorized-domain') {
    message = `โดเมน "${currentDomain}" ยังไม่ได้ถูกเพิ่มใน Authorized Domains ของ Firebase (Project: ${firebaseAppConfig.projectId})`;
    solution = `กรุณาเพิ่มโดเมน "${currentDomain}" ใน Firebase Console -> Authentication -> Settings -> Authorized Domains`;
  } else if (code === 'auth/popup-closed-by-user') {
    message = 'หน้าต่าง Popup เข้าสู่ระบบถูกปิดลงก่อนทำรายการเสร็จ';
    solution = 'สามารถลองกดเข้าสู่ระบบอีกครั้ง หรือเลือกวิธี "เปลี่ยนหน้าเว็บ (Redirect)" เพื่อความเสถียรยิ่งขึ้น';
  } else if (code === 'auth/popup-blocked') {
    message = 'เบราว์เซอร์บล็อกหน้าต่าง Popup เข้าสู่ระบบ';
    solution = 'กรุณาอนุญาต Pop-up ในเบราว์เซอร์ หรือกดใช้วิธี "เปลี่ยนหน้าเว็บ (Redirect)"';
  } else if (code === 'auth/cancelled-popup-request') {
    message = 'มีคำขอเข้าสู่ระบบซ้ำซ้อนหรือถูกยกเลิก';
    solution = 'กรุณารอสักครู่แล้วลองใหม่อีกครั้ง';
  } else if (code === 'auth/disallowed_useragent') {
    message = `ตรวจพบการใช้งานผ่าน ${env.inAppBrowserName || 'In-app'} Browser ซึ่ง Google ไม่อนุญาตให้ล็อกอินเพื่อความปลอดภัย`;
    solution = 'กรุณากดเมนู (•••) แล้วเลือก "เปิดใน Safari" หรือ "เปิดใน Chrome"';
  } else if (code === 'auth/operation-not-allowed') {
    message = getAuthErrorMessage(err);
    solution = 'เปิดใช้งาน Google Provider ใน Firebase Console -> Authentication -> Sign-in method';
  } else if (code === 'auth/network-request-failed') {
    message = getAuthErrorMessage(err);
    solution = 'ตรวจสอบการเชื่อมต่ออินเทอร์เน็ตแล้วลองใหม่อีกครั้ง';
  } else if (code === 'auth/configuration-not-found') {
    message = getAuthErrorMessage(err);
    solution = `ตรวจสอบ Authorized domains ใน Firebase Console (Project: ${firebaseAppConfig.projectId})`;
  } else if (code === 'auth/user-disabled') {
    message = getAuthErrorMessage(err);
    solution = 'โปรดติดต่อผู้ดูแลระบบ';
  }

  return {
    code,
    message,
    domain: currentDomain,
    solution,
    inAppBrowserName: code === 'auth/disallowed_useragent' ? env.inAppBrowserName : undefined,
  };
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('local');
  const [authError, setAuthError] = useState<AuthErrorInfo | null>(null);

  // Concurrency mutex to prevent duplicate rapid sign-in clicks / race conditions
  const isLoginInProgressRef = useRef<boolean>(false);

  useEffect(() => {
    let isMounted = true;
    let authSettled = false;
    let redirectSettled = false;
    const pending = isRedirectLoginPending();

    const maybeFinishLoading = () => {
      if (isMounted && authSettled && redirectSettled) {
        setLoading(false);
      }
    };

    if (pending) {
      logAuthDiagnostic('Redirect Returned', {
        pending: true,
        currentOrigin: typeof window !== 'undefined' ? window.location.origin : '',
        currentHref: typeof window !== 'undefined' ? window.location.href : '',
      });
    }

    // 1. Process result from redirect login on page mount (with authStateReady + 8s timeout safeguard)
    const resolveRedirect = async () => {
      try {
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

        const result = await Promise.race([
          getRedirectResult(auth),
          new Promise<null>((resolve) => setTimeout(() => resolve(null), 8000)),
        ]);

        if (!isMounted) return;

        if (result?.user) {
          clearRedirectLoginFlag();
          isLoginInProgressRef.current = false;
          setUser(result.user);
          setAuthError(null);
          logAuthDiagnostic('Redirect Result Received', {
            resolvedVia: 'getRedirectResult',
            uid: result.user.uid,
            email: maskEmail(result.user.email),
          });
          logAuthDiagnostic('User UID Confirmed', {
            uid: result.user.uid,
            email: maskEmail(result.user.email),
            flow: 'Redirect',
          });
        } else if (pending) {
          clearRedirectLoginFlag();
          isLoginInProgressRef.current = false;
          const lateUser = auth.currentUser as User | null;
          if (lateUser) {
            setUser(lateUser);
            logAuthDiagnostic('Redirect Result Received', {
              resolvedVia: 'auth.currentUserAfterRace',
              uid: lateUser.uid,
              email: maskEmail(lateUser.email),
            });
          } else {
            logAuthDiagnostic('Redirect Result Received', {
              hasUser: false,
              pendingWasSet: true,
            });
          }
        }
      } catch (error: any) {
        clearRedirectLoginFlag();
        isLoginInProgressRef.current = false;
        logAuthDiagnostic('Auth Error Code', {
          source: 'getRedirectResult',
          code: error?.code,
          message: error?.message,
        });
        console.error('Redirect sign-in error:', error);
        if (isMounted) {
          setAuthError(parseAuthError(error));
          setSyncStatus('error');
        }
      } finally {
        redirectSettled = true;
        maybeFinishLoading();
      }
    };

    resolveRedirect();

    // 2. Auth state observer (Single Source of Truth)
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (!isMounted) return;
      logAuthDiagnostic('Auth State Changed', {
        hasUser: !!currentUser,
        uid: currentUser?.uid,
        email: maskEmail(currentUser?.email),
      });

      setUser(currentUser);
      if (currentUser) {
        clearRedirectLoginFlag();
        isLoginInProgressRef.current = false;
        setAuthError(null);
        logAuthDiagnostic('User UID Confirmed', {
          uid: currentUser.uid,
          email: maskEmail(currentUser.email),
        });
        console.log('[CardPulse System Diagnostics]', getSystemDiagnosticSummary(currentUser));
        testConnection();
      } else {
        setSyncStatus(typeof navigator !== 'undefined' && !navigator.onLine ? 'offline' : 'local');
      }

      authSettled = true;
      // Release loading immediately if user is already resolved or redirect check settled
      if (currentUser || redirectSettled) {
        setLoading(false);
      }
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  const clearAuthError = useCallback(() => {
    setAuthError(null);
  }, []);

  const assertSupportedBrowser = useCallback(() => {
    const env = detectBrowserEnv();
    if (env.isInAppBrowser) {
      const err: any = new Error(
        `ตรวจพบการใช้งานผ่าน ${env.inAppBrowserName || 'In-app'} Browser ซึ่ง Google ไม่อนุญาตให้ล็อกอินเพื่อความปลอดภัย โปรดเปิดด้วย Safari หรือ Chrome`
      );
      err.code = 'auth/disallowed_useragent';
      logAuthDiagnostic('Auth Error Code', {
        code: 'auth/disallowed_useragent',
        inAppBrowserName: env.inAppBrowserName,
      });
      setAuthError(parseAuthError(err));
      throw err;
    }
  }, []);

  // Google Sign-In with Redirect (Best for Mobile & strict popup blockers)
  const signInWithGoogleRedirect = useCallback(async () => {
    assertSupportedBrowser();
    if (isLoginInProgressRef.current) {
      logAuthDiagnostic('Login Started', { status: 'rejected_already_in_progress', flow: 'Redirect' });
      return;
    }

    isLoginInProgressRef.current = true;
    let redirectInitiated = false;
    setAuthError(null);
    setSyncStatus('saving');

    try {
      setRedirectLoginFlag();
      redirectInitiated = true;
      logAuthDiagnostic('Redirect Initiated', {
        provider: 'google.com',
        currentOrigin: typeof window !== 'undefined' ? window.location.origin : '',
        currentPath: typeof window !== 'undefined' ? window.location.pathname : '',
      });
      await signInWithRedirect(auth, googleProvider);
    } catch (error: any) {
      redirectInitiated = false;
      clearRedirectLoginFlag();
      logAuthDiagnostic('Auth Error Code', {
        code: error?.code,
        message: error?.message,
      });
      console.error('signInWithRedirect failed:', error);
      setAuthError(parseAuthError(error));
      setSyncStatus('error');
      throw error;
    } finally {
      if (!redirectInitiated) {
        isLoginInProgressRef.current = false;
      }
    }
  }, [assertSupportedBrowser]);

  // Google Sign-In with Popup (Desktop standard)
  const signInWithGooglePopup = useCallback(async () => {
    assertSupportedBrowser();
    if (isLoginInProgressRef.current) {
      logAuthDiagnostic('Login Started', { status: 'rejected_already_in_progress', flow: 'Popup' });
      return;
    }

    isLoginInProgressRef.current = true;
    setAuthError(null);
    setSyncStatus('saving');

    try {
      const res = await signInWithPopup(auth, googleProvider);
      if (res.user) {
        logAuthDiagnostic('User UID Confirmed', {
          uid: res.user.uid,
          email: maskEmail(res.user.email),
          flow: 'Popup',
        });
      }
    } catch (error: any) {
      logAuthDiagnostic('Auth Error Code', {
        code: error?.code,
        message: error?.message,
      });
      console.error('signInWithPopup failed:', error);
      const parsed = parseAuthError(error);
      setAuthError(parsed);
      setSyncStatus('error');
      throw error;
    } finally {
      isLoginInProgressRef.current = false;
    }
  }, [assertSupportedBrowser]);

  // Smart Google Sign-In (Auto-detects Mobile vs PC, with automatic Popup-to-Redirect fallback)
  const signInWithGoogle = useCallback(
    async (method: 'auto' | 'popup' | 'redirect' = 'auto') => {
      setAuthError(null);
      const env = detectBrowserEnv();

      logAuthDiagnostic('Login Started', {
        platform: env.isIOS ? 'iOS' : env.isAndroid ? 'Android' : 'Desktop',
        isMobile: isMobileDevice(),
        isInAppBrowser: env.isInAppBrowser,
        inAppBrowserName: env.inAppBrowserName,
        method,
        flow: method === 'redirect' || (method === 'auto' && isMobileDevice()) ? 'Redirect' : 'Popup',
        currentOrigin: typeof window !== 'undefined' ? window.location.origin : '',
      });

      assertSupportedBrowser();

      // If explicit redirect or mobile device, use redirect
      if (method === 'redirect' || (method === 'auto' && isMobileDevice())) {
        return signInWithGoogleRedirect();
      }

      // If explicit popup requested
      if (method === 'popup') {
        return signInWithGooglePopup();
      }

      // Otherwise try popup first on desktop, with automatic fallback to redirect (JodnaOT flow)
      try {
        await signInWithGooglePopup();
      } catch (popupErr: any) {
        if (
          popupErr?.code === 'auth/popup-blocked' ||
          popupErr?.code === 'auth/popup-closed-by-user' ||
          popupErr?.code === 'auth/cancelled-popup-request'
        ) {
          console.warn('Popup interrupted, falling back to redirect flow...');
          logAuthDiagnostic('Auth Error Code', {
            code: popupErr.code,
            fallback: 'signInWithRedirect',
          });
          return signInWithGoogleRedirect();
        }
        throw popupErr;
      }
    },
    [assertSupportedBrowser, signInWithGooglePopup, signInWithGoogleRedirect]
  );

  const logout = useCallback(async () => {
    try {
      isLoginInProgressRef.current = false;
      clearRedirectLoginFlag();
      logAuthDiagnostic('Auth State Changed', { action: 'logout' });
      await signOut(auth);
      setUser(null);
      setAuthError(null);
      setSyncStatus('local');
    } catch (error) {
      console.error('Sign out failed:', error);
      throw error;
    }
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        syncStatus,
        authError,
        setSyncStatus,
        clearAuthError,
        signInWithGoogle,
        signInWithGoogleRedirect,
        signInWithGooglePopup,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
