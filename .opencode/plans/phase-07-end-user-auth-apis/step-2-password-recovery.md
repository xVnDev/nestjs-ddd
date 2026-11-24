# P07 · Step 2 — Password Recovery

**Project:** nestjs-ddd  |  **Phase:** P07 — End-user Auth APIs  |  **Base branch:** `dev`  |  **Status:** ⬜ Planned

> Source of truth: [`roadmap.md`](../../../roadmap.md) §4. Umbrella IDs `P07-03`, `P07-04` stay in the roadmap; this file lists the final atomic split (`P07-03a` … `P07-04c`).
> **Format**: `P<phase>-<umbrella><letter>` — one atomic task = one commit; sibling atomic tasks share one branch (branch per umbrella task). Every atomic task uses the 7-field format: `Description`, `CLI(s)`, `Package(s)`, `File(s)/Folder(s)`, `Branch`, `Commit`, `Testing`.
> **Branch model**: `P07-03a` … `P07-03c` share `feat/auth-forgot-password`; `P07-04a` … `P07-04c` share `feat/auth-reset-password`, each cut from `dev` and merged back in Phase Gate order.
> **Ordering notes**: (a) `P07-03a` introduces the password-reset token port and its conformance spec first; both use cases depend on it. (b) `P07-03` (forgot request) merges before `P07-04` (reset handler) because reset consumes the token issued by the request. (c) Mail side effects in `P07-03b` go through the queue port (`P03-06`/`P03-07`) only — no direct transport send. (d) Session revocation in `P07-04b` uses the existing blacklist/revocation ports from `P05-06`/`P05-07`; a reset must invalidate all existing sessions. (e) Tokens are single-use and carry a TTL via `CLOCK`; no secrets or PII are committed or logged.

## DDD + SOLID lens for this step

- Bounded contexts own `domain/`, `application/`, `infrastructure/`, `interfaces/`; dependencies point inward.
- Domain/application depend only on port tokens; adapters are injected, never imported directly.
- Every port ships one conformance spec run against all adapters, including in-memory fallbacks.
- Business rules live in entities/value objects/use cases; controllers stay thin.
- Introduce a port only when a mechanism must be swappable or isolated for tests.

## Step Summary

Add a forgot-password request that issues a TTL-bound, single-use reset token and enqueues a reset mail through the queue port without revealing whether an email exists. Add a reset-password handler that atomically consumes the token, hashes the new password via `PASSWORD_HASHER`, and revokes all existing sessions. Cover the happy path plus expired-token, replay and unknown-email negative paths end-to-end.

## Atomic Tasks

### `P07-03a` — Define the password-reset token port and conformance spec
- **Description**: Define a narrow `PasswordResetTokenPort` in `src/modules/shared/ports/` with `issue(userId, ttl)` and `consume(token)` methods, where `consume` is atomic (single-use: returns the user id once, then null). Add a DI token, a Redis/memory-backed adapter pair and one shared conformance spec executed against both adapters, with TTL checked via `CLOCK`. Token values are random and must not be logged. Atomic checks: (a) port and token exported, (b) conformance spec passes for memory and Redis adapters, (c) `consume` is single-use and TTL-bounded.
- **CLI(s)**: `mkdir -p src/modules/shared/ports/password-reset-token`; `npm run test:unit`; `npm run test:cov -- password-reset-token`; `npm run typecheck`.
- **Package(s)**: `None` — reuses the cache/blacklist infrastructure and conformance harness from `P03-04`/`P03-05`/`P02-03`; no new package.
- **File(s)/Folder(s)**:
  - **Added**: `src/modules/shared/ports/password-reset-token/password-reset-token.port.ts`, `src/modules/shared/ports/password-reset-token/password-reset-token.token.ts`, `src/modules/shared/ports/password-reset-token/password-reset-token.conformance-spec.ts`, `src/modules/shared/ports/password-reset-token/in-memory-password-reset-token.adapter.ts`, `src/modules/shared/ports/password-reset-token/redis-password-reset-token.adapter.ts`
  - **Modified**: `src/modules/shared/ports/index.ts` (re-export port and token)
  - **Deleted**: `None`
- **Branch**: `feat/auth-forgot-password` (shared with `P07-03b`, `P07-03c`)
- **Commit**: `feat(auth): define password-reset token port with conformance spec`
- **Testing**: Conformance spec (unchanged across both adapters) asserts `issue` stores a token with TTL, `consume` returns the user id exactly once then null, and a token expires after the TTL advanced by a mocked `CLOCK`; negative spec asserts a random/invalid token returns null. Coverage thresholds pass.

### `P07-03b` — Implement the ForgotPassword use case with queued mail
- **Description**: Add `ForgotPasswordUseCase` in `src/modules/auth/use-cases/` that looks up the user by email via the repository port and, if found, issues a reset token via `PasswordResetTokenPort` (`P07-03a`) and enqueues a reset-mail job through the queue port with the token and TTL — never a direct mail send. For an unknown email it performs no token issue and no queue call, returning a generic success result to prevent user enumeration. Depends on `P07-03a`. Atomic checks: (a) token issued with TTL via port, (b) mail enqueued only for known emails, (c) unknown email returns generic success with no side effects.
- **CLI(s)**: `npm run test:unit`; `npm run typecheck`.
- **Package(s)**: `None` — reuses repository port, `PasswordResetTokenPort` and queue port; all mocked with `vi.fn()`.
- **File(s)/Folder(s)**:
  - **Added**: `src/modules/auth/use-cases/forgot-password.use-case.ts`, `src/modules/auth/use-cases/forgot-password.use-case.spec.ts`
  - **Modified**: `None`
  - **Deleted**: `None`
- **Branch**: `feat/auth-forgot-password` (shared)
- **Commit**: `feat(auth): implement forgot-password with queued reset mail`
- **Testing**: Use-case unit spec with `vi.fn()` mocks asserts: known email → one `issue` call with TTL and one queue `produce` call carrying the token (no PII beyond user id/email); unknown email → zero issue and zero queue calls but generic success; negative spec asserts a queue failure is surfaced without leaking account existence. Coverage thresholds pass.

### `P07-03c` — Add the forgot-password DTO, controller and E2E coverage
- **Description**: Add `ForgotPasswordDto` with a validated email field and a thin `POST /auth/forgot-password` controller that calls `ForgotPasswordUseCase` and always returns `202 Accepted` with a generic message. Wire the use case and ports into `auth.module.ts`. Add E2E covering a known email (token issued, one mail job queued) and an unknown email (same generic response, no mail job). Atomic checks: (a) always 202 regardless of account existence, (b) mail job asserted for known email only, (c) controller has no business logic.
- **CLI(s)**: `mkdir -p src/modules/auth/interfaces/controllers`; `npm run test:e2e -- forgot-password`; `npm run test:unit`; `npm run typecheck`.
- **Package(s)**: `None` — reuses `class-validator` and the in-memory adapters.
- **File(s)/Folder(s)**:
  - **Added**: `src/modules/auth/interfaces/dto/forgot-password.dto.ts`, `src/modules/auth/interfaces/dto/forgot-password.dto.spec.ts`, `src/modules/auth/interfaces/controllers/forgot-password.controller.ts`, `src/modules/auth/interfaces/controllers/forgot-password.controller.spec.ts`, `test/auth-forgot-password.e2e-spec.ts`
  - **Modified**: `src/modules/auth/auth.module.ts`
  - **Deleted**: `None`
- **Branch**: `feat/auth-forgot-password` (shared)
- **Commit**: `feat(auth): add forgot-password controller and e2e coverage`
- **Testing**: E2E with faker fixtures asserts 202 for both known and unknown emails, one queued mail job for the known email and zero for the unknown, and that the response body does not reveal account existence; DTO spec asserts malformed email → 400. Coverage thresholds pass.

### `P07-04a` — Add the reset-password DTO and validation
- **Description**: Add `ResetPasswordDto` with a validated `token` (non-empty string) and `newPassword` meeting the configured password policy, plus a typed reset result (`success` / `invalidOrExpiredToken`). Keep transport validation in the DTO only; the token validity and policy enforcement remain use-case concerns. Atomic checks: (a) DTO validates token and newPassword, (b) result contract typed, (c) no business rule in the DTO.
- **CLI(s)**: `npm run test:unit`; `npm run typecheck`.
- **Package(s)**: `None` — reuses `class-validator` from `P01-05`.
- **File(s)/Folder(s)**:
  - **Added**: `src/modules/auth/interfaces/dto/reset-password.dto.ts`, `src/modules/auth/interfaces/dto/reset-password.dto.spec.ts`, `src/modules/auth/use-cases/reset-password.result.ts`
  - **Modified**: `None`
  - **Deleted**: `None`
- **Branch**: `feat/auth-reset-password` (shared with `P07-04b`, `P07-04c`)
- **Commit**: `feat(auth): add reset-password dto and result contract`
- **Testing**: DTO unit spec with `validateSync` asserts a valid token/password passes, an empty token and a weak password fail, and unknown fields are rejected; coverage thresholds pass.

### `P07-04b` — Implement the ResetPassword use case with token consumption and revocation
- **Description**: Add `ResetPasswordUseCase` in `src/modules/auth/use-cases/` that atomically consumes the reset token via `PasswordResetTokenPort` (`P07-03a`), returning `invalidOrExpiredToken` if absent/expired; on success it hashes `newPassword` via `PASSWORD_HASHER`, updates the user's password through the repository port, and revokes all existing sessions/tokens via the blacklist/revocation ports (`P05-06`/`P05-07`). All I/O goes through ports mocked with `vi.fn()`. Depends on `P07-04a`, `P07-03a`. Atomic checks: (a) token consumed exactly once, (b) password hashed and saved, (c) all sessions revoked.
- **CLI(s)**: `npm run test:unit`; `npm run typecheck`.
- **Package(s)**: `None` — reuses `PASSWORD_HASHER`, repository, reset-token and revocation ports; all mocked with `vi.fn()`.
- **File(s)/Folder(s)**:
  - **Added**: `src/modules/auth/use-cases/reset-password.use-case.ts`, `src/modules/auth/use-cases/reset-password.use-case.spec.ts`
  - **Modified**: `None`
  - **Deleted**: `None`
- **Branch**: `feat/auth-reset-password` (shared)
- **Commit**: `feat(auth): implement reset-password with single-use token and session revocation`
- **Testing**: Use-case unit spec with `vi.fn()` mocks asserts: valid token → one `consume`, one hash, one save, one revoke-all call; invalid/expired token → `invalidOrExpiredToken` with zero hash/save/revoke calls; replay (second `consume`) → invalid result; negative spec asserts partial failures do not leave a half-updated password. Coverage thresholds pass.

### `P07-04c` — Add the reset controller and cover reset + replay end-to-end
- **Description**: Add a thin `POST /auth/reset-password` controller that validates `ResetPasswordDto`, calls `ResetPasswordUseCase` and maps `success` to `200` and `invalidOrExpiredToken` to `400`. Wire the use case and ports into `auth.module.ts`. Add E2E covering a successful reset, replay rejection of the same token, an expired token and an invalid token, plus a check that previously issued access tokens no longer authenticate. Atomic checks: (a) 200/400 mapping correct, (b) replay and expired token rejected, (c) old tokens revoked after reset.
- **CLI(s)**: `npm run test:e2e -- reset-password`; `npm run test:unit`; `npm run typecheck`.
- **Package(s)**: `None`.
- **File(s)/Folder(s)**:
  - **Added**: `src/modules/auth/interfaces/controllers/reset-password.controller.ts`, `src/modules/auth/interfaces/controllers/reset-password.controller.spec.ts`, `test/auth-reset-password.e2e-spec.ts`
  - **Modified**: `src/modules/auth/auth.module.ts`
  - **Deleted**: `None`
- **Branch**: `feat/auth-reset-password` (shared)
- **Commit**: `feat(auth): add reset-password controller and e2e replay coverage`
- **Testing**: E2E with faker fixtures and a mocked `CLOCK` asserts 200 on valid reset, 400 on replay/expired/invalid token, and that a pre-reset access token returns 401 afterward; the in-memory token port confirms the token is consumed once. Coverage thresholds pass.

## Phase Gate (end of step)

- [ ] Full unit tests + coverage thresholds pass.
- [ ] Conformance specs pass for the password-reset token port across memory and Redis adapters.
- [ ] E2E passes for forgot-password (known/unknown email) and reset-password (success, replay, expired, invalid, revocation).
- [ ] Negative paths covered: unknown email (no enumeration), expired token, token replay; mail sent only via the queue port.
- [ ] Security audit & version sync pass; no tokens, secrets or PII committed or logged.
- [ ] Each atomic commit pushed on its shared branch; PR merged into `dev` in this exact order:
  `P07-03a` → `P07-03b` → `P07-03c` → `P07-04a` → `P07-04b` → `P07-04c`.
- [ ] Status for umbrella IDs `P07-03`, `P07-04` set to `✅ Done` in [`roadmap.md`](../../../roadmap.md) §4 (atomic IDs tracked here).
- [ ] Re-check the P07 exit criterion in [`roadmap.md`](../../../roadmap.md) §6.1 before starting the next step.
