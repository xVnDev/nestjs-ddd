# P08 · Step 3 — Device & Session Security

**Project:** nestjs-ddd  |  **Phase:** P08 — Advanced Security  |  **Base branch:** `dev`  |  **Status:** ⬜ Planned

> Source of truth: [`roadmap.md`](../../../roadmap.md) §4. Umbrella IDs `P08-08`, `P08-09` stay in the roadmap; this file lists the final atomic split (`P08-08a` … `P08-09d`).
> **Format**: `P<phase>-<umbrella><letter>` — one atomic task = one commit; sibling atomic tasks share one branch (branch per umbrella task). Every atomic task uses the 7-field format: `Description`, `CLI(s)`, `Package(s)`, `File(s)/Folder(s)`, `Branch`, `Commit`, `Testing`.
> **Ordering notes**: (a) `P08-08a` defines the device-token port and fingerprint value object; `P08-08b`/`P08-08c` add the memory fallback and Redis adapter behind the same conformance suite; `P08-08d` embeds the device id in issued JWTs and validates it on every request; `P08-08e` adds self-service registration/revocation endpoints. (b) `P08-09a` adds typed limits for both dimensions; `P08-09b`/`P08-09c` ship the account-dimension port with memory and Redis adapters; `P08-09d` composes the existing per-IP throttler from `P03-11` with the new per-account limiter so both limits fire independently. (c) Device binding uses the `TOKEN_ISSUER` port from `P05-04` and revocation scopes from `P05-07` — no token format rewrite.

## DDD + SOLID lens for this step

- Bounded contexts own `domain/`, `application/`, `infrastructure/`, `interfaces/`; dependencies point inward.
- Domain/application depend only on port tokens; adapters are injected, never imported directly.
- Every port ships one conformance spec run against all adapters, including in-memory fallbacks.
- Business rules live in entities/value objects/use cases; controllers stay thin.
- Introduce a port only when a mechanism must be swappable or isolated for tests.

## Step Summary

Bind sessions to registered devices and enforce abuse limits on two independent axes. A `DeviceTokenPort` with a hashed fingerprint value object, a production-shaped memory fallback and a Redis adapter lets issued JWTs carry a device id claim that a guard validates against registration and revocation state, with self-service register/list/revoke endpoints. A separate account-dimension rate-limit port, again with memory and Redis adapters, composes with the existing per-IP `@nestjs/throttler` so a burst is limited by IP or by account regardless of which dimension is exercised. Each port passes one unchanged conformance suite across all adapters, and no raw device secrets, IP addresses or PII are stored or logged.

## Atomic Tasks

### `P08-08a` — Define the device-token port and fingerprint value object
- **Description**: Create `DeviceTokenPort` + `DEVICE_TOKEN` token in `src/modules/security/domain/ports/device-token.port.ts` with `register`, `findByUser`, `revoke` and `isActive`, together with a `DeviceFingerprint` value object that hashes user-agent + IP + a generated device id so no raw IP or user-agent is persisted. Add `test/conformance/device-token.conformance.ts` as the single shared suite. Atomic checks: (a) port + token exist, (b) fingerprint is hashed and value-object typed, (c) conformance harness exists. First in this umbrella; blocks `P08-08b` and `P08-08c`.
- **CLI(s)**: `npm run test:unit`; `npm run typecheck`.
- **Package(s)**: `None` — uses Node `crypto` hashing and the `ID_GENERATOR` port from the shared kernel for device ids.
- **File(s)/Folder(s)**:
  - **Added**: `src/modules/security/domain/ports/device-token.port.ts`, `src/modules/security/domain/value-objects/device-fingerprint.vo.ts`, `test/conformance/device-token.conformance.ts`
  - **Modified**: `None`
  - **Deleted**: `None`
- **Branch**: `feat/sec-device-token` (shared with `P08-08b`, `P08-08c`, `P08-08d`, `P08-08e`)
- **Commit**: `feat(sec): define device-token port and hashed fingerprint value object`
- **Testing**: Unit spec asserts the fingerprint is a one-way hash and equal inputs produce equal fingerprints without exposing raw IP/user-agent; conformance harness exposes a single factory for adapters; coverage thresholds pass.

### `P08-08b` — Add the in-memory device-token adapter
- **Description**: Implement `src/modules/security/adapters/device-token.memory.adapter.ts` as a production-shaped fallback tracking registered and revoked device ids per user, passing `device-token.conformance.ts` unchanged. Ensure revocation is permanent within the store's lifetime and that queries never return raw fingerprint inputs. Atomic checks: (a) memory adapter conforms, (b) revoked device stays inactive, (c) no raw IP/user-agent stored. Depends on `P08-08a`; blocks `P08-08d`.
- **CLI(s)**: `npm run test:unit -- device-token`.
- **Package(s)**: `None`.
- **File(s)/Folder(s)**:
  - **Added**: `src/modules/security/adapters/device-token.memory.adapter.ts`, `src/modules/security/adapters/device-token.memory.adapter.spec.ts`
  - **Modified**: `src/modules/security/security.module.ts`
  - **Deleted**: `None`
- **Branch**: `feat/sec-device-token` (shared with `P08-08a`, `P08-08c`, `P08-08d`, `P08-08e`)
- **Commit**: `feat(sec): add in-memory device-token adapter`
- **Testing**: Conformance suite asserts register → active → revoke → inactive lifecycle, per-user isolation and missing-user negative path; coverage thresholds pass.

### `P08-08c` — Add the Redis/Keyv device-token adapter
- **Description**: Implement `src/modules/security/adapters/device-token.redis.adapter.ts` on the Keyv cache port from `P03-04`, persisting registration/revocation state with TTLs and passing the identical `device-token.conformance.ts` suite. Atomic checks: (a) Redis adapter conforms unchanged, (b) revocation persists via TTL-backed record, (c) hashed keys only. Depends on `P08-08a`; blocks `P08-08d`.
- **CLI(s)**: `npm run test:unit -- device-token`.
- **Package(s)**: `None` — reuses `@keyv/redis` and the cache port from `P03-04`.
- **File(s)/Folder(s)**:
  - **Added**: `src/modules/security/adapters/device-token.redis.adapter.ts`, `src/modules/security/adapters/device-token.redis.adapter.spec.ts`
  - **Modified**: `None`
  - **Deleted**: `None`
- **Branch**: `feat/sec-device-token` (shared with `P08-08a`, `P08-08b`, `P08-08d`, `P08-08e`)
- **Commit**: `feat(sec): add Redis-backed device-token adapter`
- **Testing**: Same conformance suite passes; assert TTL and revocation persistence via `vi.fn()` cache spy; negative path for backend error; coverage thresholds pass.

### `P08-08d` — Embed and validate the device id in tokens
- **Description**: Extend the `TOKEN_ISSUER` adapter from `P05-04` to include a `did` (device id) claim in access and refresh tokens, and add a `DeviceValidationGuard` that checks `DEVICE_TOKEN.isActive(userId, did)` on every authenticated request. A token presented from an unregistered or revoked device must be rejected with 401, while existing tokens without a `did` remain valid only until the migration grace window closes. Atomic checks: (a) new tokens carry `did`, (b) unregistered/revoked devices rejected, (c) no token-format rewrite. Depends on `P08-08b`/`P08-08c`.
- **CLI(s)**: `npm run test:unit`; `npm run test:e2e -- device`.
- **Package(s)**: `None`.
- **File(s)/Folder(s)**:
  - **Added**: `src/modules/security/interfaces/guards/device-validation.guard.ts`, `src/modules/security/interfaces/guards/device-validation.guard.spec.ts`, `test/device-validation.e2e-spec.ts`
  - **Modified**: `src/modules/auth/adapters/token-issuer.adapter.ts`, `src/modules/auth/interfaces/strategies/jwt.strategy.ts`, `src/app.module.ts`
  - **Deleted**: `None`
- **Branch**: `feat/sec-device-token` (shared with `P08-08a`, `P08-08b`, `P08-08c`, `P08-08e`)
- **Commit**: `feat(sec): bind issued tokens to registered devices`
- **Testing**: Unit spec with `vi.fn()` device-token port for active/revoked/missing cases; E2E asserts valid device request succeeds, stolen token from unknown device returns 401, revoked device returns 401, and legacy token behaviour in grace window; coverage thresholds pass.

### `P08-08e` — Add device registration and revocation endpoints
- **Description**: Add `RegisterDeviceUseCase`, `ListDevicesUseCase` and `RevokeDeviceUseCase` with thin DTOs/controller exposing `POST /me/devices`, `GET /me/devices` and `DELETE /me/devices/:id`; revocation reuses the `device` revocation scope from `P05-07` so affected tokens are blacklisted. Responses contain hashed fingerprints and ids only, never raw IP or user-agent. Atomic checks: (a) self-service register/list/revoke work, (b) revoke blacklists device tokens, (c) no raw PII in responses. Depends on `P08-08d`.
- **CLI(s)**: `npm run test:unit`; `npm run test:e2e -- devices`.
- **Package(s)**: `None`.
- **File(s)/Folder(s)**:
  - **Added**: `src/modules/security/application/use-cases/register-device.use-case.ts`, `src/modules/security/application/use-cases/list-devices.use-case.ts`, `src/modules/security/application/use-cases/revoke-device.use-case.ts`, corresponding `.spec.ts` files, `src/modules/security/interfaces/controllers/device.controller.ts`, `src/modules/security/interfaces/dto/register-device.dto.ts`, `test/device-management.e2e-spec.ts`
  - **Modified**: `src/modules/security/security.module.ts`
  - **Deleted**: `None`
- **Branch**: `feat/sec-device-token` (shared with `P08-08a`, `P08-08b`, `P08-08c`, `P08-08d`)
- **Commit**: `feat(sec): add self-service device registration and revocation`
- **Testing**: Unit specs with `vi.fn()` device-token and revocation ports; E2E asserts a user can only list/revoke their own devices, revocation invalidates that device's token and responses contain no raw IP/user-agent; coverage thresholds pass.

### `P08-09a` — Add typed config for IP and account limits
- **Description**: Extend `src/common/config/validation/env.validation.ts` and add `src/common/config/rate-limit.config.ts` with a `registerAs('rateLimit', ...)` slice exposing `ip` and `account` windows/max values. Keep the existing per-IP `@nestjs/throttler` config from `P03-11` as the IP dimension and add only the new account keys, validated by Joi. Atomic checks: (a) both dimensions typed, (b) Joi validates limits, (c) IP config unchanged from `P03-11`. First in this umbrella; blocks `P08-09b`.
- **CLI(s)**: `npm run test:unit`; `npm run typecheck`.
- **Package(s)**: `None` — reuses `@nestjs/config`, `joi` and `@nestjs/throttler` from `P01-04`/`P03-11`.
- **File(s)/Folder(s)**:
  - **Added**: `src/common/config/rate-limit.config.ts`, `src/common/config/rate-limit.config.spec.ts`
  - **Modified**: `src/common/config/validation/env.validation.ts`, `src/common/config/config.module.ts`
  - **Deleted**: `None`
- **Branch**: `feat/sec-dual-rate-limit` (shared with `P08-09b`, `P08-09c`, `P08-09d`)
- **Commit**: `feat(sec): add typed config for ip and account rate limits`
- **Testing**: Unit spec asserts `rateLimitConfig()` returns both dimensions and Joi rejects non-positive values; coverage thresholds pass; `npm run typecheck`.

### `P08-09b` — Define the account-rate-limit port and memory adapter
- **Description**: Create `AccountRateLimitPort` + `ACCOUNT_RATE_LIMIT` token in `src/modules/security/domain/ports/account-rate-limit.port.ts` with `consume(key): Promise<{ allowed: boolean; retryAfter: number }>`, keyed by a hashed user id (never raw email). Implement the production-shaped in-memory fixed-window fallback and `test/conformance/account-rate-limit.conformance.ts` run against it. Atomic checks: (a) narrow port exists, (b) memory adapter conforms, (c) hashed account keys. Depends on `P08-09a`; blocks `P08-09d`.
- **CLI(s)**: `npm run test:unit -- rate-limit`.
- **Package(s)**: `None`.
- **File(s)/Folder(s)**:
  - **Added**: `src/modules/security/domain/ports/account-rate-limit.port.ts`, `test/conformance/account-rate-limit.conformance.ts`, `src/modules/security/adapters/account-rate-limit.memory.adapter.ts`, `src/modules/security/adapters/account-rate-limit.memory.adapter.spec.ts`
  - **Modified**: `src/modules/security/security.module.ts`
  - **Deleted**: `None`
- **Branch**: `feat/sec-dual-rate-limit` (shared with `P08-09a`, `P08-09c`, `P08-09d`)
- **Commit**: `feat(sec): add account rate-limit port and memory adapter`
- **Testing**: Conformance suite asserts allow-until-limit, block-on-exceed, retryAfter value and window reset via fake timers; negative path for empty key; coverage thresholds pass.

### `P08-09c` — Add the Redis/Keyv account-rate-limit adapter
- **Description**: Implement `src/modules/security/adapters/account-rate-limit.redis.adapter.ts` on the Keyv cache port with an atomic increment-and-expire so concurrent requests cannot bypass the limit, passing the identical `account-rate-limit.conformance.ts` suite. Atomic checks: (a) Redis adapter conforms unchanged, (b) atomic increment, (c) TTL resets window. Depends on `P08-09a`; blocks `P08-09d`.
- **CLI(s)**: `npm run test:unit -- rate-limit`.
- **Package(s)**: `None` — reuses `@keyv/redis` from `P03-04`.
- **File(s)/Folder(s)**:
  - **Added**: `src/modules/security/adapters/account-rate-limit.redis.adapter.ts`, `src/modules/security/adapters/account-rate-limit.redis.adapter.spec.ts`
  - **Modified**: `None`
  - **Deleted**: `None`
- **Branch**: `feat/sec-dual-rate-limit` (shared with `P08-09a`, `P08-09b`, `P08-09d`)
- **Commit**: `feat(sec): add Redis-backed account rate-limit adapter`
- **Testing**: Same conformance suite passes; assert atomic increment and TTL via `vi.fn()` cache spy; concurrent-call negative path; coverage thresholds pass.

### `P08-09d` — Enforce both dimensions independently
- **Description**: Add an `AccountRateLimitGuard` that resolves the authenticated/attempted account into a hashed key and calls `ACCOUNT_RATE_LIMIT.consume`, applying it to auth endpoints via decorator while the global `ThrottlerGuard` continues to enforce the IP dimension from `P03-11`. Return 429 with a `Retry-After` header from whichever dimension trips first, and add E2E proving IP-only and account-only bursts are each blocked without relying on the other. Atomic checks: (a) both dimensions active, (b) each blocks independently, (c) Retry-After present. Depends on `P08-09b`/`P08-09c`.
- **CLI(s)**: `npm run test:unit`; `npm run test:e2e -- rate-limit`.
- **Package(s)**: `None`.
- **File(s)/Folder(s)**:
  - **Added**: `src/modules/security/interfaces/guards/account-rate-limit.guard.ts`, `src/modules/security/interfaces/guards/account-rate-limit.guard.spec.ts`, `test/rate-limit.e2e-spec.ts`
  - **Modified**: `src/modules/security/security.module.ts`, `src/app.module.ts`, `src/modules/auth/interfaces/controllers/auth.controller.ts`
  - **Deleted**: `None`
- **Branch**: `feat/sec-dual-rate-limit` (shared with `P08-09a`, `P08-09b`, `P08-09c`)
- **Commit**: `feat(sec): enforce independent per-ip and per-account rate limits`
- **Testing**: Unit spec with `vi.fn()` account limiter and fake timers; E2E sends bursts from one IP across accounts and from many IPs to one account asserting 429 in each scenario; negative path for allowed traffic; coverage thresholds pass.

## Phase Gate (end of step)

- [ ] Full unit tests + coverage thresholds pass.
- [ ] E2E passes for device-bound token validation, self-service device revocation, and independent per-IP/per-account rate limiting, including negative and replay paths.
- [ ] Conformance specs pass for the DeviceToken and AccountRateLimit ports across all adapters, including in-memory fallbacks; no raw IP, user-agent, device secret or PII committed or logged.
- [ ] Security audit & version sync pass; lint/format/typecheck clean.
- [ ] Each atomic commit pushed on its shared branch; PR merged into `dev` in this exact order:
  `P08-08a` → `P08-08b` → `P08-08c` → `P08-08d` → `P08-08e` → `P08-09a` → `P08-09b` → `P08-09c` → `P08-09d`.
- [ ] Status for umbrella IDs `P08-08`, `P08-09` set to `✅ Done` in [`roadmap.md`](../../../roadmap.md) §4 (atomic IDs tracked here).
- [ ] Re-check the P08 exit criterion in [`roadmap.md`](../../../roadmap.md) §6.1 before starting the next step.
