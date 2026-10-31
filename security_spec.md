# CardPulse Security Specification & Red Team Audit

## 1. Data Invariants
1. **User Identity Invariant**: A user document at `/users/{userId}` can only be read, created, or updated by the authenticated user whose `request.auth.uid == userId`.
2. **Subcollection Relational Gate**: A credit card at `/users/{userId}/cards/{cardId}` or transaction at `/users/{userId}/transactions/{transactionId}` strictly belongs to the path owner (`request.auth.uid == userId`) and must store `userId == request.auth.uid`.
3. **Transaction-Card Relation**: When creating or writing a transaction, the target card referenced by `cardId` must belong to the same user.
4. **Immutability of Identity & Creation**: `userId`, `id`, and `createdAt` cannot be modified during updates.
5. **Timestamp Temporal Integrity**: Timestamps `createdAt` and `updatedAt` must match `request.time`.
6. **Denial-of-Wallet & Injection Guard**: IDs must follow `^[a-zA-Z0-9_\-]+$` and be <= 128 chars. String fields must have strict length bounds (`name <= 100`, `title <= 200`, `note <= 500`, etc.). Arrays such as `tags` must have `.size() <= 10`.

## 2. The "Dirty Dozen" Payloads

1. **Payload 1: Unauthenticated Read**
   - Path: `/users/user_123/cards/card_abc`
   - Request: `auth: null`
   - Target: Try to read user's credit card without being signed in.
   - Expected: PERMISSION_DENIED.

2. **Payload 2: Cross-Tenant Card Access**
   - Path: `/users/victim_user/cards/card_123`
   - Request: `auth: { uid: 'attacker_user' }`
   - Target: Attacker attempts to read victim's cards.
   - Expected: PERMISSION_DENIED.

3. **Payload 3: Identity Spoofing on Card Creation**
   - Path: `/users/attacker_user/cards/card_123`
   - Request: `auth: { uid: 'attacker_user' }`
   - Payload: `{ id: 'card_123', userId: 'victim_user', name: 'Forged Card', bank: 'SCB', billingCutoffDay: 15, paymentDueDay: 5 }`
   - Target: Write a document inside own path but claiming `userId: victim_user`.
   - Expected: PERMISSION_DENIED.

4. **Payload 4: ID Injection Attack**
   - Path: `/users/user_123/cards/malicious%20..%20id`
   - Request: `auth: { uid: 'user_123' }`
   - Target: Path document ID fails regex guard `^[a-zA-Z0-9_\-]+$`.
   - Expected: PERMISSION_DENIED.

5. **Payload 5: Massive String Buffer Overflow (Denial of Wallet)**
   - Path: `/users/user_123/cards/card_1`
   - Request: `auth: { uid: 'user_123' }`
   - Payload: `{ id: 'card_1', userId: 'user_123', name: 'A'.repeat(50000), bank: 'B', billingCutoffDay: 1, paymentDueDay: 1 }`
   - Target: Name exceeds max length limit of 100 characters.
   - Expected: PERMISSION_DENIED.

6. **Payload 6: Shadow Field Injection in Transaction**
   - Path: `/users/user_123/transactions/tx_1`
   - Request: `auth: { uid: 'user_123' }`
   - Payload: `{ id: 'tx_1', userId: 'user_123', cardId: 'c1', date: '2026-03-01', title: 'Coffee', category: 'food', amount: 80, billingCycleMonth: '2026-03', isAdminOverride: true }`
   - Target: Add undeclared shadow field `isAdminOverride`.
   - Expected: PERMISSION_DENIED.

7. **Payload 7: Unbounded Array Injection (Denial of Wallet)**
   - Path: `/users/user_123/transactions/tx_2`
   - Request: `auth: { uid: 'user_123' }`
   - Payload: `{ id: 'tx_2', userId: 'user_123', cardId: 'c1', date: '2026-03-01', title: 'Lunch', category: 'food', amount: 150, billingCycleMonth: '2026-03', tags: Array(100).fill('junk') }`
   - Target: Tags list exceeds maximum allowed size of 10 items.
   - Expected: PERMISSION_DENIED.

8. **Payload 8: Immutable Field Tampering (Stealing Transaction)**
   - Path: `/users/user_123/transactions/tx_1`
   - Operation: update
   - Request: `auth: { uid: 'user_123' }`
   - Payload: `incoming().userId = 'someone_else'`
   - Target: Modify immutable `userId` on existing transaction.
   - Expected: PERMISSION_DENIED.

9. **Payload 9: Numeric Range Violation**
   - Path: `/users/user_123/cards/card_invalid_cutoff`
   - Request: `auth: { uid: 'user_123' }`
   - Payload: `{ id: 'card_invalid_cutoff', userId: 'user_123', name: 'Card', bank: 'Bank', billingCutoffDay: 35, paymentDueDay: 10 }`
   - Target: Cutoff day out of calendar bounds (1-31).
   - Expected: PERMISSION_DENIED.

10. **Payload 10: Negative Expense Amount Tampering**
    - Path: `/users/user_123/transactions/tx_neg`
    - Request: `auth: { uid: 'user_123' }`
    - Payload: `{ id: 'tx_neg', userId: 'user_123', cardId: 'c1', date: '2026-03-01', title: 'Fake', category: 'food', amount: -99999, billingCycleMonth: '2026-03' }`
    - Target: Negative transaction amount.
    - Expected: PERMISSION_DENIED.

11. **Payload 11: Future/Client Timestamp Manipulation**
    - Path: `/users/user_123/cards/card_1`
    - Request: `auth: { uid: 'user_123' }`
    - Payload: `{ ..., createdAt: timestamp.date(2099, 1, 1) }`
    - Target: Fabricate server timestamp `createdAt` instead of `request.time`.
    - Expected: PERMISSION_DENIED.

12. **Payload 12: Catch-all Document Traversal**
    - Path: `/some_other_collection/data`
    - Request: `auth: { uid: 'user_123' }`
    - Target: Read or write to unmapped collections outside `/users/{userId}`.
    - Expected: PERMISSION_DENIED (Default deny).
