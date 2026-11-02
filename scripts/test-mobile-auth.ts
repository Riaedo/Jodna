/**
 * Test Suite: Mobile Google Authentication & Diagnostic Verification
 * Tests browser detection, redirect storage mechanics, error mapping, and diagnostic logger.
 */

// Mock window, navigator, localStorage, sessionStorage for Node environment
const mockStorage = () => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, val: string) => {
      store[key] = String(val);
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
    _getStore: () => store,
  };
};

const localStore = mockStorage();
const sessionStore = mockStorage();

(global as any).window = {
  location: {
    origin: 'https://ais-dev-77wpitj4uybcihlwn7nq7h-824165829063.asia-east1.run.app',
    hostname: 'ais-dev-77wpitj4uybcihlwn7nq7h-824165829063.asia-east1.run.app',
    href: 'https://ais-dev-77wpitj4uybcihlwn7nq7h-824165829063.asia-east1.run.app',
  },
};
(global as any).localStorage = localStore;
(global as any).sessionStorage = sessionStore;
let mockUserAgent = '';
Object.defineProperty(globalThis, 'navigator', {
  value: {
    get userAgent() {
      return mockUserAgent;
    },
  },
  configurable: true,
  writable: true,
});

import {
  detectBrowserEnv,
  getAuthErrorMessage,
  logAuthDiagnostic,
  getAuthDiagnostics,
  isRedirectLoginPending,
  setRedirectLoginFlag,
  clearRedirectLoginFlag,
  AuthDiagnosticMilestone,
} from '../src/services/firebase';

let passed = 0;
let failed = 0;

function assert(condition: boolean, desc: string) {
  if (condition) {
    console.log(`  ✅ PASS: ${desc}`);
    passed++;
  } else {
    console.error(`  ❌ FAIL: ${desc}`);
    failed++;
  }
}

console.log('--- TEST SUITE: MOBILE GOOGLE AUTHENTICATION ---');

// Test 1: iPhone Safari Detection
console.log('\n[Test 1] User-Agent Detection - iPhone Safari');
mockUserAgent =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1';
let env = detectBrowserEnv();
assert(env.isMobile === true, 'Identifies as Mobile');
assert(env.isIOS === true, 'Identifies as iOS');
assert(env.isInAppBrowser === false, 'Not an In-App Browser');

// Test 2: Android Chrome Detection
console.log('\n[Test 2] User-Agent Detection - Android Chrome');
mockUserAgent =
  'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.6312.80 Mobile Safari/537.36';
env = detectBrowserEnv();
assert(env.isMobile === true, 'Identifies as Mobile');
assert(env.isAndroid === true, 'Identifies as Android');
assert(env.isInAppBrowser === false, 'Not an In-App Browser');

// Test 3: In-App Browsers (LINE, Facebook, Instagram)
console.log('\n[Test 3] User-Agent Detection - In-App Browsers');
mockUserAgent =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Line/13.14.0';
env = detectBrowserEnv();
assert(env.isInAppBrowser === true, 'LINE detected as In-App Browser');
assert(env.inAppBrowserName === 'LINE', 'Identifies LINE name');

mockUserAgent =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 [FBAN/FBIOS;FBAV/400.0]';
env = detectBrowserEnv();
assert(env.isInAppBrowser === true, 'Facebook detected as In-App Browser');
assert(env.inAppBrowserName === 'Facebook', 'Identifies Facebook name');

// Test 4: Desktop Chrome Detection
console.log('\n[Test 4] User-Agent Detection - Desktop Chrome');
mockUserAgent =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36';
env = detectBrowserEnv();
assert(env.isMobile === false, 'Desktop is not Mobile');
assert(env.isInAppBrowser === false, 'Desktop is not In-App');

// Test 5: Dual Storage Redirect State Management
console.log('\n[Test 5] Dual-Storage Redirect Pending Flags');
clearRedirectLoginFlag();
assert(isRedirectLoginPending() === false, 'Initially not pending');

setRedirectLoginFlag();
assert(isRedirectLoginPending() === true, 'Pending after setRedirectLoginFlag');
assert(localStore.getItem('cardpulse_auth_redirect_pending') === 'true', 'Saved in localStorage');
assert(sessionStore.getItem('cardpulse_auth_redirect_pending') === 'true', 'Saved in sessionStorage');

// Simulate iOS Safari losing sessionStorage but keeping localStorage
sessionStore.clear();
assert(isRedirectLoginPending() === true, 'Still pending even if sessionStorage is lost on iOS WebKit');

// Clear
clearRedirectLoginFlag();
assert(isRedirectLoginPending() === false, 'Not pending after clearRedirectLoginFlag');
assert(localStore.getItem('cardpulse_auth_redirect_pending') === null, 'localStorage cleared');
assert(sessionStore.getItem('cardpulse_auth_redirect_pending') === null, 'sessionStorage cleared');

// Test 6: Redirect State TTL Expiration (Prevent stale infinite loading)
console.log('\n[Test 6] Redirect State TTL Expiration');
localStore.setItem('cardpulse_auth_redirect_pending', 'true');
// 15 minutes ago
localStore.setItem('cardpulse_auth_redirect_time', (Date.now() - 15 * 60 * 1000).toString());
assert(isRedirectLoginPending() === false, 'Expired redirect flag is discarded after TTL');

// Test 7: Diagnostic Logging (All 8 Milestones, Redaction & History)
console.log('\n[Test 7] Diagnostic Logging & Secret Redaction');
sessionStore.clear();

const milestones: AuthDiagnosticMilestone[] = [
  'Login Started',
  'Redirect Initiated',
  'Redirect Returned',
  'Redirect Result Received',
  'Auth State Changed',
  'User UID Confirmed',
  'Firestore User Data Loaded',
  'Auth Error Code',
];

milestones.forEach((m) => {
  logAuthDiagnostic(m, {
    uid: 'test-user-123',
    email: 'test@example.com',
    accessToken: 'SECRET_ACCESS_TOKEN_123',
    idToken: 'SECRET_ID_TOKEN_456',
    secretKey: 'CONFIDENTIAL',
  });
});

const diagnostics = getAuthDiagnostics();
assert(diagnostics.length === 8, 'Recorded all 8 milestone diagnostic events');

// Verify token redaction
const firstEvent = diagnostics[0];
assert(firstEvent.details?.accessToken === '[REDACTED]', 'accessToken was redacted');
assert(firstEvent.details?.idToken === '[REDACTED]', 'idToken was redacted');
assert(firstEvent.details?.secretKey === '[REDACTED]', 'secretKey was redacted');
assert(firstEvent.details?.uid === 'test-user-123', 'Safe details preserved');

// Test 8: Error Message Mapping with Dynamic Domain
console.log('\n[Test 8] Error Message Resolution & Dynamic Domain Formatting');
const unauthErr = getAuthErrorMessage({ code: 'auth/unauthorized-domain' });
assert(
  unauthErr.includes('ais-dev-77wpitj4uybcihlwn7nq7h-824165829063.asia-east1.run.app'),
  'Includes exact current domain in unauthorized-domain error'
);
assert(
  unauthErr.includes('Firebase Console > Authentication > Settings > Authorized domains'),
  'Provides actionable instructions for Authorized domains'
);

const disallowedErr = getAuthErrorMessage({ code: 'auth/disallowed_useragent' });
assert(disallowedErr.includes('Safari') && disallowedErr.includes('Chrome'), 'Actionable message for disallowed UA');

const popupBlockedErr = getAuthErrorMessage({ code: 'auth/popup-blocked' });
assert(popupBlockedErr.includes('Pop-up'), 'Actionable message for blocked popup');

console.log(`\n================================`);
console.log(`TEST SUMMARY: ${passed} Passed, ${failed} Failed`);
console.log(`================================`);

process.exit(failed > 0 ? 1 : 0);
