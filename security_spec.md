# Her Little Arcade — Firestore Security Specification (Phase 0 TDD)

## 1. Data Invariants
1. **Default-Deny Catch-All**: All unmatched paths are unconditionally denied (`allow read, write: if false;`).
2. **PII Split-Collection Isolation**: User email addresses and verification flags are stored exclusively in `/users/{userId}/private/{docId}` and may only be read or written by the authenticated owner (`request.auth.uid == userId`).
3. **Verified Identity Enforcement**: All write operations require `isSignedIn()`, `request.auth.token.email_verified == true`, valid path IDs (`isValidId()`), and strict schema validation helpers (`isValid[Entity]()`).
4. **Relational Consistency (Master Gate)**: Creating a `GameRecord`, `CouplePairing`, or `Room` requires that the parent `/users/$(request.auth.uid)` document exists in Firestore.
5. **Terminal State Locking**: Once a `CouplePairing` reaches `status == 'unpaired'` or a `Room` reaches `status == 'finished'` or `'expired'`, no further updates are permitted.
6. **Temporal & Ownership Immutability**: `createdAt`, `uid`, `requesterUid`, `userUid`, and `hostUid` are strictly immutable on update, and timestamps must match `request.time`.
7. **Secure List Queries**: Every `allow list` rule enforces ownership or membership via `resource.data` against `request.auth.uid` (no blanket `allow list: if isSignedIn()`).

## 2. The "Dirty Dozen" Adversarial Payloads
1. **Unauthenticated Write**: Creating `/users/usr_1` with `request.auth == null` -> `PERMISSION_DENIED`.
2. **Unverified Email Spoof**: Creating `/users/usr_1` with `email_verified == false` -> `PERMISSION_DENIED`.
3. **Shadow Field Injection**: Creating `/users/usr_1` with extra field `isAdmin: true` -> `PERMISSION_DENIED`.
4. **Identity Spoofing on Create**: User `usr_1` creating `/game_records/rec_1` with `userUid: 'usr_2'` -> `PERMISSION_DENIED`.
5. **Cross-User PII Read**: User `usr_2` reading `/users/usr_1/private/info` -> `PERMISSION_DENIED`.
6. **Path ID Poisoning**: Creating `/rooms/` with a 500-character or special-character ID -> `PERMISSION_DENIED`.
7. **Value Poisoning on Update**: Updating `/users/usr_1` `username` with a 200-character string -> `PERMISSION_DENIED`.
8. **Immutable Field Mutation**: Updating `createdAt` or `uid` on `/users/usr_1` -> `PERMISSION_DENIED`.
9. **Client Timestamp Forgery**: Creating `/game_records/rec_1` with a past/future `createdAt != request.time` -> `PERMISSION_DENIED`.
10. **Terminal State Re-opening**: Updating `/rooms/ROOM01` after `existing().status == 'finished'` -> `PERMISSION_DENIED`.
11. **Orphaned Record Creation**: Creating `/game_records/rec_1` when `/users/$(request.auth.uid)` does not exist -> `PERMISSION_DENIED`.
12. **Blanket List Scraping**: Listing `/game_records` without filtering `resource.data.userUid == request.auth.uid` -> `PERMISSION_DENIED`.
