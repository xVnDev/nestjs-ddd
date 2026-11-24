# P07 · Step 3 — Change Password & E2E

**Project:** nestjs-ddd  |  **Phase:** P07 — End-user Auth APIs  |  **Base branch:** `dev`  |  **Status:** ⬜ Planned

> Source of truth: [`roadmap.md`](../../../roadmap.md) §4. Umbrella IDs `P07-05`, `P07-06` stay in the roadmap; this file lists the final atomic split (`P07-05a` … `P07-06c`).
> **Format**: `P<phase>-<umbrella><letter>` — one atomic task = one commit; sibling atomic tasks share one branch (branch per umbrella task). Every atomic task uses the 7-field format: `Description`, `CLI(s)`, `Package(s)`, `File(s)/Folder(s)`, `Branch`, `Commit`, `Testing`.
> **Branch model**: `P07-05a` … `P07-05c` share `feat/auth-change-password`; `P07-06a` … `P07-06c` share `chore/test-auth-flows-e2e`, each cut from `dev` and merged back in Phase Gate order.
> **Ordering notes**: (a) `P07-05` (change-password) merges before `P07-06` (consolidated E2E) because the final suite exercises the change-password flow. (b) `P07-05a` defines the DTO, `P07-05b` implements the use case behind ports, `P07-05c` adds the thin protected controller — the controller holds no business rules. (c) Change-password verifies the CURRENT password via `PASSWORD_HASHER`, then revokes all tokens via the blacklist/revocation ports from `P05-06`/`P05-07`. (d) `P07-06` reuses faker factories (`P01-03`) and in-memory adapters/mocked queues (`P03`), and must cover both happy and failure paths across all self-service flows with no real secrets or PII.

## DDD + SOLID lens for this step

- Bounded contexts own `domain/`, `application/`, `infrastructure/`, `interfaces/`; dependencies point inward.
- Domain/application depend only on port tokens; adapters are injected, never imported directly.
- Every port ships one conformance spec run against all adapters, including in-memory fallbacks.
- Business rules live in entities/value objects/use cases; controllers stay thin.
- Introduce a port only when a mechanism must be swappable or isolated for tests.

## Step Summary

Add an authenticated change-password flow that verifies the current password, hashes the new one and revokes all tokens, exposing it through a thin JWT-protected controller. Then consolidate E2E coverage for every self-service auth flow — register, login, verification mail, forgot/reset password and change password — with faker fixtures, in-memory adapters, mocked provider/queue responses, and explicit negative paths (unverified email, duplicate email, expired token, token replay, wrong current password) plus mail-side-effect assertions.

## Atomic Tasks

### `P07-05a` — Add the change-password DTO and result contract
- **Description**: Add `ChangePasswordDto` with `currentPassword` and `newPassword` fields validated against the configured password policy, and a typed result (`changed` / `invalidCurrentPassword`). The DTO performs only shape/policy-length validation; verifying the current password remains a use-case concern. Atomic checks: (a) DTO validates both fields, (b) result contract typed, (c) no credential business rule in the DTO.
- **CLI(s)**: `npm run test:unit`; `npm run typecheck`.
- **Package(s)**: `None` — reuses `class-validator` from `P01-05`.
- **File(s)/Folder(s)**:
  - **Added**: `src/modules/auth/interfaces/dto/change-password.dto.ts`, `src/modules/auth/interfaces/dto/change-password.dto.spec.ts`, `src/modules/auth/use-cases/change-password.result.ts`
  - **Modified**: `None`
  - **Deleted**: `None`
- **Branch**: `feat/auth-change-password` (shared with `P07-05b`, `P07-05c`)
- **Commit**: `feat(auth): add change-password dto and result contract`
- **Testing**: DTO unit spec with `validateSync` asserts both fields are required, a weak `newPassword` fails, and unknown fields are rejected by the global whitelist; coverage thresholds pass.

### `P07-05b` — Implement the ChangePassword use case with token revocation
- **Description**: Add `ChangePasswordUseCase` in `src/modules/auth/use-cases/` that loads the user by id, verifies `currentPassword` via `PASSWORD_HASHER` (returning `invalidCurrentPassword` on mismatch without revealing details), hashes `newPassword`, saves it through the repository port and revokes all tokens for that user via the blacklist/revocation ports (`P05-06`/`P05-07`). All I/O goes through ports mocked with `vi.fn()`. Depends on `P07-05a`. Atomic checks: (a) current password verified before any write, (b) new password hashed and saved, (c) all sessions/tokens revoked on success.
- **CLI(s)**: `npm run test:unit`; `npm run typecheck`.
- **Package(s)**: `None` — reuses `PASSWORD_HASHER`, repository and revocation ports; all mocked with `vi.fn()`.
- **File(s)/Folder(s)**:
  - **Added**: `src/modules/auth/use-cases/change-password.use-case.ts`, `src/modules/auth/use-cases/change-password.use-case.spec.ts`
  - **Modified**: `None`
  - **Deleted**: `None`
- **Branch**: `feat/auth-change-password` (shared)
- **Commit**: `feat(auth): implement change-password with current-password check and revocation`
- **Testing**: Use-case unit spec with `vi.fn()` mocks asserts: correct current password → one verify, one hash, one save, one revoke-all call; wrong current password → `invalidCurrentPassword` with zero hash/save/revoke calls; negative spec asserts a partial failure never persists a new password without revocation. Coverage thresholds pass.

### `P07-05c` — Add the protected change-password controller and E2E coverage
- **Description**: Add a thin `POST /auth/change-password` controller protected by the JWT guard (`P05-04`) that reads the user id from the authenticated request, validates `ChangePasswordDto`, calls `ChangePasswordUseCase` and maps `changed` to `200` and `invalidCurrentPassword` to `400`/`401`. Wire the use case and ports into `auth.module.ts`. Add E2E covering success (old tokens rejected afterward), wrong current password, unauthenticated access and weak new password. Atomic checks: (a) route requires JWT, (b) 200 and wrong-password mapping correct, (c) all tokens revoked after success.
- **CLI(s)**: `mkdir -p src/modules/auth/interfaces/controllers`; `npm run test:e2e -- change-password`; `npm run test:unit`; `npm run typecheck`.
- **Package(s)**: `None` — reuses the JWT guard from `P05-04` and existing ports.
- **File(s)/Folder(s)**:
  - **Added**: `src/modules/auth/interfaces/controllers/change-password.controller.ts`, `src/modules/auth/interfaces/controllers/change-password.controller.spec.ts`, `test/auth-change-password.e2e-spec.ts`
  - **Modified**: `src/modules/auth/auth.module.ts`
  - **Deleted**: `None`
- **Branch**: `feat/auth-change-password` (shared)
- **Commit**: `feat(auth): add protected change-password controller and e2e coverage`
- **Testing**: E2E with faker fixtures and real JWT tokens (issued via the in-memory issuer) asserts 200 on success, 401 without a token, 400/401 on wrong current password and 400 on weak new password; a pre-change access token returns 401 after success. Coverage thresholds pass.

### `P07-06a` — Build the self-service E2E harness and fixtures
- **Description**: Create a shared E2E harness under `test/auth/` that boots the Nest app with in-memory adapters, seeded faker user factories (`P01-03`), a mocked queue port (`vi.fn()`) and a controllable `CLOCK` for TTL tests. It must expose helpers to register a user, verify a user, issue tokens and drive reset/change flows so the flow specs stay concise. No real mail transport, external service or secret is used. Atomic checks: (a) harness boots with zero external services, (b) faker fixtures seeded/deterministic, (c) queue and clock controllable via `vi.fn()`.
- **CLI(s)**: `mkdir -p test/auth`; `npm run test:e2e -- auth/`; `npm run typecheck`.
- **Package(s)**: `None` — reuses `@faker-js/faker` fixtures (`P01-03`), in-memory adapters (`P03`) and Vitest `vi.fn()`.
- **File(s)/Folder(s)**:
  - **Added**: `test/auth/auth-e2e.harness.ts`, `test/auth/factories.ts`, `test/auth/auth-e2e.harness.spec.ts`
  - **Modified**: `None`
  - **Deleted**: `None`
- **Branch**: `chore/test-auth-flows-e2e` (shared with `P07-06b`, `P07-06c`)
- **Commit**: `chore(test): add self-service auth e2e harness with in-memory adapters`
- **Testing**: Harness self-test asserts the app boots, a seeded fixture is deterministic, the queue spy records jobs and the mocked clock advances TTLs; asserts no external service is contacted. Coverage thresholds pass.

### `P07-06b` — Cover the happy paths across all self-service flows
- **Description**: Add `test/auth/auth-flows.e2e-spec.ts` using the `P07-06a` harness to walk the complete happy path: register → login (verified user) → verification mail enqueued for unverified user → forgot-password (mail job) → reset-password (old tokens revoked) → change-password (tokens revoked again) → login with the new password. Assert each step's HTTP status and that token pairs are issued where expected. Atomic checks: (a) all six flows chained in one suite, (b) statuses and tokens asserted at each step, (c) uses only in-memory adapters and mocked queue.
- **CLI(s)**: `npm run test:e2e -- auth/auth-flows`; `npm run test:cov`; `npm run typecheck`.
- **Package(s)**: `None` — uses the `P07-06a` harness.
- **File(s)/Folder(s)**:
  - **Added**: `test/auth/auth-flows.e2e-spec.ts`
  - **Modified**: `None`
  - **Deleted**: `None`
- **Branch**: `chore/test-auth-flows-e2e` (shared)
- **Commit**: `test(auth): cover happy paths across all self-service flows`
- **Testing**: E2E suite asserts 201/200/202/200/200/200 across the chain, valid token pairs issued at login, and successful login with the new password after reset and change; queue mock confirms verification and reset mail jobs enqueued. Coverage thresholds pass.

### `P07-06c` — Cover negative paths and mail side effects across all flows
- **Description**: Add `test/auth/auth-flows-negative.e2e-spec.ts` using the `P07-06a` harness to cover every failure path: unverified-email login, duplicate-email registration, invalid credentials (no enumeration), unknown-email forgot-password (no mail job), expired and replayed reset tokens, and change-password with a wrong current password. Assert exact mail-queue side effects (verification/reset jobs enqueued once for the right users, never for unknown emails) and that no secrets or PII appear in responses or logs. Atomic checks: (a) all negative paths present, (b) mail side effects asserted exactly, (c) no enumeration or PII leakage.
- **CLI(s)**: `npm run test:e2e -- auth/auth-flows-negative`; `npm run test:cov`; `npm run typecheck`.
- **Package(s)**: `None` — uses the `P07-06a` harness with a mocked `CLOCK` and queue.
- **File(s)/Folder(s)**:
  - **Added**: `test/auth/auth-flows-negative.e2e-spec.ts`
  - **Modified**: `test/auth/auth-e2e.harness.ts` (expose clock advance helpers if needed)
  - **Deleted**: `None`
- **Branch**: `chore/test-auth-flows-e2e` (shared)
- **Commit**: `test(auth): cover self-service failure paths and mail side effects`
- **Testing**: E2E suite asserts 409 duplicate email, 202 unverified login with one mail job, 401 invalid credentials with no enumeration, 202 unknown-email forgot with zero jobs, 400 expired/replayed reset tokens, and 400/401 wrong current password; mocked clock drives expiry; coverage thresholds pass and the P07 exit criterion is provably met.

## Phase Gate (end of step)

- [ ] Full unit tests + coverage thresholds pass.
- [ ] E2E passes for change-password (success, wrong password, unauthenticated, token revocation) and the consolidated self-service happy-path and negative-path suites.
- [ ] All self-service flows E2E covered including failure paths (unverified email, duplicate email, expired token, token replay, wrong current password) and mail side effects.
- [ ] Controllers stay thin; all business rules live in use cases; mail side effects go through the queue port; no external services required.
- [ ] Security audit & version sync pass; no secrets, tokens or PII committed or logged.
- [ ] Each atomic commit pushed on its shared branch; PR merged into `dev` in this exact order:
  `P07-05a` → `P07-05b` → `P07-05c` → `P07-06a` → `P07-06b` → `P07-06c`.
- [ ] Status for umbrella IDs `P07-05`, `P07-06` set to `✅ Done` in [`roadmap.md`](../../../roadmap.md) §4 (atomic IDs tracked here).
- [ ] Re-check the P07 exit criterion in [`roadmap.md`](../../../roadmap.md) §6.1 before starting the next step.
