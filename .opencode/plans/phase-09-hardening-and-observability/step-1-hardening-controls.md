# P09 · Step 1 — Hardening Controls

**Project:** nestjs-ddd  |  **Phase:** P09 — Hardening & Observability  |  **Base branch:** `dev`  |  **Status:** ⬜ Planned

> Source of truth: [`roadmap.md`](../../../roadmap.md) §4. Umbrella IDs `P09-01`, `P09-02`, `P09-03`, `P09-04`, `P09-05` stay in the roadmap; this file lists the final atomic split (`P09-01a` … `P09-05d`).
> **Format**: `P<phase>-<umbrella><letter>` — one atomic task = one commit; sibling atomic tasks share one branch (branch per umbrella task). Every atomic task uses the 7-field format: `Description`, `CLI(s)`, `Package(s)`, `File(s)/Folder(s)`, `Branch`, `Commit`, `Testing`.
> **Ordering notes**: (a) `P09-01` *extends* the basic `@nestjs/throttler` setup from `P03-11`; the sliding-window adapter is added beside it, never replaces it. (b) `P09-02a` is a pure, I/O-free state machine; `P09-02b` injects it into the outbound HTTP client from `P03-10`; `P09-02c` adds the recovery E2E paths. (c) `P09-03a` defines the versioned keyring and `ENCRYPTION_SERVICE` token *before* `P09-03b` implements rotation; `P09-04` consumes that port and must land after `P09-03`. (d) `P09-05` refines the lockout policy first introduced in `P08-03` (temporary vs permanent levels) without changing the existing verified self-unlock flow.
> **Correctness invariants**: old AES-256-GCM ciphertext must remain decryptable after key rotation (`P09-03c`); field-level encryption must keep equality queries working via a keyed blind index (`P09-04a`/`P09-04c`); the circuit breaker must be proven across closed→open→half-open→closed (`P09-02a`/`P09-02c`).

## DDD + SOLID lens for this step

- Bounded contexts own `domain/`, `application/`, `infrastructure/`, `interfaces/`; dependencies point inward.
- Domain/application depend only on port tokens; adapters are injected, never imported directly.
- Every port ships one conformance spec run against all adapters, including in-memory fallbacks.
- Business rules live in entities/value objects/use cases; controllers stay thin.
- Introduce a port only when a mechanism must be swappable or isolated for tests.

## Step Summary

Add a sliding-window rate limiter with a swappable storage adapter, a third-party circuit breaker backed by a tested state machine, AES-256-GCM key rotation that preserves old ciphertext, field-level encryption at rest that keeps queries working, and distinct temporary/permanent account lockout levels — each split into small, independently committable atomics.

## Atomic Tasks

### `P09-01a` — Implement the pure sliding-window counting algorithm
- **Description**: Create a framework-free `SlidingWindowCounter` in the shared kernel that records timestamps for a given key and counts events within a rolling `windowMs`, evicting entries older than the window on every read. Expose `record(key, now)`, `count(key, now)` and `reset(key)` with an injectable `Clock` (`P02-02` token) so tests control time deterministically instead of using real timers. This is a pure domain service: no Nest, no Redis, no HTTP. Atomic checks: (a) class lives under `domain/` with no framework imports, (b) count excludes timestamps exactly at the window boundary, (c) all mocks use `vi.fn()` including the clock.
- **CLI(s)**: `npm run test:unit -- sliding-window`; `npm run typecheck`.
- **Package(s)**: `None` — reuses the `CLOCK` port token and faker factories from `P02-02`/`P01-03`.
- **File(s)/Folder(s)**:
  - **Added**: `src/modules/shared/domain/sliding-window-counter.ts`, `src/modules/shared/domain/sliding-window-counter.spec.ts`
  - **Modified**: `None`
  - **Deleted**: `None`
- **Branch**: `feat/sec-sliding-window` (shared with `P09-01b`, `P09-01c`, `P09-01d`)
- **Commit**: `feat(sec): add pure sliding-window counting algorithm`
- **Testing**: `sliding-window-counter.spec.ts` asserts a burst at t=0 is fully counted, that entries at exactly `now - windowMs` are excluded, that `reset()` clears only the given key, and that a `vi.fn()` clock drives every timestamp; coverage thresholds pass.

### `P09-01b` — Define the rate-limit storage port with memory and Redis adapters
- **Description**: Define a narrow `RateLimitStore` port (`increment(key, windowMs, now): Promise<number>`, `reset(key)`) bound to a DI token in `src/modules/shared/`, then add an in-memory adapter backed by `P09-01a` and a Redis adapter using the Keyv Redis connection from `P03-04`. Write ONE conformance spec file that is executed unchanged against both adapters (parameterised suite), proving substitutability, and include the memory fallback as a production-shaped adapter. Atomic checks: (a) port is an interface plus token only, (b) one conformance spec runs against both adapters, (c) Redis adapter uses a distinct namespace via `vi.fn()`-mocked Keyv in unit tests.
- **CLI(s)**: `npm run test:unit -- rate-limit-store`; `npm run typecheck`.
- **Package(s)**: `None` — reuses `@keyv/redis`/`keyv` from `P03-04`; no new runtime dependency.
- **File(s)/Folder(s)**:
  - **Added**: `src/modules/shared/ports/rate-limit-store.port.ts`, `src/modules/shared/adapters/rate-limit-memory.adapter.ts`, `src/modules/shared/adapters/rate-limit-redis.adapter.ts`, `src/modules/shared/adapters/rate-limit-store.conformance-spec.ts`
  - **Modified**: `src/modules/shared/shared.module.ts`
  - **Deleted**: `None`
- **Branch**: `feat/sec-sliding-window` (shared)
- **Commit**: `feat(sec): add rate-limit store port with memory and redis adapters`
- **Testing**: Conformance spec asserts identical `increment`/`reset` behaviour for both adapters, TTL expiry and namespace isolation; unit spec uses `vi.fn()` on Keyv methods; coverage thresholds pass.

### `P09-01c` — Wire the sliding-window guard with typed configuration
- **Description**: Add a typed `rateLimit` config slice (window size, max requests, key prefix, enabled flag) exported as `as Provider()` and validated by Joi, then register a global guard that derives the key from the IP (and optionally the authenticated account, reusing `P08-09` dual-limit keys) and rejects over-limit requests with HTTP 429 plus a `Retry-After` header. Register the guard in `src/app.module.ts` using the `RATE_LIMIT_STORE` token so switching memory↔Redis is a token rebind only. Atomic checks: (a) config is a typed `as Provider()` slice, (b) guard uses the port token and never imports an adapter, (c) 429 includes a numeric `Retry-After` derived from the window.
- **CLI(s)**: `npm run test:unit -- rate-limit-guard`; `npm run typecheck`; `npm run lint`.
- **Package(s)**: `None` — Joi and `@nestjs/config` already installed in `P01-04`.
- **File(s)/Folder(s)**:
  - **Added**: `src/common/middleware/rate-limit.guard.ts`, `src/common/middleware/rate-limit.guard.spec.ts`
  - **Modified**: `src/common/config/rate-limit.config.ts`
  - **Modified**: `src/app.module.ts`
  - **Deleted**: `None`
- **Branch**: `feat/sec-sliding-window` (shared)
- **Commit**: `feat(sec): wire sliding-window rate-limit guard with typed config`
- **Testing**: Guard unit spec mocks the store with `vi.fn()` and asserts allow/deny thresholds and `Retry-After`; config spec asserts Joi rejects a zero/negative window; coverage thresholds pass.

### `P09-01d` — Add sliding-window E2E and burst behaviour coverage
- **Description**: Add an E2E suite that drives a real Nest app with the in-memory adapter and seeded faker fixtures, asserting that `max` requests inside the window succeed, the next returns 429, and requests succeed again after a clock advance past the window. Verify the existing `@nestjs/throttler` from `P03-11` is still active on its own routes (no regression). Atomic checks: (a) burst then cool-down scenario present, (b) no real credentials/PII in fixtures, (c) both fallback and Redis-token paths exercised (Redis via conformance spec, not a live server).
- **CLI(s)**: `npm run test:e2e -- rate-limit`; `npm run test:cov`.
- **Package(s)**: `None`.
- **File(s)/Folder(s)**:
  - **Added**: `test/sliding-window-rate-limit.e2e-spec.ts`
  - **Modified**: `src/common/middleware/rate-limit.guard.spec.ts`
  - **Deleted**: `None`
- **Branch**: `feat/sec-sliding-window` (shared)
- **Commit**: `test(sec): cover sliding-window burst and cooldown behaviour`
- **Testing**: E2E asserts exact 429 status/header and post-window recovery; unit spec asserts guard/store interactions with `vi.fn()`; coverage thresholds pass.

### `P09-02a` — Implement the pure circuit-breaker state machine
- **Description**: Create a framework-free `CircuitBreaker` domain object with the states CLOSED, OPEN and HALF_OPEN and an injectable `Clock`. Define transitions: CLOSED counts consecutive failures until `failureThreshold` then trips OPEN for `resetTimeoutMs`; OPEN rejects calls until the timeout elapses then moves to HALF_OPEN; HALF_OPEN allows a configurable number of probe calls and returns to CLOSED on success or back to OPEN on failure. No I/O, no Nest, no timers — time is supplied via `vi.fn()` clock in tests. Atomic checks: (a) state enum and transition method live under `domain/`, (b) each transition is individually asserted, (c) success resets the failure counter.
- **CLI(s)**: `npm run test:unit -- circuit-breaker`; `npm run typecheck`.
- **Package(s)**: `None`.
- **File(s)/Folder(s)**:
  - **Added**: `src/modules/shared/domain/circuit-breaker.ts`, `src/modules/shared/domain/circuit-breaker.state-machine.spec.ts`
  - **Modified**: `None`
  - **Deleted**: `None`
- **Branch**: `feat/resilience-circuit-breaker` (shared with `P09-02b`, `P09-02c`)
- **Commit**: `feat(resilience): add pure circuit-breaker state machine`
- **Testing**: `circuit-breaker.state-machine.spec.ts` asserts CLOSED→OPEN at threshold, OPEN→HALF_OPEN after timeout, HALF_OPEN→OPEN on failed probe and HALF_OPEN→CLOSED on success, with all time advanced through a `vi.fn()` clock; coverage thresholds pass.

### `P09-02b` — Add the resilience port and wrap the outbound HTTP client
- **Description**: Define a narrow `ResilienceExecutor` port (`execute<T>(operation: () => Promise<T>, key: string): Promise<T>`) backed by `P09-02a`, and add an adapter that wraps the first-party HTTP client from `P03-10` for third-party calls. When the breaker is OPEN, short-circuit without performing the outbound call; on a configured fallback, return a cached/stale value from the cache port instead of throwing. Keep configuration (thresholds, timeout, fallback policy) in a typed `as Provider()` slice with Joi validation. Atomic checks: (a) use cases depend only on the port token, (b) OPEN state performs zero HTTP calls, (c) fallback is injected, not hard-coded.
- **CLI(s)**: `npm run test:unit -- resilience-executor`; `npm run typecheck`.
- **Package(s)**: `None` — wraps `@nestjs/axios`/`HttpService` from `P03-10`; no new dependency.
- **File(s)/Folder(s)**:
  - **Added**: `src/modules/shared/ports/resilience-executor.port.ts`, `src/modules/shared/adapters/resilience-executor.adapter.ts`, `src/modules/shared/adapters/resilience-executor.adapter.spec.ts`
  - **Modified**: `src/common/config/resilience.config.ts`, `src/modules/shared/shared.module.ts`
  - **Deleted**: `None`
- **Branch**: `feat/resilience-circuit-breaker` (shared)
- **Commit**: `feat(resilience): wrap outbound http client with circuit breaker port`
- **Testing**: Adapter unit spec uses `vi.fn()` HTTP and cache mocks to assert zero network calls while OPEN and a returned fallback value; config spec validates thresholds; coverage thresholds pass.

### `P09-02c` — Add circuit-breaker integration and recovery E2E coverage
- **Description**: Add an integration suite that simulates a failing third-party endpoint (via `vi.fn()`-mocked `HttpService`) and drives real state transitions through the adapter, then an E2E suite that hits an application route backed by the wrapped client and asserts degraded-but-available behaviour during OPEN and full recovery after HALF_OPEN succeeds. Record one structured audit/metric event per state change for later observability (`P09-06`/`P09-07`). Atomic checks: (a) all three states reached in one flow, (b) no PII in emitted events, (c) recovery returns real data.
- **CLI(s)**: `npm run test:e2e -- circuit-breaker`; `npm run test:cov`.
- **Package(s)**: `None`.
- **File(s)/Folder(s)**:
  - **Added**: `test/circuit-breaker.integration-spec.ts`, `test/circuit-breaker.e2e-spec.ts`
  - **Modified**: `src/modules/shared/adapters/resilience-executor.adapter.spec.ts`
  - **Deleted**: `None`
- **Branch**: `feat/resilience-circuit-breaker` (shared)
- **Commit**: `test(resilience): cover circuit-breaker degradation and recovery paths`
- **Testing**: Integration spec asserts the exact transition sequence with `vi.fn()` clocks/mocks; E2E asserts 200-with-fallback during OPEN and 200-with-live-data after close; state-change events contain no PII; coverage thresholds pass.

### `P09-03a` — Define the versioned keyring config and encryption port
- **Description**: Add a typed `encryption` config slice holding a map of key versions (`kid` → 32-byte base64 key) and an `activeKid`, validated by Joi so a missing/invalid active key fails fast at bootstrap (fail-closed). Declare the `ENCRYPTION_SERVICE` port token with `encrypt(plaintext): CipherEnvelope` and `decrypt(envelope): plaintext` where the envelope carries the `kid` used. Declare the `SECRETS_ROTATION` token consumed by `P08-11` so rotation is version-aware. Atomic checks: (a) Joi rejects an activeKid not present in the keyring, (b) port is a token + interface only, (c) no key material appears in logs or docs.
- **CLI(s)**: `npm run test:unit -- encryption-config`; `npm run typecheck`.
- **Package(s)**: `None` — extends typed config from `P01-04` and port tokens from `P02-02`.
- **File(s)/Folder(s)**:
  - **Added**: `src/common/config/encryption.config.ts`, `src/common/config/encryption.config.spec.ts`
  - **Modified**: `None`, `src/modules/shared/ports/encryption-service.port.ts`
  - **Deleted**: `None`
- **Branch**: `feat/crypto-aes-key-rotation` (shared with `P09-03b`, `P09-03c`)
- **Commit**: `feat(crypto): add versioned keyring config and encryption port`
- **Testing**: Config spec asserts valid keyrings load and an unknown `activeKid`/short key throws via Joi; unit spec asserts the port has no implementation; no key bytes in spec fixtures (use faker-generated placeholders); coverage thresholds pass.

### `P09-03b` — Implement AES-256-GCM rotation with kid-based decryption
- **Description**: Implement `AesGcmEncryptionService` using Node's `crypto` AES-256-GCM: `encrypt()` uses the active key and returns an envelope `{ kid, iv, authTag, ciphertext }`; `decrypt()` reads `kid` from the envelope and selects that version's key, so ciphertext written under a previous key remains decryptable after rotation. Use a fresh random 12-byte IV per encryption and authenticate the `kid` and `iv` as AAD. Expose `rotateActiveKid(nextKid)` that only changes which key encrypts new data — never mutates old envelopes. Atomic checks: (a) decrypt selects key by envelope `kid`, not the active key, (b) rotation does not invalidate prior ciphertext, (c) tampering with ciphertext/tag throws.
- **CLI(s)**: `npm run test:unit -- aes-gcm`; `npm run typecheck`.
- **Package(s)**: `None` — Node built-in `node:crypto`; no new dependency.
- **File(s)/Folder(s)**:
  - **Added**: `src/common/crypto/aes-gcm-encryption.service.ts`, `src/common/crypto/cipher-envelope.ts`
  - **Modified**: `src/modules/shared/crypto/crypto.module.ts`
  - **Deleted**: `None`
- **Branch**: `feat/crypto-aes-key-rotation` (shared)
- **Commit**: `feat(crypto): implement aes-256-gcm encryption with kid-based decryption`
- **Testing**: Unit spec asserts encrypt→decrypt round-trip, that an envelope from key `v1` still decrypts after `rotateActiveKid('v2')`, that a flipped ciphertext byte or tag fails, and that IVs are unique across calls; all fixtures use faker-generated plaintext; coverage thresholds pass.

### `P09-03c` — Add rotation and conformance specs for the encryption port
- **Description**: Add a rotation spec covering the full lifecycle: encrypt under v1, rotate to v2, assert v1 ciphertext still decrypts, re-encrypt a sample record into v2 and assert both now decrypt, then confirm new writes use v2. Add ONE conformance spec executed against the AES-GCM service and any in-memory/no-op adapter so the port stays substitutable. Verify no plaintext or key material leaks into thrown errors or logs. Atomic checks: (a) old-ciphertext-decryptable assertion present, (b) conformance spec runs against every registered adapter unchanged, (c) errors contain no keys/PII.
- **CLI(s)**: `npm run test:unit -- encryption-rotation`; `npm run test:cov`.
- **Package(s)**: `None`.
- **File(s)/Folder(s)**:
  - **Added**: `src/common/crypto/aes-gcm-encryption.rotation.spec.ts`, `src/common/crypto/encryption-service.conformance-spec.ts`
  - **Modified**: `src/common/crypto/aes-gcm-encryption.service.ts`
  - **Deleted**: `None`
- **Branch**: `feat/crypto-aes-key-rotation` (shared)
- **Commit**: `test(crypto): assert old ciphertext decrypts after key rotation`
- **Testing**: Rotation spec + conformance spec as described; `vi.fn()` mocks the keyring clock/version reads; coverage thresholds pass.

### `P09-04a` — Add a TypeORM value transformer and blind-index helper
- **Description**: Create a reusable TypeORM `ValueTransformer` that encrypts a column with `ENCRYPTION_SERVICE` on write and decrypts on read, storing the full `CipherEnvelope` (including `kid`) as JSON/text. Add a `blindIndex(plaintext)` helper producing a keyed HMAC (with a separate, dedicated key from the keyring) so equality lookups can query a deterministic digest without decrypting every row. The transformer depends only on the encryption port token. Atomic checks: (a) transformer always emits an envelope with `kid`, (b) `blindIndex` is deterministic for equal plaintext and keyed (not a bare hash), (c) no business logic in the transformer.
- **CLI(s)**: `npm run test:unit -- field-encryption-transformer`; `npm run typecheck`.
- **Package(s)**: `None` — reuses TypeORM from `P03-01` and `ENCRYPTION_SERVICE` from `P09-03`.
- **File(s)/Folder(s)**:
  - **Added**: `src/common/crypto/encrypted-column.transformer.ts`, `src/common/crypto/encrypted-column.transformer.spec.ts`, `src/common/crypto/blind-index.ts`, `src/common/crypto/blind-index.spec.ts`
  - **Modified**: `None`
  - **Deleted**: `None`
- **Branch**: `feat/db-field-encryption` (shared with `P09-04b`, `P09-04c`)
- **Commit**: `feat(db): add encrypted-column transformer and blind-index helper`
- **Testing**: Transformer spec asserts a faker plaintext round-trips and that the stored value is an envelope with `kid`/`iv`/`authTag`; blind-index spec asserts determinism, key-dependence and different digests for different plaintext; mocks use `vi.fn()`; coverage thresholds pass.

### `P09-04b` — Apply field encryption to sensitive columns with a migration
- **Description**: Select the concrete sensitive columns identified in roadmap §11 (e.g. user TOTP secret and any PII marked for encryption) and attach the transformer from `P09-04a` to their entity columns, adding a companion `<column>BlindIndex` column for equality queries. Add a TypeORM migration that creates/backs-fills the blind-index columns and rewrites existing plaintext values through the encryption service in batches; make it reversible and checked by the migration CI task from `P03-03`. Atomic checks: (a) selected columns carry the transformer, (b) migration is up/down safe on a populated table, (c) no plaintext remains in the new column after backfill.
- **CLI(s)**: `npm run migration:generate -- -n FieldEncryption`; `npm run migration:run`; `npm run migration:revert`.
- **Package(s)**: `None`.
- **File(s)/Folder(s)**:
  - **Added**: `src/migrations/<timestamp>-FieldEncryption.ts`
  - **Modified**: `src/modules/user/infrastructure/entities/user.entity.ts`, `src/modules/security/infrastructure/entities/totp-secret.entity.ts` (or the concrete sensitive entity identified in §11)
  - **Deleted**: `None`
- **Branch**: `feat/db-field-encryption` (shared)
- **Commit**: `feat(db): encrypt sensitive columns and add blind-index migration`
- **Testing**: Migration spec applies up then down on an empty schema and on seeded faker rows; asserts the down migration restores the prior shape; migration CI check passes; coverage thresholds pass.

### `P09-04c` — Prove encryption-at-rest and queryability with real Postgres
- **Description**: Add an integration suite using a real Postgres container (not mocks) that writes a record with faker PII, reads it back through the repository (asserting transparent decryption), inspects the raw column with a direct query to assert it holds ciphertext (no plaintext substring), and performs an equality lookup via the blind index to prove queries still work. Include a post-rotation case: encrypt under v1, rotate to v2, assert the row still decrypts. Atomic checks: (a) raw column never contains plaintext, (b) blind-index equality query returns the row, (c) rotation does not break reads.
- **CLI(s)**: `npm run test:integration -- field-encryption`; `npm run test:cov`.
- **Package(s)**: `None` — reuses the Postgres test setup from `P03-01`/`P03-03`.
- **File(s)/Folder(s)**:
  - **Added**: `test/field-encryption.integration-spec.ts`
  - **Modified**: `src/common/crypto/encrypted-column.transformer.spec.ts`
  - **Deleted**: `None`
- **Branch**: `feat/db-field-encryption` (shared)
- **Commit**: `test(db): verify field encryption at rest and queryability on postgres`
- **Testing**: Real-Postgres integration spec as described with faker fixtures; asserts no PII in logs; `vi.fn()` used only for the non-DB encryption-service spy; coverage thresholds pass.

### `P09-05a` — Define the temporary/permanent lockout policy domain
- **Description**: Extend the lockout concept from `P08-03` with a `LockoutPolicy` value object distinguishing TEMPORARY (auto-unlock after a configured window, escalating on repeat) and PERMANENT (requires admin or identity-verified self-unlock). Encode thresholds and durations as typed config with Joi validation. Keep the policy framework-free and pure; no repository or HTTP imports. Atomic checks: (a) two distinct levels with explicit transition rules, (b) durations from typed config, (c) unit spec uses a `vi.fn()` clock.
- **CLI(s)**: `npm run test:unit -- lockout-policy`; `npm run typecheck`.
- **Package(s)**: `None`.
- **File(s)/Folder(s)**:
  - **Added**: `src/common/config/lockout.config.ts`
  - **Modified**: `None`, `src/modules/security/domain/lockout-policy.ts`, `src/modules/security/domain/lockout-policy.spec.ts`
  - **Deleted**: `None`
- **Branch**: `feat/auth-lockout-levels` (shared with `P09-05b`, `P09-05c`, `P09-05d`)
- **Commit**: `feat(auth): add temporary and permanent lockout policy domain`
- **Testing**: Policy spec asserts temporary expiry via `vi.fn()` clock, escalation to permanent after N cycles, and that permanent never auto-unlocks; config spec validates thresholds; coverage thresholds pass.

### `P09-05b` — Persist lockout state on the user aggregate
- **Description**: Add lockout fields (`status`, `failedAttempts`, `lockedUntil`, `level`) to the user entity/repository port and a TypeORM migration, keeping writes inside the user repository adapter so domain code stays clean. Add repository unit specs with mocked TypeORM methods (`vi.fn()`) and extend the user-repository conformance spec from `P04-03` to cover persisting and clearing lockout state. Atomic checks: (a) state written via repository port, (b) conformance spec extended unchanged for all adapters, (c) migration reversible.
- **CLI(s)**: `npm run migration:generate -- -n LockoutState`; `npm run test:unit -- user-repository`.
- **Package(s)**: `None`.
- **File(s)/Folder(s)**:
  - **Added**: `src/migrations/<timestamp>-LockoutState.ts`
  - **Modified**: `src/modules/user/domain/user.entity.ts`, `src/modules/user/infrastructure/adapters/user-repository.adapter.ts`, `src/modules/user/infrastructure/adapters/user-repository.conformance-spec.ts`
  - **Deleted**: `None`
- **Branch**: `feat/auth-lockout-levels` (shared)
- **Commit**: `feat(auth): persist lockout state on user aggregate with migration`
- **Testing**: Repository spec uses `vi.fn()` on TypeORM `save`/`findOne`; conformance spec asserts lockout round-trip across adapters; migration up/down spec passes; coverage thresholds pass.

### `P09-05c` — Enforce lockout levels in the login use cases
- **Description**: Integrate `LockoutPolicy` into the local login (`P05-01`) and end-user login (`P07-02`) use cases: increment failures, apply temporary lock with timeout and permanent lock at the escalation threshold, and reject locked accounts with a generic response that does not disclose which level. Reuse the existing `P08-03` identity-verified self-unlock and admin unlock paths for recovery rather than adding new endpoints. Atomic checks: (a) both login paths call the policy, (b) locked accounts are rejected before password verification, (c) error text reveals no level/account state.
- **CLI(s)**: `npm run test:unit -- login-lockout`; `npm run typecheck`.
- **Package(s)**: `None`.
- **File(s)/Folder(s)**:
  - **Added**: `src/modules/auth/application/use-cases/login-lockout.spec.ts`
  - **Modified**: `src/modules/auth/application/use-cases/local-login.use-case.ts`, `src/modules/auth/application/use-cases/end-user-login.use-case.ts`
  - **Deleted**: `None`
- **Branch**: `feat/auth-lockout-levels` (shared)
- **Commit**: `feat(auth): enforce temporary and permanent lockout on login`
- **Testing**: Use-case unit spec mocks repository/hasher/policy with `vi.fn()`, asserts temporary vs permanent branches and generic error messages; coverage thresholds pass.

### `P09-05d` — Add E2E coverage for both lockout levels and recovery
- **Description**: Add an E2E suite driving real Nest apps and faker users: N failed logins trigger a temporary lock, a subsequent attempt during the lock is rejected, time advance unlocks temporarily, repeated cycles escalate to permanent, and the existing verified self-unlock/admin unlock clears it. Confirm audit events from `P08-10` are emitted without PII. Atomic checks: (a) four scenarios (temporary, during-lock, escalate, unlock) present, (b) no real credentials in fixtures, (c) audit events contain no PII.
- **CLI(s)**: `npm run test:e2e -- lockout`; `npm run test:cov`.
- **Package(s)**: `None`.
- **File(s)/Folder(s)**:
  - **Added**: `test/account-lockout.e2e-spec.ts`
  - **Modified**: `src/modules/auth/application/use-cases/login-lockout.spec.ts`
  - **Deleted**: `None`
- **Branch**: `feat/auth-lockout-levels` (shared)
- **Commit**: `test(auth): cover temporary and permanent lockout flows E2E`
- **Testing**: E2E asserts exact statuses and unlock behaviour; `vi.fn()` for any clock injection; coverage thresholds pass.

## Phase Gate (end of step)

- [ ] Full unit tests + coverage thresholds pass.
- [ ] E2E green for sliding-window burst/cooldown, circuit-breaker degradation/recovery, lockout levels, and field-encryption queryability.
- [ ] Real-Postgres integration spec confirms raw columns hold ciphertext and blind-index equality queries work; old ciphertext decrypts after key rotation.
- [ ] All touched-port conformance specs pass unchanged across memory/Redis and all adapters; circuit-breaker state-machine spec covers every transition.
- [ ] Typed config validated; no secrets, keys or PII committed; lint/format/typecheck clean.
- [ ] Security audit & version sync pass.
- [ ] Each atomic commit pushed on its shared branch; PRs merged into `dev` in this exact order:
  `P09-01a` → `P09-01b` → `P09-01c` → `P09-01d` → `P09-02a` → `P09-02b` → `P09-02c` → `P09-03a` → `P09-03b` → `P09-03c` → `P09-04a` → `P09-04b` → `P09-04c` → `P09-05a` → `P09-05b` → `P09-05c` → `P09-05d`.
- [ ] Status for umbrella IDs `P09-01`, `P09-02`, `P09-03`, `P09-04`, `P09-05` set to `✅ Done` in [`roadmap.md`](../../../roadmap.md) §4 (atomic IDs tracked here).
- [ ] Re-check the P09 exit criterion in [`roadmap.md`](../../../roadmap.md) §6.1 before starting the next step.
