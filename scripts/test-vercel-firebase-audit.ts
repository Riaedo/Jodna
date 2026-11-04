import assert from 'node:assert';
import {
  firebaseAppConfig,
  maskEmail,
  getSystemDiagnosticSummary,
  getAuthErrorMessage,
} from '../src/services/firebase';

console.log('--- Test 1: Firebase Configuration Hybrid Resolution & Safety ---');
assert.strictEqual(firebaseAppConfig.projectId, 'gen-lang-client-0967357802');
assert.strictEqual(firebaseAppConfig.authDomain, 'gen-lang-client-0967357802.firebaseapp.com');
assert.strictEqual(
  firebaseAppConfig.firestoreDatabaseId,
  'ai-studio-creditcardrecord-d130ca53-bac9-4d31-b18a-c5ec1ec9582c'
);
console.log('✅ PASS: Project ID and named Database ID properly configured for single unified database');

console.log('\n--- Test 2: PII Email Masking ---');
assert.strictEqual(maskEmail('mmnpzone@gmail.com'), 'm***e@gmail.com');
assert.strictEqual(maskEmail('john.doe@example.co.th'), 'j***e@example.co.th');
assert.strictEqual(maskEmail('a@b.com'), 'a***@b.com');
assert.strictEqual(maskEmail(null), null);
assert.strictEqual(maskEmail(undefined), null);
console.log('✅ PASS: Email addresses properly masked, zero plaintext PII exposed');

console.log('\n--- Test 3: System Diagnostics Summary ---');
const dummyUser = {
  uid: 'user-uid-test-xyz',
  email: 'mmnpzone@gmail.com',
  displayName: 'Nutsu',
} as any;
const diag = getSystemDiagnosticSummary(dummyUser);
assert.strictEqual(diag.projectId, 'gen-lang-client-0967357802');
assert.strictEqual(diag.firestoreDatabaseId, 'ai-studio-creditcardrecord-d130ca53-bac9-4d31-b18a-c5ec1ec9582c');
assert.strictEqual(diag.authState, 'authenticated');
assert.strictEqual(diag.authenticatedEmailMasked, 'm***e@gmail.com');
assert.strictEqual(diag.authenticatedUid, 'user-uid-test-xyz');
console.log('✅ PASS: Diagnostic summary accurately aggregates system and masked user state');

console.log('\n--- Test 4: Auth Error Resolution for Vercel Domains ---');
const unauthErr = {
  code: 'auth/unauthorized-domain',
  message: 'This domain is not authorized for OAuth operations',
};
const resolvedMsg = getAuthErrorMessage(unauthErr);
assert.ok(resolvedMsg.includes('Authorized domains'));
assert.ok(resolvedMsg.includes('Firebase Console'));
console.log('✅ PASS: Helpful instructions provided for Vercel deployment domain authorization');

console.log('\n--- Test 5: Firestore Permission Denied Guidance ---');
const permErr = {
  code: 'permission-denied',
  message: 'Missing or insufficient permissions',
};
const resolvedPermMsg = getAuthErrorMessage(permErr);
assert.ok(resolvedPermMsg.includes('ไม่มีสิทธิ์เข้าถึงข้อมูล'));
console.log('✅ PASS: Permission denied error mapped cleanly');

console.log('\n🎉 ALL CARDPULSE VERCEL & FIREBASE AUDIT TESTS PASSED!');
