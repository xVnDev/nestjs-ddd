# P08 · Step 2 — MFA, OTP & Magic Link

**Project:** nestjs-ddd  |  **Phase:** P08 — Advanced Security  |  **Base branch:** `dev`  |  **Status:** ⬜ Planned

> Source of truth: [`roadmap.md`](../../../roadmap.md) §4. Umbrella IDs `P08-04`, `P08-05`, `P08-06`, `P08-07` stay in the roadmap; this file lists the final atomic split (`P08-04a` … `P08-07d`).
> **Format**: `P<phase>-<umbrella><letter>` — one atomic task = one commit; sibling atomic tasks share one branch (branch per umbrella task). Every atomic task uses the 7-field format: `Description`, `CLI(s)`, `Package(s)`, `File(s)/Folder(s)`, `Branch`, `Commit`, `Testing`.
> **Ordering notes**: (a) `P08-04a`/`P08-04b` define and conformance-test the TOTP adapters, `P08-04c` adds the `TotpSecretStore` port plus its memory adapter (so `P08-05a` can rebind an encrypted adapter without touching use cases), `P08-04d` builds enrollment/toggle APIs, and `P08-04e` adds the login challenge. (b) `P08-05a` encrypts secrets at rest by rebinding `TotpSecretStore`, `P08-05b` verifies conformance and that no plaintext is persisted, `P08-05c` defines single-use recovery codes behind their own port, and `P08-05d` exposes the recovery APIs. (c) `P08-06a`–`P08-06c` define the OTP port with memory and Redis adapters before `P08-06d` adds the notifier port/fallback and `P08-06e` wires request/verify endpoints. (d) `P08-07a`/`P08-07b` establish the magic-link token port with both adapters; `P08-07c`/`P08-07d` add request and verify flows reusing the notifier port from `P08-06d`.

## DDD + SOLID lens for this step

- Bounded contexts own `domain/`, `application/`, `infrastructure/`, `interfaces/`; dependencies point inward.
- Domain/application depend only on port tokens; adapters are injected, never imported directly.
- Every port ships one conformance spec run against all adapters, including in-memory fallbacks.
- Business rules live in entities/value objects/use cases; controllers stay thin.
- Introduce a port only when a mechanism must be swappable or isolated for tests.

## Step Summary

Add three swappable second-factor channels in the `security` bounded context. TOTP enrollment, toggling and a mandatory login challenge are backed by a `TotpPort` with an `otplib` adapter and a deterministic memory adapter; the shared secret is persisted through a `TotpSecretStore` port that is rebound from a memory adapter to an AES-256-GCM encrypted adapter, with single-use recovery codes stored hashed. OTP and magic-link flows are each defined behind narrow ports with memory fallbacks and Redis adapters, delivered through a PII-free notifier port, with request/verify endpoints that leak nothing about account existence. Every new port carries one conformance suite executed against all of its adapters; no real secrets, codes or tokens appear in fixtures or logs.

## Atomic Tasks

### `P08-04a` — Define the TOTP port and otplib adapter
- **Description**: Create the narrow `TotpPort` interface and `TOTP` DI token in `src/modules/security/domain/ports/totp.port.ts` with `generateSecret()`, `buildUri(...)`, `verify(token, secret)` and a configurable `window`. Install `otplib` and implement `src/modules/security/adapters/totp.otplib.adapter.ts` as the real adapter; add the shared `test/conformance/totp.conformance.ts` suite and run it against this adapter. Keep the adapter swappable and the URI free of real account data in fixtures. Atomic checks: (a) port + token exported, (b) otplib adapter conforms, (c) URI payload contains no real PII. First in this umbrella; blocks `P08-04b` and `P08-04d`.
- **CLI(s)**: `npm install otplib`; `npm run test:unit -- totp`.
- **Package(s)**: `otplib` installed as a runtime dependency (TOTP generation/verification).
- **File(s)/Folder(s)**:
  - **Added**: `src/modules/security/domain/ports/totp.port.ts`, `test/conformance/totp.conformance.ts`, `src/modules/security/adapters/totp.otplib.adapter.ts`, `src/modules/security/adapters/totp.otplib.adapter.spec.ts`
  - **Modified**: `src/modules/security/security.module.ts`, `package.json`, `package-lock.json`
  - **Deleted**: `None`
- **Branch**: `feat/sec-totp-mfa` (shared with `P08-04b`, `P08-04c`, `P08-04d`, `P08-04e`)
- **Commit**: `feat(sec): define totp port and otplib adapter`
- **Testing**: Conformance suite asserts secret format, valid/invalid token verification, time-window tolerance via fake timers and deterministic URI shape; negative paths for malformed tokens; no real secrets in fixtures; coverage thresholds pass.

### `P08-04b` — Add the deterministic in-memory TOTP adapter
- **Description**: Implement `src/modules/security/adapters/totp.memory.adapter.ts` as a first-class fallback that derives a deterministic code from a fixed secret and a fake clock, suitable for local development and tests without external state. It must pass the identical `totp.conformance.ts` suite unchanged, proving LSP substitutability. Atomic checks: (a) memory adapter conforms, (b) deterministic under a fixed clock, (c) no real secret material. Depends on `P08-04a`; blocks `P08-04e`.
- **CLI(s)**: `npm run test:unit -- totp`.
- **Package(s)**: `None` — reuses `otplib` from `P08-04a` only for format helpers if needed; otherwise Node `crypto`.
- **File(s)/Folder(s)**:
  - **Added**: `src/modules/security/adapters/totp.memory.adapter.ts`, `src/modules/security/adapters/totp.memory.adapter.spec.ts`
  - **Modified**: `None`
  - **Deleted**: `None`
- **Branch**: `feat/sec-totp-mfa` (shared with `P08-04a`, `P08-04c`, `P08-04d`, `P08-04e`)
- **Commit**: `feat(sec): add deterministic memory totp adapter`
- **Testing**: Runs the same conformance suite; negative paths for wrong window and invalid secret; fake-timer determinism assertion; coverage thresholds pass.

### `P08-04c` — Define the TOTP secret-store port and memory adapter
- **Description**: Create `TotpSecretStorePort` + `TOTP_SECRET_STORE` token in `src/modules/security/domain/ports/totp-secret-store.port.ts` with `save`, `findByUser` and `delete`, plus a domain `TotpEnrollment` entity holding the enabled flag and the (initially plaintext, dev-only) secret. Implement the in-memory fallback and a `test/conformance/totp-secret-store.conformance.ts` suite. This port exists so `P08-05a` can swap in encrypted storage via token rebind without editing any use case. Atomic checks: (a) port + token exist, (b) memory adapter conforms, (c) no use case imports an adapter. Depends on `P08-04a`; blocks `P08-04d` and `P08-05a`.
- **CLI(s)**: `npm run test:unit -- totp-secret-store`.
- **Package(s)**: `None`.
- **File(s)/Folder(s)**:
  - **Added**: `src/modules/security/domain/ports/totp-secret-store.port.ts`, `src/modules/security/domain/entities/totp-enrollment.entity.ts`, `test/conformance/totp-secret-store.conformance.ts`, `src/modules/security/adapters/totp-secret-store.memory.adapter.ts`, `src/modules/security/adapters/totp-secret-store.memory.adapter.spec.ts`
  - **Modified**: `src/modules/security/security.module.ts`
  - **Deleted**: `None`
- **Branch**: `feat/sec-totp-mfa` (shared with `P08-04a`, `P08-04b`, `P08-04d`, `P08-04e`)
- **Commit**: `feat(sec): add totp secret-store port and memory adapter`
- **Testing**: Conformance suite asserts save/find/delete round-trip and missing-user negative path; faker dummy secrets only (never real tokens); coverage thresholds pass.

### `P08-04d` — Add TOTP enrollment and toggle APIs
- **Description**: Add `EnrollTotpUseCase` and `ToggleTotpUseCase` in `src/modules/security/application/use-cases/`, thin DTOs/controller under `src/modules/security/interfaces/`, and endpoints `POST /mfa/totp/enroll` and `POST /mfa/totp/toggle`. Enrollment generates a secret through `TotpPort`, persists it through `TOTP_SECRET_STORE` and returns the otpauth URI plus a one-time confirmation requirement; toggle flips the enabled flag only after a valid challenge. Atomic checks: (a) enroll persists via port, (b) toggle requires valid TOTP, (c) controller has no business rules. Depends on `P08-04a`/`P08-04c`; blocks `P08-04e`.
- **CLI(s)**: `npm run test:unit`; `npm run test:e2e -- totp`.
- **Package(s)**: `None`.
- **File(s)/Folder(s)**:
  - **Added**: `src/modules/security/application/use-cases/enroll-totp.use-case.ts`, `src/modules/security/application/use-cases/enroll-totp.use-case.spec.ts`, `src/modules/security/application/use-cases/toggle-totp.use-case.ts`, `src/modules/security/application/use-cases/toggle-totp.use-case.spec.ts`, `src/modules/security/interfaces/controllers/totp.controller.ts`, `src/modules/security/interfaces/dto/enroll-totp.dto.ts`, `src/modules/security/interfaces/dto/toggle-totp.dto.ts`, `test/totp-enrollment.e2e-spec.ts`
  - **Modified**: `src/modules/security/security.module.ts`
  - **Deleted**: `None`
- **Branch**: `feat/sec-totp-mfa` (shared with `P08-04a`, `P08-04b`, `P08-04c`, `P08-04e`)
- **Commit**: `feat(sec): add totp enrollment and toggle endpoints`
- **Testing**: Unit specs with `vi.fn()` TOTP and secret-store ports; E2E asserts enrollment URI shape, confirmation needed before enable, and toggle rejects an invalid code; negative paths for disabled user; coverage thresholds pass.

### `P08-04e` — Enforce the TOTP login verify challenge
- **Description**: Add `MfaChallengeGuardService` and a pending-challenge store so that, when TOTP is enabled, a successful password check yields a short-lived challenge token instead of full auth tokens; `POST /mfa/totp/verify` must accept a valid TOTP (or recovery code from `P08-05c`) to exchange the challenge for tokens. Use the memory TOTP adapter in tests and keep challenge tokens single-use with TTL. Atomic checks: (a) enabled users get a challenge, not tokens, (b) valid TOTP completes login, (c) challenge replay rejected. Depends on `P08-04b`/`P08-04d`; recovery-code path completed in `P08-05d`.
- **CLI(s)**: `npm run test:unit`; `npm run test:e2e -- mfa`.
- **Package(s)**: `None`.
- **File(s)/Folder(s)**:
  - **Added**: `src/modules/security/application/use-cases/mfa-challenge.service.ts`, `src/modules/security/application/use-cases/mfa-challenge.service.spec.ts`, `src/modules/security/interfaces/controllers/mfa-challenge.controller.ts`, `src/modules/security/interfaces/dto/verify-totp.dto.ts`, `test/mfa-challenge.e2e-spec.ts`
  - **Modified**: `src/modules/auth/use-cases/local-login.use-case.ts`, `src/modules/security/security.module.ts`
  - **Deleted**: `None`
- **Branch**: `feat/sec-totp-mfa` (shared with `P08-04a`, `P08-04b`, `P08-04c`, `P08-04d`)
- **Commit**: `feat(sec): enforce totp challenge on login for enrolled users`
- **Testing**: Unit spec with `vi.fn()` TOTP/challenge ports and fake timers; E2E asserts wrong code rejected, valid code issues tokens via `TOKEN_ISSUER`, and challenge replay fails; coverage thresholds pass.

### `P08-05a` — Encrypt TOTP secrets at rest via token rebind
- **Description**: Implement `src/modules/security/adapters/totp-secret-store.encrypted.adapter.ts` that wraps the shared `ENCRYPTION_SERVICE` port (AES-256-GCM) so every secret is stored as ciphertext plus IV/auth-tag metadata; rebind `TOTP_SECRET_STORE` to it in production and keep the memory adapter for development. No use case changes. Atomic checks: (a) secrets stored encrypted, (b) rebind requires no use-case edits, (c) ciphertext includes IV/tag. Depends on `P08-04c`; blocks `P08-05b`.
- **CLI(s)**: `npm run test:unit -- totp-secret-store`.
- **Package(s)**: `None` — reuses the shared `ENCRYPTION_SERVICE` port from the shared kernel (AES-256-GCM helper in `src/common/crypto/`).
- **File(s)/Folder(s)**:
  - **Added**: `src/modules/security/adapters/totp-secret-store.encrypted.adapter.ts`, `src/modules/security/adapters/totp-secret-store.encrypted.adapter.spec.ts`
  - **Modified**: `src/modules/security/security.module.ts`
  - **Deleted**: `None`
- **Branch**: `feat/sec-totp-encryption-codes` (shared with `P08-05b`, `P08-05c`, `P08-05d`)
- **Commit**: `feat(sec): encrypt totp secrets at rest`
- **Testing**: Adapter spec runs the same conformance suite; assert stored value != plaintext and decrypt round-trip; tampered ciphertext (flipped auth tag) is rejected; coverage thresholds pass.

### `P08-05b` — Verify conformance and no-plaintext persistence
- **Description**: Execute `totp-secret-store.conformance.ts` unchanged against both the memory and encrypted adapters, and add a storage-level assertion that the underlying record never contains the raw secret. Cover the negative path where a missing encryption key fails closed at bootstrap. Atomic checks: (a) both adapters pass one suite, (b) no plaintext in storage, (c) missing key fails closed. Depends on `P08-05a`.
- **CLI(s)**: `npm run test:unit -- totp-secret-store`; `npm run test:cov`.
- **Package(s)**: `None`.
- **File(s)/Folder(s)**:
  - **Added**: `None`
  - **Modified**: `src/modules/security/adapters/totp-secret-store.encrypted.adapter.spec.ts`, `src/modules/security/adapters/totp-secret-store.memory.adapter.spec.ts`
  - **Deleted**: `None`
- **Branch**: `feat/sec-totp-encryption-codes` (shared with `P08-05a`, `P08-05c`, `P08-05d`)
- **Commit**: `test(sec): assert totp secret conformance and no plaintext at rest`
- **Testing**: Conformance suite passes for both adapters; spy on the storage adapter via `vi.fn()` to assert the persisted value is ciphertext; negative path for absent key; coverage thresholds pass.

### `P08-05c` — Define single-use recovery codes behind a port
- **Description**: Create `RecoveryCodePort` + `RECOVERY_CODE` token in `src/modules/security/domain/ports/recovery-code.port.ts` with `issue`, `verify` and `consume`, storing codes as one-way hashes via the shared hasher so only hashes persist. Add a production-shaped in-memory adapter and `test/conformance/recovery-code.conformance.ts` asserting single-use consumption and replay rejection. Generate codes with `randomBytes` from faker-seeded tests; never commit real codes. Atomic checks: (a) narrow port exists, (b) codes hashed at rest, (c) single-use with replay rejection. Depends on `P08-04c`; blocks `P08-05d`.
- **CLI(s)**: `npm run test:unit -- recovery-code`.
- **Package(s)**: `None` — reuses the shared `PASSWORD_HASHER` port from `P04-02` and Node `crypto`.
- **File(s)/Folder(s)**:
  - **Added**: `src/modules/security/domain/ports/recovery-code.port.ts`, `test/conformance/recovery-code.conformance.ts`, `src/modules/security/adapters/recovery-code.memory.adapter.ts`, `src/modules/security/adapters/recovery-code.memory.adapter.spec.ts`
  - **Modified**: `src/modules/security/security.module.ts`
  - **Deleted**: `None`
- **Branch**: `feat/sec-totp-encryption-codes` (shared with `P08-05a`, `P08-05b`, `P08-05d`)
- **Commit**: `feat(sec): add single-use recovery code port and adapter`
- **Testing**: Conformance suite asserts issue returns N codes, verify accepts only unconsumed codes, consume is atomic and replay fails; assert stored values are hashes, never plaintext; coverage thresholds pass.

### `P08-05d` — Expose recovery-code issue and verify APIs
- **Description**: Wire recovery-code issuance into TOTP enrollment from `P08-04d` so the one-time display returns codes exactly once, and add `POST /mfa/recovery/verify` that consumes a code to satisfy the MFA challenge from `P08-04e` and `POST /mfa/recovery/regenerate` that invalidates old codes. Keep controllers thin and emit no code values in responses after issuance or in logs. Atomic checks: (a) codes shown once at enrollment, (b) verify consumes single-use, (c) regen invalidates prior codes. Depends on `P08-05c` and `P08-04e`.
- **CLI(s)**: `npm run test:unit`; `npm run test:e2e -- recovery`.
- **Package(s)**: `None`.
- **File(s)/Folder(s)**:
  - **Added**: `src/modules/security/application/use-cases/verify-recovery-code.use-case.ts`, `src/modules/security/application/use-cases/verify-recovery-code.use-case.spec.ts`, `src/modules/security/interfaces/controllers/recovery-code.controller.ts`, `src/modules/security/interfaces/dto/verify-recovery-code.dto.ts`, `test/recovery-code.e2e-spec.ts`
  - **Modified**: `src/modules/security/application/use-cases/enroll-totp.use-case.ts`, `src/modules/security/interfaces/dto/enroll-totp.dto.ts`
  - **Deleted**: `None`
- **Branch**: `feat/sec-totp-encryption-codes` (shared with `P08-05a`, `P08-05b`, `P08-05c`)
- **Commit**: `feat(sec): add recovery-code issue, verify and regenerate APIs`
- **Testing**: Unit specs with `vi.fn()` recovery-code and challenge ports; E2E asserts one-time display, successful code consumption completing login, replay rejection and regeneration invalidating old codes; log-spy proves no code leakage; coverage thresholds pass.

### `P08-06a` — Define the OTP port and domain types
- **Description**: Create the narrow `OtpPort` interface and `OTP` DI token in `src/modules/security/domain/ports/otp.port.ts` with `issue(subject, purpose)`, `verify(code, subject, purpose)` and `invalidate(subject, purpose)`, plus a domain `OtpPurpose` enum and `OtpChallenge` value object carrying TTL and attempt counts. Add `test/conformance/otp.conformance.ts` as the single shared suite. Atomic checks: (a) port + token exist, (b) purpose-specific challenges typed, (c) conformance harness exists. First in this umbrella; blocks `P08-06b` and `P08-06c`.
- **CLI(s)**: `npm run test:unit`; `npm run typecheck`.
- **Package(s)**: `None`.
- **File(s)/Folder(s)**:
  - **Added**: `src/modules/security/domain/ports/otp.port.ts`, `src/modules/security/domain/value-objects/otp-challenge.vo.ts`, `test/conformance/otp.conformance.ts`
  - **Modified**: `None`
  - **Deleted**: `None`
- **Branch**: `feat/sec-otp` (shared with `P08-06b`, `P08-06c`, `P08-06d`, `P08-06e`)
- **Commit**: `feat(sec): define otp port and challenge value object`
- **Testing**: Type spec for the port and value object; conformance harness exposes a factory that adapter specs invoke; coverage thresholds pass.

### `P08-06b` — Add the in-memory OTP adapter
- **Description**: Implement `src/modules/security/adapters/otp.memory.adapter.ts` as a production-shaped fallback enforcing TTL expiry, single-use consumption, a bounded verify-attempt count and resend-invalidation of prior codes, keyed by a hashed subject (never raw email). It must pass `otp.conformance.ts` unchanged. Atomic checks: (a) memory adapter conforms, (b) TTL and single-use enforced, (c) hashed subject keys. Depends on `P08-06a`; blocks `P08-06e`.
- **CLI(s)**: `npm run test:unit -- otp`.
- **Package(s)**: `None`.
- **File(s)/Folder(s)**:
  - **Added**: `src/modules/security/adapters/otp.memory.adapter.ts`, `src/modules/security/adapters/otp.memory.adapter.spec.ts`
  - **Modified**: `src/modules/security/security.module.ts`
  - **Deleted**: `None`
- **Branch**: `feat/sec-otp` (shared with `P08-06a`, `P08-06c`, `P08-06d`, `P08-06e`)
- **Commit**: `feat(sec): add in-memory otp adapter with ttl and single-use`
- **Testing**: Conformance suite asserts expiry via fake timers, single-use, replay rejection, attempt lockout and resend invalidation; negative path for wrong purpose; coverage thresholds pass.

### `P08-06c` — Add the Redis/Keyv OTP adapter
- **Description**: Implement `src/modules/security/adapters/otp.redis.adapter.ts` atop the Keyv cache port from `P03-04`, with native TTLs and atomic consume so it passes the identical `otp.conformance.ts` suite as the memory fallback. Atomic checks: (a) Redis adapter conforms unchanged, (b) TTL set on keys, (c) atomic consume prevents double use. Depends on `P08-06a`; blocks `P08-06e`.
- **CLI(s)**: `npm run test:unit -- otp`.
- **Package(s)**: `None` — reuses `@keyv/redis` and the cache port installed in `P03-04`.
- **File(s)/Folder(s)**:
  - **Added**: `src/modules/security/adapters/otp.redis.adapter.ts`, `src/modules/security/adapters/otp.redis.adapter.spec.ts`
  - **Modified**: `None`
  - **Deleted**: `None`
- **Branch**: `feat/sec-otp` (shared with `P08-06a`, `P08-06b`, `P08-06d`, `P08-06e`)
- **Commit**: `feat(sec): add Redis-backed otp adapter`
- **Testing**: Same conformance suite passes; assert TTL propagation and atomic consume via `vi.fn()` on the cache client; negative path for backend error; coverage thresholds pass.

### `P08-06d` — Define the OTP notifier port and memory fallback
- **Description**: Create `OtpNotifierPort` + `OTP_NOTIFIER` token in `src/modules/security/domain/ports/otp-notifier.port.ts` with a single `send(destination, code, purpose)` method, plus `test/conformance/otp-notifier.conformance.ts`. Add a production-shaped in-memory/log adapter that records sends without ever logging the code or raw destination, and reuse the mail port from `P03-07` for the production implementation. Atomic checks: (a) narrow notifier port exists, (b) memory fallback conforms, (c) no code or PII in logs. Depends on `P08-06a`; blocks `P08-06e` and `P08-07c`.
- **CLI(s)**: `npm run test:unit -- otp-notifier`.
- **Package(s)**: `None` — reuses the mail port/adapter from `P03-07`.
- **File(s)/Folder(s)**:
  - **Added**: `src/modules/security/domain/ports/otp-notifier.port.ts`, `test/conformance/otp-notifier.conformance.ts`, `src/modules/security/adapters/otp-notifier.memory.adapter.ts`, `src/modules/security/adapters/otp-notifier.memory.adapter.spec.ts`, `src/modules/security/adapters/otp-notifier.mail.adapter.ts`, `src/modules/security/adapters/otp-notifier.mail.adapter.spec.ts`
  - **Modified**: `src/modules/security/security.module.ts`
  - **Deleted**: `None`
- **Branch**: `feat/sec-otp` (shared with `P08-06a`, `P08-06b`, `P08-06c`, `P08-06e`)
- **Commit**: `feat(sec): add otp notifier port with memory and mail adapters`
- **Testing**: Conformance suite runs against both notifier adapters; assert code and destination are redacted in logs via a `vi.fn()` logger spy; negative path for transport failure; coverage thresholds pass.

### `P08-06e` — Add OTP request and verify endpoints
- **Description**: Add `RequestOtpUseCase` and `VerifyOtpUseCase` with thin DTOs/controller exposing `POST /mfa/otp/request` and `POST /mfa/otp/verify`; request returns a generic 202 regardless of account existence, and verify consumes the code through `OtpPort` to issue auth tokens or satisfy an MFA challenge. Apply the dual rate limits added in `P08-09` by decorator so this step does not reimplement throttling. Atomic checks: (a) request leaks no account existence, (b) verify is single-use, (c) expired/replay/wrong codes rejected. Depends on `P08-06b`/`P08-06c`/`P08-06d`.
- **CLI(s)**: `npm run test:unit`; `npm run test:e2e -- otp`.
- **Package(s)**: `None`.
- **File(s)/Folder(s)**:
  - **Added**: `src/modules/security/application/use-cases/request-otp.use-case.ts`, `src/modules/security/application/use-cases/request-otp.use-case.spec.ts`, `src/modules/security/application/use-cases/verify-otp.use-case.ts`, `src/modules/security/application/use-cases/verify-otp.use-case.spec.ts`, `src/modules/security/interfaces/controllers/otp.controller.ts`, `src/modules/security/interfaces/dto/request-otp.dto.ts`, `src/modules/security/interfaces/dto/verify-otp.dto.ts`, `test/otp.e2e-spec.ts`
  - **Modified**: `src/modules/security/security.module.ts`
  - **Deleted**: `None`
- **Branch**: `feat/sec-otp` (shared with `P08-06a`, `P08-06b`, `P08-06c`, `P08-06d`)
- **Commit**: `feat(sec): add otp request and verify endpoints`
- **Testing**: Unit specs with `vi.fn()` OTP/notifier ports; E2E asserts 202 with no enumeration, valid code issues tokens, and expired/replay/wrong codes return 400; coverage thresholds pass.

### `P08-07a` — Define the magic-link token port and memory adapter
- **Description**: Create `MagicLinkTokenPort` + `MAGIC_LINK_TOKEN` token in `src/modules/security/domain/ports/magic-link-token.port.ts` with `issue`, `find` and `consume`, plus a `MagicLinkToken` value object carrying TTL, single-use and purpose. Implement a production-shaped in-memory adapter and `test/conformance/magic-link-token.conformance.ts` run against it. Tokens are opaque random values; never commit real tokens or email addresses. Atomic checks: (a) port + token exist, (b) memory adapter conforms, (c) opaque tokens only. First in this umbrella; blocks `P08-07b` and `P08-07c`.
- **CLI(s)**: `npm run test:unit -- magic-link`.
- **Package(s)**: `None` — uses Node `crypto` random bytes for opaque tokens.
- **File(s)/Folder(s)**:
  - **Added**: `src/modules/security/domain/ports/magic-link-token.port.ts`, `src/modules/security/domain/value-objects/magic-link-token.vo.ts`, `test/conformance/magic-link-token.conformance.ts`, `src/modules/security/adapters/magic-link-token.memory.adapter.ts`, `src/modules/security/adapters/magic-link-token.memory.adapter.spec.ts`
  - **Modified**: `src/modules/security/security.module.ts`
  - **Deleted**: `None`
- **Branch**: `feat/sec-magic-link` (shared with `P08-07b`, `P08-07c`, `P08-07d`)
- **Commit**: `feat(sec): define magic-link token port and memory adapter`
- **Testing**: Conformance suite asserts TTL expiry, single-use consumption via fake timers and replay rejection; negative path for malformed token; fixtures use faker dummy addresses; coverage thresholds pass.

### `P08-07b` — Add the Redis/Keyv magic-link adapter
- **Description**: Implement `src/modules/security/adapters/magic-link-token.redis.adapter.ts` on the Keyv cache port with native TTL and atomic consume, passing the identical `magic-link-token.conformance.ts` suite. Atomic checks: (a) Redis adapter conforms unchanged, (b) TTL applied, (c) atomic consume. Depends on `P08-07a`; blocks `P08-07d`.
- **CLI(s)**: `npm run test:unit -- magic-link`.
- **Package(s)**: `None` — reuses `@keyv/redis` from `P03-04`.
- **File(s)/Folder(s)**:
  - **Added**: `src/modules/security/adapters/magic-link-token.redis.adapter.ts`, `src/modules/security/adapters/magic-link-token.redis.adapter.spec.ts`
  - **Modified**: `None`
  - **Deleted**: `None`
- **Branch**: `feat/sec-magic-link` (shared with `P08-07a`, `P08-07c`, `P08-07d`)
- **Commit**: `feat(sec): add Redis-backed magic-link token adapter`
- **Testing**: Same conformance suite passes; assert TTL and atomic consume via `vi.fn()` cache spy; negative path for backend error; coverage thresholds pass.

### `P08-07c` — Add the magic-link request flow
- **Description**: Add `RequestMagicLinkUseCase` and `POST /auth/magic-link/request`, which issues an opaque token through `MAGIC_LINK_TOKEN` and delivers a URL via the `OTP_NOTIFIER` port from `P08-06d` using the mail adapter. The endpoint returns a generic 202 whether or not the account exists, and the logged/mailed payload contains no PII beyond the destination required for delivery. Atomic checks: (a) request leaks no account existence, (b) link carries opaque token only, (c) delivery via notifier port. Depends on `P08-07a` and `P08-06d`; blocks `P08-07d`.
- **CLI(s)**: `npm run test:unit`; `npm run test:e2e -- magic-link`.
- **Package(s)**: `None`.
- **File(s)/Folder(s)**:
  - **Added**: `src/modules/security/application/use-cases/request-magic-link.use-case.ts`, `src/modules/security/application/use-cases/request-magic-link.use-case.spec.ts`, `src/modules/security/interfaces/controllers/magic-link.controller.ts`, `src/modules/security/interfaces/dto/request-magic-link.dto.ts`, `test/magic-link.e2e-spec.ts`
  - **Modified**: `src/modules/security/security.module.ts`
  - **Deleted**: `None`
- **Branch**: `feat/sec-magic-link` (shared with `P08-07a`, `P08-07b`, `P08-07d`)
- **Commit**: `feat(sec): add magic-link request endpoint`
- **Testing**: Unit spec with `vi.fn()` token and notifier ports; E2E asserts generic 202 for known/unknown email, link contains only the opaque token, and notifier receives exactly one message; log-spy proves no token logged; coverage thresholds pass.

### `P08-07d` — Add the magic-link verify flow
- **Description**: Add `VerifyMagicLinkUseCase` and `GET /auth/magic-link/verify?token=...` that consumes the token atomically through `MAGIC_LINK_TOKEN` and issues normal auth tokens via `TOKEN_ISSUER`, with no password prompt. Reject expired, already-used and malformed tokens uniformly without revealing which condition failed. Atomic checks: (a) valid link issues tokens, (b) single-use and TTL enforced, (c) uniform failure response. Depends on `P08-07b` and `P08-07c`.
- **CLI(s)**: `npm run test:unit`; `npm run test:e2e -- magic-link`.
- **Package(s)**: `None`.
- **File(s)/Folder(s)**:
  - **Added**: `src/modules/security/application/use-cases/verify-magic-link.use-case.ts`, `src/modules/security/application/use-cases/verify-magic-link.use-case.spec.ts`
  - **Modified**: `src/modules/security/interfaces/controllers/magic-link.controller.ts`, `test/magic-link.e2e-spec.ts`
  - **Deleted**: `None`
- **Branch**: `feat/sec-magic-link` (shared with `P08-07a`, `P08-07b`, `P08-07c`)
- **Commit**: `feat(sec): add magic-link verify and token consumption`
- **Testing**: Unit spec with `vi.fn()` token port and fake timers; E2E asserts successful verification issues tokens, replay and expired links return the same 400, and the token is consumed in storage; coverage thresholds pass.

## Phase Gate (end of step)

- [ ] Full unit tests + coverage thresholds pass.
- [ ] E2E passes for TOTP enrollment/toggle/challenge, recovery-code single-use, OTP request/verify and magic-link request/verify, including negative and replay paths.
- [ ] Conformance specs pass for the TOTP, TotpSecretStore, RecoveryCode, OTP, OtpNotifier and MagicLinkToken ports across all adapters, including in-memory fallbacks; TOTP secrets encrypted at rest; no real secrets, codes, tokens or PII committed.
- [ ] Security audit & version sync pass; lint/format/typecheck clean.
- [ ] Each atomic commit pushed on its shared branch; PR merged into `dev` in this exact order:
  `P08-04a` → `P08-04b` → `P08-04c` → `P08-04d` → `P08-04e` → `P08-05a` → `P08-05b` → `P08-05c` → `P08-05d` → `P08-06a` → `P08-06b` → `P08-06c` → `P08-06d` → `P08-06e` → `P08-07a` → `P08-07b` → `P08-07c` → `P08-07d`.
- [ ] Status for umbrella IDs `P08-04`, `P08-05`, `P08-06`, `P08-07` set to `✅ Done` in [`roadmap.md`](../../../roadmap.md) §4 (atomic IDs tracked here).
- [ ] Re-check the P08 exit criterion in [`roadmap.md`](../../../roadmap.md) §6.1 before starting the next step.
