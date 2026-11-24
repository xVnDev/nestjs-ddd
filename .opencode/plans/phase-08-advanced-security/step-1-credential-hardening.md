# P08 · Step 1 — Credential Hardening

**Project:** nestjs-ddd  |  **Phase:** P08 — Advanced Security  |  **Base branch:** `dev`  |  **Status:** ⬜ Planned

> Source of truth: [`roadmap.md`](../../../roadmap.md) §4. Umbrella IDs `P08-01`, `P08-02`, `P08-03` stay in the roadmap; this file lists the final atomic split (`P08-01a` … `P08-03e`).
> **Format**: `P<phase>-<umbrella><letter>` — one atomic task = one commit; sibling atomic tasks share one branch (branch per umbrella task). Every atomic task uses the 7-field format: `Description`, `CLI(s)`, `Package(s)`, `File(s)/Folder(s)`, `Branch`, `Commit`, `Testing`.
> **Ordering notes**: (a) Within `P08-01`, the config slice and dummy-hash constant (`P08-01a`) precede the verifier service (`P08-01b`), which precedes wiring into local auth (`P08-01c`) and finally timing measurement (`P08-01d`). (b) `P08-02a` defines the port before any adapter exists; `P08-02b`/`P08-02c` ship the memory fallback and remote adapter behind it, `P08-02d` enforces it in every password flow, and `P08-02e` runs the shared conformance suite across both adapters. (c) `P08-03a`–`P08-03c` establish lockout policy, the store port and both adapters before `P08-03d` records failures at login and `P08-03e` adds identity-verified self-unlock; self-unlock reuses the single-use reset token from `P07-03`/`P07-04` so no Step 2 dependency is introduced.

## DDD + SOLID lens for this step

- Bounded contexts own `domain/`, `application/`, `infrastructure/`, `interfaces/`; dependencies point inward.
- Domain/application depend only on port tokens; adapters are injected, never imported directly.
- Every port ships one conformance spec run against all adapters, including in-memory fallbacks.
- Business rules live in entities/value objects/use cases; controllers stay thin.
- Introduce a port only when a mechanism must be swappable or isolated for tests.

## Step Summary

Close three credential gaps without changing use-case interfaces: equalize login timing for known and unknown accounts using a dummy Argon2id hash, reject breached/weak passwords everywhere through a swappable policy port with a remote and a memory adapter, and lock accounts after repeated failures with an identity-verified self-unlock path. Each new mechanism is bound to a DI token in the `security` bounded context and proven by a shared conformance suite (and a timing measurement for the first). No real secrets, breach data or PII appear in fixtures or logs.

## Atomic Tasks

### `P08-01a` — Add the dummy-hash config slice and constant
- **Description**: Extend `src/common/config/validation/env.validation.ts` with a `SECURITY_DUMMY_HASH` variable and add a small `registerAs('security', ...)` slice at `src/common/config/security.config.ts` exposing `dummyHash` and the timing-tolerance values. Commit a fixed, publicly documented dummy Argon2id hash string (a well-known test vector, never a real credential) as the default so unknown-user verification has a comparable-cost target. Append the provider to the `load` array in `src/common/config/config.module.ts`. Atomic checks: (a) typed config slice exists, (b) Joi requires/defaults the dummy hash, (c) committed value is a documentation test vector, not a real secret. Depends on the typed config from `P01-04`; blocks `P08-01b`.
- **CLI(s)**: `npm run test:unit`; `npm run typecheck`.
- **Package(s)**: `None` — reuses `@nestjs/config` and `joi` installed in `P01-04`.
- **File(s)/Folder(s)**:
  - **Added**: `src/common/config/security.config.ts`, `src/common/config/security.config.spec.ts`
  - **Modified**: `src/common/config/validation/env.validation.ts`, `src/common/config/config.module.ts`
  - **Deleted**: `None`
- **Branch**: `feat/sec-dummy-hash` (shared with `P08-01b`, `P08-01c`, `P08-01d`)
- **Commit**: `feat(sec): add dummy-hash config slice and test-vector constant`
- **Testing**: Unit spec asserts `securityConfig()` returns the typed `dummyHash` and that an invalid Joi value fails fast; explicitly assert the committed hash is the documented test vector and contains no real secret. Coverage thresholds pass; `npm run typecheck`.

### `P08-01b` — Create the CredentialVerifier domain service
- **Description**: Add `CredentialVerifier` in `src/modules/security/domain/credential-verifier.ts`, injecting the existing `PASSWORD_HASHER` port from the shared kernel. Its `verify(candidate, storedHash: string | null)` must call `hasher.verify` exactly once in both cases: against the real hash when present, against the configured `dummyHash` when the user is unknown, then return `false` for the unknown case. Keep the service framework-free; do not add a new port because it reuses a single swappable dependency (ISP/YAGNI). Atomic checks: (a) one `verify` call on both paths, (b) unknown user returns false with dummy hash work performed, (c) wrong password on a known user returns false. Depends on `P08-01a`; blocks `P08-01c`.
- **CLI(s)**: `npm run test:unit`.
- **Package(s)**: `None` — reuses the `PASSWORD_HASHER` port and Argon2id adapter from `P04-02`.
- **File(s)/Folder(s)**:
  - **Added**: `src/modules/security/domain/credential-verifier.ts`, `src/modules/security/domain/credential-verifier.spec.ts`
  - **Modified**: `None`
  - **Deleted**: `None`
- **Branch**: `feat/sec-dummy-hash` (shared with `P08-01a`, `P08-01c`, `P08-01d`)
- **Commit**: `feat(sec): add credential verifier with dummy-hash path`
- **Testing**: Unit spec with a `vi.fn()` password hasher asserting call count and arguments for known-user, unknown-user and wrong-password paths; negative path where hasher rejects is mapped to `false`. Coverage thresholds pass.

### `P08-01c` — Route all local password checks through the verifier
- **Description**: Replace direct `PASSWORD_HASHER.verify` calls in the local strategy (`src/modules/auth/interfaces/strategies/local.strategy.ts`) and the login/reset/change-password use cases (`src/modules/auth/use-cases/`) with `CredentialVerifier.verify`, passing `null` whenever the looked-up user is absent. Preserve existing behaviour for valid credentials and keep the failure message uniform so user enumeration is impossible. Do not change controller signatures. Atomic checks: (a) no direct hasher verification remains in auth flows, (b) unknown user still fails after doing dummy work, (c) valid login unchanged. Depends on `P08-01b`; blocks `P08-01d`.
- **CLI(s)**: `npm run test:unit`; `npm run test:e2e -- auth`.
- **Package(s)**: `None`.
- **File(s)/Folder(s)**:
  - **Added**: `None`
  - **Modified**: `src/modules/auth/interfaces/strategies/local.strategy.ts`, `src/modules/auth/use-cases/local-login.use-case.ts`, `src/modules/auth/use-cases/reset-password.use-case.ts`, `src/modules/auth/use-cases/change-password.use-case.ts`
  - **Deleted**: `None`
- **Branch**: `feat/sec-dummy-hash` (shared with `P08-01a`, `P08-01b`, `P08-01d`)
- **Commit**: `feat(auth): route password verification through timing defense`
- **Testing**: Update existing auth unit specs with `vi.fn()` on `CredentialVerifier`; E2E asserts unknown-email login returns the same 401 as wrong-password login and that no distinguishing field leaks. Coverage thresholds pass.

### `P08-01d` — Add timing measurement and negative-path regression spec
- **Description**: Add a measurement spec that samples N verifications for a known user and an unknown user through the real Argon2id adapter, computes the median of each distribution and asserts the absolute difference stays within the configured tolerance from `P08-01a`. Use `process.hrtime.bigint()` for measurement, faker for candidate passwords and no real credentials. Document that the assertion is a bounded-ratio check, not an equality check, to avoid flakiness. Atomic checks: (a) both paths measured, (b) median difference within tolerance, (c) no real secrets in the spec. Depends on `P08-01c`.
- **CLI(s)**: `npm run test:unit -- timing-defense`; `npm run test:cov`.
- **Package(s)**: `None`.
- **File(s)/Folder(s)**:
  - **Added**: `src/modules/security/domain/credential-verifier.timing.spec.ts`
  - **Modified**: `None`
  - **Deleted**: `None`
- **Branch**: `feat/sec-dummy-hash` (shared with `P08-01a`, `P08-01b`, `P08-01c`)
- **Commit**: `test(sec): measure known/unknown login timing parity`
- **Testing**: Timing spec asserts bounded median delta over repeated samples; negative path asserts wrong passwords and unknown users both resolve to `false` without early return; coverage thresholds unchanged.

### `P08-02a` — Define the password-policy port and result types
- **Description**: Create the narrow `PasswordPolicyPort` interface and its `PASSWORD_POLICY` DI token in `src/modules/security/domain/ports/password-policy.port.ts` with a single method `check(password: string): Promise<PasswordPolicyResult>`. Define `PasswordPolicyResult` as a discriminated domain value object carrying the reasons (`too-short`, `breached`, `common`) so callers can map to a stable error. Add a conformance harness entry in `test/conformance/password-policy.conformance.ts` that every adapter must satisfy. Atomic checks: (a) port + token exported, (b) result type is discriminated, (c) conformance harness exists. First in this umbrella; blocks `P08-02b` and `P08-02c`.
- **CLI(s)**: `npm run test:unit`; `npm run typecheck`.
- **Package(s)**: `None`.
- **File(s)/Folder(s)**:
  - **Added**: `src/modules/security/domain/ports/password-policy.port.ts`, `test/conformance/password-policy.conformance.ts`
  - **Modified**: `None`
  - **Deleted**: `None`
- **Branch**: `feat/sec-password-policy` (shared with `P08-02b`, `P08-02c`, `P08-02d`, `P08-02e`)
- **Commit**: `feat(sec): define password policy port and result types`
- **Testing**: Compile-time conformance check that a stub adapter satisfies the port; type spec for the result union; coverage thresholds pass.

### `P08-02b` — Add the in-memory password-policy adapter
- **Description**: Implement `src/modules/security/adapters/password-policy.memory.adapter.ts` as a production-shaped fallback that checks length and a small embedded list of common/breached sample passwords supplied by a faker-backed fixture factory (no real breach corpus, no real secrets). It must return the same `PasswordPolicyResult` shape as the remote adapter and pass the shared conformance suite unchanged. Register it as the default binding for `PASSWORD_POLICY` in the security module. Atomic checks: (a) memory adapter conforms, (b) weak/breached samples rejected, (c) no real breach data committed. Depends on `P08-02a`; blocks `P08-02e`.
- **CLI(s)**: `npm run test:unit -- password-policy`.
- **Package(s)**: `None`.
- **File(s)/Folder(s)**:
  - **Added**: `src/modules/security/adapters/password-policy.memory.adapter.ts`, `src/modules/security/adapters/password-policy.memory.adapter.spec.ts`, `src/common/fixtures/breached-password.fixtures.ts`
  - **Modified**: `src/modules/security/security.module.ts`
  - **Deleted**: `None`
- **Branch**: `feat/sec-password-policy` (shared with `P08-02a`, `P08-02c`, `P08-02d`, `P08-02e`)
- **Commit**: `feat(sec): add in-memory password policy adapter`
- **Testing**: Adapter spec runs `password-policy.conformance.ts` unchanged; negative paths for short, common and breached samples; fixtures generated via seeded faker with no real credentials; coverage thresholds pass.

### `P08-02c` — Add the breach-list (HIBP-style) adapter
- **Description**: Implement `src/modules/security/adapters/password-policy.breach.adapter.ts` using the first-party `HttpService` from `P03-10` against a k-anonymity breach-range API (only a hash prefix leaves the service; the full password is never transmitted). Read the API base URL and a token from the typed security config added in `P08-01a`, with `nock`/`vi.fn()`-mocked HTTP in tests and no real key in fixtures. On network failure, fail closed with a distinct `unavailable` outcome while still enforcing local rules. Atomic checks: (a) only a hash prefix is sent, (b) same conformance suite passes, (c) failure closes safely. Depends on `P08-02a`; blocks `P08-02e`.
- **CLI(s)**: `npm install nock --save-dev`; `npm run test:unit -- password-policy`.
- **Package(s)**: `nock` installed as a devDependency for HTTP mocking; reuses `@nestjs/common` `HttpService` from `P03-10`.
- **File(s)/Folder(s)**:
  - **Added**: `src/modules/security/adapters/password-policy.breach.adapter.ts`, `src/modules/security/adapters/password-policy.breach.adapter.spec.ts`
  - **Modified**: `src/common/config/security.config.ts`, `src/common/config/validation/env.validation.ts`, `package.json`, `package-lock.json`
  - **Deleted**: `None`
- **Branch**: `feat/sec-password-policy` (shared with `P08-02a`, `P08-02b`, `P08-02d`, `P08-02e`)
- **Commit**: `feat(sec): add k-anonymity breach-list policy adapter`
- **Testing**: Spec runs the shared conformance suite; assert the outbound URL contains only the first 5 hash characters via `vi.fn()`/`nock`; negative path asserts fail-closed on 5xx and timeout; coverage thresholds pass.

### `P08-02d` — Enforce the policy in every password-setting flow
- **Description**: Add `PasswordPolicyEnforcer` in `src/modules/security/application/use-cases/` that depends only on the `PASSWORD_POLICY` token and throws a domain error with the mapped reasons. Call it from registration (`P07-01`), password reset (`P07-04`), change password (`P07-05`) and admin user creation (`P04-05`) before any hash is stored, keeping controllers thin. Rebind `PASSWORD_POLICY` to the breach adapter in production and leave the memory adapter in development. Atomic checks: (a) all four flows enforce, (b) no hash written for rejected passwords, (c) token rebind requires no use-case edits. Depends on `P08-02b`/`P08-02c`; blocks `P08-02e`.
- **CLI(s)**: `npm run test:unit`; `npm run test:e2e -- password-policy`.
- **Package(s)**: `None`.
- **File(s)/Folder(s)**:
  - **Added**: `src/modules/security/application/use-cases/password-policy.enforcer.ts`, `src/modules/security/application/use-cases/password-policy.enforcer.spec.ts`
  - **Modified**: `src/modules/auth/use-cases/register.use-case.ts`, `src/modules/auth/use-cases/reset-password.use-case.ts`, `src/modules/auth/use-cases/change-password.use-case.ts`, `src/modules/user/application/use-cases/admin-create-user.use-case.ts`, `src/modules/security/security.module.ts`, `test/auth.e2e-spec.ts`
  - **Deleted**: `None`
- **Branch**: `feat/sec-password-policy` (shared with `P08-02a`, `P08-02b`, `P08-02c`, `P08-02e`)
- **Commit**: `feat(sec): enforce password policy across all password flows`
- **Testing**: Unit spec with `vi.fn()` policy port asserting all rejection reasons propagate; E2E across registration/reset/change/admin-create asserting weak and breached samples are rejected and no hash is persisted; coverage thresholds pass.

### `P08-02e` — Run conformance across all policy adapters
- **Description**: Wire `password-policy.conformance.ts` into both adapter specs so the identical suite executes against the memory fallback and the breach adapter, with coverage recorded for each. Add a negative case asserting a simulated breach response and a local violation produce equal-domain outcomes, and assert no password value appears in logs or errors. Atomic checks: (a) both adapters run the same suite, (b) no plaintext password in logs, (c) coverage thresholds met. Depends on `P08-02b` and `P08-02c`.
- **CLI(s)**: `npm run test:unit -- password-policy`; `npm run test:cov`.
- **Package(s)**: `None`.
- **File(s)/Folder(s)**:
  - **Added**: `None`
  - **Modified**: `src/modules/security/adapters/password-policy.memory.adapter.spec.ts`, `src/modules/security/adapters/password-policy.breach.adapter.spec.ts`
  - **Deleted**: `None`
- **Branch**: `feat/sec-password-policy` (shared with `P08-02a`, `P08-02b`, `P08-02c`, `P08-02d`)
- **Commit**: `test(sec): run password policy conformance across all adapters`
- **Testing**: Identical conformance suite passes for both adapters; negative paths for unavailable remote and local violation; log-spy via `vi.fn()` proves no password leakage; coverage thresholds pass.

### `P08-03a` — Add lockout policy config and domain value object
- **Description**: Extend `src/common/config/security.config.ts` with typed `lockout` settings (`maxFailedAttempts`, `windowSeconds`, `lockSeconds`) validated by Joi in `src/common/config/validation/env.validation.ts`. Add `LockoutPolicy` value object in `src/modules/security/domain/` that computes whether a counter and timestamp cross the lock threshold, with no framework imports. Atomic checks: (a) typed lockout config, (b) pure value object computes lock state, (c) boundary values tested. First in this umbrella; blocks `P08-03b`.
- **CLI(s)**: `npm run test:unit`; `npm run typecheck`.
- **Package(s)**: `None` — reuses `@nestjs/config` and `joi` from `P01-04`.
- **File(s)/Folder(s)**:
  - **Added**: `src/modules/security/domain/lockout-policy.ts`, `src/modules/security/domain/lockout-policy.spec.ts`
  - **Modified**: `src/common/config/security.config.ts`, `src/common/config/validation/env.validation.ts`
  - **Deleted**: `None`
- **Branch**: `feat/auth-lockout-self-unlock` (shared with `P08-03b`, `P08-03c`, `P08-03d`, `P08-03e`)
- **Commit**: `feat(sec): add lockout policy config and value object`
- **Testing**: Unit spec covers exact threshold, below threshold and window expiry; Joi rejects non-positive values; coverage thresholds pass.

### `P08-03b` — Define the lockout-store port and memory adapter
- **Description**: Create `LockoutStorePort` and `LOCKOUT_STORE` token in `src/modules/security/domain/ports/lockout-store.port.ts` with `recordFailure`, `isLocked` and `reset` methods keyed by a hashed user identifier (never raw email). Implement the in-memory production-shaped fallback at `src/modules/security/adapters/lockout-store.memory.adapter.ts` and add `test/conformance/lockout-store.conformance.ts` run against it. Atomic checks: (a) narrow port exists, (b) memory adapter conforms, (c) keys are hashed identifiers. Depends on `P08-03a`; blocks `P08-03d` and `P08-03e`.
- **CLI(s)**: `npm run test:unit -- lockout`.
- **Package(s)**: `None`.
- **File(s)/Folder(s)**:
  - **Added**: `src/modules/security/domain/ports/lockout-store.port.ts`, `test/conformance/lockout-store.conformance.ts`, `src/modules/security/adapters/lockout-store.memory.adapter.ts`, `src/modules/security/adapters/lockout-store.memory.adapter.spec.ts`
  - **Modified**: `src/modules/security/security.module.ts`
  - **Deleted**: `None`
- **Branch**: `feat/auth-lockout-self-unlock` (shared with `P08-03a`, `P08-03c`, `P08-03d`, `P08-03e`)
- **Commit**: `feat(sec): add lockout store port and memory adapter`
- **Testing**: Conformance suite asserts failure counting, lock state after threshold, reset clearing state and TTL expiry; negative path for unknown key; coverage thresholds pass.

### `P08-03c` — Add the Redis/Keyv lockout adapter
- **Description**: Implement `src/modules/security/adapters/lockout-store.redis.adapter.ts` on top of the Keyv cache port from `P03-04`, with TTLs derived from `P08-03a` config so entries self-expire. It must pass the identical `lockout-store.conformance.ts` suite as the memory fallback, proving LSP substitutability. Atomic checks: (a) Redis adapter conforms unchanged, (b) TTL applied, (c) hashed keys only. Depends on `P08-03b`; blocks `P08-03d`.
- **CLI(s)**: `npm run test:unit -- lockout`.
- **Package(s)**: `None` — reuses `@keyv/redis` and the cache port installed in `P03-04`.
- **File(s)/Folder(s)**:
  - **Added**: `src/modules/security/adapters/lockout-store.redis.adapter.ts`, `src/modules/security/adapters/lockout-store.redis.adapter.spec.ts`
  - **Modified**: `None`
  - **Deleted**: `None`
- **Branch**: `feat/auth-lockout-self-unlock` (shared with `P08-03a`, `P08-03b`, `P08-03d`, `P08-03e`)
- **Commit**: `feat(sec): add Redis-backed lockout store adapter`
- **Testing**: Same conformance suite passes; assert TTL expiry via a fake clock (`vi.fn()`/fake timers); negative path for backend error; coverage thresholds pass.

### `P08-03d` — Record failures and enforce locks at login
- **Description**: Add `LockoutGuardService` in `src/modules/security/application/use-cases/` that calls `LOCKOUT_STORE.recordFailure` on failed local authentication and `reset` on success, and blocks attempts while `isLocked` is true using `LockoutPolicy`. Wire it into the local strategy and login use case from `P05-01`/`P07-02` without changing their interfaces, and emit a uniform `account temporarily locked` response that reveals no account existence. Atomic checks: (a) lock triggers after N failures, (b) success resets counter, (c) locked response is uniform. Depends on `P08-03b`/`P08-03c`; blocks `P08-03e`.
- **CLI(s)**: `npm run test:unit`; `npm run test:e2e -- auth lockout`.
- **Package(s)**: `None`.
- **File(s)/Folder(s)**:
  - **Added**: `src/modules/security/application/use-cases/lockout-guard.service.ts`, `src/modules/security/application/use-cases/lockout-guard.service.spec.ts`
  - **Modified**: `src/modules/auth/interfaces/strategies/local.strategy.ts`, `src/modules/auth/use-cases/local-login.use-case.ts`, `test/auth.e2e-spec.ts`
  - **Deleted**: `None`
- **Branch**: `feat/auth-lockout-self-unlock` (shared with `P08-03a`, `P08-03b`, `P08-03c`, `P08-03e`)
- **Commit**: `feat(auth): lock accounts after repeated failed logins`
- **Testing**: Unit spec with `vi.fn()` lockout store and fake timers for window expiry; E2E asserts lock after threshold, reset on success and no account-enumeration signal; coverage thresholds pass.

### `P08-03e` — Add identity-verified self-unlock
- **Description**: Add `SelfUnlockUseCase` and `POST /auth/unlock` endpoint that accepts the single-use reset token issued by `P07-03`/`P07-04` as identity proof, calls `LOCKOUT_STORE.reset` and invalidates the token atomically. Keep the controller thin and reuse the existing token-validation port; later OTP/magic-link channels can be rebound in via OCP without editing the use case. Atomic checks: (a) valid token unlocks and is consumed, (b) replay rejected, (c) no unlock without verified identity. Depends on `P08-03d` and the reset-token flow from `P07-04`.
- **CLI(s)**: `npm run test:unit`; `npm run test:e2e -- unlock`.
- **Package(s)**: `None`.
- **File(s)/Folder(s)**:
  - **Added**: `src/modules/auth/use-cases/self-unlock.use-case.ts`, `src/modules/auth/use-cases/self-unlock.use-case.spec.ts`, `src/modules/auth/interfaces/controllers/unlock.controller.ts`, `src/modules/auth/interfaces/dto/unlock.dto.ts`, `test/self-unlock.e2e-spec.ts`
  - **Modified**: `src/modules/auth/auth.module.ts`
  - **Deleted**: `None`
- **Branch**: `feat/auth-lockout-self-unlock` (shared with `P08-03a`, `P08-03b`, `P08-03c`, `P08-03d`)
- **Commit**: `feat(auth): add identity-verified self-unlock endpoint`
- **Testing**: Unit spec with `vi.fn()` token validator and lockout store; E2E asserts unlock succeeds once, replay returns 400, and direct unlock without a token returns 401; coverage thresholds pass.

## Phase Gate (end of step)

- [ ] Full unit tests + coverage thresholds pass.
- [ ] E2E passes for timing-parity login, policy rejection in all four password flows, account lockout and self-unlock replay protection.
- [ ] Conformance specs pass for the password-policy and lockout-store ports across all adapters, including in-memory fallbacks; no real secrets, breach data or PII committed.
- [ ] Security audit & version sync pass; lint/format/typecheck clean.
- [ ] Each atomic commit pushed on its shared branch; PR merged into `dev` in this exact order:
  `P08-01a` → `P08-01b` → `P08-01c` → `P08-01d` → `P08-02a` → `P08-02b` → `P08-02c` → `P08-02d` → `P08-02e` → `P08-03a` → `P08-03b` → `P08-03c` → `P08-03d` → `P08-03e`.
- [ ] Status for umbrella IDs `P08-01`, `P08-02`, `P08-03` set to `✅ Done` in [`roadmap.md`](../../../roadmap.md) §4 (atomic IDs tracked here).
- [ ] Re-check the P08 exit criterion in [`roadmap.md`](../../../roadmap.md) §6.1 before starting the next step.
